import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { generateMonthlyTestsForMonth } from './src/server/monthlyTestAutomation.js';
import { getServiceAccountCredentials } from './src/server/googleCredentials.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function trigger() {
  console.log('--- Manual Monthly Test Trigger Start ---');
  
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

  // Determine target month:
  // Can be passed as command line argument (e.g. npx tsx trigger_monthly_test.ts "June 2026")
  // Otherwise, default to next month.
  let targetMonth = '';
  const overrideMonth = process.argv.slice(2).filter(arg => !arg.startsWith('-'))[0];
  if (overrideMonth) {
    targetMonth = overrideMonth;
    console.log(`Using override target month: ${targetMonth}`);
  } else {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'long'
    });
    // Calculate next month: set date to 28th of current month and add 10 days
    const now = new Date();
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth(), 28);
    nextMonthDate.setDate(nextMonthDate.getDate() + 10);
    targetMonth = formatter.format(nextMonthDate);
    console.log(`No override month provided. Defaulting to next month: ${targetMonth}`);
  }

  const force = process.argv.includes('--force') || 
                process.argv.includes('-f') ||
                process.env.FORCE_REGENERATE === 'true';

  if (force) {
    console.log('Force option enabled. Existing monthly tests will be regenerated.');
  }

  try {
    const results = await generateMonthlyTestsForMonth(app, databaseId, targetMonth, force);
    console.log('--- Result ---');
    console.log(`Total tests processed: ${results.length}`);
    results.forEach(res => {
      if (res.status === 'created') {
        console.log(`[CREATED] ${res.class} - ${res.subject}`);
      } else if (res.status === 'skipped_exists') {
        console.log(`[SKIPPED] ${res.class} - ${res.subject} (already exists)`);
      } else {
        console.error(`[ERROR] ${res.class} - ${res.subject}: ${res.error}`);
      }
    });
    console.log('--- Monthly Test Series Automation Finished ---');
  } catch (error) {
    console.error('Generation failed:', error);
  } finally {
    process.exit(0);
  }
}

trigger();
