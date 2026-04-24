import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import type { App } from 'firebase-admin/app';
import { initializeApp, applicationDefault, getApps, getApp } from 'firebase-admin/app';
import { SUBJECT_FILE_KEYWORDS } from '../src/constants';
import { getRotatingDailyMcqSubject, getConfiguredDailyMcqSequence } from '../src/utils/dailyMcq';

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

async function eligibleMcqPairs() {
  const adminApp = getInitializedAdminApp();
  const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
  const eligible = [];
  const today = new Date().toISOString().split('T')[0];
  const rotation = getConfiguredDailyMcqSequence();

  let output = '';
  output += '--- Today: MCQ selection for available subjects only ---\n';
  for (const className of CLASSES) {
    const classDigit = className.replace(/[^0-9]/g, '');
    let possibleClassFolders = [`Class ${classDigit}/`, `Class_${classDigit}/`];
    if (classDigit === '10') {
      possibleClassFolders = possibleClassFolders.concat([
        `Class ${classDigit}/Algebra/`,
        `Class_${classDigit}/Algebra/`,
        `Class ${classDigit}/Geometry/`,
        `Class_${classDigit}/Geometry/`
      ]);
    }
    let found = false;
    for (const subject of rotation) {
      const keywords = SUBJECT_FILE_KEYWORDS[subject] || [subject.replace(/_/g, ' '), subject.replace(/_/g, '')];
      let bestScore = 0;
      let bestFile = '';
      for (const classFolder of possibleClassFolders) {
        const [files] = await bucket.getFiles({ prefix: classFolder, maxResults: 100 });
        const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
        for (const f of pdfFiles) {
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
        eligible.push({ className, subject, file: bestFile });
        found = true;
        break;
      }
    }
    if (!found) {
      eligible.push({ className, subject: '(none)', file: '(no PDF found)' });
    }
  }

  output += '\n--- All eligible class/subject pairs for all rotation subjects ---\n';
  for (const className of CLASSES) {
    const classDigit = className.replace(/[^0-9]/g, '');
    const possibleClassFolders = [`Class ${classDigit}/`, `Class_${classDigit}/`];
    for (const subject of rotation) {
      const keywords = SUBJECT_FILE_KEYWORDS[subject] || [subject.replace(/_/g, ' '), subject.replace(/_/g, '')];
      let bestScore = 0;
      let bestFile = '';
      for (const classFolder of possibleClassFolders) {
        const [files] = await bucket.getFiles({ prefix: classFolder, maxResults: 100 });
        const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
        for (const f of pdfFiles) {
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
        output += `- ${className} / ${subject} => ${bestFile}\n`;
      }
    }
  }
  if (eligible.length === 0) {
    output += 'No eligible class/subject pairs found for MCQ generation.\n';
  } else {
    output += 'Eligible class/subject pairs for MCQ generation:\n';
    for (const entry of eligible) {
      output += `- ${entry.className} / ${entry.subject} => ${entry.file}\n`;
    }
  }

  // Write output to file
  fs.writeFileSync('eligible_mcq_pairs.txt', output, 'utf8');
  // Also print to console
  console.log(output);
}

eligibleMcqPairs().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Error during eligible MCQ pair check:', err);
  process.exit(1);
});