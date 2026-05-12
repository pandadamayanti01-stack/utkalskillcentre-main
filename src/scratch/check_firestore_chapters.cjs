const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'utkal-prod';

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "utkalskillcentre"
});

const db = getFirestore(app, dbId);

async function run() {
  console.log("🔍 Checking Firestore 'chapters' collection...");
  try {
    const snap = await db.collection('chapters').get();
    console.log(`Found ${snap.size} chapter(s) inside Firestore:`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id} | Class: ${data.class} | Subject: ${data.subject} | Title: "${data.title}"`);
      if (data.notes) {
        console.log(`  └─ Notes Length: ${data.notes.length} chars (Snippet: "${data.notes.slice(0, 80)}...")`);
      }
    });
  } catch (err) {
    console.error("❌ Error retrieving chapters:", err.message);
  }
  process.exit(0);
}

run();
