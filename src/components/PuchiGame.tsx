import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';

interface PuchiGameProps {
  user: any;
  onBack: () => void;
  language?: 'en' | 'or';
  onXpEarned?: (amount: number) => void;
}

interface BeatNote {
  id: number;
  lane: 'left' | 'right';
  y: number; // 0 (top) to 100 (bottom target)
  text: string; // "ତା", "ଧିନ୍", "ପୁଚି", "ନା"
}

export function PuchiGame({ user, onBack, onXpEarned }: PuchiGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [balance, setBalance] = useState<number>(100); // 0 to 100%
  const [squatState, setSquatState] = useState<'center' | 'left' | 'right'>('center');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('ତାଳ ଅନୁଯାୟୀ ଠିକ୍ ସମୟରେ ଟ୍ୟାପ୍ କର!');
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);

  const [notes, setNotes] = useState<BeatNote[]>([]);
  const nextNoteId = useRef<number>(0);
  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Lazy initialize a single persistent AudioContext to prevent browser audio context exhaustion
  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }
    
    // Resume context if suspended (browser security block)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    
    return audioCtxRef.current;
  };

  // Close context and stop BGM on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(err => console.warn(err));
        audioCtxRef.current = null;
      }
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // Manage Background Music (Raja-doli.mpeg) during active gameplay
  useEffect(() => {
    if (gameState === 'playing' && soundEnabled) {
      if (!bgmRef.current) {
        bgmRef.current = new Audio('/Raja-doli.mpeg');
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.45;
      }
      bgmRef.current.play().catch(err => console.warn("Failed to play BGM:", err));
    } else {
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
    }
  }, [gameState, soundEnabled]);

  // Web Audio Synth
  const playSynthSound = (type: 'tap-perfect' | 'tap-good' | 'miss' | 'win' | 'lose') => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'tap-perfect') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'tap-good') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440.00, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.08); // C#5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'miss') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(120.00, now);
        osc.frequency.linearRampToValueAtTime(70.00, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'win') {
        const arpeggio = [523.25, 659.25, 783.99, 1046.50];
        arpeggio.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.2);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
      } else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, now);
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

  // Start rhythm loop
  const startGame = () => {
    setGameState('playing');
    isPlayingRef.current = true;
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setBalance(100);
    setNotes([]);
    nextNoteId.current = 0;
    setGunduluSpeech('ଚାଲ ପୁଚି ଗୀତରେ ଗୋଡ଼ ମିଳାଇବା! ହେଇ ଆସିଲା ବିଟ୍!');

    // Spawning notes
    spawnTimerRef.current = setInterval(() => {
      const lane: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
      const syllables = ['ତା', 'ଧିନ୍', 'ପୁଚି', 'ନା', 'ଖେଳ', 'ଗୁଣ୍ଡୁଲୁ'];
      const text = syllables[Math.floor(Math.random() * syllables.length)];
      setNotes(prev => [...prev, { id: nextNoteId.current++, lane, y: 0, text }]);
    }, 1200);

    // Animation frame for sliding notes down
    let lastTime = performance.now();
    const updateNotes = (time: number) => {
      const delta = (time - lastTime) / 16.66; // scale by typical 60fps frame time
      lastTime = time;

      setNotes(prev => {
        const nextNotes: BeatNote[] = [];
        let missedCount = 0;

        prev.forEach(note => {
          const nextY = note.y + 0.8 * delta; // speed factor
          
          // Target hit zone is y=90..95. Miss threshold is y > 105.
          if (nextY > 105) {
            missedCount++;
          } else {
            nextNotes.push({ ...note, y: nextY });
          }
        });

        if (missedCount > 0) {
          setStreak(0);
          setBalance(b => {
            const nextB = Math.max(0, b - 10 * missedCount);
            if (nextB <= 0) {
              setGameState('gameover');
              isPlayingRef.current = false;
              playSynthSound('lose');
              setGunduluSpeech('ଓଃ! ଭାରସାମ୍ୟ ହରାଇ ପଡ଼ିଗଲୁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ!');
            }
            return nextB;
          });
          playSynthSound('miss');
        }

        return nextNotes;
      });

      if (isPlayingRef.current) {
        gameLoopRef.current = requestAnimationFrame(updateNotes);
      }
    };

    gameLoopRef.current = requestAnimationFrame(updateNotes);
  };

  // Stop loops when gameState changes to something other than playing
  useEffect(() => {
    if (gameState !== 'playing') {
      isPlayingRef.current = false;
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
        spawnTimerRef.current = null;
      }
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
  }, [gameState]);

  // Clean up completely on unmount
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

  // Handle tap action
  const handleTap = (lane: 'left' | 'right') => {
    if (!isPlayingRef.current) return;

    setSquatState(lane);
    setTimeout(() => setSquatState('center'), 200);

    // Find notes in the hit range of this lane
    // Perfect hit: y between 88 and 96. Good hit: y between 78 and 100.
    let hitNoteId = -1;
    let hitQuality: 'perfect' | 'good' | 'none' = 'none';

    notes.forEach(note => {
      if (note.lane === lane) {
        const distance = Math.abs(note.y - 92);
        if (distance <= 5) {
          hitNoteId = note.id;
          hitQuality = 'perfect';
        } else if (distance <= 12 && hitQuality !== 'perfect') {
          hitNoteId = note.id;
          hitQuality = 'good';
        }
      }
    });

    if (hitQuality !== 'none' && hitNoteId !== -1) {
      // Remove note
      setNotes(prev => prev.filter(n => n.id !== hitNoteId));
      
      // Update points and streak
      const pointsAdded = hitQuality === 'perfect' ? 50 : 20;
      setScore(s => {
        const nextS = s + pointsAdded;
        if (nextS >= 500) {
          // Win condition (reached target score in 30 seconds)
          setGameState('gameover');
          isPlayingRef.current = false;
          playSynthSound('win');
          confetti({ particleCount: 70, spread: 50 });
          setGunduluSpeech('ଅତି ସୁନ୍ଦର! ପୁଚି ନୃତ୍ୟରେ ଆପଣ ଚାମ୍ପିଅନ୍ ହେଲେ! 🏆 +120 XP');
          if (user) {
            user.xp = (user.xp || 150) + 120;
            setUserXp(user.xp);
          }
          if (onXpEarned) {
            onXpEarned(120);
          }
        }
        return nextS;
      });

      setStreak(st => {
        const nextSt = st + 1;
        if (nextSt > maxStreak) setMaxStreak(nextSt);
        return nextSt;
      });

      // Increase balance health
      setBalance(b => Math.min(100, b + 5));

      playSynthSound(hitQuality === 'perfect' ? 'tap-perfect' : 'tap-good');
      triggerHaptic(hitQuality === 'perfect' ? 25 : 12);
    } else {
      // Missed tap
      setStreak(0);
      setBalance(b => {
        const nextB = Math.max(0, b - 8);
        if (nextB <= 0) {
          setGameState('gameover');
          isPlayingRef.current = false;
          playSynthSound('lose');
          setGunduluSpeech('ଓଃ! ଭାରସାମ୍ୟ ହରାଇ ପଡ଼ିଗଲୁ। ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ!');
        }
        return nextB;
      });
      playSynthSound('miss');
      triggerHaptic(30);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        handleTap('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        handleTap('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notes, gameState]);

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xl space-y-6 relative overflow-hidden select-none">
      {/* Sambalpuri weaves */}
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />
      <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mt-2">
        <button 
          onClick={onBack} 
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm"
        >
          <Lucide.ArrowLeft size={16} />
        </button>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
          <Lucide.Music className="text-rose-500 animate-bounce" size={20} />
          ପୁଚି ଖେଳ (Traditional Rhythm Squat)
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

      {/* GUNDULU Dialogue Bubble */}
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
            <img src="/gundulu_puchi.png" alt="Puchi Cover" className="w-44 h-44 object-contain mx-auto drop-shadow-md rounded-2xl" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800">ପାରମ୍ପରିକ ପୁଚି ନୃତ୍ୟ ଚ୍ୟାଲେଞ୍ଜ</h3>
            <p className="text-xs text-slate-500 font-bold px-4 leading-relaxed">
              ତାଳ ଓ ସଙ୍ଗୀତ ଅନୁଯାୟୀ ବିଟ୍ ବବୁଲ ଗୁଡିକ ଟାର୍ଗେଟ୍ ସର୍କଲ ସହ ମିଳିଲେ Left କିମ୍ବା Right ଟ୍ୟାପ୍ କରନ୍ତୁ। ୫୦୦ ସ୍କୋର କରି ବିଜେତା ହୁଅନ୍ତୁ!
            </p>
          </div>
          <button 
            onClick={startGame} 
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-black rounded-3xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all text-sm"
          >
            🕹️ ଖେଳନ୍ତୁ (Play)
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="space-y-6">
          {/* HUD Stats */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs font-black border border-slate-200/50">
            <div>
              <div className="text-[9px] text-slate-400">ସ୍କୋର</div>
              <div className="text-sm text-slate-800 font-mono">🌟 {score} / 500</div>
            </div>
            <div className="border-x border-slate-200">
              <div className="text-[9px] text-slate-400">ଷ୍ଟ୍ରିକ୍</div>
              <div className="text-sm text-amber-600 font-mono">🔥 {streak}x</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">ସର୍ବାଧିକ ଷ୍ଟ୍ରିକ୍</div>
              <div className="text-sm text-slate-800 font-mono">👑 {maxStreak}</div>
            </div>
          </div>

          {/* Balance health bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black text-slate-500">
              <span>⚖️ ଗୁଣ୍ଡୁଲୁର ଭାରସାମ୍ୟ (Balance)</span>
              <span>{balance}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
              <div 
                className="h-full rounded-full transition-all duration-100 bg-gradient-to-r from-rose-500 to-emerald-500" 
                style={{ width: `${balance}%` }}
              />
            </div>
          </div>

          {/* RHYTHM HIGHWAY GRID */}
          <div className="relative h-[220px] bg-slate-50 border border-slate-200/80 rounded-3xl overflow-hidden flex shadow-inner">
            {/* Split lines */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-200 border-dashed" />
            
            {/* Lanes */}
            <div className="w-1/2 h-full relative" id="left-lane">
              {/* Target zone circle */}
              <div className="absolute bottom-4 inset-x-0 mx-auto w-12 h-12 rounded-full border-4 border-emerald-500/20 bg-emerald-50/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-emerald-600">LEFT</span>
              </div>
            </div>
            <div className="w-1/2 h-full relative" id="right-lane">
              {/* Target zone circle */}
              <div className="absolute bottom-4 inset-x-0 mx-auto w-12 h-12 rounded-full border-4 border-emerald-500/20 bg-emerald-50/20 flex items-center justify-center">
                <span className="text-[9px] font-black text-emerald-600">RIGHT</span>
              </div>
            </div>

            {/* Falling Beat notes */}
            {notes.map(note => {
              const xPos = note.lane === 'left' ? 'calc(25% - 20px)' : 'calc(75% - 20px)';
              // y coordinate maps 0% (top) to 82% (target circle center)
              const yPos = `${note.y * 0.82}%`;

              return (
                <motion.div
                  key={note.id}
                  style={{ left: xPos, top: yPos }}
                  className="absolute w-10 h-10 rounded-2xl bg-gradient-to-r from-rose-400 to-rose-500 text-white border border-rose-600/30 flex items-center justify-center text-xs font-black shadow-md shadow-rose-400/20"
                >
                  {note.text}
                </motion.div>
              );
            })}
          </div>

          {/* Mascot Squat Anim placeholder */}
          <div className="h-28 flex items-center justify-center border border-slate-100 rounded-3xl bg-slate-50/50 p-2 shadow-inner">
            <motion.div
              animate={{ 
                x: squatState === 'left' ? -60 : squatState === 'right' ? 60 : 0,
                y: squatState !== 'center' ? 30 : [0, -4, 0],
                rotate: squatState === 'left' ? -15 : squatState === 'right' ? 15 : 0
              }}
              transition={squatState !== 'center' ? { type: 'spring', stiffness: 300, damping: 15 } : { repeat: Infinity, duration: 2 }}
            >
              <img 
                src="/gundulu-v3.png" 
                alt="Dancing Gundulu" 
                className="w-20 h-20 object-contain drop-shadow" 
              />
            </motion.div>
          </div>

          {/* Touch buttons for mobile */}
          <div className="flex gap-4">
            <button
              onTouchStart={() => handleTap('left')}
              onClick={() => handleTap('left')}
              className="flex-1 py-4 bg-slate-100 border border-slate-200 active:bg-slate-200 rounded-3xl shadow-sm text-center text-xs font-black active:scale-95 transition-all text-slate-700"
            >
              ⬅️ LEFT SQUAT (A)
            </button>
            <button
              onTouchStart={() => handleTap('right')}
              onClick={() => handleTap('right')}
              className="flex-1 py-4 bg-slate-100 border border-slate-200 active:bg-slate-200 rounded-3xl shadow-sm text-center text-xs font-black active:scale-95 transition-all text-slate-700"
            >
              RIGHT SQUAT (D) ➡️
            </button>
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
              {score >= 500 ? '🎉 ବିଜୟ ହୋଇଛି! (Victory!)' : '💀 ଖେଳ ସମାପ୍ତ! (Game Over!)'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2 border-t border-slate-200 text-slate-500">
              <div>
                <div>ଅର୍ଜିତ ସ୍କୋର:</div>
                <div className="text-sm font-black text-slate-800">{score} Points</div>
              </div>
              <div>
                <div>ସର୍ବାଧିକ ଷ୍ଟ୍ରିକ୍:</div>
                <div className="text-sm font-black text-slate-800">{maxStreak}x</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full pt-2">
            <button 
              onClick={startGame} 
              className="flex-grow py-3.5 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-black text-xs rounded-2xl active:scale-95 transition-all shadow-md"
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
                  <Lucide.HelpCircle className="text-rose-500" size={24} />
                  <h2 className="text-xl font-black text-slate-900">ପୁଚି ଖେଳ - ନିୟମାବଳୀ</h2>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-rose-600 flex items-center gap-1.5">
                      🎵 ଖେଳ ଏବଂ ତାଳ ସଙ୍ଗୀତ
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଉପରୁ ଗ୍ଲାଇଡ୍ କରି ପଡ଼ୁଥିବା ବବଲ୍ (ତା, ଧିନ୍, ପୁଚି, ନା) ଗୁଡ଼ିକୁ ଠିକ୍ ସମୟରେ ଟ୍ୟାପ୍ କରନ୍ତୁ।</li>
                      <li>ବବଲ୍ ଗୁଡ଼ିକ ଠିକ୍ ତଳ ଗୋଲ ଟାର୍ଗେଟ୍ ସହ ଓଭରଲାପ୍ ହେବା ସମୟରେ ହିଁ ଟ୍ୟାପ୍ କରିବାକୁ ହେବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-blue-600 flex items-center gap-1.5">
                      ⌨️ କଣ୍ଟ୍ରୋଲ୍ ବଟନ୍
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li><strong>ବାମ ପଟ ବବଲ୍:</strong> ସ୍କ୍ରିନର ବାମ ପାର୍ଶ୍ୱରେ ଟ୍ୟାପ୍ କରନ୍ତୁ କିମ୍ବା କୀବୋର୍ଡର <strong>A / Left Arrow</strong> ଦବାନ୍ତୁ।</li>
                      <li><strong>ଡାହାଣ ପଟ ବବଲ୍:</strong> ସ୍କ୍ରିନର ଡାହାଣ ପାର୍ଶ୍ୱରେ ଟ୍ୟାପ୍ କରନ୍ତୁ କିମ୍ବା କୀବୋର୍ଡର <strong>D / Right Arrow</strong> ଦବାନ୍ତu।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-amber-600 flex items-center gap-1.5">
                      ⚖️ ସନ୍ତୁଳନ ରକ୍ଷା
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଯଦି ଆପଣ ଟ୍ୟାପ୍ ମିସ୍ କରନ୍ତି, ଗୁଣ୍ଡୁଲୁର ସନ୍ତୁଳନ ବିଗିଡ଼ିଯିବ।</li>
                      <li>ସନ୍ତୁଳନ ବାର୍ ଶୂନ୍ୟ (୦%) ହେବା ପୂର୍ବରୁ ସଠିକ୍ ଟ୍ୟାପ୍ କରି ଗୁଣ୍ଡୁଲୁକୁ ସୁସ୍ଥ ରଖନ୍ତୁ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
                      🏆 ସ୍କୋର ଓ ବିଜୟ
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>୩୦ ସେକେଣ୍ଡର ସୀମା ଭିତରେ ୫୦୦ରୁ ଅଧିକ ପଏଣ୍ଟ ସ୍କୋର କଲେ ଆପଣ ବିଜୟୀ ହେବେ ଏବଂ +150 XP ପାଇବେ!</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-black rounded-2xl text-xs transition-all shadow-md shadow-rose-500/10"
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
