import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { App, getApp, getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import fs from 'fs';
import crypto from 'crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Razorpay = require('razorpay');
import { getServiceAccountCredentials } from '../src/server/googleCredentials.js';

console.log('API (Vercel) Initialization start...');
// Lazy import automation to speed up boot
let automationRegistered = false;

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
        options.credential = cert(serviceAccount as any);
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

let razorpay: any = null;
let razorpayInitTried = false;
function getRazorpay() {
  if (razorpay) return razorpay;
  if (razorpayInitTried) return null;

  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (keyId && keySecret) {
    try {
      console.log('Initializing Razorpay with Key ID:', keyId.substring(0, 8) + '...');
      razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      console.log('Razorpay initialized successfully.');
    } catch (err) {
      console.error('Razorpay init error:', err);
    }
  } else {
    console.warn('Razorpay credentials missing during lazy init. KeyID:', !!keyId, 'KeySecret:', !!keySecret);
  }
  
  razorpayInitTried = true;
  return razorpay;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to register automation lazily only if needed (or once on first request)
app.use(async (req, res, next) => {
  if (!automationRegistered && (req.path.startsWith('/api/admin') || req.path.includes('run-auto'))) {
    try {
      console.log('Lazily registering MCQ automation...');
      const { registerDailyMcqAutomation } = await import('../src/server/dailyMcqAutomation.js');
      registerDailyMcqAutomation(app, null, firestoreDatabaseId);
      automationRegistered = true;
      console.log('MCQ automation registered successfully.');
    } catch (err) {
      console.error('Failed to lazily register MCQ automation:', err);
    }
  }
  next();
});

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
  res.json({ 
    status: "ok", 
    razorpay: !!rzp,
    firebaseAdmin: !!getInitializedAdminApp(),
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    if (!req.body) {
      console.error('Payment Request Error: Request body is missing');
      return res.status(400).json({ error: 'Request body is missing' });
    }
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
      console.error('Razorpay initialization failed. Check environment variables.');
      return res.status(503).json({ 
        error: 'Payment service unavailable',
        details: 'The server could not initialize Razorpay. Please ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in the Vercel dashboard.'
      });
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, userClass, planType } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!secret) return res.status(500).json({ success: false, message: 'Secret missing' });

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    
    if (hmac.digest('hex') === razorpay_signature) {
      const adminApp = getInitializedAdminApp();
      if (adminApp) {
        const db = getAdminFirestore(adminApp, firestoreDatabaseId);
        
        // 1. Record the transaction
        await db.collection('transactions').add({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: (amount || 0) / 100,
          userId,
          class: userClass,
          timestamp: new Date()
        });

        // 2. Activate the subscription securely on the backend
        const expiryDate = new Date();
        if (planType === 'yearly') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }

        await db.collection('subscriptions').doc(userId).set({
          active: true,
          plan: 'premium',
          type: planType || 'monthly',
          expires_at: expiryDate,
          updatedAt: new Date()
        }, { merge: true });
        
        // 3. Also mark the payment order as success
        await db.collection('payments').doc(razorpay_order_id).set({
          status: 'success',
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          updatedAt: new Date()
        }, { merge: true });
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
    const { text, language } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const model = 'gemini-3.1-flash-tts-preview';
    const odiaVoiceList = (process.env.GEMINI_TTS_VOICE_ODIA_LIST || 'Puck,Kore,Charon')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    const voiceCandidates = language === 'or-IN'
      ? [process.env.GEMINI_TTS_VOICE_ODIA, ...odiaVoiceList].filter(Boolean) as string[]
      : [(process.env.GEMINI_TTS_VOICE_EN || 'Aoede')];

    const ttsPrompt = language === 'or-IN'
      ? `ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ ଅତ୍ୟନ୍ତ ସ୍ପଷ୍ଟ ଭାବରେ, ଗୋଟି ଗୋଟି କରି ଧୀର ଏବଂ ମଧୁର ସ୍ୱରରେ ଛୋଟ ପିଲାଙ୍କୁ ବୁଝାଇବା ଶୈଳୀରେ କହନ୍ତୁ। ପ୍ରତ୍ୟେକ ଓଡ଼ିଆ ଶବ୍ଦର ଉଚ୍ଚାରଣ ସ୍ପଷ୍ଟ ଏବଂ ସ୍ୱାଭାବିକ ହେବା ଉଚିତ। କୌଣସି ବିଦେଶୀ ଉଚ୍ଚାରଣ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।\n\n${text}`
      : `Speak this text in a warm, extremely clear, slow-paced, and friendly tutoring style for children in India. Articulate each word slowly and clearly:\n\n${text}`;

    let lastError = 'Unknown TTS failure';
    for (const voiceName of voiceCandidates) {
      try {
        const ttsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
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
          lastError = await ttsResponse.text();
          console.warn(`Gemini TTS failed for voice ${voiceName}: ${lastError}`);
          continue;
        }

        const data = await ttsResponse.json();
        const inlineData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.inlineData)?.inlineData;
        if (!inlineData?.data) {
          lastError = `No audio payload for voice ${voiceName}`;
          continue;
        }

        const mimeType = inlineData.mimeType || 'audio/wav';
        const audioBuffer = Buffer.from(inlineData.data, 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'no-store');
        return res.send(audioBuffer);
      } catch (innerErr: any) {
        lastError = innerErr.message || 'Fetch connection failed';
        console.error(`Gemini TTS connection error for voice ${voiceName}:`, innerErr);
      }
    }

    return res.status(502).json({ error: `Gemini TTS failed for all configured voices: ${lastError}` });
  } catch (error: any) {
    console.error('Gemini TTS Error:', error);
    return res.status(500).json({ error: error?.message || 'TTS generation failed', stack: error?.stack });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Catch-all for API
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.url} not found` });
});

export default app;

