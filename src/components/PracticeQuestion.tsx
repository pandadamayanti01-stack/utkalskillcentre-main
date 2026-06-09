import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Lucide from 'lucide-react';

interface PracticeQuestionProps {
  question: any;
  isPremium: boolean;
  language: 'or' | 'en';
  onUpgrade: () => void;
}

export function PracticeQuestion({ question, isPremium, language, onUpgrade }: PracticeQuestionProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  return (
    <div className="glass-card rounded-[2.5rem] p-8 border-white/5 hover:border-emerald-500/30 transition-all relative overflow-hidden group">
      {/* Question Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all shadow-lg border border-emerald-500/20">
          <Lucide.HelpCircle size={24} />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">
            {language === 'or' ? 'ଜ୍ଞାନାତ୍ମକ ପ୍ରଶ୍ନ' : 'Cognitive Probe'}
          </p>
          <h4 className="text-white font-black text-lg leading-relaxed tracking-tight">{question.question}</h4>
        </div>
      </div>

      {/* Options Matrix */}
      {Array.isArray(question.options) && question.options.length > 0 && (
        <div className="grid grid-cols-1 gap-3 mb-8">
          {question.options.map((opt: string, i: number) => {
            const isCorrect = opt === question.correct_answer;
            const isSelected = selectedOption === i;
            
            return (
              <button 
                key={i} 
                onClick={() => setSelectedOption(i)}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left relative overflow-hidden group/opt ${
                  isSelected 
                    ? (isCorrect ? 'bg-emerald-500/10 border-emerald-500/50 text-white' : 'bg-red-500/10 border-red-500/50 text-white')
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${
                  isSelected 
                    ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white')
                    : 'bg-slate-800 text-slate-500 group-hover/opt:bg-slate-700 group-hover/opt:text-white'
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className="text-sm font-bold tracking-tight">{opt}</span>
                
                {isSelected && (
                  <div className="absolute right-4">
                    {isCorrect ? <Lucide.CheckCircle2 size={18} className="text-emerald-500" /> : <Lucide.XCircle size={18} className="text-red-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Action Area */}
      <div className="space-y-4">
        <button 
          onClick={() => isPremium ? setShowAnswer(!showAnswer) : onUpgrade()}
          className={`w-full py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn ${
            showAnswer 
              ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' 
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
          }`}
        >
          {!isPremium && <Lucide.Lock size={14} className="group-hover/btn:scale-110 transition-transform" />}
          <span className="relative z-10 text-[10px]">
            {showAnswer 
              ? (language === 'or' ? 'ସମାଧାନ ବନ୍ଦ କରନ୍ତୁ' : 'Retract Solution') 
              : (language === 'or' ? 'ନ୍ୟୁରାଲ୍ ସମାଧାନ ଦେଖନ୍ତୁ' : 'Request Logic Link')}
          </span>
          <Lucide.ChevronDown size={14} className={`transition-transform relative z-10 ${showAnswer ? 'rotate-180' : ''}`} />
          
          {showAnswer && (
            <motion.div 
              layoutId="btn-bg"
              className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600"
            />
          )}
        </button>

        <AnimatePresence>
          {showAnswer && isPremium && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-6 space-y-4">
                <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Lucide.Zap size={48} className="text-emerald-500" />
                  </div>
                  
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                    <Lucide.MessageSquare size={14} />
                    <span>{language === 'or' ? 'ନ୍ୟୁରାଲ୍ ବିଶ୍ଳେଷଣ' : 'Neural Insights'}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {language === 'or' ? 'ଯାଞ୍ଚ ହୋଇଥିବା ଉତ୍ତର:' : 'Validated Entry:'}
                      </span>
                      <span className="text-sm font-black text-emerald-400">{question.correct_answer}</span>
                    </div>
                    <p className="text-emerald-100/70 text-sm leading-relaxed italic font-medium">
                      "{question.tutor_explanation || question.answer || (language === 'or' ? 'କୌଣସି ବିଶ୍ଳେଷଣ ଦିଆଯାଇନାହିଁ।' : 'No logical breakdown provided.')}"
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isPremium && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl text-center max-w-[80%] transform scale-90 group-hover:scale-100 transition-transform">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 border border-amber-500/20">
              <Lucide.Lock size={28} />
            </div>
            <h5 className="text-sm font-black text-white uppercase tracking-tighter mb-2">
              {language === 'or' ? 'ନ୍ୟୁରାଲ୍ ଲିଙ୍କ୍ ଏନକ୍ରିପ୍ଟ ହୋଇଛି' : 'Neural Link Encrypted'}
            </h5>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-6">
              {language === 'or' ? 'ସମାଧାନ ପ୍ରକ୍ରିୟା ଅନଲକ୍ କରିବାକୁ ପ୍ରିମିୟମକୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ।' : 'Upgrade to Premium to unlock solution protocols.'}
            </p>
            <button 
              onClick={onUpgrade}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all"
            >
              {language === 'or' ? 'ଅପଗ୍ରେଡ୍ ଆରମ୍ଭ କରନ୍ତୁ' : 'Initialize Upgrade'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
