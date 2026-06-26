import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';

interface LuchakaliGameProps {
  user: any;
  onBack: () => void;
  language?: 'en' | 'or';
  onXpEarned?: (amount: number) => void;
}

interface SearchItem {
  id: number;
  text: string;
  isTarget: boolean;
  isFound: boolean;
  x: number; // Percent 10..90
  y: number; // Percent 10..90
}

interface GameLevel {
  prompt: string;
  items: Omit<SearchItem, 'isFound' | 'x' | 'y'>[];
}

export function LuchakaliGame({ user, onBack, onXpEarned }: LuchakaliGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [score, setScore] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('ମ୍ୟାଜିକ୍ ଲାଇଟ୍ ବୁଲାଇ କାନ୍ଥରେ ଲୁଚିଥିବା ଶବ୍ଦ ଖୋଜନ୍ତୁ!');
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);

  // Spotlight coordinates relative to container
  const [spotlightPos, setSpotlightPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3 Game Levels
  const levels: GameLevel[] = [
    {
      prompt: "ଶୁଦ୍ଧ ଓଡ଼ିଆ ଶବ୍ଦ ଖୋଜନ୍ତୁ (Find correct Odia spellings):",
      items: [
        { id: 1, text: "କୃତିତ୍ବ", isTarget: true },
        { id: 2, text: "ଧୂଳି", isTarget: true },
        { id: 3, text: "ପୂଜା", isTarget: true },
        { id: 4, text: "ଶୀତଳ", isTarget: true },
        { id: 5, text: "କୃତିତ୍ୟ", isTarget: false }, // decoy
        { id: 6, text: "ଦୂଳି", isTarget: false }, // decoy
        { id: 7, text: "ପୁଜା", isTarget: false }, // decoy
        { id: 8, text: "ସୀତଳ", isTarget: false }, // decoy
      ]
    },
    {
      prompt: "x = 2 ହେଉଥିବା ସମୀକରଣ ଖୋଜନ୍ତୁ (Find equations where x = 2):",
      items: [
        { id: 1, text: "2x = 4", isTarget: true },
        { id: 2, text: "x + 3 = 5", isTarget: true },
        { id: 3, text: "3x - 2 = 4", isTarget: true },
        { id: 4, text: "5 - x = 3", isTarget: true },
        { id: 5, text: "2x = 6", isTarget: false }, // decoy (x=3)
        { id: 6, text: "x - 1 = 3", isTarget: false }, // decoy (x=4)
        { id: 7, text: "x + 2 = 5", isTarget: false }, // decoy (x=3)
        { id: 8, text: "4x = 4", isTarget: false }, // decoy (x=1)
      ]
    },
    {
      prompt: "ସହସମୀକରଣ (Simultaneous Equations) ର ସମ୍ବନ୍ଧୀୟ ଶବ୍ଦ ଖୋଜନ୍ତୁ:",
      items: [
        { id: 1, text: "ଲେଖଚିତ୍ର", isTarget: true },
        { id: 2, text: "କ୍ରାମର ନିୟମ", isTarget: true },
        { id: 3, text: "ସୁସଙ୍ଗତ", isTarget: true },
        { id: 4, text: "ଅସଙ୍ଗତ", isTarget: true },
        { id: 5, text: "ତ୍ରିକୋଣମିତି", isTarget: false }, // decoy
        { id: 6, text: "ଲସାଗୁ", isTarget: false }, // decoy
        { id: 7, text: "ଉତ୍ପାଦକ", isTarget: false }, // decoy
        { id: 8, text: "ପରିମିତି", isTarget: false }, // decoy
      ]
    }
  ];

  // Sound Synth
  const playSynthSound = (type: 'light-on' | 'found' | 'wrong' | 'victory' | 'lose') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'light-on') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
      } 
      else if (type === 'found') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(783.99, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.25);
      } 
      else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(90, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.25);
      } 
      else if (type === 'victory') {
        const notes = [392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.2);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.24);
        });
      } 
      else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.55);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const triggerHaptic = (ms: number) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  const initializeLevel = (levelIdx: number) => {
    const lvl = levels[levelIdx];
    
    // Spread coordinates randomly on a grid to prevent overlaps
    // 8 items, let's distribute them on an imaginary 3x3 grid (excluding center maybe)
    const gridPoints = [
      { x: 18, y: 18 }, { x: 50, y: 18 }, { x: 82, y: 18 },
      { x: 18, y: 50 },                  { x: 82, y: 50 },
      { x: 18, y: 82 }, { x: 50, y: 82 }, { x: 82, y: 82 }
    ];

    // Shuffle grid points
    const shuffledPoints = [...gridPoints].sort(() => Math.random() - 0.5);

    const levelItems = lvl.items.map((it, idx) => {
      const pt = shuffledPoints[idx] || { x: 30, y: 30 };
      // Add a slight jitter offset
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 8;

      return {
        ...it,
        isFound: false,
        x: Math.max(10, Math.min(90, pt.x + jitterX)),
        y: Math.max(10, Math.min(90, pt.y + jitterY))
      };
    });

    setItems(levelItems);
    setGunduluSpeech(`ଲେଭଲ୍ ${levelIdx + 1}: ` + lvl.prompt);
  };

  const startGame = () => {
    setGameState('playing');
    setCurrentLevelIdx(0);
    setScore(0);
    setTimeLeft(40);
    initializeLevel(0);
    playSynthSound('light-on');

    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState('gameover');
          playSynthSound('lose');
          setGunduluSpeech('ଖେଳ ସମାପ୍ତ! ସମୟ ସରିଗଲା।');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (gameState !== 'playing' && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Spotlight mouse tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Touch tracking for mobile
  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (touch) {
      setSpotlightPos({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
    }
  };

  // Handle word click
  const handleItemClick = (item: SearchItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameState !== 'playing' || item.isFound) return;

    // Verify if spotlight is overlapping this item
    // The spotlight has a radius of about 60px.
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const itemPxX = (item.x / 100) * rect.width;
    const itemPxY = (item.y / 100) * rect.height;
    const distance = Math.hypot(itemPxX - spotlightPos.x, itemPxY - spotlightPos.y);

    // If spotlight is not overlapping the item, ignore click
    if (distance > 75) return;

    if (item.isTarget) {
      // Correct target hit
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, isFound: true } : it));
      setScore(s => s + 50);
      playSynthSound('found');
      triggerHaptic(15);

      // Check if all targets in this level are found
      const levelTargets = items.filter(it => it.isTarget);
      const foundCount = items.filter(it => it.isTarget && it.isFound).length + 1; // including current one
      
      if (foundCount >= levelTargets.length) {
        // Advance level or win
        if (currentLevelIdx + 1 < levels.length) {
          const nextLvl = currentLevelIdx + 1;
          setCurrentLevelIdx(nextLvl);
          initializeLevel(nextLvl);
          setGunduluSpeech(`ଶାବାଶ! ପରବର୍ତ୍ତୀ ଲେଭଲ୍ ${nextLvl + 1} କୁ ଯାଆନ୍ତୁ!`);
        } else {
          // Completed all levels!
          setGameState('gameover');
          playSynthSound('victory');
          confetti({ particleCount: 80, spread: 60 });
          setGunduluSpeech('ଅତି ଚମତ୍କାର! ଲୁଚକାଳି ଖେଳରେ ସମସ୍ତ ଶବ୍ଦ ଖୋଜି ବିଜୟୀ ହେଲେ! 🏆 +120 XP');
          if (user) {
            user.xp = (user.xp || 150) + 120;
            setUserXp(user.xp);
          }
          if (onXpEarned) {
            onXpEarned(120);
          }
        }
      }
    } else {
      // Clicked decoy (deduct 5 seconds penalty)
      setTimeLeft(t => Math.max(0, t - 5));
      playSynthSound('wrong');
      triggerHaptic(40);
      setGunduluSpeech('ଓଃ! ଭୁଲ୍ ଶବ୍ଦ ପାଇଁ ୫ ସେକେଣ୍ଡର ଜୋରିମାନା କରାଗଲା।');
    }
  };

  const restartGame = () => {
    startGame();
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xl space-y-6 relative overflow-hidden select-none">
      {/* Sambalpuri weaves */}
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />
      <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mt-2">
        <button 
          onClick={onBack} 
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm"
        >
          <Lucide.ArrowLeft size={16} />
        </button>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
          <Lucide.Sparkles className="text-emerald-500" size={20} />
          ଲୁଚକାଳି ଖେଳ (Magic Flashlight Search)
        </h2>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowHelp(true)} 
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm"
            title="ଖେଳ ନିୟମ"
          >
            <Lucide.HelpCircle size={16} />
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
              soundEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {soundEnabled ? <Lucide.Volume2 size={16} /> : <Lucide.VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* GUNDULU DIALOGUE */}
      <div className="flex gap-3 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl relative shadow-inner">
        <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-r-[7px] border-r-slate-50 border-b-[5px] border-b-transparent" />
        <img 
          src="/gundulu-v3.png" 
          alt="Gundulu Coach" 
          className="w-10 h-10 object-contain shrink-0 border border-slate-200 bg-white rounded-full p-0.5" 
        />
        <p className="text-[11px] sm:text-xs text-slate-600 font-bold leading-relaxed">{gunduluSpeech}</p>
      </div>

      {gameState === 'menu' && (
        <div className="py-10 text-center space-y-6">
          <div className="relative inline-block animate-bounce-slow">
            <img src="/gundulu_luchakali.png" alt="Luchakali Cover" className="w-44 h-44 object-contain mx-auto drop-shadow-md rounded-2xl" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800">ଯାଦୁକରୀ ଆଲୋକ ଲୁଚକାଳି ଖେଳ</h3>
            <p className="text-xs text-slate-500 font-bold px-4 leading-relaxed">
              ଅନ୍ଧାର ରୁମ୍‌ରେ ଲାଇଟ୍ ବୁଲାଇ ପ୍ରଶ୍ନର ସଠିକ୍ ଉତ୍ତର ବବୁଲ୍ସ ଖୋଜନ୍ତୁ। ଭୁଲ୍ ଶବ୍ଦ କ୍ଲିକ୍ କଲେ ସମୟ କମିଯିବ!
            </p>
          </div>
          <button 
            onClick={startGame} 
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-3xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-sm"
          >
            🕹️ ଖେଳନ୍ତୁ (Play)
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="space-y-6">
          {/* HUD status */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs font-black border border-slate-200/50">
            <div>
              <div className="text-[9px] text-slate-400">ରାଉଣ୍ଡ ଲେଭଲ୍</div>
              <div className="text-sm text-slate-800 font-mono">🎯 {currentLevelIdx + 1} / 3</div>
            </div>
            <div className="border-x border-slate-200">
              <div className="text-[9px] text-slate-400">ସମୟ (Time Left)</div>
              <div className="text-sm text-red-500 font-mono">⏱️ {timeLeft}s</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">ଅର୍ଜିତ ସ୍କୋର</div>
              <div className="text-sm text-slate-800 font-mono">🪙 {score} XP</div>
            </div>
          </div>

          {/* Flashlight instructions */}
          <div className="text-[10px] text-slate-400 text-center font-bold">
            💡 ମାଉସ / ଟଚ୍ ସାହାଯ୍ୟରେ ଲାଇଟ୍ ବୁଲାଇ କ୍ଲିକ୍ କରନ୍ତୁ ।
          </div>

          {/* THE DARK PLAYFIELD CONTAINER */}
          <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative h-[250px] bg-slate-950 border border-slate-900 rounded-3xl overflow-hidden shadow-inner cursor-none"
          >
            {/* Draw floating words / items */}
            {items.map(item => {
              // Calculate distance to spotlight center
              if (!containerRef.current) return null;
              const rect = containerRef.current.getBoundingClientRect();
              const itemPxX = (item.x / 100) * rect.width;
              const itemPxY = (item.y / 100) * rect.height;
              const distance = Math.hypot(itemPxX - spotlightPos.x, itemPxY - spotlightPos.y);
              
              // Spotlight radius = 60px
              const isVisible = distance < 65 || item.isFound;

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleItemClick(item, e)}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: isVisible ? 1 : 0,
                    pointerEvents: isVisible ? 'auto' : 'none'
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-black shadow-sm transition-all ${
                    item.isFound
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  {item.text}
                  {item.isFound && <span className="ml-1 text-[9px]">✔️</span>}
                </div>
              );
            })}

            {/* Simulated dark overlay overlay with spotlight radial mask */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle 65px at ${spotlightPos.x}px ${spotlightPos.y}px, transparent 100%, rgba(3, 7, 18, 0.95) 100%)`
              }}
            />
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="py-6 text-center space-y-6">
          <div className="relative inline-block">
            <img src="/gundulu-v3.png" alt="Game Over Gundulu" className="w-28 h-28 object-contain mx-auto drop-shadow-md" />
            <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-white shadow">
              🏁 END
            </div>
          </div>
          
          <div className="space-y-2 bg-slate-50 border border-slate-200/50 p-4 rounded-3xl max-w-sm mx-auto">
            <h3 className="text-base font-black text-slate-800">
              {score >= 600 ? '🎉 ବିଜୟ ହୋଇଛି! (Victory!)' : '💀 ଖେଳ ସମାପ୍ତ! (Game Over!)'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2 border-t border-slate-200 text-slate-500">
              <div>
                <div>ଅର୍ଜିତ ସ୍କୋର:</div>
                <div className="text-sm font-black text-slate-800">{score} Points</div>
              </div>
              <div>
                <div>ସମୟ ବାକି:</div>
                <div className="text-sm font-black text-slate-800">{timeLeft}s</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full pt-2">
            <button 
              onClick={restartGame} 
              className="flex-grow py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs rounded-2xl active:scale-95 transition-all shadow-md"
            >
              🔄 ପୁଣି ଖେଳନ୍ତୁ (Retry)
            </button>
            <button 
              onClick={onBack} 
              className="flex-grow py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-black text-xs rounded-2xl active:scale-95 transition-all shadow-sm"
            >
              🚪 ଶେଷ କରନ୍ତୁ (Exit)
            </button>
          </div>
        </div>
      )}

      {/* HOW TO PLAY MODAL */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-950/40 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] p-7 md:p-8 shadow-2xl text-slate-800 overflow-hidden"
            >
              {/* Programmatic Sambalpuri trim on modal */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />

              {/* Close Button */}
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-5 right-5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
              >
                <Lucide.X size={16} />
              </button>

              <div className="space-y-6 mt-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lucide.HelpCircle className="text-emerald-500" size={24} />
                  <h2 className="text-xl font-black text-slate-900">ଲୁଚକାଳି ଖେଳ - ନିୟମାବଳୀ</h2>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
                      🔦 ଯାଦୁକରୀ ଟର୍ଚ୍ଚ
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>କଳା ପରଦା ଉପରେ ଆଙ୍ଗୁଠି କିମ୍ବା ମାଉସ୍ ବୁଲାଇ ଆଲୋକିତ Spotlight ସାହାଯ୍ୟରେ ଲୁଚିଥିବା ପାଠ୍ୟ ବବଲ୍ ଖୋଜନ୍ତୁ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-blue-600 flex items-center gap-1.5">
                      🎯 ସଠିକ୍ ଲକ୍ଷ୍ୟ
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଉପରେ ଦିଆଯାଇଥିବା ନିର୍ଦ୍ଦେଶ (ଯେପରିକି "ଶୁଦ୍ଧ ଓଡ଼ିଆ ଶବ୍ଦ ଖୋଜନ୍ତୁ" କିମ୍ବା "୩ ଦ୍ୱାରା ବିଭାଜ୍ୟ ସଂଖ୍ୟା ଖୋଜନ୍ତୁ") ଅନୁଯାୟୀ କେବଳ ସଠିକ୍ ବବଲ୍ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।</li>
                      <li>ସବୁ ସଠିକ୍ ଲକ୍ଷ୍ୟ ଖୋଜିବା ପରେ ପରବର୍ତ୍ତୀ ରାଉଣ୍ଡ ଖୋଲିବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-red-600 flex items-center gap-1.5">
                      ⚠️ ଭୁଲ୍ ଶବ୍ଦ
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଯଦି ଆପଣ କୌଣସି ଅଶୁଦ୍ଧ/ଭୁଲ୍ ଶବ୍ଦ ବା ବିକଳ୍ପ କ୍ଲିକ୍ କରନ୍ତି, ତେବେ ୩ ସେକେଣ୍ଡ ସମୟ କମିଯିବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-amber-600 flex items-center gap-1.5">
                      🏆 ସମୟ ଓ ସ୍କୋର
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଆପଣଙ୍କ ପାଖରେ ପ୍ରତି ଲେଭଲ୍ ଶେଷ କରିବାକୁ ୪୦ ସେକେଣ୍ଡ ସମୟ ରହିବ।</li>
                      <li>ସମୟ ଶେଷ ହେବା ପୂର୍ବରୁ ସମସ୍ତ ୩ଟି ଲେଭଲ୍ ପାର କଲେ ଆପଣ ବିଜୟୀ ହୋଇ +150 XP ଅର୍ଜନ କରିବେ!</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  ବୁଝିଗଲି, ଖେଳିବା!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
