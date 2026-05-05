const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

// Force the Project ID to be the ai-studio one
const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: dbId
});

const db = admin.firestore();

async function listAll() {
    console.log("Listing all collections for forced project ID:", dbId);
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
