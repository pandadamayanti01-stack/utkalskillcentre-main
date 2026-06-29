import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import Razorpay from 'razorpay';
import multer from 'multer';
import { App, applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import fs from 'fs';
import crypto from 'node:crypto';
import webpush from 'web-push';
import { registerDailyMcqAutomation, loadTextbookFromBucket, extractPdfText, normalizeSubjectKey } from './src/server/dailyMcqAutomation.js';
import { registerYoutubeSyncAutomation } from './src/server/youtubeSync.js';
import { getServiceAccountCredentials } from './src/server/googleCredentials.js';
import { BSE_SYLLABUS_MAPPING_9, BSE_SYLLABUS_MAPPING_10 } from './src/data/bseSyllabusMapping.js';
import { google } from 'googleapis';
import cron from 'node-cron';
import { quizRouter } from './quizRouter.js';


const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIREBASE_DATABASE_ID ||
  'utkal-prod';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:support@utkalskillcentre.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    console.log('Web Push VAPID details initialized successfully.');
  } catch (err) {
    console.error('Failed to configure web-push VAPID details:', err);
  }
}

function getInitializedAdminApp(): App | null {
  return getApps().length > 0 ? getApp() : null;
}

// Initialize Firebase Admin
if (!getInitializedAdminApp()) {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log("Firebase Admin initializing with config file. Loaded config:", config);
      // Use project_id from service account JSON if present
      config.projectId = config.projectId || config.project_id;
    } else {
      console.warn("firebase-applet-config.json not found. Using environment variables.");
      config = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'utkalskillcentre',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || 'utkalskillcentre.firebasestorage.app'
      };
    }

    if (config.projectId) {
      const serviceAccount = getServiceAccountCredentials();
      if (serviceAccount) {
        console.log("Firebase Admin: Using service account object for project", serviceAccount.project_id);
      } else {
        console.warn("Firebase Admin: No service account object found, falling back to applicationDefault()");
      }
      initializeApp({
        credential: serviceAccount
          ? cert(serviceAccount as any)
          : applicationDefault(),
        projectId: config.projectId,
        storageBucket: config.storageBucket
      });
      console.log("Firebase Admin initialized successfully with project:", config.projectId, "database:", firestoreDatabaseId);
    } else {
      console.error("Firebase Project ID missing. Firebase Admin features will be disabled.");
    }
  } catch (err) {
    console.error("Error initializing Firebase Admin:", err);
  }
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

let razorpay: Razorpay | null = null;

function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      console.error('Razorpay credentials missing. Payment features will be disabled.');
      return null;
    }

    try {
      console.log('Initializing Razorpay with Key ID:', keyId.substring(0, 8) + '...');
      razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log('Razorpay initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize Razorpay library:', err);
      return null;
    }
  }
  return razorpay;
}

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  console.log('--- Server Startup Diagnostics ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('CWD:', process.cwd());
  console.log('Dist path:', distPath);
  console.log('Index.html exists:', fs.existsSync(indexPath));
  console.log('----------------------------------');

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  });

  // Redirect old study materials URL to new Anganwadi-to-Class-10 URL
  app.get('/class-3-to-10-study-materials.html', (req, res) => {
    res.redirect(301, '/anganwadi-to-class-10-study-materials.html');
  });

  // Dynamic XML sitemap endpoint for 1,250+ public SEO pages
  app.get('/sitemap.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    const baseUrl = 'https://utkalskillcentre.com';
    
    // 1. Static Pages
    const staticPages = [
      '',
      '/anganwadi-to-class-10-study-materials.html',
      '/ai-homework-help-odia.html',
      '/bse-odisha-10th-result-2026.html',
      '/odia-ai-tutor.html',
      '/privacy-policy.html',
      '/terms-of-service.html',
      '/ai-in-odisha.html',
      '/ai-learning-odia.html',
      '/ai-math-tutor-in-odia.html',
      '/bse-odisha-matric-exam-model-and-past-papers.html',
      '/bse-odisha-syllabus-and-exam-notifications.html',
      '/bse-odisha-textbook-errors-and-corrections-list.html',
      '/bse-odisha-worksheet-generator-ai.html',
      '/class-10-board-exam-tips-odisha.html',
      '/class-10-homework-help-odisha.html',
      '/class-10-math-app-odisha.html',
      '/class-10-odisha-study-app.html',
      '/class-10-science-study-app-odisha.html',
      '/class-5-study-materials-odisha.html',
      '/class-6-study-app-odisha.html',
      '/class-7-learning-app-odisha.html',
      '/class-8-study-materials-odisha.html',
      '/class-9-odisha-study-app.html',
      '/daily-mcq-challenge.html',
      '/learn-in-odia-online.html',
      '/mo-swapna-career-guidance-odisha.html',
      '/monthly-tests-for-odisha-students.html',
      '/odia-gk-questions-and-online-quiz.html',
      '/odia-homework-help-for-students.html',
      '/odia-medium-learning-app.html',
      '/odia-medium-math-formulas-pdf.html',
      '/odia-medium-primary-school-practice-worksheets.html',
      '/odia-medium-sanskrit-and-hindi-study-notes.html',
      '/odisha-learning-app.html',
      '/odisha-math-practice-app.html',
      '/odisha-school-exam-question-papers-class-6-to-8.html',
      '/odisha-school-lesson-plans-and-worksheets-for-teachers.html',
      '/odisha-school-scholarships-nmms-nrts.html',
      '/odisha-school-science-projects-and-experiments.html',
      '/online-test-app-for-school-students-odisha.html',
      '/osepa-lesson-planner-ai.html',
      '/school-test-preparation-app-odisha.html',
      '/skill-odisha.html',
      '/study-app-for-weak-students-odisha.html',
      '/usc-monthly-test-series-july-2026.html',
      '/usc-monthly-test-series-may-2026.html',
      '/zero-cost-science-projects-odisha.html'
    ];
    for (const p of staticPages) {
      xml += `  <url><loc>${baseUrl}${p}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
    }
    
    // 2. Directory Hubs
    const hubs = ['directory_library', 'directory_games', 'directory_gk', 'directory_tools', 'directory_districts'];
    for (const h of hubs) {
      xml += `  <url><loc>${baseUrl}/?preview=${h}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }
    
    // 3. Class Landing Pages
    const classes = ['sishuvatika', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    for (const c of classes) {
      xml += `  <url><loc>${baseUrl}/?preview=class_${c}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`;
    }
    
    // 4. Traditional Games
    const games = ['baghchheli', 'puchi', 'kaudi', 'luchakali', 'rumalchori', 'bahiprustha'];
    for (const g of games) {
      xml += `  <url><loc>${baseUrl}/?preview=game_${g}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    }
    
    // 5. AI Tools
    const tools = ['gundulututor', 'mathblackboard', 'osepaplanner', 'aiworksheet', 'homeworkhelper'];
    for (const t of tools) {
      xml += `  <url><loc>${baseUrl}/?preview=tool_${t}</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
    }
    
    // 6. District Hubs
    const districts = [
      'cuttack', 'khordha', 'ganjam', 'bhadrak', 'balasore', 'puri', 'jajpur', 'dhenkanal', 
      'sundargarh', 'mayurbhanj', 'sambalpur', 'angul', 'bargarh', 'bolangir', 'deogarh', 
      'gajapati', 'jagatsinghpur', 'jharsuguda', 'kalahandi', 'kandhamal', 'kendrapara', 
      'keonjhar', 'koraput', 'malkangiri', 'nabarangpur', 'nayagarh', 'nuapada', 'rayagada', 
      'subarnapur', 'boudh'
    ];
    for (const d of districts) {
      xml += `  <url><loc>${baseUrl}/?preview=district_${d}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    }
    
    // 7. Subject Books & Chapters
    const CLASS_SUBJECTS_SEO: Record<string, string[]> = {
      sishuvatika: ["shishu_vatika"],
      class1: ["ganita_khela", "jhulana_1"],
      class2: ["maja_majare_ganita", "jhulana_2"],
      class3: ["bhasa_mahak_1", "kala_sikhya", "ganita_mela", "paribesa_patha", "pallavi", "sharirika_sikhya"],
      class4: ["bhasa_mahak_2", "paribesa_patha", "ganita_mela", "kala_sikhya", "pallavi", "krida_yoga"],
      class5: ["bhasa_mahak_3", "ganita_mela", "kala_sikhya", "pallavi", "sharirika_yoga", "ama_chaturbaswara_pruthibi"],
      class6: ["samajika_bignana", "jigyasa", "kalakunja", "ganita_prakas", "sahitya_sudha", "khela_sikhya", "sanskritakalika_1", "kausala_bodha", "jasmine", "hindi_kalika"],
      class7: ["sahitya_suman", "kalakruti", "jigyasa", "samajika_bignana", "ganita_prakas", "hindi_kalika", "jasmine", "sanskritakalika_2", "kausala_bodha", "khela_sikhya"],
      class8: ["kruti", "samajika_bignana", "jigyasa", "jasmine", "ganita_prakas", "sahitya_surabhi", "sanskritakalika_3", "kausala_bodha", "hindi_kalika"],
      class9: ["life_science", "hindi", "english", "odia_grammar", "odia", "geometry", "algebra", "geography", "social_science", "physical_science", "english_grammar", "hindi_grammar", "sanskrit_grammar", "sanskrit"],
      class10: ["hindi_grammar", "algebra", "physical_science", "odia", "english_grammar", "social_science", "odia_grammar", "life_science", "hindi", "sanskrit_grammar", "sanskrit", "geography", "geometry", "english"]
    };
    
    // Helper to get Class 9 / 10 chapters from syllabus mapping
    const getClassSyllabusChapters = (classNum: 9 | 10, subjectKey: string): string[] => {
      const mapping = classNum === 9 ? BSE_SYLLABUS_MAPPING_9 : BSE_SYLLABUS_MAPPING_10;
      const chapterSet = new Set<string>();
      for (const milestone of mapping) {
        if (milestone.subjects && milestone.subjects[subjectKey]) {
          for (const chap of milestone.subjects[subjectKey]) {
            const cleanSlug = chap.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (cleanSlug) chapterSet.add(cleanSlug);
          }
        }
      }
      return Array.from(chapterSet);
    };
    
    for (const [classKey, subjectsList] of Object.entries(CLASS_SUBJECTS_SEO)) {
      const clsNum = classKey.replace('class', '');
      for (const sub of subjectsList) {
        // Book URL
        xml += `  <url><loc>${baseUrl}/?preview=book_${classKey}_${sub}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
        
        // Chapter URLs
        let chaptersList: string[] = [];
        if (clsNum === '9') {
          chaptersList = getClassSyllabusChapters(9, sub);
        } else if (clsNum === '10') {
          chaptersList = getClassSyllabusChapters(10, sub);
        } else {
          chaptersList = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6'];
        }
        
        for (const chap of chaptersList) {
          xml += `  <url><loc>${baseUrl}/?preview=chapter_${classKey}_${sub}_${chap}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
        }
      }
    }
    
    xml += `</urlset>`;
    res.status(200).send(xml);
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Basic request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Zero-dependency in-memory rate limiter to prevent API cost/resource abuse
  const ipCache = new Map<string, { count: number; resetTime: number }>();
  
  function createRateLimiter(windowMs: number, maxRequests: number, errorMessage: string) {
    return (req: any, res: any, next: any) => {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      
      let record = ipCache.get(ip);
      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        ipCache.set(ip, record);
        return next();
      }
      
      record.count++;
      if (record.count > maxRequests) {
        return res.status(429).json({ error: errorMessage });
      }
      
      next();
    };
  }

  const globalApiLimiter = createRateLimiter(15 * 60 * 1000, 150, 'Too many requests. Please try again in 15 minutes.');
  const heavyAiLimiter = createRateLimiter(1 * 60 * 1000, 10, 'AI request limit reached. Please wait a minute before asking again.');
  const imageProxyLimiter = createRateLimiter(5 * 60 * 1000, 30, 'Image proxy rate limit reached.');

  // Apply global rate limiting to all api routes
  app.use('/api/', globalApiLimiter);

  // Firebase Admin Token Verification & Role Authorization Middleware
  async function requireAdmin(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token.' });
    }
    const token = authHeader.substring(7);
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized' });
      }
      const db = getAdminFirestore(adminApp, firestoreDatabaseId);
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Administrator privilege required.' });
      }
      req.user = decodedToken;
      next();
    } catch (err) {
      console.error('[Auth Error] Admin verification failed:', err);
      return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
    }
  }

  // API Routes
  app.post('/api/upload-textbook', requireAdmin, upload.single('file'), async (req: any, res) => {
    try {
      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const bucket = getAdminStorage(adminApp).bucket();
      const fileName = `textbooks/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(fileName);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
        public: true,
      });

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });

  // Image Proxy to fetch external textbook pages / diagrams safely bypassing CORS
  app.get('/api/image-proxy', imageProxyLimiter, async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
      }

      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        return res.status(400).json({ error: 'Invalid URL scheme' });
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (err: any) {
      console.error('Image proxy error:', err);
      res.status(500).json({ error: err.message || 'Image proxy failed' });
    }
  });

  // Helper to determine the active milestone key based on the current date
  function getActiveMilestoneKey(): 'ia1' | 'ia2' | 'half_yearly' | 'ia3' | 'ia4' | 'annual' {
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 5 = Jun, 6 = Jul, 8 = Sep, 10 = Nov
    const date = now.getDate();

    // June 1 to July 15 -> ia1
    if (month === 5 || (month === 6 && date <= 15)) {
      return 'ia1';
    }
    // July 16 to August 31 -> ia2
    if ((month === 6 && date > 15) || month === 7) {
      return 'ia2';
    }
    // September 1 to September 15 -> half_yearly
    if (month === 8 && date <= 15) {
      return 'half_yearly';
    }
    // September 16 to November 15 -> ia3
    if ((month === 8 && date > 15) || month === 9 || (month === 10 && date <= 15)) {
      return 'ia3';
    }
    // November 16 to January 15 -> ia4
    if ((month === 10 && date > 15) || month === 11 || (month === 0 && date <= 15)) {
      return 'ia4';
    }
    // January 16 to May 31 -> annual
    return 'annual';
  }

  // GET /api/syllabus/class-9
  app.get('/api/syllabus/class-9', (req, res) => {
    try {
      const activeKey = getActiveMilestoneKey();
      res.json({
        activeMilestone: activeKey,
        milestones: BSE_SYLLABUS_MAPPING_9
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch Class 9 syllabus' });
    }
  });

  // GET /api/syllabus/class-10
  app.get('/api/syllabus/class-10', (req, res) => {
    try {
      const activeKey = getActiveMilestoneKey();
      res.json({
        activeMilestone: activeKey,
        milestones: BSE_SYLLABUS_MAPPING_10
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch Class 10 syllabus' });
    }
  });

  // Web Push Notifications - Subscribe User
  app.post('/api/notifications/subscribe', async (req, res) => {
    try {
      const { userId, subscription } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: 'userId and subscription are required' });
      }

      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized' });
      }

      const firestore = getAdminFirestore(adminApp, firestoreDatabaseId);
      await firestore.collection('users').doc(userId).set({
        pushSubscription: subscription
      }, { merge: true });

      console.log(`[Web Push] Successfully saved push subscription for student ${userId}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Web Push] Error saving subscription:', err);
      res.status(500).json({ error: err.message || 'Failed to save subscription' });
    }
  });

  // Web Push Notifications - Dispatch Test Push
  app.post('/api/notifications/send-test', requireAdmin, async (req, res) => {
    try {
      const { userId, title, body, url } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized' });
      }

      const firestore = getAdminFirestore(adminApp, firestoreDatabaseId);
      const userDoc = await firestore.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User does not exist in database' });
      }

      const userData = userDoc.data();
      const subscription = userData?.pushSubscription;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ 
          error: 'Push subscription not found. Student has not enabled notifications on their device.' 
        });
      }

      const notificationPayload = JSON.stringify({
        title: title || 'Test Notification',
        body: body || 'This is a test mobile alert from Utkal Skill Centre!',
        url: url || '/'
      });

      console.log(`[Web Push] Sending push payload to endpoint: ${subscription.endpoint}`);
      await webpush.sendNotification(subscription, notificationPayload);
      
      console.log(`[Web Push] Test push successfully sent to user ${userId}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Web Push] Error dispatching push:', err);
      res.status(500).json({ error: err.message || 'Failed to send test notification' });
    }
  });

  // Web Push Notifications - Broadcast Push to Audience
  app.post('/api/notifications/broadcast', requireAdmin, async (req, res) => {
    try {
      const { message, audience } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }

      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized' });
      }

      const firestore = getAdminFirestore(adminApp, firestoreDatabaseId);
      const payload = JSON.stringify({
        title: 'Utkal Skill Centre 🔔',
        body: message,
        url: '/'
      });

      console.log('[Web Push] Starting streaming broadcast...');
      
      const usersStream = firestore.collection('users')
        .where('pushSubscription', '!=', null)
        .stream();

      let dispatchedCount = 0;
      let activePromises: Promise<any>[] = [];
      const CONCURRENCY_LIMIT = 50;

      usersStream.on('data', (docSnapshot) => {
        const userData = docSnapshot.data();
        const subscription = userData.pushSubscription;

        // Apply audience filtering if needed
        if (audience === 'premium' && !userData.isPremium) return;
        if (audience === 'free' && userData.isPremium) return;

        if (subscription && subscription.endpoint) {
          const promise = webpush.sendNotification(subscription, payload)
            .then(() => { dispatchedCount++; })
            .catch((err: any) => {
              console.error(`[Web Push] Failed to send to user ${docSnapshot.id}:`, err.message);
              if (err.statusCode === 410 || err.statusCode === 404) {
                firestore.collection('users').doc(docSnapshot.id).update({
                  pushSubscription: null
                }).catch(() => {});
              }
            });

          activePromises.push(promise);

          if (activePromises.length >= CONCURRENCY_LIMIT) {
            usersStream.pause();
            const currentPromises = activePromises;
            activePromises = [];
            Promise.allSettled(currentPromises).then(() => {
              usersStream.resume();
            });
          }
        }
      });

      usersStream.on('end', async () => {
        if (activePromises.length > 0) {
          await Promise.allSettled(activePromises);
        }
        console.log(`[Web Push] Streaming broadcast complete. Dispatched to ${dispatchedCount} devices.`);
        res.json({ success: true, count: dispatchedCount });
      });

      usersStream.on('error', (err) => {
        console.error('[Web Push] Stream error:', err);
        res.status(500).json({ error: 'Database streaming failure during broadcast.' });
      });

    } catch (err: any) {
      console.error('[Web Push] Broadcast error:', err);
      res.status(500).json({ error: err.message || 'Failed to dispatch broadcast' });
    }
  });

  // Helper to get price
  function getPrice(userClass: any, planType: 'monthly' | 'yearly'): number {
    if (userClass === 'sishuvatika(Anganwadi)') return planType === 'monthly' ? 49 : 499;
    const classNum = parseInt(userClass);
    if (isNaN(classNum)) return 999;
    if (classNum >= 1 && classNum <= 3) return planType === 'monthly' ? 99 : 499;
    if (classNum >= 4 && classNum <= 7) return planType === 'monthly' ? 199 : 999;
    if (classNum >= 8 && classNum <= 10) return planType === 'monthly' ? 299 : 1999;
    return 999; // Default
  }

  app.post('/api/payment/create-order', async (req, res) => {
    try {
      const { userClass, planType, userId } = req.body;
      const amount = getPrice(userClass, planType);
      const rzp = getRazorpay();
      
      if (!rzp) {
        console.error('Razorpay initialization failed. Check environment variables.');
        return res.status(503).json({ 
          error: 'Payment service unavailable',
          details: 'The server could not initialize Razorpay. Please ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in the production environment.'
        });
      }
      
      console.log(`Creating Razorpay order for user: ${userId}, amount: ${amount}, class: ${userClass}, plan: ${planType}`);
      
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency: "INR",
        receipt: `rcpt_${Date.now().toString().slice(-6)}_${userId ? String(userId).substring(0, 10) : 'anon'}`
      };
      
      console.log('Order options:', JSON.stringify(options));
      const order = await rzp.orders.create(options);
      console.log('Razorpay order created successfully:', order.id);

      res.json({
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY
      });
    } catch (error: any) {
      console.error('Create Order Error:', error);
      const errorMessage = error?.error?.description || error?.message || 'Failed to create order';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/payment/verify', async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, userClass, planType } = req.body;
      
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keySecret) {
        console.error('RAZORPAY_KEY_SECRET is missing.');
        return res.status(500).json({ success: false, message: 'Payment configuration error' });
      }

      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');
      
      if (generated_signature === razorpay_signature) {
        const adminApp = getInitializedAdminApp();
        if (!adminApp) {
          return res.status(503).json({ success: false, message: 'Firebase Admin is not initialized' });
        }

        const firestore = getAdminFirestore(adminApp, firestoreDatabaseId);

        // 1. Log transaction to Firestore
        await firestore.collection('transactions').add({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: amount, // Frontend already sends correct INR amount
          userId,
          class: userClass,
          planType,
          timestamp: new Date()
        });

        // 2. Automatically Activate Subscription
        const expiresAt = new Date();
        if (planType === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        await firestore.collection('subscriptions').doc(userId).set({
          active: true,
          plan: planType || 'monthly',
          expires_at: expiresAt,
          updatedAt: new Date(),
          userId: userId
        }, { merge: true });

        console.log(`[Payment] Success! Activated ${planType} plan for user ${userId}. Expires: ${expiresAt.toLocaleDateString()}`);
        
        res.json({ success: true });
      } else {
        console.error('Invalid payment signature');
        res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    } catch (error: any) {
      console.error('Verify Payment Error:', error);
      res.status(500).json({ success: false, message: error.message || 'Verification failed' });
    }
  });

  const gunduluSafetySettings = [
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
      threshold: "BLOCK_LOW_AND_ABOVE" as any,
    },
    {
      category: "HARM_CATEGORY_HARASSMENT" as any,
      threshold: "BLOCK_LOW_AND_ABOVE" as any,
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH" as any,
      threshold: "BLOCK_LOW_AND_ABOVE" as any,
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
      threshold: "BLOCK_LOW_AND_ABOVE" as any,
    }
  ];

  function getRotatorKeys(): string[] {
    // Rotation is disabled for production. We strictly stick to the single premium GEMINI_API_KEY.
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    return apiKey ? [apiKey] : [];
  }


  app.post('/api/ai/ask-gundulu', async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ error: "Question is required." });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured on the server." });
      }

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: "You are Gundulu (ଗୁନ୍ଦୁଲୁ ମିତ), a friendly and knowledgeable squirrel mascot for the Utkal Quiz application. " +
                          "Your job is to help users with General Knowledge (GK) questions, facts about Odisha, history, geography, science, or translating terms. " +
                          "Be extremely encouraging, warm, and helpful. Respond in standard Odia or English based on the user's input language. Keep your answers concise (under 3-4 sentences)."
      });

      const result = await model.generateContent(question);
      const text = result.response.text();
      return res.json({ text });
    } catch (error: any) {
      console.error(`[Server] Error in /api/ai/ask-gundulu:`, error.message);
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { contents, systemInstruction, modelType, generationConfig, enableGrounding, enableDialectBridge } = req.body;
      
      let finalSystemInstruction = systemInstruction;
      if (enableDialectBridge) {
        finalSystemInstruction = (finalSystemInstruction || '') + 
          "\n\n[REGIONAL DIALECT TRANSLATION BRIDGE: ACTIVE]\n" +
          "The student may write or speak in regional Odia dialects like Sambalpuri (e.g., using terms like 'କାଣା', 'କାଁ', 'ଖାଇଛ', 'କରସି'), Ganjami, or Desia. " +
          "You must automatically translate and understand these regional terms as their standard Odia equivalents, and respond back in standard Odia with extra elder-sister warmth.";
      }

      const useVertex = process.env.USE_VERTEX_AI === 'true';
      let vertexErrorText = '';
      
      if (useVertex) {
        try {
          console.log("Backend AI (Server): Attempting Vertex AI route...");
          const creds = getServiceAccountCredentials();
          let accessToken: string | null | undefined = null;
          let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';

          if (creds) {
            projectId = creds.project_id || projectId;
            const vertexAuth = new google.auth.JWT({
              email: creds.client_email,
              key: creds.private_key,
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await vertexAuth.authorize();
            accessToken = authClient.access_token;
          } else {
            // Attempt Application Default Credentials (ADC) for Cloud Run
            try {
              const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
              });
              const authClient = await auth.getClient();
              const tokenResponse = await authClient.getAccessToken();
              accessToken = tokenResponse.token;
              projectId = await auth.getProjectId() || projectId;
              console.log("Backend AI (Server): Successfully fetched ambient Cloud Run access token for project:", projectId);
            } catch (adcErr: any) {
              console.warn("Backend AI (Server): Ambient ADC authentication failed:", adcErr.message);
            }
          }

          if (accessToken) {
            const vertexModel = modelType === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            
            console.log(`Backend AI (Server): Calling Vertex AI model ${vertexModel} via global endpoint for project ${projectId}...`);
            const vertexUrl = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${vertexModel}:generateContent`;
            
            const formattedSystemInstruction = finalSystemInstruction 
              ? { parts: [{ text: finalSystemInstruction }] } 
              : undefined;

            const response = await fetch(vertexUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                contents,
                systemInstruction: formattedSystemInstruction,
                generationConfig,
                safetySettings: [
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" }
                ],
                ...(enableGrounding ? { tools: [{ googleSearch: {} }] } : {})
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                console.log("Backend AI (Server): Vertex AI API request successful!");
                return res.json({ text });
              }
            } else {
              vertexErrorText = await response.text();
              console.warn(`Backend AI (Server): Vertex AI API returned error: ${response.status} - ${vertexErrorText}`);
            }
          } else {
            console.warn("Backend AI (Server): Could not resolve service account or ADC access token for Vertex AI.");
          }

          // Fall back to Vertex API Key if provided as a direct developer key URL bypass
          const vertexKey = process.env.VERTEX_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          if (vertexKey) {
            console.log("Backend AI (Server): Attempting to call Vertex endpoints using direct developer key...");
            const apiKeyModel = modelType === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            const isVertexKey = vertexKey.startsWith('AQ.');
            const vertexKeyUrl = isVertexKey
              ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${apiKeyModel}:generateContent?key=${vertexKey}`
              : `https://generativelanguage.googleapis.com/v1beta/models/${apiKeyModel}:generateContent?key=${vertexKey}`;

            const response = await fetch(vertexKeyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                systemInstruction: finalSystemInstruction ? { parts: [{ text: finalSystemInstruction }] } : undefined,
                generationConfig,
                safetySettings: [
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" }
                ],
                ...(enableGrounding ? { tools: [{ googleSearch: {} }] } : {})
              })
            });

            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                console.log("Backend AI (Server): Vertex AI key-based request successful!");
                return res.json({ text });
              }
            } else {
              const errText = await response.text();
              console.warn(`Backend AI (Server): Developer key fallback returned error: ${response.status} - ${errText}`);
            }
          }
        } catch (vertexErr: any) {
          vertexErrorText = vertexErr.message;
          console.warn("Backend AI (Server): Vertex AI execution error:", vertexErr.message);
        }
        
        console.log("Backend AI (Server): Vertex AI failed. Falling back to Google AI Studio standard developer key route.");
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ 
          error: 'GEMINI_API_KEY and all rotator keys are missing on the server',
          details: 'Vertex AI was tried but failed, and Google AI Studio backup API key is missing.',
          vertexError: vertexErrorText || undefined
        });
      }

      const FLASH_MODELS = [
        "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite",
        "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash-image"
      ];
      const PRO_MODELS = [
        "gemini-2.5-pro", "gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-pro-latest"
      ];
      
      let models = modelType === 'pro' ? [...PRO_MODELS, ...FLASH_MODELS] : [...FLASH_MODELS];

      let lastError = null;

      for (const keyToUse of rotatorKeys) {
        const ai = new GoogleGenerativeAI(keyToUse);
        let keyFailed = false;
        
        for (const modelName of models) {
          if (keyFailed) break;
          
          for (const apiVersion of ["v1beta", "v1"]) {
            if (keyFailed) break;
            try {
              console.log(`Backend AI: Attempting ${modelName} via ${apiVersion} using key ${keyToUse.substring(0, 12)}...`);
              const model = ai.getGenerativeModel({
                 model: modelName,
                 systemInstruction: finalSystemInstruction,
                 safetySettings: gunduluSafetySettings,
                 ...(enableGrounding ? { tools: [{ googleSearch: {} }] as any } : {})
              }, { apiVersion: apiVersion as any });
              
              const result = await model.generateContent({ contents, generationConfig });
              return res.json({ text: result.response.text() });
            } catch(err: any) {
              lastError = err;
              const is503 = err.message?.includes('503') || err.status === 503 || err.code === 503;
              const is404 = err.message?.includes('404') || err.status === 404 || err.code === 404;
              const isAuthError = err.message?.includes('403') || err.message?.includes('401') || 
                                 err.status === 403 || err.status === 401;
              const isBadRequest = err.message?.includes('400') || err.status === 400 || err.code === 400;
              const isQuotaOrDepleted = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('prepayment') || err.status === 429;

              if (isAuthError) {
                console.warn(`Backend AI Auth Error for key ${keyToUse.substring(0, 12)}: ${err.message}. Trying next key.`);
                keyFailed = true;
                break;
              }

              if (isBadRequest) {
                if (err.message?.toLowerCase().includes('api key') || err.message?.toLowerCase().includes('key expired') || err.message?.toLowerCase().includes('invalid')) {
                  console.warn(`Backend AI Key Error for key ${keyToUse.substring(0, 12)}: ${err.message}. Trying next key.`);
                  keyFailed = true;
                  break;
                }
                console.error("Backend AI Bad Request:", err.message);
                return res.status(400).json({ error: err.message || "Invalid request parameters." });
              }

              if (isQuotaOrDepleted) {
                console.warn(`Key ${keyToUse.substring(0, 12)} is depleted or rate limited (429). Trying next key.`);
                keyFailed = true;
                break;
              }

              if (is404) {
                continue; // Try next API version
              }
              console.error(`Model Attempt Failed: ${modelName} (${apiVersion}) using key ${keyToUse.substring(0, 12)}:`, err.message);
            }
          }
        }
      }
      
      throw lastError || new Error("All AI models and all rotator keys failed");

    } catch(error: any) {
      console.error("Backend AI Generic Error:", error);
      res.status(500).json({ error: error.message || 'AI Generation failed' });
    }
  });

  async function refineTextPrompt(prompt: string): Promise<string> {
    const systemInstruction = "You are an expert prompt designer for image generators. Translate any Odia or phonetic Odia math/science terms into clear English concepts. Design a detailed visual description for a clean, textbook-quality diagram overlay with a white background. Do NOT write any text or labels inside the image. The prompt must describe the visual elements only, and must end with: 'textless, no labels, no text, no letters, no writing, clean diagram'. Keep output under 60 words.";
    const userPrompt = `Refine this educational image prompt: "${prompt}". Translate to English if needed. Describe the visual layout clearly without any text or letters.`;

    const useVertex = process.env.USE_VERTEX_AI === 'true';
    if (useVertex) {
      try {
        const creds = getServiceAccountCredentials();
        let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';
        let accessToken = '';

        if (creds) {
          projectId = creds.project_id || projectId;
          const vertexAuth = new google.auth.JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
          });
          const authClient = await vertexAuth.authorize();
          accessToken = authClient.access_token || '';
        } else {
          const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
          });
          const authClient = await auth.getClient();
          const tokenResponse = await authClient.getAccessToken();
          accessToken = tokenResponse.token || '';
          projectId = await auth.getProjectId() || projectId;
        }

        if (accessToken) {
          const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemInstruction }] }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return text.trim();
            }
          }
        }
      } catch (err: any) {
        console.warn("Vertex AI prompt refinement failed:", err.message);
      }
    }

    const rotatorKeys = getRotatorKeys();
    for (const keyToUse of rotatorKeys) {
      try {
        const ai = new GoogleGenerativeAI(keyToUse);
        const model = ai.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: systemInstruction
        });
        const result = await model.generateContent(userPrompt);
        const text = result.response.text();
        if (text) {
          return text.trim();
        }
      } catch (err: any) {
        console.warn(`AI Studio key prompt refinement failed:`, err.message);
      }
    }

    return `${prompt}, clean textbook style vector diagram, white background, textless, no labels, no text, no letters, no writing`;
  }

  app.post('/api/ai/generate-image', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required' });
      }

      console.log(`Backend AI: Original prompt from user: "${prompt}"`);
      const finalPrompt = await refineTextPrompt(prompt);
      console.log(`Backend AI: Refined prompt to pass to Imagen: "${finalPrompt}"`);

      // 1. Try Vertex AI Image Generation Route first
      const useVertex = process.env.USE_VERTEX_AI === 'true';
      if (useVertex) {
        try {
          console.log("Backend AI: Attempting image generation via Vertex AI...");
          const creds = getServiceAccountCredentials();
          let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';
          let accessToken = '';

          if (creds) {
            projectId = creds.project_id || projectId;
            const vertexAuth = new google.auth.JWT({
              email: creds.client_email,
              key: creds.private_key,
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await vertexAuth.authorize();
            accessToken = authClient.access_token || '';
          } else {
            const auth = new google.auth.GoogleAuth({
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await auth.getClient();
            const tokenResponse = await authClient.getAccessToken();
            accessToken = tokenResponse.token || '';
            projectId = await auth.getProjectId() || projectId;
          }

          if (accessToken) {
            const region = process.env.VERTEX_AI_REGION || 'us-central1';
            const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagen-3.0-generate-002:predict`;
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                instances: [
                  { prompt: finalPrompt }
                ],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: "1:1",
                  outputMimeType: "image/jpeg"
                }
              })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                const base64 = data.predictions[0].bytesBase64Encoded;
                console.log("Backend AI: Image generated successfully via Vertex AI.");
                return res.json({ image: `data:image/jpeg;base64,${base64}` });
              }
            } else {
              const errText = await response.text();
              console.warn("Vertex AI Imagen returned non-OK status:", response.status, errText);
            }
          }
        } catch (vertexErr: any) {
          console.error("Vertex AI Imagen generation route failed:", vertexErr.message);
        }
      }

      // 2. Fallback to Google AI Studio Imagen 3 REST API using Key Rotator
      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      let lastError = null;

      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`Backend AI: Attempting image generation via key ${keyToUse.substring(0, 12)}...`);
          const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${keyToUse}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [
                { prompt: finalPrompt }
              ],
              parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                outputMimeType: "image/jpeg"
              }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Imagen API error: ${response.status} - ${errText}`);
          }

          const data = await response.json();
          if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
            const base64 = data.predictions[0].bytesBase64Encoded;
            return res.json({ image: `data:image/jpeg;base64,${base64}` });
          } else {
            throw new Error(`Invalid response structure from Imagen: ${JSON.stringify(data)}`);
          }
        } catch (err: any) {
          console.error(`Imagen key ${keyToUse.substring(0, 12)} failed:`, err.message);
          lastError = err;
          if (err.message.includes('429') || err.message.includes('403') || err.message.includes('401')) {
            continue; // try next key
          }
        }
      }

      throw lastError || new Error("All rotator keys and Vertex AI failed for image generation");
    } catch (error: any) {
      console.error("Backend AI Generate Image Error:", error);
      res.status(500).json({ error: error.message || 'Image Generation failed' });
    }
  });

  app.post('/api/ai/refine-sketch', async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'image is required' });
      }

      const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;
      let promptDescription = "";
      let lastError = null;

      // 1. Try Vertex AI Route for Stage 1 (Gemini 2.5 Flash analysis)
      const useVertex = process.env.USE_VERTEX_AI === 'true';
      if (useVertex) {
        try {
          console.log("Backend AI Stage 1: Analyzing sketch via Vertex AI...");
          const creds = getServiceAccountCredentials();
          let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';
          let accessToken = '';

          if (creds) {
            projectId = creds.project_id || projectId;
            const vertexAuth = new google.auth.JWT({
              email: creds.client_email,
              key: creds.private_key,
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await vertexAuth.authorize();
            accessToken = authClient.access_token || '';
          } else {
            const auth = new google.auth.GoogleAuth({
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await auth.getClient();
            const tokenResponse = await authClient.getAccessToken();
            accessToken = tokenResponse.token || '';
            projectId = await auth.getProjectId() || projectId;
          }

          if (accessToken) {
            const url = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/gemini-2.5-flash:generateContent`;
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      { text: "Analyze this rough blackboard drawing. Identify the diagram, subject matter, or illustration. Generate a highly detailed, professional prompt for an image generator (like Imagen) to create a clean, textbook-quality version of this diagram (clean vector style, white background). Keep output under 80 words." },
                      { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
                    ]
                  }
                ],
                systemInstruction: {
                  parts: [{ text: "You are an expert educational designer. Analyze the crude blackboard sketch and describe a clean, professional vector diagram overlay based on it. Keep description under 80 words." }]
                }
              })
            });

            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                promptDescription = text.trim();
                console.log("Backend AI Stage 1: Sketch analyzed successfully via Vertex AI:", promptDescription);
              }
            } else {
              const errText = await response.text();
              console.warn("Vertex AI Stage 1 returned non-OK status:", response.status, errText);
            }
          }
        } catch (vertexErr: any) {
          console.error("Vertex AI Stage 1 failed:", vertexErr.message);
        }
      }

      // If Vertex AI didn't run or fail, fallback to Rotator Keys for Stage 1
      if (!promptDescription) {
        const rotatorKeys = getRotatorKeys();
        for (const keyToUse of rotatorKeys) {
          try {
            console.log(`Backend AI Stage 1: Analyzing sketch via key ${keyToUse.substring(0, 12)}...`);
            const ai = new GoogleGenerativeAI(keyToUse);
            const model = ai.getGenerativeModel({
              model: "gemini-2.5-flash",
              systemInstruction: "You are an expert educational designer. Analyze the crude blackboard sketch and describe a clean, professional vector diagram overlay based on it. Keep description under 80 words."
            });

            const contents: any[] = [
              {
                role: 'user',
                parts: [
                  { text: "Analyze this rough blackboard drawing. Identify the diagram, subject matter, or illustration. Generate a highly detailed, professional prompt for an image generator (like Imagen) to create a clean, textbook-quality version of this diagram (clean vector style, white background). Keep output under 80 words." },
                  { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
                ]
              }
            ];

            const result = await model.generateContent({ contents });
            const text = result.response.text();
            if (text) {
              promptDescription = text.trim();
              break;
            }
          } catch (err: any) {
            console.error(`Stage 1 key ${keyToUse.substring(0, 12)} failed:`, err.message);
            lastError = err;
            if (err.message.includes('429') || err.message.includes('403') || err.message.includes('401')) {
              continue;
            }
          }
        }
      }

      if (!promptDescription) {
        throw lastError || new Error("Failed to analyze sketch drawing using any key or Vertex AI");
      }

      // Stage 2: Call Imagen 3 with the generated prompt description
      let imageResultBase64 = "";

      // Try Vertex AI Route for Stage 2 first
      if (useVertex) {
        try {
          console.log("Backend AI Stage 2: Generating refined diagram via Vertex AI...");
          const creds = getServiceAccountCredentials();
          let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';
          let accessToken = '';

          if (creds) {
            projectId = creds.project_id || projectId;
            const vertexAuth = new google.auth.JWT({
              email: creds.client_email,
              key: creds.private_key,
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await vertexAuth.authorize();
            accessToken = authClient.access_token || '';
          } else {
            const auth = new google.auth.GoogleAuth({
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await auth.getClient();
            const tokenResponse = await authClient.getAccessToken();
            accessToken = tokenResponse.token || '';
            projectId = await auth.getProjectId() || projectId;
          }

          if (accessToken) {
            const region = process.env.VERTEX_AI_REGION || 'us-central1';
            const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagen-3.0-generate-002:predict`;
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                instances: [
                  { prompt: promptDescription }
                ],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: "1:1",
                  outputMimeType: "image/jpeg"
                }
              })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                imageResultBase64 = data.predictions[0].bytesBase64Encoded;
                console.log("Backend AI Stage 2: Refined diagram generated successfully via Vertex AI.");
              }
            } else {
              const errText = await response.text();
              console.warn("Vertex AI Stage 2 returned non-OK status:", response.status, errText);
            }
          }
        } catch (vertexErr: any) {
          console.error("Vertex AI Stage 2 failed:", vertexErr.message);
        }
      }

      // Fallback to Rotator Keys for Stage 2 if Vertex AI failed
      if (!imageResultBase64) {
        const rotatorKeys = getRotatorKeys();
        for (const keyToUse of rotatorKeys) {
          try {
            console.log(`Backend AI Stage 2: Generating refined diagram via key ${keyToUse.substring(0, 12)}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${keyToUse}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instances: [
                  { prompt: promptDescription }
                ],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: "1:1",
                  outputMimeType: "image/jpeg"
                }
              })
            });

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`Imagen API error: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
              imageResultBase64 = data.predictions[0].bytesBase64Encoded;
              break;
            } else {
              throw new Error(`Invalid response structure from Imagen: ${JSON.stringify(data)}`);
            }
          } catch (err: any) {
            console.error(`Stage 2 key ${keyToUse.substring(0, 12)} failed:`, err.message);
            lastError = err;
            if (err.message.includes('429') || err.message.includes('403') || err.message.includes('401')) {
              continue;
            }
          }
        }
      }

      if (imageResultBase64) {
        return res.json({ 
          image: `data:image/jpeg;base64,${imageResultBase64}`,
          description: promptDescription
        });
      }

      throw lastError || new Error("All rotator keys and Vertex AI failed for image refinement");
    } catch (error: any) {
      console.error("Backend AI Refine Sketch Error:", error);
      res.status(500).json({ error: error.message || 'Sketch Refinement failed' });
    }
  });

  app.post('/api/ai/generate-matching-quiz', async (req, res) => {
    try {
      const { className, subjectName, language } = req.body;
      if (!className || !subjectName) {
        return res.status(400).json({ error: 'className and subjectName are required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      let languageInstruction = '';
      if (language === 'or') {
        languageInstruction = `Odia (using Odia script for student content).
        SUBJECT-SPECIFIC RULES:
        - For "English" subject: The terms MUST be in English only.
        - For "Sanskrit" / "Hindi" subjects: The terms MUST be in Sanskrit / Hindi.
        - For "Mathematics", "Science", and "Social Science" subjects: The terms MUST be in Odia (but keep mathematical numbers or scientific variables clean using standard English/Arabic numerals like 5, x, y, a^2 + b^2).
        
        CRITICAL ODIA ORTHOGRAPHY & SPELLING (ଯୁକ୍ତାକ୍ଷର) RULES:
        1. Historical Names & Movements: Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା). Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
        2. Vowel & Matra Accuracy: Use proper long vowels: "ପරୀକ୍ଷା" (never "ପରିକ୍ଷା"), "ବ୍ୟବସାୟ" (never "ବେବସାୟ"), "ବ୍ୟାକରଣ" (never "ବେକରଣ" or "ବ୍ୟାକରନ"), "ଶିକ୍ଷା" (never "ସିକ୍ଷା"), "ଶିକ୍ଷଣ" (never "ଶିକ୍ଷନ"), "ସାହିତ୍ୟ ସାଥୀ" (never "ସାହିତ୍ୟ ସାଥି"), "ବର୍ଣ୍ଣ" (never "ବର୍ନ"), "ବଳ ଓ ଗତି" (never "ବାଳ ଓ ଗତି").
        3. Conjuncts & Ligatures: Use correct conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".`;
      } else {
        languageInstruction = `English.
        SUBJECT-SPECIFIC RULES:
        - For "Odia" subject: The terms MUST be in correct Odia script following these rules:
          * Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା).
          * Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
          * Use proper spelling like "ପරୀକ୍ଷା", "ବ୍ୟବସାୟ", "ବ୍ୟାକରଣ", "ଶିକ୍ଷା", "ଶିକ୍ଷଣ", "ସାହିତ୍ୟ ସାଥୀ", "ବର୍ଣ୍ଣ", "ବଳ ଓ ଗତି".
          * Use correct Odia conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".
        - For "Sanskrit" / "Hindi" subjects: The terms MUST be in their respective scripts.
        - For all other subjects: The terms MUST be in English.`;
      }

      const prompt = `You are an expert curriculum builder. Create a matching pair educational game for school children of Standard/Class "${className}" in the subject "${subjectName}" in ${languageInstruction}.
      Generate exactly 5 matching pairs. Each pair must contain:
      - "left": a question, definition, math expression, or term (be concise, maximum 25 characters, e.g. "5 + 3" or "Force unit" or "ପ୍ରତିଫଳନ").
      - "right": the correct matching answer or corresponding term (be concise, maximum 25 characters, e.g. "8" or "Newton" or "ଆଲୋକ").

      Provide the output in JSON format with the following structure:
      {
        "pairs": [
          { "id": "1", "left": "Left side term 1", "right": "Right side term 1" },
          { "id": "2", "left": "Left side term 2", "right": "Right side term 2" },
          { "id": "3", "left": "Left side term 3", "right": "Right side term 3" },
          { "id": "4", "left": "Left side term 4", "right": "Right side term 4" },
          { "id": "5", "left": "Left side term 5", "right": "Right side term 5" }
        ]
      }
      Do not include any extra introductory or explanatory text. Return ONLY the JSON object.`;

      let lastError = null;
      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`Backend Quiz: Attempting matching quiz generation using key ${keyToUse.substring(0, 12)}...`);
          const ai = new GoogleGenerativeAI(keyToUse);
          const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          }, { apiVersion: "v1beta" });

          const result = await model.generateContent(prompt);
          let responseText = result.response.text();
          
          if (language === 'or') {
            responseText = cleanOdiaOrthographyLocal(responseText);
          }

          const quizData = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
          return res.json(quizData);
        } catch (error: any) {
          lastError = error;
          console.warn(`Quiz attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
        }
      }

      throw lastError || new Error('Failed to generate quiz with all available keys');
    } catch (error: any) {
      console.error("Quiz Generation Error:", error);
      res.status(500).json({ error: error.message || 'Failed to generate quiz' });
    }
  });

  app.post('/api/ai/generate-custom-worksheet', async (req, res) => {
    try {
      const { className, subjectName, subjectKey, chapters, language, difficulty, pattern } = req.body;
      if (!className || !subjectName) {
        return res.status(400).json({ error: 'className and subjectName are required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      const adminApp = getInitializedAdminApp();
      let chapterTextContext = '';
      if (adminApp && Array.isArray(chapters) && chapters.length > 0) {
        try {
          const firstChapter = chapters[0];
          console.log(`[Custom Worksheet] Loading textbook for ${className} ${subjectName} chapter: ${firstChapter}`);
          const bucketResult = await loadTextbookFromBucket(adminApp, className, subjectName, firstChapter);
          if (bucketResult && bucketResult.driveContent?.text) {
            const parsedText = bucketResult.driveContent.text;
            if (parsedText && parsedText.trim().length > 50) {
              chapterTextContext = parsedText.substring(0, 30000);
              console.log(`[Custom Worksheet] Successfully extracted ${chapterTextContext.length} chars of chapter text.`);
            }
          }
        } catch (storageErr: any) {
          console.warn('[Custom Worksheet] Error loading PDF from storage, falling back to general knowledge:', storageErr.message);
        }
      }

      const classDigit = parseInt(className.replace(/\D/g, '')) || 1;
      const isBoard = classDigit >= 9;
      const sKey = (subjectKey || normalizeSubjectKey(subjectName) || '').toLowerCase();

      let languageInstruction = '';
      const isEnglishSubject = sKey.includes('english');
      const isSanskritSubject = sKey.includes('sanskrit');
      const isHindiSubject = sKey.includes('hindi');

      if (language === 'or') {
        if (isEnglishSubject) {
          languageInstruction = `The questions, options, and hints/answers MUST strictly be in English only. Do NOT translate any terms or questions to Odia.`;
        } else if (isSanskritSubject) {
          languageInstruction = `The questions, options, and hints/answers MUST strictly be in Sanskrit.`;
        } else if (isHindiSubject) {
          languageInstruction = `The questions, options, and hints/answers MUST strictly be in Hindi.`;
        } else {
          languageInstruction = `Odia (using Odia script for student content).
          - The questions and options MUST be in Odia (but keep mathematical numbers, equations, or scientific variables clean using standard English/Arabic numerals like 5, x, y, a^2 + b^2).
          
          CRITICAL ODIA ORTHOGRAPHY & SPELLING (ଯୁକ୍ତାକ୍ଷର) RULES:
          1. Historical Names & Movements: Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା). Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
          2. Vowel & Matra Accuracy: Use proper long vowels: "ପରୀକ୍ଷା" (never "ପରିକ୍ଷା"), "ବ୍ୟବସାୟ" (never "ବେବସାୟ"), "ବ୍ୟାକରଣ" (never "ବେକରଣ" or "ବ୍ୟାକରନ"), "ଶିକ୍ଷା" (never "ସିକ୍ଷା"), "ଶିକ୍ଷଣ" (never "ଶିକ୍ଷନ"), "ସାହିତ୍ୟ ସାଥୀ" (never "ସାହିତ୍ୟ ସାଥି"), "ବର୍ଣ୍ଣ" (never "ବର୍ନ"), "ବଳ ଓ ଗତି" (never "ବାଳ ଓ ଗତି").
          3. Conjuncts & Ligatures: Use correct conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".`;
        }
      } else {
        if (isSanskritSubject) {
          languageInstruction = `The questions, options, and hints/answers MUST strictly be in Sanskrit.`;
        } else if (isHindiSubject) {
          languageInstruction = `The questions, options, and hints/answers MUST strictly be in Hindi.`;
        } else if (sKey.includes('odia')) {
          languageInstruction = `Odia (using correct Odia script following these rules:
            * Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା).
            * Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
            * Use proper spelling like "ପରୀକ୍ଷା", "ବ୍ୟବସାୟ", "ବ୍ୟାକରଣ", "ଶିକ୍ଷା", "ଶିକ୍ଷଣ", "ସାହିତ୍ୟ ସାଥୀ", "ବର୍ଣ୍ଣ", "ବଳ ଓ ଗତି".
            * Use correct Odia conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".)`;
        } else {
          languageInstruction = `English.`;
        }
      }

      let totalMcqs = 15;
      let totalSubjectives = 15;
      let marksSegregationInstructions = '';

      if (isBoard) {
        const isHalfPaper = ['physical_science', 'life_science', 'social_science', 'geography', 'vocational', 'history'].includes(sKey);
        if (isHalfPaper) {
          totalMcqs = 12;
          totalSubjectives = 18;
          if (sKey === 'vocational') {
            marksSegregationInstructions = `The 18 subjective questions must be split by marks as follows:
            - The first 6 questions (index 0 to 5) must be worth 2 marks each (assign "marks": 2).
            - The next 6 questions (index 6 to 11) must be worth 4 marks each (assign "marks": 4).
            - The last 6 questions (index 12 to 17) must be worth 5 marks each (assign "marks": 5).`;
          } else {
            // Science or Social Science
            marksSegregationInstructions = `The 18 subjective questions must be split by marks as follows:
            - The first 6 questions (index 0 to 5) must be worth 2 marks each (assign "marks": 2).
            - The next 6 questions (index 6 to 11) must be worth 3 marks each (assign "marks": 3).
            - The last 6 questions (index 12 to 17) must be worth 4 marks each (assign "marks": 4).`;
          }
        } else {
          totalMcqs = 15;
          totalSubjectives = 15;
          const isMath = ['algebra', 'geometry', 'mathematics', 'math'].includes(sKey);
          if (isMath) {
            marksSegregationInstructions = `The 15 subjective questions must strictly be worth 5 marks each (assign "marks": 5 for all 15 questions).`;
          } else {
            // Languages: english, odia, sanskrit, hindi etc.
            marksSegregationInstructions = `The 15 subjective questions must be split by marks as follows:
            - The first 5 questions (index 0 to 4) must be worth 2 marks each (assign "marks": 2).
            - The next 5 questions (index 5 to 9) must be worth 3 marks each (assign "marks": 3).
            - The next 3 questions (index 10 to 12) must be worth 5 marks each (assign "marks": 5).
            - The last 2 questions (index 13 to 14) must be worth 10 marks each (assign "marks": 10).`;
          }
        }
      } else if (classDigit >= 6 && classDigit <= 8) {
        totalMcqs = 10;
        totalSubjectives = 12;
        marksSegregationInstructions = `The 12 subjective questions must be split by marks as follows:
        - The first 5 questions (index 0 to 4) must be worth 2 marks each (assign "marks": 2).
        - The next 5 questions (index 5 to 9) must be worth 3 marks each (assign "marks": 3).
        - The last 2 questions (index 10 to 11) must be worth 5 marks each (assign "marks": 5).`;
      } else {
        // Class 1 to 5
        totalMcqs = 5;
        totalSubjectives = 7;
        marksSegregationInstructions = `The 7 subjective questions must be split by marks as follows:
        - The first 3 questions (index 0 to 2) must be worth 2 marks each (assign "marks": 2).
        - The next 3 questions (index 3 to 5) must be worth 3 marks each (assign "marks": 3).
        - The last 1 question (index 6) must be worth 5 marks (assign "marks": 5).`;
      }

      if (pattern === 'quick') {
        totalMcqs = 10;
        totalSubjectives = 3;
        marksSegregationInstructions = `The 3 subjective questions should be worth 5 marks each (assign "marks": 5).`;
      }

      const prompt = `You are an expert curriculum builder and Board exam paper setter for the Board of Secondary Education (BSE) Odisha.
      Generate exactly ${totalMcqs} multiple-choice questions (MCQs) and exactly ${totalSubjectives} subjective questions (total ${totalMcqs + totalSubjectives} questions) of ${difficulty ? difficulty.toUpperCase() : 'MEDIUM'} difficulty on the topic/chapters: "${Array.isArray(chapters) ? chapters.join(', ') : chapters}" in the subject "${subjectName}" for standard "${className}".
      
      CRITICAL REQUIREMENTS:
      - The questions must be highly important from a board exam perspective, focusing on core syllabus concepts.
      - The subjective questions and their model answers/hints must follow the official BSE Odisha board exam pattern style, structure, and standard terminology.
      - Do NOT use raw LaTeX mathematical symbols or formatting delimiters (like $$, $, \\[, \\], \\frac, \\sqrt). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.
      
      MARKS SEGREGATION RULES:
      ${marksSegregationInstructions}

      ${chapterTextContext ? `Here is the verified textbook chapter content to base your questions on:\n\n${chapterTextContext}\n\n` : ''}

      ${languageInstruction}

      Provide the output in JSON format with the following structure:
      {
        "mcqs": [
          {
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "Correct option text exactly matching one of the options"
          }
        ],
        "subjectives": [
          {
            "question": "Subjective question text",
            "hint": "Model solution or step-by-step hint explaining the answer key",
            "marks": 5
          }
        ]
      }
      Do not include any extra introductory or explanatory text. Return ONLY the JSON object.`;

      let lastError = null;
      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`Backend Custom Worksheet: Attempting generation using key ${keyToUse.substring(0, 12)}...`);
          const ai = new GoogleGenerativeAI(keyToUse);
          const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          }, { apiVersion: "v1beta" });

          const result = await model.generateContent(prompt);
          let responseText = result.response.text();
          
          if (language === 'or') {
            responseText = cleanOdiaOrthographyLocal(responseText);
          }

          const worksheetData = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
          return res.json(worksheetData);
        } catch (error: any) {
          lastError = error;
          console.warn(`Worksheet generation attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
        }
      }

      throw lastError || new Error('Failed to generate custom worksheet with all available keys');
    } catch (error: any) {
      console.error("Custom Worksheet Error:", error);
      res.status(500).json({ error: error.message || 'Failed to generate custom worksheet' });
    }
  });

  function getMtsSubjectType(subjectName: string): 'math' | 'science_social' | 'language' {
    const s = subjectName.toLowerCase().trim();
    if (s.includes('math') || s.includes('algebra') || s.includes('geometry')) {
      return 'math';
    }
    if (
      s.includes('science') || 
      s.includes('history') || 
      s.includes('geography') || 
      s.includes('social') || 
      s.includes('physics') || 
      s.includes('chemistry') || 
      s.includes('biology') || 
      s.includes('evs')
    ) {
      return 'science_social';
    }
    return 'language';
  }

  app.post('/api/ai/generate-monthly-test', async (req, res) => {
    try {
      const { className, subjectName, chapters, language } = req.body;
      if (!className || !subjectName) {
        return res.status(400).json({ error: 'className and subjectName are required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      const adminApp = getInitializedAdminApp();
      let chapterTextContext = '';
      if (adminApp && Array.isArray(chapters) && chapters.length > 0) {
        try {
          const firstChapter = chapters[0];
          console.log(`[Monthly Test] Loading textbook for ${className} ${subjectName} chapter: ${firstChapter}`);
          const bucketResult = await loadTextbookFromBucket(adminApp, className, subjectName, firstChapter);
          if (bucketResult && bucketResult.driveContent?.text) {
            const parsedText = bucketResult.driveContent.text;
            if (parsedText && parsedText.trim().length > 50) {
              chapterTextContext = parsedText.substring(0, 30000);
              console.log(`[Monthly Test] Successfully extracted ${chapterTextContext.length} chars of chapter text.`);
            }
          }
        } catch (storageErr: any) {
          console.warn('[Monthly Test] Error loading PDF from storage, falling back to general knowledge:', storageErr.message);
        }
      }

      let languageInstruction = '';
      if (language === 'or') {
        languageInstruction = `Odia (using Odia script for student content).
        SUBJECT-SPECIFIC RULES:
        - For "English" subject: The terms/questions MUST be in English only.
        - For "Sanskrit" / "Hindi" subjects: The terms/questions MUST be in Sanskrit / Hindi.
        - For "Mathematics", "Science", and "Social Science" subjects: The questions and options MUST be in Odia (but keep mathematical numbers, equations, or scientific variables clean using standard English/Arabic numerals like 5, x, y, a^2 + b^2).
        
        CRITICAL ODIA ORTHOGRAPHY & SPELLING (ଯୁକ୍ତାକ୍ଷର) RULES:
        1. Historical Names & Movements: Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା). Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
        2. Vowel & Matra Accuracy: Use proper long vowels: "ପରୀକ୍ଷା" (never "ପରିକ୍ଷା"), "ବ୍ୟବସାୟ" (never "ବେବସାୟ"), "ବ୍ୟାକରଣ" (never "ବେକରଣ" or "ବ୍ୟାକରନ"), "ଶିକ୍ଷା" (never "ସିକ୍ଷା"), "ଶିକ୍ଷଣ" (never "ଶିକ୍ଷନ"), "ସାହିତ୍ୟ ସାଥୀ" (never "ସାହିତ୍ୟ ସାଥି"), "ବର୍ଣ୍ଣ" (never "ବର୍ନ"), "ବଳ ଓ ଗତି" (never "ବାଳ ଓ ଗତି").
        3. Conjuncts & Ligatures: Use correct conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".`;
      } else {
        languageInstruction = `English.
        SUBJECT-SPECIFIC RULES:
        - For "Odia" subject: The questions MUST be in correct Odia script following these rules:
          * Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା).
          * Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
          * Use proper spelling like "ପରୀକ୍ଷା", "ବ୍ୟବସାୟ", "ବ୍ୟାକରଣ", "ଶିକ୍ଷା", "ଶିକ୍ଷଣ", "ସାହିତ୍ୟ ସାଥୀ", "ବର୍ଣ୍ଣ", "ବଳ ଓ ଗତି".
          * Use correct Odia conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".
        - For "Sanskrit" / "Hindi" subjects: The questions MUST be in their respective scripts.
        - For all other subjects: The questions MUST be in English.`;
      }

      const classNum = className ? (parseInt(String(className).replace(/\D/g, '')) || 10) : 10;
      
      let structureDescription = '';
      let outputStructure = '';

      if (classNum >= 1 && classNum <= 5) {
        structureDescription = `
        - Exactly 5 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
        - Exactly 3 short answer/subjective (2 Marks each, with empty 'options' array, and 'type' set to "subjective")
        - Exactly 3 medium answer/subjective (3 Marks each, with empty 'options' array, and 'type' set to "subjective")
        - Exactly 1 long answer/subjective (5 Marks, with empty 'options' array, and 'type' set to "subjective")
        Total: 25 Marks (12 Questions).
        `;
        outputStructure = `
        {
          "questions": [
            {
              "question": "Question text",
              "type": "mcq",
              "marks": 1,
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Correct option text exactly matching one of the options"
            },
            ... 5 MCQs total ...
            {
              "question": "Subjective question text",
              "type": "subjective",
              "marks": 2,
              "options": [],
              "correct_answer": "Model solution or step-by-step hint explaining the answer key"
            },
            ... 3 of 2 Marks, 3 of 3 Marks, 1 of 5 Marks ...
          ]
        }
        `;
      } else if (classNum >= 6 && classNum <= 8) {
        structureDescription = `
        - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
        - Exactly 5 short answer/subjective (2 Marks each, with empty 'options' array, and 'type' set to "subjective")
        - Exactly 5 medium answer/subjective (3 Marks each, with empty 'options' array, and 'type' set to "subjective")
        - Exactly 2 long answer/subjective (5 Marks each, with empty 'options' array, and 'type' set to "subjective")
        Total: 45 Marks (22 Questions).
        `;
        outputStructure = `
        {
          "questions": [
            {
              "question": "Question text",
              "type": "mcq",
              "marks": 1,
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_answer": "Correct option text exactly matching one of the options"
            },
            ... 10 MCQs total ...
            {
              "question": "Subjective question text",
              "type": "subjective",
              "marks": 2,
              "options": [],
              "correct_answer": "Model solution or step-by-step hint explaining the answer key"
            },
            ... 5 of 2 Marks, 5 of 3 Marks, 2 of 5 Marks ...
          ]
        }
        `;
      } else {
        const subjectType = getMtsSubjectType(subjectName);
        if (subjectType === 'science_social') {
          structureDescription = `
          - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
          - Exactly 12 subjective questions (with empty 'options' array, and 'type' set to "subjective"):
            * The first 4 questions (index 0 to 3) must be worth 2 Marks each (assign "marks": 2)
            * The next 4 questions (index 4 to 7) must be worth 3 Marks each (assign "marks": 3)
            * The last 4 questions (index 8 to 11) must be worth 5 Marks each (assign "marks": 5)
          Total: 50 Marks (22 Questions).
          `;
          outputStructure = `
          {
            "questions": [
              {
                "question": "Question text",
                "type": "mcq",
                "marks": 1,
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Correct option text exactly matching one of the options"
              },
              ... 10 MCQs total ...
              {
                "question": "Subjective question text",
                "type": "subjective",
                "marks": 2,
                "options": [],
                "correct_answer": "Model solution or step-by-step hint explaining the answer key"
              },
              ... 4 of 2 Marks, 4 of 3 Marks, 4 of 5 Marks ...
            ]
          }
          `;
        } else if (subjectType === 'math') {
          structureDescription = `
          - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
          - Exactly 8 subjective questions (with empty 'options' array, and 'type' set to "subjective"):
            * All 8 questions must strictly be worth 5 Marks each (assign "marks": 5 for all of them)
          Total: 50 Marks (18 Questions).
          `;
          outputStructure = `
          {
            "questions": [
              {
                "question": "Question text",
                "type": "mcq",
                "marks": 1,
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Correct option text exactly matching one of the options"
              },
              ... 10 MCQs total ...
              {
                "question": "Long Mathematics/Geometry proof or derivation question text",
                "type": "subjective",
                "marks": 5,
                "options": [],
                "correct_answer": "Detailed step-by-step mathematical proof or solution key"
              },
              ... 8 subjective questions of 5 Marks each ...
            ]
          }
          `;
        } else {
          // Language / Vocational
          structureDescription = `
          - Exactly 10 MCQ (1 Mark each, with 'options' array containing 4 choices, and 'type' set to "mcq")
          - Exactly 10 subjective questions (with empty 'options' array, and 'type' set to "subjective"):
            * The first 4 questions (index 0 to 3) must be worth 2 Marks each (assign "marks": 2)
            * The next 4 questions (index 4 to 7) must be worth 3 Marks each (assign "marks": 3)
            * The last 2 questions (index 8 to 9) must be worth 10 Marks each (assign "marks": 10, typically board-style essays, formal letters, translations, or comprehensions)
          Total: 50 Marks (20 Questions).
          `;
          outputStructure = `
          {
            "questions": [
              {
                "question": "Question text",
                "type": "mcq",
                "marks": 1,
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Correct option text exactly matching one of the options"
              },
              ... 10 MCQs total ...
              {
                "question": "Subjective question text",
                "type": "subjective",
                "marks": 2,
                "options": [],
                "correct_answer": "Model solution or step-by-step hint explaining the answer key"
              },
              ... 4 of 2 Marks, 4 of 3 Marks, 2 of 10 Marks ...
            ]
          }
          `;
        }
      }

      const prompt = `You are an expert curriculum builder and Board exam paper setter for the Board of Secondary Education (BSE) Odisha.
      Generate exactly the monthly test paper questions of MEDIUM difficulty on the active chapters: "${Array.isArray(chapters) ? chapters.join(', ') : chapters}" in the subject "${subjectName}" for standard "${className}".

      CRITICAL REQUIREMENTS:
      - The questions must follow this specific structure of questions:
        ${structureDescription}
      - The questions must be highly important from a board exam perspective, focusing on active syllabus concepts.
      - The subjective questions and their model answers/hints must follow the official BSE Odisha board exam pattern style, structure, and standard terminology.
      - Do NOT use raw LaTeX mathematical symbols or formatting delimiters (like $$, $, \\[, \\], \\frac, \\sqrt). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.

      ${chapterTextContext ? `Here is the textbook chapter content to base your questions on:\n\n${chapterTextContext}\n\n` : ''}

      ${languageInstruction}

      Provide the output in JSON format with the following structure:
      ${outputStructure}
      Do not include any extra introductory or explanatory text. Return ONLY the JSON object.`;

      let lastError = null;
      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`Backend Monthly Test: Attempting generation using key ${keyToUse.substring(0, 12)}...`);
          const ai = new GoogleGenerativeAI(keyToUse);
          const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          }, { apiVersion: "v1beta" });

          const result = await model.generateContent(prompt);
          let responseText = result.response.text();
          
          if (language === 'or') {
            responseText = cleanOdiaOrthographyLocal(responseText);
          }

          const testData = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
          return res.json(testData);
        } catch (error: any) {
          lastError = error;
          console.warn(`Monthly test generation attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
        }
      }

      throw lastError || new Error('Failed to generate monthly test with all available keys');
    } catch (error: any) {
      console.error("Monthly Test AI Endpoint Error:", error);
      res.status(500).json({ error: error.message || 'Failed to generate monthly test' });
    }
  });

  app.post('/api/ai/generate-daily-mcq', async (req, res) => {
    try {
      const { className, subjectName, chapters, language, difficulty } = req.body;
      if (!className || !subjectName) {
        return res.status(400).json({ error: 'className and subjectName are required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      const adminApp = getInitializedAdminApp();
      let chapterTextContext = '';
      if (adminApp && Array.isArray(chapters) && chapters.length > 0) {
        try {
          const firstChapter = chapters[0];
          console.log(`[Daily MCQ AI] Loading textbook for ${className} ${subjectName} chapter: ${firstChapter}`);
          const bucketResult = await loadTextbookFromBucket(adminApp, className, subjectName, firstChapter);
          if (bucketResult && bucketResult.driveContent?.text) {
            const parsedText = bucketResult.driveContent.text;
            if (parsedText && parsedText.trim().length > 50) {
              chapterTextContext = parsedText.substring(0, 30000);
              console.log(`[Daily MCQ AI] Successfully extracted ${chapterTextContext.length} chars of chapter text.`);
            }
          }
        } catch (storageErr: any) {
          console.warn('[Daily MCQ AI] Error loading PDF from storage, falling back to general knowledge:', storageErr.message);
        }
      }

      let languageInstruction = '';
      if (language === 'or') {
        languageInstruction = `Odia (using Odia script for student content).
        SUBJECT-SPECIFIC RULES:
        - For "English" subject: The terms/questions MUST be in English only.
        - For "Sanskrit" / "Hindi" subjects: The terms/questions MUST be in Sanskrit / Hindi.
        - For "Mathematics", "Science", and "Social Science" subjects: The questions and options MUST be in Odia (but keep mathematical numbers, equations, or scientific variables clean using standard English/Arabic numerals like 5, x, y, a^2 + b^2).
        
        CRITICAL ODIA ORTHOGRAPHY & SPELLING (ଯୁକ୍ତାକ୍ଷର) RULES:
        1. Historical Names & Movements: Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା). Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
        2. Vowel & Matra Accuracy: Use proper long vowels: "ପରୀକ୍ଷା" (never "ପରିକ୍ଷା"), "ବ୍ୟବସାୟ" (never "ବେବସାୟ"), "ବ୍ୟାକରଣ" (never "ବେକରଣ" or "ବ୍ୟାକରନ"), "ଶିକ୍ଷା" (never "ସିକ୍ଷା"), "ଶିକ୍ଷଣ" (never "ଶିକ୍ଷନ"), "ସାହିତ୍ୟ ସାଥୀ" (never "ସାହିତ୍ୟ ସାଥି"), "ବର୍ଣ୍ଣ" (never "ବର୍ନ"), "ବଳ ଓ ଗତି" (never "ବାଳ ଓ ଗତି").
        3. Conjuncts & Ligatures: Use correct conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".`;
      } else {
        languageInstruction = `English.
        SUBJECT-SPECIFIC RULES:
        - For "Odia" subject: The questions MUST be in correct Odia script following these rules:
          * Always spell "ଦାଣ୍ଡି ଯାତ୍ରା" (Dandi March/Jatra) using "ଯ" (ଯାତ୍ରା), NEVER use "ଜ" (ଜାତ୍ରା / ଜାରା / ଜାର୍ତ୍ତା).
          * Always spell "ମହାତ୍ମା ଗାନ୍ଧୀ" (Mahatma Gandhi) using "ଧୀ" (long vowel ୀ), NEVER "ଗାନ୍ଧି" or "ଗାନ୍ଧିଜି" (correct is "ଗାନ୍ଧୀଜୀ").
          * Use proper spelling like "ପରୀକ୍ଷା", "ବ୍ୟବସାୟ", "ବ୍ୟାକରଣ", "ଶିକ୍ଷା", "ଶିକ୍ଷଣ", "ସାହିତ୍ୟ ସାଥୀ", "ବର୍ଣ୍ଣ", "ବଳ ଓ ଗତି".
          * Use correct Odia conjuncts/ligatures (e.g. ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ନ୍ତ, ଳ). NEVER output broken combinations like "ନ୍‌ଦ" or "ନ୍‌ଧ".
        - For "Sanskrit" / "Hindi" subjects: The questions MUST be in their respective scripts.
        - For all other subjects: The questions MUST be in English.`;
      }

      const prompt = `You are an expert curriculum builder and Board exam paper setter for the Board of Secondary Education (BSE) Odisha.
      Generate exactly 10 multiple-choice questions (MCQs) of "${difficulty || 'Medium'}" difficulty level on the chapters/topics: "${Array.isArray(chapters) ? chapters.join(', ') : chapters}" in the subject "${subjectName}" for standard "${className}".

      CRITICAL REQUIREMENTS:
      - The difficulty level is "${difficulty || 'Medium'}".
        - If "Recall": Questions must focus on recall of facts, direct formulas, definitions, dates, and names.
        - If "Understanding": Questions must focus on understanding, explanations, comparisons, and identifying cause-effect.
        - If "Application": Questions must focus on word problems, applying principles/formulas to scenarios, and syntax analysis.
      - The questions must follow proper board exam terminology.
      - Do NOT use raw LaTeX mathematical symbols or formatting delimiters (like $$, $, \\[, \\], \\frac, \\sqrt). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.

      ${chapterTextContext ? `Here is the textbook chapter content to base your questions on:\n\n${chapterTextContext}\n\n` : ''}

      ${languageInstruction}

      Provide the output in JSON format with the following structure:
      {
        "questions": [
          {
            "question": "Question text",
            "type": "mcq",
            "marks": 1,
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Correct option text exactly matching one of the options",
            "explanation": "Brief explanation/rationale for why this option is correct"
          }
        ]
      }
      Do not include any extra introductory or explanatory text. Return ONLY the JSON object.`;

      let lastError = null;
      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`Backend Daily MCQ AI: Attempting generation using key ${keyToUse.substring(0, 12)}...`);
          const ai = new GoogleGenerativeAI(keyToUse);
          const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          }, { apiVersion: "v1beta" });

          const result = await model.generateContent(prompt);
          let responseText = result.response.text();
          
          if (language === 'or') {
            responseText = cleanOdiaOrthographyLocal(responseText);
          }

          const mcqData = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
          return res.json(mcqData);
        } catch (error: any) {
          lastError = error;
          console.warn(`Daily MCQ generation attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
        }
      }

      throw lastError || new Error('Failed to generate daily MCQ with all available keys');
    } catch (error: any) {
      console.error("Daily MCQ AI Endpoint Error:", error);
      res.status(500).json({ error: error.message || 'Failed to generate daily MCQ' });
    }
  });

  app.get('/api/public/daily-mcq', async (req, res) => {
    try {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      console.log(`[Public Daily MCQ] Serving request for date: ${todayDate}...`);

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      const prompt = `You are Gundulu, a warm, highly intellectual elder sister from Odisha who loves teaching. Your tone is extremely encouraging, proud of Odisha, and filled with affection.
      Generate today's "Universal GK & Odisha Culture Challenge" for the date ${todayDate} containing exactly 5 premium, diverse General Knowledge questions.
      
      The questions must cover:
      - Question 1: Odisha History & Heritage (e.g., Konark, Jagannath Temple, Kalinga War, Baji Rout, Madhusudan Das)
      - Question 2: Odisha Geography & Nature (e.g., Chilika Lake, Mahanadi River, Similipal Forest, mineral wealth)
      - Question 3: Everyday General Science (e.g., how rainbows form, eclipse phenomena, basic physics/chemistry in daily life)
      - Question 4: Fun Math / Logical Puzzle (e.g., a simple, engaging riddle or pattern puzzle)
      - Question 5: Odia Language, Proverbs, or Art (e.g., famous proverbs, sand art, Odissi dance, local festivals)
      
      Each question must have:
      - A bilingual question text (English and Odia script).
      - 4 bilingual options (English and Odia script).
      - One correct_answer (exact string matching one of the options).
      - A warm, detailed explanation in Odia script written in Gundulu's encouraging elder-sister voice, sharing a fascinating historical or scientific fact.

      CRITICAL REQUIREMENTS:
      - Output strictly in JSON format matching this schema:
      {
        "title": "Universal GK Challenge",
        "subject": "General Knowledge",
        "questions": [
          {
            "question": "Question text in English / ଓଡ଼ିଆ ଲେଖା",
            "options": ["Option A / ଓଡ଼ିଆ", "Option B / ଓଡ଼ିଆ", "Option C / ଓଡ଼ିଆ", "Option D / ଓଡ଼ିଆ"],
            "correct_answer": "Exact matching option string",
            "explanation": "Warm, encouraging explanation in Odia script starting with 'ସାଙ୍ଗମାନେ...' or 'ଭାଇ ଭଉଣୀମାନେ...'"
          }
        ]
      }
      Do not include any extra introductory or explanatory text. Return ONLY the JSON object.`;

      let lastError = null;
      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`[Public Daily MCQ] Attempting generation using key ${keyToUse.substring(0, 12)}...`);
          const ai = new GoogleGenerativeAI(keyToUse);
          const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          }, { apiVersion: "v1beta" });

          const result = await model.generateContent(prompt);
          let responseText = result.response.text();
          
          // Clean up formatting block if any
          responseText = responseText.replace(/```json\n?|```/g, '').trim();
          
          // Apply local Odia spelling cleanup
          responseText = cleanOdiaOrthographyLocal(responseText);

          const mcqData = JSON.parse(responseText);
          return res.json(mcqData);
        } catch (error: any) {
          lastError = error;
          console.warn(`[Public Daily MCQ] Attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
        }
      }

      throw lastError || new Error('Failed to generate public daily MCQ with all available keys');
    } catch (error: any) {
      console.error("Public Daily MCQ Endpoint Error:", error);
      res.status(500).json({ error: error.message || 'Failed to generate public daily MCQ' });
    }
  });

  function getOdiaClassName(cls: string): string {
    const mapping: Record<string, string> = {
      'sishuvatika(Anganwadi)': 'ଶିଶୁ ବାଟିକା (ଅଙ୍ଗନୱାଡ଼ି)',
      'class1': 'ପ୍ରଥମ ଶ୍ରେଣୀ',
      'class2': 'ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ',
      'class3': 'ତୃତୀୟ ଶ୍ରେଣୀ',
      'class4': 'ଚତୁର୍ଥ ଶ୍ରେଣୀ',
      'class5': 'ପଞ୍ଚମ ଶ୍ରେଣୀ',
      'class6': 'ଷଷ୍ଠ ଶ୍ରେଣୀ',
      'class7': 'ସପ୍ତମ ଶ୍ରେଣୀ',
      'class8': 'ଅଷ୍ଟମ ଶ୍ରେଣୀ',
      'class9': 'ନବମ ଶ୍ରେଣୀ',
      'class10': 'ଦଶମ ଶ୍ରେଣୀ'
    };
    return mapping[cls] || cls;
  }

  function getOdiaSubjectName(sub: string): string {
    const mapping: Record<string, string> = {
      'shishu_vatika': 'ଶିଶୁ ବାଟିକା',
      'ganita_khela': 'ଗଣିତ ଖେଳ',
      'jhulana_1': 'ଝୁଲଣା ୧',
      'maja_majare_ganita': 'ମଜା ମଜାରେ ଗଣିତ',
      'jhulana_2': 'ଝୁଲଣା ୨',
      'algebra': 'ବୀଜଗଣିତ',
      'geometry': 'ଜ୍ୟାମିତି',
      'physical_science': 'ଭୌତିକ ବିଜ୍ଞାନ',
      'life_science': 'ଜୀବ ବିଜ୍ଞାନ',
      'social_science': 'ଇତିହାସ',
      'geography': 'ଭୂଗୋଳ',
      'english': 'ଇଂରାଜୀ',
      'english_grammar': 'ଇଂରାଜୀ ବ୍ୟାକରଣ',
      'odia': 'ଓଡ଼ିଆ',
      'odia_grammar': 'ଓଡ଼ିଆ ବ୍ୟାକରଣ',
      'sanskrit': 'ସଂସ୍କୃତ',
      'sanskrit_grammar': 'ସଂସ୍କୃତ ବ୍ୟାକରଣ',
      'hindi': 'ହିନ୍ଦୀ',
      'hindi_grammar': 'ହିନ୍ଦୀ ବ୍ୟାକରଣ',
      'vocational': 'ବ୍ୟାବସାୟିକ ଶିକ୍ଷା'
    };
    return mapping[sub] || sub;
  }

  app.post('/api/ai/generate-revision-poster', async (req, res) => {
    try {
      const { className, subjectName, chapterName, language, questionCount } = req.body;
      if (!className || !subjectName || !chapterName) {
        return res.status(400).json({ error: 'className, subjectName and chapterName are required' });
      }

      const count = questionCount ? Math.min(Math.max(parseInt(questionCount), 5), 10) : 10;

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      const displayClass = language === 'or' ? getOdiaClassName(className) : className;
      const displaySubject = language === 'or' ? getOdiaSubjectName(subjectName) : subjectName;

      const jsonStructureExample = language === 'or' ? `{
        "questions": [
          {
            "id": 1,
            "question": "*ସରଳ ସହସମୀକରଣ* ର ସଂଜ୍ଞା କଣ?",
            "answer": "ଯେଉଁ ସମୀକରଣରେ ଅଜ୍ଞାତ ରାଶିର ସର୍ବୋଚ୍ଚ ଘାତ ଏକ ହୋଇଥାଏ, ତାହାକୁ ସରଳ ସହସମୀକରଣ କୁହାଯାଏ ।",
            "sideNoteLabel": "ମନେରଖ!",
            "sideNote": "ଏହାର ସାଧାରଣ ରୂପ ହେଉଛି ax + by + c = 0 ।",
            "iconType": "axes",
            "imagePrompt": "A clean vector diagram showing a cartesian coordinate system with a straight line intersecting the x and y axes, white background, textless."
          }
        ]
      }` : `{
        "questions": [
          {
            "id": 1,
            "question": "What is a *linear equation*?",
            "answer": "An equation between two variables that gives a straight line when plotted on a graph.",
            "sideNoteLabel": "Remember!",
            "sideNote": "The general form is ax + by + c = 0.",
            "iconType": "axes",
            "imagePrompt": "A clean vector diagram showing a cartesian coordinate system with a straight line intersecting the x and y axes, white background, textless."
          }
        ]
      }`;

      const prompt = `You are an expert curriculum builder for BSE Odisha (Board of Secondary Education, Odisha) schools.
      Create a set of ${count} high-level, conceptual, and analytical revision questions and answers for Class "${displayClass}" in the subject "${displaySubject}" for the Chapter: "${chapterName}".
      The output should be generated in ${language === 'or' ? 'Odia (using clean Odia script)' : 'English'}.
      
      CRITICAL INSTRUCTIONS FOR QUESTION QUALITY & DIVERSITY:
      - BSE ODISHA EXAM FOCUS: Align the questions strictly with the BSE Odisha board curriculum, textbook standards, and matric exam patterns. The questions should reflect the style, terminology, and expectations of BSE board examinations.
      - HIGH-LEVEL & CONCEPTUAL: Focus on analytical, reasoning, and application-based questions (HOTS - Higher-Order Thinking Skills). Avoid trivial, single-word recall questions. Include conceptual explanations, formula/theorem applications, and core property analysis to challenge students.
      - HIGH DIVERSITY: Ensure all ${count} questions cover completely different aspects, sub-topics, formulas, theorems, properties, or practical applications of the chapter.
      - AVOID TEMPLATED PAIRS: Do NOT create pairs of identical templated questions with minor word changes (e.g. do NOT make one question for "What is a perfect square?" and a corresponding identical question for "What is a perfect cube?"). Instead, make one question about perfect squares, and a completely different question about properties of cubes, word problems, or estimating roots.
      - TERM TRANSLATION ACCURACY: If outputting in Odia, ensure mathematically correct translations:
        - "Odd numbers" must be translated as "ଅଯୁଗ୍ମ ସଂଖ୍ୟା" (DO NOT use "ଯୁଗ୍ମ ସଂଖ୍ୟା").
        - "Even numbers" must be translated as "ଯୁଗ୍ମ ସଂଖ୍ୟା".
        - "Square root" is "ବର୍ଗମୂଳ".
        - "Cube root" is "ଘନମୂଳ".
      
      For each of the ${count} questions, generate:
      1. A short, highly relevant revision question. In the question text, identify the 1 or 2 most important keywords (such as the main topic, scientific term, or specific subject noun) and wrap them in single asterisks (e.g. "Which is the *famous lake* in Bhubaneswar?" or "*ସରଳ ସହସମୀକରଣ* କହିଲେ କଣ ବୁଝାଏ?"). Do not put asterisks on the question mark or outer punctuation.
      2. A concise and correct answer.
      3. A side note label (MUST be one of: "Important!", "Key Fact", "Remember!", "Note", "Did You Know!", "Formula!" in English, OR if generating in Odia, use their exact translations: "ଗୁରୁତ୍ଵପୂର୍ଣ୍ଣ!", "ମୁଖ୍ୟ ତଥ୍ୟ", "ମନେରଖ!", "ସୂଚନା", "ଆପଣ ଜାଣନ୍ତି କି!", "ସୂତ୍ର!").
      4. A brief 1-sentence supporting note details.
      5. An icon type (MUST be one of: "temple", "flower", "mountain", "dance", "leader", "river", "sand", "school", "book", "deer", "mirror", "lens", "prism", "magnet", "concave_mirror", "axes", "triangle", "circle", "matrix", "integral", "beaker", "atom", "dna", "bulb", "globe", "quill", "slate", "puzzle", "palette", "sprout", "scroll"). Choose the icon that best represents the question topic.
      6. A detailed English visual prompt (imagePrompt) describing a clean textbook-style diagram, graph, sketch, or illustration explaining or illustrating the mathematical/scientific concept of this specific question.
         - CRITICAL: Even if the question, answer, and sideNote are in Odia, the imagePrompt MUST be in English.
         - The prompt must specify visual elements only, be textless, and have a white background (e.g., "A clean vector diagram of a right-angled triangle showing sides a, b, c with a square angle indicator, white background, textless, no labels").
         - Do not include any words, text, letters, or writings in the prompt or in the generated image.

      Provide the output in JSON format with the following structure:
      ${jsonStructureExample}
      
      Fill in all ${count} questions. Do not wrap the response in any markdown formatting or code blocks. Return ONLY the raw JSON object.
      
      CRITICAL LANGUAGE CONSTRAINT: Since the requested language is ${language === 'or' ? 'Odia' : 'English'}, all "question", "answer", "sideNoteLabel", and "sideNote" text fields MUST be written entirely in ${language === 'or' ? 'Odia script (ଓଡ଼ିଆ)' : 'English'}. Only the "imagePrompt" field must be in English. Do NOT mix English and Odia.`;

      let lastError = null;
      for (const keyToUse of rotatorKeys) {
        try {
          console.log(`Backend Poster: Attempting revision poster generation using key ${keyToUse.substring(0, 12)}...`);
          const ai = new GoogleGenerativeAI(keyToUse);
          const model = ai.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            }
          }, { apiVersion: "v1beta" });

          const result = await model.generateContent(prompt);
          let responseText = result.response.text();
          
          if (language === 'or') {
            responseText = cleanOdiaOrthographyLocal(responseText);
          }

          const posterData = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
          return res.json(posterData);
        } catch (error: any) {
          lastError = error;
          console.warn(`Poster generation attempt failed using key ${keyToUse.substring(0, 12)}:`, error.message);
        }
      }

      throw lastError || new Error('Failed to generate poster questions with all available keys');
    } catch (error: any) {
      console.error("Poster Generation Error:", error);
      res.status(500).json({ error: error.message || 'Failed to generate poster questions' });
    }
  });

  function cleanOdiaOrthographyLocal(text: string): string {
    if (!text) return text;

    const correctionMap: Record<string, string> = {
      'ପରିକ୍ଷା': 'ପରୀକ୍ଷା',
      'ପରିକ୍ଷାଗାର': 'ପରୀକ୍ଷାଗାର',
      'ବେବସାୟ': 'ବ୍ୟବସାୟ',
      'ୱେବସାୟ': 'ବ୍ୟବସାୟ',
      'ବେକରଣ': 'ବ୍ୟାକରଣ',
      'ବ୍ୟାକରନ': 'ବ୍ୟାକରଣ',
      'ସିକ୍ଷା': 'ଶିକ୍ଷା',
      'ଶିକ୍ଷନ': 'ଶିକ୍ଷଣ',
      'ସାହିତ୍ୟ ସାଥି': 'ସାହିତ୍ୟ ସାଥୀ',
      'ବର୍ନ': 'ବର୍ଣ୍ଣ',
      'ବର୍ନମାଳା': 'ବର୍ଣ୍ଣମାଳା',
      'ବାଳ ଓ ଗତି': 'ବଳ ଓ ଗତି',
      'ବାଲ ଓ ଗତି': 'ବଳ ଓ ଗତି',
      'ବାଲରାମ': 'ବଳରାମ',
      'ବାଲଦେବ': 'ବଳଦେବ',
      'ବାଲଶ୍ରୀ': 'ବଳଶ୍ରୀ',
      'ମାତୃଭକ୍ତି କଥା': 'ମାଡ଼ହାଣ୍ଡି କଥା',
      'Matrubhakti Katha': 'Madahandi Katha',
      'ଗୁନ୍ଦୁଲୁ': 'ଗୁନ୍ଦୁଲୁ',
      'ଗୁଣ୍ଡୁଳୁ': 'ଗୁନ୍ଦୁଲୁ',
      'ଗୁଣ୍ଡୁଲି': 'ଗୁନ୍ଦୁଲୁ',
      'ଗୁଣ୍ଡୁଲ': 'ଗୁନ୍ଦୁଲ',
      'ଦାଣ୍ଡି ଜାତ୍ରା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
      'ଦାଣ୍ଡି ଜାରା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
      'ଦାଣ୍ଡି ଜାର୍ତ୍ତା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
      'ଦାଣ୍ଡି ଯାତ୍ର': 'ଦାଣ୍ଡି ଯାତ୍ରା',
      'ମହାତ୍ମା ଗାନ୍ଧି': 'ମହାତ୍ମା ଗାନ୍ଧୀ',
      'ଗାନ୍ଧିଜି': 'ଗାନ୍ଧୀଜୀ',
      'ଜାତ୍ରା': 'ଯାତ୍ରା',
    };

    let correctedText = text;
    for (const [incorrect, correct] of Object.entries(correctionMap)) {
      correctedText = correctedText.replaceAll(incorrect, correct);
    }

    correctedText = correctedText
      .replace(/\\div/g, '÷')
      .replace(/\\times/g, '×')
      .replace(/\\pm/g, '±')
      .replace(/\\approx/g, '≈')
      .replace(/\\neq/g, '≠')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\infty/g, '∞')
      .replace(/\\cdot/g, '•')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\theta/g, 'θ')
      .replace(/\\pi/g, 'π')
      .replace(/\\sqrt/g, '√');

    correctedText = correctedText
      .replace(/\$\$/g, '')
      .replace(/\$/g, '')
      .replace(/\\\[/g, '')
      .replace(/\\\]/g, '')
      .replace(/\\\(/g, '')
      .replace(/\\\)/g, '');

    correctedText = correctedText
      .replace(/\\text\s*{(.*?)}/g, '$1')
      .replace(/\\frac\s*{(.*?)}\s*{(.*?)}/g, '$1/$2')
      .replace(/\\mathrm\s*{(.*?)}/g, '$1')
      .replace(/\\mathit\s*{(.*?)}/g, '$1')
      .replace(/\\(?:,|:|;|!)/g, ' ');

    return correctedText;
  }

  // Helper to prepend standard WAV header to raw PCM audio/l16 buffer
  function pcmToWav(pcmBuffer: any, sampleRate: number = 24000): any {
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;
    const subChunk2Size = pcmBuffer.length;
    const chunkSize = 36 + subChunk2Size;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20); // PCM Format
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(subChunk2Size, 40);

    return Buffer.concat([header, pcmBuffer]);
  }
  // Gemini TTS proxy (keeps GEMINI_API_KEY on server only)
  app.post('/api/tts/gemini', async (req, res) => {
    try {
      const { text, language } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'text is required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing' });
      }

      // Determine target models & voice candidates dynamically based on language to avoid quota waste:
      // - For English: gemini-2.5-flash-preview-tts is preferred (has high free tier quota), with gemini-3.1-flash-tts-preview as fallback.
      // - For Odia: Only gemini-3.1-flash-tts-preview works. (2.5 flash blocks Odia text returning OTHER finishReason).
      const isOdia = language === 'or-IN';
      const models = isOdia 
        ? ['gemini-3.1-flash-tts-preview'] 
        : ['gemini-2.5-flash-preview-tts', 'gemini-3.1-flash-tts-preview'];

      // Select the best voice. We only try one preferred voice first, and optionally one fallback.
      // This prevents hitting the 3 RPM limit from redundant voice loops on the free tier.
      const preferredVoice = isOdia 
        ? (process.env.GEMINI_TTS_VOICE_ODIA || 'Kore') 
        : (process.env.GEMINI_TTS_VOICE_EN || 'Aoede');

      const fallbackVoice = isOdia ? 'Puck' : 'Charon';
      const voiceCandidates = [preferredVoice, fallbackVoice];

      const ttsPrompt = isOdia
        ? `ତୁମେ ଗୁନ୍ଦୁଲୁ (Gundulu), ଜଣେ ବହୁତ ସ୍ନେହୀ ଏବଂ ମଧୁର ବଡ଼ ଭଉଣୀ | ଛୋଟ ପିଲାଙ୍କୁ ପଢ଼ାଇଲା ଭଳି ଅତି ନରମ, ସ୍ନେହପୂର୍ଣ୍ଣ ଏବଂ ସୁନ୍ଦର ଭଉଣୀ ସ୍ୱରରେ ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ କୁହ। ପ୍ରତ୍ୟେକ ଓଡ଼ିଆ ଶବ୍ଦର ଉଚ୍ଚାରଣ ଅତ୍ୟନ୍ତ ମଧୁର, ସ୍ପଷ୍ଟ ଏବଂ ସ୍ୱାଭାବିକ ହେବା ଉଚିତ।\n\n${text}`
        : `You are Gundulu, a warm, sweet, and cute elder sister tutoring a young student. Speak this text in an extremely clear, slow-paced, warm, and friendly sister voice with high-pitch enthusiasm:\n\n${text}`;

      let lastError = 'Unknown TTS failure';
      
      for (const keyToUse of rotatorKeys) {
        let keyFailed = false;
        for (const model of models) {
          for (const voiceName of voiceCandidates) {
            try {
              console.log(`TTS proxy: Querying ${model} with voice ${voiceName} using key ${keyToUse.substring(0, 12)}...`);
              const ttsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: ttsPrompt }] }],
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                      }
                    }
                  }
                }),
              });

              if (!ttsResponse.ok) {
                const errText = await ttsResponse.text();
                lastError = errText;
                console.warn(`Gemini TTS failed for model ${model}, voice ${voiceName} using key ${keyToUse.substring(0, 12)}: ${errText}`);
                
                if (ttsResponse.status === 429 || ttsResponse.status === 403 || ttsResponse.status === 401) {
                  keyFailed = true;
                  break; // Try next key
                }
                continue;
              }

              const data = await ttsResponse.json();
              const candidate = data?.candidates?.[0];
              const finishReason = candidate?.finishReason;
              
              if (finishReason === 'OTHER' || !candidate?.content?.parts) {
                lastError = `Generation blocked or finished unexpectedly. Finish reason: ${finishReason}`;
                console.warn(`Gemini TTS generation ended unexpectedly for model ${model}, voice ${voiceName}: ${lastError}`);
                continue;
              }

              const inlineData = candidate.content.parts.find((p: any) => p?.inlineData)?.inlineData;
              if (!inlineData?.data) {
                lastError = `No audio payload for model ${model}, voice ${voiceName}`;
                continue;
              }

              const mimeType = inlineData.mimeType || 'audio/wav';
              let audioBuffer = Buffer.from(inlineData.data, 'base64');
              let finalMimeType = 'audio/wav';

              // Convert raw 16-bit linear PCM (audio/l16) to fully compatible audio/wav
              if (mimeType.toLowerCase().includes('l16') || mimeType.toLowerCase().includes('pcm')) {
                audioBuffer = pcmToWav(audioBuffer, 24000);
              } else {
                finalMimeType = mimeType;
              }

              res.setHeader('Content-Type', finalMimeType);
              res.setHeader('Cache-Control', 'no-store');
              return res.send(audioBuffer);
            } catch (error: any) {
               lastError = error?.message || 'Network error fetching TTS';
               console.warn(`Fetch error for model ${model}, voice ${voiceName}: ${lastError}`);
            }
          }
          if (keyFailed) break; // Break out of model loop to try the next key
        }
      }

      return res.status(502).json({ error: `Gemini TTS failed for all configured models, voices, and rotator keys: ${lastError}` });
    } catch (error: any) {
      console.error('Gemini TTS Error:', error);
      res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  });

  // Dedicated Anganwadi (Sishu Vatika) TTS endpoint to prevent any modifications to the class 1-10 endpoint
  app.post('/api/tts/anganwadi', async (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'text is required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing' });
      }

      // Sishu Vatika is always Odia and uses gemini-3.1-flash-tts-preview
      const models = ['gemini-3.1-flash-tts-preview'];
      const preferredVoice = process.env.GEMINI_TTS_VOICE_ODIA || 'Kore';
      const fallbackVoice = 'Puck';
      const voiceCandidates = [preferredVoice, fallbackVoice];

      // Custom prompt instructing the model to speak like a 1-2 year old baby girl child in Odia
      const ttsPrompt = `ତୁମେ ଗୁନ୍ଦୁଲୁ (Gundulu), ଜଣେ ଅତି କୁନି ୧ ରୁ ୨ ବର୍ଷର ଶିଶୁ କନ୍ୟା (1-2 year old baby girl child) | ଖେଳିଲା ଭଳି ଅତି ମଧୁର, ସରଳ, ଅଳ୍ପ ଅଳ୍ପ ଓ ଧୀରେ କଥା କହିଲା ଭଳି କୁନି ଶିଶୁ ସ୍ୱରରେ ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ କୁହ। ପ୍ରତ୍ୟେକ ଓଡ଼ିଆ ଶବ୍ଦର ଉଚ୍ଚାରଣ ଅତ୍ୟନ୍ତ କୁନି ଝିଅର ସ୍ୱାଭାବିକ କଣ୍ଠରେ ହେବା ଉଚିତ।\n\n${text}`;

      let lastError = 'Unknown TTS failure';
      
      for (const keyToUse of rotatorKeys) {
        let keyFailed = false;
        for (const model of models) {
          for (const voiceName of voiceCandidates) {
            try {
              console.log(`TTS Anganwadi proxy: Querying ${model} with voice ${voiceName} using key ${keyToUse.substring(0, 12)}...`);
              const ttsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyToUse}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: [{ text: ttsPrompt }] }],
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                      }
                    }
                  }
                }),
              });

              if (!ttsResponse.ok) {
                const errText = await ttsResponse.text();
                lastError = errText;
                console.warn(`Gemini Anganwadi TTS failed for model ${model}, voice ${voiceName} using key ${keyToUse.substring(0, 12)}: ${errText}`);
                if (ttsResponse.status === 429 || ttsResponse.status === 403 || ttsResponse.status === 401) {
                  keyFailed = true;
                  break; // Try next key
                }
                continue;
              }

              const data = await ttsResponse.json();
              const candidate = data?.candidates?.[0];
              const finishReason = candidate?.finishReason;
              
              if (finishReason === 'OTHER' || !candidate?.content?.parts) {
                lastError = `Generation blocked or finished unexpectedly. Finish reason: ${finishReason}`;
                console.warn(`Gemini Anganwadi TTS generation ended unexpectedly for model ${model}, voice ${voiceName}: ${lastError}`);
                continue;
              }

              const inlineData = candidate.content.parts.find((p: any) => p?.inlineData)?.inlineData;
              if (!inlineData?.data) {
                lastError = `No audio payload for model ${model}, voice ${voiceName}`;
                continue;
              }

              const mimeType = inlineData.mimeType || 'audio/wav';
              let audioBuffer = Buffer.from(inlineData.data, 'base64');
              let finalMimeType = 'audio/wav';

              if (mimeType.toLowerCase().includes('l16') || mimeType.toLowerCase().includes('pcm')) {
                audioBuffer = pcmToWav(audioBuffer, 24000);
              } else {
                finalMimeType = mimeType;
              }

              res.setHeader('Content-Type', finalMimeType);
              res.setHeader('Cache-Control', 'no-store');
              return res.send(audioBuffer);
            } catch (error: any) {
               lastError = error?.message || 'Network error fetching TTS';
               console.warn(`Fetch error for model ${model}, voice ${voiceName}: ${lastError}`);
            }
          }
          if (keyFailed) break; // Break out of model loop to try next key
        }
      }

      return res.status(502).json({ error: `Gemini Anganwadi TTS failed for all configured models, voices, and rotator keys: ${lastError}` });
    } catch (error: any) {
      console.error('TTS Anganwadi error:', error);
      res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  });

  // Textbook indexing endpoint
  app.post('/api/ai/index-textbook', async (req, res) => {
    try {
      const { class: userClass, subject, text, reference } = req.body;
      if (!userClass || !subject || !text) {
        return res.status(400).json({ error: 'class, subject, and text are required fields' });
      }

      const adminApp = getInitializedAdminApp();
      if (!adminApp) return res.status(500).json({ error: 'Firebase Admin initialization failed' });

      const db = getAdminFirestore(adminApp, firestoreDatabaseId);
      const chunksColl = db.collection('textbook_chunks');
      const { FieldValue } = await import('firebase-admin/firestore');

      // 1. Chunk text dynamically by paragraphs / stanzas (~800 characters)
      const rawChunks = text
        .split(/\n\n+/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 10);

      const rotatorKeys = [];
      for (let i = 1; i <= 7; i++) {
        const k = process.env[`GEMINI_ROTATOR_KEY_${i}`];
        if (k) rotatorKeys.push(k);
      }
      if (process.env.GEMINI_API_KEY && !rotatorKeys.includes(process.env.GEMINI_API_KEY)) {
        rotatorKeys.push(process.env.GEMINI_API_KEY);
      }

      let indexedCount = 0;
      for (let idx = 0; idx < rawChunks.length; idx++) {
        const chunkText = rawChunks[idx];
        const keyToUse = rotatorKeys[idx % rotatorKeys.length] || process.env.GEMINI_API_KEY;
        if (!keyToUse) continue;

        const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${keyToUse}`;
        const embedRes = await fetch(embedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: chunkText }] },
            outputDimensionality: 768
          })
        });

        if (embedRes.ok) {
          const embedData = await embedRes.json();
          const queryVector = embedData.embedding?.values;
          if (queryVector && queryVector.length === 768) {
            let storedClass = String(userClass).toLowerCase().trim();
            if (storedClass.startsWith('class')) {
              storedClass = storedClass.replace('class', '').trim();
            }
            const docRef = chunksColl.doc();
            await docRef.set({
              class: storedClass,
              subject: String(subject).toLowerCase().trim(),
              text: chunkText,
              embedding: FieldValue.vector(queryVector),
              reference: reference ? `${reference} (Part ${idx + 1})` : `Page ${idx + 1}`,
              createdAt: FieldValue.serverTimestamp()
            });
            indexedCount++;
          }
        }
      }

      res.json({ success: true, chunksIndexed: indexedCount });
    } catch (error: any) {
      console.error('Textbook Indexing Error:', error);
      res.status(500).json({ error: error?.message || 'Indexing failed' });
    }
  });

  // Textbook semantic search endpoint using Firestore Vector Search (KNN)
  app.post('/api/ai/search-textbook', async (req, res) => {
    try {
      const { queryText, limit: reqLimit, class: userClass, subject } = req.body;
      if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
        return res.status(400).json({ error: 'Query text is required' });
      }

      console.log(`[Semantic Search] Request received: "${queryText}" for class: ${userClass}, subject: ${subject}`);

      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin initialization failed' });
      }

      const db = getAdminFirestore(adminApp, firestoreDatabaseId);
      const chunksColl = db.collection('textbook_chunks');
      const { FieldValue } = await import('firebase-admin/firestore');

      // 1. Resolve keys for embedding generation
      const rotatorKeys = [];
      for (let i = 1; i <= 7; i++) {
        const k = process.env[`GEMINI_ROTATOR_KEY_${i}`];
        if (k) rotatorKeys.push(k);
      }
      if (process.env.GEMINI_API_KEY && !rotatorKeys.includes(process.env.GEMINI_API_KEY)) {
        rotatorKeys.push(process.env.GEMINI_API_KEY);
      }

      const keyToUse = rotatorKeys[0] || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        return res.status(503).json({ error: 'GEMINI_API_KEY or rotator keys are missing on the server' });
      }

      // 2. Generate embedding vector for the search query
      const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${keyToUse}`;
      const embedRes = await fetch(embedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: queryText.trim() }] },
          outputDimensionality: 768
        })
      });

      if (!embedRes.ok) {
        const errText = await embedRes.text();
        console.error('[Semantic Search] Gemini embedding API error:', embedRes.status, errText);
        return res.status(502).json({ error: 'Gemini embedding service returned an error', details: errText });
      }

      const embedData = await embedRes.json();
      const queryVector = embedData.embedding?.values;
      if (!queryVector || queryVector.length !== 768) {
        console.error('[Semantic Search] Invalid embedding response format:', embedData);
        return res.status(502).json({ error: 'Invalid response format from embedding service' });
      }

      // 3. Query Firestore using findNearest
      let searchClass = userClass ? String(userClass).toLowerCase().trim() : null;
      if (searchClass && searchClass.startsWith('class')) {
        searchClass = searchClass.replace('class', '').trim();
      }

      let queryRef: any = chunksColl;
      if (searchClass) {
        queryRef = queryRef.where('class', '==', searchClass);
      }
      if (subject) {
        let dbSubject = String(subject).toLowerCase().trim();
        // Map specific frontend subject keys to the database textbook chunk subject names
        if (dbSubject === 'jigyasa' || dbSubject === 'physical_science' || dbSubject === 'life_science' || dbSubject === 'ama_chaturbaswara_pruthibi') {
          dbSubject = 'science';
        } else if (dbSubject === 'sahitya_sudha' || dbSubject === 'sahitya_suman' || dbSubject === 'sahitya_surabhi' || dbSubject.startsWith('bhasa_mahak') || dbSubject.startsWith('jhulana') || dbSubject === 'shishu_vatika') {
          dbSubject = 'odia';
        } else if (dbSubject === 'ganita_khela' || dbSubject === 'maja_majare_ganita' || dbSubject === 'ganita_mela' || dbSubject === 'ganita_prakas') {
          dbSubject = 'math';
        }
        queryRef = queryRef.where('subject', '==', dbSubject);
      }

      const searchLimit = reqLimit ? Math.min(parseInt(reqLimit, 10), 10) : 5;
      console.log(`[Semantic Search] Executing findNearest on database: ${firestoreDatabaseId} with limit ${searchLimit}`);

      const vectorQuery = queryRef.findNearest({
        vectorField: 'embedding',
        queryVector: FieldValue.vector(queryVector),
        distanceMeasure: 'COSINE',
        limit: searchLimit,
      });

      const snapshot = await vectorQuery.get();
      const results = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        // Remove embedding field to keep network payload minimal
        const { embedding, ...rest } = data;
        return {
          id: doc.id,
          ...rest
        };
      });

      console.log(`[Semantic Search] Successfully retrieved ${results.length} matches`);
      return res.json({ success: true, results });

    } catch (err: any) {
      console.error('[Semantic Search] Critical error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Login with PIN endpoint
  app.post('/api/auth/login-with-pin', async (req, res) => {
    try {
      const { userId, pin } = req.body;
      console.log(`[PIN Auth] Login request received for userId: ${userId}`);
      if (!userId || !pin) {
        return res.status(400).json({ error: 'userId and pin are required' });
      }

      const adminApp = getInitializedAdminApp();
      if (!adminApp) {
        console.error('[PIN Auth] Firebase Admin app not initialized');
        return res.status(503).json({ error: 'Firebase Admin initialization failed' });
      }

      console.log(`[PIN Auth] Accessing database: ${firestoreDatabaseId}`);
      const db = getAdminFirestore(adminApp, firestoreDatabaseId);
      
      // Safety timeout promise
      const dbTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Firestore query timed out after 15s. Please check server connection to database '${firestoreDatabaseId}'.`)), 15000)
      );

      // Fetch the user's document from Firestore to verify their PIN
      console.log(`[PIN Auth] Fetching user doc from Firestore for UID: ${userId}...`);
      const userDoc = await Promise.race([
        db.collection('users').doc(userId).get(),
        dbTimeout
      ]);

      if (!userDoc.exists) {
        console.warn(`[PIN Auth] User profile not found for UID: ${userId}`);
        return res.status(404).json({ error: 'User profile not found' });
      }

      const userData = userDoc.data();
      const storedPin = userData?.pin;
      console.log(`[PIN Auth] User found: ${userData?.name}. Comparing PINs...`);

      if (!storedPin) {
        console.warn(`[PIN Auth] No PIN is set in DB for user ${userData?.name}`);
        return res.status(400).json({ error: 'No PIN is set for this account. Please log in with OTP first and set a PIN.' });
      }

      if (String(storedPin).trim() !== String(pin).trim()) {
        console.warn(`[PIN Auth] PIN mismatch for user ${userData?.name}`);
        return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });
      }

      // PIN is correct, generate a custom token
      console.log('[PIN Auth] PIN verified. Loading auth service...');
      const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
      const authAdmin = getAdminAuth(adminApp);
      
      // Generate a custom auth token that client can sign in with
      console.log('[PIN Auth] Generating custom auth token...');
      const tokenTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase custom token generation timed out after 15s.')), 15000)
      );
      const customToken = await Promise.race([
        authAdmin.createCustomToken(userId),
        tokenTimeout
      ]);

      console.log('[PIN Auth] Custom token generated successfully. Sending response.');
      res.json({ success: true, customToken });
    } catch (error: any) {
      console.error('[PIN Auth] Endpoint Error:', error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
  });

  const adminApp = getInitializedAdminApp();
  registerDailyMcqAutomation(app, adminApp, firestoreDatabaseId);
  registerYoutubeSyncAutomation(app, adminApp, firestoreDatabaseId);

  // Schedule YouTube A/B Trial evaluations daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily A/B video trial evaluation...');
    try {
      if (adminApp) {
        const { evaluateTrialVideos } = await import('./src/server/youtubeSync.js');
        const results = await evaluateTrialVideos(adminApp, firestoreDatabaseId, false);
        console.log('[Cron] A/B Trial evaluation results:', results);
      }
    } catch (err) {
      console.error('[Cron] A/B Trial evaluation failed:', err);
    }
  });

  const sendDailyGreetings = async (force: boolean = false) => {
    console.log('[Cron] Sending daily morning greetings to student rooms...');
    try {
      if (adminApp) {
        const db = getAdminFirestore(adminApp, firestoreDatabaseId);
        const FieldValue = (await import('firebase-admin/firestore')).FieldValue;

        // Deduplicate cron tasks running on multiple scaled Cloud Run container instances
        if (!force) {
          const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          const greetingLogRef = db.collection('bot_greetings').doc(todayDate);
          const greetingLog = await greetingLogRef.get();
          
          if (greetingLog.exists) {
            console.log(`[Cron] Morning greetings for ${todayDate} already sent today. Skipping duplicate trigger.`);
            return;
          }
          
          // Mark as sent immediately to claim the task lock
          await greetingLogRef.set({
            sentAt: FieldValue.serverTimestamp(),
            status: 'sent'
          });
        }

        const classes = Array.from({ length: 10 }, (_, i) => `class${i + 1}`);

        const greetingText = `🌅 ଶୁଭ ସକାଳ, ସାଙ୍ଗମାନେ!

ପ୍ରତିଦିନ ସକାଳ ଆମ ପାଇଁ ଏକ ନୂଆ ସୁଯୋଗ ନେଇ ଆସିଥାଏ। ଜୀବନରେ ସଫଳ ହେବାକୁ ହେଲେ ପ୍ରତିଦିନ ଛୋଟ ଛୋଟ ସଫଳ ପ୍ରୟାସ କରିବାକୁ ପଡ଼ିବ। ଆଜିର ଦିନକୁ ସଫଳ କରିବା ପାଇଁ ଚାଲ ପ୍ରଥମ ପଦକ୍ଷେପ ନେବା!

🏆 ଆଜିର ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ (Daily MCQ): ତୁରନ୍ତ ଆଜିର MCQ ପ୍ରଶ୍ନ ଗୁଡ଼ିକୁ ସମ୍ପୂର୍ଣ୍ଣ କରି ଆପଣଙ୍କର ଷ୍ଟ୍ରିକ୍ (Streak) ବଜାୟ ରଖ ଏବଂ ନିଜର ଜ୍ଞାନକୁ ପରୀକ୍ଷା କର। ମନେରଖ, ପ୍ରତିଦିନ କୁଇଜ୍ ଅଭ୍ୟାସ କଲେ ହିଁ ମସ୍ତିଷ୍କ ଅଧିକ ସକ୍ରିୟ ଓ ଶାଣିତ ହୋଇଥାଏ।
🤖 ସନ୍ଦେହ ସମାଧାନ (Ask Doubts) ପାଇଁ Gundulu Homework Helper ବ୍ୟବହାର କରନ୍ତୁ।
"ନିରନ୍ତର ଚେଷ୍ଟା ହିଁ ସଫଳତାର ଚାବିକାଠି।" ଚାଲ ଆଜିର MCQ ଚ୍ୟାଲେଞ୍ଜ ଜିତି ଦେଖାଇବା! 💪🚀`;

        for (const cls of classes) {
          await db.collection('community').add({
            text: greetingText,
            userId: 'gundulu_bot',
            userName: 'Gundulu AI 🤖',
            userAvatar: '/gundulu-v3.png',
            class: cls,
            role: 'admin',
            timestamp: FieldValue.serverTimestamp()
          });
        }
        console.log('[Cron] Daily morning greetings successfully posted to all student rooms.');
      } else {
        console.warn('[Cron] Cannot send greetings because Firebase Admin is not initialized.');
      }
    } catch (err) {
      console.error('[Cron] Failed to send daily morning greetings:', err);
    }
  };

  // Expose endpoint for manual daily greeting triggers
  app.post('/api/admin/send-daily-greetings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized Request' });
      }

      await sendDailyGreetings(true);
      return res.json({ success: true, message: 'Daily greetings sent to all student rooms' });
    } catch (err: any) {
      console.error('Failed to trigger daily greetings:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Schedule daily morning greeting at 7:00 AM IST
  cron.schedule('0 7 * * *', async () => {
    await sendDailyGreetings();
  }, {
    timezone: "Asia/Kolkata"
  });

  // Mount the modular subdomain quiz router
  app.use(quizRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' || !fs.existsSync(indexPath)) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        const isHtml = path.endsWith('.html');
        const isServiceWorker = path.endsWith('sw.js') || path.includes('workbox-');
        const isManifest = path.endsWith('.webmanifest') || path.endsWith('manifest.json');

        if (isHtml || isServiceWorker || isManifest) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // Other assets (like hashed JS/CSS/images) can be cached for a long time
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
  
  return app;
}

// Start the server
startServer();
