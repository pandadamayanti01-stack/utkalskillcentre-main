const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function run() {
  try {
    const snap = await db.collection('chapters').get();
    snap.forEach(doc => {
      const d = doc.data();
      const c = (d.class || '').toLowerCase().trim();
      if (c.includes('1') || c.includes('2')) {
        console.log(`Class: ${c} | Subject: ${d.subject} | Title: ${d.title}`);
      }
    });
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
