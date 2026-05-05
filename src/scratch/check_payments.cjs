const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyB53Wdjm_c8-55XeBuyxj5l_ozRxfc6Pbc',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'utkalskillcentre.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'utkalskillcentre-admin.firebasestorage.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '108736001473',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:108736001473:web:07f139fe64f7641c2c6b40'
};

const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, databaseId);

async function checkTransactions() {
  try {
    const querySnapshot = await getDocs(collection(db, 'transactions'));
    console.log(`Total transactions in transactions (Database: ${databaseId}): ${querySnapshot.size}`);
    querySnapshot.docs.slice(0, 10).forEach(doc => {
      console.log(`Tx ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });

    const paymentsSnapshot = await getDocs(collection(db, 'payments'));
    console.log(`Total payments in payments (Database: ${databaseId}): ${paymentsSnapshot.size}`);
    paymentsSnapshot.docs.slice(0, 10).forEach(doc => {
        console.log(`Payment ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
      });
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

checkTransactions();
