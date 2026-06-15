import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  const geminiKey = process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || env.GEMINI_API_KEY || env.API_KEY || "";
  
  // Load Firebase config from JSON if it exists
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
      react({ jsxRuntime: 'automatic' }), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon.svg'],
        workbox: {
          importScripts: ['/push-worker.js'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['index.html', 'assets/*.{js,css}'],
          globIgnores: [
            'assets/AdminDashboard-*.js',
            'assets/AvatarStore-*.js',
            'assets/GunduluHuman-*.js',
            'assets/GunduluHuman-*.css',
            'assets/NotificationsView-*.js',
            'assets/PracticeQuestion-*.js',
            'assets/ProgressChart-*.js',
            'assets/StudyBuddyView-*.js',
            'assets/TestSeriesPoster-*.js',
            'assets/ai-*.js',
            'assets/charts-*.js',
            'assets/gcpService-*.js',
            'assets/markdown-*.js',
          ],
        },
        manifest: {
          name: 'Utkal Skill Centre',
          short_name: 'Utkal Skill Centre',
          description: 'Learn with official BSE Odisha textbooks, mapped MCQs, and your AI tutor Gundulu.',
          theme_color: '#10b981',
          background_color: '#0f172a',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          launch_handler: {
            client_mode: 'focus-existing'
          },
          orientation: 'portrait',
          scope: '/',
          start_url: '/#dashboard',
          categories: [
            'education',
            'books',
            'productivity'
          ],
          icons: [
            {
              src: '/utkal-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/utkal-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/usc-markable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          screenshots: [
            {
              src: '/gundulu-v3.jpg',
              sizes: '1024x1024',
              type: 'image/jpeg',
              form_factor: 'narrow',
              label: 'Gundulu AI Tutor - Learning Dashboard'
            },
            {
              src: '/mts-1may.jpg',
              sizes: '1280x714',
              type: 'image/jpeg',
              form_factor: 'wide',
              label: 'Utkal Skill Centre - Mock Tests & Dashboard'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': '""',
      'import.meta.env.VITE_GEMINI_API_KEY': '""',
      'import.meta.env.VITE_RAZORPAY_KEY': JSON.stringify(env.VITE_RAZORPAY_KEY || process.env.VITE_RAZORPAY_KEY || "rzp_live_SSN1ujW6x6SBco"),
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
            if (!id.includes('node_modules')) {
              return;
            }

            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@google/genai')) return 'ai';
            if (id.includes('framer-motion') || id.includes('/motion/')) return 'motion';
            if (id.includes('react-markdown')) return 'markdown';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('lucide-react')) return 'icons';

            return 'vendor';
          },
        },
        input: {
          main: path.resolve(__dirname, 'index.html'),
          odishaLearningApp: path.resolve(__dirname, 'odisha-learning-app.html'),
          odiaAiTutor: path.resolve(__dirname, 'odia-ai-tutor.html'),
          classStudyMaterials: path.resolve(__dirname, 'class-3-to-10-study-materials.html'),
          monthlyTests: path.resolve(__dirname, 'monthly-tests-for-odisha-students.html'),
          class10StudyApp: path.resolve(__dirname, 'class-10-odisha-study-app.html'),
          class9StudyApp: path.resolve(__dirname, 'class-9-odisha-study-app.html'),
          class8StudyMaterials: path.resolve(__dirname, 'class-8-study-materials-odisha.html'),
          odiaMediumLearning: path.resolve(__dirname, 'odia-medium-learning-app.html'),
          odishaMathPractice: path.resolve(__dirname, 'odisha-math-practice-app.html'),
          aiHomeworkHelp: path.resolve(__dirname, 'ai-homework-help-odia.html'),
          class10MathApp: path.resolve(__dirname, 'class-10-math-app-odisha.html'),
          class10ScienceApp: path.resolve(__dirname, 'class-10-science-study-app-odisha.html'),
          class7LearningApp: path.resolve(__dirname, 'class-7-learning-app-odisha.html'),
          schoolTestPrep: path.resolve(__dirname, 'school-test-preparation-app-odisha.html'),
          weakStudentsApp: path.resolve(__dirname, 'study-app-for-weak-students-odisha.html'),
          odiaHomeworkHelp: path.resolve(__dirname, 'odia-homework-help-for-students.html'),
          learnOdiaOnline: path.resolve(__dirname, 'learn-in-odia-online.html'),
          class10HomeworkHelp: path.resolve(__dirname, 'class-10-homework-help-odisha.html'),
          aiMathTutorOdia: path.resolve(__dirname, 'ai-math-tutor-in-odia.html'),
          onlineTestApp: path.resolve(__dirname, 'online-test-app-for-school-students-odisha.html'),
          skillOdisha: path.resolve(__dirname, 'skill-odisha.html'),
          aiLearningOdia: path.resolve(__dirname, 'ai-learning-odia.html'),
        },
      },
    },
    publicDir: 'public',
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000', // Update if your backend runs on a different port
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
