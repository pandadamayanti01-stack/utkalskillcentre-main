import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import { translations } from '../translations';
import { Test } from '../types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../firebase';

interface MonthlyTestEngineProps {
  test: Test;
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

      const submissionData = {
        testId: test.id,
        userId: user.id || user.uid,
        userName: user.name || user.displayName || 'Student',
        class: user.class,
        subject: test.subject,
        month: test.month,
        year: test.year,
        answers,
        score,
        totalQuestions: test.questions.length,
        submittedAt: serverTimestamp(),
      };

      console.log("Debug: Submitting Monthly Test:", submissionData);
      
      await addDoc(collection(firestore, 'monthly_test_submissions'), submissionData);

      onComplete();
    } catch (err: any) {
      console.error("Submit Test Error:", err);
      alert(`Failed to submit test: ${err.message || "Unknown error"}. Please check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const q = test.questions[currentIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Test Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white p-2 shadow-lg">
              <img src="/utkal-512.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                {test.subject} - {test.month}
              </h2>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Monthly Test Series • 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Progress</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-white">{currentIdx + 1} / {test.questions.length}</span>
                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" 
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest border border-white/5"
            >
              Quit
            </button>
          </div>
        </div>

        {/* Question Area */}
        <div className="p-8 md:p-12">
          <motion.div 
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                Question {currentIdx + 1}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {q.question}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {Array.isArray(q.options) ? (
                q.options.map((opt: string, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`group flex items-center gap-6 p-6 rounded-[1.5rem] border-2 transition-all text-left relative overflow-hidden ${answers[currentIdx] === idx ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-slate-800/30 border-white/5 hover:border-white/10 hover:bg-slate-800/50'}`}
                  >
                    {answers[currentIdx] === idx && (
                      <motion.div 
                        layoutId="active-bg"
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"
                      />
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all ${answers[currentIdx] === idx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`text-lg font-bold transition-colors ${answers[currentIdx] === idx ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {opt}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-slate-500 text-sm italic p-8 text-center bg-white/5 rounded-3xl">Options unavailable.</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Footer Navigation */}
        <div className="p-8 bg-black/20 border-t border-white/5 flex items-center justify-between gap-4">
          <button 
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white disabled:opacity-0 transition-all font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft size={18} /> Previous
          </button>
          
          {currentIdx === test.questions.length - 1 ? (
            <button 
              disabled={answers[currentIdx] === undefined || submitting}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 disabled:opacity-50 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Complete Test'}
            </button>
          ) : (
            <button 
              disabled={answers[currentIdx] === undefined}
              onClick={() => setCurrentIdx(prev => prev + 1)}
              className="flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-200 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
            >
              Next Question <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
