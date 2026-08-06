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
            <div
              className={`transition-transform duration-200 ${
                activeTab === 'recipes' ? 'text-[#f37021] scale-110' : 'text-slate-300'
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
            <div
              className={`transition-transform duration-200 ${
                activeTab === 'calendar' ? 'text-[#f37021] scale-110' : 'text-slate-300'
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
            <div
              className={`transition-transform duration-200 ${
                activeTab === 'pantry' ? 'text-emerald-400 scale-110' : 'text-slate-300'
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
            <div
              className={`transition-transform duration-200 ${
                isMenuOpen || activeTab === 'stats' ? 'text-amber-400 scale-110' : 'text-slate-300'
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
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs p-[10px]">
          <div className="bg-[#191970] border border-white/20 rounded-2xl p-[10px] space-y-[10px] text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-end pb-[2px]">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-[5px] rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-[10px]">
              {/* Sottomenù Item 1: Famiglia */}
              {onOpenFamilyModal && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFamilyModal();
                  }}
                  className="w-full text-left p-[10px] rounded-xl bg-transparent hover:bg-white/10 font-bold text-xs text-slate-200 flex items-center gap-[10px] border border-white/20 transition-colors"
                >
                  <Users className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-white">Famiglia</div>
                    <div className="text-[11px] font-normal text-slate-300">Gestisci profili e permessi familiari</div>
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
                  className="w-full text-left p-[10px] rounded-xl bg-transparent hover:bg-white/10 font-bold text-xs text-slate-200 flex items-center gap-[10px] border border-white/20 transition-colors"
                >
                  <Settings className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-white">Impostazioni</div>
                    <div className="text-[11px] font-normal text-slate-300">Stato database, reset e preferenze</div>
                  </div>
                </button>
              )}

              {/* Sottomenù Item 3: Statistiche */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onSelectTab('stats');
                }}
                className={`w-full text-left p-[10px] rounded-xl font-bold text-xs flex items-center gap-[10px] border transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-transparent border-[#f37021] text-[#f37021]'
                    : 'bg-transparent border-white/20 text-slate-200 hover:bg-white/10'
                }`}
              >
                <BarChart3 className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <div className="text-white">Statistiche</div>
                  <div className="text-[11px] font-normal text-slate-300">Valori nutrizionali e bilanciamento pasti</div>
                </div>
              </button>

              {/* Logout Option */}
              {onLogout && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left p-[10px] rounded-xl bg-transparent hover:bg-rose-500/20 border border-rose-500/50 font-bold text-xs text-rose-300 flex items-center gap-[10px] mt-[2px] transition-colors"
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
