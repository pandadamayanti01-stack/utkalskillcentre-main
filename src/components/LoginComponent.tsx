import React, { useState, useRef, useEffect } from 'react';
import { auth, signInWithGoogle } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Shield, ChevronRight, Sparkles, Download } from 'lucide-react';

export default function Login({ language, translations, setLanguage }: any) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const recaptchaVerifier = useRef<any>(null);
  const t = translations[language];

  useEffect(() => { 
    window.scrollTo(0, 0); 
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const onSmsSend = async () => {
    if (!phoneNumber || phoneNumber.length < 10) return alert("Valid phone required");
    if (!isAdminLogin && (!selectedClass || !selectedBoard)) return alert("Select class/board");
    setIsSending(true);
    if (!recaptchaVerifier.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }
    try {
      const confirmation = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, recaptchaVerifier.current);
      setVerificationId(confirmation);
      setAuthStep('otp');
    } catch (error) { alert("SMS failed. Try again."); } finally { setIsSending(false); }
  };

  const verifyOtp = async () => {
    if (otp.length < 6) return alert("Enter 6-digit OTP");
    setIsSending(true);
    try { await verificationId.confirm(otp); } catch (error) { alert("Invalid OTP"); } finally { setIsSending(false); }
  };

  return (
    <div className="digital-altar-bg h-[100dvh] w-full flex flex-col items-center justify-between p-6 overflow-hidden relative">
      
      {/* 1. BACKGROUND */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
        <img src="/temple-pattern.png" className="h-[80%] w-auto grayscale" alt="" />
      </div>

      {/* 2. TOP NAV */}
      <div className="w-full flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-white/20 text-[8px] font-black tracking-[0.3em] uppercase">System Online</span>
        </div>
        <button onClick={() => setLanguage(language === 'en' ? 'or' : 'en')} className="glass-marble px-4 py-1.5 rounded-full text-[9px] font-black text-[#ffd700]">
          {language === 'en' ? 'ଓଡ଼ିଆ' : 'ENGLISH'}
        </button>
      </div>

      {/* 3. CENTER CONTENT (The "Altar") */}
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

        {/* FORM CONTAINER */}
        <div className="w-full space-y-3.5">
          <AnimatePresence mode="wait">
            {authStep === 'login' ? (
              <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                {!isAdminLogin ? (
                  <>
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="glass-marble w-full py-3.5 px-5 rounded-2xl text-white text-xs font-bold outline-none appearance-none">
                      <option className="bg-[#050a0b]">{t.selectClass} *</option>
                      {Object.entries(t.classes).map(([k,v]) => <option key={k} value={k} className="bg-[#050a0b]">{v as string}</option>)}
                    </select>
                    <select value={selectedBoard} onChange={(e) => setSelectedBoard(e.target.value)} className="glass-marble w-full py-3.5 px-5 rounded-2xl text-white text-xs font-bold outline-none appearance-none">
                      <option className="bg-[#050a0b]">{t.selectBoard} *</option>
                      {t.boards && Object.entries(t.boards).map(([k,v]) => <option key={k} value={k} className="bg-[#050a0b]">{v as string}</option>)}
                    </select>
                  </>
                ) : null}

                <div className="flex gap-2">
                  <div className="glass-marble px-5 py-3.5 rounded-2xl text-[#ffd700] text-xs font-black">+91</div>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder={t.enterPhone} className="glass-marble flex-1 py-3.5 px-5 rounded-2xl text-white text-xs font-black outline-none placeholder:text-white/10" />
                </div>

                <button onClick={onSmsSend} className="w-full bg-gradient-to-r from-[#b34d1f] to-[#e67e22] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                  {isSending ? <Loader2 className="animate-spin mx-auto" /> : <>{t.sendOtp} <ChevronRight size={14} className="inline ml-1" /></>}
                </button>
                
                <button onClick={() => signInWithGoogle()} className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-white/30 text-[10px] font-black uppercase flex items-center justify-center gap-2">
                   <img src="https://www.google.com/favicon.ico" className="w-3.5 h-3.5" alt="" /> 
                   {isAdminLogin ? 'Admin Google Access' : (language === 'en' ? 'Google Login' : 'ଗୁଗଲ୍ ଲଗଇନ୍')}
                </button>

                {isAdminLogin && (
                  <button onClick={() => setIsAdminLogin(false)} className="w-full py-2 flex items-center justify-center gap-2 text-[#ffd700] text-[10px] font-black uppercase mt-1">
                     <ArrowLeft size={14} /> Back to Student
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full space-y-6 text-center">
                <Sparkles className="text-[#ffd700] mx-auto animate-pulse" size={40} />
                <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="glass-marble w-full py-4 rounded-2xl text-center text-3xl tracking-[0.4em] font-black text-white outline-none" />
                <button onClick={verifyOtp} className="w-full bg-gradient-to-r from-[#b34d1f] to-[#d97706] py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest">VERIFY</button>
                <button onClick={() => setAuthStep('login')} className="text-[10px] text-white/40 font-black flex items-center justify-center gap-1"><ArrowLeft size={12} /> Back</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. FOOTER */}
      <div className="w-full flex flex-col items-center gap-3 z-10 pb-4 mt-auto">
        {!isAdminLogin && (
          <div className="flex flex-col gap-3 items-center">
            {deferredPrompt && (
              <button onClick={handleInstallClick} className="flex items-center gap-2 bg-[#ffd700] text-[#0b1719] px-6 py-2.5 rounded-full shadow-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                <Download size={14} /> {language === 'en' ? 'Install App' : 'ଇନଷ୍ଟଲ୍ କରନ୍ତୁ'}
              </button>
            )}
            <button onClick={() => setIsAdminLogin(true)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-white/20 uppercase tracking-widest">
              <Shield size={12} /> Admin Access
            </button>
          </div>
        )}
        <div className="flex flex-col items-center opacity-40">
          <p className="text-[7px] font-black uppercase tracking-[0.5em] text-[#ffd700]">Proud Association of Bigsan Group</p>
        </div>
      </div>

      <div id="recaptcha-container"></div>
    </div>
  );
}