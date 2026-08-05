import React, { useState, useEffect } from 'react';
import { UserRole, Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem } from './types';
import {
  seedInitialData,
  subscribeToRecipes,
  subscribeToWeeklyMenu,
  subscribeToShoppingList,
  subscribeToPantryItems
} from './lib/dataService';
import { auth } from './lib/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  getSavedUserSession,
  saveUserSession,
  logoutFamilyUser,
  ActiveUserSession
} from './lib/familyAuthService';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { PlannerView } from './components/PlannerView';
import { ChefView } from './components/ChefView';
import { ShopperView } from './components/ShopperView';
import { PantryView } from './components/PantryView';
import { RecipeModal } from './components/RecipeModal';
import { FamilyAdminModal } from './components/FamilyAdminModal';
import { BottomMainbar } from './components/BottomMainbar';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('planner');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenuItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [activeModalRecipe, setActiveModalRecipe] = useState<Recipe | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Auth User & Saved Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveUserSession | null>(() => getSavedUserSession());

  // Modal Famiglia
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

  // Monitor Firebase Auth state change across reloads
  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        if (user) {
          const sess: ActiveUserSession = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Utente EATIOF',
            photoURL: user.photoURL,
            provider: 'google'
          };
          saveUserSession(sess);
          setActiveSession(sess);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Initialize data and setup real-time subscriptions
  useEffect(() => {
    let unsubRecipes: () => void;
    let unsubMenu: () => void;
    let unsubShopping: () => void;
    let unsubPantry: () => void;

    // Safety timer to prevent spinner hanging forever
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    function init() {
      // Ensure initial demo data exists in LocalStorage and trigger background Firestore sync
      seedInitialData();

      // Subscribe immediately to real-time streams
      unsubRecipes = subscribeToRecipes((data) => {
        setRecipes(data);
        setIsLoading(false);
      });

      unsubMenu = subscribeToWeeklyMenu((data) => {
        setWeeklyMenu(data);
      });

      unsubShopping = subscribeToShoppingList((data) => {
        setShoppingList(data);
      });

      unsubPantry = subscribeToPantryItems((data) => {
        setPantryItems(data);
      });
    }

    init();

    return () => {
      clearTimeout(loadingTimeout);
      if (unsubRecipes) unsubRecipes();
      if (unsubMenu) unsubMenu();
      if (unsubShopping) unsubShopping();
      if (unsubPantry) unsubPantry();
    };
  }, []);

  const handleLogout = async () => {
    await logoutFamilyUser();
    setCurrentUser(null);
    setActiveSession(null);
  };

  // If user is not authenticated (neither in Firebase nor in saved session), show Login Screen
  if (!activeSession && !currentUser) {
    return <LoginView onLoginSuccess={(session) => setActiveSession(session)} />;
  }

  return (
    <div className="min-h-screen bg-[#191970] text-slate-100 pb-20">
      {/* Sticky Top Header */}
      <Header
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        currentUser={currentUser}
        activeSession={activeSession}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-[10px] pt-[10px]">
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm text-center my-4">
            <div className="w-10 h-10 border-4 border-[#f37021] border-t-transparent rounded-full animate-spin mx-auto my-[10px]" />
            <p className="text-xs font-bold text-[#191970]">
              Caricamento menu e ricette familiari...
            </p>
          </div>
        ) : (
          /* Dynamic Active View */
          <div>
            {currentRole === 'planner' && (
              <PlannerView
                recipes={recipes}
                weeklyMenu={weeklyMenu}
                onNavigateToShopper={() => setCurrentRole('shopper')}
                onOpenRecipeModal={(recipe) => setActiveModalRecipe(recipe ?? null)}
              />
            )}

            {currentRole === 'chef' && (
              <ChefView
                recipes={recipes}
                weeklyMenu={weeklyMenu}
                onOpenRecipeModal={(recipe) => setActiveModalRecipe(recipe)}
              />
            )}

            {currentRole === 'shopper' && (
              <ShopperView
                shoppingList={shoppingList}
                pantryItems={pantryItems}
                onNavigateToPlanner={() => setCurrentRole('planner')}
                onNavigateToPantry={() => setCurrentRole('pantry')}
              />
            )}

            {currentRole === 'pantry' && (
              <PantryView
                pantryItems={pantryItems}
                onNavigateToShopper={() => setCurrentRole('shopper')}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomMainbar
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        shoppingCount={shoppingList.filter((item) => !item.isChecked).length}
      />

      {/* Recipe View / Edit / Create Modal */}
      {activeModalRecipe !== undefined && (
        <RecipeModal
          recipe={activeModalRecipe}
          onClose={() => setActiveModalRecipe(undefined)}
        />
      )}

      {/* Family & Auth Admin Modal */}
      {isFamilyModalOpen && (
        <FamilyAdminModal
          currentUser={currentUser}
          onClose={() => setIsFamilyModalOpen(false)}
          onUserChanged={(user) => setCurrentUser(user)}
        />
      )}
    </div>
  );
}


