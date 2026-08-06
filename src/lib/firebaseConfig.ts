import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

// Configuration loaded from firebase-applet-config.json, environment variables, or defaults
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || 'AIzaSyDqFuzRTjjlFi4Brl36yEt5T51uUf5Of34',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || 'eatiof.firebaseapp.com',
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || (firebaseConfigJson as any).databaseURL || 'https://eatiof-default-rtdb.firebaseio.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || 'eatiof',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || 'eatiof.firebasestorage.app',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || '1098152315777',
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || '1:1098152315777:web:a4740da41f1989d2ed3680'
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

let isFirebaseConfigured = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    // Prefer explicit env var VITE_FIREBASE_DATABASE_ID, otherwise use default database
    const dbId = metaEnv.VITE_FIREBASE_DATABASE_ID;
    try {
      db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    } catch (e) {
      console.warn('Fallback a database default:', e);
      db = getFirestore(app);
    }
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Persistence configuration warning:', err);
    });
    isFirebaseConfigured = true;
    console.log('🔥 Firebase Firestore e Auth connessi con successo per il progetto:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('⚠️ Impossibile inizializzare Firebase, utilizzo LocalStorage Fallback:', error);
  }
} else {
  console.log('ℹ️ Firebase API Key non configurata. EATIOF funziona in modalità LocalStorage Sincronizzata.');
}

export { app, db, auth, googleProvider, isFirebaseConfigured, firebaseConfig };

