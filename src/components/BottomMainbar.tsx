import React, { useState } from 'react';
import { BookOpen, Calendar, Refrigerator, Menu, Settings, Users, BarChart3, LogOut, X } from 'lucide-react';
import { MainNavTab } from './Header';

interface BottomMainbarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  onOpenFamilyModal?: () => void;
  onOpenSettingsModal?: () => void;
  onLogout?: () => void;
}

export const BottomMainbar: React.FC<BottomMainbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenFamilyModal,
  onOpenSettingsModal,
  onLogout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#191970] text-white border-t border-[#0d0d40] shadow-2xl md:hidden">
        <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-1">
          {/* 1. RICETTE */}
          <button
            onClick={() => { onSelectTab('recipes'); setIsMenuOpen(false); }}
            className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
              activeTab === 'recipes'
                ? 'text-white font-extrabold'
                : 'text-slate-300 hover:text-white opacity-80 hover:opacity-100'
            }`}
          >
            {activeTab === 'recipes' && (
              <span className="absolute top-0 w-10 h-1 bg-[#f37021] rounded-b-full shadow-sm" />
            )}
            <div
              className={`p-1.5 rounded-xl transition-transform duration-200 ${
                activeTab === 'recipes' ? 'bg-[#f37021] text-white scale-110 shadow-md' : 'bg-white/10'
              }`}
            >
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 truncate max-w-full font-medium">
              Ricette
            </span>
          </button>

          {/* 2. CALENDARIO */}
          <button
            onClick={() => { onSelectTab('calendar'); setIsMenuOpen(false); }}
            className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
              activeTab === 'calendar'
                ? 'text-white font-extrabold'
                : 'text-slate-300 hover:text-white opacity-80 hover:opacity-100'
            }`}
          >
            {activeTab === 'calendar' && (
              <span className="absolute top-0 w-10 h-1 bg-[#f37021] rounded-b-full shadow-sm" />
            )}
            <div
              className={`p-1.5 rounded-xl transition-transform duration-200 ${
                activeTab === 'calendar' ? 'bg-[#f37021] text-white scale-110 shadow-md' : 'bg-white/10'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 truncate max-w-full font-medium">
              Calendario
            </span>
          </button>

          {/* 3. FRIGO DISPENSA */}
          <button
            onClick={() => { onSelectTab('pantry'); setIsMenuOpen(false); }}
            className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
              activeTab === 'pantry'
                ? 'text-white font-extrabold'
                : 'text-slate-300 hover:text-white opacity-80 hover:opacity-100'
            }`}
          >
            {activeTab === 'pantry' && (
              <span className="absolute top-0 w-10 h-1 bg-emerald-500 rounded-b-full shadow-sm" />
            )}
            <div
              className={`p-1.5 rounded-xl transition-transform duration-200 ${
                activeTab === 'pantry' ? 'bg-emerald-600 text-white scale-110 shadow-md' : 'bg-white/10 text-emerald-300'
              }`}
            >
              <Refrigerator className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 truncate max-w-full font-medium">
              Frigo
            </span>
          </button>

          {/* 4. LINEETTE PER SOTTOMENÙ */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
              isMenuOpen || activeTab === 'stats'
                ? 'text-amber-400 font-extrabold'
                : 'text-slate-300 hover:text-white opacity-80 hover:opacity-100'
            }`}
          >
            {(isMenuOpen || activeTab === 'stats') && (
              <span className="absolute top-0 w-10 h-1 bg-amber-400 rounded-b-full shadow-sm" />
            )}
            <div
              className={`p-1.5 rounded-xl transition-transform duration-200 ${
                isMenuOpen || activeTab === 'stats' ? 'bg-amber-500 text-slate-950 scale-110 shadow-md' : 'bg-white/10'
              }`}
            >
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 truncate max-w-full font-medium">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Popup for Sottomenù */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-2xl p-4 space-y-3 text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Sottomenù EATIOF
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 py-1">
              {/* Sottomenù Item 1: Famiglia */}
              {onOpenFamilyModal && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFamilyModal();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-750 font-bold text-xs text-slate-200 flex items-center gap-3 border border-slate-700/60"
                >
                  <Users className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-white">Famiglia</div>
                    <div className="text-[11px] font-normal text-slate-400">Gestisci profili e permessi familiari</div>
                  </div>
                </button>
              )}

              {/* Sottomenù Item 2: Impostazioni */}
              {onOpenSettingsModal && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettingsModal();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-750 font-bold text-xs text-slate-200 flex items-center gap-3 border border-slate-700/60"
                >
                  <Settings className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-white">Impostazioni</div>
                    <div className="text-[11px] font-normal text-slate-400">Stato database, reset e preferenze</div>
                  </div>
                </button>
              )}

              {/* Sottomenù Item 3: Statistiche */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onSelectTab('stats');
                }}
                className={`w-full text-left p-3 rounded-xl font-bold text-xs flex items-center gap-3 border ${
                  activeTab === 'stats'
                    ? 'bg-[#f37021]/20 border-[#f37021] text-[#f37021]'
                    : 'bg-slate-800 border-slate-700/60 text-slate-200'
                }`}
              >
                <BarChart3 className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-white">Statistiche</div>
                  <div className="text-[11px] font-normal text-slate-400">Valori nutrizionali e bilanciamento pasti</div>
                </div>
              </button>

              {/* Logout Option */}
              {onLogout && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 font-bold text-xs text-rose-300 flex items-center gap-3 mt-1"
                >
                  <LogOut className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>Disconnetti account</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
