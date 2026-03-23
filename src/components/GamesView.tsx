import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, Play, RotateCcw, Zap, Brain, Target, Star } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db as firestore } from '../firebase';

interface GamesViewProps {
  user: any;
  language: 'or' | 'en';
}

export function GamesView({ user, language }: GamesViewProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', ans: 0 });
  const [userInput, setUserInput] = useState('');
  const [highScore, setHighScore] = useState(0);

  const generateProblem = useCallback(() => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;

    if (op === '+') {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      ans = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * a);
      ans = a - b;
    } else {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      ans = a * b;
    }

    setProblem({ a, b, op, ans });
    setUserInput('');
  }, []);

  useEffect(() => {
    let timer: any;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setGameState('over');
      handleGameOver();
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleGameOver = async () => {
    if (score > highScore) setHighScore(score);
    
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        points: increment(score * 5),
        'stats.experience': increment(score * 2)
      });
    } catch (err) {
      console.error("Game Save Error:", err);
    }
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameState('playing');
    generateProblem();
  };

  const checkAnswer = (val: string) => {
    setUserInput(val);
    if (parseInt(val) === problem.ans) {
      setScore(prev => prev + 1);
      generateProblem();
      // Add bonus time for correct answer
      setTimeLeft(prev => Math.min(prev + 2, 30));
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-2xl shadow-emerald-500/20">
          <Zap size={40} />
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">Quick Calc</h2>
        <p className="text-slate-400">Boost your mental math speed and accuracy</p>
      </div>

      <div className="glass-card neon-border rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        
        <AnimatePresence mode="wait">
          {gameState === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5">
                  <Trophy className="text-amber-500 mx-auto mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">High Score</p>
                  <p className="text-3xl font-bold text-white">{highScore}</p>
                </div>
                <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5">
                  <Star className="text-emerald-500 mx-auto mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Points</p>
                  <p className="text-3xl font-bold text-white">{user?.points || 0}</p>
                </div>
              </div>
              
              <button 
                onClick={startGame}
                className="group relative bg-emerald-500 hover:bg-emerald-600 text-white px-16 py-6 rounded-3xl font-bold text-2xl transition-all shadow-2xl shadow-emerald-900/40 flex items-center gap-4"
              >
                <Play size={28} />
                <span>START GAME</span>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
              </button>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md text-center"
            >
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-500">
                    <Target size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</p>
                    <p className="text-2xl font-bold text-white">{score}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>
                    <Timer size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</p>
                    <p className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-white/5 rounded-[3rem] p-12 mb-8 shadow-inner">
                <div className="text-6xl font-black text-white flex items-center justify-center gap-6 tracking-tighter">
                  <span>{problem.a}</span>
                  <span className="text-emerald-500">{problem.op}</span>
                  <span>{problem.b}</span>
                  <span className="text-slate-700">=</span>
                  <span className="text-emerald-400">?</span>
                </div>
              </div>

              <input 
                autoFocus
                type="number"
                value={userInput}
                onChange={(e) => checkAnswer(e.target.value)}
                placeholder="Type answer..."
                className="w-full bg-white/5 border-2 border-emerald-500/30 rounded-3xl py-8 text-center text-4xl font-bold text-white focus:outline-none focus:border-emerald-500 transition-all shadow-2xl shadow-emerald-900/20"
              />
            </motion.div>
          )}

          {gameState === 'over' && (
            <motion.div 
              key="over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-red-500">
                <RotateCcw size={48} />
              </div>
              <h2 className="text-5xl font-black text-white mb-2 tracking-tight">GAME OVER!</h2>
              <p className="text-xl text-slate-400 mb-12">You solved {score} problems correctly</p>
              
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="p-8 bg-slate-900/50 rounded-[2.5rem] border border-white/5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Final Score</p>
                  <p className="text-4xl font-bold text-white">{score}</p>
                </div>
                <div className="p-8 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20">
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Points Earned</p>
                  <p className="text-4xl font-bold text-emerald-500">+{score * 5}</p>
                </div>
              </div>

              <button 
                onClick={startGame}
                className="bg-white text-slate-900 px-16 py-6 rounded-3xl font-bold text-xl hover:bg-slate-100 transition-all shadow-2xl shadow-white/10 flex items-center gap-4 mx-auto"
              >
                <RotateCcw size={24} />
                <span>PLAY AGAIN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/30 rounded-3xl border border-white/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <Brain size={20} />
          </div>
          <div>
            <h4 className="text-white font-bold mb-1">Mental Math</h4>
            <p className="text-slate-500 text-sm">Improve your calculation speed without using a calculator.</p>
          </div>
        </div>
        <div className="p-6 bg-slate-900/30 rounded-3xl border border-white/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Timer size={20} />
          </div>
          <div>
            <h4 className="text-white font-bold mb-1">Time Pressure</h4>
            <p className="text-slate-500 text-sm">30 seconds on the clock. Every correct answer adds time!</p>
          </div>
        </div>
        <div className="p-6 bg-slate-900/30 rounded-3xl border border-white/5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Star size={20} />
          </div>
          <div>
            <h4 className="text-white font-bold mb-1">Earn Points</h4>
            <p className="text-slate-500 text-sm">Climb the leaderboard by earning points for every game.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
