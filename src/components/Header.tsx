import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Calendar, Refrigerator, ShoppingCart, Menu, Settings, Users, BarChart3, LogOut, User as UserIcon } from 'lucide-react';
import { EatiofLogo } from './EatiofLogo';
import { User } from 'firebase/auth';
import { ActiveUserSession } from '../lib/familyAuthService';

export type MainNavTab = 'recipes' | 'calendar' | 'pantry' | 'stats' | 'shopper';

interface HeaderProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  currentUser?: User | null;
  activeSession?: ActiveUserSession | null;
  onOpenFamilyModal?: () => void;
  onOpenSettingsModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  activeSession,
  onOpenFamilyModal,
  onOpenSettingsModal,
  onLogout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName =
    activeSession?.displayName ||
    currentUser?.displayName ||
    activeSession?.email?.split('@')[0] ||
    currentUser?.email?.split('@')[0] ||
    'Utente Famiglia';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative z-40 bg-[#191970] text-white border-b border-[#191970]/80 shadow-lg">
      <div className="max-w-4xl mx-auto p-[10px]">
        {/* Top Brand & User Bar */}
        <div className="flex items-center justify-between mb-0 md:mb-[8px] gap-2">
          <div className="flex items-center gap-[10px]">
            <EatiofLogo className="h-9 sm:h-11 w-auto" whiteTextColor={true} />
          </div>

          <div className="flex items-center gap-[6px]">
            {/* Active User Badge */}
            <div className="flex items-center gap-1.5 text-xs px-1 py-1">
              <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-200 truncate max-w-[120px] sm:max-w-[180px]">
                {displayName}
              </span>
            </div>
          </div>
        </div>

        {/* Mainbar Navigation (hidden on mobile, visible on desktop) */}
        <div className="hidden md:flex items-center justify-between gap-2 p-[4px] bg-[#0d0d40] rounded-xl border border-slate-700 relative">
          {/* Main 4 Navigation Items */}
          <div className="flex-1 grid grid-cols-4 gap-[5px]">
            {/* 1. RICETTE */}
            <button
              id="main-nav-recipes"
              onClick={() => { onSelectTab('recipes'); setIsMenuOpen(false); }}
              className={`flex items-center justify-center gap-[6px] p-[8px] rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'recipes'
                  ? 'bg-[#f37021] text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Ricette</span>
            </button>

            {/* 2. CALENDARIO */}
            <button
              id="main-nav-calendar"
              onClick={() => { onSelectTab('calendar'); setIsMenuOpen(false); }}
              className={`flex items-center justify-center gap-[6px] p-[8px] rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'calendar'
                  ? 'bg-[#f37021] text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">Calendario</span>
            </button>

            {/* 3. SPESE */}
            <button
              id="main-nav-shopper"
              onClick={() => { onSelectTab('shopper'); setIsMenuOpen(false); }}
              className={`flex items-center justify-center gap-[6px] p-[8px] rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'shopper'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-amber-300 hover:text-white hover:bg-amber-950/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Spese</span>
            </button>

            {/* 4. DISPENSA */}
            <button
              id="main-nav-pantry"
              onClick={() => { onSelectTab('pantry'); setIsMenuOpen(false); }}
              className={`flex items-center justify-center gap-[6px] p-[8px] rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'pantry'
                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                  : 'text-emerald-300 hover:text-white hover:bg-emerald-950/50'
              }`}
            >
              <Refrigerator className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Dispensa</span>
            </button>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] h-6 bg-slate-700 mx-0.5" />

          {/* 4. LINEETTE PER SOTTOMENÙ (Hamburger Icon ☰) */}
          <div className="relative" ref={menuRef}>
            <button
              id="main-nav-submenu-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-[8px] px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                isMenuOpen || activeTab === 'stats'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title="Apri Sottomenù"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {/* Submenu Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5 flex flex-col gap-1 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                {/* Sottomenù Item 1: Famiglia */}
                {onOpenFamilyModal && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenFamilyModal();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Famiglia</span>
                  </button>
                )}

                {/* Sottomenù Item 2: Impostazioni */}
                {onOpenSettingsModal && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenSettingsModal();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Impostazioni</span>
                  </button>
                )}

                {/* Sottomenù Item 3: Statistiche */}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSelectTab('stats');
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2.5 ${
                    activeTab === 'stats'
                      ? 'bg-[#f37021]/20 text-[#f37021] border border-[#f37021]/40'
                      : 'hover:bg-slate-800 text-slate-200 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Statistiche</span>
                </button>

                {/* Optional Logout in Submenu */}
                {onLogout && (
                  <div className="pt-1 mt-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Esci dall'app</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
