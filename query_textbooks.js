import admin from 'firebase-admin';
import fs from 'fs';

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
  console.log("Querying textbooks...");
  const snapshot = await db.collection('textbooks').get();
  console.log(`Total textbooks documents: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Document ID: ${doc.id}`);
    console.log(`  Class: ${data.class}`);
    console.log(`  Subject: ${data.subject}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Keys: ${Object.keys(data).join(', ')}`);
  });
}

main().catch(console.error);
