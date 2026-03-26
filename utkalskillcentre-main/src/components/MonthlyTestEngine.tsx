import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import { translations } from '../translations';
import { MonthlyTest } from '../types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../firebase';

interface MonthlyTestEngineProps {
  test: MonthlyTest;
  onComplete: () => void;
  onBack: () => void;
  language: 'en' | 'or';
  user: any;
}

export function MonthlyTestEngine({ test, onComplete, onBack, language, user }: MonthlyTestEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const score = answers.reduce((acc, ansIdx, i) => {
        const selectedOption = test.questions[i].options[ansIdx];
        return acc + (selectedOption === test.questions[i].correct_answer ? 1 : 0);
      }, 0);
      
      await addDoc(collection(firestore, 'monthly_test_submissions'), {
        testId: test.id,
        userId: user.uid,
        userName: user.displayName || 'Student',
        class: user.class,
        answers,
        score,
        totalQuestions: test.questions.length,
        submittedAt: serverTimestamp(),
        rank: null
      });

      onComplete();
    } catch (err) {
      console.error("Submit Test Error:", err);
      alert("Failed to submit test. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const q = test.questions[currentIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="max-w-3xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Tests</span>
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
            {currentIdx + 1}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {currentIdx + 1} of {test.questions.length}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-6">
        <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">{q.question}</h2>
        
        <div className="grid grid-cols-1 gap-4">
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
      </div>

      <div className="flex justify-between items-center">
        <button 
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(prev => prev - 1)}
          className="flex items-center gap-2 text-slate-500 hover:text-white disabled:opacity-0 transition-colors"
        >
          <ArrowLeft size={20} /> Previous
        </button>
        
        {currentIdx === test.questions.length - 1 ? (
          <button 
            disabled={answers[currentIdx] === undefined || submitting}
            onClick={handleSubmit}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <><Loader2 size={20} className="animate-spin" /> Submitting...</> : 'Submit Final Test'}
          </button>
        ) : (
          <button 
            disabled={answers[currentIdx] === undefined}
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
          >
            Next Question <ArrowRight size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
