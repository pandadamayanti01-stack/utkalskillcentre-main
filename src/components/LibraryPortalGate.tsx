import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Key } from 'lucide-react';
import { vibrate, playSuccessChime, playClickSound } from '../pwa';

interface LibraryPortalGateProps {
  language: 'en' | 'or';
  onComplete: () => void;
}

export default function LibraryPortalGate({ language, onComplete }: LibraryPortalGateProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleUnlock = () => {
    if (isOpening) return;
    setIsOpening(true);

    // Play sounds & tactile feedbacks
    vibrate([30, 50]); // Dual unlock vibe pulse
    try {
      playSuccessChime(true); // Magical chime sound
    } catch (e) {
      playClickSound();
    }

    // Smoothly transition after doors slide open (750ms matches CSS transition)
    setTimeout(() => {
      onComplete();
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-[#020617] flex items-center justify-center overflow-hidden select-none">
      {/* Background Portal Portal Glow (revealed as doors slide open) */}
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mt-4">
          {language === 'en' ? 'ENTERING SANCTUARY...' : 'ପ୍ରବେଶ ହେଉଛି...'}
        </p>
      </div>

      {/* LEFT SLIDING GATE DOOR */}
      <div 
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-slate-950 via-slate-900 to-[#070d19] border-r border-amber-500/30 flex items-center justify-end transition-transform duration-[800ms] ease-in-out z-20 ${
          isOpening ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Ornate Gold Filigree Borders on Door Edge */}
        <div className="absolute top-0 bottom-0 right-1 w-[3px] bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />
        <div className="absolute top-10 bottom-10 right-3 w-[1px] bg-amber-500/10 border-r border-dashed border-amber-500/20" />
      </div>

      {/* RIGHT SLIDING GATE DOOR */}
      <div 
        className={`absolute top-0 bottom-0 right-0 w-1/2 bg-gradient-to-l from-slate-950 via-slate-900 to-[#070d19] border-l border-amber-500/30 flex items-center justify-start transition-transform duration-[800ms] ease-in-out z-20 ${
          isOpening ? 'translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Ornate Gold Filigree Borders on Door Edge */}
        <div className="absolute top-0 bottom-0 left-1 w-[3px] bg-gradient-to-b from-transparent via-amber-400/40 to-transparent" />
        <div className="absolute top-10 bottom-10 left-3 w-[1px] bg-amber-500/10 border-l border-dashed border-amber-500/20" />
      </div>

      {/* CENTRAL GLOWING EMBLEM & LOCK CONTROLS */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
        <AnimatePresence>
          {!isOpening && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-8 px-4"
            >
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-widest bg-slate-950/60 backdrop-blur">
                <Sparkles size={12} className="text-amber-400 animate-pulse" />
                <span>{language === 'en' ? 'Utkal Digital Library' : 'ଉତ୍କଳ ଡିଜିଟାଲ୍ ପାଠାଗାର'}</span>
              </div>

              {/* Majestic Golden Keyhole Shield */}
              <button
                onClick={handleUnlock}
                className="pointer-events-auto h-32 w-32 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 p-[1.5px] shadow-[0_0_50px_rgba(245,158,11,0.3)] hover:shadow-[0_0_65px_rgba(245,158,11,0.5)] transition-all duration-300 group cursor-pointer active:scale-95"
              >
                <div className="h-full w-full rounded-full bg-[#0a0f1d] flex flex-col items-center justify-center relative overflow-hidden">
                  {/* Rotating lock ray */}
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(245,158,11,0.1)_180deg,transparent_360deg)] animate-spin-slow pointer-events-none" />
                  
                  {/* Pulsing Core */}
                  <div className="absolute inset-4 rounded-full bg-slate-950/40 border border-amber-500/20 animate-pulse" />

                  <BookOpen size={42} className="text-amber-400 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </button>

              {/* Instructions Prompt */}
              <div className="text-center space-y-2 max-w-xs">
                <h3 className="text-sm font-black uppercase tracking-widest text-amber-400 animate-pulse">
                  {language === 'en' ? 'Tap Gate to Unlock' : 'ଦ୍ୱାର ଖୋଲିବାକୁ ସ୍ପର୍ଶ କରନ୍ତୁ'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  {language === 'en'
                    ? 'Click the central golden emblem to open the secure knowledge portal.'
                    : 'ଲାଇବ୍ରେରୀ ଦ୍ୱାର ସ୍ଲାଇଡ୍ କରି ପ୍ରବେଶ କରିବା ପାଇଁ ମଝି ସୁନା ଚକ୍ର ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
