import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Hardcoded config for production deployment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAPEUIWH_P7jNUZI4--YFQ7HCaRulc4kXs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "utkalskillcentre.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "utkalskillcentre",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "utkalskillcentre.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "108736001473",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:108736001473:web:07f139fe64f7641c2c6b40",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z2M2G8LL46",
};

const app = initializeApp(firebaseConfig);
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9";

export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
