const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Define custom database ID and bucket
const dbId = process.env.FIRESTORE_DATABASE_ID || 'utkal-prod';
const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'utkalskillcentre.firebasestorage.app';

// Set up Service Account
const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`❌ Service account key not found at: ${serviceAccountPath}`);
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'utkalskillcentre',
    storageBucket: bucketName
  });
}

const db = getFirestore(admin.app(), dbId);
const bucket = admin.storage().bucket();

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is not defined in .env");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

// Parse CLI Arguments
const args = process.argv.slice(2);
const classArg = args.find(a => a.startsWith('--class='))?.split('=')[1] || 'all';
const isDryRun = args.includes('--dry-run');
const forceOverwrites = args.includes('--force');
const isMetadataOnly = args.includes('--metadata-only');

// Normalization function to match text strings bilingually
function cleanTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[?.!,:;()\-_\s|\\/]/g, '') // Remove spacing/punctuation/dashes
    .trim();
}

// Extraction utility to grab core chapter name from file path
function extractChapterName(filePath) {
  let name = filePath.replace(/\.pdf$/i, '');
  const lastSlash = name.lastIndexOf('/');
  if (lastSlash !== -1) {
    name = name.slice(lastSlash + 1);
  }
  // Remove known prefixes
  name = name.replace(/^class\d+[_]?chapter[_]?\d+[_]?/i, '');
  name = name.replace(/^chapter[_]?\d+[-_]?/i, '');
  name = name.replace(/^c\d+_[a-z0-9]+_ch\d+[_]?/i, '');
  name = name.replace(/_ready$/i, '');
  return name.replace(/[_-]/g, ' ').trim();
}

// Extraction utility to grab numeric chapter order/index from file path
function extractChapterOrder(filePath) {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  const match = fileName.match(/(?:chapter|ch)[-_]?\s*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 1;
}

// Map class and path features to Odisha BSE curriculum subject naming
function getStandardSubject(classNum, filePath) {
  // Always return 'math' to match the frontend subject translation and filtering key ('math')
  return 'math';
}

// Sanitize raw response from Gemini
function cleanJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

async function run() {
  console.log(`===================================================================`);
  console.log(`🚀 UTKAL SKILL CENTRE: MATHEMATICS AI INGESTION SYSTEM`);
  console.log(`   Mode: ${isDryRun ? '🔍 DRY RUN (Simulated)' : '⚡ LIVE RUN'}`);
  console.log(`   Class Filter: ${classArg}`);
  console.log(`   Force Overwrites: ${forceOverwrites ? 'Yes ⚠️' : 'No'}`);
  console.log(`===================================================================\n`);

  // Create temporary directory for downloads
  const tempDir = path.join(__dirname, 'temp_ingest');
  if (!isDryRun && !fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  try {
    // 1. Fetch existing chapters from Firestore
    console.log("📡 Fetching existing chapter structures from Firestore...");
    const chaptersSnap = await db.collection('chapters').get();
    const existingChapters = chaptersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`ℹ️ Loaded ${existingChapters.length} chapters from Firestore.\n`);

    // 2. Scan Storage for chapter-wise Mathematics PDFs
    console.log("📂 Scanning Firebase Storage bucket...");
    const [files] = await bucket.getFiles({ prefix: 'Chapter Wise Text Book/' });

    // Filter matching textbooks
    const rawMatches = files.filter(f => {
      const nameLower = f.name.toLowerCase();
      const isPdf = nameLower.endsWith('.pdf');
      const isMath = nameLower.includes('mathematics') || nameLower.includes('mathmetics') || nameLower.includes('math');
      const isAnswerKey = nameLower.includes('/answers') || nameLower.includes('/answer') || nameLower.includes('answer_key') || nameLower.includes('answers_key');
      return isPdf && isMath && !isAnswerKey;
    });

    // Parse files metadata
    const candidates = rawMatches.map(f => {
      // e.g. "Chapter Wise Text Book/Class 10/Mathematics/Chapter 1 - Sarala Saha Samikarana/file.pdf"
      const parts = f.name.split('/');
      let classNum = "unknown";

      const classPart = parts.find(p => p.toLowerCase().startsWith('class '));
      if (classPart) {
        const numMatch = classPart.match(/\d+/);
        if (numMatch) classNum = numMatch[0];
      }

      return {
        file: f,
        filePath: f.name,
        sizeBytes: parseInt(f.metadata.size, 10),
        classNum,
        subject: getStandardSubject(classNum, f.name),
        chapterName: extractChapterName(f.name)
      };
    }).filter(c => c.classNum !== "unknown" && (classArg === 'all' || c.classNum === classArg));

    console.log(`🔍 Found ${candidates.length} Mathematics PDF chapters matching parameters.\n`);

    if (candidates.length === 0) {
      console.log("⏹️ No files to process. Exiting.");
      process.exit(0);
    }

    // 3. Sequential Ingestion Queue
    let processedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      const classStr = `class${item.classNum}`;
      console.log(`-------------------------------------------------------------------`);
      console.log(`📦 [${i + 1}/${candidates.length}] ${item.filePath}`);
      console.log(`   Class: ${item.classNum} | Standard Subject: ${item.subject}`);
      console.log(`   Extracted Chapter: "${item.chapterName}" | Size: ${(item.sizeBytes / 1024 / 1024).toFixed(2)} MB`);

      // Match in-memory to find duplicates
      const cleanedFileChapter = cleanTitle(item.chapterName);
      let matchedDoc = existingChapters.find(ch => {
        // 1. Match strictly on storagePath to prevent false duplicate-title overlaps
        if (ch.storagePath && ch.storagePath === item.filePath) {
          return true;
        }
        // 2. Fallback: match on Class, Subject (math-related), and normalized Odia Chapter Title
        const isMathSubject = (s) => {
          if (!s) return false;
          const sl = s.toLowerCase();
          return sl.includes('math') || sl.includes('ganita') || sl.includes('algebra') || sl.includes('geometry') || sl.includes('ବୀଜଗଣିତ') || sl.includes('ଜ୍ୟାମିତି') || sl.includes('ଗଣିତ') || sl.includes('ପ୍ରକାଶ') || sl.includes('ମେଳା');
        };
        const classStrOfCh = `class${item.classNum}`;
        const cleanChClass = ch.class ? ch.class.toLowerCase().replace(/\s+/g, '') : '';
        const isSameClass = cleanChClass === classStrOfCh;
        return isSameClass && isMathSubject(ch.subject) && cleanTitle(ch.title) === cleanedFileChapter;
      });

      if (matchedDoc) {
        console.log(`   🔗 Matched Firestore Doc ID: ${matchedDoc.id} (Title: "${matchedDoc.title}")`);
        const hasPdfUrl = matchedDoc.pdfUrl || matchedDoc.download_url;
        if (isMetadataOnly && hasPdfUrl && !forceOverwrites) {
          console.log(`   ⏭️  PDF URL already exists in skeleton document. Skipping.`);
          skippedCount++;
          continue;
        }
        if (!isMetadataOnly && matchedDoc.notes && matchedDoc.notes.length > 500 && !forceOverwrites) {
          console.log(`   ⏭️  Notes exist (${matchedDoc.notes.length} chars). Skipping.`);
          skippedCount++;
          continue;
        }
      } else {
        console.log(`   ➕ No matching Firestore document. New chapter document will be created.`);
      }

      if (isDryRun) {
        console.log(`   🔍 Dry Run: Process would be initiated here.`);
        processedCount++;
        continue;
      }

      // Live Ingestion Workflow
      const localTempPath = path.join(tempDir, `temp_ch_${item.classNum}_${Date.now()}.pdf`);
      try {
        console.log(`   🔗 Creating far-future signed PDF URL...`);
        const [downloadUrl] = await item.file.getSignedUrl({
          action: 'read',
          expires: '12-31-2050',
          queryParams: {
            'response-content-type': 'application/pdf',
            'response-content-disposition': 'inline'
          }
        });

        let generatedTitle = item.chapterName;
        let generatedNotes = matchedDoc ? (matchedDoc.notes || '') : '';

        if (isMetadataOnly) {
          console.log(`   ⏭️  [Metadata-Only Mode] Bypassing PDF download and Gemini OCR content extraction.`);
        } else {
          // Download PDF
          console.log("   📥 Downloading PDF from Storage...");
        await item.file.download({ destination: localTempPath });

        // Convert PDF to Base64 for multimodal processing
        console.log("   🔄 Converting PDF to Base64 for Gemini multimodal OCR...");
        const pdfBase64 = fs.readFileSync(localTempPath).toString('base64');
        const pdfPart = {
          inlineData: {
            data: pdfBase64,
            mimeType: "application/pdf"
          }
        };

        const systemPrompt = `
You are an expert curriculum designer and senior mathematics pedagogue for Odisha Board schools (BSE Odisha, Class ${item.classNum}).
Analyze the textbook PDF and generate a comprehensive, highly structured study guide/cheat sheet in Odia, with technical terms bilingually formatted (English translation in parentheses, e.g., "ସରଳ ସହସମୀକରଣ (Linear Equations)").

Keep the notes extremely structured and pedagogical. Use neat markdown headings, bulleted lists, standard bold markings, and clean text math formulas (e.g., x^2 + y^2 = r^2, D = b^2 - 4ac) to represent equations clearly.

Structure the guide into 3 primary Markdown parts:
1. **ମୁଖ୍ୟ ବିଷୟବସ୍ତୁ ସଂକ୍ଷେପ (Core Concept Summary)**: Key axioms, formulas, theorems, and definitions explained simply.
2. **ସମାଧାନ ସହ ଉଦାହରଣ (Step-by-Step Solved Examples)**: Break down 2 or 3 standard problems step-by-step in Odia.
3. **ଅଭ୍ୟାସ ପ୍ରଶ୍ନ (Practice Corner)**: 
   - 3 Multiple Choice Questions (MCQs) with options and correct answers.
   - 2 Subjective questions with step-by-step explanations.

STRICT FORMAT:
You must output a single JSON object. Do not include markdown fences like \`\`\`json, just return the raw JSON object string:
{
  "title": "Bilingual Chapter Title (Odia - English)",
  "notes": "Full pedagogical Markdown Study Notes containing Core Concepts, Solved Examples, and Practice Corner"
}
        `;

        // Call Gemini Multimodal with Multi-Model / Multi-Version Fallback
        const MODELS_TO_TRY = [
          "gemini-2.5-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-1.5-pro",
          "gemini-2.5-pro"
        ];

        let responseText = '';
        let modelSuccess = false;

        for (const modelName of MODELS_TO_TRY) {
          if (modelSuccess) break;
          for (const apiVersion of ["v1beta", "v1"]) {
            try {
              console.log(`   🤖 Attempting Gemini model ${modelName} via API version ${apiVersion}...`);
              const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion });

              const generationConfig = {
                temperature: 0.2,
                ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
              };

              const response = await model.generateContent({
                contents: [
                  { role: 'user', parts: [{ text: systemPrompt }, pdfPart] }
                ],
                generationConfig
              });

              responseText = cleanJsonResponse(response.response.text());
              console.log(`   ✅ Success using ${modelName} (${apiVersion})!`);
              modelSuccess = true;
              break; // Success, break API version loop
            } catch (modelError) {
              const isQuotaExceeded = modelError.message?.includes('Quota exceeded') || modelError.message?.includes('429');
              console.warn(`   ⚠️ Model ${modelName} (${apiVersion}) failed: ${modelError.message.slice(0, 180)}...`);
              if (isQuotaExceeded) {
                // Quota exceeded for this model, don't waste time on other API versions of the same model
                break;
              }
            }
          }
        }

        if (!modelSuccess || !responseText) {
          throw new Error("All available Gemini models and API versions failed or exceeded their daily free-tier quotas.");
        }

        const parsedResponse = JSON.parse(responseText);

        const generatedTitle = parsedResponse.title || item.chapterName;
        const generatedNotes = parsedResponse.notes || '';

        if (!generatedNotes) {
          throw new Error("Gemini generated empty study notes.");
        }

          console.log(`   ✅ Study notes generated successfully (${generatedNotes.length} characters).`);
        }

        // Upsert to Firestore
        const chapterPayload = {
          class: classStr,
          subject: item.subject,
          title: generatedTitle,
          notes: generatedNotes,
          status: 'published',
          board: 'Odisha Board (Odia Medium)',
          storagePath: item.filePath,
          pdfUrl: downloadUrl,
          download_url: downloadUrl,
          order: matchedDoc && matchedDoc.order !== undefined ? matchedDoc.order : extractChapterOrder(item.filePath),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        if (matchedDoc) {
          // Update
          await db.collection('chapters').doc(matchedDoc.id).set(chapterPayload, { merge: true });
          console.log(`   ✅ Updated existing document: ${matchedDoc.id}`);
        } else {
          // Insert new
          chapterPayload.created_at = admin.firestore.FieldValue.serverTimestamp();
          const docRef = await db.collection('chapters').add(chapterPayload);
          // Set ID on the record too for consistency
          await docRef.update({ id: docRef.id });
          console.log(`   ✅ Created new document: ${docRef.id}`);
        }

        processedCount++;
      } catch (err) {
        console.error(`   ❌ Failed processing file:`, err.message);
        failedCount++;
      } finally {
        // Clean up temp file
        if (fs.existsSync(localTempPath)) {
          fs.unlinkSync(localTempPath);
        }
      }
    }

    // Print summary report
    console.log(`\n===================================================================`);
    console.log(`🎉 INGESTION RUN COMPLETED!`);
    console.log(`   Total Candidates Matched: ${candidates.length}`);
    console.log(`   Processed / Ingested:    ${processedCount}`);
    console.log(`   Skipped (Already Done):   ${skippedCount}`);
    console.log(`   Failed:                  ${failedCount}`);
    console.log(`===================================================================`);

  } catch (err) {
    console.error("❌ Fatal Error in ingestion runner:", err.message);
  } finally {
    // Clean temp folder
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmdirSync(tempDir);
      } catch (e) { }
    }
    process.exit(0);
  }
}

run();
