import express from 'express';
import path from 'path';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import Razorpay from 'razorpay';
import multer from 'multer';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import merge from 'lodash/merge';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { OAuth2Client } from 'google-auth-library';
import { Server } from 'socket.io';
import { createServer } from 'http';
import fs from 'fs';

// Initialize Google Drive API
const driveAuth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth: driveAuth });

const authClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Initialize SQLite
let db: any;

async function initDb() {
  try {
    db = await open({
      filename: './database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection, id)
      );
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

initDb();

function buildQuery(collName: string, queryOptions: any) {
  let sql = 'SELECT id, data FROM documents WHERE collection = ?';
  let params: any[] = [collName];

  if (queryOptions && queryOptions.where) {
    queryOptions.where.forEach((w: any) => {
      const field = w.field;
      const op = w.operator || w.op;
      const val = w.value;
      
      if (op === '==') {
        sql += ` AND json_extract(data, '$.${field}') = ?`;
        params.push(String(val));
      } else if (op === '>') {
        sql += ` AND CAST(json_extract(data, '$.${field}') AS NUMERIC) > ?`;
        params.push(Number(val));
      } else if (op === '<') {
        sql += ` AND CAST(json_extract(data, '$.${field}') AS NUMERIC) < ?`;
        params.push(Number(val));
      } else if (op === '>=') {
        sql += ` AND CAST(json_extract(data, '$.${field}') AS NUMERIC) >= ?`;
        params.push(Number(val));
      } else if (op === '<=') {
        sql += ` AND CAST(json_extract(data, '$.${field}') AS NUMERIC) <= ?`;
        params.push(Number(val));
      } else if (op === 'array-contains') {
        sql += ` AND EXISTS (SELECT 1 FROM json_each(json_extract(data, '$.${field}')) WHERE value = ?)`;
        params.push(String(val));
      } else if (op === 'in') {
        const inPlaceholders = val.map(() => '?').join(', ');
        sql += ` AND json_extract(data, '$.${field}') IN (${inPlaceholders})`;
        params.push(...val.map(String));
      }
    });
  }

  if (queryOptions && queryOptions.orderBy) {
    const field = queryOptions.orderBy.field;
    const dir = (queryOptions.orderBy.direction || 'asc').toUpperCase();
    sql += ` ORDER BY json_extract(data, '$.${field}') ${dir}`;
  }

  if (queryOptions && queryOptions.limit) {
    sql += ` LIMIT ?`;
    params.push(queryOptions.limit);
  }

  return { sql, params };
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
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  app.use(express.json());

  // Socket.io for Real-time Updates (Polling PostgreSQL)
  const activeListeners = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('subscribe', async ({ collection: collName, docId, query: queryOptions }) => {
      const listenerKey = `${socket.id}_${collName}_${docId || 'all'}`;
      console.log('Subscribing to:', listenerKey);

      const pollData = async () => {
        try {
          if (docId) {
            const res = await db.get('SELECT data FROM documents WHERE collection = ? AND id = ?', [collName, docId]);
            if (res) {
              socket.emit('update', { collection: collName, docId, data: { id: docId, ...JSON.parse(res.data) } });
            }
          } else {
            const { sql, params } = buildQuery(collName, queryOptions);
            const res = await db.all(sql, params);
            const data = res.map((r: any) => ({ id: r.id, ...JSON.parse(r.data) }));
            socket.emit('update', { collection: collName, data });
          }
        } catch (err: any) {
          console.error('Poll error:', err);
          socket.emit('error', { message: err.message });
        }
      };

      // Initial fetch
      await pollData();

      // Poll every 3 seconds
      const pollInterval = setInterval(pollData, 3000);
      activeListeners.set(listenerKey, () => clearInterval(pollInterval));
    });

    socket.on('unsubscribe', ({ collection: collName, docId }) => {
      const listenerKey = `${socket.id}_${collName}_${docId || 'all'}`;
      const unsubscribe = activeListeners.get(listenerKey);
      if (unsubscribe) {
        unsubscribe();
        activeListeners.delete(listenerKey);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      activeListeners.forEach((unsubscribe, key) => {
        if (key.startsWith(socket.id)) {
          unsubscribe();
          activeListeners.delete(key);
        }
      });
    });
  });

  // API Routes
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { accessToken } = req.body;
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      const payload = await response.json();
      res.json({ user: payload });
    } catch (error: any) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Generic PostgreSQL API
  app.post('/api/db/:collection/query', async (req, res) => {
    try {
      const { collection: collName } = req.params;
      const { query: queryData } = req.body;
      
      const { sql, params } = buildQuery(collName, queryData);
      const snapshot = await db.all(sql, params);
      
      const data = snapshot.map((r: any) => ({ id: r.id, ...JSON.parse(r.data) }));
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/db/:collection/count', async (req, res) => {
    try {
      const { collection: collName } = req.params;
      const { query: queryData } = req.body;
      
      const { sql, params } = buildQuery(collName, queryData);
      // Wrap query to get count
      const countSql = `SELECT COUNT(*) as count FROM (${sql}) AS subquery`;
      const snapshot = await db.get(countSql, params);
      
      res.json({ count: parseInt(snapshot.count, 10) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/db/:collection', async (req, res) => {
    try {
      const { collection: collName } = req.params;
      const snapshot = await db.all('SELECT id, data FROM documents WHERE collection = ?', [collName]);
      const data = snapshot.map((r: any) => ({ id: r.id, ...JSON.parse(r.data) }));
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/db/:collection/:id', async (req, res) => {
    try {
      const { collection: collName, id } = req.params;
      const doc = await db.get('SELECT data FROM documents WHERE collection = ? AND id = ?', [collName, id]);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json({ id, ...JSON.parse(doc.data) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/db/:collection', async (req, res) => {
    try {
      const { collection: collName } = req.params;
      const id = req.body.id || uuidv4();
      const data = { ...req.body, createdAt: new Date().toISOString() };
      delete data.id; // Don't store id inside data if it's already the PK

      await db.run(
        'INSERT INTO documents (collection, id, data) VALUES (?, ?, ?)',
        [collName, id, JSON.stringify(data)]
      );
      res.json({ id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/db/:collection/:id', async (req, res) => {
    try {
      const { collection: collName, id } = req.params;
      const data = req.body;
      
      // Fetch existing
      const existingRes = await db.get('SELECT data FROM documents WHERE collection = ? AND id = ?', [collName, id]);
      let existingData = existingRes ? JSON.parse(existingRes.data) : {};
      
      // Handle increment
      const processedData = { ...data };
      for (const key in processedData) {
        if (processedData[key] && typeof processedData[key] === 'object' && processedData[key].__increment) {
          processedData[key] = (existingData[key] || 0) + processedData[key].__increment;
        }
      }
      
      // Merge
      const mergedData = merge({}, existingData, processedData);
      delete mergedData.id;

      if (existingRes) {
        await db.run(
          'UPDATE documents SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE collection = ? AND id = ?',
          [JSON.stringify(mergedData), collName, id]
        );
      } else {
        await db.run(
          'INSERT INTO documents (collection, id, data) VALUES (?, ?, ?)',
          [collName, id, JSON.stringify(mergedData)]
        );
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/db/:collection/:id', async (req, res) => {
    try {
      const { collection: collName, id } = req.params;
      await db.run('DELETE FROM documents WHERE collection = ? AND id = ?', [collName, id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/upload-textbook', upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileMetadata: any = {
        name: `${Date.now()}_${req.file.originalname}`,
      };

      // If a specific folder ID is provided in environment variables, use it
      if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
        fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
      }

      const media = {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer),
      };

      const driveResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = driveResponse.data.id;

      if (fileId) {
        // Make the file publicly accessible
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }

      const publicUrl = fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : driveResponse.data.webViewLink;
      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error('Upload Error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });

  app.post('/api/payment/create-order', async (req, res) => {
    try {
      const { amount, userId } = req.body;
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
      
      const crypto = await import('crypto');
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keySecret) {
        throw new Error('RAZORPAY_KEY_SECRET is missing.');
      }

      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest('hex');
      
      if (generated_signature === razorpay_signature) {
        res.json({ success: true });
      } else {
        console.error('Invalid signature');
        res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    } catch (error: any) {
      console.error('Verify Payment Error:', error);
      res.status(500).json({ success: false, message: error.message || 'Verification failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
