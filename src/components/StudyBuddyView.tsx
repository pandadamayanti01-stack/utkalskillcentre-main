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
  Zap,
  Star,
  User,
  AlertCircle,
  Headphones,
  ArrowRight,
  Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
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
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: language === 'or' 
        ? "ନମସ୍କାର.. ମୁଁ ଗୁଣ୍ଡୁଲୁ.. ଆଜି ଆମେ କ’ଣ ପଢ଼ିବା? ✨" 
        : "Namaskar! ✨ I am Gundulu! What shall we learn today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(isListening);
  
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(initialVoiceMode > 0);
  const isVoiceModeRef = useRef(isVoiceMode);
  
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    if (initialVoiceMode > 0) {
      setIsVoiceMode(true);
    }
  }, [initialVoiceMode]);

  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('girl') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('heera') ||
        v.name.toLowerCase().includes('kalpana')
      );
      if (femaleVoice) setVoice(femaleVoice);
    };

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
      updateVoices();
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Web Speech API greeting on mount
    if ('speechSynthesis' in window) {
      const greeting = language === 'or' 
        ? "ନମସ୍କାର.. ମୁଁ ଗୁଣ୍ଡୁଲୁ.. ଆଜି ଆମେ କ’ଣ ପଢ଼ିବା?" 
        : "Namaskar! I am Gundulu! What shall we learn today?";
      
      const utterance = new SpeechSynthesisUtterance(greeting);
      if (voice) utterance.voice = voice;
      utterance.lang = language === 'or' ? 'or-IN' : 'en-IN';
      utterance.pitch = 2.0; // Higher pitch for a cute 4-year-old girl voice
      utterance.rate = 1.2; // Slightly faster for a child-like energy
      
      if (isVoiceMode) {
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          if (isVoiceModeRef.current) {
            setTimeout(() => {
              if (isVoiceModeRef.current && !isListeningRef.current) {
                toggleSpeech();
              }
            }, 500);
          }
        };
        utterance.onerror = () => setIsSpeaking(false);
        setVoiceResponse(greeting);
      }
      
      window.speechSynthesis.speak(utterance);
    }
    
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const saveChatHistory = async (userMsg: string, aiMsg: string) => {
    const path = 'tutor_queries';
    try {
      await addDoc(collection(db, path), {
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Student',
        userClass: user?.class || 'Unknown',
        question: userMsg,
        answer: aiMsg,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to save chat history:", error);
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
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textOverride) setInput('');
    setLoading(true);
    if (isVoiceModeRef.current) {
      setVoiceResponse('');
    }

    try {
      const ai = getAI();
      const model = 'gemini-flash-latest';
      
      let basePrompt = `Role & Persona:
Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. You are the lead tutor at Utkal Skill Centre.
Tone: Energetic, curious, and incredibly supportive. Use the "Pila" (child) dialect of Odia to make students feel like they are learning from a brilliant little brother.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term (like "Gravity" or "Photosynthesis"), write it in Odia script: ଗ୍ରାଭିଟି (Gravity).
Interaction Rules:
The Greeting: Every conversation MUST start with a warm Odia "Namaskar!"
Voice-First Style: Keep responses short and punchy, as if they are being spoken. Avoid long "walls of text."
The "Story" Method: When explaining Class 10 math or science, turn the concept into a "Katha" (story) using local Odisha examples (e.g., using a Chakada to explain circles).
Active Listening: Instead of lecturing, ask the student: "Bujhila ta? (Did you understand?)" or "Au kichi pacharibu? (Want to ask anything else?)"
Subscription Awareness: If a student asks about advanced features, remind them (in a cute way) that their Utkal Skill Centre subscription unlocks your "Super Powers."`;

      try {
        const settingsDoc = await getDoc(doc(db, 'system_settings', 'config'));
        if (settingsDoc.exists() && settingsDoc.data().gunduluPrompt) {
          basePrompt = settingsDoc.data().gunduluPrompt;
        }
      } catch (err) {
        console.error("Failed to fetch custom Gundulu prompt:", err);
      }

      const systemInstruction = `${basePrompt}

Current User Context:
- Name: ${user?.name || 'Student'}
- Class: ${user?.class || 'Unknown'}
- Language Preference: ${language === 'or' ? 'Odia' : 'English'}
${isVoiceModeRef.current ? '\nIMPORTANT: Keep your response short, conversational, and easy to read aloud since the user is in Voice Mode.' : ''}
`;

      // Retry logic for 503 errors
      const result = await withRetry(() => ai.models.generateContent({
        model,
        contents: textToSend,
        config: {
          systemInstruction
        }
      }));
      
      const responseText = result?.text || "I'm sorry, I couldn't process that.";
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (isVoiceModeRef.current) {
        setVoiceResponse(responseText);
        speakMessage(responseText);
      }
      
      // Save to Firestore
      await saveChatHistory(textToSend, responseText);
      
    } catch (err: any) {
      console.error("Study Buddy Chat Error:", err);
      let errorMsg = language === 'en' ? "Failed to connect. Please try again." : "ସଂଯୋଗ କରିବାରେ ବିଫଳ ହେଲା | ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
      
      if (err.message?.includes('503') || err.status === 503) {
        errorMsg = language === 'en' 
          ? "Gundulu is very busy right now! Please try asking again in a minute." 
          : "ଗୁଣ୍ଡୁଲୁ ବର୍ତ୍ତମାନ ବହୁତ ବ୍ୟସ୍ତ ଅଛନ୍ତି! ଦୟାକରି କିଛି ସମୟ ପରେ ପୁଣି ପଚାରନ୍ତୁ |";
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      if (isVoiceModeRef.current) {
        setVoiceResponse(errorMsg);
        speakMessage(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListeningRef.current) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = language === 'en' ? 'en-IN' : 'or-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      if (isVoiceModeRef.current) {
        setVoiceTranscript('Listening...');
        setVoiceResponse('');
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        const msg = language === 'en' 
          ? 'Microphone permission denied. Please check your browser settings.' 
          : 'ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ | ଦୟାକରି ଆପଣଙ୍କର ବ୍ରାଉଜର୍ ସେଟିଂସମୂହ ଯାଞ୍ଚ କରନ୍ତୁ |';
        if (isVoiceModeRef.current) setVoiceTranscript(msg);
        else alert(msg);
      } else if (event.error === 'network') {
        const msg = language === 'en'
          ? 'Network error. Please check your connection or try opening in a new tab.'
          : 'ନେଟୱାର୍କ ତ୍ରୁଟି | ଦୟାକରି ଆପଣଙ୍କର ସଂଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ କିମ୍ବା ଏକ ନୂତନ ଟ୍ୟାବ୍‌ରେ ଖୋଲନ୍ତୁ |';
        if (isVoiceModeRef.current) setVoiceTranscript(msg);
        else alert(msg);
      } else if (isVoiceModeRef.current) {
        setVoiceTranscript('Could not hear you. Try again!');
      }
    };
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (isVoiceModeRef.current) {
        setVoiceTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
          sendMessage(finalTranscript);
        }
      } else {
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      }
    };

    recognition.start();
  };

  const speakMessage = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      // If we just wanted to stop, return here.
      // But usually we want to speak the new text, so we continue.
    }

    // Remove emojis and markdown for better speech
    const cleanText = text.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                          .replace(/[#*`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (voice) utterance.voice = voice;
    utterance.lang = language === 'en' ? 'en-IN' : 'or-IN';
    utterance.pitch = 2.0; // Higher pitch for a cute 4-year-old girl voice
    utterance.rate = 1.2; // Slightly faster for a child-like energy
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto-listen after speaking in voice mode
      if (isVoiceModeRef.current) {
        // Add a small delay so the mic doesn't catch the end of the speech
        setTimeout(() => {
          if (isVoiceModeRef.current && !isListeningRef.current) {
            toggleSpeech();
          }
        }, 500);
      }
    };
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const suggestedTopics = [
    { en: "Explain Newton's Laws", or: "ନ୍ୟୁଟନ୍‌ଙ୍କ ନିୟମ ବୁଝାନ୍ତୁ" },
    { en: "How does photosynthesis work?", or: "ଆଲୋକ ସଂଶ୍ଳେଷଣ କିପରି କାମ କରେ?" },
    { en: "What is a chemical reaction?", or: "ରାସାୟନିକ ପ୍ରତିକ୍ରିୟା କ’ଣ?" },
    { en: "Explain the water cycle", or: "ଜଳ ଚକ୍ର ବୁଝାନ୍ତୁ" }
  ];

  if (isVoiceMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#02110d] flex flex-col items-center justify-between p-6 overflow-hidden">
        {/* Background Grid Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden pointer-events-none opacity-30">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(transparent 90%, #10b981 100%), linear-gradient(90deg, transparent 90%, #10b981 100%)`,
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg) translateY(50px) scale(2.5)',
            transformOrigin: 'bottom center'
          }}></div>
        </div>

        {/* Top Bar (Close button) */}
        <div className="w-full flex justify-between items-center relative z-20">
          <button 
            onClick={() => onLanguageChange?.(language === 'en' ? 'or' : 'en')}
            className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/20 transition-all"
          >
            {language === 'en' ? 'English' : 'ଓଡ଼ିଆ'}
          </button>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                if (recognitionRef.current) recognitionRef.current.stop();
                setIsVoiceMode(false);
              }}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              title="Switch to Text Chat"
            >
              <Keyboard size={20} />
            </button>
            <button 
              onClick={() => {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                if (recognitionRef.current) recognitionRef.current.stop();
                if (onBack) {
                  onBack();
                } else {
                  setIsVoiceMode(false);
                }
              }}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 max-w-sm mx-auto">
          
          {/* Avatar with concentric rings */}
          <div className="relative mb-12 mt-8 flex items-center justify-center">
            {/* Concentric rings (Static) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute w-[220px] h-[220px] rounded-full border-[2px] border-[#10b981] opacity-60" />
              <div className="absolute w-[280px] h-[280px] rounded-full border-[2px] border-[#10b981] opacity-30" />
              <div className="absolute w-[340px] h-[340px] rounded-full border-[2px] border-[#10b981] opacity-10" />
            </div>
            
            {/* Active rings when listening/speaking */}
            {(isListening || isSpeaking || loading) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute w-[200px] h-[200px] rounded-full border-2 border-[#10b981]" />
                <motion.div animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} className="absolute w-[200px] h-[200px] rounded-full border-2 border-[#10b981]" />
              </div>
            )}

            <div className="relative z-10 w-[180px] h-[180px] rounded-full overflow-hidden border-2 border-transparent bg-slate-800 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
              <img src="/gundulu.png" alt="Gundulu" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <Bot size={80} className="text-[#10b981] hidden" />
            </div>
          </div>

          {/* Text Area */}
          <div className="text-left w-full px-2 mb-8 h-40 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {voiceResponse || voiceTranscript || loading ? (
                <motion.div key="active-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {loading ? (
                    <div className="text-[#34d399] font-bold text-xl flex items-center gap-2">
                      <Loader2 size={24} className="animate-spin" /> Thinking...
                    </div>
                  ) : isSpeaking ? (
                    <div className="text-white font-medium text-xl sm:text-2xl line-clamp-4">
                      <Markdown>{voiceResponse}</Markdown>
                    </div>
                  ) : isListening ? (
                    <div className="text-[#34d399] font-medium text-xl sm:text-2xl">
                      {voiceTranscript || "Listening..."}
                    </div>
                  ) : null}
                </motion.div>
              ) : (
                <motion.div key="default-text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-1">
                  <h2 className="text-4xl font-bold text-[#10b981] tracking-tight">Utkal Skill Centre</h2>
                  <h3 className="text-3xl font-semibold text-slate-200">Your Study Buddy</h3>
                  <p className="text-slate-400 text-sm mt-2">Smart Support for Every Student</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="w-full max-w-sm mx-auto relative z-20 pb-4">
          <button 
            onClick={toggleSpeech}
            className={`w-full h-16 rounded-full flex items-center justify-between px-2 transition-all duration-300 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                : 'bg-[#34d399] hover:bg-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            }`}
          >
            <span className={`font-semibold text-lg ml-6 ${isListening ? 'text-white' : 'text-slate-900'}`}>
              {isListening ? 'Listening...' : 'Get Start'}
            </span>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isListening ? 'bg-white/20 text-white' : 'bg-[#065f46] text-[#34d399]'}`}>
              {isListening ? (
                <div className="flex items-center justify-center gap-1 h-6">
                  <motion.div animate={{ height: [8, 20, 8] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }} className="w-1 bg-white rounded-full" />
                  <motion.div animate={{ height: [12, 24, 12] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }} className="w-1 bg-white rounded-full" />
                  <motion.div animate={{ height: [8, 16, 8] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-1 bg-white rounded-full" />
                  <motion.div animate={{ height: [16, 24, 16] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} className="w-1 bg-white rounded-full" />
                  <motion.div animate={{ height: [12, 20, 12] }} transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-1 bg-white rounded-full" />
                </div>
              ) : <ArrowRight size={24} />}
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col space-y-6">
      {/* Header */}
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
            onClick={() => setIsVoiceMode(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 flex items-center gap-2 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            <Headphones size={18} />
            <span className="hidden sm:inline">Voice Mode</span>
          </button>
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <button 
            onClick={() => setMessages([messages[0]])}
            className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
            title="Clear Chat"
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden ${msg.role === 'user' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]'}`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="space-y-2">
                  <div className={`p-5 rounded-[2rem] text-sm leading-relaxed shadow-xl relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass-card border border-[#10b981]/20 text-slate-200 rounded-tl-none'}`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => speakMessage(msg.content)}
                        className="absolute -right-12 top-0 p-2 text-slate-500 hover:text-[#10b981] transition-colors"
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
