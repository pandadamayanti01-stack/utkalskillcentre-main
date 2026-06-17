require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure API key is configured
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY or VITE_GEMINI_API_KEY is not defined in your environment/dotenv file.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using Gemini 2.5 Pro as requested for the absolute best quality and precision
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const CONCURRENCY_LIMIT = 40; // Safely below 2000 RPM and 4,000,000 TPM limit

const promptPrefix = `You are a professional Odia educational proofreader and editor for the Board of Secondary Education, Odisha (BSE Odisha).
Your task is to fix any OCR errors, spelling mistakes, layout alignment errors, and number-word mismatches in the following Odia textbook page segment.

Rules:
1. Output ONLY the clean, corrected textbook page text in Odia.
2. Do not summarize, comment, explain, or add any intro/outro text.
3. Keep the original text meaning, numbers, structure, and chapter references intact.
4. Correct any obvious OCR misreads (e.g. garbled conjunct characters or incorrect character pairs).

Textbook Page Segment:
---
`;

async function cleanTextSegment(text, retries = 3) {
  const fullPrompt = `${promptPrefix}${text}\n---`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text().trim();
      if (responseText.length > 5) {
        return responseText;
      }
    } catch (e) {
      if (attempt === retries) {
        throw e;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }
  return text;
}

async function processClass(classNum) {
  const filename = `textbook_vectors_class_${classNum}_progress.json`;
  const filepath = path.resolve(__dirname, '..', filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️ Database file not found: ${filename} (skipping)`);
    return;
  }

  console.log(`\n📚 Starting Class ${classNum} audit...`);
  const content = fs.readFileSync(filepath, 'utf8');
  let data = JSON.parse(content);

  // Filter segments that need cleaning
  const tasks = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].text && data[i].text.trim().length >= 5) {
      tasks.push({ index: i, text: data[i].text });
    }
  }

  console.log(`  - Found ${tasks.length} active segments to process.`);
  let completedCount = 0;
  let errorCount = 0;

  // Process tasks with concurrency control
  const worker = async () => {
    while (tasks.length > 0) {
      const task = tasks.shift();
      if (!task) break;

      try {
        const cleanedText = await cleanTextSegment(task.text);
        data[task.index].text = cleanedText;
        completedCount++;
        if (completedCount % 50 === 0 || completedCount === 1 || completedCount === tasks.length) {
          console.log(`  [Class ${classNum}] Progress: ${completedCount}/${tasks.length} segments cleaned.`);
        }
      } catch (err) {
        errorCount++;
        console.error(`  ❌ Error processing Class ${classNum} index ${task.index}:`, err.message);
      }
    }
  };

  // Launch workers
  const workers = Array(Math.min(CONCURRENCY_LIMIT, tasks.length)).fill(null).map(worker);
  await Promise.all(workers);

  // Write changes back to file
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Class ${classNum} audit complete. Total cleaned: ${completedCount}, Errors/Failed: ${errorCount}`);
}

async function main() {
  console.log(`🚀 Starting Global Textbook OCR Cleanup Pipeline...`);
  console.log(`Model: Gemini 2.5 Pro | Parallel Workers: ${CONCURRENCY_LIMIT}\n`);
  
  const startTime = Date.now();
  
  for (const classNum of CLASSES) {
    await processClass(classNum);
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 All classes audited and cleaned successfully in ${durationSec} seconds!`);
}

main().catch(console.error);
