import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import multer from 'multer';
import { App, getApp, getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import fs from 'fs';
import crypto from 'node:crypto';
import { getServiceAccountCredentials } from '../src/server/googleCredentials';

console.log('API (Vercel) Initialization start...');

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIREBASE_DATABASE_ID ||
  'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';

let adminAppInitialized = false;
function getInitializedAdminApp(): App | null {
  if (getApps().length > 0) return getApp();
  
  if (adminAppInitialized) return null; // Already tried and failed or no config

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.projectId = config.projectId || config.project_id;
    } else {
      config = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET
      };
    }

    if (config.projectId) {
      const serviceAccount = getServiceAccountCredentials();
      const options: any = {
        projectId: config.projectId,
        storageBucket: config.storageBucket
      };

      if (serviceAccount) {
        options.credential = cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        });
      } else {
        try {
          options.credential = applicationDefault();
        } catch (e) {
          console.warn("Firebase Admin: Application Default credentials failed.");
        }
      }

      if (options.credential) {
        const app = initializeApp(options);
        adminAppInitialized = true;
        console.log('Firebase Admin initialized lazily.');
        return app;
      }
    }
  } catch (err) {
    console.error("Lazy Firebase Admin initialization error:", err);
  }
  
  adminAppInitialized = true; // Mark as tried
  return null;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } 
});

let razorpay: Razorpay | null = null;
let razorpayInitTried = false;
function getRazorpay() {
  if (razorpay) return razorpay;
  if (razorpayInitTried) return null;

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (keyId && keySecret) {
    try {
      razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      console.log('Razorpay initialized lazily.');
    } catch (err) {
      console.error('Razorpay init error:', err);
    }
  } else {
    console.warn('Razorpay credentials missing during lazy init.');
  }
  
  razorpayInitTried = true;
  return razorpay;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic MCQ Automation registration
let mcqRegistered = false;
async function ensureMcqAutomation() {
  if (mcqRegistered) return;
  try {
    const adminApp = getInitializedAdminApp();
    if (adminApp) {
      // Use dynamic import to avoid boot-time dependency issues
      const { registerDailyMcqAutomation } = await import('../src/server/dailyMcqAutomation');
      registerDailyMcqAutomation(app, adminApp, firestoreDatabaseId);
      mcqRegistered = true;
      console.log('Daily MCQ automation registered lazily.');
    }
  } catch (err) {
    console.error('Lazy MCQ automation registration error:', err);
    mcqRegistered = true; // Don't keep trying if it fails hard
  }
}

// Routes
app.post('/api/upload-textbook', upload.single('file'), async (req: any, res) => {
  try {
    const adminApp = getInitializedAdminApp();
    if (!adminApp || !req.file) return res.status(400).json({ error: 'Initialization or file missing' });

    const bucket = getAdminStorage(adminApp).bucket();
    const fileName = `textbooks/${Date.now()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      public: true,
    });

    res.json({ url: `https://storage.googleapis.com/${bucket.name}/${fileName}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/health", async (req, res) => {
  const rzp = getRazorpay();
  await ensureMcqAutomation();
  res.json({ 
    status: "ok", 
    razorpay: !!rzp,
    firebaseAdmin: !!getInitializedAdminApp(),
    mcqRegistered,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { userClass, planType, userId, amount: reqAmount } = req.body;
    console.log('Payment Order Request:', { userClass, planType, userId, reqAmount });

    let parsedClass = 1;
    if (userClass) {
      const matches = userClass.toString().match(/\d+/);
      parsedClass = matches ? parseInt(matches[0]) : 1;
    }
    
    // Default amounts
    let amount = planType === 'monthly' ? 99 : 999;
    if (reqAmount && !isNaN(parseFloat(reqAmount))) {
      amount = parseFloat(reqAmount);
    }

    const rzp = getRazorpay();
    if (!rzp) {
      console.error('Razorpay credentials missing in environment.');
      return res.status(503).json({ error: 'Razorpay Credentials Missing' });
    }

    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${userId?.toString().substring(0, 5)}`
    };

    console.log('Creating Razorpay order with options:', options);
    const order = await rzp.orders.create(options);
    console.log('Razorpay order created successfully:', order.id);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack 
    });
  }
});

app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, userClass } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!secret) return res.status(500).json({ success: false, message: 'Secret missing' });

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    
    if (hmac.digest('hex') === razorpay_signature) {
      const adminApp = getInitializedAdminApp();
      if (adminApp) {
        await getAdminFirestore(adminApp, firestoreDatabaseId).collection('transactions').add({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: (amount || 0) / 100,
          userId,
          class: userClass,
          timestamp: new Date()
        });
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/tts/gemini', async (req, res) => {
  try {
    const { text, language } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'API Key missing' });

    const voice = language === 'or-IN' ? 'Puck' : 'Aoede';
    const ttsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-tts-preview-001:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { 
          responseModalities: ['AUDIO'], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } 
        }
      })
    });

    if (!ttsResponse.ok) throw new Error(`Gemini TTS failed with status ${ttsResponse.status}`);
    const data = await ttsResponse.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;
    if (!inlineData) throw new Error("TTS payload missing or restricted");
    res.setHeader('Content-Type', inlineData.mimeType || 'audio/wav');
    res.send(Buffer.from(inlineData.data, 'base64'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.url} not found` });
});

export default app;

