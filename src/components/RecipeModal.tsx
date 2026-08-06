import React, { useState, useEffect } from 'react';
import { Recipe, CategoryType, DishCourse, Ingredient } from '../types';
import { saveRecipe, deleteRecipe } from '../lib/dataService';
import { getSeasonalDataForMonth, inferCourseFromRecipe } from '../data/seasonalData';
import { SeasonalIcon } from './SeasonalIcon';
import { ChefHat, Plus, Trash2, Clock, Users, Save, X, Sparkles, CheckCircle2, Leaf, ChevronLeft, Wand2 } from 'lucide-react';

interface RecipeModalProps {
  recipe?: Recipe | null;
  onClose: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, onClose }) => {
  const isEditing = !!recipe;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryType>('Sabina');
  const [course, setCourse] = useState<DishCourse>('Primi');
  const [prepTime, setPrepTime] = useState<number>(20);
  const [servings, setServings] = useState<number>(4);
  const [instructions, setInstructions] = useState('');
  const [calories, setCalories] = useState<number>(450);
  const [protein, setProtein] = useState<number>(20);
  const [fat, setFat] = useState<number>(18);
  const [carbs, setCarbs] = useState<number>(50);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '100', unit: 'g' }
  ]);
  const [customIngredientsInput, setCustomIngredientsInput] = useState('');
  const [isGeneratingDish, setIsGeneratingDish] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillSuccess, setAutoFillSuccess] = useState<string | null>(null);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>(isEditing ? 'view' : 'edit');

  const currentMonthData = getSeasonalDataForMonth();

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setCategory(recipe.category);
      setCourse(recipe.course || inferCourseFromRecipe(recipe.name, recipe.category));
      setPrepTime(recipe.prepTimeMinutes || 20);
      setServings(recipe.servings || 4);
      setInstructions(recipe.instructions || '');
      setCalories(recipe.nutrition?.calories ?? 450);
      setProtein(recipe.nutrition?.protein ?? 20);
      setFat(recipe.nutrition?.fat ?? 18);
      setCarbs(recipe.nutrition?.carbs ?? 50);
      setIngredients(
        recipe.ingredients.length > 0
          ? [...recipe.ingredients]
          : [{ name: '', quantity: '100', unit: 'g' }]
      );
    }
  }, [recipe]);

  const handleAutoFillRecipe = async (recipeNameOverride?: string) => {
    const targetTitle = (recipeNameOverride || name).trim();
    if (!targetTitle) return;

    setIsAutoFilling(true);
    setAutoFillError(null);
    setAutoFillSuccess(null);

    try {
      const res = await fetch('/api/auto-fill-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: targetTitle })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Errore durante la compilazione automatica.');
      }

      const data = result.data;
      if (data) {
        if (data.category && ['Sabina', 'Lazio', 'Classica', 'Altro'].includes(data.category)) {
          setCategory(data.category as CategoryType);
        }
        if (data.course && ['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'].includes(data.course)) {
          setCourse(data.course as DishCourse);
        } else {
          setCourse(inferCourseFromRecipe(targetTitle, data.category));
        }
        if (data.prepTimeMinutes) setPrepTime(Number(data.prepTimeMinutes));
        if (data.servings) setServings(Number(data.servings));
        if (data.calories !== undefined) setCalories(Number(data.calories));
        if (data.protein !== undefined) setProtein(Number(data.protein));
        if (data.fat !== undefined) setFat(Number(data.fat));
        if (data.carbs !== undefined) setCarbs(Number(data.carbs));
        if (data.instructions) setInstructions(data.instructions);
        if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
          setIngredients(
            data.ingredients.map((ing: any) => ({
              name: ing.name || '',
              quantity: ing.quantity !== undefined ? String(ing.quantity) : '100',
              unit: ing.unit !== undefined ? String(ing.unit) : 'g'
            }))
          );
        }
        setAutoFillSuccess(`Dati, portata (${data.course || 'auto-rilevata'}), ingredienti e valori nutrizionali compilati per "${targetTitle}"!`);
      }
    } catch (err: any) {
      console.error('Errore AutoFill:', err);
      setAutoFillError(err?.message || 'Impossibile compilare la ricetta automaticamente.');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleGenerateDishFromIngredients = async () => {
    // Collect ingredients either from custom text input or from added ingredient rows
    const ingredientsToUse = customIngredientsInput.trim()
      ? customIngredientsInput.trim()
      : ingredients.map((i) => i.name.trim()).filter(Boolean).join(', ');

    if (!ingredientsToUse) {
      setAutoFillError('Inserisci almeno un ingrediente per generare il piatto.');
      return;
    }

    setIsGeneratingDish(true);
    setAutoFillError(null);
    setAutoFillSuccess(null);

    try {
      const res = await fetch('/api/generate-dish-from-ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredientsToUse })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Errore durante la generazione del piatto.');
      }

      const data = result.data;
      if (data) {
        if (data.name) setName(data.name);
        if (data.category && ['Sabina', 'Lazio', 'Classica', 'Altro'].includes(data.category)) {
          setCategory(data.category as CategoryType);
        }
        if (data.course && ['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'].includes(data.course)) {
          setCourse(data.course as DishCourse);
        }
        if (data.prepTimeMinutes) setPrepTime(Number(data.prepTimeMinutes));
        if (data.servings) setServings(Number(data.servings));
        if (data.calories !== undefined) setCalories(Number(data.calories));
        if (data.protein !== undefined) setProtein(Number(data.protein));
        if (data.fat !== undefined) setFat(Number(data.fat));
        if (data.carbs !== undefined) setCarbs(Number(data.carbs));
        if (data.instructions) setInstructions(data.instructions);
        if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
          setIngredients(
            data.ingredients.map((ing: any) => ({
              name: ing.name || '',
              quantity: ing.quantity !== undefined ? String(ing.quantity) : '100',
              unit: ing.unit !== undefined ? String(ing.unit) : 'g'
            }))
          );
        }
        setAutoFillSuccess(`Piatto "${data.name}" generato con successo dai tuoi ingredienti!`);
      }
    } catch (err: any) {
      console.error('Errore Genera Piatto:', err);
      setAutoFillError(err?.message || 'Impossibile generare la ricetta dagli ingredienti.');
    } finally {
      setIsGeneratingDish(false);
    }
  };

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { name: '', quantity: '100', unit: 'g' }]);
  };

  const handleAddSeasonalIngredient = (item: { name: string }) => {
    const cleanName = item.name.replace(/\s*\(.*\)/, '');
    const lastIng = ingredients[ingredients.length - 1];
    if (ingredients.length === 1 && !lastIng.name.trim()) {
      setIngredients([{ name: cleanName, quantity: '200', unit: 'g' }]);
    } else {
      setIngredients([...ingredients, { name: cleanName, quantity: '200', unit: 'g' }]);
    }
  };

  const handleRemoveIngredientRow = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    const validIngredients = ingredients.filter((i) => i.name.trim().length > 0);

    const recipeToSave: Recipe = {
      id: recipe?.id || `recipe-${Date.now()}`,
      name: name.trim(),
      category,
      course,
      prepTimeMinutes: Number(prepTime) || 20,
      servings: Number(servings) || 4,
      nutrition: {
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs: Number(carbs) || 0
      },
      instructions: instructions.trim(),
      ingredients: validIngredients.length > 0 ? validIngredients : [{ name: 'Ingredienti varî', quantity: 'q.b.', unit: '' }]
    };

    await saveRecipe(recipeToSave);
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (recipe) {
      await deleteRecipe(recipe.id);
      onClose();
    }
  };

  const categories: CategoryType[] = ['Sabina', 'Lazio', 'Classica', 'Altro'];
  const courses: DishCourse[] = ['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md p-[5px] space-y-[5px] min-h-[80vh] animate-fade-in">
      {/* Header without blue background, icon orange border transparent inside */}
      <div className="bg-white text-slate-900 p-[5px] flex items-center justify-between rounded-md border-b border-slate-200 gap-[5px] flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-[5px] flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="p-[5px] px-[8px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-[4px] border border-slate-300 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
            <span>Torna al Ricettario</span>
          </button>
          <div className="flex items-center gap-[6px]">
            <div className="p-[5px] rounded-md border-2 border-[#f37021] bg-transparent text-[#f37021] shrink-0 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-[#f37021]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight text-[#191970]">
                {viewMode === 'view' ? recipe?.name : isEditing ? 'Modifica Ricetta' : 'Nuova Ricetta'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {viewMode === 'view' ? `Portata: ${recipe?.course || 'Primo'} | Categoria: ${recipe?.category}` : 'Compila i dettagli, ingredienti e portata del piatto'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[5px] shrink-0">
          {isEditing && viewMode === 'view' && (
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className="p-[5px] px-[10px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white text-xs font-bold transition-colors shadow-2xs"
            >
              Modifica
            </button>
          )}
        </div>
      </div>

        {/* Content Body */}
        {viewMode === 'view' && recipe ? (
          <div className="p-[5px] overflow-y-auto space-y-[5px]">
            <div className="flex items-center gap-[5px] flex-wrap p-[5px]">
              <span className="p-[5px] px-[10px] rounded-full text-xs font-black bg-[#191970] text-white">
                {recipe.course || inferCourseFromRecipe(recipe.name, recipe.category)}
              </span>
              <span className="p-[5px] px-[10px] rounded-full text-xs font-bold bg-[#f37021]/10 text-[#f37021] border border-[#f37021]/30">
                {recipe.category}
              </span>
              {recipe.prepTimeMinutes && (
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-[5px] bg-slate-100 p-[5px] px-[10px] rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#f37021]" />
                  {recipe.prepTimeMinutes} Minuti
                </span>
              )}
              {recipe.servings && (
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-[5px] bg-slate-100 p-[5px] px-[10px] rounded-full">
                  <Users className="w-3.5 h-3.5 text-[#191970]" />
                  {recipe.servings} Porzioni
                </span>
              )}
            </div>

            {/* Nutrition Card in View Mode */}
            {recipe.nutrition && (
              <div className="bg-emerald-50/70 border border-emerald-200 p-[5px] rounded-md space-y-[5px]">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900 flex items-center justify-between p-[2px]">
                  <span>Valori Nutrizionali (per porzione)</span>
                  <span className="text-[#f37021] font-bold">🔥 {recipe.nutrition.calories} kcal</span>
                </h4>
                <div className="grid grid-cols-3 gap-[5px] text-center pt-[2px]">
                  <div className="bg-white p-[5px] rounded-md border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Proteine</span>
                    <span className="text-xs font-black text-[#191970]">{recipe.nutrition.protein}g</span>
                  </div>
                  <div className="bg-white p-[5px] rounded-md border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Grassi</span>
                    <span className="text-xs font-black text-[#191970]">{recipe.nutrition.fat}g</span>
                  </div>
                  <div className="bg-white p-[5px] rounded-md border border-emerald-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Carboidrati</span>
                    <span className="text-xs font-black text-[#191970]">{recipe.nutrition.carbs}g</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div className="bg-slate-50 p-[5px] rounded-md border border-slate-200 space-y-[5px]">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] p-[2px]">
                Ingredienti:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[5px] text-xs font-medium text-slate-800 p-[2px]">
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-[5px] px-[8px] rounded-md border border-slate-200">
                    <span className="font-bold text-[#191970]">{ing.name}</span>
                    <span className="text-slate-600 font-extrabold bg-slate-100 p-[2px] px-[5px] rounded">
                      {ing.quantity} {ing.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {recipe.instructions && (
              <div className="space-y-[5px]">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] p-[2px]">
                  Preparazione:
                </h4>
                <div className="p-[5px] sm:p-[8px] bg-[#f37021]/5 border border-[#f37021]/20 rounded-md text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                  {recipe.instructions}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* EDIT / CREATE FORM with 5px gaps and padding */
          <form onSubmit={handleSubmit} className="p-[5px] overflow-y-auto space-y-[5px] flex-1">
            {/* Auto-Fill / Generate Feedback Banners */}
            {(isAutoFilling || isGeneratingDish) && (
              <div className="bg-amber-50 border border-amber-200 p-[5px] px-[8px] rounded-md flex items-center gap-[6px] text-xs font-bold text-amber-900 animate-pulse">
                <Sparkles className="w-4 h-4 text-[#f37021] animate-spin" />
                <span>
                  {isGeneratingDish
                    ? "Lo chef IA sta creando la ricetta perfetta dai tuoi ingredienti..."
                    : "Compilazione automatica della ricetta in corso con l'IA..."}
                </span>
              </div>
            )}
            {autoFillSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-[5px] px-[8px] rounded-md flex items-center justify-between text-xs font-bold text-emerald-900">
                <div className="flex items-center gap-[6px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{autoFillSuccess}</span>
                </div>
                <button type="button" onClick={() => setAutoFillSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {autoFillError && (
              <div className="bg-red-50 border border-red-200 p-[5px] px-[8px] rounded-md flex items-center justify-between text-xs font-bold text-red-900">
                <span>{autoFillError}</span>
                <button type="button" onClick={() => setAutoFillError(null)} className="text-red-700 hover:text-red-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dish Course Selector without emojis, fitted 5 columns on one line */}
            <div className="p-[5px] bg-slate-50 border border-slate-200 rounded-md space-y-[5px]">
              <label className="text-[11px] font-black text-[#191970] uppercase tracking-wider block">
                Portata del Piatto *
              </label>
              <div className="grid grid-cols-5 gap-[5px] w-full">
                {courses.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCourse(c)}
                    className={`p-[5px] px-[2px] rounded-md text-[10px] sm:text-xs font-extrabold text-center transition-all truncate w-full ${
                      course === c
                        ? 'bg-[#191970] text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-[#f37021]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[5px]">
              <div className="p-[5px] space-y-[5px] bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nome della Ricetta *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoFillRecipe()}
                    disabled={isAutoFilling || !name.trim()}
                    className="text-[10px] font-extrabold text-white bg-[#f37021] hover:bg-[#d95d13] p-[2px] px-[8px] rounded-md shadow-2xs transition-all flex items-center gap-[3px] disabled:opacity-50"
                    title="Compila automaticamente la ricetta con l'IA"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isAutoFilling ? 'Compilazione...' : 'Auto-Compila'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-[5px]">
                  <input
                    type="text"
                    placeholder="es. Bruschetta, Carbonara, Pollo con peperoni..."
                    value={name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setName(newName);
                      setCourse(inferCourseFromRecipe(newName, category));
                      if (autoFillSuccess) setAutoFillSuccess(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault();
                        handleAutoFillRecipe();
                      }
                    }}
                    required
                    className="flex-1 p-[5px] px-[8px] bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAutoFillRecipe()}
                    disabled={isAutoFilling || !name.trim()}
                    className="p-[5px] px-[8px] bg-[#f37021] hover:bg-[#d95d13] text-white font-extrabold text-xs rounded-md shadow-2xs flex items-center gap-[4px] disabled:opacity-50 transition-colors shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAutoFilling ? 'IA...' : 'Auto-compila'}</span>
                  </button>
                </div>
              </div>

              <div className="p-[5px] space-y-[5px] bg-slate-50 border border-slate-200 rounded-md">
                <label className="text-xs font-bold text-slate-700 block">
                  Tradizione Culinaria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="text-slate-900 bg-white">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[5px]">
              <div className="p-[5px] space-y-[5px] bg-slate-50 border border-slate-200 rounded-md">
                <label className="text-xs font-bold text-slate-700 block">
                  Tempo Preparazione (min)
                </label>
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(Number(e.target.value))}
                  className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                />
              </div>

              <div className="p-[5px] space-y-[5px] bg-slate-50 border border-slate-200 rounded-md">
                <label className="text-xs font-bold text-slate-700 block">
                  Porzioni
                </label>
                <input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                />
              </div>
            </div>

            {/* Seasonal Produce Suggestion Box for adding ingredients */}
            <div className="bg-emerald-50/90 border border-emerald-300 p-[5px] rounded-md space-y-[5px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-900 flex items-center gap-[4px]">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  Alimenti Consigliati per la Stagione ({currentMonthData.monthName})
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">Clicca per aggiungere agli ingredienti!</span>
              </div>
              <div className="flex items-center gap-[5px] flex-wrap pt-[2px]">
                {currentMonthData.items.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddSeasonalIngredient(item)}
                    title={`${item.description} - ${item.benefits}`}
                    className="text-[10px] font-bold bg-white text-emerald-900 border border-emerald-200 hover:border-emerald-500 p-[3px] px-[7px] rounded-full shadow-2xs hover:bg-emerald-100 transition-all flex items-center gap-[3px]"
                  >
                    <SeasonalIcon icon={item.icon} className="w-3.5 h-3.5 text-[#f37021] shrink-0" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nutrition Inputs Section */}
            <div className="bg-slate-50 p-[5px] rounded-md border border-slate-200 space-y-[5px]">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] block p-[2px]">
                Valori Nutrizionali (per porzione)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-[5px]">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Kilocalorie (kcal)
                  </label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Proteine (g)
                  </label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Grassi (g)
                  </label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    Carboidrati (g)
                  </label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full p-[5px] px-[8px] bg-white text-slate-900 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Ingredients Section */}
            <div className="bg-slate-50 p-[5px] rounded-md border border-slate-200 space-y-[5px]">
              <div className="flex items-center justify-between p-[2px]">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970]">
                  Ingredienti
                </label>
                <button
                  type="button"
                  onClick={handleAddIngredientRow}
                  className="text-xs font-bold text-[#f37021] hover:underline flex items-center gap-[4px] bg-[#f37021]/10 p-[4px] px-[8px] rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aggiungi Ingrediente
                </button>
              </div>

              <div className="space-y-[5px]">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-[5px]">
                    <input
                      type="text"
                      placeholder="Nome (es. Guanciale)"
                      value={ing.name}
                      onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                      className="flex-1 p-[5px] px-[8px] bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                    />
                    <input
                      type="text"
                      placeholder="Qtà (150)"
                      value={ing.quantity}
                      onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                      className="w-20 p-[5px] px-[8px] bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                    />
                    <input
                      type="text"
                      placeholder="Unità (g)"
                      value={ing.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="w-16 p-[5px] px-[8px] bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                    />
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientRow(idx)}
                        className="p-[5px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions Textarea */}
            <div className="p-[5px] space-y-[5px] bg-slate-50 border border-slate-200 rounded-md">
              <label className="text-xs font-bold text-slate-700 block">
                Note o Istruzioni di Preparazione
              </label>
              <textarea
                rows={3}
                placeholder="Passaggi della ricetta..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-[5px] px-[8px] bg-white text-[#191970] placeholder-slate-400 border border-slate-300 rounded-md text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#f37021]"
              />
            </div>

            {/* Genera Piatto dagli Ingredienti (At the bottom of the form) */}
            <div className="p-[5px] bg-amber-50/80 border-2 border-[#f37021]/50 rounded-md space-y-[5px]">
              <div className="flex items-center gap-[5px]">
                <div className="p-[3px] rounded border border-[#f37021] bg-transparent text-[#f37021] shrink-0">
                  <ChefHat className="w-4 h-4 text-[#f37021]" />
                </div>
                <div>
                  <span className="text-xs font-black text-[#191970] uppercase tracking-wider block">
                    Genera Piatto dagli Ingredienti
                  </span>
                  <p className="text-[10px] text-slate-600 font-semibold">
                    Inserisci gli ingredienti o usa quelli inseriti sopra e l'agente ti proporrà una ricetta completa.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-[5px]">
                <input
                  type="text"
                  placeholder="es. Guanciale, Uova, Pecorino, Pepe (oppure usa gli ingredienti sopra)..."
                  value={customIngredientsInput}
                  onChange={(e) => setCustomIngredientsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateDishFromIngredients();
                    }
                  }}
                  className="flex-1 p-[5px] px-[8px] bg-white text-slate-900 placeholder-slate-400 border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#f37021]"
                />
                <button
                  type="button"
                  onClick={handleGenerateDishFromIngredients}
                  disabled={isGeneratingDish}
                  className="p-[5px] px-[10px] bg-[#f37021] hover:bg-[#d95d13] text-white font-extrabold text-xs rounded-md shadow-2xs flex items-center gap-[4px] disabled:opacity-50 transition-colors shrink-0"
                >
                  <Wand2 className="w-3.5 h-3.5 text-white" />
                  <span>{isGeneratingDish ? 'Generazione...' : 'Genera Piatto'}</span>
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-[5px] border-t border-slate-200 flex items-center justify-between gap-[5px] pt-[5px]">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-[5px] px-[10px] rounded-md bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs flex items-center gap-[5px] border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Elimina
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-[5px]">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-[5px] px-[10px] rounded-md bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="p-[5px] px-[12px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-extrabold text-xs shadow-md flex items-center gap-[5px]"
                >
                  <Save className="w-3.5 h-3.5 text-white" />
                  <span>{isSaving ? 'Salvataggio...' : 'Salva Ricetta'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
    </div>
  );
};
