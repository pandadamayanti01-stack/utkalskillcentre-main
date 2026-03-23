import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Send, 
  Loader2, 
  Sparkles, 
  X, 
  MessageCircle, 
  Volume2, 
  VolumeX,
  Trash2,
  Brain,
  Zap,
  Star,
  User,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import Markdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StudyBuddyViewProps {
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade: () => void;
  user: any;
}

export const StudyBuddyView: React.FC<StudyBuddyViewProps> = ({ language, isPremium, onUpgrade, user }) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: language === 'en' 
        ? `Hello ${user?.name || 'Student'}! I'm your AI Study Buddy. How can I help you with your studies today?` 
        : `ନମସ୍କାର ${user?.name || 'ଛାତ୍ର'}! ମୁଁ ତୁମର AI ଷ୍ଟଡି ବଡି | ଆଜି ମୁଁ ତୁମକୁ ପାଠପଢାରେ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!isPremium) {
      onUpgrade();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = 'gemini-3-flash-preview';
      
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: `You are a friendly and helpful AI Study Buddy for Odisha Board students. Your name is "Utkal AI". You help students understand complex topics, explain concepts simply, and provide study tips. If the student speaks in Odia, respond in Odia. Keep responses concise and encouraging. Current language: ${language === 'or' ? 'Odia' : 'English'}. Student Name: ${user?.name || 'Student'}. Class: ${user?.class || 'Unknown'}.`
        }
      });

      const result = await chat.sendMessage({ message: input });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.text || "I'm sorry, I couldn't process that.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'en' ? "Failed to connect to AI. Please try again." : "AI ସହିତ ସଂଯୋଗ କରିବାରେ ବିଫଳ ହେଲା | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = language === 'en' ? 'en-IN' : 'or-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const speakMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'en' ? 'en-IN' : 'or-IN';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const suggestedTopics = [
    { en: "Explain Newton's Laws", or: "ନ୍ୟୁଟନ୍‌ଙ୍କ ନିୟମ ବୁଝାନ୍ତୁ" },
    { en: "How does photosynthesis work?", or: "ଆଲୋକ ସଂଶ୍ଳେଷଣ କିପରି କାମ କରେ?" },
    { en: "What is a chemical reaction?", or: "ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା କ’ଣ?" },
    { en: "Explain the water cycle", or: "ଜଳ ଚକ୍ର ବୁଝାନ୍ତୁ" }
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-card neon-border rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Bot size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Utkal AI <span className="text-emerald-500">Buddy</span></h3>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
              <Sparkles size={10} />
              Online & Ready
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMessages([messages[0]])}
            className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
            title="Clear Chat"
          >
            <Trash2 size={18} />
          </button>
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {language === 'en' ? 'English' : 'ଓଡ଼ିଆ'}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="space-y-2">
                  <div className={`p-5 rounded-[2rem] text-sm leading-relaxed shadow-xl relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass-card border border-white/5 text-slate-200 rounded-tl-none'}`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => speakMessage(msg.content)}
                        className="absolute -right-12 top-0 p-2 text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                    )}
                  </div>
                  <p className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-start"
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div className="glass-card border border-white/5 p-4 rounded-[2rem] rounded-tl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 space-y-4">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {suggestedTopics.map((topic, idx) => (
              <button 
                key={idx}
                onClick={() => { setInput(language === 'en' ? topic.en : topic.or); }}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
              >
                {language === 'en' ? topic.en : topic.or}
              </button>
            ))}
          </div>
        )}
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500/5 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative flex items-center gap-3 p-3 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl">
            <button 
              onClick={toggleSpeech}
              className={`p-4 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            <input 
              type="text" 
              placeholder={language === 'en' ? "Ask me anything about your studies..." : "ଆପଣଙ୍କ ପାଠପଢା ବିଷୟରେ କିଛି ବି ପଚାରନ୍ତୁ..."}
              className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm py-2 placeholder:text-slate-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />

            <button 
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`p-4 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all ${(!input.trim() || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 hover:bg-emerald-400'}`}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-1.5">
            <Brain size={12} className="text-blue-500" />
            AI Powered
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
          <div className="flex items-center gap-1.5">
            <Zap size={12} className="text-amber-500" />
            Real-time Help
          </div>
          <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
          <div className="flex items-center gap-1.5">
            <Star size={12} className="text-purple-500" />
            Personalized
          </div>
        </div>
      </div>
    </div>
  );
};
