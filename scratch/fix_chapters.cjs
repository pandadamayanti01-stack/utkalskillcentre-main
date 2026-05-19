const admin = require('firebase-admin');

const serviceAccount = require('../utkalskillcentre-4ed1afa2f6a3.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('chapters')
    .where('subject', '==', 'social_science')
    .get();
  
  let fixedCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let titleStr = '';
    if (typeof data.title === 'string') {
        titleStr = data.title;
    } else if (data.title && typeof data.title === 'object') {
        titleStr = data.title.en || data.title.or || '';
    }

    if (titleStr.toLowerCase().includes('physical science') || 
        titleStr.toLowerCase().includes('physical_science') ||
        (data.pdfUrl && data.pdfUrl.toLowerCase().includes('physical%20science')) ||
        (data.pdfUrl && data.pdfUrl.toLowerCase().includes('physical_science'))) {
      
      console.log('Fixing:', doc.id, titleStr);
      await db.collection('chapters').doc(doc.id).update({
        subject: 'physical_science'
      });
      fixedCount++;
    }
  }

  console.log("Done. Fixed", fixedCount, "chapters");
}

run();
