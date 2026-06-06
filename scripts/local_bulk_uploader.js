import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const COMPLETED_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

// Generates a random 20-character base62 document ID (like Firestore)
function generateDocumentId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Collapses whitespace and trims text to prevent Firestore document size limit error (1MB)
function sanitizeText(text) {
  if (!text) return "";
  return String(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

async function syncCompletedClassesToFirestore() {
  console.log("🚀 Starting bulk sync of completed classes to Firestore via local Node.js script...");

  // Service Account details
  const saPath = 'utkal-admin-sdk.json';
  if (!fs.existsSync(saPath)) {
    console.error(`❌ Service account key file not found at: ${saPath}`);
    console.error(`💡 Make sure to run this script from the workspace root directory where 'utkal-admin-sdk.json' exists.`);
    return;
  }
  
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  if (sa.private_key) {
    sa.private_key = sa.private_key.replace(/\r/g, '').replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/datastore'],
  });

  const client = await auth.getClient();
  const projectId = sa.project_id;
  const databaseId = 'utkal-prod';
  const collectionId = 'textbook_chunks';

  console.log("🔑 Successfully authenticated. Access token obtained.");

  // We look for progress files in the current folder, 'data' subfolder, or scripts folder
  const searchDirs = ['.', 'data', 'scripts'];

  for (const targetClass of COMPLETED_CLASSES) {
    let progressFile = null;
    for (const dir of searchDirs) {
      const testPath = path.join(dir, `textbook_vectors_class_${targetClass}_progress.json`);
      if (fs.existsSync(testPath)) {
        progressFile = testPath;
        break;
      }
    }

    console.log(`\n--------------------------------------------------------------------------`);
    console.log(`📚 Processing CLASS ${targetClass} progress data...`);
    console.log(`--------------------------------------------------------------------------`);

    if (!progressFile) {
      console.log(`⚠️ Skipped: 'textbook_vectors_class_${targetClass}_progress.json' not found in search paths.`);
      continue;
    }

    console.log(`📂 Found progress file: ${progressFile}`);
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    
    let totalRecords = Array.isArray(progress) ? progress.length : Object.keys(progress).length;
    console.log(`📖 Loaded ${totalRecords} records.`);

    const documentsToUpload = [];

    if (Array.isArray(progress)) {
      for (const entry of progress) {
        documentsToUpload.push({
          class: String(entry.class || targetClass).trim(),
          subject: String(entry.subject || "odia").trim(),
          text: sanitizeText(entry.text),
          embedding: entry.embedding || [],
          reference: String(entry.reference || ""),
        });
      }
    } else if (typeof progress === 'object') {
      for (const [filename, fileData] of Object.entries(progress)) {
        if (fileData.status !== 'COMPLETED') continue;

        let subject = 'odia';
        const parts = filename.toLowerCase().split('_');
        for (const p of parts) {
          if (["odia", "math", "mathematics", "science", "evs", "history", "geography", "english", "sanskrit", "hindi", "paribesa", "pallavi", "kala"].includes(p)) {
            if (p === 'pallavi') {
              subject = 'english';
            } else if (p === 'paribesa') {
              subject = 'paribesa_patha';
            } else {
              subject = p;
            }
            break;
          }
        }

        for (const page of (fileData.pages || [])) {
          documentsToUpload.push({
            class: String(targetClass).trim(),
            subject: subject,
            text: sanitizeText(page.text),
            embedding: page.embedding || [],
            reference: String(page.reference || ""),
          });
        }
      }
    }

    const totalDocs = documentsToUpload.length;
    if (totalDocs === 0) {
      console.log(`⚠️ No page chunks found to upload for Class ${targetClass}.`);
      continue;
    }

    console.log(`📊 Found ${totalDocs} page chunks. Uploading in safe batches of 100...`);

    const batchSize = 100;
    for (let i = 0; i < totalDocs; i += batchSize) {
      const chunk = documentsToUpload.slice(i, i + batchSize);
      console.log(`   📦 Uploading batch ${Math.floor(i / batchSize) + 1}... docs [${i} to ${Math.min(i + batchSize, totalDocs)}]`);

      const writes = chunk.map(doc => {
        const docId = generateDocumentId();
        const docName = `projects/${projectId}/databases/${databaseId}/documents/${collectionId}/${docId}`;
        const createdAtStr = new Date().toISOString();

        return {
          update: {
            name: docName,
            fields: {
              class: { stringValue: doc.class },
              subject: { stringValue: doc.subject },
              text: { stringValue: doc.text },
              embedding: {
                arrayValue: {
                  values: doc.embedding.map(val => ({ doubleValue: Number(val) }))
                }
              },
              reference: { stringValue: doc.reference },
              createdAt: { timestampValue: createdAtStr }
            }
          }
        };
      });

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:commit`;
      try {
        await client.request({
          url,
          method: 'POST',
          data: { writes }
        });
      } catch (error) {
        console.error(`      ❌ Failed to upload batch:`, error.response ? JSON.stringify(error.response.data) : error.message);
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // Respect Firestore write-rate limit
    }

    console.log(`✅ Success: Class ${targetClass} synced to Firestore!\n`);
  }

  console.log("🎉 Local bulk sync completed successfully!");
}

syncCompletedClassesToFirestore().catch(console.error);
