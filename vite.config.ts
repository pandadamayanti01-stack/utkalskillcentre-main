import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // Prioritize Environment Variables for Gemini
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "";

  // Load Firebase config from JSON if it exists (Optional: Move to Env Vars for better Vercel support)
  let firebaseConfig = {};
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.error("Error parsing firebase-applet-config.json:", e);
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['icon.svg'],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['index.html', 'assets/*.{js,css}'],
          // Keeps your PWA light by ignoring specific large assets
          globIgnores: ['assets/AdminDashboard-*.js', 'assets/ai-*.js'], 
        },
        manifest: {
          name: 'Utkal Skill Centre',
          short_name: 'Utkal Skill Centre',
          description: 'Learning portal for students',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/utkal-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/utkal-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/usc-markable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      // RAZORPAY KEY LOGIC
      'import.meta.env.VITE_RAZORPAY_KEY': JSON.stringify(
        env.VITE_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY || "rzp_live_SSN1ujW6x6SBco"
      ),
      '__FIREBASE_CONFIG__': JSON.stringify(firebaseConfig),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@google/genai')) return 'ai';
            if (id.includes('framer-motion')) return 'motion';
            return 'vendor';
          },
        },
        // All your custom HTML entry points for SEO
        input: {
          main: path.resolve(__dirname, 'index.html'),
          odishaLearningApp: path.resolve(__dirname, 'odisha-learning-app.html'),
          monthlyTests: path.resolve(__dirname, 'monthly-tests-for-odisha-students.html'),
          // ... add others back here as needed
        },
      },
    },
    server: {
      hmr: false, // Per your requirement for AI Studio/Agent stability
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});