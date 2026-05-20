const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function listClass10Chapters() {
  try {
    const snapshot = await db.collection('chapters')
      .where('class', '==', 'class10')
      .get();

    const chapters = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      chapters.push({
        id: doc.id,
        title: data.title,
        subject: data.subject,
        hasNotes: !!data.notes,
        notesLength: data.notes ? data.notes.length : 0
      });
    });

    console.log(JSON.stringify(chapters, null, 2));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

listClass10Chapters();
