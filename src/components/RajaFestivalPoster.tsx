import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Music, Navigation, Tent } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RajaFestivalPosterProps {
  onClose: () => void;
}

export default function RajaFestivalPoster({ onClose }: RajaFestivalPosterProps) {
  const [isSwinging, setIsSwinging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [swingCount, setSwingCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initial gentle flower shower for Raja Parba celebration!
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 80, zIndex: 10000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      // Pink and yellow floral hues representing Raja sajabaja (decoration)
      confetti({
        ...defaults,
        particleCount,
        colors: ['#f43f5e', '#ec4899', '#f59e0b', '#fbbf24', '#10b981'],
        origin: { x: randomInRange(0.15, 0.35), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        colors: ['#f43f5e', '#ec4899', '#f59e0b', '#fbbf24', '#10b981'],
        origin: { x: randomInRange(0.65, 0.85), y: Math.random() - 0.2 }
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSwingDoli = () => {
    setIsSwinging(true);
    setSwingCount(prev => prev + 1);

    // 1. Beauty Crackers (Interactive Fireworks) from Left & Right
    const crackerColors = ['#f43f5e', '#ec4899', '#f59e0b', '#fbbf24', '#10b981', '#3b82f6', '#a855f7'];
    
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { x: 0.25, y: 0.65 },
      colors: crackerColors,
      startVelocity: 42,
      zIndex: 10000
    });

    confetti({
      particleCount: 65,
      spread: 75,
      origin: { x: 0.75, y: 0.65 },
      colors: crackerColors,
      startVelocity: 42,
      zIndex: 10000
    });

    // 2. Center Sparkler Burst (Golden Fireworks Cracker)
    confetti({
      particleCount: 85,
      spread: 130,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#ffe066', '#fbbf24', '#f59e0b', '#ffffff', '#ec4899'],
      startVelocity: 32,
      zIndex: 10000
    });

    // 3. Floating Sweets, Balloons, and Flowers (Emojis)
    const festiveEmojis = ['🎈', '🎈', '🌸', '🌺', '🌹', '🍬', '🎆', '🎇', '✨', '🎉'];
    
    // Trigger multiple emoji bursts for high visual variety
    for (let i = 0; i < 3; i++) {
      confetti({
        startVelocity: 25 + i * 5,
        spread: 180,
        ticks: 120,
        zIndex: 10000,
        particleCount: 18,
        scalar: 2.6 + i * 0.4,
        origin: { x: 0.35 + i * 0.15, y: 0.55 },
        shapes: ['emoji'] as any,
        shapeOptions: {
          emoji: { value: festiveEmojis[Math.floor(Math.random() * festiveEmojis.length)] }
        }
      } as any);
    }

    // Stop swinging animation after 1.8 seconds
    setTimeout(() => {
      setIsSwinging(false);
    }, 1800);

    // If they swing 3 times, let them in automatically with extra joy!
    if (swingCount >= 2) {
      setTimeout(onClose, 2000);
    }
  };

  const handleClosePoster = () => {
    if (audioRef.current) audioRef.current.pause();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md antialiased"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
          className="relative w-full max-w-lg overflow-visible rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-teal-900 to-indigo-950 shadow-[0_0_50px_rgba(16,185,129,0.25)] force-dark-theme"
        >
          {/* Sparkly Background Glows */}
          <div className="absolute top-0 left-1/4 w-40 h-40 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-pink-500/10 rounded-full filter blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={handleClosePoster}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer border border-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Festival Theme Header Tag */}
          <span className="px-4 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[10px] font-black uppercase tracking-[0.25em] mb-4 animate-bounce">
            ପବିତ୍ର ରଜ ପର୍ବ ଅଭିନନ୍ଦନ 🌾🌸
          </span>

          {/* Swing Visual Container */}
          <div className="relative mb-6 mt-2 flex flex-col items-center justify-center w-full min-h-[160px]">
            {/* The Tree Branch */}
            <div className="absolute top-0 w-48 h-3 bg-gradient-to-r from-emerald-800 via-amber-800 to-emerald-800 rounded-full shadow-lg border border-amber-950 z-20">
              {/* Branch Flowers */}
              <div className="absolute -top-2 left-6 text-xs">🌸</div>
              <div className="absolute -top-1.5 left-20 text-xs">🌺</div>
              <div className="absolute -top-2 right-8 text-xs">🌸</div>
            </div>

            {/* The Rope & Swing */}
            <motion.div
              animate={isSwinging 
                ? { rotate: [-18, 18, -15, 15, -8, 8, 0] } 
                : { rotate: [-2, 2, -2] }
              }
              transition={isSwinging 
                ? { duration: 1.8, ease: "easeInOut" } 
                : { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
              style={{ originX: 0.5, originY: 0 }}
              onClick={handleSwingDoli}
              className="flex flex-col items-center justify-start cursor-pointer group mt-2 relative z-10 w-40"
            >
              {/* The Swing Ropes */}
              <div className="flex justify-between w-28 h-24">
                <div className="w-1 bg-gradient-to-b from-amber-600 to-amber-800 shadow-md"></div>
                <div className="w-1 bg-gradient-to-b from-amber-600 to-amber-800 shadow-md"></div>
              </div>

              {/* The Wooden Board */}
              <div className="w-32 h-4 bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 rounded border border-amber-900 shadow-xl flex items-center justify-center relative">
                {/* Flowers wrapped around the ropes */}
                <div className="absolute -top-3 left-1 text-xs">🌸</div>
                <div className="absolute -top-3 right-1 text-xs">🌺</div>
                
                {/* Mascot sitting on the swing */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-2 border-yellow-300 bg-emerald-500/20 overflow-hidden shadow-lg shadow-emerald-500/10">
                  <img 
                    src="/utkal-512.png" 
                    alt="Utkal mascot" 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>

                <span className="text-[7px] text-amber-950 uppercase font-black tracking-widest">
                  Gundulu Doli 🎡
                </span>
              </div>
            </motion.div>

            {/* Tap hint overlay */}
            <div className="absolute bottom-0 text-[10px] font-black text-emerald-400 tracking-widest animate-pulse pointer-events-none">
              {isSwinging ? "SWINGING IN JOY! 🌾✨" : "👇 CLICK DOLI TO SWING!"}
            </div>
          </div>

          {/* Bilingual Festive Slogans */}
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2 uppercase" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            ପବିତ୍ର ରଜ ପର୍ବ ଅବସରରେ<br />
            <span className="text-yellow-400">ଗ୍ରାଣ୍ଡ୍ ଆପ୍ ଶୁଭାରମ୍ଭ!</span>
          </h1>

          <div className="w-20 h-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-emerald-400 mx-auto mb-4 rounded-full" />

          {/* 14th June Date Reveal */}
          <div className="inline-flex flex-col items-center gap-1.5 px-6 py-3.5 bg-slate-900/60 border border-emerald-500/30 rounded-2xl backdrop-blur-md mb-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-pink-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-2">
              <Sparkles className="text-yellow-400 animate-spin" size={16} />
              <span className="text-lg sm:text-xl font-black text-yellow-400 tracking-wide">
                ୧୪ ଜୁନ୍ ରୁ ଅଫିସିଆଲ୍ ଲାଇଭ୍!
              </span>
              <Sparkles className="text-yellow-400 animate-spin" size={16} />
            </div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Live on Google Play Store from 14th June
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto leading-relaxed mb-6">
            Odisha state board students can now enjoy curriculum-aligned <strong>Math, Science, and AI Gundulu Apa Tutor</strong> right inside their pocket, 100% optimized for rural smartphone networks!
          </p>

          {/* Interactive music control */}
          <button 
            onClick={toggleMusic}
            className="mb-6 text-xs text-emerald-400 hover:text-emerald-300 font-black flex items-center gap-2 cursor-pointer transition-colors px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/10 active:scale-95"
          >
            <Music size={12} className={isPlaying ? "animate-bounce" : ""} />
            {isPlaying ? "PAUSE FESTIVE TUNE" : "PLAY FESTIVE TUNE 🎧"}
          </button>

          {/* Main Action Call to Action */}
          <button
            onClick={handleClosePoster}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/10 active:scale-95 cursor-pointer border border-emerald-300/20"
          >
            ଆପ୍ ପ୍ରବେଶ କରନ୍ତୁ ➔ (Enter App)
          </button>

          {/* Audio Players */}
          <audio ref={audioRef} loop src="/Raja-doli.mpeg" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
