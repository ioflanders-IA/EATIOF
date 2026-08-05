export type UserRole = 'planner' | 'chef' | 'shopper' | 'pantry';

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  password?: string;
  hasPassword?: boolean;
}

export interface FamilyAccount {
  email: string;
  configuredAt?: string;
  hasPassword?: boolean;
}

export interface FamilyConfig {
  adminEmail: string;
  members: FamilyMember[];
  madre?: FamilyAccount;
  padre?: FamilyAccount;
}

export interface UserProfile {
  id: UserRole;
  name: string;
  title: string;
  avatar: string;
  color: string;
  badgeBg: string;
  description: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  category?: 'Frigo' | 'Dispensa' | 'Freezer' | 'Freschi';
  expirationDate?: string;
  notes?: string;
}

export interface Ingredient {
  id?: string;
  name: string;
  quantity: number | string;
  unit: string;
}

export type CategoryType = 'Sabina' | 'Lazio' | 'Classica' | 'Altro';

export interface NutritionInfo {
  calories: number; // kcal per porzione
  protein: number;  // grammi
  fat: number;      // grammi
  carbs: number;    // grammi
}

export interface Recipe {
  id: string;
  name: string;
  category: CategoryType;
  ingredients: Ingredient[];
  instructions: string;
  prepTimeMinutes?: number;
  servings?: number;
  nutrition?: NutritionInfo;
}

export type MealType = 'lunch' | 'dinner';

export type DayOfWeek = 'Lunedì' | 'Martedì' | 'Mercoledì' | 'Giovedì' | 'Venerdì' | 'Sabato' | 'Domenica';

export interface WeeklyMenuItem {
  id: string;
  day: DayOfWeek;
  mealType: MealType;
  recipeId: string;
  recipeName: string;
  servings?: number;
  weekId?: string;
  date?: string;
}

export interface ShoppingListItem {
  id: string;
  ingredientName: string;
  quantity: number | string;
  unit: string;
  isChecked: boolean;
  addedManually?: boolean;
  recipeSources?: string[];
}
