import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('D:/WebApp/utkalskillcentre-main/utkal-admin-sdk.json', 'utf8')
);

const adminApp = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(adminApp, 'utkal-prod');

async function check() {
  console.log('--- Printing first 10 chapter documents from Firestore ---');
  const snap = await db.collection('chapters').limit(15).get();
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`- title: "${data.title}"`);
    console.log(`- title_or: "${data.title_or}"`);
    console.log(`- title_en: "${data.title_en}"`);
    console.log(`- class: "${data.class}"`);
    console.log(`- subject: "${data.subject}"`);
    console.log('----------------------------------------------------');
  });
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
