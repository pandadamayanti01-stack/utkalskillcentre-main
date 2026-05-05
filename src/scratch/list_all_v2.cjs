const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

// Initialize with Project ID from service account, no databaseId
if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listAll() {
    console.log("Listing all collections for project:", serviceAccount.project_id);
    try {
        const collections = await db.listCollections();
        console.log("Collections:", collections.map(c => c.id).join(', '));
        
        for (const col of collections) {
            const snap = await db.collection(col.id).limit(1).get();
            console.log(`- ${col.id}: ${snap.size > 0 ? 'HAS DATA' : 'EMPTY'}`);
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

listAll();
