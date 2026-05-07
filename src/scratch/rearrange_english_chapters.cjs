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
  console.log("⚙️ Starting Server-Side Storage Reorganization for Class 10 English...");
  const bucket = admin.storage().bucket();
  
  const moves = [
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch1_AllThingsBrightAndBeautiful_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 1 - All Things Bright and Beautiful/C10_Eng_Ch1_AllThingsBrightAndBeautiful_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch2_ALetterToGod_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 2 - A Letter to God/C10_Eng_Ch2_ALetterToGod_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch3_WeAreSeven_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 3 - We Are Seven/C10_Eng_Ch3_WeAreSeven_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch4_TrystWithDestiny_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 4 - Tryst with Destiny/C10_Eng_Ch4_TrystWithDestiny_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch5_VillageSong_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 5 - Village Song/C10_Eng_Ch5_VillageSong_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch6_KapilDev_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 6 - Kapil Dev/C10_Eng_Ch6_KapilDev_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch7_TheBrook_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 7 - The Brook/C10_Eng_Ch7_TheBrook_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch8_AirPollutionAHiddenMenace_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 8 - Air Pollution/C10_Eng_Ch8_AirPollutionAHiddenMenace_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch9_Virtue_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 9 - Virtue/C10_Eng_Ch9_Virtue_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch10_School_sGoodbye_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 10 - School\'s Goodbye/C10_Eng_Ch10_School_sGoodbye_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch11_ATigerInTheHouse_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 11 - A Tiger in the House/C10_Eng_Ch11_ATigerInTheHouse_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch12_TheBeggar_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 12 - The Beggar/C10_Eng_Ch12_TheBeggar_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch13_TheVillageJudge_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 13 - The Village Judge/C10_Eng_Ch13_TheVillageJudge_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch14_AGrainAsBigAsAHen_sEgg_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 14 - A Grain As Big As A Hen\'s Egg/C10_Eng_Ch14_AGrainAsBigAsAHen_sEgg_Ready.pdf'
    },
    {
      source: 'Chapter Wise Text Book/Class 10/English/C10_Eng_Ch15_AGreatSonOfIndia_Ready.pdf',
      dest: 'Chapter Wise Text Book/Class 10/English/Chapter 15 - A Great Son of India/C10_Eng_Ch15_AGreatSonOfIndia_Ready.pdf'
    }
  ];
  
  for (const item of moves) {
    console.log(`\n🔄 Moving English Chapter:`);
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
  
  console.log("\n🎉 Re-arrangement of Class 10 English textbook folders completed successfully!");
  process.exit(0);
}

run();
