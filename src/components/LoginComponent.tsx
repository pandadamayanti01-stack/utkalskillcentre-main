import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Loader2, Globe, ArrowLeft, Shield, ChevronRight, Sparkles, Youtube, Instagram, Facebook } from 'lucide-react';
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

export default function Login({ language, translations, setLanguage, setRegData }: { language: 'en' | 'or', translations: any, setLanguage: (lang: 'en' | 'or') => void, setRegData: (data: any) => void }) {
  const youtubeChannelUrl = 'https://www.youtube.com/channel/UCVsuuu7DyRY4-qbn8PrVBhg';
  const whatsappChannelUrl = 'https://whatsapp.com/channel/0029VbCvAH31iUxgGopHZ724';
  const instagramProfileUrl = 'https://www.instagram.com/utkalskillcentre?igsh=aDBwdnNwNzJndDAx';
  const facebookProfileUrl = 'https://www.facebook.com/share/18URKVYWdm/';
  const socialOrigins = [new URL(youtubeChannelUrl).origin, new URL(whatsappChannelUrl).origin, new URL(instagramProfileUrl).origin, new URL(facebookProfileUrl).origin];
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');

  useEffect(() => {
    setRegData({ class: selectedClass, board: selectedBoard });
  }, [selectedClass, selectedBoard, setRegData]);
  const [isSending, setIsSending] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const recaptchaVerifier = useRef<any>(null);
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

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('pwa-prompt-available', pwaHandler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa-prompt-available', pwaHandler);
    };
  }, []);

  useEffect(() => {
    const injectedLinks = socialOrigins.flatMap((origin) => {
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
  }, [socialOrigins]);

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

  const handleGoogleLogin = async () => {
    if (!isAdminLogin && (!selectedClass || !selectedBoard)) {
      alert(translations[language].requiredFieldsError);
      return;
    }
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
    if (!phoneNumber || phoneNumber.length < 10) return alert("Please enter valid phone");
    if (!isAdminLogin && (!selectedClass || !selectedBoard)) return alert(translations[language].requiredFieldsError);

    setIsSending(true);
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }

    try {
      const formattedNumber = normalizePhoneNumber(phoneNumber);

      if (!isAdminLogin) {
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
          // user_locks may be protected before auth; continue OTP and enforce class/board after login.
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
    <div className="digital-altar-bg w-full flex flex-col items-center justify-between p-6">
      
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
              href={facebookProfileUrl}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre Facebook page"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/25 bg-blue-500/15 text-blue-200 transition-all hover:bg-blue-500/25 hover:text-white"
            >
              <Facebook size={18} />
            </a>
            <a
              href={instagramProfileUrl}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre Instagram profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-400/25 bg-pink-500/15 text-pink-200 transition-all hover:bg-pink-500/25 hover:text-white"
            >
              <Instagram size={18} />
            </a>
            <a
              href={whatsappChannelUrl}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre WhatsApp channel"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/15 text-emerald-200 transition-all hover:bg-emerald-500/25 hover:text-white"
            >
              <WhatsAppIcon size={18} />
            </a>
            <a
              href={youtubeChannelUrl}
              target={socialLinkTarget}
              rel={socialLinkRel}
              aria-label="Utkal Skill Centre YouTube channel"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/25 bg-red-500/15 text-red-200 transition-all hover:bg-red-500/25 hover:text-white"
            >
              <Youtube size={18} />
            </a>
            <button onClick={() => setLanguage(language === 'en' ? 'or' : 'en')} className="glass-marble px-4 py-2 rounded-full text-[10px] font-black text-[#ffd700]">
              {language === 'en' ? 'ENGLISH' : 'ଓଡ଼ିଆ'}
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
        
        {/* LOGO SECTION - Restored Size */}
        <div className="relative flex flex-col items-center">
          <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full scale-150 pointer-events-none" />
          <motion.img 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            src="/utkal-512.png" 
            className="h-24 w-auto relative z-10 drop-shadow-[0_0_20px_rgba(255,215,0,0.2)]" 
            style={{ mixBlendMode: 'multiply' }} 
            alt="Utkal" 
          />
          <h1 className="text-white text-4xl font-black tracking-tighter mt-2 uppercase leading-none">UTKAL</h1>
          <p className="text-[#ffd700] text-[9px] font-bold tracking-[0.6em] uppercase opacity-50 mt-1">Skill Centre</p>
        </div>

        {/* WELCOME MESSAGE - RESTORED */}
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
            </motion.div>
          </AnimatePresence>
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
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <select 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="glass-marble w-full py-4 px-6 rounded-[1.5rem] text-white text-xs font-bold outline-none appearance-none"
                      >
                        <option className="bg-[#050a0b]">{t.selectClass} *</option>
                        {Object.entries(t.classes).map(([k,v]) => <option key={k} value={k} className="bg-[#050a0b]">{v as string}</option>)}
                      </select>
                    </motion.div>

                    <motion.div whileTap={{ scale: 0.98 }}>
                      <select 
                        value={selectedBoard} 
                        onChange={(e) => setSelectedBoard(e.target.value)}
                        className="glass-marble w-full py-4 px-6 rounded-[1.5rem] text-white text-xs font-bold outline-none appearance-none"
                      >
                        <option className="bg-[#050a0b]">{t.selectBoard} *</option>
                        {t.boards && Object.entries(t.boards).map(([k,v]) => <option key={k} value={k} className="bg-[#050a0b]">{v as string}</option>)}
                      </select>
                    </motion.div>

                    <div className="flex gap-3">
                      <div className="glass-marble px-5 py-4 rounded-[1.5rem] text-[#ffd700] text-xs font-black">+91</div>
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={t.enterPhone}
                        className="glass-marble flex-1 py-4 px-6 rounded-[1.5rem] text-white text-xs font-black outline-none placeholder:text-white/10" 
                      />
                    </div>

                    <button onClick={onSmsSend} disabled={isSending} className="w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 shadow-[0_20px_50px_rgba(179,77,31,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#b34d1f] via-[#d97706] to-[#b34d1f] group-hover:scale-110 transition-transform duration-500" />
                      <span className="relative z-10 text-white font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase">
                        {isSending ? <Loader2 className="animate-spin" /> : <>{t.sendOtp || 'Continue'} <ChevronRight size={16} /></>}
                      </span>
                    </button>

                    <button
                      onClick={handleGoogleLogin}
                      disabled={!selectedClass || !selectedBoard}
                      className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-colors ${!selectedClass || !selectedBoard ? 'text-white/20 bg-white/5 cursor-not-allowed' : 'text-white/30 hover:text-white'}`}
                    >
                      {language === 'en' ? 'Continue with Google' : 'ଗୁଗଲ୍ ସହିତ ଆଗକୁ ବଢନ୍ତୁ'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <button onClick={handleGoogleLogin} className="w-full group relative py-4 rounded-[1.5rem] overflow-hidden transition-all active:scale-95 shadow-[0_20px_50px_rgba(179,77,31,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#b34d1f] via-[#d97706] to-[#b34d1f] group-hover:scale-110 transition-transform duration-500" />
                      <span className="relative z-10 text-white font-black text-xs tracking-[0.2em] flex items-center justify-center gap-2 uppercase">Login with Google</span>
                    </button>
                    
                    <div className="flex gap-3">
                      <div className="glass-marble px-5 py-4 rounded-[1.5rem] text-[#ffd700] text-xs font-black">+91</div>
                      <input 
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Phone Number" 
                        className="glass-marble flex-1 py-4 px-6 rounded-[1.5rem] text-white text-xs font-black outline-none placeholder:text-white/10" 
                      />
                    </div>
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
        {!isAdminLogin && (
          <div className="flex flex-col gap-3 items-center">
            <button onClick={() => setIsAdminLogin(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] hover:text-[#ffd700] transition-all">
              <Shield size={10} /> Admin Portal
            </button>
          </div>
        )}
        
        <div className="flex flex-col items-center opacity-20 scale-75">
          <p className="text-[7px] font-black uppercase tracking-[0.6em] text-[#ffd700]">Pride Association of Bigsan Group</p>
        </div>
      </div>

      {/* Recaptcha container hidden */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
