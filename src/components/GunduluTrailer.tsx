import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Zap, ShieldCheck, ArrowRight, X, Play } from 'lucide-react';

interface GunduluTrailerProps {
  onClose: () => void;
  onSubscribe: () => void;
  language: 'en' | 'or';
}

export const GunduluTrailer: React.FC<GunduluTrailerProps> = ({ onClose, onSubscribe, language }) => {
  const [step, setStep] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play Natural Flute / Odisha-inspired Startup Sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1105/1105-preview.mp3'); // A soft, airy flute sound
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Audio playback requires user interaction first"));
    
    const timer = setTimeout(() => {
      if (step < 3) {
        setStep(prev => prev + 1);
      } else {
        // Success Chime for Paywall
        const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
        chime.volume = 0.7;
        chime.play().catch(() => {});
        setShowPaywall(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [step]);

  const steps = [
    {
      en: "From the land of Konark, wisdom awakens...",
      or: "କୋଣାର୍କର ଏହି ପବିତ୍ର ମାଟିରୁ, ଜ୍ଞାନର ଜାଗରଣ...",
      icon: <Zap className="text-emerald-500" size={40} />
    },
    {
      en: "Learning as deep as the waters of Chilika...",
      or: "ଚିଲିକାର ନୀଳ ଜଳରାଶି ପରି ଗଭୀର ଶିକ୍ଷା...",
      icon: <Bot className="text-cyan-400" size={40} />
    },
    {
      en: "Connecting Odisha's bright minds to Gundulu...",
      or: "ଓଡ଼ିଶାର ମେଧାବୀ ଛାତ୍ରଙ୍କୁ ଗୁନ୍ଦୁଲୁ ସହ ସଂଯୋଗ କରୁଛି...",
      icon: <Sparkles className="text-amber-400" size={40} />
    },
    {
      en: "Your Odia Study Buddy is Ready.",
      or: "ଆପଣଙ୍କ ଓଡ଼ିଆ ଷ୍ଟଡ଼ି ବଡ଼ି ଏବେ ପ୍ରସ୍ତୁତ |",
      icon: <ShieldCheck className="text-emerald-400" size={40} />
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] trailer-overlay flex items-center justify-center">
      <div className="trailer-scanline" />
      
      {/* Odisha Cultural Background (Mandala Pattern) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-emerald-500/10 rounded-full"
          style={{ 
            backgroundImage: 'radial-gradient(circle, transparent 20%, rgba(16, 185, 129, 0.05) 21%, transparent 21%, transparent 40%, rgba(16, 185, 129, 0.05) 41%, transparent 41%)',
            backgroundSize: '100px 100px'
          }}
        />
      </div>
        
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-emerald-500/20 rounded-full blur-[1px]"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%',
              scale: Math.random() * 2
            }}
            animate={{ 
              y: [null, '-20%'],
              opacity: [0, 0.5, 0],
              scale: [1, 1.5, 1],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 10 + Math.random() * 20, 
              repeat: Infinity,
              ease: "linear"
            }}
            style={{ 
              width: Math.random() * 100 + 50 + 'px', 
              height: Math.random() * 100 + 50 + 'px',
              border: '1px solid rgba(16, 185, 129, 0.1)'
            }}
          />
        ))}

        {/* Floating Connection Nodes */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`node-${i}`}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: Math.random() * 100 + '%' 
            }}
            animate={{ 
              x: [null, Math.random() * 100 + '%'],
              y: [null, Math.random() * 100 + '%'],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{ 
              duration: 15 + Math.random() * 15, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}

      <button 
        onClick={onClose}
        className="absolute top-8 right-8 z-50 p-3 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      <div className="relative z-10 w-full max-w-4xl px-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {!showPaywall ? (
            <motion.div 
              key={step}
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-32 h-32 mb-12 relative">
                <div className="absolute inset-0 glow-orb" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {steps[step].icon}
                </div>
                
                {/* 3D Rings Effect */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute inset-[-20px] border-2 border-emerald-500/20 rounded-full"
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-[-40px] border-2 border-white/5 rounded-full"
                />
              </div>

              <h2 className="text-4xl md:text-6xl font-black cinematic-text tracking-tighter mb-6 uppercase leading-tight relative">
                {steps[step][language]}
                <motion.div 
                  className="absolute inset-0 bg-emerald-500/20 blur-sm mix-blend-overlay"
                  animate={{ opacity: [0, 0.5, 0], x: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 0.1 }}
                />
              </h2>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-[2px] w-12 bg-emerald-500/30" />
                  <p className="text-emerald-500 font-black text-[10px] tracking-[0.6em] uppercase animate-pulse">Neural Link Active</p>
                  <div className="h-[2px] w-12 bg-emerald-500/30" />
                </div>
                <p className="text-white/40 text-[8px] font-black uppercase tracking-[1em] mt-4">
                  {language === 'en' ? 'Processing Data Streams...' : 'ଡାଟା ଲୋଡ୍ ହେଉଛି...'}
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-amber-400 to-orange-600 p-0.5 mb-8 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                  <div className="w-full h-full bg-[#0B0F19] rounded-[1.9rem] flex items-center justify-center">
                    <Zap className="text-amber-500" size={32} />
                  </div>
                </div>

                <h3 className="text-3xl font-black text-white tracking-tight mb-4 uppercase">
                  {language === 'en' ? "Unlock Full Potential" : "ପୂର୍ଣ୍ଣ କ୍ଷମତା ଅନଲକ୍ କରନ୍ତୁ"}
                </h3>
                
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                  {language === 'en' 
                    ? "You are just one step away from mastering your future. Subscribe to Gundulu AI and get 24/7 personalized study assistance."
                    : "ଆପଣ ନିଜ ଭବିଷ୍ୟତ ଗଢ଼ିବାର ମାତ୍ର ଏକ ପାଦ ଦୂରରେ ଅଛନ୍ତି | ଗୁନ୍ଦୁଲୁ AI ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ ଏବଂ ୨୪/୭ ବ୍ୟକ୍ତିଗତ ଶିକ୍ଷା ସହାୟତା ପାଆନ୍ତୁ |"}
                </p>

                <button 
                  onClick={onSubscribe}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-amber-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  {language === 'en' ? "Subscribe Now" : "ବର୍ତ୍ତମାନ ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ"}
                  <ArrowRight size={18} />
                </button>

                <p className="mt-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">
                  {language === 'en' ? 'Join 5000+ Topper Students' : '୫୦୦୦+ ଟପ୍ପର ଛାତ୍ରଙ୍କ ସହ ଯୋଗ ଦିଅନ୍ତୁ'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
