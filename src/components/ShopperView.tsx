import React, { useState } from 'react';
import { ShoppingListItem, PantryItem } from '../types';
import {
  toggleShoppingItem,
  addManualShoppingItem,
  removeShoppingItem,
  clearCheckedItems,
  autoCheckPantryItemsInShoppingList
} from '../lib/dataService';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Check,
  Search,
  Tag,
  Refrigerator,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface ShopperViewProps {
  shoppingList: ShoppingListItem[];
  pantryItems?: PantryItem[];
  onNavigateToPlanner: () => void;
  onNavigateToPantry?: () => void;
}

export const ShopperView: React.FC<ShopperViewProps> = ({
  shoppingList,
  pantryItems = [],
  onNavigateToPlanner,
  onNavigateToPantry
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newUnit, setNewUnit] = useState('pz');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [pantryNotice, setPantryNotice] = useState<string | null>(null);

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    await toggleShoppingItem(itemId, currentStatus);
  };

  const handleAutoDeductPantry = async () => {
    const checked = await autoCheckPantryItemsInShoppingList(pantryItems);
    if (checked > 0) {
      setPantryNotice(`✅ Spuntati ${checked} ingredienti già presenti in Frigo/Dispensa!`);
    } else {
      setPantryNotice(`ℹ️ Nessun nuovo ingrediente trovato in frigo tra quelli da comprare.`);
    }
    setTimeout(() => setPantryNotice(null), 4000);
  };

  const handleAddManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;

    await addManualShoppingItem(
      newIngredientName.trim(),
      newQuantity.trim() || '1',
      newUnit.trim() || 'pz'
    );

    setNewIngredientName('');
    setNewQuantity('1');
    setNewUnit('pz');
    setShowAddForm(false);
  };

  const handleClearChecked = async () => {
    if (confirm('Rimuovere tutti gli ingredienti già spuntati dalla lista?')) {
      setIsClearing(true);
      await clearCheckedItems();
      setIsClearing(false);
    }
  };

  // Filter & Search Logic
  const filteredItems = shoppingList.filter((item) => {
    const matchesSearch = item.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.recipeSources && item.recipeSources.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())));
    
    if (!matchesSearch) return false;

    if (filter === 'pending') return !item.isChecked;
    if (filter === 'completed') return item.isChecked;
    return true;
  });

  const totalItems = shoppingList.length;
  const completedCount = shoppingList.filter((i) => i.isChecked).length;
  const pendingCount = totalItems - completedCount;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-[10px]">
      {/* Top Banner */}
      <div className="bg-[#191970] rounded-lg p-[10px] text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]">
          <div>
            <div className="flex items-center gap-[5px] mb-[5px]">
              <span className="p-[5px] rounded-md bg-[#f37021]">
                <ShoppingBag className="w-5 h-5 text-white" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#f37021]">
                Vista Shopper (Padre)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">Lista della Spesa Smart</h2>
            <p className="text-xs text-slate-300 mt-[5px] max-w-xl">
              Spunta gli ingredienti direttamente al supermercato. I dati si aggiornano in tempo reale con la famiglia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-[6px]">
            <button
              onClick={handleAutoDeductPantry}
              className="p-[8px] px-[12px] rounded-md bg-[#10b981] hover:bg-[#047857] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-[5px] shrink-0"
              title="Spunta automaticamente gli ingredienti già presenti in Frigo o Dispensa"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Confronta con Frigo</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-[8px] px-[12px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-[5px] shrink-0"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>{showAddForm ? 'Chiudi Form' : 'Aggiungi Articolo'}</span>
            </button>
          </div>
        </div>

        {pantryNotice && (
          <div className="mt-[10px] p-[8px] px-[12px] bg-emerald-500/20 border border-emerald-400/50 rounded-md text-emerald-100 text-xs font-bold flex items-center justify-between">
            <span>{pantryNotice}</span>
            <button onClick={() => setPantryNotice(null)} className="text-white hover:text-emerald-200 font-extrabold">×</button>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-[10px] pt-[10px] border-t border-white/20">
          <div className="flex items-center justify-between text-xs font-bold mb-[5px]">
            <span>Avanzamento Spesa ({completedCount}/{totalItems})</span>
            <span className="text-[#f37021]">{progressPercent}% Completato</span>
          </div>
          <div className="w-full bg-[#191970]/80 rounded-full h-3 p-[2px] overflow-hidden border border-white/20">
            <div
              className="bg-[#f37021] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Manual Add Item Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddManualItem}
          className="bg-white rounded-lg p-[10px] border-2 border-[#191970]/30 shadow-md space-y-[10px] animate-fade-in"
        >
          <h3 className="text-sm font-extrabold text-[#191970] flex items-center gap-[5px] p-[5px]">
            <Plus className="w-4 h-4 text-[#f37021]" />
            Aggiungi Articolo Extra
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-[5px] p-[5px]">
            <div className="sm:col-span-2 space-y-[5px]">
              <label className="text-[11px] font-bold text-slate-600 block">
                Nome Ingrediente / Prodotto
              </label>
              <input
                type="text"
                placeholder="es. Pane casareccio, Latte, Detersivo..."
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                required
                className="w-full p-[5px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#f37021]"
              />
            </div>

            <div className="space-y-[5px]">
              <label className="text-[11px] font-bold text-slate-600 block">Quantità</label>
              <input
                type="text"
                placeholder="es. 2 o 500"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-full p-[5px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#f37021]"
              />
            </div>

            <div className="space-y-[5px]">
              <label className="text-[11px] font-bold text-slate-600 block">Unità</label>
              <input
                type="text"
                placeholder="es. pz, g, L, confezioni"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full p-[5px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#f37021]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-[5px] p-[5px]">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-[5px] px-[10px] rounded-md text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="p-[5px] px-[10px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-xs shadow-sm"
            >
              Aggiungi alla Lista
            </button>
          </div>
        </form>
      )}

      {/* Filter and Actions Toolbar */}
      <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-[10px]">
        {/* Search */}
        <div className="relative w-full sm:w-64 p-[5px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
          <input
            type="text"
            placeholder="Cerca nella spesa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 p-[5px] bg-slate-50 border border-slate-200 rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#f37021]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-[5px] w-full sm:w-auto overflow-x-auto p-[5px]">
          <button
            onClick={() => setFilter('all')}
            className={`p-[5px] px-[10px] rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-[#191970] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tutti ({totalItems})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`p-[5px] px-[10px] rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
              filter === 'pending'
                ? 'bg-[#f37021] text-white shadow-sm'
                : 'bg-[#f37021]/10 text-[#f37021] hover:bg-[#f37021]/20'
            }`}
          >
            Da Comprare ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`p-[5px] px-[10px] rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Comprati ({completedCount})
          </button>
        </div>

        {/* Clear Completed */}
        {completedCount > 0 && (
          <button
            onClick={handleClearChecked}
            disabled={isClearing}
            className="p-[5px] px-[10px] rounded-md bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors flex items-center gap-[5px] shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Pulisci Spuntati</span>
          </button>
        )}
      </div>

      {/* Shopping List Items Container */}
      {totalItems === 0 ? (
        <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm text-center space-y-[10px]">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#191970]/10 flex items-center justify-center text-[#191970] my-[5px]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-[#191970] text-base">La lista della spesa è vuota!</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto p-[5px]">
            Usa la vista <strong>Planner</strong> per scegliere il menu della settimana e clicca su "Genera Spesa", oppure aggiungi articoli manualmente qui sopra.
          </p>
          <button
            onClick={onNavigateToPlanner}
            className="p-[10px] px-[15px] rounded-md bg-[#f37021] hover:bg-[#d95d13] text-white font-bold text-xs shadow-sm transition-colors inline-flex items-center gap-[5px]"
          >
            <span>Vai al Planner Settimanale</span>
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm text-center text-slate-500 text-xs font-semibold">
          Nessun ingrediente corrisponde al filtro selezionato.
        </div>
      ) : (
        <div className="space-y-[10px]">
          {filteredItems.map((item) => {
            const pantryMatch = pantryItems.find((p) => {
              const pName = p.name.toLowerCase().trim();
              const sName = item.ingredientName.toLowerCase().trim();
              return pName.includes(sName) || sName.includes(pName);
            });

            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id, item.isChecked)}
                className={`group rounded-lg p-[10px] border transition-all cursor-pointer flex items-center justify-between gap-[10px] shadow-sm ${
                  item.isChecked
                    ? 'bg-slate-100/80 border-slate-300 opacity-60'
                    : 'bg-white hover:bg-[#191970]/5 border-slate-200 hover:border-[#191970]'
                }`}
              >
                {/* Checkbox & Details */}
                <div className="flex items-center gap-[10px] min-w-0 p-[5px]">
                  {/* BIG TOUCH CHECKBOX */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(item.id, item.isChecked);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                      item.isChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                        : 'border-slate-300 bg-slate-50 group-hover:border-[#191970]'
                    }`}
                    aria-label={`Spunta ${item.ingredientName}`}
                  >
                    {item.isChecked && <Check className="w-6 h-6 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 p-[5px]">
                    <div className="flex items-center gap-[5px] flex-wrap">
                      <h4
                        className={`font-black text-[#191970] text-sm sm:text-base leading-tight transition-all ${
                          item.isChecked ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {item.ingredientName}
                      </h4>

                      {item.addedManually && (
                        <span className="text-[10px] font-bold px-[5px] py-[2px] rounded-full bg-[#f37021]/10 text-[#f37021] border border-[#f37021]/30">
                          Extra
                        </span>
                      )}

                      {pantryMatch && (
                        <span
                          onClick={(e) => {
                            if (onNavigateToPantry) {
                              e.stopPropagation();
                              onNavigateToPantry();
                            }
                          }}
                          className="text-[10px] font-black px-[6px] py-[2px] rounded bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-[3px] hover:bg-emerald-100"
                          title="Clicca per gestire il frigorifero"
                        >
                          <Refrigerator className="w-3 h-3 text-emerald-600" />
                          <span>In {pantryMatch.category || 'Frigo'}: {pantryMatch.quantity} {pantryMatch.unit}</span>
                        </span>
                      )}
                    </div>

                  {/* Quantity & Sources */}
                  <div className="flex items-center gap-[5px] mt-[5px] text-xs text-slate-600 font-semibold flex-wrap">
                    <span className="bg-slate-100 text-slate-800 p-[5px] px-[8px] rounded-md border border-slate-200 font-extrabold">
                      Quantità: {item.quantity} {item.unit}
                    </span>

                    {item.recipeSources && item.recipeSources.length > 0 && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-[5px] truncate max-w-xs">
                        <Tag className="w-3 h-3 text-slate-400" />
                        Per: {item.recipeSources.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeShoppingItem(item.id);
                }}
                className="p-[5px] rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                title="Rimuovi dalla lista"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};
