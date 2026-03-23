import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Trophy, 
  Zap, 
  Award, 
  Sparkles,
  X,
  HelpCircle,
  Flag,
  Timer,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  image_url?: string;
}

interface MonthlyTest {
  id: string;
  title: string;
  subject: string;
  duration: number; // in minutes
  questions: Question[];
}

interface MonthlyTestEngineProps {
  test: MonthlyTest;
  language: 'en' | 'or';
  onComplete: (results: { score: number; total: number; answers: number[] }) => void;
  onClose: () => void;
}

export const MonthlyTestEngine: React.FC<MonthlyTestEngineProps> = ({ 
  test, 
  language, 
  onComplete,
  onClose 
}) => {
  const t = translations[language];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(test.questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(test.duration * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<boolean[]>(new Array(test.questions.length).fill(false));

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const toggleFlag = () => {
    const newFlags = [...flaggedQuestions];
    newFlags[currentQuestionIndex] = !newFlags[currentQuestionIndex];
    setFlaggedQuestions(newFlags);
  };

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let score = 0;
    test.questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_answer) {
        score++;
      }
    });

    onComplete({
      score,
      total: test.questions.length,
      answers
    });
    setIsFinished(true);
  };

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;
  const answeredCount = answers.filter(a => a !== -1).length;

  if (isFinished) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 glass-card border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowConfirmSubmit(true)}
            className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <X size={20} />
          </button>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">{test.title}</h3>
            <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{test.subject} • {test.questions.length} Questions</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all ${timeLeft < 300 ? 'bg-red-500/10 border-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-white'}`}>
            <Timer size={20} />
            <span className="text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
          </div>
          <button 
            onClick={() => setShowConfirmSubmit(true)}
            className="px-8 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-black uppercase tracking-widest hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
          >
            Submit Test
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Question Navigator */}
        <div className="hidden lg:flex w-80 flex-col border-r border-white/5 bg-slate-900/20 p-8 space-y-8 overflow-y-auto">
          <div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Progress Overview</h4>
            <div className="flex items-center justify-between text-sm font-black text-white mb-2">
              <span>{answeredCount} of {test.questions.length} Answered</span>
              <span className="text-purple-500">{Math.round((answeredCount / test.questions.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${(answeredCount / test.questions.length) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Question Map</h4>
            <div className="grid grid-cols-5 gap-3">
              {test.questions.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-10 h-10 rounded-xl text-xs font-black transition-all border flex items-center justify-center relative ${currentQuestionIndex === idx ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20' : answers[idx] !== -1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-white'}`}
                >
                  {idx + 1}
                  {flaggedQuestions[idx] && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-slate-900"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-6 rounded-3xl bg-purple-500/5 border border-purple-500/10 space-y-3">
            <div className="flex items-center gap-2 text-purple-400">
              <HelpCircle size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Test Tip</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">Flag questions you're unsure about and come back to them later if you have time.</p>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-12 lg:p-20">
          <div className="max-w-3xl mx-auto w-full space-y-12">
            {/* Question Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="px-4 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 text-xs font-black uppercase tracking-widest">
                  Question {currentQuestionIndex + 1}
                </span>
                <button 
                  onClick={toggleFlag}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border transition-all text-xs font-black uppercase tracking-widest ${flaggedQuestions[currentQuestionIndex] ? 'bg-orange-500 text-white border-orange-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'}`}
                >
                  <Flag size={14} fill={flaggedQuestions[currentQuestionIndex] ? "currentColor" : "none"} />
                  {flaggedQuestions[currentQuestionIndex] ? 'Flagged' : 'Flag'}
                </button>
              </div>
              <div className="text-slate-500 text-xs font-black uppercase tracking-widest">
                Points: 4.0
              </div>
            </div>

            {/* Question Content */}
            <div className="space-y-8">
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                {currentQuestion.question}
              </h2>

              {currentQuestion.image_url && (
                <div className="rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
                  <img src={currentQuestion.image_url} alt="Question" className="w-full h-auto" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`group relative flex items-center gap-6 p-6 rounded-[1.5rem] border transition-all text-left ${answers[currentQuestionIndex] === idx ? 'bg-purple-500/10 border-purple-500 text-white shadow-lg shadow-purple-500/10' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-black shrink-0 transition-all ${answers[currentQuestionIndex] === idx ? 'bg-purple-500 border-purple-400 text-white' : 'bg-slate-900 border-white/10 text-slate-500 group-hover:border-white/20'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-lg font-bold">{option}</span>
                    {answers[currentQuestionIndex] === idx && (
                      <div className="ml-auto text-purple-500">
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-12 border-t border-white/5">
              <button 
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${currentQuestionIndex === 0 ? 'opacity-30 cursor-not-allowed text-slate-600' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
              >
                <ArrowLeft size={20} />
                Previous
              </button>

              {currentQuestionIndex === test.questions.length - 1 ? (
                <button 
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center gap-3 px-12 py-4 rounded-2xl bg-purple-500 text-white font-black text-sm uppercase tracking-widest hover:bg-purple-400 transition-all shadow-xl shadow-purple-500/20"
                >
                  Finish Test
                  <CheckCircle2 size={20} />
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                  className="flex items-center gap-3 px-12 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Next
                  <ArrowRight size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card neon-border rounded-[2.5rem] p-10 max-w-md w-full text-center space-y-8"
            >
              <div className="w-20 h-20 bg-purple-500/10 rounded-[2rem] flex items-center justify-center text-purple-500 mx-auto border border-purple-500/20">
                <AlertCircle size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white mb-2">Submit Your Test?</h3>
                <p className="text-slate-500 text-sm">
                  You have answered <span className="text-white font-bold">{answeredCount}</span> out of <span className="text-white font-bold">{test.questions.length}</span> questions. 
                  {answeredCount < test.questions.length && " Are you sure you want to submit without answering all questions?"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowConfirmSubmit(false)}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Back to Test
                </button>
                <button 
                  onClick={handleSubmit}
                  className="py-4 rounded-2xl bg-purple-500 text-white font-black text-xs uppercase tracking-widest hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
                >
                  Yes, Submit
                </button>
              </div>
              
              <button 
                onClick={onClose}
                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
              >
                Cancel & Exit Test
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
