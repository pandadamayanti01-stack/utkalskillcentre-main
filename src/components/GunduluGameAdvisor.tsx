import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { askGunduluGameAdvisor } from '../services/aiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface GunduluGameAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameTitle: string;
  studentClass: string;
}

export function GunduluGameAdvisor({ isOpen, onClose, gameId, gameTitle, studentClass }: GunduluGameAdvisorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const classNum = Number(studentClass?.replace(/\D/g, '')) || 5;

  // Determine class-specific welcome message & suggestion chips
  const getGreetingAndChips = () => {
    let welcome = '';
    let chips: string[] = [];

    if (classNum <= 5) {
      welcome = `ନମସ୍କାର ଭାଇ/ବୁନି! 🐹 ମୁଁ ତୁମର ଗୁନ୍ଦୁଲୁ ସାଥୀ। ${gameTitle} ଖେଳିବା ପାଇଁ ତୁମେ ପ୍ରସ୍ତୁତ ତ? କିଛି ସାହାଯ୍ୟ ଦରକାର କି? ମତେ ପଚାର!`;
      chips = [
        "ଖେଳ କେମିତି ଖେଳିବା?",
        "ମତେ ଗୋଟେ ସହଜ ଟିପ୍ ଦିଅ!",
        "ଏହି ଖେଳର କିଛି କାହାଣୀ କୁହ",
        "ମୁଁ କେମିତି ଜିତିବି?"
      ];
    } else {
      welcome = `ନମସ୍କାର! 🤖 ମୁଁ ଆପଣଙ୍କ ଗୁନ୍ଦୁଲୁ ଖେଳ ସହଯୋଗୀ। ${gameTitle} ଖେଳରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ରଣନୀତି, ନିୟମ କିମ୍ବା ଐତିହାସିକ ପୃଷ୍ଠଭୂମି ବିଷୟରେ ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାରିପାରିବେ।`;
      chips = [
        "ଏହି ଖେଳର ମୂଳ ନିୟମ କଣ?",
        "ଜିତିବାର ଶ୍ରେଷ୍ଠ ରଣନୀତି (Winning Strategy) କଣ?",
        "ଖେଳର ଇତିହାସ ଓ ସାଂସ୍କୃତିକ ଗୁରୁତ୍ୱ କଣ?",
        "ଗଣିତ କିମ୍ବା ବୌଦ୍ଧିକ ପ୍ରଶ୍ନ କେମିତି ସମାଧାନ କରିବି?"
      ];
    }
    return { welcome, chips };
  };

  const { welcome, chips } = getGreetingAndChips();

  // Reset chat when active game changes
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: welcome
        }
      ]);
    }
  }, [gameId, isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Speech Synthesis (TTS)
  const speakResponse = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined') return;
    try {
      window.speechSynthesis.cancel();
      // Remove emojis and english brackets for cleaner Odia voice read
      const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
                            .replace(/\((.*?)\)/g, "");
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.15; // Higher pitched friendly squirrel voice
      
      // Set to Odia voice if available
      const voices = window.speechSynthesis.getVoices();
      const odiaVoice = voices.find(v => v.lang.includes('or') || v.lang.includes('IN'));
      if (odiaVoice) utterance.voice = odiaVoice;
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS speech warning:", e);
    }
  };

  // Stop voice on close
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Pass the message history (excluding the greeting message)
      const currentHistory = [...messages, userMsg].filter(m => m.id !== 'welcome');
      const responseText = await askGunduluGameAdvisor(gameId, studentClass, currentHistory);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText
      };

      setMessages(prev => [...prev, aiMsg]);
      speakResponse(responseText);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          />

          {/* Chat Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] md:w-[420px] bg-slate-900 border-l border-white/10 z-50 flex flex-col shadow-2xl text-slate-100"
          >
            {/* Header Section */}
            <div className="p-4 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full bg-slate-800 border-2 border-amber-500/30 overflow-hidden flex items-center justify-center p-0.5">
                  <img src="/gundulu-v3.png" alt="Gundulu Game Advisor" className="w-full h-full object-contain" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    ଗୁନ୍ଦୁଲୁ ଗେମ୍ Advisor 🤖
                  </h3>
                  <p className="text-[10px] text-amber-400 font-extrabold tracking-wider uppercase">
                    Socratic Game Guide
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice mode toggle */}
                <button
                  onClick={() => {
                    if (voiceEnabled) window.speechSynthesis.cancel();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  className={`p-2.5 rounded-xl border transition-all ${
                    voiceEnabled 
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                      : 'bg-white/[0.04] text-slate-400 border-white/5 hover:bg-white/[0.08]'
                  }`}
                  title={voiceEnabled ? "Voice Enabled" : "Voice Disabled"}
                >
                  {voiceEnabled ? <Lucide.Volume2 size={16} /> : <Lucide.VolumeX size={16} />}
                </button>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2.5 bg-white/[0.04] border border-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <Lucide.X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-slate-950/20">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden p-0.5">
                      <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/20 shrink-0 flex items-center justify-center font-black text-[10px] text-purple-300">
                      👦
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs font-bold leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-purple-600 border border-purple-500/30 text-white rounded-tr-none'
                        : 'bg-slate-800/80 border border-white/5 text-slate-200 rounded-tl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden p-0.5 animate-spin">
                    <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-contain" />
                  </div>
                  <div className="px-3.5 py-2.5 bg-slate-800/80 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {messages.length === 1 && (
              <div className="p-3 bg-slate-950/40 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">
                  କିଛି ପଚାରନ୍ତୁ (Quick Questions):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chipText, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(chipText)}
                      className="text-[10px] text-amber-400 bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/30 px-2.5 py-1 rounded-lg text-left transition-all active:scale-95 font-bold"
                    >
                      💡 {chipText}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                placeholder={classNum <= 5 ? "ଗୁନ୍ଦୁଲୁ ସହ କଥା ହୁଅ..." : "ରଣନୀତି ବା ନିୟମ ପଚାରନ୍ତୁ..."}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 placeholder-slate-500 font-bold"
              />
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || loading}
                className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 rounded-xl transition-all shadow-md shadow-amber-500/10 active:scale-95 shrink-0"
              >
                <Lucide.Send size={15} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
