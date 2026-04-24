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
import { registerDailyMcqAutomation } from './src/server/dailyMcqAutomation';
import { getServiceAccountCredentials } from './src/server/googleCredentials';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIREBASE_DATABASE_ID ||
  'ai-studio-2a24dfcb-5874-4b37-8e37-434f425283b9';

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
      config.projectId = config.projectId || config.project_id;
    } else {
      console.warn("firebase-applet-config.json not found. Using environment variables.");
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
          // Only attempt default if we don't have service account to avoid crashes on Vercel
          options.credential = applicationDefault();
        } catch (e) {
          console.warn("Firebase Admin: No credentials found. Some features may be disabled.");
        }
      }

      if (options.credential) {
        initializeApp(options);
        console.log("Firebase Admin initialized successfully with project:", config.projectId);
      }
    }
  } catch (err) {
    console.error("Error initializing Firebase Admin:", err);
  }
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } 
});

let razorpay: Razorpay | null = null;
function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }
  return razorpay;
}

app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
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

app.get("/api/health", (req, res) => {
  const rzp = getRazorpay();
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY_ID;
  res.json({ 
    status: "ok", 
    message: "Server is healthy.",
    razorpay: !!rzp,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { userClass, planType, userId } = req.body;
    let parsedClass = 1;
    if (userClass) {
      const matches = userClass.toString().match(/\d+/);
      parsedClass = matches ? parseInt(matches[0]) : 1;
    }
    
    const amount = planType === 'monthly' ? 99 : 999;
    const rzp = getRazorpay();
    
    if (!rzp) return res.status(503).json({ error: 'Razorpay Credentials Missing' });

    const order = await rzp.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${userId?.toString().substring(0, 5)}`
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('Detailed Error:', error);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: error.message,
      stack: error.stack,
      details: 'Failed to create payment order on server.'
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
          amount: amount / 100,
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
    console.error('Verify Payment Detailed Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
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

    if (!ttsResponse.ok) throw new Error('Gemini TTS failed');

    const data = await ttsResponse.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;
    
    if (!inlineData) throw new Error("TTS payload missing");

    res.setHeader('Content-Type', inlineData.mimeType || 'audio/wav');
    res.send(Buffer.from(inlineData.data, 'base64'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const adminApp = getInitializedAdminApp();
if (adminApp) {
  registerDailyMcqAutomation(app, adminApp, firestoreDatabaseId);
}

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.url} not found` });
});

// Production Routing
const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

if (process.env.NODE_ENV === 'production' && fs.existsSync(indexPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(indexPath);
    }
  });
} else if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  // Vite Dev Setup
  (async () => {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite dev server failed to start:', err);
    }
  })();
}

// Export for Vercel
export default app;

// Listen if not on Vercel
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}
