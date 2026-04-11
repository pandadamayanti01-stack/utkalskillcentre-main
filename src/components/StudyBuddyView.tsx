import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Zap,
  Star,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getAI, withRetry } from '../services/aiService';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

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
  initialVoiceMode?: number;
  onBack?: () => void;
  onLanguageChange?: (lang: 'en' | 'or') => void;
}

export const StudyBuddyView: React.FC<StudyBuddyViewProps> = ({ language, isPremium, onUpgrade, user, initialVoiceMode = 0, onBack, onLanguageChange }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: language === 'or'
        ? 'ନମସ୍କାର.. ମୁଁ ଗୁଣ୍ଡୁଲୁ.. ଆଜି ଆମେ କ’ଣ ପଢ଼ିବା? ✨'
        : 'Namaskar! ✨ I am Gundulu! What shall we learn today?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const saveChatHistory = async (userMsg: string, aiMsg: string) => {
    const path = 'tutor_queries';
    try {
      await addDoc(collection(db, path), {
        userId: user?.id || user?.uid || 'anonymous',
        userName: user?.name || user?.displayName || 'Student',
        userClass: user?.class || 'Unknown',
        userPhone: user?.phoneNumber || '',
        userEmail: user?.email || '',
        question: userMsg,
        answer: aiMsg,
        source: 'chatbot',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to save chat history:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;
    if (!isPremium) {
      onUpgrade();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      const ai = getAI();
      const model = 'gemini-flash-latest';

      let basePrompt = `Role & Persona:
Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. You are the lead tutor at Utkal Skill Centre.
Tone: Energetic, curious, and incredibly supportive. Use the "Pila" (child) dialect of Odia to make students feel like they are learning from a brilliant little brother.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term (like "Gravity" or "Photosynthesis"), write it in Odia script: ଗ୍ରାଭିଟି (Gravity).
Interaction Rules:
The Greeting: Every conversation MUST start with a warm Odia "Namaskar!"
The "Story" Method: When explaining concepts, turn the answer into a "Katha" (story) using local Odisha examples where possible.
Active Listening: Instead of lecturing, ask the student: "Bujhila ta? (Did you understand?)" or "Au kichi pacharibu? (Want to ask anything else?)"
Subscription Awareness: If a student asks about advanced features, remind them in a friendly way that their Utkal Skill Centre subscription unlocks Gundulu's "Super Powers."`;

      try {
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'config'));
        if (settingsDoc.exists() && settingsDoc.data().gunduluPrompt) {
          basePrompt = settingsDoc.data().gunduluPrompt;
        }
      } catch (err) {
        console.error('Failed to fetch custom Gundulu prompt:', err);
      }

      const systemInstruction = `${basePrompt}

Current User Context:
- Name: ${user?.name || 'Student'}
- Class: ${user?.class || 'Unknown'}
- Language Preference: ${language === 'or' ? 'Odia' : 'English'}`;

      const result = await withRetry(() => ai.models.generateContent({
        model,
        contents: textToSend,
        config: {
          systemInstruction,
        },
      }));

      const responseText = result?.text || (language === 'or' ? 'ମୁଁ ଦୟାକରି ଏହାକୁ ପୁଣି ଚେଷ୍ଟା କରିବି।' : "I'm sorry, I couldn't process that.");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveChatHistory(textToSend, responseText);
    } catch (err: any) {
      console.error('Study Buddy Chat Error:', err);
      let errorMsg = language === 'en' ? 'Failed to connect. Please try again.' : 'ସଂଯୋଗ କରିବାରେ ବିଫଳ ହେଲା | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |';
      if (err.message?.includes('503') || err.status === 503) {
        errorMsg = language === 'en'
          ? 'Gundulu is very busy right now! Please try asking again in a minute.'
          : 'ଗୁଣ୍ଡୁଲୁ ବର୍ତ୍ତମାନ ବହୁତ ବ୍ୟସ୍ତ ଅଛନ୍ତି! ଦୟାକରି କିଛି ସମୟ ପରେ ପୁଣି ପଚାରନ୍ତୁ |';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedTopics = [
    { en: "Explain Newton's Laws", or: 'ନ୍ୟୁଟନ୍‌ଙ୍କ ନିୟମ ବୁଝାନ୍ତୁ' },
    { en: 'How does photosynthesis work?', or: 'ଆଲୋକ ସଂଶ୍ଳେଷଣ କିପରି କାମ କରେ?' },
    { en: 'What is a chemical reaction?', or: 'ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା କ’ଣ?' },
    { en: 'Explain the water cycle', or: 'ଜଳ ଚକ୍ର ବୁଝାନ୍ତୁ' },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col space-y-6">
      <div className="flex items-center justify-between px-6 py-4 glass-card neon-border rounded-3xl border border-[#10b981]/30 bg-slate-900/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] border border-[#10b981]/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] overflow-hidden ${loading ? 'animate-pulse' : ''}`}>
              <Bot size={28} className="text-[#10b981]" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10b981] border-2 border-slate-900 ${loading ? 'animate-ping' : 'animate-pulse'}`}></div>
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Gundulu</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-[#10b981] uppercase tracking-widest">
              <Sparkles size={10} />
              {loading ? 'Thinking...' : 'Online & Ready'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
            title={language === 'en' ? 'Clear Chat' : 'ଚାଟ୍ ସଫା କରନ୍ତୁ'}
          >
            <Trash2 size={18} />
          </button>
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <button
            onClick={() => onLanguageChange?.(language === 'en' ? 'or' : 'en')}
            className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest"
          >
            {language === 'en' ? 'English' : 'ଓଡ଼ିଆ'}
          </button>
        </div>
      </div>

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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${msg.role === 'user' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="space-y-2">
                  <div className={`p-5 rounded-[2rem] text-sm leading-relaxed shadow-xl relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass-card border border-[#10b981]/20 text-slate-200 rounded-tl-none'}`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
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
            <input
              type="text"
              placeholder={language === 'en' ? 'Ask me anything about your studies...' : 'ଆପଣଙ୍କ ପାଠପଢା ବିଷୟରେ କିଛି ବି ପଚାରନ୍ତୁ...'}
              className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm py-2 placeholder:text-slate-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`p-4 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all ${(!input.trim() || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 hover:bg-emerald-400'}`}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
          <div className="flex items-center gap-1.5">
            <Bot size={12} className="text-blue-500" />
            Smart Learning
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
