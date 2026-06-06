const admin = require('firebase-admin');
const fs = require('fs');

const raw = fs.readFileSync("d:/WebApp/utkalskillcentre-main/utkal-admin-sdk.json", 'utf8');
const saInfo = JSON.parse(raw);

admin.initializeApp({
  credential: admin.credential.cert(saInfo)
});

const db = admin.firestore();
try {
  db.settings({ databaseId: 'utkal-prod' });
} catch (e) {
  console.log("Setting databaseId: " + e.message);
}

async function main() {
  const userId = 'aCATkYYUmhafu4HB12PvlInJj7S2'; // User ID for +911010101010
  
  console.log(`Checking daily_mcq_submissions for user ${userId}...`);
  const submissionsSnap = await db.collection('daily_mcq_submissions').where('userId', '==', userId).get();
  console.log(`Found ${submissionsSnap.size} submissions.`);
  submissionsSnap.forEach(doc => {
    console.log(`- Submission ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
  });

  console.log(`\nChecking user_progress for user ${userId}...`);
  const progressSnap = await db.collection('user_progress').where('userId', '==', userId).get();
  console.log(`Found ${progressSnap.size} progress entries.`);
  progressSnap.forEach(doc => {
    console.log(`- Progress ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
  });
}

main().catch(console.error);
