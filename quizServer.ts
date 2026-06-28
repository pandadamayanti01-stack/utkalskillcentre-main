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
  admin.initializeApp();
  console.log('[Quiz Server] Firebase Admin initialized with ADC');
}

const firestoreDb = admin.firestore();
firestoreDb.settings({ databaseId });

const getApiKey = () => {
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
};

// Serve static assets from public/ folder (for logos, icons, etc.)
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.json());

// Gundulu AI Quiz Generation Engine
async function generateQuizViaGundulu(targetClass: string, subject: string): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing on the server");
  }

  let prompt = "";
  if (subject === 'Current Events') {
    prompt = `You are Gundulu, a warm, highly intellectual elder sister from Odisha who loves teaching. Your tone is extremely encouraging, proud of Odisha, and filled with affection.
       Generate today's "Odisha Current Events & News Challenge" containing exactly 5 premium, diverse multiple choice questions about recent happenings in Odisha.
       
       CRITICAL: Do NOT use any double quotes (") inside the question, options, or explanation text values. If you need to use quotes, always use single quotes (') instead.
       
       The questions must cover:
       - Question 1: Recent Odisha Government Policies or Welfare Schemes (e.g., Subhadra Yojana, Ama Odisha Nabin Odisha, KALIA, BSKY/Gopabandhu Jan Arogya Yojana, school transformations).
       - Question 2: Odisha Infrastructure & Projects (e.g., metro projects in Bhubaneswar/Cuttack, airport developments, heritage corridors, district bridges or development works).
       - Question 3: Sports News & Achievements in Odisha (e.g., hockey tournaments hosted in Bhubaneswar/Rourkela, Odia athletes winning medals, state sports incentives).
       - Question 4: Awards, Honors, and Newsmakers (e.g., Padma awards to Odia personalities, appointments of key officials, achievements of Odia students/innovators).
       - Question 5: Key National or International events that directly impact, feature, or involve Odisha.
       
       Each question must have:
       - A bilingual question text (English and Odia script).
       - 4 bilingual options (English and Odia script).
       - One correctAnswer (exact string matching one option).
       - A warm, detailed explanation in Odia script written in Gundulu's encouraging elder-sister voice, sharing additional context about the news event.

       Output strictly in JSON format matching this schema:
       {
         "title": "Odisha Current Events Challenge",
         "subject": "Current Events",
         "questions": [
           {
             "question": "Question text in English / ଓଡ଼ିଆ ଲେଖା",
             "options": ["Option A / ଓଡ଼ିଆ", "Option B / ଓଡ଼ିଆ", "Option C / ଓଡ଼ିଆ", "Option D / ଓଡ଼ିଆ"],
             "correctAnswer": "Exact matching option string",
             "explanation": "Warm explanation in Odia script starting with 'ସାଙ୍ଗମାନେ...' or 'ଭାଇ ଭଉଣୀମାନେ...'"
           }
         ]
       }`;
  } else if (targetClass === 'Universal GK') {
    prompt = `You are Gundulu, a warm, highly intellectual elder sister from Odisha who loves teaching. Your tone is extremely encouraging, proud of Odisha, and filled with affection.
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
       }`;
  } else {
    prompt = `You are Gundulu, a warm, sweet, and cute elder sister tutoring a student. Generate a premium, curriculum-mapped multiple choice quiz containing exactly 5 questions for ${targetClass} on the subject of "${subject}".
       
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
  }

  console.log(`[Quiz Server] Calling Gundulu AI (gemini-2.5-flash) for ${targetClass}...\n`);
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
const servePortalPageServer = async (req: any, res: any) => {
  try {
    let portalPath = path.resolve(__dirname, 'quiz-portal.html');
    if (!fs.existsSync(portalPath)) {
      portalPath = path.resolve(__dirname, 'dist', 'quiz-portal.html');
    }

    if (!fs.existsSync(portalPath)) {
      return res.status(500).send("Template quiz-portal.html not found.");
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(portalPath);
  } catch (err: any) {
    console.error('[Quiz Server] Portal error:', err);
    return res.status(500).send(`Portal Error: ${err.message}`);
  }
};

app.get('/', servePortalPageServer);
app.get('/profile', servePortalPageServer);
app.get('/leaderboard', servePortalPageServer);

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.sendFile(path.resolve(__dirname, 'quiz-manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(path.resolve(__dirname, 'quiz-sw.js'));
});

// Common handler logic for serving daily quiz challenges on standalone server
const serveChallengeQuizServer = async (req: any, res: any, subjectName: string, logLabel: string) => {
  try {
    const targetClass = 'Universal GK';
    const dbClass = 'Universal GK';
    const subject = subjectName;

    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    console.log(`[Quiz Server] Subdomain ${logLabel}: ${targetClass} (${subject}) on date: ${todayDate}...`);

    const snapshot = await firestoreDb.collection('daily_mcqs')
      .where('class', '==', dbClass)
      .where('subject', '==', subject)
      .orderBy('activeDate', 'desc')
      .limit(5)
      .get();

    let activeMcq = null;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.activeDate === todayDate && data.status === 'published') {
        activeMcq = { ...data, id: doc.id };
        break;
      }
    }

    if (!activeMcq) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.status === 'published') {
          activeMcq = { ...data, id: doc.id };
          break;
        }
      }
    }

    if (!activeMcq) {
      console.log(`[Quiz Server] Cache miss. Calling Gundulu AI to generate for ${targetClass} (${subject})...`);
      try {
        const aiGeneratedData = await generateQuizViaGundulu(targetClass, subject);
        const newDocId = `${dbClass}_${subject.replace(/\s+/g, '_')}_${todayDate}`;
        const newMcqDoc = {
          title: aiGeneratedData.title || `${targetClass} ${subject} Challenge`,
          subject: subject,
          class: dbClass,
          activeDate: todayDate,
          status: 'published',
          questions: aiGeneratedData.questions || [],
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await firestoreDb.collection('daily_mcqs').doc(newDocId).set(newMcqDoc);
        console.log(`[Quiz Server] Cached fresh Gundulu AI quiz in Firestore: ${newDocId}`);
        activeMcq = { ...newMcqDoc, id: newDocId };
      } catch (aiError: any) {
        console.error(`[Quiz Server] Gundulu AI generation failed:`, aiError.message);
      }
    }

    let quizPayload = null;
    let schemaHtmlBlock = '';

    if (activeMcq) {
      const allQuestions = Array.isArray(activeMcq.questions) ? activeMcq.questions : [];
      const previewQuestions = allQuestions.slice(0, 5);
      
      quizPayload = {
        mcqId: activeMcq.id,
        title: activeMcq.title || `${targetClass} ${subject} Challenge`,
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
        "name": `${targetClass} Daily ${subject} Challenge - Utkal Skill Centre`,
        "description": `Take today's 5-question bilingual Odia medium ${quizPayload.subject} quiz. Instant grading and explanations!`,
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

    let templatePath = path.resolve(__dirname, 'daily-mcq-challenge.html');
    if (!fs.existsSync(templatePath)) {
      templatePath = path.resolve(__dirname, 'dist', 'daily-mcq-challenge.html');
    }

    if (!fs.existsSync(templatePath)) {
      return res.status(500).send("Template daily-mcq-challenge.html not found.");
    }

    let html = fs.readFileSync(templatePath, 'utf-8');
    html = html.replace('window.DAILY_QUIZ = null; // DAILY_QUIZ_JSON_PLACEHOLDER', 'window.DAILY_QUIZ = ' + (quizPayload ? JSON.stringify(quizPayload) : 'null') + ';');
    html = html.replace('<!-- GOOGLE_QUIZ_SCHEMA_PLACEHOLDER -->', schemaHtmlBlock);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.send(html);
  } catch (err: any) {
    console.error('[Quiz Server] Error serving page:', err);
    return res.status(500).send(`Internal Server Error: ${err.message}`);
  }
};

// GK Challenge Routing
const serveGkChallengeServer = async (req: any, res: any) => {
  await serveChallengeQuizServer(req, res, 'General Knowledge', 'GK Serve');
};

app.get('/gk', serveGkChallengeServer);
app.get('/daily-mcq-challenge', serveGkChallengeServer);
app.get('/daily-mcq-challenge.html', serveGkChallengeServer);

// Current Events Routing
const serveCurrentEventsChallengeServer = async (req: any, res: any) => {
  await serveChallengeQuizServer(req, res, 'Current Events', 'Current Events Serve');
};

app.get('/current-events', serveCurrentEventsChallengeServer);
app.get('/daily-current-events', serveCurrentEventsChallengeServer);

// Serve the standalone Guest Profile page
app.get(['/guest', '/guest-profile', '/guest-profile.html'], (req, res) => {
  try {
    const guestTemplatePath = path.resolve(__dirname, 'guest-profile.html');
    if (!fs.existsSync(guestTemplatePath)) {
      return res.status(404).send("<h2>Guest Profile template (guest-profile.html) not found.</h2>");
    }
    const html = fs.readFileSync(guestTemplatePath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    console.error('[Quiz Server] Error serving guest page:', err);
    return res.status(500).send(`Internal Server Error: ${err.message}`);
  }
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', service: 'quiz-backend' });
});

// Start listening
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`🚀 STANDALONE GUNDULU AI QUIZ SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🎯 Domain Target: quiz.utkalskillcentre.com`);
  console.log(`==================================================`);
});
