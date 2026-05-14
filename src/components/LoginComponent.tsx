import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Loader2, Globe, ArrowLeft, Shield, ChevronRight, Sparkles, Youtube, Instagram, Facebook, BookOpen } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getDeferredPrompt, clearDeferredPrompt } from '../pwa';

const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      fill="currentColor"
      d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.5 0 .16 5.33.16 11.88c0 2.1.55 4.14 1.6 5.95L0 24l6.36-1.67a11.84 11.84 0 0 0 5.68 1.44h.01c6.55 0 11.89-5.33 11.89-11.89 0-3.17-1.23-6.15-3.42-8.4ZM12.05 21.77h-.01a9.84 9.84 0 0 1-5.02-1.38l-.36-.21-3.78.99 1.01-3.69-.23-.38a9.8 9.8 0 0 1-1.5-5.22C2.16 6.43 6.59 2 12.05 2c2.63 0 5.1 1.02 6.96 2.89a9.79 9.79 0 0 1 2.88 6.98c0 5.45-4.44 9.9-9.84 9.9Zm5.42-7.39c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.13 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z"
    />
  </svg>
);

const PlayStoreIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3.5 2.5 13.9 12 3.5 21.5" fill="#34A853" />
    <path d="M13.9 12 18 8.25c1.46 1 2.42 1.67 2.42 1.67.78.55.78 1.6 0 2.16 0 0-.96.67-2.42 1.67L13.9 12Z" fill="#FBBC04" />
    <path d="M3.5 2.5 18 8.25 13.9 12 3.5 2.5Z" fill="#4285F4" />
    <path d="M3.5 21.5 13.9 12 18 15.75 3.5 21.5Z" fill="#EA4335" />
  </svg>
);

const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@UtkalSkillCenter';
const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCvAH31iUxgGopHZ724';
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/utkalskillcentre?igsh=aDBwdnNwNzJndDAx';
const FACEBOOK_PROFILE_URL = 'https://www.facebook.com/share/18URKVYWdm/';
const SOCIAL_ORIGINS = [
  new URL(YOUTUBE_CHANNEL_URL).origin,
  new URL(WHATSAPP_CHANNEL_URL).origin,
  new URL(INSTAGRAM_PROFILE_URL).origin,
  new URL(FACEBOOK_PROFILE_URL).origin,
];

export default function Login({ language, translations, setLanguage, setRegData }: { language: 'en' | 'or', translations: any, setLanguage: (lang: 'en' | 'or') => void, setRegData: (data: any) => void }): React.ReactElement {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');
  const [isSending, setIsSending] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  
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
  const shouldShowInstallButton = !isAdminLogin && !isStandaloneMode;
  const canInstallApp = Boolean(deferredPrompt || getDeferredPrompt());

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Check for existing prompt
    const existingPrompt = getDeferredPrompt();
    if (existingPrompt) setDeferredPrompt(existingPrompt);

    // Listen for PWA Install Prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    const pwaHandler = () => {
      setDeferredPrompt(getDeferredPrompt());
    };

    const handleInstalled = () => {
      clearDeferredPrompt();
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('pwa-prompt-available', pwaHandler);
    window.addEventListener('appinstalled', handleInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa-prompt-available', pwaHandler);
      window.removeEventListener('appinstalled', handleInstalled);
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
      class: userRole === 'teacher' && !selectedClass ? '10' : selectedClass, 
      board: userRole === 'teacher' && !selectedBoard ? 'BSE Odisha' : selectedBoard,
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
    if (!isAdminLogin && userRole === 'student' && (!selectedClass || !selectedBoard)) {
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

  const handleAdminEmailLogin = async () => {
    // Admin login logic placeholder
    console.log("Admin login attempt", adminEmail, adminPassword);
    setAdminLoginError("Admin login not implemented yet.");
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
    if (!isAdminLogin && userRole === 'student' && (!selectedClass || !selectedBoard)) return alert(translations[language].requiredFieldsError);

    if (!isAdminLogin) {
      syncSelectedAcademicInfo();
    }

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

      if (!isAdminLogin && userRole === 'student') {
        try {
          const lockDoc = await getDoc(doc(db, 'user_locks', formattedNumber));
          if (lockDoc.exists()) {
            const lockData = lockDoc.data();
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
        } catch (lockError: any) {
          if (lockError?.code !== 'permission-denied' && lockError?.code !== 'failed-precondition') {
            console.warn('Lock check skipped due to read error:', lockError);
          }
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
    <div className="digital-altar-bg w-full min-h-full flex flex-col items-center justify-between p-6">
      
      {/* 1. THE IMPOSSIBLE BACKGROUND: Animated Temple Watermark */}
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.05, 0.08, 0.05] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute inset-0 z-0 flex items-center justify-center"
      >
        <img src="/temple-pattern.png" className="h-[90%] w-auto grayscale sepia" alt="" />
      </motion.div>

      {/* 2. TOP: Minimalist Utility Bar */}
      <div className="w-full flex justify-between items-start z-20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
          <span className="text-white/30 text-[8px] font-black tracking-[0.4em] uppercase">System Online</span>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <a
              href={FACEBOOK_PROFILE_URL}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre Facebook page"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/25 bg-blue-500/15 text-blue-200 transition-all hover:bg-blue-500/25 hover:text-white"
            >
              <Facebook size={18} />
            </a>
            <a
              href={INSTAGRAM_PROFILE_URL}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre Instagram profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-400/25 bg-pink-500/15 text-pink-200 transition-all hover:bg-pink-500/25 hover:text-white"
            >
              <Instagram size={18} />
            </a>
            <a
              href={WHATSAPP_CHANNEL_URL}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre WhatsApp channel"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15 text-emerald-200 transition-all hover:bg-emerald-500/25 hover:text-white"
            >
              <WhatsAppIcon size={18} />
            </a>
            <a
              href={YOUTUBE_CHANNEL_URL}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre YouTube channel"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/25 bg-red-500/15 text-red-200 transition-all hover:bg-red-500/25 hover:text-white"
            >
              <Youtube size={18} />
            </a>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'or' : 'en')} 
              className="glass-marble px-4 py-2 rounded-full text-[10px] font-black text-[#ffd700] flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform"
            >
              <Globe size={12} className="text-[#ffd700]" />
              {language === 'en' ? 'ଓଡ଼ିଆ' : 'ENGLISH'}
            </button>
          </div>

          {shouldShowInstallButton && (
            <button
              onClick={handleInstallClick}
              title={canInstallApp ? 'Install app' : 'Install prompt will appear when supported by the browser'}
              className={`flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#000033] shadow-[0_10px_30px_rgba(255,255,255,0.18)] transition-all hover:scale-105 hover:border-slate-300 hover:text-[#000022] hover:shadow-[0_14px_36px_rgba(255,255,255,0.24)] active:scale-95 ${canInstallApp ? '' : 'opacity-85'}`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
                <PlayStoreIcon size={12} />
              </span>
              {language === 'en' ? 'Install App' : 'ଇନଷ୍ଟଲ୍ କରନ୍ତୁ'}
            </button>
          )}
        </div>
      </div>

      {/* 3. CENTER: The Altar Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[340px] z-10 gap-6">
        
        {/* LOGO SECTION - Restored Size with Hidden Admin Trigger */}
        <div 
          className="relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
          onClick={() => {
            const now = Date.now();
            const timeDiff = now - (window as any)._lastLogoClick || 0;
            if (timeDiff < 500) {
              (window as any)._logoClickCount = ((window as any)._logoClickCount || 0) + 1;
              if ((window as any)._logoClickCount >= 3) {
                setIsAdminLogin(true);
                (window as any)._logoClickCount = 0;
              }
            } else {
              (window as any)._logoClickCount = 1;
            }
            (window as any)._lastLogoClick = now;
          }}
        >
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full scale-150 pointer-events-none" />
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            src="/utkal-512.png" 
            className="h-24 w-auto relative z-10 drop-shadow-[0_0_20px_rgba(255,215,0,0.2)]" 
            style={{ mixBlendMode: 'multiply' }} 
            alt="Utkal" 
          />
          <h1 className="text-white text-4xl font-black tracking-tighter mt-2 uppercase leading-none font-['Outfit']">UTKAL</h1>
          <p className="text-[#ffd700] text-[9px] font-black tracking-[0.6em] uppercase opacity-70 mt-1 font-['Outfit']">Skill Centre</p>
        </div>

        {/* WELCOME MESSAGE */}
        <div className="w-full text-center">
          <AnimatePresence mode="wait">
            <motion.div key={language} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 className="text-white text-3xl font-[1000] leading-tight tracking-tight px-2">
                {language === 'en' ? 'Join the ' : 'ସାମିଲ ହୁଅନ୍ତୁ ' }
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] to-[#b34d1f]">
                  {language === 'en' ? 'AI Era' : 'AI ଯୁଗରେ'}
                </span>
              </h2>
              <p className="text-[#f8f1e7]/30 text-[9px] font-black uppercase tracking-[0.4em] mt-3 flex items-center justify-center gap-2">
                <span className="h-[1px] w-4 bg-white/10" />
                {language === 'en' ? 'Personalized Learning' : 'ଆପଣଙ୍କ ପାଇଁ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷା'}
                <span className="h-[1px] w-4 bg-white/10" />
              </p>

              {/* Congratulatory Message */}
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-[#ffd700] text-[10px] font-bold text-center px-4"
              >
                🎊 {t.congratsMessage} 🎓
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ROLE SELECTOR TABS */}
        <div className="w-full grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          <button
            type="button"
            onClick={() => setUserRole('student')}
            className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              userRole === 'student' 
                ? 'bg-gradient-to-r from-[#b34d1f] to-[#d97706] text-white shadow-lg shadow-[#b34d1f]/30' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            👨‍🎓 {language === 'en' ? 'Student' : 'ଛାତ୍ର'}
          </button>
          <button
            type="button"
            onClick={() => setUserRole('teacher')}
            className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              userRole === 'teacher' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30' 
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            👨‍🏫 {language === 'en' ? 'Teacher' : 'ଶିକ୍ଷକ'}
          </button>
        </div>

        {/* The Glass Inputs (Marble Style) */}
        <div className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {authStep === 'login' ? (
              <motion.div 
                key="login" 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="w-full space-y-4"
              >
                {!isAdminLogin ? (
                  <>
                    {userRole === 'student' && (
                      <>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-[#ffd700]/60 uppercase tracking-[0.2em] ml-4 mb-1">
                            {language === 'en' ? 'Step 1: Select Class' : 'ପର୍ଯ୍ୟାୟ ୧: ଶ୍ରେଣୀ ବାଛନ୍ତୁ'}
                          </p>
                          <motion.div whileTap={{ scale: 0.98 }} className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#ffd700]/40 group-focus-within:text-[#ffd700] transition-colors">
                              <BookOpen size={16} />
                            </div>
                            <select 
                              value={selectedClass} 
                              onChange={(e) => setSelectedClass(e.target.value)}
                              className="glass-marble w-full py-4 pl-14 pr-6 rounded-[1.5rem] text-white text-xs font-bold outline-none appearance-none"
                            >
                              <option className="bg-[#050a0b]">{t.selectClass} *</option>
                              {Object.entries(t.classes).map(([k,v]) => <option key={k} value={k} className="bg-[#050a0b]">{v as string}</option>)}
                            </select>
                          </motion.div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-[#ffd700]/60 uppercase tracking-[0.2em] ml-4 mb-1">
                            {language === 'en' ? 'Step 2: Select Board' : 'ପର୍ଯ୍ୟାୟ ୨: ବୋର୍ଡ ବାଛନ୍ତୁ'}
                          </p>
                          <motion.div whileTap={{ scale: 0.98 }} className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#ffd700]/40 group-focus-within:text-[#ffd700] transition-colors">
                              <Globe size={16} />
                            </div>
                            <select 
                              value={selectedBoard} 
                              onChange={(e) => setSelectedBoard(e.target.value)}
                              className="glass-marble w-full py-4 pl-14 pr-6 rounded-[1.5rem] text-white text-xs font-bold outline-none appearance-none"
                            >
                              <option className="bg-[#050a0b]">{t.selectBoard} *</option>
                              {t.boards && Object.entries(t.boards).map(([k,v]) => <option key={k} value={k} className="bg-[#050a0b]">{v as string}</option>)}
                            </select>
                          </motion.div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-[#ffd700]/60 uppercase tracking-[0.2em] ml-4 mb-1">
                        {userRole === 'student' ? (language === 'en' ? 'Step 3: Mobile Number' : 'ପର୍ଯ୍ୟାୟ ୩: ମୋବାଇଲ୍ ନମ୍ବର') : (language === 'en' ? 'Enter Mobile Number' : 'ମୋବାଇଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ')}
                      </p>
                      <div className="flex gap-3">
                        <div className="glass-marble px-5 py-4 rounded-[1.5rem] text-[#ffd700] text-xs font-black flex items-center gap-2">
                          <Phone size={14} />
                          <span>+91</span>
                        </div>
                        <input 
                          type="tel" 
                          ref={phoneInputRef}
                          defaultValue={phoneNumber}
                          placeholder={t.enterPhone}
                          inputMode="numeric"
                          autoComplete="tel"
                          className="glass-marble flex-1 py-4 px-6 rounded-[1.5rem] text-white text-xs font-black outline-none placeholder:text-white/20" 
                        />
                      </div>
                    </div>

                    <button onClick={onSmsSend} disabled={isSending} className={`w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 ${userRole === 'teacher' ? 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-900/30' : 'crystal-button-gold'}`}>
                      <span className="relative z-10 text-white font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase">
                        {isSending ? <Loader2 className="animate-spin" /> : <>{t.sendOtp || 'Continue'} <ChevronRight size={16} /></>}
                      </span>
                    </button>

                    <div className="relative py-2 flex items-center justify-center">
                      <div className="h-px bg-white/10 w-full" />
                      <span className="absolute bg-[#0B0F19] px-4 text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">
                        {language === 'en' ? 'OR' : 'କିମ୍ବା'}
                      </span>
                    </div>

                    <button
                      onClick={handleGoogleLogin}
                      disabled={userRole === 'student' && (!selectedClass || !selectedBoard)}
                      className={`w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 ${userRole === 'student' && (!selectedClass || !selectedBoard) ? 'bg-white/5 border border-white/10 cursor-not-allowed' : 'crystal-button-sapphire'}`}
                    >
                      <span className={`relative z-10 font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase ${userRole === 'student' && (!selectedClass || !selectedBoard) ? 'text-white/20' : 'text-white'}`}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {language === 'en' ? 'Continue with Google' : 'ଗୁଗଲ୍ ସହିତ ଆଗକୁ ବଢନ୍ତୁ'}
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <button onClick={handleGoogleLogin} className="w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 shadow-[0_20px_50px_rgba(179,77,31,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#b34d1f] via-[#d97706] to-[#b34d1f] group-hover:scale-110 transition-transform duration-500" />
                      <span className="relative z-10 text-white font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase">Login with Google</span>
                    </button>
                    
                    <div className="flex gap-3">
                      <div className="glass-marble px-5 py-4 rounded-[1.5rem] text-[#ffd700] text-xs font-black flex items-center gap-2">
                        <Phone size={14} />
                        <span>+91</span>
                      </div>
                      <input 
                        type="tel" 
                        ref={phoneInputRef}
                        defaultValue={phoneNumber}
                        placeholder="Phone Number" 
                        inputMode="numeric"
                        autoComplete="tel"
                        className="glass-marble flex-1 py-4 px-6 rounded-[1.5rem] text-white text-xs font-black outline-none placeholder:text-white/20" 
                      />
                    </div>

                    <div id="recaptcha-container" ref={recaptchaDomRef} className="my-3 flex justify-center w-full overflow-hidden"></div>

                    <button onClick={onSmsSend} disabled={isSending} className="w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 shadow-[0_20px_50px_rgba(179,77,31,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#b34d1f] via-[#d97706] to-[#b34d1f] group-hover:scale-110 transition-transform duration-500" />
                      <span className="relative z-10 text-white font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase">
                        {isSending ? <Loader2 className="animate-spin" /> : 'Send OTP'}
                      </span>
                    </button>

                    <button onClick={() => setIsAdminLogin(false)} className="w-full py-3 rounded-2xl border border-white/20 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">Back to Student</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6 text-center">
                <Sparkles className="text-[#ffd700] mx-auto animate-pulse" size={48} />
                <h2 className="text-white text-2xl font-black">Verify OTP</h2>
                <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="glass-marble w-full py-4 px-6 rounded-[1.5rem] text-center text-2xl font-black text-white outline-none" />
                <button onClick={verifyOtp} className="w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 shadow-[0_20px_50px_rgba(179,77,31,0.3)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#b34d1f] via-[#d97706] to-[#b34d1f] group-hover:scale-110 transition-transform duration-500" />
                  <span className="relative z-10 text-white font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase">VERIFY</span>
                </button>
                <button onClick={() => setAuthStep('login')} className="text-[10px] text-white/40 font-bold flex items-center gap-1 mx-auto hover:text-white transition-colors">
                  <ArrowLeft size={10} /> Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. FOOTER: Integrated & Tiny */}
      <div className="w-full flex flex-col items-center gap-4 z-10 pb-4">
        <div className="w-full h-1" />
        
        <div className="flex flex-col items-center opacity-20 scale-75">
          <p className="text-[7px] font-black uppercase tracking-[0.6em] text-[#ffd700]">Pride Association of Bigsan Group</p>
        </div>
      </div>
    </div>
  );
}
