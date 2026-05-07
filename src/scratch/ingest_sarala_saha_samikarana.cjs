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
const bucketName = 'utkalskillcentre-admin';

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

async function run() {
  console.log(`🚀 Starting Ingestion for "Sarala Saha Samikarana"...`);
  console.log(`📡 Downloading Class_10_Algebra.pdf from bucket: ${bucketName}...`);
  
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file('Class 10/Algebra/Class_10_Algebra.pdf');
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.log("❌ Could not find Class 10/Algebra/Class_10_Algebra.pdf in bucket!");
      return;
    }
    
    // Local download path
    const localTempPath = path.join(__dirname, 'temp_class_10_algebra.pdf');
    console.log(`📥 Downloading PDF file locally to: ${localTempPath}...`);
    
    await file.download({ destination: localTempPath });
    console.log("✅ Download complete! Parsing PDF pages...");
    
    const dataBuffer = fs.readFileSync(localTempPath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    const extractedText = pdfData.text || '';
    
    console.log(`✅ Text successfully extracted! Total characters: ${extractedText.length}`);
    console.log(`🧹 Cleaning up temp file...`);
    fs.unlinkSync(localTempPath);
    
    // Since Chapter 1 is at the very beginning of the Algebra book, we can slice the first 120,000 characters
    // (which is around 40 pages of text, plenty to cover Chapter 1 with full mathematical details!).
    const textSlice = extractedText.slice(0, 120000);
    
    console.log("🤖 Sending Class 10 Algebra Chapter 1 text to Gemini 2.5 Flash...");
    
    const prompt = `
    You are an expert Math tutor and curriculum developer from Odisha.
    Analyze the following text from the Class 10 Algebra (ବୀଜଗଣିତ) textbook. 
    Focus on Chapter 1, which is "Sarala Saha Samikarana (ସରଳ ସହସମୀକରଣ / Linear Simultaneous Equations)".
    
    Generate a highly structured Firestore Chapter document with the following fields:
    1. "class": "10"
    2. "subject": "Mathematics"
    3. "title": "Sarala Saha Samikarana - ସରଳ ସହସମୀକରଣ"
    4. "notes": Write a very rich, clear, step-by-step pedagogical notes summary for this chapter. Explain:
       - What is a Linear Simultaneous Equation (ସରଳ ସହସମୀକରଣ).
       - The conditions for consistency (ସଙ୍ଗତ ଓ ନିର୍ଭରଶୀଳ, ଅସଙ୍ଗତ etc. using a1/a2, b1/b2 ratios).
       - The three methods of solving:
         a) Substitution Method (ପ୍ରତିକଳ୍ପନ ପ୍ରଣାଳୀ)
         b) Elimination Method (ଅପସାରଣ ପ୍ରଣାଳୀ)
         c) Cross-Multiplication Method (ବଜ୍ରଗୁଣନ ପ୍ରଣାଳୀ)
         d) Cramer's Rule / Determinant method (କ୍ରାମରଙ୍କ ନିୟମ).
       Ensure all math equations are clearly written, using simple bilingual language (friendly Odia script + English formulas) so our virtual tutor "Gundulu" can read it beautifully and display it to students.
       
    Return your output STRICTLY as a raw JSON object (not inside markdown blocks):
    {
      "class": "10",
      "subject": "Mathematics",
      "title": "Sarala Saha Samikarana - ସରଳ ସହସମୀକରଣ",
      "notes": "..."
    }
    
    Textbook Content excerpt:
    ${textSlice}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let chapterDoc = null;
    try {
      const cleanedJson = responseText.replace(/```json\n?|```/g, '').trim();
      chapterDoc = JSON.parse(cleanedJson);
    } catch (err) {
      console.error("❌ Failed to parse JSON from Gemini:", responseText);
      return;
    }
    
    console.log(`🎉 Gemini successfully generated notes for: "${chapterDoc.title}"!`);
    console.log("💾 Saving Chapter to Firestore 'chapters' collection...");
    
    const chaptersCol = db.collection('chapters');
    
    // Check if the chapter already exists to prevent duplicate entries
    const existingQuery = await chaptersCol
      .where('class', '==', 'class10')
      .where('title', '==', 'Sarala Saha Samikarana - ସରଳ ସହସମୀକରଣ')
      .get();
      
    if (existingQuery.size > 0) {
      const docId = existingQuery.docs[0].id;
      await chaptersCol.doc(docId).update({
        notes: chapterDoc.notes,
        subject: 'Mathematics',
        class: 'class10'
      });
      console.log(`✅ Updated existing chapter document in Firestore (ID: ${docId})`);
    } else {
      const newDoc = await chaptersCol.add({
        class: 'class10',
        subject: 'Mathematics',
        title: chapterDoc.title,
        notes: chapterDoc.notes,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Created brand new chapter document in Firestore (ID: ${newDoc.id})`);
    }
    
    console.log("🌟 Chapter 1 (Sarala Saha Samikarana) is fully active on the platform!");
  } catch (err) {
    console.error("❌ Ingestion Error:", err.stack);
  }
  process.exit(0);
}

run();
