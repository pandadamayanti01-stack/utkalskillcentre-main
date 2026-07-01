import dotenv from 'dotenv';
import path from 'path';
import { initializeApp, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getServiceAccountCredentials } from '../src/server/googleCredentials';
import { google } from 'googleapis';

// Load local environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const TEXTBOOK_BUCKET_NAME = process.env.TEXTBOOK_STORAGE_BUCKET || 'utkalskillcentre-admin';

// Initialize Firebase Admin App
function getInitializedAdminApp() {
  if (getApps().length > 0) return getApp();
  return initializeApp({
    credential: applicationDefault(),
    storageBucket: TEXTBOOK_BUCKET_NAME,
  });
}

// Simple sleep helper to prevent API rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to call Vertex AI Gemini 2.5 API
async function generateVertexContent(prompt: string): Promise<string> {
  const creds = getServiceAccountCredentials();
  let accessToken: string | null = null;
  let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';

  if (creds) {
    projectId = creds.project_id || projectId;
    const vertexAuth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const authClient = await vertexAuth.authorize();
    accessToken = authClient.access_token || null;
  } else {
    // Attempt ambient Google Application Default Credentials (ADC)
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    accessToken = tokenResponse.token || null;
    projectId = await auth.getProjectId() || projectId;
  }

  if (!accessToken) {
    throw new Error('Failed to retrieve Google Cloud Access Token for Vertex AI.');
  }

  // Use Gemini 2.5 Pro for maximum accuracy, styling, and premium reasoning
  const vertexModel = 'gemini-2.5-pro';
  const vertexUrl = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${vertexModel}:generateContent`;

  console.log(`[Vertex AI] Prompting ${vertexModel} in project "${projectId}"...`);

  const response = await fetch(vertexUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2, // Low temperature for highly precise spelling, calculations, and translations
        maxOutputTokens: 8192
      },
      safetySettings: [
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vertex API call failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!generatedText) {
    throw new Error('Vertex API returned empty content.');
  }

  return generatedText;
}

async function upgradeNotes() {
  const adminApp = getInitializedAdminApp();
  const db = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || 'utkal-prod');

  console.log('🚀 Loading all published chapters from Firestore...');
  const chaptersSnapshot = await db.collection('chapters')
    .where('status', '==', 'published')
    .get();

  // Programmatically filter to process only Class 10 chapters (to avoid requiring new Firestore indexes)
  const chapters = chaptersSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as any))
    .filter(c => {
      const clsDigit = String(c.class || '').replace(/\D/g, '');
      return clsDigit === '5';
    });
  
  // Set to null to process all matching chapters
  const TRIAL_LIMIT: number | null = null;
  const chaptersToProcess = TRIAL_LIMIT ? chapters.slice(0, TRIAL_LIMIT) : chapters;
  
  console.log(`📋 Found ${chapters.length} published Class 5 chapters. Starting full batch upgrade for all ${chaptersToProcess.length} chapters...`);

  for (let i = 0; i < chaptersToProcess.length; i++) {
    const chapter = chaptersToProcess[i];
    const chapterId = chapter.id;
    const title = chapter.title || '';
    const subject = chapter.subject || 'Mathematics';
    const classStr = chapter.class || '10';
    const classDigit = classStr.replace(/\D/g, '');

    // SMART RESUME: Skip if notes already contain premium structure (length > 1000 characters and contains introduction headers)
    const existingNotes = chapter.notes || '';
    if (existingNotes.length > 1000 && (existingNotes.includes('ଉପକ୍ରମଣିକା') || existingNotes.includes('Introduction') || existingNotes.includes('Core Concepts') || existingNotes.includes('Syllabus'))) {
      console.log(`⏭️ Skipping [${i + 1}/${chaptersToProcess.length}]: Class ${classDigit} - ${subject} - "${title}" (Already upgraded)`);
      continue;
    }

    console.log(`\n------------------------------------------------------------`);
    console.log(`[${i + 1}/${chaptersToProcess.length}] Upgrading: Class ${classDigit} - ${subject} - "${title}"...`);

    // 1. Determine Subject-Specific Language Routing
    let languageRules = '';
    const isMathOrScienceOrSocial = /math|science|social|vocational|ଭୂଗୋଳ|ଇତିହାସ|ବିଜ୍ଞାନ|ଗଣିତ/i.test(subject);
    const isEnglish = /english|ଇଂରାଜୀ/i.test(subject);
    const isSanskrit = /sanskrit|ସଂସ୍କୃତ/i.test(subject);
    const isHindi = /hindi|ହିନ୍ଦୀ/i.test(subject);
    const isOdiaSubject = /odia|ଓଡ଼ିଆ/i.test(subject) && !isMathOrScienceOrSocial;

    if (isEnglish) {
      languageRules = 'Write the notes entirely in English. All text, examples, and definitions must be in English script.';
    } else if (isSanskrit) {
      languageRules = 'Write the notes entirely in Sanskrit language using Devanagari script.';
    } else if (isHindi) {
      languageRules = 'Write the notes entirely in Hindi language using Devanagari script.';
    } else if (isOdiaSubject) {
      languageRules = 'Write the notes entirely in Odia language using Odia script.';
    } else {
      // Mathematics, Science, Social Science, Vocational, etc.
      languageRules = `Write all explanations, descriptions, and definitions in high-quality, native school-level Odia script.
However, for all mathematical expressions, algebraic formulas, variables (like x, y, a, b), equations, and numeric values (like 1, 2, 10), you MUST write in standard English/Arabic characters and numerals (e.g. write "x = 2", NOT "x = ୨"). Do not mix Odia numerals in math equations.`;
    }

    // 2. Build the Powerhouse Prompt
    const prompt = `You are a senior academic textbook author and curriculum developer.
Your goal is to generate exceptionally comprehensive, premium, and mathematically error-free study notes for the chapter: "${title}" in the subject of "${subject}" (Class ${classDigit}).

This must be a full, detailed textbook guide (approximately 1500–2000 words) covering the entire syllabus of this chapter. Do NOT write a brief summary.

Strict Language Rules:
${languageRules}

Odia Quality & Translation Rules:
- Write in the natural, fluent, and warm tone of a native school teacher from Odisha. Avoid literal English-to-Odia machine translations.
- Use standard grammatical spelling, correct conjunct letters (ଯୁକ୍ତାକ୍ଷର), and proper Odia sentence structures.
- CRITICAL SPELLING RULES: Ensure all words are spelled exactly correctly:
  * "Region/area" must be spelled strictly as "ଅଞ୍ଚଳ" (using the Nya-Ca conjunct ଞ୍ଚ, NEVER "ଅଞ୍ଛଳ" or with a ଛ).
  * "Chapter" must be spelled strictly as "ଅଧ୍ୟାୟ".
  * "Question" must be spelled strictly as "ପ୍ରଶ୍ନ".
  * "Answer" must be spelled strictly as "ଉତ୍ତର".
  * "Example" must be spelled strictly as "ଉଦାହରଣ".
- STRICT FACTUAL ACCURACY: You must verify the correct author and genre of the chapter from the official Odisha BSE Board curriculum before writing notes.
  * For example, the chapter "ଜନ୍ମଭୂମି (Janmabhumi)" is a Prabandha (ପ୍ରବନ୍ଧ - prose essay) written by the famous historian Dr. Krishna Chandra Panigrahi (କୃଷ୍ଣଚନ୍ଦ୍ର ପାଣିଗ୍ରାହୀ). It is NOT a poem (କବିତା) and it is NOT written by Krishna Chandra Tripathi. You must state this correctly!
- IMPORTANT: Always write the English academic term in parentheses next to the Odia term when introducing key concepts (e.g. write "ସରଳ ସହସମୀକରଣ (Linear Simultaneous Equations)" or "ପ୍ରତିଫଳନ (Reflection)").

Please compile the notes strictly in this format:

1. # ${title}
   - Start directly with the main title. No conversational intro, greetings, or chat filler.

2. ## Introduction & Core Concepts (ଉପକ୍ରମଣିକା ଓ ମୁଖ୍ୟ ଧାରଣା)
   - A detailed explanation of the concept's real-world applications and significance.

3. ## Chapter Syllabus Breakdown (ପାଠ୍ୟକ୍ରମର ବିସ୍ତୃତ ଆଲୋଚନା)
   Identify and break down the chapter into at least 4 to 5 major subtopics. For EACH subtopic:
   - ### [Subtopic Name]
     - Write a detailed academic explanation of the theory, laws, or theorems.
     - Use comparison tables (using markdown syntax) for contrasting concepts.
     - Highlight key definitions using blockquotes.
     - Highlight all equations/formulas using double-dollar LaTeX syntax (e.g. $$a^2 + b^2 = c^2$$).

4. ## Step-by-Step Solved Examples (ସମାଧାନ ସହ ଉଦାହରଣ)
   - Include 3 to 4 comprehensive, step-by-step solved problems ranging from Easy to Hard.
   - Write out every algebraic and arithmetic step. Double-check all signs (+/-) and numbers.
   - Verify all calculations carefully before outputting. Ensure there are ZERO mathematical errors.

5. ## Textbook Exercise Questions & Solutions (ପାଠ୍ୟକ୍ରମ ଅଭ୍ୟାସ ପ୍ରଶ୍ନ ଓ ସମାଧାନ)
   - Identify and list 4 to 5 key, most important textbook back-exercise questions from this chapter.
   - For each question, write out its complete, highly detailed, and step-by-step solved answer/solution with absolute correctness.
   - Ensure the selection covers both conceptual short-answer and long-answer questions.

6. ## Quick Revision Summary (ସଂକ୍ଷିପ୍ତ ସାରାଂଶ)
   - A summary list of all formulas, key laws, and definitions for quick revision.

7. ## Practice Challenge Questions (ଅଭ୍ୟାସ ପ୍ରଶ୍ନ)
   - 3 conceptual questions and 2 numerical problems for students to test their understanding.

CRITICAL GUIDELINES:
- Output ONLY the clean Markdown textbook content.
- Do not output any apologies, draft corrections, or conversational chat text. If you recalculate a step, output only the correct, direct mathematical steps.`;

    try {
      const generatedContent = await generateVertexContent(prompt);

      if (generatedContent && generatedContent.trim().length > 200) {
        console.log(`[Firestore] Overwriting notes field for chapter document: ${chapterId}...`);
        await db.collection('chapters').doc(chapterId).update({
          notes: generatedContent
        });
        console.log(`✨ Successfully upgraded notes for: "${title}"`);
      } else {
        console.warn(`⚠️ Warning: Received empty or too short content from Vertex, skipping update.`);
      }
    } catch (err: any) {
      console.error(`❌ Error upgrading chapter "${title}":`, err.message || err);
    }

    // Delay 3 seconds between chapters to prevent API rate limiting
    console.log('Sleeping 3 seconds before next chapter...');
    await sleep(3000);
  }

  console.log('\n🎉 ALL CHAPTER NOTES UPGRADED SUCCESSFULLY TO PREMIUM FORMAT!');
}

upgradeNotes().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Global script error:', err);
  process.exit(1);
});
