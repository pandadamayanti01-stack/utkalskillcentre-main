import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { runScheduledGeneration } from './src/server/dailyMcqAutomation.js';
import { getServiceAccountCredentials } from './src/server/googleCredentials.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function trigger() {
  console.log('--- Manual MCQ Trigger Start ---');
  
  const serviceAccount = getServiceAccountCredentials();
  if (!serviceAccount) {
    console.error('No service account credentials found. Check your .env or JSON files.');
    return;
  }

  const app = getApps().length === 0 
    ? initializeApp({
        credential: cert(serviceAccount as any),
        projectId: serviceAccount.project_id
      })
    : getApp();

  const databaseId = process.env.FIRESTORE_DATABASE_ID || 'utkal-prod';
  
  // Generate for tomorrow to maintain a 1-day buffer
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const targetDate = date.toISOString().split('T')[0];
  console.log(`Generating for date: ${targetDate}`);

  try {
    const result = await runScheduledGeneration(app, databaseId, targetDate);
    console.log('--- Result ---');
    console.log('Generated:', result.generated);
    console.log('Skipped:', result.skipped);
    console.log('--- Success ---');
  } catch (error) {
    console.error('Generation failed:', error);
  } finally {
    process.exit(0);
  }
}

trigger();
