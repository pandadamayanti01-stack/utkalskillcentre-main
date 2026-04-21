import dotenv from 'dotenv';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const serviceAccount = JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount), projectId: process.env.FIREBASE_PROJECT_ID });
}
const db = getFirestore(undefined, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9');
const snapshot = await db.collection('textbooks').get();
console.log(JSON.stringify(snapshot.docs.map((doc) => ({
  id: doc.id,
  class: doc.data().class,
  subject: doc.data().subject,
  board: doc.data().board,
  hasDownloadUrl: !!doc.data().download_url,
  hasDriveUrl: !!doc.data().driveUrl,
  hasDriveFileId: !!doc.data().driveFileId
})), null, 2));
