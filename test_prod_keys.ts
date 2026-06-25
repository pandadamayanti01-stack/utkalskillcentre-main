import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Razorpay from 'razorpay';
import fs from 'fs';
import { cert, initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Load environment variables
dotenv.config();

const results: Record<string, { status: 'SUCCESS' | 'FAILED'; message: string }> = {};

async function testGemini() {
  console.log('Testing Gemini API Key...');
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    results['Gemini API'] = { status: 'FAILED', message: 'API key is missing in .env' };
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { maxOutputTokens: 5 }
    }, { apiVersion: 'v1beta' });

    const response = await model.generateContent('Respond with the single word: OK');
    const text = response.response.text().trim();
    if (text.toLowerCase().includes('ok')) {
      results['Gemini API'] = { status: 'SUCCESS', message: 'Successfully generated content using gemini-2.5-flash.' };
    } else {
      results['Gemini API'] = { status: 'FAILED', message: `Unexpected response: ${text}` };
    }
  } catch (err: any) {
    results['Gemini API'] = { status: 'FAILED', message: err?.message || String(err) };
  }
}

async function testYouTube() {
  console.log('Testing YouTube Data API Key...');
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) {
    results['YouTube API'] = { status: 'FAILED', message: 'API key is missing in .env' };
    return;
  }

  try {
    const videoId = 'Ks-_Mh1QhMc';
    const url = `https://www.googleapis.com/youtube/v3/videos?part=id&id=${videoId}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as any;

    if (res.ok && data && data.items) {
      results['YouTube API'] = { status: 'SUCCESS', message: 'Successfully queried YouTube API.' };
    } else {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      results['YouTube API'] = { status: 'FAILED', message: errMsg };
    }
  } catch (err: any) {
    results['YouTube API'] = { status: 'FAILED', message: err?.message || String(err) };
  }
}

async function testRazorpay() {
  console.log('Testing Razorpay Live Key...');
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    results['Razorpay API'] = { status: 'FAILED', message: 'Key ID or Secret is missing in .env' };
    return;
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const payments = await razorpay.payments.all({ count: 1 });
    if (payments && Array.isArray(payments.items)) {
      results['Razorpay API'] = { status: 'SUCCESS', message: 'Credentials are valid and successfully retrieved payment logs.' };
    } else {
      results['Razorpay API'] = { status: 'FAILED', message: 'Invalid response format from Razorpay' };
    }
  } catch (err: any) {
    results['Razorpay API'] = { status: 'FAILED', message: err?.message || String(err) };
  }
}

async function testFirebaseAdmin() {
  console.log('Testing Firebase Admin & Firestore...');
  const sdkPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || 'utkal-prod';

  if (!sdkPath || !fs.existsSync(sdkPath)) {
    results['Firebase Admin'] = { status: 'FAILED', message: `Service account file not found at: ${sdkPath}` };
    return;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(sdkPath, 'utf8'));
    
    let adminApp;
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } else {
      adminApp = getApp();
    }

    const db = getAdminFirestore(adminApp, databaseId);
    // Retrieve a single document from system_settings (which is used in prod)
    const snapshot = await db.collection('system_settings').limit(1).get();
    
    results['Firebase Admin'] = { 
      status: 'SUCCESS', 
      message: `Successfully connected to Firestore database: "${databaseId}". Read ${snapshot.size} document(s).` 
    };
  } catch (err: any) {
    results['Firebase Admin'] = { status: 'FAILED', message: err?.message || String(err) };
  }
}

async function main() {
  await testGemini();
  await testYouTube();
  await testRazorpay();
  await testFirebaseAdmin();

  console.log('\n=============================================');
  console.log('         PRODUCTION KEY DIAGNOSTICS          ');
  console.log('=============================================');
  for (const [apiName, res] of Object.entries(results)) {
    const color = res.status === 'SUCCESS' ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    console.log(`${apiName}: ${color}${res.status}${reset}`);
    console.log(`  Details: ${res.message}`);
    console.log('---------------------------------------------');
  }
}

main().catch(console.error);
