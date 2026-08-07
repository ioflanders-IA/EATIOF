import React, { useState } from 'react';
import { PantryItem } from '../types';
import { savePantryItem, deletePantryItem, autoCheckPantryItemsInShoppingList } from '../lib/dataService';
import {
  Refrigerator,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  AlertCircle,
  Archive,
  Snowflake,
  Leaf
} from 'lucide-react';

interface PantryViewProps {
  pantryItems: PantryItem[];
  onNavigateToShopper?: () => void;
}

export const PantryView: React.FC<PantryViewProps> = ({
  pantryItems,
  onNavigateToShopper
}) => {
  const [activeCategory, setActiveCategory] = useState<'Tutti' | 'Frigo' | 'Dispensa' | 'Freezer' | 'Freschi'>('Tutti');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number | string>('1');
  const [unit, setUnit] = useState('pz');
  const [category, setCategory] = useState<'Frigo' | 'Dispensa' | 'Freezer' | 'Freschi'>('Frigo');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [matchNotification, setMatchNotification] = useState<string | null>(null);

  const cleanCategory = (cat?: string): 'Frigo' | 'Dispensa' | 'Freezer' | 'Freschi' => {
    if (!cat) return 'Frigo';
    if (cat.includes('Freezer')) return 'Freezer';
    if (cat.includes('Dispensa')) return 'Dispensa';
    if (cat.includes('Freschi')) return 'Freschi';
    return 'Frigo';
  };

  const getCategoryBorderColor = (cat?: string) => {
    const cleaned = cleanCategory(cat);
    switch (cleaned) {
      case 'Frigo':
        return 'border-2 border-sky-500';
      case 'Dispensa':
        return 'border-2 border-amber-500';
      case 'Freezer':
        return 'border-2 border-cyan-400';
      case 'Freschi':
        return 'border-2 border-emerald-500';
      default:
        return 'border-2 border-slate-300';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const itemToSave: PantryItem = {
      id: editingItem ? editingItem.id : `pantry-${Date.now()}`,
      name: name.trim(),
      quantity: quantity || 1,
      unit: unit.trim() || 'pz',
      category: cleanCategory(category),
      ...(expirationDate ? { expirationDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {})
    };

    resetForm();

    try {
      await savePantryItem(itemToSave);
    } catch (err) {
      console.warn('Errore durante il salvataggio:', err);
    }
  };

  const resetForm = () => {
    setName('');
    setQuantity('1');
    setUnit('pz');
    setCategory('Frigo');
    setExpirationDate('');
    setNotes('');
    setShowAddForm(false);
    setEditingItem(null);
  };

  const handleEdit = (item: PantryItem) => {
    setEditingItem(item);
    setName(item.name);
    setQuantity(item.quantity);
    setUnit(item.unit);
    setCategory(cleanCategory(item.category));
    setExpirationDate(item.expirationDate || '');
    setNotes(item.notes || '');
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, itemName: string) => {
    await deletePantryItem(id, itemName);
  };

  const handleQuickQtyChange = async (item: PantryItem, delta: number) => {
    const currentNum = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 1;
    const newQty = Math.max(0, currentNum + delta);
    if (newQty === 0) {
      await handleDelete(item.id, item.name);
    } else {
      await savePantryItem({ ...item, quantity: newQty });
    }
  };

  const handleAutoCrossCheck = async () => {
    const count = await autoCheckPantryItemsInShoppingList(pantryItems);
    if (count > 0) {
      setMatchNotification(`✅ Spuntati automaticamente ${count} ingredienti già presenti in Frigo/Dispensa!`);
    } else {
      setMatchNotification(`ℹ️ Nessun ingrediente spuntato. Tutti i prodotti in spesa sono già aggiornati o non presenti.`);
    }
    setTimeout(() => setMatchNotification(null), 4000);
  };

  // Filtered items
  const filteredItems = pantryItems.filter((item) => {
    const itemCat = cleanCategory(item.category);
    const matchesCategory = activeCategory === 'Tutti' || itemCat === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-[5px] relative pb-[60px]">
      {/* Top Bar: Categories + Search */}
      <div className="bg-white rounded-lg p-[5px] border border-slate-200 shadow-sm space-y-[5px]">
        {/* Row 1: Categories Bar */}
        <div className="grid grid-cols-5 gap-[3px] w-full">
          {(
            [
              { id: 'Tutti', label: 'Tutti', Icon: null },
              { id: 'Frigo', label: 'Frigo', Icon: Refrigerator },
              { id: 'Dispensa', label: 'Dispensa', Icon: Archive },
              { id: 'Freezer', label: 'Freezer', Icon: Snowflake },
              { id: 'Freschi', label: 'Freschi', Icon: Leaf }
            ] as const
          ).map(({ id, label, Icon }) => {
            const isSelected = activeCategory === id;
            return (
              <button
                key={id}
                onClick={() => setActiveCategory(id as any)}
                className={`py-[6px] px-[2px] rounded-md text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-[3px] w-full truncate ${
                  isSelected
                    ? 'bg-[#10b981] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {id === 'Tutti' ? (
                  <span
                    className={`text-[10px] font-black shrink-0 ${
                      isSelected ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {pantryItems.length}
                  </span>
                ) : (
                  Icon && <Icon className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Search Input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-[8px] top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cerca alimento in frigo/dispensa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-[28px] pr-[10px] py-[5px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          />
        </div>
      </div>

      {/* Auto-check notification alert */}
      {matchNotification && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-[10px] text-emerald-800 text-xs font-bold shadow-sm flex items-center justify-between animate-fade-in">
          <span>{matchNotification}</span>
          <button
            onClick={() => setMatchNotification(null)}
            className="text-emerald-600 hover:text-emerald-900 font-extrabold text-sm px-[6px]"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Add / Edit */}
      {showAddForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-lg p-[12px] border-2 border-[#10b981]/40 shadow-md space-y-[10px] animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-[6px]">
            <h3 className="text-sm font-extrabold text-[#191970] flex items-center gap-[6px]">
              <Refrigerator className="w-4 h-4 text-[#10b981]" />
              <span>{editingItem ? 'Modifica Alimento in Giacenza' : 'Aggiungi Alimento a Frigo / Dispensa'}</span>
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Annulla
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[8px]">
            <div className="sm:col-span-2 space-y-[4px]">
              <label className="text-[11px] font-bold text-slate-700 block">
                Nome Alimento / Ingrediente *
              </label>
              <input
                type="text"
                placeholder="es. Pecorino Romano, Spaghetti, Passata, Uova..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-[6px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              />
            </div>

            <div className="space-y-[4px]">
              <label className="text-[11px] font-bold text-slate-700 block">
                Posizione / Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-[6px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              >
                <option value="Frigo">Frigorifero</option>
                <option value="Dispensa">Dispensa</option>
                <option value="Freezer">Freezer</option>
                <option value="Freschi">Prodotti Freschi</option>
              </select>
            </div>

            <div className="space-y-[4px]">
              <label className="text-[11px] font-bold text-slate-700 block">
                Quantità
              </label>
              <input
                type="text"
                placeholder="es. 500, 2, 1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-[6px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              />
            </div>

            <div className="space-y-[4px]">
              <label className="text-[11px] font-bold text-slate-700 block">
                Unità di misura
              </label>
              <input
                type="text"
                placeholder="es. g, kg, pz, bottiglie, pacchi"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full p-[6px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              />
            </div>

            <div className="space-y-[4px]">
              <label className="text-[11px] font-bold text-slate-700 block">
                Data di Scadenza (Opzionale)
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full p-[6px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              />
            </div>
          </div>

          <div className="space-y-[4px]">
            <label className="text-[11px] font-bold text-slate-700 block">
              Note o Dettagli Marca/Varietà (Opzionale)
            </label>
            <input
              type="text"
              placeholder="es. Olio Sabina DOP appena aperto, taglia grossa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-[6px] px-[10px] bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
            />
          </div>

          <div className="flex items-center justify-end gap-[6px] pt-[4px]">
            <button
              type="button"
              onClick={resetForm}
              className="px-[10px] py-[6px] rounded-md bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-[12px] py-[6px] rounded-md bg-[#10b981] text-white font-extrabold text-xs shadow-sm hover:bg-[#047857]"
            >
              {editingItem ? 'Aggiorna Giacenza' : 'Salva in Dispensa'}
            </button>
          </div>
        </form>
      )}

      {/* Pantry List Items - 2 items per row, 5px gap */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-[20px] text-center text-slate-500 space-y-[6px]">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Nessun alimento trovato in questa sezione.</p>
          <p className="text-[11px] text-slate-400">
            Usa il tasto "+" in alto per catalogare i cibi presenti in frigo o dispensa.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-[5px]">
          {filteredItems.map((item) => {
            const borderClass = getCategoryBorderColor(item.category);
            const itemCatName = cleanCategory(item.category);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-lg ${borderClass} p-[5px] shadow-sm flex flex-col justify-between hover:shadow-md transition-all space-y-[5px] min-w-0`}
              >
                {/* Header info */}
                <div className="min-w-0 space-y-[2px]">
                  <div className="flex items-start justify-between gap-[4px]">
                    <h4 className="text-xs sm:text-sm font-extrabold text-[#191970] truncate leading-tight" title={item.name}>
                      {item.name}
                    </h4>
                    <span className="px-[4px] py-[1px] rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {itemCatName}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-bold">
                    Giacenza: <span className="text-[#10b981] font-black">{item.quantity} {item.unit}</span>
                  </p>

                  {item.expirationDate && (
                    <p className="flex items-center gap-[3px] text-[10px] font-bold text-amber-700 bg-amber-50 px-[4px] py-[1px] rounded border border-amber-200 w-fit">
                      <Calendar className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      <span className="truncate">Scade: {item.expirationDate}</span>
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-[10px] text-slate-500 italic truncate" title={item.notes}>
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-[4px] pt-[4px] border-t border-slate-100">
                  <div className="flex items-center bg-slate-100 rounded border border-slate-200 p-[1px]">
                    <button
                      onClick={() => handleQuickQtyChange(item, -1)}
                      className="w-5 h-5 flex items-center justify-center font-black text-xs text-slate-600 hover:bg-white rounded transition-colors"
                      title="Riduci quantità"
                    >
                      -
                    </button>
                    <span className="px-[4px] text-xs font-black text-[#191970]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuickQtyChange(item, 1)}
                      className="w-5 h-5 flex items-center justify-center font-black text-xs text-slate-600 hover:bg-white rounded transition-colors"
                      title="Aumenta quantità"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-[2px]">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-[4px] text-slate-400 hover:text-[#191970] hover:bg-slate-100 rounded transition-colors"
                      title="Modifica"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-[4px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Rimuovi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button in bottom right area */}
      <div className="fixed bottom-[72px] right-[14px] z-30 flex items-center gap-[5px] pointer-events-auto">
        <button
          onClick={() => {
            if (showAddForm) resetForm();
            else setShowAddForm(true);
          }}
          className="bg-[#10b981] text-white shadow-xl hover:bg-[#047857] active:scale-95 transition-all rounded-full p-[9px] sm:px-[12px] sm:py-[7px] font-extrabold text-xs flex items-center gap-[5px] border border-white/30"
          title={showAddForm ? 'Chiudi' : 'Nuovo Alimento'}
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">{showAddForm ? 'Chiudi' : 'Nuovo Alimento'}</span>
        </button>
      </div>
    </div>
  );
};


