const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

// We need the service account key to bypass rules and see what's actually there
// But for now, let's just see if we can identify where payments are stored.

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
let serviceAccount;
if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
} else {
    console.error("Service account key not found at", serviceAccountPath);
    process.exit(1);
}

const dbId = env.VITE_FIREBASE_DATABASE_ID || '(default)';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseId: dbId
});

const db = admin.firestore(dbId);

async function checkCollections() {
    const collections = ['chapters', 'transactions', 'payments', 'subscriptions', 'user_transactions'];
    
    for (const colName of collections) {
        try {
            const snapshot = await db.collection(colName).limit(5).get();
            console.log(`\nCollection: ${colName}`);
            console.log(`Count: ${snapshot.size}`);
            snapshot.forEach(doc => {
                console.log(`- ID: ${doc.id}`);
                console.log(`  Data:`, JSON.stringify(doc.data()).substring(0, 100) + '...');
            });
        } catch (err) {
            console.error(`Error reading ${colName}:`, err.message);
        }
    }

    // Check admin user
    try {
        const adminPhone = '+919337956168';
        const userSnapshot = await db.collection('users').where('phoneNumber', '==', adminPhone).get();
        console.log(`\nAdmin Phone Check (+919337956168):`);
        if (userSnapshot.empty) {
            console.log("No user found with this phone number.");
        } else {
            userSnapshot.forEach(doc => {
                console.log(`- UID: ${doc.id}`);
                console.log(`  Data:`, doc.data());
            });
        }
    } catch (err) {
        console.error("Error checking admin user:", err.message);
    }
}

checkCollections();
