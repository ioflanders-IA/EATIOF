import React, { useState, useEffect, useRef } from 'react';
import { Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem, DayOfWeek, MealType, CategoryType, DishCourse, NutritionInfo, FamilyMember } from '../types';
import { DAYS_OF_WEEK } from '../data/initialData';
import { getFamilyConfig, FAMILY_CONFIG_CHANGED_EVENT } from '../lib/familyAuthService';
import { MONTHLY_SEASONAL_PRODUCE, getSeasonalDataForMonth, inferCourseFromRecipe, SeasonalItem } from '../data/seasonalData';
import { SeasonalIcon } from './SeasonalIcon';
import { DailySummaryModal } from './DailySummaryModal';
import {
  addWeeklyMenuItem,
  removeWeeklyMenuItem,
  removeWeeklySlot,
  generateShoppingListFromMenu,
  deleteRecipe,
  subscribeToPantryItems,
  saveRecipe,
  updateWeeklyMenuItemDetails,
  cleanRecipeName
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
  Check,
  Scale,
  Sliders
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

  // State for Daily Summary Modal ("Riepilogo")
  const [summaryModalData, setSummaryModalData] = useState<{
    dayName: string;
    dateStr: string;
    lunchSlots: WeeklyMenuItem[];
    dinnerSlots: WeeklyMenuItem[];
  } | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Modals for Recipe Preview & Dosimetro
  const [inspectRecipe, setInspectRecipe] = useState<Recipe | null>(null);
  const [dosimetroRecipe, setDosimetroRecipe] = useState<Recipe | null>(null);
  const [dosages, setDosages] = useState<Record<string, number>>({});
  const [dosimetroNote, setDosimetroNote] = useState<string>('');

  // Standalone Dosimetro target selection when selectedSlot is null
  const [dosimetroDay, setDosimetroDay] = useState<DayOfWeek>('Lunedì');
  const [dosimetroMeal, setDosimetroMeal] = useState<MealType>('lunch');
  const [dosimetroWeek, setDosimetroWeek] = useState<string>('current');
  const [dosimetroSearchTerm, setDosimetroSearchTerm] = useState<string>('');

  useEffect(() => {
    getFamilyConfig().then((cfg) => {
      if (cfg?.members) setFamilyMembers(cfg.members);
    });
    const handleCfgChange = (e: any) => {
      if (e.detail?.members) setFamilyMembers(e.detail.members);
    };
    window.addEventListener(FAMILY_CONFIG_CHANGED_EVENT, handleCfgChange);
    return () => window.removeEventListener(FAMILY_CONFIG_CHANGED_EVENT, handleCfgChange);
  }, []);

  // State & Ref for long-press dish deletion
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = (id: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setDeletingSlotId(id);
    }, 500);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

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

  const handleOpenDosimetro = (recipe: Recipe) => {
    setDosimetroRecipe(recipe);
    const initialDosages: Record<string, number> = {};
    const members = familyMembers.length > 0
      ? familyMembers.map((m) => m.name)
      : (familyMembersList.length > 0 ? familyMembersList : ['Madre', 'Padre', 'Membro 1', 'Membro 2']);
    members.forEach((name) => {
      initialDosages[name] = 100;
    });
    setDosages(initialDosages);
    setDosimetroNote('');
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

  // PAGE VIEW: INSPECT RECIPE DETAILS
  if (inspectRecipe) {
    return (
      <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-md space-y-[5px] animate-fade-in min-h-[75vh]">
        {/* Top Navigation Bar */}
        <div className="p-[5px] bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between gap-[5px]">
          <button
            type="button"
            onClick={() => setInspectRecipe(null)}
            className="p-[5px] px-[10px] rounded-md bg-white hover:bg-slate-50 text-[#191970] font-extrabold text-xs flex items-center gap-[5px] border border-slate-300 shadow-2xs transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-[#191970]" />
            <span>Torna Indietro</span>
          </button>

          <span className="text-[11px] font-black uppercase tracking-wider px-[8px] py-[3px] rounded-full bg-[#191970] text-white">
            {(inspectRecipe.course || inferCourseFromRecipe(inspectRecipe.name, inspectRecipe.category))} • {inspectRecipe.category}
          </span>
        </div>

        {/* Recipe Title & Action Banner */}
        <div className="bg-[#191970]/5 p-[5px] rounded-lg border border-[#191970]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-[5px]">
          <div>
            <h2 className="font-extrabold text-[#191970] text-xl sm:text-2xl">
              {inspectRecipe.name}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-[2px]">
              Scheda dettagliata della ricetta e composizione nutrizionale
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const r = inspectRecipe;
              setInspectRecipe(null);
              handleOpenDosimetro(r);
            }}
            className={`p-[5px] px-[12px] rounded-lg text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-[5px] shrink-0 active:scale-95 ${
              selectedSlot?.mealType === 'lunch'
                ? 'bg-[#f37021] hover:bg-[#d95d13]'
                : 'bg-[#191970] hover:bg-[#121250]'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Assegna con Dosimetro</span>
          </button>
        </div>

        {/* Prep Time & Calories Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[5px]">
          <div className="p-[5px] bg-slate-50 border border-slate-200 rounded-lg space-y-[5px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tempo di Preparazione</span>
            <p className="text-sm font-black text-[#191970] flex items-center gap-[5px]">
              <Clock className="w-4 h-4 text-[#f37021]" />
              {inspectRecipe.prepTimeMinutes || 20} minuti
            </p>
          </div>
          <div className="p-[5px] bg-amber-50/70 border border-amber-200 rounded-lg space-y-[5px]">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Valori Nutrizionali Indicativi</span>
            <p className="text-sm font-black text-[#d95d13] flex items-center gap-[5px]">
              <Flame className="w-4 h-4 text-[#f37021]" />
              {getRecipeNut(inspectRecipe).calories} kcal / porzione
            </p>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="space-y-[5px]">
          <h4 className="font-extrabold text-xs text-[#191970] flex items-center gap-[5px]">
            <UtensilsCrossed className="w-4 h-4 text-[#f37021]" />
            Ingredienti Necessari:
          </h4>
          <ul className="bg-slate-50 border border-slate-200 rounded-lg p-[5px] space-y-[5px] text-xs text-slate-700 divide-y divide-slate-200/60">
            {inspectRecipe.ingredients.map((ing, idx) => (
              <li key={idx} className="flex items-center justify-between pt-[4px] first:pt-0">
                <span className="font-semibold text-slate-800">{ing.name}</span>
                <span className="font-black text-[#191970]">{ing.quantity} {ing.unit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Preparation Steps */}
        {inspectRecipe.instructions && (
          <div className="space-y-[5px]">
            <h4 className="font-extrabold text-xs text-[#191970] flex items-center gap-[5px]">
              <ChefHat className="w-4 h-4 text-[#f37021]" />
              Istruzioni e Preparazione:
            </h4>
            <p className="text-xs text-slate-700 bg-slate-50 p-[5px] rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
              {inspectRecipe.instructions}
            </p>
          </div>
        )}

        {/* Bottom Actions Footer */}
        <div className="p-[5px] bg-slate-50 border border-slate-200 flex items-center justify-between rounded-lg">
          <button
            type="button"
            onClick={() => setInspectRecipe(null)}
            className="p-[5px] px-[12px] rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
          >
            Chiudi Scheda
          </button>
          <button
            type="button"
            onClick={() => {
              const r = inspectRecipe;
              setInspectRecipe(null);
              handleOpenDosimetro(r);
            }}
            className="p-[5px] px-[14px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-extrabold text-xs flex items-center gap-[5px] shadow-2xs"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Assegna con Dosimetro</span>
          </button>
        </div>
      </div>
    );
  }

  // PAGE VIEW: DOSIMETRO & GRAMMAGE ASSIGNMENT PAGE
  if (dosimetroRecipe) {
    return (
      <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-md space-y-[5px] animate-fade-in min-h-[75vh]">
        {/* Top Navigation Bar */}
        <div className="py-[2px] flex items-center justify-between gap-[5px]">
          <button
            type="button"
            onClick={() => setDosimetroRecipe(null)}
            className="p-[5px] px-[10px] rounded-md bg-white hover:bg-slate-50 text-[#191970] font-extrabold text-xs flex items-center gap-[5px] border border-slate-300 shadow-2xs transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 text-[#191970]" />
            <span>Torna Indietro</span>
          </button>
        </div>

        {/* Title & Meal Target Banner */}
        <div className="bg-white p-[8px] px-[12px] rounded-lg border-2 border-[#191970] flex items-center justify-between gap-[8px]">
          <h2 className="font-extrabold text-[#191970] text-lg sm:text-xl">
            {dosimetroRecipe.name}
          </h2>
          {selectedSlot ? (
            <div className="flex flex-col items-end text-right shrink-0">
              <span className="text-xs font-black text-[#f37021] uppercase tracking-wide">
                {selectedSlot.day}
              </span>
              <span className="text-xs font-bold text-[#191970] flex items-center gap-[4px] mt-[1px]">
                {selectedSlot.mealType === 'lunch' ? (
                  <>
                    <span>Pranzo</span>
                    <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  </>
                ) : (
                  <>
                    <span>Cena</span>
                    <Moon className="w-3.5 h-3.5 text-indigo-500 fill-indigo-400" />
                  </>
                )}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-600 font-medium text-right">
              Scegli giorno e pasto
            </span>
          )}
        </div>

        {/* Target Day & Meal Selection if no slot pre-selected */}
        {!selectedSlot && (
          <div className="p-[5px] bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-[5px]">
            <div>
              <label className="text-[10px] font-extrabold text-[#191970] uppercase tracking-wider block mb-1">Giorno della Settimana</label>
              <select
                value={dosimetroDay}
                onChange={(e) => setDosimetroDay(e.target.value as DayOfWeek)}
                className="w-full p-[5px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#f37021]"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-[#191970] uppercase tracking-wider block mb-1">Pasto</label>
              <select
                value={dosimetroMeal}
                onChange={(e) => setDosimetroMeal(e.target.value as MealType)}
                className="w-full p-[5px] bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#f37021]"
              >
                <option value="lunch">Pranzo ☀️</option>
                <option value="dinner">Cena 🌙</option>
              </select>
            </div>
          </div>
        )}

        {/* Members Dosage List */}
        <div className="space-y-[5px]">
          {(familyMembers.length > 0
            ? familyMembers.map((m) => m.name)
            : (familyMembersList.length > 0 ? familyMembersList : ['Madre', 'Padre', 'Membro 1', 'Membro 2'])
          ).map((memberName) => {
            const currentGrams = dosages[memberName] ?? 100;
            return (
              <div key={memberName} className="p-[5px] bg-white border border-slate-200 rounded-lg space-y-[5px]">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#191970] flex items-center gap-[5px]">
                    <Users className="w-4 h-4 text-[#f37021]" />
                    {memberName}
                  </span>
                  <span className="text-xs font-black text-[#f37021] bg-white px-[8px] py-[2px] rounded border border-slate-200 shadow-2xs">
                    {currentGrams} g
                  </span>
                </div>

                {/* Slider & +/- controls */}
                <div className="flex items-center gap-[5px]">
                  <button
                    type="button"
                    onClick={() => {
                      const newG = Math.max(0, currentGrams - 10);
                      setDosages((prev) => ({ ...prev, [memberName]: newG }));
                    }}
                    className="w-7 h-7 rounded bg-slate-200 hover:bg-slate-300 font-black text-slate-800 text-xs flex items-center justify-center shrink-0 active:scale-95 transition-all"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="400"
                    step="5"
                    value={currentGrams}
                    onChange={(e) => {
                      const newG = parseInt(e.target.value) || 0;
                      setDosages((prev) => ({ ...prev, [memberName]: newG }));
                    }}
                    className="w-full accent-[#f37021] cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newG = currentGrams + 10;
                      setDosages((prev) => ({ ...prev, [memberName]: newG }));
                    }}
                    className="w-7 h-7 rounded bg-slate-200 hover:bg-slate-300 font-black text-slate-800 text-xs flex items-center justify-center shrink-0 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-[5px] flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold">Preset rapidi:</span>
                  {[60, 80, 100, 120, 150].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDosages((prev) => ({ ...prev, [memberName]: preset }))}
                      className={`text-[11px] font-bold px-[6px] py-[2px] rounded transition-colors ${
                        currentGrams === preset
                          ? 'bg-[#191970] text-white'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note / Preference Input */}
        <div className="space-y-[5px]">
          <label className="text-xs font-bold text-[#191970] block">
            Annotazione o nota speciale per il pasto:
          </label>
          <input
            type="text"
            placeholder="es. senza glutine, porzione abbondante, poco sale..."
            value={dosimetroNote}
            onChange={(e) => setDosimetroNote(e.target.value)}
            className="w-full p-[5px] bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#f37021]"
          />
        </div>

        {/* Total Grams Summary */}
        <div className="p-[5px] bg-white rounded-lg flex items-center justify-between font-extrabold text-xs text-[#191970] border border-slate-200">
          <span>Totale Grammi Famiglia:</span>
          <span className="text-[#f37021] text-base font-black">
            {Object.values(dosages).reduce((a: number, b: number) => a + b, 0)} g
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-[5px] pt-[5px] border-t border-slate-100">
          <button
            type="button"
            onClick={() => setDosimetroRecipe(null)}
            className="p-[5px] px-[14px] rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={async () => {
              const targetDay = selectedSlot ? selectedSlot.day : dosimetroDay;
              const targetMeal = selectedSlot ? selectedSlot.mealType : dosimetroMeal;
              const targetWeek = selectedSlot ? (selectedSlot.weekId || activeWeekId) : dosimetroWeek;
              const recipeToAssign = dosimetroRecipe;

              // Immediately reset state to return to main view
              setDosimetroRecipe(null);
              setSelectedSlot(null);
              setInspectRecipe(null);
              setDosimetroNote('');

              if (recipeToAssign) {
                if (selectedSlot?.slotId) {
                  await updateWeeklyMenuItemDetails(selectedSlot.slotId, dosimetroNote, dosages);
                } else {
                  await addWeeklyMenuItem(
                    targetDay,
                    targetMeal,
                    recipeToAssign.id,
                    recipeToAssign.name,
                    targetWeek,
                    dosimetroNote,
                    dosages
                  );
                }
              }
            }}
            className="p-[5px] px-[16px] rounded-lg bg-[#f37021] hover:bg-[#d95d13] text-white font-extrabold text-xs shadow-md transition-colors"
          >
            Conferma e Assegna
          </button>
        </div>
      </div>
    );
  }

  // PAGE VIEW: DEDICATED RECIPE SELECTION FOR CALENDAR SLOT
  if (selectedSlot) {
    return (
      <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-md space-y-[5px] animate-fade-in min-h-[80vh]">
        {/* Header */}
        <div className="p-[5px] bg-[#191970] text-white flex items-center justify-between gap-[5px] rounded-lg shadow-sm">
          {/* Square Back Button with arrow, no background, no text */}
          <button
            onClick={() => setSelectedSlot(null)}
            className="p-[5px] rounded-md bg-transparent hover:bg-white/10 text-white transition-colors shrink-0 flex items-center justify-center border border-transparent"
            title="Torna al Calendario"
          >
            <ChevronLeft className="w-5 h-5 text-white stroke-[2.5]" />
          </button>

          {/* Right Aligned: Icon-only Meal Badge + Annulla Button with thick border and no background */}
          <div className="flex items-center gap-[6px] shrink-0">
            <div
              className="p-[5px] px-[8px] rounded-md border-2 border-white/80 bg-transparent text-white flex items-center justify-center shadow-2xs"
              title={selectedSlot.mealType === 'lunch' ? 'Pranzo' : 'Cena'}
            >
              {selectedSlot.mealType === 'lunch' ? (
                <Sun className="w-5 h-5 text-amber-300 stroke-[2.5]" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-300 stroke-[2.5]" />
              )}
            </div>

            <button
              onClick={() => setSelectedSlot(null)}
              className="p-[5px] px-[10px] rounded-md bg-transparent hover:bg-white/10 text-white font-extrabold text-xs border-2 border-white transition-colors shrink-0"
            >
              Annulla
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-[5px] border border-slate-200 space-y-[5px] bg-slate-50 rounded-lg">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Cerca per nome o ingrediente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#f37021]"
            />
          </div>

          {/* Consigli Prodotti di Stagione */}
          <div className="p-[5px] bg-emerald-900 text-white rounded-md border border-emerald-700 space-y-[5px]">
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
          <div className="grid grid-cols-6 gap-[3px] sm:gap-[5px] w-full pt-[1px]">
            {(['Tutti', 'Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCourseFilter(c)}
                className={`py-[5px] px-[2px] sm:px-[6px] rounded-md text-[10px] sm:text-xs font-extrabold text-center truncate transition-colors flex items-center justify-center ${
                  selectedCourseFilter === c
                    ? 'bg-[#191970] text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Tradizione */}
          <div className="grid grid-cols-5 gap-[3px] sm:gap-[5px] w-full pt-[1px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-[4px] px-[2px] sm:px-[6px] rounded-md text-[10px] sm:text-xs font-bold text-center truncate transition-colors flex items-center justify-center ${
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
        <div className="space-y-[5px]">
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
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-slate-200 p-[5px]">
              <p className="text-xs font-semibold text-slate-600">Nessuna ricetta trovata con questi filtri.</p>
              <button
                onClick={() => onOpenRecipeModal()}
                className="mt-2 p-[5px] px-[10px] rounded-md bg-[#f37021] text-white font-bold text-xs inline-flex items-center gap-[4px]"
              >
                <Plus className="w-4 h-4" /> Crea Nuova Ricetta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[5px]">
              {filteredRecipes.map((recipe) => {
                const nut = getRecipeNut(recipe);
                const displayCourse = recipe.course || inferCourseFromRecipe(recipe.name, recipe.category);
                const isLunch = selectedSlot.mealType === 'lunch';

                return (
                  <div
                    key={recipe.id}
                    onClick={() => setInspectRecipe(recipe)}
                    className="p-[6px] bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#191970]/30 rounded-lg cursor-pointer transition-all flex flex-col justify-between gap-[5px] group shadow-2xs hover:shadow-md relative"
                  >
                    <div className="space-y-[4px]">
                      <div className="flex items-center justify-between gap-[4px]">
                        <div className="flex items-center gap-[4px] flex-wrap min-w-0 pr-2">
                          <span className="text-[10px] font-black px-[6px] py-[2px] rounded-full bg-[#191970] text-white shrink-0">
                            {displayCourse === 'Antipasti' && '🥗 '}
                            {displayCourse === 'Primi' && '🍝 '}
                            {displayCourse === 'Secondi' && '🥩 '}
                            {displayCourse === 'Contorni' && '🥬 '}
                            {displayCourse === 'Dolci' && '🍰 '}
                            {displayCourse}
                          </span>
                          <span className="text-[10px] font-bold px-[6px] py-[2px] rounded bg-[#f37021]/10 text-[#f37021] shrink-0">
                            {recipe.category}
                          </span>
                        </div>

                        {/* Plus button for Dosimetro color-coded by meal type */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDosimetro(recipe);
                          }}
                          className={`p-[6px] rounded-lg text-white font-extrabold text-xs shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 ${
                            isLunch
                              ? 'bg-[#f37021] hover:bg-[#d95d13]'
                              : 'bg-[#191970] hover:bg-[#121250]'
                          }`}
                          title={`Assegna con Dosimetro (${isLunch ? 'Pranzo' : 'Cena'})`}
                        >
                          <Plus className="w-5 h-5 stroke-[3]" />
                        </button>
                      </div>

                      <h4 className="font-extrabold text-[#191970] text-base group-hover:text-[#f37021] leading-tight">
                        {recipe.name}
                      </h4>

                      {/* Prep time & Nutrition info */}
                      <div className="flex items-center gap-[4px] text-[10px] font-bold flex-wrap">
                        {recipe.prepTimeMinutes && (
                          <span className="text-slate-500 flex items-center gap-[2px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {recipe.prepTimeMinutes}m
                          </span>
                        )}
                        <span className="bg-[#f37021]/15 text-[#d95d13] px-1.5 py-[1px] rounded">🔥 {nut.calories} kcal</span>
                        <span className="bg-blue-50 text-blue-800 px-1 py-[1px] rounded">P: {nut.protein}g</span>
                        <span className="bg-amber-50 text-amber-800 px-1 py-[1px] rounded">G: {nut.fat}g</span>
                        <span className="bg-emerald-50 text-emerald-800 px-1 py-[1px] rounded">C: {nut.carbs}g</span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 pt-1 border-t border-slate-100">
                        <span className="font-bold text-slate-600">Ingredienti:</span>{' '}
                        {recipe.ingredients.map((i) => i.name).join(', ')}
                      </p>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Clicca per valutare ingredienti e dettagli</span>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#f37021]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-[5px] bg-slate-50 border border-slate-200 flex items-center justify-between rounded-lg">
          <button
            onClick={() => onOpenRecipeModal()}
            className="text-xs font-bold text-[#f37021] hover:underline flex items-center gap-[5px]"
          >
            <Plus className="w-4 h-4" />
            Crea Nuova Ricetta Personalizzata
          </button>
          <button
            onClick={() => setSelectedSlot(null)}
            className="p-[5px] rounded-md bg-transparent hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center"
            title="Torna al Calendario"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[10px]">
      {/* Header Banner for Recipe Book */}
      {activeSubTab === 'recipeBook' && (
        <div className="bg-[#191970] rounded-lg p-[10px] px-[12px] text-white shadow-md">
          <div className="flex items-center justify-between gap-[10px]">
            <div className="flex items-center gap-[8px]">
              <Calendar className="w-4 h-4 text-[#f37021]" />
              <h2 className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
                Ricettario di Famiglia
              </h2>
            </div>
            <button
              onClick={() => onOpenRecipeModal()}
              title="Aggiungi Nuova Ricetta"
              className="p-1 px-2.5 rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-xs shadow-2xs active:scale-95 transition-all flex items-center justify-center shrink-0 ml-auto"
            >
              <Plus className="w-4 h-4 text-white stroke-[3]" />
            </button>
          </div>
        </div>
      )}

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
        summaryModalData ? (
          <DailySummaryModal
            onClose={() => setSummaryModalData(null)}
            dayName={summaryModalData.dayName}
            dateStr={summaryModalData.dateStr}
            lunchSlots={summaryModalData.lunchSlots}
            dinnerSlots={summaryModalData.dinnerSlots}
            recipeMap={recipeMap}
            familyMembers={familyMembers}
          />
        ) : (
        <div className="space-y-[5px] pb-[95px] relative">
          {/* 7 Days Grid for Active Week */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[5px]">
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
                  className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between p-[5px] gap-[5px]"
                >
                  {/* Day Header Row: Title Card + Square Action Buttons */}
                  <div className="flex items-center justify-between gap-[5px]">
                    <div className="border-2 border-[#191970] bg-white p-[5px] px-[8px] rounded-md flex-1 min-w-0 flex items-center">
                      <span className="font-extrabold text-xs tracking-wide text-[#191970] flex items-center gap-[5px] truncate">
                        {day} <span className="text-[10px] text-slate-500 font-bold">{dateInfo.fullDateStr}</span>
                      </span>
                    </div>

                    {/* Two square buttons with thick borders for Pranzo & Cena outside day card */}
                    <div className="flex items-center gap-[5px] shrink-0">
                      <button
                        onClick={() =>
                          setSelectedSlot({
                            day,
                            mealType: 'lunch',
                            weekId: activeWeekId,
                            dateStr: dateInfo.fullDateStr
                          })
                        }
                        className="w-[28px] h-[28px] rounded-md border-2 border-[#f37021] bg-[#f37021]/10 hover:bg-[#f37021] hover:text-white text-[#f37021] flex items-center justify-center transition-all shadow-2xs active:scale-90"
                        title={`Aggiungi pietanza a Pranzo (${day})`}
                      >
                        <Sun className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <button
                        onClick={() =>
                          setSelectedSlot({
                            day,
                            mealType: 'dinner',
                            weekId: activeWeekId,
                            dateStr: dateInfo.fullDateStr
                          })
                        }
                        className="w-[28px] h-[28px] rounded-md border-2 border-[#191970] bg-[#191970]/10 hover:bg-[#191970] hover:text-white text-[#191970] flex items-center justify-center transition-all shadow-2xs active:scale-90"
                        title={`Aggiungi pietanza a Cena (${day})`}
                      >
                        <Moon className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-[5px]">
                    {/* PRANZO SLOT */}
                    <div className="space-y-[5px]">
                      <div className="flex items-center justify-between p-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#f37021] flex items-center gap-[5px]">
                          <Sun className="w-3.5 h-3.5 text-[#f37021]" />
                          <span>Pranzo {lunchSlots.length > 0 && `(${lunchSlots.length})`}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-[5px]">
                        {lunchSlots.map((lunchSlot) => {
                          const lunchRecipe = recipeMap.get(lunchSlot.recipeId);
                          const lunchNut = getRecipeNut(lunchRecipe);
                          const isDeleting = deletingSlotId === lunchSlot.id;

                          return (
                            <div
                              key={lunchSlot.id}
                              onMouseDown={() => handlePressStart(lunchSlot.id)}
                              onMouseUp={handlePressEnd}
                              onMouseLeave={handlePressEnd}
                              onTouchStart={() => handlePressStart(lunchSlot.id)}
                              onTouchEnd={handlePressEnd}
                              onTouchMove={handlePressEnd}
                              onClick={() => {
                                if (!isDeleting && lunchRecipe) {
                                  setDosimetroRecipe(lunchRecipe);
                                  setSelectedSlot({
                                    day,
                                    mealType: 'lunch',
                                    weekId: lunchSlot.weekId || activeWeekId,
                                    slotId: lunchSlot.id
                                  });
                                  setDosages(lunchSlot.dosages || {});
                                  setDosimetroNote(lunchSlot.notes || '');
                                }
                              }}
                              className={`group relative bg-[#f37021]/10 border ${
                                isDeleting ? 'border-red-500 ring-2 ring-red-300 bg-red-50' : 'border-[#f37021]/30 hover:bg-[#f37021]/20'
                              } rounded-md p-[6px] transition-colors flex flex-col justify-between gap-[3px] min-w-0 select-none cursor-pointer`}
                            >
                              <div className="flex items-start justify-between gap-[4px] w-full">
                                <div className="min-w-0 flex-1">
                                  <h4
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDeleting && lunchRecipe) onOpenRecipeModal(lunchRecipe);
                                    }}
                                    className="font-bold text-[#191970] text-[11px] sm:text-xs leading-tight hover:underline break-words"
                                    title={cleanRecipeName(lunchSlot.recipeName)}
                                  >
                                    {cleanRecipeName(lunchSlot.recipeName)}
                                  </h4>
                                </div>

                                {/* Calories on the right side */}
                                {lunchNut && !isDeleting && (
                                  <span className="text-[10px] font-extrabold text-[#d95d13] flex items-center gap-[2px] shrink-0 whitespace-nowrap">
                                    <Flame className="w-3.5 h-3.5 text-[#f37021]" />
                                    {lunchNut.calories} kcal
                                  </span>
                                )}

                                {/* Delete button appears on long press */}
                                {isDeleting && (
                                  <div className="flex items-center gap-[5px] shrink-0 z-10 animate-fade-in">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMenuItem(lunchSlot.id);
                                        setDeletingSlotId(null);
                                      }}
                                      className="p-[2px] text-red-600 hover:text-red-700 active:scale-90 transition-all shrink-0"
                                      title="Elimina pietanza"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingSlotId(null);
                                      }}
                                      className="p-[2px] text-slate-400 hover:text-slate-700 active:scale-90 transition-all shrink-0"
                                      title="Annulla"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Display Dosages if specified */}
                              {lunchSlot.dosages && Object.keys(lunchSlot.dosages).length > 0 && !isDeleting && (
                                <div className="text-[9px] font-extrabold text-[#d95d13] bg-white/80 px-[4px] py-[1px] rounded border border-[#f37021]/30 flex items-center gap-[3px] break-words">
                                  <Scale className="w-3 h-3 text-[#f37021] shrink-0" />
                                  <span className="break-words">
                                    {Object.entries(lunchSlot.dosages).map(([m, g]) => `${m.substring(0, 3)}: ${g}g`).join(' • ')}
                                  </span>
                                </div>
                              )}

                              {/* Saved Annotation Badge if exists */}
                              {lunchSlot.notes && !isDeleting && (
                                <div className="text-[9px] font-semibold text-[#d95d13] bg-amber-50/90 px-[4px] py-[1px] rounded border border-[#f37021]/20 flex items-center gap-[3px] break-words">
                                  <Pencil className="w-2.5 h-2.5 text-[#f37021] shrink-0" />
                                  <span className="break-words">{lunchSlot.notes}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CENA SLOT */}
                    <div className="space-y-[5px]">
                      <div className="flex items-center justify-between p-[2px]">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#191970] flex items-center gap-[5px]">
                          <Moon className="w-3.5 h-3.5 text-[#191970]" />
                          <span>Cena {dinnerSlots.length > 0 && `(${dinnerSlots.length})`}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-[5px]">
                        {dinnerSlots.map((dinnerSlot) => {
                          const dinnerRecipe = recipeMap.get(dinnerSlot.recipeId);
                          const dinnerNut = getRecipeNut(dinnerRecipe);
                          const isDeleting = deletingSlotId === dinnerSlot.id;

                          return (
                            <div
                              key={dinnerSlot.id}
                              onMouseDown={() => handlePressStart(dinnerSlot.id)}
                              onMouseUp={handlePressEnd}
                              onMouseLeave={handlePressEnd}
                              onTouchStart={() => handlePressStart(dinnerSlot.id)}
                              onTouchEnd={handlePressEnd}
                              onTouchMove={handlePressEnd}
                              onClick={() => {
                                if (!isDeleting && dinnerRecipe) {
                                  setDosimetroRecipe(dinnerRecipe);
                                  setSelectedSlot({
                                    day,
                                    mealType: 'dinner',
                                    weekId: dinnerSlot.weekId || activeWeekId,
                                    slotId: dinnerSlot.id
                                  });
                                  setDosages(dinnerSlot.dosages || {});
                                  setDosimetroNote(dinnerSlot.notes || '');
                                }
                              }}
                              className={`group relative bg-[#191970]/10 border ${
                                isDeleting ? 'border-red-500 ring-2 ring-red-300 bg-red-50' : 'border-[#191970]/30 hover:bg-[#191970]/20'
                              } rounded-md p-[6px] transition-colors flex flex-col justify-between gap-[3px] min-w-0 select-none cursor-pointer`}
                            >
                              <div className="flex items-start justify-between gap-[4px] w-full">
                                <div className="min-w-0 flex-1">
                                  <h4
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDeleting && dinnerRecipe) onOpenRecipeModal(dinnerRecipe);
                                    }}
                                    className="font-bold text-[#191970] text-[11px] sm:text-xs leading-tight hover:underline break-words"
                                    title={cleanRecipeName(dinnerSlot.recipeName)}
                                  >
                                    {cleanRecipeName(dinnerSlot.recipeName)}
                                  </h4>
                                </div>

                                {/* Calories on the right side */}
                                {dinnerNut && !isDeleting && (
                                  <span className="text-[10px] font-extrabold text-[#191970] flex items-center gap-[2px] shrink-0 whitespace-nowrap">
                                    <Flame className="w-3.5 h-3.5 text-[#191970]" />
                                    {dinnerNut.calories} kcal
                                  </span>
                                )}

                                {/* Delete button appears on long press */}
                                {isDeleting && (
                                  <div className="flex items-center gap-[5px] shrink-0 z-10 animate-fade-in">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMenuItem(dinnerSlot.id);
                                        setDeletingSlotId(null);
                                      }}
                                      className="p-[2px] text-red-600 hover:text-red-700 active:scale-90 transition-all shrink-0"
                                      title="Elimina pietanza"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingSlotId(null);
                                      }}
                                      className="p-[2px] text-slate-400 hover:text-slate-700 active:scale-90 transition-all shrink-0"
                                      title="Annulla"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Display Dosages if specified */}
                              {dinnerSlot.dosages && Object.keys(dinnerSlot.dosages).length > 0 && !isDeleting && (
                                <div className="text-[9px] font-extrabold text-[#191970] bg-white/80 px-[4px] py-[1px] rounded border border-[#191970]/30 flex items-center gap-[3px] break-words">
                                  <Scale className="w-3 h-3 text-[#191970] shrink-0" />
                                  <span className="break-words">
                                    {Object.entries(dinnerSlot.dosages).map(([m, g]) => `${m.substring(0, 3)}: ${g}g`).join(' • ')}
                                  </span>
                                </div>
                              )}

                              {/* Saved Annotation Badge if exists */}
                              {dinnerSlot.notes && !isDeleting && (
                                <div className="text-[9px] font-semibold text-[#191970] bg-indigo-50/90 px-[4px] py-[1px] rounded border border-[#191970]/20 flex items-center gap-[3px] break-words">
                                  <Pencil className="w-2.5 h-2.5 text-[#191970] shrink-0" />
                                  <span className="break-words">{dinnerSlot.notes}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Day Summary Trigger ("Riepilogo") */}
                  <div className="pt-[3px] border-t border-slate-100">
                    <button
                      onClick={() =>
                        setSummaryModalData({
                          dayName: day,
                          dateStr: dateInfo.fullDateStr,
                          lunchSlots,
                          dinnerSlots
                        })
                      }
                      className="w-full bg-[#191970]/5 hover:bg-[#191970]/10 active:scale-[0.98] border border-[#191970]/20 rounded-md p-[6px] px-[8px] flex items-center justify-center gap-[5px] transition-all group shadow-2xs"
                      title="Apri Riepilogo Giornaliero"
                    >
                      <BarChart2 className="w-4 h-4 text-[#f37021] group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-[#191970]">Riepilogo Giornaliero</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Overlay Week Navigation Card at Bottom */}
          <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 w-full max-w-4xl px-[5px] z-40 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-xl p-[5px] border border-[#191970]/20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-[5px]">
              <div className="flex items-center gap-[5px] w-full md:w-auto justify-between md:justify-start">
                <button
                  onClick={() => setWeekOffset(weekOffset - 1)}
                  className="p-[5px] px-[8px] rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-[#191970] font-extrabold text-[11px] flex items-center gap-[5px] transition-all shrink-0 border border-[#191970]/15"
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
                  className="p-[5px] px-[8px] rounded-md bg-slate-100 hover:bg-slate-200 active:scale-95 text-[#191970] font-extrabold text-[11px] flex items-center gap-[5px] transition-all shrink-0 border border-[#191970]/15"
                >
                  <span>Sett. Succ.</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Week Selectors */}
              <div className="grid grid-cols-3 gap-[5px] w-full md:w-auto">
                <button
                  onClick={() => setWeekOffset(0)}
                  className={`p-[5px] px-[4px] rounded-md text-[10px] sm:text-[11px] font-extrabold text-center transition-all truncate ${
                    weekOffset === 0
                      ? 'bg-[#191970] text-white border border-[#191970] shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[#191970]/15'
                  }`}
                >
                  Questa Settimana
                </button>
                <button
                  onClick={() => setWeekOffset(1)}
                  className={`p-[5px] px-[4px] rounded-md text-[10px] sm:text-[11px] font-extrabold text-center transition-all truncate ${
                    weekOffset === 1
                      ? 'bg-[#f37021] text-white border border-[#f37021] shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[#191970]/15'
                  }`}
                >
                  Prossima (+1)
                </button>
                <button
                  onClick={() => setWeekOffset(2)}
                  className={`p-[5px] px-[4px] rounded-md text-[10px] sm:text-[11px] font-extrabold text-center transition-all truncate ${
                    weekOffset === 2
                      ? 'bg-[#f37021] text-white border border-[#f37021] shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[#191970]/15'
                  }`}
                >
                  Tra 2 Sett. (+2)
                </button>
              </div>
            </div>
          </div>
        </div>
        )
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
                            ☀️ {cleanRecipeName(lunchItem.recipeName)}
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
                            🌙 {cleanRecipeName(dinnerItem.recipeName)}
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
                          <Sun className="w-3 h-3" /> Pranzo: {lunchSlot ? cleanRecipeName(lunchSlot.recipeName) : 'Non pianificato'}
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
                          <Moon className="w-3 h-3" /> Cena: {dinnerSlot ? cleanRecipeName(dinnerSlot.recipeName) : 'Non pianificato'}
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

          {/* SECTION: TREND CONSUMO E GRAMMATURE DOSIMETRO */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm space-y-[12px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[8px] pb-[8px] border-b border-slate-100">
              <div className="flex items-center gap-[8px]">
                <div className="p-[8px] rounded-lg bg-[#f37021]/10 text-[#f37021]">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#191970] text-base">
                    Trend Consumo e Storico Grammature (Dosimetro)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Analisi delle quantità in grammi assegnate ai membri della famiglia nel tempo.
                  </p>
                </div>
              </div>

              {/* Member Filter or Search */}
              <div className="flex items-center gap-[6px] w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cerca piatto o note..."
                    value={dosimetroSearchTerm}
                    onChange={(e) => setDosimetroSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-2 py-[4px] bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                  />
                </div>
              </div>
            </div>

            {/* Overall Gram Stats Cards */}
            {(() => {
              const activeWeekSlots = weeklyMenu.filter((m) => (m.weekId || 'current') === activeWeekId);
              const memberGramTotalsActiveWeek: Record<string, number> = {};
              const memberGramTotalsHistory: Record<string, number> = {};
              let totalGramsActiveWeek = 0;
              let totalGramsHistory = 0;
              let totalMealsWithDosage = 0;

              weeklyMenu.forEach((slot) => {
                if (slot.dosages) {
                  let slotTotal = 0;
                  Object.entries(slot.dosages).forEach(([member, grams]) => {
                    const g = Number(grams) || 0;
                    slotTotal += g;
                    memberGramTotalsHistory[member] = (memberGramTotalsHistory[member] || 0) + g;
                    if ((slot.weekId || 'current') === activeWeekId) {
                      memberGramTotalsActiveWeek[member] = (memberGramTotalsActiveWeek[member] || 0) + g;
                    }
                  });
                  totalGramsHistory += slotTotal;
                  if ((slot.weekId || 'current') === activeWeekId) {
                    totalGramsActiveWeek += slotTotal;
                  }
                  totalMealsWithDosage++;
                }
              });

              const activeWeekMealCount = activeWeekSlots.filter((s) => s.dosages && Object.keys(s.dosages).length > 0).length;
              const maxActiveGrams = Math.max(1, ...Object.values(memberGramTotalsActiveWeek));

              return (
                <div className="space-y-[12px]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
                    <div className="p-[8px] bg-amber-50/70 border border-amber-200 rounded-lg space-y-[2px]">
                      <span className="text-[10px] font-bold text-amber-800 uppercase block">Grammi Totali Settimana</span>
                      <div className="text-lg font-black text-[#d95d13] flex items-center gap-[4px]">
                        <Scale className="w-4 h-4 text-[#f37021]" />
                        {totalGramsActiveWeek.toLocaleString('it-IT')} g
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">In {activeWeekMealCount} pasti dosati</span>
                    </div>

                    <div className="p-[8px] bg-[#191970]/5 border border-[#191970]/15 rounded-lg space-y-[2px]">
                      <span className="text-[10px] font-bold text-[#191970] uppercase block">Grammi Totali Storico</span>
                      <div className="text-lg font-black text-[#191970] flex items-center gap-[4px]">
                        <BarChart2 className="w-4 h-4 text-[#191970]" />
                        {totalGramsHistory.toLocaleString('it-IT')} g
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Totale menu registrati</span>
                    </div>

                    <div className="p-[8px] bg-emerald-50 border border-emerald-200 rounded-lg space-y-[2px]">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Media Pasto Famiglia</span>
                      <div className="text-lg font-black text-emerald-900 flex items-center gap-[4px]">
                        <Flame className="w-4 h-4 text-emerald-600" />
                        {totalMealsWithDosage > 0 ? Math.round(totalGramsHistory / totalMealsWithDosage) : 0} g / pasto
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Media su tutti i pasti</span>
                    </div>
                  </div>

                  {/* Breakdown per Membro della Famiglia (Settimana Attuale) */}
                  <div className="p-[10px] bg-slate-50 border border-slate-200 rounded-lg space-y-[8px]">
                    <h4 className="font-extrabold text-xs text-[#191970] flex items-center justify-between">
                      <span className="flex items-center gap-[4px]">
                        <Users className="w-4 h-4 text-[#f37021]" />
                        Ripartizione Consumo per Membro (Settimana Attuale)
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">Totale: {totalGramsActiveWeek}g</span>
                    </h4>

                    {Object.keys(memberGramTotalsActiveWeek).length === 0 ? (
                      <p className="text-xs text-slate-400 italic p-[4px]">Nessuna dosatura registrata per la settimana selezionata. Assegna i grammi ai pasti con il Dosimetro!</p>
                    ) : (
                      <div className="space-y-[6px]">
                        {Object.entries(memberGramTotalsActiveWeek).map(([member, grams]) => {
                          const pct = Math.round((grams / maxActiveGrams) * 100);
                          const sharePct = totalGramsActiveWeek > 0 ? Math.round((grams / totalGramsActiveWeek) * 100) : 0;
                          return (
                            <div key={member} className="space-y-[2px]">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-[#191970]">{member}</span>
                                <span className="text-[#f37021] font-black">{grams} g <span className="text-slate-400 font-semibold text-[10px]">({sharePct}%)</span></span>
                              </div>
                              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#f37021] to-[#d95d13] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tabella Dettagliata Pasti con Dosimetro */}
                  <div className="space-y-[6px]">
                    <h4 className="font-extrabold text-xs text-[#191970] flex items-center gap-[4px]">
                      <UtensilsCrossed className="w-4 h-4 text-[#f37021]" />
                      Storico Dettagliato Pasti e Quantità
                    </h4>

                    {(() => {
                      const slotsWithDosagesOrNotes = weeklyMenu.filter((slot) => {
                        const hasDosage = slot.dosages && Object.keys(slot.dosages).length > 0;
                        const hasNotes = Boolean(slot.notes && slot.notes.trim());
                        if (!hasDosage && !hasNotes) return false;

                        if (dosimetroSearchTerm) {
                          const q = dosimetroSearchTerm.toLowerCase();
                          const matchName = slot.recipeName.toLowerCase().includes(q);
                          const matchNote = (slot.notes || '').toLowerCase().includes(q);
                          const matchMember = slot.dosages && Object.keys(slot.dosages).some((m) => m.toLowerCase().includes(q));
                          return matchName || matchNote || matchMember;
                        }
                        return true;
                      });

                      if (slotsWithDosagesOrNotes.length === 0) {
                        return (
                          <div className="p-[10px] bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500 italic">
                            Nessun pasto trovato con grammature o annotazioni. Assegna le dosi dal planner con il tasto "+".
                          </div>
                        );
                      }

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden text-xs">
                          <div className="divide-y divide-slate-200">
                            {slotsWithDosagesOrNotes.map((slot) => {
                              const isLunch = slot.mealType === 'lunch';
                              return (
                                <div key={slot.id} className="p-[8px] bg-white hover:bg-amber-50/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-[6px]">
                                  <div className="space-y-[2px]">
                                    <div className="flex items-center gap-[6px]">
                                      <span className={`text-[10px] font-black px-[6px] py-[1px] rounded text-white ${isLunch ? 'bg-[#f37021]' : 'bg-[#191970]'}`}>
                                        {slot.day} • {isLunch ? 'Pranzo' : 'Cena'}
                                      </span>
                                      <span className="font-extrabold text-[#191970] text-xs">{cleanRecipeName(slot.recipeName)}</span>
                                    </div>
                                    {slot.notes && (
                                      <p className="text-[11px] text-slate-600 italic font-medium flex items-center gap-[3px]">
                                        <Pencil className="w-3 h-3 text-[#f37021] shrink-0" />
                                        Nota: {slot.notes}
                                      </p>
                                    )}
                                  </div>

                                  {slot.dosages && Object.keys(slot.dosages).length > 0 && (
                                    <div className="flex items-center gap-[4px] flex-wrap">
                                      {Object.entries(slot.dosages).map(([mem, gr]) => (
                                        <span key={mem} className="bg-slate-100 border border-slate-200 text-slate-800 px-[6px] py-[2px] rounded text-[10px] font-bold">
                                          {mem}: <strong className="text-[#f37021]">{gr}g</strong>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VIEW 4: RECIPE BOOK MANAGER */}
      {activeSubTab === 'recipeBook' && (
        <div className="space-y-[10px]">
          {/* Dish Course Filter Tabs */}
          <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-sm space-y-[5px]">
            <div className="flex items-center justify-end text-xs text-slate-500 font-semibold pb-[2px]">
              <span>Totale ricette salvate: <strong>{recipes.length}</strong></span>
            </div>

            {/* Row 1: 6 Courses (including Tutti) on 1 line */}
            <div className="grid grid-cols-6 gap-[3px] sm:gap-[5px] w-full">
              {(['Tutti', 'Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCourseFilter(c)}
                  className={`py-[5px] px-[2px] sm:px-[5px] rounded-md text-[10px] sm:text-xs font-extrabold transition-all text-center truncate flex items-center justify-center ${
                    selectedCourseFilter === c
                      ? 'bg-[#191970] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Row 2: 5 Categories on 1 line */}
            <div className="grid grid-cols-5 gap-[3px] sm:gap-[5px] w-full pt-[1px]">
              {(['Tutte', 'Sabina', 'Lazio', 'Classica', 'Altro'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-[4px] px-[2px] sm:px-[5px] rounded-md text-[10px] sm:text-xs font-bold transition-colors text-center truncate flex items-center justify-center ${
                    selectedCategory === cat
                      ? 'bg-[#f37021] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
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
                          {cleanRecipeName(recipe.name)}
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
