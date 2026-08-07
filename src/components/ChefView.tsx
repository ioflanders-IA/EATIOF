import React, { useState } from 'react';
import { Recipe, WeeklyMenuItem, DayOfWeek } from '../types';
import { DAYS_OF_WEEK } from '../data/initialData';
import { ChefHat, Clock, Utensils, ChevronRight, Check, Sun, Moon } from 'lucide-react';
import { cleanRecipeName } from '../lib/dataService';

interface ChefViewProps {
  recipes: Recipe[];
  weeklyMenu: WeeklyMenuItem[];
  onOpenRecipeModal: (recipe: Recipe) => void;
}

export const ChefView: React.FC<ChefViewProps> = ({
  recipes,
  weeklyMenu,
  onOpenRecipeModal
}) => {
  // Determine current day of week in Italian or default to Lunedì
  const getTodayItalian = (): DayOfWeek => {
    const days: DayOfWeek[] = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const todayIdx = new Date().getDay();
    return days[todayIdx] || 'Lunedì';
  };

  const [activeDay, setActiveDay] = useState<DayOfWeek>(getTodayItalian());
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (stepKey: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  // Recipe lookup map
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => recipeMap.set(r.id, r));

  // Get meals for active selected day
  const dayMeals = weeklyMenu.filter((m) => m.day === activeDay);
  const lunchItems = dayMeals.filter((m) => m.mealType === 'lunch');
  const dinnerItems = dayMeals.filter((m) => m.mealType === 'dinner');

  const lunchRecipes = lunchItems.map((m) => recipeMap.get(m.recipeId)).filter((r): r is Recipe => !!r);
  const dinnerRecipes = dinnerItems.map((m) => recipeMap.get(m.recipeId)).filter((r): r is Recipe => !!r);

  return (
    <div className="space-y-[10px]">
      {/* Top Banner */}
      <div className="bg-[#191970] rounded-lg p-[10px] text-white shadow-md">
        <div className="flex items-center gap-[10px] mb-[5px]">
          <span className="p-[5px] rounded-md bg-[#f37021]">
            <ChefHat className="w-6 h-6 text-white" />
          </span>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#f37021]">
              Vista Chef (Madre)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">Cosa Cucinare Oggi</h2>
          </div>
        </div>
        <p className="text-xs text-slate-300 max-w-xl p-[5px]">
          Visualizza i piatti in programma a grandi caratteri, gli ingredienti e le istruzioni di preparazione.
        </p>

        {/* Day Switcher Tabs */}
        <div className="flex items-center gap-[5px] overflow-x-auto mt-[10px] pt-[5px] border-t border-white/20 scrollbar-none">
          {DAYS_OF_WEEK.map((day) => {
            const isToday = day === getTodayItalian();
            const isActive = day === activeDay;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`p-[5px] px-[10px] rounded-md text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-[5px] ${
                  isActive
                    ? 'bg-[#f37021] text-white shadow-md scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className="w-2 h-2 rounded-full bg-[#f37021] animate-pulse" title="Oggi" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Meals Grid for Active Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
        {/* LUNCH CARD */}
        <div className="bg-white rounded-lg border-2 border-[#f37021]/30 shadow-sm overflow-hidden flex flex-col justify-between p-[10px]">
          <div className="bg-[#f37021] text-white p-[5px] px-[10px] rounded-md flex items-center justify-between mb-[5px]">
            <div className="flex items-center gap-[5px]">
              <Sun className="w-5 h-5 text-white" />
              <h3 className="font-extrabold text-sm tracking-wide">Pranzo di {activeDay} ({lunchRecipes.length})</h3>
            </div>
          </div>

          <div className="p-[5px] space-y-[15px]">
            {lunchRecipes.length > 0 ? (
              lunchRecipes.map((lunchRecipe, recipeIdx) => (
                <div key={lunchRecipe.id || recipeIdx} className="space-y-[10px] border-b border-slate-100 pb-[10px] last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-[5px]">
                    <div className="p-[2px]">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-[#191970] leading-tight">
                          {cleanRecipeName(lunchRecipe.name)}
                        </h4>
                        <span className="text-[10px] font-bold px-[5px] py-[2px] rounded-full bg-[#f37021]/10 text-[#f37021] border border-[#f37021]/20">
                          {lunchRecipe.category}
                        </span>
                      </div>
                      {lunchRecipe.prepTimeMinutes && (
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-[5px] mt-[3px]">
                          <Clock className="w-3.5 h-3.5 text-[#f37021]" />
                          Tempo di preparazione: {lunchRecipe.prepTimeMinutes} minuti
                        </p>
                      )}
                      {lunchRecipe.nutrition && (
                        <div className="flex items-center gap-[5px] text-[11px] font-bold mt-[5px] flex-wrap">
                          <span className="p-[2px] px-[6px] rounded bg-[#f37021]/15 text-[#d95d13]">
                            🔥 {lunchRecipe.nutrition.calories} kcal
                          </span>
                          <span className="p-[2px] px-[5px] rounded bg-blue-50 text-blue-800">
                            P: {lunchRecipe.nutrition.protein}g
                          </span>
                          <span className="p-[2px] px-[5px] rounded bg-amber-50 text-amber-800">
                            G: {lunchRecipe.nutrition.fat}g
                          </span>
                          <span className="p-[2px] px-[5px] rounded bg-emerald-50 text-emerald-800">
                            C: {lunchRecipe.nutrition.carbs}g
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenRecipeModal(lunchRecipe)}
                      className="p-[5px] rounded-md bg-[#f37021]/10 hover:bg-[#f37021]/20 text-[#f37021] font-bold text-xs shrink-0 flex items-center gap-[5px] transition-colors"
                    >
                      <span>Istruzioni complete</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Ingredients List */}
                  <div className="bg-slate-50 rounded-md p-[5px] border border-slate-200">
                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] mb-[5px] p-[2px]">
                      Ingredienti Necessari:
                    </h5>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-[5px] text-xs font-medium text-slate-800 p-[2px]">
                      {lunchRecipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-center gap-[5px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f37021]" />
                          <span>
                            <strong>{ing.name}</strong>: {ing.quantity} {ing.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick Steps */}
                  {lunchRecipe.instructions && (
                    <div className="space-y-[5px]">
                      <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] p-[2px]">
                        Istruzioni Rapide:
                      </h5>
                      <div className="text-xs text-slate-700 space-y-[5px] leading-relaxed bg-[#f37021]/5 p-[5px] rounded-md border border-[#f37021]/20">
                        {lunchRecipe.instructions.split('\n').map((step, sIdx) => {
                          const stepKey = `lunch-${lunchRecipe.id}-${sIdx}`;
                          const isDone = !!completedSteps[stepKey];
                          return (
                            <div
                              key={sIdx}
                              onClick={() => toggleStep(stepKey)}
                              className={`flex items-start gap-[5px] cursor-pointer p-[5px] rounded transition-colors ${
                                isDone ? 'line-through text-slate-400 bg-emerald-50' : 'hover:bg-[#f37021]/10'
                              }`}
                            >
                              <span className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                isDone ? 'bg-emerald-600 text-white' : 'bg-[#191970] text-white'
                              }`}>
                                {isDone ? <Check className="w-3 h-3" /> : sIdx + 1}
                              </span>
                              <span>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-[5px]">
                <Utensils className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-xs text-slate-600">Nessun pranzo programmato per {activeDay}.</p>
                <p className="text-[11px]">Usa la vista Planner per aggiungere una o più ricette.</p>
              </div>
            )}
          </div>
        </div>

        {/* DINNER CARD */}
        <div className="bg-white rounded-lg border-2 border-[#191970]/30 shadow-sm overflow-hidden flex flex-col justify-between p-[10px]">
          <div className="bg-[#191970] text-white p-[5px] px-[10px] rounded-md flex items-center justify-between mb-[5px]">
            <div className="flex items-center gap-[5px]">
              <Moon className="w-5 h-5 text-white" />
              <h3 className="font-extrabold text-sm tracking-wide">Cena di {activeDay} ({dinnerRecipes.length})</h3>
            </div>
          </div>

          <div className="p-[5px] space-y-[15px]">
            {dinnerRecipes.length > 0 ? (
              dinnerRecipes.map((dinnerRecipe, recipeIdx) => (
                <div key={dinnerRecipe.id || recipeIdx} className="space-y-[10px] border-b border-slate-100 pb-[10px] last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-[5px]">
                    <div className="p-[2px]">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-[#191970] leading-tight">
                          {cleanRecipeName(dinnerRecipe.name)}
                        </h4>
                        <span className="text-[10px] font-bold px-[5px] py-[2px] rounded-full bg-[#191970]/10 text-[#191970] border border-[#191970]/20">
                          {dinnerRecipe.category}
                        </span>
                      </div>
                      {dinnerRecipe.prepTimeMinutes && (
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-[5px] mt-[3px]">
                          <Clock className="w-3.5 h-3.5 text-[#191970]" />
                          Tempo di preparazione: {dinnerRecipe.prepTimeMinutes} minuti
                        </p>
                      )}
                      {dinnerRecipe.nutrition && (
                        <div className="flex items-center gap-[5px] text-[11px] font-bold mt-[5px] flex-wrap">
                          <span className="p-[2px] px-[6px] rounded bg-[#191970]/15 text-[#191970]">
                            🔥 {dinnerRecipe.nutrition.calories} kcal
                          </span>
                          <span className="p-[2px] px-[5px] rounded bg-blue-50 text-blue-800">
                            P: {dinnerRecipe.nutrition.protein}g
                          </span>
                          <span className="p-[2px] px-[5px] rounded bg-amber-50 text-amber-800">
                            G: {dinnerRecipe.nutrition.fat}g
                          </span>
                          <span className="p-[2px] px-[5px] rounded bg-emerald-50 text-emerald-800">
                            C: {dinnerRecipe.nutrition.carbs}g
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onOpenRecipeModal(dinnerRecipe)}
                      className="p-[5px] rounded-md bg-[#191970]/10 hover:bg-[#191970]/20 text-[#191970] font-bold text-xs shrink-0 flex items-center gap-[5px] transition-colors"
                    >
                      <span>Istruzioni complete</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Ingredients List */}
                  <div className="bg-slate-50 rounded-md p-[5px] border border-slate-200">
                    <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] mb-[5px] p-[2px]">
                      Ingredienti Necessari:
                    </h5>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-[5px] text-xs font-medium text-slate-800 p-[2px]">
                      {dinnerRecipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-center gap-[5px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#191970]" />
                          <span>
                            <strong>{ing.name}</strong>: {ing.quantity} {ing.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick Steps */}
                  {dinnerRecipe.instructions && (
                    <div className="space-y-[5px]">
                      <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-[#191970] p-[2px]">
                        Istruzioni Rapide:
                      </h5>
                      <div className="text-xs text-slate-700 space-y-[5px] leading-relaxed bg-[#191970]/5 p-[5px] rounded-md border border-[#191970]/20">
                        {dinnerRecipe.instructions.split('\n').map((step, sIdx) => {
                          const stepKey = `dinner-${dinnerRecipe.id}-${sIdx}`;
                          const isDone = !!completedSteps[stepKey];
                          return (
                            <div
                              key={sIdx}
                              onClick={() => toggleStep(stepKey)}
                              className={`flex items-start gap-[5px] cursor-pointer p-[5px] rounded transition-colors ${
                                isDone ? 'line-through text-slate-400 bg-emerald-50' : 'hover:bg-[#191970]/10'
                              }`}
                            >
                              <span className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                isDone ? 'bg-emerald-600 text-white' : 'bg-[#191970] text-white'
                              }`}>
                                {isDone ? <Check className="w-3 h-3" /> : sIdx + 1}
                              </span>
                              <span>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-[5px]">
                <Utensils className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-xs text-slate-600">Nessuna cena programmata per {activeDay}.</p>
                <p className="text-[11px]">Usa la vista Planner per aggiungere una o più ricette.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
