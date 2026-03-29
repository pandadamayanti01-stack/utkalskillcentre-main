import express from 'express';
import path from 'path';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import Razorpay from 'razorpay';
import multer from 'multer';
import * as admin from 'firebase-admin';
import fs from 'fs';
import crypto from 'node:crypto';

// Initialize Firebase Admin
if (admin.apps && !admin.apps.length) {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log("Firebase Admin initializing with config file.");
    } else {
      console.warn("firebase-applet-config.json not found. Using environment variables.");
      config = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET
      };
    }

    if (config.projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: config.projectId,
        storageBucket: config.storageBucket
      });
      console.log("Firebase Admin initialized successfully with project:", config.projectId);
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
      razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } catch (err) {
      console.error('Failed to initialize Razorpay:', err);
      return null;
    }
  }
  return razorpay;
}

async function startServer() {
  const app = express();
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
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const bucket = admin.storage().bucket();
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
        return res.status(503).json({ error: 'Payment service is currently unavailable. Please contact support.' });
      }
      
      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency: "INR",
        receipt: `rcpt_${Date.now().toString().slice(-6)}_${userId ? userId.substring(0, 10) : 'anon'}`
      };
      
      const order = await rzp.orders.create(options);

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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId, userClass } = req.body;
      
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keySecret) {
        console.error('RAZORPAY_KEY_SECRET is missing.');
        return res.status(500).json({ success: false, message: 'Payment configuration error' });
      }

      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');
      
      if (generated_signature === razorpay_signature) {
        // Log transaction to Firestore
        await admin.firestore().collection('transactions').add({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: amount / 100,
          userId,
          class: userClass,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
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

  // Vite middleware for development
  const distPath = path.join(process.cwd(), 'dist');
  const indexPath = path.join(distPath, 'index.html');

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
}

startServer();
