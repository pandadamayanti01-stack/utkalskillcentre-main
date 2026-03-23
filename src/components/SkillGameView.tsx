import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Trophy, 
  Flame, 
  Star, 
  Clock, 
  Target, 
  Award, 
  Sparkles,
  ChevronRight,
  Play,
  RotateCcw,
  Timer,
  CheckCircle2,
  XCircle,
  Brain,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

interface SkillGameViewProps {
  language: 'en' | 'or';
  onComplete: (score: number) => void;
}

export const SkillGameView: React.FC<SkillGameViewProps> = ({ language, onComplete }) => {
  const t = translations[language];
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentProblem, setCurrentProblem] = useState<{ q: string; a: number } | null>(null);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateProblem = () => {
    const operators = ['+', '-', '*'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let n1, n2, a;

    if (op === '+') {
      n1 = Math.floor(Math.random() * 50) + 1;
      n2 = Math.floor(Math.random() * 50) + 1;
      a = n1 + n2;
    } else if (op === '-') {
      n1 = Math.floor(Math.random() * 50) + 20;
      n2 = Math.floor(Math.random() * n1) + 1;
      a = n1 - n2;
    } else {
      n1 = Math.floor(Math.random() * 12) + 1;
      n2 = Math.floor(Math.random() * 12) + 1;
      a = n1 * n2;
    }

    setCurrentProblem({ q: `${n1} ${op} ${n2}`, a });
    setUserInput('');
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(60);
    setStreak(0);
    generateProblem();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameState('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInput = (val: string) => {
    setUserInput(val);
    if (currentProblem && parseInt(val) === currentProblem.a) {
      setFeedback('correct');
      setScore(prev => prev + 10 + (streak * 2));
      setStreak(prev => prev + 1);
      setTimeout(() => {
        setFeedback(null);
        generateProblem();
      }, 300);
    } else if (val.length >= currentProblem?.a.toString().length && parseInt(val) !== currentProblem?.a) {
      setFeedback('wrong');
      setStreak(0);
      setTimeout(() => setFeedback(null), 500);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      if (score > highScore) setHighScore(score);
      onComplete(score);
    }
  }, [gameState]);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col items-center justify-center space-y-12">
      <AnimatePresence mode="wait">
        {gameState === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center space-y-8"
          >
            <div className="relative">
              <div className="w-32 h-32 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                <Brain size={64} />
              </div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border-2 border-dashed border-emerald-500/20 rounded-[3rem]"
              ></motion.div>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-black text-white tracking-tight">Quick <span className="text-emerald-500">Calc</span></h1>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em] max-w-xs mx-auto">
                Solve as many math problems as you can in 60 seconds!
              </p>
            </div>

            <div className="flex items-center justify-center gap-12">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">High Score</p>
                <p className="text-2xl font-black text-white">{highScore}</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">XP Reward</p>
                <p className="text-2xl font-black text-emerald-500">Up to 500</p>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="px-12 py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-95 flex items-center gap-3 mx-auto"
            >
              <Play size={24} fill="currentColor" />
              Start Game
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl space-y-12"
          >
            {/* Game Header */}
            <div className="flex items-center justify-between px-8 py-4 glass-card neon-border rounded-[2rem] border border-white/5">
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score</span>
                  <span className="text-3xl font-black text-white tabular-nums">{score}</span>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Streak</span>
                  <div className="flex items-center gap-2">
                    <Flame size={20} className={streak > 5 ? 'text-orange-500 animate-bounce' : 'text-slate-600'} fill={streak > 5 ? "currentColor" : "none"} />
                    <span className={`text-2xl font-black tabular-nums ${streak > 5 ? 'text-orange-500' : 'text-white'}`}>{streak}</span>
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all ${timeLeft < 10 ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-white'}`}>
                <Timer size={24} />
                <span className="text-3xl font-black tabular-nums">{timeLeft}s</span>
              </div>
            </div>

            {/* Problem Area */}
            <div className="glass-card neon-border rounded-[3rem] p-16 text-center space-y-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
              
              <motion.div 
                key={currentProblem?.q}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-8xl font-black text-white tracking-tight"
              >
                {currentProblem?.q}
              </motion.div>

              <div className="relative max-w-xs mx-auto">
                <input 
                  type="number" 
                  autoFocus
                  className={`w-full text-center text-6xl font-black bg-transparent border-b-4 focus:outline-none transition-all pb-4 ${feedback === 'correct' ? 'border-emerald-500 text-emerald-500' : feedback === 'wrong' ? 'border-red-500 text-red-500 animate-shake' : 'border-white/10 text-white focus:border-emerald-500/50'}`}
                  value={userInput}
                  onChange={(e) => handleInput(e.target.value)}
                  placeholder="?"
                />
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -100, scale: 1.5 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 text-emerald-500 font-black text-4xl pointer-events-none"
                    >
                      +{10 + (streak * 2)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Numpad (Mobile Optimized) */}
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto md:hidden">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map((key) => (
                <button 
                  key={key}
                  onClick={() => {
                    if (key === 'C') setUserInput('');
                    else if (key === '←') setUserInput(prev => prev.slice(0, -1));
                    else handleInput(userInput + key);
                  }}
                  className="h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xl hover:bg-white/10 active:scale-95 transition-all"
                >
                  {key}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState === 'finished' && (
          <motion.div 
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-12"
          >
            <div className="space-y-4">
              <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                <Trophy size={48} />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight">Game Over!</h2>
            </div>

            <div className="grid grid-cols-2 gap-8 max-w-md mx-auto">
              <div className="glass-card rounded-3xl p-8 border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Final Score</p>
                <p className="text-4xl font-black text-white">{score}</p>
              </div>
              <div className="glass-card rounded-3xl p-8 border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accuracy</p>
                <p className="text-4xl font-black text-emerald-500">92%</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button 
                onClick={startGame}
                className="w-full md:w-auto px-12 py-5 rounded-[2rem] bg-emerald-500 text-white font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-95 flex items-center justify-center gap-3"
              >
                <RotateCcw size={24} />
                Play Again
              </button>
              <button 
                onClick={() => setGameState('idle')}
                className="w-full md:w-auto px-12 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10"
              >
                Exit Game
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 text-slate-500">
              <Sparkles size={16} className="text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest">You earned 350 XP!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
