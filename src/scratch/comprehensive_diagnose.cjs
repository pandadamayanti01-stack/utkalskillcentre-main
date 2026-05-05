const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';

if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseId: dbId
    });
}

const db = admin.firestore();

async function diagnose() {
    console.log("Database ID:", dbId);
    
    // 1. Check if the database even exists/has data
    try {
        const configDoc = await db.collection('system_settings').doc('config').get();
        if (configDoc.exists) {
            console.log("Found system_settings/config. Data:", JSON.stringify(configDoc.data()));
        } else {
            console.log("system_settings/config NOT found.");
        }
    } catch (err) {
        console.error("Error reading config:", err.message);
    }

    // 2. List all collections again
    try {
        const collections = await db.listCollections();
        console.log("Collections found:", collections.map(c => c.id).join(', '));
    } catch (err) {
        console.error("Error listing collections:", err.message);
    }

    // 3. Look for ANY transaction-like collection
    const potentialCollections = ['transactions', 'payments', 'subscriptions', 'monthly_test_submissions', 'users', 'tutor_queries'];
    for (const col of potentialCollections) {
        try {
            const snap = await db.collection(col).limit(1).get();
            console.log(`Collection '${col}': ${snap.size > 0 ? 'HAS DATA' : 'EMPTY'}`);
        } catch (err) {
            console.log(`Collection '${col}': ERROR - ${err.message}`);
        }
    }

    // 4. Check for admin users
    try {
        const admins = await db.collection('users').where('role', '==', 'admin').get();
        console.log(`Admin users count: ${admins.size}`);
        admins.forEach(doc => {
            console.log(`- Admin: ${doc.data().name} (${doc.data().email || doc.data().phoneNumber})`);
        });
    } catch (err) {
        console.error("Error checking admins:", err.message);
    }
}

diagnose();
