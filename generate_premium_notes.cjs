require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateNotesForChapter(subject, title) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const sub = subject.toLowerCase().trim();
    let languageInstructions = "Write the notes in Odia language. Use English terms in brackets if necessary for technical words.";
    
    if (sub.includes('english')) {
        languageInstructions = "Write the notes using a mix of English and Odia. Explain the English concepts clearly in Odia so Odia medium students can understand perfectly.";
    } else if (sub.includes('hindi')) {
        languageInstructions = "Write the notes explaining the Hindi concepts in Odia language. Provide meanings of difficult Hindi words in Odia.";
    } else if (sub.includes('sanskrit')) {
        languageInstructions = "Write the notes explaining the Sanskrit concepts and grammar rules in Odia language. Provide meanings of Sanskrit slokas/words in Odia.";
    } else if (sub.includes('odia')) {
        languageInstructions = "Write the notes purely in beautiful Odia language.";
    } else if (sub.includes('history') || sub.includes('geography') || sub.includes('science') || sub.includes('geometry') || sub.includes('social')) {
        languageInstructions = "Write the notes entirely in Odia language, using simple words. Use standard Odia terms for technical words.";
    }

    const prompt = `You are an expert teacher for Class 10 students of Odisha Board. 
Generate premium, highly detailed, engaging, and easy-to-understand study notes for the subject '${subject}', specifically for the chapter '${title}'.
${languageInstructions}

Make the notes structured with:
- Catchy headings (use emojis)
- Bullet points for easy reading
- Important definitions highlighted in bold
- A quick summary at the end
- Use standard Markdown format.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error(`Failed to generate notes for ${title}:`, e.message);
    return null;
  }
}

async function run() {
  console.log("Starting Premium Notes Generation for Class 10...");
  try {
    const snapshot = await db.collection('chapters')
      .where('class', '==', 'class10')
      .get();

    let processedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const subject = (data.subject || '').toLowerCase().trim();
      
      // Filter out algebra and odia_grammar
      if (subject.includes('algebra') || subject.includes('odia_grammar')) {
        continue;
      }
      
      // Filter out chapters that already have notes
      if (data.notes && data.notes.length > 50) {
        continue;
      }

      console.log(`[${processedCount + 1}] Generating notes for: ${data.title} (${subject})...`);
      
      const markdownNotes = await generateNotesForChapter(data.subject, data.title);
      
      if (markdownNotes) {
        await doc.ref.update({
          notes: markdownNotes,
          updatedAt: new Date().toISOString()
        });
        console.log(`  -> Successfully saved notes for ${data.title}`);
        processedCount++;
        
        // Wait 3 seconds to avoid hitting rate limits
        await delay(3000);
      }
    }
    
    console.log(`\nFinished! Successfully generated and saved notes for ${processedCount} chapters.`);
    process.exit(0);
  } catch(e) {
    console.error("Critical Error:", e);
    process.exit(1);
  }
}

run();
