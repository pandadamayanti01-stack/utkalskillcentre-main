import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { Student } from '../types';

interface LaunchCelebrationProps {
  onClose: () => void;
  user: Student | null;
  language: 'en' | 'or';
  theme: string;
}

interface Balloon {
  id: number;
  color: string;
  x: number; // percentage width
  y: number; // current pixel position from bottom
  popped: boolean;
  speed: number;
  size: number;
  symbol: string;
}

interface EmittedSymbol {
  id: number;
  symbol: string;
  x: number;
  y: number;
}

const BALLOON_COLORS = [
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

const EDUCATIONAL_SYMBOLS = [
  'ଅ', 'ଆ', 'ଇ', 'ଉ', 'ଏ', 'ଓ', 'କ', 'ଖ', 'ଗ', 'ଘ',
  'π', '∑', '√', '÷', '+', '−', '×', '=', 'x', 'y', '10', 'A+'
];

export default function LaunchCelebration({
  onClose,
  user,
  language,
  theme
}: LaunchCelebrationProps) {
  const [phase, setPhase] = useState<'box' | 'balloons' | 'video' | 'ticket'>('box');
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [emittedSymbols, setEmittedSymbols] = useState<EmittedSymbol[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(() => !!user?.claimedLaunchReward);
  const [showClaimSuccess, setShowClaimSuccess] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const celebrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const clapAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user?.claimedLaunchReward) {
      setClaimed(true);
    }
  }, [user]);

  // Dynamic voice greeting from Gundulu when Founding Member Ticket is revealed
  useEffect(() => {
    if (phase === 'ticket') {
      // Pause background celebration music immediately so the claps and voice greeting are 100% clear
      if (celebrationAudioRef.current) {
        celebrationAudioRef.current.pause();
      }

      let greetingText = '';
      
      if (language === 'or') {
        const studentName = user?.name ? `${user.name} ` : '';
        greetingText = `ଅନେକ ଅନେକ ଶۇଭେଚ୍ଛା ${studentName}! ମୁଁ ତୁମର ପଢ଼ା ସାଥୀ ଗୁନ୍ଦୁଲୁ କହୁଛି। ତୁମେ ସଫଳତାପୂର୍ବକ 'ଗୁନ୍ଦୁଲୁର ପ୍ରଥମ ସାଥୀ ପାସ୍' ହାସଲ କରିଛ, ସେଥିପାଇଁ ମୁଁ ବହୁତ ଖୁସି। ଏବେଠାରୁ ତୁମ ପାଠପଢ଼ା ଦାୟିତ୍ୱ ମୋର! ଏକ ବଡ଼ ଭଉଣୀ ଭଳି ମୁଁ ତୁମକୁ ସବୁ ସମସ୍ୟାରେ ବାଟ ଦେଖାଇବି। ଆସ, ଆମେ ଦୁହେଁ ମିଶି ମନ ଦେଇ ପଢ଼ିବା, ନୂଆ କଥା ଶିଖିବା ଓ ଜୀବନରେ ବହୁତ ଆଗକୁ ବଢ଼ିବା। ଚାଲ୍ ଆରମ୍ଭ କରିବା!`;
      } else {
        const studentName = user?.name ? `${user.name} ` : '';
        greetingText = `Many congratulations ${studentName}! I am your study buddy Gundulu speaking. You have successfully unlocked 'Gundulu's First Companion Pass', and I am extremely happy. From now on, your studies are my responsibility! Like an elder sister, I will guide you through all problems. Come, let's study attentively, learn new things, and move forward in life. Let's start!`;
      }

      // Multi-layer fallback: tries local static file first -> Gemini TTS -> browser SpeechSynthesis
      const speakGreeting = async (text: string) => {
        try {
          const staticFile = language === 'or' ? '/gundulu-greeting.mp3' : '/gundulu-greeting-en.mp3';
          // Verify file exists first to avoid 404 noise in the browser console
          const check = await fetch(staticFile, { method: 'HEAD' });
          if (!check.ok) {
            throw new Error(`Static greeting audio file not found on server (status: ${check.status})`);
          }
          const audio = new Audio(staticFile);
          ttsAudioRef.current = audio;
          await audio.play();
        } catch (err) {
          console.warn("Local static greeting audio unavailable/failed, attempting Gemini TTS API:", err);
          try {
            const response = await fetch('/api/tts/gemini', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, language }),
            });

            if (!response.ok) {
              throw new Error(`Gemini TTS API returned status ${response.status}`);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            ttsAudioRef.current = audio;
            await audio.play();
          } catch (apiErr) {
            console.warn("Gemini TTS greeting failed, falling back to browser SpeechSynthesis:", apiErr);
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = language;
              
              const voices = window.speechSynthesis.getVoices();
              const preferredVoice = voices.find(v => 
                v.lang.startsWith(language) && 
                (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
              ) || voices.find(v => v.lang.startsWith(language));
              
              if (preferredVoice) {
                utterance.voice = preferredVoice;
                utterance.pitch = language === 'or' ? 1.1 : 1.15;
                utterance.rate = 0.85;
              } else {
                utterance.pitch = language === 'or' ? 1.6 : 1.4;
                utterance.rate = 0.9;
              }
              window.speechSynthesis.speak(utterance);
            }
          }
        }
      };

      // Small delay of 1.2 seconds to allow the initial cheers, applause and confetti to settle
      const timer = setTimeout(() => {
        speakGreeting(greetingText);
      }, 1200);

      return () => {
        clearTimeout(timer);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
        }
      };
    }
  }, [phase, user, language]);
  
  // Synthesize a cute, high-quality pop sound using Web Audio API
  const playPopSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Pitch envelope
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn("Web Audio pop sound failed:", e);
    }
  };

  // Generate initial balloons
  const startBalloons = () => {
    // Play clap sound and celebration music
    if (celebrationAudioRef.current) {
      celebrationAudioRef.current.volume = 0.5;
      celebrationAudioRef.current.play().catch(e => console.log("Audio play blocked:", e));
    }
    
    const initialBalloons: Balloon[] = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      x: 15 + i * 10 + Math.random() * 8, // space them out
      y: -100 - Math.random() * 200, // start below viewport
      popped: false,
      speed: 1.5 + Math.random() * 2, // random float speed
      size: 60 + Math.random() * 30, // random size
      symbol: EDUCATIONAL_SYMBOLS[Math.floor(Math.random() * EDUCATIONAL_SYMBOLS.length)]
    }));
    
    setBalloons(initialBalloons);
    setPhase('balloons');
  };

  // Balloon floating animation loop
  useEffect(() => {
    if (phase !== 'balloons') return;

    let animFrame: number;
    
    const updateBalloons = () => {
      setBalloons(prev => {
        const updated = prev.map(b => {
          if (b.popped) return b;
          let nextY = b.y + b.speed;
          // Loop around if it goes past screen height
          const screenHeight = containerRef.current?.clientHeight || window.innerHeight;
          if (nextY > screenHeight + 100) {
            nextY = -100;
          }
          return { ...b, y: nextY };
        });

        // If all are popped, trigger video stage and pause background music
        if (updated.every(b => b.popped)) {
          setTimeout(() => {
            setPhase('video');
            if (celebrationAudioRef.current) {
              celebrationAudioRef.current.pause();
            }
          }, 600);
        }

        return updated;
      });

      animFrame = requestAnimationFrame(updateBalloons);
    };

    animFrame = requestAnimationFrame(updateBalloons);
    return () => cancelAnimationFrame(animFrame);
  }, [phase]);

  // Handle balloon pop
  const handlePop = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    
    // Play Pop sound
    playPopSound();

    setBalloons(prev => prev.map(b => {
      if (b.id !== id) return b;
      
      // Trigger confetti from the balloon position
      const clientX = e.clientX;
      const clientY = e.clientY;
      
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { x: clientX / window.innerWidth, y: clientY / window.innerHeight },
        colors: [b.color, '#ffffff', '#ffd700']
      });

      // Emit symbol animation
      const nextSymbolId = Date.now() + Math.random();
      setEmittedSymbols(syms => [
        ...syms,
        {
          id: nextSymbolId,
          symbol: b.symbol,
          x: clientX,
          y: clientY
        }
      ]);

      // Remove symbol from list after animation ends
      setTimeout(() => {
        setEmittedSymbols(syms => syms.filter(s => s.id !== nextSymbolId));
      }, 1500);

      return { ...b, popped: true };
    }));
  };

  // Claim 500 XP Launch Bonus in Firestore
  const handleClaimPoints = async () => {
    if (!user) return;
    setIsClaiming(true);
    try {
      const userRef = doc(firestore, 'users', user.id);
      await updateDoc(userRef, {
        points: increment(500),
        claimedLaunchReward: true
      });
      setClaimed(true);
      setShowClaimSuccess(true);
      
      // Explosive reward confetti
      confetti({
        particleCount: 80,
        spread: 100,
        colors: ['#ffd700', '#f59e0b', '#10b981']
      });
    } catch (e) {
      console.error("Failed to claim launch reward:", e);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = language === 'en'
      ? "🎉 Utkal Skill Centre is officially LIVE on Google Play Store! Download the free learning app for Math, Science & AI Tutor in Odia medium! 📚🚀 https://play.google.com/store/apps/details?id=com.utkalskillcentre.app"
      : "🎉 ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ଆପ୍ ଏବେ ଗୁଗଲ୍ ପ୍ଲେ ଷ୍ଟୋର୍‌ରେ ଲାଇଭ୍! ଓଡ଼ିଆ ମାଧ୍ୟମ ପିଲାଙ୍କ ପାଇଁ ଗଣିତ, ବିଜ୍ଞାନ ଓ AI ଟ୍ୟୁଟର୍ ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣା! 📚🚀 ଡାଉନଲୋଡ୍ କରନ୍ତୁ: https://play.google.com/store/apps/details?id=com.utkalskillcentre.app";
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleVideoEnd = () => {
    setPhase('ticket');
    // Blast of confetti for ticket reveal!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
    if (clapAudioRef.current) {
      clapAudioRef.current.play().catch(e => console.log("Clap play failed:", e));
    }
  };

  const handleComplete = () => {
    try {
      if (celebrationAudioRef.current) celebrationAudioRef.current.pause();
      if (clapAudioRef.current) clapAudioRef.current.pause();
      if (ttsAudioRef.current) ttsAudioRef.current.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Cleanup of celebration audio failed:", e);
    }
    localStorage.setItem('utkalPlayStoreLaunchSeen', 'true');
    onClose();
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
    >
      {/* Background Ambience */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {/* Phase 1: Golden Gift Box */}
        {phase === 'box' && (
          <motion.div
            key="box-phase"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0, rotate: [0, -15, 15, -15, 0] }}
            transition={{
              scale: { type: 'spring', damping: 15 },
              opacity: { type: 'tween', duration: 0.3 },
              rotate: { type: 'tween', duration: 0.5 }
            }}
            className="text-center max-w-sm flex flex-col items-center"
          >
            <div className="relative mb-6">
              <span className="absolute -top-6 -left-6 text-3xl animate-bounce">🎁</span>
              <span className="absolute -bottom-6 -right-6 text-3xl animate-pulse">✨</span>
              
              {/* Premium Golden Box */}
              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, -1, 1, -1, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                onClick={startBalloons}
                className="w-40 h-40 bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 rounded-[2.5rem] shadow-2xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all border border-amber-300 relative group overflow-hidden"
              >
                {/* Ribbon details */}
                <div className="absolute w-6 h-full bg-red-600 left-1/2 -translate-x-1/2"></div>
                <div className="absolute h-6 w-full bg-red-600 top-1/2 -translate-y-1/2"></div>
                <div className="absolute w-12 h-12 bg-red-500 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-inner border-2 border-yellow-300 flex items-center justify-center z-10 animate-[pulse_2s_infinite]">
                  <Lucide.Sparkles className="text-yellow-200" size={18} />
                </div>
                
                {/* Shiny highlight overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </motion.div>
            </div>

            <h2 className="text-2xl font-black text-amber-400 drop-shadow-md leading-tight mb-1">
              ଗୁନ୍ଦୁଲୁର ସ୍ପେଶାଲ୍ ଉପହାର! 🐿️
            </h2>
            <span className="text-[10px] uppercase tracking-widest font-black text-amber-500/70 block mb-4">
              Gundulu's Special Gift!
            </span>
            <p className="text-slate-300 text-xs font-bold max-w-xs leading-relaxed mb-2 px-2">
              ଗୁଗଲ୍ ପ୍ଲେ ଷ୍ଟୋର୍‌ରେ ଆପ୍ ଲାଇଭ୍ ହେବା ଖୁସିରେ ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କ ପାଇଁ ଏକ ସିକ୍ରେଟ୍ ଗିଫ୍ଟ ଆଣିଛି।
            </p>
            <p className="text-slate-400 text-[10px] font-bold max-w-xs leading-relaxed mb-6 italic">
              To celebrate our launch on Google Play Store, Gundulu has brought a secret gift!
            </p>
            
            <button
              onClick={startBalloons}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-amber-500/10 cursor-pointer animate-[pulse_2.5s_infinite]"
            >
              ଉପହାର ଖୋଲନ୍ତୁ 🎁 <span className="text-[10px] opacity-75 font-black ml-1">(Open Gift)</span>
            </button>
          </motion.div>
        )}

        {/* Phase 2: Balloon Pop Game */}
        {phase === 'balloons' && (
          <motion.div
            key="balloons-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Top Stats Banner */}
            <div className="absolute top-8 inset-x-0 mx-auto text-center z-50 px-4">
              <div className="inline-flex flex-col items-center justify-center px-6 py-4 rounded-3xl bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] backdrop-blur-md max-w-lg mx-auto animate-[pulse_2s_infinite]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Lucide.MousePointerClick size={18} className="text-yellow-400 animate-bounce" />
                  <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300 drop-shadow-sm">
                    🎈 ବେଲୁନ୍ ଉପରେ ଟ୍ୟାପ୍ କରି ଫୁଟାନ୍ତୁ!
                  </span>
                </div>
                <div className="text-xs font-black text-amber-200/90 mb-2">
                  ସମସ୍ତ ବେଲୁନ୍ ଫୁଟାଇ ଉପହାର ଅନ୍‌ଲକ୍ କରନ୍ତୁ!
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    (Tap & Pop all balloons to unlock gift!)
                  </span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black animate-pulse">
                    {balloons.filter(b => !b.popped).length} ବାକି ଅଛି (Remaining)
                  </span>
                </div>
              </div>
            </div>

            {/* Balloon elements */}
            {balloons.map((b) => {
              if (b.popped) return null;
              return (
                <motion.div
                  key={b.id}
                  style={{
                    position: 'absolute',
                    left: `${b.x}%`,
                    bottom: `${b.y}px`,
                    width: `${b.size}px`,
                    height: `${b.size * 1.2}px`,
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.08 }}
                  onClick={(e) => handlePop(e, b.id)}
                  className="relative group touch-none select-none"
                >
                  {/* Balloon body */}
                  <div
                    style={{ backgroundColor: b.color }}
                    className="w-full h-[85%] rounded-[50%_50%_50%_50%/_60%_60%_40%_40%] shadow-lg relative"
                  >
                    {/* Glossy shine highlight */}
                    <div className="absolute top-[10%] left-[15%] w-[20%] h-[30%] bg-white/30 rounded-full transform -rotate-[30deg]"></div>
                    
                    {/* Educational Symbol inside balloon */}
                    <div className="absolute inset-0 flex items-center justify-center text-white font-black drop-shadow text-base sm:text-lg select-none">
                      {b.symbol}
                    </div>
                  </div>
                  
                  {/* Balloon knot */}
                  <div
                    style={{ borderBottomColor: b.color }}
                    className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] mx-auto -mt-[1px]"
                  ></div>
                  
                  {/* Balloon string */}
                  <div className="w-[2px] h-12 bg-white/20 mx-auto -mt-[1px]"></div>
                </motion.div>
              );
            })}

            {/* Floating Symbol Renderers */}
            <AnimatePresence>
              {emittedSymbols.map((s) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 1, y: s.y, scale: 0.6 }}
                  animate={{
                    opacity: 0,
                    y: s.y - 180,
                    x: s.x + (Math.random() * 80 - 40),
                    scale: 2.2,
                    rotate: Math.random() * 60 - 30
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    left: s.x,
                    top: s.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="text-amber-400 font-black text-2xl drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)] select-none pointer-events-none z-40"
                >
                  {s.symbol}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Phase 2.5: Welcome Video Intro */}
        {phase === 'video' && (
          <motion.div
            key="video-phase"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md relative z-20"
          >
            {/* Top Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Lucide.Sparkles className="text-amber-400 animate-pulse" size={18} />
                <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-300">
                  {language === 'or' ? "ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ କରୁଛି!" : "Gundulu Welcomes You!"}
                </span>
              </div>
              <button
                onClick={handleVideoEnd}
                className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
              >
                {language === 'or' ? "ଭିଡିଓ ଏଡ଼ାନ୍ତୁ" : "Skip Video"} <Lucide.ArrowRight size={12} />
              </button>
            </div>

            {/* Video Player (Optimized for Portrait 9:16 aspect ratio) */}
            <div className="relative aspect-[9/16] max-h-[60vh] bg-slate-950 flex items-center justify-center">
              <video
                src="/gundulu-welcome.mp4"
                autoPlay
                playsInline
                controls
                onEnded={handleVideoEnd}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Footer Tag */}
            <div className="px-6 py-3 text-center bg-slate-950/20 text-[9px] uppercase tracking-widest text-slate-500 font-bold">
              {language === 'or' 
                ? "ଭିଡିଓ ପରେ ସ୍ପେଶାଲ୍ ପାସ୍ ମିଳିବ" 
                : "Special pass will unlock after the video"}
            </div>
          </motion.div>
        )}

        {/* Phase 3: Golden Holographic Ticket Reveal */}
        {phase === 'ticket' && (
          <motion.div
            key="ticket-phase"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="w-full max-w-sm"
          >
            {/* Holographic Shimmer Card */}
            <div className="relative group rounded-[2.5rem] p-0.5 bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 shadow-[0_0_50px_rgba(245,158,11,0.3)] border border-amber-300/30 overflow-hidden">
              
              {/* Shifting Golden Background */}
              <div className="absolute inset-0 bg-slate-950/90 rounded-[2.4rem] z-0" />
              
              {/* Animated Shimmer sweep */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500 ease-out z-10" />

              <div className="relative z-10 p-6 text-center flex flex-col items-center">
                {/* Sparkly corner badges */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400/50 rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400/50 rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400/50 rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400/50 rounded-br-lg"></div>

                {/* Logo & Mini Tag */}
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 mt-2">
                  <img src="/utkal-192.png" alt="Utkal Logo" className="w-10 h-10 object-contain" />
                </div>
                
                <span className="text-[9px] uppercase tracking-[0.3em] font-black text-amber-500/90 mb-1">
                  ଗୁଗଲ୍ ପ୍ଲେ ଷ୍ଟୋର୍ ଅଫିସିଆଲ୍ ଶୁଭାରମ୍ଭ
                </span>
                
                {/* Holographic Ticket Title */}
                <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-tight leading-tight mb-1 drop-shadow">
                  {language === 'or' ? 'ଗୁନ୍ଦୁଲୁର ପ୍ରଥମ ସାଥୀ ପାସ୍' : "GUNDULU'S FIRST COMPANION PASS"}
                </h1>
                <span className="text-[9px] font-black text-amber-400/80 uppercase tracking-wider block mb-4">
                  {language === 'or' ? "GUNDULU'S FIRST COMPANION PASS" : 'FOUNDING MEMBER GOLDEN TICKET'}
                </span>
                
                {/* Dashed separator */}
                <div className="w-full flex items-center gap-1.5 mb-5 px-4">
                  <div className="flex-1 border-t border-dashed border-amber-500/30"></div>
                  <span className="text-[9px] text-amber-500/50 font-bold uppercase tracking-widest font-mono">UTKAL-2026-TWA</span>
                  <div className="flex-1 border-t border-dashed border-amber-500/30"></div>
                </div>

                {/* Student Details Plate */}
                <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 mb-5 text-left">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] uppercase text-slate-500 font-bold">ଛାତ୍ରଙ୍କ ନାମ (STUDENT NAME)</span>
                    <span className="text-[9px] font-bold text-amber-400 font-mono">ଭିଆଇପି ସଦସ୍ୟ (VIP)</span>
                  </div>
                  <h3 className="text-sm font-black text-white mb-2 truncate">
                    {user?.name || 'ଅତିଥି ଛାତ୍ର (Guest Student)'}
                  </h3>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>ଶ୍ରେଣୀ (CLASS): {user?.class || 'N/A'}</span>
                    <span>ଆଇଡି (ID): {user?.id?.substring(0, 8).toUpperCase() || 'PIONEER'}</span>
                  </div>
                </div>

                {/* Points Reward Box */}
                <div className="w-full relative mb-6">
                  {user ? (
                    claimed ? (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center gap-2"
                      >
                        <Lucide.CheckCircle size={16} />
                        <span>୫୦୦ XP ଦାବି ହୋଇସାରିଛି! 🏆 (500 XP Claimed)</span>
                      </motion.div>
                    ) : (
                      <button
                        onClick={handleClaimPoints}
                        disabled={isClaiming}
                        className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isClaiming ? (
                          <>
                            <Lucide.Loader2 size={16} className="animate-spin" />
                            <span>Claiming...</span>
                          </>
                        ) : (
                          <>
                            <Lucide.Gift size={16} className="animate-bounce" />
                            <span>୫୦୦ XP ଶୁଭାରମ୍ଭ ଉପହାର ଦାବି କରନ୍ତୁ 🎁</span>
                          </>
                        )}
                      </button>
                    )
                  ) : (
                    <div className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-[10px] text-center leading-relaxed">
                      <div>୫୦୦ XP ଶୁଭାରମ୍ଭ ବୋନସ୍ ପାଇଁ ଲଗ୍‌ଇନ୍ କରନ୍ତୁ 🔑</div>
                      <div className="text-[8px] opacity-60 mt-0.5">(Log in to claim your +500 XP bonus)</div>
                    </div>
                  )}
                </div>

                {/* Google Play CTA */}
                <div className="w-full space-y-3 mb-2">
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.utkalskillcentre.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group/btn"
                  >
                    <div className="w-full py-3 px-4 bg-gradient-to-r from-slate-900 to-slate-950 hover:from-slate-800 hover:to-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-md transition-all active:scale-[0.98]">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] uppercase font-black text-amber-500 tracking-wider">
                          ଗୁଗଲ୍ ପ୍ଲେ ଷ୍ଟୋର୍ (GOOGLE PLAY)
                        </span>
                        <span className="text-xs font-black text-white mt-0.5">
                          ଆଣ୍ଡ୍ରଏଡ୍ ଆପ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 italic">
                          Official Android App Download
                        </span>
                      </div>
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                        alt="Play Store" 
                        className="h-7 object-contain group-hover/btn:scale-105 transition-transform"
                      />
                    </div>
                  </a>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleShareWhatsApp}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lucide.Share2 size={12} />
                      <span>ସେୟାର୍ (Share 📲)</span>
                    </button>
                    <button
                      onClick={handleComplete}
                      className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 font-black text-[10px] rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                    >
                      ୱେବ୍ ପ୍ରବେଶ (Enter Web)
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Celebration audio files */}
      <audio ref={celebrationAudioRef} src="/utkal-celebration.mpeg" preload="auto" />
      <audio ref={clapAudioRef} src="/celebration-claps.aac" preload="auto" />
    </div>
  );
}
