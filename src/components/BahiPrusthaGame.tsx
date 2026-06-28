import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';

import { 
  MATH_LEVELS, 
  ODIA_TEXTBOOK_SENTENCES, 
  PLAYBOOKS, 
  Playbook, 
  PlaybookPage, 
  MathLevelConfig, 
  OdiaSentenceQuestion 
} from '../data/bahiPrusthaData';

interface BahiPrusthaGameProps {
  user: any;
  onBack: () => void;
  language?: 'en' | 'or';
  onXpEarned?: (amount: number) => void;
}

export function BahiPrusthaGame({ user, onBack, onXpEarned }: BahiPrusthaGameProps) {
  // Navigation & Menu States
  const [selectedClass, setSelectedClass] = useState<number>(Number(user?.class?.replace(/\D/g, '')) || 5);
  const [activeMode, setActiveMode] = useState<'syllabus' | 'playbook'>('syllabus');
  const [selectedSubject, setSelectedSubject] = useState<'math' | 'odia'>('math');
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);
  const [unlockedPlaybooks, setUnlockedPlaybooks] = useState<string[]>(['fox-crow']);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');

  // PvP State (Local AI Opponent)
  const [opponent, setOpponent] = useState<{ id: string; name: string; score: number; currentPage: number } | null>(null);

  // Gameplay States
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [maxRounds] = useState<number>(5);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('ଆସ ବିଦ୍ୟାର ବଳ ପରୀକ୍ଷା କରିବା!');

  // Game content selection
  const [currentMathPage, setCurrentMathPage] = useState<number>(12);
  const [currentMathSum, setCurrentMathSum] = useState<number>(3);
  const [currentOdiaQuestion, setCurrentOdiaQuestion] = useState<OdiaSentenceQuestion | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [playbookIndex, setPlaybookIndex] = useState<number>(0);

  // Animation helper states
  const [pageDirection, setPageDirection] = useState<'left' | 'right'>('right');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [userSelection, setUserSelection] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound Synthesizer via Web Audio API
  const playSynthSound = (type: 'page-flip' | 'correct' | 'wrong' | 'victory') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'page-flip') {
        // Synthesize a white-noise sweep for turning paper
        const bufferSize = ctx.sampleRate * 0.25; // 0.25s
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        filter.Q.setValueAtTime(3, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noiseNode.start(now);
      } 
      else if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.35);
      } 
      else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(120.0, now); // Low tone
        osc.frequency.setValueAtTime(90.0, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.35);
      } 
      else if (type === 'victory') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Arpeggio
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.1, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.1 + 0.25);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.3);
        });
      }
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  };

  // Vibration feedback
  const triggerHaptic = (type: 'flip' | 'error' | 'win') => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      if (type === 'flip') {
        window.navigator.vibrate(12);
      } else if (type === 'error') {
        window.navigator.vibrate([35, 20, 35]);
      } else if (type === 'win') {
        window.navigator.vibrate([15, 30, 15, 30, 25]);
      }
    }
  };


  // Timer loop during playing
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAnswerSelect(null, true); // Timeout counts as wrong answer
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentRound, currentMathPage, currentOdiaQuestion, playbookIndex]);

  // Generate turn content
  const prepareNextRound = () => {
    setFeedback(null);
    setUserSelection(null);
    setTimeLeft(15);
    setIsFlipped(false);
    playSynthSound('page-flip');

    if (activeMode === 'syllabus') {
      if (selectedSubject === 'math') {
        const config = MATH_LEVELS[selectedClass];
        // Generate random page number
        const page = Math.floor(Math.random() * (config.maxPage - config.minPage + 1)) + config.minPage;
        setCurrentMathPage(page);
        
        // Calculate digit sum
        const sum = page.toString().split('').reduce((acc, curr) => acc + Number(curr), 0);
        setCurrentMathSum(sum);
      } else {
        // Odia mode: pick random sentence
        const questions = ODIA_TEXTBOOK_SENTENCES[selectedClass] || ODIA_TEXTBOOK_SENTENCES[5];
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        setCurrentOdiaQuestion(randomQ);
      }
    } else {
      // Playbook mode
      if (selectedPlaybook) {
        setPlaybookIndex((prev) => {
          if (prev >= selectedPlaybook.pages.length - 1) {
            setGameState('gameover');
            return prev;
          }
          return prev + 1;
        });
      }
    }

    // Simulate opponent progress in PvP
    if (opponent) {
      setTimeout(() => {
        setOpponent(prev => {
          if (!prev) return null;
          const randomInc = Math.random() > 0.4 ? 10 : 0;
          return {
            ...prev,
            score: prev.score + randomInc,
            currentPage: prev.currentPage + 1
          };
        });
      }, Math.random() * 6000 + 4000);
    }
  };

  // Start gameplay directly against Gundulu AI
  const startGame = () => {
    setOpponent({
      id: 'gundulu_bot',
      name: 'ଗୁନ୍ଦୁଲୁ AI (ଶ୍ରେଣୀ ' + selectedClass + ')',
      score: 0,
      currentPage: 1
    });
    setGunduluSpeech('ଖେଳିବା ପାଇଁ ପ୍ରସ୍ତୁତ ହୁଅ! ମୁଁ ତୁମକୁ ସହଜରେ ଜିତିବାକୁ ଦେବିନି!');
    
    setGameState('playing');
    setScore(0);
    setStreak(0);
    setCurrentRound(1);
    setPlaybookIndex(0);
    
    // Initial page generation
    if (activeMode === 'syllabus') {
      if (selectedSubject === 'math') {
        const config = MATH_LEVELS[selectedClass];
        const page = Math.floor(Math.random() * (config.maxPage - config.minPage + 1)) + config.minPage;
        setCurrentMathPage(page);
        setCurrentMathSum(page.toString().split('').reduce((acc, curr) => acc + Number(curr), 0));
      } else {
        const questions = ODIA_TEXTBOOK_SENTENCES[selectedClass] || ODIA_TEXTBOOK_SENTENCES[5];
        setCurrentOdiaQuestion(questions[0]);
      }
    }
  };

  // Process Selection & Answer
  const handleAnswerSelect = (optionValue: any, isTimeout = false) => {
    if (feedback) return; // Prevent double taps

    if (timerRef.current) clearInterval(timerRef.current);
    setUserSelection(optionValue);

    let isCorrect = false;

    if (isTimeout) {
      isCorrect = false;
    } else if (activeMode === 'syllabus') {
      if (selectedSubject === 'math') {
        const config = MATH_LEVELS[selectedClass];
        if (config.questionType === 'modulo') {
          // even or odd
          const actualIsEven = currentMathSum % 2 === 0;
          const choiceIsEven = optionValue === 'ଯୁଗ୍ମ';
          isCorrect = actualIsEven === choiceIsEven;
        } else if (config.questionType === 'divisibility') {
          // divisible by 3
          const actualDivisible = currentMathPage % 3 === 0;
          const choiceDivisible = optionValue === 'ହଁ';
          isCorrect = actualDivisible === choiceDivisible;
        } else {
          isCorrect = Number(optionValue) === currentMathSum;
        }
      } else {
        // Odia Mode
        isCorrect = optionValue === currentOdiaQuestion?.missingWord;
      }
    } else {
      // Playbook Mode
      isCorrect = optionValue === selectedPlaybook?.pages[playbookIndex].embeddedQuestion.correctAnswer;
    }

    // Visual page flip effect trigger
    setIsFlipped(true);
    triggerHaptic(isCorrect ? 'flip' : 'error');

    if (isCorrect) {
      setFeedback('correct');
      playSynthSound('correct');
      // Scoring algorithm including speed multiplier
      const timeBonus = Math.max(0, Math.floor(timeLeft * 1.5));
      const pointsWon = 50 + (streak * 10) + timeBonus;
      setScore((prev) => prev + pointsWon);
      setStreak((prev) => prev + 1);

      // Random congratulatory comments in Odia from Gundulu
      const winPhrases = [
        'ଅଦ୍ଭୁତ ବୁଦ୍ଧି! ସାବାସ!',
        'ତୁମେ ତ ଖେଳରେ ଓସ୍ତାଦ!',
        'ବାଃ! ତୁମ ଗଣିତ ବହୁତ ତେଜ!',
        'ସଠିକ୍ ଉତ୍ତର, ଆଗକୁ ବଢି ଚାଲ!'
      ];
      setGunduluSpeech(winPhrases[Math.floor(Math.random() * winPhrases.length)]);
    } else {
      setFeedback('wrong');
      playSynthSound('wrong');
      setStreak(0);

      // Encouraging comments in Odia from Gundulu
      const losePhrases = [
        'ଓଃ! ସାମାନ୍ୟ ଭୁଲ ହେଲା, ବ୍ୟସ୍ତ ହୁଅନି।',
        'ଧ୍ୟାନ ଦିଅ, ଆରଥରକୁ ନିଶ୍ଚୟ ହେବ!',
        'ଚେଷ୍ଟା କର, ଗୁନ୍ଦୁଲୁ ତୁମ ସାଙ୍ଗରେ ଅଛି!',
        'ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନରେ ସାବଧାନ ରୁହ।'
      ];
      setGunduluSpeech(losePhrases[Math.floor(Math.random() * losePhrases.length)]);
    }

    // Save and advance to next round
    setTimeout(() => {
      if (activeMode === 'syllabus') {
        if (currentRound < maxRounds) {
          setCurrentRound((prev) => prev + 1);
          prepareNextRound();
        } else {
          endGameSession();
        }
      } else {
        // Playbook pages transition
        if (selectedPlaybook && playbookIndex < selectedPlaybook.pages.length - 1) {
          prepareNextRound();
        } else {
          endGameSession();
        }
      }
    }, 2000);
  };

  const endGameSession = () => {
    setGameState('gameover');
    playSynthSound('victory');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Update user points locally
    if (user) {
      user.xp = (user.xp || 0) + score;
      setUserXp(user.xp);
    }
    if (onXpEarned) {
      onXpEarned(score);
    }
  };

  // Buy playbooks with study XP
  const unlockBook = (bookId: string, cost: number) => {
    if (userXp >= cost) {
      setUserXp(prev => prev - cost);
      if (user) {
        user.xp = userXp - cost;
      }
      setUnlockedPlaybooks(prev => [...prev, bookId]);
      playSynthSound('victory');
      confetti({
        particleCount: 40,
        colors: ['#ffd700', '#ffa500']
      });
    } else {
      playSynthSound('wrong');
      triggerHaptic('error');
      alert('ଆପଣଙ୍କ ପାଖରେ ପର୍ଯ୍ୟାପ୍ତ XP କଏନ୍ ନାହିଁ। ଅଧିକ ପାଠ ପଢି XP କମାନ୍ତୁ!');
    }
  };

  // Generate Math Options based on target sum
  const mathOptions = useMemo(() => {
    if (activeMode !== 'syllabus' || selectedSubject !== 'math') return [];
    const config = MATH_LEVELS[selectedClass];
    
    if (config.questionType === 'modulo') {
      return ['ଯୁଗ୍ମ', 'ଅଯୁଗ୍ମ'];
    }
    if (config.questionType === 'divisibility') {
      return ['ହଁ', 'ନାହିଁ'];
    }

    // Generate random wrong options centered around correct sum
    const list = new Set<number>();
    list.add(currentMathSum);
    while (list.size < 4) {
      const offset = Math.floor(Math.random() * 7) - 3;
      const val = Math.max(0, currentMathSum + offset);
      list.add(val);
    }
    return Array.from(list).sort((a, b) => a - b);
  }, [currentMathPage, currentMathSum, selectedClass, activeMode, selectedSubject]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden relative flex flex-col pb-20 select-none">
      
      {/* Dynamic Glow Background Lights */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      {selectedSubject === 'odia' && activeMode === 'syllabus' && (
        <div className="absolute inset-0 bg-rose-950/10 pointer-events-none transition-all duration-700" />
      )}

      {/* HEADER HUD */}
      <header className="w-full bg-slate-900/60 backdrop-blur-xl border-b border-white/5 px-3 py-3 sm:px-6 sm:py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button 
            onClick={onBack} 
            className="p-2 sm:p-2.5 bg-white/5 rounded-xl border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <Lucide.ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xs sm:text-base md:text-lg font-black tracking-wider text-emerald-400 flex items-center gap-1">
              <Lucide.BookOpen size={16} />
              ବହି ପୃଷ୍ଠା ଖେଳ
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">
              Traditional Odia Learning Game
            </p>
          </div>
        </div>

        {/* HUD Score & XP */}
        <div className="flex items-center gap-1.5 sm:gap-4">
          <div className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <Lucide.Coins size={13} className="text-amber-400 animate-spin-slow" />
            <span className="text-[10px] sm:text-xs font-black text-amber-300">{userXp} XP</span>
          </div>
          <button 
            onClick={() => setShowHelp(true)}
            className="p-2 sm:px-3 sm:py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 text-emerald-400 font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all"
            title="କେମିତି ଖେଳିବେ"
          >
            <Lucide.HelpCircle size={15} />
            <span className="hidden md:inline">କେମିତି ଖେଳିବେ?</span>
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 sm:p-2.5 bg-white/5 rounded-xl border border-white/5 text-slate-400 hover:text-white"
          >
            {soundEnabled ? <Lucide.Volume2 size={16} /> : <Lucide.VolumeX size={16} />}
          </button>
        </div>
      </header>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 flex flex-col">
        
        {/* MENU STATE */}
        {gameState === 'menu' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-8"
          >
            {/* Mode Selector Toggle */}
            <div className="w-full max-w-md mx-auto p-1.5 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-1">
              <button
                onClick={() => setActiveMode('syllabus')}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeMode === 'syllabus' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                📝 ପାଠ୍ୟବହି ଖେଳ (Syllabus)
              </button>
              <button
                onClick={() => setActiveMode('playbook')}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeMode === 'playbook' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                📖 କାହାଣୀ ଖେଳ (Playbooks)
              </button>
            </div>

            {/* CLASS SELECTOR */}
            <div className="glass-card rounded-[2rem] border border-white/5 p-6 space-y-4 bg-slate-900/50 backdrop-blur-md">
              <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                <Lucide.School size={16} className="text-emerald-400" />
                ଆପଣଙ୍କ ଶ୍ରେଣୀ ବାଛନ୍ତୁ (Select Class)
              </h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`h-11 w-full rounded-xl font-black text-sm flex items-center justify-center border transition-all ${selectedClass === cls ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-md scale-105' : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/10 hover:text-white hover:bg-slate-900'}`}
                  >
                    ଶ୍ରେଣୀ {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* SYLLABUS PANEL */}
            {activeMode === 'syllabus' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Math Game Selection card */}
                <button
                  onClick={() => {
                    setSelectedSubject('math');
                    startGame();
                  }}
                  className={`group relative text-left p-8 rounded-[2.5rem] border transition-all overflow-hidden ${selectedSubject === 'math' ? 'bg-slate-900 border-amber-500/30' : 'bg-slate-900/35 border-white/5 hover:border-white/10'}`}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Lucide.Calculator size={120} />
                  </div>
                  <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20 text-amber-400">
                    <Lucide.Calculator size={28} />
                  </div>
                  <h4 className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">ଗଣିତ ପୃଷ୍ଠା ଯୋଗ</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-bold">
                    ପୃଷ୍ଠା ସଂଖ୍ୟାର ସମସ୍ତ ଅଙ୍କ ଯୋଗ କରି ନିଜର ଗଣିତ ଦକ୍ଷତା ଏବଂ ସଠିକତା ପରୀକ୍ଷା କରନ୍ତୁ ।
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-widest">
                    <span>ଆରମ୍ଭ କରନ୍ତୁ</span>
                    <Lucide.ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Odia Game Selection card */}
                <button
                  onClick={() => {
                    setSelectedSubject('odia');
                    startGame();
                  }}
                  className={`group text-left p-8 rounded-[2.5rem] border transition-all overflow-hidden relative ${selectedSubject === 'odia' ? 'bg-slate-900 border-rose-500/30' : 'bg-slate-900/35 border-white/5 hover:border-white/10'}`}
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Lucide.BookOpen size={120} />
                  </div>
                  <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20 text-rose-400">
                    <Lucide.BookOpen size={28} />
                  </div>
                  <h4 className="text-2xl font-black text-white group-hover:text-rose-400 transition-colors">ଓଡ଼ିଆ ଶବ୍ଦ ସନ୍ଧାନ</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-bold">
                    ଓଡ଼ିଆ ପାଠ୍ୟପୁସ୍ତକର ବିଭିନ୍ନ ବାକ୍ୟରୁ ସଠିକ୍ ଶବ୍ଦ ଚିହ୍ନଟ କରି ନିଜ ଭାଷାଜ୍ଞାନକୁ ସୁଦୃଢ଼ କରନ୍ତୁ ।
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-black text-rose-400 uppercase tracking-widest">
                    <span>ଆରମ୍ଭ କରନ୍ତୁ</span>
                    <Lucide.ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            ) : (
              /* PLAYBOOKS STORYBOOKS PANEL */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PLAYBOOKS.map((book) => {
                  const isUnlocked = unlockedPlaybooks.includes(book.id);
                  return (
                    <div 
                      key={book.id}
                      className="group bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-[2.5rem] p-6 flex flex-col justify-between"
                    >
                      <div className="flex gap-4 items-start">
                        {/* Book Spine Icon mockup */}
                        <div className={`w-14 h-20 bg-gradient-to-br ${book.coverColor} rounded-lg shadow-md border border-white/10 flex items-center justify-center text-white shrink-0`}>
                          <Lucide.BookOpen size={20} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-white">{book.title}</h4>
                          <p className="text-xs text-slate-400 font-bold leading-relaxed">{book.description}</p>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">
                            {book.pages.length} ପୃଷ୍ଠା ବିଶିଷ୍ଟ
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        {!isUnlocked ? (
                          <button
                            onClick={() => unlockBook(book.id, book.xpCost)}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 text-xs transition-all"
                          >
                            <Lucide.Lock size={14} />
                            <span>{book.xpCost} XP ଦେଇ ଖୋଲନ୍ତୁ</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedPlaybook(book);
                              startGame();
                            }}
                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 text-xs transition-all"
                          >
                            <Lucide.Play size={14} fill="currentColor" />
                            <span>କାହାଣୀ ପଢନ୍ତୁ ଓ ଖେଳନ୍ତୁ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}



        {/* GAMEPLAY VIEW */}
        {gameState === 'playing' && (
          <div className="flex-grow flex flex-col justify-between space-y-6">
            
            {/* Top Score & Timer HUD */}
            <div className="flex items-center justify-between bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ସ୍କୋର</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{score}</span>
                </div>
                {streak > 1 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-black animate-pulse">
                    <Lucide.Flame size={12} fill="currentColor" />
                    <span>{streak} COMBO</span>
                  </div>
                )}
              </div>

              {/* Progress Tracker */}
              <div className="text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ପ୍ରଶ୍ନ ସଂଖ୍ୟା</span>
                <span className="text-sm font-black text-slate-300 font-mono">
                  {activeMode === 'syllabus' ? `${currentRound} / ${maxRounds}` : `${playbookIndex + 1} / ${selectedPlaybook?.pages.length}`}
                </span>
              </div>

              {/* Glowing Timer Circle */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-lg ${timeLeft <= 5 ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-slate-950 border border-white/10 text-slate-300'}`}>
                {timeLeft}
              </div>
            </div>

            {/* 3D BOOK CONTAINER */}
            <div className="flex-1 flex items-center justify-center py-6 perspective-[1500px]">
              <motion.div 
                className="w-full max-w-2xl aspect-[16/10] bg-slate-900 border-4 border-slate-800 rounded-2xl shadow-2xl relative flex overflow-hidden select-none"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Book Spine Shadows */}
                <div className="absolute top-0 bottom-0 left-[calc(50%-6px)] w-3 sm:left-[calc(50%-12px)] sm:w-6 bg-gradient-to-r from-black/40 via-black/80 to-black/40 z-10 border-l border-r border-white/5" />

                {/* LEFT PAGE */}
                <div className="flex-1 bg-slate-900 p-2.5 sm:p-6 flex flex-col justify-between border-r border-black/40 select-none">
                  {activeMode === 'syllabus' ? (
                    selectedSubject === 'math' ? (
                      /* Math Board Left page */
                      <div className="space-y-2 sm:space-y-4 flex flex-col justify-center h-full text-center">
                        <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-amber-500/15 rounded-xl border border-amber-500/20 hidden sm:flex items-center justify-center text-amber-400">
                          <Lucide.PlusCircle size={24} />
                        </div>
                        <h4 className="text-xs sm:text-base font-black text-amber-300 leading-normal">
                          {MATH_LEVELS[selectedClass].instruction}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed font-bold">
                          ସାବଧାନ ରୁହନ୍ତୁ! ଦ୍ରୁତ ଉତ୍ତର ଦେଲେ ଅଧିକ ବୋନସ XP ମିଳିବ।
                        </p>
                      </div>
                    ) : (
                      /* Odia Board Left page: displays text snippet */
                      <div className="space-y-2 sm:space-y-4 flex flex-col justify-center h-full">
                        <span className="text-[10px] text-rose-400 font-black tracking-widest uppercase block border-b border-white/5 pb-1">ଓଡ଼ିଆ ସାହିତ୍ୟ ପୃଷ୍ଠା</span>
                        <p className="text-xs sm:text-lg text-slate-200 leading-relaxed font-black tracking-wide bg-slate-950/40 p-2 sm:p-4 rounded-xl border border-white/5">
                          {currentOdiaQuestion?.sentence}
                        </p>
                        <div className="flex gap-1 items-center text-[9px] sm:text-[10px] text-amber-400 font-bold bg-amber-500/5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-amber-500/10">
                          <Lucide.Info size={11} />
                          <span className="truncate">ସୂଚନା: {currentOdiaQuestion?.hint}</span>
                        </div>
                      </div>
                    )
                  ) : (
                    /* Playbook Mode Left page: displays story text */
                    <div className="space-y-2 sm:space-y-4 flex flex-col justify-center h-full">
                      <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block border-b border-white/5 pb-1">
                        କାହାଣୀ - ପୃଷ୍ଠା {selectedPlaybook?.pages[playbookIndex].pageNo}
                      </span>
                      <p className="text-xs sm:text-base text-slate-100 leading-relaxed font-black tracking-wide p-2 sm:p-4 bg-slate-950/40 rounded-xl border border-white/5">
                        {selectedPlaybook?.pages[playbookIndex].text}
                      </p>
                    </div>
                  )}
                  
                  {/* Left Footer Page Indicator */}
                  <div className="text-[9px] sm:text-[10px] text-slate-600 font-mono">
                    {activeMode === 'syllabus' ? `ଶ୍ରେଣୀ ${selectedClass} • ପାଠ୍ୟ` : `କାହାଣୀ`}
                  </div>
                </div>

                {/* RIGHT PAGE */}
                <div className="flex-1 bg-slate-900 p-2.5 sm:p-6 flex flex-col justify-between border-l border-black/40 relative select-none">
                  
                  {/* Feedback Overlays */}
                  <AnimatePresence>
                    {feedback && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 flex flex-col items-center justify-center z-20 backdrop-blur-sm ${feedback === 'correct' ? 'bg-emerald-950/30' : 'bg-red-950/30'}`}
                      >
                        {feedback === 'correct' ? (
                          <div className="flex flex-col items-center gap-2">
                            <Lucide.CheckCircle2 size={40} className="text-emerald-400" />
                            <span className="text-xs sm:text-sm font-black text-emerald-300">ସଠିକ୍ ଉତ୍ତର!</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Lucide.XCircle size={40} className="text-red-400" />
                            <span className="text-xs sm:text-sm font-black text-red-300">ଭୁଲ ଉତ୍ତର!</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {activeMode === 'syllabus' ? (
                    selectedSubject === 'math' ? (
                      /* Math Board Right page: Big page digits */
                      <div className="flex-grow flex flex-col justify-center items-center text-center space-y-2 sm:space-y-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ପୃଷ୍ଠା ସଂଖ୍ୟା</span>
                        <div className="px-4 py-2 sm:px-8 sm:py-5 bg-gradient-to-b from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-2xl shadow-inner font-mono font-black text-2xl sm:text-5xl text-amber-300 tracking-wider relative select-none">
                          {currentMathPage}
                          {/* Inner page layout details */}
                          <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-amber-500/20" />
                        </div>
                        {MATH_LEVELS[selectedClass].questionType === 'modulo' && (
                          <span className="text-[9px] sm:text-xs font-black text-slate-300 uppercase tracking-widest mt-1">
                            କି ସଂଖ୍ୟା? (Even or Odd)
                          </span>
                        )}
                        {MATH_LEVELS[selectedClass].questionType === 'divisibility' && (
                          <span className="text-[9px] sm:text-xs font-black text-slate-300 uppercase tracking-widest mt-1">
                            ୩ ଦ୍ୱାରା ବିଭାଜ୍ୟ କି?
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Odia Board Right page: Lists MCQ */
                      <div className="flex-grow flex flex-col justify-center space-y-2 sm:space-y-4">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">ବାକ୍ୟ ପୂରଣ କରନ୍ତୁ</span>
                        <p className="text-xs sm:text-sm text-slate-300 font-black leading-relaxed">
                          ତଳ ବିକଳ୍ପଗୁଡ଼ିକ ମଧ୍ୟରୁ ସଠିକ୍ ଓଡ଼ିଆ ଶବ୍ଦଟିକୁ ବାଛନ୍ତୁ:
                        </p>
                      </div>
                    )
                  ) : (
                    /* Playbook Mode Right page: Story Quiz MCQs */
                    <div className="flex-grow flex flex-col justify-center space-y-2 sm:space-y-4">
                      <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block">ଚ୍ୟାଲେଞ୍ଜ</span>
                      <p className="text-xs sm:text-base text-slate-200 font-black leading-relaxed bg-slate-950/20 p-2 sm:p-3 rounded-xl border border-white/5">
                        {selectedPlaybook?.pages[playbookIndex].embeddedQuestion.prompt}
                      </p>
                    </div>
                  )}

                  {/* Right Footer Page Indicator */}
                  <div className="text-[9px] sm:text-[10px] text-slate-600 font-mono text-right">
                    {activeMode === 'syllabus' ? `ପୃଷ୍ଠା ${currentMathPage}` : `ପୃଷ୍ଠା ${playbookIndex + 1}`}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* INPUT OPTIONS PANEL */}
            <div className="w-full bg-slate-900/20 border border-white/5 rounded-3xl p-6">
              
              {/* Math / Odia / Story Option Grid */}
              <div className="grid grid-cols-2 gap-4">
                {activeMode === 'syllabus' ? (
                  selectedSubject === 'math' ? (
                    mathOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswerSelect(opt)}
                        disabled={feedback !== null}
                        className={`py-4 bg-slate-900 border text-white font-black text-2xl font-mono rounded-2xl active:scale-95 transition-all flex items-center justify-center ${feedback ? 'opacity-50' : 'border-white/5 hover:border-amber-500/50 hover:bg-slate-950 hover:text-amber-400'}`}
                      >
                        {opt}
                      </button>
                    ))
                  ) : (
                    currentOdiaQuestion?.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleAnswerSelect(opt)}
                        disabled={feedback !== null}
                        className={`py-4 bg-slate-900 border text-white font-black text-base rounded-2xl active:scale-95 transition-all flex items-center justify-center ${feedback ? 'opacity-50' : 'border-white/5 hover:border-rose-500/50 hover:bg-slate-950 hover:text-rose-400'}`}
                      >
                        {opt}
                      </button>
                    ))
                  )
                ) : (
                  selectedPlaybook?.pages[playbookIndex].embeddedQuestion.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswerSelect(opt)}
                      disabled={feedback !== null}
                      className={`py-4 bg-slate-900 border text-white font-black text-base rounded-2xl active:scale-95 transition-all flex items-center justify-center ${feedback ? 'opacity-50' : 'border-white/5 hover:border-emerald-500/50 hover:bg-slate-950 hover:text-emerald-400'}`}
                    >
                      {opt}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* BOTTOM OPPONENT & GUNDULU STATUS */}
            <div className="w-full p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center gap-4">
              {/* Opponent Tracker */}
              <div className="flex-1 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                  <Lucide.User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-300 truncate">
                    {opponent?.name || 'ଖେଳାଳୀ...'}
                  </p>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-1 border border-white/5">
                    <motion.div 
                      className="bg-emerald-500 h-full rounded-full"
                      animate={{ width: opponent ? `${(opponent.currentPage / maxRounds) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-emerald-400 shrink-0">
                  {opponent?.score || 0} XP
                </span>
              </div>

              {/* Gundulu Speech Bubble bubble */}
              <div className="flex-1 bg-slate-950/60 border border-emerald-500/20 p-3 rounded-xl flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 shrink-0 flex items-center justify-center border border-emerald-500/20 overflow-hidden">
                  <img src="/gundulu-v3.png" alt="Gundulu" className="h-full w-full object-contain p-0.5" />
                </div>
                <p className="text-[11px] text-emerald-300 leading-snug font-black">
                  {gunduluSpeech}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* GAMEOVER PANEL */}
        {gameState === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-grow flex flex-col items-center justify-center text-center max-w-md mx-auto w-full py-16 space-y-8"
          >
            <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500 rounded-3xl flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 animate-pulse">
              <Lucide.Trophy size={42} />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">ଖେଳ ସମାପ୍ତ! (Game Over)</h2>
              <p className="text-xs text-slate-400 font-bold">ଓଡ଼ିଆ ମାଧ୍ୟମ ଶିକ୍ଷା ପାଇଁ ଆପଣଙ୍କ ପରିଶ୍ରମ ପ୍ରଶଂସନୀୟ ।</p>
            </div>

            {/* Scorecard Table details */}
            <div className="w-full bg-slate-900 border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xs text-slate-400 font-bold">ମୋଟ ସ୍କୋର (Total Score)</span>
                <span className="text-lg font-black font-mono text-emerald-400">{score}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-slate-400 font-bold">ଆପଣ ଜିତିଥିବା XP କଏନ୍</span>
                <span className="text-lg font-black font-mono text-amber-400">+{score} XP</span>
              </div>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => setGameState('menu')}
                className="flex-1 py-4 bg-slate-900 border border-white/5 hover:border-white/10 active:scale-95 text-white font-black rounded-2xl text-sm transition-all"
              >
                ମୂଳ ମେନୁ (Main Menu)
              </button>
              <button
                onClick={() => startGame()}
                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                ପୁଣି ଖେଳନ୍ତୁ (Play Again)
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* HOW TO PLAY MODAL IN ODIA */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-950/40 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] p-7 md:p-8 shadow-2xl text-white overflow-hidden"
            >
              {/* Programmatic Sambalpuri trim on modal */}
              <div className="absolute top-0 inset-x-0 h-2 bg-slate-100 overflow-hidden flex z-10">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="flex-grow h-full flex">
                    <div className={`w-1/3 h-full ${i % 2 === 0 ? 'bg-red-600' : 'bg-slate-950'}`} />
                    <div className={`w-1/3 h-full ${i % 2 === 0 ? 'bg-slate-950' : 'bg-red-600'}`} />
                    <div className="w-1/3 h-full bg-amber-400" />
                  </div>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-5 right-5 p-2 bg-white/5 rounded-xl border border-white/5 text-slate-400 hover:text-white active:scale-95 transition-all"
              >
                <Lucide.X size={16} />
              </button>

              <div className="space-y-6 mt-5">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Lucide.HelpCircle className="text-emerald-400" size={24} />
                  <h2 className="text-xl font-black">ବହି ପୃଷ୍ଠା ଖେଳ - କେମିତି ଖେଳିବେ?</h2>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  
                  {/* Math Mode Rules */}
                  <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                      <Lucide.Calculator size={16} />
                      ଗଣିତ ପୃଷ୍ଠା ଯୋଗ (Class 1-10)
                    </h3>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ବହିର ଡାହାଣ ପାର୍ଶ୍ୱରେ ଦେଖାଯାଉଥିବା ପୃଷ୍ଠା ସଂଖ୍ୟାର (Page Number) ସମସ୍ତ ଅଙ୍କକୁ ମନେ ମନେ ଯୋଗ କରନ୍ତୁ।</li>
                      <li>ଉଦାହରଣ: ପୃଷ୍ଠା ସଂଖ୍ୟା ୧୨ ହେଲେ, <code className="text-amber-300 font-mono">୧ + ୨ = ୩</code> ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।</li>
                      <li>ଉଚ୍ଚ ଶ୍ରେଣୀରେ (ଶ୍ରେଣୀ ୯-୧୦) Modulo (ଯୁଗ୍ମ/ଅଯୁଗ୍ମ) କିମ୍ବା Divisibility (୩ ଦ୍ୱାରା ବିଭାଜ୍ୟ କି) ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ।</li>
                    </ul>
                  </div>

                  {/* Odia Mode Rules */}
                  <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-rose-400 flex items-center gap-1.5">
                      <Lucide.BookOpen size={16} />
                      ଓଡ଼ିଆ ଶବ୍ଦ ସନ୍ଧାନ
                    </h3>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ବାମ ପାର୍ଶ୍ୱ ପୃଷ୍ଠାର ବାକ୍ୟରୁ ଏକ ପ୍ରମୁଖ ଶବ୍ଦ ଗାୟବ୍ ରହିବ (ଶୂନ୍ୟସ୍ଥାନ)।</li>
                      <li>ଡାହାଣ ପୃଷ୍ଠାର ବିକଳ୍ପଗୁଡ଼ିକ ମଧ୍ୟରୁ ସଠିକ୍ ଓଡ଼ିଆ ଶବ୍ଦ ବାଛି ବାକ୍ୟଟିକୁ ପୂରଣ କରନ୍ତୁ।</li>
                      <li>ସ୍ପିଡ୍ ବୋନସ୍ ପାଇବା ପାଇଁ ସମୟ ସୀମା ପୂର୍ବରୁ ସଠିକ୍ ଶବ୍ଦଟିକୁ ଟ୍ୟାପ୍ କରନ୍ତୁ!</li>
                    </ul>
                  </div>

                  {/* Playbook Mode Rules */}
                  <div className="bg-slate-950/40 p-4 border border-white/5 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                      <Lucide.BookOpen size={16} />
                      କାହାଣୀ ଖେଳ (Story Playbooks)
                    </h3>
                    <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ମଜାଦାର ଓଡ଼ିଆ ଲୋକକଥା ଓ ପୌରାଣିକ କାହାଣୀ ପାଠ କରନ୍ତୁ।</li>
                      <li>କାହାଣୀ ଭିତରେ ଥିବା ରୋମାଞ୍ଚକର ଗଣିତ ବା ଓଡ଼ିଆ ଶବ୍ଦର ଉତ୍ତର ଦେଇ ପରବର୍ତ୍ତୀ ପୃଷ୍ଠାକୁ ଓଲଟାନ୍ତୁ।</li>
                      <li>XP ପଏଣ୍ଟ ବ୍ୟବହାର କରି ନୂଆ ନୂଆ କାହାଣୀ ବହିଗୁଡ଼ିକୁ ଖୋଲନ୍ତୁ।</li>
                    </ul>
                  </div>

                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/10"
                >
                  ବୁଝିଗଲି, ଖେଳିବା! (I Understand)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
