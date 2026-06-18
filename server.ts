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
import fs from 'fs';
import crypto from 'node:crypto';
import webpush from 'web-push';
import { registerDailyMcqAutomation } from './src/server/dailyMcqAutomation.js';
import { registerYoutubeSyncAutomation } from './src/server/youtubeSync.js';
import { getServiceAccountCredentials } from './src/server/googleCredentials.js';
import { google } from 'googleapis';
import cron from 'node-cron';


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

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Basic request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });



  // API Routes
  app.post('/api/upload-textbook', upload.single('file'), async (req: any, res) => {
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
  app.get('/api/image-proxy', async (req, res) => {
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
  app.post('/api/notifications/send-test', async (req, res) => {
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
  app.post('/api/notifications/broadcast', async (req, res) => {
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
      
      // Query users who have registered a pushSubscription
      const usersSnapshot = await firestore.collection('users')
        .where('pushSubscription', '!=', null)
        .get();

      if (usersSnapshot.empty) {
        return res.json({ success: true, count: 0, message: 'No devices subscribed yet.' });
      }

      const payload = JSON.stringify({
        title: 'Utkal Skill Centre 🔔',
        body: message,
        url: '/'
      });

      let sentCount = 0;
      const sendPromises = [];

      for (const docSnapshot of usersSnapshot.docs) {
        const userData = docSnapshot.data();
        const subscription = userData.pushSubscription;

        // Apply audience filtering if needed
        if (audience === 'premium' && !userData.isPremium) continue;
        if (audience === 'free' && userData.isPremium) continue;

        if (subscription && subscription.endpoint) {
          sendPromises.push(
            webpush.sendNotification(subscription, payload)
              .then(() => { sentCount++; })
              .catch((err: any) => {
                console.error(`[Web Push] Failed to send to user ${docSnapshot.id}:`, err.message);
                // If subscription has expired or is invalid, automatically clear it from Firestore DB
                if (err.statusCode === 410 || err.statusCode === 404) {
                  firestore.collection('users').doc(docSnapshot.id).update({
                    pushSubscription: null
                  }).catch(() => {});
                }
              })
          );
        }
      }

      // Wait for all dispatches to finish
      await Promise.allSettled(sendPromises);

      console.log(`[Web Push] Global broadcast dispatched to ${sentCount} devices.`);
      res.json({ success: true, count: sentCount });
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
    const keys: string[] = [];
    const primaryKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (primaryKey) keys.push(primaryKey);
    return keys;
  }


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

      const prompt = `You are an expert curriculum builder. Create a matching pair educational game for school children of Standard/Class "${className}" in the subject "${subjectName}" in "${language === 'or' ? 'Odia (using Odia script for student content, keep mathematical numbers or scientific variables clean)' : 'English'}".
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

  app.post('/api/ai/generate-revision-poster', async (req, res) => {
    try {
      const { className, subjectName, chapterName, language } = req.body;
      if (!className || !subjectName || !chapterName) {
        return res.status(400).json({ error: 'className, subjectName and chapterName are required' });
      }

      const rotatorKeys = getRotatorKeys();
      if (rotatorKeys.length === 0) {
        return res.status(503).json({ error: 'GEMINI_API_KEY and all rotator keys are missing on the server' });
      }

      const prompt = `You are an expert curriculum builder for Indian schools.
      Create a set of 10 revision questions and answers for Class "${className}" in the subject "${subjectName}" for the Chapter: "${chapterName}".
      The output should be generated in ${language === 'or' ? 'Odia (using clean Odia script)' : 'English'}.
      
      For each of the 10 questions, generate:
      1. A short, highly relevant revision question. In the question text, identify the 1 or 2 most important keywords (such as the main topic, scientific term, or specific subject noun) and wrap them in single asterisks (e.g. "Which is the *famous lake* in Bhubaneswar?" or "*ସରଳ ସହସମୀକରଣ* କହିଲେ କଣ ବୁଝାଏ?"). Do not put asterisks on the question mark or outer punctuation.
      2. A concise and correct answer.
      3. A side note label (MUST be one of: "Important!", "Key Fact", "Remember!", "Note", "Did You Know!", "Formula!").
      4. A brief 1-sentence supporting note details.
      5. An icon type (MUST be one of: "temple", "flower", "mountain", "dance", "leader", "river", "sand", "school", "book", "deer", "mirror", "lens", "prism", "magnet", "concave_mirror", "axes", "triangle", "circle", "matrix", "integral", "beaker", "atom", "dna", "bulb", "globe", "quill", "slate", "puzzle", "palette", "sprout", "scroll"). Choose the icon that best represents the question topic:
      - Math/Algebra/Geometry: Prefer "axes", "triangle", "circle", "matrix", or "integral".
      - Science/Physics/Chemistry/Biology: Prefer "beaker", "atom", "dna", "bulb", "mirror", "lens", "prism", "magnet", or "sprout".
      - Languages & Literature (Odia, English, Hindi, Sanskrit): Prefer "slate", "scroll", "quill", "book", or "school".
      - Cognitive Reasoning / Comprehension (Bodha Kruti): Prefer "puzzle" or "bulb".
      - Arts, Culture, Crafts & Vocational (Koshala / Skills): Prefer "palette", "sprout", "dance", "temple", "flower", "mountain", "river", "sand", "deer", or "globe".
      6. A detailed English visual prompt (imagePrompt) describing a clean textbook-style diagram, graph, sketch, or illustration explaining or illustrating the mathematical/scientific concept of this specific question.
         - CRITICAL: Even if the question and answer are in Odia, the imagePrompt MUST be in English.
         - The prompt must specify visual elements only, be textless, and have a white background (e.g., "A clean vector diagram of a right-angled triangle showing sides a, b, c with a square angle indicator, white background, textless, no labels").
         - Do not include any words, text, letters, or writings in the prompt or in the generated image.

      Provide the output in JSON format with the following structure:
      {
        "questions": [
          {
            "id": 1,
            "question": "Question 1 text...",
            "answer": "Answer 1 text...",
            "sideNoteLabel": "Key Fact",
            "sideNote": "Supporting note text...",
            "iconType": "book",
            "imagePrompt": "Detailed English visual prompt for the question diagram..."
          }
        ]
      }
      Fill in all 10 questions. Do not wrap the response in any markdown formatting or code blocks. Return ONLY the raw JSON object.`;

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
      'ଗୁଣ୍ଡୁଲୁ': 'ଗୁନ୍ଦୁଲୁ',
      'ଗୁଣ୍ଡୁଳୁ': 'ଗୁନ୍ଦୁଲୁ',
      'ଗୁଣ୍ଡୁଲି': 'ଗୁନ୍ଦୁଲୁ',
      'ଗୁଣ୍ଡୁଲ': 'ଗୁନ୍ଦୁଲ',
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
  }  // Gemini TTS proxy (keeps GEMINI_API_KEY on server only)
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
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // Other assets can be cached for a long time since they have hashes in their names
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
