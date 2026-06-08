import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Student, ChatMessage } from '../types';
import { translations } from '../translations';
import { playClickSound, vibrate } from '../pwa';

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
  
  const isStaff = student.role === 'teacher' || student.role === 'admin';
  const [activeClass, setActiveClass] = useState(isStaff ? 'teachers' : (student.class || 'class10'));

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');
    playClickSound();
    vibrate(10);

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
    } catch (error) {
      console.error("Error sending message:", error);
      // Could show a toast notification here
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
    <div className={isTab ? "relative flex-grow flex flex-col font-sans overflow-hidden bg-slate-950/90 w-full h-full min-h-0" : "fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-3xl flex flex-col font-sans overflow-hidden"}>
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
                        {language === 'en' ? 'Educator Staff Room 👥' : 'ଶିକ୍ଷକ ଷ୍ଟାଫ୍ ରୁମ୍ 👥'}
                      </option>
                      {/* Hide class 1 to 10 for teachers/staff for now; can be unhidden in the future
                      {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                        <option key={num} value={`class${num}`} className="bg-slate-900 text-white font-bold">
                          {language === 'en' ? `Class ${num}` : `ଶ୍ରେଣୀ ${num}`}
                        </option>
                      ))}
                      */}
                    </select>
                  </div>
                ) : (
                  language === 'en' ? `Class ${displayClass} Community` : `ଶ୍ରେଣୀ ${displayClass} କମ୍ୟୁନିଟି`
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
        </div>

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
                {activeStudents.map(s => (
                  <div key={s.id} className="relative group shrink-0">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md group-hover:bg-emerald-500/40 transition-all"></div>
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.name} className="relative w-8 h-8 rounded-full border-2 border-emerald-500/50 object-cover shadow-lg" />
                    ) : (
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/50 flex items-center justify-center shadow-lg">
                        <Lucide.User size={14} className="text-emerald-400" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                    
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-white font-bold text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                      {s.name}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 z-10 scroll-smooth custom-scrollbar ${isTab ? 'pb-44 lg:pb-32' : 'pb-32'}`}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <Lucide.Loader2 className="w-10 h-10 text-emerald-500 animate-spin relative z-10" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl relative">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
              <Lucide.MessagesSquare size={40} className="text-indigo-400 relative z-10" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-2">Start the Conversation</h2>
            <p className="text-slate-400 max-w-xs">{language === 'en' ? 'Be the first to say hello and kick off the discussion!' : 'ପ୍ରଥମେ ନମସ୍କାର କୁହନ୍ତୁ ଏବଂ ଆଲୋଚନା ଆରମ୍ଭ କରନ୍ତୁ!'}</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.userId === student.id;
            const isAdmin = msg.role === 'admin' || msg.role === 'teacher';
            const showHeader = index === 0 || messages[index - 1].userId !== msg.userId;

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
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Area */}
      <div className={`absolute bottom-0 left-0 w-full p-4 sm:p-6 bg-slate-950/95 border-t border-white/5 z-20 ${isTab ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'pb-[calc(1rem+env(safe-area-inset-bottom))]'}`}>
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 bg-slate-900/80 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 focus-within:border-emerald-500/50 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all flex items-end min-h-[52px] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={language === 'en' ? 'Type your message...' : 'ଏକ ମେସେଜ୍ ଲେଖନ୍ତୁ...'}
              className="w-full bg-transparent text-white px-5 py-3.5 outline-none resize-none max-h-32 text-[15px] font-medium placeholder:text-slate-500 relative z-10"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              style={{
                height: inputText ? 'auto' : '52px',
                minHeight: '52px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 disabled:grayscale transition-all active:scale-90 shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:shadow-none group relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-active:scale-100 transition-transform"></div>
            <Lucide.Send size={20} className="ml-1 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};
