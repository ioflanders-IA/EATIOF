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
import { Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem, Ingredient, DayOfWeek, MealType } from '../types';
import { INITIAL_RECIPES, INITIAL_WEEKLY_MENU, INITIAL_SHOPPING_LIST, INITIAL_PANTRY_ITEMS } from '../data/initialData';

// Ottiene l'ID univoco dell'utente attualmente attivo (Firebase Auth o sessione utente locale)
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

// Helper per garantire il percorso user-scoped in Firestore: /users/{userId}/{collectionName}
function getUserCollectionRef(collectionName: string) {
  const userId = getCurrentUserId();
  return collection(db!, 'users', userId, collectionName);
}

function getUserDocRef(collectionName: string, docId: string) {
  const userId = getCurrentUserId();
  return doc(db!, 'users', userId, collectionName, docId);
}

// Chiavi di local storage con prefisso utente per la cache locale
const BASE_STORAGE_KEYS = {
  RECIPES: 'eatiof_recipes_v1',
  WEEKLY_MENU: 'eatiof_weekly_menu_v1',
  SHOPPING_LIST: 'eatiof_shopping_list_v1',
  PANTRY: 'eatiof_pantry_v1',
  SEEDED: 'eatiof_seeded_v2'
};

function getStorageKey(key: string): string {
  const userId = getCurrentUserId();
  return `${key}_${userId}`;
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

// Evento custom per trasmettere modifiche locali
const LOCAL_SYNC_EVENT = 'eatiof_local_data_changed';

function notifyLocalChange() {
  window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));
}

// ==========================================
// SEEDING INITIAL DATA (USER-SCOPED)
// ==========================================
export async function seedInitialData(forceReset = false): Promise<void> {
  const userId = getCurrentUserId();
  const seededKey = getStorageKey(BASE_STORAGE_KEYS.SEEDED);
  const isSeeded = localStorage.getItem(seededKey);

  if (!isSeeded || forceReset) {
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.RECIPES), JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.WEEKLY_MENU), JSON.stringify(INITIAL_WEEKLY_MENU));
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(INITIAL_SHOPPING_LIST));
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PANTRY), JSON.stringify(INITIAL_PANTRY_ITEMS));
    localStorage.setItem(seededKey, 'true');
    notifyLocalChange();
  }

  if (isFirebaseConfigured && db) {
    try {
      const userRecipesCol = getUserCollectionRef('recipes');
      const recipesSnap = await getDocs(userRecipesCol);

      // Inserisce i dati di default se la sotto-collezione dell'utente è vuota
      if (recipesSnap.empty || forceReset) {
        console.log(`🌱 Popolamento iniziale Firestore per utente (${userId})...`);
        const batch = writeBatch(db);

        // Seed Recipes
        for (const recipe of INITIAL_RECIPES) {
          batch.set(getUserDocRef('recipes', recipe.id), cleanData({ ...recipe, userId }));
        }

        // Seed Weekly Menu
        for (const menuItem of INITIAL_WEEKLY_MENU) {
          batch.set(getUserDocRef('weekly_menu', menuItem.id), cleanData({ ...menuItem, userId }));
        }

        // Seed Shopping List
        for (const shopItem of INITIAL_SHOPPING_LIST) {
          batch.set(getUserDocRef('shopping_list', shopItem.id), cleanData({ ...shopItem, userId }));
        }

        // Seed Pantry
        for (const pantryItem of INITIAL_PANTRY_ITEMS) {
          batch.set(getUserDocRef('pantry', pantryItem.id), cleanData({ ...pantryItem, userId }));
        }

        await batch.commit();
        console.log(`✅ Firestore popolato con successo per l'utente (${userId})!`);
      } else {
        console.log(`🔥 Connesso a Firestore sotto l'utente (${userId}). Dati sincronizzati in tempo reale.`);
      }
    } catch (err) {
      console.warn('⚠️ Errore durante il seeding Firestore per utente:', err);
    }
  }
}

// ==========================================
// REAL-TIME SUBSCRIBERS (USER-SCOPED)
// ==========================================

export function subscribeToRecipes(callback: (recipes: Recipe[]) => void): () => void {
  callback(getLocalRecipes());

  const localHandler = () => callback(getLocalRecipes());
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    const userRecipesCol = getUserCollectionRef('recipes');
    unsubFirestore = onSnapshot(
      userRecipesCol,
      (snapshot) => {
        const firestoreRecipes: Recipe[] = [];
        snapshot.forEach((docSnap) => {
          firestoreRecipes.push({ id: docSnap.id, ...docSnap.data() } as Recipe);
        });
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.RECIPES), JSON.stringify(firestoreRecipes));
        callback(firestoreRecipes);
      },
      (err) => {
        console.warn('Fallback LocalStorage per recipes:', err?.message || err);
        callback(getLocalRecipes());
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
  callback(getLocalWeeklyMenu());

  const localHandler = () => callback(getLocalWeeklyMenu());
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    const userMenuCol = getUserCollectionRef('weekly_menu');
    unsubFirestore = onSnapshot(
      userMenuCol,
      (snapshot) => {
        const firestoreMenu: WeeklyMenuItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreMenu.push({ id: docSnap.id, ...docSnap.data() } as WeeklyMenuItem);
        });
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.WEEKLY_MENU), JSON.stringify(firestoreMenu));
        callback(firestoreMenu);
      },
      (err) => {
        console.warn('Fallback LocalStorage per weekly_menu:', err?.message || err);
        callback(getLocalWeeklyMenu());
      }
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
    const userShopCol = getUserCollectionRef('shopping_list');
    unsubFirestore = onSnapshot(
      userShopCol,
      (snapshot) => {
        const firestoreItems: ShoppingListItem[] = [];
        snapshot.forEach((docSnap) => {
          firestoreItems.push({ ...docSnap.data(), id: docSnap.id } as ShoppingListItem);
        });
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(firestoreItems));
        callback(firestoreItems);
      },
      (err) => {
        console.warn('Fallback LocalStorage per shopping_list:', err?.message || err);
        callback(getLocalShoppingList());
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
  callback(getLocalPantryItems());

  const localHandler = () => callback(getLocalPantryItems());
  window.addEventListener(LOCAL_SYNC_EVENT, localHandler);
  window.addEventListener('storage', localHandler);

  let unsubFirestore = () => {};

  if (isFirebaseConfigured && db) {
    const userPantryCol = getUserCollectionRef('pantry');
    unsubFirestore = onSnapshot(
      userPantryCol,
      (snapshot) => {
        const firestorePantry: PantryItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PantryItem;
          let cat = data.category;
          if (cat && typeof cat === 'string' && cat.includes('font-bold')) {
            cat = cat.includes('Freezer') ? 'Freezer' : 'Frigo';
          }
          firestorePantry.push({ ...data, id: docSnap.id, category: (cat || 'Frigo') as any });
        });
        localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PANTRY), JSON.stringify(firestorePantry));
        callback(firestorePantry);
      },
      (err) => {
        console.warn('Fallback LocalStorage per pantry:', err?.message || err);
        callback(getLocalPantryItems());
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
  const data = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.RECIPES));
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
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.RECIPES), JSON.stringify(recipes));
  }

  return recipes;
}

function getLocalWeeklyMenu(): WeeklyMenuItem[] {
  const data = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.WEEKLY_MENU));
  return data ? JSON.parse(data) : INITIAL_WEEKLY_MENU;
}

function getLocalShoppingList(): ShoppingListItem[] {
  const data = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST));
  return data ? JSON.parse(data) : INITIAL_SHOPPING_LIST;
}

export function getLocalPantryItems(): PantryItem[] {
  const data = localStorage.getItem(getStorageKey(BASE_STORAGE_KEYS.PANTRY));
  const items: PantryItem[] = data ? JSON.parse(data) : INITIAL_PANTRY_ITEMS;
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
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.RECIPES), JSON.stringify(recipes));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(getUserDocRef('recipes', recipeId), cleanData(recipeToSave));
    } catch (err) {
      console.warn('Errore salvataggio ricetta in Firestore:', err);
    }
  }
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  const recipes = getLocalRecipes().filter((r) => r.id !== recipeId);
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.RECIPES), JSON.stringify(recipes));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(getUserDocRef('recipes', recipeId));
    } catch (err) {
      console.warn('Errore eliminazione ricetta in Firestore:', err);
    }
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
  const userId = getCurrentUserId();
  const slotId = `menu-${weekId}-${day}-${mealType}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const menuItem: WeeklyMenuItem = {
    id: slotId,
    day,
    mealType,
    recipeId,
    recipeName,
    weekId,
    userId
  };

  const menu = getLocalWeeklyMenu();
  menu.push(menuItem);
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.WEEKLY_MENU), JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(getUserDocRef('weekly_menu', slotId), cleanData(menuItem));
    } catch (err) {
      console.warn('Errore aggiunta menu settimanale in Firestore:', err);
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
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.WEEKLY_MENU), JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(getUserDocRef('weekly_menu', itemId));
    } catch (err) {
      console.warn('Errore rimozione menu settimanale in Firestore:', err);
    }
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
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.WEEKLY_MENU), JSON.stringify(menu));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(getUserCollectionRef('weekly_menu'));
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
        await batch.commit();
      }
    } catch (err) {
      console.warn('Errore rimozione slot menu settimanale in Firestore:', err);
    }
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
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(items));
    notifyLocalChange();
  }

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(getUserDocRef('shopping_list', itemId), { isChecked: !currentStatus });
    } catch (err) {
      console.warn('Errore toggle spesa in Firestore:', err);
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
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(getUserDocRef('shopping_list', newItemId), cleanData(newItem));
    } catch (err) {
      console.warn('Errore aggiunta spesa manuale in Firestore:', err);
    }
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

  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(getUserDocRef('shopping_list', itemId));
    } catch (err) {
      console.warn('Errore eliminazione spesa in Firestore:', err);
    }

    if (targetName) {
      try {
        const snap = await getDocs(getUserCollectionRef('shopping_list'));
        const batch = writeBatch(db);
        let hasDeletes = false;
        snap.forEach((docSnap) => {
          const dData = docSnap.data();
          const dName = (dData.ingredientName || '').trim().toLowerCase();
          if (docSnap.id === itemId || dName === targetName) {
            batch.delete(docSnap.ref);
            hasDeletes = true;
          }
        });
        if (hasDeletes) {
          await batch.commit();
        }
      } catch (err) {
        console.warn('Errore eliminazione duplicati spesa in Firestore:', err);
      }
    }
  }
}

export async function clearCheckedItems(): Promise<void> {
  const itemsToKeep = getLocalShoppingList().filter((i) => !i.isChecked);
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(itemsToKeep));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(getUserCollectionRef('shopping_list'));
      const batch = writeBatch(db);
      let hasDeletes = false;
      snap.forEach((docSnap) => {
        if (docSnap.data().isChecked) {
          batch.delete(docSnap.ref);
          hasDeletes = true;
        }
      });
      if (hasDeletes) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Errore pulizia elementi completati in Firestore:', err);
    }
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

  const currentShoppingItems = isFirebaseConfigured ? [] : getLocalShoppingList();
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

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDocs(getUserCollectionRef('shopping_list'));
      const batch = writeBatch(db);

      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      for (const item of newShoppingList) {
        batch.set(getUserDocRef('shopping_list', item.id), cleanData(item));
      }

      await batch.commit();
      localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(newShoppingList));
      notifyLocalChange();
    } catch (err) {
      console.warn('Errore rigenerazione spesa in Firestore:', err);
    }
  } else {
    localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(newShoppingList));
    notifyLocalChange();
  }

  return newShoppingList.length;
}

// ==========================================
// PANTRY / FRIGORIFERO CRUD (USER-SCOPED)
// ==========================================
export async function savePantryItem(item: PantryItem): Promise<void> {
  const itemId = item.id || `pantry-${Date.now()}`;
  const userId = getCurrentUserId();
  const itemToSave = { ...item, id: itemId, userId };

  const targetName = item.name ? item.name.trim().toLowerCase() : '';

  const items = getLocalPantryItems().filter((i) => {
    if (i.id === itemId) return false;
    if (targetName && i.name && i.name.trim().toLowerCase() === targetName && i.category === item.category) return false;
    return true;
  });
  items.unshift(itemToSave);
  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PANTRY), JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(getUserDocRef('pantry', itemId), cleanData(itemToSave));
      console.log(`✅ Alimento salvato con successo per utente (${userId}):`, itemId);
    } catch (err) {
      console.error('❌ Errore salvataggio pantry in Firestore:', err);
    }
  }
}

export async function deletePantryItem(itemId: string, itemName?: string): Promise<void> {
  const currentItems = getLocalPantryItems();
  const targetItem = currentItems.find((i) => i.id === itemId);
  const targetName = (itemName || targetItem?.name || '').trim().toLowerCase();

  const items = currentItems.filter((i) => {
    if (i.id === itemId) return false;
    if (targetName && i.name && i.name.trim().toLowerCase() === targetName) return false;
    return true;
  });

  localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.PANTRY), JSON.stringify(items));
  notifyLocalChange();

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(getUserDocRef('pantry', itemId));
    } catch (err) {
      console.warn('Errore deleteDoc pantry Firestore:', err);
    }

    if (targetName) {
      try {
        const snap = await getDocs(getUserCollectionRef('pantry'));
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
          await batch.commit();
        }
      } catch (err) {
        console.warn('Errore eliminazione duplicati pantry in Firestore:', err);
      }
    }
  }
}

export async function autoCheckPantryItemsInShoppingList(pantryItems: PantryItem[]): Promise<number> {
  const shoppingItems = isFirebaseConfigured ? [] : getLocalShoppingList();
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
    if (isFirebaseConfigured && db) {
      try {
        const batch = writeBatch(db);
        for (const item of updatedShoppingItems) {
          batch.set(getUserDocRef('shopping_list', item.id), cleanData(item));
        }
        await batch.commit();
      } catch (err) {
        console.warn('Errore spunta automatica in Firestore:', err);
      }
    } else {
      localStorage.setItem(getStorageKey(BASE_STORAGE_KEYS.SHOPPING_LIST), JSON.stringify(updatedShoppingItems));
      notifyLocalChange();
    }
  }

  return checkedCount;
}
