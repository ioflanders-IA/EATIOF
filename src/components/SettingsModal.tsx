import React, { useState } from 'react';
import { X, Settings, Database, RefreshCw, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { seedInitialData } from '../lib/dataService';
import { isFirebaseConfigured } from '../lib/firebaseConfig';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResetDemoData = async () => {
    if (!confirm('Vuoi ripristinare le ricette e i menu di base iniziali? Le tue modifiche non verranno perse ma i dati originali verranno ricaricati.')) {
      return;
    }
    setResetting(true);
    setMessage(null);
    try {
      await seedInitialData(true);
      setMessage('Dati di base ripristinati con successo!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      setMessage('Errore durante il ripristino dei dati.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col gap-[10px] p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-[10px] border-b border-slate-800">
          <div className="flex items-center gap-[10px]">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Impostazioni App</h3>
              <p className="text-xs text-slate-400">Preferenze e stato sincronizzazione EATIOF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-[10px] py-2">
          {/* Status Box */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-[10px]">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Stato Database</p>
                <p className="text-[11px] text-slate-400">
                  {isFirebaseConfigured ? 'Firebase Firestore attivo (Sincronizzato)' : 'Modalità Locale (Offline Storage)'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {isFirebaseConfigured ? 'Online' : 'Locale'}
            </span>
          </div>

          {/* Version Box */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Versione applicazione</span>
            <span className="font-mono font-bold text-amber-400">v1.0 (Famiglia)</span>
          </div>

          {/* Reset Action */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
              <RefreshCw className="w-4 h-4 text-[#f37021]" />
              Ripristino Dati Iniziali
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ricarica la lista completa delle ricette tradizionali (Laziali, Sabina e Classiche) e i menu predefiniti se dovessero mancare.
            </p>
            <button
              onClick={handleResetDemoData}
              disabled={resetting}
              className="w-full py-2 px-3 bg-[#f37021]/15 hover:bg-[#f37021]/30 border border-[#f37021]/40 text-[#f37021] font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
            >
              {resetting ? (
                <div className="w-4 h-4 border-2 border-[#f37021] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ripristina Ricette & Menu Iniziali</span>
                </>
              )}
            </button>
          </div>

          {message && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
