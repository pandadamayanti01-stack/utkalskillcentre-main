import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.QUIZ_PORT || process.env.PORT || 3001;

// 1. Initialize Firebase Admin SDK
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const databaseId = process.env.FIRESTORE_DATABASE_ID || 'utkal-prod';

if (credentialsPath && fs.existsSync(credentialsPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
  console.log(`[Quiz Server] Firebase Admin initialized with project: ${serviceAccount.project_id}`);
} else {
  // Application Default Credentials fallback
  admin.initializeApp();
  console.log('[Quiz Server] Firebase Admin initialized with ADC');
}

// Canonical Firestore database initialization targeting "utkal-prod"
const firestoreDb = admin.firestore(databaseId);

// 2. Initialize Gemini AI rotators
const getApiKey = () => {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
};

// Serve static assets from public/ folder (for logos, icons, etc.)
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.json());

// 3. Gundulu AI Generator Engine
async function generateQuizViaGundulu(targetClass: string, subject: string): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing on the server");
  }

  const isUniversal = targetClass === 'Universal GK';
  
  // Custom bilingual prompts targeting Gundulu's warm elder-sister persona
  const prompt = isUniversal 
    ? `You are Gundulu, a warm, highly intellectual elder sister from Odisha who loves teaching. Your tone is extremely encouraging, proud of Odisha, and filled with affection.
       Generate today's "Universal GK & Odisha Culture Challenge" containing exactly 5 premium, diverse General Knowledge questions.
       
       The questions must cover:
       - Question 1: Odisha History & Heritage (e.g., Konark, Jagannath Temple, Kalinga War, Baji Rout, Madhusudan Das)
       - Question 2: Odisha Geography & Nature (e.g., Chilika Lake, Mahanadi River, Similipal Forest, mineral wealth)
       - Question 3: Everyday General Science (e.g., how rainbows form, eclipse phenomena, basic physics/chemistry in daily life)
       - Question 4: Fun Math / Logical Puzzle (e.g., a simple, engaging riddle or pattern puzzle)
       - Question 5: Odia Language, Proverbs, or Art (e.g., famous proverbs, sand art, Odissi dance, local festivals)
       
       Each question must have:
       - A bilingual question text (English and Odia script).
       - 4 bilingual options (English and Odia script).
       - One correctAnswer (exact string matching one option).
       - A warm, detailed explanation in Odia script written in Gundulu's encouraging elder-sister voice, sharing a fascinating historical or scientific fact.

       Output strictly in JSON format matching this schema:
       {
         "title": "Universal GK Challenge",
         "subject": "General Knowledge",
         "questions": [
           {
             "question": "Question text in English / ଓଡ଼ିଆ ଲେଖା",
             "options": ["Option A / ଓଡ଼ିଆ", "Option B / ଓଡ଼ିଆ", "Option C / ଓଡ଼ିଆ", "Option D / ଓଡ଼ିଆ"],
             "correctAnswer": "Exact matching option string",
             "explanation": "Warm, encouraging explanation in Odia script starting with 'ସାଙ୍ଗମାନେ...' or 'ଭାଇ ଭଉଣୀମାନେ...'"
           }
         ]
       }`
    : `You are Gundulu, a warm, sweet, and cute elder sister tutoring a student. Generate a premium, curriculum-mapped multiple choice quiz containing exactly 5 questions for ${targetClass} on the subject of "${subject}".
       The questions must be highly educational, bilingual (English and Odia script), suitable for Odisha board school syllabus, and follow this schema:
       {
         "title": "${targetClass} ${subject} Daily Challenge",
         "subject": "${subject}",
         "questions": [
           {
             "question": "Syllabus question in English / ଓଡ଼ିଆ ଲେଖା",
             "options": ["Option A / ଓଡ଼ିଆ", "Option B / ଓଡ଼ିଆ", "Option C / ଓଡ଼ିଆ", "Option D / ଓଡ଼ିଆ"],
             "correctAnswer": "Exact matching option",
             "explanation": "Warm, clear pedagogical explanation in Odia script."
           }
         ]
       }`;

  console.log(`[Quiz Server] Calling Gundulu AI (gemini-2.5-flash) for ${targetClass}...`);
  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 8192
    }
  });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const parsedData = JSON.parse(responseText);
  
  return parsedData;
}

// 4. Main Subdomain Router
app.get(['/', '/daily-mcq-challenge', '/daily-mcq-challenge.html'], async (req, res) => {
  try {
    // Strictly Universal GK & General Knowledge for the public landing page
    const targetClass = 'Universal GK';
    const dbClass = 'Universal GK';
    const subject = 'General Knowledge';

    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    console.log(`[Quiz Server] Serving challenge request for ${targetClass} (${subject}) on date: ${todayDate}...`);

    // A. Query Firestore for today's published MCQ
    const snapshot = await firestoreDb.collection('daily_mcqs')
      .where('class', '==', dbClass)
      .orderBy('activeDate', 'desc')
      .limit(5)
      .get();

    let activeMcq = null;
    
    // Check if any recent document matches today's date and is published
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.activeDate === todayDate && data.status === 'published') {
        activeMcq = { ...data, id: doc.id };
        break;
      }
    }

    // B. Fallback 1: If no MCQ exists for today, try to load the most recent published MCQ for that class
    if (!activeMcq) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.status === 'published') {
          activeMcq = { ...data, id: doc.id };
          break;
        }
      }
    }

    // C. Fallback 2 (The AI Engine): If still no MCQ exists, call Gundulu AI to generate a fresh one!
    if (!activeMcq) {
      console.log(`[Quiz Server] Cache miss. Triggering Gundulu AI to generate fresh challenge for ${targetClass}...`);
      try {
        const aiGeneratedData = await generateQuizViaGundulu(targetClass, subject);
        
        // Save the generated quiz to Firestore to cache it for the rest of the day
        const newDocId = `${dbClass}_${subject.replace(/\s+/g, '_')}_${todayDate}`;
        const newMcqDoc = {
          title: aiGeneratedData.title || `${targetClass} Daily Challenge`,
          subject: subject,
          class: dbClass,
          activeDate: todayDate,
          status: 'published',
          questions: aiGeneratedData.questions || [],
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await firestoreDb.collection('daily_mcqs').doc(newDocId).set(newMcqDoc);
        console.log(`[Quiz Server] Successfully cached new Gundulu AI quiz in Firestore: ${newDocId}`);
        activeMcq = { ...newMcqDoc, id: newDocId };
      } catch (aiError: any) {
        console.error(`[Quiz Server] Gundulu AI Generation failed:`, aiError.message);
        // Do not fail if it's Universal GK — the frontend will fall back to its premium built-in quiz!
        if (targetClass !== 'Universal GK') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(503).send("<h2>Gundulu AI is busy preparing today's school questions. Please try again in a few seconds!</h2>");
        }
      }
    }

    let quizPayload = null;
    let schemaHtmlBlock = '';

    if (activeMcq) {
      const allQuestions = Array.isArray(activeMcq.questions) ? activeMcq.questions : [];
      const previewQuestions = allQuestions.slice(0, 5);
      
      quizPayload = {
        mcqId: activeMcq.id,
        title: activeMcq.title || `${targetClass} Daily Challenge`,
        subject: activeMcq.subject || subject,
        class: activeMcq.class,
        activeDate: activeMcq.activeDate,
        questions: previewQuestions.map((q: any, idx: number) => ({
          id: String(idx + 1),
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer || q.correct_answer,
          explanation: q.explanation || ''
        }))
      };

      // Generate Google Quiz Schema (JSON-LD)
      const schemaQuestions = quizPayload.questions.map((q: any) => ({
        "@type": "Question",
        "name": q.question,
        "suggestedAnswer": q.options.map((opt: string) => ({
          "@type": "Answer",
          "text": opt
        })),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.correctAnswer,
          "comment": {
            "@type": "Comment",
            "text": q.explanation || "Correct Answer"
          }
        }
      }));

      const quizSchema = {
        "@context": "https://schema.org",
        "@type": "Quiz",
        "name": `${targetClass} Daily MCQ Challenge - Utkal Skill Centre`,
        "description": `Take today's 5-question bilingual Odia medium ${quizPayload.subject} quiz for ${targetClass}. Instant grading and explanations!`,
        "learningResourceType": "Quiz",
        "educationalLevel": targetClass,
        "about": {
          "@type": "Thing",
          "name": quizPayload.subject
        },
        "hasPart": schemaQuestions
      };

      schemaHtmlBlock = `<script type="application/ld+json">\n${JSON.stringify(quizSchema, null, 2)}\n</script>`;
    }

    // Load HTML template from root directory
    const templatePath = path.resolve(__dirname, 'daily-mcq-challenge.html');
    if (!fs.existsSync(templatePath)) {
      return res.status(500).send("Template daily-mcq-challenge.html not found.");
    }

    let html = fs.readFileSync(templatePath, 'utf-8');
    html = html.replace('window.DAILY_QUIZ = null; // DAILY_QUIZ_JSON_PLACEHOLDER', 'window.DAILY_QUIZ = ' + (quizPayload ? JSON.stringify(quizPayload) : 'null') + ';');
    html = html.replace('<!-- GOOGLE_QUIZ_SCHEMA_PLACEHOLDER -->', schemaHtmlBlock);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache
    return res.send(html);
  } catch (err: any) {
    console.error('[Quiz Server] Error serving page:', err);
    return res.status(500).send(`Internal Server Error: ${err.message}`);
  }
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', service: 'quiz-backend' });
});

// Start listening
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`🚀 STANDALONE GUNDULU AI QUIZ SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🎯 Domain Target: quiz.utkalskillcentre.com`);
  console.log(`==================================================`);
});
