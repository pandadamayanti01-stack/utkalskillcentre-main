const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

function isAnswerKey(title) {
  const lowerTitle = title.toLowerCase();
  return lowerTitle.includes('answer') || 
         lowerTitle.includes('key') || 
         (lowerTitle.includes('solution') && !lowerTitle.includes('dissolution') && !lowerTitle.includes('resolution')) || 
         lowerTitle.includes('uttaramala');
}

async function run() {
  try {
    const snap = await db.collection('chapters').where('class', '==', 'class8').get();
    console.log(`Total Class 8 chapters in Firestore: ${snap.size}`);
    
    let answerKeys = 0;
    let withNotes = 0;
    let missingNotes = 0;
    const missingList = [];

    snap.forEach(doc => {
      const d = doc.data();
      const title = d.title || '';
      
      if (isAnswerKey(title)) {
        answerKeys++;
      } else {
        if (d.notes && d.notes.trim().length > 50) {
          withNotes++;
        } else {
          missingNotes++;
          missingList.push({ id: doc.id, subject: d.subject, title });
        }
      }
    });

    console.log(`Answer Keys (skipped from notes): ${answerKeys}`);
    console.log(`Chapters requiring notes: ${snap.size - answerKeys}`);
    console.log(`Chapters with notes: ${withNotes}`);
    console.log(`Chapters missing notes: ${missingNotes}`);
    
    if (missingList.length > 0) {
      console.log('\nMissing Notes List:');
      missingList.forEach((item, index) => {
        console.log(`${index + 1}. Subject: ${item.subject} | Title: ${item.title} | ID: ${item.id}`);
      });
    } else {
      console.log('\nAll required Class 8 chapters have premium study notes!');
    }
    
    process.exit(0);
  } catch(e) {
    console.error("Verification failed:", e);
    process.exit(1);
  }
}
run();
