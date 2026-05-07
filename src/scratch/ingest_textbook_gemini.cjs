const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Service Account setup
const serviceAccountPath = path.join(__dirname, '..', '..', 'utkal-admin-sdk.json');
const serviceAccount = require(serviceAccountPath);

const dbId = 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';
const bucketName = 'utkalskillcentre.firebasestorage.app';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: dbId,
  storageBucket: bucketName
});

const db = admin.firestore();
const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Error: VITE_GEMINI_API_KEY is not defined in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function ingest() {
  console.log(`🚀 Starting Multi-Book AI Ingestion Pipeline...`);
  console.log(`📡 Connected to Storage Bucket: ${bucketName}`);
  
  try {
    const bucket = admin.storage().bucket();
    
    // List all files in the bucket
    console.log("Listing all files in bucket...");
    const [files] = await bucket.getFiles();
    
    // Filter out only PDF or TXT files inside textbook folders
    const textbookFiles = files.filter(f => 
      (f.name.startsWith('Rag Text Book/') || f.name.startsWith('Chapter Wise Text Book/')) &&
      (f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.txt'))
    );
    
    if (textbookFiles.length === 0) {
      console.log("❌ No PDF or TXT files found inside 'Rag Text Book/' or 'Chapter Wise Text Book/' on Firebase Storage.");
      return;
    }
    
    console.log(`📚 Found ${textbookFiles.length} textbook file(s) to process.`);
    
    for (let i = 0; i < textbookFiles.length; i++) {
      const file = textbookFiles[i];
      console.log(`\n------------------------------------------------------------`);
      console.log(`⚙️  [${i + 1}/${textbookFiles.length}] Processing: ${file.name}`);
      
      // Auto-detect Class and Subject from folder structure
      // Example path: Rag Text Book/Class 10/Mathematics/Sarala_Saha_Samikarana.pdf
      const pathParts = file.name.split('/');
      
      let detectedClass = "10"; // Fallback default
      let detectedSubject = "Mathematics"; // Fallback default
      
      if (pathParts.length >= 3) {
        // e.g., pathParts[1] = "Class 10" or "Class 7"
        const classFolder = pathParts[1];
        const classMatch = classFolder.match(/\d+/);
        if (classMatch) {
          detectedClass = classMatch[0];
        }
        
        // e.g., pathParts[2] = "Mathematics" or "Science"
        const subjectFolder = pathParts[2];
        if (subjectFolder && !subjectFolder.toLowerCase().endsWith('.pdf') && !subjectFolder.toLowerCase().endsWith('.txt')) {
          detectedSubject = subjectFolder;
        }
      }
      
      console.log(`📍 Detected Metadata: Class ${detectedClass} | Subject: ${detectedSubject}`);
      
      // Local download path
      const localTempPath = path.join(__dirname, `temp_book_${Date.now()}` + path.extname(file.name));
      console.log(`📥 Downloading file locally...`);
      
      await file.download({ destination: localTempPath });
      console.log("✅ Download complete!");
      
      let textContent = '';
      
      if (file.name.toLowerCase().endsWith('.pdf')) {
        console.log("📄 Parsing PDF text content...");
        const dataBuffer = fs.readFileSync(localTempPath);
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        textContent = pdfData.text || '';
        console.log(`✅ PDF parsed successfully. Total characters: ${textContent.length}`);
      } else {
        console.log("📄 Reading TXT file content...");
        textContent = fs.readFileSync(localTempPath, 'utf8');
        console.log(`✅ TXT read successfully. Total characters: ${textContent.length}`);
      }
      
      // Cleanup local temp file
      try {
        fs.unlinkSync(localTempPath);
      } catch (e) {}

      if (!textContent || textContent.trim().length === 0) {
        console.error("❌ Error: Extracted content is empty. Skipping this file.");
        continue;
      }

      // Analyze textbook content and generate structured chapters with Gemini
      console.log("🤖 Chunking & summarizing using Gemini 2.5 Flash...");
      const textSlice = textContent.slice(0, 150000); // Process up to 150k characters for precise summaries
      
      const prompt = `
      You are an expert curriculum designer and pedagogy specialist for Odisha Board schools (Class ${detectedClass}).
      I am giving you the text of a school textbook for Class ${detectedClass} in the subject of "${detectedSubject}".
      Analyze this text, divide it into distinct, standard educational chapters, and write summarized study notes for each chapter.
      
      For each chapter, generate the following fields:
      1. "title": A beautiful bilingual chapter title in English and Odia (e.g., "Quadratic Equations - ଦ୍ୱିଘାତ ସମୀକରଣ" or "Life Science - ଜୀବ ବିଜ୍ଞାନ")
      2. "subject": "${detectedSubject}"
      3. "class": "${detectedClass}"
      4. "notes": A rich, comprehensive pedagogical study notes summary for the chapter. It should have definitions, clear explanations, formulas, or rules written in simple, friendly, bilingual text (English + Odia scripts) so our sweet study buddy AI "Gundulu" can use it to teach.
      
      Return the output STRICTLY as a JSON array of objects. Do not include any markdown wrappers like \`\`\`json, just the raw JSON.
      [
        {
          "class": "${detectedClass}",
          "subject": "${detectedSubject}",
          "title": "Bilingual Title",
          "notes": "Pedagogical lesson summary..."
        }
      ]
      
      Textbook Content:
      ${textSlice}
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse the JSON array
      let chaptersList = [];
      try {
        const cleanedJson = responseText.replace(/```json\n?|```/g, '').trim();
        chaptersList = JSON.parse(cleanedJson);
      } catch (err) {
        console.error("❌ Failed to parse Gemini response as JSON:", responseText);
        continue;
      }
      
      console.log(`🎉 Gemini successfully extracted ${chaptersList.length} structured chapter(s) from this file!`);
      
      // Write chapters to Firestore
      console.log("💾 Writing chapters to Firestore collection 'chapters'...");
      const chaptersCol = db.collection('chapters');
      
      for (const ch of chaptersList) {
        const classStr = ch.class.startsWith('class') ? ch.class : `class${ch.class}`;
        console.log(`- Writing chapter: "${ch.title}" (Subject: ${ch.subject}, Class: ${classStr})...`);
        
        // Look if this chapter title already exists to avoid duplication
        const existingQuery = await chaptersCol
          .where('class', '==', classStr)
          .where('title', '==', ch.title)
          .get();
          
        if (existingQuery.size > 0) {
          // Update existing
          const docId = existingQuery.docs[0].id;
          await chaptersCol.doc(docId).update({
            notes: ch.notes,
            subject: ch.subject,
            class: classStr
          });
          console.log(`  └─ Updated existing chapter document (ID: ${docId})`);
        } else {
          // Add new
          const newDoc = await chaptersCol.add({
            class: classStr,
            subject: ch.subject,
            title: ch.title,
            notes: ch.notes,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`  └─ Created new chapter document (ID: ${newDoc.id})`);
        }
      }
    }
    
    console.log("\n🌟 All textbooks processed successfully! Ingestion Pipeline Completed!");
  } catch (err) {
    console.error("❌ Ingestion Error:", err.stack);
  }
  process.exit(0);
}

ingest();
