require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./utkal-admin-sdk.json');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  'AIzaSyC7UINWWpHpFLH7luNA1rKpVwxTZ4ttT-0',
  'AIzaSyCjFw3zD4VHNeT6qwpfRrpk89gjIuc7yrY',
  'AIzaSyAUBYWNdOUmVUJ3FoJMqBEopEwGC0s937U',
  'AIzaSyC8T2sZ0a6pjqFi5qRNiWDWwGvUXLBKTwo'
].filter(Boolean);

const app = admin.apps.length ? admin.app() : admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore(app, 'utkal-prod');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getLanguageInstructions(subject) {
  const sub = subject.toLowerCase().trim();
  if (sub === 'jasmine') {
    return "Write the notes entirely in English.";
  } else if (sub === 'kausala_bodha') {
    return "Write the notes entirely in English.";
  } else if (sub === 'hindi_kalika') {
    return "Write the notes entirely in Hindi script (Devanagari).";
  } else if (sub === 'sanskritakalika_3') {
    return "Write the notes entirely in Sanskrit/Devanagari script.";
  } else if (sub === 'sahitya_surabhi') {
    return "Write the notes entirely in Odia script. Do not use English brackets or English terms.";
  } else {
    return "Write the notes in Odia language. Use English terms in brackets if necessary for technical words.";
  }
}

async function generateNotesForChapter(genAI, subject, title, workerId) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const languageInstructions = getLanguageInstructions(subject);

    const prompt = `You are an expert teacher creating premium study notes for school students.
Create highly detailed, structured, and easy-to-understand study notes for the following chapter.
Subject Key: ${subject}
Chapter Title: ${title}

Instructions:
1. ${languageInstructions}
2. Use markdown formatting. Use ## for main headings and ### for subheadings.
3. Start with a brief introduction/overview of the chapter.
4. Break down the core concepts into logical sections with bullet points.
5. Include important definitions, formulas, or key dates where relevant.
6. End with a summary or "Key Takeaways" section.
7. Make the tone encouraging and easy to read.`;

    let retries = 3;
    let delayTime = 10000;
    while (retries > 0) {
      try {
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        const errMsg = String(err.message || err).toLowerCase();
        
        // Handle invalid key error
        if (errMsg.includes('key not valid') || errMsg.includes('api_key_invalid') || errMsg.includes('invalid api key')) {
          console.error(`[Worker ${workerId}] API Key is invalid or expired. Stopping worker.`);
          return '__API_KEY_INVALID__';
        }

        if (errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('502') || errMsg.includes('fetch failed') || errMsg.includes('econnrefused')) {
          console.log(`[Worker ${workerId}] [Rate Limit / Connection Error] Retrying "${title}" in ${delayTime/1000}s... (Error: ${err.message})`);
          await delay(delayTime);
          delayTime *= 2;
          retries--;
        } else {
          throw err;
        }
      }
    }
    return null;
  } catch (e) {
    console.error(`[Worker ${workerId}] Failed to generate notes for "${title}":`, e.message);
    return null;
  }
}

function isAnswerKey(title) {
  const lowerTitle = title.toLowerCase();
  return lowerTitle.includes('answer') || 
         lowerTitle.includes('key') || 
         (lowerTitle.includes('solution') && !lowerTitle.includes('dissolution') && !lowerTitle.includes('resolution')) || 
         lowerTitle.includes('uttaramala');
}

async function run() {
  console.log('Starting Concurrent Premium Notes Generation for Class 8...');
  try {
    const chaptersSnapshot = await db.collection('chapters')
      .where('class', '==', 'class8')
      .get();
    
    console.log(`Found ${chaptersSnapshot.size} Class 8 chapters in Firestore.`);
    
    const docsToProcess = [];
    chaptersSnapshot.forEach(doc => {
      const data = doc.data();
      const title = data.title || '';
      
      if (isAnswerKey(title)) {
        return;
      }
      if (data.notes && data.notes.trim().length > 50) {
        return;
      }
      docsToProcess.push(doc);
    });

    console.log(`Chapters requiring note generation: ${docsToProcess.length}`);

    // Queue of docs to process
    const queue = [...docsToProcess];
    let successfulCount = 0;

    async function worker(workerId, apiKey) {
      console.log(`[Worker ${workerId}] Starting with key: ${apiKey.substring(0, 8)}...`);
      const workerGenAI = new GoogleGenerativeAI(apiKey);

      while (queue.length > 0) {
        const doc = queue.shift();
        if (!doc) break;

        const data = doc.data();
        const subject = data.subject || '';
        const title = data.title || '';

        console.log(`[Worker ${workerId}] Generating notes for: ${title} (${subject})... [Remaining: ${queue.length}]`);
        
        const markdownNotes = await generateNotesForChapter(workerGenAI, subject, title, workerId);
        
        if (markdownNotes === '__API_KEY_INVALID__') {
          // Re-queue the doc so another worker can process it
          queue.push(doc);
          break;
        }

        if (markdownNotes) {
          await doc.ref.update({
            notes: markdownNotes,
            updatedAt: new Date().toISOString()
          });
          console.log(`[Worker ${workerId}] -> Successfully saved notes for "${title}"`);
          successfulCount++;
        } else {
          console.log(`[Worker ${workerId}] -> Failed to generate notes for "${title}". Re-queuing...`);
          queue.push(doc);
        }

        // Wait 6 seconds between requests to maintain 10 RPM on each key
        await delay(6000);
      }
      console.log(`[Worker ${workerId}] Stopped.`);
    }

    // Launch all workers concurrently
    await Promise.all(API_KEYS.map((key, idx) => worker(idx + 1, key)));

    console.log(`\nFinished concurrent notes generation! Successfully saved ${successfulCount} chapters.`);
    process.exit(0);
  } catch(e) {
    console.error("Critical Error:", e);
    process.exit(1);
  }
}

run();
