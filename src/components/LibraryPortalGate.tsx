import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import * as Lucide from 'lucide-react';

interface LibraryPortalGateProps {
  language: 'en' | 'or';
  onComplete: () => void;
}

export default function LibraryPortalGate({ language, onComplete }: LibraryPortalGateProps) {
  useEffect(() => {
    // Automatically trigger onComplete after 1.8 seconds of beautiful cinematic intro
    const timer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[999999] bg-[#020617] flex flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Cinematic Background Grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="rgb(2, 6, 23)" stopOpacity="0" />
            </radialGradient>
            <pattern id="portalGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#portalGrid)" />
          <rect width="100%" height="100%" fill="url(#portalGlow)" />
        </svg>
      </div>

      {/* Floating Sparkles & Particles */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0, 
            y: 100, 
            x: (Math.random() - 0.5) * 300, 
            scale: Math.random() * 0.5 + 0.5 
          }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: -150, 
            x: (Math.random() - 0.5) * 400 
          }}
          transition={{ 
            duration: 1.5, 
            delay: Math.random() * 0.3, 
            repeat: Infinity, 
            ease: "easeOut" 
          }}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/60 blur-[0.5px]"
        />
      ))}

      {/* Outer Rotating Energy Ring */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Swirling Laser Border */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/20"
        />
        
        {/* Secondary Swirling Reverse Ring */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 rounded-full border border-double border-cyan-500/30"
        />

        {/* Floating Holographic Particles Circle */}
        <motion.div 
          animate={{ rotate: 180 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-8 rounded-full border border-emerald-500/5 flex items-center justify-center"
        >
          <div className="absolute top-0 w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981] animate-ping" />
          <div className="absolute bottom-0 w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_15px_#06b6d4] animate-ping" />
        </motion.div>

        {/* Central Core Sphere */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
          className="w-40 h-40 rounded-full bg-slate-950/90 border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center relative z-10 overflow-hidden"
        >
          {/* Pulsating Nebula Background inside core */}
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/20 via-slate-900 to-cyan-950/20" />
          
          {/* Scanning Laser Line */}
          <motion.div 
            animate={{ y: [-80, 80] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80"
          />

          {/* Holographic Glowing Book */}
          <motion.div
            animate={{ 
              y: [0, -6, 0],
              scale: [1, 1.08, 1],
              filter: ["drop-shadow(0 0 10px rgba(16,185,129,0.3))", "drop-shadow(0 0 20px rgba(16,185,129,0.6))", "drop-shadow(0 0 10px rgba(16,185,129,0.3))"]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 text-emerald-400"
          >
            <Lucide.BookOpen size={56} strokeWidth={1.5} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-6 text-[8px] font-black tracking-[0.4em] text-emerald-400 uppercase select-none z-10"
          >
            SECURE PORTAL
          </motion.div>
        </motion.div>
      </div>

      {/* Cinematic Welcome Text Panels */}
      <div className="mt-12 text-center max-w-md px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
            <Lucide.Sparkles size={12} className="animate-spin-slow" />
            {language === 'en' ? 'Gundulu AI Engine' : 'ଗୁଣ୍ଡୁଲୁ ଏଆଇ ଇଞ୍ଜିନ'}
          </div>

          <h3 className="text-xl font-extrabold text-white tracking-tight">
            {language === 'en' ? 'Opening Knowledge Sanctuary...' : 'ଜ୍ଞାନର ଦ୍ୱାର ଖୋଲୁଛି...'}
          </h3>
          
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            {language === 'en' 
              ? 'Loading textbooks, interactive notes, and personalized study planners.' 
              : 'ସମସ୍ତ ପାଠ୍ୟପୁସ୍ତକ, ଗୁଣ୍ଡୁଲୁ ଏଆଇ ନୋଟ୍ସ ଓ ଟେଷ୍ଟ ସେଟ୍ ପ୍ରସ୍ତୁତ କରାଯାଉଛି।'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
