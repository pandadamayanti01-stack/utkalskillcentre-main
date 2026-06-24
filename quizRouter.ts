import express from 'express';
import path from 'path';
import fs from 'fs';
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFirestore } from 'firebase-admin/firestore';
import { getApp, getApps } from 'firebase-admin/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const quizRouter = express.Router();

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
};

const getDatabaseId = () => {
  return process.env.FIRESTORE_DATABASE_ID || 'utkal-prod';
};

// Gundulu AI Quiz Generation Engine
async function generateQuizViaGundulu(targetClass: string, subject: string): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing on the server");
  }

  const isUniversal = targetClass === 'Universal GK';
  
  const prompt = isUniversal 
    ? `You are Gundulu, a warm, highly intellectual elder sister from Odisha who loves teaching. Your tone is extremely encouraging, proud of Odisha, and filled with affection.
       Generate today's "Universal GK & Odisha Culture Challenge" containing exactly 5 premium, diverse General Knowledge questions.
       
       CRITICAL: Do NOT use any double quotes (") inside the question, options, or explanation text values. If you need to use quotes, always use single quotes (') instead.
       
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
       
       CRITICAL: Do NOT use any double quotes (") inside the question, options, or explanation text values. If you need to use quotes, always use single quotes (') instead.
       
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

  console.log(`[Quiz Router] Calling Gundulu AI (gemini-2.5-flash) for ${targetClass}...`);
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

// Router handler mapping for subdomain and path-based requests
quizRouter.get(['/', '/daily-mcq-challenge', '/daily-mcq-challenge.html'], async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    const isSubdomain = host.startsWith('quiz.');
    const isPathRoute = req.path === '/daily-mcq-challenge' || req.path === '/daily-mcq-challenge.html';

    // CRITICAL: If the request is for root '/' but NOT on the 'quiz.' subdomain,
    // let it fall through to serve the main application SPA dashboard.
    if (req.path === '/' && !isSubdomain) {
      return next();
    }

    // Determine class query:
    // If no ?class is specified, default to 'universal' (Universal GK)
    let classQuery = 'universal';
    if (req.query.class) {
      classQuery = String(req.query.class).trim().toLowerCase();
    }

    let targetClass = 'Universal GK';
    let subject = 'General Knowledge';
    
    if (classQuery !== 'universal' && classQuery !== 'gk') {
      let targetClassNum = parseInt(classQuery.replace(/\D/g, '')) || 10;
      if (targetClassNum < 1 || targetClassNum > 10) targetClassNum = 10;
      targetClass = `Class ${targetClassNum}`;
      // Dynamic subject rotation
      const subjects = ['Science', 'Mathematics', 'English', 'Social Science'];
      const day = new Date().getDay();
      subject = subjects[day % subjects.length];
    }

    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    console.log(`[Quiz Router] Subdomain Serve: ${targetClass} (${subject}) on date: ${todayDate} via host: ${host}...`);

    // Get database instance (using the active firebase-admin App)
    const adminApp = getApps().length > 0 ? getApp() : undefined;
    const firestoreDb = getFirestore(adminApp, getDatabaseId());

    // Index-safe query targeting targetClass
    const snapshot = await firestoreDb.collection('daily_mcqs')
      .where('class', '==', targetClass)
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

    // Fallback 1: Get the most recent published MCQ
    if (!activeMcq) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.status === 'published') {
          activeMcq = { ...data, id: doc.id };
          break;
        }
      }
    }

    // Fallback 2: Call Gundulu AI to generate a fresh quiz!
    if (!activeMcq) {
      console.log(`[Quiz Router] Cache miss. Calling Gundulu AI to generate for ${targetClass}...`);
      try {
        const aiGeneratedData = await generateQuizViaGundulu(targetClass, subject);
        const newDocId = `${targetClass.replace(/\s+/g, '_')}_${subject.replace(/\s+/g, '_')}_${todayDate}`;
        const newMcqDoc = {
          title: aiGeneratedData.title || `${targetClass} Daily Challenge`,
          subject: subject,
          class: targetClass,
          activeDate: todayDate,
          status: 'published',
          questions: aiGeneratedData.questions || [],
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await firestoreDb.collection('daily_mcqs').doc(newDocId).set(newMcqDoc);
        console.log(`[Quiz Router] Cached fresh Gundulu AI quiz in Firestore: ${newDocId}`);
        activeMcq = { ...newMcqDoc, id: newDocId };
      } catch (aiError: any) {
        console.error(`[Quiz Router] Gundulu AI generation failed:`, aiError.message);
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

      // Generate Google Quiz Schema
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

    // Load HTML Template
    let templatePath = path.resolve(__dirname, 'dist', 'daily-mcq-challenge.html');
    if (!fs.existsSync(templatePath)) {
      templatePath = path.resolve(__dirname, 'daily-mcq-challenge.html');
    }

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
    console.error('[Quiz Router] Error serving page:', err);
    return res.status(500).send(`Internal Server Error: ${err.message}`);
  }
});
