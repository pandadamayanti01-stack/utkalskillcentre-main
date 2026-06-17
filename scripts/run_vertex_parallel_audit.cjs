require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { GoogleAuth } = require('google-auth-library');

// Load environment configurations
const projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';
const region = process.env.VERTEX_AI_REGION || 'us-central1';
const CONCURRENCY_LIMIT = 15; // Safe speed to stay within Vertex AI RPM limits
const CLASSES = ['3', '4', '5', '6', '7', '8', '9', '10']; // Resume from Class 3

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

let cachedAccessToken = null;
let tokenExpiryTime = 0;

// Authenticate using GOOGLE_APPLICATION_CREDENTIALS
async function getAccessToken() {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiryTime) {
    return cachedAccessToken;
  }

  try {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    
    cachedAccessToken = tokenResponse.token;
    tokenExpiryTime = now + 45 * 60 * 1000; // Refresh 15 mins before expiry (total 60 mins)
    return cachedAccessToken;
  } catch (error) {
    console.error("❌ Authentication Error:", error.message);
    throw error;
  }
}

// Call Vertex AI REST API
function callVertexAi(text, accessToken, retries = 3) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${promptPrefix}${text}\n---`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2
      }
    });

    const options = {
      hostname: `${region}-aiplatform.googleapis.com`,
      path: `/v1/projects/${projectId}/locations/${region}/publishers/google/models/gemini-2.5-pro:generateContent`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const runRequest = (attempt) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const responseObj = JSON.parse(body);
              const responseText = responseObj.candidates[0].content.parts[0].text.trim();
              if (responseText.length > 5) {
                resolve(responseText);
              } else {
                resolve(text);
              }
            } catch (err) {
              reject(new Error("Failed to parse Vertex AI response body: " + err.message));
            }
          } else if (res.statusCode === 429 && attempt < retries) {
            // Rate limited, backoff and retry
            setTimeout(() => runRequest(attempt + 1), attempt * 2000);
          } else {
            reject(new Error(`Vertex AI returned status code ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (err) => {
        if (attempt < retries) {
          setTimeout(() => runRequest(attempt + 1), attempt * 2000);
        } else {
          reject(err);
        }
      });

      req.write(payload);
      req.end();
    };

    runRequest(1);
  });
}

async function processClass(classNum) {
  const filename = `textbook_vectors_class_${classNum}_progress.json`;
  const filepath = path.resolve(__dirname, '..', filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️ Database file not found: ${filename} (skipping)`);
    return;
  }

  console.log(`\n📚 Starting Class ${classNum} audit via Vertex AI...`);
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

  const worker = async () => {
    while (tasks.length > 0) {
      const task = tasks.shift();
      if (!task) break;

      try {
        const token = await getAccessToken();
        const cleanedText = await callVertexAi(task.text, token);
        data[task.index].text = cleanedText;
        completedCount++;
        
        if (completedCount % 50 === 0 || completedCount === 1 || completedCount === tasks.length) {
          console.log(`  [Class ${classNum}] Progress: ${completedCount}/${tasks.length} segments cleaned.`);
        }
      } catch (err) {
        errorCount++;
        console.error(`  ❌ Error processing Class ${classNum} index ${task.index}:`, err.message);
      }
      
      // Minor delay to keep request rate steady
      await new Promise(resolve => setTimeout(resolve, 300));
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
  console.log(`🚀 Starting Global Vertex AI OCR Cleanup Pipeline...`);
  console.log(`Project: ${projectId} | Region: ${region}`);
  console.log(`Model: Gemini 2.5 Pro | Parallel Workers: ${CONCURRENCY_LIMIT}\n`);
  
  const startTime = Date.now();
  
  for (const classNum of CLASSES) {
    await processClass(classNum);
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n🎉 Resumed classes audited and cleaned successfully in ${durationSec} seconds!`);
}

main().catch(console.error);
