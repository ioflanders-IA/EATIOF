import React, { useState, useEffect } from 'react';
import { Recipe, WeeklyMenuItem, DayOfWeek, MealType, CategoryType, DishCourse, NutritionInfo } from '../types';
import { DAYS_OF_WEEK } from '../data/initialData';
import { getFamilyConfig, FAMILY_CONFIG_CHANGED_EVENT } from '../lib/familyAuthService';
import { MONTHLY_SEASONAL_PRODUCE, getSeasonalDataForMonth, inferCourseFromRecipe } from '../data/seasonalData';
import {
  addWeeklyMenuItem,
  removeWeeklyMenuItem,
  removeWeeklySlot,
  generateShoppingListFromMenu,
  deleteRecipe
} from '../lib/dataService';
import {
  Calendar,
  Plus,
  Trash2,
  ShoppingCart,
  BookOpen,
  Search,
  CheckCircle2,
  UtensilsCrossed,
  Clock,
  ChefHat,
  Sun,
  Moon,
  X,
  Flame,
  Users,
  BarChart2,
  Activity,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Eye,
  Pencil,
  Leaf,
  Info
} from 'lucide-react';

interface PlannerViewProps {
  recipes: Recipe[];
  weeklyMenu: WeeklyMenuItem[];
  onNavigateToShopper: () => void;
  onOpenRecipeModal: (recipe?: Recipe) => void;
  initialSubTab?: 'calendar' | 'fullCalendar' | 'nutrition' | 'recipeBook';
}

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS_SHORT_IT: { full: DayOfWeek; short: string }[] = [
  { full: 'Lunedì', short: 'Lun' },
  { full: 'Martedì', short: 'Mar' },
  { full: 'Mercoledì', short: 'Mer' },
  { full: 'Giovedì', short: 'Gio' },
  { full: 'Venerdì', short: 'Ven' },
  { full: 'Sabato', short: 'Sab' },
  { full: 'Domenica', short: 'Dom' }
];

function getMondayDate(offset: number = 0): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setDate(monday.getDate() + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekIdFromOffset(offset: number): string {
  if (offset === 0) return 'current';
  const m = getMondayDate(offset);
  const y = m.getFullYear();
  const month = String(m.getMonth() + 1).padStart(2, '0');
  const day = String(m.getDate()).padStart(2, '0');
  return `${y}-${month}-${day}`;
}

function getWeekOffsetFromDate(date: Date): number {
  const currentMonday = getMondayDate(0);
  const targetMonday = new Date(date);
  const day = targetMonday.getDay();
  const diff = targetMonday.getDate() - day + (day === 0 ? -6 : 1);
  targetMonday.setDate(diff);
  targetMonday.setHours(0, 0, 0, 0);

  const diffTime = targetMonday.getTime() - currentMonday.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
}

function getFormattedWeekRange(offset: number): string {
  const monday = getMondayDate(offset);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const mDay = monday.getDate();
  const mMonth = MONTH_NAMES_IT[monday.getMonth()];
  const sDay = sunday.getDate();
  const sMonth = MONTH_NAMES_IT[sunday.getMonth()];
  const year = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${mDay} - ${sDay} ${mMonth} ${year}`;
  }
  return `${mDay} ${mMonth} - ${sDay} ${sMonth} ${year}`;
}

function getDateForDayIndex(offset: number, dayIndex: number): { dayNum: number; monthName: string; fullDateStr: string } {
  const monday = getMondayDate(offset);
  const dateObj = new Date(monday);
  dateObj.setDate(dateObj.getDate() + dayIndex);
  return {
    dayNum: dateObj.getDate(),
    monthName: MONTH_NAMES_IT[dateObj.getMonth()],
    fullDateStr: `${dateObj.getDate()} ${MONTH_NAMES_IT[dateObj.getMonth()]}`
  };
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  recipes,
  weeklyMenu,
  onNavigateToShopper,
  onOpenRecipeModal,
  initialSubTab = 'calendar'
}) => {
  const [selectedSlot, setSelectedSlot] = useState<{
    day: DayOfWeek;
    mealType: MealType;
    weekId?: string;
    dateStr?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Tutte'>('Tutte');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<DishCourse | 'Tutti'>('Tutti');
  const [selectedSeasonalMonth, setSelectedSeasonalMonth] = useState<number>(new Date().getMonth());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'fullCalendar' | 'nutrition' | 'recipeBook'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [familyCount, setFamilyCount] = useState<number>(4);
  const [familyMembersList, setFamilyMembersList] = useState<string[]>([]);

  useEffect(() => {
    async function syncFamilyCount() {
      const cfg = await getFamilyConfig();
      if (cfg.members && cfg.members.length > 0) {
        setFamilyCount(cfg.members.length);
        setFamilyMembersList(cfg.members.map((m) => m.name));
      }
    }
    syncFamilyCount();

    const handleConfigChange = (e: any) => {
      const detail = e.detail;
      if (detail && detail.members) {
        setFamilyCount(detail.members.length);
        setFamilyMembersList(detail.members.map((m: any) => m.name));
      } else {
        syncFamilyCount();
      }
    };

    window.addEventListener(FAMILY_CONFIG_CHANGED_EVENT, handleConfigChange);
    return () => {
      window.removeEventListener(FAMILY_CONFIG_CHANGED_EVENT, handleConfigChange);
    };
  }, []);

  // Week offset state for 1-week navigation
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Month offset state for full calendar navigation
  const [monthOffset, setMonthOffset] = useState<number>(0);

  const activeWeekId = getWeekIdFromOffset(weekOffset);

  // Map recipes by id
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => recipeMap.set(r.id, r));

  // Helper to extract or estimate nutrition info
  const getRecipeNut = (recipe?: Recipe): NutritionInfo => {
    if (recipe?.nutrition) {
      return recipe.nutrition;
    }
    return { calories: 450, protein: 20, fat: 18, carbs: 50 };
  };

  // Map menu items by weekId_day_mealType for quick lookup
  const menuMap = new Map<string, WeeklyMenuItem>();
  weeklyMenu.forEach((item) => {
    const itemWeek = item.weekId || 'current';
    menuMap.set(`${itemWeek}_${item.day}_${item.mealType}`, item);
  });

  // Filter recipes for slot selection modal
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'Tutte' || r.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!selectedSlot) return;
    const targetWeek = selectedSlot.weekId || activeWeekId;
    await addWeeklyMenuItem(selectedSlot.day, selectedSlot.mealType, recipe.id, recipe.name, targetWeek);
    setSelectedSlot(null);
    setSearchQuery('');
  };

  const handleRemoveMenuItem = async (itemId: string) => {
    await removeWeeklyMenuItem(itemId);
  };

  const handleGenerateSpesa = async () => {
    setIsGenerating(true);
    setGenerationResult(null);
    try {
      const count = await generateShoppingListFromMenu(weeklyMenu, recipes, activeWeekId);
      setGenerationResult(count);
    } catch (err) {
      console.error('Errore generazione spesa:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const categories: (CategoryType | 'Tutte')[] = ['Tutte', 'Sabina', 'Lazio', 'Classica', 'Altro'];

  // Calculate current display month for fullCalendar
  const displayMonthDate = new Date();
  displayMonthDate.setMonth(displayMonthDate.getMonth() + monthOffset);
  const currentMonthName = MONTH_NAMES_IT[displayMonthDate.getMonth()];
  const currentYearNum = displayMonthDate.getFullYear();

  // Generate days array for display month
  const firstDayOfMonth = new Date(currentYearNum, displayMonthDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentYearNum, displayMonthDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  return (
    <div className="space-y-[10px]">
      {/* Top Banner & Sub-Tabs */}
      <div className="bg-[#191970] rounded-lg p-[10px] text-white shadow-md">
        <div className="flex items-center justify-between gap-[10px] flex-wrap">
          {/* Sub Navigation */}
          <div className="flex items-center gap-[5px] flex-wrap">
            <button
              onClick={() => setActiveSubTab('calendar')}
              className={`p-[5px] px-[10px] rounded-lg text-xs font-bold transition-all flex items-center gap-[5px] ${
                activeSubTab === 'calendar'
                  ? 'bg-[#f37021] text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Vista Settimanale</span>
            </button>

            <button
              onClick={() => setActiveSubTab('fullCalendar')}
              className={`p-[5px] px-[10px] rounded-lg text-xs font-bold transition-all flex items-center gap-[5px] ${
                activeSubTab === 'fullCalendar'
                  ? 'bg-[#f37021] text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-300" />
              <span>Calendario Generale Mensile</span>
            </button>

            <button
              onClick={() => setActiveSubTab('nutrition')}
              className={`p-[5px] px-[10px] rounded-lg text-xs font-bold transition-all flex items-center gap-[5px] ${
                activeSubTab === 'nutrition'
                  ? 'bg-[#f37021] text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Valori Nutrizionali Famiglia ({familyCount}p)</span>
            </button>

            <button
              onClick={() => setActiveSubTab('recipeBook')}
              className={`p-[5px] px-[10px] rounded-lg text-xs font-bold transition-all flex items-center gap-[5px] ${
                activeSubTab === 'recipeBook'
                  ? 'bg-[#f37021] text-white shadow-sm'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ricettario ({recipes.length})</span>
            </button>
          </div>

          {/* Compact Genera Spesa Button on Top Right */}
          <button
            id="generate-shopping-list-btn"
            onClick={handleGenerateSpesa}
            disabled={isGenerating}
            className="py-1.5 px-3 rounded-lg bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 ml-auto"
            title={`Genera spesa per ${getFormattedWeekRange(weekOffset)}`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-white shrink-0" />
            <span>
              {isGenerating
                ? 'Calcolo...'
                : `Genera Spesa ${weekOffset === 0 ? '' : `(+${weekOffset})`}`}
            </span>
          </button>
        </div>
      </div>

      {/* Generation Success Notification Banner */}
      {generationResult !== null && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-[10px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[10px] shadow-sm animate-fade-in">
          <div className="flex items-center gap-[10px]">
            <div className="p-[5px] rounded-md bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-900 text-sm">
                Spesa calcolata per la settimana: {getFormattedWeekRange(weekOffset)}!
              </h4>
              <p className="text-xs text-emerald-700 mt-[5px]">
                Calcolati e aggregati <strong>{generationResult} ingredienti</strong> per questa 1-settimana.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToShopper}
            className="w-full sm:w-auto p-[10px] rounded-md bg-[#191970] hover:bg-[#0f0f4a] text-white font-bold text-xs flex items-center justify-center gap-[5px] shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-[#f37021]" />
            <span>Vai alla Lista Spesa (Shopper)</span>
          </button>
        </div>
      )}

      {/* VIEW 1: WEEKLY CALENDAR WITH WEEK NAVIGATOR */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-[10px]">
          {/* Week Navigation Header Controls */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[5px] w-full md:w-auto justify-between md:justify-start">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-[8px] rounded-md bg-slate-100 hover:bg-slate-200 text-[#191970] font-bold text-xs flex items-center gap-[3px] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sett. Prec.</span>
              </button>

              <div className="text-center px-[10px]">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f37021] block">
                  {weekOffset === 0
                    ? 'Settimana Corrente'
                    : weekOffset > 0
                    ? `Tra ${weekOffset} Settiman${weekOffset === 1 ? 'a' : 'e'} (Futuro)`
                    : `${Math.abs(weekOffset)} Settiman${Math.abs(weekOffset) === 1 ? 'a' : 'e'} Fa`}
                </span>
                <h3 className="text-sm sm:text-base font-black text-[#191970]">
                  {getFormattedWeekRange(weekOffset)}
                </h3>
              </div>

              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-[8px] rounded-md bg-slate-100 hover:bg-slate-200 text-[#191970] font-bold text-xs flex items-center gap-[3px] transition-colors"
              >
                <span>Sett. Succ.</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Week Selectors */}
            <div className="flex items-center gap-[5px] overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none justify-start md:justify-end">
              <button
                onClick={() => setWeekOffset(0)}
                className={`p-[6px] px-[10px] rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  weekOffset === 0
                    ? 'bg-[#191970] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Questa Settimana
              </button>
              <button
                onClick={() => setWeekOffset(1)}
                className={`p-[6px] px-[10px] rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  weekOffset === 1
                    ? 'bg-[#f37021] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Prossima (+1)
              </button>
              <button
                onClick={() => setWeekOffset(2)}
                className={`p-[6px] px-[10px] rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  weekOffset === 2
                    ? 'bg-[#f37021] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tra 2 Sett. (+2)
              </button>
              <button
                onClick={() => setWeekOffset(3)}
                className={`p-[6px] px-[10px] rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  weekOffset === 3
                    ? 'bg-[#f37021] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tra 3 Sett. (+3)
              </button>
            </div>
          </div>

          {/* 7 Days Grid for Active Week */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[10px]">
            {DAYS_OF_WEEK.map((day, dayIdx) => {
              const dateInfo = getDateForDayIndex(weekOffset, dayIdx);
              
              const lunchSlots = weeklyMenu.filter(
                (m) => (m.weekId || 'current') === activeWeekId && m.day === day && m.mealType === 'lunch'
              );
              const dinnerSlots = weeklyMenu.filter(
                (m) => (m.weekId || 'current') === activeWeekId && m.day === day && m.mealType === 'dinner'
              );

              let dayKcal = 0;
              let dayProtein = 0;
              let dayFat = 0;
              let dayCarbs = 0;

              lunchSlots.forEach((slot) => {
                const nut = getRecipeNut(recipeMap.get(slot.recipeId));
                dayKcal += nut.calories;
                dayProtein += nut.protein;
                dayFat += nut.fat;
                dayCarbs += nut.carbs;
              });

              dinnerSlots.forEach((slot) => {
                const nut = getRecipeNut(recipeMap.get(slot.recipeId));
                dayKcal += nut.calories;
                dayProtein += nut.protein;
                dayFat += nut.fat;
                dayCarbs += nut.carbs;
              });

              return (
                <div
                  key={day}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between p-[10px]"
                >
                  {/* Day Header with Date */}
                  <div className="bg-[#191970] text-white p-[6px] rounded-md flex items-center justify-between mb-[5px]">
                    <div>
                      <span className="font-extrabold text-xs tracking-wide block">{day}</span>
                      <span className="text-[10px] text-slate-300 font-semibold">{dateInfo.fullDateStr}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white bg-[#f37021] px-[5px] py-[2px] rounded">
                      {lunchSlots.length > 0 && dinnerSlots.length > 0 ? 'Ok' : 'Incompleto'}
                    </span>
                  </div>

                  <div className="space-y-[8px]">
                    {/* PRANZO SLOT */}
                    <div className="space-y-[5px]">
                      <div className="flex items-center justify-between p-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#f37021] flex items-center gap-[5px]">
                          <Sun className="w-3.5 h-3.5 text-[#f37021]" />
                          <span>Pranzo {lunchSlots.length > 0 && `(${lunchSlots.length})`}</span>
                        </span>
                      </div>

                      {lunchSlots.map((lunchSlot) => {
                        const lunchRecipe = recipeMap.get(lunchSlot.recipeId);
                        const lunchNut = getRecipeNut(lunchRecipe);
                        return (
                          <div
                            key={lunchSlot.id}
                            className="group relative bg-[#f37021]/10 border border-[#f37021]/30 rounded-md p-[5px] hover:bg-[#f37021]/20 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-[5px]">
                              <div className="min-w-0 p-[2px]">
                                <h4 className="font-bold text-[#191970] text-xs sm:text-sm truncate">
                                  {lunchSlot.recipeName}
                                </h4>
                                <button
                                  onClick={() => {
                                    if (lunchRecipe) onOpenRecipeModal(lunchRecipe);
                                  }}
                                  className="text-[10px] font-semibold text-[#f37021] hover:underline inline-block"
                                >
                                  Vedi ingredienti
                                </button>
                              </div>
                              <button
                                onClick={() => handleRemoveMenuItem(lunchSlot.id)}
                                className="p-[4px] rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                title="Rimuovi pietanza"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Nutrition pills for lunch */}
                            {lunchNut && (
                              <div className="mt-[4px] pt-[4px] border-t border-[#f37021]/20 flex items-center gap-[4px] flex-wrap text-[10px] font-bold">
                                <span className="p-[2px] px-[5px] rounded bg-[#f37021]/20 text-[#d95d13]">
                                  🔥 {lunchNut.calories} kcal
                                </span>
                                <span className="p-[2px] px-[4px] rounded bg-white/80 text-blue-800">
                                  P: {lunchNut.protein}g
                                </span>
                                <span className="p-[2px] px-[4px] rounded bg-white/80 text-amber-800">
                                  G: {lunchNut.fat}g
                                </span>
                                <span className="p-[2px] px-[4px] rounded bg-white/80 text-emerald-800">
                                  C: {lunchNut.carbs}g
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button
                        onClick={() =>
                          setSelectedSlot({
                            day,
                            mealType: 'lunch',
                            weekId: activeWeekId,
                            dateStr: dateInfo.fullDateStr
                          })
                        }
                        className="w-full p-[6px] border-2 border-dashed border-slate-200 hover:border-[#f37021] rounded-md bg-slate-50 hover:bg-[#f37021]/10 text-slate-600 hover:text-[#f37021] transition-all text-xs font-semibold flex items-center justify-center gap-[5px]"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#f37021]" />
                        <span>{lunchSlots.length > 0 ? '+ Aggiungi pietanza a Pranzo' : 'Scegli Pranzo'}</span>
                      </button>
                    </div>

                    {/* CENA SLOT */}
                    <div className="space-y-[5px]">
                      <div className="flex items-center justify-between p-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#191970] flex items-center gap-[5px]">
                          <Moon className="w-3.5 h-3.5 text-[#191970]" />
                          <span>Cena {dinnerSlots.length > 0 && `(${dinnerSlots.length})`}</span>
                        </span>
                      </div>

                      {dinnerSlots.map((dinnerSlot) => {
                        const dinnerRecipe = recipeMap.get(dinnerSlot.recipeId);
                        const dinnerNut = getRecipeNut(dinnerRecipe);
                        return (
                          <div
                            key={dinnerSlot.id}
                            className="group relative bg-[#191970]/10 border border-[#191970]/30 rounded-md p-[5px] hover:bg-[#191970]/20 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-[5px]">
                              <div className="min-w-0 p-[2px]">
                                <h4 className="font-bold text-[#191970] text-xs sm:text-sm truncate">
                                  {dinnerSlot.recipeName}
                                </h4>
                                <button
                                  onClick={() => {
                                    if (dinnerRecipe) onOpenRecipeModal(dinnerRecipe);
                                  }}
                                  className="text-[10px] font-semibold text-[#191970] hover:underline inline-block"
                                >
                                  Vedi ingredienti
                                </button>
                              </div>
                              <button
                                onClick={() => handleRemoveMenuItem(dinnerSlot.id)}
                                className="p-[4px] rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                title="Rimuovi pietanza"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Nutrition pills for dinner */}
                            {dinnerNut && (
                              <div className="mt-[4px] pt-[4px] border-t border-[#191970]/20 flex items-center gap-[4px] flex-wrap text-[10px] font-bold">
                                <span className="p-[2px] px-[5px] rounded bg-[#191970]/20 text-[#191970]">
                                  🔥 {dinnerNut.calories} kcal
                                </span>
                                <span className="p-[2px] px-[4px] rounded bg-white/80 text-blue-800">
                                  P: {dinnerNut.protein}g
                                </span>
                                <span className="p-[2px] px-[4px] rounded bg-white/80 text-amber-800">
                                  G: {dinnerNut.fat}g
                                </span>
                                <span className="p-[2px] px-[4px] rounded bg-white/80 text-emerald-800">
                                  C: {dinnerNut.carbs}g
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <button
                        onClick={() =>
                          setSelectedSlot({
                            day,
                            mealType: 'dinner',
                            weekId: activeWeekId,
                            dateStr: dateInfo.fullDateStr
                          })
                        }
                        className="w-full p-[6px] border-2 border-dashed border-slate-200 hover:border-[#191970] rounded-md bg-slate-50 hover:bg-[#191970]/10 text-slate-600 hover:text-[#191970] transition-all text-xs font-semibold flex items-center justify-center gap-[5px]"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#191970]" />
                        <span>{dinnerSlots.length > 0 ? '+ Aggiungi pietanza a Cena' : 'Scegli Cena'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Day Nutrition Summary Footer */}
                  <div className="mt-[10px] pt-[6px] border-t border-slate-100 bg-emerald-50/50 p-[5px] rounded-md space-y-[2px]">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-[#191970]">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#f37021]" />
                        Totale Giorno:
                      </span>
                      <span className="text-[#f37021]">{dayKcal} kcal/pers</span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-600 font-semibold">
                      <span>P: {dayProtein}g • G: {dayFat}g • C: {dayCarbs}g</span>
                      <span className="text-emerald-700 font-bold">({dayKcal * familyCount} kcal / {familyCount}p)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL GENERAL MONTH CALENDAR */}
      {activeSubTab === 'fullCalendar' && (
        <div className="space-y-[10px] animate-fade-in">
          {/* Month Navigation Control */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[8px]">
              <div className="p-[8px] rounded-lg bg-amber-500/10 text-amber-700">
                <CalendarDays className="w-6 h-6 text-[#f37021]" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#191970] text-base">
                  Calendario Generale dei Mesi Futuri
                </h3>
                <p className="text-xs text-slate-500">
                  Aggiungi ricette a qualsiasi giorno futuro. Poi seleziona la settimana desiderata per calcolare la spesa.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-[8px] bg-slate-50 border border-slate-200 p-[5px] px-[10px] rounded-lg">
              <button
                onClick={() => setMonthOffset(monthOffset - 1)}
                className="p-[6px] rounded bg-white hover:bg-slate-100 border border-slate-200 text-[#191970] font-bold text-xs"
              >
                &larr; Mese Prec.
              </button>
              <span className="font-extrabold text-sm text-[#191970] px-[5px]">
                {currentMonthName} {currentYearNum}
              </span>
              <button
                onClick={() => setMonthOffset(monthOffset + 1)}
                className="p-[6px] rounded bg-white hover:bg-slate-100 border border-slate-200 text-[#191970] font-bold text-xs"
              >
                Mese Succ. &rarr;
              </button>
            </div>
          </div>

          {/* Month Days Grid */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm overflow-x-auto">
            <div className="grid grid-cols-7 gap-[5px] min-w-[700px]">
              {/* Day Header Titles */}
              {DAYS_SHORT_IT.map((d) => (
                <div
                  key={d.full}
                  className="bg-[#191970] text-white p-[6px] rounded-md text-center text-xs font-black uppercase tracking-wider"
                >
                  {d.short}
                </div>
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(currentYearNum, displayMonthDate.getMonth(), dayNum);
                const dayOfWeekIdx = (cellDate.getDay() + 6) % 7; // 0 = Lunedì, 6 = Domenica
                const dayOfWeekName = DAYS_SHORT_IT[dayOfWeekIdx].full;

                const cellWeekOffset = getWeekOffsetFromDate(cellDate);
                const cellWeekId = getWeekIdFromOffset(cellWeekOffset);

                const lunchItem = menuMap.get(`${cellWeekId}_${dayOfWeekName}_lunch`);
                const dinnerItem = menuMap.get(`${cellWeekId}_${dayOfWeekName}_dinner`);

                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === displayMonthDate.getMonth() &&
                  new Date().getFullYear() === currentYearNum;

                return (
                  <div
                    key={dayNum}
                    className={`rounded-lg p-[6px] border flex flex-col justify-between min-h-[110px] transition-all ${
                      isToday
                        ? 'bg-amber-50 border-[#f37021] ring-1 ring-[#f37021]'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-[4px]">
                      <span
                        className={`text-xs font-black ${
                          isToday ? 'text-[#f37021]' : 'text-[#191970]'
                        }`}
                      >
                        {dayNum} {currentMonthName.slice(0, 3)}
                      </span>

                      <button
                        onClick={() => {
                          setWeekOffset(cellWeekOffset);
                          setActiveSubTab('calendar');
                        }}
                        className="text-[9px] font-bold text-[#f37021] hover:underline bg-[#f37021]/10 px-1 py-[1px] rounded"
                        title="Vedi questa settimana nel planner principale"
                      >
                        Apri Settimana
                      </button>
                    </div>

                    {/* Meal slots preview */}
                    <div className="space-y-[4px] my-[4px]">
                      {/* Lunch */}
                      <div className="text-[10px]">
                        {lunchItem ? (
                          <div
                            onClick={() =>
                              setSelectedSlot({
                                day: dayOfWeekName,
                                mealType: 'lunch',
                                weekId: cellWeekId,
                                dateStr: `${dayNum} ${currentMonthName}`
                              })
                            }
                            className="bg-[#f37021]/10 border border-[#f37021]/30 p-[3px] rounded font-bold text-[#d95d13] truncate cursor-pointer hover:bg-[#f37021]/20"
                          >
                            ☀️ {lunchItem.recipeName}
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setSelectedSlot({
                                day: dayOfWeekName,
                                mealType: 'lunch',
                                weekId: cellWeekId,
                                dateStr: `${dayNum} ${currentMonthName}`
                              })
                            }
                            className="w-full text-slate-400 hover:text-[#f37021] hover:bg-white text-[9px] font-semibold border border-dashed border-slate-200 rounded p-[2px] text-center"
                          >
                            + Pranzo
                          </button>
                        )}
                      </div>

                      {/* Dinner */}
                      <div className="text-[10px]">
                        {dinnerItem ? (
                          <div
                            onClick={() =>
                              setSelectedSlot({
                                day: dayOfWeekName,
                                mealType: 'dinner',
                                weekId: cellWeekId,
                                dateStr: `${dayNum} ${currentMonthName}`
                              })
                            }
                            className="bg-[#191970]/10 border border-[#191970]/30 p-[3px] rounded font-bold text-[#191970] truncate cursor-pointer hover:bg-[#191970]/20"
                          >
                            🌙 {dinnerItem.recipeName}
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setSelectedSlot({
                                day: dayOfWeekName,
                                mealType: 'dinner',
                                weekId: cellWeekId,
                                dateStr: `${dayNum} ${currentMonthName}`
                              })
                            }
                            className="w-full text-slate-400 hover:text-[#191970] hover:bg-white text-[9px] font-semibold border border-dashed border-slate-200 rounded p-[2px] text-center"
                          >
                            + Cena
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-400 font-medium text-right">
                      {DAYS_SHORT_IT[dayOfWeekIdx].short}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: NUTRITION & FAMILY ANALYTICS */}
      {activeSubTab === 'nutrition' && (
        <div className="space-y-[10px] animate-fade-in">
          {/* Top Summary Header */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm space-y-[8px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[8px]">
              <div className="flex items-center gap-[8px]">
                <div className="p-[8px] rounded-lg bg-emerald-500/10 text-emerald-700">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#191970] text-base">
                    Valori Nutrizionali Settimanali della Famiglia
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quantificazione automatica calcolata per i {familyCount} commensali ({familyMembersList.length > 0 ? familyMembersList.join(', ') : 'Membri della famiglia'}).
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-[6px] px-[12px] rounded-lg text-xs flex items-center gap-[8px]">
                <Users className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-slate-700">Membri Famiglia:</span>
                <span className="font-black text-emerald-800 text-sm">{familyCount} Commensali</span>
              </div>
            </div>

            {/* Quick Stat Cards */}
            {(() => {
              let totalKcal = 0;
              let totalP = 0;
              let totalG = 0;
              let totalC = 0;
              let slotsCount = 0;

              DAYS_OF_WEEK.forEach((d) => {
                const l = menuMap.get(`${activeWeekId}_${d}_lunch`);
                const c = menuMap.get(`${activeWeekId}_${d}_dinner`);
                if (l) {
                  const nut = getRecipeNut(recipeMap.get(l.recipeId));
                  totalKcal += nut.calories;
                  totalP += nut.protein;
                  totalG += nut.fat;
                  totalC += nut.carbs;
                  slotsCount++;
                }
                if (c) {
                  const nut = getRecipeNut(recipeMap.get(c.recipeId));
                  totalKcal += nut.calories;
                  totalP += nut.protein;
                  totalG += nut.fat;
                  totalC += nut.carbs;
                  slotsCount++;
                }
              });

              const daysWithMeals = Math.max(1, Math.ceil(slotsCount / 2));
              const avgDailyKcalPerson = Math.round(totalKcal / daysWithMeals);
              const avgDailyPPerson = Math.round(totalP / daysWithMeals);
              const avgDailyGPerson = Math.round(totalG / daysWithMeals);
              const avgDailyCPerson = Math.round(totalC / daysWithMeals);

              const familyTotalKcal = totalKcal * familyCount;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px] pt-[5px]">
                  <div className="bg-slate-50 border border-slate-200 p-[8px] rounded-lg space-y-[3px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Media Giornaliera (Singola Porzione)
                    </span>
                    <div className="text-base font-black text-[#f37021]">
                      🔥 {avgDailyKcalPerson} kcal / giorno
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600">
                      P: {avgDailyPPerson}g • G: {avgDailyGPerson}g • C: {avgDailyCPerson}g
                    </div>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 p-[8px] rounded-lg space-y-[3px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Fabbisogno Settimanale Famiglia ({familyCount}p)
                    </span>
                    <div className="text-base font-black text-emerald-900">
                      🔥 {familyTotalKcal.toLocaleString('it-IT')} kcal complessive
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-700">
                      Calcolato per {familyCount} commensali ({familyMembersList.length > 0 ? familyMembersList.join(', ') : 'Famiglia'})
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-[8px] rounded-lg space-y-[3px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                      Quantità Macro Totali Settimana
                    </span>
                    <div className="text-xs font-bold text-blue-900 flex items-center justify-between pt-[2px]">
                      <span>Proteine: {totalP * familyCount}g</span>
                      <span>Grassi: {totalG * familyCount}g</span>
                      <span>Carb: {totalC * familyCount}g</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600">
                      Valori aggregati menu della settimana
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Daily Table Breakdown */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm space-y-[10px]">
            <h4 className="font-extrabold text-[#191970] text-sm p-[2px] border-b border-slate-100 flex items-center gap-[5px]">
              <Activity className="w-4 h-4 text-[#f37021]" />
              <span>Dettaglio Giornaliero dei Pasti e Valori Nutrizionali</span>
            </h4>

            <div className="space-y-[8px]">
              {DAYS_OF_WEEK.map((day) => {
                const lunchSlot = menuMap.get(`${activeWeekId}_${day}_lunch`);
                const dinnerSlot = menuMap.get(`${activeWeekId}_${day}_dinner`);

                const lunchRecipe = lunchSlot ? recipeMap.get(lunchSlot.recipeId) : undefined;
                const dinnerRecipe = dinnerSlot ? recipeMap.get(dinnerSlot.recipeId) : undefined;

                const lunchNut = lunchSlot ? getRecipeNut(lunchRecipe) : null;
                const dinnerNut = dinnerSlot ? getRecipeNut(dinnerRecipe) : null;

                const dayKcal = (lunchNut?.calories || 0) + (dinnerNut?.calories || 0);
                const dayP = (lunchNut?.protein || 0) + (dinnerNut?.protein || 0);
                const dayG = (lunchNut?.fat || 0) + (dinnerNut?.fat || 0);
                const dayC = (lunchNut?.carbs || 0) + (dinnerNut?.carbs || 0);

                const familyDayKcal = dayKcal * familyCount;

                return (
                  <div key={day} className="bg-slate-50 border border-slate-200 rounded-lg p-[8px] space-y-[6px]">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-[4px]">
                      <span className="font-extrabold text-xs text-[#191970]">{day}</span>
                      <div className="flex items-center gap-[8px] text-xs">
                        <span className="font-bold text-[#f37021]">🔥 {dayKcal} kcal / pers</span>
                        <span className="font-extrabold text-emerald-800 bg-emerald-100 p-[2px] px-[6px] rounded">
                          Tot. Famiglia ({familyCount}p): {familyDayKcal} kcal
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[6px] text-xs">
                      {/* Lunch */}
                      <div className="bg-white p-[6px] rounded-md border border-slate-200">
                        <span className="text-[10px] font-bold text-[#f37021] uppercase block mb-1 flex items-center gap-1">
                          <Sun className="w-3 h-3" /> Pranzo: {lunchSlot ? lunchSlot.recipeName : 'Non pianificato'}
                        </span>
                        {lunchNut ? (
                          <div className="flex items-center gap-[5px] text-[10px] font-bold text-slate-700 flex-wrap">
                            <span className="bg-[#f37021]/15 text-[#d95d13] p-[2px] px-[4px] rounded">🔥 {lunchNut.calories} kcal</span>
                            <span className="bg-blue-50 text-blue-800 p-[2px] px-[4px] rounded">Prot: {lunchNut.protein}g</span>
                            <span className="bg-amber-50 text-amber-800 p-[2px] px-[4px] rounded">Gras: {lunchNut.fat}g</span>
                            <span className="bg-emerald-50 text-emerald-800 p-[2px] px-[4px] rounded">Carb: {lunchNut.carbs}g</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Nessun piatto scelto</span>
                        )}
                      </div>

                      {/* Dinner */}
                      <div className="bg-white p-[6px] rounded-md border border-slate-200">
                        <span className="text-[10px] font-bold text-[#191970] uppercase block mb-1 flex items-center gap-1">
                          <Moon className="w-3 h-3" /> Cena: {dinnerSlot ? dinnerSlot.recipeName : 'Non pianificato'}
                        </span>
                        {dinnerNut ? (
                          <div className="flex items-center gap-[5px] text-[10px] font-bold text-slate-700 flex-wrap">
                            <span className="bg-[#191970]/15 text-[#191970] p-[2px] px-[4px] rounded">🔥 {dinnerNut.calories} kcal</span>
                            <span className="bg-blue-50 text-blue-800 p-[2px] px-[4px] rounded">Prot: {dinnerNut.protein}g</span>
                            <span className="bg-amber-50 text-amber-800 p-[2px] px-[4px] rounded">Gras: {dinnerNut.fat}g</span>
                            <span className="bg-emerald-50 text-emerald-800 p-[2px] px-[4px] rounded">Carb: {dinnerNut.carbs}g</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Nessun piatto scelto</span>
                        )}
                      </div>
                    </div>

                    {/* Daily Macro Bar */}
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 pt-[2px]">
                      <span>Macro giorno (singola porzione): P: {dayP}g | G: {dayG}g | C: {dayC}g</span>
                      <span className="text-emerald-700 font-bold">Totale Famiglia ({familyCount}p): P: {dayP * familyCount}g • G: {dayG * familyCount}g • C: {dayC * familyCount}g</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: RECIPE BOOK MANAGER */}
      {activeSubTab === 'recipeBook' && (
        <div className="space-y-[10px]">
          {/* Header & New Recipe Action */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[5px] w-full sm:w-auto p-[5px]">
              <div className="p-[5px] rounded-md bg-[#f37021]/10 text-[#f37021]">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#191970] text-sm">Ricettario di Famiglia</h3>
                <p className="text-xs text-slate-500">Organizzato per portate: Antipasti, Primi, Secondi, Contorni e Dolci</p>
              </div>
            </div>

            <button
              onClick={() => onOpenRecipeModal()}
              className="w-full sm:w-auto p-[10px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-xs flex items-center justify-center gap-[5px] shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Aggiungi Nuova Ricetta</span>
            </button>
          </div>

          {/* Dish Course Filter Tabs (Antipasti, Primi, Secondi, Contorni, Dolci) */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm space-y-[8px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-[6px]">
              <span className="text-[11px] font-black text-[#191970] uppercase tracking-wider flex items-center gap-[4px]">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#f37021]" />
                Filtra per Portata
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Totale ricette salvate: <strong>{recipes.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-[5px] flex-wrap">
              {(['Tutti', 'Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'] as const).map((c) => {
                const count = c === 'Tutti' 
                  ? recipes.length 
                  : recipes.filter(r => (r.course || inferCourseFromRecipe(r.name, r.category)) === c).length;

                return (
                  <button
                    key={c}
                    onClick={() => setSelectedCourseFilter(c)}
                    className={`p-[6px] px-[12px] rounded-full text-xs font-extrabold transition-all flex items-center gap-[4px] ${
                      selectedCourseFilter === c
                        ? 'bg-[#191970] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span>
                      {c === 'Tutti' && '🍽️'}
                      {c === 'Antipasti' && '🥗'}
                      {c === 'Primi' && '🍝'}
                      {c === 'Secondi' && '🥩'}
                      {c === 'Contorni' && '🥬'}
                      {c === 'Dolci' && '🍰'}
                    </span>
                    <span>{c}</span>
                    <span className={`text-[10px] px-[5px] py-[1px] rounded-full ${selectedCourseFilter === c ? 'bg-[#f37021] text-white' : 'bg-slate-200 text-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-filter by Tradition/Category */}
            <div className="flex items-center gap-[5px] pt-[4px] text-xs">
              <span className="font-bold text-slate-500">Tradizione:</span>
              {(['Tutte', 'Sabina', 'Lazio', 'Classica', 'Altro'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-[8px] py-[2px] rounded-md text-[11px] font-bold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#f37021]/15 text-[#d95d13] border border-[#f37021]/40'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SEASONAL FOODS NUTRITIONAL ADVISOR WIDGET */}
          <div className="bg-emerald-900 text-white rounded-lg p-[12px] shadow-md border border-emerald-800 space-y-[10px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[8px]">
              <div className="flex items-center gap-[8px]">
                <div className="p-[6px] rounded-md bg-emerald-700 text-white">
                  <Leaf className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-emerald-100 flex items-center gap-[5px]">
                    Guida Alimentazione di Stagione & Ortofrutta
                  </h4>
                  <p className="text-xs text-emerald-200">
                    Scegli alimenti di stagione per un'alimentazione piu ricca di nutrienti e gusto
                  </p>
                </div>
              </div>

              {/* Month Selector for Seasonality */}
              <div className="flex items-center gap-[4px] bg-emerald-800/80 p-[4px] rounded-md border border-emerald-700 overflow-x-auto max-w-full">
                {MONTHLY_SEASONAL_PRODUCE.map((m, idx) => (
                  <button
                    key={m.monthName}
                    onClick={() => setSelectedSeasonalMonth(idx)}
                    className={`p-[3px] px-[8px] rounded text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedSeasonalMonth === idx
                        ? 'bg-[#f37021] text-white shadow-xs font-black'
                        : 'text-emerald-200 hover:bg-emerald-700/60'
                    }`}
                  >
                    {m.monthName.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Month Produce Display */}
            <div className="bg-emerald-950/60 rounded-lg p-[10px] border border-emerald-800 space-y-[8px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-[4px]">
                  <span>{MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].seasonIcon}</span>
                  <span>Prodotti Consigliati a {MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].monthName} ({MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].season})</span>
                </span>
                <span className="text-[10px] text-emerald-400 italic">Nutrizione Ottimale</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[8px]">
                {MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-emerald-900/80 border border-emerald-700 hover:border-emerald-500 rounded-md p-[8px] flex flex-col justify-between space-y-[4px] transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-[6px] mb-[2px]">
                        <span className="text-lg">{item.icon}</span>
                        <h5 className="font-extrabold text-xs text-white leading-snug">{item.name}</h5>
                      </div>
                      <p className="text-[10px] text-emerald-200 leading-tight">{item.description}</p>
                      <div className="mt-[4px] text-[9px] font-bold text-emerald-300 bg-emerald-950/80 p-[3px] px-[5px] rounded border border-emerald-800">
                        ✨ {item.benefits}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onOpenRecipeModal({
                          id: '',
                          name: `Ricetta con ${item.name.replace(/\s*\(.*\)/, '')}`,
                          category: 'Classica',
                          course: 'Primi',
                          prepTimeMinutes: 20,
                          servings: 4,
                          nutrition: { calories: 420, protein: 18, fat: 14, carbs: 48 },
                          ingredients: [{ name: item.name.replace(/\s*\(.*\)/, ''), quantity: '200', unit: 'g' }],
                          instructions: `Preparazione a base di ${item.name}...`
                        });
                      }}
                      className="mt-[6px] w-full p-[4px] bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-[10px] rounded flex items-center justify-center gap-[3px] shadow-2xs transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Crea Ricetta con {item.name.split(' ')[0]}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RECIPE CARDS GRID */}
          {(() => {
            const filtered = recipes.filter((r) => {
              const rCourse = r.course || inferCourseFromRecipe(r.name, r.category);
              const matchesCourse = selectedCourseFilter === 'Tutti' || rCourse === selectedCourseFilter;
              const matchesCat = selectedCategory === 'Tutte' || r.category === selectedCategory;
              return matchesCourse && matchesCat;
            });

            if (filtered.length === 0) {
              return (
                <div className="bg-white rounded-lg p-[30px] border border-slate-200 text-center space-y-[8px]">
                  <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-bold text-[#191970] text-sm">Nessuna ricetta trovata in questa categoria</h4>
                  <p className="text-xs text-slate-500">
                    Prova a selezionare un'altra portata o aggiungi una nuova ricetta!
                  </p>
                  <button
                    onClick={() => onOpenRecipeModal()}
                    className="p-[8px] px-[14px] rounded-md bg-[#f37021] text-white font-bold text-xs inline-flex items-center gap-[4px]"
                  >
                    <Plus className="w-4 h-4" /> Aggiungi Ricetta
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[10px]">
                {filtered.map((recipe) => {
                  const nut = getRecipeNut(recipe);
                  const displayCourse = recipe.course || inferCourseFromRecipe(recipe.name, recipe.category);
                  return (
                    <div
                      key={recipe.id}
                      className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div className="p-[5px]">
                        <div className="flex items-center justify-between gap-[5px] mb-[5px]">
                          <div className="flex items-center gap-[4px] flex-wrap">
                            <span className="text-[11px] font-black px-[7px] py-[2px] rounded-full bg-[#191970] text-white">
                              {displayCourse === 'Antipasti' && '🥗 '}
                              {displayCourse === 'Primi' && '🍝 '}
                              {displayCourse === 'Secondi' && '🥩 '}
                              {displayCourse === 'Contorni' && '🥬 '}
                              {displayCourse === 'Dolci' && '🍰 '}
                              {displayCourse}
                            </span>
                            <span className="text-[11px] font-bold px-[6px] py-[2px] rounded-full bg-[#f37021]/10 text-[#f37021] border border-[#f37021]/30">
                              {recipe.category}
                            </span>
                          </div>
                          {recipe.prepTimeMinutes && (
                            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-[3px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {recipe.prepTimeMinutes} min
                            </span>
                          )}
                        </div>

                        <h3 className="font-extrabold text-[#191970] text-base mb-[3px]">
                          {recipe.name}
                        </h3>

                        {/* Nutrition pill badge */}
                        <div className="flex items-center gap-[4px] text-[10px] font-bold mb-[8px] flex-wrap">
                          <span className="bg-[#f37021]/15 text-[#d95d13] p-[2px] px-[5px] rounded">🔥 {nut.calories} kcal</span>
                          <span className="bg-blue-50 text-blue-800 p-[2px] px-[4px] rounded">P: {nut.protein}g</span>
                          <span className="bg-amber-50 text-amber-800 p-[2px] px-[4px] rounded">G: {nut.fat}g</span>
                          <span className="bg-emerald-50 text-emerald-800 p-[2px] px-[4px] rounded">C: {nut.carbs}g</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 mb-[5px]">
                          Ingredienti ({recipe.ingredients.length}):
                        </p>
                        <div className="flex flex-wrap gap-[5px] mb-[10px]">
                          {recipe.ingredients.map((ing, i) => (
                            <span
                              key={i}
                              className="text-[11px] bg-slate-100 text-slate-700 p-[4px] px-[6px] rounded-md font-medium"
                            >
                              {ing.name} ({ing.quantity} {ing.unit})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-[5px] pt-[5px] border-t border-slate-100">
                        <button
                          onClick={() => onOpenRecipeModal(recipe)}
                          className="flex-1 p-[5px] rounded-md bg-slate-100 hover:bg-[#191970] hover:text-white text-[#191970] font-bold text-[11px] flex items-center justify-center gap-[3px] transition-colors border border-slate-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Vedi</span>
                        </button>
                        <button
                          onClick={() => onOpenRecipeModal(recipe)}
                          className="flex-1 p-[5px] rounded-md bg-amber-50 hover:bg-[#f37021] hover:text-white text-[#d95d13] font-bold text-[11px] flex items-center justify-center gap-[3px] transition-colors border border-amber-200/60"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Modifica</span>
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Sei sicuro di voler eliminare "${recipe.name}"?`)) {
                              await deleteRecipe(recipe.id);
                            }
                          }}
                          className="p-[5px] px-[8px] rounded-md bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 font-bold text-[11px] flex items-center justify-center gap-[3px] transition-colors border border-rose-200/60"
                          title="Elimina ricetta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Elimina</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* MODAL: SELECT RECIPE FOR SLOT */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-[10px] animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden p-[10px]">
            {/* Modal Header */}
            <div className="p-[10px] bg-[#191970] text-white flex items-center justify-between rounded-md">
              <div>
                <h3 className="font-extrabold text-base">
                  Seleziona Ricetta per {selectedSlot.day} {selectedSlot.dateStr ? `(${selectedSlot.dateStr})` : ''}
                </h3>
                <p className="text-xs text-[#f37021] font-semibold mt-[5px] flex items-center gap-[5px]">
                  {selectedSlot.mealType === 'lunch' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-[#f37021]" />
                      <span>Slot: Pranzo</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-[#f37021]" />
                      <span>Slot: Cena</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-[5px] rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-sm font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="p-[10px] border-b border-slate-100 space-y-[5px] bg-slate-50 my-[5px] rounded-md">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cerca per nome o ingrediente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-md text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37021]"
                />
              </div>

              <div className="flex items-center gap-[5px] overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-[5px] px-[10px] rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[#f37021] text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipe List */}
            <div className="p-[5px] overflow-y-auto space-y-[5px] flex-1">
              {filteredRecipes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-xs font-semibold">Nessuna ricetta trovata.</p>
                </div>
              ) : (
                filteredRecipes.map((recipe) => {
                  const nut = getRecipeNut(recipe);
                  return (
                    <div
                      key={recipe.id}
                      onClick={() => handleSelectRecipe(recipe)}
                      className="p-[10px] bg-white hover:bg-[#f37021]/10 border border-slate-200 hover:border-[#f37021] rounded-md cursor-pointer transition-all flex items-center justify-between gap-[5px] group"
                    >
                      <div className="p-[5px]">
                        <div className="flex items-center gap-[5px] mb-[4px]">
                          <span className="text-[10px] font-bold px-[5px] py-[2px] rounded bg-[#f37021]/10 text-[#f37021]">
                            {recipe.category}
                          </span>
                          {recipe.prepTimeMinutes && (
                            <span className="text-[10px] text-slate-400">
                              {recipe.prepTimeMinutes} min
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-[#191970] text-sm group-hover:text-[#f37021]">
                          {recipe.name}
                        </h4>

                        {/* Nutrition info */}
                        <div className="flex items-center gap-[4px] text-[10px] font-bold my-[3px]">
                          <span className="bg-[#f37021]/15 text-[#d95d13] px-1 rounded">🔥 {nut.calories} kcal</span>
                          <span className="bg-blue-50 text-blue-800 px-1 rounded">P: {nut.protein}g</span>
                          <span className="bg-amber-50 text-amber-800 px-1 rounded">G: {nut.fat}g</span>
                          <span className="bg-emerald-50 text-emerald-800 px-1 rounded">C: {nut.carbs}g</span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {recipe.ingredients.map((i) => i.name).join(', ')}
                        </p>
                      </div>

                      <button className="p-[5px] px-[10px] rounded-md bg-[#191970] group-hover:bg-[#f37021] text-white font-bold text-xs shrink-0 transition-colors">
                        Scegli
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-[10px] bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-md">
              <button
                onClick={() => onOpenRecipeModal()}
                className="text-xs font-bold text-[#f37021] hover:underline flex items-center gap-[5px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Crea Nuova Ricetta
              </button>
              <button
                onClick={() => setSelectedSlot(null)}
                className="p-[5px] px-[10px] rounded-md bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
