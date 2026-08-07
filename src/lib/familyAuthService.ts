import { db, auth, googleProvider } from './firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User
} from 'firebase/auth';
import { FamilyConfig, FamilyMember } from '../types';

const FAMILY_CONFIG_COLLECTION = 'family_config';
const CONFIG_DOC_ID = 'main_config';

const LOCAL_STORAGE_KEY = 'eatiof_family_config';
export const SESSION_STORAGE_KEY = 'eatiof_active_user_session';
export const FAMILY_CONFIG_CHANGED_EVENT = 'eatiof_family_config_changed';

export interface ActiveUserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string;
  provider: 'google' | 'email' | 'family';
}

// Valori predefiniti per la famiglia
export const defaultFamilyMembers: FamilyMember[] = [
  { id: 'member-1', name: 'Andrea (Io)', role: 'Planner', gender: 'M', age: 35, email: 'andblasi@gmail.com', hasPassword: true },
  { id: 'member-2', name: 'Madre', role: 'Chef', gender: 'F', age: 60, email: 'madre@eatiof.local', hasPassword: true },
  { id: 'member-3', name: 'Padre', role: 'Shopper', gender: 'M', age: 65, email: 'padre@eatiof.local', hasPassword: true },
  { id: 'member-4', name: 'Commensale 4', role: 'Commensale', gender: 'M', age: 25, email: 'commensale@eatiof.local', hasPassword: false }
];

export const defaultFamilyConfig: FamilyConfig = {
  adminEmail: 'andblasi@gmail.com',
  members: defaultFamilyMembers,
  madre: {
    email: 'madre@eatiof.local',
    hasPassword: true,
    configuredAt: new Date().toISOString()
  },
  padre: {
    email: 'padre@eatiof.local',
    hasPassword: true,
    configuredAt: new Date().toISOString()
  }
};

function ensureMembers(cfg: FamilyConfig): FamilyConfig {
  if (!cfg.members || !Array.isArray(cfg.members) || cfg.members.length === 0) {
    cfg.members = [
      { id: 'member-1', name: 'Andrea (Io)', role: 'Planner', email: cfg.adminEmail || 'andblasi@gmail.com' },
      { id: 'member-2', name: 'Madre', role: 'Chef', email: cfg.madre?.email || 'madre@eatiof.local' },
      { id: 'member-3', name: 'Padre', role: 'Shopper', email: cfg.padre?.email || 'padre@eatiof.local' },
      { id: 'member-4', name: 'Commensale 4', role: 'Commensale', email: 'commensale@eatiof.local' }
    ];
  }
  return cfg;
}

// Session local helpers
export function getSavedUserSession(): ActiveUserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserSession(session: ActiveUserSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Errore salvataggio sessione locale:', err);
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('Errore rimozione sessione locale:', err);
  }
}

// Login Amministratore con Google
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth non è attivo o non configurato.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      saveUserSession({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Utente Google',
        photoURL: result.user.photoURL,
        provider: 'google'
      });
    }
    return result.user;
  } catch (error: any) {
    console.error('Errore durante il Login Google:', error);
    throw error;
  }
}

// Login con Email e Password
export async function signInWithEmail(email: string, pass: string): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth non è attivo.');
  }
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      saveUserSession({
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName || email.split('@')[0],
        photoURL: res.user.photoURL,
        provider: 'email'
      });
    }
    return res.user;
  } catch (error: any) {
    console.error('Errore Login Email:', error);
    throw error;
  }
}

// Registrazione con Email e Password
export async function signUpWithEmail(email: string, pass: string, name: string): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase Auth non è attivo.');
  }
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (res.user) {
      if (name.trim()) {
        await updateProfile(res.user, { displayName: name.trim() });
      }
      saveUserSession({
        uid: res.user.uid,
        email: res.user.email,
        displayName: name.trim() || email.split('@')[0],
        photoURL: null,
        provider: 'email'
      });
    }
    return res.user;
  } catch (error: any) {
    console.error('Errore Registrazione Email:', error);
    throw error;
  }
}

// Signout da Firebase & Locale
export async function logoutFamilyUser(): Promise<void> {
  clearUserSession();
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Errore durante il logout Firebase:', e);
    }
  }
}

// Carica la configurazione dei profili familiari da Firestore o LocalStorage con fallback rapido
export async function getFamilyConfig(): Promise<FamilyConfig> {
  let cachedConfig: FamilyConfig | null = null;
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      cachedConfig = ensureMembers(JSON.parse(cached));
    } catch (e) {
      // ignore
    }
  }

  if (!db) {
    return cachedConfig || ensureMembers(defaultFamilyConfig);
  }

  try {
    const docRef = doc(db, FAMILY_CONFIG_COLLECTION, CONFIG_DOC_ID);
    const getDocPromise = getDoc(docRef);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout Firestore getDoc')), 1500)
    );

    const docSnap = await Promise.race([getDocPromise, timeoutPromise]);
    if (docSnap.exists()) {
      const remoteConfig = ensureMembers(docSnap.data() as FamilyConfig);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteConfig));
      return remoteConfig;
    }
  } catch (err) {
    // Normal fast fallback to local cache if network/Firestore takes longer to respond
    if (!cachedConfig) {
      console.log('Utilizzo configurazione di default in attesa di Firestore');
    }
  }

  return cachedConfig || ensureMembers(defaultFamilyConfig);
}

// Salva o aggiorna la configurazione dei profili della famiglia da parte dell'Amministratore
export async function saveFamilyConfig(config: FamilyConfig): Promise<void> {
  const verifiedConfig = ensureMembers(config);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(verifiedConfig));
  window.dispatchEvent(new CustomEvent(FAMILY_CONFIG_CHANGED_EVENT, { detail: verifiedConfig }));

  if (db) {
    // Sincronizzazione in background verso Firestore senza bloccare l'interfaccia o generare timeout visibili
    const docRef = doc(db, FAMILY_CONFIG_COLLECTION, CONFIG_DOC_ID);
    setDoc(docRef, verifiedConfig, { merge: true })
      .then(() => {
        console.log('✅ Configurazione profili familiari sincronizzata su Firestore!');
      })
      .catch((err) => {
        console.log('💾 Configurazione salvata in locale (sincronizzazione cloud in corso o offline):', err?.message || err);
      });
  }
}

