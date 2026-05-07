const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';
const bucketName = 'utkalskillcentre.firebasestorage.app';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: dbId,
  storageBucket: bucketName
});

async function createStructure() {
  console.log(`🚀 Creating Chapter-Wise directory structure in bucket: ${bucketName}...`);
  try {
    const bucket = admin.storage().bucket();
    
    // Define chapter-wise folder placeholders to establish directories
    const folders = [
      'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/.placeholder',
      'Chapter Wise Text Book/Class 10/Mathematics/Chapter 2 - Dwighata Samikarana/.placeholder',
      'Chapter Wise Text Book/Class 10/Science/Chapter 1 - Chemical Reactions/.placeholder',
      'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/.placeholder',
      'Chapter Wise Text Book/Class 9/Science/Chapter 1 - Motion/.placeholder',
      'Chapter Wise Text Book/Class 8/Mathematics/Chapter 1 - Rational Numbers/.placeholder',
      'Chapter Wise Text Book/Class 7/Mathematics/Chapter 1 - Integers/.placeholder',
      'Chapter Wise Text Book/Class 6/Mathematics/Chapter 1 - Knowing Our Numbers/.placeholder'
    ];
    
    const content = 'Place your chapter PDF or TXT file inside this directory for automated AI ingestion.';
    
    for (const folderPath of folders) {
      console.log(`📁 Establishing chapter folder: ${folderPath}`);
      const file = bucket.file(folderPath);
      await file.save(content, {
        contentType: 'text/plain',
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });
    }
    
    console.log("\n🎉 Chapter-Wise folder structure successfully established inside your Firebase Storage console!");
  } catch (err) {
    console.error("❌ Error creating structure:", err.message);
  }
  process.exit(0);
}

createStructure();
