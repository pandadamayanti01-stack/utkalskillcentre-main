import React, { useState } from 'react';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { solveMathDoubt } from '../services/aiService';

interface PracticeQuestionProps {
  question: { question: string; answer: string; ai_answer?: string };
  isPremium: boolean;
  language: 'en' | 'or';
  onUpgrade?: () => void;
}

export const PracticeQuestion: React.FC<PracticeQuestionProps> = ({ question, isPremium, language, onUpgrade }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiAnswer, setAiAnswer] = useState(question.ai_answer || '');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAskAi = async () => {
    if (aiAnswer) return; // Already have an answer
    
    if (!isPremium) {
      alert("Please take a subscription to access the AI Answer feature.");
      if (onUpgrade) onUpgrade();
      return;
    }
    setLoadingAi(true);
    try {
      const answer = await solveMathDoubt(question.question, language);
      setAiAnswer(answer);
    } catch (err) {
      console.error("AI Answer Error:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 hover:border-white/20 transition-all space-y-4 relative overflow-hidden group">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all pointer-events-none"></div>
      <p className="text-lg text-slate-200 font-medium leading-relaxed relative z-10">{question.question}</p>
      
      <div className="flex gap-3 relative z-10">
        <button onClick={() => setShowAnswer(!showAnswer)} className="text-xs font-bold uppercase tracking-wider bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 border border-white/10 transition-all shadow-lg">
          {showAnswer ? "Hide Answer" : "View Answer"}
        </button>
        <button 
          onClick={handleAskAi} 
          disabled={!!aiAnswer && !loadingAi}
          className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg ${
            aiAnswer 
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-default' 
              : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:opacity-90 border border-purple-500/50'
          }`}
        >
          {loadingAi ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
          {aiAnswer ? "AI Answer Ready" : "Ask AI"}
        </button>
      </div>

      {showAnswer && <p className="text-sm text-slate-300 pt-4 border-t border-white/10 relative z-10 font-mono">{question.answer}</p>}
      {aiAnswer && <div className="text-sm text-purple-200 pt-4 border-t border-purple-500/30 mt-2 relative z-10 bg-purple-500/5 p-4 rounded-2xl"><Brain size={16} className="inline mr-2 text-purple-400" /> {aiAnswer}</div>}
    </div>
  );
};
