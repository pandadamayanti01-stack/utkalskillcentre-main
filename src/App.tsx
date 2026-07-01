import React, { Suspense, lazy, useEffect, useRef, useState, useCallback, useMemo } from 'react';
// FIX #12: Named imports only — eliminates ~930 unused icons from the lucide bundle
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BarChart3, Bell, Book,
  BookOpen, Bot, Camera, CheckCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, CreditCard, Crown, Download, ExternalLink, Facebook, FileBarChart2,
  FileText, Flame, FlaskConical, Globe, Hammer, HelpCircle, History, Image,
  Instagram, Languages, LayoutGrid, Leaf, Library, LifeBuoy, Lightbulb,
  Loader, Loader2, Lock, Mail, Medal, MessageCircle, Mic, Monitor,
  Palette, PenTool, Phone, Play, QrCode, Rocket, Save, School, Send,
  Settings, Shapes, Share2, ShieldAlert, ShieldCheck, ShoppingBag,
  Sparkles, Star, Trophy, Twitter, Type, Upload, User, UserX, Users, Wind,
  Youtube, Zap, X, WifiOff, RefreshCw
} from 'lucide-react';
// Re-export as Lucide namespace for backward compatibility with existing JSX
const Lucide = {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BarChart3, Bell, Book,
  BookOpen, Bot, Camera, CheckCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, CreditCard, Crown, Download, ExternalLink, Facebook, FileBarChart2,
  FileText, Flame, FlaskConical, Globe, Hammer, HelpCircle, History, Image,
  Instagram, Languages, LayoutGrid, Leaf, Library, LifeBuoy, Lightbulb,
  Loader, Loader2, Lock, Mail, Medal, MessageCircle, Mic, Monitor,
  Palette, PenTool, Phone, Play, QrCode, Rocket, Save, School, Send,
  Settings, Shapes, Share2, ShieldAlert, ShieldCheck, ShoppingBag,
  Sparkles, Star, Trophy, Twitter, Type, Upload, User, UserX, Users, Wind,
  Youtube, Zap, X, WifiOff, RefreshCw
};
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';
import Markdown from 'react-markdown';
import { auth, db as firestore, storage, safeJsonStringify } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Chapter, BilingualContent, DailyMcq, DailyMcqSubmission, Textbook } from './types';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  linkWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer, collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, increment, getCountFromServer, onSnapshot, Timestamp, deleteDoc, Query, DocumentData, runTransaction } from 'firebase/firestore';
import { createSupportSession, endSupportSession, subscribeToQueuePosition } from './services/supportService';
import { ODISHA_DISTRICTS } from './constants/districts';
import { translations } from './translations';
import { solveMathDoubt, getAI, getStudyBuddySystemInstruction, withRetry } from './services/aiService';
import { subjectTranslations } from './constants';
import { getConfiguredDailyMcqSequence, getRotatingDailyMcqSubject, getTomorrowDateString } from './utils/dailyMcq';
import { openDailyMcqWhatsAppShare } from './utils/dailyMcqShare';
import { getYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail } from './utils/youtube';
import { useVoiceInput } from './hooks/useVoiceInput';
import { useVoiceSearch } from './hooks/useVoiceSearch';
import { OfflineService } from './services/offlineService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatbotModal } from './components/ChatbotModal';
import { DailyMcqView } from './components/DailyMcqView';
import { GameZone } from './components/GameZone';
import { getDeferredPrompt, clearDeferredPrompt, vibrate, requestScreenWakeLock, releaseScreenWakeLock, shareNative, playSuccessChime, playClickSound, subscribeUserToPush } from './pwa';
import { SEO } from './components/SEO';
import { BottomNavBar } from './components/BottomNavBar';
import LoginComponent from './components/LoginComponent';
import { PublicSeoPreview } from './components/PublicSeoPreview';
import ReactMarkdown from 'react-markdown';
import { cleanMathNotation } from './utils/cleaners';
import LibraryPortalGate from './components/LibraryPortalGate';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { previewDatabase } from './data/previewDatabase';
import { getDirectDriveDownloadUrl } from './utils/helpers';

// Reusable resilient lazy loader that catches chunk/asset preloading errors
// and automatically reloads the page to retrieve the latest deployed assets.
function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importFn();
      if (module && typeof module === 'object' && 'default' in module) {
        return { default: module.default as T };
      }
      return { default: module as T };
    } catch (error: any) {
      const errMsg = error?.message || '';
      if (
        errMsg.includes('Failed to fetch dynamically imported module') ||
        errMsg.includes('preload CSS') ||
        errMsg.includes('Failed to fetch')
      ) {
        console.warn('Asset chunk/preload failed. Force reloading to get the latest deployment...', error);
        window.location.reload();
        // Return a pending promise so the app doesn't crash while reloading
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const AdminDashboard = lazyWithRetry(() => import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const PracticeQuestion = lazyWithRetry(() => import('./components/PracticeQuestion').then((module) => ({ default: module.PracticeQuestion })));
const Dashboard = lazyWithRetry(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const SishuVatikaDashboard = lazyWithRetry(() => import('./components/SishuVatikaDashboard').then((module) => ({ default: module.SishuVatikaDashboard })));
const NotificationsView = lazyWithRetry(() => import('./components/NotificationsView').then((module) => ({ default: module.NotificationsView })));
const GunduluHuman = lazyWithRetry(() => import('./components/GunduluHuman'));
const GunduluSishuVatika = lazyWithRetry(() => import('./components/GunduluSishuVatika'));
const AvatarStore = lazyWithRetry(() => import('./components/AvatarStore').then((module) => ({ default: module.AvatarStore })));
const ProgressChart = lazyWithRetry(() => import('./components/ProgressChart').then((module) => ({ default: module.ProgressChart })));
const StudyBuddyView = lazyWithRetry(() => import('./components/StudyBuddyView').then((module) => ({ default: module.StudyBuddyView })));
const Sidebar = lazyWithRetry(() => import('./components/Sidebar').then((module) => ({ default: module.Sidebar })));
const TestSeriesPoster = lazyWithRetry(() => import('./components/TestSeriesPoster'));
const SyllabusTracker = lazyWithRetry(() => import('./components/SyllabusTracker').then((module) => ({ default: module.SyllabusTracker })));
const SocialPosterGenerator = lazyWithRetry(() => import('./components/SocialPosterGenerator').then((module) => ({ default: module.SocialPosterGenerator })));
const DigitalLibraryView = lazyWithRetry(() => import('./components/DigitalLibraryView').then((module) => ({ default: module.DigitalLibraryView })));
const SmartClassesView = lazyWithRetry(() => import('./components/SmartClassesView').then((module) => ({ default: module.SmartClassesView })));
const DigitalLibraryLaunchPopup = lazyWithRetry(() => import('./components/DigitalLibraryLaunchPopup'));
const TeacherDashboard = lazyWithRetry(() => import('./components/TeacherDashboard').then((module) => ({ default: module.TeacherDashboard })));
const CommunityChatView = lazyWithRetry(() => import('./components/CommunityChatView').then((module) => ({ default: module.CommunityChatView })));
const LaunchCelebration = lazyWithRetry(() => import('./components/LaunchCelebration'));
const RajaFestivalPoster = lazyWithRetry(() => import('./components/RajaFestivalPoster'));
const PitchDeckView = lazyWithRetry(() => import('./components/PitchDeckView').then((module) => ({ default: module.PitchDeckView })));
const TelemetryView = lazyWithRetry(() => import('./components/TelemetryView').then((module) => ({ default: module.TelemetryView })));
const Gundulu3DLab = lazyWithRetry(() => import('./components/Gundulu3DLab').then((module) => ({ default: module.Gundulu3DLab })));
const AboutUsModal = lazyWithRetry(() => import('./components/AboutUsModal').then((module) => ({ default: module.AboutUsModal })));
const MoSwapnaView = lazyWithRetry(() => import('./components/MoSwapnaView').then((module) => ({ default: module.MoSwapnaView })));
const MonthlyTestsView = lazyWithRetry(() => import('./components/MonthlyTestsView').then((module) => ({ default: module.MonthlyTestsView })));


function ViewLoader({ fullHeight = false }: { fullHeight?: boolean }) {
  return (
    <div className={`flex ${fullHeight ? 'min-h-screen' : 'min-h-[30vh]'} items-center justify-center`}>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white/80 backdrop-blur-sm">
        <Lucide.Loader2 size={18} className="animate-spin text-emerald-400" />
        <span>Loading...</span>
      </div>
    </div>
  );
}


const getLocalizedSubject = (subject: string, language: string) => {
  if (!subject) return '';
  
  // First check if it's a key in translations
  const localized = translations[language]?.subjects?.[subject];
  if (localized) return localized;

  // Then check legacy subjectTranslations
  if (language === 'or' && subjectTranslations[subject]) {
    return subjectTranslations[subject];
  }

  // If it's already a localized label (e.g., from old data), return it
  return subject;
};

// --- Types ---
interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  board: string;
  subjects?: string[];
  preferred_language: string;
  points: number;
  points_today?: number;
  role: string;
  avatar?: string;
  streak?: number;
  lastActiveDate?: string;
  shareCount?: number;
  statusShared?: boolean;
  parent_pin?: string;
  pin?: string;
  completed_chapters?: string[];
  parentShowLeaderboard?: boolean;
  phoneNumber?: string;
  totalStudyMinutes?: number;
  district?: string;
  school?: string;
  stats?: {
    streak: number;
    level: number;
    experience: number;
    accuracy: number;
    league: League;
    badges: string[];
    weeklyPoints: number;
    lastActive?: string;
  };
}

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string;
  hint?: string;
  chapter_id?: string;
}


interface MonthlyTest {
  id: string;
  class: string;
  subject: string;
  month: string;
  year: number;
  language?: string;
  questions: { question: string; options: string[]; correct_answer: string }[];
  status: 'draft' | 'published';
  results_published: boolean;
  translationGroupId?: string;
}

interface MonthlyTestSubmission {
  id: string;
  testId: string;
  userId: string;
  userName: string;
  class: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  rank?: number;
  submittedAt: any;
}

interface SystemSettings {
  enabledClasses?: string[];
  maintenanceMode?: boolean;
  dailyMcqSubjectRotation?: string[];
}

// --- Components ---

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type");
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    if (contentType && contentType.includes("application/json")) {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    }
    throw new Error(errorMsg);
  }
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}`);
  }
  return res.json();
};

const UtkalLogoSVG = ({ className = "h-10" }: { className?: string }) => (
  <svg viewBox="0 0 200 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10C15 7.23858 17.2386 5 20 5H40C42.7614 5 45 7.23858 45 10V40C45 42.7614 42.7614 45 40 45H20C17.2386 45 15 42.7614 15 40V10Z" fill="#10B981" fillOpacity="0.2"/>
    <path d="M22 15L30 23L38 15" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 25L30 33L38 25" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 35H38" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="55" y="32" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">UTKAL</text>
    <text x="55" y="48" fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="2">SKILL CENTRE</text>
  </svg>
);

const AhasLogoSVG = ({ className = "h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 25L15 5L25 25" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 18H20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="15" cy="15" r="12" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    <text x="35" y="21" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1.5">AHAS</text>
  </svg>
);

const BigsanBranding = ({ className = "" }: { className?: string }) => {
  const [lang] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'or');
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        {translations[lang]?.associate || 'Associate Partner'}
      </p>
      <div className="opacity-80 grayscale hover:grayscale-0 transition-all">
        <AhasLogoSVG className="h-6 w-auto" />
      </div>
    </div>
  );
};


function SundayLockout({ language, onAdminBypass }: { language: 'en' | 'or', onAdminBypass: () => void }) {
  const [doorsClosed, setDoorsClosed] = useState(false);

  useEffect(() => {
    // Majestic Palace Gate Sound (Heavy wood slam)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {});
    
    const timer = setTimeout(() => setDoorsClosed(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-black flex items-center justify-center overflow-hidden perspective-[2000px]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Oriya:wght@400;700;900&display=swap');
        .oriya-font { font-family: 'Noto Sans Oriya', sans-serif !important; }
        .palace-gate {
          background: linear-gradient(to right, #4a2c11, #6b4018, #4a2c11);
          box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
        }
      `}</style>

      {/* Left Majestic Gate */}
      <motion.div 
        initial={{ rotateY: -90, originX: 0 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 1.5, ease: [0.45, 0, 0.55, 1] }}
        className="absolute top-0 left-0 w-1/2 h-full z-20 palace-gate border-r-8 border-[#d4af37]/30 flex items-center justify-end pr-12"
      >
        <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/temple.png')]" />
        
        {/* Brass Studs & Carvings */}
        <div className="relative h-4/5 w-1 bg-gradient-to-b from-transparent via-[#d4af37]/40 to-transparent" />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-12">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] shadow-xl border border-black/20" />
           ))}
        </div>
      </motion.div>

      {/* Right Majestic Gate */}
      <motion.div 
        initial={{ rotateY: 90, originX: 1 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 1.5, ease: [0.45, 0, 0.55, 1] }}
        className="absolute top-0 right-0 w-1/2 h-full z-20 palace-gate border-l-8 border-[#d4af37]/30 flex items-center justify-start pl-12"
      >
        <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/temple.png')]" />
        
        {/* Brass Studs & Carvings */}
        <div className="relative h-4/5 w-1 bg-gradient-to-b from-transparent via-[#d4af37]/40 to-transparent" />
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-12">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] shadow-xl border border-black/20" />
           ))}
        </div>
      </motion.div>

      {/* Content that appears after gates shut */}
      <AnimatePresence>
        {doorsClosed && (
          <motion.div 
            initial={{ opacity: 0, z: -100 }}
            animate={{ opacity: 1, z: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-30 max-w-lg w-full p-4 mx-4"
          >
            <div className="glass-card neon-border rounded-[3rem] overflow-hidden bg-[#1a0f05]/95 backdrop-blur-3xl border-[#d4af37]/20 shadow-[0_0_100px_rgba(0,0,0,1)]">
              {/* Illustration Header - Refined Position */}
              <div className="h-52 relative overflow-hidden bg-[#1a0f05]">
                <img 
                  src="/sunday_break_illustration_1777798536113.png" 
                  alt="Sunday Break" 
                  className="w-full h-full object-cover opacity-40 contrast-125 brightness-75 scale-105"
                />
                {/* Deep Royal Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1a0f05]" />
                
                {/* Centered Lock Badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div 
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.8 }}
                    className="w-20 h-20 bg-gradient-to-br from-[#ffd700] to-[#b8860b] rounded-[2rem] flex items-center justify-center border-4 border-[#1a0f05] shadow-[0_0_50px_rgba(184,134,11,0.5)]"
                  >
                    <Lucide.Lock size={40} className="text-[#1a0f05]" />
                  </motion.div>
                </div>
                
                {/* Decorative Crown/Top detail */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ffd700]/30 to-transparent" />
              </div>

              <div className="p-8 md:p-10 text-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-black text-[#ffd700] tracking-tight leading-tight oriya-font">
                    ରବିବାର: ରାଜକୀୟ ବିଶ୍ରାମ
                  </h2>
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4af37]/50" />
                    <p className="text-[10px] text-[#d4af37] font-black uppercase tracking-[0.5em] oriya-font">
                      ଦ୍ୱାର ବନ୍ଦ ହୋଇଛି
                    </p>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4af37]/50" />
                  </div>
                </div>

                <p className="text-[#f8f1e7]/80 text-base md:text-lg font-medium leading-relaxed px-2 oriya-font">
                  ପାଠପଢ଼ା ବହି ବନ୍ଦ କରିବାର ସମୟ ଆସିଯାଇଛି! 📚 ବାହାରକୁ ଯାଆନ୍ତୁ ଏବଂ ଖେଳନ୍ତୁ, ସାଙ୍ଗମାନଙ୍କ ସହିତ ସମୟ ବିତାନ୍ତୁ ଏବଂ ପରିବାର ସହିତ ମଜା କରନ୍ତୁ | ସୋମବାର ଦେଖାହେବା!
                </p>

                <div className="bg-[#d4af37]/10 rounded-2xl p-4 border border-[#d4af37]/20">
                  <p className="text-[#ffd700] font-black text-xs uppercase tracking-widest leading-relaxed oriya-font">
                    ସୋମବାର ସକାଳୁ ପାଠପଢ଼ା ପୁଣି ଆରମ୍ଭ ହେବ
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5">
                  <button 
                    onClick={onAdminBypass}
                    className="text-[9px] font-black text-[#d4af37]/20 hover:text-[#ffd700] uppercase tracking-[0.3em] transition-all oriya-font"
                  >
                    ଆଡମିନ୍ ପ୍ରବେଶ
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SupportOverlay({ session, onEnd }: { session: any, onEnd: () => void }) {
  const [pointer, setPointer] = useState<{ x: number, y: number } | null>(null);

  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [status, setStatus] = useState<'pending' | 'active' | 'ended'>('pending');
  const [shareRequested, setShareRequested] = useState(false);
  const [streamActive, setStreamActive] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsubAnswerRef = useRef<(() => void) | null>(null);
  const unsubCandidatesRef = useRef<(() => void) | null>(null);

  const stopStreaming = async () => {
    if (unsubAnswerRef.current) unsubAnswerRef.current();
    if (unsubCandidatesRef.current) unsubCandidatesRef.current();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    try {
      await updateDoc(doc(firestore, 'remote_support', session.id), {
        screenShareRequested: false,
        screenShareStatus: 'inactive',
        webrtc_offer: null,
        webrtc_answer: null
      });
    } catch (e) {
      // Ignored if session is deleted
    }
  };

  const handleAcceptShare = async () => {
    setShareRequested(false);
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = screenStream;
      setStreamActive(true);

      const servers = {
        iceServers: [
          { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
        ]
      };
      const peerConnection = new RTCPeerConnection(servers);
      pcRef.current = peerConnection;

      screenStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, screenStream);
      });

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(
            collection(firestore, 'remote_support', session.id, 'student_candidates'),
            event.candidate.toJSON()
          );
        }
      };

      const offerDescription = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type
      };

      await updateDoc(doc(firestore, 'remote_support', session.id), {
        webrtc_offer: offer,
        screenShareStatus: 'streaming'
      });

      const unsubAnswer = onSnapshot(doc(firestore, 'remote_support', session.id), (snap) => {
        const data = snap.data();
        if (data?.webrtc_answer && peerConnection.signalingState !== 'stable') {
          const answerDescription = new RTCSessionDescription(data.webrtc_answer);
          peerConnection.setRemoteDescription(answerDescription);
        }
      });

      const unsubAdminCandidates = onSnapshot(
        collection(firestore, 'remote_support', session.id, 'admin_candidates'),
        (snap) => {
          snap.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              try {
                const candidateData = change.doc.data();
                if (candidateData && peerConnection.remoteDescription) {
                  const candidate = new RTCIceCandidate(candidateData);
                  await peerConnection.addIceCandidate(candidate);
                }
              } catch (err) {
                console.warn("[WebRTC] Failed to add incoming admin ICE candidate:", err);
              }
            }
          });
        }
      );

      screenStream.getVideoTracks()[0].onended = () => {
        stopStreaming();
      };

      unsubAnswerRef.current = unsubAnswer;
      unsubCandidatesRef.current = unsubAdminCandidates;

    } catch (err) {
      console.error("Screen Share Failed:", err);
      await updateDoc(doc(firestore, 'remote_support', session.id), {
        screenShareStatus: 'failed',
        screenShareRequested: false
      });
      setStreamActive(false);
      alert("Screen sharing failed. Please ensure you granted permissions.");
    }
  };

  useEffect(() => {
    if (!session?.id) return;
    let unsubQueue = () => {};
    
    const unsub = onSnapshot(doc(firestore, 'remote_support', session.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.pointer) setPointer(data.pointer);
        if (data.status) setStatus(data.status);
        if (data.status === 'ended') onEnd();
        
        if (data.status === 'pending' && data.createdAt) {
          unsubQueue = subscribeToQueuePosition(data.createdAt, (pos) => setQueuePosition(pos));
        }

        // WebRTC Screen Share State Hooks
        if (data.screenShareRequested && data.screenShareStatus === 'requested') {
          const isSupported = !!(navigator?.mediaDevices?.getDisplayMedia);
          if (!isSupported) {
            updateDoc(doc(firestore, 'remote_support', session.id), {
              screenShareRequested: false,
              screenShareStatus: 'unsupported'
            });
          } else {
            setShareRequested(true);
          }
        } else if (!data.screenShareRequested) {
          setShareRequested(false);
          if (streamRef.current) {
            // Stop tracks
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStreamActive(false);
          }
          if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
          }
        }
        
        // Handle Remote Commands (Navigation)
        if (data.lastCommand) {
          const cmd = data.lastCommand;
          const now = Date.now();
          // Only execute if command is fresh (within last 2 seconds)
          if (now - cmd.timestamp < 2000) {
            if (cmd.type === 'navigate') {
              window.location.hash = cmd.target;
              // Force tab change event
              window.dispatchEvent(new CustomEvent('changeTab', { detail: cmd.target.replace('#', '') }));
            }
          }
        }
      } else {
        onEnd();
      }
    });
    return () => {
      unsub();
      unsubQueue();
      if (unsubAnswerRef.current) unsubAnswerRef.current();
      if (unsubCandidatesRef.current) unsubCandidatesRef.current();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, [session?.id, onEnd]);

  if (status === 'pending') {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#002d26] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto border border-blue-500/30 animate-pulse">
            <Lucide.Clock size={32} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2">Waiting Room</h3>
            <p className="text-slate-400 text-sm">Please wait while an admin connects to your screen.</p>
          </div>
          
          <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Your Queue Position</p>
            <p className="text-4xl font-black text-[#ffd700]">#{queuePosition !== null ? queuePosition : '...'}</p>
          </div>
          
          <button onClick={onEnd} className="w-full py-4 rounded-xl border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors">
            Cancel Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end gap-2">
        <div className="bg-emerald-600 text-white px-4 py-2 rounded-2xl shadow-2xl border border-emerald-400/30 text-xs font-black animate-pulse flex items-center gap-2">
          <Lucide.ShieldCheck size={14} />
          LIVE SUPPORT ACTIVE ({session.id})
        </div>
        {streamActive && (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-2xl border border-blue-400/30 text-[10px] font-black animate-pulse flex items-center gap-2">
            <Lucide.Monitor size={12} />
            SCREEN MIRRORING ON
          </div>
        )}
        <button onClick={onEnd} className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-xl transition-colors">End Session</button>
      </div>

      {/* Screen Mirroring Prompt */}
      {shareRequested && (
        <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 animate-pulse">
              <Lucide.Monitor size={32} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Allow Mirroring</h3>
              <p className="text-slate-400 text-sm leading-relaxed">The instructor wants to view your screen to guide you. No files or personal data will be collected.</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  setShareRequested(false);
                  await updateDoc(doc(firestore, 'remote_support', session.id), {
                    screenShareRequested: false,
                    screenShareStatus: 'failed'
                  });
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={handleAcceptShare}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The Virtual Pointer */}
      {pointer && (
        <motion.div
          animate={{ 
            x: (pointer.x * window.innerWidth) / 100, 
            y: (pointer.y * window.innerHeight) / 100 
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
          className="fixed top-0 left-0 w-12 h-12 pointer-events-none z-[10000]"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50"></div>
            <div className="w-6 h-6 bg-red-500 rounded-full border-4 border-white shadow-2xl flex items-center justify-center">
               <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
            <div className="absolute top-8 left-8 bg-black/80 text-white text-[10px] px-2 py-1 rounded-lg border border-white/10 whitespace-nowrap font-bold">
              ADMIN POINTER
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

// Reconstitute Firestore Timestamps recursively from cached JSON objects
function reconstituteTimestamps(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(reconstituteTimestamps);
  }
  if (
    typeof obj.seconds === 'number' &&
    typeof obj.nanoseconds === 'number' &&
    Object.keys(obj).length === 2
  ) {
    return {
      seconds: obj.seconds,
      nanoseconds: obj.nanoseconds,
      toDate() {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
      }
    };
  }
  const reconstituted: any = {};
  for (const key of Object.keys(obj)) {
    reconstituted[key] = reconstituteTimestamps(obj[key]);
  }
  return reconstituted;
}

// Helper to cache data in LocalStorage with TTL (Time-to-Live)
function getCachedData<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(`fs_cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > ttlMs) {
      localStorage.removeItem(`fs_cache_${key}`);
      return null;
    }
    return reconstituteTimestamps(parsed.data) as T;
  } catch (e) {
    console.warn(`Cache read error for ${key}:`, e);
    return null;
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`fs_cache_${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.warn(`Cache write error for ${key}:`, e);
  }
}

function ParentPinGate({ parentPin, onCorrectPin, onBack, language }: { parentPin: string; onCorrectPin: () => void; onBack: () => void; language: 'en' | 'or' }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const verifyPin = () => {
    if (pin === parentPin) {
      onCorrectPin();
    } else {
      setError(language === 'en' ? 'Incorrect PIN' : 'ଭୁଲ୍ PIN');
      setPin('');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950/20 backdrop-blur-md relative min-h-[calc(100vh-80px)]">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900/80 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm text-center shadow-2xl relative z-10 backdrop-blur-xl"
      >
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
        >
          <Lucide.ArrowLeft size={16} />
          {language === 'en' ? 'Back' : 'ପଛକୁ'}
        </button>

        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6 mt-4 shadow-inner">
          <Lucide.Lock size={32} />
        </div>
        
        <h3 className="text-2xl font-black text-white mb-2">
          {language === 'en' ? 'Parent Insights Lock' : 'ପିତାମାତା ଇନସାଇଟ୍ସ ଲକ୍'}
        </h3>
        <p className="text-slate-400 mb-6 text-xs font-semibold">
          {language === 'en' ? 'Enter the 4-digit parent security PIN to view analytics.' : 'ଆନାଲିଟିକ୍ସ ଦେଖିବା ପାଇଁ ୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିତାମାତା ସୁରକ୍ଷା PIN ଦିଅନ୍ତୁ ।'}
        </p>
        
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                pin.length > i 
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : 'border-white/10 bg-white/5 text-slate-500'
              }`}
            >
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {error && <p className="text-rose-500 text-xs font-bold mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') {
                  setPin('');
                  setError('');
                } else if (btn === 'OK') {
                  verifyPin();
                } else {
                  setError('');
                  if (pin.length < 4) {
                    setPin(prev => prev + btn);
                  }
                }
              }}
              className={`py-4 rounded-xl text-white font-extrabold transition-all duration-150 ${
                btn === 'OK' 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' 
                  : btn === 'C'
                  ? 'bg-white/5 hover:bg-white/10 text-rose-400'
                  : 'bg-white/5 hover:bg-white/10 hover:scale-[1.02]'
              }`}
            >
              {btn}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<Student | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sundayBypassed, setSundayBypassed] = useState(false);
  const [showSundayLockout, setShowSundayLockout] = useState(false);
  const resetPageScroll = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '').split('/')[0];
    return hash || localStorage.getItem('activeTab') || 'dashboard';
  });
  const [showShowcaseOnly, setShowShowcaseOnly] = useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('showcase') === 'true' || window.location.hash === '#pitch_deck';
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('showcase') === 'true' || window.location.hash === '#pitch_deck') {
      localStorage.setItem('showcase_mode', 'true');
    }

    (window as any)._onLaunchShowcase = () => {
      setShowShowcaseOnly(true);
    };
    return () => {
      delete (window as any)._onLaunchShowcase;
    };
  }, []);

  const showShowcaseTab = (() => {
    if (typeof window === 'undefined') return false;
    const isShowcaseActive = window.location.search.includes('showcase=true') || 
                             window.location.search.includes('judge=true') || 
                             window.location.search.includes('judgestatus=true') || 
                             window.location.hash.includes('judge') ||
                             window.location.hash === '#pitch_deck' ||
                             localStorage.getItem('showcase_mode') === 'true';
    if (isShowcaseActive) {
      localStorage.setItem('showcase_mode', 'true');
    }
    return isShowcaseActive;
  })();

  const [lastTab, setLastTab] = useState('dashboard');
  const [isRegisteredForTestSeries, setIsRegisteredForTestSeries] = useState(false);
  const [openTutorInVoiceMode, setOpenTutorInVoiceMode] = useState(0);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [showLaunchPoster, setShowLaunchPoster] = useState(false);
  const [isParentUnlocked, setIsParentUnlocked] = useState(false);

  useEffect(() => {
    if (activeTab !== 'parent_dashboard') {
      setIsParentUnlocked(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      const isTourActive = sessionStorage.getItem('judge_tour_active') === 'true';
      if (isTourActive) {
        const step = parseInt(sessionStorage.getItem('judge_tour_step') || '1', 10);
        setTourStep(step);
        
        // Sync active tab for tour step on load/reload
        if (step === 1 || step === 2 || step === 3) {
          setActiveTab('dashboard');
        } else if (step === 4) {
          setActiveTab('digital_library');
        } else if (step === 5) {
          setActiveTab('syllabus_tracker');
        } else if (step === 6) {
          setActiveTab('leaderboard');
        } else if (step === 7) {
          setActiveTab('parent_dashboard');
        } else if (step === 8) {
          setActiveTab('pitch_deck');
        } else if (step === 9) {
          setActiveTab('telemetry');
        }

        // Sync poster visibility
        if (step === 2) {
          setShowLaunchPoster(false); handleGunduluGreeting();
        } else {
          setShowLaunchPoster(false);
        }
      } else {
        setTourStep(null);
        // Automatically show Raja Festival poster for regular students on login (once per day, until 16th June 2026)
        if (user.role !== 'teacher') {
          const today = new Date();
          const limitDate = new Date('2026-06-16T23:59:59');
          if (today <= limitDate) {
            const todayStr = today.toLocaleDateString('en-CA');
            const lastSeen = localStorage.getItem('rajaFestivalLastSeenDate');
            if (lastSeen !== todayStr) {
              setShowLaunchPoster(false); handleGunduluGreeting();
            }
          }
        }
      }
    } else {
      setTourStep(null);
    }
  }, [user]);

  const handleTourStepChange = (nextStep: number) => {
    sessionStorage.setItem('judge_tour_step', String(nextStep));
    setTourStep(nextStep);

    // If they move past step 2, mark Raja poster as seen today to prevent auto-popping on future user snapshot updates
    if (nextStep !== 2) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      localStorage.setItem('rajaFestivalLastSeenDate', todayStr);
    }

    if (nextStep === 1) {
      setActiveTab('dashboard');
      setShowLaunchPoster(false);
    } else if (nextStep === 2) {
      setActiveTab('dashboard');
      setShowLaunchPoster(false);
    } else if (nextStep === 3) {
      setActiveTab('dashboard');
      setShowLaunchPoster(false);
    } else if (nextStep === 4) {
      setActiveTab('digital_library');
      setShowLaunchPoster(false);
    } else if (nextStep === 5) {
      setActiveTab('syllabus_tracker');
      setShowLaunchPoster(false);
    } else if (nextStep === 6) {
      setActiveTab('leaderboard');
      setShowLaunchPoster(false);
    } else if (nextStep === 7) {
      setActiveTab('parent_dashboard');
      setShowLaunchPoster(false);
    } else if (nextStep === 8) {
      setActiveTab('pitch_deck');
      setShowLaunchPoster(false);
    } else if (nextStep === 9) {
      setActiveTab('telemetry');
      setShowLaunchPoster(false);
    }
  };

  const handleEndTour = () => {
    sessionStorage.removeItem('judge_tour_active');
    sessionStorage.removeItem('judge_tour_step');
    setTourStep(null);
    setShowLaunchPoster(false);
    setActiveTab('dashboard');
    
    // Mark Raja poster as seen today so it doesn't pop up after ending the tour
    const todayStr = new Date().toLocaleDateString('en-CA');
    localStorage.setItem('rajaFestivalLastSeenDate', todayStr);
  };
  const [supportSession, setSupportSession] = useState<any>(null);
  const [confirmSupport, setConfirmSupport] = useState(false);
  const confirmTimeoutRef = useRef<any>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'daybreak';
  });

  useEffect(() => {
    setLastTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    document.body.classList.remove('theme-slate', 'theme-forest', 'theme-navy', 'theme-daybreak');
    if (!user) {
      document.body.classList.add('theme-slate');
    } else {
      document.body.classList.add(`theme-${theme}`);
    }
  }, [theme, user]);

  // Clean up confirmation timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  // Active Study Time Tracker — FIX #7
  // Accumulates minutes locally and flushes to Firestore every 5 minutes
  // instead of every 60 seconds, reducing writes by 5× at scale.
  // UI state is still updated every minute so the display stays live.
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    let isActive = !document.hidden;
    // Buffer unsynced minutes locally; flushed every SYNC_EVERY ticks
    let localBuffer = 0;
    const SYNC_EVERY = 5; // minutes between Firestore writes

    const handleVisibilityChange = () => {
      isActive = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(async () => {
      if (!isActive) return;

      localBuffer += 1;

      // Always update local UI state so the displayed counter stays current
      setUser(prev => prev ? { ...prev, totalStudyMinutes: (prev.totalStudyMinutes || 0) + 1 } : prev);

      // Only write to Firestore every SYNC_EVERY minutes
      if (localBuffer < SYNC_EVERY) return;

      const minutesToFlush = localBuffer;
      localBuffer = 0;

      try {
        const userRef = doc(firestore, 'users', user.id);
        await updateDoc(userRef, {
          totalStudyMinutes: increment(minutesToFlush)
        });
        try {
          const pubRef = doc(firestore, 'public_profiles', user.id);
          await setDoc(pubRef, {
            totalStudyMinutes: increment(minutesToFlush)
          }, { merge: true });
        } catch (pubErr) {
          console.warn("Failed to sync study time to public_profiles:", pubErr);
        }
      } catch (error) {
        // Return unsynced minutes to the buffer so they are not lost
        localBuffer += minutesToFlush;
        console.error("Failed to sync study time:", error);
      }
    }, 60000); // tick every 1 minute; write every 5 ticks

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user?.id, user?.role]);

  // Offline Submission Queue Drain — FIX #2 companion
  // Drains any test submissions that failed due to network drops during exam.
  // Runs on mount and whenever the device comes back online.
  useEffect(() => {
    if (!user) return;

    const drainOfflineQueue = async () => {
      if (!navigator.onLine) return;
      let raw: string | null = null;
      try { raw = localStorage.getItem('offline_submission_queue'); } catch (e) { return; }
      if (!raw) return;
      let queue: any[] = [];
      try { queue = JSON.parse(raw); } catch (e) { return; }
      if (!queue.length) return;

      const remaining: any[] = [];
      let drainedCount = 0;

      for (const payload of queue) {
        // Only drain submissions belonging to the current user
        if (payload.userId !== user.id) {
          remaining.push(payload);
          continue;
        }
        try {
          const { _submittedAt, _offlineQueued, ...data } = payload;
          await addDoc(collection(firestore, 'monthly_test_submissions'), {
            ...data,
            submittedAt: serverTimestamp(),
            _offlineQueued: true,
            _originalSubmitTime: _submittedAt || new Date().toISOString()
          });
          drainedCount++;
        } catch (e) {
          remaining.push(payload); // keep failed ones for next attempt
        }
      }

      try { localStorage.setItem('offline_submission_queue', JSON.stringify(remaining)); } catch (e) { /* ignore */ }

      if (drainedCount > 0) {
        console.log(`[OfflineQueue] Drained ${drainedCount} queued submission(s)`);
        // Refresh submission list after draining
        if (typeof (window as any).loadTestSubmissions === 'function') {
          (window as any).loadTestSubmissions();
        }
      }
    };

    window.addEventListener('online', drainOfflineQueue);
    drainOfflineQueue(); // Also try immediately on load

    return () => window.removeEventListener('online', drainOfflineQueue);
  }, [user?.id]);

  // Offline MCQ Submission Queue Drain — Phase 3 Resiliency
  // Drains any daily MCQ challenges completed while offline.
  // Runs on mount and whenever the device comes back online.
  useEffect(() => {
    if (!user) return;

    const drainOfflineMcqQueue = async () => {
      if (!navigator.onLine) return;
      let raw: string | null = null;
      try { raw = localStorage.getItem('offline_mcq_queue'); } catch (e) { return; }
      if (!raw) return;
      let queue: any[] = [];
      try { queue = JSON.parse(raw); } catch (e) { return; }
      if (!queue.length) return;

      const remaining: any[] = [];
      let drainedCount = 0;

      for (const payload of queue) {
        if (payload.userId !== user.id) {
          remaining.push(payload);
          continue;
        }
        try {
          const submissionRef = doc(firestore, 'daily_mcq_submissions', `${user.id}_${payload.mcqId}`);
          const userRef = doc(firestore, 'users', user.id);
          const progressRef = doc(collection(firestore, 'user_progress'));

          await runTransaction(firestore, async (transaction) => {
            const existingSubmission = await transaction.get(submissionRef);
            if (existingSubmission.exists()) {
              return; // Already submitted, skip
            }

            const userSnap = await transaction.get(userRef);
            const currentPoints = userSnap.exists() ? Math.floor(Number(userSnap.data().points || 0)) : 0;
            const currentPointsToday = userSnap.exists() ? Math.floor(Number((userSnap.data() as any).points_today || 0)) : 0;

            const { queuedAt, ...data } = payload;
            transaction.set(submissionRef, {
              ...data,
              submittedAt: serverTimestamp(),
              _offlineSynced: true,
              _originalSubmitTime: queuedAt || new Date().toISOString()
            });

            transaction.set(userRef, {
              points: currentPoints + Math.floor(payload.totalPointsEarned),
              points_today: currentPointsToday + Math.floor(payload.totalPointsEarned),
              updatedAt: serverTimestamp(),
            }, { merge: true });

            transaction.set(progressRef, {
              userId: user.id,
              date: payload.submittedDate,
              pointsEarned: payload.totalPointsEarned,
              type: 'daily_mcq',
              referenceId: payload.mcqId,
              correctCount: payload.correctCount,
              totalQuestions: payload.totalQuestions,
              createdAt: serverTimestamp(),
            });
          });

          drainedCount++;
        } catch (e) {
          remaining.push(payload); // keep failed ones for next attempt
        }
      }

      try { localStorage.setItem('offline_mcq_queue', JSON.stringify(remaining)); } catch (e) { /* ignore */ }

      if (drainedCount > 0) {
        console.log(`[OfflineMcqQueue] Drained ${drainedCount} daily MCQ submission(s)`);
        try {
          localStorage.removeItem(`fs_cache_mcq_subs_${user.id}`);
        } catch (e) { /* ignore */ }
      }
    };

    window.addEventListener('online', drainOfflineMcqQueue);
    drainOfflineMcqQueue(); // Try immediately on load

    return () => window.removeEventListener('online', drainOfflineMcqQueue);
  }, [user?.id]);

  // Support Session Cleanup
  useEffect(() => {
    const saved = sessionStorage.getItem('supportSession');
    if (saved) setSupportSession(JSON.parse(saved));
  }, []);

  const startSupport = async () => {
    if (!user) return;
    try {
      const code = await createSupportSession(user.id, user.name);
      const session = { id: code, studentUid: user.id };
      setSupportSession(session);
      sessionStorage.setItem('supportSession', JSON.stringify(session));
    } catch (err) {
      console.error("Failed to start support", err);
      alert("Failed to initiate support session. Please try again.");
    }
  };

  const handleSupportClick = () => {
    playClickSound();
    if (vibrate) vibrate(40);

    if (!confirmSupport) {
      setConfirmSupport(true);
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmSupport(false);
      }, 5000); // 5 seconds reset timeout
    } else {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
      setConfirmSupport(false);
      startSupport();
    }
  };

  const endSupport = async () => {
    if (supportSession) {
      try {
        const sessionDoc = doc(firestore, 'remote_support', supportSession.id);
        await deleteDoc(sessionDoc);
      } catch (err) {
        console.error("Error deleting support session document", err);
      }
      setSupportSession(null);
      sessionStorage.removeItem('supportSession');
    }
  };

  const handleUpgradeClick = () => {
    setActiveTab('plans');
    setSidebarOpen(false);
  };

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    resetPageScroll();

    const handlePageRestore = () => {
      requestAnimationFrame(() => resetPageScroll());
    };

    window.addEventListener('pageshow', handlePageRestore);
    return () => {
      window.removeEventListener('pageshow', handlePageRestore);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
    // Sync hash with activeTab if it's not a sub-path
    const currentHash = window.location.hash.replace('#', '').split('/')[0];
    console.log("Debug: activeTab useEffect:", { activeTab, currentHash });
    if (currentHash !== activeTab) {
      window.location.hash = activeTab;
    }

    // Ensure each tab opens from top, especially Study Buddy launched from Dashboard.
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    resetPageScroll();

    // LIVE STATE SYNC: Update active support session with the student's current page/tab!
    if (supportSession?.id) {
      updateDoc(doc(firestore, 'remote_support', supportSession.id), {
        currentPage: activeTab,
        lastActivityTimestamp: Date.now()
      }).catch(err => console.warn("PWA activeTab sync error:", err));
    }
  }, [activeTab, supportSession?.id]);

  // LIVE STATE SYNC: Throttled scroll percentage sync to conserve mobile data
  useEffect(() => {
    if (!supportSession?.id) return;

    let lastSync = 0;
    const handleScroll = (e: any) => {
      const now = Date.now();
      if (now - lastSync < 1000) return; // Sync at most once per second to conserve data
      
      const target = e.target === document ? document.documentElement : e.target;
      if (!target) return;

      const scrollTop = target.scrollTop || window.scrollY || 0;
      const scrollHeight = target.scrollHeight || document.documentElement.scrollHeight || 1;
      const clientHeight = target.clientHeight || window.innerHeight || 1;
      
      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)));

      lastSync = now;
      updateDoc(doc(firestore, 'remote_support', supportSession.id), {
        scrollPct: pct,
        lastActivityTimestamp: Date.now()
      }).catch(err => console.warn("PWA scroll sync error:", err));
    };

    const scrollContainer = contentScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [supportSession?.id, contentScrollRef.current]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').split('/')[0];
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  useEffect(() => {
    const handleTabChange = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('changeTab', handleTabChange);
    return () => window.removeEventListener('changeTab', handleTabChange);
  }, []);

  const [language, _setLanguage] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'en');
  const languageRef = useRef(language);
  const setLanguage = async (lang: 'en' | 'or') => {
    languageRef.current = lang;
    _setLanguage(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    if (user?.id) {
      try {
        await updateDoc(doc(firestore, 'users', user.id), { preferred_language: lang });
      } catch (e) {
        console.error("Failed to update preferred language", e);
      }
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isRetryingConnection, setIsRetryingConnection] = useState(false);
  const [tutorExplanations, setTutorExplanations] = useState<Record<string, string>>({});
  const [tutorLoading, setTutorLoading] = useState<Record<string, boolean>>({});
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showConfigError, setShowConfigError] = useState<{title: string, message: string} | null>(null);
  // Hiding the launch celebration event for now. Change to: () => !localStorage.getItem('utkalPlayStoreLaunchSeen') to enable it when live.
  const [showLaunchEvent, setShowLaunchEvent] = useState(false);
  const [showTestSeriesPoster, setShowTestSeriesPoster] = useState(false);
  const [showLibraryPopup, setShowLibraryPopup] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showCommunityChat, setShowCommunityChat] = useState(false);
  
  const handleGunduluGreeting = () => {
    // Logic to trigger Gundulu greeting
    window.dispatchEvent(new CustomEvent('startGunduluGreeting'));
  };
  
  // Auth State
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  
  // Switching Sibling Saved Accounts with PIN
  const [showSetPinPrompt, setShowSetPinPrompt] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');

  useEffect(() => {
    const isJudge = window.location.search.includes('judge') || window.location.hash.includes('judge') || window.location.search.includes('showcase') || (typeof tourStep !== 'undefined' && tourStep) || (user && (user.phoneNumber === '+911234567890' || user.phoneNumber === '1234567890'));
    if (user && user.role === 'student' && !user.pin && !user.parent_pin && sessionStorage.getItem('set_pin_prompt_dismissed') !== 'true' && !isJudge) {
      setShowSetPinPrompt(true);
    } else {
      setShowSetPinPrompt(false);
    }
  }, [user]);

  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [showResetPasswordButton, setShowResetPasswordButton] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [regData, _setRegData] = useState({ 
    name: '',
    email: '',
    class: '' as string, 
    board: '', 
    subjects: [] as string[],
    preferred_language: 'or',
    role: 'student' as string
  });
  const regDataRef = useRef(regData);
  const setRegData = (data: any) => {
    regDataRef.current = data;
    _setRegData(data);
  };

  // Data State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [monthlyTests, setMonthlyTests] = useState<MonthlyTest[]>([]);
  const [dailyMcqs, setDailyMcqs] = useState<DailyMcq[]>([]);
  const [dailyMcqSubmissions, setDailyMcqSubmissions] = useState<DailyMcqSubmission[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<MonthlyTestSubmission[]>([]);

  const [activeTest, setActiveTest] = useState<MonthlyTest | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [studentNotifications, setStudentNotifications] = useState<any[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('read_notification_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newNotification, setNewNotification] = useState<any>(null);
  const lastNotifIdRef = useRef<string | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({
    monthlyPrice: 99,
    yearlyPrice: 999,
    dailyMcqSubjectRotation: ['math', 'english', 'science', 'odia', 'social']
  });

  const loadChapters = useCallback(async (classStr?: string) => {
    if (!user) return;
    const targetClass = classStr || user.class || '10';
    const chaptersCacheKey = `chapters_${user.role}_${targetClass}_${user.board || 'all'}`;
    const cached = getCachedData<Chapter[]>(chaptersCacheKey, 1800000); // 30 mins
    if (cached) {
      setChapters(cached);
      return;
    }
    try {
      let chaptersQuery: Query<DocumentData>;
      const classDigits = targetClass.replace(/\D/g, '');
      if (classDigits) {
        const classVariants = [
          `class${classDigits}`,
          `class ${classDigits}`,
          classDigits
        ];
        chaptersQuery = query(
          collection(firestore, 'chapters'),
          where('status', '==', 'published'),
          where('class', 'in', classVariants)
        );
      } else {
        chaptersQuery = query(
          collection(firestore, 'chapters'),
          where('status', '==', 'published'),
          where('class', '==', targetClass)
        );
      }
      
      const snapshot = await getDocs(chaptersQuery);
      const allDataRaw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const allData: Chapter[] = [];
      allDataRaw.forEach((d: any) => {
        if (d.isParentTextbook && Array.isArray(d.chaptersList)) {
          d.chaptersList.forEach((ch: any) => {
            allData.push({
              id: `${d.id}_ch${ch.number}`,
              class: d.class,
              subject: d.subject,
              title: ch.title,
              pdfUrl: ch.pdfUrl,
              notes: ch.notes,
              status: d.status,
              isLibraryChapter: true,
              updatedAt: d.updatedAt
            } as any);
          });
        } else {
          allData.push(d as Chapter);
        }
      });
      const data = allData.filter(c => {
        if ((c as any).isLibraryChapter || (c as any).pdfUrl) return true;
        const userBoardRaw = user?.board || '';
        const userBoard = (userBoardRaw === 'undefined' ? '' : userBoardRaw).toLowerCase();
        let chapterBoardStr = '';
        if (typeof c.board === 'string') {
          chapterBoardStr = c.board.toLowerCase();
        } else if (c.board && typeof c.board === 'object') {
          chapterBoardStr = ((c.board as any).en || (c.board as any).or || '').toLowerCase();
        }
        const matchesBoard = !userBoard || chapterBoardStr.includes(userBoard) || userBoard.includes(chapterBoardStr);
        return matchesBoard;
      });
      setChapters(data);
      setCachedData(chaptersCacheKey, data);
    } catch (err) {
      console.warn("Failed to load chapters from Firestore. Using static mock chapters for offline fallback.", err);
      setIsOfflineMode(true);
      const mockChapters: Chapter[] = [
        {
          id: "mock_math_ch1",
          title: "ଦ୍ୱିଘାତ ସମୀକରଣ (Quadratic Equations)",
          class: targetClass,
          subject: "Mathematics",
          notes: "ଦ୍ୱିଘାତ ସମୀକରଣର ସାଧାରଣ ରୂପ ହେଲା ax^2 + bx + c = 0. ଏହାର ଦୁଇଟି ବୀଜ ଥାଏ। b^2 - 4ac ହେଲା ଏହାର ପ୍ରଭେଦକ।",
          status: "published"
        } as any,
        {
          id: "mock_sci_ch1",
          title: "ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା ଏବଂ ସମୀକରଣ (Chemical Reactions)",
          class: targetClass,
          subject: "Science",
          notes: "ଯେଉଁ ପ୍ରକ୍ରିୟାରେ ପ୍ରତିକାରକ ଗୁଡିକ ମଧ୍ୟରେ ପ୍ରତିକ୍ରିୟା ଘଟି ନୂତନ ପଦାର୍ଥ ସୃଷ୍ଟି ହୁଏ, ତାହାକୁ ରାସาୟନିକ ପ୍ରତିକ୍ରିୟା କୁହାଯାଏ।",
          status: "published"
        } as any
      ];
      setChapters(mockChapters);
    }
  }, [user?.id, user?.class, user?.role, user?.board]);

  const loadLeaderboard = useCallback(async () => {
    if (!user) return;
    const cacheKey = `leaderboard_${user.class || 'global'}`;
    const cached = getCachedData<any[]>(cacheKey, 300000); // 5 mins
    if (cached) {
      setLeaderboard(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(
        collection(firestore, 'public_profiles'),
        where('class', '==', user.class),
        orderBy('points', 'desc'),
        limit(100)
      ));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const testingNumbers = ['9556086560', '+919556086560', '6370487877', '+916370487877', '9337956168', '+919337956168', '8926118509', '+918926118509', '8457811227', '+918457811227', '7735118243', '+917735118243'];
      const filteredData = data.filter((s: any) => !testingNumbers.includes(s.phoneNumber));
      setLeaderboard(filteredData);
      setCachedData(cacheKey, filteredData);
    } catch (err) {
      console.warn("Class-wise leaderboard query failed (composite index class + points might be missing), falling back to global query:", err);
      try {
        const snapshot = await getDocs(query(
          collection(firestore, 'public_profiles'),
          orderBy('points', 'desc'),
          limit(100)
        ));
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const testingNumbers = ['9556086560', '+919556086560', '6370487877', '+916370487877', '9337956168', '+919337956168', '8926118509', '+918926118509', '8457811227', '+918457811227', '7735118243', '+917735118243'];
        const filteredData = data.filter((s: any) => !testingNumbers.includes(s.phoneNumber));
        setLeaderboard(filteredData);
        setCachedData(cacheKey, filteredData);
      } catch (err2) {
        console.warn("Failed to load leaderboard. Using mock leaderboard data.", err2);
        setIsOfflineMode(true);
        const mockLeaderboard = [
          { name: "Anuradha Panda", points: 850, class: user.class, avatar: "/gundulu-pointing-nobg.png" },
          { name: "Siddharth Dash", points: 720, class: user.class, avatar: "/gundulu-pointing-nobg.png" },
          { name: "Priyanka Sahoo", points: 610, class: user.class, avatar: "/gundulu-pointing-nobg.png" }
        ];
        setLeaderboard(mockLeaderboard);
      }
    }
  }, [user?.id, user?.class]);

  const loadMonthlyTests = useCallback(async () => {
    if (!user) return;
    const cacheKey = 'monthly_tests';
    const cached = getCachedData<MonthlyTest[]>(cacheKey, 900000); // 15 mins
    if (cached) {
      setMonthlyTests(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'monthly_tests'), where('status', '==', 'published')));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MonthlyTest[];
      setMonthlyTests(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      console.warn("Failed to load monthly tests. Using mock test.", err);
      setIsOfflineMode(true);
      const mockTests: MonthlyTest[] = [
        {
          id: "mock_test_1",
          title: "ମାସିକ ଗଣିତ ପରୀକ୍ଷା - ଜୁନ୍ ୨୦୨୬",
          status: "published",
          questions: [
            {
              question: "2x^2 - 5x + 3 = 0 ସମୀକରଣର ବୀଜଦ୍ୱୟର ଯୋଗଫଳ କେତେ?",
              options: ["5/2", "3/2", "-5/2", "1"],
              correctOption: 0
            }
          ]
        } as any
      ];
      setMonthlyTests(mockTests);
    }
  }, [user?.id]);

  const loadDailyMcqs = useCallback(async () => {
    if (!user) return;
    const todayRaw = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const today = todayRaw.replace(/\//g, '-').trim();
    const cacheKey = `daily_mcqs_${user.role}_${user.class || 'all'}_${today}`;
    const cached = getCachedData<DailyMcq[]>(cacheKey, 1800000); // 30 mins
    if (cached && cached.length > 0) {
      setDailyMcqs(cached);
      return;
    }
    try {
      const dailyMcqsQuery = user.role === 'admin'
        ? collection(firestore, 'daily_mcqs')
        : query(collection(firestore, 'daily_mcqs'), where('activeDate', '==', today));
      const snapshot = await getDocs(dailyMcqsQuery);
      const normalizedUserClass = String(user.class || '').toLowerCase();
      const shortUserClass = normalizedUserClass.replace('class', '').trim();
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((mcq: any) => {
          const mcqClass = String(mcq.class || '').toLowerCase().trim();
          const mcqDate = String(mcq.activeDate || '').replace(/\//g, '-').trim();
          const mcqStatus = String(mcq.status || '').toLowerCase().trim();
          const matchesClass = user.role === 'admin' || 
                              mcqClass === normalizedUserClass || 
                              mcqClass === shortUserClass || 
                              mcqClass === `class${shortUserClass}` ||
                              mcqClass.includes(shortUserClass);
          const matchesToday = user.role === 'admin' || mcqDate === today;
          const matchesStatus = user.role === 'admin' || mcqStatus === 'published';
          return matchesClass && matchesToday && matchesStatus;
        })
        .sort((left: any, right: any) => {
          const leftDate = new Date(left.activeDate || 0).getTime();
          const rightDate = new Date(right.activeDate || 0).getTime();
          return rightDate - leftDate;
        }) as DailyMcq[];
      
      if (data.length > 0) {
        setDailyMcqs(data);
        setCachedData(cacheKey, data);
      } else {
        throw new Error('NO_MCQ_FOUND');
      }
    } catch (err) {
      console.warn("Failed to load MCQs from Firestore.", err);
      setIsOfflineMode(true);
      setDailyMcqs([]);
    }
  }, [user?.id, user?.class, user?.role]);

  const loadTestSubmissions = useCallback(async () => {
    if (!user) return;
    const cacheKey = `test_subs_${user.id}`;
    const cached = getCachedData<MonthlyTestSubmission[]>(cacheKey, 600000); // 10 mins
    if (cached) {
      setTestSubmissions(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'monthly_test_submissions'), where('userId', '==', user.id)));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MonthlyTestSubmission[];
      setTestSubmissions(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'monthly_test_submissions');
    }
  }, [user?.id]);

  const loadDailyMcqSubmissions = useCallback(async () => {
    if (!user) return;
    const cacheKey = `mcq_subs_${user.id}`;
    const cached = getCachedData<DailyMcqSubmission[]>(cacheKey, 600000); // 10 mins
    if (cached) {
      setDailyMcqSubmissions(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'daily_mcq_submissions'), where('userId', '==', user.id)));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as DailyMcqSubmission[];
      setDailyMcqSubmissions(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'daily_mcq_submissions');
    }
  }, [user?.id]);

  const loadTextbooks = useCallback(async () => {
    if (!user) return;
    const cacheKey = 'textbooks_v2';
    const cached = getCachedData<Textbook[]>(cacheKey, 1800000); // 30 mins
    if (cached) {
      setTextbooks(cached);
      return;
    }
    try {
      const snapshot = await getDocs(collection(firestore, 'textbooks'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Textbook[];
      setTextbooks(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'textbooks');
    }
  }, [user?.id]);

  const loadDailyChallenge = useCallback(async () => {
    if (!user) return;
    const todayRaw = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const today = todayRaw.replace(/\//g, '-').trim();
    const cacheKey = `daily_challenge_${today}`;
    const cached = getCachedData<any>(cacheKey, 1800000); // 30 mins
    if (cached) {
      setDailyChallenge(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'daily_challenges'), where('date', '==', today)));
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setDailyChallenge(data);
        setCachedData(cacheKey, data);
      } else {
        setDailyChallenge(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'daily_challenges');
    }
  }, [user?.id]);

  const loadUserProgress = useCallback(async () => {
    if (!user) return;
    const cacheKey = `user_progress_${user.id}`;
    const cached = getCachedData<any[]>(cacheKey, 300000); // 5 mins
    if (cached) {
      setUserProgress(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'user_progress'), where('userId', '==', user.id), orderBy('date', 'desc'), limit(30)));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setUserProgress(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'user_progress');
    }
  }, [user?.id]);

  const loadFollowing = useCallback(async () => {
    if (!user) return;
    const cacheKey = `following_${user.id}`;
    const cached = getCachedData<string[]>(cacheKey, 1800000); // 30 mins
    if (cached) {
      setFollowing(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'friendships'), where('followerId', '==', user.id)));
      const data = snapshot.docs.map(d => (d.data() as any).followingId);
      setFollowing(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'friendships');
    }
  }, [user?.id]);

  const handleToggleFollow = async (targetUserId: string) => {
    if (!user) return;
    const isFollowing = following.includes(targetUserId);
    try {
      if (isFollowing) {
        // Unfollow
        const q = query(
          collection(firestore, 'friendships'),
          where('followerId', '==', user.id),
          where('followingId', '==', targetUserId)
        );
        const snap = await getDocs(q);
        for (const doc of snap.docs) {
          await deleteDoc(doc.ref);
        }
        setFollowing(prev => prev.filter(id => id !== targetUserId));
      } else {
        // Follow
        await addDoc(collection(firestore, 'friendships'), {
          followerId: user.id,
          followingId: targetUserId,
          createdAt: new Date().toISOString()
        });
        setFollowing(prev => [...prev, targetUserId]);
      }
      
      // Update cache
      const cacheKey = `following_${user.id}`;
      const updatedFollowing = isFollowing 
        ? following.filter(id => id !== targetUserId)
        : [...following, targetUserId];
      setCachedData(cacheKey, updatedFollowing);
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
    }
  };

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const cacheKey = `notifications_${user.role}_${isPremium}`;
    const cached = getCachedData<any[]>(cacheKey, 300000); // 5 mins
    if (cached) {
      setStudentNotifications(cached);
      return;
    }
    try {
      const snapshot = await getDocs(query(collection(firestore, 'notifications'), orderBy('createdAt', 'desc'), limit(15)));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filteredData = data.filter((n: any) => {
        if (!n.audience || n.audience === 'all') return true;
        if (user?.role === 'teacher') return n.audience === 'teachers';
        if (n.audience === 'teachers') return false;
        if (n.audience.startsWith('class')) return user?.class === n.audience;
        if (n.audience === 'students') return true;
        if (n.audience === 'premium') return Boolean(isPremium);
        if (n.audience === 'free') return !isPremium;
        return true;
      });
      if (filteredData.length > 0) {
        const latest = filteredData[0];
        if (lastNotifIdRef.current && lastNotifIdRef.current !== latest.id) {
          setNewNotification(latest);
          setTimeout(() => setNewNotification(null), 10000);
        }
        lastNotifIdRef.current = latest.id;
      }
      setStudentNotifications(filteredData);
      setCachedData(cacheKey, filteredData);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'notifications');
    }
  }, [user?.id, user?.role, isPremium]);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(firestore, 'test', 'connection'));
      } catch (error: any) {
        // Ignore permission errors as this is just a connection test
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        } else if (error.message?.includes('Missing or insufficient permissions')) {
          console.log("Connection test failed due to permissions, which is expected for the test collection.");
        }
      }
    };
    testConnection();
  }, []);

  // Android Back Button PopState Interception
  useEffect(() => {
    const modalsOpen = showChatbot || isSidebarOpen || showInstallModal || activeTest !== null || selectedChapter !== null;
    if (modalsOpen) {
      window.history.pushState({ modalOpen: true }, '');
    }
  }, [showChatbot, isSidebarOpen, showInstallModal, activeTest, selectedChapter]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const modalsOpen = showChatbot || isSidebarOpen || showInstallModal || activeTest !== null || selectedChapter !== null;
      if (modalsOpen) {
        setShowChatbot(false);
        setSidebarOpen(false);
        setShowInstallModal(false);
        setActiveTest(null);
        setSelectedChapter(null);
        window.history.pushState(null, '', `#${activeTab}`);
      } else if (activeTab !== 'dashboard') {
        const currentHash = window.location.hash.replace('#', '').split('/')[0];
        if (!currentHash || currentHash === 'dashboard') {
          setActiveTab('dashboard');
          window.history.pushState(null, '', '#dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showChatbot, isSidebarOpen, showInstallModal, activeTest, selectedChapter, activeTab]);

  useEffect(() => {
    if (activeTab === 'notifications' && studentNotifications.length > 0) {
      const allIds = studentNotifications.map(n => n.id).filter(Boolean) as string[];
      const uniqueNewIds = allIds.filter(id => !readNotifIds.includes(id));
      if (uniqueNewIds.length > 0) {
        const updatedIds = [...readNotifIds, ...uniqueNewIds];
        setReadNotifIds(updatedIds);
        localStorage.setItem('read_notification_ids', JSON.stringify(updatedIds));
      }
    }
  }, [activeTab, studentNotifications, readNotifIds]);

  useEffect(() => {
    const handlePrompt = () => {
      setShowInstallBanner(true);
    };
    window.addEventListener('pwa-prompt-available', handlePrompt);
    
    if (getDeferredPrompt()) {
      setShowInstallBanner(true);
      // Auto-show modal only if not dismissed in this session
      if (!sessionStorage.getItem('installModalDismissed')) {
        setShowInstallModal(true);
      }
    }

    return () => window.removeEventListener('pwa-prompt-available', handlePrompt);
  }, []);

  // Periodic background check and manual retry support for recovering online status
  const checkDatabaseConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const pingDocRef = doc(firestore, 'system', 'connectivity_check');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 2000)
      );
      await Promise.race([
        getDoc(pingDocRef),
        timeoutPromise
      ]);
      return true;
    } catch (err) {
      console.warn("[Connectivity Check] Database connection check failed:", err);
      return false;
    }
  }, []);

  const handleManualRetryConnection = async () => {
    setIsRetryingConnection(true);
    const isOnline = await checkDatabaseConnectivity();
    if (isOnline) {
      console.log("[Connectivity Check] Reconnection successful!");
      setIsOfflineMode(false);
      // Reload stats/data to sync
      loadChapters();
      loadDailyMcqs();
      loadLeaderboard();
      loadMonthlyTests();
    } else {
      console.warn("[Connectivity Check] Reconnection failed; database is still unreachable.");
      alert(language === 'en'
        ? "Database is still unreachable. Remaining in offline fallback mode."
        : "ଡାଟାବେସକୁ ସଂଯୋଗ କରାଯାଇପାରିଲା ନାହିଁ। ଅଫ୍‌ଲାଇନ୍ ମୋଡ୍‌ରେ ରଖାଯାଇଛି।");
    }
    setIsRetryingConnection(false);
  };

  // Network connection status listener to automatically recover when returning online
  useEffect(() => {
    const handleOnline = async () => {
      console.log("[Network Status] Browser detected online connection. Verifying database stats...");
      const dbOnline = await checkDatabaseConnectivity();
      if (dbOnline) {
        setIsOfflineMode(false);
        loadChapters();
        loadDailyMcqs();
        loadLeaderboard();
        loadMonthlyTests();
      }
    };

    const handleOffline = () => {
      console.warn("[Network Status] Browser detected offline connection.");
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOfflineMode(true);
    }

    // Periodic check (every 30 seconds) if we are marked offline, to auto-reconnect if firestore recovers
    let intervalId: any = null;
    if (isOfflineMode && typeof navigator !== 'undefined' && navigator.onLine) {
      intervalId = setInterval(async () => {
        console.log("[Periodic Check] Verifying database connectivity to recover from offline mode...");
        const dbOnline = await checkDatabaseConnectivity();
        if (dbOnline) {
          console.log("[Periodic Check] Database connection restored. Reconnecting...");
          setIsOfflineMode(false);
          loadChapters();
          loadDailyMcqs();
          loadLeaderboard();
          loadMonthlyTests();
        }
      }, 30000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [loadChapters, loadDailyMcqs, loadLeaderboard, loadMonthlyTests, checkDatabaseConnectivity, isOfflineMode]);

  const handleInstall = async () => {
    const promptEvent = getDeferredPrompt();
    if (!promptEvent) return;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    clearDeferredPrompt();
    setShowInstallBanner(false);
  };

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', safeJsonStringify(errInfo));
    
    if (errInfo.error.includes('insufficient permissions')) {
      console.warn("Permission denied for path:", path, "Operation:", operationType);
    }
    
    const isOfflineOrConnectionError = 
      errInfo.error.includes('client is offline') || 
      errInfo.error.includes('Could not reach') ||
      errInfo.error.includes('TIMEOUT') ||
      errInfo.error.includes('failed-precondition');

    if (isOfflineOrConnectionError) {
      console.warn(`[Firestore Offline Warning] Operation: ${operationType} on path: ${path} failed/suspended because client is offline or database is unreachable.`);
      setIsOfflineMode(true);
      setLoading(false);
      setIsSendingOtp(false);
      return; // Return instead of throwing to prevent crashing the app
    }
    
    setLoading(false);
    setIsSendingOtp(false);
    
    // Throw error as required by the instructions for diagnosis
    throw new Error(safeJsonStringify(errInfo));
  };

  useEffect(() => {
    // 1. Immediate offline judge session verification for resilience under poor networks
    if (typeof window !== 'undefined' && sessionStorage.getItem('judge_offline_auth_active') === 'true') {
      const offlineRole = sessionStorage.getItem('judge_offline_role') || 'student';
      console.log(`[Offline Resilience] Loading local offline showcase session as: ${offlineRole}`);
      
      const mockUser: Student = {
        id: offlineRole === 'student' ? 'mock_student_uid' : 'mock_teacher_uid',
        name: offlineRole === 'student' ? 'Anuradha Panda' : 'Tiki Apa',
        email: offlineRole === 'student' ? 'student@utkal.edu' : 'teacher@utkal.edu',
        phoneNumber: offlineRole === 'student' ? '1234567890' : '9876543210',
        class: '10',
        board: 'BSE Odisha',
        subjects: [],
        preferred_language: 'or',
        role: offlineRole,
        points: offlineRole === 'student' ? 850 : 0,
        avatar: '/gundulu-pointing-nobg.png',
        streak: offlineRole === 'student' ? 14 : 0,
        district: 'Khordha',
        school: 'Bhubaneswar Govt High School'
      };
      
      setUser(mockUser);
      setIsPremium(true);
      if (offlineRole === 'teacher') {
        setIsAdminView(false);
      }
      
      const currentHash = window.location.hash.replace('#', '');
      const hasJudgeQuery = window.location.search.includes('judge') || window.location.search.includes('showcase');
      if (currentHash === 'judge' || currentHash === 'pitch_deck' || window.location.hash.includes('judge') || window.location.hash.includes('pitch_deck') || hasJudgeQuery) {
        setActiveTab('dashboard');
      }
      setLoading(false);
      return; // Skip normal Firebase Auth state listener initialization
    }

    let unsubUser: (() => void) | undefined;
    let unsubSub: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("onAuthStateChanged: firebaseUser =", firebaseUser);
      
      // Clean up previous listeners if auth state changes
      if (unsubUser) unsubUser();
      if (unsubSub) unsubSub();

      if (firebaseUser) {
        const currentHash = window.location.hash.replace('#', '');
        const hasJudgeQuery = window.location.search.includes('judge') || window.location.search.includes('showcase');
        if (currentHash === 'judge' || currentHash === 'pitch_deck' || window.location.hash.includes('judge') || window.location.hash.includes('pitch_deck') || hasJudgeQuery) {
          setActiveTab('dashboard');
        }
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Student;
            let updatedUser = { ...data, id: docSnap.id };
            console.log("Debug: User data updated:", updatedUser);

            // Cache user metadata in localStorage for switching accounts without SMS OTP costs
            if (updatedUser.id && updatedUser.name) {
              try {
                const rawAccounts = localStorage.getItem('saved_accounts');
                let accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
                if (!Array.isArray(accounts)) accounts = [];
                
                const existingIdx = accounts.findIndex((a: any) => a.uid === updatedUser.id);
                const accountData = {
                  uid: updatedUser.id,
                  name: updatedUser.name,
                  avatar: updatedUser.avatar || '',
                  class: updatedUser.class || '',
                  board: updatedUser.board || '',
                  phoneNumber: updatedUser.phoneNumber || '',
                  role: updatedUser.role || 'student',
                  hasPin: !!(updatedUser.pin || updatedUser.parent_pin)
                };
                
                if (existingIdx >= 0) {
                  accounts[existingIdx] = accountData;
                } else {
                  accounts.push(accountData);
                }
                localStorage.setItem('saved_accounts', JSON.stringify(accounts));
              } catch (e) {
                console.error("Failed to save account to cache:", e);
              }
            }

            // Self-heal points in local state if points_today is higher
            if (updatedUser.points_today && (!updatedUser.points || updatedUser.points < updatedUser.points_today)) {
              updatedUser.points = updatedUser.points_today;
            }

            const isTest = updatedUser.phoneNumber === '+911234567890' || updatedUser.phoneNumber === '1234567890';
            if (isTest) {
              updatedUser = {
                ...updatedUser,
                points: (updatedUser.points && updatedUser.points > 0) ? updatedUser.points : 850,
                streak: (updatedUser.streak && updatedUser.streak > 0) ? updatedUser.streak : 14,
                name: (updatedUser.name && updatedUser.name !== 'Student' && updatedUser.name !== 'Student Achiever') ? updatedUser.name : 'Anuradha Panda',
                district: updatedUser.district || 'Khordha',
                school: updatedUser.school || 'Bhubaneswar Govt High School'
              };
            }
            const isTeacherTest = (updatedUser.phoneNumber === '+919876543210' || updatedUser.phoneNumber === '9876543210') && updatedUser.role !== 'student';
            if (isTeacherTest) {
              updatedUser = {
                ...updatedUser,
                name: (updatedUser.name && updatedUser.name !== 'Educator') ? updatedUser.name : 'Tiki Apa',
                role: updatedUser.role || 'teacher'
              };
            }

            setUser(updatedUser);
            if (data.role === 'admin') {
              setIsAdminView(true);
            }
          }
        }, (err) => {
          const isOfflineOrConnectionError = 
            err?.message?.includes('offline') || 
            err?.message?.includes('Could not reach') ||
            String(err).includes('offline') ||
            String(err).includes('Could not reach');

          if (isOfflineOrConnectionError) {
            console.warn("[Offline Snapshot] Failed to listen to users updates while offline:", err);
          } else {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        });

        try {
          // Initial sync/creation with 2.5s timeout to prevent hanging on offline/unreachable DB
          const userDocTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 2500)
          );
          const userDocSnap = await Promise.race([
            getDoc(userDocRef),
            userDocTimeout
          ]) as any;
          const userEmail = firebaseUser.email?.toLowerCase();
          const userPhone = firebaseUser.phoneNumber;
          const isAdmin = userEmail === 'pandadamayanti01@gmail.com' || 
                          userPhone === '+919337956168' || 
                          userPhone === '9337956168';
          
          if (isAdmin) {
            setIsAdminView(true);
          }

          const isTestAccount = 
            (userEmail && ['gaynapd.ram@gmail.com', 'gyanaloka.panda@gmail.com', 'gyanalpanda@gmail.com'].includes(userEmail)) ||
            (userPhone && [
              '+917735118243', '7735118243', 
              '+919556086560', '9556086560', 
              '+918926118509', '8926118509',
              '+918457811227', '8457811227',
              '+916370487877', '6370487877',
              '+911234567890', '1234567890',
              '+919876543210', '9876543210'
            ].includes(userPhone));

          if (isAdmin || regDataRef.current.role === 'admin' || (userDocSnap.exists() && userDocSnap.data().role === 'admin')) {
            setIsAdminView(true);
          }

          const selectedClass = regDataRef.current.class;
          const selectedBoard = regDataRef.current.board;

          if (!isAdmin && !isTestAccount && regDataRef.current.role !== 'teacher' && regDataRef.current.role !== 'admin') {
            const emailLockId = firebaseUser.email ? `email:${firebaseUser.email.toLowerCase()}` : null;
            let emailLock: any = null;

            if (selectedClass && selectedBoard && emailLockId) {
              const lockTimeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 2500)
              );
              const emailLockDoc = await Promise.race([
                getDoc(doc(firestore, 'user_locks', emailLockId)),
                lockTimeout
              ]) as any;
              if (emailLockDoc.exists()) {
                emailLock = emailLockDoc.data();
              }
            }

            if (userDocSnap.exists()) {
              const dbClass = userDocSnap.data().class;
              const dbBoard = userDocSnap.data().board;
              if (dbClass && dbBoard && selectedClass && selectedBoard && (dbClass !== selectedClass || dbBoard !== selectedBoard)) {
                alert("Account already associated with another class/board. Please create a ticket or connect with admin on support.");
                auth.signOut();
                return;
              }
            }

            if (emailLock && selectedClass && selectedBoard && (emailLock.class !== selectedClass || emailLock.board !== selectedBoard)) {
              const classLabel = translations[language].classes[emailLock.class] || emailLock.class;
              const boardLabel = translations[language].boards[emailLock.board] || emailLock.board;
              alert(language === 'en'
                ? `Your Google account is locked to ${classLabel} (${boardLabel}). Please choose the correct class/board.`
                : `ଆପଣଙ୍କ Google ଆକାଉଣ୍ଟ ${classLabel} (${boardLabel}) ପାଇଁ ଲକ୍ ହୋଇଛି। ଦୟାକରି ସଠିକ୍ ଶ୍ରେଣୀ/ବୋର୍ଡ ଚୟନ କରନ୍ତୁ।`);
              auth.signOut();
              return;
            }
          }

          const isJudgeAccount = userPhone === '+911234567890' || userPhone === '1234567890';
          const isTeacherTestAccount = userPhone === '+919876543210' || userPhone === '9876543210';
          
          // Prioritize Firestore role if document already exists
          const role = isAdmin 
            ? 'admin' 
            : (userDocSnap.exists() && userDocSnap.data().role 
              ? userDocSnap.data().role 
              : (regDataRef.current.role === 'admin' 
                ? 'admin' 
                : (regDataRef.current.role === 'student' 
                  ? 'student' 
                  : (isTeacherTestAccount || regDataRef.current.role === 'teacher') 
                    ? 'teacher' 
                    : 'student')));
          
          const userData: any = {
            id: firebaseUser.uid,
            name: isJudgeAccount 
              ? 'Anuradha Panda' 
              : (() => {
                  const rawName = (userDocSnap.exists() && userDocSnap.data().name && userDocSnap.data().name !== 'Student' && userDocSnap.data().name !== 'Student Achiever'
                    ? userDocSnap.data().name 
                    : (role === 'student' && regDataRef.current.name 
                      ? regDataRef.current.name 
                      : (isTeacherTestAccount && role !== 'student' 
                        ? 'Tiki Apa' 
                        : (firebaseUser.displayName || regDataRef.current.name || (role === 'teacher' ? 'Educator' : 'Student')))));
                  return rawName === 'Damayanti Panda' ? 'Tiki Apa' : rawName;
                })(),
            email: firebaseUser.email || (userDocSnap.exists() ? userDocSnap.data().email : regDataRef.current.email) || '',
            class: (role === 'teacher') ? (regDataRef.current.class || '10') : ((userDocSnap.exists() && userDocSnap.data().class) ? userDocSnap.data().class : (regDataRef.current.class || '10')),
            board: (role === 'teacher') ? (regDataRef.current.board || 'BSE Odisha') : ((userDocSnap.exists() && userDocSnap.data().board) ? userDocSnap.data().board : (regDataRef.current.board || 'BSE Odisha')),
            subjects: (userDocSnap.exists() && userDocSnap.data().subjects?.length > 0) ? userDocSnap.data().subjects : (regDataRef.current.subjects || []),
            preferred_language: (userDocSnap.exists() && userDocSnap.data().preferred_language) ? userDocSnap.data().preferred_language : (languageRef.current || 'or'),
            role: role,
            points: isJudgeAccount ? 850 : (userDocSnap.exists() ? Math.max(userDocSnap.data().points ?? 0, userDocSnap.data().points_today ?? 0) : 0),
            avatar: userDocSnap.exists() ? (userDocSnap.data().avatar ?? '/gundulu-pointing-nobg.png') : '/gundulu-pointing-nobg.png',
            streak: isJudgeAccount ? 14 : (userDocSnap.exists() ? (userDocSnap.data().streak ?? 0) : 0),
            district: isJudgeAccount ? 'Khordha' : (userDocSnap.exists() ? (userDocSnap.data().district ?? '') : ''),
            school: isJudgeAccount ? 'Bhubaneswar Govt High School' : (userDocSnap.exists() ? (userDocSnap.data().school ?? '') : ''),
            lastActiveDate: userDocSnap.exists() ? (userDocSnap.data().lastActiveDate ?? '') : '',
            shareCount: userDocSnap.exists() ? (userDocSnap.data().shareCount ?? 0) : 0,
            statusShared: userDocSnap.exists() ? (userDocSnap.data().statusShared ?? false) : false,
            phoneNumber: userPhone || '',
            uid: firebaseUser.uid,
            updatedAt: serverTimestamp()
          };

          // Sync admin email and phone for the primary admin account
          if (isAdmin && (userEmail === 'pandadamayanti01@gmail.com' || userPhone === '+919337956168' || userPhone === '9337956168')) {
            userData.email = 'pandadamayanti01@gmail.com';
            userData.phoneNumber = '+919337956168';
          }

          // Update Streak Logic
          const today = new Date().toISOString().split('T')[0];
          if (userData.lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (userData.lastActiveDate === yesterdayStr) {
              userData.streak = (userData.streak || 0) + 1;
            } else if (userData.lastActiveDate !== '') {
              userData.streak = 1;
            } else {
              userData.streak = 1;
            }
            userData.lastActiveDate = today;
          }

          if (!userDocSnap.exists()) {
            userData.createdAt = serverTimestamp();
          }

          const dbData = userDocSnap.exists() ? userDocSnap.data() : null;
          const needsWrite = !dbData || 
                             dbData.lastActiveDate !== today || 
                             dbData.name !== userData.name || 
                             dbData.email !== userData.email ||
                             dbData.class !== userData.class ||
                             dbData.board !== userData.board ||
                             dbData.phoneNumber !== userData.phoneNumber;

          if (userDocSnap.exists()) {
            // Let the UI render immediately since user document is fetched!
            setLoading(false);
          }

          const performSync = async () => {
            try {
              if (needsWrite) {
                await setDoc(userDocRef, userData, { merge: true });
                
                await setDoc(doc(firestore, 'public_profiles', firebaseUser.uid), {
                  name: userData.name,
                  points: userData.points,
                  class: userData.class,
                  avatar: userData.avatar,
                  streak: userData.streak
                }, { merge: true });

                if (userData.phoneNumber) {
                  await setDoc(doc(firestore, 'user_locks', userData.phoneNumber), {
                    class: userData.class,
                    board: userData.board
                  }, { merge: true });
                }

                if (firebaseUser.email) {
                  const emailLockId = `email:${firebaseUser.email.toLowerCase()}`;
                  await setDoc(doc(firestore, 'user_locks', emailLockId), {
                    class: userData.class,
                    board: userData.board
                  }, { merge: true });
                }
              }

              // Check test series registration in background
              const q = query(collection(firestore, 'test_series_registrations'), where('userId', '==', firebaseUser.uid));
              const querySnapshot = await getDocs(q);
              setIsRegisteredForTestSeries(!querySnapshot.empty);
            } catch (fsErr: any) {
              const isOfflineOrConnectionError = 
                fsErr?.message?.includes('offline') || 
                fsErr?.message?.includes('Could not reach') ||
                fsErr?.message?.includes('TIMEOUT') ||
                String(fsErr).includes('offline') ||
                String(fsErr).includes('Could not reach') ||
                String(fsErr).includes('TIMEOUT');

              if (isOfflineOrConnectionError) {
                console.warn("[Offline Sync] Sync postponed due to offline status:", fsErr);
              } else {
                handleFirestoreError(fsErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
              }
            } finally {
              // Ensure loading is set to false even if registration path was taken and needsWrite was awaited
              setLoading(false);
            }
          };

          if (userDocSnap.exists()) {
            // Run background sync without blocking
            performSync();
          } else {
            // Await creation for new registrations before loading dashboard
            await performSync();
          }
        } catch (fsErr: any) {
          const isOfflineOrConnectionError = 
            fsErr?.message?.includes('offline') || 
            fsErr?.message?.includes('Could not reach') ||
            fsErr?.message?.includes('TIMEOUT') ||
            String(fsErr).includes('offline') ||
            String(fsErr).includes('Could not reach') ||
            String(fsErr).includes('TIMEOUT');

          if (isOfflineOrConnectionError) {
            console.warn("Firestore access failed (offline or database unreachable). Recovering using local cache fallback...", fsErr);
            setLoading(false);
            
            // Offline fallback user generation
            let recoveredUser: any = null;
            try {
              const rawAccounts = localStorage.getItem('saved_accounts');
              const accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
              if (Array.isArray(accounts) && accounts.length > 0) {
                const matched = accounts.find((a: any) => a.uid === firebaseUser.uid);
                if (matched) {
                  recoveredUser = {
                    id: matched.uid,
                    name: matched.name,
                    avatar: matched.avatar,
                    class: matched.class,
                    board: matched.board,
                    phoneNumber: matched.phoneNumber,
                    role: matched.role || 'student',
                    points: 0,
                    streak: 0,
                    subjects: []
                  };
                }
              }
            } catch (e) {
              console.warn("Failed to retrieve user from saved_accounts:", e);
            }

            if (!recoveredUser) {
              // Create basic user from firebaseUser auth profile
              const userEmail = firebaseUser.email?.toLowerCase();
              const userPhone = firebaseUser.phoneNumber;
              const isAdmin = userEmail === 'pandadamayanti01@gmail.com' || 
                              userPhone === '+919337956168' || 
                              userPhone === '9337956168';
              
              recoveredUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || (isAdmin ? 'Admin' : 'Student'),
                email: firebaseUser.email || '',
                phoneNumber: userPhone || '',
                class: '10',
                board: 'BSE Odisha',
                subjects: [],
                preferred_language: 'or',
                role: isAdmin ? 'admin' : 'student',
                points: 0,
                streak: 0,
                avatar: '/gundulu-pointing-nobg.png'
              };
            }

            setUser(recoveredUser);
            setIsPremium(true); // Grant access offline
            if (recoveredUser.role === 'admin') {
              setIsAdminView(true);
            }

            setIsOfflineMode(true);
          } else {
            handleFirestoreError(fsErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
            setLoading(false);
          }
        }

        // Check subscription
        const subDocRef = doc(firestore, 'subscriptions', firebaseUser.uid);
        unsubSub = onSnapshot(subDocRef, (subDocSnap) => {
          // If in the free showcase period (until July 11, 2026), everyone gets free premium access
          const isFreePeriod = new Date() < new Date('2026-07-12T00:00:00+05:30');
          if (isFreePeriod) {
            setIsPremium(true);
            return;
          }

          const userEmail = firebaseUser.email?.toLowerCase();
          const userPhone = firebaseUser.phoneNumber;
          const lifetimeEmails = ['gyanaloka.panda@gmail.com', 'gyanapd.ram@gmail.com', 'pandadamayanti01@gmail.com', 'gyanalpanda@gmail.com'];
          const lifetimePhones = [
            '+918926118509', '8926118509', 
            '+918457811227', '8457811227', 
            '+916370487877', '6370487877',
            '+911234567890', '1234567890'
          ];
          
          if ((userEmail && lifetimeEmails.includes(userEmail)) || (userPhone && lifetimePhones.includes(userPhone))) {
            setIsPremium(true);
            return;
          }

          if (subDocSnap.exists()) {
            const subData = subDocSnap.data();
            console.log("Debug: Subscription data retrieved:", subData);
            const now = new Date();
            const expiresAt = subData.expires_at?.toDate ? subData.expires_at.toDate() : new Date(subData.expires_at);
            const isActive = subData.active === true;
            const isNotExpired = expiresAt > now;
            console.log("Debug: Subscription check - Active:", isActive, "Not Expired:", isNotExpired, "Expires At:", expiresAt);
            setIsPremium(isActive && isNotExpired);
          } else {
            setIsPremium(false);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `subscriptions/${firebaseUser.uid}`);
        });

        // Fetch system settings
        const unsubSettings = onSnapshot(doc(firestore, 'system_settings', 'config'), (doc) => {
          if (doc.exists()) {
            setSystemSettings(doc.data() as SystemSettings);
          }
        }, (err: any) => {
          if (err.code === 'permission-denied' || err.message?.toLowerCase().includes('permissions')) {
            console.warn("Permission denied for system_settings/config. Ensure your Firestore rules allow read for authenticated users. Falling back to default settings.");
          } else {
            handleFirestoreError(err, OperationType.GET, 'system_settings/config');
          }
        });

        // Add to global cleanup ref
        (unsubscribe as any).unsubSettings = unsubSettings;

        setShowTestSeriesPoster(false);
        // Hiding the Gundulu welcome video launch event for now. Change to the block below when live:
        // const hasSeenLaunchEvent = localStorage.getItem('utkalPlayStoreLaunchSeen') === 'true';
        // if (!hasSeenLaunchEvent) {
        //   setShowLaunchEvent(true);
        //   setShowLibraryPopup(false);
        // } else {
        //   setShowLibraryPopup(true);
        // }
        setShowLaunchEvent(false);
        setShowLibraryPopup(false); // Hide Digital Library Launch Popup completely for now
        
        setLoading(false);
      } else {
        setUser(null);
        setShowTestSeriesPoster(false);
        setShowLibraryPopup(false);
        setIsPremium(false);
        setAuthStep('login');
        setIsAdminLogin(false);
        setIsAdminView(false);
        setPhoneNumber('');
        setOtp('');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
      if (unsubSub) unsubSub();
      if ((unsubscribe as any).unsubSettings) (unsubscribe as any).unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setChapters([]);
      setLeaderboard([]);
      setMonthlyTests([]);
      setDailyMcqs([]);
      setDailyMcqSubmissions([]);
      setTestSubmissions([]);
      return;
    }

    // Immediate load dashboard-critical features
    loadLeaderboard();
    loadDailyMcqs();
    loadDailyChallenge();
    loadUserProgress();
    loadNotifications();
    loadFollowing();
  }, [user?.id, user?.class, user?.role, loadLeaderboard, loadDailyMcqs, loadDailyChallenge, loadUserProgress, loadNotifications, loadFollowing]);

  // Lazy loaders based on active Tab
  useEffect(() => {
    if (!user) return;
    
    if (['digital_library', 'smart_classes', 'parent_dashboard', 'syllabus_tracker'].includes(activeTab) || user.role === 'teacher') {
      loadChapters();
    }
    if (['digital_library', 'textbooks'].includes(activeTab)) {
      loadTextbooks();
    }
    if (['monthly_tests', 'parent_dashboard'].includes(activeTab)) {
      loadTestSubmissions();
    }
    if (['daily_mcqs'].includes(activeTab)) {
      loadDailyMcqSubmissions();
    }
    if (['leaderboard'].includes(activeTab)) {
      loadFollowing();
    }
    if (['monthly_tests'].includes(activeTab)) {
      loadMonthlyTests();
    }
  }, [user?.id, activeTab, user?.role, loadChapters, loadTextbooks, loadTestSubmissions, loadDailyMcqSubmissions, loadFollowing, loadMonthlyTests]);

  // --- Native Push Notifications Registration via Capacitor ---
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('registration', (token) => {
        console.log('Capacitor Push registration success, token:', token.value);
        if (user?.id) {
          const userRef = doc(firestore, 'users', user.id);
          updateDoc(userRef, {
            nativeDeviceToken: token.value,
            lastTokenUpdate: new Date()
          }).catch(err => console.warn('Failed to save native device token:', err));
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('Capacitor Push registration error:', err);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received in foreground:', notification);
        const newNotif = {
          id: notification.id || Date.now().toString(),
          title: notification.title || 'Notification',
          message: notification.body || '',
          createdAt: new Date(),
          type: 'general'
        };
        setStudentNotifications(prev => [newNotif, ...prev]);
        setNewNotification(newNotif);
        setTimeout(() => setNewNotification(null), 10000);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
        setActiveTab('notifications');
      });
    }
  }, [user?.id]);

  // --- Per-class MCQ subject rotation ---
  const classSubjectList = React.useMemo(() => {
    if (!user?.class || !user?.board) return null;
    const boardKey = String(user.board).toLowerCase();
    const classKey = String(user.class).toLowerCase();
    // Try to get subjectsByClass for the board (e.g., odisha)
    const boardMapKey = boardKey.includes('oav') ? 'oav' : (boardKey.includes('cbse') ? 'cbse' : (boardKey.includes('aurobindo') ? 'aurobindo' : 'odisha'));
    const boardSubjects = translations[language]?.subjectsByClass?.[boardMapKey]?.[classKey];
    return Array.isArray(boardSubjects) && boardSubjects.length > 0 ? boardSubjects : null;
  }, [user?.class, user?.board, language]);

  const dailyMcqRotation = React.useMemo(
    () => getConfiguredDailyMcqSequence(classSubjectList),
    [classSubjectList]
  );

  const todayDailySubject = React.useMemo(() => {
    const subjectKey = getRotatingDailyMcqSubject(new Date().toISOString().split('T')[0], dailyMcqRotation);
    return translations[language].subjects?.[subjectKey] || subjectKey;
  }, [dailyMcqRotation, language]);

  const tomorrowDailySubject = React.useMemo(() => {
    const subjectKey = getRotatingDailyMcqSubject(getTomorrowDateString(), dailyMcqRotation);
    return translations[language].subjects?.[subjectKey] || subjectKey;
  }, [dailyMcqRotation, language]);

  const handleShareDailyPractice = React.useCallback(() => {
    const classLabel = user?.class ? (translations[language].classes?.[user.class] || user.class) : '';
    openDailyMcqWhatsAppShare({
      language,
      classLabel,
    });
  }, [language, user?.class]);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleGoogleLogin = async () => {
    // For Google, we don't need email validation beforehand as we get it from Google
    if (!isAdminLogin && (!regData.class || !regData.board)) {
      alert(translations[language].requiredFieldsError);
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'Google' });
      }
    } catch (error: any) {
      // Ignore user-cancelled popup errors
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log("Login popup closed or cancelled by user.");
        return;
      }

      console.error("Google Login Error:", error);
      let title = "Login Error";
      let message = error.message || "An unexpected error occurred during Google Login.";

      if (error.code === 'auth/unauthorized-domain') {
        title = "Domain Not Authorized";
        message = language === 'en'
          ? "This domain is not authorized for Google Login. \n\nTo fix this:\n1. Open Firebase Console\n2. Go to Build > Authentication > Settings\n3. Click 'Authorized domains'\n4. Add this domain: " + window.location.hostname
          : "ଏହି ଡୋମେନ୍ Google Login ପାଇଁ ଅନୁମତିପ୍ରାପ୍ତ ନୁହେଁ | \n\nସମାଧାନ:\n୧. Firebase Console ଖୋଲନ୍ତୁ\n୨. Build > Authentication > Settings କୁ ଯାଆନ୍ତୁ\n୩. 'Authorized domains' କୁ ଯାଆନ୍ତୁ\n୪. ଏହି ଡୋମେନ୍ ଯୋଡନ୍ତୁ: " + window.location.hostname;
      } else if (error.code === 'auth/network-request-failed') {
        title = "Network Error";
        message = language === 'en'
          ? "A network error occurred. Please check your internet connection and ensure no ad-blockers are blocking Firebase (google.com)."
          : "ନେଟୱାର୍କ ସମସ୍ୟା | ଦୟାକରି ଆପଣଙ୍କ ଇଣ୍ଟରନେଟ୍ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ Ad-blocker ବନ୍ଦ କରନ୍ତୁ |";
      }

      setShowConfigError({ title, message });
    }
  };

  const validateRegData = (data = regData) => {
    if (isAdminLogin) return true;
    if (!data.class || !data.board) {
      alert(translations[language].requiredFieldsError);
      return false;
    }
    return true;
  };

  const setupRecaptcha = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        console.error("Recaptcha container NOT found in DOM");
        reject(new Error("Recaptcha container NOT found in DOM"));
        return;
      }
      
      // Clear existing verifier
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.warn("Recaptcha clear error:", e);
        }
        (window as any).recaptchaVerifier = null;
      }
      
      // Ensure the container is empty and has the widget div
      container.innerHTML = '<div id="recaptcha-widget"></div>';
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const widget = document.getElementById('recaptcha-widget');
        if (!widget) {
          console.error("Recaptcha widget element not found after creation");
          reject(new Error("Recaptcha widget element not found after creation"));
          return;
        }

        try {
          const verifier = new RecaptchaVerifier(auth, 'recaptcha-widget', {
            size: 'invisible',
            callback: (response: any) => {
              console.log("reCAPTCHA solved", response);
            },
            'expired-callback': () => {
              console.warn("reCAPTCHA expired");
            }
          });
          
          (window as any).recaptchaVerifier = verifier;
          
          // Important: render the verifier and wait for it
          verifier.render()
            .then(() => {
              console.log("reCAPTCHA rendered successfully");
              resolve(verifier);
            })
            .catch((e: any) => {
              console.error("Recaptcha Render Error:", e);
              reject(e);
            });
        } catch (e) {
          console.error("Recaptcha Initialization Error:", e);
          reject(e);
        }
      }, 100);
    });
  };

  const handleAdminEmailLogin = async () => {
    setAdminLoginError('');
    setShowResetPasswordButton(false);
    if (!adminEmail || !adminPassword) {
      setAdminLoginError(language === 'en' ? "Please enter email and password" : "ଦୟାକରି ଇମେଲ୍ ଏବଂ ପାସୱାର୍ଡ ଦିଅନ୍ତୁ");
      return;
    }
    setIsSendingOtp(true);
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (error: any) {
      console.error("Admin Login Error:", error);
      // Auto-create the admin account if it doesn't exist yet
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          // Only auto-create if it's the known admin email
          if (adminEmail.toLowerCase() === 'pandadamayanti01@gmail.com') {
            await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            return; // Success!
          } else {
            setAdminLoginError("Invalid admin credentials. If you are a student, please use the Student Login.");
          }
        } catch (createError: any) {
          console.error("Admin Registration Error:", createError);
          if (createError.code === 'auth/email-already-in-use') {
            setAdminLoginError("This email is already registered (likely via Google Sign-In). Please use the 'Google' button below to log in as admin.");
            setShowResetPasswordButton(true);
          } else {
            setAdminLoginError("Registration failed: " + createError.message);
          }
        }
      } else if (error.code === 'auth/wrong-password') {
        setAdminLoginError("Incorrect password for admin account. If you signed up via Google, please use the 'Google' button below.");
        setShowResetPasswordButton(true);
      } else {
        setAdminLoginError("Login failed: " + error.message);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendPasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, adminEmail);
      setAdminLoginError("Password reset email sent! Please check your inbox, set your password, and try logging in again.");
      setShowResetPasswordButton(false);
    } catch (resetError: any) {
      setAdminLoginError("Failed to send reset email: " + resetError.message);
    }
  };

  const handlePhoneLogin = async () => {
    console.log("Handle Phone Login clicked");
    if (!validateRegData()) {
      console.log("Validation failed");
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      alert(language === 'en' ? "Please enter a valid phone number" : "ଦୟାକରି ଏକ ସଠିକ୍ ଫୋନ୍ ନମ୍ବର ଦିଅନ୍ତୁ");
      return;
    }
    if (!isAdminLogin && (phoneNumber === '9337956168' || phoneNumber === '+919337956168')) {
      alert(language === 'en' ? "This number is registered as Admin. Please use Admin Login." : "ଏହି ନମ୍ବର ଆଡମିନ୍ ଭାବରେ ପଞ୍ଜିକୃତ | ଦୟାକରି ଆଡମିନ୍ ଲଗଇନ୍ ବ୍ୟବହାର କରନ୍ତୁ |");
      setIsAdminLogin(true);
      return;
    }
    startPhoneAuth();
  };

  const startPhoneAuth = async () => {
    if (!auth) {
      console.error("Firebase Auth not initialized");
      return;
    }
    setIsSendingOtp(true);
    setOtp(''); // Clear previous OTP when starting/resending
    console.log("Starting Phone Auth process...");
    try {
      const verifier = await setupRecaptcha();
      
      if (!verifier) {
        throw new Error("reCAPTCHA verifier not initialized");
      }

      let formattedNumber = phoneNumber.trim();
      formattedNumber = formattedNumber.replace(/[^\d+]/g, '');
      
      if (!formattedNumber.startsWith('+')) {
        if (formattedNumber.startsWith('0')) {
          formattedNumber = formattedNumber.substring(1);
        }
        formattedNumber = '+91' + formattedNumber;
      }

      // Class/Board Lock Check before sending OTP
      if (!isAdminLogin) {
        const isTestAccount = [
          '+918926118509', '8926118509', 
          '+917735118243', '7735118243', 
          '+919556086560', '9556086560',
          '+918457811227', '8457811227',
          '+916370487877', '6370487877',
          '+911234567890', '1234567890',
          '+919876543210', '9876543210'
        ].includes(formattedNumber);
        
        if (!isTestAccount) {
          const lockDoc = await getDoc(doc(firestore, 'user_locks', formattedNumber));
          
          if (lockDoc.exists()) {
            const lockData = lockDoc.data();
            const dbClass = lockData.class;
            const dbBoard = lockData.board;
            const selectedClass = regData.class;
            const selectedBoard = regData.board;

            if (selectedClass && selectedBoard && (dbClass !== selectedClass || dbBoard !== selectedBoard)) {
              const classLabel = translations[language].classes[dbClass] || dbClass;
              const boardLabel = translations[language].boards[dbBoard] || dbBoard;
              alert(language === 'en' 
                ? `Your account is locked to ${classLabel} (${boardLabel}). Please select the correct class/board to login.`
                : `ଆପଣଙ୍କ ଆକାଉଣ୍ଟ ${classLabel} (${boardLabel}) ପାଇଁ ଲକ୍ ହୋଇଛି | ଦୟାକରି ସଠିକ୍ ଶ୍ରେଣୀ/ବୋର୍ଡ ଚୟନ କରନ୍ତୁ |`);
              setIsSendingOtp(false);
              return;
            }
          }
        }
      }
      
      console.log("Requesting OTP for:", formattedNumber);
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, verifier);
      console.log("OTP sent successfully");
      setConfirmationResult(confirmation);
      setAuthStep('otp');
      setResendTimer(60);
    } catch (error: any) {
      console.error("Detailed Phone Login Error:", error);
      let message = translations[language].error;
      let title = "Phone Login Failed";

      if (error.code === 'auth/billing-not-enabled') {
        title = "Firebase Billing Required";
        message = language === 'en' 
          ? "Real SMS requires the Firebase Blaze (Paid) plan. \n\nTO TEST FOR FREE:\n1. Go to Firebase Console > Auth > Users\n2. Click 'Add phone number for testing'\n3. Add your number and a code (e.g. 123456)\n4. Use that number in this app."
          : "ପ୍ରକୃତ SMS ପାଇଁ Firebase Blaze ପ୍ଲାନ୍ ଆବଶ୍ୟକ | \n\nମାଗଣାରେ ପରୀକ୍ଷା କରିବା ପାଇଁ:\n୧. Firebase Console > Auth > Users କୁ ଯାଆନ୍ତୁ\n୨. 'Add phone number for testing' କୁ ଯାଆନ୍ତୁ\n୩. ଆପଣଙ୍କ ନମ୍ବର ଏବଂ ଏକ କୋଡ୍ (ଯଥା: 123456) ଯୋଡନ୍ତୁ |";
      } else if (error.code === 'auth/operation-not-allowed') {
        title = "Phone Login Not Enabled";
        message = language === 'en'
          ? "Phone Authentication is not enabled in your Firebase project. \n\nTo fix this:\n1. Open Firebase Console\n2. Go to Build > Authentication > Sign-in method\n3. Click 'Add new provider'\n4. Select 'Phone' and click 'Enable'\n5. Save the changes."
          : "Firebase ପ୍ରକଳ୍ପରେ Phone Authentication ସକ୍ରିୟ ନାହିଁ | \n\nସମାଧାନ:\n୧. Firebase Console ଖୋଲନ୍ତୁ\n୨. Build > Authentication > Sign-in method କୁ ଯାଆନ୍ତୁ\n୩. 'Add new provider' କୁ ଯାଆନ୍ତୁ\n୪. 'Phone' ଚୟନ କରି 'Enable' କରନ୍ତୁ |";
      } else if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/app-not-authorized') {
        title = "Domain Not Authorized";
        message = language === 'en'
          ? "This domain is not authorized in Firebase. \n\nTo fix:\n1. Go to Firebase Console > Auth > Settings\n2. Add this domain to 'Authorized domains':\n" + window.location.hostname
          : "ଏହି ଡୋମେନ୍ Firebase ରେ ଅନୁମତିପ୍ରାପ୍ତ ନୁହେଁ | \n\nସମାଧାନ:\n୧. Firebase Console > Auth > Settings କୁ ଯାଆନ୍ତୁ\n୨. ଏହି ଡୋମେନ୍ ଯୋଡନ୍ତୁ:\n" + window.location.hostname;
      } else if (error.code === 'auth/too-many-requests') {
        title = "Too Many Requests";
        message = language === 'en'
          ? "Firebase has blocked this device due to too many attempts. Please try again later or use a Test Number."
          : "ଅତ୍ୟଧିକ ପ୍ରୟାସ ଯୋଗୁଁ Firebase ଏହି ଡିଭାଇସ୍ ବନ୍ଦ କରିଛି |";
      } else if (error.code === 'auth/network-request-failed') {
        title = "Network Error";
        message = language === 'en'
          ? "Unable to reach Firebase. This usually happens due to:\n1. Poor internet connection\n2. An Ad-blocker or Firewall blocking Firebase\n3. Browser privacy settings\n\nPlease disable ad-blockers and try again."
          : "Firebase ସହିତ ସଂଯୋଗ ହୋଇପାରୁ ନାହିଁ | \n\nସମ୍ଭାବ୍ୟ କାରଣ:\n୧. ଦୁର୍ବଳ ଇଣ୍ଟରନେଟ୍\n୨. Ad-blocker କିମ୍ବା Firewall\n୩. ବ୍ରାଉଜର୍ ସେଟିଂସ\n\nଦୟାକରି Ad-blocker ବନ୍ଦ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
      } else {
        message = `Error: ${error.message || error.code}`;
      }

      setShowConfigError({ title, message });
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        } catch (e) {
          console.warn("Recaptcha reset error:", e);
        }
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    try {
      await confirmationResult.confirm(otp.trim());
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'OTP' });
      }
    } catch (error: any) {
      console.error("OTP Error:", error);
      if (error.code === 'auth/invalid-verification-code') {
        alert(language === 'en' ? "Invalid OTP. Please check the code sent to your phone and try again." : "ଅବୈଧ OTP | ଦୟାକରି ଆପଣଙ୍କ ଫୋନକୁ ଆସିଥିବା କୋଡ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |");
      } else if (error.code === 'auth/code-expired') {
        alert(language === 'en' ? "OTP has expired. Please request a new one." : "OTP ର ସମୟ ସମାପ୍ତ ହୋଇଯାଇଛି | ଦୟାକରି ନୂତନ OTP ପାଇଁ ଅନୁରୋଧ କରନ୍ତୁ |");
      } else {
        alert(error.message || "Invalid OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const savedAccountsBackup = localStorage.getItem('saved_accounts');
      const search = window.location.search;
      const hash = window.location.hash;
      
      const cleanPhone = (p: string) => p ? p.replace(/\D/g, '') : '';
      const userPhone = user?.phoneNumber ? cleanPhone(user.phoneNumber) : '';
      const authPhone = auth.currentUser?.phoneNumber ? cleanPhone(auth.currentUser.phoneNumber) : '';
      
      const isJudgeUser = 
        userPhone.endsWith('1234567890') || 
        userPhone.endsWith('9876543210') ||
        authPhone.endsWith('1234567890') || 
        authPhone.endsWith('9876543210') ||
        user?.name === 'Anuradha Panda' ||
        user?.name === 'Damayanti Panda' ||
        user?.name === 'Tiki Apa' ||
        (user?.role === 'teacher' && (user?.name === 'Damayanti Panda' || user?.name === 'Tiki Apa'));

      const isJudgeMode = isJudgeUser || 
                          search.includes('judge') || 
                          hash.includes('judge') || 
                          search.includes('showcase') || 
                          hash.includes('showcase') || 
                          sessionStorage.getItem('judge_mode_active') === 'true' ||
                          localStorage.getItem('showcase_mode') === 'true';

      await signOut(auth);
      // Clear all local storage data except the saved profiles list
      localStorage.clear();
      // Clear session storage as well to reset PIN dismiss state
      sessionStorage.clear();
      if (savedAccountsBackup) {
        localStorage.setItem('saved_accounts', savedAccountsBackup);
      }
      
      let redirectUrl = '/';
      if (isJudgeMode) {
        localStorage.setItem('showcase_mode', 'true');
        redirectUrl = '/?judge=true';
      }
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Logout Error:", error);
      const savedAccountsBackup = localStorage.getItem('saved_accounts');
      const cleanPhone = (p: string) => p ? p.replace(/\D/g, '') : '';
      const userPhone = user?.phoneNumber ? cleanPhone(user.phoneNumber) : '';
      const authPhone = auth.currentUser?.phoneNumber ? cleanPhone(auth.currentUser.phoneNumber) : '';
      
      const isJudgeUser = 
        userPhone.endsWith('1234567890') || 
        userPhone.endsWith('9876543210') ||
        authPhone.endsWith('1234567890') || 
        authPhone.endsWith('9876543210') ||
        user?.name === 'Anuradha Panda' ||
        user?.name === 'Damayanti Panda' ||
        user?.name === 'Tiki Apa';

      const isJudgeMode = isJudgeUser || 
                          window.location.search.includes('judge') || 
                          window.location.hash.includes('judge') || 
                          window.location.search.includes('showcase') || 
                          window.location.hash.includes('showcase') || 
                          sessionStorage.getItem('judge_mode_active') === 'true' ||
                          localStorage.getItem('showcase_mode') === 'true';
      localStorage.clear();
      sessionStorage.clear();
      if (savedAccountsBackup) {
        localStorage.setItem('saved_accounts', savedAccountsBackup);
      }
      if (isJudgeMode) {
        localStorage.setItem('showcase_mode', 'true');
      }
      setUser(null);
      setIsPremium(false);
    }
    setTutorExplanations({});
  };

  const askTutor = async (question: string, questionId: string) => {
    if (!isPremium) {
      alert(translations[language].subscriptionRequired);
      return;
    }

    setTutorLoading(prev => ({ ...prev, [questionId]: true }));
    try {
      const text = await solveMathDoubt(
        question,
        language as 'en' | 'or',
        undefined,
        user?.class,
        systemSettings?.gunduluPrompt
      );
      setTutorExplanations(prev => ({ ...prev, [questionId]: text }));

      try {
        await addDoc(collection(firestore, 'tutor_queries'), {
          userId: user?.id || 'anonymous',
          userName: user?.name || 'Student',
          userClass: user?.class || 'Unknown',
          userPhone: user?.phoneNumber || '',
          userEmail: user?.email || '',
          question,
          answer: text,
          source: 'askTutor',
          timestamp: serverTimestamp()
        });
      } catch (logError) {
        console.error('Failed to log askTutor usage:', logError);
      }
    } catch (error) {
      console.error("Study Buddy Error:", error);
      const errorMessage = language === 'en' 
        ? "Error generating explanation. Please try again later." 
        : "ସ୍ପଷ୍ଟୀକରଣ ପ୍ରସ୍ତୁତ କରିବାରେ ତ୍ରୁଟି | ଦୟାକରି ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
      setTutorExplanations(prev => ({ ...prev, [questionId]: errorMessage }));
    } finally {
      setTutorLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (amount: number, planType: 'monthly' | 'yearly' = 'monthly', userClass: any = undefined) => {
    if (!user) return;

    // The yearly plan restriction has been removed. All users can access it.
    const finalClass = userClass !== undefined ? userClass : (user.class || 1);
    
    const res = await loadRazorpayScript();
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

      // 1. Create Order on Backend
      try {
        console.log("Creating payment order...");
        const orderData = await fetchJson('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeJsonStringify({ userId: user.id, amount, userClass: finalClass, planType })
        });

        console.log("Order created:", orderData);

        if (!orderData || !orderData.id) {
          throw new Error("Invalid order ID received from server.");
        }

        const razorpayKey = orderData.key;
        if (!razorpayKey) {
          throw new Error("Razorpay Key ID not provided by server.");
        }

        // Store pending payment in Firestore
        await setDoc(doc(firestore, 'payments', orderData.id), {
          userId: user.id,
          amount: amount,
          status: 'pending',
          razorpay_order_id: orderData.id,
          createdAt: new Date().toISOString()
        });

        // 2. Open Razorpay Checkout
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Utkal Skill Centre",
        description: "Premium Plan Subscription",
        order_id: orderData.id,
        handler: async function (response: any) {
          console.log("Payment response received:", response);
          // 3. Verify Payment on Backend
          try {
            const verifyData = await fetchJson('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: safeJsonStringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                amount: amount,
                userClass: userClass,
                planType: planType
              })
            });

            if (verifyData.success) {
              // The backend now securely handles creating the subscription and transaction
              setIsPremium(true);
              alert("Payment Successful! Welcome to the Premium Plan.");
            }
          } catch (err: any) {
            console.error("Payment Verification Error:", err);
            alert("Payment Verification Failed: " + err.message);
          }
        },
        modal: {
          ondismiss: function() {
            console.log("Checkout modal closed");
          }
        },
        prefill: {
          name: user.name || "Student",
          email: user.email || "student@example.com",
          ...(phoneNumber ? { contact: phoneNumber } : {})
        },
        theme: {
          color: "#10b981"
        }
      };

      console.log("Opening Razorpay checkout with options:", { ...options, key: "***" });
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Order Creation Error:", err);
      alert("Error creating order: " + err.message);
    }
  };

  const handleShare = async () => {
    if (!user) return;
    const text = `Join Utkal Skill Centre and unlock your potential with personalized learning! 🚀 https://utkalskillcentre.com`;
    
    // Mark as shared immediately - set to 5 to unlock
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        shareCount: 5
      });
    } catch (err) {
      console.error("Error updating share count:", err);
    }

    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    window.location.href = url;
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 500);
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
            <Lucide.AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              {language === 'en' ? "Database Error" : "ଡାଟାବେସ୍ ତ୍ରୁଟି"}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {dbError}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            {language === 'en' ? "Try Again" : "ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ"}
          </button>
        </div>
      </div>
    );
  }

  if (loading || (auth.currentUser && !user)) {
    return (
      <div 
        style={{ 
          background: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(circle at bottom left, rgba(245, 158, 11, 0.08) 0%, transparent 50%), #ffffff' 
        }}
        className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-10 relative z-10"
        >
          {/* Logo & Mascot Container */}
          <div className="flex items-center gap-6 relative">
            {/* Utkal Logo with soft green glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl scale-125 animate-pulse" />
              <motion.img 
                src="/utkal-192.png" 
                className="h-20 w-auto relative z-10 rounded-full border border-emerald-500/10 shadow-md bg-white" 
                alt="Utkal Logo" 
                referrerPolicy="no-referrer"
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              />
            </div>

            {/* Gundulu Mascot pointing up/left */}
            <motion.img 
              src="/gundulu-pointing-nobg.png" 
              className="h-24 w-auto object-contain relative z-10 drop-shadow-sm" 
              alt="Gundulu Mascot" 
              animate={{ y: [-4, 4, -4], rotate: [-1, 2, -1] }}
              transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
            />
          </div>

          {/* Premium Horizontal Progress Loader */}
          <div className="flex flex-col items-center gap-4 w-64">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner relative">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-1.5">
              <p 
                style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
                className="text-slate-800 font-extrabold tracking-[0.25em] uppercase text-[11px]"
              >
                {language === 'en' ? "Utkal Skill Centre" : "ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର"}
              </p>
              <p className="text-emerald-600 font-black text-[9px] uppercase tracking-[0.3em] animate-pulse">
                {language === 'en' ? "Loading Excellence..." : "ଶ୍ରେଷ୍ଠତା ଲୋଡ୍ ହେଉଛି..."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer Branding */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-40">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-400">Powered by Bigsan Group</p>
        </div>
      </div>
    );
  }

  if (showShowcaseOnly) {
    return (
      <Suspense fallback={<ViewLoader fullHeight />}>
        <PitchDeckView language={language} onBack={() => {
          setShowShowcaseOnly(false);
          if (window.location.hash === '#pitch_deck') {
            window.location.hash = '';
          }
        }} />
      </Suspense>
    );
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isSunday = (new Date().getDay() === 0 && !isLocalhost && user?.phoneNumber !== '+911234567890' && user?.phoneNumber !== '+919876543210' && !window.location.search.includes('judge') && !window.location.hash.includes('judge') && !window.location.search.includes('showcase')) || window.location.search.includes('test_lock=true');
  const isLocked = isSunday && showSundayLockout && !sundayBypassed;

  if (isLocked) {
    return <SundayLockout language={language} onAdminBypass={() => setSundayBypassed(true)} />;
  }

  if (isAdminView) {
    console.log("Rendering AdminDashboard for user:", user?.email, "role:", user?.role, "isAdminView:", isAdminView);
    return (
      <Suspense fallback={<ViewLoader fullHeight />}>
        <AdminDashboard onExit={() => setIsAdminView(false)} />
      </Suspense>
    );
  }

  if (!user) {
    const getQueryParam = (name: string) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has(name)) return searchParams.get(name);
      
      const hash = window.location.hash;
      const hashQIndex = hash.indexOf('?');
      if (hashQIndex !== -1) {
        const hashParams = new URLSearchParams(hash.substring(hashQIndex));
        return hashParams.get(name);
      }
      return null;
    };

    const previewKey = getQueryParam('preview') || getQueryParam('chapter');
    
    const handleClearPreview = () => {
      window.location.search = '';
      window.location.hash = '';
    };
    
    if (previewKey) {
      return (
        <PublicSeoPreview 
          previewKey={previewKey} 
          language={language} 
          onBack={handleClearPreview} 
        />
      );
    }

    const landingFaqs = [
      {
        question: "What is Utkal Skill Centre?",
        answer: "Utkal Skill Centre is Odisha's leading AI-powered digital learning platform for Class 5 to 10 students, focusing on the latest Odisha State Board pattern."
      },
      {
        question: "Does it support the latest Odisha Board pattern for 2026?",
        answer: "Yes, all our study materials, MCQs, and monthly tests are strictly based on the 2026 syllabus and latest question pattern issued by the Odisha Board."
      },
      {
        question: "What is Gundulu AI study buddy?",
        answer: "Gundulu is our personalized AI study buddy that helps students solve doubts, provides explanation in Odia, and tracks their progress."
      }
    ];

    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col relative font-sans">
        <SEO 
          title="Utkal Skill Centre | BSE Odisha 10th Result 2026 & Latest Board Pattern MCQs (ଓଡ଼ିଆ ମାଧ୍ୟମ)"
          description="Odisha's top digital learning platform for Class 5-10. Get BSE Odisha result updates, AI-powered doubt solving with Gundulu, and latest board pattern selection questions."
          schemaType="FAQPage"
          faqs={landingFaqs}
        />
        <div className="absolute inset-x-0 top-0 z-[100] pointer-events-none">
          <div className="pointer-events-auto">
            <AnimatePresence>
              {showInstallModal && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="install-modal-overlay"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="install-modal-content"
                  >
                    <button 
                      onClick={() => {
                        setShowInstallModal(false);
                        sessionStorage.setItem('installModalDismissed', 'true');
                      }}
                      className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
                    >
                      <Lucide.X size={20} />
                    </button>

                    <div className="w-20 h-20 rounded-[2rem] bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                      <Lucide.Download size={32} className="text-emerald-500" />
                    </div>

                    <h3 className="text-2xl font-black text-white tracking-tight mb-2 uppercase">Install Utkal App</h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                      Experience the full power of Utkal Skill Centre. Add to your home screen for instant access to all learning tools.
                    </p>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          handleInstall();
                          setShowInstallModal(false);
                        }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Install Now
                      </button>
                      <button 
                        onClick={() => {
                          setShowInstallModal(false);
                          sessionStorage.setItem('installModalDismissed', 'true');
                        }}
                        className="w-full py-3 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-colors"
                      >
                        Maybe Later
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {showInstallBanner && !showInstallModal && (
                <motion.div 
                  initial={{ y: 100, x: '-50%', opacity: 0 }}
                  animate={{ y: 0, x: '-50%', opacity: 1 }}
                  exit={{ y: 100, x: '-50%', opacity: 0 }}
                  className="install-banner"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Lucide.Download size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Install Utkal App</p>
                      <p className="text-[10px] text-white/70 font-medium">Access learning tools faster!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowInstallBanner(false)}
                      className="p-2 text-white/50 hover:text-white transition-colors"
                    >
                      <Lucide.X size={16} />
                    </button>
                    <button 
                      onClick={handleInstall}
                      className="install-button"
                    >
                      Install Now
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>



            {showLaunchEvent && (
              <Suspense fallback={<ViewLoader />}>
                <LaunchCelebration
                  onClose={() => setShowLaunchEvent(false)}
                  user={user}
                  language={language}
                  theme={theme}
                />
              </Suspense>
            )}
          </div>
        </div>

        <div className="flex-1 flex relative overflow-hidden">
          {/* Background Glows & Grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Left Content - Marketing Focus */}
        <div className="hidden lg:flex flex-1 flex-col justify-start pt-6 px-12 xl:px-20 relative z-10 border-r border-white/5 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
          {/* Abstract Network Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl relative z-10"
          >
            <div className="flex items-center gap-3 mb-8 group">
              <div className="relative p-1.5 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 rounded-full border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)] group-hover:border-emerald-400/60 transition-all duration-300">
                <div className="absolute inset-0 bg-emerald-500/15 rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <img src="/utkal-192.png" className="h-10 w-10 relative z-10 object-cover rounded-full border border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)]" alt="Utkal" referrerPolicy="no-referrer" />
              </div>
              <div className="flex flex-col">
                <div className="text-xl font-black tracking-wider text-white flex items-center gap-1.5 leading-none">
                  <span>{language === 'or' ? 'ଉତ୍କଳ' : 'UTKAL'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-widest scale-90 origin-left">PRO</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/80 group-hover:text-emerald-400/80 transition-colors mt-1">
                  {language === 'or' ? 'ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Skill Centre'}
                </div>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-4">
              <Lucide.Sparkles size={12} />
              {language === 'en' ? 'Personalized Learning' : 'ଆପଣଙ୍କ ପାଇଁ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷା'}
            </div>
            
            <h1 className="text-3xl xl:text-4xl font-black text-white leading-normal mb-2 tracking-tight">
              {language === 'en' ? (
                <>Odisha's #1 AI Learning App for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Anganwadi, Class 1-10 & Teachers</span></>
              ) : (
                <>ଓଡ଼ିଶାର ନମ୍ବର ୧ AI ପାଠପଢ଼ା ଆପ୍ - <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">ଅଙ୍ଗନୱାଡ଼ି, ପ୍ରଥମ ରୁ ଦଶମ ଏବଂ ଶିକ୍ଷକ</span></>
              )}
            </h1>
            
            <p className="text-sm text-slate-400 mb-2 leading-relaxed">
              {language === 'en' 
                ? 'From playful learning in Anganwadi (Shishu Vatika) and comprehensive Class 1-10 Odia Medium textbooks, to AI lesson planners for teachers—experience personalized, instant educational support in Odia and English with Gundulu AI.' 
                : 'ଅଙ୍ଗନୱାଡ଼ି (ଶିଶୁ ବାଟିକା) ର ମଜାଦାର ଶିକ୍ଷା ଓ ପ୍ରଥମ ରୁ ଦଶମ ଶ୍ରେଣୀର ପାଠ୍ୟପୁସ୍ତକ ଠାରು ଆରମ୍ଭ କରି ଶିକ୍ଷକମାନଙ୍କ ପାଇଁ AI ଲେସନ୍ ପ୍ଲାନର୍ ପର୍ଯ୍ୟନ୍ତ—ଗୁନ୍ଦୁଲୁ AI ସହିତ ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀରେ ପାଆନ୍ତୁ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷା ସହାୟତା।'}
            </p>

            {/* Three-Card Profile Grid (Compact Layout) */}
            <div className="grid grid-cols-3 gap-3 my-3">
              {/* Card 1: Anganwadi */}
              <div className="relative group py-2 px-3 rounded-xl border border-rose-500/15 bg-rose-500/5 backdrop-blur-md shadow-md transition-all duration-300 hover:border-rose-400/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(244,63,94,0.1)] flex flex-col items-start text-left">
                <h3 className="text-white text-xs font-black tracking-tight mb-0.5 font-['Outfit'] flex items-center gap-1.5">
                  <span className="text-sm">🧸</span>
                  <span>{language === 'en' ? 'Shishu Vatika' : 'ଶିଶୁ ବାଟିକା'}</span>
                </h3>
                <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider mb-1 leading-none">
                  {language === 'en' ? 'Anganwadi' : 'ଅଙ୍ଗନୱାଡ଼ି'}
                </span>
                <p className="text-[9px] text-slate-400 leading-tight font-semibold">
                  {language === 'en' 
                    ? 'Rhymes, stories, and drawing slate' 
                    : 'ମଜାଦାର ଗପ, ଗୀତ ଏବଂ ସ୍ଲେଟ୍'}
                </p>
              </div>

              {/* Card 2: Class 1-10 */}
              <div className="relative group py-2 px-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 backdrop-blur-md shadow-md transition-all duration-300 hover:border-emerald-400/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(16,185,129,0.1)] flex flex-col items-start text-left">
                <h3 className="text-white text-xs font-black tracking-tight mb-0.5 font-['Outfit'] flex items-center gap-1.5">
                  <span className="text-sm">📚</span>
                  <span>{language === 'en' ? 'Class 1 to 10' : 'ପ୍ରଥମ ରୁ ଦଶମ'}</span>
                </h3>
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider mb-1 leading-none">
                  {language === 'en' ? 'Odia Medium' : 'ସ୍କୁଲ୍ ପାଠ୍ୟକ୍ରମ'}
                </span>
                <p className="text-[9px] text-slate-400 leading-tight font-semibold">
                  {language === 'en' 
                    ? 'Books, notes & AI doubt solver' 
                    : 'ବହି, ନୋଟ୍ସ ଓ AI ସନ୍ଦେହ ସମାଧାନ'}
                </p>
              </div>

              {/* Card 3: Teachers */}
              <div className="relative group py-2 px-3 rounded-xl border border-purple-500/15 bg-purple-500/5 backdrop-blur-md shadow-md transition-all duration-300 hover:border-purple-400/30 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(168,85,247,0.1)] flex flex-col items-start text-left">
                <h3 className="text-white text-xs font-black tracking-tight mb-0.5 font-['Outfit'] flex items-center gap-1.5">
                  <span className="text-sm">👩‍🏫</span>
                  <span>{language === 'en' ? 'Teacher Hub' : 'ଶିକ୍ଷକ ବିଭାଗ'}</span>
                </h3>
                <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider mb-1 leading-none">
                  {language === 'en' ? 'Educator Access' : 'ଶିକ୍ଷକ ବିଶେଷ ସୁବିଧା'}
                </span>
                <p className="text-[9px] text-slate-400 leading-tight font-semibold">
                  {language === 'en' 
                    ? 'AI lesson planner & test generator' 
                    : 'AI ଲେସନ୍ ପ୍ଲାନର୍ ଓ ପ୍ରଶ୍ନପତ୍ର'}
                </p>
              </div>
            </div>

            {/* Interface Mockup / Floating Elements (Compact Height) */}
            <div className="relative h-48 w-full mt-2">
              {/* Main Core */}
              <motion.div 
                animate={{
                  y: [0, -8, 8, -4, 4, 0],
                  x: [0, 5, -5, 3, -3, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 group"
              >
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-full animate-[spin_12s_linear_infinite]"></div>
                <div className="absolute inset-2 border-2 border-cyan-500/30 rounded-full animate-[spin_18s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md rounded-full border border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.45)] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 opacity-30 group-hover:opacity-60 transition-opacity duration-300"></div>
                  <img 
                    src="/gundulu-pointing-nobg.png" 
                    className="w-full h-full object-cover scale-[0.95] relative z-10 transition-transform duration-500 group-hover:scale-[1.1]" 
                    alt="Gundulu Mascot" 
                  />
                </div>
              </motion.div>
              
              {/* Internal Link for SEO */}
              <motion.a 
                href="/bse-odisha-10th-result-2026.html"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="absolute -bottom-4 left-0 right-0 mx-auto w-fit px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {language === 'en' ? 'Latest: BSE Odisha 10th Result 2026 Live' : 'ସର୍ବଶେଷ: BSE ଓଡ଼ିଶା ଦଶମ ରେଜଲ୍ଟ ୨୦୨୬ ଲାଇଭ୍'}
                <Lucide.ExternalLink size={10} />
              </motion.a>

              {/* Connecting Lines & Nodes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                <motion.path 
                  d="M 50 50 Q 150 100 200 150" 
                  stroke="rgba(16,185,129,0.3)" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="5,5"
                  animate={{ strokeDashoffset: [0, -100] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />
                <motion.path 
                  d="M 350 50 Q 250 100 200 150" 
                  stroke="rgba(6,182,212,0.3)" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="5,5"
                  animate={{ strokeDashoffset: [0, 100] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />
                <motion.path 
                  d="M 50 250 Q 150 200 200 150" 
                  stroke="rgba(59,130,246,0.3)" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="5,5"
                  animate={{ strokeDashoffset: [0, -100] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />
              </svg>

              {/* Floating Nodes */}
              <motion.div 
                animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-2 left-6 bg-slate-950/75 backdrop-blur-md border border-emerald-500/25 p-3 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.15)] flex items-center gap-3 hover:border-emerald-400/50 transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Lucide.Bot className="text-emerald-400 w-5 h-5 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400/80 leading-none">{language === 'en' ? 'Learning Analysis' : 'ଶିକ୍ଷା ବିଶ୍ଳେଷଣ'}</div>
                  <div className="text-xs font-black text-white mt-1 leading-none">{language === 'en' ? '98% Accuracy' : '୯୮% ସଠିକତା'}</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 15, 0], x: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute top-6 right-2 bg-slate-950/75 backdrop-blur-md border border-cyan-500/25 p-3 rounded-2xl shadow-[0_4px_20px_rgba(6,182,212,0.15)] flex items-center gap-3 hover:border-cyan-400/50 transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 group-hover:scale-105 transition-transform">
                  <Lucide.Sparkles className="text-cyan-400 w-5 h-5 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400/80 leading-none">{language === 'en' ? 'Learning Path' : 'ଅଧ୍ୟୟନ ପଥ'}</div>
                  <div className="text-xs font-black text-white mt-1 leading-none">{language === 'en' ? 'Optimized' : 'ଅପ୍ଟିମାଇଜ୍ଡ୍'}</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-2 left-1/4 bg-slate-950/75 backdrop-blur-md border border-blue-500/25 p-3 rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.15)] flex items-center gap-3 hover:border-blue-400/50 transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                  <Lucide.Globe className="text-blue-400 w-5 h-5 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400/80 leading-none">{language === 'en' ? 'Global Knowledge' : 'ବୈଶ୍ୱିକ ଜ୍ଞାନ'}</div>
                  <div className="text-xs font-black text-white mt-1 leading-none">{language === 'en' ? 'Connected' : 'ସଂଯୁକ୍ତ'}</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right Content - Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-0 relative z-10 overflow-hidden">
          {authStep === 'login' ? (
            <LoginComponent language={language} translations={translations} setLanguage={setLanguage} setRegData={setRegData} />
          ) : (
            <div className="text-white">OTP UI content here</div>
          )}
        </div>
      </div>

        {/* Configuration Error Modal */}
        <AnimatePresence>
          {showConfigError && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                  <Lucide.Settings className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-4">{showConfigError.title}</h2>
                <div className="text-slate-300 text-sm whitespace-pre-line mb-8 bg-white/5 p-4 rounded-xl border border-white/5">
                  {showConfigError.message}
                </div>
                <button 
                  onClick={() => setShowConfigError(null)}
                  className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all"
                >
                  Got it
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Explore Study Directory Sitemap Footer Matrix */}
        <div className="w-full bg-slate-950/60 border-t border-white/5 py-12 px-6 sm:px-12 xl:px-20 relative z-10">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-[0.25em] mb-2">Explore Study Directory</h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Free Odisha School Board (BSE Odisha) Resources bilingually</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
              {/* Classes Column */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest font-bold">Syllabus By Class</h4>
                <ul className="space-y-2 text-xs font-bold text-slate-400">
                  <li><a href="?preview=class_sishuvatika" className="hover:text-white transition-colors">Anganwadi (Shishu Vatika)</a></li>
                  <li><a href="?preview=class_1" className="hover:text-white transition-colors">Class 1 (ପ୍ରଥମ ଶ୍ରେଣୀ)</a></li>
                  <li><a href="?preview=class_5" className="hover:text-white transition-colors">Class 5 (ପଞ୍ଚମ ଶ୍ରେଣୀ)</a></li>
                  <li><a href="?preview=class_9" className="hover:text-white transition-colors">Class 9 (ନବମ ଶ୍ରେଣୀ)</a></li>
                  <li><a href="?preview=class_10" className="hover:text-white transition-colors">Class 10 (ଦଶମ ଶ୍ରେଣୀ)</a></li>
                </ul>
              </div>

              {/* Directories Column */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest font-bold">Resource Hubs</h4>
                <ul className="space-y-2 text-xs font-bold text-slate-400">
                  <li><a href="?preview=directory_library" className="hover:text-white transition-colors">Digital Library Index</a></li>
                  <li><a href="?preview=directory_games" className="hover:text-white transition-colors">Traditional Games Guide</a></li>
                  <li><a href="?preview=directory_tools" className="hover:text-white transition-colors">AI Learning Tools</a></li>
                  <li><a href="?preview=directory_districts" className="hover:text-white transition-colors">Odisha District Hubs</a></li>
                </ul>
              </div>

              {/* Games Column */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest font-bold">Traditional Games</h4>
                <ul className="space-y-2 text-xs font-bold text-slate-400">
                  <li><a href="?preview=game_baghchheli" className="hover:text-white transition-colors">Bagh Chheli (ବାଘ ଛେଳି)</a></li>
                  <li><a href="?preview=game_puchi" className="hover:text-white transition-colors">Puchi (ପୁଚି)</a></li>
                  <li><a href="?preview=game_kaudi" className="hover:text-white transition-colors">Kaudi (କାଉଡ଼ି)</a></li>
                  <li><a href="?preview=game_rumalchori" className="hover:text-white transition-colors">Rumal Chori (ରୁମାଲ୍ ଚୋରି)</a></li>
                </ul>
              </div>

              {/* AI Tools Column */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest font-bold">AI Study Tools</h4>
                <ul className="space-y-2 text-xs font-bold text-slate-400">
                  <li><a href="?preview=tool_gundulututor" className="hover:text-white transition-colors">Gundulu AI Doubt Solver</a></li>
                  <li><a href="?preview=tool_mathblackboard" className="hover:text-white transition-colors">Math Blackboard Solver</a></li>
                  <li><a href="?preview=tool_osepaplanner" className="hover:text-white transition-colors">OSEPA Lesson Planner</a></li>
                  <li><a href="?preview=tool_aiworksheet" className="hover:text-white transition-colors">AI Worksheet Generator</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-white/5 pt-8 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
              {language === 'or' 
                ? '© ୨୦୨୬ ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର • ଓଡ଼ିଶା ରାଜ୍ୟ ବୋର୍ଡ ଶ୍ରେଣୀ ୧ ରୁ ୧୦ ପାଇଁ ନିର୍ମିତ' 
                : '© 2026 Utkal Skill Centre • Built for Odisha State Board Class 1 to 10'}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-30 pointer-events-none">
          <p className="text-[7px] font-black uppercase tracking-[0.6em] text-[#ffd700]">Pride Association of Bigsan Group</p>
          <p className="text-[6px] text-white/60 mt-1 uppercase tracking-widest">v2.1.0-Neural-Matrix • USC Platform</p>
        </div>
      </div>
    );
  }



  const isClassEnabled = true; // Restriction removed

  if (user && user.role !== 'admin' && !isClassEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lucide.Lock size={48} className="text-amber-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            {language === 'en' ? "Class Currently Disabled" : "ଶ୍ରେଣୀ ବର୍ତ୍ତମାନ ଅକ୍ଷମ ଅଛି"}
          </h2>
          <p className="text-slate-400">
            {language === 'en' 
              ? `Access to ${translations[language].classes[user.class] || user.class} is currently restricted by the administrator. Please contact support or check back later.`
              : `${translations[language].classes[user.class] || user.class} ପାଇଁ ପ୍ରବେଶ ବର୍ତ୍ତମାନ ପ୍ରଶାସକଙ୍କ ଦ୍ୱାରା ସୀମିତ ଅଛି | ଦୟାକରି ସହାୟତା ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ କିମ୍ବା ପରେ ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ |`}
          </p>
          <button 
            onClick={handleLogout}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold"
          >
            {translations[language].logout}
          </button>
        </div>
      </div>
    );
  }

  return (
  <ErrorBoundary language={language}>
    <div 
      className="contents"
      onClickCapture={(e) => {
        if (isSunday && !sundayBypassed && !showSundayLockout) {
          // Catch the first interaction on Sunday to trigger the "Door Slam"
          e.preventDefault();
          e.stopPropagation();
          setShowSundayLockout(true);
        }
      }}
    >

    <SEO 
      subject={
        activeTab === 'study_buddy' ? 'AI Study Buddy' : 
        activeTab === 'practice' ? 'Practice Set' : 
        activeTab === 'syllabus_tracker' ? 'Syllabus Tracker' : 
        activeTab === 'digital_library' ? 'AI Digital Library' : 
        undefined
      }
    />
    {showTestSeriesPoster && (
      <Suspense fallback={null}>
        <TestSeriesPoster onClose={() => setShowTestSeriesPoster(false)} />
      </Suspense>
    )}

    {false && (
      <Suspense fallback={null}>
        <RajaFestivalPoster onClose={() => {
          setShowLaunchPoster(false);
          const todayStr = new Date().toLocaleDateString('en-CA');
          localStorage.setItem('rajaFestivalLastSeenDate', todayStr);
          handleGunduluGreeting();
        }} />
      </Suspense>
    )}


    {/* Hiding Digital Library Launch Popup completely for now
    {showLibraryPopup && user && (
      <Suspense fallback={null}>
        <DigitalLibraryLaunchPopup 
          userId={user.id}
          language={language}
          theme={theme}
          onClose={() => setShowLibraryPopup(false)}
          onEnterLibrary={() => {
            setActiveTab('digital_library');
            setShowLibraryPopup(false);
          }}
        />
      </Suspense>
    )}
    */}

    {showLaunchEvent && (
      <Suspense fallback={<ViewLoader />}>
        <LaunchCelebration
          onClose={() => {
            setShowLaunchEvent(false);
            localStorage.setItem('utkalPlayStoreLaunchSeen', 'true');
            setShowLibraryPopup(false);
          }}
          user={user}
          language={language}
          theme={theme}
        />
      </Suspense>
    )}

    {/* Full screen container - NO SCROLL ALLOWED HERE */}
    <div className="h-screen w-full app-viewport-container flex relative overflow-hidden font-sans">
      
      {/* Background Pattern Layer */}
      <div className="temple-bg-overlay" />

      {/* Decorative Orbs */}
      <div className="bg-orb-gold top-[-10%] left-[-10%]" />
      <div className="bg-orb-terracotta bottom-[-10%] right-[-10%]" />

      {/* SIDEBAR Component */}
      <Suspense fallback={null}>
        <Sidebar 
          language={language}
          setLanguage={setLanguage}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          user={user}
          isAdminView={isAdminView}
          setIsAdminView={setIsAdminView}
          handleLogout={handleLogout}
          isRegisteredForTestSeries={isRegisteredForTestSeries}
        />
      </Suspense>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* HEADER: Sticky at top */}
        <header className="h-20 flex items-center justify-between px-6 bg-black/20 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-20 print:hidden">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => {
                console.log("Header: Logo/Title clicked. Navigating to dashboard.");
                setActiveTab('dashboard');
              }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-95 transition-all group"
            >
              {/* UTKAL LOGO used in Header */}
              <img 
                src="/utkal-192.png" 
                className="h-10 w-10 rounded-full object-cover drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-105 transition-transform" 
                alt="Utkal Skill Centre" 
              />
              <h1 className="text-base sm:text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight ml-2 font-serif whitespace-nowrap">
                {language === 'or' ? 'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Utkal Skill Centre'}
              </h1>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            {user?.class !== 'sishuvatika(Anganwadi)' && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <Lucide.Bell size={22} />
                {studentNotifications.filter(n => n.id && !readNotifIds.includes(n.id)).length > 0 && (
                  <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black/20"></span>
                )}
              </button>
            )}
            
            {/* User Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 hover:border-emerald-500/50 transition-colors shrink-0"
            >
              <img 
                src={user?.avatar || "/gundulu-pointing-nobg.png"} 
                alt="Profile" 
                className="w-full h-full object-cover bg-slate-800" 
              />
            </button>
          </div>

        </header>

        <div 
          ref={contentScrollRef} 
          className={`flex-1 ${
            (activeTab === 'study_buddy' || activeTab === 'gundulu' || activeTab === 'digital_library' || activeTab === '3d_study' || activeTab === 'community') 
              ? 'overflow-hidden p-0 flex flex-col min-h-0' 
              : (activeTab === 'dashboard'
                  ? 'overflow-y-auto pt-0 px-4 pb-28 lg:pb-8 sm:pt-4 md:pt-6 md:px-8'
                  : 'overflow-y-auto p-4 md:p-8 pb-28 lg:pb-8')
          } scrollbar-hide relative z-10`}
        >
          <AnimatePresence mode="wait">
            {/* Your 10+ Tab components go here... */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 flex flex-col w-full">
                {showShowcaseTab && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-4 bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative overflow-hidden backdrop-blur-md shrink-0 select-none"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-500/15 rounded-xl border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
                        <Lucide.Activity size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          ⚡ Auditor Observability Active
                        </h4>
                        <p className="text-[10px] md:text-xs text-slate-400 leading-relaxed font-medium">
                          Monitor GenAI pipeline latencies, speech synthesis routing decisions, and context caching cost controls in real-time.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.type = 'sine';
                          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.1);
                        } catch (e) {}
                        setActiveTab('telemetry');
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/20 cursor-pointer shadow-lg shadow-emerald-500/15 shrink-0"
                    >
                      Open Telemetry HUD
                      <Lucide.ArrowRight size={12} />
                    </button>
                  </motion.div>
                )}
                {user?.role === 'teacher' ? (
                  <TeacherDashboard user={user} language={language} chapters={chapters} setActiveTab={setActiveTab} textbooksCount={textbooks.length} isPremium={isPremium} loadChapters={loadChapters} />
                ) : user?.class === 'sishuvatika(Anganwadi)' ? (
                  <SishuVatikaDashboard
                    user={user}
                    language={language}
                    isPremium={isPremium}
                    onUpgrade={() => setActiveTab('plans')}
                    onOpenTutor={() => {
                      setActiveTab('gundulu');
                    }}
                    onOpenLibrary={() => setActiveTab('digital_library')}
                  />
                ) : (
                  <Dashboard
                    user={user}
                    leaderboard={leaderboard}
                    language={language}
                    theme={theme}
                    isPremium={isPremium}
                    onUpgrade={() => setActiveTab('plans')}
                    chapters={chapters}
                    dailyChallenge={dailyChallenge}
                    hasDailyPractice={dailyMcqs.length > 0}
                    todayDailySubject={todayDailySubject}
                    tomorrowDailySubject={tomorrowDailySubject}
                    onOpenDailyPractice={() => {
                      console.log("App: onOpenDailyPractice callback triggered. Setting activeTab to 'daily_mcqs'.");
                      setActiveTab('daily_mcqs');
                    }}
                    onShareDailyPractice={handleShareDailyPractice}
                    isRegistered={isRegisteredForTestSeries}
                    onRegistrationComplete={() => setIsRegisteredForTestSeries(true)}
                    onOpenTutor={() => {
                      console.log("App: onOpenTutor callback triggered. Setting activeTab to 'gundulu'.");
                      setActiveTab('gundulu');
                    }}
                    onOpenCommunity={() => setShowCommunityChat(true)}
                    following={following}
                    onToggleFollow={handleToggleFollow}
                    isTourStep3={tourStep === 3} // Student XP is Step 3
                    isTourStep4={tourStep === 2} // Gundulu AI is Step 2
                    onOpenRajaPoster={() => setShowLaunchPoster(true)}
                    onOpenMonthlyTests={() => setActiveTab('monthly_tests')}
                    onOpenGameZone={() => {
                      console.log("App: onOpenGameZone callback triggered. Setting activeTab to 'game_zone'.");
                      setActiveTab('game_zone');
                    }}
                    onOpenLibrary={() => {
                      console.log("App: onOpenLibrary callback triggered. Setting activeTab to 'digital_library'.");
                      setActiveTab('digital_library');
                    }}
                  />
                )}
              </div>
            )}
            {activeTab === 'notifications' && <NotificationsView notifications={studentNotifications} language={language} readNotifIds={readNotifIds} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'digital_library' && (
              <DigitalLibraryView
                user={user}
                chapters={
                  user?.class === 'sishuvatika(Anganwadi)'
                    ? textbooks
                        .filter((tb: any) => tb.class === 'sishuvatika(Anganwadi)')
                        .map((tb: any, index: number) => ({
                          id: tb.id || `virtual_tb_${index}`,
                          class: tb.class,
                          subject: 'shishu_vatika',
                          title: tb.title,
                          pdfUrl: getDirectDriveDownloadUrl(tb.download_url || tb.driveUrl),
                          number: 1,
                          description: 'ଶିଶୁ ବାଟିକା ସଂପୂର୍ଣ୍ଣ ପାଠ୍ୟପୁସ୍ତକ'
                        }))
                    : chapters.filter((c: any) => c.isLibraryChapter || c.pdfUrl)
                }
                language={language}
                isPremium={isPremium}
                onUpgrade={() => setActiveTab('plans')}
                onBack={() => setActiveTab('dashboard')}
                loadChapters={loadChapters}
                onNavigateTo3D={() => setActiveTab('3d_study')}
              />
            )}
            {activeTab === 'smart_classes' && (
              <SmartClassesView 
                user={user} 
                language={language} 
                isPremium={isPremium} 
                onUpgrade={() => setActiveTab('plans')}
                onBack={() => setActiveTab('dashboard')}
              />
            )}
            {activeTab === 'poster_generator' && (
              <Suspense fallback={<ViewLoader fullHeight />}>
                <SocialPosterGenerator
                  chapters={chapters}
                  onBack={() => setActiveTab('dashboard')}
                />
              </Suspense>
            )}
            {activeTab === 'community' && user && (
              <Suspense fallback={<ViewLoader fullHeight />}>
                <CommunityChatView 
                  language={language}
                  student={user}
                  onClose={() => setActiveTab('dashboard')}
                  isTab={true}
                  following={following}
                  onToggleFollow={handleToggleFollow}
                />
              </Suspense>
            )}
            {activeTab === 'textbooks' && <TextbooksView user={user} textbooks={textbooks} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'monthly_tests' && (
              <MonthlyTestsView tests={monthlyTests} submissions={testSubmissions} language={language} user={user} setActiveTab={setActiveTab} onBack={() => setActiveTab('dashboard')} loadTestSubmissions={loadTestSubmissions} chapters={chapters} />
            )}

            {activeTab === 'syllabus_tracker' && <SyllabusTracker user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'daily_mcqs' && <DailyMcqView mcqs={dailyMcqs} submissions={dailyMcqSubmissions} user={user} language={language} onBack={() => setActiveTab('dashboard')} onSubmissionSuccess={loadDailyMcqSubmissions} />}
            {activeTab === 'study_buddy' && (
              <StudyBuddyView language={language} isPremium={isPremium} onUpgrade={() => setActiveTab('plans')} user={user} initialVoiceMode={openTutorInVoiceMode} onBack={() => setActiveTab('dashboard')} onLanguageChange={setLanguage} systemSettings={systemSettings} />
            )}
            {activeTab === 'gundulu' && (
              <Suspense fallback={<div className="flex-grow flex items-center justify-center text-white text-sm font-semibold">Loading Gundulu AI Tutor...</div>}>
                {user?.class === 'sishuvatika(Anganwadi)' ? (
                  <GunduluSishuVatika 
                    user={user} 
                    isPremium={isPremium} 
                    onUpgrade={() => setActiveTab('plans')} 
                    onBack={() => setActiveTab('dashboard')} 
                  />
                ) : (
                  <GunduluHuman 
                    user={user} 
                    isPremium={isPremium} 
                    onUpgrade={() => setActiveTab('plans')} 
                    onBack={() => setActiveTab('dashboard')} 
                  />
                )}
              </Suspense>
            )}

            {activeTab === 'profile' && (
              <ProfileView 
                user={user} 
                language={language} 
                theme={theme} 
                setTheme={setTheme} 
                onBack={() => setActiveTab('dashboard')} 
                onParentAccess={() => setActiveTab('parent_dashboard')} 
                setActiveTab={setActiveTab} 
                setIsParentUnlocked={setIsParentUnlocked}
                setUser={setUser}
              />
            )}
            {activeTab === 'parent_dashboard' && (
              (user?.parent_pin && !isParentUnlocked && !tourStep && !window.location.search.includes('judge') && !window.location.hash.includes('judge')) ? (
                <ParentPinGate 
                  parentPin={user.parent_pin}
                  onCorrectPin={() => setIsParentUnlocked(true)}
                  onBack={() => setActiveTab('dashboard')}
                  language={language}
                />
              ) : (
                <ParentDashboard user={user} chapters={chapters} leaderboard={leaderboard} language={language} onBack={() => setActiveTab('profile')} userProgress={userProgress} />
              )
            )}
            {activeTab === 'leaderboard' && <LeaderboardView leaderboard={leaderboard} language={language} onBack={() => setActiveTab('dashboard')} following={following} user={user} onToggleFollow={handleToggleFollow} />}
            {activeTab === 'support' && <SupportView user={user} language={language} onBack={() => setActiveTab('dashboard')} handleSupportClick={handleSupportClick} confirmSupport={confirmSupport} supportSession={supportSession} />}
            {activeTab === 'store' && <AvatarStore user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'plans' && <LocalSubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} systemSettings={systemSettings} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'pitch_deck' && <PitchDeckView language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'telemetry' && <TelemetryView language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === '3d_study' && <Gundulu3DLab language={language} user={user} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'mo_swapna' && (
              <Suspense fallback={<ViewLoader fullHeight />}>
                <MoSwapnaView 
                  language={language}
                  user={user}
                  onBack={() => setActiveTab('dashboard')} 
                />
              </Suspense>
            )}
            {activeTab === 'about_us' && (
              <Suspense fallback={<ViewLoader />}>
                <AboutUsModal language={language} onClose={() => setActiveTab('dashboard')} />
              </Suspense>
            )}
            {activeTab === 'game_zone' && (
              <GameZone 
                user={user} 
                language={language} 
                onBack={() => setActiveTab('dashboard')} 
              />
            )}
          </AnimatePresence>


        </div>

        {/* Bottom Floating Navigation Bar for Mobile */}
        {user && !isAdminView && activeTab !== 'gundulu' && activeTab !== 'study_buddy' && activeTab !== 'digital_library' && activeTab !== 'about_us' && activeTab !== 'community' && (
          <BottomNavBar
            language={language}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setSidebarOpen={setSidebarOpen}
            isSidebarOpen={isSidebarOpen}
            unreadNotificationsCount={studentNotifications.filter(n => n.id && !readNotifIds.includes(n.id)).length}
            userRole={user.role}
            userName={user.name}
            userClass={user.class}
          />
        )}
      </main>
    </div>

    {/* New Notification Popup */}
    <AnimatePresence>
      {newNotification && (
        <motion.div 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="fixed top-6 right-6 z-[100] w-80 glass-card neon-border rounded-2xl p-4 shadow-2xl bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30"
        >
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
              <Lucide.Bell size={24} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">New Announcement</span>
                <button onClick={() => setNewNotification(null)} className="text-slate-500 hover:text-white transition-colors">
                  <Lucide.X size={14} />
                </button>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-1">Utkal Skill Centre</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{newNotification.message}</p>
              <button 
                onClick={() => {
                  setActiveTab('notifications');
                  setNewNotification(null);
                }}
                className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider hover:underline pt-2"
              >
                View Details →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    {/* Remote Support UI */}
    {supportSession && (
      <SupportOverlay session={supportSession} onEnd={endSupport} />
    )}

    {showCommunityChat && user && (
      <Suspense fallback={<ViewLoader fullHeight />}>
        <CommunityChatView 
          language={language}
          student={user}
          onClose={() => setShowCommunityChat(false)}
          following={following}
          onToggleFollow={handleToggleFollow}
        />
      </Suspense>
    )}

    {/* Guided Tour Stepper */}
    {tourStep !== null && (
      <div className="fixed bottom-6 right-6 z-[100005] w-full max-w-[380px] px-4 md:px-0">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="glass-card rounded-[2rem] p-5 md:p-6 shadow-2xl bg-slate-950/95 border border-amber-500/30 flex flex-col gap-4 relative overflow-hidden backdrop-blur-2xl"
        >
          {/* Neon animated gradient background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]"></span>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Guided Judge Tour</span>
            </div>
            <span className="text-[10px] font-black text-slate-500 tracking-wider">Step {tourStep} of 9</span>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm md:text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5">
              {tourStep === 1 && "👋 Welcome & Automated Setup"}
              {tourStep === 2 && "🤖 Gundulu AI Homework Helper"}
              {tourStep === 3 && "⚡ Student XP & Streaks Tracker"}
              {tourStep === 4 && "📚 Digital Library"}
              {tourStep === 5 && "📊 Syllabus Tracker"}
              {tourStep === 6 && "🏆 Statewide Leaderboards"}
              {tourStep === 7 && "👨‍👩‍👦 Parent Insights (PRO)"}
              {tourStep === 8 && "💼 Pitch Deck & Gemma Roadmap"}
              {tourStep === 9 && "⚡ Live System Observability"}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {tourStep === 1 && "We have automatically logged you into a Class 10 BSE Odisha simulated account (Anuradha Panda). Let's take a quick tour of our core features!"}
              {tourStep === 2 && "Our zero-hallucination Gundulu AI Homework Helper is grounded directly in regional textbooks, offering instant low-latency bilingual homework assistance and explanations."}
              {tourStep === 3 && "Track your daily study goals and maintain streaks. Earn XP by reading chapters, answering MCQs, and chatting with Gundulu AI!"}
              {tourStep === 4 && "Rural students get unlimited, structured access to curated subject directories of school lessons completely for free."}
              {tourStep === 5 && "Track your board exam preparation progress chapter-by-chapter with our real-time syllabus tracker."}
              {tourStep === 6 && "Compete with other students across Odisha, track your rank, and earn rewards on our statewide leaderboards."}
              {tourStep === 7 && "Parents receive AI-generated actionable reports detailing their child's weak areas, accuracy, and district ranking."}
              {tourStep === 8 && "Explore our pilot project's pitch deck, scale-to-zero serverless hosting, and our roadmap for training a native Odia Gemma model."}
              {tourStep === 9 && "Auditor-facing live telemetry console showing Vertex AI pipe delays, context caching cost reductions, and a failure injection sandbox to test system resilience."}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 shrink-0">
            <button 
              onClick={handleEndTour}
              className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-2">
              {tourStep > 1 && (
                <button 
                  onClick={() => handleTourStepChange(tourStep - 1)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-white font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
                >
                  <Lucide.ChevronLeft size={12} />
                  Back
                </button>
              )}
              <button 
                onClick={() => {
                  if (tourStep < 9) {
                    handleTourStepChange(tourStep + 1);
                  } else {
                    handleEndTour();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>{tourStep === 9 ? "Finish" : "Next"}</span>
                {tourStep < 9 && <Lucide.ChevronRight size={12} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}

    {/* Set Switcher PIN Modal */}
    <AnimatePresence>
      {showSetPinPrompt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm text-center relative overflow-hidden"
          >
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => {
                  sessionStorage.setItem('set_pin_prompt_dismissed', 'true');
                  setShowSetPinPrompt(false);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <Lucide.X size={20} />
              </button>
            </div>

            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center text-amber-400 mx-auto mb-6 border border-amber-500/30">
              <Lucide.ShieldAlert size={32} className="animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              {language === 'en' ? 'Set Login PIN' : 'ଲଗଇନ୍ ପିନ୍ ସେଟ୍ କରନ୍ତୁ'}
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {language === 'en' 
                ? 'Set a 4-digit PIN to switch between siblings on this phone instantly without waiting for SMS OTP.' 
                : 'ଏହି ମୋବାଇଲରେ ବିନା SMS OTP ରେ ତୁରନ୍ତ ଆକାଉଣ୍ଟ ବଦଳାଇବା ପାଇଁ ଏକ ୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିନ୍ ସେଟ୍ କରନ୍ତୁ |'}
            </p>
            
            {/* 4 dots entry */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                    newPinValue.length > i 
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                      : 'border-slate-700 bg-slate-950/50 text-slate-600'
                  }`}
                >
                  {newPinValue.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '✕', 0, '✓'].map((btn) => (
                <button
                  key={btn}
                  onClick={async () => {
                    if (btn === '✕') {
                      setNewPinValue(prev => prev.slice(0, -1));
                    } else if (btn === '✓') {
                      alert("checkmark button clicked! newPinValue = " + newPinValue);
                      if (newPinValue.length !== 4) {
                        alert(language === 'en' ? 'Please enter a 4-digit PIN' : 'ଦୟାକରି ୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିନ୍ ଦିଅନ୍ତୁ');
                        return;
                      }
                      // Save PIN to Firestore
                      try {
                        alert("Setting state optimistic! user.id = " + (user ? user.id : 'undefined'));
                        setUser(prev => prev ? { ...prev, pin: newPinValue, parent_pin: newPinValue } : prev);
                        setShowSetPinPrompt(false);
                        updateDoc(doc(firestore, 'users', user.id), {
                          pin: newPinValue,
                          parent_pin: newPinValue
                        }).then(() => {
                          alert("Firestore PIN saved successfully!");
                        }).catch((err) => {
                          alert("Firestore PIN save error: " + err.message);
                        });
                        alert("PIN set successfully locally!");
                      } catch (err: any) {
                        console.error("Failed to save PIN:", err);
                        alert("Failed to save PIN error caught: " + err.message);
                      }
                    } else {
                      if (newPinValue.length < 4) {
                        setNewPinValue(prev => prev + btn);
                      }
                    }
                  }}
                  className={`py-4 rounded-xl text-lg font-black transition-all active:scale-95 flex items-center justify-center ${
                    btn === '✓'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                      : btn === '✕'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-950/60 hover:bg-slate-900 text-white border border-white/5 shadow-inner'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    </div>
  </ErrorBoundary>
);
}

function ParentReportView({ user, results, tests, onBack, language }: any) {
  const handlePrint = () => {
    window.print();
  };

  const avgAccuracy = results.length > 0 ? Math.round(results.reduce((acc: number, r: any) => acc + r.accuracy, 0) / results.length) : 0;

  return (
    <div className="fixed inset-0 z-[110] bg-white text-slate-900 overflow-y-auto p-4 md:p-12 print:p-0">
      <div className="max-w-4xl mx-auto border-2 border-slate-200 rounded-3xl p-8 md:p-12 relative overflow-hidden print:border-0 print:m-0">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-slate-100 pb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest">
              Official Progress Report
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {language === 'or' ? 'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Utkal Skill Centre'}
            </h1>
            <div className="space-y-1">
              <p className="text-xl font-bold text-slate-700">Student: {user.name}</p>
              <p className="text-sm text-slate-500">Class: {user.class} | Board: {user.board}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Generated On</p>
            <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString()}</p>
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-2xl font-black text-emerald-600">{avgAccuracy}%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Accuracy</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Academic Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <span className="text-sm font-medium text-slate-600">Tests Attempted</span>
                <span className="text-lg font-black text-slate-900">{results.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <span className="text-sm font-medium text-slate-600">Chapters Completed</span>
                <span className="text-lg font-black text-slate-900">{user.completed_chapters?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <span className="text-sm font-medium text-slate-600">Total Reward Points</span>
                <span className="text-lg font-black text-emerald-600">{user.points} XP</span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-500 pl-4">Recent Performance</h3>
            <div className="space-y-3">
              {results.slice(0, 5).map((r: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{r.chapterName || 'General Assessment'}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(r.timestamp?.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-black ${r.accuracy >= 80 ? 'text-emerald-500' : r.accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{r.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-900 rounded-3xl text-white mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Lucide.Sparkles className="text-emerald-400" size={24} />
            <h3 className="text-lg font-black uppercase tracking-widest">Gundulu's Insight</h3>
          </div>
          <p className="text-slate-300 italic leading-relaxed">
            "{user.name} is showing consistent improvement in their learning journey. We recommend focusing more on weekly practice to maintain their top rank in the district."
          </p>
        </div>

        <div className="flex justify-between items-end border-t border-slate-100 pt-12 mt-12">
          <div className="text-center">
            <div className="w-32 h-1 bg-slate-100 mb-2"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Guardian's Signature</p>
          </div>
          <div className="text-center">
            <p className="font-serif font-black text-slate-900 text-xl mb-1 italic">
              {language === 'or' ? 'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Utkal Skill Centre'}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Generated</p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center gap-4 print:hidden">
        <button 
          onClick={handlePrint}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-slate-900/20"
        >
          <Lucide.Download size={20} /> Download Report (PDF)
        </button>
        <button 
          onClick={onBack}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-4 rounded-2xl font-bold"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ParentDashboard({ user, chapters, leaderboard, language, onBack, userProgress }: any) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [learningInsights, setLearningInsights] = useState<string>('');
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [viewingReport, setViewingReport] = useState(false);
  const [classLeaderboard, setClassLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.class) return;
    const fetchClassLeaderboard = async () => {
      try {
        const q = query(
          collection(firestore, 'public_profiles'),
          where('class', '==', user.class),
          orderBy('points', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const testingNumbers = ['9556086560', '+919556086560', '6370487877', '+916370487877', '9337956168', '+919337956168', '8926118509', '+918926118509', '8457811227', '+918457811227', '7735118243', '+917735118243'];
        const filteredData = data.filter((s: any) => !testingNumbers.includes(s.phoneNumber));
        setClassLeaderboard(filteredData);
      } catch (err) {
        console.error("Failed to fetch class leaderboard:", err);
      }
    };
    fetchClassLeaderboard();
  }, [user.class]);

  useEffect(() => {
    const q = query(
      collection(firestore, 'quiz_results'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(data);
      setLoading(false);
      if (data.length > 0) {
        generateInsights(data);
      }
    }, (error) => {
      console.error("Parent Dashboard Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id]);

  const generateInsights = async (quizData: any[]) => {
    if (learningInsights || generatingInsights) return;
    setGeneratingInsights(true);
    try {
      const ai = getAI();
      const prompt = `Analyze these quiz results for a student named ${user.name} and provide 3-4 concise, actionable insights for their parent. 
      Data: ${safeJsonStringify(quizData.map(r => ({ chapter: String(r.chapterId), accuracy: r.accuracy, score: r.score, total: r.total })))}
      Format the response in friendly, conversational Odia (ଓଡ଼ିଆ). Focus on strengths and areas for improvement, addressing the parents directly in an encouraging, supportive tone. Limit to 3-4 bullet points.`;

      const responseText = await withRetry(async (modelName, apiVersion) => {
        const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        return result.response.text();
      }, 'flash');

      setLearningInsights(responseText || "No insights available yet.");
    } catch (err) {
      console.error("Failed to generate learning insights:", err);
      setLearningInsights("Unable to generate learning insights at this time.");
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (viewingReport) {
    return (
      <ParentReportView 
        user={user}
        results={results}
        tests={chapters}
        language={language}
        onBack={() => setViewingReport(false)}
      />
    );
  }

  const stats = {
    totalQuizzes: results.length,
    avgScore: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length) : 0,
    chaptersCompleted: user.completed_chapters?.length || 0,
    totalChapters: chapters.length
  };

  const displayLeaderboard = classLeaderboard.length > 0 ? classLeaderboard : leaderboard;
  const userRank = displayLeaderboard.findIndex((s: any) => s.id === user.id || s.name === user.name) + 1 || '-';

  const formatStudyTime = (minutes: number) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
          >
            <Lucide.ArrowLeft size={20} />
            <span className="text-sm">Back</span>
          </button>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            {language === 'en' ? 'Parent Insights' : 'ପିତାମାତା ଇନସାଇଟ୍ସ'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">{user.name}'s Academic Progress</p>
        </div>
        <button 
          onClick={() => setViewingReport(true)}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Lucide.FileText size={16} /> Get Full Progress Report
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stats.chaptersCompleted} / {stats.totalChapters}</div>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">Chapters Done</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-2xl md:text-3xl font-bold text-emerald-500 mb-1">{stats.avgScore}%</div>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">Avg Accuracy</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-2xl md:text-3xl font-bold text-blue-500 mb-1">{stats.totalQuizzes}</div>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">Quizzes Taken</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="text-2xl md:text-3xl font-bold text-amber-400 mb-1 flex items-center justify-center gap-1.5">
            <Lucide.Clock size={20} className="md:w-6 md:h-6" />
            {formatStudyTime(user.totalStudyMinutes || 0)}
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold tracking-wider">Active Time</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8">
        <ProgressChart data={userProgress} language={language} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">Recent Activity</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Lucide.Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card neon-border rounded-3xl p-12 text-center">
              <p className="text-slate-500">No activity recorded yet. Encourage your child to take a quiz!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r) => {
                const chapter = chapters.find((c: any) => c.id === r.chapterId);
                return (
                  <motion.div 
                    variants={itemVariants}
                    key={r.id} 
                    className="glass-card neon-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${r.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-500' : r.accuracy >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                        {r.accuracy}%
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{chapter?.title || 'Unknown Chapter'}</h4>
                        <p className="text-xs text-slate-500">{r.timestamp?.toDate().toLocaleDateString()} • {r.score}/{r.total} Correct</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-600 tracking-widest">
                      {chapter?.subject}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          {user?.parentShowLeaderboard !== false && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Effort Ranking</h3>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                  Rank #{userRank}
                </div>
              </div>
              <div className="glass-card neon-border rounded-3xl p-6 overflow-hidden">
                <div className="space-y-4">
                  {displayLeaderboard.slice(0, 5).map((student: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between ${student.name === user.name ? 'bg-emerald-500/10 -mx-6 px-6 py-2 border-y border-emerald-500/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-xs font-bold ${i < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>{i + 1}</span>
                        <span className={`text-sm ${student.name === user.name ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{student.name}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">{student.points}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">Weekly Effort Points</p>
              </div>
            </>
          )}

          <div className="p-6 rounded-3xl bg-slate-900/80 border border-emerald-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Lucide.Sparkles className="text-emerald-400" size={18} /> 
              AI Learning Insights
            </h3>
            
            <div className="min-h-[100px] mb-6 relative z-10">
              {generatingInsights ? (
                <div className="flex flex-col items-center justify-center h-full py-4 opacity-70">
                  <Lucide.Loader2 className="animate-spin text-emerald-500 mb-2" size={24} />
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Analyzing Student Data...</p>
                </div>
              ) : learningInsights && learningInsights !== "No insights available yet." ? (
                <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-emerald max-w-none prose-p:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{cleanMathNotation(learningInsights)}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed text-center py-4">
                  Take more quizzes to unlock detailed AI skill gap analysis and personalized learning paths.
                </p>
              )}
            </div>

            <button 
              onClick={() => setViewingReport(true)}
              className="relative z-10 w-full py-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Lucide.FileBarChart2 size={16} /> View Detailed Report
            </button>
          </div>
        </motion.div>
      </div>

      {/* SOCIAL MEDIA LINKS */}
      <motion.div variants={itemVariants} className="mt-12 pt-8 border-t border-emerald-500/20 text-center">
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Connect With Utkal Skill Centre</p>
        <div className="flex items-center justify-center gap-4">
          <a href="#" className="p-3 rounded-full bg-white/5 text-slate-400 hover:text-[#ffd700] hover:bg-white/10 hover:-translate-y-1 transition-all">
            <Lucide.Youtube size={20} />
          </a>
          <a href="#" className="p-3 rounded-full bg-white/5 text-slate-400 hover:text-[#ffd700] hover:bg-white/10 hover:-translate-y-1 transition-all">
            <Lucide.Instagram size={20} />
          </a>
          <a href="#" className="p-3 rounded-full bg-white/5 text-slate-400 hover:text-[#ffd700] hover:bg-white/10 hover:-translate-y-1 transition-all">
            <Lucide.Twitter size={20} />
          </a>
          <a href="#" className="p-3 rounded-full bg-white/5 text-slate-400 hover:text-[#ffd700] hover:bg-white/10 hover:-translate-y-1 transition-all">
            <Lucide.Facebook size={20} />
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SupportView({ user, language, onBack, handleSupportClick, confirmSupport, supportSession }: any) {
  const [ticket, setTicket] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'syllabus' | 'general'>('bug');
  const [rating, setRating] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!ticket.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(firestore, 'support_tickets'), {
        userId: user.id,
        userName: user.name,
        userPhone: user.phoneNumber || '',
        userEmail: user.email || '',
        category,
        rating,
        message: ticket,
        status: 'open',
        createdAt: serverTimestamp()
      });
      setSuccess(true);
      setTicket('');
    } catch (e) {
      console.error("Support Ticket Error:", e);
      alert(translations[language].support.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8 pb-20 px-4 sm:px-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack} 
            className="p-2.5 bg-slate-800/80 backdrop-blur-md rounded-2xl text-slate-400 hover:text-white border border-white/5 transition-all"
          >
            <Lucide.ArrowLeft size={20} />
          </motion.button>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{translations[language].support.title}</h2>
        </div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900/60 border border-white/5 px-4 py-1.5 rounded-full backdrop-blur-md">
          {language === 'or' ? 'ଡେଭେଲପର ଜୋନ୍' : 'Developer Zone'}
        </div>
      </div>

      {/* Grid of contact tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Support Remote Access */}
        {!supportSession && handleSupportClick && (
          <motion.button 
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSupportClick} 
            className={`p-6 border rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-lg ${
              confirmSupport 
                ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20 shadow-rose-500/5' 
                : 'bg-red-500/5 border-red-500/15 hover:bg-red-500/10 shadow-red-500/5'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all shadow-md ${confirmSupport ? 'bg-rose-500 shadow-rose-500/30' : 'bg-red-500 shadow-red-500/25 group-hover:rotate-12'}`}>
              <Lucide.LifeBuoy size={26} className={`${confirmSupport ? 'animate-spin' : 'animate-spin-slow'}`} />
            </div>
            <span className="text-white font-black text-xs uppercase tracking-wider text-center mt-1">
              {confirmSupport ? (language === 'or' ? 'ନିଶ୍ଚିତ କରନ୍ତୁ?' : 'Confirm Connection?') : (language === 'or' ? 'ଲାଇଭ୍ ସହାୟତା' : 'Live Support')}
            </span>
            <span className="text-[9px] font-bold text-slate-500 text-center">
              {language === 'or' ? 'ରିମୋଟ ସହାୟତା' : 'Remote Assistant'}
            </span>
          </motion.button>
        )}

        {/* WhatsApp Card */}
        <motion.a 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          href="https://wa.me/919337956168" 
          target="_blank" 
          className="p-6 bg-emerald-500/5 border border-emerald-500/15 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-emerald-500/10 transition-all relative overflow-hidden group shadow-lg shadow-emerald-500/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/25 transition-all group-hover:scale-110">
            <Lucide.MessageCircle size={26} />
          </div>
          <span className="text-white font-black text-xs uppercase tracking-wider text-center mt-1">{translations[language].support.whatsappSupport}</span>
          <span className="text-[9px] font-bold text-slate-500 text-center">
            {language === 'or' ? 'ତତ୍କ୍ଷଣାତ ମେସେଜ୍' : 'Instant Reply'}
          </span>
        </motion.a>

        {/* Email Card */}
        <motion.a 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          href="mailto:gyanaloka.panda@gmail.com" 
          className="p-6 bg-blue-500/5 border border-blue-500/15 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-blue-500/10 transition-all relative overflow-hidden group shadow-lg shadow-blue-500/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 transition-all group-hover:scale-110">
            <Lucide.Mail size={26} />
          </div>
          <span className="text-white font-black text-xs uppercase tracking-wider text-center mt-1">{translations[language].support.emailSupport}</span>
          <span className="text-[9px] font-bold text-slate-500 text-center">
            {language === 'or' ? 'ଅଫିସିଆଲ୍ ଇମେଲ୍' : 'Official Channel'}
          </span>
        </motion.a>

        {/* Phone Call Card */}
        <motion.a 
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          href="tel:+919337956168" 
          className="p-6 bg-purple-500/5 border border-purple-500/15 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-purple-500/10 transition-all relative overflow-hidden group shadow-lg shadow-purple-500/5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25 transition-all group-hover:scale-110">
            <Lucide.Phone size={26} />
          </div>
          <span className="text-white font-black text-xs uppercase tracking-wider text-center mt-1">{translations[language].support.callSupport}</span>
          <span className="text-[9px] font-bold text-slate-500 text-center">
            {language === 'or' ? 'ସକ୍ରିୟ କଲ୍ ସର୍ଭିସ୍' : 'Voice Support'}
          </span>
        </motion.a>
      </div>

      {/* Ticket/Feedback Box */}
      <div className="p-8 bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">{translations[language].support.ticketTitle}</h3>
          <p className="text-slate-400 text-sm font-medium">{translations[language].support.ticketDescription}</p>
        </div>

        <div className="mt-6">
          {success ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 bg-emerald-500/10 border border-emerald-500/25 rounded-3xl text-center flex flex-col items-center justify-center gap-4"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg border border-emerald-500/25">
                <Lucide.CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-emerald-400 font-black text-base">{translations[language].support.success}</p>
                <p className="text-slate-400 text-xs font-semibold">
                  {language === 'or' ? 'ଆମର ଟିମ୍ ଖୁବ୍ ଶୀଘ୍ର ଆପଣଙ୍କ ସହ ଯୋଗାଯୋଗ କରିବେ।' : 'Our developer team will review it shortly.'}
                </p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSuccess(false)} 
                className="mt-2 text-emerald-400 text-xs font-bold hover:text-emerald-300 transition-colors bg-emerald-500/5 hover:bg-emerald-500/10 px-6 py-2.5 rounded-xl border border-emerald-500/20"
              >
                {language === 'or' ? 'ନୂଆ ମେସେଜ୍ ପଠାନ୍ତୁ' : 'Submit Another Ticket'}
              </motion.button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Category Selector Tabs */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest block">
                  {language === 'or' ? 'ବିଷୟବସ୍ତୁ (Category)' : 'Ticket Category'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['bug', 'feature', 'syllabus', 'general'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all uppercase tracking-wider ${
                        category === cat
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-extrabold shadow-sm'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat === 'bug' && (language === 'or' ? '🐛 ସମସ୍ୟା' : '🐛 Bug')}
                      {cat === 'feature' && (language === 'or' ? '✨ ଫିଚର୍' : '✨ Feature')}
                      {cat === 'syllabus' && (language === 'or' ? '📚 ପାଠ୍ୟକ୍ରମ' : '📚 Syllabus')}
                      {cat === 'general' && (language === 'or' ? '💬 ସାଧାରଣ' : '💬 General')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest block">
                  {language === 'or' ? 'ଆପଣଙ୍କ ଅନୁଭୂତି (Experience Rating)' : 'Rate your experience'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-amber-400 hover:scale-125 active:scale-95 transition-all animate-none"
                    >
                      <Lucide.Star
                        size={26}
                        fill={star <= rating ? '#fbbf24' : 'none'}
                        className={star <= rating ? 'text-amber-400' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-black text-slate-400 ml-2">
                    {rating === 5 && (language === 'or' ? 'ବହୁତ ବଢ଼ିଆ' : 'Excellent')}
                    {rating === 4 && (language === 'or' ? 'ଭଲ' : 'Good')}
                    {rating === 3 && (language === 'or' ? 'ଠିକ୍ ଅଛି' : 'Average')}
                    {rating === 2 && (language === 'or' ? 'ଖରାପ' : 'Poor')}
                    {rating === 1 && (language === 'or' ? 'ବହୁତ ଖରାପ' : 'Very Bad')}
                  </span>
                </div>
              </div>

              {/* Text Input area */}
              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">
                    {language === 'or' ? 'ସନ୍ଦେଶ (Your Message)' : 'Message / Details'}
                  </label>
                  <span className={`text-[10px] font-bold ${ticket.length > 450 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {ticket.length} / 500
                  </span>
                </div>
                <textarea 
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value.substring(0, 500))}
                  placeholder={language === 'or' ? "ଆମକୁ କିପରି ସାହାଯ୍ୟ କରିବେ?" : "How can we help you? Describe the issue or suggestion..."}
                  className="w-full h-36 bg-slate-950/40 border border-white/10 rounded-2.5xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-slate-600"
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={loading || !ticket.trim()}
                className="w-full py-4 rounded-2.5xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {loading ? <Lucide.Loader2 className="animate-spin" size={20} /> : <Lucide.Send size={18} />}
                <span>{translations[language].support.submitTicket}</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ProfileView({ user, language, theme, setTheme, onBack, onParentAccess, setActiveTab, setIsParentUnlocked, setUser }: any) {
  const [activeProfileTab, setActiveProfileTab] = useState<'student' | 'parent'>('student');
  const [district, setDistrict] = useState(user.district || '');
  const [school, setSchool] = useState(user.school || '');
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [parentShowLeaderboard, setParentShowLeaderboard] = useState(user.parentShowLeaderboard ?? true);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isPushSubscribed, setIsPushSubscribed] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [securityPinInput, setSecurityPinInput] = useState('');
  useEffect(() => {
    if (user) {
      setSecurityPinInput(user.parent_pin || user.pin || '');
    }
  }, [user?.parent_pin, user?.pin]);

  const handlePushSubscription = async () => {
    setSubscribingPush(true);
    const success = await subscribeUserToPush(user.id);
    setSubscribingPush(false);
    if (success) {
      setIsPushSubscribed(true);
      playSuccessChime(true);
      alert(language === 'en' ? "Notifications enabled successfully!" : "ନୋଟିଫିକେସନ୍ ସଫଳତାର ସହ ସକ୍ରିୟ ହୋଇଛି!");
    } else {
      alert(language === 'en' ? "Failed to enable notifications. Please make sure notifications are allowed in your browser/app settings." : "ନୋଟିଫିକେସନ୍ ସକ୍ରିୟ କରିବାରେ ବିଫଳ ହୋଇଛି | ଦୟାକରି ଆପଣଙ୍କ ବ୍ରାଉଜର୍/ଆପ୍ ସେଟିଂସରେ ଅନୁମତି ଯାଞ୍ଚ କରନ୍ତୁ |");
    }
  };

  const handleParentAccess = () => {
    if (!user.parent_pin) {
      // If no PIN set, go straight in or ask to set one
      if (setIsParentUnlocked) setIsParentUnlocked(true);
      onParentAccess();
    } else {
      setShowPinModal(true);
    }
  };

  const verifyPin = () => {
    if (pin === user.parent_pin) {
      if (setIsParentUnlocked) setIsParentUnlocked(true);
      onParentAccess();
      setShowPinModal(false);
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const [showOfflineNotes, setShowOfflineNotes] = useState(false);

  if (showOfflineNotes) {
    return <OfflineNotesView language={language} onBack={() => setShowOfflineNotes(false)} />;
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert(language === 'en' ? "Please upload a valid image file." : "ଦୟାକରି ଏକ ବୈଧ ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ |");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'en' ? "Image size must be less than 5MB." : "ଫଟୋ ସାଇଜ୍ 5MB ରୁ କମ୍ ହେବା ଆବଶ୍ୟକ |");
      return;
    }
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `profile_pictures/${user.id}/${Date.now()}.${fileExt}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(firestore, 'users', user.id), {
        avatar: downloadURL
      });
      
      alert(language === 'en' ? "Profile photo updated successfully!" : "ପ୍ରୋଫାଇଲ୍ ଫଟୋ ସଫଳତାର ସହ ଅପଡେଟ୍ ହେଲା!");
    } catch (err) {
      console.error("Avatar Upload Error:", err);
      alert(language === 'en' ? "Failed to upload photo." : "ଫଟୋ ଅପଲୋଡ୍ କରିବାରେ ବିଫଳ |");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        name,
        email,
        role: user.role,
        class: user.class || null,
        board: user.board || null,
        parentShowLeaderboard,
        district,
        school
      });
      
      if (auth.currentUser && email && email !== auth.currentUser.email) {
        try {
          await updateEmail(auth.currentUser, email);
        } catch (authErr: any) {
          console.error("Auth Email Update Error:", authErr);
          alert("Profile saved, but please log out and log back in to fully update your email address for login.");
        }
      }
      
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Profile Update Error:", err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setVerifying(true);
    try {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Verification Error:", err);
      alert("Failed to send verification email. " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const isEmailVerified = auth.currentUser?.emailVerified;

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      alert(language === 'en' ? "Google account linked successfully! You can now log in with either method." : "Google ଆକାଉଣ୍ଟ୍ ସଫଳତାର ସହ ଲିଙ୍କ୍ ହୋଇଛି! ଆପଣ ବର୍ତ୍ତମାନ ଯେକୌଣସି ପଦ୍ଧତି ସହିତ ଲଗଇନ୍ କରିପାରିବେ |");
      // Force a re-render or state update if needed, but the providerData will be updated
    } catch (error: any) {
      console.error("Error linking Google account:", error);
      if (error.code === 'auth/credential-already-in-use') {
        alert(language === 'en' ? "This Google account is already linked to another user." : "ଏହି Google ଆକାଉଣ୍ଟ୍ ପୂର୍ବରୁ ଅନ୍ୟ ଏକ ଉପଭୋକ୍ତା ସହିତ ଲିଙ୍କ୍ ହୋଇଛି |");
      } else {
        alert(language === 'en' ? "Failed to link Google account. " + error.message : "Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରିବାରେ ବିଫଳ ହୋଇଛି | " + error.message);
      }
    }
  };

  const isGoogleLinked = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-xl mx-auto"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Lucide.ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div 
        variants={itemVariants}
        className="glass-card neon-border rounded-3xl p-8 space-y-6"
      >
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-800/50 border-2 border-emerald-500/30 p-2 flex items-center justify-center shadow-2xl overflow-hidden relative">
            {uploadingAvatar ? (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                <Lucide.Loader className="animate-spin text-emerald-400" size={24} />
              </div>
            ) : null}
            <img src={user.avatar || '/gundulu-pointing-nobg.png'} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            
            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20">
              <Lucide.Upload size={20} className="text-white mb-1" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Upload</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </label>
          </div>
          <button 
            onClick={() => setActiveTab('store')}
            className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 rounded-xl text-white shadow-lg hover:bg-emerald-500 transition-all border border-emerald-400/30 z-30"
          >
            <Lucide.ShoppingBag size={16} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">
            {user.role === 'teacher'
              ? (language === 'en' ? 'Educator Profile' : 'ଶିକ୍ଷକ ପ୍ରୋଫାଇଲ୍')
              : translations[language].profile.editTitle}
          </h2>
          {user.role !== 'teacher' && (
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              {language === 'en' ? 'Points:' : 'ପଏଣ୍ଟ:'} <span className="text-emerald-400">{user.points}</span>
            </p>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {/* Animated Toggle Switch */}
        {user.role !== 'teacher' && (
          <div className="relative flex w-full p-1 bg-slate-900/50 border border-white/5 rounded-2xl mb-8 shadow-inner">
            <button
              onClick={() => setActiveProfileTab('student')}
              className={`relative flex-1 py-3 text-sm font-bold z-10 transition-colors ${activeProfileTab === 'student' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {language === 'en' ? 'Student Profile' : 'ଛାତ୍ର ପ୍ରୋଫାଇଲ୍'}
            </button>
            <button
              onClick={() => setActiveProfileTab('parent')}
              className={`relative flex-1 py-3 text-sm font-bold z-10 transition-colors ${activeProfileTab === 'parent' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {language === 'en' ? 'Parent Controls' : 'ପିତାମାତାଙ୍କ ନିୟନ୍ତ୍ରଣ'}
            </button>
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-emerald-600 rounded-xl shadow-lg shadow-emerald-900/20 z-0"
              animate={{ left: activeProfileTab === 'student' ? '4px' : 'calc(50% + 0px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeProfileTab === 'student' && (
            <motion.div
              key="student"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* STUDENT FIELDS */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].name}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].email}</label>
                <div className="flex gap-2">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  {email && email === auth.currentUser?.email && !isEmailVerified && (
                    <button onClick={handleVerifyEmail} disabled={verifying} className="px-4 py-3 rounded-xl bg-blue-600/20 text-blue-400 font-medium hover:bg-blue-600/30 transition-all border border-blue-500/20 whitespace-nowrap">
                      {verifying ? 'Sending...' : 'Verify'}
                    </button>
                  )}
                  {email && email === auth.currentUser?.email && isEmailVerified && (
                    <div className="px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 font-medium border border-emerald-500/20 flex items-center whitespace-nowrap">
                      Verified
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.phone}</label>
                  <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-between">
                    <span className="text-sm">{user.phoneNumber || user.phone || 'N/A'}</span>
                    <Lucide.Lock size={14} className="opacity-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    {user.role === 'teacher' ? (language === 'en' ? 'Account Role' : 'ଆକାଉଣ୍ଟ୍ ରୋଲ୍') : translations[language].profile.class}
                  </label>
                  <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-between font-bold">
                    <span className={user.role === 'teacher' ? 'text-amber-400' : 'text-slate-400'}>
                      {user.role === 'teacher' 
                        ? (language === 'en' ? 'Educator (All Classes Unlocked)' : 'ଶିକ୍ଷକ ଆକ୍ସେସ୍') 
                        : (translations[language].classes[user.class] || user.class || 'N/A')}
                    </span>
                    <Lucide.Lock size={14} className="opacity-50" />
                  </div>
                </div>
              </div>

              {user.role !== 'teacher' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">
                        <Lucide.Globe className="inline-block text-emerald-400 mr-1" size={14} /> 
                        {language === 'en' ? 'District' : 'ଜିଲ୍ଲା'}
                      </label>
                      <select
                        className="w-full p-3 rounded-xl bg-slate-900/80 text-white border-2 border-white/10 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all"
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                      >
                        <option value="" className="bg-slate-900">{language === 'en' ? 'Select District' : 'ଜିଲ୍ଲା ଚୟନ କରନ୍ତୁ'}</option>
                        {ODISHA_DISTRICTS.map(d => (
                          <option key={d.en} value={d.en} className="bg-slate-900">
                            {language === 'en' ? d.en : `${d.or} (${d.en})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">
                        <Lucide.School className="inline-block text-blue-400 mr-1" size={14} /> 
                        {language === 'en' ? 'School' : 'ବିଦ୍ୟାଳୟ'}
                      </label>
                      <input
                        className="w-full p-3 rounded-xl bg-slate-900/80 text-white border-2 border-white/10 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                        type="text"
                        value={school}
                        onChange={e => setSchool(e.target.value)}
                        placeholder={language === 'en' ? 'Enter your school name' : 'ବିଦ୍ୟାଳୟ ନାମ ଲେଖନ୍ତୁ'}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {translations[language].profile.requestChangeNote}
                    </p>
                    <div className="flex gap-2">
                      <a 
                        href={`https://wa.me/919337956168?text=${encodeURIComponent(`Namaskar Admin, I want to change my ${language === 'en' ? 'Class/Mobile Number' : 'ଶ୍ରେଣୀ/ମୋବାଇଲ୍ ନମ୍ବର'}. My Name: ${user.name}, Current Class: ${user.class}. Reason: `)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 border border-emerald-500/20"
                      >
                        <Lucide.MessageCircle size={14} />
                        WhatsApp
                      </a>
                      <a 
                        href={`mailto:pandadamayanti01@gmail.com?subject=Profile Change Request&body=${encodeURIComponent(`Namaskar Admin,\n\nI want to change my Class or Mobile Number.\n\nName: ${user.name}\nPhone: ${user.phoneNumber || user.phone}\nCurrent Class: ${user.class}\n\nReason for change:\n`)}`}
                        className="flex-1 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 border border-blue-500/20"
                      >
                        <Lucide.Mail size={14} />
                        Email
                      </a>
                    </div>
                  </div>
                </>
              )}

              {/* Account Linking Section */}
              {!isGoogleLinked && (
                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lucide.Globe className="text-blue-400" size={18} />
                    <h3 className="text-sm font-bold text-white">{language === 'en' ? 'Link Google Account' : 'Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରନ୍ତୁ'}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {language === 'en' 
                      ? 'Link your Google account to prevent data loss and log in easily with either your phone number or Google.' 
                      : 'ଡାଟା ହରାଇବା ରୋକିବା ପାଇଁ ଆପଣଙ୍କର Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରନ୍ତୁ ଏବଂ ଆପଣଙ୍କର ଫୋନ୍ ନମ୍ବର କିମ୍ବା Google ସହିତ ସହଜରେ ଲଗଇନ୍ କରନ୍ତୁ |'}
                  </p>
                  <button 
                    onClick={handleLinkGoogle}
                    className="w-full py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {language === 'en' ? 'Link Google Account' : 'Google ସହିତ ଲିଙ୍କ୍ କରନ୍ତୁ'}
                  </button>
                </div>
              )}

              {/* Security & Switcher PIN Section */}
              {user.role !== 'teacher' && (
                <div className="p-6 bg-slate-900/50 border border-white/10 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Lucide.Lock size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {language === 'en' ? 'Security & Switcher PIN' : 'ସୁରକ୍ଷା ଏବଂ ସ୍ୱିଚର୍ ପିନ୍'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {language === 'en' 
                          ? 'Set a 4-digit PIN for quick sibling switching without OTP and protecting parent controls' 
                          : 'OTP ବିନା ଶୀଘ୍ର ଆକାଉଣ୍ଟ୍ ବଦଳାଇବା ଏବଂ ପିତାମାତାଙ୍କ ନିୟନ୍ତ୍ରଣକୁ ସୁରକ୍ଷିତ ରଖିବା ପାଇଁ ଏକ ୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିନ୍ ସେଟ୍ କରନ୍ତୁ'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      {language === 'en' ? '4-Digit PIN' : '୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିନ୍'}
                    </label>
                    <input 
                      type="password"
                      maxLength={4}
                      placeholder={language === 'en' ? 'Enter a 4-digit PIN' : '୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିନ୍ ଦିଅନ୍ତୁ'}
                      value={securityPinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 4) {
                          setSecurityPinInput(val);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center tracking-[1em] font-mono text-xl"
                    />
                    {securityPinInput !== (user.parent_pin || user.pin || '') && securityPinInput.length === 4 && (
                      <button
                        onClick={async () => {
                          try {
                            setUser(prev => prev ? { ...prev, pin: securityPinInput, parent_pin: securityPinInput } : prev);
                            updateDoc(doc(firestore, 'users', user.id), {
                              parent_pin: securityPinInput,
                              pin: securityPinInput
                            }).catch((err) => {
                              console.error("Failed to save PIN to Firestore:", err);
                            });
                            alert(language === 'en' ? 'PIN saved successfully!' : 'ପିନ୍ ସଫଳତାର ସହ ସେଟ୍ ହେଲା!');
                          } catch (err: any) {
                            alert('Error saving PIN: ' + err.message);
                          }
                        }}
                        className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                      >
                        <Lucide.Save size={14} />
                        {language === 'en' ? 'Save PIN' : 'ପିନ୍ ସେଭ୍ କରନ୍ତୁ'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-6 border-t border-white/5">
                {user.role !== 'teacher' && (
                  <button 
                    onClick={() => setShowOfflineNotes(true)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-all group mb-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500 text-white">
                        <Lucide.FileText size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{language === 'en' ? 'Offline Notes' : 'ଅଫଲାଇନ୍ ନୋଟ୍'}</p>
                        <p className="text-[10px] opacity-70 uppercase tracking-wider">{language === 'en' ? 'Access saved study material' : 'ସେଭ୍ ହୋଇଥିବା ପାଠ୍ୟପଢା ସାମଗ୍ରୀ'}</p>
                      </div>
                    </div>
                    <Lucide.ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                <button 
                  onClick={() => setActiveTab('support')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 hover:bg-purple-500/20 transition-all group mt-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500 text-white">
                      <Lucide.HelpCircle size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{translations[language].support.title}</p>
                      <p className="text-[10px] opacity-70 uppercase tracking-wider">{translations[language].support.ticketDescription}</p>
                    </div>
                  </div>
                  <Lucide.ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Native Web Push Notification Toggle Card */}
                <button 
                  type="button"
                  onClick={handlePushSubscription}
                  disabled={subscribingPush}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group mt-4 border ${isPushSubscribed ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl text-white ${isPushSubscribed ? 'bg-teal-500' : 'bg-amber-500 animate-pulse'}`}>
                      <Lucide.Bell size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold">
                        {isPushSubscribed 
                          ? (language === 'en' ? 'App Notifications Active' : 'ଆପ୍ ନୋଟିଫିକେସନ୍ ସକ୍ରିୟ') 
                          : (language === 'en' ? 'Enable App Notifications' : 'ଆପ୍ ନୋଟିଫିକେସନ୍ ସକ୍ରିୟ କରନ୍ତୁ')}
                      </p>
                      <p className="text-[10px] opacity-70 uppercase tracking-wider">
                        {isPushSubscribed 
                          ? (language === 'en' ? 'Receiving native mobile updates' : 'ମୋବାଇଲ୍ ଅପଡେଟ୍ ସଫଳତାର ସହ ମିଳୁଛି') 
                          : (language === 'en' ? 'Get important study & test alerts' : 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା ଏବଂ ଟେଷ୍ଟ୍ ବିଷୟରେ ଜାଣନ୍ତୁ')}
                      </p>
                    </div>
                  </div>
                  {subscribingPush ? (
                    <Lucide.Loader2 className="animate-spin text-amber-400" size={20} />
                  ) : (
                    isPushSubscribed ? (
                      <Lucide.CheckCircle size={20} className="text-teal-400" />
                    ) : (
                      <Lucide.ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    )
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {activeProfileTab === 'parent' && (
            <motion.div
              key="parent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {user.role !== 'teacher' ? (
                <>
                  <div className="p-6 bg-slate-900/50 border border-white/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <Lucide.Lock size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">Security PIN</h3>
                        <p className="text-xs text-slate-400">Protect parent controls</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">{translations[language].profile.parentPin}</label>
                      <input 
                        type="password"
                        maxLength={4}
                        placeholder="Set a 4-digit PIN for parent access"
                        value={securityPinInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 4) {
                            setSecurityPinInput(val);
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center tracking-[1em] font-mono text-xl"
                      />
                      {securityPinInput !== (user.parent_pin || user.pin || '') && securityPinInput.length === 4 && (
                        <button
                          onClick={async () => {
                            try {
                              setUser(prev => prev ? { ...prev, pin: securityPinInput, parent_pin: securityPinInput } : prev);
                              updateDoc(doc(firestore, 'users', user.id), {
                                parent_pin: securityPinInput,
                                pin: securityPinInput
                              }).catch((err) => {
                                console.error("Failed to save PIN to Firestore:", err);
                              });
                              alert(language === 'en' ? 'PIN saved successfully!' : 'ପିନ୍ ସଫଳତାର ସହ ସେଟ୍ ହେଲା!');
                            } catch (err: any) {
                              alert('Error saving PIN: ' + err.message);
                            }
                          }}
                          className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <Lucide.Save size={14} />
                          {language === 'en' ? 'Save PIN' : 'ପିନ୍ ସେଭ୍ କରନ୍ତୁ'}
                        </button>
                      )}
                      <p className="text-[10px] text-slate-500 mt-2 text-center">{translations[language].profile.parentPinNote}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900/50 border border-white/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                        <Lucide.BarChart3 size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">Analytics</h3>
                        <p className="text-xs text-slate-400">Monitor student progress</p>
                      </div>
                    </div>

                    <button 
                      onClick={handleParentAccess}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-all group shadow-lg shadow-emerald-900/20"
                    >
                      <div className="text-left">
                        <p className="font-black text-lg">{translations[language].profile.parentDashboard}</p>
                        <p className="text-xs opacity-80 uppercase tracking-wider">{translations[language].profile.parentDashboardTagline}</p>
                      </div>
                      <div className="bg-white/20 p-2 rounded-full">
                        <Lucide.ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    <label className="flex items-center gap-3 cursor-pointer group pt-4 border-t border-white/5 mt-4">
                      <div className="relative inline-flex items-center">
                        <input 
                          type="checkbox" 
                          checked={parentShowLeaderboard}
                          onChange={(e) => setParentShowLeaderboard(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{translations[language].profile.parentLeaderboard}</span>
                        <span className="text-[10px] text-slate-500">{translations[language].profile.parentLeaderboardNote}</span>
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center bg-slate-900/50 border border-white/10 rounded-3xl">
                  <Lucide.ShieldCheck size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
                  <h3 className="text-xl font-bold text-white mb-2">Educator Account</h3>
                  <p className="text-slate-400 text-sm">Parent controls are not applicable for educator accounts.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Theme Settings Card */}
        <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <Lucide.Palette size={18} className="text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">
              {language === 'en' ? 'App Display Theme' : 'ଆପ୍ ଥିମ୍ ସେଟିଂ'}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {language === 'en' 
              ? 'Choose your learning atmosphere. Night modes are easy on the eyes, while Daybreak is perfect for bright daylight study.' 
              : 'ଆପଣଙ୍କର ପଢ଼ିବା ପରିବେଶ ବାଛନ୍ତୁ | ରାତି ମୋଡ୍ ଆଖି ପାଇଁ ଆରାମଦାୟକ ଏବଂ ଦିନ ମୋଡ୍ ଦିନରେ ପଢ଼ିବା ପାଇଁ ସର୍ବୋତ୍ତମ ଅଟେ |'}
          </p>
          
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Theme Slate */}
            <button
              type="button"
              onClick={() => {
                setTheme('slate');
                localStorage.setItem('theme', 'slate');
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                theme === 'slate' 
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                  : 'border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#020617] border border-white/20" />
                <span className="text-xs font-bold">Midnight Slate</span>
              </div>
            </button>

            {/* Theme Forest */}
            <button
              type="button"
              onClick={() => {
                setTheme('forest');
                localStorage.setItem('theme', 'forest');
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                theme === 'forest' 
                  ? 'border-[#10b981] bg-[#10b981]/10 text-[#34d399]' 
                  : 'border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#04120c] border border-white/20" />
                <span className="text-xs font-bold">Forest Emerald</span>
              </div>
            </button>

            {/* Theme Navy */}
            <button
              type="button"
              onClick={() => {
                setTheme('navy');
                localStorage.setItem('theme', 'navy');
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                theme === 'navy' 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                  : 'border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#050b1d] border border-white/20" />
                <span className="text-xs font-bold">Royal Navy</span>
              </div>
            </button>

            {/* Theme Daybreak (Light) */}
            <button
              type="button"
              onClick={() => {
                setTheme('daybreak');
                localStorage.setItem('theme', 'daybreak');
              }}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                theme === 'daybreak' 
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500' 
                  : 'border-white/5 bg-slate-900/40 text-slate-400 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f8fafc] border border-slate-300" />
                <span className="text-xs font-bold">Daybreak Light</span>
              </div>
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Lucide.Loader2 className="animate-spin" size={20} /> : translations[language].profile.saveProfile}
        </button>

        {/* Privacy Policy & Delete Account Links */}
        <div className="flex flex-col items-center gap-2.5 pt-3 border-t border-white/5 mt-4">
          <a 
            href="/privacy-policy.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-emerald-400 font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <Lucide.ShieldCheck size={14} />
            {language === 'en' ? 'Privacy Policy & Data Security' : 'ଗୋପନୀୟତା ନୀତି ଏବଂ ତଥ୍ୟ ସୁରକ୍ଷା'}
          </a>
          <a 
            href="/delete-account.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-red-400 font-bold transition-colors inline-flex items-center gap-1.5"
          >
            <Lucide.UserX size={14} />
            {language === 'en' ? 'Delete Account Request' : 'ଖାତା ବିଲୋପ ଅନୁରୋଧ'}
          </a>
        </div>
      </div>
    </motion.div>

    {/* PIN Modal */}
    <AnimatePresence>
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
              <Lucide.Settings size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Parent Access</h3>
            <p className="text-slate-400 mb-6 text-sm">Enter your 4-digit parent PIN to continue</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-12 h-16 rounded-xl border flex items-center justify-center text-2xl font-bold ${pin.length > i ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                  {pin.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <div className="grid grid-cols-3 gap-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === 'C') setPin('');
                    else if (btn === 'OK') verifyPin();
                    else if (typeof btn === 'number' && pin.length < 4) setPin(prev => prev + btn);
                  }}
                  className="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                >
                  {btn}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowPinModal(false)}
              className="text-slate-500 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </motion.div>
  );
}

// --- Sub-Views ---

function StudyBuddyLegacy({ user, language, isPremium, showPaywall, setShowPaywall, handleUpgradeClick }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: `Hi ${user.name}! I'm your Study Buddy. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isListening, startListening, stopListening } = useVoiceInput(language);

  const handleVoiceInput = useCallback((text: string) => {
    setInput(prev => (prev.trim() + ' ' + text.trim()).trim());
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'en' ? "Image size should be less than 5MB" : "ଫଟୋର ଆକାର ୫ MB ରୁ କମ୍ ହେବା ଉଚିତ୍ |");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage(base64String);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage || loading) return;

    const userMessage = input.trim();
    const imageData = selectedImage && imageMimeType ? { data: selectedImage, mimeType: imageMimeType } : undefined;
    
    setInput('');
    setSelectedImage(null);
    setImageMimeType(null);
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage || (language === 'en' ? "Sent an image" : "ଏକ ଫଟୋ ପଠାଗଲା"),
      image: imageData ? `data:${imageData.mimeType};base64,${imageData.data}` : undefined
    }]);
    setLoading(true);

    try {
      const ai = getAI();
      const parts: any[] = [];
      if (userMessage) parts.push({ text: userMessage });
      if (imageData) parts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });

      const responseText = await withRetry(async (modelName, apiVersion) => {
        const model = ai.getGenerativeModel({ 
          model: modelName,
          systemInstruction: getStudyBuddySystemInstruction(
            language as 'en' | 'or',
            user.name,
            user.class,
            undefined
          )
        }, { apiVersion });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts }]
        });
        return result.response.text();
      }, 'flash');

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err) {
      console.error("Study Buddy Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! I'm having a little trouble thinking right now. Can we try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (isPremium) {
            setIsOpen(true);
          } else {
            handleUpgradeClick();
          }
        }}
        className={`fixed bottom-28 right-8 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-40 border-4 border-slate-950 ${isPremium ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-amber-500 shadow-amber-500/40'}`}
      >
        {isPremium ? <Lucide.Bot size={32} /> : <Lucide.Sparkles size={24} />}
        {isPremium && (
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-slate-950"
          />
        )}
      </motion.button>

      {/* Paywall Modal */}
      <AnimatePresence>
        {showPaywall && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPaywall(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl text-center" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lucide.Bot size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Gundulu is taking a nap! 😴</h2>
              <p className="text-slate-300 mb-8">
                Only our Pro Students can wake him up. Ask your parents to upgrade your account to start the magic! ✨
              </p>
              <button 
                onClick={() => setShowPaywall(false)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold text-lg hover:opacity-90 transition-opacity"
              >
                Okay!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 w-96 h-[500px] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-blue-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Lucide.Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Study Buddy</h3>
                  <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">Study Buddy Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="bg-black/20 hover:bg-red-500/80 p-2 rounded-full text-white transition-all shadow-md">
                <Lucide.X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-tr-none' 
                      : 'bg-white/5 text-slate-300 border border-white/10 rounded-tl-none'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="w-full h-32 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />
                    )}
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
                    <Lucide.Loader2 size={16} className="animate-spin text-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/5 bg-slate-950/50">
              {selectedImage && (
                <div className="mb-4 relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500">
                  <img src={`data:${imageMimeType};base64,${selectedImage}`} alt="Selected" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => { setSelectedImage(null); setImageMimeType(null); }}
                    className="absolute top-0 right-0 bg-black/60 text-white p-1"
                  >
                    <Lucide.X size={12} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={cameraInputRef}
                    onChange={handleImageSelect}
                  />
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Lucide.Camera size={18} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Lucide.Image size={18} />
                  </button>
                </div>
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button 
                    onClick={handleSend}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 transition-all"
                  >
                    <Lucide.Send size={16} />
                  </button>
                </div>
                <button
                  onMouseDown={() => startListening(handleVoiceInput)}
                  onMouseUp={stopListening}
                  onTouchStart={(e) => { e.preventDefault(); startListening(handleVoiceInput); }}
                  onTouchEnd={stopListening}
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {isListening && (
                    <>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded shadow-lg animate-bounce whitespace-nowrap">
                        {language === 'en' ? 'Listening...' : 'ଶୁଣୁଛି...'}
                      </div>
                      <motion.div 
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-xl bg-emerald-500"
                      />
                    </>
                  )}
                  <div className="relative z-10">
                    {isListening ? <Lucide.Mic size={20} className="animate-pulse" /> : <Lucide.Mic size={20} />}
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
        active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-white/5'
      }`}
    >
      {React.cloneElement(icon as any, { size: 18 })}
      <span className="font-medium text-sm">{label}</span>
    </motion.button>
  );
}



function LocalSubscriptionGuard({ onSubscribe, language, isPremium, user, onShare, systemSettings, onBack }: any) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanAmount, setSelectedPlanAmount] = useState<number>(0);
  const [selectedPlanType, setSelectedPlanType] = useState<'monthly'|'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'selection'|'upi'>('selection');
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);

  const p = translations[language].pricing;
  const isTeacher = user?.role === 'teacher';
  
  // Subscription is a single flat monthly price for all classes.
  let monthlyPrice = isTeacher ? 499 : (systemSettings?.monthlyPrice || 99);
  let yearlyPrice = isTeacher ? 4999 : (systemSettings?.yearlyPrice || 999);
  let originalMonthlyPrice = isTeacher ? 1999 : 499;
  let originalYearlyPrice = isTeacher ? 19999 : 4999;
  if (!isTeacher && user?.class === 'sishuvatika(Anganwadi)') {
    monthlyPrice = 49;
    yearlyPrice = 499;
    originalMonthlyPrice = 249;
    originalYearlyPrice = 2499;
  }

  const premiumFeaturesBilingual = isTeacher
    ? [
        { en: "🤖 Unlimited AI Worksheet Maker runs", or: "🤖 ଅସୀମିତ AI ପ୍ରଶ୍ନପତ୍ର (Worksheet) ପ୍ରସ୍ତୁତି" },
        { en: "📋 Unlimited AI Lesson Plan Creator", or: "📋 ଅସୀମିତ AI ପାଠ୍ୟ ଯୋଜନା (Lesson Plan) ପ୍ରସ୍ତୁତି" },
        { en: "🧪 Unlimited AI Science Experiment Guides", or: "🧪 ଅସୀମିତ AI ବିଜ୍ଞାନ ପରୀକ୍ଷା (Science Experiment) ପ୍ରସ୍ତୁତି" },
        { en: "📢 Promote your YouTube video lessons globally to all registered students", or: "📢 ନିଜର ୟୁଟ୍ୟୁବ୍ ଭିଡିଓ ଓଡ଼ିଶାର ସମସ୍ତ ପିଲାଙ୍କ ପାଇଁ ପ୍ରୋମୋଟ୍ କରନ୍ତୁ" },
        { en: "⚡ High-speed priority AI generation", or: "⚡ ଉଚ୍ଚ-ଗତି ପ୍ରାଥମିକତା AI ଜେନେରେସନ୍" },
        { en: "✨ Exclusive premium badge on your profile", or: "✨ ପ୍ରୋଫାଇଲ୍‌ରେ ଏକ୍ସକ୍ଲୁସିଭ୍ ପ୍ରିମିୟମ୍ ବ୍ୟାଜ୍" }
      ]
    : [
        { en: "🤖 Unlimited AI Doubt Solver", or: "🤖 ଅସୀମିତ AI ସନ୍ଦେହ ସମାଧାନ (ପ୍ରଶ୍ନୋତ୍ତର)" },
        { en: "📸 Photo Question Solver (Upload images/drawings)", or: "📸 ଫଟୋ ପ୍ରଶ୍ନ ସମାଧାନ (ଫଟୋ ଉଠାଇ ସମାଧାନ)" },
        { en: "🎤 Voice Assistant Tutor (Learn by speaking)", or: "🎤 ଭଏସ୍ ସହାୟତା (କଥା ହୋଇ ପାଠ ପଢ଼ନ୍ତୁ)" },
        { en: "🎯 Mapped Chapter MCQs & Live Games", or: "🎯 ବ୍ୟକ୍ତିଗତ ଅଭ୍ୟାସ, MCQ ଓ ଗେମ୍ସ" },
        { en: "💬 Personal Study Buddy Chat", or: "💬 ଷ୍ଟଡି ବଡି ଚାଟ୍ (ପାଠପଢ଼ା ଚାଟ୍)" },
        { en: "📊 Progress & Performance Analysis Reports", or: "📊 ପ୍ରଦର୍ଶନ ବିଶ୍ଳେଷଣ ପ୍ରଗତି ରିପୋର୍ଟ" }
      ];
  let planName = isTeacher 
    ? (language === 'en' ? 'Educator Pro Plan' : 'ଶିକ୍ଷକ ପ୍ରୋ ପ୍ଲାନ୍')
    : p.premium.name;

  let freePlanName = isTeacher
    ? (language === 'en' ? 'Educator Free Plan' : 'ଶିକ୍ଷକ ମାଗଣା ପ୍ଲାନ୍')
    : p.free.name;

  let freeFeatures = isTeacher
    ? (language === 'en'
        ? [
            "🤖 5 AI runs per month (Worksheets, Lesson Plans, Experiments)",
            "❌ No YouTube video lesson suggestions allowed",
            "⚡ Standard AI generation speed"
          ]
        : [
            "🤖 ମାସକୁ ୫ଟି AI ଜେନେରେସନ୍ (ପ୍ରଶ୍ନପତ୍ର, ପାଠ୍ୟ ଯୋଜନା, ବିଜ୍ଞାନ ପରୀକ୍ଷା)",
            "❌ ୟୁଟ୍ୟୁବ୍ ଭିଡିଓ ଲେସନ୍ ସୁପାରିଶ କରିବା ଅନୁମତି ନାହିଁ",
            "⚡ ସାଧାରଣ AI ପ୍ରକ୍ରିୟାକରଣ ବେଗ"
          ]
      )
    : p.free.features;

  let premiumFeatures = isTeacher
    ? (language === 'en'
        ? [
            "🤖 Unlimited AI Worksheet Maker runs",
            "📋 Unlimited AI Lesson Plan Creator",
            "🧪 Unlimited AI Science Experiment Guides",
            "📢 Promote your YouTube video lessons globally to all registered students",
            "⚡ High-speed priority AI generation",
            "✨ Exclusive premium badge on your profile"
          ]
        : [
            "🤖 ଅସୀମିତ AI ପ୍ରଶ୍ନପତ୍ର (Worksheet) ପ୍ରସ୍ତୁତି",
            "📋 ଅସୀମିତ AI ପାଠ୍ୟ ଯୋଜନା (Lesson Plan) ପ୍ରସ୍ତୁତି",
            "🧪 ଅସୀମିତ AI ବିଜ୍ଞାନ ପରୀକ୍ଷା (Science Experiment) ପ୍ରସ୍ତୁତି",
            "📢 ନିଜର ୟୁଟ୍ୟୁବ୍ ଭିଡିଓ ଓଡ଼ିଶାର ସମସ୍ତ ପିଲାଙ୍କ ପାଇଁ ପ୍ରୋମୋଟ୍ କରନ୍ତୁ",
            "⚡ ଉଚ୍ଚ-ଗତି ପ୍ରାଥମିକତା AI ଜେନେରେସନ୍",
            "✨ ପ୍ରୋଫାଇଲ୍‌ରେ ଏକ୍ସକ୍ଲୁସିଭ୍ ପ୍ରିମିୟମ୍ ବ୍ୟାଜ୍"
          ]
      )
    : p.premium.features;

  const handleOpenPayment = (amount: number, type: 'monthly'|'yearly') => {
    setSelectedPlanAmount(amount);
    setSelectedPlanType(type);
    setPaymentMethod('selection');
    setUtrNumber('');
    setShowPaymentModal(true);
  };

  const handleSubmitUtr = async () => {
    if (!utrNumber.trim()) {
      alert(language === 'en' ? "Please enter your UTR / Transaction ID" : "ଦୟาକରି ଆପଣଙ୍କର UTR / Transaction ID ପ୍ରବେଶ କରନ୍ତୁ");
      return;
    }
    setIsSubmittingUtr(true);
    try {
      await setDoc(doc(firestore, 'payments', `${user.id}_manual_${Date.now()}`), {
        userId: user.id,
        userName: user.name || 'Unknown',
        userPhone: user.phoneNumber || '',
        amount: selectedPlanAmount,
        planType: selectedPlanType,
        status: 'pending_manual',
        method: 'manual_upi',
        utr: utrNumber.trim(),
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
      alert(language === 'en' 
        ? "Payment submitted successfully! An admin will verify and activate your account shortly." 
        : "ପେମେଣ୍ଟ ସଫଳତାର ସହ ଦାଖଲ ହୋଇଛି! ଜଣେ ଆଡମିନ୍ ଶୀଘ୍ର ଆପଣଙ୍କ ଆକାଉଣ୍ଟ୍ ଯାଞ୍ଚ ଏବଂ ସକ୍ରିୟ କରିବେ |");
      setShowPaymentModal(false);
    } catch (err: any) {
      console.error("Error submitting manual payment:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto pt-8 pb-32 px-4">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Lucide.ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      {new Date() < new Date('2026-07-12T00:00:00+05:30') && (
        <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 border border-emerald-500/20 rounded-[2rem] p-6 text-center shadow-lg relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Lucide.Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h4 className="text-lg font-black text-emerald-400 uppercase tracking-wider mb-1">
                {language === 'or' ? '🎉 ମାଗଣା ପ୍ରଦର୍ଶନ ଅଫର ସକ୍ରିୟ!' : '🎉 Free Showcase Access Active!'}
              </h4>
              <p className="text-sm font-medium text-slate-305 leading-relaxed">
                {language === 'or' 
                  ? '୧୧ ଜୁଲାଇ ୨୦୨୬ ରାତି ୧୧:୫୯ ଟା ପର୍ଯ୍ୟନ୍ତ ଆପଣ ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର, ଗଣିତ ବ୍ଲାକବୋର୍ଡ ଏବଂ ଭଏସ୍ ଟ୍ୟୁଟର ର ଅସୀମିତ ବ୍ୟବହାର ମାଗଣାରେ କରିପାରିବେ। ଯଦି ଆପଣ ପ୍ରଦର୍ଶନ ଅଫର ପରେ ମଧ୍ୟ ସେବା ଚାହୁଁଛନ୍ତି, ତେବେ ଆପଣ ଏବେ ସବସ୍କ୍ରାଇବ୍ କରିପାରିବେ।'
                  : 'You have unlimited AI tutor questions, practice problems, and voice tutor access without a premium subscription until July 11, 2026 at 11:59 PM. If you\'d like to secure your membership for after the showcase period, you can subscribe below.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">{p.title}</h2>
        <p className="text-slate-400">Unlock Gundulu Premium for unlimited learning!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
          {!isPremium && (
            <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {translations[language].pricing.currentPlan}
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{freePlanName}</h3>
            <div className="text-4xl font-bold text-white">{p.free.price}</div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {freeFeatures.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px]">✓</div>
                {f}
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-4 rounded-2xl bg-white/5 text-slate-500 font-bold cursor-not-allowed">
            {isPremium ? "Included" : p.currentPlan}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-emerald-500/10">
          {isPremium && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {translations[language].pricing.currentPlan}
            </div>
          )}
          
          {/* Social Proof Hook Badge */}
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-3 mb-6 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[50px] h-[50px] bg-emerald-500/5 rounded-full blur-[20px] pointer-events-none" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Lucide.Trophy size={14} className="animate-bounce" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-white uppercase tracking-wider leading-none">
                  Odisha's #1 Choice • 10K+ Learners
                </span>
                <span className="text-[9.5px] font-bold text-emerald-400 mt-1.5 leading-none">
                  ଓଡ଼ିଶାର ନମ୍ବର-୧ ପସନ୍ଦ • ୧୦,୦୦୦+ ଛାତ୍ରଛାତ୍ରୀ
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">
              {planName} <span className="text-base font-normal text-slate-400">({translations.or.pricing.premium.name})</span>
            </h3>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-white flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-lg line-through text-slate-500 font-normal">₹{originalMonthlyPrice}</span>
                <span>₹{monthlyPrice}</span>
                <span className="text-lg font-normal text-slate-400">/ {language === 'en' ? 'month' : 'ମାସ'}</span>
                <span className="text-[12px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">ମାସିକ ₹{monthlyPrice}</span>
              </div>
              <div className="text-emerald-400 font-bold flex flex-wrap items-center gap-2">
                <span className="line-through text-emerald-500/50 font-normal">₹{originalYearlyPrice}</span>
                <span>₹{yearlyPrice} / {language === 'en' ? 'year' : 'ବର୍ଷ'}</span>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">ବାର୍ଷିକ ₹{yearlyPrice}</span>
                <span className="bg-emerald-500/15 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md uppercase font-black tracking-wider animate-pulse">Save 80% (୮୦% ସଞ୍ଚୟ)</span>
              </div>
            </div>
          </div>

          {/* Launch Price Lock Hook Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3.5 mb-6 text-left flex items-start gap-2.5">
            <Lucide.Zap size={16} className="text-blue-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-white leading-tight">
                Launch Special: Lock in ₹{monthlyPrice}/month forever before price increases!
              </span>
              <span className="text-[9.5px] font-medium text-blue-300 mt-1 leading-tight">
                ଲଞ୍ଚ୍ ଅଫର୍ ବିଶେଷ: ମୂଲ୍ୟ ବୃଦ୍ଧି ହେବା ପୂର୍ବରୁ ଆଜୀବନ ପାଇଁ ₹{monthlyPrice}/ମାସ ଲକ୍ କରନ୍ତୁ!
              </span>
            </div>
          </div>

          <ul className="space-y-4 mb-10 flex-1">
            {premiumFeaturesBilingual.map((f: any, i: number) => (
              <li key={i} className="flex items-start gap-3 text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white shrink-0 mt-0.5">✓</div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-sm text-white leading-snug">{f.en}</span>
                  <span className="text-[11px] text-emerald-400 font-medium leading-normal">{f.or}</span>
                </div>
              </li>
            ))}
          </ul>
          {!isPremium ? (
            <div className="space-y-4">
              <button 
                onClick={() => handleOpenPayment(monthlyPrice, 'monthly')}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20"
              >
                {language === 'en' ? `Subscribe Monthly (₹${monthlyPrice})` : `ମାସିକ ସବସ୍କ୍ରିପସନ୍ (₹${monthlyPrice})`}
              </button>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>{language === 'en' ? `Best Value Offer` : `ସର୍ବୋତ୍ତମ ମୂଲ୍ୟ ଅଫର୍`}</span>
                  <span className="text-emerald-500">Available</span>
                </div>
                
                <button 
                  onClick={() => handleOpenPayment(yearlyPrice, 'yearly')}
                  className="w-full py-4 rounded-2xl font-bold text-lg transition-all bg-white text-slate-900 hover:bg-slate-100"
                >
                  {language === 'en' ? `Subscribe Yearly (₹${yearlyPrice})` : `ବାର୍ଷିକ ସବସ୍କ୍ରିପସନ୍ (₹${yearlyPrice})`}
                </button>
              </div>
            </div>
          ) : (
            <button disabled className="w-full py-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-bold cursor-not-allowed">
              Active
            </button>
          )}
        </div>
      </div>
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full relative">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 rounded-full p-2"
            >
              <Lucide.X size={20} />
            </button>

            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              {language === 'en' ? 'Select Payment Method' : 'ପେମେଣ୍ଟ ପଦ୍ଧତି ଚୟନ କରନ୍ତୁ'}
            </h3>

            {paymentMethod === 'selection' ? (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    onSubscribe(selectedPlanAmount, selectedPlanType);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  <Lucide.CreditCard size={24} />
                  <span>{language === 'en' ? 'Pay Online (Cards/NetBanking)' : 'ଅନଲାଇନ୍ ପେମେଣ୍ଟ କରନ୍ତୁ'}</span>
                </button>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-bold uppercase">OR</span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>
                <button
                  onClick={() => setPaymentMethod('upi')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
                >
                  <Lucide.QrCode size={24} />
                  <span>{language === 'en' ? 'Scan & Pay (Fast UPI)' : 'ସ୍କାନ୍ ଏବଂ ପେ (UPI)'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <p className="text-slate-300">
                  {language === 'en' ? `Scan the QR code to pay ₹${selectedPlanAmount}` : `₹${selectedPlanAmount} ପେମେଣ୍ଟ କରିବାକୁ QR କୋଡ୍ ସ୍କାନ୍ କରନ୍ତୁ`}
                </p>
                <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-64 border-[6px] border-emerald-500 flex items-center justify-center overflow-hidden">
                  <img src="/upi_qr.jpg" alt="UPI QR Code" className="w-full h-full object-contain" />
                </div>
                <div className="space-y-3">
                  <label className="block text-left text-sm font-bold text-slate-400 uppercase">
                    {language === 'en' ? 'Enter UTR / Transaction ID after payment' : 'ପେମେଣ୍ଟ ପରେ UTR ନମ୍ବର ପ୍ରବେଶ କରନ୍ତୁ'}
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 312345678901"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-center font-mono text-lg tracking-widest"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentMethod('selection')}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitUtr}
                    disabled={isSubmittingUtr}
                    className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                  >
                    {isSubmittingUtr ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

function CoursesView({ user, chapters, language, isPremium, onUpgrade, onBack }: any) {
  const [selected, setSelected] = useState<Chapter | null>(null);
  useEffect(() => {
    console.log("Debug: CoursesView selected state changed:", selected);
  }, [selected]);

  // Keep screen awake during chapter study reading session (PWA native feature)
  useEffect(() => {
    if (selected !== null) {
      requestScreenWakeLock();
    } else {
      void releaseScreenWakeLock();
    }
    return () => {
      void releaseScreenWakeLock();
    };
  }, [selected]);
  const [quizMode, setQuizMode] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [recentlyViewed, setRecentlyViewed] = useState<Chapter[]>([]);

  // Sync state with hash for back button support
  useEffect(() => {
    const handleHash = () => {
      console.log("Debug: Full hash:", window.location.hash);
      const parts = window.location.hash.replace('#', '').split('/');
      console.log("Debug: handleHash parts:", parts, "chapters length:", chapters.length);
      if (parts[0] === 'courses') {
        if (parts[1] === 'chapter' && parts[2]) {
          console.log("Debug: Looking for chapter ID:", parts[2]);
          const chapter = chapters.find((c: Chapter) => c.id === parts[2]);
          console.log("Debug: handleHash found chapter:", chapter);
          if (chapter) {
            console.log("Debug: Calling setSelected with:", chapter.id);
            setSelected(chapter);
            setQuizMode(parts[3] === 'quiz');
          } else {
            console.log("Debug: Chapter not found, setting selected to null");
            setSelected(null);
            setQuizMode(false);
          }
        } else {
          console.log("Debug: No chapter ID found, setting selected to null");
          setSelected(null);
          setQuizMode(false);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [chapters]);

  // Load recently viewed from localStorage
  useEffect(() => {
    console.log("Debug: CoursesView selected:", selected);
    const saved = localStorage.getItem(`recently_viewed_${user?.id}`);
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        const recent = ids.map((id: string) => chapters.find((c: Chapter) => c.id === id)).filter(Boolean);
        setRecentlyViewed(recent);
      } catch (e) {
        console.error("Error parsing recently viewed", e);
      }
    }
  }, [chapters, user?.id]);

  const handleSelectChapter = (chapter: Chapter) => {
    console.log("Debug: handleSelectChapter called with:", chapter.id, chapter.title);
    window.location.hash = `courses/chapter/${chapter.id}`;
    
    // Update recently viewed
    const updatedIds = [chapter.id, ...recentlyViewed.map(c => c.id).filter(id => id !== chapter.id)].slice(0, 3);
    localStorage.setItem(`recently_viewed_${user?.id}`, safeJsonStringify(updatedIds));
    
    const recent = updatedIds.map(id => chapters.find((c: Chapter) => c.id === id)).filter(Boolean) as Chapter[];
    setRecentlyViewed(recent);
  };

  const boardKey = React.useMemo(() => {
    if (!user?.board) return 'odisha';
    const b = user.board.toLowerCase();
    if (b.includes('saraswati')) return 'saraswati';
    if (b.includes('aurobindo') || b.includes('sacie')) return 'aurobindo';
    if (b.includes('oav') || b.includes('adarsha')) return 'oav';
    return 'odisha';
  }, [user?.board]);

  const classFilteredChapters = React.useMemo(() => {
    const cleanClass = (cls: string) => {
      if (!cls) return '';
      return cls.toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
    };
    return chapters.filter((c: Chapter) => {
      const matchesClass = !user?.class || cleanClass(c.class) === cleanClass(user.class);
      const userBoardRaw = user?.board || '';
      const userBoard = userBoardRaw === 'undefined' ? '' : userBoardRaw;
      const matchesBoard = !userBoard || (
        typeof c.board === 'string' 
          ? (c.board as string).toLowerCase().includes(userBoard.toLowerCase()) 
          : (
            ((c.board as any)?.en as string || '').toLowerCase().includes(userBoard.toLowerCase()) || 
            ((c.board as any)?.or as string || '').toLowerCase().includes(userBoard.toLowerCase())
          )
      );
      return matchesClass && matchesBoard;
    });
  }, [chapters, user?.class, user?.board, boardKey]);

  const availableSubjects = React.useMemo(() => {
    const predefined = translations[language]?.subjects ? Object.keys(translations[language].subjects) : [];
    const existingInChapters = new Set<string>(classFilteredChapters.map((c: Chapter) => c.subject));
    
    // Only show subjects that have at least one chapter
    const filteredPredefined = predefined.filter(s => existingInChapters.has(s));
    const othersInChapters = Array.from(existingInChapters).filter(s => !predefined.includes(s));
    
    return ['all', ...filteredPredefined, ...othersInChapters];
  }, [language, classFilteredChapters]);

  const filteredChapters = classFilteredChapters.filter((c: Chapter) => {
    if (subjectFilter === 'all') return true;
    return c.subject === subjectFilter;
  });

  // Requirement: Only show one entry per logical chapter
  const uniqueChapters = React.useMemo(() => {
    return Array.from(
      filteredChapters.reduce((acc: Map<string, Chapter>, current: Chapter) => {
        const groupId = current.translationGroupId || current.id;
        const existing = acc.get(groupId);
        if (!existing || current.board === user?.board) {
          acc.set(groupId, current);
        }
        return acc;
      }, new Map<string, Chapter>()).values()
    ) as Chapter[];
  }, [filteredChapters]);

  // Grouped chapters for "All Subjects" view
  const groupedChapters = React.useMemo(() => {
    const groups: Record<string, Chapter[]> = {};
    uniqueChapters.forEach((chapter: Chapter) => {
      if (!groups[chapter.subject]) groups[chapter.subject] = [];
      groups[chapter.subject].push(chapter);
    });
    return groups;
  }, [uniqueChapters]);

  useEffect(() => {
    if (selected) {
      const updatedSelected = chapters.find((c: Chapter) => 
        c.id === selected.id || 
        (c.translationGroupId && c.translationGroupId === selected.translationGroupId)
      );
      
      // Only update if we actually found something, 
      // and DON'T reset to null if the chapters array is just loading.
      if (updatedSelected) {
        setSelected(updatedSelected);
      } else if (chapters.length > 0) {
        // Only set to null if chapters have actually loaded and the ID is truly gone
        setSelected(null);
      }
    }
  }, [chapters]);

  if (quizMode && selected) {
    return (
      <QuizEngine 
        questions={selected.quiz_questions || []} 
        onComplete={() => window.location.hash = `courses/chapter/${selected.id}`} 
        language={language} 
        userId={user.id}
        chapterId={selected.id}
      />
    );
  }

  if (selected) {
    return (
      <TopicDetailView 
        topic={selected} 
        onBack={() => window.location.hash = 'smart_classes'} 
        onTakeQuiz={() => window.location.hash = `courses/chapter/${selected.id}/quiz`} 
        language={language} 
        isPremium={isPremium}
        onUpgrade={onUpgrade}
      />
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-20"
    >
      {/* Header & Tabs */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <Lucide.ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {translations[language].courses}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} • {user?.board}
            </p>
          </div>
        </div>

        {/* Subject Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {/* All Tab */}
          <button
            onClick={() => setSubjectFilter('all')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border ${
              subjectFilter === 'all' 
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-900/40' 
                : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'
            }`}
          >
            <Lucide.LayoutGrid size={16} />
            <span>{translations[language].allSubjects}</span>
          </button>
          
          <div className="w-px h-6 bg-white/10 mx-1" /> {/* Separator */}

          {/* Specific Subjects */}
          {availableSubjects.filter(s => s !== 'all').map((s: string) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border ${
                subjectFilter === s 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-900/40' 
                  : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="opacity-70 group-hover:opacity-100">
                {s.toLowerCase().includes('math') ? <Lucide.Shapes size={16} /> :
                 s.toLowerCase().includes('science_curiosity') ? <Lucide.Zap size={16} /> :
                 s.toLowerCase().includes('sci') ? <Lucide.FlaskConical size={16} /> :
                 s.toLowerCase().includes('eng') ? <Lucide.Languages size={16} /> :
                 s.toLowerCase().includes('odi') ? <Lucide.PenTool size={16} /> :
                 s.toLowerCase().includes('hist') ? <Lucide.History size={16} /> :
                 s.toLowerCase().includes('geo') ? <Lucide.Globe size={16} /> :
                 s.toLowerCase().includes('social_science') ? <Lucide.ShieldCheck size={16} /> :
                 s.toLowerCase().includes('social') ? <Lucide.Users size={16} /> :
                 s.toLowerCase().includes('hindi') ? <Lucide.Type size={16} /> :
                 s.toLowerCase().includes('sanskrit') ? <Lucide.Library size={16} /> :
                 s.toLowerCase().includes('evs') ? <Lucide.Leaf size={16} /> :
                 s.toLowerCase().includes('art') ? <Lucide.Palette size={16} /> :
                 s.toLowerCase().includes('physical') ? <Lucide.Activity size={16} /> :
                 s.toLowerCase().includes('vocational') ? <Lucide.Hammer size={16} /> :
                 s.toLowerCase().includes('epe') ? <Lucide.Wind size={16} /> :
                 s.toLowerCase().includes('aspirational') ? <Lucide.Rocket size={16} /> :
                 <Lucide.BookOpen size={16} />}
              </div>
              <span>{translations[language].subjects[s as keyof typeof translations.en.subjects] || s}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Continue Learning Section */}
      {subjectFilter === 'all' && recentlyViewed.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <Lucide.Clock size={18} />
            <h3 className="text-lg font-bold text-white">
              {language === 'en' ? "Continue Learning" : "ପଢା ଜାରି ରଖନ୍ତୁ"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentlyViewed.map((chapter) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={chapter.id}
                onClick={() => handleSelectChapter(chapter)}
                className="flex items-center gap-4 p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="w-16 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                  <img 
                    src={getYouTubeThumbnail(chapter.videoUrl)} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    alt={chapter.title}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase truncate">
                    {getLocalizedSubject(chapter.subject, language)}
                  </p>
                  <h4 className="text-sm font-semibold text-white truncate">
                    {typeof chapter.title === 'string' 
                      ? ((language === 'en' ? chapter.title_en : chapter.title_or) || chapter.title)
                      : ((chapter.title as any)?.[language] || (chapter.title as any)?.or || (chapter.title as any)?.en || "Untitled Chapter")}
                  </h4>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Content Area */}
      {uniqueChapters.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-white/5 rounded-3xl">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Lucide.BookOpen size={48} className="text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{translations[language].noContent}</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {language === 'en' 
              ? "We're currently working on adding content for this subject. Please check back soon!" 
              : "ଆମେ ବର୍ତ୍ତମାନ ଏହି ବିଷୟ ପାଇଁ ବିଷୟବସ୍ତୁ ଯୋଡିବା ପାଇଁ କାର୍ଯ୍ୟ କରୁଛୁ। ଦୟାକରି ଶୀଭ୍ର ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ!"}
          </p>
        </motion.div>
      ) : subjectFilter === 'all' ? (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {availableSubjects.filter(s => s !== 'all').map((subject: string) => {
            const subjectChapters = chapters.filter((c: Chapter) => c.subject === subject);
            const count = Array.from(new Set(subjectChapters.map((c: Chapter) => c.translationGroupId || c.id))).length;
            
            return (
              <motion.button
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.95 }}
                key={subject}
                onClick={() => setSubjectFilter(subject)}
                className="group relative flex flex-col items-center justify-center p-10 glass-card rounded-[2.5rem] border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-center overflow-hidden shadow-2xl"
              >
                {/* Background Accent */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
                
                {/* Icon Container */}
                <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all text-emerald-500 relative z-10 shadow-2xl">
                {subject.toLowerCase().includes('math') ? <Lucide.Shapes size={40} /> :
                 subject.toLowerCase().includes('science_curiosity') ? <Lucide.Zap size={40} /> :
                 subject.toLowerCase().includes('sci') ? <Lucide.FlaskConical size={40} /> :
                 subject.toLowerCase().includes('eng') ? <Lucide.Languages size={40} /> :
                 subject.toLowerCase().includes('odi') ? <Lucide.PenTool size={40} /> :
                 subject.toLowerCase().includes('hist') ? <Lucide.History size={40} /> :
                 subject.toLowerCase().includes('geo') ? <Lucide.Globe size={40} /> :
                 subject.toLowerCase().includes('social_science') ? <Lucide.ShieldCheck size={40} /> :
                 subject.toLowerCase().includes('social') ? <Lucide.Users size={40} /> :
                 subject.toLowerCase().includes('hindi') ? <Lucide.Type size={40} /> :
                 subject.toLowerCase().includes('sanskrit') ? <Lucide.Library size={40} /> :
                 subject.toLowerCase().includes('evs') ? <Lucide.Leaf size={40} /> :
                 subject.toLowerCase().includes('art') ? <Lucide.Palette size={40} /> :
                 subject.toLowerCase().includes('physical') ? <Lucide.Activity size={40} /> :
                 subject.toLowerCase().includes('vocational') ? <Lucide.Hammer size={40} /> :
                 subject.toLowerCase().includes('epe') ? <Lucide.Wind size={40} /> :
                 subject.toLowerCase().includes('aspirational') ? <Lucide.Rocket size={40} /> :
                 <Lucide.BookOpen size={40} />}
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase group-hover:text-emerald-400 transition-colors">
                    {translations[language].subjects[subject as keyof typeof translations.en.subjects] || subject}
                  </h3>
                  
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 group-hover:border-emerald-500/20 transition-all">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] group-hover:text-emerald-300 transition-colors">
                      {count} {language === 'en' ? 'Modules' : 'ଅଧ୍ୟାୟ'}
                    </p>
                  </div>
                </div>

                {/* Hover Indicator */}
                <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    Initialize Neural Link <Lucide.ChevronRight size={14} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {uniqueChapters.map((chapter: Chapter) => (
            <motion.div 
              whileHover={{ y: -5 }}
              key={chapter.id}
              onClick={() => {
                console.log("Debug: Chapter button clicked:", chapter.id);
                handleSelectChapter(chapter);
              }}
              className="group text-left glass-card rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col h-full relative overflow-hidden cursor-pointer"
            >
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none"></div>
              <div className="aspect-video rounded-2xl bg-slate-800 mb-4 overflow-hidden relative flex-shrink-0 z-10 shadow-lg">
                <img 
                  src={getYouTubeThumbnail(chapter.videoUrl)} 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform"
                  alt={chapter.title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform">
                    <Lucide.Play fill="currentColor" size={20} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {getLocalizedSubject(chapter.subject, language)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-2 min-h-[3.5rem] tracking-tight relative z-10">
                {typeof chapter.title === 'string' 
                  ? ((language === 'en' ? chapter.title_en : chapter.title_or) || chapter.title)
                  : String((chapter.title as any)?.or || (chapter.title as any)?.en || "Untitled Chapter")}
              </h3>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5 text-[10px] text-slate-400 font-bold uppercase tracking-wider relative z-10">
                <div className="flex items-center gap-1"><Lucide.Play size={12} className="text-emerald-500" /> Video</div>
                {chapter.notes && <div className="flex items-center gap-1"><Lucide.FileText size={12} className="text-blue-500" /> Notes</div>}
                {chapter.quiz_questions && chapter.quiz_questions.length > 0 && <div className="flex items-center gap-1"><Lucide.CheckCircle2 size={12} className="text-orange-500" /> Quiz</div>}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function TestEngine({ chapter, onComplete, language }: any) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const q = query(collection(firestore, 'questions'), where('chapter_id', '==', String(chapter.id)));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];
        setQuestions(data);
      } catch (err) {
        console.error("Fetch Questions Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [chapter.id]);

  const handleAnswer = (ans: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = ans;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    const score = answers.reduce((acc, ans, i) => acc + (ans === questions[i].correct_answer ? 1 : 0), 0);
    try {
      const user = auth.currentUser;
      if (user) {
        await addDoc(collection(firestore, 'test_results'), {
          userId: user.uid,
          chapterId: String(chapter.id),
          score: score,
          total: questions.length,
          createdAt: new Date().toISOString()
        });
        
        await updateDoc(doc(firestore, 'users', user.uid), {
          points: increment(score * 10)
        });
      }
      setFinished(true);
    } catch (err) {
      console.error("Submit Test Error:", err);
      alert("Failed to submit test. Please try again.");
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Questions...</div>;
  if (questions.length === 0) return <div className="text-center py-20 text-slate-500">No questions available for this chapter.</div>;

  if (finished) {
    const score = answers.reduce((acc, ans, i) => acc + (ans === questions[i].correct_answer ? 1 : 0), 0);
    return (
      <div className="max-w-xl mx-auto text-center space-y-8 py-10">
        <h2 className="text-3xl font-bold text-white">{translations[language].testResults}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-white/5">
            <div className="text-sm text-slate-500 mb-1">{translations[language].score}</div>
            <div className="text-4xl font-bold text-emerald-400">{score}/{questions.length}</div>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl border border-white/5">
            <div className="text-sm text-slate-500 mb-1">{translations[language].accuracy}</div>
            <div className="text-4xl font-bold text-blue-400">{Math.round((score/questions.length)*100)}%</div>
          </div>
        </div>
        <button 
          onClick={onComplete}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all"
        >
          {translations[language].backToDashboard}
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center text-sm text-slate-500">
        <span>Question {currentIdx + 1} of {questions.length}</span>
        <div className="h-2 w-48 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
        <h3 className="text-xl font-semibold text-white mb-8">{q.question}</h3>
        <div className="space-y-4">
          {q.options.map((opt, i) => (
            <button 
              key={i}
              onClick={() => handleAnswer(opt)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                answers[currentIdx] === opt ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <span className="inline-block w-8 h-8 rounded-lg bg-white/5 text-center leading-8 mr-4 text-xs font-bold">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button 
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(currentIdx - 1)}
          className="px-6 py-3 rounded-xl bg-white/5 text-slate-400 disabled:opacity-30"
        >
          Previous
        </button>
        {currentIdx === questions.length - 1 ? (
          <button onClick={handleSubmit} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold">
            {translations[language].submitTest}
          </button>
        ) : (
          <button onClick={() => setCurrentIdx(currentIdx + 1)} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold">
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function GamesView({ language, onBack }: any) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', ans: 0 });
  const [input, setInput] = useState('');

  const generateProblem = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let ans = 0;
    if (op === '+') ans = a + b;
    if (op === '-') ans = a - b;
    if (op === '*') ans = a * b;
    setProblem({ a, b, op, ans });
    setInput('');
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setGameState('playing');
    generateProblem();
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameState('over');
    }
  }, [gameState, timeLeft]);

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(input) === problem.ans) {
      setScore(score + 10);
      generateProblem();
    } else {
      setInput('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto text-center"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Lucide.ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].quickCalc}</h2>
        <p className="text-slate-500">{translations[language].gameInstructions}</p>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-[40px] p-12 shadow-2xl relative overflow-hidden">
        {gameState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Lucide.Bot size={48} className="text-emerald-400" />
            </div>
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl hover:bg-emerald-500 transition-all">
              {translations[language].start}
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={problem.a + problem.b}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-500 uppercase tracking-widest">Score: <span className="text-emerald-400 font-bold">{score}</span></div>
              <div className="text-sm text-slate-500 uppercase tracking-widest">Time: <span className="text-blue-400 font-bold">{timeLeft}s</span></div>
            </div>
            <div className="text-6xl font-bold text-white py-10">
              {problem.a} {problem.op} {problem.b} = ?
            </div>
            <form onSubmit={checkAnswer}>
              <input 
                autoFocus
                type="number" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-4xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </form>
          </motion.div>
        )}

        {gameState === 'over' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <h3 className="text-4xl font-bold text-red-400">{translations[language].gameOver}</h3>
            <div className="text-xl text-slate-300">Final Score: <span className="text-emerald-400 font-bold">{score}</span></div>
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl hover:bg-emerald-500 transition-all">
              {translations[language].playAgain}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function LeaderboardView({ leaderboard, language, onBack, following, user, onToggleFollow }: any) {
  const [activeFilter, setActiveFilter] = useState<'league' | 'class' | 'friends'>('league');
  const [activeLeague, setActiveLeague] = useState<League>('Bronze');
  const leagues: League[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [classLeaderboard, setClassLeaderboard] = useState<any[]>([]);
  const [loadingClass, setLoadingClass] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    if (activeFilter !== 'class' || !user?.class) return;
    const fetchClassLeaderboard = async () => {
      setLoadingClass(true);
      try {
        const q = query(
          collection(firestore, 'public_profiles'),
          where('class', '==', user.class),
          orderBy('points', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const testingNumbers = ['9556086560', '+919556086560', '6370487877', '+916370487877', '9337956168', '+919337956168', '8926118509', '+918926118509', '8457811227', '+918457811227', '7735118243', '+917735118243'];
        const filteredData = data.filter((s: any) => !testingNumbers.includes(s.phoneNumber));
        setClassLeaderboard(filteredData);
      } catch (err) {
        console.error("Failed to fetch class leaderboard:", err);
      } finally {
        setLoadingClass(false);
      }
    };
    fetchClassLeaderboard();
  }, [activeFilter, user?.class]);

  useEffect(() => {
    if (activeFilter !== 'friends' || following.length === 0) {
      setFriendProfiles([]);
      return;
    }
    const fetchFriendsProfiles = async () => {
      setLoadingFriends(true);
      try {
        const missingIds = following.filter(id => !leaderboard.some((s: any) => s.id === id));
        if (missingIds.length === 0) {
          setFriendProfiles([]);
          return;
        }
        const promises = missingIds.map(id => getDoc(doc(firestore, 'public_profiles', id)));
        const snaps = await Promise.all(promises);
        const fetched = snaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() }));
        setFriendProfiles(fetched);
      } catch (err) {
        console.error("Failed to fetch friend profiles:", err);
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriendsProfiles();
  }, [activeFilter, following, leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    if (activeFilter === 'class') {
      return classLeaderboard.length > 0 ? classLeaderboard : leaderboard.filter((s: any) => s.class === user.class);
    }
    if (activeFilter === 'friends') {
      const localFriends = leaderboard.filter((s: any) => following.includes(s.id) || s.id === user.id);
      const localFriendIds = new Set(localFriends.map(f => f.id));
      const extraFriends = friendProfiles.filter(f => !localFriendIds.has(f.id));
      return [...localFriends, ...extraFriends].sort((a, b) => (b.points || 0) - (a.points || 0));
    }
    return leaderboard.filter((s: any) => {
      const idx = leaderboard.indexOf(s);
      if (idx < 10) return activeLeague === 'Platinum';
      if (idx < 25) return activeLeague === 'Gold';
      if (idx < 50) return activeLeague === 'Silver';
      return activeLeague === 'Bronze';
    });
  }, [activeFilter, activeLeague, leaderboard, classLeaderboard, following, friendProfiles, user?.id, user?.class]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const handleGenerateRankCard = async () => {
    if (isGeneratingCard) return;
    setIsGeneratingCard(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentRank = leaderboard.findIndex((s: any) => s.id === user.id) + 1 || 'No.1';
      const pointsVal = leaderboard.find((s: any) => s.id === user.id)?.points || user?.points || 120;
      const currentStreak = user?.streak || 3;
      const userName = user?.name || 'Utkal Scholar';
      const className = translations[language].classes[user?.class] || user?.class || 'Class 10';

      // 1. Draw premium gradient background
      const grad = ctx.createRadialGradient(400, 600, 100, 400, 600, 800);
      grad.addColorStop(0, '#0f172a'); // slate-900
      grad.addColorStop(1, '#020617'); // slate-950
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1200);

      // 2. Draw futuristic gold neon laser border
      const borderGrad = ctx.createLinearGradient(0, 0, 800, 1200);
      borderGrad.addColorStop(0, '#fbbf24'); // gold
      borderGrad.addColorStop(0.5, '#f59e0b'); // amber
      borderGrad.addColorStop(1, '#10b981'); // emerald
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 16;
      ctx.strokeRect(30, 30, 740, 1140);

      // 3. Draw subtle background geometric sparkles
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(400 + Math.sin(i) * 200, 600 + Math.cos(i) * 300, 50 + i * 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Header metadata labels
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'bold 14px "Outfit", "Inter", sans-serif';
      ctx.fillText('UTKAL SKILL CENTRE • ACADEMIC RECORD', 400, 120);

      // 5. Draw big gold crown trophy emoji
      ctx.fillStyle = '#fbbf24';
      ctx.font = '48px "Outfit", sans-serif';
      ctx.fillText('🏆', 400, 200);

      // 6. Draw certificate title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 400, 270);

      ctx.fillStyle = '#f59e0b'; // amber
      ctx.font = '900 20px "Outfit", sans-serif';
      ctx.fillText('STATEWIDE WEEKLY LEADERBOARD', 400, 310);

      // 7. Golden divider
      const divGrad = ctx.createLinearGradient(150, 0, 650, 0);
      divGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      divGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.8)');
      divGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = divGrad;
      ctx.fillRect(150, 340, 500, 3);

      // 8. Certification description
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = 'italic 18px "Outfit", sans-serif';
      ctx.fillText('This certifies that the student scholar', 400, 400);

      // 9. Student's name (High emphasis)
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 48px "Outfit", "Inter", sans-serif';
      ctx.fillText(userName, 400, 470);

      // 10. Class / Grade details
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'normal 18px "Outfit", sans-serif';
      ctx.fillText(`of ${className} has achieved exemplary status on our platform`, 400, 520);

      // 11. State Rank display box
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'; // emerald-500/8% bg
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(150, 580, 500, 180, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#10b981'; // emerald-500
      ctx.font = '900 68px "Outfit", sans-serif';
      ctx.fillText(`ODISHA RANK #${currentRank}`, 400, 675);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px "Outfit", sans-serif';
      ctx.fillText(`WEEKLY EFFORT LEADERBOARD`, 400, 725);

      // 12. Effort Points & Streak boxes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(150, 800, 230, 100, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px "Outfit", sans-serif';
      ctx.fillText('EFFORT POINTS', 265, 835);

      ctx.fillStyle = '#fbbf24'; // gold
      ctx.font = '900 28px "Outfit", sans-serif';
      ctx.fillText(`${pointsVal} pts`, 265, 875);

      // Streak box
      ctx.beginPath();
      ctx.roundRect(420, 800, 230, 100, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px "Outfit", sans-serif';
      ctx.fillText('LEARNING STREAK', 535, 835);

      ctx.fillStyle = '#f97316'; // orange
      ctx.font = '900 28px "Outfit", sans-serif';
      ctx.fillText(`🔥 ${currentStreak} Days`, 535, 875);

      // 13. High-tech QR Code block with CTA details
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      ctx.roundRect(150, 940, 500, 130, 20);
      ctx.fill();

      // Mock QR design elements
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(180, 965, 80, 80);
      ctx.fillStyle = '#020617';
      ctx.fillRect(190, 975, 60, 60);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(205, 990, 30, 30);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Outfit", sans-serif';
      ctx.fillText("Join Odisha's #1 Learning Community!", 285, 995);

      ctx.fillStyle = '#64748b';
      ctx.font = 'normal 14px "Outfit", sans-serif';
      ctx.fillText("Scan QR to download the Utkal Skill Centre App", 285, 1020);
      ctx.fillText("Read textbooks, view AI notes, and practice for exams.", 285, 1040);

      // Convert canvas to base64 URL and share/download
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'utkal_rank_certificate.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Utkal Skill Centre Rank Card!',
          text: `Hey friends! I ranked #${currentRank} in Odisha on the Utkal Skill Centre Weekly Leaderboard! 🏆 Join our learning community for free here: https://utkalskillcentre.com`
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${userName.replace(/\s+/g, '_')}_utkal_rank_card.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert(language === 'en' 
          ? 'Downloaded Rank Card successfully! 🏆 Post it to your WhatsApp status to inspire your friends!' 
          : 'ରାଙ୍କ କାର୍ଡ ସଫଳତାର ସହ ଡାଉନଲୋଡ୍ ହୋଇଗଲା! 🏆 ନିଜ ସାଙ୍ଗମାନଙ୍କୁ ପ୍ରେରିତ କରିବା ପାଇଁ ଏହାକୁ ନିଜ WhatsApp ଷ୍ଟାଟସ୍‌ରେ ପୋଷ୍ଟ କରନ୍ତୁ!');
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err) {
      console.error('Failed to generate canvas rank card:', err);
      alert('Failed to generate your Rank Card. Please try again!');
    } finally {
      setIsGeneratingCard(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Lucide.ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div variants={itemVariants} className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{translations[language].weeklyLeaderboard}</h2>
        <p className="text-slate-500">{language === 'en' ? 'Compete with students across Odisha and track your overall rank!' : 'ଓଡ଼ିଶାର ଅନ୍ୟ ଛାତ୍ରମାନଙ୍କ ସହ ପ୍ରତିଦ୍ୱନ୍ଦ୍ୱିତା କରନ୍ତୁ ଏବଂ ନିଜର ମାନ୍ୟତା ଟ୍ରାକ୍ କରନ୍ତୁ!'}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
        {/* Main Category Filters */}
        <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-900/60 border border-slate-300/50 dark:border-white/10 rounded-full shadow-inner backdrop-blur-sm">
          <button
            onClick={() => setActiveFilter('league')}
            className={`px-8 py-2.5 rounded-full text-sm font-black transition-all duration-300 ${
              activeFilter === 'league' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {translations[language].leagues || 'Leagues'}
          </button>
          <button
            onClick={() => setActiveFilter('class')}
            className={`px-8 py-2.5 rounded-full text-sm font-black transition-all duration-300 ${
              activeFilter === 'class' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {language === 'en' ? 'My Class' : 'ମୋ ଶ୍ରେଣୀ'}
          </button>
          <button
            onClick={() => setActiveFilter('friends')}
            className={`px-8 py-2.5 rounded-full text-sm font-black transition-all duration-300 ${
              activeFilter === 'friends' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {translations[language].friends || 'Friends'}
          </button>
        </div>

        {/* Premium League Selector */}
        {activeFilter === 'league' && (
          <div className="flex flex-wrap justify-center gap-3.5 p-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] w-fit mx-auto mt-6 mb-10 shadow-2xl relative overflow-hidden select-none">
            {leagues.map((league) => {
              const icons: Record<string, string> = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' };
              const colors: Record<string, string> = { 
                Bronze: 'from-orange-600 via-amber-700 to-orange-800 text-white shadow-[0_12px_24px_rgba(249,115,22,0.4)] border-orange-500/50', 
                Silver: 'from-slate-400 via-slate-500 to-slate-600 text-white shadow-[0_12px_24px_rgba(148,163,184,0.4)] border-slate-300/50', 
                Gold: 'from-yellow-400 via-amber-500 to-yellow-600 text-slate-950 shadow-[0_12px_28px_rgba(234,179,8,0.5)] border-yellow-300/60', 
                Platinum: 'from-cyan-400 via-teal-500 to-blue-600 text-white shadow-[0_12px_30px_rgba(6,182,212,0.5)] border-cyan-300/60' 
              };
              const inactiveHoverGlows: Record<string, string> = {
                Bronze: 'hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]',
                Silver: 'hover:border-slate-400/50 hover:shadow-[0_0_15px_rgba(148,163,184,0.2)]',
                Gold: 'hover:border-yellow-400/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.25)]',
                Platinum: 'hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              };
              const isActive = activeLeague === league;
              
              return (
                <button
                  key={league}
                  onClick={() => setActiveLeague(league)}
                  className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-500 cursor-pointer border ${
                    isActive 
                      ? `bg-gradient-to-r ${colors[league]} scale-110 -translate-y-1.5` 
                      : `bg-slate-950/40 text-slate-400 border-white/5 ${inactiveHoverGlows[league]} hover:bg-slate-900/60 hover:text-white hover:-translate-y-0.5`
                  }`}
                >
                  <span className={`text-lg drop-shadow-md ${isActive ? 'animate-bounce' : ''}`} style={{ animationDuration: '2.5s' }}>{icons[league]}</span>
                  <span>{translations[language][league.toLowerCase()]}</span>
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* 🏆 PREMIUM PODIUM UI - X FACTOR 🏆 */}
      {!(loadingClass || loadingFriends) && filteredLeaderboard.length >= 3 && activeFilter === 'league' && (
        <motion.div variants={itemVariants} className="flex justify-center items-end gap-3 md:gap-8 pt-32 mt-12 pb-12 w-full max-w-3xl mx-auto">
          {/* Rank 2 (Silver) */}
          <div className="flex flex-col items-center relative group w-1/3 max-w-[140px]">
            <div className="absolute -top-16 z-20 group-hover:-translate-y-2 transition-transform duration-500">
              <div className="w-16 h-16 rounded-full border-[3px] border-slate-300 bg-slate-800 overflow-hidden shadow-[0_0_25px_rgba(203,213,225,0.4)] flex items-center justify-center">
                {filteredLeaderboard[1]?.avatar ? <img src={filteredLeaderboard[1].avatar} className="w-full h-full object-cover"/> : <span className="text-xl font-black text-white">{filteredLeaderboard[1]?.name?.[0] || 'S'}</span>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full p-1.5 text-slate-900 shadow-lg border border-slate-100/50">
                <Lucide.Medal size={14} fill="currentColor" />
              </div>
            </div>
            <div className="w-full h-32 md:h-40 bg-gradient-to-t from-slate-900/90 via-slate-800/80 to-slate-400/20 rounded-t-3xl border-t-[3px] border-x border-slate-300/40 flex flex-col items-center justify-start pt-6 shadow-[inset_0_20px_20px_rgba(203,213,225,0.1),0_0_30px_rgba(203,213,225,0.05)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_0%,transparent_100%)] opacity-50" />
              <span className="text-3xl font-black text-slate-300 drop-shadow-lg relative z-10">2</span>
              <span className="text-xs font-black mt-2 truncate w-[90%] text-center relative z-10" style={{ color: '#e2e8f0' }}>{filteredLeaderboard[1]?.name}</span>
              <span className="text-[10px] md:text-xs text-emerald-400 font-mono font-bold mt-0.5 relative z-10">{filteredLeaderboard[1]?.points} XP</span>
            </div>
          </div>

          {/* Rank 1 (Gold) */}
          <div className="flex flex-col items-center relative group z-10 w-1/3 max-w-[160px]">
            <div className="absolute -top-24 z-20 group-hover:-translate-y-3 transition-transform duration-500">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] z-30 animate-pulse">
                <Lucide.Crown size={36} fill="currentColor" />
              </div>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-400 bg-slate-800 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.6)] flex items-center justify-center">
                {filteredLeaderboard[0]?.avatar ? <img src={filteredLeaderboard[0].avatar} className="w-full h-full object-cover"/> : <span className="text-2xl font-black text-white">{filteredLeaderboard[0]?.name?.[0] || 'S'}</span>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full p-2 text-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-200">
                <Lucide.Trophy size={16} fill="currentColor" />
              </div>
            </div>
            <div className="w-full h-40 md:h-48 bg-gradient-to-t from-slate-900/90 via-amber-900/50 to-yellow-500/30 rounded-t-3xl border-t-[4px] border-x border-yellow-400/60 flex flex-col items-center justify-start pt-8 shadow-[inset_0_20px_30px_rgba(250,204,21,0.15),0_-10px_40px_rgba(250,204,21,0.1)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2)_0%,transparent_100%)] opacity-50" />
              <div className="absolute top-0 inset-x-0 h-1/2 bg-yellow-400/10 blur-xl rounded-full" />
              <span className="text-4xl md:text-5xl font-black text-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] relative z-10">1</span>
              <span className="text-sm md:text-base font-black mt-2 md:mt-3 truncate w-[90%] text-center relative z-10" style={{ color: '#facc15' }}>{filteredLeaderboard[0]?.name}</span>
              <span className="text-xs md:text-sm text-yellow-300 font-mono font-black mt-1 relative z-10 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">{filteredLeaderboard[0]?.points} XP</span>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="flex flex-col items-center relative group w-1/3 max-w-[140px]">
            <div className="absolute -top-16 z-20 group-hover:-translate-y-2 transition-transform duration-500">
              <div className="w-16 h-16 rounded-full border-[3px] border-orange-700 bg-slate-800 overflow-hidden shadow-[0_0_20px_rgba(194,65,12,0.4)] flex items-center justify-center">
                {filteredLeaderboard[2]?.avatar ? <img src={filteredLeaderboard[2].avatar} className="w-full h-full object-cover"/> : <span className="text-xl font-black text-white">{filteredLeaderboard[2]?.name?.[0] || 'S'}</span>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-orange-500 to-red-700 rounded-full p-1.5 text-white shadow-lg border border-orange-400/50">
                <Lucide.Medal size={14} fill="currentColor" />
              </div>
            </div>
            <div className="w-full h-28 md:h-36 bg-gradient-to-t from-slate-900/90 via-slate-800/80 to-orange-700/20 rounded-t-3xl border-t-[3px] border-x border-orange-700/40 flex flex-col items-center justify-start pt-6 shadow-[inset_0_20px_20px_rgba(194,65,12,0.1),0_0_20px_rgba(194,65,12,0.05)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_0%,transparent_100%)] opacity-30" />
              <span className="text-3xl font-black text-orange-600 drop-shadow-lg relative z-10">3</span>
              <span className="text-xs font-black mt-2 truncate w-[90%] text-center relative z-10" style={{ color: '#fdba74' }}>{filteredLeaderboard[2]?.name}</span>
              <span className="text-[10px] md:text-xs text-emerald-400 font-mono font-bold mt-0.5 relative z-10">{filteredLeaderboard[2]?.points} XP</span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-[40px] overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Rank</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Student</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Consistency</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">{translations[language].effortPoints}</th>
            </tr>
          </thead>
          <tbody>
            {loadingClass || loadingFriends ? (
              <tr>
                <td colSpan={5} className="px-3 sm:px-8 py-20 text-center text-slate-500">
                  <Lucide.Loader2 className="animate-spin text-emerald-500 mx-auto mb-2" size={32} />
                  {loadingClass 
                    ? (language === 'en' ? 'Loading class ranking...' : 'ଶ୍ରେଣୀ ମାନ୍ୟତା ଲୋଡ୍ ହେଉଛି...')
                    : (language === 'en' ? 'Loading friends...' : 'ସାଙ୍ଗମାନଙ୍କ ମାନ୍ୟତା ଲୋଡ୍ ହେଉଛି...')}
                </td>
              </tr>
            ) : filteredLeaderboard.length > 0 ? (
              filteredLeaderboard.map((student: any, i: number) => (
                <motion.tr 
                  variants={itemVariants}
                  key={i} 
                  className="border-b border-white/5 hover:bg-white/5 transition-all"
                >
                  <td className="px-3 sm:px-8 py-4 sm:py-6">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_#eab308]' : 
                      i === 1 ? 'bg-slate-300 text-slate-900 shadow-[0_0_15px_#cbd5e1]' : 
                      i === 2 ? 'bg-orange-500 text-slate-900 shadow-[0_0_15px_#f97316]' : 'text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold">{student.name?.[0] || 'S'}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-black flex items-center flex-wrap gap-2 ${student.id === user?.id ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {student.name}
                          {student.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-400 text-[10px] font-black bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20 shrink-0">
                              <Lucide.Flame size={10} fill="currentColor" />
                              {student.streak}
                            </span>
                          )}
                          {student.id !== user.id && (
                            <button
                              onClick={() => onToggleFollow?.(student.id)}
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer hover:scale-105 shrink-0 ${
                                following.includes(student.id)
                                  ? 'bg-slate-950/40 text-slate-350 border border-slate-700/80 hover:bg-red-950/30 hover:text-red-400 hover:border-red-500/30'
                                  : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-[0_3px_10px_rgba(16,185,129,0.3)] border border-emerald-300/20 hover:from-emerald-500 hover:to-teal-600'
                              }`}
                            >
                              {following.includes(student.id) ? (language === 'en' ? 'Following' : 'ଅନୁସରଣ') : (language === 'en' ? '+ Follow' : '+ ଅନୁସରଣ')}
                            </button>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{translations[language].classes[student.class] || student.class}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <div key={day} className={`w-2 h-2 rounded-full ${day <= (i % 5 + 1) ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-4 sm:py-6 text-right font-mono text-emerald-400 font-bold">{student.points}</td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 sm:px-8 py-20 text-center text-slate-500">
                  No students in this league yet. Keep practicing to move up!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      
      {/* Premium Gilded Achievement & Rank Sharing Card */}
      <motion.div 
        variants={itemVariants} 
        className="relative p-8 rounded-[36px] border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-emerald-500/10 text-center overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-pulse" style={{ animationDuration: '6s' }} />
        
        <div className="flex flex-col items-center space-y-4 relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30 shadow-lg relative animate-bounce">
            <Lucide.Trophy size={28} />
          </div>
          
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-xl font-black text-white leading-tight">
              {language === 'en' ? 'Your Odisha Rank Certificate is Ready! 🏆' : 'ଆପଣଙ୍କ ଓଡ଼ିଶା ର୍ୟାଙ୍କ୍ ପ୍ରମାଣପତ୍ର ପ୍ରସ୍ତୁତ! 🏆'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">
              {language === 'en'
                ? 'Get a premium, high-definition digital certificate detailing your state rank, points, and effort streak. Share it directly to WhatsApp Status to inspire your classmates!'
                : 'ଆପଣଙ୍କ ରାଜ୍ୟ ର୍ୟାଙ୍କ୍, ପଏଣ୍ଟ ଏବଂ ପ୍ରୟାସ ଷ୍ଟ୍ରିକ୍ ସହିତ ଏକ ପ୍ରିମିୟମ୍ ଡିଜିଟାଲ୍ ପ୍ରମାଣପତ୍ର ଡାଉନଲୋଡ୍ କରନ୍ତୁ। ନିଜ WhatsApp ଷ୍ଟାଟସ୍‌ରେ ଏହାକୁ ଶେୟାର କରନ୍ତୁ!'}
            </p>
          </div>
          
          <button
            type="button"
            disabled={isGeneratingCard}
            onClick={handleGenerateRankCard}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-sm font-black flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {isGeneratingCard ? (
              <>
                <Lucide.Loader2 size={18} className="animate-spin" />
                <span>{language === 'en' ? 'Generating Certificate...' : 'ପ୍ରମାଣପତ୍ର ପ୍ରସ୍ତୁତ ହେଉଛି...'}</span>
              </>
            ) : (
              <>
                <Lucide.Share2 size={18} />
                <span>{language === 'en' ? 'Share My Odisha Rank Card 🏆' : 'ମୋର ଓଡ଼ିଶା ର୍ୟାଙ୍କ୍ କାର୍ଡ଼ ଶେୟାର କରନ୍ତୁ 🏆'}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const escapeXml = (str: string): string => {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const getGenerativeTextbookCover = (classKey: string, subjectKey: string, title: string): string => {
  const odiaClasses: Record<string, string> = {
    class1: "ପ୍ରଥମ ଶ୍ରେଣୀ",
    class2: "ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ",
    class3: "ତୃତୀୟ ଶ୍ରେଣୀ",
    class4: "ଚତୁର୍ଥ ଶ୍ରେଣୀ",
    class5: "ପଞ୍ଚମ ଶ୍ରେଣୀ",
    class6: "ଷଷ୍ଠ ଶ୍ରେଣୀ",
    class7: "ସପ୍ତମ ଶ୍ରେଣୀ",
    class8: "ଅଷ୍ଟମ ଶ୍ରେଣୀ",
    class9: "ନବମ ଶ୍ରେଣୀ",
    class10: "ଦଶମ ଶ୍ରେଣୀ",
    sishuvatika: "ଶିଶୁ ବାଟିକା"
  };

  const odiaSubjects: Record<string, string> = {
    ganita_khela: "ଗଣିତ ଖେଳ",
    jhulana_1: "ଝୁଲଣା ୧",
    maja_majare_ganita: "ମଜା ମଜାରେ ଗଣିତ",
    jhulana_2: "ଝୁଲଣା ୨",
    bhasa_mahak_1: "ଭାଷା ମହକ ୧",
    ganita_mela: "ଗଣିତ ମେଳା",
    paribesa_patha: "ପରିବେଶ ପାଠ",
    pallavi: "ପଲ୍ଲବୀ ଇଂରାଜୀ",
    kala_sikhya: "କଳା ଶିକ୍ଷା",
    sharirika_sikhya: "ଶାରୀରିକ ଶିକ୍ଷା",
    bhasa_mahak_2: "ଭାଷା ମହକ ୨",
    krida_yoga: "କ୍ରୀଡ଼ା ଓ ଯୋଗ",
    bhasa_mahak_3: "ଭାଷା ମହକ ୩",
    ama_chaturbaswara_pruthibi: "ଆମ ଚର୍ତୁର୍ପାଶ୍ଵର ପୃଥିବୀ",
    sharirika_yoga: "ଶାରୀରିକ ଯୋଗ",
    ganita_prakas: "ଗଣିତ ପ୍ରକାଶ",
    sahitya_sudha: "ସାହିତ୍ୟ ସୁଧା",
    jigyasa: "ଜିଜ୍ଞାସା ବିଜ୍ଞାନ",
    samajika_bignana: "ସାମାଜିକ ବିଜ୍ଞାନ",
    jasmine: "ଜାସମିନ ଇଂରାଜୀ",
    hindi_kalika: "ହିନ୍ଦୀ କଳିକା",
    sanskritakalika_1: "ସଂସ୍କୃତ କଳିକା ୧",
    kausala_bodha: "କୌଶଳ ବୋଧ",
    kalakunja: "କଳାକୁଞ୍ଜ",
    khela_sikhya: "ଖେଳ ଶିକ୍ଷା",
    sahitya_suman: "ସାହିତ୍ୟ ସୁମନ",
    sanskritakalika_2: "ସଂସ୍କୃତ କଳିକା ୨",
    kalakruti: "କଳାକୃତି",
    sahitya_surabhi: "ସାହିତ୍ୟ ସୁରଭି",
    sanskritakalika_3: "ସଂସ୍କୃତ କଳିକା ୩",
    kruti: "କୃତି",
    algebra: "ବୀଜଗଣିତ",
    geometry: "ଜ୍ୟାମିତି",
    physical_science: "ଭୌତିକ ବିଜ୍ଞାନ",
    life_science: "ଜୀବ ବିଜ୍ଞାନ",
    social_science: "ଇତିହାସ",
    geography: "ଭୂଗୋଳ",
    english: "ଇଂରାଜୀ",
    english_grammar: "ଇଂରାଜୀ ବ୍ୟାକରଣ",
    odia: "ଓଡ଼ିଆ",
    odia_grammar: "ଓଡ଼ିଆ ବ୍ୟାକରଣ",
    sanskrit: "ସଂସ୍କୃତ",
    sanskrit_grammar: "ସଂସ୍କୃତ ବ୍ୟାକରଣ",
    hindi: "ହିନ୍ଦୀ",
    hindi_grammar: "ହିନ୍ଦୀ ବ୍ୟାକରଣ",
    vocational: "ବ୍ୟାବସାୟିକ ଶିକ୍ଷା"
  };

  const cleanClass = classKey.toLowerCase().replace(/\s+/g, '').replace('th', '');
  const odiaClass = odiaClasses[cleanClass] || odiaClasses[classKey] || classKey;
  const odiaSubject = odiaSubjects[subjectKey] || subjectKey;

  const displayClass = escapeXml(odiaClass.toUpperCase());
  const displaySubject = escapeXml(odiaSubject);

  // Determine theme color and pattern based on subject
  let gradient = "from-emerald-500 via-teal-600 to-slate-800";
  let decorativePattern = "";

  const subLower = subjectKey.toLowerCase();
  if (subLower.includes('math') || subLower.includes('ganita') || subLower.includes('algebra') || subLower.includes('geometry')) {
    gradient = "from-teal-500 via-emerald-600 to-amber-700";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <circle cx="200" cy="250" r="130" />
        <circle cx="200" cy="250" r="80" />
        <line x1="200" y1="100" x2="200" y2="400" />
        <line x1="50" y1="250" x2="350" y2="250" />
      </g>
    `;
  } else if (subLower.includes('history') || subLower.includes('social_science') || subLower.includes('hist')) {
    gradient = "from-amber-600 via-orange-600 to-amber-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <rect x="120" y="150" width="160" height="200" rx="10" />
        <line x1="160" y1="150" x2="160" y2="350" />
        <line x1="200" y1="150" x2="200" y2="350" />
        <line x1="240" y1="150" x2="240" y2="350" />
        <circle cx="200" cy="250" r="50" stroke-dasharray="4,4" />
      </g>
    `;
  } else if (subLower.includes('geography') || subLower.includes('geo')) {
    gradient = "from-teal-500 via-emerald-600 to-slate-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <circle cx="200" cy="250" r="110" />
        <ellipse cx="200" cy="250" rx="110" ry="40" />
        <ellipse cx="200" cy="250" rx="40" ry="110" />
        <line x1="200" y1="140" x2="200" y2="360" />
        <line x1="90" y1="250" x2="310" y2="250" />
      </g>
    `;
  } else if (subLower.includes('science') || subLower.includes('jigyasa') || subLower.includes('bignana') || subLower.includes('physical') || subLower.includes('life')) {
    gradient = "from-cyan-500 via-blue-600 to-indigo-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <ellipse cx="200" cy="250" rx="140" ry="50" transform="rotate(30 200 250)" />
        <ellipse cx="200" cy="250" rx="140" ry="50" transform="rotate(-30 200 250)" />
        <circle cx="200" cy="250" r="10" fill="white" fill-opacity="0.1" />
      </g>
    `;
  } else if (subLower.includes('social') || subLower.includes('samajika')) {
    gradient = "from-amber-500 via-orange-600 to-red-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <circle cx="200" cy="250" r="110" />
        <ellipse cx="200" cy="250" rx="110" ry="40" />
        <ellipse cx="200" cy="250" rx="40" ry="110" />
      </g>
    `;
  } else if (subLower.includes('english') || subLower.includes('jasmine') || subLower.includes('pallavi')) {
    gradient = "from-purple-500 via-pink-600 to-rose-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <path d="M100,150 C150,200 250,200 300,150 C300,150 250,300 200,350 C150,300 100,150 100,150 Z" />
        <circle cx="200" cy="230" r="50" />
      </g>
    `;
  } else if (subLower.includes('odia') || subLower.includes('sahitya') || subLower.includes('jhulana') || subLower.includes('bhasa')) {
    gradient = "from-orange-400 via-red-500 to-amber-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <path d="M100,250 Q200,150 300,250 T100,250" stroke-dasharray="5,5" />
        <circle cx="200" cy="250" r="100" />
      </g>
    `;
  } else if (subLower.includes('sanskrit') || subLower.includes('sanskruta')) {
    gradient = "from-amber-600 via-yellow-600 to-red-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <polygon points="200,130 290,200 290,300 200,370 110,300 110,200" />
        <circle cx="200" cy="250" r="60" />
      </g>
    `;
  } else if (subLower.includes('hindi')) {
    gradient = "from-rose-500 via-pink-600 to-red-900";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <rect x="110" y="160" width="180" height="180" rx="15" transform="rotate(45 200 250)" />
        <circle cx="200" cy="250" r="40" />
      </g>
    `;
  }

  const colors = gradient.replace('from-', '').replace('via-', '').replace('to-', '').split(' ');
  const colorMap: Record<string, string> = {
    'teal-500': '#0d9488', 'emerald-600': '#059669', 'amber-700': '#b45309',
    'cyan-500': '#0891b2', 'blue-600': '#2563eb', 'indigo-800': '#3730a3',
    'amber-500': '#d97706', 'orange-600': '#ea580c', 'red-800': '#991b1b',
    'purple-500': '#9333ea', 'pink-600': '#db2777', 'rose-800': '#9f1239',
    'orange-400': '#fb923c', 'red-500': '#ef4444', 'amber-800': '#92400e',
    'amber-600': '#d97706', 'yellow-600': '#ca8a04', 'rose-500': '#f43f5e',
    'red-900': '#7f1d1d', 'emerald-500': '#10b981', 'teal-600': '#0d9488',
    'slate-800': '#1e293b'
  };

  const startColor = colorMap[colors[0]] || '#0d9488';
  const midColor = colorMap[colors[1]] || '#059669';
  const endColor = colorMap[colors[2]] || '#1e293b';

  const displayTitle = escapeXml(title.length > 22 ? title.substring(0, 19) + "..." : title);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
      <defs>
        <linearGradient id="textbook_grad_${classKey}_${subjectKey}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="50%" stop-color="${midColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>

      <!-- Card Background -->
      <rect width="400" height="533" rx="28" fill="url(#textbook_grad_${classKey}_${subjectKey})" />
      <rect width="25" height="533" fill="black" fill-opacity="0.15" />
      <line x1="25" y1="0" x2="25" y2="533" stroke="white" stroke-opacity="0.08" stroke-width="1" />

      <!-- Decorative Overlays -->
      ${decorativePattern}

      <!-- Top Header (Odia Subject Name & Class Name) -->
      <g transform="translate(200, 80)" text-anchor="middle">
        <!-- Class Name -->
        <text y="0" fill="white" fill-opacity="0.6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" letter-spacing="1.5">${displayClass}</text>
        <!-- Subject Name -->
        <text y="35" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900">${displaySubject}</text>
      </g>

      <!-- Center Mascot Crest -->
      <g transform="translate(200, 240)" text-anchor="middle">
        <circle cx="0" cy="0" r="45" fill="white" fill-opacity="0.06" stroke="white" stroke-opacity="0.15" stroke-width="2" />
        <!-- Crest Icon / Book Graphic -->
        <path d="M-18,-8 L0,-18 L18,-8 L18,12 L0,22 L-18,12 Z" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M0,-18 L0,22" fill="none" stroke="white" stroke-dasharray="2,2" stroke-width="2" />
      </g>

      <!-- Bottom Card Metadata Info -->
      <rect x="40" y="380" width="320" height="110" rx="18" fill="#020617" fill-opacity="0.75" stroke="white" stroke-opacity="0.05" stroke-width="1.5" />
      
      <!-- Odia Title Display -->
      <text x="60" y="425" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800">${displayTitle}</text>
      <text x="60" y="458" fill="white" fill-opacity="0.4" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" letter-spacing="1.2">UTKAL TEXTBOOK • ଉତ୍କଳ ପାଠ୍ୟପୁସ୍ତକ</text>
    </svg>
  `;

  try {
    const utf8Bytes = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    const base64Svg = btoa(utf8Bytes);
    return `data:image/svg+xml;base64,${base64Svg}`;
  } catch (e) {
    console.error("Failed to base64 encode SVG textbook cover:", e);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
};

function TextbooksView({ user, textbooks, language, onBack }: any) {
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [teacherClassFilter, setTeacherClassFilter] = useState('all');

  const handleDownload = async (book: Textbook) => {
    if (!auth.currentUser) return;
    window.open(getDirectDriveDownloadUrl(book.download_url), '_blank');
  };

  const boardKey = React.useMemo(() => {
    if (!user?.board) return 'odisha';
    const b = user.board.toLowerCase();
    if (b.includes('saraswati')) return 'saraswati';
    if (b.includes('aurobindo') || b.includes('sacie')) return 'aurobindo';
    if (b.includes('oav') || b.includes('adarsha')) return 'oav';
    if (b.includes('odia') || b.includes('odisha')) return 'odisha';
    return b;
  }, [user?.board]);

  const filteredTextbooks = React.useMemo(() => {
    console.log("Debug: Filtering textbooks:", textbooks, "User:", user);
    const filtered = textbooks.filter((book: Textbook) => {
      if (book.status === 'draft') return false;
      if (user?.role === 'teacher') {
        const matchesClass = teacherClassFilter === 'all' || book.class?.toLowerCase() === teacherClassFilter.toLowerCase() || book.class?.toLowerCase() === `class${teacherClassFilter}`;
        const matchesSubject = subjectFilter === 'all' || book.subject === subjectFilter;
        return matchesClass && matchesSubject;
      }
      const matchesClass = !user?.class || 
        book.class?.toLowerCase() === user.class.toLowerCase() || 
        book.class?.toLowerCase() === `class${user.class.toLowerCase()}`;
      const matchesBoard = !user?.board || book.board?.toLowerCase().includes(boardKey.toLowerCase()) || boardKey.toLowerCase().includes(book.board?.toLowerCase() || '');
      const matchesSubject = subjectFilter === 'all' || book.subject === subjectFilter;
      return matchesClass && matchesBoard && matchesSubject;
    });
    console.log("Debug: Filtered textbooks:", filtered);
    return filtered;
  }, [textbooks, user?.class, user?.board, boardKey, subjectFilter, user?.role, teacherClassFilter]);

  const availableSubjects = React.useMemo(() => {
    if (user?.role === 'teacher') {
      const subjects = new Set<string>(
        textbooks
          .filter((b: Textbook) => teacherClassFilter === 'all' || b.class?.toLowerCase() === teacherClassFilter.toLowerCase() || b.class?.toLowerCase() === `class${teacherClassFilter}`)
          .map((b: Textbook) => b.subject)
      );
      return ['all', ...Array.from(subjects).filter(s => s && s !== 'all')];
    }
    const subjects = new Set<string>(
      textbooks
        .filter((b: Textbook) => 
          (b.class?.toLowerCase() === user?.class?.toLowerCase() || b.class?.toLowerCase() === `class${user?.class?.toLowerCase()}`) && 
          b.board?.toLowerCase() === boardKey.toLowerCase()
        )
        .map((b: Textbook) => b.subject)
    );
    return ['all', ...Array.from(subjects).filter(s => s && s !== 'all')];
  }, [textbooks, user?.class, boardKey, user?.role, teacherClassFilter]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-20"
    >
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <Lucide.ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {language === 'en' ? 'Textbooks Library' : 'ପାଠ୍ୟପୁସ୍ତକ ସମୂହ'}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              {user?.role === 'teacher' ? (language === 'en' ? 'Educator Access (All Classes)' : 'ଶିକ୍ଷକ ଆକ୍ସେସ୍') : `${translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} • ${user?.board}`}
            </p>
          </div>
        </div>

        {user?.role === 'teacher' && (
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter by Class</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {['all', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'].map((cls) => (
                <button
                  key={cls}
                  onClick={() => setTeacherClassFilter(cls)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    teacherClassFilter === cls
                      ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  {cls === 'all' ? (language === 'en' ? 'All Classes' : 'ସବୁ ଶ୍ରେଣୀ') : `Class ${cls}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableSubjects.map((s: string) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                subjectFilter === s 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
              }`}
            >
              {s === 'all' ? translations[language].allSubjects : (translations[language].subjects[s as keyof typeof translations.en.subjects] || s)}
            </button>
          ))}
        </div>
      </motion.div>

      {filteredTextbooks.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-white/5 rounded-3xl">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Lucide.Book size={48} className="text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {language === 'en' ? 'No Textbooks Found' : 'କୌଣସି ପାଠ୍ୟପୁସ୍ତକ ମିଳିଲା ନାହିଁ'}
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {language === 'en' 
              ? "We're currently uploading textbooks for your class and board. Please check back soon!" 
              : "ଆମେ ବର୍ତ୍ତମାନ ଆପଣଙ୍କ ଶ୍ରେଣୀ ଏବଂ ବୋର୍ଡ ପାଇଁ ପାଠ୍ୟପୁସ୍ତକ ଅପଲୋଡ୍ କରୁଛୁ। ଦୟାକରି ଶୀଘ୍ର ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ!"}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTextbooks.map((book: Textbook) => {
            const bookTitle = typeof book.title === 'string'
              ? book.title
              : (book.title?.[language as 'en' | 'or'] || book.title?.en || book.title?.or || 'Untitled');

            return (
              <motion.div 
                whileHover={{ y: -6 }} 
                key={book.id} 
                className="group relative bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/60 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] transition-all duration-300 flex flex-col"
              >
                {/* Radial Glow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-teal-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-500 pointer-events-none" />

                {/* Book Cover Frame Container */}
                <div className="aspect-[3/4] relative overflow-hidden bg-slate-950/80 m-4 mb-0 rounded-2xl border border-white/5 shadow-2xl shadow-black/50">
                  <img 
                    src={getGenerativeTextbookCover(book.class, book.subject, bookTitle)} 
                    alt={bookTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Details and Actions */}
                <div className="p-5 flex flex-col flex-1 justify-between gap-5 relative z-10">
                  <div className="space-y-2.5">
                    <span className="inline-flex px-2.5 py-1 bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-white/5">
                      {translations[language].subjects[book.subject as keyof typeof translations.en.subjects] || book.subject}
                    </span>
                    <h3 className="text-base font-extrabold text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors duration-300">
                      {bookTitle}
                    </h3>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2.5 mt-auto">
                    <button 
                      onClick={() => handleDownload(book)}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.45)] active:scale-95 duration-200"
                    >
                      <Lucide.Download size={16} />
                      <span>{language === 'en' ? 'Download' : 'ଡାଉନଲୋଡ୍'}</span>
                    </button>
                    <a 
                      href={`https://wa.me/?text=${encodeURIComponent(
                        language === 'en' 
                          ? `Check out this textbook: ${bookTitle}\nDownload here: ${book.download_url}` 
                          : `ଏହି ପାଠ୍ୟପୁସ୍ତକଟି ଦେଖନ୍ତୁ: ${bookTitle}\nଏଠାରୁ ଡାଉନଲୋଡ୍ କରନ୍ତୁ: ${book.download_url}`
                      )}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 rounded-xl transition-all flex items-center justify-center active:scale-95 duration-200 shadow-md shadow-emerald-500/5"
                      title={language === 'en' ? 'Share on WhatsApp' : 'WhatsApp ରେ ସେୟାର କରନ୍ତୁ'}
                    >
                      <Lucide.MessageCircle size={20} className="stroke-[2.5]" />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

function OfflineNotesView({ language, onBack }: { language: 'or' | 'en', onBack: () => void }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [textbooks, setTextbooks] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'notes' | 'textbooks'>('notes');

  useEffect(() => {
    setNotes(OfflineService.getAllNotes());
    setTextbooks(OfflineService.getOfflineTextbooks());
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Lucide.ArrowLeft size={20} />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Profile</span>
      </button>

      <h1 className="text-3xl font-black text-white mb-8">{language === 'en' ? 'Offline Material' : 'ଅଫଲାଇନ୍ ସାମଗ୍ରୀ'}</h1>

      <div className="flex gap-2 bg-slate-900/50 p-2 rounded-2xl w-fit mb-8 border border-white/5 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'notes' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Lucide.FileText size={16} /> {language === 'en' ? 'Notes' : 'ନୋଟ୍'}
        </button>
        <button 
          onClick={() => setActiveTab('textbooks')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'textbooks' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Lucide.Book size={16} /> {language === 'en' ? 'Textbooks' : 'ପାଠ୍ୟପୁସ୍ତକ'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'notes' && (
          <motion.div 
            key="notes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {Object.keys(notes).length === 0 ? (
              <div className="glass-card p-12 text-center rounded-[2rem]">
                <p className="text-slate-400">{language === 'en' ? 'No notes saved.' : 'କୌଣସି ନୋଟ୍ ସେଭ୍ ହୋଇନାହିଁ |'}</p>
              </div>
            ) : (
              Object.entries(notes).map(([id, content]) => (
                <div key={id} className="glass-card p-6 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white">Chapter ID: {id}</h3>
                    <button 
                      onClick={() => {
                        const newNotes = { ...notes };
                        delete newNotes[id];
                        localStorage.setItem('offline_notes', safeJsonStringify(newNotes));
                        setNotes(newNotes);
                      }}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Lucide.X size={16} />
                    </button>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl prose prose-invert max-w-none text-sm">
                    <Markdown>{content}</Markdown>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'textbooks' && (
          <motion.div 
            key="textbooks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {Object.keys(textbooks).length === 0 ? (
              <div className="glass-card p-12 text-center rounded-[2rem]">
                <p className="text-slate-400">{language === 'en' ? 'No textbooks saved.' : 'କୌଣସି ପାଠ୍ୟପୁସ୍ତକ ସେଭ୍ ହୋଇନାହିଁ |'}</p>
              </div>
            ) : (
              Object.entries(textbooks).map(([id, book]) => (
                <div key={id} className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-slate-800 rounded-lg overflow-hidden">
                      {book.thumbnail_url && <img src={book.thumbnail_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{typeof book.title === 'string' ? book.title : (book.title[language as 'en' | 'or'] || book.title.en)}</h3>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{book.subject}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={getDirectDriveDownloadUrl(book.download_url)} target="_blank" rel="noopener noreferrer" className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all">
                      <Lucide.Download size={18} />
                    </a>
                    <button 
                      onClick={() => {
                        const newBooks = { ...textbooks };
                        delete newBooks[id];
                        localStorage.setItem('offline_textbooks', safeJsonStringify(newBooks));
                        setTextbooks(newBooks);
                      }}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                    >
                      <Lucide.X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TopicDetailView({ 
  topic, 
  onBack, 
  onTakeQuiz, 
  language,
  isPremium,
  onUpgrade
}: { 
  topic: Chapter, 
  onBack: () => void, 
  onTakeQuiz: () => void, 
  language: 'or' | 'en',
  isPremium: boolean,
  onUpgrade: () => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'video' | 'notes'>('notes');
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  const videos = topic.videos && topic.videos.length > 0 
    ? topic.videos 
    : [{ url: topic.videoUrl, teacherOrChannel: topic.teacherOrChannel || 'Default' }];

  const selectedVideo = videos[selectedVideoIndex];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8 pb-20"
    >
      {/* Premium Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/50 border border-white/5 text-slate-400 hover:text-white transition-all hover:border-white/10"
        >
          <Lucide.ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-black uppercase tracking-[0.2em] text-[10px]">Neural Archive</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500/20 to-transparent" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            1.2k Students learning this
          </p>
        </div>
      </motion.div>

      {/* Main Content Node */}
      <motion.div variants={itemVariants} className="glass-card rounded-[3rem] border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
        
        <div className="p-8 md:p-12 relative z-10">
          {/* Topic Hero Section */}
          <div className="flex flex-col lg:flex-row gap-12 mb-12">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">
                <Lucide.Zap size={12} fill="currentColor" />
                Knowledge Core
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.1] tracking-tighter uppercase">
                {typeof topic.title === 'string' ? topic.title : (topic.title as any).or || (topic.title as any).en}
              </h1>

              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-white/5">
                    <Lucide.User size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Architect</p>
                    <p className="text-sm font-bold text-white">{selectedVideo?.teacherOrChannel || 'Utkal Mentor'}</p>
                  </div>
                </div>

                <div className="w-px h-8 bg-white/5" />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-white/5">
                    <Lucide.BookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Subject</p>
                    <p className="text-sm font-bold text-white">{getLocalizedSubject(topic.subject, language)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-72 space-y-4">
              <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Engagement Level</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                  <span className="text-[10px] font-black text-white">85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Immersive Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-[2rem] border border-white/5 mb-10 w-fit mx-auto lg:mx-0">
            {[
              { id: 'notes', icon: Lucide.FileText, label: translations[language].notes, disabled: !topic.notes && !topic.notesUrl },
              { id: 'video', icon: Lucide.Play, label: translations[language].video }
            ].map((tab) => (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  tab.disabled ? 'opacity-20 cursor-not-allowed' :
                  activeSubTab === tab.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab Content Area */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeSubTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeSubTab === 'video' && (
                <div className="space-y-6">
                  <div className="aspect-video rounded-[3rem] overflow-hidden bg-black shadow-2xl border-4 border-white/5 group relative">
                    {selectedVideo?.url ? (
                      <iframe 
                        src={getYouTubeEmbedUrl(selectedVideo.url)}
                        className="w-full h-full border-0"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                        <Lucide.Loader2 size={48} className="animate-spin" />
                        <p className="font-black uppercase tracking-widest text-[10px]">Initializing Stream...</p>
                      </div>
                    )}
                  </div>

                  {videos.length > 1 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {videos.map((v: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setSelectedVideoIndex(i)}
                          className={`p-4 rounded-2xl border transition-all text-left space-y-2 ${
                            selectedVideoIndex === i 
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                              : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                          }`}
                        >
                          <p className="text-[8px] font-black uppercase tracking-widest">Mentor {i + 1}</p>
                          <p className="text-xs font-bold truncate">{v.teacherOrChannel}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'notes' && (
                <div className="bg-slate-950/50 rounded-[3rem] p-10 min-h-[400px] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-cyan-500/50 opacity-30" />
                  
                  {topic.notesUrl ? (
                    <div className="flex flex-col items-center justify-center h-full gap-8">
                      <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-2xl">
                        <Lucide.FileText size={40} />
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Scholastic Archive Unlocked</h3>
                        <p className="text-slate-400 font-medium italic">High-fidelity study notes are ready for synchronization.</p>
                      </div>
                      <a 
                        href={topic.notesUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-emerald-900/40 active:scale-95"
                      >
                        Synchronize PDF Notes
                      </a>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none prose-emerald selection:bg-emerald-500/30">
                      <div className="markdown-body">
                        <Markdown>{topic.notes}</Markdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuizEngine({ questions, onComplete, language, userId, chapterId }: { questions: any[], onComplete: () => void, language: string, userId: string, chapterId: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    setCurrentIdx(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentIdx(prev => prev - 1);
  };

  const score = answers.reduce((acc, ansIdx, i) => {
    const selectedOption = questions[i].options[ansIdx];
    return acc + (selectedOption === questions[i].correct_answer ? 1 : 0);
  }, 0);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await addDoc(collection(firestore, 'quiz_results'), {
        userId,
        chapterId,
        score,
        total: questions.length,
        timestamp: serverTimestamp(),
        accuracy: Math.round((score / questions.length) * 100)
      });

      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentAccuracy = userData.stats?.accuracy || 0;
        const newAccuracy = Math.round((currentAccuracy + (score / questions.length) * 100) / 2);
        
        await updateDoc(userRef, {
          points: increment(score * 10),
          'stats.accuracy': newAccuracy,
          'stats.experience': increment(score * 5),
          completed_chapters: Array.from(new Set([...(userData.completed_chapters || []), chapterId]))
        });
      }
      
      setFinished(true);
    } catch (err) {
      console.error("Quiz Save Error:", err);
      setFinished(true);
    } finally {
      setSaving(false);
    }
  };

  if (finished) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto text-center py-12"
      >
        <div className="glass-card rounded-[3rem] border-white/5 p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-30" />
          
          <motion.div 
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-900/40 relative z-10"
          >
            <Lucide.Trophy size={56} className="text-white" />
          </motion.div>

          <div className="relative z-10 space-y-4 mb-12">
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase">Assessment Synchronized</h2>
            <p className="text-slate-400 font-medium italic">Neural pathways have been updated with your performance data.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
            {[
              { label: 'Neural Accuracy', value: `${Math.round((score / questions.length) * 100)}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Cognitive Score', value: `${score}/${questions.length}`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Exp Gained', value: `+${score * 10}`, color: 'text-amber-400', bg: 'bg-amber-500/10' }
            ].map((stat, i) => (
              <div 
                key={i} 
                className={`p-8 rounded-[2rem] ${stat.bg} border border-white/5 backdrop-blur-sm`}
              >
                <p className={`text-4xl font-black mb-2 tracking-tighter ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className="px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl shadow-emerald-900/20"
            >
              Retract to Topic Detail
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  const q = questions[currentIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onComplete}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <Lucide.ArrowLeft size={20} />
          <span>Quit Quiz</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
            {currentIdx + 1}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-6">
        <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">{q.question}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {q.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`flex items-center gap-4 p-6 rounded-2xl border transition-all text-left ${answers[currentIdx] === idx ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${answers[currentIdx] === idx ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="text-lg font-medium">{opt}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Previous
          </button>
          {currentIdx === questions.length - 1 ? (
            <button 
              onClick={handleFinish}
              disabled={answers[currentIdx] === undefined || saving}
              className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Lucide.Loader2 className="animate-spin" size={20} /> : 'Finish Quiz'}
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={answers[currentIdx] === undefined}
              className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              Next Question
            </button>
          )}
        </div>

        {q.hint && (
          <div className="mt-6 border-t border-white/5 pt-6">
            {!showHint ? (
              <button 
                onClick={() => setShowHint(true)}
                className="text-amber-500 hover:text-amber-400 text-sm font-bold flex items-center gap-2"
              >
                <Lucide.Lightbulb size={16} /> Show Hint
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <Lucide.Lightbulb className="text-amber-500 shrink-0" size={20} />
                <p className="text-amber-200/80 text-sm">{q.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
