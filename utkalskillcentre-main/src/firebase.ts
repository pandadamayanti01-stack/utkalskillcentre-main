import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser, 
  setPersistence, 
  browserLocalPersistence 
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

// Import the real Firebase configuration
import { firebaseConfig } from './firebase-config';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Set local persistence so users stay logged in even after closing the app
setPersistence(auth, browserLocalPersistence).catch((err) => {
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

export function safeJsonStringify(obj: any) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  });
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
  console.error('Firestore Error Detailed: ', safeJsonStringify(errInfo));
  throw new Error(safeJsonStringify(errInfo));
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