const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = '(default)';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseId: dbId
});

const db = admin.firestore();

async function listCollections() {
    try {
        const collections = await db.listCollections();
        console.log("Collections in database:", dbId);
        collections.forEach(collection => {
            console.log("-", collection.id);
        });
        
        if (collections.length === 0) {
            console.log("No collections found in this database.");
        }
    } catch (err) {
        console.error("Error listing collections:", err.message);
    }
}

listCollections();
