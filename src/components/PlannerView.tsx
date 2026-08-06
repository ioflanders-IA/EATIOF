import React, { useState, useEffect, useRef } from 'react';
import { Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem, DayOfWeek, MealType, CategoryType, DishCourse, NutritionInfo } from '../types';
import { DAYS_OF_WEEK } from '../data/initialData';
import { getFamilyConfig, FAMILY_CONFIG_CHANGED_EVENT } from '../lib/familyAuthService';
import { MONTHLY_SEASONAL_PRODUCE, getSeasonalDataForMonth, inferCourseFromRecipe, SeasonalItem } from '../data/seasonalData';
import { SeasonalIcon } from './SeasonalIcon';
import {
  addWeeklyMenuItem,
  removeWeeklyMenuItem,
  removeWeeklySlot,
  generateShoppingListFromMenu,
  deleteRecipe,
  subscribeToPantryItems,
  saveRecipe
} from '../lib/dataService';
import { generate5RecipesForSeasonalItem, RecipeWithPantryCheck } from '../lib/seasonalRecipeGenerator';
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
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Sparkles,
  Eye,
  Pencil,
  Leaf,
  Info,
  Check
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
  const [isSeasonalExpanded, setIsSeasonalExpanded] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'fullCalendar' | 'nutrition' | 'recipeBook'>(initialSubTab);

  // Real-time Pantry state for checking available fridge ingredients
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [seasonalItemFor5Recipes, setSeasonalItemFor5Recipes] = useState<SeasonalItem | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());

  // Refs for Infinite Wheel Month Selector in Seasonal Advisor
  const seasonalMonthContainerRef = useRef<HTMLDivElement>(null);
  const monthButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Initial scroll positioning to center cycle
    if (seasonalMonthContainerRef.current) {
      const container = seasonalMonthContainerRef.current;
      const singleCycleWidth = container.scrollWidth / 3;
      if (container.scrollLeft === 0 && singleCycleWidth > 0) {
        container.scrollLeft = singleCycleWidth;
      }
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (!isSeasonalExpanded) return;
    const timer = setTimeout(() => {
      const activeBtn = monthButtonsRef.current[12 + selectedSeasonalMonth];
      const container = seasonalMonthContainerRef.current;
      if (activeBtn && container) {
        const btnLeft = activeBtn.offsetLeft;
        const btnWidth = activeBtn.offsetWidth;
        const containerWidth = container.clientWidth;
        const targetScrollLeft = btnLeft - containerWidth / 2 + btnWidth / 2;
        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth'
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedSeasonalMonth, activeSubTab, isSeasonalExpanded]);

  const handleSeasonalScroll = () => {
    const container = seasonalMonthContainerRef.current;
    if (!container) return;
    const singleCycleWidth = container.scrollWidth / 3;
    if (singleCycleWidth <= 0) return;

    if (container.scrollLeft < singleCycleWidth * 0.25) {
      container.scrollLeft += singleCycleWidth;
    } else if (container.scrollLeft > singleCycleWidth * 1.75) {
      container.scrollLeft -= singleCycleWidth;
    }
  };

  useEffect(() => {
    const unsubPantry = subscribeToPantryItems((items) => {
      setPantryItems(items);
    });
    return () => unsubPantry();
  }, []);

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
    const rCourse = r.course || inferCourseFromRecipe(r.name, r.category);
    const matchesCourse = selectedCourseFilter === 'Tutti' || rCourse === selectedCourseFilter;
    const matchesCat = selectedCategory === 'Tutte' || r.category === selectedCategory;
    return matchesSearch && matchesCourse && matchesCat;
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

  // PAGE VIEW: DEDICATED SEASONAL 5 RECIPES GENERATOR VIEW
  if (seasonalItemFor5Recipes) {
    return (
      <div className="bg-white rounded-lg p-[10px] sm:p-[15px] border border-slate-200 shadow-md space-y-[12px] animate-fade-in min-h-[80vh]">
        {/* Header */}
        <div className="p-[10px] sm:p-[12px] bg-emerald-900 text-white rounded-lg flex items-center justify-between gap-[10px] shadow-sm flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-[10px]">
            <button
              onClick={() => setSeasonalItemFor5Recipes(null)}
              className="p-[6px] px-[12px] rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-[5px] transition-colors shrink-0 border border-emerald-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Indietro</span>
            </button>
            <div className="flex items-center gap-[8px]">
              <SeasonalIcon icon={seasonalItemFor5Recipes.icon} className="w-6 h-6 text-[#f37021] shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-[6px]">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  5 Ricette di Stagione con {seasonalItemFor5Recipes.name}
                </h3>
                <p className="text-[11px] text-emerald-200 leading-tight">
                  Prodotti di stagione a {MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].monthName} • Disponibilità in Frigo/Dispensa attiva 🟢
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSeasonalItemFor5Recipes(null)}
            className="p-[6px] px-[12px] rounded-md bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
          >
            Chiudi
          </button>
        </div>

        {/* Legend */}
        <div className="p-[8px] px-[12px] bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between gap-[10px] text-xs flex-wrap">
          <div className="flex items-center gap-[8px]">
            <span className="text-slate-700 font-bold">Stato Ingredienti:</span>
            <span className="bg-emerald-100 text-emerald-800 px-[6px] py-[2px] rounded font-extrabold flex items-center gap-[3px] text-[11px]">
              🟢 In Frigo
            </span>
            <span className="bg-amber-100 text-amber-900 px-[6px] py-[2px] rounded font-extrabold flex items-center gap-[3px] text-[11px]">
              🛒 Da Acquistare
            </span>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            Totale prodotti nel tuo Frigo/Dispensa: {pantryItems.length}
          </span>
        </div>

        {/* Generated Recipes List */}
        <div className="space-y-[10px]">
          {generate5RecipesForSeasonalItem(seasonalItemFor5Recipes, MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].monthName, pantryItems).map((item) => {
            const isSaved = savedRecipeIds.has(item.recipe.id);
            return (
              <div
                key={item.recipe.id}
                className="bg-white rounded-lg p-[12px] border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-[8px]"
              >
                <div className="flex items-center justify-between gap-[5px] flex-wrap">
                  <div className="flex items-center gap-[5px] flex-wrap">
                    <span className="text-[11px] font-black px-[8px] py-[2px] rounded-full bg-[#191970] text-white">
                      {item.recipe.course === 'Antipasti' && '🥗 '}
                      {item.recipe.course === 'Primi' && '🍝 '}
                      {item.recipe.course === 'Secondi' && '🥩 '}
                      {item.recipe.course === 'Contorni' && '🥬 '}
                      {item.recipe.course === 'Dolci' && '🍰 '}
                      {item.recipe.course}
                    </span>
                    <span className="text-[11px] font-bold px-[6px] py-[2px] rounded-full bg-[#f37021]/10 text-[#f37021] border border-[#f37021]/30">
                      {item.recipe.category}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-[3px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.recipe.prepTimeMinutes} min
                    </span>
                  </div>

                  <div className="flex items-center gap-[4px] text-[10px] font-extrabold">
                    <span className="bg-emerald-100 text-emerald-800 px-[6px] py-[2px] rounded border border-emerald-200">
                      🟢 {item.inPantryCount} in frigo
                    </span>
                    <span className="bg-amber-100 text-amber-900 px-[6px] py-[2px] rounded border border-amber-200">
                      🛒 {item.toBuyCount} da acquistare
                    </span>
                  </div>
                </div>

                <h4 className="font-extrabold text-[#191970] text-base leading-snug">
                  {item.recipe.name}
                </h4>

                <div className="flex items-center gap-[4px] text-[10px] font-bold flex-wrap">
                  <span className="bg-[#f37021]/15 text-[#d95d13] p-[2px] px-[5px] rounded">🔥 {item.recipe.nutrition?.calories} kcal</span>
                  <span className="bg-blue-50 text-blue-800 p-[2px] px-[4px] rounded">P: {item.recipe.nutrition?.protein}g</span>
                  <span className="bg-amber-50 text-amber-800 p-[2px] px-[4px] rounded">G: {item.recipe.nutrition?.fat}g</span>
                  <span className="bg-emerald-50 text-emerald-800 p-[2px] px-[4px] rounded">C: {item.recipe.nutrition?.carbs}g</span>
                </div>

                <div className="space-y-[3px]">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Ingredienti della ricetta ({item.ingredientDetails.length}):
                  </span>
                  <div className="flex flex-wrap gap-[4px]">
                    {item.ingredientDetails.map((det, iIdx) => (
                      <span
                        key={iIdx}
                        className={`text-[11px] font-bold p-[4px] px-[8px] rounded-md border flex items-center gap-[3px] ${
                          det.inPantry
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{det.inPantry ? '🟢' : '🛒'}</span>
                        <span>{det.ingredient.name} ({det.ingredient.quantity} {det.ingredient.unit})</span>
                        {det.inPantry && (
                          <span className="text-[9px] text-emerald-600 font-extrabold italic ml-[2px]">
                            (In frigo)
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-[6px] pt-[6px] border-t border-slate-100 flex-wrap">
                  <button
                    onClick={async () => {
                      await saveRecipe(item.recipe);
                      setSavedRecipeIds((prev) => new Set(prev).add(item.recipe.id));
                    }}
                    disabled={isSaved}
                    className={`p-[6px] px-[12px] rounded-md text-xs font-bold flex items-center gap-[4px] transition-colors ${
                      isSaved
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-[#191970] hover:bg-[#121250] text-white'
                    }`}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isSaved ? 'Salvata nel Ricettario' : 'Salva nel Ricettario'}</span>
                  </button>

                  {selectedSlot && (
                    <button
                      onClick={async () => {
                        await saveRecipe(item.recipe);
                        await handleSelectRecipe(item.recipe);
                        setSeasonalItemFor5Recipes(null);
                      }}
                      className="p-[6px] px-[12px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white text-xs font-bold flex items-center gap-[4px] transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Assegna a {selectedSlot.day} ({selectedSlot.mealType === 'lunch' ? 'Pranzo' : 'Cena'})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-[10px] bg-slate-50 border border-slate-200 flex items-center justify-between rounded-lg">
          <span className="text-xs text-slate-500 font-medium">
            Scegli e salva le ricette stagionali preferite per la tua famiglia.
          </span>
          <button
            onClick={() => setSeasonalItemFor5Recipes(null)}
            className="p-[6px] px-[12px] rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
          >
            Torna Indietro
          </button>
        </div>
      </div>
    );
  }

  // PAGE VIEW: DEDICATED RECIPE SELECTION FOR CALENDAR SLOT
  if (selectedSlot) {
    return (
      <div className="bg-white rounded-lg p-[10px] sm:p-[15px] border border-slate-200 shadow-md space-y-[12px] animate-fade-in min-h-[80vh]">
        {/* Header */}
        <div className="p-[10px] sm:p-[12px] bg-[#191970] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[10px] rounded-lg shadow-sm">
          <div className="flex items-center gap-[10px]">
            <button
              onClick={() => setSelectedSlot(null)}
              className="p-[6px] px-[12px] rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-[5px] transition-colors border border-white/20 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Torna al Calendario</span>
            </button>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Seleziona Ricetta per {selectedSlot.day} {selectedSlot.dateStr ? `(${selectedSlot.dateStr})` : ''}
              </h3>
              <p className="text-xs text-[#f37021] font-bold flex items-center gap-[5px] mt-[2px]">
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
          </div>

          <button
            onClick={() => setSelectedSlot(null)}
            className="p-[6px] px-[12px] rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors shrink-0"
          >
            Annulla
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-[10px] border border-slate-200 space-y-[8px] bg-slate-50 rounded-lg">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cerca per nome o ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#f37021]"
            />
          </div>

          {/* Consigli Prodotti di Stagione */}
          <div className="p-[8px] bg-emerald-900 text-white rounded-md border border-emerald-700 space-y-[6px]">
            <div className="flex items-center justify-between px-[2px]">
              <span className="text-xs font-extrabold text-emerald-200 flex items-center gap-[4px]">
                <Leaf className="w-3.5 h-3.5 text-emerald-300" />
                <span>Prodotti Consigliati a {MONTHLY_SEASONAL_PRODUCE[new Date().getMonth()].monthName}:</span>
              </span>
              <span className="text-[10px] text-emerald-300 italic">Ricette</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-[5px]">
              {MONTHLY_SEASONAL_PRODUCE[new Date().getMonth()].items.slice(0, 6).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSeasonalItemFor5Recipes(item)}
                  className="p-[5px] bg-emerald-800/90 hover:bg-[#f37021] text-white rounded border border-emerald-600 hover:border-[#f37021] transition-all flex items-center justify-between text-left gap-[4px] group"
                >
                  <div className="flex items-center gap-[4px] min-w-0">
                    <SeasonalIcon icon={item.icon} className="w-4 h-4 text-[#f37021] shrink-0" />
                    <span className="text-[10px] font-bold truncate">{item.name}</span>
                  </div>
                  <BookOpen className="w-3 h-3 text-emerald-300 group-hover:text-white shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Portate */}
          <div className="flex items-center gap-[5px] overflow-x-auto pb-1 scrollbar-none pt-[2px]">
            <span className="text-xs font-extrabold text-[#191970] shrink-0">Portata:</span>
            {(['Tutti', 'Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCourseFilter(c)}
                className={`p-[5px] px-[10px] rounded-md text-xs font-extrabold whitespace-nowrap transition-colors flex items-center gap-[4px] ${
                  selectedCourseFilter === c
                    ? 'bg-[#191970] text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
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
              </button>
            ))}
          </div>

          {/* Tradizione */}
          <div className="flex items-center gap-[5px] overflow-x-auto pb-1 scrollbar-none pt-[2px]">
            <span className="text-xs font-extrabold text-slate-500 shrink-0">Tradizione:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`p-[4px] px-[9px] rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#f37021] text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="space-y-[8px]">
          <div className="flex items-center justify-between p-[2px]">
            <h4 className="font-extrabold text-[#191970] text-sm">Ricette Disponibili ({filteredRecipes.length})</h4>
            <button
              onClick={() => onOpenRecipeModal()}
              className="text-xs font-bold text-[#f37021] hover:underline flex items-center gap-[4px]"
            >
              <Plus className="w-3.5 h-3.5" />
              Crea Nuova Ricetta
            </button>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600">Nessuna ricetta trovata con questi filtri.</p>
              <button
                onClick={() => onOpenRecipeModal()}
                className="mt-3 p-[8px] px-[14px] rounded-md bg-[#f37021] text-white font-bold text-xs inline-flex items-center gap-[4px]"
              >
                <Plus className="w-4 h-4" /> Crea Nuova Ricetta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[10px]">
              {filteredRecipes.map((recipe) => {
                const nut = getRecipeNut(recipe);
                const displayCourse = recipe.course || inferCourseFromRecipe(recipe.name, recipe.category);
                return (
                  <div
                    key={recipe.id}
                    onClick={() => handleSelectRecipe(recipe)}
                    className="p-[12px] bg-white hover:bg-[#f37021]/10 border border-slate-200 hover:border-[#f37021] rounded-lg cursor-pointer transition-all flex flex-col justify-between gap-[8px] group shadow-2xs hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center gap-[4px] mb-[6px] flex-wrap">
                        <span className="text-[10px] font-black px-[6px] py-[2px] rounded-full bg-[#191970] text-white">
                          {displayCourse === 'Antipasti' && '🥗 '}
                          {displayCourse === 'Primi' && '🍝 '}
                          {displayCourse === 'Secondi' && '🥩 '}
                          {displayCourse === 'Contorni' && '🥬 '}
                          {displayCourse === 'Dolci' && '🍰 '}
                          {displayCourse}
                        </span>
                        <span className="text-[10px] font-bold px-[6px] py-[2px] rounded bg-[#f37021]/10 text-[#f37021]">
                          {recipe.category}
                        </span>
                        {recipe.prepTimeMinutes && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {recipe.prepTimeMinutes} min
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-[#191970] text-base group-hover:text-[#f37021] leading-tight">
                        {recipe.name}
                      </h4>

                      {/* Nutrition info */}
                      <div className="flex items-center gap-[4px] text-[10px] font-bold my-[5px]">
                        <span className="bg-[#f37021]/15 text-[#d95d13] px-1.5 py-[1px] rounded">🔥 {nut.calories} kcal</span>
                        <span className="bg-blue-50 text-blue-800 px-1 py-[1px] rounded">P: {nut.protein}g</span>
                        <span className="bg-amber-50 text-amber-800 px-1 py-[1px] rounded">G: {nut.fat}g</span>
                        <span className="bg-emerald-50 text-emerald-800 px-1 py-[1px] rounded">C: {nut.carbs}g</span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {recipe.ingredients.map((i) => i.name).join(', ')}
                      </p>
                    </div>

                    <button className="w-full p-[8px] rounded-md bg-[#191970] group-hover:bg-[#f37021] text-white font-bold text-xs transition-colors flex items-center justify-center gap-[4px] shadow-2xs">
                      <span>Assegna a {selectedSlot.day} ({selectedSlot.mealType === 'lunch' ? 'Pranzo' : 'Cena'})</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-[10px] bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <button
            onClick={() => onOpenRecipeModal()}
            className="text-xs font-bold text-[#f37021] hover:underline flex items-center gap-[5px]"
          >
            <Plus className="w-4 h-4" />
            Crea Nuova Ricetta Personalizzata
          </button>
          <button
            onClick={() => setSelectedSlot(null)}
            className="p-[6px] px-[12px] rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
          >
            Torna al Calendario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[10px]">
      {/* Header Banner & Genera Spesa Action */}
      <div className="bg-[#191970] rounded-lg p-[10px] px-[12px] text-white shadow-md">
        <div className="flex items-center justify-between gap-[10px]">
          {/* Title */}
          <div className="flex items-center gap-[8px]">
            <Calendar className="w-4 h-4 text-[#f37021]" />
            <h2 className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
              {activeSubTab === 'recipeBook'
                ? 'Ricettario di Famiglia'
                : activeSubTab === 'nutrition'
                ? 'Valori Nutrizionali & Statistiche'
                : 'Menu Settimanale'}
            </h2>
          </div>

          {/* Plus Button for Recipe Book */}
          {activeSubTab === 'recipeBook' && (
            <button
              onClick={() => onOpenRecipeModal()}
              title="Aggiungi Nuova Ricetta"
              className="p-1 px-2.5 rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-xs shadow-2xs active:scale-95 transition-all flex items-center justify-center shrink-0 ml-auto"
            >
              <Plus className="w-4 h-4 text-white stroke-[3]" />
            </button>
          )}

          {/* Compact Genera Spesa Button on Top Right (when in calendar mode) */}
          {(activeSubTab === 'calendar' || activeSubTab === 'fullCalendar') && (
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
          )}
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
          <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-[5px]">
            <div className="flex items-center gap-[5px] w-full md:w-auto justify-between md:justify-start">
              <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-[5px] px-[8px] rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[#191970] font-extrabold text-[11px] flex items-center gap-[3px] transition-all shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sett. Prec.</span>
              </button>

              <div className="text-center px-[4px]">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#f37021] block leading-none">
                  {weekOffset === 0
                    ? 'Settimana Corrente'
                    : weekOffset > 0
                    ? `Tra ${weekOffset} Settiman${weekOffset === 1 ? 'a' : 'e'}`
                    : `${Math.abs(weekOffset)} Settiman${Math.abs(weekOffset) === 1 ? 'a' : 'e'} Fa`}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-[#191970] leading-tight mt-[1px]">
                  {getFormattedWeekRange(weekOffset)}
                </h3>
              </div>

              <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-[5px] px-[8px] rounded-md border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[#191970] font-extrabold text-[11px] flex items-center gap-[3px] transition-all shrink-0"
              >
                <span>Sett. Succ.</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Week Selectors (Up to +2 weeks, fitted in 3 columns) */}
            <div className="grid grid-cols-3 gap-[5px] w-full md:w-auto">
              <button
                onClick={() => setWeekOffset(0)}
                className={`p-[5px] px-[4px] rounded-md text-[10px] sm:text-[11px] font-extrabold text-center transition-all truncate ${
                  weekOffset === 0
                    ? 'bg-[#191970] text-white border border-[#191970] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                Questa Settimana
              </button>
              <button
                onClick={() => setWeekOffset(1)}
                className={`p-[5px] px-[4px] rounded-md text-[10px] sm:text-[11px] font-extrabold text-center transition-all truncate ${
                  weekOffset === 1
                    ? 'bg-[#f37021] text-white border border-[#f37021] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                Prossima (+1)
              </button>
              <button
                onClick={() => setWeekOffset(2)}
                className={`p-[5px] px-[4px] rounded-md text-[10px] sm:text-[11px] font-extrabold text-center transition-all truncate ${
                  weekOffset === 2
                    ? 'bg-[#f37021] text-white border border-[#f37021] shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                Tra 2 Sett. (+2)
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
                  className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between p-[5px]"
                >
                  {/* Day Header with Date (thick border, no solid blue bg) */}
                  <div className="border-2 border-[#191970] bg-white p-[5px] px-[8px] rounded-md flex items-center justify-between mb-[5px]">
                    <span className="font-extrabold text-xs tracking-wide text-[#191970]">{day}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{dateInfo.fullDateStr}</span>
                  </div>

                  <div className="space-y-[6px]">
                    {/* PRANZO SLOT */}
                    <div className="space-y-[4px]">
                      <div className="flex items-center justify-between p-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#f37021] flex items-center gap-[5px]">
                          <Sun className="w-3.5 h-3.5 text-[#f37021]" />
                          <span>Pranzo {lunchSlots.length > 0 && `(${lunchSlots.length})`}</span>
                        </span>
                      </div>

                      <div className={lunchSlots.length > 0 ? "grid grid-cols-2 gap-[5px]" : "space-y-[4px]"}>
                        {lunchSlots.map((lunchSlot) => {
                          const lunchRecipe = recipeMap.get(lunchSlot.recipeId);
                          const lunchNut = getRecipeNut(lunchRecipe);
                          return (
                            <div
                              key={lunchSlot.id}
                              className="group relative bg-[#f37021]/10 border border-[#f37021]/30 rounded-md p-[5px] hover:bg-[#f37021]/20 transition-colors flex flex-col justify-between min-w-0"
                            >
                              <div className="flex items-start justify-between gap-[3px]">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-[#191970] text-[11px] sm:text-xs truncate leading-tight">
                                    {lunchSlot.recipeName}
                                  </h4>
                                  <button
                                    onClick={() => {
                                      if (lunchRecipe) onOpenRecipeModal(lunchRecipe);
                                    }}
                                    className="text-[9px] font-semibold text-[#f37021] hover:underline inline-block"
                                  >
                                    Vedi ingredienti
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveMenuItem(lunchSlot.id)}
                                  className="p-[2px] rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                  title="Rimuovi pietanza"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Nutrition pills for lunch */}
                              {lunchNut && (
                                <div className="mt-[4px] pt-[3px] border-t border-[#f37021]/20 flex items-center gap-[2px] flex-wrap text-[9px] font-bold">
                                  <span className="p-[1px] px-[3px] rounded bg-[#f37021]/20 text-[#d95d13] whitespace-nowrap">
                                    🔥 {lunchNut.calories} kcal
                                  </span>
                                  <span className="p-[1px] px-[3px] rounded bg-white/80 text-blue-800 whitespace-nowrap">
                                    P: {lunchNut.protein}g
                                  </span>
                                  <span className="p-[1px] px-[3px] rounded bg-white/80 text-amber-800 whitespace-nowrap">
                                    G: {lunchNut.fat}g
                                  </span>
                                  <span className="p-[1px] px-[3px] rounded bg-white/80 text-emerald-800 whitespace-nowrap">
                                    C: {lunchNut.carbs}g
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() =>
                          setSelectedSlot({
                            day,
                            mealType: 'lunch',
                            weekId: activeWeekId,
                            dateStr: dateInfo.fullDateStr
                          })
                        }
                        className="w-full p-[5px] border-2 border-dashed border-slate-200 hover:border-[#f37021] rounded-md bg-slate-50 hover:bg-[#f37021]/10 text-slate-600 hover:text-[#f37021] transition-all text-xs font-semibold flex items-center justify-center gap-[4px]"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#f37021]" />
                        <span>{lunchSlots.length > 0 ? '+ Aggiungi pietanza a Pranzo' : 'Scegli Pranzo'}</span>
                      </button>
                    </div>

                    {/* CENA SLOT */}
                    <div className="space-y-[4px]">
                      <div className="flex items-center justify-between p-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#191970] flex items-center gap-[5px]">
                          <Moon className="w-3.5 h-3.5 text-[#191970]" />
                          <span>Cena {dinnerSlots.length > 0 && `(${dinnerSlots.length})`}</span>
                        </span>
                      </div>

                      <div className={dinnerSlots.length > 0 ? "grid grid-cols-2 gap-[5px]" : "space-y-[4px]"}>
                        {dinnerSlots.map((dinnerSlot) => {
                          const dinnerRecipe = recipeMap.get(dinnerSlot.recipeId);
                          const dinnerNut = getRecipeNut(dinnerRecipe);
                          return (
                            <div
                              key={dinnerSlot.id}
                              className="group relative bg-[#191970]/10 border border-[#191970]/30 rounded-md p-[5px] hover:bg-[#191970]/20 transition-colors flex flex-col justify-between min-w-0"
                            >
                              <div className="flex items-start justify-between gap-[3px]">
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-[#191970] text-[11px] sm:text-xs truncate leading-tight">
                                    {dinnerSlot.recipeName}
                                  </h4>
                                  <button
                                    onClick={() => {
                                      if (dinnerRecipe) onOpenRecipeModal(dinnerRecipe);
                                    }}
                                    className="text-[9px] font-semibold text-[#191970] hover:underline inline-block"
                                  >
                                    Vedi ingredienti
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleRemoveMenuItem(dinnerSlot.id)}
                                  className="p-[2px] rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                  title="Rimuovi pietanza"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Nutrition pills for dinner */}
                              {dinnerNut && (
                                <div className="mt-[4px] pt-[3px] border-t border-[#191970]/20 flex items-center gap-[2px] flex-wrap text-[9px] font-bold">
                                  <span className="p-[1px] px-[3px] rounded bg-[#191970]/20 text-[#191970] whitespace-nowrap">
                                    🔥 {dinnerNut.calories} kcal
                                  </span>
                                  <span className="p-[1px] px-[3px] rounded bg-white/80 text-blue-800 whitespace-nowrap">
                                    P: {dinnerNut.protein}g
                                  </span>
                                  <span className="p-[1px] px-[3px] rounded bg-white/80 text-amber-800 whitespace-nowrap">
                                    G: {dinnerNut.fat}g
                                  </span>
                                  <span className="p-[1px] px-[3px] rounded bg-white/80 text-emerald-800 whitespace-nowrap">
                                    C: {dinnerNut.carbs}g
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={() =>
                          setSelectedSlot({
                            day,
                            mealType: 'dinner',
                            weekId: activeWeekId,
                            dateStr: dateInfo.fullDateStr
                          })
                        }
                        className="w-full p-[5px] border-2 border-dashed border-slate-200 hover:border-[#191970] rounded-md bg-slate-50 hover:bg-[#191970]/10 text-slate-600 hover:text-[#191970] transition-all text-xs font-semibold flex items-center justify-center gap-[4px]"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#191970]" />
                        <span>{dinnerSlots.length > 0 ? '+ Aggiungi pietanza a Cena' : 'Scegli Cena'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Day Nutrition Summary Footer & PROGRAMMATO Badge */}
                  <div className="mt-[6px] pt-[5px] border-t border-slate-100 bg-emerald-50/50 p-[5px] rounded-md space-y-[3px]">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-[#191970]">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-[#f37021]" />
                        Totale Giorno:
                      </span>
                      <span className="text-[#f37021]">{dayKcal} kcal/pers</span>
                    </div>
                    <div className="flex items-center justify-between gap-[5px] text-[9px] text-slate-600 font-semibold">
                      <span>P: {dayProtein}g • G: {dayFat}g • C: {dayCarbs}g</span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-[6px] py-[2px] rounded text-white shadow-2xs shrink-0 ${
                          lunchSlots.length > 0 || dinnerSlots.length > 0
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                        }`}
                      >
                        {lunchSlots.length > 0 || dinnerSlots.length > 0 ? 'PROGRAMMATO' : 'INCOMPLETO'}
                      </span>
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
          {/* Dish Course Filter Tabs (Antipasti, Primi, Secondi, Contorni, Dolci) */}
          <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-sm space-y-[5px]">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pb-[2px]">
              <span className="font-bold text-[#191970] uppercase tracking-wider text-[11px]">Portate</span>
              <span>Totale ricette salvate: <strong>{recipes.length}</strong></span>
            </div>

            {/* Row 1: Tutti Button */}
            <div>
              <button
                onClick={() => setSelectedCourseFilter('Tutti')}
                className={`w-full p-[5px] rounded-md text-xs font-extrabold transition-all text-center ${
                  selectedCourseFilter === 'Tutti'
                    ? 'bg-[#191970] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Tutti
              </button>
            </div>

            {/* Row 2: 5 Courses fitting exactly across mobile screen width */}
            <div className="grid grid-cols-5 gap-[5px]">
              {(['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCourseFilter(c)}
                  className={`p-[5px] px-[2px] sm:px-[5px] rounded-md text-[10px] sm:text-xs font-extrabold transition-all text-center truncate ${
                    selectedCourseFilter === c
                      ? 'bg-[#191970] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Sub-filter by Tradition/Category */}
            <div className="flex items-center gap-[5px] pt-[2px] text-xs">
              <span className="font-bold text-slate-500">Tradizione:</span>
              {(['Tutte', 'Sabina', 'Lazio', 'Classica', 'Altro'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-[6px] py-[2px] rounded-md text-[11px] font-bold transition-colors ${
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
          <div className="bg-emerald-900 text-white rounded-lg p-[5px] shadow-md border border-emerald-800 space-y-[5px]">
            {/* Clickable Header Bar */}
            <div
              onClick={() => setIsSeasonalExpanded(!isSeasonalExpanded)}
              className="flex items-center justify-between gap-[5px] cursor-pointer select-none hover:bg-emerald-800/50 p-[3px] rounded transition-colors"
            >
              <div className="flex items-center gap-[6px] shrink-0">
                <Leaf className="w-5 h-5 text-emerald-300 shrink-0" />
                <h4 className="font-extrabold text-xs sm:text-sm text-emerald-100 whitespace-nowrap">
                  PRODOTTI DI STAGIONE
                </h4>
              </div>

              {/* Show product icons preview when closed */}
              {!isSeasonalExpanded && (
                <div className="flex items-center gap-[4px] sm:gap-[6px] overflow-hidden flex-1 justify-center px-[4px]">
                  {MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-[3px] shrink-0"
                      title={item.name}
                    >
                      <SeasonalIcon icon={item.icon} className="w-4 h-4 text-[#f37021]" />
                      <span className="text-[10px] font-semibold text-emerald-200 hidden lg:inline">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-[3px] text-emerald-300 shrink-0 ml-auto">
                <span className="text-[10px] font-bold text-emerald-200 hidden sm:inline">
                  {isSeasonalExpanded ? 'Chiudi' : MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].monthName}
                </span>
                {isSeasonalExpanded ? (
                  <ChevronUp className="w-4 h-4 text-emerald-300" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-emerald-300" />
                )}
              </div>
            </div>

            {/* Expanded Body Content */}
            {isSeasonalExpanded && (
              <div className="space-y-[5px] pt-[3px] border-t border-emerald-800/80">
                {/* Month Selector Wheel for Seasonality (Borderless & Infinite Looping) */}
                <div
                  ref={seasonalMonthContainerRef}
                  onScroll={handleSeasonalScroll}
                  className="flex items-center gap-[5px] bg-emerald-950/40 p-[5px] rounded-md overflow-x-auto max-w-full scrollbar-none snap-x snap-mandatory"
                >
                  {[0, 1, 2].flatMap((cycle) =>
                    MONTHLY_SEASONAL_PRODUCE.map((m, idx) => {
                      const globalIdx = cycle * 12 + idx;
                      const isSelected = selectedSeasonalMonth === idx;
                      return (
                        <button
                          key={`${cycle}-${m.monthName}`}
                          ref={(el) => { monthButtonsRef.current[globalIdx] = el; }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSeasonalMonth(idx);
                          }}
                          className={`p-[4px] px-[8px] rounded text-[10px] sm:text-[11px] font-bold whitespace-nowrap transition-all shrink-0 snap-center ${
                            isSelected
                              ? 'bg-[#f37021] text-white shadow-xs font-black scale-105'
                              : 'text-emerald-200 hover:bg-emerald-700/60'
                          }`}
                        >
                          {m.monthName.slice(0, 3)}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Selected Month Produce Display */}
                <div className="bg-emerald-950/60 rounded-lg p-[5px] border border-emerald-800 space-y-[5px]">
                  <div className="flex items-center justify-between text-xs gap-[5px]">
                    <span className="font-bold text-emerald-300 flex items-center gap-[5px]">
                      <span>{MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].seasonIcon}</span>
                      <span className="text-[11px] sm:text-xs">Prodotti Consigliati a {MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].monthName} ({MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].season})</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 italic shrink-0">Nutrizione Ottimale</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-[5px]">
                    {MONTHLY_SEASONAL_PRODUCE[selectedSeasonalMonth].items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-emerald-900/80 border border-emerald-700 hover:border-emerald-500 rounded-md p-[5px] flex flex-col justify-between gap-[5px] transition-all"
                      >
                        <div className="space-y-[5px]">
                          <div className="flex items-center gap-[5px] mb-[1px]">
                            <SeasonalIcon icon={item.icon} className="w-5 h-5 text-[#f37021] shrink-0" />
                            <h5 className="font-extrabold text-[11px] sm:text-xs text-white leading-tight">{item.name}</h5>
                          </div>
                          <p className="text-[9px] sm:text-[10px] text-emerald-200 leading-tight">{item.description}</p>
                          <div className="text-[8px] sm:text-[9px] font-bold text-white">
                            {item.benefits}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSeasonalItemFor5Recipes(item);
                          }}
                          className="w-full p-[5px] border-2 border-[#f37021] bg-transparent hover:bg-[#f37021]/20 text-white font-extrabold text-[10px] sm:text-[11px] rounded flex items-center justify-center gap-[5px] transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="truncate">Ricette</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[5px]">
                {filtered.map((recipe) => {
                  const nut = getRecipeNut(recipe);
                  const displayCourse = recipe.course || inferCourseFromRecipe(recipe.name, recipe.category);
                  return (
                    <div
                      key={recipe.id}
                      className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-[5px]"
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
                        <div className="flex items-center gap-[4px] text-[10px] font-bold mb-[5px] flex-wrap">
                          <span className="bg-[#f37021]/15 text-[#d95d13] p-[2px] px-[5px] rounded">🔥 {nut.calories} kcal</span>
                          <span className="bg-blue-50 text-blue-800 p-[2px] px-[4px] rounded">P: {nut.protein}g</span>
                          <span className="bg-amber-50 text-amber-800 p-[2px] px-[4px] rounded">G: {nut.fat}g</span>
                          <span className="bg-emerald-50 text-emerald-800 p-[2px] px-[4px] rounded">C: {nut.carbs}g</span>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 mb-[5px]">
                          Ingredienti ({recipe.ingredients.length}):
                        </p>
                        <div className="flex flex-wrap gap-[5px] mb-[5px]">
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
    </div>
  );
};
