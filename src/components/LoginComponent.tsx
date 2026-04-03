import React, { useState, useRef, useEffect } from 'react';
import { auth, signInWithGoogle } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Loader2, Globe, ArrowLeft, Shield, ChevronRight, Sparkles, Download } from 'lucide-react';
import { getDeferredPrompt, clearDeferredPrompt } from '../pwa';

export default function Login({ language, translations, setLanguage, setRegData }: { language: 'en' | 'or', translations: any, setLanguage: (lang: 'en' | 'or') => void, setRegData: (data: any) => void }) {
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

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || getDeferredPrompt();
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      clearDeferredPrompt();
      setDeferredPrompt(null);
    }
  };

  const handleGoogleLogin = async () => {
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

  const onSmsSend = async () => {
    if (!phoneNumber || phoneNumber.length < 10) return alert("Please enter valid phone");
    if (!isAdminLogin && (!selectedClass || !selectedBoard)) return alert("Please select class and board");
    setIsSending(true);
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }
    try {
      const confirmation = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, recaptchaVerifier.current);
      setVerificationId(confirmation);
      setAuthStep('otp');
    } catch (error: any) {
      console.error(error);
      if (recaptchaVerifier.current) recaptchaVerifier.current.clear();
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
      <div className="w-full flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
          <span className="text-white/30 text-[8px] font-black tracking-[0.4em] uppercase">System Online</span>
        </div>
        <button onClick={() => setLanguage(language === 'en' ? 'or' : 'en')} className="glass-marble px-4 py-2 rounded-full text-[10px] font-black text-[#ffd700]">
          {language === 'en' ? 'ENGLISH' : 'ଓଡ଼ିଆ'}
        </button>
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

                    <button onClick={handleGoogleLogin} className="w-full py-3 rounded-2xl text-white/30 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors">
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
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick} 
                className="flex items-center gap-2 bg-[#ffd700] text-[#0b1719] px-6 py-2.5 rounded-full shadow-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                <Download size={14} /> {language === 'en' ? 'Install App' : 'ଇନଷ୍ଟଲ୍ କରନ୍ତୁ'}
              </button>
            )}
            
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
