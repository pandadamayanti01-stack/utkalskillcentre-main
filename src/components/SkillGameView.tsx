import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Trophy, 
  Star, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Brain,
  Zap,
  Loader2,
  Hash,
  Shapes
} from 'lucide-react';
import { translations } from '../translations';

interface SkillGameViewProps {
  chapter?: any;
  onBack: () => void;
}

export function SkillGameView({ chapter, onBack }: SkillGameViewProps) {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [question, setQuestion] = useState<any>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [lang] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'en');
  const title = chapter?.title || "Skill Game";

  useEffect(() => {
    if (gameState === 'playing') {
      generateQuestion();
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('end');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState]);

  const generateQuestion = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let ans = 0;
    if (op === '+') ans = a + b;
    else if (op === '-') ans = a - b;
    else ans = a * b;

    const options = [ans, ans + 2, ans - 2, ans + 5].sort(() => Math.random() - 0.5);
    setQuestion({ q: `${a} ${op} ${b} = ?`, options, ans });
  };

  const handleAnswer = (ans: any) => {
    if (ans === question.ans) {
      setScore(prev => prev + 10);
      setFeedback('correct');
    } else {
      setScore(prev => Math.max(0, prev - 5));
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      generateQuestion();
    }, 500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans absolute inset-0 z-[100] overflow-y-auto"
    >
      {/* Header */}
      <header className="bg-[#1e5b99] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-md">
            <Brain className="text-[#1e5b99]" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">UtkalSkillCentre</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="font-medium hover:text-blue-200 transition-colors">Back to Chapter</button>
          <button className="p-2 border-2 border-white/30 rounded hover:bg-white/10 transition-colors"><Brain size={20} /></button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="px-6 py-3 border-b border-slate-200 text-sm text-[#1e5b99] font-medium bg-white">
        Odisha Board <span className="mx-2 text-slate-400">›</span> Mathematics <span className="mx-2 text-slate-400">›</span> {title}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-slate-800"
          >
            {title} - Mind Game
          </motion.h1>
          
          {gameState === 'playing' && (
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{translations[lang].score}</span>
                <span className="text-xl font-bold text-emerald-600">{score}</span>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-bold text-xl ${timeLeft < 10 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                {timeLeft}
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'start' ? (
            <motion.div
              key="start"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative aspect-[16/9] bg-sky-200 rounded-xl overflow-hidden border border-slate-300 shadow-md flex flex-col items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-green-400 opacity-80"></div>
              
              <div className="z-10 text-center space-y-8 p-12">
                <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center text-white mx-auto backdrop-blur-sm">
                  <Zap size={48} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white drop-shadow-md">{translations[lang].readyToPlay}</h2>
                  <p className="text-white/90 max-w-md mx-auto font-medium">{translations[lang].gameInstructions}</p>
                </div>
                <button
                  onClick={() => setGameState('playing')}
                  className="px-12 py-4 bg-[#1e5b99] text-white rounded-2xl font-bold hover:bg-blue-800 transition-all shadow-xl"
                >
                  {translations[lang].startGame}
                </button>
              </div>
            </motion.div>
          ) : gameState === 'playing' ? (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative aspect-[16/9] bg-sky-200 rounded-xl overflow-hidden border border-slate-300 shadow-md flex flex-col items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-green-400 opacity-80"></div>
              
              {/* Chalkboard */}
              <motion.div 
                key={question?.q}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="z-10 bg-emerald-800 border-8 border-amber-700 rounded-lg p-8 shadow-2xl mb-12 relative"
              >
                <span className="text-6xl font-bold text-white font-mono tracking-widest">{question?.q}</span>
              </motion.div>

              {/* Options */}
              <div className="z-10 flex gap-4 absolute bottom-8">
                {question?.options.map((opt: any, i: number) => (
                  <motion.button 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.1, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleAnswer(opt)}
                    className="w-20 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded-xl border-b-4 border-orange-700 text-white text-3xl font-bold shadow-lg transition-all"
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className={`absolute inset-0 flex items-center justify-center pointer-events-none z-50 ${feedback === 'correct' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                  >
                    {feedback === 'correct' ? (
                      <CheckCircle2 size={120} className="text-emerald-400 drop-shadow-lg" />
                    ) : (
                      <XCircle size={120} className="text-red-400 drop-shadow-lg" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="end"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-[16/9] bg-sky-200 rounded-xl overflow-hidden border border-slate-300 shadow-md flex flex-col items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-green-400 opacity-80"></div>
              
              <div className="z-10 text-center space-y-8 p-12">
                <div className="w-24 h-24 bg-yellow-500/20 rounded-[2.5rem] flex items-center justify-center text-yellow-500 mx-auto backdrop-blur-sm">
                  <Trophy size={48} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-white drop-shadow-md">{translations[lang].gameOver}</h2>
                  <div className="flex items-center justify-center gap-12">
                    <div className="flex flex-col">
                      <span className="text-xs text-white/70 uppercase tracking-widest font-bold">{translations[lang].finalScore}</span>
                      <span className="text-5xl font-bold text-white">{score}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-white/70 uppercase tracking-widest font-bold">{translations[lang].xpEarned}</span>
                      <span className="text-5xl font-bold text-yellow-400">+{score * 2}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setGameState('playing')}
                    className="px-8 py-4 bg-white/20 text-white rounded-2xl font-bold hover:bg-white/30 transition-all backdrop-blur-sm"
                  >
                    {translations[lang].playAgain}
                  </button>
                  <button
                    onClick={onBack}
                    className="px-12 py-4 bg-[#1e5b99] text-white rounded-2xl font-bold hover:bg-blue-800 transition-all shadow-xl"
                  >
                    {translations[lang].finish}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Key Points</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 font-medium">
            <li>Addition means combining two or more numbers.</li>
            <li>Mental math helps you calculate faster.</li>
            <li>Practice daily to improve your speed and accuracy.</li>
          </ul>
        </motion.section>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
        >
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#1e5b99] text-white p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-md hover:bg-blue-800 transition-colors"
          >
            <Star className="text-yellow-400" fill="currentColor" /> Mental Math
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-200 text-slate-700 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-sm hover:bg-slate-300 transition-colors"
          >
            <Hash className="text-slate-500" /> Number Puzzle
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-200 text-slate-700 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-sm hover:bg-slate-300 transition-colors"
          >
            <Shapes className="text-slate-500" /> Math Patterns
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
