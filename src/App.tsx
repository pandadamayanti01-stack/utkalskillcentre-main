import React, { Suspense, lazy, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Lucide from 'lucide-react';
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
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer, collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, increment, getCountFromServer, onSnapshot, Timestamp, deleteDoc } from 'firebase/firestore';
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
import { getDeferredPrompt, clearDeferredPrompt, vibrate, requestScreenWakeLock, releaseScreenWakeLock, shareNative, playSuccessChime, playClickSound, subscribeUserToPush } from './pwa';
import { SEO } from './components/SEO';
import { BottomNavBar } from './components/BottomNavBar';
import ReactMarkdown from 'react-markdown';
import LibraryPortalGate from './components/LibraryPortalGate';

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard')
    .then((module) => ({ default: module.AdminDashboard }))
    .catch((error) => {
      if (error.message && error.message.includes('Failed to fetch dynamically imported module')) {
        window.location.reload();
      }
      throw error;
    })
);
const PracticeQuestion = lazy(() => import('./components/PracticeQuestion').then((module) => ({ default: module.PracticeQuestion })));
const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const NotificationsView = lazy(() => import('./components/NotificationsView').then((module) => ({ default: module.NotificationsView })));
const GunduluHuman = lazy(() => import('./components/GunduluHuman'));
const AvatarStore = lazy(() => import('./components/AvatarStore').then((module) => ({ default: module.AvatarStore })));
const ProgressChart = lazy(() => import('./components/ProgressChart').then((module) => ({ default: module.ProgressChart })));
const StudyBuddyView = lazy(() => import('./components/StudyBuddyView').then((module) => ({ default: module.StudyBuddyView })));
const Sidebar = lazy(() => import('./components/Sidebar').then((module) => ({ default: module.Sidebar })));
const LoginComponent = lazy(() => import('./components/LoginComponent'));
const TestSeriesPoster = lazy(() => import('./components/TestSeriesPoster'));
const SyllabusTracker = lazy(() => import('./components/SyllabusTracker').then((module) => ({ default: module.SyllabusTracker })));
const DigitalLibraryView = lazy(() => import('./components/DigitalLibraryView').then((module) => ({ default: module.DigitalLibraryView })));
const SmartClassesView = lazy(() => import('./components/SmartClassesView').then((module) => ({ default: module.SmartClassesView })));
const DigitalLibraryLaunchPopup = lazy(() => import('./components/DigitalLibraryLaunchPopup'));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard').then((module) => ({ default: module.TeacherDashboard })));
const CommunityChatView = lazy(() => import('./components/CommunityChatView').then((module) => ({ default: module.CommunityChatView })));
const LaunchCelebration = lazy(() => import('./components/LaunchCelebration'));
const RajaFestivalPoster = lazy(() => import('./components/RajaFestivalPoster'));
const PitchDeckView = lazy(() => import('./components/PitchDeckView').then((module) => ({ default: module.PitchDeckView })));

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
  role: string;
  avatar?: string;
  streak?: number;
  lastActiveDate?: string;
  shareCount?: number;
  statusShared?: boolean;
  parent_pin?: string;
  completed_chapters?: string[];
  parentShowLeaderboard?: boolean;
  phoneNumber?: string;
  totalStudyMinutes?: number;
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
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const candidate = new RTCIceCandidate(change.doc.data());
              peerConnection.addIceCandidate(candidate);
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

  const [lastTab, setLastTab] = useState('dashboard');
  const [isRegisteredForTestSeries, setIsRegisteredForTestSeries] = useState(false);
  const [openTutorInVoiceMode, setOpenTutorInVoiceMode] = useState(0);
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

  // Active Study Time Tracker
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    let isActive = !document.hidden;

    const handleVisibilityChange = () => {
      isActive = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(async () => {
      if (isActive) {
        try {
          const userRef = doc(firestore, 'users', user.id);
          await updateDoc(userRef, {
            totalStudyMinutes: increment(1)
          });
          setUser(prev => prev ? { ...prev, totalStudyMinutes: (prev.totalStudyMinutes || 0) + 1 } : prev);
        } catch (error) {
          console.error("Failed to sync study time:", error);
        }
      }
    }, 60000); // 1 minute

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [user?.id, user?.role]);

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
    if (user?.id) {
      try {
        await updateDoc(doc(firestore, 'users', user.id), { preferred_language: lang });
      } catch (e) {
        console.error("Failed to update preferred language", e);
      }
    }
  };
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [tutorExplanations, setTutorExplanations] = useState<Record<string, string>>({});
  const [tutorLoading, setTutorLoading] = useState<Record<string, boolean>>({});
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showConfigError, setShowConfigError] = useState<{title: string, message: string} | null>(null);
  const [showLaunchPoster, setShowLaunchPoster] = useState(false);
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

  const loadChapters = useCallback(async () => {
    if (!user) return;
    const chaptersCacheKey = `chapters_${user.role}_${user.class || 'all'}_${user.board || 'all'}`;
    const cached = getCachedData<Chapter[]>(chaptersCacheKey, 1800000); // 30 mins
    if (cached) {
      setChapters(cached);
      return;
    }
    try {
      const chaptersQuery = user.role === 'admin' 
        ? collection(firestore, 'chapters')
        : (user.role === 'student' && user.class
            ? query(collection(firestore, 'chapters'), where('status', '==', 'published'), where('class', '==', user.class))
            : query(collection(firestore, 'chapters'), where('status', '==', 'published')));
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
        const cleanClass = (cls: string) => (cls || '').toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
        const matchesClass = !user?.class || cleanClass(c.class) === cleanClass(user.class);
        const userBoardRaw = user?.board || '';
        const userBoard = (userBoardRaw === 'undefined' ? '' : userBoardRaw).toLowerCase();
        let chapterBoardStr = '';
        if (typeof c.board === 'string') {
          chapterBoardStr = c.board.toLowerCase();
        } else if (c.board && typeof c.board === 'object') {
          chapterBoardStr = ((c.board as any).en || (c.board as any).or || '').toLowerCase();
        }
        const matchesBoard = !userBoard || chapterBoardStr.includes(userBoard) || userBoard.includes(chapterBoardStr);
        return matchesClass && matchesBoard;
      });
      setChapters(data);
      setCachedData(chaptersCacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'chapters');
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
      } catch (err2) {
        handleFirestoreError(err2, OperationType.GET, 'public_profiles');
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
      handleFirestoreError(err, OperationType.GET, 'monthly_tests');
    }
  }, [user?.id]);

  const loadDailyMcqs = useCallback(async () => {
    if (!user) return;
    const todayRaw = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const today = todayRaw.replace(/\//g, '-').trim();
    const cacheKey = `daily_mcqs_${user.role}_${user.class || 'all'}_${today}`;
    const cached = getCachedData<DailyMcq[]>(cacheKey, 1800000); // 30 mins
    if (cached) {
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
      setDailyMcqs(data);
      setCachedData(cacheKey, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'daily_mcqs');
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
    const cacheKey = 'textbooks';
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
    
    if (errInfo.error.includes('client is offline')) {
      setDbError(
        language === 'en'
          ? "Unable to connect to the database. Please ensure your Firestore Database is created in the Firebase Console and ad-blockers are disabled."
          : "ଡାଟାବେସ୍ ସହିତ ସଂଯୋଗ କରିବାରେ ଅସମର୍ଥ | ଦୟାକରି ନିଶ୍ଚିତ କରନ୍ତୁ ଯେ ଆପଣଙ୍କର ଫାୟାରବେସ୍ କନସୋଲରେ ଫାୟାରଷ୍ଟୋର ଡାଟାବେସ୍ ସୃଷ୍ଟି ହୋଇଛି ଏବଂ ଆଡ୍-ବ୍ଲକର୍ ଗୁଡିକ ବନ୍ଦ ଅଛି |"
      );
    }
    
    setLoading(false);
    setIsSendingOtp(false);
    
    // Throw error as required by the instructions for diagnosis
    throw new Error(safeJsonStringify(errInfo));
  };

  useEffect(() => {
    let unsubUser: (() => void) | undefined;
    let unsubSub: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("onAuthStateChanged: firebaseUser =", firebaseUser);
      
      // Clean up previous listeners if auth state changes
      if (unsubUser) unsubUser();
      if (unsubSub) unsubSub();

      if (firebaseUser) {
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash === 'judge' || currentHash === 'pitch_deck' || window.location.hash.includes('judge') || window.location.hash.includes('pitch_deck')) {
          setActiveTab('dashboard');
        }
        // Set up real-time listener for user data
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Student;
            const updatedUser = { ...data, id: docSnap.id };
            console.log("Debug: User data updated:", updatedUser);
            setUser(updatedUser);
            if (data.role === 'admin') {
              setIsAdminView(true);
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        try {
          // Initial sync/creation
          const userDocSnap = await getDoc(userDocRef);
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
              '+911010101010', '1010101010',
              '+911234567890', '1234567890'
            ].includes(userPhone));

          if (isAdmin || regDataRef.current.role === 'admin' || (userDocSnap.exists() && userDocSnap.data().role === 'admin')) {
            setIsAdminView(true);
          }

          const selectedClass = regDataRef.current.class;
          const selectedBoard = regDataRef.current.board;

          if (!isAdmin && !isTestAccount && regDataRef.current.role !== 'teacher' && regDataRef.current.role !== 'admin') {
            const emailLockId = firebaseUser.email ? `email:${firebaseUser.email.toLowerCase()}` : null;
            let emailLock: any = null;

            if (emailLockId) {
              const emailLockDoc = await getDoc(doc(firestore, 'user_locks', emailLockId));
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

          const role = isAdmin ? 'admin' : (regDataRef.current.role === 'admin' ? 'admin' : (regDataRef.current.role === 'teacher' ? 'teacher' : (userDocSnap.exists() ? (userDocSnap.data().role || 'student') : 'student')));
          
          const userData: any = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (userDocSnap.exists() && userDocSnap.data().name !== 'Student' ? userDocSnap.data().name : regDataRef.current.name) || (role === 'teacher' ? 'Educator' : 'Student'),
            email: firebaseUser.email || (userDocSnap.exists() ? userDocSnap.data().email : regDataRef.current.email) || '',
            class: (role === 'teacher') ? (regDataRef.current.class || '10') : ((userDocSnap.exists() && userDocSnap.data().class) ? userDocSnap.data().class : (regDataRef.current.class || '10')),
            board: (role === 'teacher') ? (regDataRef.current.board || 'BSE Odisha') : ((userDocSnap.exists() && userDocSnap.data().board) ? userDocSnap.data().board : (regDataRef.current.board || 'BSE Odisha')),
            subjects: (userDocSnap.exists() && userDocSnap.data().subjects?.length > 0) ? userDocSnap.data().subjects : (regDataRef.current.subjects || []),
            preferred_language: (userDocSnap.exists() && userDocSnap.data().preferred_language) ? userDocSnap.data().preferred_language : (languageRef.current || 'or'),
            role: role,
            points: userDocSnap.exists() ? (userDocSnap.data().points ?? 0) : 0,
            avatar: userDocSnap.exists() ? (userDocSnap.data().avatar ?? 'https://api.dicebear.com/7.x/bottts/svg?seed=default') : 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
            streak: userDocSnap.exists() ? (userDocSnap.data().streak ?? 0) : 0,
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

          await setDoc(userDocRef, userData, { merge: true });
          
          // Check test series registration
          try {
            const q = query(collection(firestore, 'test_series_registrations'), where('userId', '==', firebaseUser.uid));
            const querySnapshot = await getDocs(q);
            setIsRegisteredForTestSeries(!querySnapshot.empty);
          } catch (regErr) {
            console.error("Error checking test series registration:", regErr);
          }
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
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }

        // Check subscription
        const subDocRef = doc(firestore, 'subscriptions', firebaseUser.uid);
        unsubSub = onSnapshot(subDocRef, (subDocSnap) => {
          const userEmail = firebaseUser.email?.toLowerCase();
          const userPhone = firebaseUser.phoneNumber;
          const lifetimeEmails = ['gyanaloka.panda@gmail.com', 'gyanapd.ram@gmail.com', 'pandadamayanti01@gmail.com', 'gyanalpanda@gmail.com'];
          const lifetimePhones = ['+918926118509', '8926118509', '+918457811227', '8457811227', '+916370487877', '6370487877'];
          
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
        
        // Show Raja Festival Poster once per day until June 16th, 2026
        const todayStr = new Date().toLocaleDateString('en-CA');
        const hasSeenToday = localStorage.getItem('rajaFestivalLastSeenDate') === todayStr;
        const isBeforeEnd = new Date() <= new Date('2026-06-16T23:59:59');

        if (!hasSeenToday && isBeforeEnd) {
          setShowLaunchPoster(true);
        } else {
          setShowLaunchPoster(false);
        }
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
      subjectLabel: todayDailySubject,
      classLabel,
    });
  }, [language, todayDailySubject, user?.class]);

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
          '+911010101010', '1010101010',
          '+911234567890', '1234567890'
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
      await signOut(auth);
      // Clear all local storage data
      localStorage.clear();
      // Force a reload to clear any stale state if needed, 
      // though onAuthStateChanged should handle it.
      window.location.href = '/';
    } catch (error) {
      console.error("Logout Error:", error);
      // Fallback: clear user state manually
      localStorage.clear();
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

  const handleSubscribe = async (amount: number, planType: 'monthly' | 'yearly' = 'monthly', userClass: number = 1) => {
    if (!user) return;

    // The yearly plan restriction has been removed. All users can access it.
    
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
          body: safeJsonStringify({ userId: user.id, amount, userClass, planType })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center gap-12 relative z-10"
        >
          {/* Logo with Glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl scale-125 animate-pulse" />
            <motion.img 
              src="/utkal-192.png" 
              className="h-24 w-auto relative z-10 rounded-full border border-emerald-500/20" 
              alt="Utkal" 
              referrerPolicy="no-referrer"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
          </div>

          {/* Premium Loader */}
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
              {/* Outer Ring */}
              <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full" />
              {/* Spinning Glow Ring */}
              <div className="absolute inset-0 border-t-2 border-r-2 border-emerald-500 rounded-full animate-spin" />
              {/* Inner Glow */}
              <div className="absolute inset-2 bg-emerald-500/5 rounded-full blur-sm" />
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-white font-medium tracking-[0.3em] uppercase text-xs">
                {language === 'en' ? "Utkal Skill Centre" : "ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର୍"}
              </p>
              <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-[0.5em] animate-pulse">
                {language === 'en' ? "Loading Excellence..." : "ଶ୍ରେଷ୍ଠତା ଲୋଡ୍ ହେଉଛି..."}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer Branding */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center opacity-30">
          <p className="text-[9px] font-medium tracking-[0.3em] uppercase text-slate-500">Powered by Bigsan Group</p>
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
  const isSunday = (new Date().getDay() === 0 && !isLocalhost && user?.phoneNumber !== '+911234567890' && !window.location.search.includes('judge=true') && !window.location.search.includes('showcase=true')) || window.location.search.includes('test_lock=true');
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
    const searchParams = new URLSearchParams(window.location.search);
    const previewKey = searchParams.get('preview') || searchParams.get('chapter');
    
    if (previewKey) {
      const cleanKey = previewKey.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const previewDatabase: Record<string, { title: string; content: string; description: string }> = {
        quadraticequations: {
          title: "Class 10 Quadratic Equations Revision Notes (ଦ୍ୱିଘାତ ସମୀକରଣ)",
          description: "Get complete formula sheets, textbook solutions, and standard exam-pattern revision notes for Class 10 Algebra Chapter 2 - Quadratic Equations in Odia Medium.",
          content: `## Algebra Chapter 2: Quadratic Equations (ଦ୍ୱିଘାତ ସମୀକରଣ)

### 1. Introduction & Standard Form (ସଂଜ୍ଞା ଏବଂ ସାଧାରଣ ରୂପ)
An equation containing a single variable of degree 2 is known as a **Quadratic Equation**. 
ଯେଉଁ ସମୀକରଣରେ ଗୋଟିଏ ମାତ୍ର ଅଜ୍ଞาତ ରାଶି ଥାଏ ଏବଂ ଏହାର ସର୍ବାଧିକ ଘାତ ୨ ହୋଇଥାଏ, ତାହାକୁ **ଦ୍ୱିଘାତ ସମୀକରଣ** କୁହାଯାଏ।

**Standard Form / ସାଧାରଣ ସୂତ୍ର:**
$$ax^2 + bx + c = 0$$
Where $a, b, c$ are real numbers (ବାସ୍ତବ ସଂଖ୍ୟା) and $a \\neq 0$.

---

### 2. Nature of Roots (ବୀଜଦ୍ୱୟର ସ୍ୱରୂପ)
The roots of the quadratic equation $ax^2 + bx + c = 0$ are given by:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

The term **$D = b^2 - 4ac$** is called the **Discriminant (ପ୍ରଭେଦକ)**.
* **If $D > 0$**: Roots are Real & Distinct (ବାସ୍ତବ ଏବଂ ଅସମାନ).
* **If $D = 0$**: Roots are Real & Equal (ବାସ୍ତବ ଏବଂ ସମାନ). $x = \\frac{-b}{2a}$.
* **If $D < 0$**: Roots are Imaginary (ଅବାସ୍ତବ ବା କାଳ୍ପନିକ).

---

### 3. Key Formulations & Relations (ମୁଖ୍ୟ ସୂତ୍ରାବଳୀ)
If $\\alpha$ and $\\beta$ are the roots:
* **Sum of Roots (ବୀଜଦ୍ୱୟର ସମଷ୍ଟି)**: $\\alpha + \\beta = -\\frac{b}{a}$
* **Product of Roots (ବୀଜଦ୍ୱୟର ଗୁଣଫଳ)**: $\\alpha \\cdot \\beta = \\frac{c}{a}$`
        },
        trigonometricidentities: {
          title: "Class 10 Trigonometry Formulas & Notes (ତ୍ରିକୋଣମିତି)",
          description: "Download Class 10 Trigonometry formulas, identities proofs, and solved textbook exercises for BSE Odisha Odia Medium standard exams.",
          content: `## Mathematics Chapter 4: Trigonometric Identities (ତ୍ରିକୋଣମିତି ସୂତ୍ରାବଳୀ)

### 1. Fundamental Trigonometric Ratios (ତ୍ରିକୋଣମିତିକ ଅନୁପାତ)
For a right-angled triangle (ସମକୋଣୀ ତ୍ରିଭୁଜ):
* $\\sin \\theta = \\frac{\\text{Perpendicular (ଲମ୍ବ)}}{\\text{Hypotenuse (କର୍ଣ୍ଣ)}} = \\frac{p}{h}$
* $\\cos \\theta = \\frac{\\text{Base (ଭୂମି)}}{\\text{Hypotenuse (କର୍ଣ୍ଣ)}} = \\frac{b}{h}$
* $\\tan \\theta = \\frac{p}{b}$
* $\\cot \\theta = \\frac{b}{p}$
* $\\sec \\theta = \\frac{h}{b}$
* $\\csc \\theta = \\frac{h}{p}$

---

### 2. Standard Trigonometric Identities (ମୁଖ୍ୟ ସର୍ବସମତା)
1. $$\\sin^2 \\theta + \\cos^2 \\theta = 1$$
2. $$1 + \\tan^2 \\theta = \\sec^2 \\theta \\implies \\sec^2 \\theta - \\tan^2 \\theta = 1$$
3. $$1 + \\cot^2 \\theta = \\csc^2 \\theta \\implies \\csc^2 \\theta - \\cot^2 \\theta = 1$$

---

### 3. Complementary Angle Relations (ପରିପୂରକ କୋଣ ସମ୍ପର୍କ)
* $\\sin(90^\\circ - \\theta) = \\cos \\theta$
* $\\cos(90^\\circ - \\theta) = \\sin \\theta$
* $\\tan(90^\\circ - \\theta) = \\cot \\theta$
* $\\cot(90^\\circ - \\theta) = \\tan \\theta$
* $\\sec(90^\\circ - \\theta) = \\csc \\theta$
* $\\csc(90^\\circ - \\theta) = \\sec \\theta$`
        },
        forceandmotion: {
          title: "Class 10 Physical Science: Force & Laws of Motion (ବଳ ଏବଂ ଗତି ନିୟମ)",
          description: "Read Class 10 Physical Science Chapter 3 - Force and Laws of Motion notes in Odia medium. Learn Newton's Laws and Momentum with Gundulu AI.",
          content: `## Physical Science Chapter 3: Force & Laws of Motion (ବଳ ଏବଂ ଗତିର ନିୟମ)

### 1. Concept of Force (ବଳର ସଂଜ୍ଞା)
A push or pull acting on an object which changes or tends to change its state of rest or uniform motion is called **Force**. 
କୌଣସି ବସ୍ତୁର ସ୍ଥିରାବସ୍ଥା ବା ସମଗତିର ପରିବର୍ତ୍ତନ କରିବାକୁ ବ୍ୟବହୃତ ପ୍ରେରଣା ବା ଟାଣିବା କ୍ରିୟାକୁ **ବଳ** କୁହାଯାଏ।

* **SI Unit / ଏସ.ଆଇ. ଏକକ**: Newton (N) / ନିଉଟନ୍
* **Formula / ସୂତ୍ର**: $F = m \\cdot a$ (Force = Mass $\\times$ Acceleration)

---

### 2. Newton's Laws of Motion (ନିଉଟନ୍‌ଙ୍କ ଗତି ସମ୍ବନ୍ଧୀୟ ନିୟମ)

#### First Law (ପ୍ରଥମ ନିୟମ) - Law of Inertia (ଜଡ଼ତା ନିୟମ)
An object remains in its state of rest or uniform motion unless acted upon by an external unbalanced force.
ବାହ୍ୟ ବଳ ପ୍ରୟୋଗ ନହେବା ପର୍ଯ୍ୟନ୍ତ ପ୍ରତ୍ୟେକ ବସ୍ତୁ ନିଜର ସ୍ଥିରାବସ୍ଥା ବା ସମଗତି ଅବସ୍ଥାରେ ଅପରିବର୍ତ୍ତିତ ରହେ।

#### Second Law (ଦ୍ୱିତୀୟ ନିୟମ)
The rate of change of momentum of an object is proportional to the applied unbalanced force in the direction of force.
ବସ୍ତୁର ସଂବେଗ ପରିବର୍ତ୍ତନର ହାର, ପ୍ରୟୋଗ କରାଯାଇଥିବା ବଳ ସହିତ ସମାନୁପାତୀ।

#### Third Law (ତୃତୀୟ ନିୟମ)
To every action, there is an equal and opposite reaction.
ପ୍ରତ୍ୟେକ କ୍ରିୟାର ଏକ ସମାନ ଏବଂ ବିପରୀତ ପ୍ରତିକ୍ରିୟା ରହିଛି।`
        },
        carboncompounds: {
          title: "Class 10 Carbon & its Compounds Notes (କାର୍ବନ ଓ ଏହାର ଯୌଗିକ)",
          description: "Bilingual study notes for Class 10 Chemistry Chapter 4 - Carbon and its Compounds. Free covalent bonding tables in Odia Medium.",
          content: `## Chemistry Chapter 4: Carbon & its Compounds (କାର୍ବନ ଓ ଏହାର ଯୌଗିକ)

### 1. Versatile Nature of Carbon (କାର୍ବନର ବହୁମୁଖୀ ପ୍ରକୃତି)
Carbon forms a vast number of compounds due to two unique properties:
କାର୍ବନର ଦୁଇଟି ମୁଖ୍ୟ ପ୍ରକୃତି ଯୋଗୁଁ ଏହାର ଅସଂଖ୍ୟ ଯୌଗିକ ଗଠିତ ହୋଇଥାଏ:

1. **Catenation (ଶୃଙ୍ଖଳନ ପ୍ରକୃତି)**: The unique ability of carbon atoms to form covalent bonds with other carbon atoms to form long chains or rings.
କାର୍ବନ ପରମାଣୁଗୁଡ଼ିକ ମଧ୍ୟରେ ସହ-ସଂଯୋଜକ ବନ୍ଧନ ଗଠନ କରି ଏକ ଦୀର୍ଘ ଶୃଙ୍ଖଳା ସୃଷ୍ଟି କରିବାର କ୍ଷମତା।
2. **Tetravalency (ଚତୁଃ-ସଂଯୋଜ୍ୟତା)**: Carbon has 4 valence electrons, allowing it to bond with four other mono-valent atoms.
କାର୍ବନର ସଂଯୋଜକ କକ୍ଷରେ ୪ଟି ଇଲେକ୍ଟ୍ରନ୍ ଥାଏ, ଯାହା ଅନ୍ୟ ୪ଟି ଏକ-ସଂଯୋଜକ ପରମାଣୁ ସହ ବନ୍ଧନ ଗଠନରେ ସାହାଯ୍ୟ କରେ।

---

### 2. Hydrocarbons (ହାଇଡ୍ରୋକାର୍ବନ୍)
Compounds containing only Carbon and Hydrogen are called **Hydrocarbons**.
* **Saturated (ସନ୍ତୃପ୍ତ)**: Single carbon-carbon bonds (Alkanes / ଆଲକେନ୍). Formula: $C_nH_{2n+2}$
* **Unsaturated (ଅସନ୍ତୃପ୍ତ)**: Double or triple bonds (Alkenes / ଆଲକିନ୍ & Alkynes / ଆଲକାଇନ୍).
  * Alkenes (ଡବଲ୍ ବନ୍ଧ): $C_nH_{2n}$
  * Alkynes (ଟ୍ରିପଲ୍ ବନ୍ଧ): $C_nH_{2n-2}$`
        },
        lifeprocesses: {
          title: "Class 10 Life Science: Life Processes (ଜୀବନ ପ୍ରକ୍ରିୟା - ପୋଷଣ)",
          description: "Get Class 10 Biology Chapter 1 Nutrition and Respiration summary study notes bilingually in Odia medium for BSE exams.",
          content: `## Life Science Chapter 1: Life Processes (ଜୀବନ ପ୍ରକ୍ରିୟା)

### 1. Introduction to Nutrition (ପୋଷଣ କଣ?)
The process of taking in food and converting it into energy and other vital nutrients required for life is called **Nutrition**.
ଜୀବନ ରକ୍ଷା ପାଇଁ ଆବଶ୍ୟକ ଖାଦ୍ୟ ଗ୍ରହଣ ଏବଂ ଏହାର ବିନିଯୋଗ ପ୍ରକ୍ରିୟାକୁ **ପୋଷଣ** କୁହାଯାଏ।

There are two major modes of nutrition:
1. **Autotrophic Nutrition (ସ୍ୱଭୋଜୀ ପୋଷଣ)**: Organisms manufacture their own food (e.g. green plants via Photosynthesis).
ନିଜର ଖାଦ୍ୟ ନିଜେ ପ୍ରସ୍ତୁତ କରନ୍ତି (ଯେପରିକି ସବୁଜ ଉଦ୍ଭିଦ ଆଲୋକଶ୍ଳେଷଣ ଦ୍ୱାରା)।
2. **Heterotrophic Nutrition (ପରଭୋଜୀ ପୋଷଣ)**: Organisms depend on other plants or animals for nutrition.
ଖାଦ୍ୟ ପାଇଁ ଅନ୍ୟମାନଙ୍କ ଉପରେ ନିର୍ଭର କରନ୍ତି।

---

### 2. Photosynthesis Equation (ଆଲୋକଶ୍ଳେଷଣର ରାସାୟନିକ ସମୀକରଣ)
$$6CO_2 + 12H_2O \\xrightarrow[\\text{Chlorophyll}]{\\text{Sunlight}} C_6H_{12}O_6 + 6O_2 + 6H_2O$$`
        }
      };

      const selectedPreview = previewDatabase[cleanKey] || {
        title: `${previewKey.replace(/([A-Z])/g, ' $1').trim()} Revision Guide (BSE Odisha)`,
        description: `Get free study guides and selection questions for ${previewKey} in Odia medium. Access free school learning books on Utkal Skill Centre.`,
        content: `## ${previewKey.replace(/([A-Z])/g, ' $1').trim()}

Welcome to the **Utkal Skill Centre** digital study revision portal. This chapter guide provides important exam-focused points, formulas, and textbook summaries.

---

### Key Takeaways (ମୁଖ୍ୟ ବିଷୟବସ୍ତୁ)
* Designed bilingually in English and standard Odia (ଓଡ଼ିଆ ମାଧ୍ୟମ) to facilitate easy reading.
* Full study notes, syllabus tracking, and chapter-wise mock examinations are unlocked inside the dashboard.
* Ask any academic doubt instantly with Gundulu AI tutor.`
      };

      const handleClearPreview = () => {
        window.location.search = '';
      };

      return (
        <div className="min-h-screen bg-[#060913] text-slate-200 relative overflow-hidden font-sans p-4 sm:p-8 flex flex-col items-center">
          <SEO 
            title={selectedPreview.title}
            description={selectedPreview.description}
            subject={previewKey}
          />
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-purple-500 to-indigo-500" />
          <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Premium Logo Header */}
          <div className="w-full max-w-4xl flex justify-between items-center py-6 border-b border-white/5 mb-8">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleClearPreview}>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-black text-emerald-400 text-lg shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                U
              </div>
              <div>
                <h1 className="text-md font-black text-white leading-none tracking-tight">UTKAL</h1>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Skill Centre</span>
              </div>
            </div>
            <button 
              onClick={handleClearPreview}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Sign Up For Free ➔
            </button>
          </div>

          {/* Content Body */}
          <main className="w-full max-w-4xl space-y-8 flex-1">
            <div className="glass-card rounded-[32px] p-6 sm:p-10 border border-white/5 relative overflow-hidden shadow-2xl bg-slate-900/40 backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Free Public Lesson Preview (ଓଡ଼ିଆ ମାଧ୍ୟମ)
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-8">
                {selectedPreview.title}
              </h2>

              <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed space-y-6">
                <ReactMarkdown>{selectedPreview.content}</ReactMarkdown>
              </div>

              {/* Conversion sticky loop box */}
              <div className="mt-12 p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 text-center space-y-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-pulse" style={{ animationDuration: '6s' }} />
                
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  Join 1 Lakh+ Odisha Medium Students! 🏆
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed font-bold">
                  Get instant access to complete textbooks, bilingual revision cards, daily selection MCQs, and resolve all your math & science doubts instantly with your personalized AI study buddy **Gundulu**!
                </p>
                <button
                  onClick={handleClearPreview}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Unlock Full Chapter & AI Buddy Free! 🟢
                </button>
              </div>
            </div>

            {/* Related guides list - High density SEO internal linker web */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Popular Odia Medium Chapters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'QuadraticEquations', name: 'Quadratic Equations / ଦ୍ୱିଘାତ ସମୀକରଣ' },
                  { key: 'TrigonometricIdentities', name: 'Trigonometric Identities / ତ୍ରିକୋଣମିତି' },
                  { key: 'ForceAndMotion', name: 'Force & Motion / ବଳ ଏବଂ ଗତି ନିୟମ' },
                  { key: 'CarbonCompounds', name: 'Carbon Compounds / କାର୍ବନ ଯୌଗିକ' },
                  { key: 'LifeProcesses', name: 'Life Processes / ପୋଷଣ ଏବଂ ଗତି' }
                ]
                .filter(item => item.key.toLowerCase() !== cleanKey)
                .map((item) => (
                  <a
                    key={item.key}
                    href={`?preview=${item.key}`}
                    className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all font-bold text-xs text-slate-400 hover:text-white"
                  >
                    {item.name} ➔
                  </a>
                ))}
              </div>
            </div>
          </main>

          <footer className="w-full max-w-4xl py-12 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] border-t border-white/5 mt-16">
            © 2026 Utkal Skill Centre • Built for Odisha State Board Class 1 to 10
          </footer>
        </div>
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
      <div className="h-screen bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans">
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
                  <span>UTKAL</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-widest scale-90 origin-left">PRO</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/80 group-hover:text-emerald-400/80 transition-colors mt-1">Skill Centre</div>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-4">
              <Lucide.Sparkles size={12} />
              {language === 'en' ? 'Personalized Learning' : 'ଆପଣଙ୍କ ପାଇଁ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷା'}
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-normal mb-4 tracking-tight">
              {language === 'en' ? (
                <>Master Your Future with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Gundulu</span></>
              ) : (
                <>ଗୁନ୍ଦୁଲୁ ସହ ଗଢ଼ନ୍ତୁ ଆପଣଙ୍କ <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">ଉଜ୍ଜ୍ୱଳ ଭବିଷ୍ୟତ</span></>
              )}
            </h1>
            
            <p className="text-base text-slate-400 mb-4 leading-relaxed">
              {language === 'en' 
                ? 'Experience the next generation of education. Our study buddy adapts to your learning style, providing real-time feedback and personalized pathways to success.' 
                : 'ଶିକ୍ଷାର ପରବର୍ତ୍ତୀ ପିଢିକୁ ଅନୁଭବ କରନ୍ତୁ। ଆମର ଶିକ୍ଷା ସାଥୀ ଆପଣଙ୍କ ପଢିବା ଶୈଳୀ ସହ ଖାପ ଖାଇଥାଏ, ପ୍ରକୃତ ସମୟର ମତାମତ ଏବଂ ସଫଳତାର ମାର୍ଗ ପ୍ରଦାନ କରିଥାଏ।'}
            </p>

            {/* Interface Mockup / Floating Elements */}
            <div className="relative h-64 w-full mt-4">
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
                    src="/gundulu.png" 
                    className="w-full h-full object-cover scale-[2.0] translate-y-[2%] relative z-10 transition-transform duration-500 group-hover:scale-[2.3]" 
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
            <Suspense fallback={<ViewLoader />}>
              <LoginComponent language={language} translations={translations} setLanguage={setLanguage} setRegData={setRegData} />
            </Suspense>
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

    {showLaunchPoster && (
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
        <header className="h-20 flex items-center justify-between px-6 bg-black/20 backdrop-blur-xl border-b border-white/5 flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* UTKAL LOGO used in Header */}
              {activeTab !== 'dashboard' && (
                <img src="/utkal-192.png" className="h-10 w-10 rounded-full object-cover drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" alt="Utkal Skill Centre" />
              )}
              <h1 className="text-base sm:text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight ml-2 font-serif whitespace-nowrap">
                Utkal Skill Centre
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
            >
              <Lucide.Bell size={22} />
              {studentNotifications.filter(n => n.id && !readNotifIds.includes(n.id)).length > 0 && (
                <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black/20"></span>
              )}
            </button>
            
            {/* User Profile */}
            <button
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 hover:border-emerald-500/50 transition-colors shrink-0"
            >
              <img 
                src={user?.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=default"} 
                alt="Profile" 
                className="w-full h-full object-cover bg-slate-800" 
              />
            </button>
          </div>

        </header>

        <div 
          ref={contentScrollRef} 
          className={`flex-1 ${(activeTab === 'study_buddy' || activeTab === 'gundulu' || activeTab === 'digital_library') ? 'overflow-hidden p-0 flex flex-col min-h-0' : 'overflow-y-auto p-4 md:p-8 pb-28 lg:pb-8'} scrollbar-hide relative z-10`}
        >
          <AnimatePresence mode="wait">
            {/* Your 10+ Tab components go here... */}
            {activeTab === 'dashboard' && (
              user?.role === 'teacher' ? (
                <TeacherDashboard user={user} language={language} chapters={chapters} setActiveTab={setActiveTab} textbooksCount={textbooks.length} />
              ) : (
                <Dashboard
                  user={user}
                  leaderboard={leaderboard}
                  language={language}
                  isPremium={isPremium}
                  onUpgrade={() => setActiveTab('plans')}
                  chapters={chapters}
                  dailyChallenge={dailyChallenge}
                  hasDailyPractice={dailyMcqs.length > 0}
                  todayDailySubject={todayDailySubject}
                  tomorrowDailySubject={tomorrowDailySubject}
                  onOpenDailyPractice={() => setActiveTab('daily_mcqs')}
                  onShareDailyPractice={handleShareDailyPractice}
                  isRegistered={isRegisteredForTestSeries}
                  onRegistrationComplete={() => setIsRegisteredForTestSeries(true)}
                  onOpenTutor={() => {
                    if (isPremium) {
                      setOpenTutorInVoiceMode(Date.now());
                      setActiveTab('study_buddy');
                    } else {
                      handleUpgradeClick();
                    }
                  }}
                  onOpenCommunity={() => setShowCommunityChat(true)}
                  following={following}
                  onToggleFollow={handleToggleFollow}
                />
              )
            )}
            {activeTab === 'notifications' && <NotificationsView notifications={studentNotifications} language={language} readNotifIds={readNotifIds} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'digital_library' && (
              <DigitalLibraryView
                user={user}
                chapters={chapters.filter((c: any) => c.isLibraryChapter || c.pdfUrl)}
                language={language}
                isPremium={isPremium}
                onUpgrade={() => setActiveTab('plans')}
                onBack={() => setActiveTab('dashboard')}
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
            {activeTab === 'textbooks' && <TextbooksView user={user} textbooks={textbooks} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'monthly_tests' && (
              <MonthlyTestsView tests={monthlyTests} submissions={testSubmissions} language={language} user={user} setActiveTab={setActiveTab} onBack={() => setActiveTab('dashboard')} loadTestSubmissions={loadTestSubmissions} />
            )}

            {activeTab === 'syllabus_tracker' && <SyllabusTracker user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'daily_mcqs' && <DailyMcqView mcqs={dailyMcqs} submissions={dailyMcqSubmissions} user={user} language={language} onBack={() => setActiveTab('dashboard')} onSubmissionSuccess={loadDailyMcqSubmissions} />}
            {activeTab === 'study_buddy' && (
              isPremium ? <StudyBuddyView language={language} isPremium={isPremium} onUpgrade={() => setActiveTab('plans')} user={user} initialVoiceMode={openTutorInVoiceMode} onBack={() => setActiveTab('dashboard')} onLanguageChange={setLanguage} systemSettings={systemSettings} /> : <LocalSubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} systemSettings={systemSettings} onBack={() => setActiveTab('dashboard')} />
            )}
            {activeTab === 'gundulu' && (
              isPremium ? <GunduluHuman userClass={user?.class} onBack={() => setActiveTab('dashboard')} /> : <LocalSubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} systemSettings={systemSettings} onBack={() => setActiveTab('dashboard')} />
            )}
            {activeTab === 'profile' && <ProfileView user={user} language={language} theme={theme} setTheme={setTheme} onBack={() => setActiveTab('dashboard')} onParentAccess={() => setActiveTab('parent_dashboard')} setActiveTab={setActiveTab} />}
            {activeTab === 'parent_dashboard' && <ParentDashboard user={user} chapters={chapters} leaderboard={leaderboard} language={language} onBack={() => setActiveTab('profile')} userProgress={userProgress} />}
            {activeTab === 'leaderboard' && <LeaderboardView leaderboard={leaderboard} language={language} onBack={() => setActiveTab('dashboard')} following={following} user={user} onToggleFollow={handleToggleFollow} />}
            {activeTab === 'support' && <SupportView user={user} language={language} onBack={() => setActiveTab('dashboard')} handleSupportClick={handleSupportClick} confirmSupport={confirmSupport} supportSession={supportSession} />}
            {activeTab === 'store' && <AvatarStore user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'plans' && <LocalSubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} systemSettings={systemSettings} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'pitch_deck' && <PitchDeckView language={language} onBack={() => setActiveTab('dashboard')} />}
          </AnimatePresence>


        </div>

        {/* Bottom Floating Navigation Bar for Mobile */}
        {user && !isAdminView && activeTab !== 'gundulu' && activeTab !== 'study_buddy' && activeTab !== 'digital_library' && (
          <BottomNavBar
            language={language}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setSidebarOpen={setSidebarOpen}
            isSidebarOpen={isSidebarOpen}
            unreadNotificationsCount={studentNotifications.filter(n => n.id && !readNotifIds.includes(n.id)).length}
            userRole={user.role}
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
        />
      </Suspense>
    )}

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
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Utkal Skill Centre</h1>
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
            <p className="font-serif font-black text-slate-900 text-xl mb-1 italic">Utkal Skill Centre</p>
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
      Format the response as a short list of bullet points. Focus on strengths and areas for improvement.`;

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
      className="max-w-4xl mx-auto pb-12"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <Lucide.ArrowLeft size={20} />
          <span>Back to Profile</span>
        </button>
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
                  <ReactMarkdown>{learningInsights}</ReactMarkdown>
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
    </motion.div>
  );
}

function SupportView({ user, language, onBack, handleSupportClick, confirmSupport, supportSession }: any) {
  const [ticket, setTicket] = useState('');
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
      className="max-w-2xl mx-auto space-y-8 pb-20"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-slate-800/50 rounded-xl text-slate-400 hover:text-white">
          <Lucide.ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-white">{translations[language].support.title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Support Remote Access */}
        {!supportSession && handleSupportClick && (
          <button 
            onClick={handleSupportClick} 
            className={`p-6 border rounded-3xl flex flex-col items-center justify-center gap-3 transition-all ${
              confirmSupport 
                ? 'bg-rose-500/20 border-rose-500/50 hover:bg-rose-500/30 animate-pulse' 
                : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${confirmSupport ? 'bg-rose-500' : 'bg-red-500'}`}>
              <Lucide.LifeBuoy size={24} className={`${confirmSupport ? 'animate-spin' : 'animate-spin-slow'}`} />
            </div>
            <span className="text-white font-bold text-sm text-center">
              {confirmSupport ? (language === 'or' ? 'ନିଶ୍ଚିତ କରନ୍ତୁ?' : 'Confirm Connection?') : (language === 'or' ? 'ଲାଇଭ୍ ସହାୟତା' : 'Live Support')}
            </span>
          </button>
        )}
        <a href="https://wa.me/919337956168" target="_blank" className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col items-center gap-3 hover:bg-emerald-500/20 transition-all">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <Lucide.MessageCircle size={24} />
          </div>
          <span className="text-white font-bold text-sm text-center">{translations[language].support.whatsappSupport}</span>
        </a>
        <a href="mailto:gyanaloka.panda@gmail.com" className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex flex-col items-center gap-3 hover:bg-blue-500/20 transition-all">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <Lucide.Mail size={24} />
          </div>
          <span className="text-white font-bold text-sm text-center">{translations[language].support.emailSupport}</span>
        </a>
        <a href="tel:+919337956168" className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex flex-col items-center gap-3 hover:bg-purple-500/20 transition-all">
          <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white">
            <Lucide.Phone size={24} />
          </div>
          <span className="text-white font-bold text-sm text-center">{translations[language].support.callSupport}</span>
        </a>
      </div>

      <div className="p-8 bg-slate-900/50 border border-white/5 rounded-[2.5rem] space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{translations[language].support.ticketTitle}</h3>
          <p className="text-slate-400 text-sm">{translations[language].support.ticketDescription}</p>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
            <p className="text-emerald-400 font-bold">{translations[language].support.success}</p>
            <button onClick={() => setSuccess(false)} className="mt-4 text-emerald-500 text-sm hover:underline">Send another message</button>
          </div>
        ) : (
          <div className="space-y-4">
            <textarea 
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              placeholder="How can we help you?"
              className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <button 
              onClick={handleSubmit}
              disabled={loading || !ticket.trim()}
              className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Lucide.Loader2 className="animate-spin" size={20} /> : <Lucide.Send size={20} />}
              {translations[language].support.submitTicket}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProfileView({ user, language, theme, setTheme, onBack, onParentAccess, setActiveTab }: any) {
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
      onParentAccess();
    } else {
      setShowPinModal(true);
    }
  };

  const verifyPin = () => {
    if (pin === user.parent_pin) {
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
            <img src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            
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
          <h2 className="text-2xl font-bold text-white">{translations[language].profile.editTitle}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            {language === 'en' ? 'Points:' : 'ପଏଣ୍ଟ:'} <span className="text-emerald-400">{user.points}</span>
          </p>
        </div>
      </div>
<div className="space-y-4">
        {/* Animated Toggle Switch */}
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

              <div className="pt-6 border-t border-white/5">
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
                        value={user.parent_pin || ''}
                        onChange={async (e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 4) {
                            await updateDoc(doc(firestore, 'users', user.id), {
                              parent_pin: val
                            });
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center tracking-[1em] font-mono text-xl"
                      />
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
  
  // Subscription is a single flat monthly price for all classes.
  let monthlyPrice = systemSettings?.monthlyPrice || 99;
  let yearlyPrice = systemSettings?.yearlyPrice || 999;
  let planName = p.premium.name;

  const handleOpenPayment = (amount: number, type: 'monthly'|'yearly') => {
    setSelectedPlanAmount(amount);
    setSelectedPlanType(type);
    setPaymentMethod('selection');
    setUtrNumber('');
    setShowPaymentModal(true);
  };

  const handleSubmitUtr = async () => {
    if (!utrNumber.trim()) {
      alert(language === 'en' ? "Please enter your UTR / Transaction ID" : "ଦୟାକରି ଆପଣଙ୍କର UTR / Transaction ID ପ୍ରବେଶ କରନ୍ତୁ");
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
            <h3 className="text-2xl font-bold text-white mb-2">{p.free.name}</h3>
            <div className="text-4xl font-bold text-white">{p.free.price}</div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {p.free.features.map((f: string, i: number) => (
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
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{planName}</h3>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-white">₹{monthlyPrice} <span className="text-lg font-normal text-slate-400">/ {language === 'en' ? 'month' : 'ମାସ'}</span></div>
              <div className="text-emerald-400 font-bold">₹{yearlyPrice} / {language === 'en' ? 'year' : 'ବର୍ଷ'} (Save 70%)</div>
            </div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {p.premium.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white">✓</div>
                {f}
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
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].weeklyLeaderboard}</h2>
        <p className="text-slate-500">Celebrate effort and consistency! Resets every Sunday.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
        <div className="flex p-1 bg-slate-900/50 border border-white/5 rounded-2xl">
          <button
            onClick={() => setActiveFilter('league')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeFilter === 'league' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {translations[language].leagues || 'Leagues'}
          </button>
          <button
            onClick={() => setActiveFilter('class')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeFilter === 'class' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {language === 'en' ? 'My Class' : 'ମୋ ଶ୍ରେଣୀ'}
          </button>
          <button
            onClick={() => setActiveFilter('friends')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeFilter === 'friends' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {translations[language].friends || 'Friends'}
          </button>
        </div>

        {activeFilter === 'league' && (
          <div className="flex justify-center gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit mx-auto">
            {leagues.map((league) => (
              <button
                key={league}
                onClick={() => setActiveLeague(league)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeLeague === league 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {translations[language][league.toLowerCase()]}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-[40px] overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Rank</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Student</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Consistency</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">{translations[language].effortPoints}</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">Action</th>
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
                        <span className="font-semibold text-white flex items-center gap-2">
                          {student.name}
                          {student.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-400 text-[10px] font-black bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20">
                              <Lucide.Flame size={10} fill="currentColor" />
                              {student.streak}
                            </span>
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
                  <td className="px-3 sm:px-8 py-4 sm:py-6 text-right">
                    {student.id !== user.id && (
                      <button
                        onClick={() => onToggleFollow?.(student.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer ${
                          following.includes(student.id)
                            ? 'bg-slate-800 hover:bg-red-950/80 hover:text-red-400 hover:border-red-500/20 text-slate-400 border border-slate-700'
                            : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 hover:shadow-emerald-500/30 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {following.includes(student.id) ? (language === 'en' ? 'Following' : 'ଅନୁସରଣ') : (language === 'en' ? '+ Follow' : '+ ଅନୁସରଣ')}
                      </button>
                    )}
                  </td>
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

function TextbooksView({ user, textbooks, language, onBack }: any) {
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [teacherClassFilter, setTeacherClassFilter] = useState('all');
  const [isLinking, setIsLinking] = useState(false);

  const handleDownload = async (book: Textbook) => {
    if (!auth.currentUser) return;
    
    // Check if user has an email
    if (!auth.currentUser.email) {
      setIsLinking(true);
      try {
        const provider = new GoogleAuthProvider();
        const result = await linkWithPopup(auth.currentUser, provider);
        const newEmail = result.user?.email;
        
        // Update user document in Firestore
        if (newEmail) {
          await updateDoc(doc(firestore, 'users', user.id), {
            email: newEmail
          });
        }
        
        // Open the download URL
        window.open(book.download_url, '_blank');
      } catch (error: any) {
        console.error("Error linking Google account:", error);
        if (error.code === 'auth/credential-already-in-use') {
          alert(language === 'en' ? "This Google account is already linked to another user. Please try a different account." : "ଏହି Google ଆକାଉଣ୍ଟ୍ ପୂର୍ବରୁ ଅନ୍ୟ ଏକ ଉପଭୋକ୍ତା ସହିତ ଲିଙ୍କ୍ ହୋଇଛି | ଦୟାକରି ଏକ ଭିନ୍ନ ଆକାଉଣ୍ଟ୍ ଚେଷ୍ଟା କରନ୍ତୁ |");
        } else if (error.code === 'auth/popup-closed-by-user') {
          console.log("User cancelled Google linking");
        } else {
          alert(language === 'en' ? "Failed to link Google account. " + error.message : "Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରିବାରେ ବିଫଳ ହୋଇଛି | " + error.message);
        }
        // Allow download even if linking fails or is cancelled
        window.open(book.download_url, '_blank');
      } finally {
        setIsLinking(false);
      }
    } else {
      // Already has email, just open
      window.open(book.download_url, '_blank');
    }
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
      const matchesClass = !user?.class || book.class?.toLowerCase() === user.class.toLowerCase();
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
          b.class?.toLowerCase() === user?.class?.toLowerCase() && 
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
            <motion.div whileHover={{ y: -5 }} key={book.id} className="group bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col">
              <div className={`aspect-[3/4] relative overflow-hidden bg-gradient-to-br ${
                book.class === 'class1' ? 'from-rose-500/30 to-red-800/40' :
                book.class === 'class2' ? 'from-orange-400/30 to-orange-800/40' :
                book.class === 'class3' ? 'from-amber-400/30 to-yellow-800/40' :
                book.class === 'class4' ? 'from-lime-400/30 to-green-800/40' :
                book.class === 'class5' ? 'from-emerald-400/30 to-teal-800/40' :
                book.class === 'class6' ? 'from-cyan-400/30 to-sky-800/40' :
                book.class === 'class7' ? 'from-blue-400/30 to-indigo-800/40' :
                book.class === 'class8' ? 'from-violet-400/30 to-purple-800/40' :
                book.class === 'class9' ? 'from-fuchsia-400/30 to-pink-800/40' :
                book.class === 'class10' ? 'from-slate-300/30 to-slate-800/50' :
                'from-emerald-500/20 to-slate-800/60'
              }`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_45%)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
                  <img src="/gundulu-rath-crest.png" alt="Class cover" className="h-16 w-16 object-contain opacity-90 drop-shadow-md" />
                  <div className="text-sm font-black tracking-widest text-white/90">
                    {translations['or']?.classes?.[book.class as keyof typeof translations.en.classes] || book.class}
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 backdrop-blur-md">
                    {book.subject}
                  </span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-white mb-4 line-clamp-2 flex-1">{bookTitle}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDownload(book)}
                    disabled={isLinking}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lucide.Download size={18} />
                    {isLinking ? (language === 'en' ? 'Linking...' : 'ଲିଙ୍କ୍ ହେଉଛି...') : (language === 'en' ? 'Download PDF' : 'PDF ଡାଉନଲୋଡ୍')}
                  </button>
                  <button 
                    onClick={() => {
                      OfflineService.saveTextbook(book.id, book);
                      alert(language === 'en' ? 'Textbook saved for offline!' : 'ପାଠ୍ୟପୁସ୍ତକ ଅଫଲାଇନ୍ ପାଇଁ ସେଭ୍ ହୋଇଛି!');
                    }}
                    className="p-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
                  >
                    <Lucide.Save size={18} />
                  </button>
                </div>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(
                    language === 'en' 
                      ? `Check out this textbook: ${bookTitle}\nDownload here: ${book.download_url}` 
                      : `ଏହି ପାଠ୍ୟପୁସ୍ତକଟି ଦେଖନ୍ତୁ: ${bookTitle}\nଏଠାରୁ ଡାଉନଲୋଡ୍ କରନ୍ତୁ: ${book.download_url}`
                  )}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 mt-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-emerald-500/20"
                >
                  <Lucide.MessageCircle size={18} />
                  {language === 'en' ? 'Share on WhatsApp' : 'WhatsApp ରେ ସେୟାର କରନ୍ତୁ'}
                </a>
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
                    <a href={book.download_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all">
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

function ResultsReviewView({ submission, test, onBack, language }: any) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md py-4 z-10 border-b border-white/5 mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <Lucide.ArrowLeft size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Back</span>
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{test.month} {test.year} Results</h2>
            <p className="text-slate-400 text-xs">Transparency Report & Model Answers</p>
          </div>
          <div className="w-20"></div> {/* Spacer for symmetry */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</p>
            <p className="text-3xl font-black text-emerald-500">{submission.finalScore || submission.score}/{submission.totalMaxMarks || submission.totalQuestions}</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
            <p className="text-xl font-bold text-blue-400">Graded & Verified</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Violations</p>
            <p className={`text-xl font-bold ${submission.violations > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{submission.violations || 0} Flags</p>
          </div>
        </div>

        <div className="space-y-6">
          {test.questions.map((q: any, i: number) => {
            const studentAns = submission.answers[i];
            const isMcq = q.type === 'mcq' || !q.type;
            const isCorrect = q.isGrace || (isMcq 
              ? (q.options[studentAns] === q.correct_answer || String(studentAns) === q.correct_answer)
              : true); 
            
            const awardedMarks = q.isGrace 
              ? (q.marks || 1)
              : (q.type === 'subjective' 
                ? (submission.subjectiveScores?.[i] || 0)
                : (isCorrect ? (q.marks || 1) : 0));

            return (
              <div key={i} className={`bg-slate-900/50 border rounded-3xl p-6 md:p-8 ${isCorrect ? (q.isGrace ? 'border-amber-500/20' : 'border-emerald-500/10') : 'border-red-500/10'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${q.type === 'subjective' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                        {q.type === 'subjective' ? 'Subjective' : 'MCQ'} • {q.marks || 1} Marks
                      </span>
                      {q.isGrace && (
                        <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                          <Lucide.Sparkles size={8} /> Grace Mark Awarded
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Marks Obtained</p>
                    <p className={`text-xl font-black ${awardedMarks > 0 ? (q.isGrace ? 'text-amber-500' : 'text-emerald-500') : 'text-red-500'}`}>{awardedMarks}/{q.marks || 1}</p>
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-white mb-6 leading-relaxed">{q.question}</h3>

                <div className="grid grid-cols-1 gap-4">
                  {isMcq ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isStudentChoice = studentAns === optIdx;
                        const isCorrectOption = opt === q.correct_answer || String(optIdx) === q.correct_answer;
                        
                        let style = "bg-white/5 border-white/5 text-slate-500";
                        if (isCorrectOption) style = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
                        else if (isStudentChoice && !isCorrectOption) style = "bg-red-500/20 border-red-500/50 text-red-400";

                        return (
                          <div key={optIdx} className={`p-4 rounded-xl border flex items-center gap-3 ${style}`}>
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${isCorrectOption ? 'bg-emerald-500 text-white' : isStudentChoice ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                              {String.fromCharCode(65 + optIdx)}
                            </div>
                            <span className="font-medium">{opt}</span>
                            {isCorrectOption && <Lucide.CheckCircle2 size={16} className="ml-auto" />}
                            {isStudentChoice && !isCorrectOption && <Lucide.X size={16} className="ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Your Answer:</p>
                        <p className="text-slate-300 italic text-sm leading-relaxed">{studentAns || 'No answer provided.'}</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Model Answer / Evaluation Criteria:</p>
                        <p className="text-emerald-200 text-sm leading-relaxed whitespace-pre-wrap">{q.correct_answer || 'Check textbook for detailed explanation.'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pb-20">
          <button 
            onClick={onBack}
            className="px-12 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl text-white font-bold transition-all flex items-center gap-3 group"
          >
            <Lucide.ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            Back to Monthly Tests
          </button>
        </div>
      </div>
    </div>
  );
}

function CertificateView({ submission, test, user, onBack, language }: any) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleDownload = async () => {
    window.print();
  };

  const scorePercent = Math.round((submission.finalScore || submission.score) / (submission.totalMaxMarks || submission.totalQuestions) * 100);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-start scroll-smooth"
    >
      <button 
        onClick={onBack}
        className="fixed top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-[110] print:hidden bg-slate-900/85 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-md shadow-lg"
      >
        <Lucide.ArrowLeft size={18} />
        <span className="font-black uppercase tracking-[0.2em] text-xs">Back</span>
      </button>
      
      <div className="max-w-4xl w-full bg-white rounded-lg shadow-2xl p-1 relative overflow-hidden print:p-0 print:shadow-none print:m-0 mt-14 sm:mt-0" ref={certificateRef}>
        {/* Certificate Border */}
        <div className="border-4 sm:border-[12px] border-emerald-600 p-4 sm:p-12 text-center relative">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#059669 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
          
          <div className="relative z-10 space-y-4 sm:space-y-8">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-24 sm:h-24 mb-2 sm:mb-6 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl"></div>
                <img src="/utkal-512.png" alt="Utkal Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <h1 className="text-xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight uppercase">Certificate of Excellence</h1>
              <div className="w-24 sm:w-48 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent mt-2 sm:mt-4"></div>
              <p className="text-[7px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1 sm:mt-2">Utkal Skill Centre Academic Achievement</p>
            </div>

            <div className="space-y-2 sm:space-y-4 pt-2 sm:pt-4">
              <p className="text-slate-500 font-serif italic text-xs sm:text-lg">This is to certify that</p>
              <h2 className="text-xl sm:text-5xl font-serif font-bold text-slate-900 border-b border-emerald-100 pb-1 sm:pb-2 px-4 sm:px-8 inline-block">{submission.userName}</h2>
              <p className="text-slate-500 text-[10px] sm:text-base font-medium">has demonstrated exceptional performance in the</p>
            </div>

            <div className="space-y-1 sm:space-y-2 py-2 sm:py-4">
              <h3 className="text-sm sm:text-2xl font-bold text-emerald-800 uppercase tracking-[0.05em] sm:tracking-[0.1em]">{test.month} {test.year} Monthly Assessment</h3>
              <div className="flex items-center justify-center gap-1.5 sm:gap-3 text-slate-500 text-[10px] sm:text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Subject: <span className="font-bold text-slate-800">{test.subject}</span></span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Class: <span className="font-bold text-slate-800">{submission.class}</span></span>
              </div>
            </div>

            <div className="flex justify-center items-center gap-6 sm:gap-16 py-3 sm:py-8 relative">
              <img src="/utkal-512.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 sm:w-64 opacity-[0.03] pointer-events-none" alt="" />
              <div className="text-center">
                <p className="text-xl sm:text-4xl font-black text-slate-900 leading-none">{scorePercent}%</p>
                <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 sm:mt-2">Aggregate Score</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-4xl font-black text-slate-900 leading-none">#{submission.rank || 'N/A'}</p>
                <p className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 sm:mt-2">State Rank</p>
              </div>
            </div>

            <div className="flex justify-between items-end mt-6 sm:mt-12 px-2 sm:px-12 pt-4 sm:pt-8">
              <div className="text-center">
                <div className="w-16 sm:w-32 border-b border-slate-900 mb-1 sm:mb-2 mx-auto" />
                <p className="font-serif font-bold text-slate-900 text-[10px] sm:text-base">Gundulu</p>
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">AI Learning Advisor</p>
              </div>
              <div className="relative">
                <div className="w-14 h-14 sm:w-28 sm:h-28 bg-emerald-600/5 rounded-full flex items-center justify-center border border-emerald-600/10">
                  <div className="w-12 h-12 sm:w-24 sm:h-24 bg-emerald-600/10 rounded-full flex items-center justify-center border border-emerald-600/20">
                    <Lucide.Award className="w-6 h-6 sm:w-14 sm:h-14 text-emerald-600 opacity-80" />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[5px] sm:text-[8px] font-black text-emerald-600/20 uppercase tracking-[0.2em] sm:tracking-[0.3em] rotate-12">Verified Utkal Cert</p>
                </div>
              </div>
              <div className="text-center">
                <div className="w-16 sm:w-32 border-b border-slate-900 mb-1 sm:mb-2 mx-auto" />
                <p className="font-serif font-bold text-slate-900 text-[10px] sm:text-base">Director</p>
                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Utkal Skill Centre</p>
              </div>
            </div>
            
            <p className="text-[8px] sm:text-[10px] text-slate-300 font-mono mt-4 sm:mt-8 italic">Verification ID: {submission.id?.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-12 flex gap-4 print:hidden flex-wrap sm:flex-nowrap justify-center">
        <button 
          onClick={handleDownload}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-emerald-500/20 text-sm"
        >
          <Lucide.Download size={18} /> Print/Save as PDF
        </button>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm"
        >
          Close
        </button>
      </div>
      <p className="text-slate-500 text-[10px] sm:text-xs mt-4 print:hidden text-center pb-8">Tip: For best result, set Layout to "Landscape" and "Remove Margins" in print settings.</p>
    </div>
  );
}

function MonthlyTestsView({ tests, submissions, language, user, onBack, setActiveTab, loadTestSubmissions }: any) {
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [takingTest, setTakingTest] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<any>(null);
  const [reviewingResults, setReviewingResults] = useState<any>(null);

  const getSubmission = (test: any) => {
    return submissions.find((s: any) => s.testId === test.id);
  };

  const getLocalizedSubject = (subject: string, lang: 'en' | 'or') => {
    return translations[lang].subjects[subject] || subject;
  };

  useEffect(() => {
    if (selectedTest) {
      const updatedSelected = tests.find((t: MonthlyTest) => t.id === selectedTest.id || (t.translationGroupId && t.translationGroupId === selectedTest.translationGroupId));
      if (updatedSelected) {
        setSelectedTest(updatedSelected);
      } else {
        setSelectedTest(null);
        setTakingTest(false);
      }
    }
  }, [tests]);

  if (takingTest && selectedTest) {
    return (
      <MonthlyTestEngine 
        test={selectedTest} 
        onComplete={() => {
          setTakingTest(false);
          setSelectedTest(null);
          loadTestSubmissions();
        }} 
        onBack={() => setTakingTest(false)}
        language={language} 
        user={user}
      />
    );
  }

  if (viewingCertificate) {
    return (
      <CertificateView 
        submission={viewingCertificate.submission}
        test={viewingCertificate.test}
        user={user}
        language={language}
        onBack={() => setViewingCertificate(null)}
      />
    );
  }

  if (reviewingResults) {
    return (
      <ResultsReviewView 
        submission={reviewingResults.submission}
        test={reviewingResults.test}
        language={language}
        onBack={() => setReviewingResults(null)}
      />
    );
  }

  const filteredTests = tests.filter((t: any) => {
    // 1. Class matching
    if (user?.class) {
      const testClass = String(t.class || '').toLowerCase().trim();
      const userClass = String(user.class || '').toLowerCase().trim();
      if (!(testClass === userClass || testClass === userClass.replace('class', ''))) return false;
    }

    // 2. Admin sees everything
    if (user?.role === 'admin') return true;

    // 3. Scheduling logic: visible if scheduledDate <= today
    if (t.scheduledDate) {
      const today = new Date().toISOString().split('T')[0];
      return t.scheduledDate <= today;
    }

    return true; // Default show if no scheduledDate (backward compatibility)
  });

  // Group published submissions by month and year
  const publishedSubmissionsByMonth = useMemo(() => {
    const groups: Record<string, { submissions: any[], tests: any[], totalScore: number, totalMax: number }> = {};
    
    filteredTests.forEach((test: any) => {
      if (test.results_published) {
        const sub = getSubmission(test);
        if (sub) {
          const key = `${test.month} ${test.year}`;
          if (!groups[key]) groups[key] = { submissions: [], tests: [], totalScore: 0, totalMax: 0 };
          groups[key].submissions.push(sub);
          groups[key].tests.push(test);
          groups[key].totalScore += (sub.finalScore ?? sub.score ?? 0);
          groups[key].totalMax += (sub.totalMaxMarks ?? sub.totalQuestions ?? 0);
        }
      }
    });
    return groups;
  }, [filteredTests, submissions]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const testFaqs = [
    {
      question: "What is the pattern of the Monthly Test Series 2026?",
      answer: "The Utkal Skill Centre Monthly Test Series follows the latest Odisha Board (BSE/CHSE) pattern with a mix of MCQ and subjective questions to ensure complete board exam readiness."
    },
    {
      question: "How can I download the Class 10 Selection Question PDF?",
      answer: "Students can participate in the online test series and download their performance report and selection questions directly from the student dashboard."
    },
    {
      question: "Is this test series based on the latest Odisha Board syllabus?",
      answer: "Yes, all tests are strictly based on the reduced syllabus and latest question pattern issued by the Odisha Board for the 2026 academic year."
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <SEO 
        title={`Class 10 Monthly Test Series 2026 | Latest Odisha Board Selection Questions`}
        description="Participate in the latest Odisha Board pattern monthly test series. Get Class 10 selection questions, MCQ practice, and instant certificates."
        schemaType="FAQPage"
        faqs={testFaqs}
      />
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <Lucide.ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="w-20 h-20 rounded-3xl bg-white p-3 shadow-2xl shadow-emerald-500/20">
            <img src="/utkal-512.png" alt="Utkal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
              {translations[language].monthlyTests}
            </h1>
            <p className="text-slate-400 max-w-md">
              Participate in premium assessments for {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} designed by expert educators.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-4 bg-black/20 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/5">
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active Status</p>
            <p className="text-sm font-black text-white">Board Pattern 2026</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lucide.Shield size={20} />
          </div>
        </div>
      </motion.div>

      {Object.entries(publishedSubmissionsByMonth).map(([monthYear, data]) => {
        if (data.submissions.length === 0) return null;
        
        return (
          <motion.div key={monthYear} variants={itemVariants} className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-[2rem] p-8 relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32 rounded-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Lucide.Trophy size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{monthYear} Series Report</h3>
                  <p className="text-slate-400 text-sm">Overall Performance Across All Subjects</p>
                </div>
              </div>
              <div className="bg-indigo-500/20 border border-indigo-500/30 px-6 py-4 rounded-2xl text-center min-w-[150px]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Total Score</p>
                <p className="text-3xl font-black text-white">{data.totalScore} <span className="text-lg text-slate-400">/ {data.totalMax}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
              {data.tests.map((test, idx) => {
                const sub = data.submissions[idx];
                const score = sub.finalScore ?? sub.score ?? 0;
                const max = sub.totalMaxMarks ?? sub.totalQuestions ?? 0;
                const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
                
                return (
                  <div key={test.id} className="bg-black/20 border border-white/5 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{getLocalizedSubject(test.subject, language)}</p>
                    <div className="flex items-end justify-between">
                      <p className="text-xl font-bold text-white">{score}<span className="text-xs text-slate-500">/{max}</span></p>
                      <p className={`text-xs font-bold ${percentage >= 80 ? 'text-emerald-500' : percentage >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTests.map((test: any) => {
          const submission = getSubmission(test);
          const resultsPublished = test.results_published;

          return (
            <motion.div 
              whileHover={{ y: -8, scale: 1.01 }} 
              key={test.id} 
              className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
              
              <div className="flex items-start justify-between mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Lucide.FileText size={32} />
                </div>
                {submission ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                      Completed
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Attempted on {new Date(submission.submittedAt?.toDate?.() || submission.submittedAt).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20 animate-pulse">
                    Open Now
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{getLocalizedSubject(test.subject, language)} - {test.month} {test.year}</h3>
              <p className="text-slate-400 mb-8">Total Questions: {test.questions.length}</p>

              <div className="flex flex-col gap-3">
                {submission ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div className="bg-slate-800/50 rounded-2xl p-4 text-center">
                        <p className="text-xl font-bold text-white">{submission.finalScore || submission.score}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Score</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-2xl p-4 text-center">
                        <p className="text-xl font-bold text-emerald-500">
                          {resultsPublished ? `#${submission.rank || 'N/A'}` : 'Pending'}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Rank</p>
                      </div>
                    </div>
                    {resultsPublished && (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setReviewingResults({ submission, test })}
                            className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-center flex items-center justify-center gap-2 border border-white/5 transition-all"
                          >
                            <Lucide.ClipboardList size={18} /> Review Answers
                          </button>
                          <button 
                            onClick={() => setViewingCertificate({ submission, test })}
                            className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                          >
                            <Lucide.Award size={18} /> Certificate
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : resultsPublished ? (
                  <div className="w-full py-4 rounded-2xl bg-slate-900 border border-white/5 text-slate-500 font-bold text-center flex flex-col items-center justify-center gap-1">
                    <Lucide.Clock size={18} />
                    <span>Test Ended</span>
                    <p className="text-[10px] font-medium opacity-60">Results have been published</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                          <Lucide.User size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Certificate Name</p>
                          <p className="text-sm font-bold text-white">{user.displayName || user.name || 'Student'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('profile')}
                        className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline"
                      >
                        Change
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedTest(test);
                        setTakingTest(true);
                      }}
                      className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Lucide.Play size={18} /> {translations[language].takeMonthlyTest}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredTests.length === 0 && (
          <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
            <Lucide.Clock size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Tests Scheduled</h3>
            <p className="text-slate-500">Check back later for upcoming monthly assessments for your class and subjects.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function MonthlyTestEngine({ test, onComplete, onBack, language, user }: any) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const uploadingImageRef = useRef(false);
  useEffect(() => {
    uploadingImageRef.current = uploadingImage;
  }, [uploadingImage]);
  const [reports, setReports] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const startTimeRef = useRef<number>(Date.now());

  // Keep screen awake during Monthly Test study session (PWA native feature)
  useEffect(() => {
    requestScreenWakeLock();
    return () => {
      void releaseScreenWakeLock();
    };
  }, []);

  // Image compression utility to speed up uploads
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 1200px
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.7); // 70% quality
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle real-time test termination if results are published
  useEffect(() => {
    if (test.results_published) {
      alert(language === 'en' ? "This test session has ended as results have been published." : "ଫଳାଫଳ ପ୍ରକାଶିତ ହୋଇଥିବାରୁ ଏହି ପରୀକ୍ଷା ଶେଷ ହୋଇଛି |");
      onBack();
    }
  }, [test.results_published, language, onBack]);

  // Countdown Timer Logic
  useEffect(() => {
    if (timeLeft <= 0) {
      alert("Time is up! Your test is being submitted automatically.");
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Anti-Cheating: Tab Switching Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if ((window as any).isUploadingRoughNote) {
        console.log("[Anti-Cheating] Visibility change ignored due to active camera/gallery rough note upload.");
        return;
      }
      if (document.visibilityState === 'hidden') {
        setViolations(prev => {
          const next = prev + 1;
          if (next >= 3) {
            alert("Test auto-submitted due to multiple tab switches.");
            handleSubmit();
          } else {
            setShowWarning(true);
          }
          return next;
        });
      }
    };

    const handleWindowFocus = () => {
      // Give 10 seconds grace period for upload to initiate on returning focus
      // (some Android devices take very long to process high-res camera images before returning them to browser)
      setTimeout(() => {
        if (!uploadingImageRef.current) {
          (window as any).isUploadingRoughNote = false;
        }
      }, 10000);
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
        e.preventDefault();
        alert("Copy/Paste is disabled during the test.");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [violations]); // Removing uploadingImage dependency to prevent stale closure timeouts

  // Track time spent per question
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(prev => ({
        ...prev,
        [currentIdx]: (prev[currentIdx] || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx]);

  const handleAnswer = (val: any) => {
    vibrate(12);
    playClickSound();
    setAnswers(prev => ({ ...prev, [currentIdx]: val }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) {
      (window as any).isUploadingRoughNote = false;
      return;
    }
    setUploadingImage(true);
    (window as any).isUploadingRoughNote = true;
    try {
      // 1. Compress
      const compressedBlob = await compressImage(file);
      
      // 2. Upload
      const safeUserId = user?.uid || user?.id || 'anonymous';
      const storageRef = ref(storage, `monthly_test_evidence/${safeUserId}/${test.id}/${currentIdx}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      // Update answer to include image URL
      const currentVal = answers[currentIdx] || '';
      const newVal = typeof currentVal === 'object' 
        ? { ...currentVal, imageUrl: url }
        : { text: currentVal, imageUrl: url };
      
      handleAnswer(newVal);
    } catch (err: any) {
      console.error("Image upload error:", err);
      alert(`Failed to upload image: ${err.message || "Unknown error"}. Please check your connection and try again.`);
    } finally {
      setUploadingImage(false);
      // Wait a short delay to ensure any delayed browser focus/visibility events have resolved
      setTimeout(() => {
        (window as any).isUploadingRoughNote = false;
      }, 1000);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const questions = test.questions;
      let mcqScore = 0;
      let totalMaxMarks = 0;

      questions.forEach((q: any, i: number) => {
        const studentAns = answers[i];
        totalMaxMarks += (q.marks || 1);
        
        if (q.isGrace) {
          mcqScore += (q.marks || 1);
        } else if (q.type === 'mcq' || !q.type) {
          const options = q.options || [];
          const selectedOption = options[studentAns];
          if (selectedOption === q.correct_answer || String(studentAns) === q.correct_answer) {
            mcqScore += (q.marks || 1);
          }
        }
      });
      
      await addDoc(collection(firestore, 'monthly_test_submissions'), {
        testId: test.id,
        userId: user.uid || user.id,
        userName: user.displayName || user.name || 'Student',
        userEmail: user.email || '',
        class: user.class,
        subject: test.subject,
        month: test.month,
        year: test.year,
        answers,
        score: mcqScore, // This is only auto-gradable score
        totalMaxMarks,
        totalQuestions: questions.length,
        violations,
        reports,
        timeSpent,
        submittedAt: serverTimestamp(),
        rank: null,
        status: 'pending_review'
      });

      try {
        localStorage.removeItem(`fs_cache_test_subs_${user.uid || user.id}`);
      } catch (cacheErr) {
        console.warn("Failed to clear test submissions cache:", cacheErr);
      }
      vibrate([60, 40, 120]); // Victory heartbeat vibration on test completion!
      playSuccessChime(true); // Ascending major notes chime!
      alert(language === 'en' ? "Test submitted successfully!" : "ପରୀକ୍ଷା ସଫଳତାର ସହିତ ଦାଖଲ ହୋଇଛି!");
      onComplete();
    } catch (err: any) {
      console.error("Submit Test Error:", err);
      alert(`Failed to submit test: ${err.message || "Unknown error"}. Please check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const q = test.questions[currentIdx];
  const marks = q.marks || 1;
  const isMcq = q.type === 'mcq' || !q.type;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => {
            if (confirm(language === 'en' ? "Are you sure you want to quit? Your progress will be lost." : "ଆପଣ ନିଶ୍ଚିତ କି ଆପଣ ଛାଡିବାକୁ ଚାହୁଁଛନ୍ତି?")) {
              onBack();
            }
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <Lucide.ArrowLeft size={20} />
          <span>Quit Test</span>
        </button>
        
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold transition-all ${timeLeft < 300 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-emerald-500'}`}>
            <Lucide.Clock size={18} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {violations > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-bold animate-pulse">
              <Lucide.AlertTriangle size={14} />
              <span>{violations} Flagged</span>
            </div>
          )}

          <button 
            onClick={() => setReports(prev => ({...prev, [currentIdx]: !prev[currentIdx]}))}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-bold transition-all text-xs ${reports[currentIdx] ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-500'}`}
          >
            <Lucide.Flag size={14} />
            <span>{language === 'en' ? 'Out of Chapter?' : 'ଅଧ୍ୟାୟ ବାହାରେ?'}</span>
          </button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question {currentIdx + 1}/{test.questions.length}</p>
              <div className="w-32 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-200 text-sm font-medium flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Lucide.XCircle className="text-red-500" size={20} />
              <span>Warning: Do not leave the test screen. Next violation will lead to auto-submission.</span>
            </div>
            <button onClick={() => setShowWarning(false)} className="text-white hover:underline">I Understand</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 md:p-12 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-8">
          <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
            {marks} Mark{marks > 1 ? 's' : ''}
          </span>
          <span className="px-4 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
            {isMcq ? 'Multiple Choice' : 'Subjective Answer'}
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 leading-snug">
          {q.question}
        </h2>
        
        {isMcq ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {q.options.map((opt: string, idx: number) => (
              <button 
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`flex items-center gap-4 p-6 rounded-2xl border transition-all text-left group ${answers[currentIdx] === idx ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 transition-colors ${answers[currentIdx] === idx ? 'bg-white text-emerald-500' : 'bg-white/10 text-slate-500 group-hover:text-white'}`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className="text-lg font-medium">{opt}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Answer / Calculation</label>
              <div className="flex gap-2">
                <label 
                  onClick={() => {
                    (window as any).isUploadingRoughNote = true;
                  }}
                  className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all"
                >
                  {uploadingImage ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Camera size={14} />}
                  {uploadingImage ? 'Uploading...' : 'Camera'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                    onChange={(e) => {
                      (window as any).isUploadingRoughNote = true;
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      else (window as any).isUploadingRoughNote = false;
                      e.target.value = ''; // Reset input
                    }}
                    disabled={uploadingImage}
                  />
                </label>
                <label 
                  onClick={() => {
                    (window as any).isUploadingRoughNote = true;
                  }}
                  className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all"
                >
                  <Lucide.Image size={14} />
                  Gallery
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      (window as any).isUploadingRoughNote = true;
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      else (window as any).isUploadingRoughNote = false;
                      e.target.value = ''; // Reset input
                    }}
                    disabled={uploadingImage}
                  />
                </label>
              </div>
            </div>

            <textarea 
              value={typeof answers[currentIdx] === 'object' ? answers[currentIdx].text : (answers[currentIdx] || '')}
              onChange={(e) => {
                const currentVal = answers[currentIdx];
                const newVal = typeof currentVal === 'object' 
                  ? { ...currentVal, text: e.target.value }
                  : e.target.value;
                handleAnswer(newVal);
              }}
              placeholder="Type your answer or explain your working here..."
              className="w-full h-48 bg-black/20 border border-white/10 rounded-3xl p-6 text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none leading-relaxed"
            />

            {answers[currentIdx]?.imageUrl && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                <img src={answers[currentIdx].imageUrl} alt="Working Evidence" className="w-full h-full object-contain" />
                <button 
                  onClick={() => {
                    const currentVal = answers[currentIdx];
                    if (typeof currentVal === 'object') {
                      const { imageUrl, ...rest } = currentVal;
                      handleAnswer(rest);
                    }
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-all"
                >
                  <Lucide.Trash2 size={14} />
                </button>
              </div>
            )}

            <p className="text-[10px] text-slate-500 uppercase font-bold text-right">
              {language === 'en' ? 'Submission includes text and optional photo evidence' : 'ଉତ୍ତର ସହିତ ଫଟୋ ପ୍ରମାଣ ସଂଲଗ୍ନ କରାଯାଇପାରିବ'}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 disabled:opacity-0 transition-all border border-white/5"
          >
            <Lucide.ArrowLeft size={18} />
          </button>
          
          <button 
            onClick={() => {
              if (answers[currentIdx] === undefined) {
                handleAnswer(''); // Mark as skipped
              }
              if (currentIdx < test.questions.length - 1) {
                setCurrentIdx(prev => prev + 1);
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/5 text-amber-500 font-bold hover:bg-white/10 transition-all border border-amber-500/10"
          >
            Skip
          </button>
        </div>
        
        {currentIdx === test.questions.length - 1 ? (
          <button 
            disabled={answers[currentIdx] === undefined || submitting}
            onClick={handleSubmit}
            className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-12 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {submitting ? <><Lucide.Loader2 size={24} className="animate-spin" /> Submitting...</> : <><Lucide.Trophy size={24} /> Submit Final Test</>}
          </button>
        ) : (
          <button 
            disabled={answers[currentIdx] === undefined}
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="w-full md:w-auto flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50"
          >
            Next Question <Lucide.ArrowRight size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
}


