import React from 'react';
import { UserRole } from '../types';
import { Calendar, ChefHat, ShoppingBag, Refrigerator } from 'lucide-react';

interface BottomMainbarProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  shoppingCount?: number;
}

export const BottomMainbar: React.FC<BottomMainbarProps> = ({
  currentRole,
  onSelectRole,
  shoppingCount = 0
}) => {
  const navItems = [
    {
      id: 'planner' as UserRole,
      label: 'Io (Planner)',
      shortLabel: 'Planner',
      icon: Calendar,
      color: 'text-[#f37021]'
    },
    {
      id: 'chef' as UserRole,
      label: 'Madre (Chef)',
      shortLabel: 'Madre',
      icon: ChefHat,
      color: 'text-amber-400'
    },
    {
      id: 'shopper' as UserRole,
      label: 'Padre (Shopper)',
      shortLabel: 'Padre',
      icon: ShoppingBag,
      color: 'text-orange-400',
      badge: shoppingCount
    },
    {
      id: 'pantry' as UserRole,
      label: 'Frigo & Dispensa',
      shortLabel: 'Frigo',
      icon: Refrigerator,
      color: 'text-emerald-400'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#191970] text-white border-t border-[#0d0d40] shadow-2xl md:hidden">
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = currentRole === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectRole(item.id)}
              className={`relative flex flex-col items-center justify-center h-full transition-all duration-200 ${
                isActive
                  ? 'text-white font-extrabold'
                  : 'text-slate-300 hover:text-white opacity-80 hover:opacity-100'
              }`}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute top-0 w-10 h-1 bg-[#f37021] rounded-b-full shadow-sm" />
              )}

              <div className="relative mt-1">
                <div
                  className={`p-1.5 rounded-xl transition-transform duration-200 ${
                    isActive ? 'bg-[#f37021] text-white scale-110 shadow-md' : 'bg-white/10'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Optional Badge */}
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-[#191970]">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-1 truncate max-w-full font-medium">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
