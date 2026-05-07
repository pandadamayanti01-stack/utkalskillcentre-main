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
  console.log("⚙️ Starting Server-Side Storage Reorganization for Class 9 Mathematics...");
  const bucket = admin.storage().bucket();
  
  const moves = [
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_Answers_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Answers Key/C9_Alg_Answers_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_ch2_RealNumbers_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 2 - Real Numbers/C9_Alg_C9_Alg_Ch2_RealNumbers_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_ch3_AlgebraicExpressions&Identities_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 3 - Algebraic Expressions/C9_Alg_Ch3_AlgebraicExpressions_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_ch4_AlgebraicEquation_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 4 - Algebraic Equations/C9_Alg_Ch4_AlgebraicEquations_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_Ch5_CoordianteGeometry_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 5 - Coordinate Geometry/C9_Alg_Ch5_CoordinateGeometry_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_Ch6_Ratio&Propersion_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 6 - Ratio and Proportion/C9_Alg_Ch6_RatioAndProportion_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_Ch7_Statistics_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 7 - Statistics/C9_Alg_Ch7_Statistics_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_Ch8_Probability_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 8 - Probability/C9_Alg_Ch8_Probability_Ready.pdf'
    },
    // Keep set theory in chapter 1 but clean its filename if it's there
    {
      source: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_C9_Alg_ch1_SetTheory_Ready_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 9/Mathematics/Chapter 1 - Set Theory/C9_Alg_Ch1_SetTheory_Ready.pdf'
    }
  ];
  
  for (const item of moves) {
    console.log(`\n🔄 Moving Class 9 Math Chapter:`);
    console.log(`   From: ${item.source}`);
    console.log(`   To:   ${item.dest}`);
    
    try {
      const file = bucket.file(item.source);
      const [exists] = await file.exists();
      
      if (exists) {
        await file.move(item.dest);
        console.log(`   ✅ Success!`);
      } else {
        console.log(`   ⚠️  Source does not exist.`);
      }
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
    }
  }
  
  console.log("\n🎉 Re-arrangement of Class 9 Mathematics textbook folders completed successfully!");
  process.exit(0);
}

run();
