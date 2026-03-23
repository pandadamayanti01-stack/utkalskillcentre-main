import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Loader2, Lightbulb } from 'lucide-react';
import { doc, getDoc, addDoc, collection, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../firebase';

interface QuizEngineProps {
  questions: any[];
  onComplete: () => void;
  language: string;
  userId: string;
  chapterId: string;
}

export function QuizEngine({ questions, onComplete, language, userId, chapterId }: QuizEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    setCurrentIdx(prev => prev + 1);
    setShowHint(false);
  };

  const handlePrev = () => {
    setCurrentIdx(prev => prev - 1);
    setShowHint(false);
  };

  const score = answers.reduce((acc, ansIdx, i) => {
    const selectedOption = questions[i].options[ansIdx];
    return acc + (selectedOption === questions[i].correct_answer ? 1 : 0);
  }, 0);

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save quiz result to Firestore
      await addDoc(collection(firestore, 'quiz_results'), {
        userId,
        chapterId,
        score,
        total: questions.length,
        timestamp: serverTimestamp(),
        accuracy: Math.round((score / questions.length) * 100)
      });

      // Update user points and accuracy
      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentAccuracy = userData.stats?.accuracy || 0;
        const newAccuracy = Math.round((currentAccuracy + (score / questions.length) * 100) / 2);
        
        await updateDoc(userRef, {
          points: increment(score * 10),
          'stats.accuracy': newAccuracy,
          'stats.experience': increment(score * 5),
          completed_chapters: Array.from(new Set([...(userData.completed_chapters || []), chapterId]))
        });
      }
      
      setFinished(true);
    } catch (err) {
      console.error("Quiz Save Error:", err);
      setFinished(true); // Still show finished screen even if save fails
    } finally {
      setSaving(false);
    }
  };

  if (finished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-12"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20"
        >
          <Trophy size={48} className="text-white" />
        </motion.div>
        <h2 className="text-4xl font-bold text-white mb-4">Quiz Completed!</h2>
        <p className="text-xl text-slate-400 mb-8">You scored {score} out of {questions.length}</p>
        
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-500">{score}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">Correct</p>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-2xl font-bold text-red-500">{questions.length - score}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">Wrong</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-500">{Math.round((score / questions.length) * 100)}%</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">Accuracy</p>
            </div>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-4 rounded-2xl font-bold transition-all"
        >
          Back to Topic
        </motion.button>
      </motion.div>
    );
  }

  const q = questions[currentIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onComplete}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Quit Quiz</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
            {currentIdx + 1}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-6">
        <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">{q.question}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {q.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`flex items-center gap-4 p-6 rounded-2xl border transition-all text-left ${answers[currentIdx] === idx ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${answers[currentIdx] === idx ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="text-lg font-medium">{opt}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Previous
          </button>
          {currentIdx === questions.length - 1 ? (
            <button 
              onClick={handleFinish}
              disabled={answers[currentIdx] === undefined || saving}
              className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Finish Quiz'}
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={answers[currentIdx] === undefined}
              className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              Next Question
            </button>
          )}
        </div>

        {q.hint && (
          <div className="mt-6 border-t border-white/5 pt-6">
            {!showHint ? (
              <button 
                onClick={() => setShowHint(true)}
                className="text-amber-500 hover:text-amber-400 text-sm font-bold flex items-center gap-2"
              >
                <Lightbulb size={16} /> Show Hint
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <Lightbulb className="text-amber-500 shrink-0" size={20} />
                <p className="text-amber-200/80 text-sm">{q.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
