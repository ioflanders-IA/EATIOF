import React, { useState, useEffect } from 'react';
import { EatiofLogo } from './EatiofLogo';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  saveUserSession,
  getFamilyConfig,
  ActiveUserSession
} from '../lib/familyAuthService';
import { FamilyMember } from '../types';
import { LogIn, UserCheck, ShieldAlert, Sparkles, KeyRound, Mail, UserPlus, Users, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (session: ActiveUserSession) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'google' | 'family'>('email');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [domainErrorMsg, setDomainErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      const cfg = await getFamilyConfig();
      if (cfg.members && cfg.members.length > 0) {
        setFamilyMembers(cfg.members);
      }
    }
    loadMembers();
  }, []);

  // Email / Password submission
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDomainErrorMsg(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        if (!email || !password) {
          setErrorMessage('Inserisci sia email che password.');
          setIsLoading(false);
          return;
        }
        const user = await signUpWithEmail(email, password, displayName);
        if (user) {
          const session: ActiveUserSession = {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.email?.split('@')[0] || 'Utente EATIOF',
            photoURL: user.photoURL,
            provider: 'email'
          };
          if (rememberMe) saveUserSession(session);
          onLoginSuccess(session);
        }
      } else {
        if (!email || !password) {
          setErrorMessage('Inserisci sia email che password.');
          setIsLoading(false);
          return;
        }
        const user = await signInWithEmail(email, password);
        if (user) {
          const session: ActiveUserSession = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Utente EATIOF',
            photoURL: user.photoURL,
            provider: 'email'
          };
          if (rememberMe) saveUserSession(session);
          onLoginSuccess(session);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Email o password non valide.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Questa email è già registrata. Prova ad accedere.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('La password deve contenere almeno 6 caratteri.');
      } else {
        setErrorMessage(err.message || 'Errore durante l\'autenticazione.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setDomainErrorMsg(null);
    setIsLoading(true);

    try {
      const user = await signInWithGoogle();
      if (user) {
        const session: ActiveUserSession = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Utente Google',
          photoURL: user.photoURL,
          provider: 'google'
        };
        if (rememberMe) saveUserSession(session);
        onLoginSuccess(session);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setDomainErrorMsg(
          'Il dominio attuale non è ancora stato autorizzato nelle impostazioni della console Firebase (auth/unauthorized-domain).'
        );
      } else {
        setErrorMessage(err.message || 'Errore durante l\'accesso con Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Family Profile Login
  const handleFamilyQuickLogin = (roleName: string, roleEmail: string) => {
    const session: ActiveUserSession = {
      uid: `fam-${roleName.toLowerCase()}-${Date.now()}`,
      email: roleEmail,
      displayName: roleName,
      photoURL: null,
      role: roleName.toLowerCase(),
      provider: 'family'
    };
    if (rememberMe) saveUserSession(session);
    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-transparent border-0 shadow-none overflow-hidden p-4 sm:p-6 flex flex-col gap-[10px]">
        
        {/* Logo Header (Title & subtitle removed as requested) */}
        <div className="text-center mb-[10px]">
          <div className="inline-block p-3 bg-slate-900/80 rounded-2xl shadow-inner">
            <EatiofLogo className="h-12 mx-auto" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl mb-[10px] text-xs sm:text-sm font-semibold gap-[10px]">
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setErrorMessage(null); setDomainErrorMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-[5px] ${
              activeTab === 'email'
                ? 'bg-[#f37021] text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setErrorMessage(null); setDomainErrorMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-[5px] ${
              activeTab === 'google'
                ? 'bg-[#f37021] text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Google
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('family'); setErrorMessage(null); setDomainErrorMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all text-center flex items-center justify-center gap-[5px] ${
              activeTab === 'family'
                ? 'bg-[#f37021] text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Famiglia
          </button>
        </div>

        {/* Unauthorized Domain Error Box */}
        {domainErrorMsg && (
          <div className="mb-[10px] p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs leading-relaxed flex flex-col gap-[10px]">
            <div className="flex items-center gap-[10px] font-bold text-amber-400 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              Dominio non autorizzato su Google Auth
            </div>
            <p className="text-slate-200">
              Per usare l'accesso con <strong>Google</strong> con il tuo progetto Firebase <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">eatiof</code>:
            </p>
            <ol className="list-decimal list-inside space-y-[5px] text-slate-300 pl-1">
              <li>Apri la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-semibold">Console Firebase</a> → Progetto <strong>eatiof</strong></li>
              <li>Vai su <strong>Authentication</strong> → Scheda <strong>Settings</strong> → <strong>Authorized Domains</strong></li>
              <li>Aggiungi il dominio: <span className="select-all font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/30 break-all">{window.location.hostname}</span></li>
            </ol>
            <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-[10px]">
              <p className="text-slate-300 font-semibold">
                💡 Nel frattempo puoi accedere subito usando:
              </p>
              <div className="flex gap-[10px]">
                <button
                  type="button"
                  onClick={() => { setActiveTab('email'); setDomainErrorMsg(null); }}
                  className="flex-1 py-1.5 bg-[#f37021] hover:bg-[#d95d13] text-white font-bold rounded-lg text-xs"
                >
                  Accedi con Email
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('family'); setDomainErrorMsg(null); }}
                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-xs"
                >
                  Accedi come Famiglia
                </button>
              </div>
            </div>
          </div>
        )}

        {/* General Error Box */}
        {errorMessage && (
          <div className="mb-[10px] p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-[10px]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* EMAIL & PASSWORD TAB */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailAuth} className="space-y-[10px]">
            {isRegisterMode && (
              <div className="space-y-[5px]">
                <label className="block text-xs font-semibold text-slate-300">
                  Nome / Soprannome
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Andrea, Mamma, Papà..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/90 border-2 border-slate-700 hover:border-slate-600 focus:border-[#f37021] rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none transition-colors shadow-inner"
                />
              </div>
            )}

            <div className="space-y-[5px]">
              <label className="block text-xs font-semibold text-slate-300">
                Indirizzo Email
              </label>
              <input
                type="email"
                required
                placeholder="nome@famiglia.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border-2 border-slate-700 hover:border-slate-600 focus:border-[#f37021] rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none transition-colors shadow-inner"
              />
            </div>

            <div className="space-y-[5px]">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border-2 border-slate-700 hover:border-slate-600 focus:border-[#f37021] rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none transition-colors shadow-inner"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <label className="flex items-center gap-[10px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border border-slate-600 text-[#f37021] focus:ring-[#f37021] w-4 h-4"
                />
                <span>Ricordami su questo dispositivo</span>
              </label>
            </div>

            {/* Accedi button: background removed, thicker orange border */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-transparent hover:bg-[#f37021]/15 border-2 border-[#f37021] text-[#f37021] font-black rounded-xl transition-all flex items-center justify-center gap-[10px] text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#f37021] border-t-transparent rounded-full animate-spin" />
              ) : isRegisterMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crea Account EATIOF
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Accedi a EATIOF
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMessage(null); }}
                className="text-xs text-amber-400 hover:underline font-medium"
              >
                {isRegisterMode
                  ? 'Hai già un account? Clicca qui per accedere'
                  : 'Non hai un account? Clicca qui per registrarti'}
              </button>
            </div>
          </form>
        )}

        {/* GOOGLE TAB */}
        {activeTab === 'google' && (
          <div className="space-y-[10px] py-2">
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              Accedi rapidamente utilizzando il tuo account Google. Ideale per la sincronizzazione immediata del ricettario e della spesa.
            </p>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-center text-xs text-slate-300 py-1">
              <label className="flex items-center gap-[10px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-900 border-0 text-[#f37021] focus:ring-[#f37021] w-4 h-4"
                />
                <span>Ricordami su questo dispositivo</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-[10px] text-sm disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#191970] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  Continua con Google
                </>
              )}
            </button>
          </div>
        )}

        {/* QUICK FAMILY PROFILES TAB */}
        {activeTab === 'family' && (
          <div className="space-y-[10px]">
            <p className="text-xs text-slate-300 text-center mb-2">
              Seleziona il tuo profilo familiare per entrare all'istante (ideale su tablet in cucina o uso condiviso):
            </p>

            <div className="space-y-[10px] max-h-64 overflow-y-auto pr-1">
              {familyMembers.length > 0 ? (
                familyMembers.map((member, i) => (
                  <button
                    key={member.id || i}
                    type="button"
                    onClick={() =>
                      handleFamilyQuickLogin(
                        `${member.name} (${member.role})`,
                        member.email || `membro${i + 1}@eatiof.local`
                      )
                    }
                    className="w-full p-3 bg-slate-900/80 hover:bg-slate-700/80 rounded-xl transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-[10px]">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">
                        👤
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          {member.name} ({member.role})
                        </div>
                        <div className="text-xs text-slate-400">
                          {member.email || `membro${i + 1}@eatiof.local`}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </button>
                ))
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleFamilyQuickLogin('Padre', 'padre@eatiof.local')}
                    className="w-full p-3 bg-slate-900/80 hover:bg-slate-700/80 rounded-xl transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-[10px]">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-sm">
                        👨‍🍳
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          Padre (Shopper & Spesa)
                        </div>
                        <div className="text-xs text-slate-400">padre@eatiof.local</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFamilyQuickLogin('Madre', 'madre@eatiof.local')}
                    className="w-full p-3 bg-slate-900/80 hover:bg-slate-700/80 rounded-xl transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-[10px]">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">
                        👩‍🍳
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          Madre (Chef & Cucina)
                        </div>
                        <div className="text-xs text-slate-400">madre@eatiof.local</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
                  </button>
                </>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-center text-xs text-slate-300 pt-2">
              <label className="flex items-center gap-[10px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-900 border-0 text-[#f37021] focus:ring-[#f37021] w-4 h-4"
                />
                <span>Ricordami su questo dispositivo</span>
              </label>
            </div>
          </div>
        )}

        {/* Footer Note (Cleaned up as requested: only "EATIOF v1.0") */}
        <div className="mt-[10px] pt-[10px] text-center border-t border-slate-800">
          <p className="text-[11px] text-slate-400 font-semibold">
            EATIOF v1.0
          </p>
        </div>

      </div>
    </div>
  );
}
