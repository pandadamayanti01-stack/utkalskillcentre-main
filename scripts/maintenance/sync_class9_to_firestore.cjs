require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'utkalskillcentre.firebasestorage.app'
});

const db = getFirestore(app, 'utkal-prod');
const bucket = admin.storage().bucket();

const SUBJECT_MAP = {
  'algebra': 'algebra',
  'mathematics': 'algebra',
  'geometry': 'geometry',
  'physical_science': 'physical_science',
  'life_science': 'life_science',
  'history': 'social_science',
  'geography': 'geography',
  'english': 'english',
  'english_grammar': 'english_grammar',
  'odia': 'odia',
  'odia_grammar': 'odia_grammar',
  'sanskrit': 'sanskrit',
  'sanskrit_grammar': 'sanskrit_grammar',
  'hindi': 'hindi',
  'hindi_grammar': 'hindi_grammar'
};

async function batchTranslate(batch) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const itemsText = batch.map((item, idx) => `${idx + 1}. Filename: "${item.filename}", Subject: "${item.rawSubject}"`).join('\n');
    
    const prompt = `You are a curriculum developer for Odisha State Board schools (Odia Medium).
Translate the following list of PDF filenames into clean English and Odia titles.
Odia titles must be written in the Odia script (e.g. ଜନ୍ମଭୂମି, ବୀଜଗଣିତ, etc.).
Exclude chapter prefixes like Class9, Ch01, .pdf, or underscores. Make them look neat.

List of files:
${itemsText}

Respond ONLY with a JSON array in this exact format (no markdown blocks, no other text):
[
  {
    "filename": "Class9_Eng_Ch01_The_Priceless_Gift.pdf",
    "title_en": "The Priceless Gift",
    "title_or": "ଅମୂଲ୍ୟ ଉପହାର"
  }
]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Strip markdown code block wrapper if present
    if (text.startsWith('```')) {
      text = text.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini batch translation failed:", err.message);
    return null;
  }
}

function fallbackClean(filename) {
  let title = filename.replace('.pdf', '')
    .replace(/^Class\d+_/i, '')
    .replace(/^C9_Alg_/i, '')
    .replace(/^C9_Geo_/i, '')
    .replace(/_/g, ' ')
    .replace(/^(Chapter\s*\d+)\s+([^-])/i, '$1 - $2')
    .trim();
  return {
    title_en: title,
    title_or: title
  };
}

function formatChapterTitle(rawName) {
  // If it's already in the correct format, return it as-is
  if (rawName.startsWith('Chapter ') && rawName.includes(' - ')) {
    return rawName;
  }

  // Extract chapter number
  let chNum = null;
  const chMatch = rawName.match(/Ch[_\-\s]?(\d+)/i);
  if (chMatch) {
    chNum = parseInt(chMatch[1], 10);
  } else {
    const fallbackMatch = rawName.match(/Chapter[_\-\s]?\s*(\d+)/i);
    if (fallbackMatch) {
      chNum = parseInt(fallbackMatch[1], 10);
    }
  }

  // List of prefixes to clean, ordered from longest to shortest to prevent partial matches
  const prefixes = [
    /Class\d+[_]?/gi,
    /C9_[a-zA-Z]+[_]?/gi,
    /Chapter\s*\d+/gi,
    /Ch\d+/gi,
    /Ch\s*\d+/gi,
    /L\d+/gi,
    /L\s*\d+/gi,
    /Sanskrit_Grammar/gi,
    /SanskritGrammar/gi,
    /English_Grammar/gi,
    /EnglishGrammar/gi,
    /Physical_science/gi,
    /PhysicalScience/gi,
    /Physical_Science/gi,
    /Hindi_Grammar/gi,
    /HindiGrammar/gi,
    /Odia_Grammar/gi,
    /OdiaGrammar/gi,
    /Sanskrit/gi,
    /SanGram/gi,
    /Life_Science/gi,
    /LifeScience/gi,
    /LifeSci/gi,
    /Physical/gi,
    /PhySci/gi,
    /Geometry/gi,
    /Geography/gi,
    /History/gi,
    /HistPol/gi,
    /GeoEco/gi,
    /HindiGram/gi,
    /OdiaGram/gi,
    /EngGram/gi,
    /English/gi,
    /HindiLit/gi,
    /Algebra/gi,
    /Hindi/gi,
    /Odia/gi,
    /Eng/gi,
    /Geo/gi,
    /Pol/gi,
    /Eco/gi,
    /Hist/gi,
    /Ready/gi
  ];

  let cleanTitle = rawName;
  for (const regex of prefixes) {
    cleanTitle = cleanTitle.replace(regex, '');
  }

  // Replace underscores and clean spaces
  cleanTitle = cleanTitle.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Clean leading/trailing clutter
  cleanTitle = cleanTitle.replace(/^[^a-zA-Z0-9(]+/, '').replace(/[^a-zA-Z0-9)]+$/, '').trim();

  // Reconstruct in Class 10 style: "Chapter X - Title"
  if (chNum !== null) {
    return `Chapter ${chNum} - ${cleanTitle}`;
  }
  return cleanTitle;
}

async function run() {
  try {
    console.log("1. Deleting existing Class 9 chapters in Firestore...");
    const existingSnap = await db.collection('chapters')
      .where('class', '==', 'class9')
      .get();
      
    console.log(`Found ${existingSnap.size} existing Class 9 chapters. Deleting...`);
    const deleteBatch = db.batch();
    existingSnap.forEach(doc => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();
    console.log("Deletion complete.");

    console.log("2. Fetching files from Firebase Storage...");
    const [files] = await bucket.getFiles({ prefix: 'Chapter Wise Text Book/Class 9/' });
    console.log(`Found ${files.length} files in GCS under Class 9.`);

    const candidates = [];
    for (const file of files) {
      if (!file.name.endsWith('.pdf')) continue;
      
      const pathParts = file.name.split('/');
      if (pathParts.length < 4) continue;
      
      const rawSubject = pathParts[2];
      const filename = pathParts[3];
      if (filename.startsWith('.placeholder')) continue;
      
      const normalizedSubject = SUBJECT_MAP[rawSubject.toLowerCase()];
      if (!normalizedSubject) {
        console.warn(`Skipping file with unknown subject mapping: ${file.name}`);
        continue;
      }
      
      candidates.push({
        file,
        filename,
        rawSubject,
        normalizedSubject
      });
    }

    console.log(`Processing ${candidates.length} PDF chapters...`);

    const BATCH_SIZE = 15;
    const finalChapters = [];

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)} (Size: ${batch.length})...`);
      
      const translations = await batchTranslate(batch);
      
      batch.forEach((item, index) => {
        let title_en = "";
        let title_or = "";
        
        const matchedTrans = translations ? translations.find(t => t.filename === item.filename) : null;
        if (matchedTrans && matchedTrans.title_en && matchedTrans.title_or) {
          title_en = matchedTrans.title_en;
          title_or = matchedTrans.title_or;
        } else {
          const fallback = fallbackClean(item.filename);
          title_en = fallback.title_en;
          title_or = fallback.title_or;
        }
        
        const encodedPath = encodeURI(item.file.name).replace(/\//g, '%2F');
        const pdfUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
        
        // Clean default title
        const displayTitle = formatChapterTitle(item.filename.replace('.pdf', ''));

        finalChapters.push({
          class: 'class9',
          subject: item.normalizedSubject,
          title: displayTitle,
          title_en,
          title_or,
          pdfUrl,
          isLibraryChapter: true,
          status: 'published',
          board: "Odisha Board (Odia Medium)",
          notes: "",
          mcqs: [],
          createdAt: new Date()
        });
      });
      
      // Sleep for 2.5 seconds between batches to avoid rate limits
      await new Promise(r => setTimeout(r, 2500));
    }

    console.log(`3. Writing ${finalChapters.length} chapters to Firestore in batches...`);
    
    // Firestore batch limit is 500 operations
    let firestoreBatch = db.batch();
    let opCount = 0;
    
    for (const chap of finalChapters) {
      const docRef = db.collection('chapters').doc();
      firestoreBatch.set(docRef, {
        ...chap,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      opCount++;
      if (opCount === 400) {
        await firestoreBatch.commit();
        console.log(`  -> Committed ${opCount} chapters...`);
        firestoreBatch = db.batch();
        opCount = 0;
      }
    }
    
    if (opCount > 0) {
      await firestoreBatch.commit();
      console.log(`  -> Committed final ${opCount} chapters.`);
    }

    console.log("\nClass 9 Chapters Sync Complete!");
    process.exit(0);
  } catch (err) {
    console.error("Critical Sync Error:", err);
    process.exit(1);
  }
}

run();
