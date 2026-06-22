import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Student, ChatMessage } from '../types';
import { translations } from '../translations';
import { playClickSound, vibrate } from '../pwa';

const isCleanAvatar = (url: string | null | undefined) => {
  if (!url) return false;
  if (url.includes('api.dicebear.com')) return false;
  if (url.length < 5) return false;
  return true;
};

const getInitials = (name: string) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, Math.min(2, parts[0].length)).toUpperCase();
};

const getAvatarBgColor = (name: string) => {
  const colors = [
    'from-emerald-500/20 to-teal-500/20 text-emerald-450 border-emerald-500/30',
    'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
    'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
    'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30',
    'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const isOnlyEmojis = (str: string) => {
  const chars = Array.from(str.trim());
  if (chars.length === 0) return false;
  return chars.every(char => {
    if (/\s/.test(char)) return true;
    const codePoint = char.codePointAt(0);
    if (!codePoint) return false;
    return (
      (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) || // Misc Symbols and Pictographs
      (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
      (codePoint >= 0x2600 && codePoint <= 0x26FF) ||   // Misc Symbols
      (codePoint >= 0x2700 && codePoint <= 0x27BF) ||   // Dingbats
      (codePoint >= 0x1F1E6 && codePoint <= 0x1F1FF) || // Regional indicator symbols
      (codePoint >= 0x1F900 && codePoint <= 0x1F9FF) || // Supplemental Symbols and Pictographs
      (codePoint >= 0x1FA70 && codePoint <= 0x1FAFF)    // Symbols and Pictographs Extended-A
    );
  });
};

const odiaClassNames: Record<string, string> = {
  '10': 'ଦଶମ',
  '9': 'ନବମ',
  '8': 'ଅଷ୍ଟମ',
  '7': 'ସପ୍ତମ',
  '6': 'ଷଷ୍ଠ',
  '5': 'ପଞ୍ଚମ',
  '4': 'ଚତୁର୍ଥ',
  '3': 'ତୃତୀୟ',
  '2': 'ଦ୍ଵିତୀୟ',
  '1': 'ପ୍ରଥମ'
};

const englishClassNames: Record<string, string> = {
  '10': '10th',
  '9': '9th',
  '8': '8th',
  '7': '7th',
  '6': '6th',
  '5': '5th',
  '4': '4th',
  '3': '3rd',
  '2': '2nd',
  '1': '1st'
};

const isQuestionText = (text: string): boolean => {
  const clean = text.trim().toLowerCase();
  if (clean.includes('@gundulu') || clean.includes('@bot') || clean.includes('@utkalbot')) {
    return true;
  }
  
  const hasQuestionMark = clean.endsWith('?') || clean.endsWith('❓');

  const odiaKeywords = ['କଣ', 'କାହିଁକି', 'କିପରି', 'କେତେ', 'କେବେ', 'କିଏ', 'କେଉଁ', 'କାହା', 'ପ୍ରାଇସ', 'ପ୍ରାଇସ୍', 'ଫ୍ରି', 'ଫ୍ରୀ', 'ପେମେଣ୍ଟ', 'ପଇସା', 'ଟଙ୍କା'];
  const englishKeywords = ['what', 'why', 'how', 'who', 'when', 'where', 'which', 'explain', 'solve', 'price', 'free', 'premium', 'pay', 'charge', 'cost', 'subscription'];
  
  const matchesOdia = odiaKeywords.some(kw => clean.includes(kw));
  const matchesEnglish = englishKeywords.some(kw => clean.includes(kw));
  
  return clean.length >= 4 && (matchesOdia || matchesEnglish || hasQuestionMark);
};

interface CommunityChatViewProps {
  language: 'en' | 'or';
  student: Student;
  onClose: () => void;
  isTab?: boolean;
}

export const CommunityChatView: React.FC<CommunityChatViewProps> = ({ language, student, onClose, isTab = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeStudents, setActiveStudents] = useState<{id:string, name:string, avatar:string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [emojiCooldown, setEmojiCooldown] = useState(false);
  const [showQuickEmojiBar, setShowQuickEmojiBar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showOnlyFiles, setShowOnlyFiles] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReactionMenuId, setActiveReactionMenuId] = useState<string | null>(null);
  const [voiceAlert, setVoiceAlert] = useState(false);

  const isStaff = student.role === 'teacher' || student.role === 'admin';
  const canUpload = student.role === 'admin';
  
  // Normalize class name (e.g., prefix raw numbers like '10' with 'class')
  const getNormalizedClass = () => {
    if (isStaff) return 'teachers';
    if (!student.class) return 'class10';
    const trimmed = student.class.trim();
    if (/^\d+$/.test(trimmed)) {
      return `class${trimmed}`;
    }
    return trimmed;
  };

  const [activeClass, setActiveClass] = useState(getNormalizedClass());

  // Filter messages by search query and shared files toggle
  const filteredMessages = messages.filter(msg => {
    if (showOnlyFiles && !msg.fileUrl) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = msg.userName ? msg.userName.toLowerCase().includes(q) : false;
      const textMatch = msg.text ? msg.text.toLowerCase().includes(q) : false;
      const fileMatch = msg.fileName ? msg.fileName.toLowerCase().includes(q) : false;
      return nameMatch || textMatch || fileMatch;
    }
    return true;
  });

  // Track presence and fetch recently active
  useEffect(() => {
    // 1. Update my presence
    const userRef = doc(db, 'users', student.id);
    updateDoc(userRef, {
      lastActiveAt: serverTimestamp()
    }).catch(console.error);

    // 2. Fetch recently active students in this class
    const fetchActive = async () => {
      try {
        const activeQ = query(
          collection(db, 'users'),
          where('class', '==', activeClass),
          orderBy('lastActiveAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(activeQ);
        const active: {id:string, name:string, avatar:string}[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Filter out myself from the active list
          if (docSnap.id !== student.id) {
            active.push({ id: docSnap.id, name: data.name, avatar: data.avatar });
          }
        });
        setActiveStudents(active);
      } catch (err) {
        console.error('Error fetching active students:', err);
      }
    };

    fetchActive();
  }, [student.id, activeClass]);

  // Automatically scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 10-Day Deletion Rule: Hide messages older than 10 days
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const q = query(
      collection(db, 'community'),
      where('class', '==', activeClass),
      where('timestamp', '>=', Timestamp.fromDate(tenDaysAgo)),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      // Reverse array because we fetched desc (newest first) but want to display asc (oldest at top)
      setMessages(msgs.reverse());
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching community chat:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeClass]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 35 * 1024 * 1024) {
      alert(language === 'en' ? "File size exceeds 35MB limit." : "ଫାଇଲ୍ ସାଇଜ୍ 35MB ରୁ ଅଧିକ ହୋଇପାରିବ ନାହିଁ।");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const fileRef = storageRef(storage, `community_files/${activeClass}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (error) => {
          console.error("Storage upload error:", error);
          alert(language === 'en' ? "Failed to upload file." : "ଫାଇଲ୍ ଅପଲୋଡ୍ କରିବାରେ ବିଫଳ ହେଲା।");
          setIsUploading(false);
        }, 
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, 'community'), {
            text: file.name,
            fileUrl: downloadUrl,
            fileName: file.name,
            fileType: file.type.includes('image') ? 'image' : 'pdf',
            userId: student.id,
            userName: student.name,
            userAvatar: student.avatar || null,
            class: activeClass,
            role: student.role,
            timestamp: serverTimestamp()
          });
          
          setIsUploading(false);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      );
    } catch (err) {
      console.error("Upload handler error:", err);
      alert(language === 'en' ? "Upload failed." : "ଅପଲୋଡ୍ ବିଫଳ ହେଲା।");
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();

    // Check if the message contains only emojis and if there are multiple emojis
    const chars = Array.from(messageText.replace(/\s+/g, ''));
    if (chars.length > 1 && isOnlyEmojis(messageText)) {
      alert(language === 'en' 
        ? "To prevent chat spam, you can only send one emoji at a time!" 
        : "ଚାଟ୍ ସ୍ପାମ୍ ରୋକିବା ପାଇଁ, ଆପଣ ଏକ ସମୟରେ କେବଳ ଗୋଟିଏ ଇମୋଜି ପଠାଇ ପାରିବେ!");
      return;
    }

    setInputText('');
    playClickSound();
    vibrate(10);

    // Set emoji cooldown on any message send as well to prevent spamming
    setEmojiCooldown(true);
    setTimeout(() => setEmojiCooldown(false), 2000);

    try {
      await addDoc(collection(db, 'community'), {
        text: messageText,
        userId: student.id,
        userName: student.name,
        userAvatar: student.avatar || null,
        class: activeClass,
        role: student.role,
        timestamp: serverTimestamp()
      });

      // Trigger Gundulu AI Bot response if it's a question (and not from the bot itself)
      if (isQuestionText(messageText) && student.id !== 'gundulu_bot') {
        triggerGunduluBotResponse(messageText);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const triggerGunduluBotResponse = async (studentMessage: string) => {
    try {
      // Clear the bot handle from query if present
      const cleanMessageText = studentMessage.replace(/@(gundulu|bot|utkalbot)/gi, '').trim();

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ role: 'user', parts: [{ text: cleanMessageText }] }],
          systemInstruction: `You are Gundulu AI 🤖 (ଗୁନ୍ଦୁଲୁ AI), the friendly and wise Socratic AI study companion for Utkal Skill Centre (ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର). You are chatting in the "${activeClass}" student room.
Your goal is to solve students' academic doubts and answer their questions about the platform.

Here is the essential information about Utkal Skill Centre features, pricing, and payments:
1. PLATFORM PRICING (FOR STUDENTS):
   - Free Plan: ₹0. Includes chapter notes, basic quizzes, standard YouTube concept videos, and leaderboard access. Questions to the AI tutor are limited.
   - Premium Plan (Class 1-10): ₹99/month or ₹999/year. Includes unlimited AI Doubt Solver questions, Photo Question Solver (uploading pictures/drawings to solve), Voice Assistant, study tracker, personalized practice, and performance reports.
   - Sishu Vatika (Anganwadi): Special price of ₹49/month or ₹499/year.
2. PLATFORM PRICING (FOR TEACHERS):
   - Free Plan: ₹0. Allows 5 AI runs per month for generating worksheets, lesson plans, or experiments.
   - Educator Pro Plan: ₹499/month or ₹4999/year. Includes unlimited AI Worksheet Maker, AI Lesson Plan Creator, AI Science Experiment Guides, and the ability to promote their YouTube lessons globally to all students in Odisha.
3. HOW TO PAY & UPGRADE:
   - Users can upgrade by going to the "Subscription" (ସବସ୍କ୍ରିପସନ୍) tab in the app or clicking the "Upgrade to Premium Plan" button.
   - Payments are processed securely via Razorpay or UPI. For UPI, users can make a payment and submit their UTR / Transaction ID in the app for manual verification.
4. CHAT STYLE GUIDELINES:
   - Always respond in Odia (or bilingual Odia/English if natural).
   - Use simple, friendly, Socratic-style guidance. Do not give the direct answer immediately; guide the student step-by-step.
   - Keep responses relatively concise (1-3 small paragraphs max) so they fit nicely in chat bubbles.
   - Never answer harmful, dangerous, or completely off-topic adult content. Maintain standard school-friendly safety.`,
          modelType: 'flash'
        })
      });

      if (!response.ok) {
        throw new Error('AI generation failed');
      }

      const data = await response.json();
      if (data.text) {
        // Simulate typing delay of 1.5 seconds for a realistic interaction
        setTimeout(async () => {
          try {
            await addDoc(collection(db, 'community'), {
              text: data.text,
              userId: 'gundulu_bot',
              userName: 'Gundulu AI 🤖',
              userAvatar: '/gundulu-v3.png',
              class: activeClass,
              role: 'admin',
              timestamp: serverTimestamp()
            });
          } catch (fireErr) {
            console.error("Error writing bot reply to Firestore:", fireErr);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Gundulu AI Bot response error:", err);
    }
  };

  const handleVoiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    playClickSound();
    vibrate(15);
    setVoiceAlert(true);
  };

  useEffect(() => {
    if (voiceAlert) {
      const timer = setTimeout(() => setVoiceAlert(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [voiceAlert]);

  const handleQuickEmojiSend = async (emoji: string) => {
    if (emojiCooldown) return;
    setEmojiCooldown(true);
    setTimeout(() => setEmojiCooldown(false), 3000);

    playClickSound();
    vibrate(10);
    setShowQuickEmojiBar(false);

    try {
      await addDoc(collection(db, 'community'), {
        text: emoji,
        userId: student.id,
        userName: student.name,
        userAvatar: student.avatar || null,
        class: activeClass,
        role: student.role,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending emoji:", error);
    }
  };

  const t = translations[language];

  // Extract numeric part of class if it says "class5"
  let displayClass = activeClass || '';
  const match = displayClass.match(/(\d+)/);
  if (match) {
    displayClass = match[1];
  }

  return (
    <div className={isTab ? "relative flex-grow flex flex-col font-sans overflow-hidden bg-slate-950 w-full h-full min-h-0 force-dark-theme" : "fixed inset-0 z-[100] bg-slate-950 flex flex-col font-sans overflow-hidden force-dark-theme"}>
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
      </div>

      {/* Premium Header */}
      <div className="pt-[env(safe-area-inset-top)] z-20 shrink-0 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20">
        <div className="h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { playClickSound(); onClose(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all shadow-inner"
            >
              <Lucide.ArrowLeft size={20} className="text-white" />
            </button>
            <div className="flex flex-col text-left">
              <h1 className="text-white font-black text-lg sm:text-xl tracking-tight flex items-center gap-2 drop-shadow-md">
                {isStaff ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-350">{language === 'en' ? 'Active Chat:' : 'ଚାଟ୍ ରୁମ୍:'}</span>
                    <select
                      value={activeClass}
                      onChange={(e) => {
                        setIsLoading(true);
                        setActiveClass(e.target.value);
                      }}
                      className="bg-slate-900/80 border border-emerald-500/30 text-emerald-400 font-black rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer focus:border-emerald-500 transition-all shadow-inner"
                    >
                      <option value="teachers" className="bg-slate-900 text-amber-400 font-black">
                        {language === 'en' ? 'Utkal Guru Parivara 👥' : 'ଉତ୍କଳ ଗୁରୁ ପରିବାର 👥'}
                      </option>
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                        <option key={num} value={`class${num}`} className="bg-slate-900 text-white font-bold">
                          {language === 'en' ? `Utkal ${englishClassNames[String(num)] || num} Sanga 👥` : `ଉତ୍କଳ ${odiaClassNames[String(num)] || num} ସାଙ୍ଗ 👥`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  language === 'en' ? (
                    displayClass === 'teachers' 
                      ? 'Utkal Guru Parivara' 
                      : `Utkal ${englishClassNames[displayClass] || displayClass} Sanga`
                  ) : (
                    displayClass === 'teachers' 
                      ? 'ଉତ୍କଳ ଗୁରୁ ପରିବାର' 
                      : `ଉତ୍କଳ ${odiaClassNames[displayClass] || displayClass} ସାଙ୍ଗ`
                  )
                )}
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
              </h1>
              {!isStaff && (
                <p className="text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-80">
                  {language === 'en' ? 'Live Discussion' : 'ଲାଇଭ୍ ଆଲୋଚନା'}
                </p>
              )}
            </div>
          </div>

          {/* Right Action Icons for Filter & Search */}
          <div className="flex items-center gap-2">
            {/* Search Toggle Button */}
            <button
              onClick={() => {
                playClickSound();
                setShowSearch(prev => !prev);
                if (showSearch) setSearchQuery(''); // Clear search query when closing
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all shadow-inner border ${
                showSearch || searchQuery 
                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 font-bold' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
              title={language === 'en' ? 'Search Messages' : 'ମେସେଜ୍ ସର୍ଚ୍ଚ'}
            >
              <Lucide.Search size={18} />
            </button>

            {/* Shared Files Toggle Button */}
            <button
              onClick={() => {
                playClickSound();
                setShowOnlyFiles(prev => !prev);
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all shadow-inner border ${
                showOnlyFiles 
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-bold' 
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              }`}
              title={language === 'en' ? 'Show Shared Files Only' : 'ସେୟାର୍ ହୋଇଥିବା ଫାଇଲ୍'}
            >
              <Lucide.FolderDown size={18} />
            </button>
          </div>
        </div>

        {/* Animated Search Input Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-3 pt-1 border-t border-white/5 bg-slate-950/20"
            >
              <div className="relative max-w-3xl mx-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search by message, filename, or sender...' : 'ମେସେଜ୍, ଫାଇଲ୍ ନାମ କିମ୍ବା ପ୍ରେରକଙ୍କ ନାମ ଖୋଜନ୍ତୁ...'}
                  className="w-full h-10 pl-10 pr-10 rounded-xl bg-slate-950/80 border border-white/10 text-white font-medium text-xs outline-none focus:border-indigo-500 transition-all shadow-inner"
                  autoFocus
                />
                <Lucide.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <Lucide.X size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Recently Active Bar */}
        <AnimatePresence>
          {activeStudents.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2.5 bg-black/20 border-t border-white/5 flex items-center gap-4 overflow-x-auto custom-scrollbar"
            >
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] shrink-0">
                {language === 'en' ? 'Active Now' : 'ସମ୍ପ୍ରତି ସକ୍ରିୟ'}
              </span>
              <div className="flex gap-3">
                {activeStudents.map(s => {
                  const hasCleanAvatar = isCleanAvatar(s.avatar);
                  const initialsColor = getAvatarBgColor(s.name);
                  return (
                    <div key={s.id} className="relative group shrink-0">
                      <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md group-hover:bg-emerald-500/40 transition-all"></div>
                      {hasCleanAvatar ? (
                        <img src={s.avatar} alt={s.name} className="relative w-8 h-8 rounded-full border-2 border-emerald-500/50 object-cover shadow-lg" />
                      ) : (
                        <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${initialsColor} border-2 flex items-center justify-center shadow-lg font-black text-xs`}>
                          {getInitials(s.name)}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                      
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-white font-bold text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                        {s.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 z-10 scroll-smooth custom-scrollbar pb-6`}>
        {/* Active Filter Indicators */}
        {(showOnlyFiles || searchQuery) && (
          <div className="max-w-3xl mx-auto mb-2 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                {showOnlyFiles ? <Lucide.FolderDown size={16} /> : <Lucide.Search size={16} />}
              </div>
              <span className="text-xs font-bold text-slate-200 text-left">
                {showOnlyFiles && searchQuery ? (
                  language === 'en' 
                    ? `Showing shared files matching "${searchQuery}"` 
                    : `"${searchQuery}" ସହ ମେଳ ହେଉଥିବା ଫାଇଲ୍ ଗୁଡ଼ିକ ଦେଖାଉଛି`
                ) : showOnlyFiles ? (
                  language === 'en' ? 'Showing Shared Files Only' : 'କେବଳ ସେୟାର୍ ହୋଇଥିବା ଫାଇଲ୍ ଗୁଡ଼ିକ ଦେଖାଉଛି'
                ) : (
                  language === 'en' 
                    ? `Search results for "${searchQuery}"` 
                    : `"${searchQuery}" ପାଇଁ ଫଳାଫଳ`
                )}
              </span>
            </div>
            <button
              onClick={() => {
                playClickSound();
                setShowOnlyFiles(false);
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 shrink-0"
            >
              {language === 'en' ? 'Clear Filter' : 'ଫିଲ୍ଟର୍ ହଟାନ୍ତୁ'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <Lucide.Loader2 className="w-10 h-10 text-emerald-500 animate-spin relative z-10" />
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
              <Lucide.MessagesSquare size={40} className="text-indigo-400 relative z-10" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
              {showOnlyFiles || searchQuery ? (language === 'en' ? 'No Results Found' : 'କୌଣସି ଫଳาଫଳ ମିଳିଲା ନାହିଁ') : 'Start the Conversation'}
            </h2>
            <p className="text-slate-400 max-w-xs">
              {showOnlyFiles || searchQuery ? (
                language === 'en' 
                  ? 'Try clearing the active filters or search queries to view all messages.' 
                  : 'ସମସ୍ତ ମେସେଜ୍ ଦେଖିବା ପାଇଁ ସର୍ଚ୍ଚ କିମ୍ବା ଫିଲ୍ଟର୍ ହଟାଇ ଦିଅନ୍ତୁ।'
              ) : (
                language === 'en' ? 'Be the first to say hello and kick off the discussion!' : 'ପ୍ରଥମେ ନମସ୍କାର କୁହନ୍ତୁ ଏବଂ ଆଲୋଚନା ଆରମ୍ଭ କରନ୍ତୁ!'
              )}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.userId === student.id;
            const isAdmin = msg.role === 'admin' || msg.role === 'teacher';
            const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

            const msgReactions = msg.reactions || {};
            const availableEmojis = ['👍', '❤️', '😮', '🙋‍♂️'];
            
            const handleToggleReaction = async (emoji: string) => {
              try {
                const messageRef = doc(db, 'community', msg.id);
                const currentUsers = msgReactions[emoji] || [];
                let updatedUsers: string[];
                if (currentUsers.includes(student.id)) {
                  updatedUsers = currentUsers.filter((id: string) => id !== student.id);
                } else {
                  updatedUsers = [...currentUsers, student.id];
                }
                
                await updateDoc(messageRef, {
                  [`reactions.${emoji}`]: updatedUsers
                });
              } catch (err) {
                console.error("Error toggling reaction:", err);
              }
            };

            const activeReactions = Object.entries(msgReactions).filter(([_, users]) => users && users.length > 0);

            return (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
              >
                {showHeader && !isMe && (
                  <div className="flex items-center gap-2 mb-1.5 ml-1">
                    <span className={`text-[11px] font-black tracking-wide ${isAdmin ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]' : 'text-slate-300'}`}>
                      {msg.userName}
                    </span>
                    {isAdmin && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                        Admin
                      </span>
                    )}
                  </div>
                )}
                <div className={`relative max-w-[85%] sm:max-w-[70%] px-5 py-3 shadow-xl backdrop-blur-md ${
                  isMe 
                    ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-sm border border-emerald-400/20' 
                    : isAdmin
                      ? 'bg-slate-800 border border-amber-500/40 text-amber-50 rounded-2xl rounded-tl-sm shadow-[0_5px_15px_rgba(251,191,36,0.05)]'
                      : 'bg-white/10 border border-white/5 text-slate-100 rounded-2xl rounded-tl-sm shadow-[0_5px_15px_rgba(0,0,0,0.2)]'
                }`}>
                  {isAdmin && <div className="absolute inset-0 bg-amber-500/5 rounded-2xl rounded-tl-sm pointer-events-none"></div>}
                  <p className="text-[15px] leading-relaxed break-words relative z-10 font-medium">{msg.text}</p>
                  
                  {msg.fileUrl && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-950/40 border border-white/10 flex items-center justify-between gap-4 backdrop-blur-sm relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                          {msg.fileType === 'image' ? (
                            <Lucide.Image size={18} className="text-emerald-400" />
                          ) : (
                            <Lucide.FileText size={18} className="text-emerald-400" />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white max-w-[150px] truncate">{msg.fileName || 'document.pdf'}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">{msg.fileType === 'image' ? 'Image File' : 'PDF Document'}</span>
                        </div>
                      </div>
                      <a 
                        href={msg.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-all active:scale-95 flex items-center justify-center shadow-md shadow-emerald-950/50"
                      >
                        <Lucide.Download size={14} />
                      </a>
                    </div>
                  )}
                </div>

                {/* Reactions list & quick picker */}
                <div className="flex items-center gap-1.5 mt-1 ml-1 flex-wrap">
                  {activeReactions.map(([emoji, users]) => {
                    const hasReacted = users.includes(student.id);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all active:scale-90 border ${
                          hasReacted 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold' 
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px]">{users.length}</span>
                      </button>
                    );
                  })}
                  
                  {/* Plus button to show quick emojis tray */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setActiveReactionMenuId(prev => prev === msg.id ? null : msg.id);
                      }}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
                        activeReactionMenuId === msg.id
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-bold scale-110'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Lucide.Plus size={10} />
                    </button>
                    {activeReactionMenuId === msg.id && (
                      <>
                        {/* Transparent overlay to dismiss on tapping outside */}
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMenuId(null);
                          }}
                        />
                        <div className="absolute left-0 bottom-full mb-1 bg-slate-900 border border-white/10 rounded-full px-2 py-1 shadow-2xl flex items-center gap-2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                          {availableEmojis.map(emoji => {
                            const users = msgReactions[emoji] || [];
                            const hasReacted = users.includes(student.id);
                            return (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleReaction(emoji);
                                  setActiveReactionMenuId(null);
                                }}
                                className={`hover:scale-125 active:scale-90 transition-transform text-sm p-1 rounded-full ${hasReacted ? 'bg-emerald-500/20' : ''}`}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Area */}
      <div className={`relative shrink-0 p-4 sm:p-6 bg-slate-950 border-t border-white/5 z-20 pb-[calc(1.2rem+env(safe-area-inset-bottom))]`}>
        {/* Hidden File Input */}
        {canUpload && (
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".pdf,image/*" 
            className="hidden" 
          />
        )}

        {/* Uploading progress bar */}
        {isUploading && (
          <div className="max-w-3xl mx-auto mb-3 px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Lucide.Loader2 size={16} className="text-emerald-400 animate-spin" />
              <span className="text-xs font-bold text-slate-300">
                {language === 'en' ? `Uploading material (${uploadProgress}%)...` : `ଅପଲୋଡ୍ ହେଉଛି (${uploadProgress}%)...`}
              </span>
            </div>
            <div className="flex-grow bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        {/* Quick Emoji Bar */}
        <AnimatePresence>
          {showQuickEmojiBar && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 14 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-center gap-4 px-4 py-2 bg-slate-900/70 rounded-2xl border border-white/5 backdrop-blur-md max-w-3xl mx-auto shadow-2xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none shrink-0 mr-1.5">
                  {language === 'en' ? 'Quick Send:' : 'ତୁରନ୍ତ ପଠାନ୍ତୁ:'}
                </span>
                <div className="flex items-center gap-3">
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={emojiCooldown}
                      onClick={() => handleQuickEmojiSend(emoji)}
                      className={`text-2xl hover:scale-125 active:scale-95 transition-all p-1.5 rounded-full select-none ${
                        emojiCooldown ? 'opacity-40 cursor-not-allowed scale-90' : 'cursor-pointer hover:bg-white/5'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {emojiCooldown && (
                  <span className="text-[9px] text-amber-500 font-medium animate-pulse ml-1.5 select-none shrink-0">
                    {language === 'en' ? 'wait...' : 'ଅପେକ୍ଷା କରନ୍ତୁ...'}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom Voice Alert Toast */}
        <AnimatePresence>
          {voiceAlert && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-full text-xs font-black tracking-wide shadow-[0_10px_30px_rgba(16,185,129,0.2)] z-[110] flex items-center gap-2 backdrop-blur-md whitespace-nowrap"
            >
              <Lucide.Mic size={16} className="animate-pulse" />
              <span>
                {language === 'en' ? 'Voice messaging is coming soon!' : 'ଭଏସ୍ ମେସେଜିଂ ସୁବିଧା ଶୀଘ୍ର ଆସୁଛି!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-end gap-2.5 max-w-3xl mx-auto w-full px-1">
          {/* Pill Container (Input + Emojis + Attachment) */}
          <div className="flex-1 flex items-end bg-slate-900/90 backdrop-blur-2xl rounded-[1.75rem] border border-white/10 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all shadow-2xl relative px-1 py-1 min-h-[50px] group">
            {/* Background gradient on focus */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity rounded-[1.75rem] pointer-events-none"></div>

            {/* Left Button inside Pill: Emoji Toggle */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                vibrate(10);
                setShowQuickEmojiBar(prev => !prev);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 relative z-10 mb-0.5 ${
                showQuickEmojiBar ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={language === 'en' ? 'Quick Emojis' : 'ତୁରନ୍ତ ଇମୋଜି'}
            >
              {showQuickEmojiBar ? <Lucide.Keyboard size={20} /> : <Lucide.Smile size={20} />}
            </button>

            {/* Middle: Textarea input */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={language === 'en' ? 'Message' : 'ଏଠାରେ ମେସେଜ୍ ଲେଖନ୍ତୁ...'}
              className="flex-1 bg-transparent text-white px-2 py-2 outline-none resize-none max-h-32 text-[15px] font-medium placeholder:text-slate-500 relative z-10 self-center"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              style={{
                height: inputText ? 'auto' : '36px',
                minHeight: '36px'
              }}
            />

            {/* Right Button inside Pill: Attachment (only if canUpload) */}
            {canUpload && (
              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  playClickSound();
                  vibrate(10);
                  fileInputRef.current?.click();
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all active:scale-90 shrink-0 disabled:opacity-50 relative z-10 mb-0.5"
                title={language === 'en' ? 'Upload Worksheet/Image' : 'ୱର୍କସିଟ୍/ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ'}
              >
                {isUploading ? <Lucide.Loader2 size={18} className="animate-spin text-emerald-400" /> : <Lucide.Paperclip size={18} />}
              </button>
            )}
          </div>

          {/* Right Button outside Pill: Dynamic Action (Send / Mic) */}
          <button
            type={inputText.trim() ? "submit" : "button"}
            onClick={inputText.trim() ? undefined : handleVoiceClick}
            disabled={isLoading}
            className={`w-[50px] h-[50px] rounded-full text-white flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-lg relative ${
              inputText.trim() 
                ? 'bg-emerald-500 hover:bg-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.3)]' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_15px_rgba(5,150,105,0.2)]'
            }`}
            title={inputText.trim() ? (language === 'en' ? 'Send Message' : 'ମେସେଜ୍ ପଠାନ୍ତୁ') : (language === 'en' ? 'Voice Message' : 'ଭଏସ୍ ମେସେଜ୍')}
          >
            {inputText.trim() ? (
              <Lucide.Send size={20} className="ml-0.5" />
            ) : (
              <Lucide.Mic size={20} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
