import React, { useState } from 'react';
import { PantryItem } from '../types';
import { savePantryItem, deletePantryItem, autoCheckPantryItemsInShoppingList } from '../lib/dataService';
import {
  Refrigerator,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  Sparkles,
  PackageCheck,
  Calendar,
  AlertCircle,
  Tag
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const itemToSave: PantryItem = {
      id: editingItem ? editingItem.id : `pantry-${Date.now()}`,
      name: name.trim(),
      quantity: quantity || 1,
      unit: unit.trim() || 'pz',
      category,
      ...(expirationDate ? { expirationDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {})
    };

    await savePantryItem(itemToSave);

    resetForm();
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
    setCategory(item.category || 'Frigo');
    setExpirationDate(item.expirationDate || '');
    setNotes(item.notes || '');
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, itemName: string) => {
    if (confirm(`Rimuovere "${itemName}" dalla dispensa/frigo?`)) {
      await deletePantryItem(id);
    }
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
    const matchesCategory = activeCategory === 'Tutti' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const frigoCount = pantryItems.filter((i) => i.category === 'Frigo').length;
  const dispensaCount = pantryItems.filter((i) => i.category === 'Dispensa').length;
  const freezerCount = pantryItems.filter((i) => i.category === 'Freezer').length;
  const freschiCount = pantryItems.filter((i) => i.category === 'Freschi').length;

  return (
    <div className="space-y-[10px]">
      {/* Banner Frigorifero & Dispensa */}
      <div className="bg-gradient-to-r from-[#10b981] to-[#047857] rounded-lg p-[12px] text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]">
          <div>
            <div className="flex items-center gap-[6px] mb-[4px]">
              <span className="p-[5px] rounded-md bg-white/20 backdrop-blur-sm">
                <Refrigerator className="w-5 h-5 text-white" />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                Giacenze di Casa
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Frigorifero & Dispensa
            </h2>
            <p className="text-xs text-emerald-100 mt-[4px] max-w-xl leading-relaxed">
              Cataloga gli alimenti e le scorte già presenti in casa. I dati vengono usati per confrontare e defalcare la lista della spesa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-[6px]">
            <button
              onClick={handleAutoCrossCheck}
              className="p-[8px] px-[12px] rounded-md bg-white text-[#047857] font-extrabold text-xs shadow-sm hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-[6px]"
            >
              <Sparkles className="w-4 h-4 text-[#10b981]" />
              <span>Confronta con Spesa</span>
            </button>

            <button
              onClick={() => {
                if (showAddForm) resetForm();
                else setShowAddForm(true);
              }}
              className="p-[8px] px-[12px] rounded-md bg-[#191970] text-white font-extrabold text-xs shadow-sm hover:bg-[#0f0f4a] active:scale-95 transition-all flex items-center gap-[6px]"
            >
              <Plus className="w-4 h-4 text-[#f37021]" />
              <span>{showAddForm ? 'Chiudi' : 'Nuovo Alimento'}</span>
            </button>
          </div>
        </div>

        {/* Categories Bar & Quick Stats */}
        <div className="mt-[12px] pt-[10px] border-t border-white/20 flex flex-wrap items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[12px] text-xs font-bold text-white/90">
            <span>Totale: <strong className="text-white font-black">{pantryItems.length}</strong> alimenti</span>
            <span>Frigo: <strong className="text-white font-black">{frigoCount}</strong></span>
            <span>Dispensa: <strong className="text-white font-black">{dispensaCount}</strong></span>
          </div>

          {onNavigateToShopper && (
            <button
              onClick={onNavigateToShopper}
              className="text-xs font-bold text-emerald-100 underline hover:text-white flex items-center gap-[4px]"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Vai alla Lista Spesa</span>
            </button>
          )}
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
                <option value="Frigo">❄️ Frigorifero</option>
                <option value="Dispensa">🥫 Dispensa</option>
                <option value="Freezer font-bold">🧊 Freezer</option>
                <option value="Freschi">🥬 Prodotti Freschi</option>
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

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-lg p-[10px] border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-[8px]">
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-[4px] w-full sm:w-auto">
          {(['Tutti', 'Frigo', 'Dispensa', 'Freezer', 'Freschi'] as const).map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-[10px] py-[5px] rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#10b981] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat === 'Frigo' && '❄️ '}
                {cat === 'Dispensa' && '🥫 '}
                {cat === 'Freezer' && '🧊 '}
                {cat === 'Freschi' && '🥬 '}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
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

      {/* Pantry List Items */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {filteredItems.length === 0 ? (
          <div className="p-[20px] text-center text-slate-500 space-y-[6px]">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Nessun alimento trovato in questa sezione.</p>
            <p className="text-[11px] text-slate-400">
              Usa il tasto "Nuovo Alimento" in alto per catalogare i cibi presenti in frigo o dispensa.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-[10px] sm:p-[12px] flex items-center justify-between gap-[10px] hover:bg-slate-50/80 transition-colors"
            >
              {/* Item Info */}
              <div className="flex items-start gap-[10px] min-w-0">
                <span className="p-[6px] rounded-lg bg-emerald-50 text-[#10b981] border border-emerald-200 shrink-0">
                  <Refrigerator className="w-5 h-5" />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-[6px] flex-wrap">
                    <h4 className="text-sm font-extrabold text-[#191970] truncate">{item.name}</h4>
                    <span className="px-[6px] py-[2px] rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.category || 'Frigo'}
                    </span>
                    {item.expirationDate && (
                      <span className="flex items-center gap-[3px] text-[10px] font-bold text-amber-700 bg-amber-50 px-[6px] py-[2px] rounded border border-amber-200">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>Scade: {item.expirationDate}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-bold mt-[2px]">
                    Giacenza: <span className="text-[#10b981] font-black">{item.quantity} {item.unit}</span>
                  </p>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-[2px]">
                      "{item.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Actions & Quantity Adjust */}
              <div className="flex items-center gap-[6px] shrink-0">
                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200 p-[2px]">
                  <button
                    onClick={() => handleQuickQtyChange(item, -1)}
                    className="w-6 h-6 flex items-center justify-center font-black text-xs text-slate-600 hover:bg-white rounded transition-colors"
                    title="Riduci quantità"
                  >
                    -
                  </button>
                  <span className="px-[6px] text-xs font-black text-[#191970]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuickQtyChange(item, 1)}
                    className="w-6 h-6 flex items-center justify-center font-black text-xs text-slate-600 hover:bg-white rounded transition-colors"
                    title="Aumenta quantità"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => handleEdit(item)}
                  className="p-[6px] text-slate-500 hover:text-[#191970] hover:bg-slate-100 rounded-md transition-colors"
                  title="Modifica"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(item.id, item.name)}
                  className="p-[6px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Rimuovi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
