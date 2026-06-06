import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
import { google } from 'googleapis';

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
  'utkal-prod';

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
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'utkalskillcentre',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || 'utkalskillcentre.firebasestorage.app'
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
          amount: (amount || 0), // Frontend sends amount in rupees directly
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
        
        // 3. Mark the payment order as success
        await db.collection('payments').doc(razorpay_order_id).set({
          status: 'success',
          razorpay_payment_id: razorpay_payment_id,
          razorpay_signature: razorpay_signature,
          updatedAt: new Date()
        }, { merge: true });

        // 4. Update the user document to reflect premium status for frontend UI
        await db.collection('users').doc(userId).set({
          isPremium: true,
          premiumSince: new Date(),
          premiumType: planType || 'monthly'
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

const KOSLI_DESIA_MAP: Record<string, string> = {
  "କାଣା କରୁଛୁ": "କଣ କରୁଛ",
  "କାଣା କରୁଛ": "କଣ କରୁଛ",
  "ଭାତ ଖାଇଲୁନି": "ଭାତ ଖାଇଲ କି",
  "କରୁଛନ": "କରୁଛନ୍ତି",
  "ଖାଉଛନ": "ଖାଉଛନ୍ତି",
  "ପଢୁଛନ": "ପଢୁଛନ୍ତି",
  "ଖେଳୁଛନ": "ଖେଳୁଛନ୍ତି",
  "ଆମେନ": "ଆମେ",
  "ତୁମେନ": "ତୁମେମାନେ",
  "ଘରକେ": "ଘରକୁ",
  "ସ୍କୁଲକେ": "ସ୍କୁଲକୁ",
  "ଖେଳବାକେ": "ଖେଳିବାକୁ",
  "ପଢ଼ବାକେ": "ପଢ଼ିବାକୁ",
  "ଲେଖବାକେ": "ଲେଖିବାକୁ",
  "କେନ୍ତା": "କେମିତି",
  "କେନେ": "କେଉଁଠି",
  "ହେତା": "ସେମିତି",
  "କାଣା": "କଣ",
  "ମୁଇଁ": "ମୁଁ",
  "ତୁଇ": "ତୁମେ",
  "ଖାଉଛୁ": "ଖାଉଛ",
  "ଯାଉଛୁ": "ଯାଉଛ",
  "ଖାଇବୁ": "ଖାଇବ",
  "ଆସିଲୁ": "ଆସିଲ",
  "ଗଲାସ": "ଗଲ",
  "ନାଇଁ": "ନାହିଁ",
  "ଅଛେ": "ଅଛି"
};

function normalizeOdiaDialect(query: string): string {
  if (!query) return query;
  let normalized = query;
  const sortedKeys = Object.keys(KOSLI_DESIA_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const replacement = KOSLI_DESIA_MAP[key];
    normalized = normalized.split(key).join(replacement);
  }
  return normalized;
}

function tokenize(text: string): Set<string> {
  if (!text) return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।]/g, ' ')
    .split(/\s+/);
  
  const uniqueTokens = new Set<string>();
  for (let token of tokens) {
    token = token.trim();
    if (token.length > 1) {
      uniqueTokens.add(token);
    }
  }
  return uniqueTokens;
}

function calculateJaccard(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }
  const unionSize = setA.size + setB.size - intersectionCount;
  return intersectionCount / unionSize;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.post('/api/ai/generate', async (req, res) => {
  try {
    let { contents, systemInstruction, modelType, generationConfig, class: userClass, subject, enableDialectBridge } = req.body;
    
    // Perform Firestore Native Vector Search Grounding if class & subject are supplied
    if (userClass && subject) {
      try {
        let queryText = '';
        if (Array.isArray(contents) && contents.length > 0) {
          const lastUserTurn = [...contents].reverse().find(turn => turn.role === 'user');
          if (lastUserTurn && Array.isArray(lastUserTurn.parts)) {
            queryText = lastUserTurn.parts.map((p: any) => p.text || '').join('\n').trim();
          }
        }
        
        if (queryText) {
          let searchNormalizedQuery = queryText;
          const isBridgeActive = enableDialectBridge === true || enableDialectBridge === 'true';
          
          if (isBridgeActive) {
            searchNormalizedQuery = normalizeOdiaDialect(queryText);
            console.log(`Dialect Bridge: Normalized Kosli/Desia query from "${queryText}" to "${searchNormalizedQuery}"`);
          }

          let searchClass = String(userClass).toLowerCase().trim();
          if (searchClass.startsWith('class')) {
            searchClass = searchClass.replace('class', '').trim();
          }

          console.log(`Backend RAG: Retrieving context for query: "${searchNormalizedQuery.substring(0, 50)}..." class: ${userClass} (normalized: ${searchClass}), subject: ${subject}`);
          const rotatorKeys = [];
          for (let i = 1; i <= 7; i++) {
            const k = process.env[`GEMINI_ROTATOR_KEY_${i}`];
            if (k) rotatorKeys.push(k);
          }
          if (process.env.GEMINI_API_KEY && !rotatorKeys.includes(process.env.GEMINI_API_KEY)) {
            rotatorKeys.push(process.env.GEMINI_API_KEY);
          }
          const keyToUse = rotatorKeys[Math.floor(Math.random() * rotatorKeys.length)] || process.env.GEMINI_API_KEY;
          
          if (keyToUse) {
            const embedUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${keyToUse}`;
            const embedRes = await fetch(embedUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: "models/gemini-embedding-001",
                content: { parts: [{ text: searchNormalizedQuery }] },
                outputDimensionality: 768
              })
            });
            
            if (embedRes.ok) {
              const embedData = await embedRes.json();
              const queryVector = embedData.embedding?.values;
              
              if (queryVector && queryVector.length === 768) {
                const adminApp = getInitializedAdminApp();
                if (adminApp) {
                  const db = getAdminFirestore(adminApp, firestoreDatabaseId);
                  const chunksColl = db.collection('textbook_chunks');
                  const { FieldValue } = require('firebase-admin/firestore');
                  
                  // Retrieve top 8 vector matches
                  const vectorQuery = chunksColl
                    .where('class', '==', searchClass)
                    .where('subject', '==', String(subject).toLowerCase().trim())
                    .findNearest(
                      'embedding',
                      FieldValue.vector(queryVector),
                      {
                        limit: 8,
                        distanceMeasure: 'COSINE'
                      }
                    );
                  
                  const snapshot = await vectorQuery.get();
                  const candidates: any[] = [];
                  const queryTokens = tokenize(searchNormalizedQuery);

                  snapshot.forEach((doc: any) => {
                    const data = doc.data();
                    const chunkText = data.text || '';
                    const chunkTokens = tokenize(chunkText);
                    const jaccard = calculateJaccard(queryTokens, chunkTokens);
                    
                    let chunkEmbedding: number[] = [];
                    if (data.embedding) {
                      if (Array.isArray(data.embedding)) {
                        chunkEmbedding = data.embedding;
                      } else if (typeof data.embedding.toArray === 'function') {
                        chunkEmbedding = data.embedding.toArray();
                      } else if (Array.isArray(data.embedding.values)) {
                        chunkEmbedding = data.embedding.values;
                      }
                    }
                    
                    const cosSim = chunkEmbedding.length === 768 
                      ? cosineSimilarity(queryVector, chunkEmbedding) 
                      : 0;
                    
                    const hybridScore = 0.7 * cosSim + 0.3 * jaccard;
                    
                    candidates.push({
                      reference: data.reference,
                      text: chunkText,
                      cosSim,
                      jaccard,
                      score: hybridScore
                    });
                  });

                  // Sort candidates by hybrid score descending
                  candidates.sort((a, b) => b.score - a.score);

                  // Pick top 3
                  const topCandidates = candidates.slice(0, 3);
                  
                  let retrievedText = '';
                  topCandidates.forEach((candidate) => {
                    retrievedText += `\n--- [Verified Reference: ${candidate.reference || 'Textbook'}] ---\n${candidate.text}\n`;
                  });
                  
                  if (retrievedText) {
                    console.log(`Backend RAG: Successfully retrieved grounded textbook chunks (Top score: ${topCandidates[0]?.score?.toFixed(4)}, Vector: ${topCandidates[0]?.cosSim?.toFixed(4)}, Jaccard: ${topCandidates[0]?.jaccard?.toFixed(4)})`);
                    systemInstruction = `${systemInstruction ? systemInstruction + '\n\n' : ''}### STRICT TEXTBOOK GROUNDING CONTEXT:
The following are verified, 100% correct stanzas/passages retrieved directly from the official school textbook. You MUST base your answers strictly on this context:
${retrievedText}
`;
                  }

                  if (isBridgeActive) {
                    systemInstruction = `${systemInstruction ? systemInstruction + '\n\n' : ''}### DIALECT BRIDGE ACTIVE:
The student may be using local colloquial speech (Kosli/Desia accents). Keep your tone elder-sisterly, warm and friendly, and respond in standard Odia. Ensure any grammatical mappings are resolved naturally.`;
                  }
                }
              }
            } else {
              const embedErrText = await embedRes.text();
              console.warn("Backend RAG: Failed to fetch query embedding:", embedErrText);
            }
          }
        }
      } catch (err: any) {
        console.error("Backend RAG Error:", err.message);
        if (err.message && err.message.includes('requires a vector index')) {
          return res.status(412).json({ 
            error: "Vector index required", 
            message: err.message, 
            details: "Please create the vector index in Firestore. Visit the link in server logs or console."
          });
        }
      }
    }

    const useVertex = process.env.USE_VERTEX_AI === 'true';
    
    if (useVertex) {
      try {
        console.log("Backend AI: Attempting Vertex AI route...");
        const credentialsPath = path.resolve(process.cwd(), 'utkal-admin-sdk.json');
        let accessToken: string | null | undefined = null;
        let projectId = process.env.FIREBASE_PROJECT_ID || 'utkalskillcentre';

        if (fs.existsSync(credentialsPath)) {
          const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          projectId = creds.project_id || projectId;
          const vertexAuth = new google.auth.JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
          });
          
          const authClient = await vertexAuth.authorize();
          accessToken = authClient.access_token;
        } else {
          // Attempt Application Default Credentials (ADC) for ambient serverless environments
          try {
            const auth = new google.auth.GoogleAuth({
              scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const authClient = await auth.getClient();
            const tokenResponse = await authClient.getAccessToken();
            accessToken = tokenResponse.token;
            projectId = await auth.getProjectId() || projectId;
            console.log("Backend AI: Successfully fetched ambient cloud access token for project:", projectId);
          } catch (adcErr: any) {
            console.warn("Backend AI: Ambient ADC authentication failed:", adcErr.message);
          }
        }
        
        if (accessToken) {
          // Map models to standard Vertex AI model names
          const vertexModel = modelType === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
          
          console.log(`Backend AI: Calling Vertex AI model ${vertexModel} via global endpoint for project ${projectId}...`);
          const vertexUrl = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${vertexModel}:generateContent`;
          
          // Format system instruction for Vertex REST API
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
              console.log("Backend AI: Vertex AI response successful!");
              return res.json({ text });
            }
          } else {
            const errText = await response.text();
            console.warn(`Backend AI: Vertex AI request failed: ${response.status} - ${errText}`);
          }
        } else {
          console.warn("Backend AI: Could not resolve service account or ADC access token for Vertex AI.");
          // Fall back to Vertex API Key if provided as a direct developer key URL bypass
          const vertexKey = process.env.VERTEX_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
          if (vertexKey) {
            console.log("Backend AI: Attempting to call Vertex endpoints using direct developer key...");
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
                console.log("Backend AI: Vertex AI key-based request successful!");
                return res.json({ text });
              }
            } else {
              const errText = await response.text();
              console.warn(`Backend AI: Developer key fallback returned error: ${response.status} - ${errText}`);
            }
          }
        }
      } catch (vertexErr: any) {
        console.error("Backend AI: Vertex AI execution error:", vertexErr.message);
      }
      
      console.log("Backend AI: Vertex AI failed. Falling back to Google AI Studio standard developer key route.");
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server' });

    const ai = new GoogleGenerativeAI(apiKey);

    const FLASH_MODELS = [
      "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite",
      "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.5-flash-image"
    ];
    const PRO_MODELS = [
      "gemini-2.5-pro", "gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-pro-latest"
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
      ? (process.env.GEMINI_TTS_VOICE_ODIA || 'Kore') 
      : (process.env.GEMINI_TTS_VOICE_EN || 'Aoede');

    const fallbackVoice = isOdia ? 'Puck' : 'Charon';
    const voiceCandidates = [preferredVoice, fallbackVoice];

    const ttsPrompt = isOdia
      ? `ତୁମେ ଗୁନ୍ଦୁଲୁ (Gundulu), ଜଣେ ବହۇତ ସ୍ନେହୀ ଏବଂ ମଧୁର ବଡ଼ ଭଉଣୀ | ଛୋଟ ପିଲାଙ୍କୁ ପଢ଼ାଇଲା ଭଳି ଅତି ନରମ, ସ୍ନେହପୂର୍ଣ୍ଣ ଏବଂ ସୁନ୍ଦର ଭଉଣୀ ସ୍ୱରରେ ନିମ୍ନଲିଖିତ ଓଡ଼ିଆ ଲେଖାକୁ କୁହ। ପ୍ରତ୍ୟେକ ଓଡ଼ିଆ ଶବ୍ଦର ଉଚ୍ଚାରଣ ଅତ୍ୟନ୍ତ ମଧୁର, ସ୍ପଷ୍ଟ ଏବଂ ସ୍ୱାଭାବିକ ହେବା ଉଚିତ।\n\n${text}`
      : `You are Gundulu, a warm, sweet, and cute elder sister tutoring a young student. Speak this text in an extremely clear, slow-paced, warm, and friendly sister voice with high-pitch enthusiasm:\n\n${text}`;

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
            lastError = `No audio payload in response from model ${model}, voice ${voiceName}`;
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
        } catch (innerErr: any) {
          lastError = innerErr.message || 'Fetch connection failed';
          console.error(`Gemini TTS connection error for model ${model}, voice ${voiceName}:`, innerErr);
        }
      }
    }

    return res.status(502).json({ error: `Gemini TTS failed for all configured models and voices: ${lastError}` });
  } catch (error: any) {
    console.error('Gemini TTS Error:', error);
    return res.status(500).json({ error: error?.message || 'TTS generation failed', stack: error?.stack });
  }
});

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
    const { FieldValue } = require('firebase-admin/firestore');

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

app.post('/api/auth/login-with-pin', async (req, res) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ error: 'userId and pin are required' });
    }

    const adminApp = getInitializedAdminApp();
    if (!adminApp) {
      return res.status(500).json({ error: 'Firebase Admin initialization failed' });
    }

    const db = getAdminFirestore(adminApp, firestoreDatabaseId);
    
    // Fetch the user's document from Firestore to verify their PIN
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    const storedPin = userData?.pin;

    if (!storedPin) {
      return res.status(400).json({ error: 'No PIN is set for this account. Please log in with OTP first and set a PIN.' });
    }

    if (String(storedPin).trim() !== String(pin).trim()) {
      return res.status(401).json({ error: 'Incorrect PIN. Please try again.' });
    }

    // PIN is correct, generate a custom token
    const { getAuth: getAdminAuth } = await import('firebase-admin/auth');
    const authAdmin = getAdminAuth(adminApp);
    
    // Generate a custom auth token that client can sign in with
    const customToken = await authAdmin.createCustomToken(userId);

    res.json({ success: true, customToken });
  } catch (error: any) {
    console.error('PIN Auth Endpoint Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
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

