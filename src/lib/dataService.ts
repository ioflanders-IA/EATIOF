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
import { db, auth, isFirebaseConfigured } from './firebaseConfig';
import { getSavedUserSession } from './familyAuthService';
import { Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem, DayOfWeek, MealType } from '../types';
import { INITIAL_RECIPES, INITIAL_WEEKLY_MENU, INITIAL_SHOPPING_LIST, INITIAL_PANTRY_ITEMS } from '../data/initialData';

// Ottiene l'ID univoco dell'utente o membro attivo
export function getCurrentUserId(): string {
  if (auth && auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  const session = getSavedUserSession();
  if (session && session.uid) {
    return session.uid;
  }
  return 'default_user';
}

// Collezione condivisa della famiglia (tutti i dispositivi e membri condividono la stessa cucina)
const STORAGE_KEYS = {
  RECIPES: 'eatiof_recipes_v1',
  WEEKLY_MENU: 'eatiof_weekly_menu_v1',
  SHOPPING_LIST: 'eatiof_shopping_list_v1',
  PANTRY: 'eatiof_pantry_v1',
  SEEDED: 'eatiof_seeded_v5'
};

// Helper per pulire i nomi delle ricette rimuovendo prefissi e suffissi indesiderati
export function cleanRecipeName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^Primo Piatto\s+/i, '')
    .replace(/^Secondo Piatto\s+/i, '')
    .replace(/\s*\(\s*Classica\s*\)/gi, '')
    .replace(/\s*\(\s*classica\s*\)/gi, '')
    .replace(/\s*\(\s*zuppa\s*\)/gi, '')
    .replace(/\s*\(\s*Zuppa\s*\)/gi, '')
    .trim();
}

// Helper per pulire i campi undefined prima del salvataggio in Firestore
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

// Evento custom per trasmettere modifiche locali immediate nella stessa finestra
const LOCAL_SYNC_EVENT = 'eatiof_local_data_changed';

function notifyLocalChange() {
  window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));
}

// Error logger per Firestore
function logFirestoreError(error: unknown, operation: string, path: string) {
  console.warn(`⚠️ Firebase Firestore [${operation}] su '${path}':`, error);
}

// ==========================================
// SEEDING INITIAL DATA (PER-COLLECTION CHECK)
// ==========================================
export async function seedInitialData(forceReset = false): Promise<void> {
  const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);

  if (forceReset) {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(INITIAL_WEEKLY_MENU));
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(INITIAL_SHOPPING_LIST));
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(INITIAL_PANTRY_ITEMS));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    notifyLocalChange();
  } else if (!isSeeded) {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(INITIAL_WEEKLY_MENU));
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(INITIAL_SHOPPING_LIST));
    localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(INITIAL_PANTRY_ITEMS));
    localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
    notifyLocalChange();
  }

  // Seed Firestore ONLY if forceReset or if brand new unseeded setup
  if (isFirebaseConfigured && db && (forceReset || !isSeeded)) {
    try {
      const recipesSnap = await getDocs(collection(db, 'recipes'));
      const menuSnap = await getDocs(collection(db, 'weekly_menu'));
      const pantrySnap = await getDocs(collection(db, 'pantry'));
      const shopSnap = await getDocs(collection(db, 'shopping_list'));

      const isFirestoreEmpty = recipesSnap.empty && menuSnap.empty && pantrySnap.empty && shopSnap.empty;

      if (isFirestoreEmpty || forceReset) {
        const batch = writeBatch(db);
        for (const recipe of INITIAL_RECIPES) {
          batch.set(doc(db, 'recipes', recipe.id), cleanData(recipe));
        }
        for (const menuItem of INITIAL_WEEKLY_MENU) {
          batch.set(doc(db, 'weekly_menu', menuItem.id), cleanData(menuItem));
        }
        for (const item of INITIAL_PANTRY_ITEMS) {
          batch.set(doc(db, 'pantry', item.id), cleanData(item));
        }
        for (const shopItem of INITIAL_SHOPPING_LIST) {
          batch.set(doc(db, 'shopping_list', shopItem.id), cleanData(shopItem));
        }
        await batch.commit();
        console.log('✅ Inizializzazione Firestore completata con dati iniziali!');
      }
    } catch (err) {
      logFirestoreError(err, 'seedInitialData', 'shared');
    }
  }
}

// ==========================================
// REAL-TIME SUBSCRIBERS (FIRESTORE STREAMING)
// ==========================================

export function subscribeToRecipes(callback: (recipes: Recipe[]) => void): () => void {
  callback(getLocalRecipes());

  const localHandler = () => callback(getLocalRecipes());
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
        localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(firestoreRecipes));
        callback(firestoreRecipes);
      },
      (err) => logFirestoreError(err, 'subscribeToRecipes', 'recipes')
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

export function subscribeToWeeklyMenu(callback: (menu: WeeklyMenuItem[]) => void): () => void {
  callback(getLocalWeeklyMenu());

  const localHandler = () => callback(getLocalWeeklyMenu());
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
        localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(firestoreMenu));
        callback(firestoreMenu);
      },
      (err) => logFirestoreError(err, 'subscribeToWeeklyMenu', 'weekly_menu')
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

export function subscribeToShoppingList(callback: (items: ShoppingListItem[]) => void): () => void {
  callback(getLocalShoppingList());

  const localHandler = () => callback(getLocalShoppingList());
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    unsubFirestore = onSnapshot(
      collection(db, 'shopping_list'),
      (snapshot) => {
        const firestoreShopping: ShoppingListItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreShopping.push({ id: docSnap.id, ...docSnap.data() } as ShoppingListItem);
        });
        localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(firestoreShopping));
        callback(firestoreShopping);
      },
      (err) => logFirestoreError(err, 'subscribeToShoppingList', 'shopping_list')
    );
  }

  return () => {
    window.removeEventListener(LOCAL_SYNC_EVENT, localHandler);
    window.removeEventListener('storage', localHandler);
    unsubFirestore();
  };
}

export function subscribeToPantryItems(callback: (items: PantryItem[]) => void): () => void {
  callback(getLocalPantryItems());

  const localHandler = () => callback(getLocalPantryItems());
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    unsubFirestore = onSnapshot(
      collection(db, 'pantry'),
      (snapshot) => {
        const firestoreItems: PantryItem[] = [];
        snapshot.forEach((docSnap) => {
          let data = docSnap.data() as PantryItem;
          let cat = data.category;
          if (cat && typeof cat === 'string' && cat.includes('font-bold')) {
            cat = cat.includes('Freezer') ? 'Freezer' : 'Frigo';
          }
          firestoreItems.push({ ...data, id: docSnap.id, category: (cat || 'Frigo') as any });
        });
        localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(firestoreItems));
        callback(firestoreItems);
      },
      (err) => logFirestoreError(err, 'subscribeToPantryItems', 'pantry')
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
  const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
  if (data === null) {
    if (!isSeeded) {
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(INITIAL_RECIPES));
      return INITIAL_RECIPES;
    }
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function getLocalWeeklyMenu(): WeeklyMenuItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_MENU);
  const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
  if (data === null) {
    if (!isSeeded) {
      localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(INITIAL_WEEKLY_MENU));
      return INITIAL_WEEKLY_MENU;
    }
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function getLocalShoppingList(): ShoppingListItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
  const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
  if (data === null) {
    if (!isSeeded) {
      localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(INITIAL_SHOPPING_LIST));
      return INITIAL_SHOPPING_LIST;
    }
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function getLocalPantryItems(): PantryItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.PANTRY);
  const isSeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
  if (data === null) {
    if (!isSeeded) {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(INITIAL_PANTRY_ITEMS));
      return INITIAL_PANTRY_ITEMS;
    }
    return [];
  }
  let items: PantryItem[] = [];
  try {
    items = JSON.parse(data);
  } catch (e) {
    return [];
  }
  return items.map((item) => {
    let cat = item.category;
    if (cat && typeof cat === 'string' && cat.includes('font-bold')) {
      cat = cat.includes('Freezer') ? 'Freezer' : 'Frigo';
    }
    return { ...item, category: (cat || 'Frigo') as any };
  });
}

// ==========================================
// RECIPES CRUD
// ==========================================
export async function saveRecipe(recipe: Recipe): Promise<void> {
  const recipeId = recipe.id || `recipe-${Date.now()}`;
  const userId = getCurrentUserId();
  const recipeToSave = { ...recipe, id: recipeId, userId };

  const recipes = getLocalRecipes().filter((r) => r.id !== recipeId);
  recipes.push(recipeToSave);
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    setDoc(doc(db, 'recipes', recipeId), cleanData(recipeToSave), { merge: true }).catch((err) => {
      logFirestoreError(err, 'saveRecipe', `recipes/${recipeId}`);
    });
  }
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const recipes = getLocalRecipes().filter((r) => r.id !== recipeId);
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    deleteDoc(doc(db, 'recipes', recipeId)).catch((err) => {
      logFirestoreError(err, 'deleteRecipe', `recipes/${recipeId}`);
    });
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
  weekId: string = 'current',
  notes?: string,
  dosages?: Record<string, number>
): Promise<void> {
  const userId = getCurrentUserId();
  const slotId = `menu-${weekId}-${day}-${mealType}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const menuItem: WeeklyMenuItem = {
    id: slotId,
    day,
    mealType,
    recipeId,
    recipeName,
    weekId,
    userId,
    notes,
    dosages
  };

  const menu = getLocalWeeklyMenu();
  menu.push(menuItem);
  localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    setDoc(doc(db, 'weekly_menu', slotId), cleanData(menuItem), { merge: true }).catch((err) => {
      logFirestoreError(err, 'addWeeklyMenuItem', `weekly_menu/${slotId}`);
    });
  }
}

export async function updateWeeklyMenuItemDetails(
  slotId: string,
  notes?: string,
  dosages?: Record<string, number>
): Promise<void> {
  const menu = getLocalWeeklyMenu();
  const item = menu.find((m) => m.id === slotId);
  if (item) {
    if (notes !== undefined) item.notes = notes;
    if (dosages !== undefined) item.dosages = dosages;
    localStorage.setItem(STORAGE_KEYS.WEEKLY_MENU, JSON.stringify(menu));
    notifyLocalChange();

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'weekly_menu', slotId), cleanData(item), { merge: true }).catch((err) => {
        logFirestoreError(err, 'updateWeeklyMenuItemDetails', `weekly_menu/${slotId}`);
      });
    }
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
    deleteDoc(doc(db, 'weekly_menu', itemId)).catch((err) => {
      logFirestoreError(err, 'removeWeeklyMenuItem', `weekly_menu/${itemId}`);
    });
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
    getDocs(collection(db, 'weekly_menu')).then((snap) => {
      const batch = writeBatch(db);
      let hasDeletes = false;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const mWeek = data.weekId || 'current';
        if (mWeek === weekId && data.day === day && data.mealType === mealType) {
          batch.delete(docSnap.ref);
          hasDeletes = true;
        }
      });
      if (hasDeletes) {
        batch.commit().catch((err) => logFirestoreError(err, 'removeWeeklySlot.commit', 'weekly_menu'));
      }
    }).catch((err) => logFirestoreError(err, 'removeWeeklySlot', 'weekly_menu'));
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

    if (isFirebaseConfigured && db) {
      setDoc(doc(db, 'shopping_list', itemId), cleanData(item), { merge: true }).catch((err) => {
        logFirestoreError(err, 'toggleShoppingItem', `shopping_list/${itemId}`);
      });
    }
  }
}

export async function addManualShoppingItem(ingredientName: string, quantity: number | string, unit: string): Promise<void> {
  const userId = getCurrentUserId();
  const newItemId = `shop-manual-${Date.now()}`;
  const newItem: ShoppingListItem = {
    id: newItemId,
    ingredientName,
    quantity,
    unit: unit || 'pz',
    isChecked: false,
    addedManually: true,
    userId
  };

  const items = getLocalShoppingList();
  items.unshift(newItem);
  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    setDoc(doc(db, 'shopping_list', newItemId), cleanData(newItem), { merge: true }).catch((err) => {
      logFirestoreError(err, 'addManualShoppingItem', `shopping_list/${newItemId}`);
    });
  }
}

export async function removeShoppingItem(itemId: string, ingredientName?: string): Promise<void> {
  const currentItems = getLocalShoppingList();
  const targetItem = currentItems.find((i) => i.id === itemId);
  const targetName = (ingredientName || targetItem?.ingredientName || '').trim().toLowerCase();

  const items = currentItems.filter((i) => {
    if (i.id === itemId) return false;
    if (targetName && i.ingredientName && i.ingredientName.trim().toLowerCase() === targetName) return false;
    return true;
  });

  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    deleteDoc(doc(db, 'shopping_list', itemId)).catch((err) => {
      logFirestoreError(err, 'removeShoppingItem', `shopping_list/${itemId}`);
    });
  }
}

export async function clearCheckedItems(): Promise<void> {
  const itemsToKeep = getLocalShoppingList().filter((i) => !i.isChecked);
  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(itemsToKeep));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    getDocs(collection(db, 'shopping_list')).then((snap) => {
      const batch = writeBatch(db);
      let hasDeletes = false;
      snap.forEach((docSnap) => {
        if (docSnap.data().isChecked) {
          batch.delete(docSnap.ref);
          hasDeletes = true;
        }
      });
      if (hasDeletes) {
        batch.commit().catch((err) => logFirestoreError(err, 'clearCheckedItems.commit', 'shopping_list'));
      }
    }).catch((err) => logFirestoreError(err, 'clearCheckedItems', 'shopping_list'));
  }
}

// ==========================================
// GENERATE SPESA (ALGORITHM)
// ==========================================
export async function generateShoppingListFromMenu(
  weeklyMenu: WeeklyMenuItem[],
  recipes: Recipe[],
  targetWeekId: string = 'current'
): Promise<number> {
  const userId = getCurrentUserId();
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => recipeMap.set(r.id, r));

  const filteredMenu = weeklyMenu.filter((m) => {
    const itemWeek = m.weekId || 'current';
    return itemWeek === targetWeekId;
  });

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

      const parsed = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity);
      if (!isNaN(parsed) && String(ing.quantity).trim() !== 'q.b.') {
        current.numericQty += parsed;
      } else {
        current.strQty.push(String(ing.quantity));
      }
    }
  }

  const currentShoppingItems = getLocalShoppingList();
  const existingCheckedNames = new Set(
    currentShoppingItems.filter((i) => i.isChecked).map((i) => i.ingredientName.toLowerCase())
  );
  const manualItems = currentShoppingItems.filter((i) => i.addedManually);

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
      recipeSources: Array.from(val.sources),
      userId
    });
  });

  manualItems.forEach((m) => {
    newShoppingList.push({ ...m, userId });
  });

  localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(newShoppingList));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(collection(db, 'shopping_list'));
      const batch = writeBatch(db);

      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      for (const item of newShoppingList) {
        batch.set(doc(db, 'shopping_list', item.id), cleanData(item));
      }

      await batch.commit();
    } catch (err) {
      logFirestoreError(err, 'generateShoppingListFromMenu', 'shopping_list');
    }
  }

  return newShoppingList.length;
}

// ==========================================
// PANTRY / FRIGORIFERO CRUD (SHARED FAMILY)
// ==========================================
export async function savePantryItem(item: PantryItem): Promise<void> {
  const itemId = item.id && item.id.trim() ? item.id : `pantry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const userId = getCurrentUserId();
  const itemToSave: PantryItem = { ...item, id: itemId, userId };

  // 1. Optimistic Local State Update
  const currentItems = getLocalPantryItems();
  const filtered = currentItems.filter((i) => i.id !== itemId);
  filtered.unshift(itemToSave);
  localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(filtered));
  notifyLocalChange();

  // 2. Firestore Sync
  if (isFirebaseConfigured && db) {
    setDoc(doc(db, 'pantry', itemId), cleanData(itemToSave), { merge: true }).catch((err) => {
      logFirestoreError(err, 'savePantryItem', `pantry/${itemId}`);
    });
  }
}

export async function deletePantryItem(itemId: string, itemName?: string): Promise<void> {
  // 1. Optimistic Local State Update
  const currentItems = getLocalPantryItems();
  const targetItem = currentItems.find((i) => i.id === itemId);
  const targetName = (itemName || targetItem?.name || '').trim().toLowerCase();

  const items = currentItems.filter((i) => i.id !== itemId);
  localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(items));
  notifyLocalChange();

  // 2. Firestore Delete
  if (isFirebaseConfigured && db) {
    deleteDoc(doc(db, 'pantry', itemId)).catch((err) => {
      logFirestoreError(err, 'deletePantryItem', `pantry/${itemId}`);
    });

    if (targetName) {
      getDocs(collection(db, 'pantry')).then((snap) => {
        const batch = writeBatch(db);
        let hasDeletes = false;
        snap.forEach((docSnap) => {
          const dData = docSnap.data();
          const dName = (dData.name || '').trim().toLowerCase();
          if (docSnap.id === itemId || (targetName && dName === targetName)) {
            batch.delete(docSnap.ref);
            hasDeletes = true;
          }
        });
        if (hasDeletes) {
          batch.commit().catch((err) => logFirestoreError(err, 'deletePantryItemDuplicates.commit', 'pantry'));
        }
      }).catch((err) => logFirestoreError(err, 'deletePantryItemDuplicates', 'pantry'));
    }
  }
}

export async function autoCheckPantryItemsInShoppingList(pantryItems: PantryItem[]): Promise<number> {
  const shoppingItems = getLocalShoppingList();
  if (shoppingItems.length === 0) return 0;

  let checkedCount = 0;
  const updatedShoppingItems = shoppingItems.map((shop) => {
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
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(updatedShoppingItems));
    notifyLocalChange();

    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        for (const item of updatedShoppingItems) {
          batch.set(doc(db, 'shopping_list', item.id), cleanData(item));
        }
        await batch.commit();
      } catch (err) {
        logFirestoreError(err, 'autoCheckPantryItemsInShoppingList', 'shopping_list');
      }
    }
  }

  return checkedCount;
}
