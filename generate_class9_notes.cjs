require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEYS = [
  'AIzaSyC7UINWWpHpFLH7luNA1rKpVwxTZ4ttT-0',
  'AIzaSyD4haloAGFX1ygDIIHri5oi9n_A36m5FA4',
  'AIzaSyAUBYWNdOUmVUJ3FoJMqBEopEwGC0s937U',
  'AIzaSyCdZFXZ0U5QSxNQk00mQA3NtaSS-ji6BkQ',
  'AIzaSyBIkzsQX5PZ5DyNubS0mc77vjllewzwAks',
  'AIzaSyCEg16z4_O5fx-0h8FO7M8y9cE4pK_J1Ws'
];

let currentKeyIndex = 0;
let genAI = new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);

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
    
    if (sub.includes('english') || sub === 'vocational') {
      languageInstructions = "Write the notes entirely in English.";
    } else if (sub.includes('hindi')) {
      languageInstructions = "Write the notes entirely in Hindi script (Devanagari).";
    } else if (sub.includes('sanskrit')) {
      languageInstructions = "Write the notes in Sanskrit/Devanagari script.";
    }

    const prompt = `You are an expert teacher creating premium study notes for students.
Create highly detailed, structured, and easy-to-understand study notes for the following chapter.
Subject: ${subject}
Chapter Title: ${title}

Instructions:
1. ${languageInstructions}
2. Use markdown formatting. Use ## for main headings and ### for subheadings.
3. Start with a brief introduction/overview of the chapter.
4. Break down the core concepts into logical sections with bullet points.
5. Include important definitions, formulas, or key dates where relevant.
6. End with a summary or "Key Takeaways" section.
7. Make the tone encouraging and easy to read.`;

    let retries = 5;
    let delayTime = 15000; // start with 15s delay for rate limits
    while (retries > 0) {
      try {
        const result = await model.generateContent(prompt);
        // Add a 12.5 second delay after successful requests to respect the 5 RPM free tier limit of this key
        await new Promise(r => setTimeout(r, 12500));
        return result.response.text();
      } catch (err) {
        const errMsg = String(err.message || err).toLowerCase();
        
        // Check for Quota Exceeded error to perform key rotation
        if (errMsg.includes('quota') || errMsg.includes('429')) {
          if (currentKeyIndex < API_KEYS.length - 1) {
            currentKeyIndex++;
            console.log(`\n[Quota Exceeded] Switching to backup API key #${currentKeyIndex + 1} (${API_KEYS[currentKeyIndex].substring(0, 8)}...)...`);
            genAI = new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
            // Retry immediately without consuming a retry count
            continue;
          }
        }

        if (errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('502') || errMsg.includes('fetch failed') || errMsg.includes('econnrefused')) {
          console.log(`[Rate Limit / Connection Error] Retrying ${title} in ${delayTime/1000}s... (Error: ${err.message})`);
          await new Promise(r => setTimeout(r, delayTime));
          delayTime *= 1.5;
          retries--;
        } else {
          throw err;
        }
      }
    }
    throw new Error('Max retries reached due to Rate Limits / Service Unavailable');
  } catch (e) {
    console.error(`Failed to generate notes for ${title}:`, e.message);
    return null;
  }
}

async function run() {
  console.log('Starting Premium Notes Generation for Class 9...');
  try {
    const chaptersSnapshot = await db.collection('chapters')
      .where('class', '==', 'class9')
      .get();
    
    console.log(`Found ${chaptersSnapshot.size} Class 9 chapters in Firestore.`);
    let processedCount = 0;

    for (const doc of chaptersSnapshot.docs) {
      const data = doc.data();
      const subject = (data.subject || '').toLowerCase().trim();

      // Skip answer keys / solutions
      const lowerTitle = (data.title || '').toLowerCase();
      if (lowerTitle.includes('answer') || lowerTitle.includes('key') || (lowerTitle.includes('solution') && !lowerTitle.includes('dissolution') && !lowerTitle.includes('resolution')) || lowerTitle.includes('uttaramala')) {
        console.log(`Skipping (Answer Key): ${data.title}`);
        continue;
      }
      
      // Filter out chapters that already have notes
      if (data.notes && data.notes.length > 50) {
        console.log(`Skipping (already has notes): ${data.title}`);
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
        
        // Wait 1 second to avoid hitting rate limits
        await delay(1000);
      }
    }
    
    console.log(`\nFinished! Successfully generated and saved notes for ${processedCount} Class 9 chapters.`);
    process.exit(0);
  } catch(e) {
    console.error("Critical Error:", e);
    process.exit(1);
  }
}

run();
