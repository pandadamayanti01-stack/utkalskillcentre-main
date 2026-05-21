const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'utkalskillcentre.firebasestorage.app'
});

const db = getFirestore(app, 'utkal-prod');
const bucket = admin.storage().bucket();

async function run() {
  console.log("Starting Storage to Firestore sync for Class 4 & 5...");
  
  try {
    const [files] = await bucket.getFiles({ prefix: 'Chapter Wise Text Book/' });
    let addedCount = 0;

    for (const file of files) {
      if (!file.name.endsWith('.pdf')) continue;
      
      const pathParts = file.name.split('/');
      if (pathParts.length < 4) continue;
      
      const classNameStr = pathParts[1]; // e.g., "Class 4"
      if (!classNameStr.includes('Class 4') && !classNameStr.includes('Class 5')) continue;
      
      const classId = classNameStr.replace(' ', '').toLowerCase(); // "class4" or "class5"
      const subject = pathParts[2].toLowerCase(); // e.g., "mathematics"
      const title = pathParts[3].replace('.pdf', ''); // e.g., "Chapter 6 - ଦୈର୍ଘ୍ୟ ମାପିବା"
      
      const encodedPath = encodeURI(file.name).replace(/\//g, '%2F');
      const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

      // Check if it already exists
      const query = await db.collection('chapters')
        .where('class', '==', classId)
        .where('subject', '==', subject)
        .where('title', '==', title)
        .get();

      if (query.empty) {
        // Add to Firestore
        await db.collection('chapters').add({
          class: classId,
          subject: subject,
          title: title,
          pdfUrl: pdfUrl,
          notes: "",
          mcqs: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Added: [${classId}] [${subject}] ${title}`);
        addedCount++;
      }
    }
    
    console.log(`\nSync Complete! Added ${addedCount} new chapters to Firestore.`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

run();
