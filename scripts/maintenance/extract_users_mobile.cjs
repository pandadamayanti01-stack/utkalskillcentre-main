const admin = require('firebase-admin');
const serviceAccount = require('../../utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function run() {
  try {
    const snapshot = await db.collection('users').get();
    console.log(`=== UTKAL SKILL CENTRE USER DIRECTORY ===`);
    console.log(`Total user records in Firestore: ${snapshot.size}\n`);
    
    let usersList = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const phone = data.phone || data.phoneNumber || data.mobile || 'No Phone';
      const name = data.name || data.displayName || 'No Name';
      const role = data.role || 'No Role';
      const classLevel = data.class || data.classLevel || 'N/A';
      
      usersList.push({
        id: doc.id,
        name: name,
        phone: phone,
        role: role,
        class: classLevel
      });
    });

    // Sort by role and name
    usersList.sort((a, b) => {
      if (a.role !== b.role) return a.role.localeCompare(b.role);
      return a.name.localeCompare(b.name);
    });

    // Print results in a formatted table layout
    console.log(String("Role").padEnd(12) + " | " + String("Name").padEnd(25) + " | " + String("Phone Number").padEnd(15) + " | " + String("Class").padEnd(8) + " | " + "Firestore Document ID");
    console.log("-".repeat(90));
    
    usersList.forEach(u => {
      console.log(
        String(u.role).padEnd(12) + " | " + 
        String(u.name).slice(0, 25).padEnd(25) + " | " + 
        String(u.phone).padEnd(15) + " | " + 
        String(u.class).padEnd(8) + " | " + 
        u.id
      );
    });

    process.exit(0);
  } catch (err) {
    console.error("Error executing query:", err);
    process.exit(1);
  }
}

run();
