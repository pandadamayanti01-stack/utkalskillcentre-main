import React, { useState } from 'react';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { solveMathDoubt } from '../services/aiService';

interface PracticeQuestionProps {
  question: { question: string; answer: string };
  isPremium: boolean;
  language: 'en' | 'or';
  onUpgrade?: () => void;
}

export const PracticeQuestion: React.FC<PracticeQuestionProps> = ({ question, isPremium, language, onUpgrade }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAskAi = async () => {
    if (!isPremium) {
      alert("Please take a subscription to access the AI Answer feature.");
      if (onUpgrade) onUpgrade();
      return;
    }
    setLoadingAi(true);
    const answer = await solveMathDoubt(question.question, language);
    setAiAnswer(answer);
    setLoadingAi(false);
  };

  return (
    <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5 space-y-4">
      <p className="text-lg text-slate-300 font-medium leading-relaxed">{question.question}</p>
      
      <div className="flex gap-2">
        <button onClick={() => setShowAnswer(!showAnswer)} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition-all">
          {showAnswer ? "Hide Answer" : "View Answer"}
        </button>
        <button onClick={handleAskAi} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-500 transition-all">
          {loadingAi ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
          Ask AI
        </button>
      </div>

      {showAnswer && <p className="text-sm text-slate-400 pt-4 border-t border-white/5">{question.answer}</p>}
      {aiAnswer && <div className="text-sm text-purple-300 pt-4 border-t border-purple-500/20 mt-2"><Brain size={14} className="inline mr-1" /> {aiAnswer}</div>}
    </div>
  );
};
