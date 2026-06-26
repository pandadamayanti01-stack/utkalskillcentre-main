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
        // Add a 4.5 second delay after successful requests to respect the 15 RPM free tier limit
        await new Promise(r => setTimeout(r, 4500));
        return result.response.text();
      } catch (err) {
        if (err.message && (err.message.includes('503') || err.message.includes('429') || err.message.includes('502'))) {
          console.log(`[Rate Limit / Busy] Retrying ${title} in ${delayTime/1000}s...`);
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
  console.log('Starting Premium Notes Generation for All Classes...');
  try {
    const chaptersSnapshot = await db.collection('chapters').get();
    
    let processedCount = 0;

    for (const doc of chaptersSnapshot.docs) {
      const data = doc.data();
      const classId = (data.class || '').toLowerCase().trim();
      
      // ONLY FOCUS ON CLASS 1 and 2
      if (!['1', 'class1', 'class 1', '2', 'class2', 'class 2'].includes(classId)) {
        continue;
      }

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
