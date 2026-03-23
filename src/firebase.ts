import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser, 
  setPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDocFromServer 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from AI Studio / Environment
// @ts-ignore
const injectedConfig = typeof __FIREBASE_CONFIG__ !== 'undefined' ? __FIREBASE_CONFIG__ : {};

const firebaseConfig = {
  apiKey: injectedConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: injectedConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: injectedConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: injectedConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: injectedConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: injectedConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: injectedConfig.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  
  // FIXED: Explicitly pointing to your AI Studio Database ID
  firestoreDatabaseId: injectedConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9'
};

// Initialize Firebase SDK
let app;
try {
  if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === 'TODO_KEYHERE') {
    app = initializeApp({ apiKey: 'placeholder', projectId: 'placeholder' });
  } else {
    app = initializeApp(firebaseConfig);
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  app = initializeApp({ apiKey: 'placeholder', projectId: 'placeholder' });
}

// Initialize Services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Set session-only persistence to prevent "stale session" bugs
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.error("Auth persistence error:", err);
});

// Auth helper functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => {
  // Clear local cache on logout to ensure a clean state for the next user
  localStorage.clear();
  return signOut(auth);
};

// Firestore Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    }
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Health Check
async function verifyDatabaseConnection() {
  try {
    // Attempting a server-side fetch to bypass any local cache
    await getDocFromServer(doc(db, 'system_settings', 'config'));
    console.log("✅ [Firebase] Success: Connected to AI Studio Database.");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('not found'))) {
      console.error("❌ [Firebase] Error: Could not reach Firestore. Check Database ID or Authorized Domains.");
    }
  }
}
verifyDatabaseConnection();

export type { FirebaseUser };