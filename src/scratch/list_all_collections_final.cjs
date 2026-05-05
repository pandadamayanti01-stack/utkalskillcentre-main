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

async function listAllCollections() {
    console.log(`Listing ALL collections for project: ${serviceAccount.project_id}, database: ${dbId}`);
    try {
        const collections = await db.listCollections();
        console.log("Found collections:");
        for (const col of collections) {
            const snap = await col.limit(1).get();
            console.log(`- ${col.id} (${snap.size > 0 ? 'HAS DATA' : 'EMPTY'})`);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

listAllCollections();
