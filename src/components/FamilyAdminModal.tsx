import React, { useState, useEffect } from 'react';
import { FamilyConfig, FamilyMember } from '../types';
import { getFamilyConfig, saveFamilyConfig, signInWithGoogle, logoutFamilyUser } from '../lib/familyAuthService';
import { ShieldCheck, UserCheck, Key, Mail, CheckCircle, LogOut, Lock, X, Save, User as UserIcon, Users, Plus, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface FamilyAdminModalProps {
  currentUser: User | null;
  onClose: () => void;
  onUserChanged: (user: User | null) => void;
}

export const FamilyAdminModal: React.FC<FamilyAdminModalProps> = ({
  currentUser,
  onClose,
  onUserChanged
}) => {
  const [config, setConfig] = useState<FamilyConfig | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states per Madre e Padre (legacy / dedicati)
  const [madreEmail, setMadreEmail] = useState('');
  const [madrePass, setMadrePass] = useState('');
  const [padreEmail, setPadreEmail] = useState('');
  const [padrePass, setPadrePass] = useState('');

  // Per simulazione login Amministratore (se la popup Google viene bloccata nell'iframe)
  const [simulatedAdminEmail, setSimulatedAdminEmail] = useState('');

  useEffect(() => {
    async function loadData() {
      // Carica subito da localStorage se presente per zero attesa visiva
      const localCached = localStorage.getItem('eatiof_family_config');
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (parsed && parsed.members) {
            setConfig(parsed);
            setMembers(parsed.members);
            setMadreEmail(parsed.madre?.email || '');
            setPadreEmail(parsed.padre?.email || '');
            setLoading(false);
          }
        } catch (e) {}
      }

      const data = await getFamilyConfig();
      setConfig(data);
      setMembers(data.members || []);
      setMadreEmail(data.madre?.email || '');
      setPadreEmail(data.padre?.email || '');
      setLoading(false);
    }
    loadData();
  }, []);

  const handleAddMember = () => {
    const nextIndex = members.length + 1;
    const newMember: FamilyMember = {
      id: `member-${Date.now()}`,
      name: `Membro ${nextIndex}`,
      role: 'Commensale',
      gender: 'M',
      age: '',
      email: `membro${nextIndex}@eatiof.local`,
      password: '',
      hasPassword: false
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const handleMemberChange = (index: number, field: keyof FamilyMember, value: any) => {
    setMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteMember = (index: number) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onUserChanged(user);
        setSuccessMsg(`Accesso completato come Amministratore: ${user.email}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        'Popup Google bloccata o errore di autenticazione. Inserisci la tua email qui sotto per accedere come Admin.'
      );
    }
  };

  const handleSimulatedAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedAdminEmail.trim()) return;
    const fakeUser = {
      email: simulatedAdminEmail.trim(),
      displayName: simulatedAdminEmail.split('@')[0],
      uid: 'admin-' + Date.now()
    } as any;
    onUserChanged(fakeUser);
    setSuccessMsg(`Autenticato come Admin Famiglia (${simulatedAdminEmail})`);
  };

  const handleLogout = async () => {
    await logoutFamilyUser();
    onUserChanged(null);
    setSuccessMsg('Disconnessione effettuata.');
  };

  const handleSaveProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const currentAdminEmail = currentUser?.email || config?.adminEmail || 'andblasi@gmail.com';
      const updatedMembers = members.map((m) => {
        const passVal = m.password ? m.password.trim() : '';
        return {
          ...m,
          name: m.name.trim() || 'Membro Famiglia',
          role: m.role.trim() || 'Commensale',
          gender: m.gender || 'M',
          age: m.age !== undefined && m.age !== '' ? Number(m.age) : '',
          email: m.email ? m.email.trim() : '',
          hasPassword: Boolean(passVal || m.hasPassword),
          password: '' // non salviamo la password in chiaro sul config ma aggiorniamo il flag
        };
      });

      const newConfig: FamilyConfig = {
        adminEmail: currentAdminEmail,
        members: updatedMembers,
        madre: {
          email: madreEmail.trim() || 'madre@eatiof.local',
          hasPassword: Boolean(madrePass.trim() || config?.madre?.hasPassword),
          configuredAt: new Date().toISOString()
        },
        padre: {
          email: padreEmail.trim() || 'padre@eatiof.local',
          hasPassword: Boolean(padrePass.trim() || config?.padre?.hasPassword),
          configuredAt: new Date().toISOString()
        }
      };

      await saveFamilyConfig(newConfig);
      setConfig(newConfig);
      setSuccessMsg(`✅ Salvate le impostazioni per ${newConfig.members.length} membri con le relative credenziali!`);
      setMadrePass('');
      setPadrePass('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Errore nel salvataggio dei profili della famiglia.');
    } finally {
      setSaving(false);
    }
  };

  const isAdminAuthenticated = Boolean(currentUser);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-[5px]">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header - Clean White Header - 5px padding */}
        <div className="bg-white p-[5px] text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-[5px]">
            <div className="p-[5px] bg-[#f37021] rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Gestione Famiglia & Membri</h2>
              <p className="text-xs text-slate-500">
                Pannello Amministratore (Composizione, Ruoli & Credenziali)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-[5px] rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-[5px] max-h-[82vh] overflow-y-auto space-y-[5px]">
          {/* Notifications - 5px padding & gaps */}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 p-[5px] rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800">
              <div className="flex items-center gap-[5px]">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button onClick={() => setSuccessMsg(null)}>
                <X className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 p-[5px] rounded-xl flex items-center justify-between text-xs font-bold text-red-800">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)}>
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}

          {/* SECTION 1: Google Login for Admin - 5px padding & gaps */}
          <div className="bg-slate-50 rounded-xl p-[5px] border border-slate-200 space-y-[5px]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#191970] flex items-center gap-[5px]">
              <UserIcon className="w-4 h-4 text-[#f37021]" />
              <span>Stato Account Amministratore</span>
            </h3>

            {isAdminAuthenticated ? (
              <div className="flex items-center justify-between bg-white p-[5px] rounded-lg border border-slate-200">
                <div className="flex items-center gap-[5px]">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Google Avatar"
                      className="w-9 h-9 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#191970] text-white font-bold flex items-center justify-center text-sm">
                      {currentUser?.email?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-[6px]">
                      <span className="text-xs font-bold text-slate-900">
                        {currentUser?.displayName || 'Amministratore Famiglia'}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        Google Admin
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">
                      {currentUser?.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-[5px] text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold flex items-center gap-[5px] border border-red-200 transition-colors"
                  title="Disconnetti Account"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Esci</span>
                </button>
              </div>
            ) : (
              <div className="space-y-[5px]">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accedi con il tuo <strong>Account Google</strong> per gestire la composizione della famiglia e le credenziali.
                </p>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full p-[5px] bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-[5px]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Accedi con Google (Firebase Auth)</span>
                </button>

                {/* Fallback Form for iFrame environment - 5px gaps */}
                <form onSubmit={handleSimulatedAdminLogin} className="pt-[5px] border-t border-slate-200">
                  <p className="text-[11px] text-slate-500 mb-[4px]">
                    Oppure inserisci la tua email Google per attivare la sessione Admin:
                  </p>
                  <div className="flex gap-[5px]">
                    <input
                      type="email"
                      placeholder="es. andblasi@gmail.com"
                      value={simulatedAdminEmail}
                      onChange={(e) => setSimulatedAdminEmail(e.target.value)}
                      className="flex-1 p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f37021]"
                    />
                    <button
                      type="submit"
                      disabled={!simulatedAdminEmail.trim()}
                      className="p-[5px] px-[10px] bg-[#191970] text-white text-xs font-bold rounded-lg hover:bg-[#0d0d40] transition-colors disabled:opacity-50"
                    >
                      Entra Admin
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* SECTION 2: Members and Roles Management - 5px gaps & paddings */}
          {loading ? (
            <div className="text-center py-[20px]">
              <div className="w-8 h-8 border-3 border-[#f37021] border-t-transparent rounded-full animate-spin mx-auto mb-[5px]" />
              <p className="text-xs font-medium text-slate-500">
                Caricamento profili familiari...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfiles} className="space-y-[5px]">
              {/* Family Members List Card - 5px padding & gaps */}
              <div className="bg-slate-50 border border-slate-200 p-[5px] rounded-xl space-y-[5px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[5px]">
                    <Users className="w-4.5 h-4.5 text-[#f37021]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#191970]">
                      Membri della Famiglia ({members.length}) & Credenziali
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="p-[5px] px-[8px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-[5px] shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Aggiungi Membro</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Aggiungi nuovi membri alla famiglia. Per ciascun membro puoi definire il nome, il ruolo e le credenziali d'accesso (Email e Password) che potrà utilizzare per accedere all'applicazione.
                </p>

                <div className="space-y-[5px]">
                  {members.map((member, idx) => (
                    <div
                      key={member.id || idx}
                      className="bg-white border border-slate-200 p-[5px] rounded-xl flex flex-col gap-[5px] shadow-xs relative"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-[4px]">
                        <div className="flex items-center gap-[5px]">
                          <div className="w-6 h-6 rounded-full bg-[#191970] text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-extrabold text-slate-900">
                            {member.name || `Membro ${idx + 1}`} ({member.role || 'Commensale'})
                            {(member.gender || member.age) ? ` • ${member.gender === 'F' ? 'Donna' : member.gender === 'M' ? 'Uomo' : member.gender || ''}${member.age ? `, ${member.age} anni` : ''}` : ''}
                          </span>
                        </div>

                        {members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(idx)}
                            className="p-[5px] text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                            title="Rimuovi membro dalla famiglia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Fields grid: Nome, Ruolo, Sesso, Età, Email, Password - 5px gap */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-[5px]">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-[2px]">
                            Nome Membro
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                            placeholder="es. Andrea, Marco, Mamma"
                            className="w-full p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#f37021] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-[2px]">
                            Ruolo
                          </label>
                          <input
                            type="text"
                            value={member.role}
                            onChange={(e) => handleMemberChange(idx, 'role', e.target.value)}
                            placeholder="es. Planner, Chef, Shopper, Figlio"
                            className="w-full p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#f37021] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-[2px]">
                            Sesso
                          </label>
                          <select
                            value={member.gender || 'M'}
                            onChange={(e) => handleMemberChange(idx, 'gender', e.target.value)}
                            className="w-full p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#f37021] focus:outline-none"
                          >
                            <option value="M">Maschio (M)</option>
                            <option value="F">Femmina (F)</option>
                            <option value="Altro">Altro</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-[2px]">
                            Età (anni)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={member.age ?? ''}
                            onChange={(e) => handleMemberChange(idx, 'age', e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="es. 35"
                            className="w-full p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-bold focus:ring-2 focus:ring-[#f37021] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-[2px] flex items-center gap-[4px]">
                            <Mail className="w-3 h-3 text-[#f37021]" />
                            <span>Email Credenziale</span>
                          </label>
                          <input
                            type="email"
                            value={member.email || ''}
                            onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                            placeholder="membro@eatiof.local"
                            className="w-full p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f37021] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-[2px] flex items-center gap-[4px]">
                            <Lock className="w-3 h-3 text-[#f37021]" />
                            <span>Password Credenziale</span>
                          </label>
                          <input
                            type="password"
                            value={member.password || ''}
                            onChange={(e) => handleMemberChange(idx, 'password', e.target.value)}
                            placeholder={member.hasPassword ? '•••••••• (Salvata)' : 'Imposta password'}
                            className="w-full p-[5px] text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#f37021] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button - 5px padding */}
              <button
                type="submit"
                disabled={saving}
                className="w-full p-[5px] bg-white hover:bg-orange-50/60 border-2 border-[#f37021] text-[#f37021] font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-[5px] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#f37021]" />
                <span>
                  {saving ? 'Salvataggio in corso...' : 'Salva'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
