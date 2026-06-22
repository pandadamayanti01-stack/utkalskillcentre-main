import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';

interface MtsChampionshipPosterProps {
  isRegistered: boolean;
  onRegisterClick: () => void;
  language: 'en' | 'or';
}

interface BalloonState {
  id: number;
  avatarUrl: string;
  leftPercent: number;
  delay: number;
  speed: number;
  size: number;
  color: string;
  borderColor: string;
  isPopped: boolean;
  swayDelay: number;
}

interface PopBurst {
  id: number;
  x: number;
  y: number;
  color: string;
}

const BALLOON_AVATARS = [
  '/avatar_bheem.png',
  '/avatar_motu.png',
  '/avatar_patlu.png',
  '/avatar_krishna.png',
  '/avatar_hanuman.png',
  '/avatar_shinchan.png',
  '/avatar_doraemon.png',
  '/avatar_naruto.png',
  '/avatar_goku.png',
  '/avatar_luffy.png'
];

export function MtsChampionshipPoster({ isRegistered, onRegisterClick, language }: MtsChampionshipPosterProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [revealedPrizes, setRevealedPrizes] = useState<number>(0);
  const [isRegistrationWindow, setIsRegistrationWindow] = useState(false);
  const [balloons, setBalloons] = useState<BalloonState[]>([]);
  const [popBursts, setPopBursts] = useState<PopBurst[]>([]);

  const handlePop = (e: React.MouseEvent, balloon: BalloonState) => {
    e.stopPropagation();
    
    // Play pop sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.55;
    audio.play().catch(() => {});

    // Get click location relative to the container
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect && container) {
      const clickX = rect.left - container.left + rect.width / 2;
      const clickY = rect.top - container.top + rect.height / 2;
      
      const burstId = Date.now() + Math.random();
      const newBurst: PopBurst = {
        id: burstId,
        x: clickX,
        y: clickY,
        color: balloon.borderColor.replace('border-', 'bg-')
      };
      setPopBursts(prev => [...prev, newBurst]);
      
      // Remove burst after animation completes
      setTimeout(() => {
        setPopBursts(prev => prev.filter(b => b.id !== burstId));
      }, 800);
    }

    // Set balloon isPopped to true
    setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, isPopped: true } : b));

    // Respawn balloon after 4 seconds
    setTimeout(() => {
      setBalloons(prev => prev.map(b => {
        if (b.id === balloon.id) {
          const colors = [
            { bg: 'from-pink-500/30 to-rose-600/40', border: 'border-pink-500/40' },
            { bg: 'from-cyan-500/30 to-blue-600/40', border: 'border-cyan-500/40' },
            { bg: 'from-amber-400/30 to-orange-500/40', border: 'border-amber-400/40' },
            { bg: 'from-emerald-400/30 to-teal-600/40', border: 'border-emerald-400/40' },
            { bg: 'from-purple-500/30 to-indigo-600/40', border: 'border-purple-500/40' },
            { bg: 'from-violet-500/30 to-fuchsia-600/40', border: 'border-violet-500/40' }
          ];
          const colorScheme = colors[Math.floor(Math.random() * colors.length)];
          return {
            ...b,
            isPopped: false,
            leftPercent: 5 + Math.random() * 90,
            color: colorScheme.bg,
            borderColor: colorScheme.border,
            avatarUrl: BALLOON_AVATARS[Math.floor(Math.random() * BALLOON_AVATARS.length)]
          };
        }
        return b;
      }));
    }, 4000);
  };

  // Generate 18 floating background particles
  const particles = React.useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 140 - 70,
      y: Math.random() * 120 - 60,
      size: Math.random() * 6 + 4,
      color: ['#fbbf24', '#f97316', '#38bdf8', '#818cf8', '#34d399'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 0.4
    }));
  }, []);

  useEffect(() => {
    const deadline = new Date('2026-07-04T23:59:59');
    const now = new Date();
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Check if '?clear=true' is in the URL to clear the popup state
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear') === 'true') {
      localStorage.removeItem('mts_championship_dismissed_date');
      sessionStorage.removeItem('mts_championship_shown_session');
      urlParams.delete('clear');
      const newSearch = urlParams.toString();
      const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newPath);
    }

    const isTestMode = window.location.search.includes('test=true') || window.location.search.includes('clear=true');
    const todayStr = now.toISOString().split('T')[0];
    const dismissedDate = localStorage.getItem('mts_championship_dismissed_date');
    const shownThisSession = sessionStorage.getItem('mts_championship_shown_session');

    console.log('[MTS Championship Diagnostic]', {
      now: now.toISOString(),
      deadline: deadline.toISOString(),
      isLocalhost,
      isTestMode,
      dismissedDate,
      todayStr,
      shownThisSession,
      isDateExpired: now > deadline && !isLocalhost,
      isDismissedToday: dismissedDate === todayStr,
      isShownThisSession: shownThisSession === 'true'
    });
    
    // 1. Date Check: Show until July 4th, 2026
    if (now > deadline && !isLocalhost) {
      setIsVisible(false);
      return;
    }

    // 2. Dismissal Check: Once per day check (Remove localhost bypass so daily limits work correctly everywhere)
    if (dismissedDate === todayStr && !isTestMode) {
      setIsVisible(false);
      return;
    }

    // 2b. Session Check: Only show once per browser session to prevent popups on tab switches / back button
    if (shownThisSession === 'true' && !isTestMode) {
      setIsVisible(false);
      return;
    }

    // 3. Check if July 1st - July 4th registration window is active (Strict date checking, no localhost override so we can see the closed countdown state locally)
    const currentDay = now.getDate();
    const currentMonth = now.getMonth(); // 0-indexed (5 = June, 6 = July)
    const isJulyWindow = now.getFullYear() === 2026 && currentMonth === 6 && currentDay >= 1 && currentDay <= 4;
    
    setIsRegistrationWindow(isJulyWindow);
    setIsVisible(true);
    if (!isTestMode) {
      sessionStorage.setItem('mts_championship_shown_session', 'true');
    }

    // 4. Initialize floating balloons
    const initialBalloons = Array.from({ length: 8 }, (_, i) => {
      const avatarUrl = BALLOON_AVATARS[i % BALLOON_AVATARS.length];
      const colors = [
        { bg: 'from-pink-500/25 to-rose-600/35', border: 'border-pink-500/40' },
        { bg: 'from-cyan-500/25 to-blue-600/35', border: 'border-cyan-500/40' },
        { bg: 'from-amber-400/25 to-orange-500/35', border: 'border-amber-400/40' },
        { bg: 'from-emerald-400/25 to-teal-600/35', border: 'border-emerald-400/40' },
        { bg: 'from-purple-500/25 to-indigo-600/35', border: 'border-purple-500/40' },
        { bg: 'from-violet-500/25 to-fuchsia-600/35', border: 'border-violet-500/40' }
      ];
      const colorScheme = colors[Math.floor(Math.random() * colors.length)];
      return {
        id: i,
        avatarUrl,
        leftPercent: 5 + Math.random() * 90,
        delay: Math.random() * 8,
        speed: 14 + Math.random() * 6,
        size: 48 + Math.random() * 12,
        color: colorScheme.bg,
        borderColor: colorScheme.border,
        isPopped: false,
        swayDelay: Math.random() * 3
      };
    });
    setBalloons(initialBalloons);
  }, []);

  // Play audio chime safely (catching autoplay blocks)
  const playChime = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.volume = 0.35;
    audio.play().catch(() => {
      // Quietly ignore browser autoplay security blocks
    });
  };

  // Trigger staggered sound effects when prizes reveal
  useEffect(() => {
    if (!isVisible) return;

    setRevealedPrizes(0);

    const t1 = setTimeout(() => {
      setRevealedPrizes(1);
      playChime();
    }, 850);

    const t2 = setTimeout(() => {
      setRevealedPrizes(2);
      playChime();
    }, 1250);

    const t3 = setTimeout(() => {
      setRevealedPrizes(3);
      playChime();
    }, 1650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isVisible]);

  const handleDismiss = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('mts_championship_dismissed_date', todayStr);
    setIsVisible(false);
  };

  const handleCTA = () => {
    handleDismiss(); // Save dismissal for today
    if (isRegistrationWindow || isRegistered) {
      onRegisterClick(); // Open form/syllabus
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <div 
          onClick={handleDismiss}
          className="fixed inset-0 z-[12000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
        >
        {/* Scoped CSS styling block to bypass global !important overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          body.theme-daybreak .mts-championship-modal-card {
            background-color: #080d1a !important;
            border-color: rgba(245, 158, 11, 0.3) !important;
          }
          body.theme-daybreak .mts-championship-modal-card .text-gradient-title {
            color: transparent !important;
            -webkit-text-fill-color: transparent !important;
            background-clip: text !important;
            -webkit-background-clip: text !important;
          }
          body.theme-daybreak .mts-championship-modal-card .text-light-desc {
            color: #cbd5e1 !important;
          }
          body.theme-daybreak .mts-championship-modal-card .text-card-white {
            color: #ffffff !important;
          }
          body.theme-daybreak .mts-championship-modal-card .text-card-amber {
            color: #fbbf24 !important;
          }
          body.theme-daybreak .mts-championship-modal-card .text-card-slate {
            color: #cbd5e1 !important;
          }
          body.theme-daybreak .mts-championship-modal-card .text-card-orange {
            color: #f97316 !important;
          }
          body.theme-daybreak .mts-championship-modal-card .card-border-amber {
            border-color: rgba(245, 158, 11, 0.3) !important;
          }
          body.theme-daybreak .mts-championship-modal-card .card-border-slate {
            border-color: rgba(203, 213, 225, 0.15) !important;
          }
          body.theme-daybreak .mts-championship-modal-card .card-border-orange {
            border-color: rgba(249, 115, 22, 0.25) !important;
          }
          body.theme-daybreak .mts-championship-modal-card .close-btn-style {
            background-color: rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
            box-shadow: 0 0 12px rgba(255, 255, 255, 0.1) !important;
          }
          body.theme-daybreak .mts-championship-modal-card .close-btn-style:hover {
            background-color: rgba(245, 158, 11, 0.2) !important;
            border-color: rgba(245, 158, 11, 0.4) !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.3) !important;
          }
        `}} />
        {/* Floating Balloons Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20 select-none">
          {balloons.map((b) => {
            if (b.isPopped) return null;
            return (
              <motion.div
                key={b.id}
                onClick={(e) => handlePop(e, b)}
                initial={{ y: '105vh', left: `${b.leftPercent}%` }}
                animate={{
                  y: '-25vh',
                  x: [-15, 15, -15],
                  rotate: [-8, 8, -8]
                }}
                transition={{
                  y: {
                    duration: b.speed,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: b.delay
                  },
                  x: {
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: b.swayDelay
                  },
                  rotate: {
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: b.swayDelay
                  }
                }}
                className="absolute pointer-events-auto cursor-pointer select-none"
                style={{ left: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Balloon Body */}
                <div 
                  className={`relative ${b.borderColor} bg-gradient-to-br ${b.color} border-2 shadow-[0_10px_25px_rgba(0,0,0,0.35)] flex items-center justify-center`}
                  style={{ 
                    width: b.size, 
                    height: b.size * 1.15,
                    borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                    borderColor: b.borderColor.includes('pink') ? 'rgba(236,72,153,0.5)' : 
                                 b.borderColor.includes('cyan') ? 'rgba(6,182,212,0.5)' : 
                                 b.borderColor.includes('amber') ? 'rgba(245,158,11,0.5)' : 
                                 b.borderColor.includes('emerald') ? 'rgba(16,185,129,0.5)' : 
                                 b.borderColor.includes('purple') ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.5)'
                  }}
                >
                  {/* Balloon Shine Highlight */}
                  <div className="absolute top-[12%] left-[12%] w-[20%] h-[30%] bg-white/30 rounded-full blur-[1px] rotate-[15deg] pointer-events-none" />
                  
                  {/* Avatar image */}
                  <img 
                    src={b.avatarUrl} 
                    alt="Avatar" 
                    className="w-[72%] h-[72%] rounded-full object-cover border border-white/20 bg-[#0f172a]/60 select-none pointer-events-none" 
                    draggable="false"
                  />
                  
                  {/* Balloon Knot Tie */}
                  <svg 
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-2 fill-current pointer-events-none"
                    viewBox="0 0 10 10" 
                    style={{ 
                      color: b.borderColor.includes('pink') ? '#ec4899' : 
                             b.borderColor.includes('cyan') ? '#06b6d4' : 
                             b.borderColor.includes('amber') ? '#f59e0b' : 
                             b.borderColor.includes('emerald') ? '#10b981' : 
                             b.borderColor.includes('purple') ? '#8b5cf6' : '#8b5cf6' 
                    }}
                  >
                    <polygon points="5,0 0,10 10,10" />
                  </svg>

                  {/* Balloon String */}
                  <div className="absolute top-[98%] left-1/2 -translate-x-1/2 w-[1.2px] h-14 bg-white/25 origin-top pointer-events-none" />
                </div>
              </motion.div>
            );
          })}

          {/* Balloon Pop Confetti Burst Particles */}
          {popBursts.map((burst) => (
            <div key={burst.id} className="absolute pointer-events-none z-10" style={{ left: burst.x, top: burst.y }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30) * (Math.PI / 180);
                const distance = 30 + Math.random() * 40;
                const tx = Math.cos(angle) * distance;
                const ty = Math.sin(angle) * distance;
                const bgClass = burst.color ? burst.color.split('/')[0] : 'bg-violet-500';
                return (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: tx, y: ty, opacity: 0, scale: 0.1 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className={`absolute w-2 h-2 rounded-full ${bgClass}`}
                    style={{ transform: 'translate(-50%, -50%)' }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Glowing golden aura behind the modal */}
        <div 
          style={{ boxShadow: '0 0 180px 50px rgba(245,158,11,0.25)' }}
          className="absolute w-[300px] h-[300px] rounded-full blur-[110px] pointer-events-none z-0" 
        />

        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: 'spring', damping: 20, stiffness: 90 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-[#f59e0b]/30 bg-[#080d1a] p-6 sm:p-8 md:p-10 shadow-[0_30px_70px_rgba(245,158,11,0.3)] max-w-4xl w-full z-10 text-center md:text-left mts-championship-modal-card"
        >
          {/* Background Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#101b35]/20 via-transparent to-[#f59e0b]/5 opacity-90 pointer-events-none" />
          
          {/* Celebratory Confetti Particle Burst */}
          {revealedPrizes >= 1 && particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ 
                opacity: [0, 0.9, 0], 
                scale: [0, 1.2, 0.4],
                x: p.x * 2.8,
                y: p.y * 2.5
              }}
              transition={{ 
                duration: 2.8, 
                delay: p.delay + 0.8,
                repeat: Infinity,
                repeatDelay: Math.random() * 2 + 1.5
              }}
              className="absolute rounded-full pointer-events-none z-0"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                left: '50%',
                top: '40%'
              }}
            />
          ))}

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-6 right-6 p-2.5 rounded-xl bg-[#ffffff]/15 hover:bg-[#f59e0b]/20 border border-[#ffffff]/25 hover:border-[#f59e0b]/40 text-[#ffffff] hover:text-[#fbbf24] transition-all duration-300 z-30 cursor-pointer shadow-[0_0_12px_rgba(255,255,255,0.1)] hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] close-btn-style"
            title="ବନ୍ଦ କରନ୍ତୁ"
          >
            <Lucide.X size={20} className="stroke-[3]" />
          </button>

          {/* Content Layout */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            
            {/* Left: Mascot Gundulu (flipped, transparent bg, and self-start ml-4 on mobile to align bottom-left) */}
            <div className="relative shrink-0 w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center order-3 md:order-1 self-start md:self-center ml-4 md:ml-0">
              {/* Soft Mascot Glow Backing */}
              <div className="absolute inset-0 bg-[#fbbf24]/20 rounded-full blur-2xl animate-pulse" />
              
              {/* Talking bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
                className="absolute -top-10 left-10 bg-[#ffffff] text-[#0f172a] text-[10px] font-black px-3 py-1.5 rounded-2xl shadow-2xl border border-[#fde68a] whitespace-nowrap z-30"
              >
                {isRegistrationWindow ? "ନିଜ ପରିଶ୍ରମର ଫଳ ପାଆନ୍ତୁ! 🏆" : "ଖୁବଶୀଘ୍ର ଆରମ୍ଭ! 🗓️"}
                <div className="absolute -bottom-1.5 left-4 w-3.5 h-3.5 bg-[#ffffff] border-r border-b border-[#fde68a] rotate-45" />
              </motion.div>

              <motion.img
                initial={{ x: -160, rotate: -15, opacity: 0, scaleX: -1 }}
                animate={{ x: 0, rotate: 0, opacity: 1, scaleX: -1 }}
                whileHover={{ scaleX: -1.05, scaleY: 1.05, rotate: 2 }}
                transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.2 }}
                src="/gundulu-pointing-nobg.png"
                alt="Gundulu Mascot"
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain relative z-20 cursor-pointer"
                draggable="false"
              />
            </div>

            {/* Middle: Title, Tagline and Call To Action (order-1 on mobile) */}
            <div className="flex-1 space-y-4 text-center md:text-left z-10 order-1 md:order-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24] text-[10px] font-black uppercase tracking-wider mb-2 text-card-amber">
                  <Lucide.Sparkles size={10} className="animate-spin" />
                  {isRegistrationWindow ? "ପରିଶ୍ରମର ଫଳ" : "ଚାମ୍ପିଅନସିପ୍ ଖୁବଶୀଘ୍ର"}
                </div>
                <div className="text-xl sm:text-2xl md:text-3.5xl font-black text-[#ffffff] tracking-tight uppercase bg-gradient-to-r from-[#fde68a] via-[#ffffff] to-[#fed7aa] bg-clip-text text-transparent drop-shadow-lg text-gradient-title text-card-white">
                  ମାସିକ ଟେଷ୍ଟ ଚାମ୍ପିଅନସିପ୍
                </div>
                <div className="text-xs sm:text-sm text-[#cbd5e1] font-semibold mt-2.5 max-w-xl leading-relaxed text-light-desc">
                  {isRegistrationWindow ? (
                    "ସାରା ଓଡ଼ିଶାରେ ପ୍ରତିଯୋଗିତା କରି ପାଆନ୍ତୁ ନିଜ ପରିଶ୍ରମର ଫଳ! ଶ୍ରେଣୀ ୧ ରୁ ୧୦ ପାଇଁ ଖୋଲା ଅଛି। ପ୍ରଥମ ପରୀକ୍ଷା ଜୁଲାଇ ୫ ରେ ଆରମ୍ଭ ହେବ!"
                  ) : (
                    "ସାରା ଓଡ଼ିଶାରେ ପ୍ରତିଯୋଗିତା କରି ପାଆନ୍ତୁ ନିଜ ପରିଶ୍ରମର ଫଳ! ଶ୍ରେଣୀ ୧ ରୁ ୧୦ ପାଇଁ ଖୋଲା ଅଛି। ଆଗାମୀ ପଞ୍ଜିକରଣ: ଜୁଲାଇ ୧ ରୁ ୪। ପ୍ରଥମ ପରୀକ୍ଷା ଜୁଲାଇ ୫ ରେ ଆରମ୍ଭ ହେବ!"
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <div className="pt-1">
                <button
                  onClick={handleCTA}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#ea580c] hover:from-[#fbbf24] hover:to-[#f97316] text-[#ffffff] font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_10px_25px_rgba(245,158,11,0.25)] hover:shadow-[0_12px_35px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-98 border-t border-[#ffffff]/15 cursor-pointer z-10 text-card-white"
                >
                  {isRegistered ? (
                    <>
                      <span>ପ୍ରସ୍ତୁତି କରନ୍ତୁ</span>
                      <Lucide.BookOpen size={14} />
                    </>
                  ) : isRegistrationWindow ? (
                    <>
                      <span>ବର୍ତ୍ତମାନ ପଞ୍ଜିକରଣ କରନ୍ତୁ</span>
                      <Lucide.ArrowRight size={14} />
                    </>
                  ) : (
                    <>
                      <span>ଜୁଲାଇ ୧ ରୁ ଆରମ୍ଭ</span>
                      <Lucide.Calendar size={14} className="animate-pulse" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: The 3 Cash Prize Podium Cards (order-2 on mobile) */}
            <div className="flex flex-row items-end gap-3 sm:gap-4 shrink-0 pt-4 md:pt-0 z-10 order-2 md:order-3">
              
              {/* 2nd Place */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: revealedPrizes >= 2 ? 1 : 0, opacity: revealedPrizes >= 2 ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 12 }}
                className="flex flex-col items-center group/card"
              >
                <div className="w-20 sm:w-24 bg-[#0f172a] border border-[#cbd5e1]/15 rounded-2xl p-3 flex flex-col items-center justify-center relative shadow-lg hover:border-[#cbd5e1]/30 transition-all duration-300 card-border-slate">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#cbd5e1]/5 to-transparent rounded-2xl pointer-events-none" />
                  <div className="w-8 h-8 rounded-full bg-[#cbd5e1]/10 border border-[#cbd5e1]/25 flex items-center justify-center mb-1.5 card-border-slate">
                    <div className="text-lg font-black text-[#cbd5e1] text-card-slate">2</div>
                  </div>
                  <div className="text-[9px] font-black text-[#cbd5e1] uppercase tracking-wider text-card-slate">
                    ୨ୟ ସ୍ଥାନ
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#ffffff] mt-0.5 tracking-tight text-card-white">
                    ₹3000
                  </div>
                </div>
                <div className="w-16 h-2 bg-[#64748b]/15 blur-xs rounded-full mt-1.5" />
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: revealedPrizes >= 1 ? 1 : 0, opacity: revealedPrizes >= 1 ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 10 }}
                className="flex flex-col items-center group/card relative -top-3"
              >
                {/* Golden Outer Radial Glow */}
                {revealedPrizes >= 1 && (
                  <div className="absolute inset-0 -m-1 bg-gradient-to-tr from-[#f59e0b]/20 to-[#f97316]/20 rounded-[1.25rem] blur-md animate-pulse" />
                )}
                
                <div className="w-24 sm:w-28 bg-[#121c38] border border-[#fbbf24]/40 rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-[0_10px_25px_rgba(245,158,11,0.2)] hover:border-[#fbbf24] transition-all duration-300 card-border-amber">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#fbbf24]/5 to-transparent rounded-2xl pointer-events-none" />
                  <div className="w-10 h-10 rounded-full bg-[#fbbf24]/10 border border-[#fbbf24]/30 flex items-center justify-center mb-1.5 relative card-border-amber">
                    <div className="absolute inset-0 bg-[#fbbf24]/20 rounded-full blur-xs animate-ping" />
                    <Lucide.Trophy size={16} className="text-[#fbbf24] drop-shadow-[0_0_4px_rgba(251,191,36,0.5)] text-card-amber" />
                  </div>
                  <div className="text-[9px] font-black text-[#fbbf24] uppercase tracking-widest text-card-amber">
                    ୧ମ ସ୍ଥାନ
                  </div>
                  <div className="text-sm sm:text-base font-black text-[#fde68a] mt-0.5 tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] text-card-amber">
                    ₹5000
                  </div>
                </div>
                <div className="w-20 h-2 bg-[#ea580c]/30 blur-xs rounded-full mt-1.5" />
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: revealedPrizes >= 3 ? 1 : 0, opacity: revealedPrizes >= 3 ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 14 }}
                className="flex flex-col items-center group/card"
              >
                <div className="w-20 sm:w-24 bg-[#0f172a] border border-[#f97316]/25 rounded-2xl p-3 flex flex-col items-center justify-center relative shadow-lg hover:border-[#f97316]/50 transition-all duration-300 card-border-orange">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#f97316]/5 to-transparent rounded-2xl pointer-events-none" />
                  <div className="w-8 h-8 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center mb-1.5 card-border-orange">
                    <div className="text-lg font-black text-[#f97316] text-card-orange">3</div>
                  </div>
                  <div className="text-[9px] font-black text-[#f97316] uppercase tracking-wider text-card-orange">
                    ୩ୟ ସ୍ଥାନ
                  </div>
                  <div className="text-xs sm:text-sm font-black text-[#ffffff] mt-0.5 tracking-tight text-card-white">
                    ₹2000
                  </div>
                </div>
                <div className="w-16 h-2 bg-[#f97316]/10 blur-xs rounded-full mt-1.5" />
              </motion.div>

            </div>
          </div>
        </motion.div>
      </div>
    )}
    </AnimatePresence>,
    document.body
  );
}
