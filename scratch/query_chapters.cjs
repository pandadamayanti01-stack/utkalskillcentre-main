const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('../utkal-admin-sdk.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('chapters')
    .where('class', 'in', ['class10', '10', 'Class 10'])
    .get();
  
  const results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    results.push({ id: doc.id, subject: data.subject, title: data.title });
  });

  fs.writeFileSync('scratch/chapters_debug.json', JSON.stringify(results, null, 2));
  console.log("Done. Saved", results.length, "chapters");
}

run();
