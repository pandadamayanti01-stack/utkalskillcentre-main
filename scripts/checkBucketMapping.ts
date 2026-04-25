
import dotenv from 'dotenv';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import type { App } from 'firebase-admin/app';
import { initializeApp, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { SUBJECT_FILE_KEYWORDS } from '../src/constants';
import path from 'path';

// Auto-load .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const TEXTBOOK_BUCKET_NAME = process.env.TEXTBOOK_STORAGE_BUCKET || 'utkalskillcentre-admin';
const CLASSES = Array.from({ length: 10 }, (_, i) => `class${i + 1}`);
const SUBJECTS = Object.keys(SUBJECT_FILE_KEYWORDS);

function getInitializedAdminApp(): App {
  if (getApps().length > 0) return getApp();
  return initializeApp({
    credential: applicationDefault(),
    storageBucket: TEXTBOOK_BUCKET_NAME,
  });
}

async function checkBucketMapping() {
  const adminApp = getInitializedAdminApp();
  const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
  for (const className of CLASSES) {
    const classDigit = className.replace(/[^0-9]/g, '');
    // Try both Class X and Class_X folder patterns
    const possibleClassFolders = [`Class ${classDigit}/`, `Class_${classDigit}/`];
    for (const subject of SUBJECTS) {
      const keywords = SUBJECT_FILE_KEYWORDS[subject] || [subject.replace(/_/g, ' '), subject.replace(/_/g, '')];
      let foundMatch = false;
      let bestScore = 0;
      let bestFile = '';
      for (const classFolder of possibleClassFolders) {
        const [files] = await bucket.getFiles({ prefix: classFolder, maxResults: 100 });
        const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
        for (const f of pdfFiles) {
          // Normalize for matching: lower, underscores/spaces, ignore case
          const lower = f.name.toLowerCase().replace(/[_\s]+/g, '');
          let score = 0;
          for (const kw of keywords) {
            const normKw = kw.toLowerCase().replace(/[_\s]+/g, '');
            if (lower.includes(normKw)) score += normKw.length;
          }
          if (score > bestScore) {
            bestScore = score;
            bestFile = f.name;
          }
        }
      }
      if (bestScore > 0) {
        foundMatch = true;
        console.log(`[MATCH] ${className} / ${subject} => ${bestFile}`);
      } else {
        console.log(`[NO MATCH] ${className} / ${subject}`);
      }
    }
  }
}

checkBucketMapping().then(() => {
  console.log('Bucket mapping check complete.');
  process.exit(0);
}).catch((err) => {
  console.error('Error during bucket mapping check:', err);
  process.exit(1);
});