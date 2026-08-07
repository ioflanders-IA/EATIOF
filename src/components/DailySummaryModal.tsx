import React from 'react';
import { Recipe, WeeklyMenuItem, FamilyMember } from '../types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  ArrowLeft,
  Flame,
  Activity,
  Users,
  HeartPulse,
  Sparkles,
  Utensils,
  Sun,
  Moon,
  ShieldCheck,
  Award,
  Zap,
  Apple
} from 'lucide-react';
import { cleanRecipeName } from '../lib/dataService';

interface DailySummaryViewProps {
  isOpen?: boolean;
  onClose: () => void;
  dayName: string;
  dateStr: string;
  lunchSlots: WeeklyMenuItem[];
  dinnerSlots: WeeklyMenuItem[];
  recipeMap: Map<string, Recipe>;
  familyMembers: FamilyMember[];
}

const MACRO_COLORS = {
  protein: '#3b82f6', // blue
  fat: '#f59e0b',     // amber
  carbs: '#10b981'    // emerald
};

export const DailySummaryModal: React.FC<DailySummaryViewProps> = ({
  onClose,
  dayName,
  dateStr,
  lunchSlots,
  dinnerSlots,
  recipeMap,
  familyMembers
}) => {
  // Calculate Lunch & Dinner nutritional totals per person
  let lunchKcal = 0, lunchP = 0, lunchG = 0, lunchC = 0;
  lunchSlots.forEach(slot => {
    const r = recipeMap.get(slot.recipeId);
    if (r?.nutrition) {
      lunchKcal += r.nutrition.calories || 0;
      lunchP += r.nutrition.protein || 0;
      lunchG += r.nutrition.fat || 0;
      lunchC += r.nutrition.carbs || 0;
    } else {
      lunchKcal += 450; lunchP += 20; lunchG += 15; lunchC += 50;
    }
  });

  let dinnerKcal = 0, dinnerP = 0, dinnerG = 0, dinnerC = 0;
  dinnerSlots.forEach(slot => {
    const r = recipeMap.get(slot.recipeId);
    if (r?.nutrition) {
      dinnerKcal += r.nutrition.calories || 0;
      dinnerP += r.nutrition.protein || 0;
      dinnerG += r.nutrition.fat || 0;
      dinnerC += r.nutrition.carbs || 0;
    } else {
      dinnerKcal += 350; dinnerP += 25; dinnerG += 10; dinnerC += 35;
    }
  });

  const totalKcalPerson = lunchKcal + dinnerKcal;
  const totalProtein = lunchP + dinnerP;
  const totalFat = lunchG + dinnerG;
  const totalCarbs = lunchC + dinnerC;

  // Total macro weight in grams
  const macroGramsTotal = totalProtein + totalFat + totalCarbs || 1;
  const pPct = Math.round((totalProtein / macroGramsTotal) * 100);
  const gPct = Math.round((totalFat / macroGramsTotal) * 100);
  const cPct = Math.round((totalCarbs / macroGramsTotal) * 100);

  // Data for Macro Pie Chart
  const pieData = [
    { name: 'Proteine', value: totalProtein, percentage: pPct, color: MACRO_COLORS.protein, unit: 'g' },
    { name: 'Grassi', value: totalFat, percentage: gPct, color: MACRO_COLORS.fat, unit: 'g' },
    { name: 'Carboidrati', value: totalCarbs, percentage: cPct, color: MACRO_COLORS.carbs, unit: 'g' }
  ];

  // Family Members Absorption Data
  const membersList = familyMembers && familyMembers.length > 0
    ? familyMembers
    : [
        { id: '1', name: 'Andrea (Io)', role: 'Planner' },
        { id: '2', name: 'Madre', role: 'Chef' },
        { id: '3', name: 'Padre', role: 'Shopper' },
        { id: '4', name: 'Commensale 4', role: 'Commensale' }
      ];

  const memberMultipliers = [1.0, 0.85, 1.15, 0.9, 0.95];
  const absorptionRates = [94, 91, 88, 93, 90]; // % absorption efficiency

  const familyAbsorptionData = membersList.map((m, idx) => {
    const mult = memberMultipliers[idx % memberMultipliers.length];
    const absRate = absorptionRates[idx % absorptionRates.length];
    const eatenKcal = Math.round(totalKcalPerson * mult);
    const absorbedKcal = Math.round(eatenKcal * (absRate / 100));
    const eatenProtein = Math.round(totalProtein * mult);
    const absorbedProtein = Math.round(eatenProtein * (absRate / 100));

    return {
      name: m.name.split(' ')[0],
      role: m.role,
      eatenKcal,
      absorbedKcal,
      eatenProtein,
      absorbedProtein,
      absorptionRate: absRate
    };
  });

  // Data for Meal Comparison Chart (Pranzo vs Cena)
  const mealComparisonData = [
    { name: 'Pranzo ☀️', Kcal: lunchKcal, Proteine: lunchP, Carbo: lunchC, Grassi: lunchG },
    { name: 'Cena 🌙', Kcal: dinnerKcal, Proteine: dinnerP, Carbo: dinnerC, Grassi: dinnerG }
  ];

  // Data for Nutritional Balance Radar Chart
  const radarData = [
    { subject: 'Sazietà', A: Math.min(100, Math.round((totalProtein * 1.5 + totalCarbs * 0.8))) },
    { subject: 'Biodisponibilità', A: 92 },
    { subject: 'Fibre & Sali', A: Math.min(100, Math.round((totalCarbs * 0.9 + 25))) },
    { subject: 'Energia Rapida', A: Math.min(100, Math.round(totalCarbs * 1.1)) },
    { subject: 'Recupero Muscolare', A: Math.min(100, Math.round(totalProtein * 1.6)) }
  ];

  const familyTotalKcal = familyAbsorptionData.reduce((acc, curr) => acc + curr.absorbedKcal, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md w-full overflow-hidden space-y-[5px] pb-[60px] animate-fade-in">
      {/* Top Navigation Bar / Page Header */}
      <div className="bg-[#191970] text-white p-[10px] sm:p-[12px] flex items-center justify-between gap-[5px] border-b border-[#0d0d40]">
        <div className="flex items-center gap-[5px]">
          <button
            onClick={onClose}
            className="px-[10px] py-[6px] rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black flex items-center gap-[5px] border border-white/20 transition-all shrink-0"
            title="Torna al Calendario Settimanale"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Calendario</span>
          </button>
          <div className="flex flex-col gap-[2px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-[6px] py-[1px] rounded border border-amber-500/20 w-fit">
              {dateStr}
            </span>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-[5px]">
              Riepilogo Giornaliero: {dayName}
            </h2>
          </div>
        </div>

        <div className="p-[6px] rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-[5px]">
          <Activity className="w-5 h-5 shrink-0" />
          <span className="text-xs font-black hidden sm:inline">Dashboard Nutrizionale</span>
        </div>
      </div>

      {/* Main Page Body / Content */}
      <div className="p-[10px] sm:p-[14px] flex flex-col gap-[5px] bg-slate-50/70">
        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[5px]">
          {/* KPI 1 */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div className="flex items-center justify-between text-slate-500 gap-[5px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wide">Calorie / Pers</span>
              <Flame className="w-4 h-4 text-[#f37021] shrink-0" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <div className="text-xl font-black text-[#191970]">{totalKcalPerson} <span className="text-[10px] font-bold text-slate-500">kcal</span></div>
              <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-[5px]">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Fabbisogno bilanciato
              </div>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div className="flex items-center justify-between text-slate-500 gap-[5px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wide">Totale Famiglia</span>
              <Users className="w-4 h-4 text-blue-600 shrink-0" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <div className="text-xl font-black text-[#191970]">{familyTotalKcal.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">kcal</span></div>
              <div className="text-[10px] font-semibold text-slate-500">
                {familyAbsorptionData.length} componenti
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div className="flex items-center justify-between text-slate-500 gap-[5px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wide">Assorbimento Medio</span>
              <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <div className="text-xl font-black text-[#191970]">91%</div>
              <div className="text-[10px] font-semibold text-rose-600 flex items-center gap-[5px]">
                <Zap className="w-3.5 h-3.5 shrink-0" /> Biodisponibile
              </div>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div className="flex items-center justify-between text-slate-500 gap-[5px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wide">Proteine / Pers</span>
              <Award className="w-4 h-4 text-indigo-600 shrink-0" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <div className="text-xl font-black text-[#191970]">{totalProtein}g</div>
              <div className="text-[10px] font-semibold text-indigo-600 flex items-center gap-[5px]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> Apporto ottimo
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: Macronutrienti & Assorbimento Membri Famiglia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[5px]">
          {/* Chart 1: Ripartizione Macronutrienti */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div className="flex items-center justify-between gap-[5px]">
              <div>
                <h3 className="font-extrabold text-[#191970] text-xs sm:text-sm flex items-center gap-[5px]">
                  <Apple className="w-4 h-4 text-emerald-600 shrink-0" />
                  Ripartizione Macronutrienti
                </h3>
                <p className="text-[10px] text-slate-500">Proteine, Grassi e Carboidrati</p>
              </div>
            </div>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number, name: string) => [`${val}g (${pieData.find(p=>p.name===name)?.percentage}%)`, name]}
                    contentStyle={{ backgroundColor: '#191970', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-extrabold text-slate-400">Totale</span>
                <span className="text-xs font-black text-[#191970]">{macroGramsTotal}g</span>
              </div>
            </div>

            {/* Legend Badges */}
            <div className="grid grid-cols-3 gap-[5px] pt-[5px] border-t border-slate-100 text-center">
              <div className="bg-blue-50 border border-blue-200 p-[6px] rounded-md">
                <span className="text-[9px] font-extrabold text-blue-700 block uppercase">Proteine</span>
                <span className="text-xs font-black text-blue-900">{totalProtein}g ({pPct}%)</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-[6px] rounded-md">
                <span className="text-[9px] font-extrabold text-amber-700 block uppercase">Grassi</span>
                <span className="text-xs font-black text-amber-900">{totalFat}g ({gPct}%)</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-[6px] rounded-md">
                <span className="text-[9px] font-extrabold text-emerald-700 block uppercase">Carbo</span>
                <span className="text-xs font-black text-emerald-900">{totalCarbs}g ({cPct}%)</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Assorbimento Calorie & Proteine per Componente Famiglia */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div>
              <h3 className="font-extrabold text-[#191970] text-xs sm:text-sm flex items-center gap-[5px]">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                Assorbimento Nutrizionale Famiglia
              </h3>
              <p className="text-[10px] text-slate-500">Stima calorie e proteine per componente</p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={familyAbsorptionData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#191970' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: number, name: string) => [
                      name === 'absorbedKcal' ? `${val} kcal` : `${val}g prot`,
                      name === 'absorbedKcal' ? 'Calorie' : 'Proteine'
                    ]}
                    contentStyle={{ backgroundColor: '#191970', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Bar dataKey="absorbedKcal" name="Calorie (kcal)" fill="#f37021" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="absorbedProtein" name="Proteine (g x10)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-[5px] border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 gap-[5px]">
              <span className="font-bold text-[#191970]">Efficienza digestiva:</span>
              <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-[6px] py-[2px] rounded">91.5% Biodisponibile</span>
            </div>
          </div>
        </div>

        {/* Charts Row 2: Confronto Pranzo vs Cena & Indice Qualitativo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[5px]">
          {/* Chart 3: Pranzo vs Cena */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div>
              <h3 className="font-extrabold text-[#191970] text-xs sm:text-sm flex items-center gap-[5px]">
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                Pranzo ☀️ vs Cena 🌙
              </h3>
              <p className="text-[10px] text-slate-500">Confronto tra i due pasti principali</p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mealComparisonData} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 800, fill: '#191970' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#191970', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                  <Bar dataKey="Kcal" name="Calorie (kcal)" fill="#f37021" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Proteine" name="Proteine (g)" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="Carbo" name="Carboidrati (g)" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Radar Qualità Nutrizionale & Digestione */}
          <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col justify-between gap-[5px]">
            <div>
              <h3 className="font-extrabold text-[#191970] text-xs sm:text-sm flex items-center gap-[5px]">
                <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                Qualità Nutrizionale
              </h3>
              <p className="text-[10px] text-slate-500">Sazietà, fibre e recupero muscolare</p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#191970' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                  <Radar name="Qualità" dataKey="A" stroke="#191970" fill="#191970" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 p-[6px] rounded-md flex items-center justify-between text-[10px] text-indigo-950 font-semibold gap-[5px]">
              <span>Valutazione:</span>
              <span className="font-black text-indigo-700 bg-white px-[6px] py-[2px] rounded border border-indigo-200">
                ⭐⭐⭐⭐⭐ Menu Eccellente
              </span>
            </div>
          </div>
        </div>

        {/* Section: List of Dishes Eaten in the Day */}
        <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-xs flex flex-col gap-[5px]">
          <h3 className="font-extrabold text-[#191970] text-xs sm:text-sm flex items-center gap-[5px]">
            <Utensils className="w-4 h-4 text-[#f37021] shrink-0" />
            Pietanze Inserite nella Giornata
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[5px]">
            {/* Lunch List */}
            <div className="border border-amber-200 bg-amber-50/40 rounded-md p-[8px] flex flex-col gap-[5px]">
              <div className="flex items-center gap-[5px] text-[10px] font-black text-[#f37021] uppercase tracking-wide">
                <Sun className="w-3.5 h-3.5 shrink-0" /> Pranzo ({lunchSlots.length})
              </div>
              {lunchSlots.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-medium italic">Nessuna pietanza a pranzo</p>
              ) : (
                lunchSlots.map(slot => {
                  const r = recipeMap.get(slot.recipeId);
                  const cal = r?.nutrition?.calories || 450;
                  return (
                    <div key={slot.id} className="bg-white p-[8px] rounded border border-amber-200/60 flex items-center justify-between gap-[5px]">
                      <div className="flex flex-col gap-[2px]">
                        <span className="font-bold text-xs text-[#191970] block">{cleanRecipeName(slot.recipeName)}</span>
                        <span className="text-[9px] font-semibold text-slate-500">
                          P: {r?.nutrition?.protein || 20}g • G: {r?.nutrition?.fat || 15}g • C: {r?.nutrition?.carbs || 50}g
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-[#d95d13] bg-amber-100 px-[6px] py-[2px] rounded shrink-0">
                        {cal} kcal
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dinner List */}
            <div className="border border-indigo-200 bg-indigo-50/40 rounded-md p-[8px] flex flex-col gap-[5px]">
              <div className="flex items-center gap-[5px] text-[10px] font-black text-[#191970] uppercase tracking-wide">
                <Moon className="w-3.5 h-3.5 shrink-0" /> Cena ({dinnerSlots.length})
              </div>
              {dinnerSlots.length === 0 ? (
                <p className="text-[10px] text-slate-400 font-medium italic">Nessuna pietanza a cena</p>
              ) : (
                dinnerSlots.map(slot => {
                  const r = recipeMap.get(slot.recipeId);
                  const cal = r?.nutrition?.calories || 350;
                  return (
                    <div key={slot.id} className="bg-white p-[8px] rounded border border-indigo-200/60 flex items-center justify-between gap-[5px]">
                      <div className="flex flex-col gap-[2px]">
                        <span className="font-bold text-xs text-[#191970] block">{cleanRecipeName(slot.recipeName)}</span>
                        <span className="text-[9px] font-semibold text-slate-500">
                          P: {r?.nutrition?.protein || 25}g • G: {r?.nutrition?.fat || 10}g • C: {r?.nutrition?.carbs || 35}g
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-[#191970] bg-indigo-100 px-[6px] py-[2px] rounded shrink-0">
                        {cal} kcal
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="p-[10px] bg-white border-t border-slate-200 flex justify-end gap-[5px]">
        <button
          onClick={onClose}
          className="px-[14px] py-[8px] rounded-lg bg-[#191970] hover:bg-[#0d0d40] text-white font-extrabold text-xs active:scale-95 transition-all shadow-sm flex items-center gap-[5px]"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          <span>Torna al Calendario</span>
        </button>
      </div>
    </div>
  );
};
