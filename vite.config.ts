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
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        },
        manifest: {
          name: 'Utkal Skill Centre',
          short_name: 'Utkal',
          description: 'Learning portal for students',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
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
          ]
        }
      })
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
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
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
