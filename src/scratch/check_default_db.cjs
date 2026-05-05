const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

// Initialize with (default) database
if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkDefault() {
    console.log("Checking (default) database...");
    try {
        const collections = await db.listCollections();
        console.log("Collections found:", collections.map(c => c.id).join(', '));
        
        if (collections.length > 0) {
            for (const col of collections) {
                const snap = await db.collection(col.id).limit(1).get();
                console.log(`- ${col.id}: ${snap.size > 0 ? 'HAS DATA' : 'EMPTY'}`);
            }
        } else {
            console.log("No collections found in (default) database.");
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkDefault();
