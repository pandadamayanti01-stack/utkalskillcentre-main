const admin = require('firebase-admin');
const serviceAccount = require('../../utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function run() {
  try {
    const snapshot = await db.collection('users').get();
    
    let uniquePhones = new Map();
    let noPhoneCount = 0;
    let testPhoneCount = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const phone = String(data.phone || data.phoneNumber || data.mobile || '').trim();
      const name = String(data.name || data.displayName || 'No Name').trim();
      const role = String(data.role || 'student').trim();
      const classLevel = String(data.class !== undefined ? data.class : 'N/A').trim();

      if (!phone || phone.toLowerCase() === 'no phone' || phone === '') {
        noPhoneCount++;
        return;
      }

      // Identify test numbers
      if (phone.includes('12345678') || phone.includes('9876543210') || phone.includes('7777777777') || phone.includes('2222222222')) {
        testPhoneCount++;
        return;
      }

      // Add to map to ensure uniqueness per phone number
      uniquePhones.set(phone, {
        name,
        role,
        class: classLevel,
        docId: doc.id
      });
    });

    // Convert map to sorted list
    let sortedList = Array.from(uniquePhones.entries()).map(([phone, info]) => ({
      phone,
      ...info
    }));

    sortedList.sort((a, b) => {
      if (a.role !== b.role) return a.role.localeCompare(b.role);
      return a.name.localeCompare(b.name);
    });

    // Construct Markdown table content
    let mdContent = `# Extracted User Mobile Numbers\n\n`;
    mdContent += `This document contains the verified mobile numbers of registered users extracted from the Firebase database.\n\n`;
    mdContent += `* **Total Database Records:** ${snapshot.size}\n`;
    mdContent += `* **Unique Valid Mobile Numbers:** ${sortedList.length}\n`;
    mdContent += `* **Records without Phone Number:** ${noPhoneCount}\n`;
    mdContent += `* **Excluded Test/Demo Numbers:** ${testPhoneCount}\n\n`;
    mdContent += `| Role | Name | Phone Number | Class | Firestore Document ID |\n`;
    mdContent += `|---|---|---|---|---|\n`;

    sortedList.forEach(u => {
      mdContent += `| ${u.role} | ${u.name} | \`${u.phone}\` | ${u.class} | \`${u.docId}\` |\n`;
    });

    const artifactPath = path.join('C:\\Users\\Bishnupriya Panda\\.gemini\\antigravity\\brain\\e78b2bec-aab2-4126-bdec-6b52764960b1', 'extracted_user_mobiles.md');
    fs.writeFileSync(artifactPath, mdContent, 'utf-8');
    
    console.log(`Successfully exported ${sortedList.length} unique phone numbers to ${artifactPath}`);
    process.exit(0);
  } catch (err) {
    console.error("Error executing export:", err);
    process.exit(1);
  }
}

run();
