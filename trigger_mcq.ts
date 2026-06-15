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
  
  // Generate daily MCQs with time-based logic:
  // - If run before 6:00 AM IST (e.g. manual early morning trigger), generate for TODAY.
  // - If run at or after 6:00 AM IST (like the scheduled 6:07 AM cron), generate for TOMORROW.
  // - On Saturday, skip Sunday and generate for Monday.
  const date = new Date();
  const istDateString = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const localDate = new Date(istDateString);
  const dayOfWeek = localDate.getDay(); // 0 = Sunday, 6 = Saturday in IST
  const currentHour = localDate.getHours();

  if (currentHour < 6) {
    console.log(`Running early (before 6 AM IST at hour ${currentHour}). Generating for today.`);
    // date remains today
  } else {
    if (dayOfWeek === 6) {
      console.log('Today is Saturday (IST) at or after 6 AM. Skipping Sunday and generating for Monday.');
      date.setDate(date.getDate() + 2);
    } else {
      console.log('Today is weekday/Sunday at or after 6 AM. Generating for tomorrow.');
      date.setDate(date.getDate() + 1);
    }
  }
  
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
