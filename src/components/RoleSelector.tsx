import React from 'react';
import { UserRole } from '../types';
import { USER_PROFILES } from '../data/initialData';
import { Calendar, ChefHat, ShoppingBag, Refrigerator, ArrowRight, Package } from 'lucide-react';

interface RoleSelectorProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onSelectRole }) => {
  const familyProfiles = USER_PROFILES.filter((p) => p.id !== 'pantry');
  const pantryProfile = USER_PROFILES.find((p) => p.id === 'pantry');

  const getRoleIcon = (roleId: UserRole) => {
    switch (roleId) {
      case 'planner':
        return <Calendar className="w-5 h-5 text-[#f37021]" />;
      case 'chef':
        return <ChefHat className="w-5 h-5 text-[#191970]" />;
      case 'shopper':
        return <ShoppingBag className="w-5 h-5 text-[#f37021]" />;
      case 'pantry':
        return <Refrigerator className="w-5 h-5 text-emerald-600" />;
    }
  };

  const isPantrySelected = currentRole === 'pantry';

  return (
    <div className="space-y-3 mb-[12px]">
      {/* SECTION 1: Ruoli della Famiglia */}
      <div className="bg-white rounded-xl p-[12px] border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f37021]" />
            Membri della Famiglia
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
          {familyProfiles.map((profile) => {
            const isSelected = currentRole === profile.id;
            return (
              <div
                key={profile.id}
                onClick={() => onSelectRole(profile.id)}
                className={`group relative cursor-pointer rounded-lg p-[10px] border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#f37021] bg-[#f37021]/5 ring-2 ring-[#f37021]/30 shadow-md'
                    : 'border-slate-200 bg-white hover:border-[#f37021]/40 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-[5px] gap-[5px]">
                    <div className="flex items-center gap-[6px]">
                      <span className="p-[5px] rounded-md bg-[#191970]/10 border border-[#191970]/20 shrink-0">
                        {getRoleIcon(profile.id)}
                      </span>
                      <div>
                        <h3 className="font-bold text-[#191970] text-sm">{profile.name}</h3>
                        <p className="text-[11px] font-semibold text-slate-500">{profile.title}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-[10px] p-[2px]">
                    {profile.description}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRole(profile.id);
                  }}
                  className={`w-full p-[6px] rounded-lg text-xs font-bold flex items-center justify-center gap-[5px] transition-colors ${
                    isSelected
                      ? 'bg-[#191970] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-[#191970] hover:text-white text-slate-800'
                  }`}
                >
                  <span>Entra come {profile.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Tasto Separato Frigorifero & Dispensa */}
      {pantryProfile && (
        <div
          onClick={() => onSelectRole('pantry')}
          className={`cursor-pointer rounded-xl p-[12px] border transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-3 ${
            isPantrySelected
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 shadow-md'
              : 'border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 to-teal-50/40 hover:border-emerald-400 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 shadow-xs">
              <Refrigerator className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-emerald-950 text-sm">
                  {pantryProfile.name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800">
                  Giacenze di Casa
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {pantryProfile.description}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectRole('pantry');
            }}
            className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
              isPantrySelected
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Apri Frigorifero & Dispensa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
