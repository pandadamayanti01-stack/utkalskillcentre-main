import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { generateMonthlyTestsForMonth, publishMonthlyResultsAndRanks } from './src/server/monthlyTestAutomation.js';
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
    // Default to the current month (since the automation runs on the 1st of the month)
    const now = new Date();
    targetMonth = formatter.format(now);
    console.log(`No override month provided. Defaulting to current month: ${targetMonth}`);
  }

  const publish = process.argv.includes('--publish') || process.argv.includes('-p');
  const force = process.argv.includes('--force') || 
                process.argv.includes('-f') ||
                process.env.FORCE_REGENERATE === 'true';

  if (publish) {
    console.log(`Publish results option enabled for: ${targetMonth}`);
    
    // Parse target month/year
    const [mStr, yStr] = targetMonth.split(' ');
    const y = parseInt(yStr);
    const mIdx = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(mStr);
    
    const isGithubActions = !!process.env.GITHUB_ACTIONS;
    const isScheduled = isGithubActions && process.env.GITHUB_EVENT_NAME === 'schedule';
    
    if (isScheduled && y && mIdx !== -1) {
      // Calculate publishStartDay
      let hasSunday = false;
      for (let d = 5; d <= 10; d++) {
        const dateToCheck = new Date(y, mIdx, d);
        if (dateToCheck.getDay() === 0) {
          hasSunday = true;
          break;
        }
      }

      let examStart = 5;
      if (new Date(y, mIdx, 5).getDay() === 0) {
        examStart = 6;
      }

      let examEnd = examStart;
      let activeDays = 0;
      while (activeDays < 6) {
        const currDate = new Date(y, mIdx, examEnd);
        if (currDate.getDay() !== 0) {
          activeDays++;
        }
        if (activeDays < 6) {
          examEnd++;
        }
      }

      const gradStart = examEnd + 1;
      let pubStart = gradStart + 1;
      if (new Date(y, mIdx, pubStart).getDay() === 0) {
        pubStart += 1;
      }

      // Today's day in Kolkata timezone
      const kolkataDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const kolkataDay = new Date(kolkataDateStr).getDate();

      if (kolkataDay !== pubStart) {
        console.log(`[Auto Publish] Scheduled run: Today is day ${kolkataDay}, but results for ${targetMonth} are scheduled to publish on day ${pubStart}. Skipping automated results publishing.`);
        process.exit(0);
      }
      
      console.log(`[Auto Publish] Today is day ${kolkataDay}, which matches the scheduled results publication day (${pubStart}). Proceeding to publish.`);
    }
  } else if (force) {
    console.log('Force option enabled. Existing monthly tests will be regenerated.');
  }

  try {
    if (publish) {
      const results = await publishMonthlyResultsAndRanks(app, databaseId, targetMonth);
      console.log('--- Result ---');
      console.log(`Total tests processed for publication: ${results.length}`);
      results.forEach(res => {
        if (res.status === 'published') {
          console.log(`[PUBLISHED] Test ${res.id} ranked with ${res.submissionsCount} submissions.`);
        } else if (res.status === 'published_empty') {
          console.log(`[PUBLISHED EMPTY] Test ${res.id} published with 0 submissions.`);
        } else {
          console.error(`[ERROR] Test ${res.id}: ${res.error}`);
        }
      });
      console.log('--- Monthly Test Series Results Publication Finished ---');
    } else {
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
      console.log('--- Monthly Test Series Generation Finished ---');
    }
  } catch (error) {
    console.error('Operation failed:', error);
  } finally {
    process.exit(0);
  }
}

trigger();
