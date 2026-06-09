import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import * as Lucide from 'lucide-react';
import { db as firestore } from '../firebase';
import confetti from 'canvas-confetti';
import './AiMatchingQuiz.css';

interface AiMatchingQuizProps {
  user: any;
  language: 'en' | 'or';
  onClose: () => void;
  onSuccess?: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

interface QuizPair {
  id: string;
  left: string;
  right: string;
}

interface CardItem {
  id: string;
  text: string;
  type: 'left' | 'right';
  state: 'idle' | 'selected' | 'matched' | 'error';
}

const AVAILABLE_SUBJECTS = [
  { id: 'Mathematics', labelEn: 'Mathematics', labelOr: 'ଗଣିତ', icon: <Lucide.Calculator size={20} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { id: 'Science', labelEn: 'Science', labelOr: 'ବିଜ୍ଞାନ', icon: <Lucide.Atom size={20} />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'English', labelEn: 'English Grammar', labelOr: 'ଇଂରାଜୀ ବ୍ୟାକରଣ', icon: <Lucide.BookOpen size={20} />, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
  { id: 'SocialScience', labelEn: 'Social Studies', labelOr: 'ସାମାଜିକ ବିଜ୍ଞାନ', icon: <Lucide.Globe size={20} />, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
];

export function AiMatchingQuiz({ user, language, onClose, onSuccess, isPremium = false, onUpgrade }: AiMatchingQuizProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'subject-select' | 'loading' | 'playing' | 'completed'>('subject-select');
  const [pairs, setPairs] = useState<QuizPair[]>([]);
  const [leftCards, setLeftCards] = useState<CardItem[]>([]);
  const [rightCards, setRightCards] = useState<CardItem[]>([]);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [comboStreak, setComboStreak] = useState<number>(0);
  const [mismatchCount, setMismatchCount] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [freeQueriesCount, setFreeQueriesCount] = useState<number>(0);

  useEffect(() => {
    const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
    setFreeQueriesCount(parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10));
  }, [user]);

  // Audio synthesis feedback using Web Audio API
  const playSynthSound = (type: 'success' | 'error' | 'win') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(110.0, now); // A2
        osc.frequency.setValueAtTime(98.0, now + 0.08); // G2
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.12, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.4);
          
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.4);
        });
      }
    } catch (err) {
      console.error('Audio Synthesis Error:', err);
    }
  };

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Fisher-Yates Shuffle
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Generate dynamic quiz via Backend endpoint
  const startQuiz = async (subject: string) => {
    const isFreePeriod = new Date() < new Date('2026-06-21T00:00:00+05:30');
    if (!isPremium && freeQueriesCount >= 5 && !isFreePeriod) {
      return;
    }

    setSelectedSubject(subject);
    setGameState('loading');
    setErrorMessage(null);
    setTimer(0);
    setMatchedIds([]);
    setComboStreak(0);
    setMismatchCount(0);

    try {
      const response = await fetch('/api/ai/generate-matching-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: user?.class || '10',
          subjectName: subject,
          language
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz from server');
      }

      const data = await response.json();
      if (!data.pairs || !Array.isArray(data.pairs) || data.pairs.length === 0) {
        throw new Error('Invalid quiz response formatting');
      }

      // Increment free queries count for unsubscribed users
      if (!isPremium) {
        const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
        const currentCount = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
        localStorage.setItem(getFreeQueriesKey(), (currentCount + 1).toString());
        setFreeQueriesCount(currentCount + 1);
      }

      const quizPairs: QuizPair[] = data.pairs.slice(0, 5);
      setPairs(quizPairs);

      // Create shuffled left and right card decks
      const lCards: CardItem[] = quizPairs.map((p) => ({
        id: p.id,
        text: p.left,
        type: 'left',
        state: 'idle',
      }));

      const rCards: CardItem[] = quizPairs.map((p) => ({
        id: p.id,
        text: p.right,
        type: 'right',
        state: 'idle',
      }));

      setLeftCards(shuffleArray(lCards));
      setRightCards(shuffleArray(rCards));
      setGameState('playing');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        language === 'or'
          ? 'ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ କରିବାରେ ତ୍ରୁଟି ଘଟିଲା | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।'
          : 'Error preparing matching quiz. Please try again.'
      );
      setGameState('subject-select');
    }
  };

  // Perform Match check
  const checkMatch = (leftId: string, rightId: string) => {
    const matches = leftId === rightId;

    if (matches) {
      playSynthSound('success');
      setMatchedIds((prev) => [...prev, leftId]);
      setComboStreak((prev) => prev + 1);

      // Mark matched cards
      setLeftCards((prev) =>
        prev.map((c) => (c.id === leftId ? { ...c, state: 'matched' } : c))
      );
      setRightCards((prev) =>
        prev.map((c) => (c.id === rightId ? { ...c, state: 'matched' } : c))
      );

      // Reset selection
      setSelectedLeftId(null);
      setSelectedRightId(null);

      // Check if game complete (all 5 pairs matched)
      if (matchedIds.length + 1 === pairs.length) {
        handleQuizCompletion();
      }
    } else {
      playSynthSound('error');
      setComboStreak(0);
      setMismatchCount((prev) => prev + 1);

      // Shake animation glow trigger
      setLeftCards((prev) =>
        prev.map((c) => (c.id === leftId ? { ...c, state: 'error' } : c))
      );
      setRightCards((prev) =>
        prev.map((c) => (c.id === rightId ? { ...c, state: 'error' } : c))
      );

      setTimeout(() => {
        setLeftCards((prev) =>
          prev.map((c) => (c.id === leftId ? { ...c, state: 'idle' } : c))
        );
        setRightCards((prev) =>
          prev.map((c) => (c.id === rightId ? { ...c, state: 'idle' } : c))
        );
        setSelectedLeftId(null);
        setSelectedRightId(null);
      }, 800);
    }
  };

  // Handles completion and saves XP to Firebase
  const handleQuizCompletion = async () => {
    setGameState('completed');
    playSynthSound('win');
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (!user?.id) return;
    setIsSavingScore(true);

    try {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const userRef = doc(firestore, 'users', user.id);
      const progressRef = doc(collection(firestore, 'user_progress'));

      await runTransaction(firestore, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const currentPoints = userSnap.exists() ? Math.floor(Number(userSnap.data().points || 0)) : 0;
        const currentPointsToday = userSnap.exists() ? Math.floor(Number((userSnap.data() as any).points_today || 0)) : 0;

        // Award +50 XP bonus for completion
        const earnedXP = 50;

        transaction.set(userRef, {
          points: currentPoints + earnedXP,
          points_today: currentPointsToday + earnedXP,
          updatedAt: serverTimestamp()
        }, { merge: true });

        transaction.set(progressRef, {
          userId: user.id,
          date: today,
          pointsEarned: earnedXP,
          type: 'ai_matching_quiz',
          referenceId: `matching_quiz_${Date.now()}`,
          subject: selectedSubject,
          createdAt: serverTimestamp()
        });
      });

      onSuccess?.();
    } catch (err) {
      console.error('Error saving quiz progress:', err);
    } finally {
      setIsSavingScore(false);
    }
  };

  // Interaction handlers
  const handleLeftCardClick = (id: string, state: string) => {
    if (state === 'matched' || gameState !== 'playing') return;
    setSelectedLeftId(id);
    
    // Auto-verify if right is already selected
    if (selectedRightId) {
      checkMatch(id, selectedRightId);
    }
  };

  const handleRightCardClick = (id: string, state: string) => {
    if (state === 'matched' || gameState !== 'playing') return;
    setSelectedRightId(id);

    // Auto-verify if left is already selected
    if (selectedLeftId) {
      checkMatch(selectedLeftId, id);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setSelectedLeftId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, rightId: string, state: string) => {
    e.preventDefault();
    if (state === 'matched' || gameState !== 'playing') return;

    const leftId = e.dataTransfer.getData('text/plain');
    if (leftId) {
      checkMatch(leftId, rightId);
    }
  };

  // Translations helpers
  const getSubjectLabel = (subj: typeof AVAILABLE_SUBJECTS[0]) => {
    return language === 'or' ? subj.labelOr : subj.labelEn;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-start md:justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto force-dark-theme">
      <div className="w-full max-w-4xl bg-slate-900/90 border border-white/10 rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden relative max-h-[90vh] flex flex-col force-dark-theme">
        
        {/* Glow overlay decoration */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* HUD Navigation Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-950 border border-emerald-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover scale-[0.95]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-none uppercase">
                {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ ମିଳନ ଖେଳ' : "Gundulu's Match Quiz"}
              </h2>
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 inline-block">
                {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ ମିଳନ ଖେଳ' : 'Gundulu Matching Engine'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <Lucide.X size={16} />
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-h-0 relative z-10">
          <AnimatePresence mode="wait">
            
            {/* 1. SUBJECT SELECTOR SCREEN */}
            {gameState === 'subject-select' && (
              <motion.div
                key="select-screen"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8 py-6"
              >
                <div className="text-center max-w-xl mx-auto space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight uppercase">
                    {language === 'or' ? 'ନିଜର ପ୍ରିୟ ବିଷୟ ବାଛନ୍ତୁ' : 'Select a Subject Arena'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">
                    {language === 'or'
                      ? 'ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କ ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ ଏକ ମଜାଦାର ମିଳନ ଖେଳ ତିଆରି କରିବ। ଏଥିରୁ +୫୦ XP ମିଳିବ |'
                      : 'Gundulu will generate a real-time card puzzle matching your class syllabus. Complete it to earn +50 XP.'}
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs sm:text-sm font-semibold text-center max-w-md mx-auto">
                    {errorMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {AVAILABLE_SUBJECTS.map((subj) => (
                    <button
                      key={subj.id}
                      onClick={() => startQuiz(subj.id)}
                      className={`p-5 rounded-2xl border text-left flex items-center gap-4 bg-slate-950/40 backdrop-blur-sm transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 group cursor-pointer ${subj.color} hover:bg-slate-900/60`}
                    >
                      <div className="p-3 rounded-xl bg-slate-900 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                        {subj.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-white tracking-tight sm:text-lg">{getSubjectLabel(subj)}</h4>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400">
                          {language === 'or' ? 'ଚ୍ୟାଲେଞ୍ଜ ଆରମ୍ଭ' : 'Begin Challenge'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. LOADING ENGINE SCREEN */}
            {gameState === 'loading' && (
              <motion.div
                key="loading-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 space-y-6"
              >
                {/* Glowing AI brain scan mockup */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
                  <div className="w-20 h-20 rounded-full border-2 border-emerald-500/30 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent radar-line"></div>
                    <Lucide.BrainCircuit className="text-emerald-400 animate-pulse" size={32} />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h4 className="text-lg font-black text-white uppercase tracking-wider">
                    {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ AI ପ୍ରସ୍ତୁତ କରୁଛି...' : 'Gundulu AI Synthesizing Quiz...'}
                  </h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse max-w-sm leading-relaxed">
                    {language === 'or'
                      ? 'ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କ ଶ୍ରେଣୀର ପାଠ ବହି ତଥ୍ୟ ଆଧାରରେ ପ୍ରଶ୍ନ ଓ ଉତ୍ତର ସଜାଡୁଛନ୍ତି।'
                      : 'Generating matching metrics based on your textbook curriculum nodes.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* 3. GAMEPLAY BOARD */}
            {gameState === 'playing' && (
              <motion.div
                key="playing-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Stats and timers HUD banner */}
                <div className="flex items-center justify-between bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-3.5 flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {language === 'or' ? 'ସମୟ:' : 'Time Elapsed:'}
                    </span>
                    <span className="text-xs font-black text-cyan-400 bg-cyan-950/30 border border-cyan-800/20 px-2 py-0.5 rounded-lg font-mono">
                      {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  {comboStreak > 1 && (
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                    >
                      <Lucide.Zap size={10} className="fill-amber-400" />
                      <span>{comboStreak}x Combo Streak!</span>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {language === 'or' ? 'ମିଳିତ ଯୋଡି:' : 'Progress:'}
                    </span>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-950/30 border border-emerald-800/20 px-2 py-0.5 rounded-lg">
                      {matchedIds.length} / {pairs.length} {language === 'or' ? 'କୃତକାର୍ଯ୍ୟ' : 'Matched'}
                    </span>
                  </div>
                </div>

                {/* Progress Visual Tracker */}
                <div className="h-1.5 w-full bg-slate-800/40 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 ease-out"
                    style={{ width: `${(matchedIds.length / pairs.length) * 100}%` }}
                  />
                </div>

                {/* Playing Cards Grid Canvas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* Left Deck Column - Concepts */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      {language === 'or' ? 'ପ୍ରଶ୍ନ / ତଥ୍ୟ' : 'Concept / Question'}
                    </h5>
                    
                    <div className="space-y-2.5">
                      {leftCards.map((card) => {
                        const isSelected = selectedLeftId === card.id;
                        const isMatched = matchedIds.includes(card.id);
                        
                        return (
                          <motion.div
                            key={`left-${card.id}`}
                            draggable={!isMatched}
                            onDragStart={(e: any) => handleDragStart(e, card.id)}
                            onClick={() => handleLeftCardClick(card.id, card.state)}
                            className={`p-4 rounded-2xl border text-sm font-semibold select-none transition-all relative overflow-hidden flex items-center justify-between ${
                              isMatched 
                                ? 'bg-emerald-950/15 border-emerald-500/20 text-slate-500 line-through opacity-45 cursor-default'
                                : card.state === 'error'
                                ? 'bg-rose-950/20 border-rose-500/60 text-rose-200 card-error-shake shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                                : isSelected
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 scale-[1.02] shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer'
                                : 'bg-slate-950/40 hover:bg-slate-900/60 border-white/10 hover:border-white/20 text-white cursor-pointer active:scale-98'
                            }`}
                          >
                            <span className="truncate pr-4">{card.text}</span>
                            {isMatched ? (
                              <Lucide.CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <Lucide.GripVertical size={14} className="text-slate-600 shrink-0 cursor-grab" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Deck Column - Definitions/Answers */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      {language === 'or' ? 'ଉତ୍ତର / ସମାଧାନ' : 'Answer / Meaning'}
                    </h5>

                    <div className="space-y-2.5">
                      {rightCards.map((card) => {
                        const isSelected = selectedRightId === card.id;
                        const isMatched = matchedIds.includes(card.id);

                        return (
                          <div
                            key={`right-${card.id}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, card.id, card.state)}
                            onClick={() => handleRightCardClick(card.id, card.state)}
                            className={`p-4 rounded-2xl border text-sm font-semibold select-none transition-all relative overflow-hidden flex items-center justify-between ${
                              isMatched
                                ? 'bg-emerald-950/15 border-emerald-500/20 text-slate-500 line-through opacity-45 cursor-default'
                                : card.state === 'error'
                                ? 'bg-rose-950/20 border-rose-500/60 text-rose-200 card-error-shake shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                                : isSelected
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 scale-[1.02] shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer'
                                : 'bg-slate-950/40 hover:bg-slate-900/60 border-white/10 hover:border-white/20 text-white cursor-pointer active:scale-98'
                            }`}
                          >
                            <span className="truncate pr-4">{card.text}</span>
                            {isMatched ? (
                              <Lucide.CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 border border-slate-700 rounded-full shrink-0 group-hover:border-slate-400 transition-colors"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Mobile instructions */}
                <p className="text-[10px] text-center text-slate-500 leading-normal italic pt-2">
                  {language === 'or' 
                    ? 'ମୋବାଇଲ୍‌ରେ ପ୍ରଥମେ ପ୍ରଶ୍ନ ଓ ପରେ ଉତ୍ତରକୁ କ୍ଲିକ୍ କରନ୍ତୁ, କିମ୍ବା ଡ୍ରାଗ୍-ଡ୍ରପ୍ ବ୍ୟବହାର କରନ୍ତୁ।'
                    : 'Tip: Tap a question then tap the corresponding answer, or drag from left to right.'}
                </p>
              </motion.div>
            )}

            {/* 4. GAME FINISHED SCOREBOARD */}
            {gameState === 'completed' && (
              <motion.div
                key="completed-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-10 space-y-8"
              >
                {/* Glowing Trophy Ring */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl animate-pulse"></div>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-500/40 flex items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                    <Lucide.Trophy className="text-amber-400 drop-shadow-[0_0_10px_#f59e0b]" size={42} />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                    {language === 'or' ? 'ଅଭିନନ୍ଦନ! ମିଳନ ସମ୍ପୂର୍ଣ୍ଣ' : 'Puzzle Solved Successfully!'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                    {language === 'or'
                      ? 'ଆପଣ ସମସ୍ତ ଯୋଡିକୁ ସଠିକ୍ ଭାବେ ମିଳାଇ ଦେଇଛନ୍ତି।'
                      : 'All concepts and facts matched with perfect curriculum sync.'}
                  </p>
                </div>

                {/* Score telemetry box */}
                <div className="grid grid-cols-2 gap-4 max-w-sm w-full bg-slate-950/40 border border-white/5 p-5 rounded-2xl">
                  <div className="text-center border-r border-white/5 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {language === 'or' ? 'ସମୟ ଲାଗିଲା' : 'Duration'}
                    </span>
                    <p className="text-lg font-black text-white font-mono leading-none">
                      {Math.floor(timer / 60)}m {timer % 60}s
                    </p>
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      {language === 'or' ? 'ଅର୍ଜିତ XP' : 'XP Points Earned'}
                    </span>
                    <p className="text-lg font-black text-emerald-400 leading-none">
                      +50 XP
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setGameState('subject-select')}
                    className="px-6 py-3 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                  >
                    {language === 'or' ? 'ଆଉ ଥରେ ଖେଳନ୍ତୁ' : 'Play Another'}
                  </button>

                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[0_5px_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                    disabled={isSavingScore}
                  >
                    {isSavingScore && <Lucide.Loader size={12} className="animate-spin" />}
                    <span>{language === 'or' ? 'ଡ୍ୟାସବୋର୍ଡ' : 'Return Dashboard'}</span>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Premium Upgrade Overlay */}
        {!isPremium && freeQueriesCount >= 5 && !(new Date() < new Date('2026-06-21T00:00:00+05:30')) && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center select-none force-dark-theme animate-fade-in">
            <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative max-w-md w-full bg-slate-900/60 border border-emerald-500/20 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl flex flex-col items-center gap-6">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-emerald-500 blur-xl opacity-20 animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-slate-950 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                  <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover scale-[0.95]" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400 uppercase tracking-wide">
                  {language === 'or' ? 'ମାଗଣା ସୀମା ଶେଷ! 🧩' : 'Trial Limit Reached! 🧩'}
                </h3>
                <p className="text-xs md:text-sm font-bold text-slate-300 leading-relaxed">
                  {language === 'or'
                    ? 'ଗୁନ୍ଦୁଲୁ ମିଳନ ଖେଳ ଏବଂ ଅନ୍ୟାନ୍ୟ AI ସୁବିଧାର ଅସୀମିତ ବ୍ୟବହାର ପାଇଁ ପ୍ରିମିୟମ୍‌କୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!'
                    : 'Upgrade to Gundulu Premium for unlimited access to matching quizzes, voice conversation, and AI Tutor solvers!'}
                </p>
              </div>
              
              <div className="flex flex-col gap-3.5 w-full mt-2">
                <button
                  onClick={onUpgrade}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest cursor-pointer"
                >
                  <Lucide.Sparkles size={14} className="animate-pulse" />
                  <span>{language === 'or' ? 'ପ୍ରିମିୟମ ଅପଗ୍ରେଡ୍' : 'Upgrade to Premium'}</span>
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
                >
                  {language === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
