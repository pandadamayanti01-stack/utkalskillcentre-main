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
  X,
  ChevronLeft,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getAI, withRetry, logAiUsage, gunduluSafetySettings } from '../services/aiService';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { collection, addDoc, doc, getDoc, query, where, getDocs, limit } from 'firebase/firestore';

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
  systemSettings?: any;
}

export const StudyBuddyView: React.FC<StudyBuddyViewProps> = ({ language, isPremium, onUpgrade, user, initialVoiceMode: _initialVoiceMode, onBack, onLanguageChange, systemSettings }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: language === 'or'
        ? 'ନମସ୍କାର! ✨ ମୁଁ ଗୁଣ୍ଡୁଲୁ AI ହୋମୱର୍କ ସହାୟକ! ଆଜି ଆମେ କ’ଣ ପଢ଼ିବା?'
        : 'Namaskar! ✨ I am Gundulu AI Homework Helper! What shall we learn today?',
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
  const [freeQueriesCount, setFreeQueriesCount] = useState<number>(0);
  const { isListening, startListening, stopListening } = useVoiceInput(language);

  useEffect(() => {
    const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
    setFreeQueriesCount(parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10));
  }, [user]);

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
  const isGreeting = (text: string) => {
    const cleaned = text.trim().toLowerCase().replace(/[?.!,]/g, '');
    const greetings = ['hi', 'hello', 'hey', 'namaskar', 'namaskara', 'namaste', 'kemiti achha', 'how are you', 'good morning', 'good evening', 'thanks', 'thank you', 'dhanyabad', 'dhanyabada', 'ok', 'okay'];
    return greetings.includes(cleaned) || cleaned.length < 5;
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() && !selectedImage) return;

    const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
    const academicQuery = !isGreeting(textToSend);

    const isFreePeriod = new Date() < new Date('2026-07-12T00:00:00+05:30');
    if (!isPremium && academicQuery && !isFreePeriod) {
      const freeQueriesUsed = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
      if (freeQueriesUsed >= 5) {
        onUpgrade();
        return;
      }
    }

      const today = new Date().toISOString().split('T')[0];
      const getUsageKey = () => `ai_usage_${user?.uid || user?.id || 'guest'}_${today}`;
      const currentUsage = parseInt(localStorage.getItem(getUsageKey()) || '0', 10);
      const usageLimit = 100;

      if (currentUsage >= usageLimit) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: language === 'en' 
            ? `You have reached your daily premium limit of ${usageLimit} questions. Please try again tomorrow.`
            : `ଆପଣ ଆଜିର ପ୍ରିମିୟମ୍ ସୀମା (${usageLimit} ପ୍ରଶ୍ନ) ଅତିକ୍ରମ କରିଛନ୍ତି | ଦୟାକରି ଆସନ୍ତାକାଲି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
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
        if (user?.class && textToSend && textToSend.trim().length > 10) {
          try {
            const normalized = textToSend.toLowerCase().replace(/[?.!]/g, '').replace(/\s+/g, ' ').trim();
            // Search for a matching question in tutor_queries for the user's class/subject
            const q = query(
              collection(db, 'tutor_queries'),
              where('userClass', '==', user.class),
              where('normalizedQuestion', '==', normalized),
              limit(1)
            );
            let snapshot = await getDocs(q);
            
            // Fallback for legacy queries that don't have normalizedQuestion field
            if (snapshot.empty) {
              const fallbackQ = query(
                collection(db, 'tutor_queries'),
                where('userClass', '==', user.class),
                where('question', '==', textToSend),
                limit(1)
              );
              snapshot = await getDocs(fallbackQ);
            }

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
          
          if (!isPremium && academicQuery) {
            const currentFreeCount = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
            localStorage.setItem(getFreeQueriesKey(), (currentFreeCount + 1).toString());
            setFreeQueriesCount(currentFreeCount + 1);
          }

          // await saveChatHistory(textToSend, foundAnswer);
          logAiUsage(
            user?.uid || 'anonymous',
            user?.name || user?.displayName || 'Student',
            user?.class || 'Unknown',
            textToSend,
            foundAnswer,
            { isFromBucket: true }
          ).catch(e => console.error("Telemetry error:", e));
          setLoading(false);
          return;
        }

        // 2. If not found, fallback to global AI
        localStorage.setItem(getUsageKey(), (currentUsage + 1).toString());
        const ai = getAI();
        const model = 'gemini-2.5-flash';

        const { getStudyBuddySystemInstruction } = await import('../services/aiService');
        
        const customPrompt = systemSettings?.gunduluPrompt || '';

        const systemInstruction = getStudyBuddySystemInstruction(language, user?.name, user?.class, customPrompt);

        // Prepare chat history (last 10 messages)
        // Gemini expects role: 'user' or 'model' (for assistant) and turns must alternate, starting with 'user'.
        const chatHistory: any[] = [];
        const slicedMessages = messages.slice(-6);
        for (const msg of slicedMessages) {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          if (chatHistory.length === 0) {
            if (role === 'user') {
              chatHistory.push({ role, parts: [{ text: msg.content }] });
            }
          } else {
            const lastTurn = chatHistory[chatHistory.length - 1];
            if (lastTurn.role === role) {
              lastTurn.parts[0].text += '\n' + msg.content;
            } else {
              chatHistory.push({ role, parts: [{ text: msg.content }] });
            }
          }
        }

        const messageText = textToSend || (language === 'or' ? 'ଏହି ଫଟୋଟି ଦେଖ ଓ ବୁଝାଅ' : 'Please look at this image and explain');
        
        // Add current message to history
        const contents: any[] = [...chatHistory];
        const newParts: any[] = [{ text: messageText }];
        if (imageSnapshot) {
          newParts.push({ inlineData: { mimeType: imageSnapshot.mimeType, data: imageSnapshot.base64 } });
        }

        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
          contents[contents.length - 1].parts.push(...newParts);
        } else {
          contents.push({
            role: 'user',
            parts: newParts
          });
        }

        const responseText = await withRetry(async (modelName, apiVersion) => {
          const genModel = ai.getGenerativeModel({ 
            model: modelName,
            systemInstruction,
            safetySettings: gunduluSafetySettings
          }, { apiVersion });
          
          const result = await genModel.generateContent({
            contents,
          });
          return result.response.text();
        }, 'flash') || (language === 'or' ? 'ମୁଁ ଦୟାକରି ଏହାକୁ ପୁଣି ଚେଷ୍ଟା କରିବି।' : "I'm sorry, I couldn't process that.");

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Increment free queries token counter for unsubscribed users if it is a valid academic query and not safety-blocked
        if (!isPremium && academicQuery) {
          const isSafetyBlocked = responseText.includes("Safety Warning") || responseText.includes("Perspective API");
          if (!isSafetyBlocked) {
            const currentFreeCount = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
            localStorage.setItem(getFreeQueriesKey(), (currentFreeCount + 1).toString());
            setFreeQueriesCount(currentFreeCount + 1);
          }
        }
        // await saveChatHistory(textToSend, responseText);
        logAiUsage(
          user?.uid || 'anonymous',
          user?.name || user?.displayName || 'Student',
          user?.class || 'Unknown',
          textToSend,
          responseText,
          { isFromBucket: false, language }
        ).catch(e => console.error("Telemetry error:", e));

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
      {/* Hidden inputs for Image/Camera */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="flex items-center justify-between px-2.5 py-1.5 sm:px-6 sm:py-3 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 mr-0.5 sm:mr-1 shrink-0"
              title={language === 'en' ? 'Back' : 'ପଛକୁ ଫେରନ୍ତୁ'}
            >
              <ChevronLeft size={16} className="sm:size-5" />
            </button>
          )}
          <div className="relative shrink-0">
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] border border-[#10b981]/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] overflow-hidden relative shrink-0 ${loading ? 'animate-pulse' : ''}`}>
              <img
                src="/gundulu-v3.png"
                alt="Gundulu Avatar"
                className="w-full h-full object-cover scale-[0.95]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                }}
              />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-[#10b981] border-2 border-slate-900 z-10 ${loading ? 'animate-ping' : 'animate-pulse'}`}></div>
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-base md:text-lg font-black text-white tracking-tight truncate whitespace-nowrap">
              {language === 'en' ? 'Gundulu Chat' : 'ଗୁଣ୍ଡୁଲୁ ଚାଟ୍'}
            </h3>
            <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-black text-[#10b981] uppercase tracking-widest">
              <Sparkles size={6} className="sm:size-[10px]" />
              {loading ? 'Thinking...' : 'Online & Ready'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
            title={language === 'en' ? 'Clear Chat' : 'ଚାଟ୍ ସଫା କରନ୍ତୁ'}
          >
            <Trash2 size={14} className="sm:size-[18px]" />
          </button>
          <div className="h-4 sm:h-6 w-px bg-white/10 mx-0.5 sm:mx-1"></div>
          <button
            onClick={() => onLanguageChange?.(language === 'en' ? 'or' : 'en')}
            className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] sm:text-[10px] font-black text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-widest"
          >
            {language === 'en' ? 'English' : 'ଓଡ଼ିଆ'}
          </button>
        </div>
      </div>

      {new Date() < new Date('2026-07-12T00:00:00+05:30') && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 border-b border-emerald-500/20 px-3 py-1 sm:px-6 sm:py-2 flex items-center justify-center gap-1.5 text-center text-[8px] sm:text-[10px] md:text-xs font-black text-emerald-400 uppercase tracking-widest shrink-0 shadow-lg shadow-emerald-950/20">
          <Sparkles size={8} className="text-emerald-400 animate-spin sm:size-3" style={{ animationDuration: '3s' }} />
          <span className="hidden sm:inline">
            {language === 'or' 
              ? '🎉 ମାଗଣା ପ୍ରଦର୍ଶନ ଅଫର! ୧୧ ଜୁଲାଇ ୨୦୨୬ ପର୍ଯ୍ୟନ୍ତ ଗୁଣ୍ଡୁଲୁ AI ର ଅସୀମିତ ବ୍ୟବହାର କରନ୍ତୁ।'
              : '🎉 Free Showcase Access Active! Enjoy unlimited learning with Gundulu AI until July 11, 2026.'}
          </span>
          <span className="inline sm:hidden truncate max-w-[90vw]">
            {language === 'or' 
              ? '🎉 ମାଗଣା ପ୍ରଦର୍ଶନ! ଅସୀମିତ ଗୁଣ୍ଡୁଲୁ AI'
              : '🎉 Free Showcase! Unlimited Gundulu AI'}
          </span>
        </div>
      )}

      <div ref={messageListRef} className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-3 sm:px-6 md:px-8 sm:py-6 sm:space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[88%] sm:max-w-[85%] flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${msg.role === 'user' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]'}`}>
                  {msg.role === 'user' ? (
                    <User size={16} className="sm:size-[20px]" />
                  ) : (
                    <img
                      src="/gundulu-v3.png"
                      alt="Gundulu"
                      className="w-full h-full object-cover scale-[0.95]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                      }}
                    />
                  )}
                </div>
                <div className="space-y-1 sm:space-y-2 min-w-0">
                  {msg.imageUrl && (
                    <div className={`${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                      <img
                        src={msg.imageUrl}
                        alt="attached"
                        className="max-w-[180px] sm:max-w-[220px] max-h-[140px] sm:max-h-[180px] rounded-xl sm:rounded-2xl border border-white/10 object-cover shadow-lg"
                      />
                    </div>
                  )}
                  <div className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm leading-relaxed shadow-xl relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass-card border border-[#10b981]/20 text-slate-200 rounded-tl-none'}`}>
                    <div className="prose prose-invert prose-sm max-w-none break-words">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                  <p className={`text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
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
            <div className="flex gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center overflow-hidden">
                <img
                  src="/gundulu-v3.png"
                  alt="Gundulu"
                  className="w-full h-full object-cover scale-[0.95]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                  }}
                />
              </div>
              <div className="glass-card border border-white/5 p-3 sm:p-4 rounded-2xl sm:rounded-[2rem] rounded-tl-none flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 p-2 sm:p-4 md:p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
        <div className="max-w-3xl mx-auto">
          {messages.length === 1 && (
            <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 mb-2 sm:mb-4 justify-start sm:justify-center scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {suggestedTopics.map((topic, idx) => (
                <button
                  key={idx}
                  onClick={() => { setInput(language === 'en' ? topic.en : topic.or); }}
                  className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-xs font-bold text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all shrink-0 whitespace-nowrap"
                >
                  {language === 'en' ? topic.en : topic.or}
                </button>
              ))}
            </div>
          )}

          {!isPremium && freeQueriesCount >= 5 && !(new Date() < new Date('2026-07-12T00:00:00+05:30')) ? (
            <div className="relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-slate-900/90 via-slate-950/85 to-[#0b2f1d]/20 border border-emerald-500/30 rounded-[2.5rem] shadow-[0_15px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left relative z-10">
              {/* background lighting */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="flex gap-3 sm:gap-4 items-center flex-col sm:flex-row relative z-10">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full border border-emerald-500/40 bg-slate-950 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-shrink-0 animate-pulse">
                  <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover scale-[0.95]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400 uppercase tracking-wide">
                    {language === 'or' ? 'ମାଗଣା ପଚାରିବା ସୀମା ଶେଷ ହୋଇଛି! 🚀' : 'Free Trial Limit Reached! 🚀'}
                  </h4>
                  <p className="text-[9px] sm:text-xs font-bold text-slate-400 mt-1 leading-relaxed max-w-[420px]">
                    {language === 'or' 
                      ? 'ଗୁଣ୍ଡୁଲୁ ପ୍ରିମିୟମ୍‌କୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ ଏବଂ ଅସୀମିତ ପ୍ରଶ୍ନର ସମାଧାନ କରନ୍ତୁ, ଗୁଣ୍ଡୁଲୁ AI ହୋମୱର୍କ ସହାୟକଙ୍କ ଠାରୁ ଶିକ୍ଷା ସହାୟତା ପାଆନ୍ତୁ!'
                      : 'Upgrade to Gundulu Premium to ask unlimited questions, solve complex chalkboard equations, and get learning assistance from Gundulu AI Homework Helper.'}
                  </p>
                </div>
              </div>
              <button
                onClick={onUpgrade}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 font-black text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap relative z-10"
              >
                <Sparkles size={12} className="animate-spin sm:size-3.5" style={{ animationDuration: '3s' }} />
                <span>{language === 'or' ? 'ପ୍ରିମିୟମ ଅପଗ୍ରେଡ୍' : 'Upgrade to Premium'}</span>
              </button>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500/5 rounded-[2rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>

              {selectedImage && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-slate-900 rounded-xl border border-white/10">
                  <img src={selectedImage.preview} alt="preview" className="w-8 h-8 rounded-lg object-cover" />
                  <span className="flex-1 text-[10px] text-slate-400">Image ready</span>
                  <button onClick={() => setSelectedImage(null)} className="p-1 text-slate-500 hover:text-white"><X size={12} /></button>
                </div>
              )}

              <div className="relative flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-slate-900 border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl focus-within:border-emerald-500/50 transition-all">
                <div className="flex items-center mb-0.5 ml-0.5 sm:mb-1 sm:ml-1">
                  <button
                    onClick={() => setAttachmentMenuOpen((prev) => !prev)}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <Plus size={16} className="sm:size-5" />
                  </button>

                  <button
                    type="button"
                    onClick={isListening ? stopListening : () => startListening((text) => setInput(prev => prev + (prev ? ' ' : '') + text))}
                    className={`p-1.5 sm:p-2 rounded-full transition-all ${isListening ? 'text-red-500 bg-red-500/15 animate-pulse border border-red-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    title={isListening ? (language === 'en' ? 'Stop Listening' : 'ଶୁଣିବା ବନ୍ଦ କରନ୍ତୁ') : (language === 'en' ? 'Speak in Odia/English' : 'ଓଡ଼ିଆ/ଇଂରାଜୀରେ କୁହନ୍ତୁ')}
                  >
                    <Mic size={16} className="sm:size-5" />
                  </button>

                  {attachmentMenuOpen && (
                    <div className="absolute bottom-14 left-0 w-40 sm:w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                      <button onClick={() => { fileInputRef.current?.click(); setAttachmentMenuOpen(false); }} className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2.5 sm:gap-3">
                        <Image size={14} className="sm:size-4" /> Gallery
                      </button>
                      <button onClick={() => { cameraInputRef.current?.click(); setAttachmentMenuOpen(false); }} className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-left text-xs sm:text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2.5 sm:gap-3 border-t border-white/5">
                        <Camera size={14} className="sm:size-4" /> Camera
                      </button>
                    </div>
                  )}
                </div>

                <textarea
                  placeholder={language === 'en' ? 'Message Gundulu...' : 'ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହୁଅନ୍ତୁ...'}
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm py-1.5 sm:py-3 px-1 sm:px-2 resize-none max-h-20 sm:max-h-32 min-h-[30px] sm:min-h-[44px] custom-scrollbar text-white placeholder-slate-500"
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
                  className="p-1.5 sm:p-2.5 bg-emerald-500 text-slate-950 rounded-full disabled:bg-slate-800 disabled:text-slate-600 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  {loading ? <Loader2 size={14} className="animate-spin sm:size-5" /> : <Send size={14} className="sm:size-5" />}
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 sm:mt-3 hidden sm:flex justify-center gap-4 sm:gap-6 opacity-40">
             <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <Sparkles size={8} className="sm:size-[10px]" /> Smart AI
             </div>
             <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <Zap size={8} className="sm:size-[10px]" /> Fast Response
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
