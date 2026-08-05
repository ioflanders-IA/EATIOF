import React from 'react';
import { UserRole } from '../types';
import { USER_PROFILES } from '../data/initialData';
import { Database, Calendar, ChefHat, ShoppingBag, Refrigerator, ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';
import { isFirebaseConfigured } from '../lib/firebaseConfig';
import { EatiofLogo } from './EatiofLogo';
import { User } from 'firebase/auth';
import { ActiveUserSession } from '../lib/familyAuthService';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  currentUser?: User | null;
  activeSession?: ActiveUserSession | null;
  onOpenFamilyModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  currentUser,
  activeSession,
  onOpenFamilyModal,
  onLogout
}) => {
  const getProfileIcon = (id: UserRole) => {
    switch (id) {
      case 'planner':
        return <Calendar className="w-4 h-4 text-[#f37021]" />;
      case 'chef':
        return <ChefHat className="w-4 h-4 text-white" />;
      case 'shopper':
        return <ShoppingBag className="w-4 h-4 text-[#f37021]" />;
      case 'pantry':
        return <Refrigerator className="w-4 h-4 text-[#10b981]" />;
    }
  };

  const displayName =
    activeSession?.displayName ||
    currentUser?.displayName ||
    activeSession?.email?.split('@')[0] ||
    currentUser?.email?.split('@')[0] ||
    'Utente Famiglia';

  return (
    <header className="sticky top-0 z-40 bg-[#191970] text-white border-b border-[#191970]/80 shadow-lg">
      <div className="max-w-4xl mx-auto p-[10px]">
        {/* Top Brand Bar */}
        <div className="flex items-center justify-between mb-[8px] gap-2">
          <div className="flex items-center gap-[10px]">
            <EatiofLogo className="h-9 sm:h-11 w-auto" whiteTextColor={true} />
          </div>

          <div className="flex items-center gap-[6px]">
            {/* Active User Badge */}
            <div className="flex items-center gap-1.5 bg-[#0d0d40] border border-amber-500/30 rounded-xl px-2.5 py-1 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-200 truncate max-w-[100px] sm:max-w-[140px]">
                {displayName}
              </span>
            </div>

            {/* Family Admin Account Button */}
            {onOpenFamilyModal && (
              <button
                onClick={onOpenFamilyModal}
                className="p-[6px] px-[8px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all text-xs flex items-center gap-[4px] font-semibold border border-slate-700"
                title="Gestione Famiglia"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Famiglia</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-[6px] px-[10px] rounded-xl bg-[#f37021] hover:bg-[#d95d13] text-white transition-all text-xs flex items-center gap-[5px] font-bold shadow-xs border border-amber-400/30"
                title="Disconnetti account"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Esci</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar - Family Roles + Separated Frigorifero & Dispensa */}
        <div className="hidden md:flex items-center gap-2 p-[4px] bg-[#0d0d40] rounded-xl border border-slate-700">
          {/* Family Profiles Group (Planner, Chef, Shopper) */}
          <div className="flex-1 grid grid-cols-3 gap-[5px]">
            {USER_PROFILES.filter((p) => p.id !== 'pantry').map((profile) => {
              const isActive = currentRole === profile.id;
              return (
                <button
                  key={profile.id}
                  id={`profile-nav-${profile.id}`}
                  onClick={() => onSelectRole(profile.id)}
                  className={`flex items-center justify-center gap-[6px] p-[6px] rounded-lg text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#f37021] text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="p-[2px] rounded bg-white/20">{getProfileIcon(profile.id)}</span>
                  <span className="truncate">{profile.name}</span>
                </button>
              );
            })}
          </div>

          {/* Vertical Separator */}
          <div className="w-[1px] h-6 bg-slate-700 mx-1" />

          {/* Standalone Frigorifero & Dispensa Button */}
          <button
            id="profile-nav-pantry"
            onClick={() => onSelectRole('pantry')}
            className={`flex items-center justify-center gap-[6px] p-[6px] px-3 rounded-lg text-xs font-bold transition-all duration-200 border ${
              currentRole === 'pantry'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60 hover:text-white'
            }`}
          >
            <Refrigerator className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Frigorifero & Dispensa</span>
          </button>
        </div>
      </div>
    </header>
  );
};


