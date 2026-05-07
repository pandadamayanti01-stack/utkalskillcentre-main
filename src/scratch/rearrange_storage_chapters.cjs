const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';
const bucketName = 'utkalskillcentre.firebasestorage.app';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "utkalskillcentre",
  storageBucket: bucketName
});

async function run() {
  console.log("⚙️ Starting Server-Side Storage Rearrangement Process...");
  const bucket = admin.storage().bucket();
  
  // Mapping filenames to their clean, standardized destination folders
  const moves = [
    {
      source: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/C10_Alg_Answers_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/Mathematics/Answers Key/C10_Alg_Answers_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/C10_Alg_Ch2_QuadraticEquations_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 2 - Dwighata Samikarana/C10_Alg_Ch2_QuadraticEquations_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/C10_Alg_Ch3_ArithmeticProgression_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 3 - Arithmetic Progression/C10_Alg_Ch3_ArithmeticProgression_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/C10_Alg_Ch4_Probability_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 4 - Probability/C10_Alg_Ch4_Probability_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/C10_Alg_Ch5_Statistics_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 5 - Statistics/C10_Alg_Ch5_Statistics_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/C10_Alg_Ch6_CoordinateGeometry_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/Mathematics/Chapter 6 - Coordinate Geometry/C10_Alg_Ch6_CoordinateGeometry_Ready.pdf'
    }
  ];
  
  for (const item of moves) {
    console.log(`\n🔄 Attempting to move:`);
    console.log(`   From: ${item.source}`);
    console.log(`   To:   ${item.dest}`);
    
    try {
      const file = bucket.file(item.source);
      const [exists] = await file.exists();
      
      if (exists) {
        // Move file server-side (instantly, without consuming bandwidth!)
        await file.move(item.dest);
        console.log(`   ✅ Move completed successfully!`);
      } else {
        console.log(`   ⚠️  Source file does not exist (it might have already been moved).`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to move: ${err.message}`);
    }
  }
  
  console.log("\n🎉 Re-arrangement complete! All your Class 10 math chapter files are neatly sorted into their dedicated directories!");
  process.exit(0);
}

run();
