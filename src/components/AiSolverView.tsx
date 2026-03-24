import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Send, 
  Loader2, 
  Sparkles, 
  X,
  Brain
} from 'lucide-react';
import Markdown from 'react-markdown';
import { solveMathDoubt } from '../services/aiService';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { translations } from '../translations';

interface AiSolverViewProps {
  language: 'en' | 'or';
  onBack: () => void;
}

export function AiSolverView({ language, onBack }: AiSolverViewProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, startListening, stopListening } = useVoiceSearch(language);

  useEffect(() => {
    if (transcript) {
      setPrompt(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'en' ? "Image size should be less than 5MB" : "ଫଟୋର ଆକାର ୫ MB ରୁ କମ୍ ହେବା ଉଚିତ୍ |");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage(base64String);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSolve = async () => {
    if (!prompt && !selectedImage) return;
    setLoading(true);
    try {
      const imageData = selectedImage && imageMimeType ? { data: selectedImage, mimeType: imageMimeType } : undefined;
      const result = await solveMathDoubt(prompt || (language === 'en' ? "Please solve this math problem." : "ଦୟାକରି ଏହି ଗଣିତ ସମସ୍ୟାର ସମାଧାନ କରନ୍ତୁ |"), language, imageData);
      setResponse(result);
    } catch (error) {
      console.error("AI Error:", error);
      setResponse(language === 'en' ? "Error generating solution. Please try again." : "ସମାଧାନ ପ୍ରସ୍ତୁତ କରିବାରେ ତ୍ରୁଟି | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="text-emerald-400" />
            {translations[language].aiSolver}
          </h1>
          <p className="text-slate-400 text-sm">{translations[language].aiSolverDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
            <div className="flex gap-4">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col items-center gap-3 hover:bg-emerald-500/20 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="text-sm font-medium text-emerald-400">{translations[language].takePhoto}</span>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex flex-col items-center gap-3 hover:bg-blue-500/20 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <ImageIcon size={24} />
                </div>
                <span className="text-sm font-medium text-blue-400">{translations[language].uploadImage}</span>
              </button>
            </div>

            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageSelect} className="hidden" />
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />

            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="relative rounded-2xl overflow-hidden border border-white/10"
                >
                  <img src={`data:${imageMimeType};base64,${selectedImage}`} alt="Selected" className="w-full h-48 object-cover" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={translations[language].typeQuestion}
                className="w-full h-40 bg-black/40 border border-white/10 rounded-3xl p-6 text-white placeholder:text-slate-600 focus:border-emerald-500/50 outline-none resize-none transition-all"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button 
                  onClick={isListening ? stopListening : startListening}
                  className={`p-3 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button 
                  onClick={handleSolve}
                  disabled={loading || (!prompt && !selectedImage)}
                  className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 min-h-[400px] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Sparkles size={120} />
            </div>

            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="text-emerald-400" size={20} />
              {translations[language].solution}
            </h2>

            <div className="prose prose-invert max-w-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-emerald-400" size={40} />
                  <p className="text-slate-400 animate-pulse">{translations[language].thinking}</p>
                </div>
              ) : response ? (
                <div className="markdown-body">
                  <Markdown>{response}</Markdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-30">
                  <Brain size={60} />
                  <p className="text-sm max-w-[200px]">{translations[language].noSolutionYet}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
