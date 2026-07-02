import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('D:/WebApp/utkalskillcentre-main/utkal-admin-sdk.json', 'utf8')
);

const adminApp = initializeApp({
  credential: cert(serviceAccount)
});

// Pass 'utkal-prod' as the database ID
const db = getFirestore(adminApp, 'utkal-prod');

async function check() {
  console.log('--- Checking database monthly_tests values ---');
  
  // July 2026 tests
  const julySnap = await db.collection('monthly_tests')
    .where('month', '==', 'July')
    .where('year', '==', 2026)
    .get();
    
  console.log(`\nJuly 2026 tests found: ${julySnap.size}`);
  julySnap.docs.slice(0, 5).forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Class: "${data.class}" | Month: "${data.month}" | Year: ${data.year} | Status: "${data.status}"`);
  });

  // May 2026 tests
  const maySnap = await db.collection('monthly_tests')
    .where('month', '==', 'May')
    .where('year', '==', 2026)
    .get();
    
  console.log(`\nMay 2026 tests found: ${maySnap.size}`);
  maySnap.docs.slice(0, 5).forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Class: "${data.class}" | Month: "${data.month}" | Year: ${data.year} | Status: "${data.status}"`);
  });

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
