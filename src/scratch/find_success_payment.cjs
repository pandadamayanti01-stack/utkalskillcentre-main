const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore(app, dbId);

async function findSuccessPayment() {
    try {
        const snap = await db.collection('payments').where('status', '==', 'success').get();
        snap.forEach(doc => {
            console.log(`- ID: ${doc.id}`);
            console.log(`  Data:`, JSON.stringify(doc.data()));
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}

findSuccessPayment();
