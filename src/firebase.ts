import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfig from './firebase-applet-config.json';

console.log("Firebase config loaded from firebase-applet-config.json");

const app = initializeApp(firebaseConfig);

// Use the firestoreDatabaseId from the config if it exists
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch(console.error);
export const storage = getStorage(app);
