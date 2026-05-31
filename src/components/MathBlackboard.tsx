import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cleanOdiaOrthography } from '../services/aiService';

interface MathBlackboardProps {
  language: 'en' | 'or';
  onClose: () => void;
}

export const MathBlackboard: React.FC<MathBlackboardProps> = ({
  language,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#fef8ec'); // Cream chalk color
  const [brushWidth, setBrushWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [speaking, setSpeaking] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'or'>(language);

  // Auto-scroll explanation on mobile when loaded
  useEffect(() => {
    if (explanation && !loading && window.innerWidth < 768) {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [explanation, loading]);

  // Initialize canvas with chalkboard color
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Fit to container width and responsive height
    const isMobile = window.innerWidth < 768;
    const boardHeight = isMobile ? 220 : 360;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * 2; // Retain high-res
    canvas.height = boardHeight * 2; 
    canvas.style.width = '100%';
    canvas.style.height = `${boardHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.fillStyle = '#0f2f1d'; // Forest chalkboard green
      ctx.fillRect(0, 0, rect.width, boardHeight);
      
      // Draw faint lines (grid/rules like school slate)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 30; y < boardHeight; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
    }
  }, []);

  // Stop TTS if component unmounts
  useEffect(() => {
    return () => {
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, [audioInstance]);

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();

    // Calculate canvas coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Chalk line settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushWidth;
    
    if (isEraser) {
      ctx.strokeStyle = '#0f2f1d'; // Erase by drawing board color
    } else {
      ctx.strokeStyle = brushColor;
    }

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      // Prevent default page scroll on touch
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / 2;
    const height = canvas.height / 2;

    ctx.fillStyle = '#0f2f1d';
    ctx.fillRect(0, 0, width, height);

    // Re-draw faint lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 30; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    setExplanation('');
    stopAudio();
  };

  const stopAudio = () => {
    if (audioInstance) {
      audioInstance.pause();
      setAudioInstance(null);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const speakText = async () => {
    if (speaking) {
      stopAudio();
      return;
    }
    if (!explanation) return;

    // 1. Extract a concise audio summary to keep TTS generation nearly instantaneous (under 30 words)
    let speechText = explanation.split(/(?:ସୋପାନ|Step|1\.)/i)[0];
    
    // Clean up brackets, English translations, and markdown markers
    speechText = speechText
      .replace(/\([a-zA-Z\s\-]+\)/g, '')
      .replace(/[*#_`~]/g, '')
      .trim();

    // Select first two sentences based on English (.?!) and Odia (।) punctuation marks
    const sentences = speechText.match(/[^.!?।\n]+[.!?।\n]+/g) || [speechText];
    if (sentences.length > 2) {
      speechText = sentences.slice(0, 2).join(' ');
    } else {
      speechText = sentences.join(' ');
    }

    // Append standard inviting call-to-action
    if (selectedLang === 'or') {
      speechText += " ସମ୍ପୂର୍ଣ୍ଣ ସମାଧାନର ସୋପାନଗୁଡ଼ିକୁ ତଳେ ଥିବା ବାକ୍ସରେ ପଢ଼ି ବୁଝିବାକୁ ଚେଷ୍ଟା କର!";
    } else {
      speechText += " Please read the complete step-by-step solutions listed in the panel below!";
    }

    const cleanText = cleanOdiaOrthography(speechText);
    const usePremium = localStorage.getItem('gundulu_use_premium_voice') === 'true';

    setSpeaking(true);

    if (!usePremium && 'speechSynthesis' in window) {
      // Local zero-latency browser speech synthesis
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedLang === 'or' ? 'or-IN' : 'en-IN';
      
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => 
        v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en') && 
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural'))
      ) || voices.find(v => v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en'));

      if (matchVoice) {
        utterance.voice = matchVoice;
      }
      
      utterance.pitch = 1.15;
      utterance.rate = 0.85;

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      // Premium server-side Google Cloud / Gemini TTS
      try {
        const response = await fetch('/api/tts/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            language: selectedLang === 'or' ? 'or-IN' : 'en-IN'
          })
        });

        if (!response.ok) throw new Error("TTS failed");
        const blob = await response.blob();
        const urlHelper = window.URL || (window as any).webkitURL;
        const audioUrl = urlHelper.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        setAudioInstance(audio);
        audio.onended = () => setSpeaking(false);
        await audio.play();
      } catch (err) {
        console.error("Speech playback error:", err);
        // Fallback to local browser TTS if server endpoint fails
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = selectedLang === 'or' ? 'or-IN' : 'en-IN';
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setSpeaking(false);
        }
      }
    }
  };

  const solveProblem = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    stopAudio();
    setLoading(true);
    setExplanation('');

    // Immediately scroll to answer block on mobile for immediate visual confirmation
    if (window.innerWidth < 768) {
      setTimeout(() => {
        explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }

    try {
      // Export canvas to base64 PNG
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];

      // Socratic Prompt
      const systemInstruction = 
        "You are Gundulu AI, a friendly, brilliant, and patient Socratic Math Tutor for school students in Odisha. " +
        "Analyze the hand-drawn blackboard image. " +
        "1. Identify the math problem, equation, sum, or text drawn. " +
        "2. Solve it step-by-step. " +
        "3. Explain the steps using a Socratic tutoring method, guiding the child to think rather than just printing a single result. " +
        "4. Provide the explanation in the student's selected language: " + (selectedLang === 'or' ? 'Odia' : 'English') + ". " +
        "5. Keep the explanation concise, clear, and structured with clean markdown points. " +
        "6. CRITICAL MATH LAYOUT RULE: NEVER output LaTeX math expressions, formulas, or delimiters (DO NOT write $, $$, \\[, \\], \\(, \\), \\text{}, \\frac, \\sqrt, \\times, \\div). Write all mathematical equations, fractions, and calculations using plain text and standard Unicode characters (e.g., use +, -, ×, ÷, =, /, √, π, ^) that school students and parents can easily read.";

      const promptText = 
        selectedLang === 'or'
          ? "ଏହି କଳାପଟାରେ ଲେଖାଯାଇଥିବା ଗଣିତ ପ୍ରଶ୍ନଟିକୁ ବୁଝାଇ ସରଳ ଭାଷାରେ ସମାଧାନ କରନ୍ତୁ।"
          : "Please read, solve, and explain the mathematical drawing on this chalkboard.";

      const contents = [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data
              }
            }
          ]
        }
      ];

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction,
          modelType: 'flash'
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const rawText = data.text || "Could not generate solution.";
      setExplanation(cleanOdiaOrthography(rawText));
    } catch (err) {
      console.error("AI Blackboard Solve Error:", err);
      setExplanation(
        selectedLang === 'or'
          ? "❌ ଗଣିତ ପ୍ରଶ୍ନଟି ପଢିବାରେ ଅସୁବିଧା ହେଲା | ଦୟାକରି ସ୍ପଷ୍ଟ ଭାବେ ପୁଣିଥରେ ଲେଖନ୍ତୁ।"
          : "❌ Failed to analyze chalkboard. Please write standard calculations clearly."
      );
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md overflow-y-auto scroll-smooth overscroll-contain p-3 md:p-6 flex flex-col items-center justify-start md:justify-center force-dark-theme" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Dynamic background math glow */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="w-full max-w-[900px] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 my-4 md:my-0 force-dark-theme"
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all z-20 cursor-pointer"
        >
          <Lucide.X size={16} />
        </button>

        {/* Left Section: Slate Chalkboard Canvas */}
        <div className="flex-[5] p-5 flex flex-col gap-4 border-r border-slate-800/80 bg-slate-950/40">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
              <Lucide.PenTool size={11} />
              {selectedLang === 'or' ? 'କଳାପଟା ଚକ୍ ବୋର୍ଡ' : 'Interactive Math Slate'}
            </span>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁ ଗଣିତ କଳାପଟା' : "Gundulu's Slate Blackboard"}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              {selectedLang === 'or' 
                ? 'ଚକ୍ ଖଡିରେ ଗଣିତ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ ଏବଂ ଗୁନ୍ଦୁଲୁ ଆପା ସେଥିରେ ଆପଣଙ୍କୁ ମାର୍ଗଦର୍ଶନ କରିବେ।'
                : 'Write/draw any equation or sum using chalk, and Gundulu will explain step-by-step.'}
            </p>
          </div>

          {/* Blackboard Board Frame */}
          <div className="border-[12px] border-amber-900 rounded-3xl overflow-hidden bg-[#0f2f1d] shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(0,0,0,0.8)] relative select-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair block w-full touch-none"
            />
            {/* Real Blackboard Dust Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />

            {/* Floating Solve Action Button (FAB) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                solveProblem();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
              }}
              disabled={loading}
              className="absolute bottom-4 right-4 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-[0_8px_25px_rgba(16,185,129,0.35)] border border-emerald-400/20 active:scale-95 transition-all hover:scale-105 duration-300 z-30 cursor-pointer flex items-center gap-2 group animate-pulse hover:animate-none"
            >
              <Lucide.Sparkles size={14} className={`text-white ${loading ? 'animate-spin' : 'group-hover:animate-pulse'}`} />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {loading 
                  ? (selectedLang === 'or' ? 'ହିସାବ ହେଉଛି...' : 'Solving...') 
                  : (selectedLang === 'or' ? 'ସମାଧାନ କରନ୍ତୁ' : 'Solve with AI')}
              </span>
            </button>
          </div>

          {/* Chalk Toolbar controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
            {/* Color/Eraser options */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsEraser(false); setBrushColor('#fef8ec'); }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${!isEraser && brushColor === '#fef8ec' ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="White Chalk"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#fef8ec] shadow-sm" />
              </button>
              <button
                onClick={() => { setIsEraser(false); setBrushColor('#fef08a'); }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${!isEraser && brushColor === '#fef08a' ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="Yellow Chalk"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#fef08a] shadow-sm" />
              </button>
              <button
                onClick={() => { setIsEraser(false); setBrushColor('#93c5fd'); }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${!isEraser && brushColor === '#93c5fd' ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="Blue Chalk"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#93c5fd] shadow-sm" />
              </button>
              <button
                onClick={() => setIsEraser(true)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all text-slate-300 hover:text-white cursor-pointer ${isEraser ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="Eraser"
              >
                <Lucide.Eraser size={14} />
              </button>
            </div>

            {/* Brush Width Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chalk Size:</span>
              <input
                type="range"
                min="2"
                max="12"
                value={brushWidth}
                onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                className="w-20 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Blackboard Reset */}
            <button
              onClick={clearBoard}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
            >
              <Lucide.Trash2 size={11} />
              {selectedLang === 'or' ? 'କାଟି ଦିଅନ୍ତୁ' : 'Clear Board'}
            </button>
          </div>
        </div>

        {/* Right Section: Socratic Tutor Explanations */}
        <div ref={explanationRef} className="flex-[4] p-5 flex flex-col gap-4 bg-slate-900">
          <div className="flex items-center justify-start gap-4 border-b border-slate-800 pb-3 mt-4 md:mt-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁ ଆପା ସମାଧାନ' : 'Gundulu Socratic Answer'}
            </span>

            {/* Dialogue/Answer Language Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/5 scale-90">
              <button
                onClick={() => setSelectedLang('or')}
                className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-wider transition-all cursor-pointer ${selectedLang === 'or' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                ଓଡ଼ିଆ
              </button>
              <button
                onClick={() => setSelectedLang('en')}
                className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-wider transition-all cursor-pointer ${selectedLang === 'en' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Explanation panel area */}
          <div className="flex-1 min-h-[220px] md:min-h-0 bg-slate-950/75 rounded-3xl p-5 border border-emerald-500/10 shadow-[0_4px_24px_rgba(16,185,129,0.04)] overflow-y-visible md:overflow-y-auto scrollbar-thin relative flex flex-col justify-between">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full my-auto gap-3 py-10">
                <Lucide.BrainCircuit size={32} className="text-emerald-400 animate-pulse" />
                <div className="flex flex-col items-center text-center">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-bounce">
                    {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁ ହିସାବ କରୁଛି...' : 'Gundulu calculating...'}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1">
                    {selectedLang === 'or' 
                      ? 'କଳାପଟାକୁ Gemini Flash ସାହାଯ୍ୟରେ ପଢାଯାଉଛି।' 
                      : 'Reading chalkboard strokes with Gemini Vision OCR.'}
                  </p>
                </div>
              </div>
            ) : explanation ? (
              <div className="socratic-response-container text-[13px] md:text-sm text-slate-200 max-w-none leading-relaxed space-y-2 select-text pb-6">
                <style>{`
                  .socratic-response-container p {
                    color: #e2e8f0 !important;
                    margin-bottom: 0.75rem;
                  }
                  .socratic-response-container strong {
                    color: #34d399 !important;
                    font-weight: 800;
                  }
                  .socratic-response-container ul, .socratic-response-container ol {
                    margin-left: 1.25rem;
                    margin-bottom: 0.75rem;
                    list-style-type: decimal;
                  }
                  .socratic-response-container li {
                    color: #f1f5f9 !important;
                    margin-bottom: 0.4rem;
                  }
                `}</style>
                <ReactMarkdown>{explanation}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full my-auto text-slate-500 gap-2 py-10">
                <Lucide.Sparkles size={24} className="text-slate-600 animate-spin-slow" />
                <p className="font-medium text-[10px] max-w-[200px]">
                  {selectedLang === 'or'
                    ? 'କଳାପଟାରେ କିଛି ପ୍ରଶ୍ନ ଲେଖି "ସମାଧାନ କରନ୍ତୁ" ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।'
                    : 'Write a query on the left board and click "Solve Chalkboard" to start.'}
                </p>
              </div>
            )}
          </div>

          {/* Dialog Action buttons */}
          <div className="flex items-center gap-3">
            {/* TTS read aloud button */}
            <button
              onClick={speakText}
              disabled={loading || !explanation}
              className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer font-black text-[10px] uppercase tracking-wider ${speaking ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800 disabled:opacity-40'}`}
            >
              {speaking ? (
                <>
                  <Lucide.VolumeX size={14} />
                  <span>{selectedLang === 'or' ? 'ଅଟକାନ୍ତୁ' : 'Stop Audio'}</span>
                </>
              ) : (
                <>
                  <Lucide.Volume2 size={14} />
                  <span>{selectedLang === 'or' ? 'ସମାଧାନ ଶୁଣନ୍ତୁ' : 'Listen Solution'}</span>
                </>
              )}
            </button>

            {/* Analysis triggers */}
            <button
              onClick={solveProblem}
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 border border-emerald-400/20 disabled:opacity-40"
            >
              <Lucide.Sparkles size={14} />
              <span>{selectedLang === 'or' ? 'ସମାଧାନ କରନ୍ତୁ' : 'Solve Chalkboard'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
