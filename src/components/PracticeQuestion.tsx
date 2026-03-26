import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, CheckCircle2, XCircle, Lock } from 'lucide-react';

interface PracticeQuestionProps {
  question: any;
  isPremium: boolean;
  language: 'or' | 'en';
  onUpgrade: () => void;
}

export function PracticeQuestion({ question, isPremium, language, onUpgrade }: PracticeQuestionProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 hover:bg-slate-800/50 transition-all relative overflow-hidden group">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
          <HelpCircle size={20} />
        </div>
        <p className="text-white font-bold leading-relaxed flex-1">{question.question}</p>
      </div>

      <div className="space-y-3 mb-6">
        {question.options.map((opt: string, i: number) => (
          <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-sm">
            <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[10px]">{String.fromCharCode(65 + i)}</div>
            <span>{opt}</span>
          </div>
        ))}
      </div>

      <button 
        onClick={() => isPremium ? setShowAnswer(!showAnswer) : onUpgrade()}
        className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAnswer ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
      >
        {!isPremium && <Lock size={14} />}
        <span>{showAnswer ? 'Hide Answer' : 'Show Answer'}</span>
        <ChevronDown size={14} className={`transition-transform ${showAnswer ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showAnswer && isPremium && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <CheckCircle2 size={16} />
                <span>Correct Answer: {question.correct_answer}</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Tutor Explanation</p>
                <p className="text-emerald-200/80 text-sm leading-relaxed">{question.tutor_explanation || question.answer || 'No explanation provided.'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isPremium && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl text-center">
            <Lock size={20} className="text-amber-500 mx-auto mb-2" />
            <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2">Premium Feature</p>
            <button 
              onClick={onUpgrade}
              className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest hover:underline"
            >
              Upgrade to Unlock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
