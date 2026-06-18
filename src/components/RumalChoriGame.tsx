import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';

interface RumalChoriGameProps {
  user: any;
  onBack: () => void;
  language?: 'en' | 'or';
}

interface Character {
  id: number;
  name: string;
  emoji: string;
  angle: number; // Angle on circle in degrees
  isPlayer: boolean;
}

export function RumalChoriGame({ user, onBack }: RumalChoriGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [round, setRound] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [thiefAngle, setThiefAngle] = useState<number>(0);
  const [isThiefRunning, setIsThiefRunning] = useState<boolean>(false);
  const [rumalDroppedBehind, setRumalDroppedBehind] = useState<number | null>(null); // Character ID where rumal is dropped
  const [statusMessage, setStatusMessage] = useState<string>('ବାଘ ଠାରୁ ରକ୍ଷା କର...');
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('ଚୋର ପଛରେ ବୁଲୁଛି, ରୁମାଲ୍ ପଡିବା ମାତ୍ରେ ତୁରନ୍ତ ଟ୍ୟାପ୍ କର!');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);

  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const thiefLoopRef = useRef<number | null>(null);

  const characters: Character[] = [
    { id: 0, name: 'ଆପଣ (You)', emoji: '👦', angle: 90, isPlayer: true }, // bottom
    { id: 1, name: 'ରିଙ୍କି (Rinki)', emoji: '👧', angle: 150, isPlayer: false },
    { id: 2, name: 'ମଣ୍ଟୁ (Mantu)', emoji: '👦', angle: 210, isPlayer: false },
    { id: 3, name: 'ଗୁନ୍ଦୁଲୁ (Gundu)', emoji: '🐼', angle: 270, isPlayer: false }, // top
    { id: 4, name: 'ଟିଙ୍କୁ (Tinku)', emoji: '👦', angle: 330, isPlayer: false },
    { id: 5, name: 'ସୋନା (Sona)', emoji: '👧', angle: 30, isPlayer: false },
  ];

  // Web Audio Synth
  const playSynthSound = (type: 'footstep' | 'drop' | 'chase' | 'caught' | 'victory' | 'lose') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'footstep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.setValueAtTime(60, now + 0.05);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'drop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'chase') {
        const notes = [440.00, 554.37, 659.25, 880.00];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.08, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.15);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.2);
        });
      } else if (type === 'caught') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'victory') {
        const notes = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.22);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.28);
        });
      } else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.6);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.65);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const triggerHaptic = (ms: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  // Start a new round of running
  const startRound = () => {
    setRumalDroppedBehind(null);
    setIsThiefRunning(true);
    setThiefAngle(0);
    setStatusMessage('ଚୋରଟି ବୁଲୁଛି... ଦେଖନ୍ତୁ କାହା ପଛରେ ପଡ଼ୁଛି!');
    setGunduluSpeech('ଆଖି ସାମ୍ନାରେ ରଖ! ଯେକୌଣସି ମୁହୂର୍ତ୍ତରେ ରୁମାଲ୍ ପଡିପାରେ!');
    
    // Footsteps interval simulator
    let stepCount = 0;
    const playSteps = setInterval(() => {
      if (isThiefRunning && rumalDroppedBehind === null) {
        playSynthSound('footstep');
      } else {
        clearInterval(playSteps);
      }
    }, 280);

    // Random drop delay (between 2 to 4.5 seconds)
    const dropDelay = Math.random() * 2500 + 2000;
    const dropTimer = setTimeout(() => {
      executeRumalDrop();
      clearInterval(playSteps);
    }, dropDelay);

    return () => {
      clearInterval(playSteps);
      clearTimeout(dropTimer);
    };
  };

  // Animate thief running in circle
  useEffect(() => {
    if (isThiefRunning && gameState === 'playing') {
      let lastTime = performance.now();
      const runThief = (time: number) => {
        const delta = (time - lastTime) / 16.66;
        lastTime = time;

        setThiefAngle(prev => {
          const next = (prev + 3 * delta) % 360;
          return next;
        });

        thiefLoopRef.current = requestAnimationFrame(runThief);
      };

      thiefLoopRef.current = requestAnimationFrame(runThief);
    } else {
      if (thiefLoopRef.current) cancelAnimationFrame(thiefLoopRef.current);
    }
    return () => {
      if (thiefLoopRef.current) cancelAnimationFrame(thiefLoopRef.current);
    };
  }, [isThiefRunning, gameState]);

  // Execute the handkerchief drop behind a random character
  const executeRumalDrop = () => {
    // Choose random character: 0 to 5
    const targetCharId = Math.floor(Math.random() * characters.length);
    setRumalDroppedBehind(targetCharId);
    playSynthSound('drop');
    triggerHaptic(25);

    // Position thief right behind the target character
    const targetChar = characters.find(c => c.id === targetCharId);
    if (targetChar) {
      setThiefAngle(targetChar.angle);
    }

    setIsThiefRunning(false);
    setStatusMessage(targetCharId === 0 ? 'ରୁମାଲ୍ ଆପଣଙ୍କ ପଛରେ ପଡ଼ିଛି! ତୁରନ୍ତ ଟ୍ୟାପ୍ କରନ୍ତୁ!' : `${characters[targetCharId].name} ପଛରେ ରୁମାଲ୍ ପଡ଼ିଛି! ଆଲର୍ଟ କରନ୍ତୁ!`);

    // Set reaction time limit based on round difficulty
    // Round 1: 1200ms, Round 2: 1000ms, Round 3: 850ms, Round 4+: 700ms
    const reactionWindow = Math.max(700, 1300 - round * 150);

    reactionTimeoutRef.current = setTimeout(() => {
      handleReactionTimeout(targetCharId);
    }, reactionWindow);
  };

  // Reaction timeout = failed to alert or react in time
  const handleReactionTimeout = (targetCharId: number) => {
    playSynthSound('caught');
    triggerHaptic([40, 30, 40]);
    setLives(l => {
      const nextL = l - 1;
      if (nextL <= 0) {
        setGameState('gameover');
        playSynthSound('lose');
        setGunduluSpeech('ଓଃ! ଖେଳ ଶେଷ ହେଲା। ପୁଣି ଥରେ ଚେଷ୍ଟା କରନ୍ତୁ!');
      } else {
        setStatusMessage('ଆପଣ ଧରାପଡ଼ିଗଲେ! ଲାଇଫ୍ ହରାଇଲେ।');
        setGunduluSpeech('ଆଉ ଟିକେ ଶୀଘ୍ର ପ୍ରତିକ୍ରିୟା ଦିଅ!');
        setTimeout(() => startRound(), 2000);
      }
      return nextL;
    });
  };

  // Handle player reaction tap
  // If player clicks the alert button or clicks on the correct character
  const handlePlayerReaction = (charId: number) => {
    if (rumalDroppedBehind === null || gameState !== 'playing') return;

    // Clear timeout since user reacted
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);

    if (charId === rumalDroppedBehind) {
      // Success! User successfully identified where the handkerchief was dropped
      playSynthSound('chase');
      triggerHaptic(15);
      
      setScore(s => {
        const nextS = s + 100;
        if (nextS >= 300) {
          // Victory condition (3 successful rounds)
          setGameState('gameover');
          playSynthSound('victory');
          confetti({ particleCount: 80, spread: 60 });
          setGunduluSpeech('ବହୁତ ବଢ଼ିଆ! ରୁମାଲ ଚୋରିରେ ଆପଣ ବିଜୟୀ ହେଲେ! 🏆 +100 XP');
          if (user) {
            user.xp = (user.xp || 150) + 100;
            setUserXp(user.xp);
          }
        } else {
          setRound(r => r + 1);
          setStatusMessage('ସଫଳ ଚେଜ୍! ଆପଣ ଚୋରକୁ ଧରିଦେଲେ।');
          setGunduluSpeech('ଶାବାଶ! ପରବର୍ତ୍ତୀ ରାଉଣ୍ଡ ପାଇଁ ପ୍ରସ୍ତୁତ ହୁଅ!');
          setTimeout(() => startRound(), 2200);
        }
        return nextS;
      });
    } else {
      // Wrong character alert counts as a mistake (caught)
      handleReactionTimeout(rumalDroppedBehind);
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setRound(1);
    setLives(3);
    setRumalDroppedBehind(null);
    setThiefAngle(0);
    setTimeout(() => startRound(), 1000);
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xl space-y-6 relative overflow-hidden select-none">
      {/* Sambalpuri trims */}
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
          <Lucide.EyeOff className="text-blue-500 animate-pulse" size={20} />
          ରୁମାଲ ଚୋରି ଖେଳ (Handkerchief Chase)
        </h2>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className={`p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
            soundEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        >
          {soundEnabled ? <Lucide.Volume2 size={16} /> : <Lucide.VolumeX size={16} />}
        </button>
      </div>

      {/* GUNDULU Dialouge */}
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
            <img src="/gundulu_rumal_chori.png" alt="Rumal Chori Cover" className="w-44 h-44 object-contain mx-auto drop-shadow-md rounded-2xl" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800">ରୁମାଲ ଚୋରି ପ୍ରତିକ୍ରିୟା ଚ୍ୟାଲେଞ୍ଜ</h3>
            <p className="text-xs text-slate-500 font-bold px-4 leading-relaxed">
              ସାଥୀମାନଙ୍କ ପଛରେ ଚୋର ରୁମାଲ୍ ପକାଇ ବୁଲିବ। ରୁମାଲ୍ ପଡିବା ମାତ୍ରେ ସଙ୍ଗେ ସଙ୍ଗେ ସେହି କ୍ୟାରେକ୍ଟର ଉପରେ କ୍ଲିକ୍ କରି ଆଲର୍ଟ କରନ୍ତୁ।
            </p>
          </div>
          <button 
            onClick={startGame} 
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-black rounded-3xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm"
          >
            🕹️ ଖେଳନ୍ତୁ (Play)
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="space-y-6">
          {/* HUD Status */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl text-center text-xs font-black border border-slate-200/50">
            <div>
              <div className="text-[9px] text-slate-400">ରାଉଣ୍ଡ</div>
              <div className="text-sm text-slate-800 font-mono">🎯 {round}</div>
            </div>
            <div className="border-x border-slate-200">
              <div className="text-[9px] text-slate-400">ଜୀବନ (Lives)</div>
              <div className="text-sm text-red-500 font-mono">❤️ {lives} / 3</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">ସ୍କୋର</div>
              <div className="text-sm text-slate-800 font-mono">🪙 {score} XP</div>
            </div>
          </div>

          {/* THE CIRCLE GAMEBOARD AREA */}
          <div className="flex justify-center py-4">
            <div className="relative w-[280px] h-[280px] rounded-full border-2 border-slate-200 bg-slate-50/50 shadow-inner flex items-center justify-center">
              {/* Central Ring line */}
              <div className="w-[180px] h-[180px] rounded-full border border-dashed border-slate-300" />
              
              {/* Sitting Characters */}
              {characters.map(char => {
                // Convert polar to cartesian coords
                const rad = (char.angle * Math.PI) / 180;
                const radius = 90; // offset from center
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;
                const hasRumal = rumalDroppedBehind === char.id;

                return (
                  <motion.div
                    key={char.id}
                    onClick={() => handlePlayerReaction(char.id)}
                    style={{ 
                      position: 'absolute',
                      left: `calc(50% + ${x}px - 22px)`,
                      top: `calc(50% + ${y}px - 22px)`
                    }}
                    className={`w-11 h-11 rounded-2xl bg-white border flex flex-col items-center justify-center cursor-pointer shadow hover:scale-105 active:scale-95 transition-all z-10 ${
                      hasRumal 
                        ? 'border-red-400 bg-red-50' 
                        : char.isPlayer 
                          ? 'border-blue-400 bg-blue-50/30' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{char.emoji}</span>
                    <span className="text-[7px] font-black text-slate-400 leading-none truncate max-w-full px-0.5">
                      {char.name}
                    </span>

                    {/* Handkerchief graphic indicator behind piece */}
                    {hasRumal && (
                      <motion.div 
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 12 }}
                        className="absolute -bottom-2.5 right-1 w-5 h-5 bg-red-500 rounded-bl-lg border border-white rotate-12 flex items-center justify-center shadow-sm"
                      >
                        <span className="text-[7px] text-white font-extrabold uppercase">ରୁମାଲ୍</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}

              {/* Running Thief */}
              {isThiefRunning && (
                <div 
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${Math.cos((thiefAngle * Math.PI) / 180) * 125}px - 14px)`,
                    top: `calc(50% + ${Math.sin((thiefAngle * Math.PI) / 180) * 125}px - 14px)`,
                  }}
                  className="w-7 h-7 rounded-xl bg-orange-400 border border-orange-500 flex items-center justify-center text-xs shadow z-20"
                >
                  🏃
                </div>
              )}
            </div>
          </div>

          {/* PLAYER ACTIONS AREA */}
          <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-3xl text-center space-y-3">
            <p className="text-xs font-black text-slate-600">{statusMessage}</p>
            
            {rumalDroppedBehind === 0 && (
              <motion.button
                initial={{ scale: 0.95 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                onClick={() => handlePlayerReaction(0)}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-black rounded-2xl shadow-lg active:scale-95 text-xs transition-all flex items-center justify-center gap-1"
              >
                🚨 ମୋ ପଛରେ ରୁମାଲ୍ ପଡିଛି! ଦୌଡ଼ନ୍ତୁ! (RUN!)
              </motion.button>
            )}
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
              {score >= 300 ? '🎉 ବିଜୟ ହୋଇଛି! (Victory!)' : '💀 ଖେଳ ସମାପ୍ତ! (Game Over!)'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2 border-t border-slate-200 text-slate-500">
              <div>
                <div>ଅର୍ଜିତ ସ୍କୋର:</div>
                <div className="text-sm font-black text-slate-800">{score} Points</div>
              </div>
              <div>
                <div>ଜୀବନ ସ୍ଥିତି:</div>
                <div className="text-sm font-black text-slate-800">{lives} / 3 Lives</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full pt-2">
            <button 
              onClick={startGame} 
              className="flex-grow py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs rounded-2xl active:scale-95 transition-all shadow-md"
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
    </div>
  );
}
