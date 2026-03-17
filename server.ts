import express from 'express';
import path from 'path';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import Razorpay from 'razorpay';

let razorpay: Razorpay | null = null;

function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_live_SSN1ujW6x6SBco";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "f23Kg0K6eU6QW7EgbW05pxse";
    
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in environment variables.');
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
        currency: order.currency
      });
    } catch (error: any) {
      console.error('Create Order Error:', error);
      res.status(500).json({ error: error.message || 'Failed to create order' });
    }
  });

  app.post('/api/payment/verify', async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
      
      const crypto = await import('crypto');
      const keySecret = process.env.RAZORPAY_KEY_SECRET || "f23Kg0K6eU6QW7EgbW05pxse";
      
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
