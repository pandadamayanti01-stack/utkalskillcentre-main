import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  Zap,
  Star,
  User,
  Camera,
  Image,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getAI, withRetry } from '../services/aiService';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface SelectedImage {
  base64: string;
  mimeType: string;
  preview: string;
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

export const StudyBuddyView: React.FC<StudyBuddyViewProps> = ({ language, isPremium, onUpgrade, user, initialVoiceMode: _initialVoiceMode, onBack, onLanguageChange }) => {
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
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setSelectedImage({ base64, mimeType: file.type, preview: result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setAttachmentMenuOpen(false);
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };
    const sendMessage = async (textOverride?: string) => {
      const textToSend = textOverride || input;
      if (!textToSend.trim() && !selectedImage) return;
      if (!isPremium) {
        onUpgrade();
        return;
      }

      const imageSnapshot = selectedImage;
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: textToSend || (language === 'or' ? 'ଏହି ଫଟୋଟି ଦେଖ ଓ ବୁଝାଅ' : 'Please look at this image and explain'),
        timestamp: new Date(),
        imageUrl: imageSnapshot?.preview,
      };

      setMessages(prev => [...prev, userMessage]);
      if (!textOverride) setInput('');
      setSelectedImage(null);
      setLoading(true);

      try {
        // 1. Try to answer from our bucket (tutor_queries) if subject matches
        let foundAnswer: string | null = null;
        let foundSubject: string | null = null;
        if (user?.class && textToSend) {
          try {
            // Search for a matching question in tutor_queries for the user's class/subject
            const q = query(
              collection(db, 'tutor_queries'),
              where('userClass', '==', user.class),
              where('question', '==', textToSend)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const docData = snapshot.docs[0].data();
              foundAnswer = docData.answer;
              foundSubject = docData.userClass;
            }
          } catch (err) {
            console.warn('Bucket search failed:', err);
          }
        }

        if (foundAnswer && foundSubject === user?.class) {
          // Answer from bucket
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: foundAnswer,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          // If you have a saveChatHistory util, import it; otherwise, comment/remove this line or implement it.
          // await saveChatHistory(textToSend, foundAnswer);
          setLoading(false);
          return;
        }

        // 2. If not found, fallback to global AI
        const ai = getAI();
        const model = 'gemini-flash-latest';

        const { getStudyBuddySystemInstruction } = await import('../services/aiService');
        
        let customPrompt = '';
        try {
          const settingsDoc = await getDoc(doc(db, 'system_settings', 'config'));
          if (settingsDoc.exists() && settingsDoc.data().gunduluPrompt) {
            customPrompt = settingsDoc.data().gunduluPrompt;
          }
        } catch (err) {
          console.error('Failed to fetch custom Gundulu prompt:', err);
        }

        const systemInstruction = getStudyBuddySystemInstruction(language, user?.name, user?.class, customPrompt);

        // Prepare chat history (last 10 messages)
        // Gemini expects role: 'user' or 'model' (for assistant)
        const chatHistory = messages.slice(-10).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        const messageText = textToSend || (language === 'or' ? 'ଏହି ଫଟୋଟି ଦେଖ ଓ ବୁଝାଅ' : 'Please look at this image and explain');
        
        // Add current message to history
        const contents = [...chatHistory];
        if (imageSnapshot) {
          contents.push({
            role: 'user',
            parts: [
              { text: messageText },
              { inlineData: { mimeType: imageSnapshot.mimeType, data: imageSnapshot.base64 } }
            ]
          });
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: messageText }]
          });
        }

        const result = await withRetry(() => ai.models.generateContent({
          model,
          contents,
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
        // If you have a saveChatHistory util, import it; otherwise, comment/remove this line or implement it.
        // await saveChatHistory(textToSend, responseText);

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
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl shrink-0">
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

      <div ref={messageListRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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
                  {msg.imageUrl && (
                    <div className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                      <img
                        src={msg.imageUrl}
                        alt="attached"
                        className="max-w-[220px] max-h-[180px] rounded-2xl border border-white/10 object-cover shadow-lg"
                      />
                    </div>
                  )}
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

      <div className="shrink-0 p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <div className="max-w-3xl mx-auto">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
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
            <div className="absolute inset-0 bg-emerald-500/5 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>

            {selectedImage && (
              <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-slate-900 rounded-2xl border border-white/10">
                <img src={selectedImage.preview} alt="preview" className="w-12 h-12 rounded-xl object-cover" />
                <span className="flex-1 text-xs text-slate-400">Image ready</span>
                <button onClick={() => setSelectedImage(null)} className="p-1 text-slate-500 hover:text-white"><X size={14} /></button>
              </div>
            )}

            <div className="relative flex items-end gap-2 p-2 bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl focus-within:border-emerald-500/50 transition-all">
              <div className="flex items-center mb-1 ml-1">
                <button
                  onClick={() => setAttachmentMenuOpen((prev) => !prev)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                >
                  <Plus size={20} />
                </button>

                {attachmentMenuOpen && (
                  <div className="absolute bottom-14 left-0 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <button onClick={() => { fileInputRef.current?.click(); setAttachmentMenuOpen(false); }} className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-3">
                      <Image size={16} /> Gallery
                    </button>
                    <button onClick={() => { cameraInputRef.current?.click(); setAttachmentMenuOpen(false); }} className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 flex items-center gap-3 border-t border-white/5">
                      <Camera size={16} /> Camera
                    </button>
                  </div>
                )}
              </div>

              <textarea
                placeholder={language === 'en' ? 'Message Gundulu...' : 'ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହୁଅନ୍ତୁ...'}
                className="flex-1 bg-transparent border-none focus:outline-none text-white text-sm py-3 px-2 resize-none max-h-32 min-h-[44px] custom-scrollbar"
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !selectedImage) || loading}
                className="p-2.5 bg-emerald-500 text-slate-950 rounded-full disabled:bg-slate-800 disabled:text-slate-600 transition-all hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-6 opacity-40">
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <Sparkles size={10} /> Smart AI
             </div>
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <Zap size={10} /> Fast Response
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
