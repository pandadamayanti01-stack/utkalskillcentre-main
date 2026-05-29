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
import { getServiceAccountCredentials } from './src/server/googleCredentials.js';
import { google } from 'googleapis';

const firestoreDatabaseId =
  process.env.FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIRESTORE_DATABASE_ID ||
  process.env.VITE_FIREBASE_DATABASE_ID ||
  'utkal-prod';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BHk1uroqx4HMHX1c3ldVPuO3AYWBGByuqlYBjWPW2YttFtiurT8cI731ckrp7K_Q491TtgpAkZL7ioLvVKtmtJo';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'YGxwRzEnUaPqPygwknmuurDPEQVAwrEobKosW18pGVA';

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
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET
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

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
  function getPrice(userClass: number, planType: 'monthly' | 'yearly'): number {
    if (userClass >= 1 && userClass <= 3) return planType === 'monthly' ? 99 : 499;
    if (userClass >= 4 && userClass <= 7) return planType === 'monthly' ? 199 : 999;
    if (userClass >= 8 && userClass <= 10) return planType === 'monthly' ? 299 : 1999;
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

  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { contents, systemInstruction, modelType, generationConfig } = req.body;
      
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
            const region = process.env.VERTEX_AI_REGION || 'us-central1';
            
            console.log(`Backend AI (Server): Calling Vertex AI model ${vertexModel} in region ${region} for project ${projectId}...`);
            const vertexUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${vertexModel}:generateContent`;
            
            const formattedSystemInstruction = systemInstruction 
              ? { parts: [{ text: systemInstruction }] } 
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
                ]
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
            const region = process.env.VERTEX_AI_REGION || 'us-central1';
            const vertexKeyUrl = isVertexKey
              ? `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${apiKeyModel}:generateContent?key=${vertexKey}`
              : `https://generativelanguage.googleapis.com/v1beta/models/${apiKeyModel}:generateContent?key=${vertexKey}`;

            const response = await fetch(vertexKeyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                generationConfig,
                safetySettings: [
                  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
                  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" }
                ]
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

      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: 'GEMINI_API_KEY is not configured on the server',
          details: 'Vertex AI was tried but failed, and Google AI Studio backup API key is missing.',
          vertexError: vertexErrorText || undefined
        });
      }

      const ai = new GoogleGenerativeAI(apiKey);

      const FLASH_MODELS = [
        "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.1-flash-lite",
        "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash-image"
      ];
      const PRO_MODELS = [
        "gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-2.5-pro", "gemini-pro-latest"
      ];
      
      let models = modelType === 'pro' ? [...PRO_MODELS, ...FLASH_MODELS] : [...FLASH_MODELS];

      let lastError = null;
      for (const modelName of models) {
        for (const apiVersion of ["v1beta", "v1"]) {
          try {
            console.log(`Backend AI: Attempting ${modelName} via ${apiVersion}...`);
            const model = ai.getGenerativeModel({
              model: modelName,
              systemInstruction,
              safetySettings: gunduluSafetySettings
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

            if (isAuthError) {
              console.error("Backend AI Auth Error:", err.message);
              return res.status(403).json({ error: "Gemini API Authentication Failed." });
            }

            if (isBadRequest) {
              console.error("Backend AI Bad Request:", err.message);
              return res.status(400).json({ error: err.message || "Invalid request parameters." });
            }

            if (is404) {
              continue; // Try next API version
            }
            console.error(`Model Attempt Failed: ${modelName} (${apiVersion})`, err.message);
          }
        }
      }
      
      throw lastError || new Error("All AI models failed");

    } catch(error: any) {
      console.error("Backend AI Generic Error:", error);
      res.status(500).json({ error: error.message || 'AI Generation failed' });
    }
  });

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

      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured' });
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
        ? (process.env.GEMINI_TTS_VOICE_ODIA || 'Puck') 
        : (process.env.GEMINI_TTS_VOICE_EN || 'Aoede');

      const fallbackVoice = isOdia ? 'Kore' : 'Charon';
      const voiceCandidates = [preferredVoice, fallbackVoice];

      const ttsPrompt = isOdia
        ? `ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ ଅତ୍ୟନ୍ତ ସ୍ପଷ୍ଟ ଭାବରେ, ଗୋଟି ଗୋଟି କରି ଧୀର ଏବଂ ମଧୁର ସ୍ୱରରେ ଛୋଟ ପିଲାଙ୍କୁ ବୁଝାଇବା ଶୈଳୀରେ କହନ୍ତୁ। ପ୍ରତ୍ୟେକ ଓଡ଼ିଆ ଶବ୍ଦର ଉଚ୍ଚାରଣ ସ୍ପଷ୍ଟ ଏବଂ ସ୍ୱାଭାବିକ ହେବା ଉଚିତ। କୌଣସି ବିଦେଶୀ ଉଚ୍ଚାରଣ ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।\n\n${text}`
        : `Speak this text in a warm, extremely clear, slow-paced, and friendly tutoring style for children in India. Articulate each word slowly and clearly:\n\n${text}`;

      let lastError = 'Unknown TTS failure';
      
      for (const model of models) {
        for (const voiceName of voiceCandidates) {
          try {
            console.log(`TTS proxy: Querying ${model} with voice ${voiceName}...`);
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
              const errText = await ttsResponse.text();
              lastError = errText;
              console.warn(`Gemini TTS failed for model ${model}, voice ${voiceName}: ${errText}`);
              
              // If we hit quota limits, don't keep looping to avoid lockouts
              if (ttsResponse.status === 429) {
                if (errText.includes('quota') || errText.includes('limit')) {
                  return res.status(429).json({
                    error: 'Gemini TTS free tier quota exceeded. Please enable billing on your Google AI Studio account to lift this limit.',
                    details: errText
                  });
                }
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
      }

      return res.status(502).json({ error: `Gemini TTS failed for all configured models and voices: ${lastError}` });
    } catch (error: any) {
      console.error('Gemini TTS Error:', error);
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
  
  // Only listen if not running as a serverless function (e.g., Vercel)
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
  
  return app;
}

// Start the server and export for Vercel
export const appPromise = startServer();
// Default export for Vercel's standard function signature
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
