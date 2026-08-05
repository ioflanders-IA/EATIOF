import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import { Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem, Ingredient, DayOfWeek, MealType } from '../types';
import { INITIAL_RECIPES, INITIAL_WEEKLY_MENU, INITIAL_SHOPPING_LIST, INITIAL_PANTRY_ITEMS } from '../data/initialData';

// Local storage keys for fallback offline mode
const STORAGE_KEYS = {
  RECIPES: 'eatiof_recipes_v1',
  WEEKLY_MENU: 'eatiof_weekly_menu_v1',
  SHOPPING_LIST: 'eatiof_shopping_list_v1',
  PANTRY: 'eatiof_pantry_v1',
  SEEDED: 'eatiof_seeded_v2',
  DELETED_RECIPES: 'eatiof_deleted_recipes_v1'
};

function getDeletedRecipeIds(): string[] {
  const data = localStorage.getItem(STORAGE_KEYS.DELETED_RECIPES);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function addDeletedRecipeId(id: string) {
  const ids = new Set(getDeletedRecipeIds());
  ids.add(id);
  localStorage.setItem(STORAGE_KEYS.DELETED_RECIPES, JSON.stringify(Array.from(ids)));
}

function removeDeletedRecipeId(id: string) {
  const ids = new Set(getDeletedRecipeIds());
  ids.delete(id);
  localStorage.setItem(STORAGE_KEYS.DELETED_RECIPES, JSON.stringify(Array.from(ids)));
}

// Helper to strip undefined values from objects before writing to Firestore
function cleanData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanData) as unknown as T;
  }
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = typeof value === 'object' && value !== null ? cleanData(value) : value;
    }
  }
  return cleaned as T;
}

// Custom event to broadcast changes across components in local mode
const LOCAL_SYNC_EVENT = 'eatiof_local_data_changed';

function notifyLocalChange() {
  window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));
}

// ==========================================
// SEEDING FUNCTIONALITY
// ==========================================
export async function seedInitialData(forceReset = false): Promise<void> {
  // LocalStorage Seeding
  const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
  if (!isSeeded || forceReset) {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(INITIAL_WEEKLY_MENU));
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(INITIAL_SHOPPING_LIST));
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(INITIAL_PANTRY_ITEMS));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    notifyLocalChange();
  }

  if (isFirebaseConfigured && db) {
    // Non-blocking background Firestore sync with fast timeout fallback
    runFirestoreOp(
      (async () => {
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        const existingIds = new Set(recipesSnap.docs.map((d) => d.id));

        const batch = writeBatch(db);
        let needsCommit = false;

        // Seed any missing initial recipes into Firestore
        for (const recipe of INITIAL_RECIPES) {
          if (!existingIds.has(recipe.id) || forceReset) {
            batch.set(doc(db, 'recipes', recipe.id), cleanData(recipe));
            needsCommit = true;
          }
        }

        // Seed any local stored recipes that aren't in Firestore yet
        const localRecipes = getLocalRecipes();
        for (const recipe of localRecipes) {
          if (!existingIds.has(recipe.id) || forceReset) {
            batch.set(doc(db, 'recipes', recipe.id), cleanData(recipe));
            needsCommit = true;
          }
        }

        // Seed Weekly Menu if empty
        const menuSnap = await getDocs(collection(db, 'weekly_menu'));
        if (menuSnap.empty || forceReset) {
          for (const menuItem of INITIAL_WEEKLY_MENU) {
            batch.set(doc(db, 'weekly_menu', menuItem.id), cleanData(menuItem));
            needsCommit = true;
          }
        }

        // Seed Shopping List if empty
        const shopSnap = await getDocs(collection(db, 'shopping_list'));
        if (shopSnap.empty || forceReset) {
          for (const shopItem of INITIAL_SHOPPING_LIST) {
            batch.set(doc(db, 'shopping_list', shopItem.id), cleanData(shopItem));
            needsCommit = true;
          }
        }

        // Seed Pantry if empty
        const pantrySnap = await getDocs(collection(db, 'pantry'));
        if (pantrySnap.empty || forceReset) {
          for (const pantryItem of INITIAL_PANTRY_ITEMS) {
            batch.set(doc(db, 'pantry', pantryItem.id), cleanData(pantryItem));
            needsCommit = true;
          }
        }

        if (needsCommit) {
          await batch.commit();
          console.log('✅ Firestore sincronizzato correttamente con tutte le ricette e i dati!');
        }
      })(),
      1500
    );
  }
}

// ==========================================
// REAL-TIME SUBSCRIBERS
// ==========================================

export function subscribeToRecipes(callback: (recipes: Recipe[]) => void): () => void {
  let lastFirestoreRecipes: Recipe[] = [];

  const emitMerged = (firestoreRecipes: Recipe[] = lastFirestoreRecipes) => {
    lastFirestoreRecipes = firestoreRecipes;
    const map = new Map<string, Recipe>();
    const deletedIds = new Set(getDeletedRecipeIds());

    // 1. Initial recipes (if not deleted)
    INITIAL_RECIPES.forEach((r) => {
      if (!deletedIds.has(r.id)) map.set(r.id, r);
    });
    // 2. Local recipes (if not deleted)
    getLocalRecipes().forEach((r) => {
      if (!deletedIds.has(r.id)) map.set(r.id, r);
    });
    // 3. Firestore recipes (if not deleted)
    firestoreRecipes.forEach((r) => {
      if (!deletedIds.has(r.id)) map.set(r.id, r);
    });

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(merged));
    callback(merged);
  };

  emitMerged();

  // Always listen to local sync events for instant UI reactivity
  const localHandler = () => emitMerged();
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    unsubFirestore = onSnapshot(
      collection(db, 'recipes'),
      (snapshot) => {
        const firestoreRecipes: Recipe[] = [];
        snapshot.forEach((docSnap) => {
          firestoreRecipes.push({ id: docSnap.id, ...docSnap.data() } as Recipe);
        });
        emitMerged(firestoreRecipes);
      },
      (err) => {
        console.warn('Fallback a LocalStorage per recipes:', err?.message || err);
        emitMerged();
      }
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

export function subscribeToWeeklyMenu(callback: (menu: WeeklyMenuItem[]) => void): () => void {
  let lastFirestoreMenu: WeeklyMenuItem[] = [];

  const emitMerged = (firestoreMenu: WeeklyMenuItem[] = lastFirestoreMenu) => {
    lastFirestoreMenu = firestoreMenu;
    const map = new Map<string, WeeklyMenuItem>();
    getLocalWeeklyMenu().forEach((m) => map.set(m.id, m));
    firestoreMenu.forEach((m) => map.set(m.id, m));
    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(merged));
    callback(merged);
  };

  emitMerged();

  const localHandler = () => emitMerged();
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    unsubFirestore = onSnapshot(
      collection(db, 'weekly_menu'),
      (snapshot) => {
        const firestoreMenu: WeeklyMenuItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreMenu.push({ id: docSnap.id, ...docSnap.data() } as WeeklyMenuItem);
        });
        emitMerged(firestoreMenu);
      },
      (err) => {
        console.warn('Fallback a LocalStorage per weekly_menu:', err?.message || err);
        emitMerged();
      }
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

// Global tracking of explicitly deleted item IDs to prevent sync resurrection
const deletedPantryIds = new Set<string>();
const deletedShoppingIds = new Set<string>();

export function subscribeToShoppingList(callback: (items: ShoppingListItem[]) => void): () => void {
  let lastFirestoreItems: ShoppingListItem[] = [];

  const emitMerged = (firestoreItems: ShoppingListItem[] = lastFirestoreItems) => {
    lastFirestoreItems = firestoreItems;
    const map = new Map<string, ShoppingListItem>();

    // 1. Local items
    getLocalShoppingList().forEach((i) => {
      if (!deletedShoppingIds.has(i.id)) map.set(i.id, i);
    });
    // 2. Firestore items
    firestoreItems.forEach((i) => {
      if (!deletedShoppingIds.has(i.id)) map.set(i.id, i);
    });

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(merged));
    callback(merged);
  };

  emitMerged();

  const localHandler = () => emitMerged();
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    unsubFirestore = onSnapshot(
      collection(db, 'shopping_list'),
      (snapshot) => {
        const firestoreItems: ShoppingListItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreItems.push({ id: docSnap.id, ...docSnap.data() } as ShoppingListItem);
        });
        emitMerged(firestoreItems);
      },
      (err) => {
        console.warn('Fallback a LocalStorage per shopping_list:', err?.message || err);
        emitMerged();
      }
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

export function subscribeToPantryItems(callback: (items: PantryItem[]) => void): () => void {
  let lastFirestorePantry: PantryItem[] = [];

  const emitMerged = (firestorePantry: PantryItem[] = lastFirestorePantry) => {
    lastFirestorePantry = firestorePantry;
    const map = new Map<string, PantryItem>();

    // 1. Local items first (with cleaned category)
    getLocalPantryItems().forEach((item) => {
      if (deletedPantryIds.has(item.id)) return;
      let cat = item.category;
      if (cat && cat.includes('font-bold')) {
        cat = cat.includes('Freezer') ? 'Freezer' : 'Frigo';
      }
      map.set(item.id, { ...item, category: cat as any });
    });

    // 2. Remote Firestore items (with cleaned category)
    firestorePantry.forEach((item) => {
      if (deletedPantryIds.has(item.id)) return;
      let cat = item.category;
      if (cat && cat.includes('font-bold')) {
        cat = cat.includes('Freezer') ? 'Freezer' : 'Frigo';
      }
      map.set(item.id, { ...item, category: cat as any });
    });

    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(merged));
    callback(merged);
  };

  emitMerged();

  const localHandler = () => emitMerged();
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    unsubFirestore = onSnapshot(
      collection(db, 'pantry'),
      (snapshot) => {
        const firestorePantry: PantryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PantryItem;
          let cat = data.category;
          if (cat && cat.includes('font-bold')) {
            cat = cat.includes('Freezer') ? 'Freezer' : 'Frigo';
          }
          firestorePantry.push({ id: docSnap.id, ...data, category: cat as any });
        });
        emitMerged(firestorePantry);
      },
      (err) => {
        console.warn('Fallback a LocalStorage per pantry:', err?.message || err);
        emitMerged();
      }
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

// ==========================================
// LOCAL STORAGE HELPERS
// ==========================================
function getLocalRecipes(): Recipe[] {
  const data = localStorage.getItem(STORAGE_KEYS.RECIPES);
  let recipes: Recipe[] = [];
  if (data) {
    try {
      recipes = JSON.parse(data);
    } catch (e) {
      recipes = [];
    }
  }

  if (!recipes || recipes.length === 0) {
    recipes = [...INITIAL_RECIPES];
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  }

  // Backfill missing nutrition information for existing stored recipes
  let wasUpdated = false;
  const updatedRecipes = recipes.map((r) => {
    if (!r.nutrition) {
      const initMatch = INITIAL_RECIPES.find((init) => init.id === r.id || init.name.toLowerCase() === r.name.toLowerCase());
      wasUpdated = true;
      return {
        ...r,
        nutrition: initMatch?.nutrition || { calories: 420, protein: 18, fat: 16, carbs: 55 }
      };
    }
    return r;
  });

  if (wasUpdated) {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(updatedRecipes));
  }

  return updatedRecipes;
}

function getLocalWeeklyMenu(): WeeklyMenuItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_MENU);
  return data ? JSON.parse(data) : INITIAL_WEEKLY_MENU;
}

function getLocalShoppingList(): ShoppingListItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
  return data ? JSON.parse(data) : INITIAL_SHOPPING_LIST;
}

export function getLocalPantryItems(): PantryItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.PANTRY);
  const items: PantryItem[] = data ? JSON.parse(data) : INITIAL_PANTRY_ITEMS;
  let hasChanges = false;
  const cleaned = items.map((item) => {
    if (item.category && item.category.includes('font-bold')) {
      hasChanges = true;
      return {
        ...item,
        category: (item.category.includes('Freezer') ? 'Freezer' : 'Frigo') as any
      };
    }
    return item;
  });
  if (hasChanges) {
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(cleaned));
  }
  return cleaned;
}

// Helper for non-blocking Firestore operations with fast timeout fallback
async function runFirestoreOp(promise: Promise<any>, timeoutMs = 1200): Promise<void> {
  try {
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    await Promise.race([promise, timeoutPromise]);
  } catch (err) {
    console.warn('⚠️ Firestore write warning/timeout (operazione eseguita in locale):', err);
  }
}

// ==========================================
// RECIPES CRUD
// ==========================================
export async function saveRecipe(recipe: Recipe): Promise<void> {
  const recipeId = recipe.id || `recipe-${Date.now()}`;
  const recipeToSave = { ...recipe, id: recipeId };

  // Remove from deleted tracking if re-saving/editing
  removeDeletedRecipeId(recipeId);

  // Always update LocalStorage first for instant local persistence
  const recipes = getLocalRecipes().filter((r) => r.id !== recipeId);
  recipes.push(recipeToSave);
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(setDoc(doc(db, 'recipes', recipeId), cleanData(recipeToSave)));
  }
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  // Permanently track this recipe ID as deleted so default/initial data doesn't resurrect it
  addDeletedRecipeId(recipeId);

  const recipes = getLocalRecipes().filter((r) => r.id !== recipeId);
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(deleteDoc(doc(db, 'recipes', recipeId)));
  }
}

// ==========================================
// WEEKLY MENU CRUD
// ==========================================
export async function addWeeklyMenuItem(
  day: DayOfWeek,
  mealType: MealType,
  recipeId: string,
  recipeName: string,
  weekId: string = 'current'
): Promise<void> {
  const slotId = `menu-${weekId}-${day}-${mealType}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const menuItem: WeeklyMenuItem = {
    id: slotId,
    day,
    mealType,
    recipeId,
    recipeName,
    weekId
  };

  const menu = getLocalWeeklyMenu();
  menu.push(menuItem);
  localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(setDoc(doc(db, 'weekly_menu', slotId), cleanData(menuItem)));
  }
}

export async function setWeeklySlot(
  day: DayOfWeek,
  mealType: MealType,
  recipeId: string,
  recipeName: string,
  weekId: string = 'current'
): Promise<void> {
  return addWeeklyMenuItem(day, mealType, recipeId, recipeName, weekId);
}

export async function removeWeeklyMenuItem(itemId: string): Promise<void> {
  const menu = getLocalWeeklyMenu().filter((m) => m.id !== itemId);
  localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(deleteDoc(doc(db, 'weekly_menu', itemId)));
  }
}

export async function removeWeeklySlot(
  day: DayOfWeek,
  mealType: MealType,
  weekId: string = 'current'
): Promise<void> {
  const menu = getLocalWeeklyMenu().filter((m) => {
    const mWeek = m.weekId || 'current';
    return !(mWeek === weekId && m.day === day && m.mealType === mealType);
  });
  localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    const doRemove = async () => {
      const snap = await getDocs(collection(db, 'weekly_menu'));
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const mWeek = data.weekId || 'current';
        if (mWeek === weekId && data.day === day && data.mealType === mealType) {
          batch.delete(docSnap.ref);
        }
      });
      await batch.commit();
    };
    runFirestoreOp(doRemove());
  }
}

// ==========================================
// SHOPPING LIST CRUD
// ==========================================
export async function toggleShoppingItem(itemId: string, currentStatus: boolean): Promise<void> {
  const items = getLocalShoppingList();
  const item = items.find((i) => i.id === itemId);
  if (item) {
    item.isChecked = !currentStatus;
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
    notifyLocalChange();
  }

  if (isFirebaseConfigured && db) {
    runFirestoreOp(updateDoc(doc(db, 'shopping_list', itemId), { isChecked: !currentStatus }));
  }
}

export async function addManualShoppingItem(ingredientName: string, quantity: number | string, unit: string): Promise<void> {
  const newItemId = `shop-manual-${Date.now()}`;
  const newItem: ShoppingListItem = {
    id: newItemId,
    ingredientName,
    quantity,
    unit: unit || 'pz',
    isChecked: false,
    addedManually: true
  };

  const items = getLocalShoppingList();
  items.unshift(newItem);
  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(setDoc(doc(db, 'shopping_list', newItemId), cleanData(newItem)));
  }
}

export async function removeShoppingItem(itemId: string): Promise<void> {
  deletedShoppingIds.add(itemId);
  const items = getLocalShoppingList().filter((i) => i.id !== itemId);
  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(deleteDoc(doc(db, 'shopping_list', itemId)));
  }
}

export async function clearCheckedItems(): Promise<void> {
  const itemsToKeep: ShoppingListItem[] = [];
  getLocalShoppingList().forEach((i) => {
    if (i.isChecked) {
      deletedShoppingIds.add(i.id);
    } else {
      itemsToKeep.push(i);
    }
  });
  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(itemsToKeep));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    const doClear = async () => {
      const snap = await getDocs(collection(db, 'shopping_list'));
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        if (docSnap.data().isChecked) {
          batch.delete(docSnap.ref);
        }
      });
      await batch.commit();
    };
    runFirestoreOp(doClear());
  }
}

// ==========================================
// GENERATE SPESA (ALGORITHM)
// Aggregates ingredients from weekly menu items
// ==========================================
export async function generateShoppingListFromMenu(
  weeklyMenu: WeeklyMenuItem[],
  recipes: Recipe[],
  targetWeekId: string = 'current'
): Promise<number> {
  // Create a map for fast recipe lookup
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => recipeMap.set(r.id, r));

  // Filter weeklyMenu for the target week
  const filteredMenu = weeklyMenu.filter((m) => {
    const itemWeek = m.weekId || 'current';
    return itemWeek === targetWeekId;
  });

  // Map to aggregate ingredients: Key = normalized "ingredientName_unit"
  const aggregatedMap = new Map<
    string,
    {
      name: string;
      numericQty: number;
      strQty: string[];
      unit: string;
      sources: Set<string>;
    }
  >();

  for (const menuItem of filteredMenu) {
    const recipe = recipeMap.get(menuItem.recipeId);
    if (!recipe) continue;

    for (const ing of recipe.ingredients) {
      const normalizedName = ing.name.trim();
      const unitKey = (ing.unit || '').trim().toLowerCase();
      const mapKey = `${normalizedName.toLowerCase()}_${unitKey}`;

      let current = aggregatedMap.get(mapKey);
      if (!current) {
        current = {
          name: normalizedName,
          numericQty: 0,
          strQty: [],
          unit: ing.unit || '',
          sources: new Set<string>()
        };
        aggregatedMap.set(mapKey, current);
      }

      current.sources.add(recipe.name);

      // Add quantity
      const parsed = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity);
      if (!isNaN(parsed) && String(ing.quantity).trim() !== 'q.b.') {
        current.numericQty += parsed;
      } else {
        current.strQty.push(String(ing.quantity));
      }
    }
  }

  // Preserve existing manual or checked states if possible
  const currentShoppingItems = isFirebaseConfigured ? [] : getLocalShoppingList();
  const existingCheckedNames = new Set(
    currentShoppingItems.filter((i) => i.isChecked).map((i) => i.ingredientName.toLowerCase())
  );
  const manualItems = currentShoppingItems.filter((i) => i.addedManually);

  // Build new shopping list items array
  const newShoppingList: ShoppingListItem[] = [];
  let index = 1;

  aggregatedMap.forEach((val) => {
    let finalQty: number | string = val.numericQty;
    if (val.numericQty === 0 && val.strQty.length > 0) {
      finalQty = 'q.b.';
    } else if (val.strQty.length > 0) {
      finalQty = `${val.numericQty} (+ q.b.)`;
    }

    const isChecked = existingCheckedNames.has(val.name.toLowerCase());

    newShoppingList.push({
      id: `shop-gen-${index++}-${Date.now()}`,
      ingredientName: val.name,
      quantity: finalQty,
      unit: val.unit,
      isChecked,
      recipeSources: Array.from(val.sources)
    });
  });

  // Preserve manual items
  manualItems.forEach((m) => {
    newShoppingList.push(m);
  });

  // Save to Firebase or LocalStorage
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(collection(db, 'shopping_list'));
    const batch = writeBatch(db);

    // Clear old generated items
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Write new items
    for (const item of newShoppingList) {
      batch.set(doc(db, 'shopping_list', item.id), cleanData(item));
    }

    await batch.commit();
  } else {
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(newShoppingList));
    notifyLocalChange();
  }

  return newShoppingList.length;
}

// ==========================================
// PANTRY / FRIGORIFERO CRUD
// ==========================================
export async function savePantryItem(item: PantryItem): Promise<void> {
  const itemId = item.id || `pantry-${Date.now()}`;
  deletedPantryIds.delete(itemId);
  const itemToSave = { ...item, id: itemId };

  const items = getLocalPantryItems();
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx >= 0) {
    items[idx] = itemToSave;
  } else {
    items.unshift(itemToSave);
  }
  localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(setDoc(doc(db, 'pantry', itemId), cleanData(itemToSave)));
  }
}

export async function deletePantryItem(itemId: string): Promise<void> {
  deletedPantryIds.add(itemId);
  const items = getLocalPantryItems().filter((i) => i.id !== itemId);
  localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    runFirestoreOp(deleteDoc(doc(db, 'pantry', itemId)));
  }
}

export async function autoCheckPantryItemsInShoppingList(pantryItems: PantryItem[]): Promise<number> {
  const shoppingItems = isFirebaseConfigured ? [] : getLocalShoppingList();
  if (shoppingItems.length === 0) return 0;

  let checkedCount = 0;
  const updatedShoppingItems = shoppingItems.map((shop) => {
    // Check if ingredient name matches any pantry item (case insensitive)
    const match = pantryItems.find((p) => {
      const pName = p.name.toLowerCase().trim();
      const sName = shop.ingredientName.toLowerCase().trim();
      return pName.includes(sName) || sName.includes(pName);
    });

    if (match && !shop.isChecked) {
      checkedCount++;
      return { ...shop, isChecked: true };
    }
    return shop;
  });

  if (checkedCount > 0) {
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      for (const item of updatedShoppingItems) {
        batch.set(doc(db, 'shopping_list', item.id), cleanData(item));
      }
      await batch.commit();
    } else {
      localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(updatedShoppingItems));
      notifyLocalChange();
    }
  }

  return checkedCount;
}
