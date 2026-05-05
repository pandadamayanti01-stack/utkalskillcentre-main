const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = '(default)';

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore(app, dbId);

async function checkCollections() {
    const collections = [
        'users', 'chapters', 'questions', 'test_results', 'quiz_results', 
        'payments', 'transactions', 'ai_usage', 'notifications', 
        'public_profiles', 'subscriptions', 'monthly_tests', 
        'monthly_test_submissions', 'textbooks', 'system_settings', 
        'settings', 'daily_challenges', 'user_progress', 'friendships', 
        'user_locks', 'support_tickets', 'tutor_queries'
    ];
    
    console.log(`Checking project: ${serviceAccount.project_id}, database: ${dbId}`);
    
    for (const colName of collections) {
        try {
            const snapshot = await db.collection(colName).limit(3).get();
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
}

checkCollections();
