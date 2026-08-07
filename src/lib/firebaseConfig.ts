import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

// Configuration loaded from firebase-applet-config.json, environment variables, or exact user config
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || 'AIzaSyDqFuzRTjjlFi4Brl36yEt5T51uUf5Of34',
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || 'eatiof.firebaseapp.com',
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || 'eatiof',
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || 'eatiof.firebasestorage.app',
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || '1098152315777',
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || '1:1098152315777:web:a4740da41f1989d2ed3680'
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
const rtdb = null; // Disattivato RTDB per utilizzare Firestore come unico database per la sincronizzazione multi-browser
let auth: Auth | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

let isFirebaseConfigured = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // Initialize Firestore
    const dbId = metaEnv.VITE_FIREBASE_DATABASE_ID || (firebaseConfigJson as any).firestoreDatabaseId;
    if (dbId && dbId !== '(default)') {
      try {
        db = getFirestore(app, dbId);
        console.log(`🔥 Firestore connesso al database: ${dbId}`);
      } catch (e) {
        console.warn(`⚠️ Impossibile connettersi al database ${dbId}, fallback a (default):`, e);
        db = getFirestore(app);
      }
    } else {
      db = getFirestore(app);
      console.log('🔥 Firestore connesso al database (default)');
    }

    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Persistence configuration warning:', err);
    });
    isFirebaseConfigured = true;
    console.log('🔥 Firebase Firestore & Auth pronti per il progetto:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('⚠️ Impossibile inizializzare Firebase, utilizzo LocalStorage Fallback:', error);
  }
} else {
  console.log('ℹ️ Firebase API Key non configurata. EATIOF funziona in modalità LocalStorage Sincronizzata.');
}

export { app, db, rtdb, auth, googleProvider, isFirebaseConfigured, firebaseConfig };

