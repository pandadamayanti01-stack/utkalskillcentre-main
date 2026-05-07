const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';
const bucketNames = ['utkalskillcentre.firebasestorage.app', 'utkalskillcentre-admin'];

async function run() {
  console.log("🔍 Scanning for newly uploaded files in the buckets...");
  
  for (const bucketName of bucketNames) {
    console.log(`\n📡 Probing bucket: ${bucketName}...`);
    try {
      if (admin.apps.length > 0) {
        await admin.app().delete();
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "utkalskillcentre",
        storageBucket: bucketName
      });
      
      const bucket = admin.storage().bucket();
      const [files] = await bucket.getFiles();
      
      const matches = files.filter(f => 
        f.name.toLowerCase().includes('class 9') || 
        f.name.toLowerCase().includes('class9') || 
        f.name.toLowerCase().includes('c9_') ||
        f.name.toLowerCase().includes('algebra') ||
        f.name.toLowerCase().includes('geometry')
      );
      
      console.log(`✅ Success! Found ${matches.length} matching file(s) inside:`);
      matches.forEach(f => {
        console.log(`- Path: ${f.name} | Size: ${f.metadata.size} bytes`);
      });
      
    } catch (err) {
      console.log(`❌ Error scanning ${bucketName}: ${err.message}`);
    }
  }
  process.exit(0);
}

run();
