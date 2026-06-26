const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function run() {
  try {
    const snapshot = await db.collection('users').get();
    console.log(`Total users: ${snapshot.size}`);
    
    let stats = {
      student_with_pin: 0,
      student_no_pin: 0,
      user_role_count: {},
      pin_types: {}
    };

    snapshot.forEach(doc => {
      const data = doc.data();
      const role = data.role || 'no-role';
      stats.user_role_count[role] = (stats.user_role_count[role] || 0) + 1;

      const pinVal = data.pin;
      const parentPinVal = data.parent_pin;
      
      const pinType = typeof pinVal;
      stats.pin_types[pinType] = (stats.pin_types[pinType] || 0) + 1;

      if (role === 'student') {
        const hasPin = (pinVal !== undefined && pinVal !== null && pinVal !== "");
        if (hasPin) {
          stats.student_with_pin++;
        } else {
          stats.student_no_pin++;
        }
      }
    });

    console.log("Stats:", JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
