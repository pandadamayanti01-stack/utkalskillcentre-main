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
  console.log("Fetching users containing 'Anuradha'...");
  const snapshot = await db.collection('users').get();
  let found = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.toLowerCase().includes('anuradha')) {
      console.log(`\nUser Document ID: ${doc.id}`);
      console.log(JSON.stringify(data, null, 2));
      found++;
    }
  });
  console.log(`\nDone. Found ${found} matching users.`);
}

main().catch(console.error);
