import express from 'express';
import path from 'path';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import Razorpay from 'razorpay';
import { GoogleGenAI } from "@google/genai";

let razorpay: Razorpay | null = null;
let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in environment variables.');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID (or VITE_RAZORPAY_KEY) and RAZORPAY_KEY_SECRET are missing in environment variables.');
    }

    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post('/api/payment/create-order', async (req, res) => {
    try {
      const { amount, userId } = req.body;
      const rzp = getRazorpay();
      
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
      res.status(500).json({ error: errorMessage, details: error });
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

  app.post('/api/ai/solve', async (req, res) => {
    try {
      const { prompt, language } = req.body;
      const genAI = getAI();
      
      const systemInstruction = language === 'en' 
        ? "You are a friendly Math Tutor for Odisha Board students (Class 5-10). Provide step-by-step simple explanations in English."
        : "You are a friendly Math Tutor for Odisha Board students (Class 5-10). Provide step-by-step simple explanations in Odia language. Use Odia script for the explanation but you can use numbers and mathematical symbols as they are.";

      const response = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text || "Sorry, I couldn't solve that. Please try again." });
    } catch (error: any) {
      console.error('AI Proxy Error:', error);
      res.status(500).json({ error: error.message || 'Error connecting to AI tutor' });
    }
  });

  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, targetLanguage, isJson } = req.body;
      const genAI = getAI();
      
      let systemInstruction = targetLanguage === 'or' 
        ? "You are an expert translator. Translate the following educational content from English to Odia. Keep mathematical terms, numbers, and formatting intact."
        : "You are an expert translator. Translate the following educational content from Odia to English. Keep mathematical terms, numbers, and formatting intact.";

      if (isJson) {
        systemInstruction += " The input is a JSON object. Translate all string values within the JSON object to the target language, but keep the keys exactly the same. Return ONLY the translated JSON object. Do not include any markdown formatting like ```json.";
      }

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction,
          temperature: 0.1,
          ...(isJson ? { responseMimeType: "application/json" } : {})
        },
      });

      res.json({ text: response.text || text });
    } catch (error: any) {
      console.error('Translation Error:', error);
      res.status(500).json({ error: error.message || 'Error translating content' });
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
