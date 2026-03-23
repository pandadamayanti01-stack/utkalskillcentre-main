import React, { useState, useRef } from 'react';
import { 
  Brain, 
  Camera, 
  Image as ImageIcon, 
  Send, 
  Loader2, 
  Sparkles, 
  X, 
  Trash2,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  AlertCircle,
  PenTool,
  History,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import Markdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

interface AiSolverViewProps {
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade: () => void;
}

export const AiSolverView: React.FC<AiSolverViewProps> = ({ language, isPremium, onUpgrade }) => {
  const t = translations[language];
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('ai_solver_history');
    return saved ? JSON.parse(saved) : [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveToHistory = (q: string, a: string, img?: string | null) => {
    const newEntry = { id: Date.now(), question: q, answer: a, image: img, date: new Date().toISOString() };
    const newHistory = [newEntry, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('ai_solver_history', JSON.stringify(newHistory));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const solveProblem = async () => {
    if (!input && !image) return;
    if (!isPremium) {
      onUpgrade();
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = 'gemini-3-flash-preview';
      
      let contents: any;
      if (image) {
        const base64Data = image.split(',')[1];
        contents = {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } },
            { text: input || "Solve this problem step by step." }
          ]
        };
      } else {
        contents = input;
      }

      const result = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: `You are an expert tutor for Odisha Board students. Solve the problem step-by-step. Use clear language. Provide the final answer clearly. If the language is Odia, respond in Odia. Current language: ${language === 'or' ? 'Odia' : 'English'}.`
        }
      });

      const solvedText = result.text || "No response generated.";
      setResponse(solvedText);
      saveToHistory(input || "Image-based problem", solvedText, image);
    } catch (err: any) {
      console.error("AI Solver Error:", err);
      setError(language === 'en' ? "Failed to solve problem. Please try again." : "ସମସ୍ୟାର ସମାଧାନ କରିବାରେ ବିଫଳ ହେଲା | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Brain size={40} />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight">AI <span className="text-emerald-500">Problem Solver</span></h1>
        <p className="text-slate-400 text-sm font-medium uppercase tracking-widest max-w-md mx-auto">
          Snap a photo or type your question. Our AI will guide you through the solution.
        </p>
      </div>

      {/* Input Area */}
      <div className="glass-card neon-border rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        
        <div className="relative">
          <textarea 
            className="w-full h-40 px-6 py-6 rounded-3xl bg-slate-900/50 border border-white/5 text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-slate-600 backdrop-blur-md"
            placeholder={language === 'en' ? "Type your math or science question here..." : "ଏଠାରେ ଆପଣଙ୍କର ଗଣିତ କିମ୍ବା ବିଜ୍ଞାନ ପ୍ରଶ୍ନ ଟାଇପ୍ କରନ୍ତୁ..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              title="Upload Image"
            >
              <ImageIcon size={20} />
            </button>
            <button 
              className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              title="Take Photo"
            >
              <Camera size={20} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {image && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-xs aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl group"
            >
              <img src={image} alt="Problem" className="w-full h-full object-cover" />
              <button 
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={solveProblem}
          disabled={loading || (!input && !image)}
          className={`w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 border border-emerald-500/50 ${ (loading || (!input && !image)) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={24} />
              <span>Solve with AI</span>
            </>
          )}
        </button>
      </div>

      {/* Response Area */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card rounded-[2.5rem] p-12 flex flex-col items-center justify-center space-y-6 border border-white/5"
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">AI is Thinking...</h3>
              <p className="text-slate-500 text-sm">Our intelligent tutor is analyzing your problem and generating a step-by-step solution.</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-[1.5rem] bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4"
          >
            <AlertCircle size={24} />
            <span className="font-bold">{error}</span>
          </motion.div>
        )}

        {response && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card neon-border rounded-[2.5rem] p-8 md:p-12 space-y-8 relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Lightbulb size={24} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Step-by-Step Solution</h3>
              </div>
              <button 
                onClick={() => setResponse(null)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div className="prose prose-invert max-w-none prose-emerald">
              <div className="markdown-body">
                <Markdown>{response}</Markdown>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-slate-500">
                <Sparkles size={16} className="text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-widest">Powered by Gemini AI</span>
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                  <PenTool size={16} />
                  Ask Follow-up
                </button>
                <button className="px-6 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                  Save to Notes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ... existing features ... */}
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                <MessageCircle size={24} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Recent Solutions</h3>
            </div>
            <button 
              onClick={() => { setHistory([]); localStorage.removeItem('ai_solver_history'); }}
              className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                onClick={() => { setInput(item.question); setResponse(item.answer); setImage(item.image); }}
                className="glass-card rounded-3xl p-6 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  {item.image ? (
                    <img src={item.image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="History" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <HelpCircle size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{item.question}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-500 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
