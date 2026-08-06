import React, { useState, useEffect } from 'react';
import { Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem } from './types';
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
import { Header, MainNavTab } from './components/Header';
import { PlannerView } from './components/PlannerView';
import { ShopperView } from './components/ShopperView';
import { PantryView } from './components/PantryView';
import { RecipeModal } from './components/RecipeModal';
import { FamilyAdminModal } from './components/FamilyAdminModal';
import { SettingsModal } from './components/SettingsModal';
import { BottomMainbar } from './components/BottomMainbar';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('calendar');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenuItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [activeModalRecipe, setActiveModalRecipe] = useState<Recipe | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Auth User & Saved Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveUserSession | null>(() => getSavedUserSession());

  // Modals state
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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

    async function init() {
      // Ensure initial demo data exists in LocalStorage and Firestore
      await seedInitialData();

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
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveModalRecipe(undefined);
          setActiveTab(tab);
        }}
        currentUser={currentUser}
        activeSession={activeSession}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-[5px] pt-[5px]">
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm text-center my-4">
            <div className="w-10 h-10 border-4 border-[#f37021] border-t-transparent rounded-full animate-spin mx-auto my-[10px]" />
            <p className="text-xs font-bold text-[#191970]">
              Caricamento menu e ricette familiari...
            </p>
          </div>
        ) : activeModalRecipe !== undefined ? (
          /* Dedicated Recipe Detail / Edit / Create Page */
          <RecipeModal
            recipe={activeModalRecipe}
            onClose={() => setActiveModalRecipe(undefined)}
          />
        ) : (
          /* Dynamic Active View */
          <div>
            {activeTab === 'recipes' && (
              <PlannerView
                initialSubTab="recipeBook"
                recipes={recipes}
                weeklyMenu={weeklyMenu}
                onNavigateToShopper={() => setActiveTab('shopper')}
                onOpenRecipeModal={(recipe) => setActiveModalRecipe(recipe ?? null)}
              />
            )}

            {activeTab === 'calendar' && (
              <PlannerView
                initialSubTab="calendar"
                recipes={recipes}
                weeklyMenu={weeklyMenu}
                onNavigateToShopper={() => setActiveTab('shopper')}
                onOpenRecipeModal={(recipe) => setActiveModalRecipe(recipe ?? null)}
              />
            )}

            {activeTab === 'pantry' && (
              <PantryView
                pantryItems={pantryItems}
                onNavigateToShopper={() => setActiveTab('shopper')}
              />
            )}

            {activeTab === 'stats' && (
              <PlannerView
                initialSubTab="nutrition"
                recipes={recipes}
                weeklyMenu={weeklyMenu}
                onNavigateToShopper={() => setActiveTab('shopper')}
                onOpenRecipeModal={(recipe) => setActiveModalRecipe(recipe ?? null)}
              />
            )}

            {activeTab === 'shopper' && (
              <ShopperView
                shoppingList={shoppingList}
                pantryItems={pantryItems}
                onNavigateToPlanner={() => setActiveTab('calendar')}
                onNavigateToPantry={() => setActiveTab('pantry')}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomMainbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveModalRecipe(undefined);
          setActiveTab(tab);
        }}
        onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Family & Auth Admin Modal */}
      {isFamilyModalOpen && (
        <FamilyAdminModal
          currentUser={currentUser}
          onClose={() => setIsFamilyModalOpen(false)}
          onUserChanged={(user) => setCurrentUser(user)}
        />
      )}

      {/* App Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
}
