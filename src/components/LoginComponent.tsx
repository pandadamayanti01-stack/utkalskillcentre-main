import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Loader2, Globe, ArrowLeft, Shield, ChevronRight, Sparkles, Youtube, Instagram, Facebook, BookOpen } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getDeferredPrompt, clearDeferredPrompt } from '../pwa';

const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path fill="currentColor" d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.8 3.08 1.22 4.79 1.22 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02Zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.58 3.73-8.31 8.31-8.31 2.22 0 4.31.87 5.88 2.44 1.57 1.57 2.43 3.66 2.43 5.88 0 4.58-3.73 8.31-8.31 8.31Zm4.56-6.22c-.25-.12-1.48-.73-1.71-.82-.23-.08-.4-.12-.57.12-.17.25-.65.82-.8 1-.15.17-.3.2-.55.08-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.1-.51.11-.11.25-.29.38-.44.12-.15.17-.25.25-.41.08-.17.04-.33-.02-.45-.06-.12-.57-1.38-.78-1.89-.2-.5-.41-.43-.57-.44-.15-.01-.33-.01-.5-.01-.17 0-.45.06-.69.32-.25.25-.96.94-.96 2.3s.98 2.68 1.12 2.86c.14.18 1.95 2.98 4.72 4.18.66.28 1.17.45 1.57.58.66.21 1.26.18 1.74.11.54-.08 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.28Z"/>
  </svg>
);

const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/utkalskillcentre/';
const FACEBOOK_PROFILE_URL = 'https://www.facebook.com/share/1JAq6DY6Sq/';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@UtkalSkillCenter';

const SOCIAL_ORIGINS = [
  YOUTUBE_ORIGIN,
  new URL(INSTAGRAM_PROFILE_URL).origin,
  new URL(FACEBOOK_PROFILE_URL).origin,
];

// PRE-CONFIGURED HACKATHON TEST NUMBERS (Must match test numbers configured in Firebase Auth console)
const TEST_ACCOUNTS = [
  { phone: '+911234567890', label: 'Student (Class 10)', class: '10', board: 'BSE Odisha', role: 'student' as const, code: '123456' }
];

export default function Login({ language, translations, setLanguage, setRegData }: { language: 'en' | 'or', translations: any, setLanguage: (lang: 'en' | 'or') => void, setRegData: (data: any) => void }): React.ReactElement {
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleLaunchGuidedTour = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('judge_tour_active', 'true');
      sessionStorage.setItem('judge_tour_step', '1');
      const todayStr = new Date().toLocaleDateString('en-CA');
      localStorage.setItem('rajaFestivalLastSeenDate', todayStr);
    }
    await handleFastPassLogin(TEST_ACCOUNTS[0]);
  };

  const handleFastPassLogin = async (acc: typeof TEST_ACCOUNTS[number]) => {
    setUserRole(acc.role);
    if (acc.role === 'student') {
      setSelectedClass(acc.class);
      setSelectedBoard(acc.board);
    }
    
    // Set matching registration data
    setRegData({
      class: acc.role === 'student' ? acc.class : '10',
      board: acc.role === 'student' ? acc.board : 'BSE Odisha',
      role: acc.role
    });

    setPhoneNumber(acc.phone);
    if (phoneInputRef.current) {
      phoneInputRef.current.value = acc.phone.replace('+91', '');
    }

    setIsSending(true);

    try {
      // 1. Solve Captcha via silent invisible element
      if (!recaptchaVerifier.current && recaptchaDomRef.current) {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaDomRef.current, {
          'size': 'invisible',
          'callback': (_response: any) => {}
        });
      }

      // 2. Dispatch Firebase Phone Sign-in (returns instantly for test numbers)
      const confirmation = await signInWithPhoneNumber(auth, acc.phone, recaptchaVerifier.current);
      setVerificationId(confirmation);
      
      // 3. Programmatically confirm standard OTP immediately (Zero-friction Login!)
      await confirmation.confirm(acc.code);
      console.log("Fast-Pass automated login successful");
      
    } catch (error: any) {
      console.error("Fast-pass login error:", error);
      alert("Fast-pass authentication failed: " + error.message);
      if (recaptchaVerifier.current) recaptchaVerifier.current.clear();
      recaptchaVerifier.current = null;
    } finally {
      setIsSending(false);
    }
  };
  const [verificationId, setVerificationId] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isSending, setIsSending] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [showAdminPill, setShowAdminPill] = useState(false);
  const showShowcaseButton = typeof window !== 'undefined' && (
    window.location.search.includes('showcase=true') || 
    window.location.search.includes('judge=true') || 
    window.location.search.includes('judgestatus=true') || 
    window.location.hash.includes('judge') ||
    window.location.hash === '#pitch_deck'
  );
  const showJudgePass = typeof window !== 'undefined' && (
    window.location.search.includes('judge=true') || 
    window.location.search.includes('judgestatus=true') || 
    window.location.search.includes('showcase=true') || 
    window.location.hash.includes('judge') ||
    window.location.hash === '#judge'
  );
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const recaptchaVerifier = useRef<any>(null);
  const recaptchaDomRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];
  const isStandaloneMode = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
  const isMobileDevice = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(window.navigator.userAgent);
  const socialLinkTarget = isStandaloneMode || isMobileDevice ? '_self' : '_blank';
  const socialLinkRel = socialLinkTarget === '_blank' ? 'noopener noreferrer' : undefined;
  const shouldShowInstallButton = !isStandaloneMode;
  const canInstallApp = Boolean(deferredPrompt || getDeferredPrompt());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const existingPrompt = getDeferredPrompt();
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const injectedLinks = SOCIAL_ORIGINS.flatMap((origin) => {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      preconnect.crossOrigin = 'anonymous';

      const dnsPrefetch = document.createElement('link');
      dnsPrefetch.rel = 'dns-prefetch';
      dnsPrefetch.href = origin;

      document.head.appendChild(preconnect);
      document.head.appendChild(dnsPrefetch);

      return [preconnect, dnsPrefetch];
    });

    return () => {
      injectedLinks.forEach((link) => link.remove());
    };
  }, []);

  const syncSelectedAcademicInfo = () => {
    setRegData({ 
      class: userRole === 'student' ? selectedClass : '10', 
      board: userRole === 'student' ? selectedBoard : 'BSE Odisha',
      role: userRole 
    });
  };

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || getDeferredPrompt();
    if (!prompt) {
      const installMessage = isMobileDevice
        ? 'Install is not ready yet. Open the browser menu and choose Add to Home screen or Install app.'
        : 'Install is not ready yet. In Chrome or Edge, use the address bar install icon or the browser menu and choose Install app.';
      alert(installMessage);
      return;
    }

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      clearDeferredPrompt();
      setDeferredPrompt(null);
    }
  };

  const getEnteredPhoneNumber = () => phoneInputRef.current?.value?.trim() || phoneNumber;

  const handleGoogleLogin = async () => {
    if (userRole === 'student' && (!selectedClass || !selectedBoard)) {
      alert(translations[language].requiredFieldsError);
      return;
    }

    syncSelectedAcademicInfo();

    try {
      await signInWithGoogle();
      console.log("Google login successful");
    } catch (error) {
      console.error("Google login error:", error);
      alert("Google login failed.");
    }
  };

  const normalizePhoneNumber = (input: string) => {
    const withPlus = input.trim().replace(/[^\d+]/g, '');
    if (withPlus.startsWith('+')) return withPlus;

    const digitsOnly = withPlus.replace(/\D/g, '');
    if (digitsOnly.length === 10) return `+91${digitsOnly}`;
    if (digitsOnly.length > 10) return `+${digitsOnly}`;
    return `+91${digitsOnly}`;
  };

  const getOtpErrorMessage = (error: any) => {
    switch (error?.code) {
      case 'auth/invalid-phone-number':
        return 'Invalid phone format. Use full number with country code (example: +91XXXXXXXXXX).';
      case 'auth/too-many-requests':
        return 'Too many OTP attempts. Please wait a few minutes and try again.';
      case 'auth/operation-not-allowed':
        return 'Phone sign-in is disabled. Enable Phone provider in Firebase Authentication.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Authentication. Add your Vercel/Cloud Run domain in Authorized Domains.';
      case 'auth/invalid-app-credential':
        return 'Firebase app verification failed. Add your domain to Authorized Domains in Firebase Console Authentication settings.';
      case 'auth/billing-not-enabled':
        return 'Real SMS requires Firebase Blaze plan. For testing, add a phone test number in Firebase Auth and use its test OTP.';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA failed. Refresh the page and try again.';
      case 'auth/network-request-failed':
        return 'Network error while sending OTP. Check your internet and retry.';
      default:
        return error?.message || 'Failed to send OTP. Please verify Firebase Auth configuration.';
    }
  };

  const onSmsSend = async () => {
    const enteredPhoneNumber = getEnteredPhoneNumber();

    if (!enteredPhoneNumber || enteredPhoneNumber.length < 10) return alert("Please enter valid phone");
    if (userRole === 'student' && (!selectedClass || !selectedBoard)) return alert(translations[language].requiredFieldsError);

    syncSelectedAcademicInfo();

    setPhoneNumber(enteredPhoneNumber);

    setIsSending(true);
    if (!recaptchaVerifier.current && recaptchaDomRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaDomRef.current, { 
        'size': 'normal',
        'callback': (_response: any) => { /* reCAPTCHA solved */ }
      });
    }

    try {
      const formattedNumber = normalizePhoneNumber(enteredPhoneNumber);

      try {
        const lockDoc = await getDoc(doc(db, 'user_locks', formattedNumber));
        if (lockDoc.exists()) {
          const lockData = lockDoc.data();
          if (lockData.role && lockData.role !== userRole) {
            alert(language === 'en'
              ? `This phone number is already registered as a ${lockData.role.toUpperCase()}. Please switch your role on the login screen.`
              : `ଏହି ଫୋନ୍ ନମ୍ବର ପୂର୍ବରୁ ${lockData.role.toUpperCase()} ଭାବରେ ପଞ୍ଜିକୃତ ହୋଇଛି |`);
            return;
          }
          if (userRole === 'student') {
            const dbClass = lockData.class;
            const dbBoard = lockData.board;
            if (selectedClass && selectedBoard && (dbClass !== selectedClass || dbBoard !== selectedBoard)) {
              const classLabel = translations[language].classes[dbClass] || dbClass;
              const boardLabel = translations[language].boards[dbBoard] || dbBoard;
              alert(language === 'en'
                ? `Your account is locked to ${classLabel} (${boardLabel}). Please select the correct class/board to login.`
                : `ଆପଣଙ୍କ ଆକାଉଣ୍ଟ ${classLabel} (${boardLabel}) ପାଇଁ ଲକ୍ ହୋଇଛି | ଦୟାକରି ସଠିକ୍ ଶ୍ରେଣୀ/ବୋର୍ଡ ଚୟନ କରନ୍ତୁ |`);
              return;
            }
          }
        }
      } catch (lockError: any) {
        if (lockError?.code !== 'permission-denied' && lockError?.code !== 'failed-precondition') {
          console.warn('Lock check skipped due to read error:', lockError);
        }
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier.current);
      setVerificationId(confirmation);
      setAuthStep('otp');
    } catch (error: any) {
      console.error(error);
      alert(getOtpErrorMessage(error));
      if (recaptchaVerifier.current) recaptchaVerifier.current.clear();
      recaptchaVerifier.current = null;
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    setIsSending(true);
    try {
      await verificationId.confirm(otp);
    } catch (error) {
      alert("Invalid OTP");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-between p-3 sm:p-4 overflow-y-auto overflow-x-hidden bg-[#020617]">
      
      {/* 1. STUNNING AMBIENT MESH GLOW BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Emerald Glow Orb */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[70vw] sm:w-[500px] h-[70vw] sm:h-[500px] rounded-full bg-emerald-500/20 blur-[120px]"
        />
        {/* Amber Glow Orb */}
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[-10%] left-[-10%] w-[70vw] sm:w-[500px] h-[70vw] sm:h-[500px] rounded-full bg-amber-500/20 blur-[120px]"
        />
        {/* Odia Temple Pattern Watermark Overlay */}
        <div className="absolute inset-0 opacity-5 flex items-center justify-center">
          <img src="/temple-pattern.png" className="w-[120%] sm:w-[80%] h-auto object-contain filter grayscale" alt="" />
        </div>
      </div>

      {/* 2. TOP: Sleek Premium Utility Bar */}
      <header className="w-full max-w-md flex justify-between items-center z-20 pt-1">
        {/* UTKAL LOGO WITH TRIPLE CLICK ADMIN TRIGGER & HIDE TOGGLE */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => {
            if (showAdminPill) {
              setShowAdminPill(false);
              if (userRole === 'admin') setUserRole('student');
              (window as any)._logoClickCount = 0;
              return;
            }
            const now = Date.now();
            const timeDiff = now - ((window as any)._lastLogoClick || 0);
            if (timeDiff < 500) {
              (window as any)._logoClickCount = ((window as any)._logoClickCount || 0) + 1;
              if ((window as any)._logoClickCount >= 3) {
                setShowAdminPill(true);
                setUserRole('admin');
                (window as any)._logoClickCount = 0;
              }
            } else {
              (window as any)._logoClickCount = 1;
            }
            (window as any)._lastLogoClick = now;
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
            <img 
              src="/utkal-512.png" 
              className="h-9 w-auto relative z-10 drop-shadow-lg" 
              alt="Utkal" 
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-base font-black tracking-tighter uppercase leading-none font-['Outfit']">UTKAL</h1>
            <p className="text-amber-400 text-[7px] font-black tracking-[0.3em] uppercase opacity-90 mt-0.5 font-['Outfit']">Skill Centre</p>
          </div>
        </motion.div>

        {/* CONTROLS: LANGUAGE & PWA WHATSAPP INSTALL */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          {showShowcaseButton && (
            <button 
              onClick={() => {
                if (typeof (window as any)._onLaunchShowcase === 'function') {
                  (window as any)._onLaunchShowcase();
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-[9px] font-black text-amber-300 flex items-center gap-1 shadow-lg backdrop-blur-md transition-all active:scale-95 animate-pulse cursor-pointer"
            >
              <Sparkles size={12} className="text-amber-400" />
              {language === 'en' ? 'SHOWCASE' : 'ପ୍ରୋଜେକ୍ଟ ସ୍ଲାଇଡ୍'}
            </button>
          )}

          <button 
            onClick={() => setLanguage(language === 'en' ? 'or' : 'en')} 
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-amber-400 flex items-center gap-1 shadow-lg backdrop-blur-md transition-all active:scale-95"
          >
            <Globe size={12} className="text-amber-400 animate-spin-slow" />
            {language === 'en' ? 'ଓଡ଼ିଆ' : 'ENGLISH'}
          </button>

          {shouldShowInstallButton && (
            <button
              onClick={handleInstallClick}
              title={canInstallApp ? 'Install app' : 'Install prompt will appear when supported by the browser'}
              className={`flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${canInstallApp ? '' : 'opacity-85'}`}
            >
              <span className="text-emerald-400 flex items-center justify-center">
                <WhatsAppIcon size={12} />
              </span>
              {language === 'en' ? 'Install' : 'ଇନଷ୍ଟଲ୍'}
            </button>
          )}
        </motion.div>
      </header>

      {/* 3. CENTER: Ultra-Premium Glassmorphic Altar Form */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 my-auto py-2">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] space-y-4 sm:space-y-5 relative overflow-hidden"
        >
          {/* Subtle top edge specular highlight */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* WELCOME BANNER (Slightly Up) */}
          <div className="w-full text-center space-y-1 pb-1">
            <AnimatePresence mode="wait">
              <motion.div key={language} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                <h2 className="text-white text-3xl sm:text-4xl font-black tracking-tight font-['Outfit']">
                  {language === 'en' ? 'Join the ' : 'ସାମିଲ ହୁଅନ୍ତୁ ' }
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
                    {language === 'en' ? 'AI Era' : 'AI ଯୁଗରେ'}
                  </span>
                </h2>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-1.5 flex items-center justify-center gap-2">
                  <span className="h-px w-4 bg-slate-700" />
                  {language === 'en' ? 'Personalized Learning' : 'ଆପଣଙ୍କ ପାଇଁ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷା'}
                  <span className="h-px w-4 bg-slate-700" />
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ROLE SWITCHER PILLS (STUDENT / TEACHER / ADMIN) */}
          <div className={`w-full grid ${showAdminPill ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5`}>
            <button
              type="button"
              onClick={() => setUserRole('student')}
              className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                userRole === 'student' 
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/40 scale-[1.02]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              👨‍🎓 {language === 'en' ? 'Student' : 'ଛାତ୍ର'}
            </button>
            <button
              type="button"
              onClick={() => setUserRole('teacher')}
              className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                userRole === 'teacher' 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 scale-[1.02]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              👨‍🏫 {language === 'en' ? 'Teacher' : 'ଶିକ୍ଷକ'}
            </button>
            {showAdminPill && (
              <button
                type="button"
                onClick={() => setUserRole('admin')}
                className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative ${
                  userRole === 'admin' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                🛡️ {language === 'en' ? 'Admin' : 'ପ୍ରଶାସକ'}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAdminPill(false);
                    if (userRole === 'admin') setUserRole('student');
                  }}
                  title="Hide Admin Mode"
                  className="absolute right-1 top-1 w-4 h-4 rounded-full bg-black/40 hover:bg-red-500/80 flex items-center justify-center text-[8px] text-slate-300 hover:text-white transition-colors"
                >
                  ✕
                </div>
              </button>
            )}
          </div>

          {/* RECAPTCHA & INPUT FLOW */}
          <div className="w-full space-y-3.5">
            <div id="recaptcha-container" ref={recaptchaDomRef} className="my-1 flex justify-center w-full overflow-hidden"></div>
            
            <AnimatePresence mode="wait">
              {authStep === 'login' ? (
                <motion.div 
                  key="login" 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full space-y-3.5"
                >
                  {userRole === 'student' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-3 flex items-center gap-1.5">
                          <BookOpen size={12} /> {language === 'en' ? 'Select Class' : 'ଶ୍ରେଣୀ ବାଛନ୍ତୁ'}
                        </label>
                        <div className="relative group">
                          <select 
                            value={selectedClass} 
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full py-3.5 pl-4 pr-10 bg-slate-950/80 border-2 border-slate-600 hover:border-amber-500 focus:border-amber-400 rounded-2xl text-white text-xs font-bold outline-none focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] appearance-none transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                          >
                            <option className="bg-[#0b0f19]">{t.selectClass} *</option>
                            {Object.entries(t.classes).map(([k,v]) => <option key={k} value={k} className="bg-[#0b0f19]">{v as string}</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-amber-400 group-focus-within:text-amber-400 transition-colors">
                            <ChevronRight size={16} className="transform rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-3 flex items-center gap-1.5">
                          <Globe size={12} /> {language === 'en' ? 'Select Board' : 'ବୋର୍ଡ ବାଛନ୍ତୁ'}
                        </label>
                        <div className="relative group">
                          <select 
                            value={selectedBoard} 
                            onChange={(e) => setSelectedBoard(e.target.value)}
                            className="w-full py-3.5 pl-4 pr-10 bg-slate-950/80 border-2 border-slate-600 hover:border-amber-500 focus:border-amber-400 rounded-2xl text-white text-xs font-bold outline-none focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] appearance-none transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                          >
                            <option className="bg-[#0b0f19]">{t.selectBoard} *</option>
                            {t.boards && Object.entries(t.boards).map(([k,v]) => <option key={k} value={k} className="bg-[#0b0f19]">{v as string}</option>)}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-amber-400 group-focus-within:text-amber-400 transition-colors">
                            <ChevronRight size={16} className="transform rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-3 flex items-center gap-1.5">
                      <Phone size={12} /> {language === 'en' ? 'Mobile Number' : 'ମୋବାଇଲ୍ ନମ୍ବର'}
                    </label>
                    <div className="flex gap-2.5">
                      <div className="px-4 py-3.5 bg-slate-950/80 border-2 border-slate-600 rounded-2xl text-amber-400 text-xs font-black flex items-center justify-center shadow-inner">
                        <span>+91</span>
                      </div>
                      <input 
                        type="tel" 
                        ref={phoneInputRef}
                        defaultValue={phoneNumber}
                        placeholder={t.enterPhone}
                        inputMode="numeric"
                        autoComplete="tel"
                        className="flex-1 py-3.5 px-5 bg-slate-950/80 border-2 border-slate-600 hover:border-amber-500 focus:border-amber-400 rounded-2xl text-white text-xs font-black outline-none focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] placeholder:text-slate-600 transition-all shadow-inner" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={onSmsSend} 
                    disabled={isSending} 
                    className={`w-full group py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                      userRole === 'admin' 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40' 
                        : userRole === 'teacher' 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40' 
                        : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/40'
                    }`}
                  >
                    {isSending ? <Loader2 className="animate-spin" size={18} /> : <>{t.sendOtp || 'Continue'} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
                  </button>

                  {showJudgePass && (
                    <>
                      <div className="relative py-1 flex items-center justify-center">
                        <div className="h-px bg-white/10 w-full" />
                        <span className="absolute bg-[#0f172a] px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-full border border-white/10 py-1">
                          {language === 'en' ? 'OR' : 'କିମ୍ବା'}
                        </span>
                      </div>

                      {/* HACKATHON DEMO FAST-PASS PANEL */}
                      <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 space-y-2 text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-400 animate-pulse" />
                          <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                            {language === 'en' ? 'Judge Fast-Pass Access' : 'ଜଜ୍ ଫାଷ୍ଟ-ପାସ୍ ପ୍ରବେଶ'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal font-bold">
                          {language === 'en' ? 'Select a test account below for instant, one-click automated login (bypasses reCAPTCHA & SMS waiting).' : 'ବିନା SMS ଅପେକ୍ଷା ଓ reCAPTCHA ରେ ତୁରନ୍ତ ଲଗଇନ୍ କରିବା ପାଇଁ ଚୟନ କରନ୍ତୁ |'}
                        </p>
                        <div className="flex flex-col pt-1">
                          <button
                            type="button"
                            onClick={handleLaunchGuidedTour}
                            disabled={isSending}
                            className="w-full mb-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border border-amber-400/30 hover:border-amber-300 text-xs font-black text-white hover:text-white transition-all flex items-center justify-between group active:scale-95 cursor-pointer shadow-lg shadow-amber-900/20"
                          >
                            <span className="flex items-center gap-2">
                              <Sparkles size={14} className="animate-spin" />
                              {language === 'en' ? '🌟 Launch Guided Judge Tour' : '🌟 ଜଜ୍ ଗାଇଡେଡ୍ ଟୁର୍ ଆରମ୍ଭ କରନ୍ତୁ'}
                            </span>
                            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-all text-white" />
                          </button>
                          {TEST_ACCOUNTS.map((acc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleFastPassLogin(acc)}
                              disabled={isSending}
                              className="w-full py-3 px-4 rounded-xl bg-black/40 hover:bg-[#b34d1f]/10 border border-white/5 hover:border-amber-500/30 text-xs font-black text-slate-200 hover:text-amber-300 transition-all flex items-center justify-between group active:scale-95 cursor-pointer shadow-inner"
                            >
                              <span>{language === 'en' ? 'Log in as Student (Class 10)' : 'ଛାତ୍ର ଭାବରେ ତୁରନ୍ତ ଲଗଇନ୍ କରନ୍ତୁ (ଦଶମ ଶ୍ରେଣୀ)'}</span>
                              <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-400 animate-pulse" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleGoogleLogin}
                    className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 crystal-button-sapphire text-white shadow-xl hover:shadow-blue-500/30 active:scale-95 cursor-pointer group"
                  >
                    <div className="bg-white p-1 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span className="tracking-[0.15em]">{language === 'en' ? 'Continue with Google' : 'ଗୁଗଲ୍ ସହିତ ଆଗକୁ ବଢନ୍ତୁ'}</span>
                  </button>
                </motion.div>
              ) : (
                <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 text-center">
                  <Sparkles className="text-amber-400 mx-auto animate-pulse" size={48} />
                  <h2 className="text-white text-2xl font-black tracking-tight font-['Outfit']">
                    {language === 'en' ? 'Verify Security Code' : 'ସୁରକ୍ଷା କୋଡ୍ ଯାଞ୍ଚ କରନ୍ତୁ'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {language === 'en' ? 'Code dispatched to ' : 'କୋଡ୍ ପଠାଯାଇଛି: '}
                    <span className="text-amber-400 font-bold">{phoneNumber}</span>
                  </p>
                  <input 
                    type="text" 
                    maxLength={6} 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    placeholder="••••••" 
                    className="w-full py-4 px-6 bg-black/40 border border-amber-500/40 rounded-2xl text-center text-2xl font-black text-amber-400 tracking-widest outline-none focus:border-amber-400 focus:shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                  />
                  <button 
                    onClick={verifyOtp} 
                    disabled={isSending}
                    className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSending ? <Loader2 className="animate-spin" size={18} /> : (language === 'en' ? 'Verify Code' : 'କୋଡ୍ ଯାଞ୍ଚ କରନ୍ତୁ')}
                  </button>
                  <button onClick={() => setAuthStep('login')} className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mx-auto hover:text-slate-300 transition-colors">
                    <ArrowLeft size={12} /> {language === 'en' ? 'Change Phone Number' : 'ମୋବାଇଲ୍ ନମ୍ବର ବଦଳାନ୍ତୁ'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* 4. FOOTER: Social Media & Glowing System Online Status */}
      <footer className="w-full max-w-md flex flex-col items-center gap-3 z-20 pb-1">
        {/* Social Media Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <a href={YOUTUBE_CHANNEL_URL} target={socialLinkTarget} rel={socialLinkRel} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all shadow-md active:scale-95">
            <Youtube size={16} />
          </a>
          <a href={INSTAGRAM_PROFILE_URL} target={socialLinkTarget} rel={socialLinkRel} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-pink-500/10 border border-white/10 hover:border-pink-500/30 flex items-center justify-center text-slate-400 hover:text-pink-500 transition-all shadow-md active:scale-95">
            <Instagram size={16} />
          </a>
          <a href={FACEBOOK_PROFILE_URL} target={socialLinkTarget} rel={socialLinkRel} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all shadow-md active:scale-95">
            <Facebook size={16} />
          </a>
        </motion.div>

        {/* Emerald Live Indicator */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[9px] font-black tracking-[0.25em] text-emerald-400 uppercase font-['Outfit']">
            {language === 'en' ? 'Utkal System Online' : 'ଉତ୍କଳ ସିଷ୍ଟମ୍ ସକ୍ରିୟ'}
          </span>
        </div>
      </footer>

    </div>
  );
}
