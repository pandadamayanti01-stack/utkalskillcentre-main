import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';

interface KaudiGameProps {
  user: any;
  onBack: () => void;
  language?: 'en' | 'or';
}

interface QuizQuestion {
  q: string;
  opts: string[];
  ans: number; // Index of correct option
  subj: 'math' | 'odia';
}

export function KaudiGame({ user, onBack }: KaudiGameProps) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'quiz' | 'gameover'>('menu');
  const [playerPosition, setPlayerPosition] = useState<number>(0); // 0 to 20
  const [rollsCount, setRollsCount] = useState<number>(0);
  const [lastRoll, setLastRoll] = useState<number[] | null>(null); // open(1) or closed(0) status of 4 cowries
  const [isRolling, setIsRolling] = useState<boolean>(false);
  
  // Quiz states
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('କଉଡ଼ି ଗଡ଼ାଇ ନିଜ ଭାଗ୍ୟ ଓ ଜ୍ଞାନ ପରଖ!');
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);

  const totalTiles = 20;
  const maxRolls = 12;

  // Simple inline syllabus question bank (Class 5-10 standard)
  const quizBank: QuizQuestion[] = [
    { q: "x + y = 6 ଏବଂ x - y = 2 ହେଲେ, x ର ମାନ କେତେ?", opts: ["x = 4", "x = 3", "x = 2", "x = 5"], ans: 0, subj: 'math' },
    { q: "ଯଦି D = 0 ହୁଏ, ତେବେ ସମୀକରଣର କେତୋଟି ସମାଧାନ ରହିବ?", opts: ["କୌଣସି ସମାଧାନ ନାହିଁ", "ଅନନ୍ୟ ସମାଧାନ", "ଅସୀମ ସମାଧାନ", "ଦୁଇଟି ସମାଧାନ"], ans: 2, subj: 'math' },
    { q: "‘କୃତିତ୍ୱ’ ଶବ୍ଦର ଶୁଦ୍ଧ ବନାନ କେଉଁଟି?", opts: ["କୃତିତ୍ଵ", "କୃତିତ୍ୟ", "କୃତ୍ତିତ୍ବ", "କୃତିତ୍ବ"], ans: 3, subj: 'odia' },
    { q: "‘ଧନ’ ର ବିପରୀତ ଶବ୍ଦ କେଉଁଟି?", opts: ["ନିର୍ଦ୍ଧନ", "ଦରିଦ୍ର", "ଗରିବ", "ଟଙ୍କା"], ans: 0, subj: 'odia' },
    { q: "| 3  2 | / | 1  4 | ଡିଟରମିନାଣ୍ଟ ର ମୂଲ୍ୟ କେତେ?", opts: ["10", "14", "2", "-10"], ans: 0, subj: 'math' },
    { q: "‘ସାବାସ’ ଶବ୍ଦଟି କେଉଁ ପ୍ରକାର ଅବ୍ୟୟ?", opts: ["ଭାବସୂଚକ", "ସମ୍ବୋଧନସୂଚକ", "ବିଭକ୍ତିସୂଚକ", "ସାଦୃଶ୍ୟସୂଚକ"], ans: 0, subj: 'odia' },
    { q: "ସମାନ୍ତର ପ୍ରଗତି (AP) ରେ nth ପଦର ସୂତ୍ର କଣ?", opts: ["a + nd", "a + (n-1)d", "a + (n+1)d", "n/2(2a + d)"], ans: 1, subj: 'math' },
  ];

  // Synthesizer
  const playSynthSound = (type: 'shake' | 'bounce' | 'correct' | 'wrong' | 'victory' | 'lose') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'shake') {
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
      } 
      else if (type === 'bounce') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.12);
      } 
      else if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
      } 
      else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.setValueAtTime(90, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
      } 
      else if (type === 'victory') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.22);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
      } 
      else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(140, now);
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

  const triggerHaptic = (ms: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  // Roll Kaudi action
  const rollKaudi = () => {
    if (isRolling || gameState === 'gameover' || gameState === 'quiz') return;

    setIsRolling(true);
    setRollsCount(r => r + 1);
    playSynthSound('shake');
    triggerHaptic([30, 20, 30]);

    // Animate roll sequence (intervals)
    let rollSteps = 0;
    const interval = setInterval(() => {
      // 4 cowries, each has 50% chance of landing open (1) or closed (0)
      const fakeRoll = [
        Math.random() > 0.5 ? 1 : 0,
        Math.random() > 0.5 ? 1 : 0,
        Math.random() > 0.5 ? 1 : 0,
        Math.random() > 0.5 ? 1 : 0,
      ];
      setLastRoll(fakeRoll);
      playSynthSound('bounce');
      rollSteps++;
      
      if (rollSteps >= 6) {
        clearInterval(interval);
        
        // Final Roll Result Calculation
        const finalRoll = [
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
          Math.random() > 0.5 ? 1 : 0,
        ];
        setLastRoll(finalRoll);

        const openCount = finalRoll.reduce((acc, c) => acc + c, 0);
        // open count to spaces mapping:
        // 1 open -> 1, 2 open -> 2, 3 open -> 3, 4 open -> 4, 0 open (all closed) -> 8!
        const spacesToMove = openCount === 0 ? 8 : openCount;

        setPlayerPosition(pos => {
          const nextPos = Math.min(totalTiles, pos + spacesToMove);
          
          setGunduluSpeech(`କଉଡ଼ିରେ ${openCount}ଟି ଚିତ୍ ପଡ଼ିଲା, ଆପଣ ${spacesToMove} ଘର ଆଗକୁ ଗଲେ!`);
          
          // Check win condition
          if (nextPos >= totalTiles) {
            setGameState('gameover');
            playSynthSound('victory');
            confetti({ particleCount: 80, spread: 60 });
            setGunduluSpeech(`ଅଭିନନ୍ଦନ! ଆପଣ ସମସ୍ତ ଘର ଅତିକ୍ରମ କରି ବିଜୟୀ ହେଲେ! 🏆 +150 XP`);
            if (user) {
              user.xp = (user.xp || 150) + 150;
              setUserXp(user.xp);
            }
          } 
          // Check quiz tile landing trigger (e.g. tile index is multiple of 4: 4, 8, 12, 16)
          else if (nextPos > 0 && nextPos % 4 === 0) {
            setTimeout(() => {
              triggerQuizTile();
            }, 1200);
          }
          // Check loss condition (out of rolls)
          else if (rollsCount + 1 >= maxRolls) {
            setGameState('gameover');
            playSynthSound('lose');
            setGunduluSpeech('ଖେଳ ଶେଷ! ଆପଣ ସୀମିତ ଚାଲି ଭିତରେ ଶେଷ ସୀମା ଛୁଇଁ ପାରିଲେନି।');
          }

          return nextPos;
        });

        setIsRolling(false);
      }
    }, 150);
  };

  const triggerQuizTile = () => {
    // Pick random question
    const q = quizBank[Math.floor(Math.random() * quizBank.length)];
    setCurrentQuiz(q);
    setSelectedOpt(null);
    setQuizFeedback(null);
    setGameState('quiz');
    setGunduluSpeech('ବାଟରେ ପ୍ରଶ୍ନ ଟାଇଲ୍ ଆସିଲା! ପ୍ରଶ୍ନର ସଠିକ୍ ଉତ୍ତର ଦେଇ ଆଗକୁ ବଢ଼ନ୍ତୁ।');
  };

  const handleQuizAnswer = (idx: number) => {
    if (!currentQuiz || quizFeedback !== null) return;

    setSelectedOpt(idx);
    const isCorrect = idx === currentQuiz.ans;
    setQuizFeedback(isCorrect ? 'correct' : 'wrong');
    playSynthSound(isCorrect ? 'correct' : 'wrong');
    triggerHaptic(isCorrect ? 15 : 40);

    setTimeout(() => {
      setPlayerPosition(pos => {
        const nextPos = isCorrect 
          ? Math.min(totalTiles, pos + 1) // correct moves +1
          : Math.max(0, pos - 1); // wrong moves -1

        if (nextPos >= totalTiles) {
          setGameState('gameover');
          playSynthSound('victory');
          confetti({ particleCount: 80, spread: 60 });
          setGunduluSpeech(`ଅଭିନନ୍ଦନ! ପ୍ରଶ୍ନର ଉତ୍ତର ଦେଇ ଆପଣ ଶେଷ ସୀମା ପାର କଲେ! 🏆 +150 XP`);
          if (user) {
            user.xp = (user.xp || 150) + 150;
            setUserXp(user.xp);
          }
        } else {
          setGameState('playing');
          setGunduluSpeech(isCorrect ? 'ଅତି ଉତ୍ତମ! ଆପଣ ଗୋଟିଏ ଘର ଆଗକୁ ବଢ଼ିଲେ।' : 'ଓଃ! ଭୁଲ୍ ଉତ୍ତର ପାଇଁ ଗୋଟିଏ ଘର ପଛକୁ ଫେରିଲେ।');
        }

        // Check loss condition
        if (rollsCount >= maxRolls && nextPos < totalTiles) {
          setGameState('gameover');
          playSynthSound('lose');
          setGunduluSpeech('ଖେଳ ଶେଷ! ଆପଣ ସୀମିତ ଚାଲି ଭିତରେ ଶେଷ ସୀମା ଛୁଇଁ ପାରିଲେନି।');
        }

        return nextPos;
      });
      setCurrentQuiz(null);
    }, 1800);
  };

  const restartGame = () => {
    setPlayerPosition(0);
    setRollsCount(0);
    setLastRoll(null);
    setIsRolling(false);
    setGameState('playing');
    setGunduluSpeech('କଉଡ଼ି ଗଡ଼ାଇ ନିଜ ଭାଗ୍ୟ ଓ ଜ୍ଞାନ ପରଖ!');
  };

  const startGame = () => {
    setGameState('playing');
    setPlayerPosition(0);
    setRollsCount(0);
    setLastRoll(null);
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
          <Lucide.Gamepad className="text-purple-500" size={20} />
          କଉଡ଼ି ଖେଳ (Cowrie Shell Race)
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
            <img src="/gundulu_kaudi.png" alt="Kaudi Cover" className="w-44 h-44 object-contain mx-auto drop-shadow-md rounded-2xl" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800">କଉଡ଼ି ଭାଗ୍ୟ ଓ ଜ୍ଞାନ ପଥ ଦୌଡ଼</h3>
            <p className="text-xs text-slate-500 font-bold px-4 leading-relaxed">
              ୪ଟି କଉଡ଼ି ପକାଇ ଆଗକୁ ବଢ଼ନ୍ତୁ। ବାଟରେ ପ୍ରଶ୍ନର ସଠିକ୍ ଉତ୍ତର ଦେଇ ମନ୍ଦିର ଲକ୍ଷ୍ୟସ୍ଥଳରେ ପହଞ୍ଚନ୍ତୁ!
            </p>
          </div>
          <button 
            onClick={startGame} 
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-3xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all text-sm"
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
              <div className="text-[9px] text-slate-400">କଉଡ଼ି ଚାଲି</div>
              <div className="text-sm text-slate-800 font-mono">🎲 {rollsCount} / {maxRolls}</div>
            </div>
            <div className="border-x border-slate-200">
              <div className="text-[9px] text-slate-400">ସାମ୍ପ୍ରତିକ ସ୍ଥିତି</div>
              <div className="text-sm text-purple-600 font-mono">🏁 {playerPosition} / {totalTiles}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">ମୋଟ ସ୍କୋର</div>
              <div className="text-sm text-slate-800 font-mono">🪙 {userXp} XP</div>
            </div>
          </div>

          {/* PATHWAY BOARD SCROLLER */}
          <div className="h-28 overflow-x-auto overflow-y-hidden border border-slate-200 bg-slate-50/50 rounded-3xl p-3 flex items-center shadow-inner gap-2">
            {Array.from({ length: totalTiles + 1 }).map((_, idx) => {
              const hasPlayer = playerPosition === idx;
              const isQuizTile = idx > 0 && idx % 4 === 0;

              return (
                <div 
                  key={`tile-${idx}`}
                  className={`w-12 h-12 shrink-0 rounded-2xl border flex flex-col items-center justify-center relative transition-all duration-300 ${
                    hasPlayer 
                      ? 'bg-purple-100 border-purple-400 scale-105 shadow shadow-purple-200 z-10' 
                      : isQuizTile 
                        ? 'bg-amber-50 border-amber-300' 
                        : idx === totalTiles 
                          ? 'bg-emerald-50 border-emerald-400' 
                          : 'bg-white border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-black text-slate-400 leading-none mb-0.5">{idx}</span>
                  {idx === totalTiles ? (
                    <span className="text-xs">🕌</span>
                  ) : isQuizTile ? (
                    <span className="text-xs text-amber-500 font-black">❓</span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-400">ପଥ</span>
                  )}

                  {/* Player Mascot counter */}
                  {hasPlayer && (
                    <motion.div 
                      layoutId="player-counter"
                      className="absolute -top-3 w-8 h-8 rounded-full border-2 border-white bg-white drop-shadow flex items-center justify-center overflow-hidden"
                    >
                      <img src="/gundulu-v3.png" alt="Mascot counter" className="w-full h-full object-contain" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* COWRY ROLL GRAPHIC */}
          <div className="h-24 bg-slate-100 border border-slate-200/60 rounded-3xl p-3 flex justify-center items-center gap-4 shadow-inner relative">
            <AnimatePresence>
              {lastRoll ? (
                lastRoll.map((c, idx) => (
                  <motion.div
                    key={`cowry-${idx}-${rollsCount}`}
                    initial={{ y: -50, rotateX: 0, rotateY: 0, scale: 0.5 }}
                    animate={{ 
                      y: 0, 
                      rotateX: c === 1 ? 180 : 0, 
                      rotateY: c === 1 ? 180 : 0, 
                      scale: 1 
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                    className={`w-10 h-14 rounded-full border-2 shadow-sm flex items-center justify-center font-black text-xs ${
                      c === 1 
                        ? 'bg-amber-50 border-amber-300 text-amber-800' // Open (mouth/flat side up)
                        : 'bg-slate-200 border-slate-400 text-slate-500' // Closed (round side up)
                    }`}
                  >
                    {c === 1 ? '🐚' : '🪨'}
                  </motion.div>
                ))
              ) : (
                <div className="text-slate-400 text-xs font-bold">କଉଡ଼ି ଗଡ଼ାଇବା ପାଇଁ ରୋଲ୍ ଦବାନ୍ତୁ...</div>
              )}
            </AnimatePresence>
          </div>

          {/* Roll Button */}
          <button
            onClick={rollKaudi}
            disabled={isRolling}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-3xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5"
          >
            <Lucide.RefreshCw size={14} className={isRolling ? 'animate-spin' : ''} />
            <span>ରୋଲ୍ କାଉଡ଼ି (ROLL KAUDI)</span>
          </button>
        </div>
      )}

      {gameState === 'quiz' && currentQuiz && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black text-amber-600 uppercase">
              <span>❓ ପ୍ରଶ୍ନ ଟାଇଲ୍</span>
              <span>{currentQuiz.subj === 'math' ? '🧮 ଗଣିତ' : '✍️ ଓଡ଼ିଆ'}</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 leading-relaxed">{currentQuiz.q}</h3>
          </div>

          <div className="space-y-3">
            {currentQuiz.opts.map((opt, idx) => {
              const isSelected = selectedOpt === idx;
              const isCorrect = idx === currentQuiz.ans;
              const showResult = quizFeedback !== null;
              
              return (
                <button
                  key={`opt-${idx}`}
                  disabled={showResult}
                  onClick={() => handleQuizAnswer(idx)}
                  className={`w-full py-3.5 px-4 text-left font-bold text-xs rounded-2xl border transition-all flex items-center justify-between ${
                    showResult 
                      ? isCorrect 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                        : isSelected 
                          ? 'bg-rose-50 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-100 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{idx + 1}. {opt}</span>
                  {showResult && isCorrect && <Lucide.CheckCircle size={14} className="text-emerald-500" />}
                  {showResult && isSelected && !isCorrect && <Lucide.XCircle size={14} className="text-rose-500" />}
                </button>
              );
            })}
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
              {playerPosition >= totalTiles ? '🎉 ବିଜୟ ହୋଇଛି! (Victory!)' : '💀 ଖେଳ ସମାପ୍ତ! (Game Over!)'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2 border-t border-slate-200 text-slate-500">
              <div>
                <div>ମୋଟ ରୋଲ୍:</div>
                <div className="text-sm font-black text-slate-800">{rollsCount} Rolls</div>
              </div>
              <div>
                <div>ଶେଷ ସ୍ଥାନ:</div>
                <div className="text-sm font-black text-slate-800">{playerPosition} / {totalTiles}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 w-full pt-2">
            <button 
              onClick={restartGame} 
              className="flex-grow py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs rounded-2xl active:scale-95 transition-all shadow-md"
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
