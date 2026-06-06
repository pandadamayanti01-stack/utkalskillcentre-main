import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Lucide from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { MathBlackboard } from './MathBlackboard';

interface SishuVatikaDashboardProps {
  user: any;
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade: () => void;
  onOpenTutor: () => void;
  onOpenLibrary: () => void;
}

interface Sticker {
  id: string;
  emoji: string;
  nameEn: string;
  nameOr: string;
  premiumOnly: boolean;
}

const STICKERS_DATA: Sticker[] = [
  { id: 'elephant', emoji: '🐘', nameEn: 'Elephant', nameOr: 'ହାତୀ', premiumOnly: false },
  { id: 'mango', emoji: '🥭', nameEn: 'Mango', nameOr: 'ଆମ୍ବ', premiumOnly: false },
  { id: 'star', emoji: '⭐', nameEn: 'Star', nameOr: 'ତାରା', premiumOnly: false },
  { id: 'butterfly', emoji: '🦋', nameEn: 'Butterfly', nameOr: 'ପ୍ରଜାପତି', premiumOnly: false },
  { id: 'cat', emoji: '🐱', nameEn: 'Cat', nameOr: 'ବିଲେଇ', premiumOnly: false },
  { id: 'apple', emoji: '🍎', nameEn: 'Apple', nameOr: 'ସେଓ', premiumOnly: false },
  { id: 'parrot', emoji: '🦜', nameEn: 'Parrot', nameOr: 'ଶୁଆ', premiumOnly: true },
  { id: 'balloon', emoji: '🎈', nameEn: 'Balloon', nameOr: 'ବେଲୁନ୍', premiumOnly: true },
];

export function SishuVatikaDashboard({
  user,
  language,
  isPremium,
  onUpgrade,
  onOpenTutor,
  onOpenLibrary,
}: SishuVatikaDashboardProps) {
  const [textbookUrl, setTextbookUrl] = useState<string>('https://storage.googleapis.com/utkalskillcentre-admin/Shishu%20Vatika/Shishu%20Vatika.pdf');
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [showStickerLockModal, setShowStickerLockModal] = useState<Sticker | null>(null);
  const [bubbles, setBubbles] = useState<{ id: number; left: number; size: number; delay: number; duration: number }[]>([]);
  const [isMascotTalking, setIsMascotTalking] = useState(false);
  const [showBlackboard, setShowBlackboard] = useState(false);

  // Play a dynamic synthesised bubble pop sound using Web Audio API
  const playPopSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('AudioContext pop sound failed', e);
    }
  };

  // Play a dynamic synth success chime for unlocking / opening stickers
  const playChimeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Make a beautiful major chord chime
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((f, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.value = f;
        
        const startTime = now + idx * 0.06;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('AudioContext chime sound failed', e);
    }
  };

  // Google Font and Firestore query on mount
  useEffect(() => {
    // 1. Inject Quicksand Kid Font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // 2. Fetch textbook URL dynamically
    const fetchBook = async () => {
      try {
        const q = query(
          collection(db, 'textbooks'),
          where('class', '==', 'sishuvatika(Anganwadi)')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          if (docData.download_url) {
            setTextbookUrl(docData.download_url);
          }
        }
      } catch (err) {
        console.error('Error fetching Shishu Vatika textbook:', err);
      }
    };
    fetchBook();

    // 3. Populate background bubbles
    const bubbleList = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 40 + 20, // 20px - 60px
      delay: Math.random() * 10,
      duration: Math.random() * 8 + 8, // 8s - 16s
    }));
    setBubbles(bubbleList);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Use SpeechSynthesis to speak Gundulu greetings
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select appropriate voice if available
      const voices = window.speechSynthesis.getVoices();
      if (language === 'or') {
        const orVoice = voices.find(v => v.lang.includes('or-IN') || v.lang.includes('hi-IN'));
        if (orVoice) utterance.voice = orVoice;
      } else {
        const enVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB') || v.lang.includes('en-IN'));
        if (enVoice) utterance.voice = enVoice;
      }

      utterance.rate = 0.85; // friendly, slightly slow speed for children
      
      utterance.onstart = () => setIsMascotTalking(true);
      utterance.onend = () => setIsMascotTalking(false);
      utterance.onerror = () => setIsMascotTalking(false);

      window.speechSynthesis.speak(utterance);
    } else {
      // Toggle animation temporary to simulate speech
      setIsMascotTalking(true);
      setTimeout(() => setIsMascotTalking(false), 2000);
    }
  };

  const handleMascotClick = () => {
    playPopSound();
    const text = language === 'or'
      ? 'ନମସ୍କାର! ମୁଁ ଗୁନ୍ଦୁଲୁ | ଚାଲ ମିଶି ପାଠ ପଢିବା ଏବଂ ଗୁନ୍ଦୁଲୁ ସହ ଗପିବା!'
      : 'Hello! I am Gundulu. Let us read and talk together!';
    speakText(text);
  };

  const handleReadBook = () => {
    playPopSound();
    window.open(textbookUrl, '_blank');
  };

  const handleStickerClick = (sticker: Sticker) => {
    const isUnlocked = isPremium || !sticker.premiumOnly;
    if (isUnlocked) {
      playChimeSound();
      setSelectedSticker(sticker);
      // Automatically read out the name
      const text = language === 'or' 
        ? `${sticker.nameEn} ମାନେ ${sticker.nameOr}` 
        : `${sticker.nameEn}!`;
      setTimeout(() => speakText(text), 200);
    } else {
      playPopSound();
      setShowStickerLockModal(sticker);
    }
  };

  const handleOpenTutorTab = () => {
    playPopSound();
    onOpenTutor();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F5] via-[#FFFDF5] to-[#F5FCFF] font-['Quicksand',sans-serif] relative overflow-hidden pb-20 select-none">
      {/* Dynamic styles injection for bubble floating & kids bounces */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(105vh) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-10vh) scale(1.3);
            opacity: 0;
          }
        }
        .floating-bubble {
          position: absolute;
          bottom: -80px;
          border-radius: 50%;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(200,240,255,0.4) 100%);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
          animation: floatUp 15s infinite linear;
        }
        @keyframes waveGrow {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        .wave-bar {
          animation: waveGrow 1.2s ease-in-out infinite;
          transform-origin: bottom;
        }
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .soft-bounce {
          animation: subtleBounce 3s ease-in-out infinite;
        }
      `}</style>

      {/* Floating Bubbles Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {bubbles.map((b) => (
          <div
            key={b.id}
            className="floating-bubble"
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 relative z-10">
        {/* Top Header Card */}
        <div className="bg-white/80 backdrop-blur-md border-4 border-yellow-200 rounded-[2.5rem] p-5 flex flex-col md:flex-row items-center justify-between shadow-xl shadow-red-200/10 mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-pink-400 to-yellow-300 flex items-center justify-center text-4xl shadow-md border-2 border-white soft-bounce">
              🐣
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                {language === 'or' ? `କୁନି ଶିକ୍ଷାର୍ଥୀ, ${user?.name || 'ବନ୍ଧୁ'}!` : `Little Learner, ${user?.name || 'Friend'}!`}
              </h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {language === 'or' ? 'ଶିଶୁ ବାଟିକା (ଅଙ୍ଗନୱାଡ଼ି) ଡ୍ୟାସବୋର୍ଡ' : 'Shishu Vatika (Anganwadi) Dashboard'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isPremium && (
              <button 
                onClick={() => { playPopSound(); onUpgrade(); }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-white font-black text-sm uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer border-b-4 border-red-600 active:border-b-0 active:translate-y-1"
              >
                {language === 'or' ? '🌟 ପ୍ରିମିୟମ୍ ନିଅନ୍ତୁ' : '🌟 Get Premium'}
              </button>
            )}
            {isPremium && (
              <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 border-2 border-white">
                <Lucide.Sparkles size={16} />
                <span>Premium Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Mascot Talking & Welcome Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-10">
          {/* Animated Gundulu Mascot Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div 
              onClick={handleMascotClick}
              className="relative w-56 h-56 rounded-full bg-gradient-to-tr from-pink-300 via-yellow-200 to-cyan-200 p-2 shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-8 border-white soft-bounce"
            >
              {/* Pulsing light rings around talking mascot */}
              {isMascotTalking && (
                <>
                  <div className="absolute -inset-4 rounded-full border-4 border-pink-400/30 animate-ping pointer-events-none" />
                  <div className="absolute -inset-8 rounded-full border-4 border-cyan-400/20 animate-pulse pointer-events-none" />
                </>
              )}

              <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center relative">
                <img 
                  src="/gundu2.0.png" 
                  alt="Gundulu" 
                  className="w-11/12 h-11/12 object-contain"
                  onError={(e) => {
                    // Fallback if image path is not available
                    (e.target as HTMLImageElement).src = '/gundulu-v3.png';
                  }}
                />
              </div>
            </div>
            
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">
              {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ କୁ ଛୁଇଁ ଶୁଣନ୍ତୁ' : 'Tap Gundulu to hear speak!'}
            </p>
          </div>

          {/* Speech Bubble Card */}
          <div className="lg:col-span-7 relative">
            <div className="bg-white border-4 border-cyan-200 rounded-[2.5rem] p-7 shadow-xl shadow-cyan-200/5 flex flex-col justify-between min-h-[160px] relative">
              {/* Speech bubble pointer indicator */}
              <div className="absolute left-1/2 -top-4 -translate-x-1/2 lg:left-0 lg:top-1/2 lg:-left-4 lg:-translate-y-1/2 w-8 h-8 bg-white border-l-4 border-t-4 border-cyan-200 rotate-45 lg:-rotate-45" />

              <div className="relative z-10 flex items-start gap-4">
                <button 
                  onClick={handleMascotClick}
                  className="w-12 h-12 rounded-2xl bg-cyan-100 hover:bg-cyan-200 text-cyan-600 flex items-center justify-center shrink-0 transition-colors shadow-sm"
                >
                  <Lucide.Volume2 size={24} className={isMascotTalking ? 'animate-bounce' : ''} />
                </button>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-800 mb-2 leading-snug">
                    {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କୁ ସ୍ୱାଗତ କରୁଛି!' : 'Gundulu Welcomes You!'}
                  </h3>
                  <p className="text-xl font-bold text-slate-600 leading-relaxed">
                    {language === 'or' 
                      ? 'ନମସ୍କାର! ମୁଁ ଗୁନ୍ଦୁଲୁ, ଚାଲ ମିଶି ବହି ପଢିବା ଏବଂ କଥା ହେବା!' 
                      : 'Hello! I am Gundulu, let us read our textbook and talk together!'}
                  </p>
                </div>
              </div>

              {/* Quick Actions inside Speech Bubble */}
              <div className="flex gap-3 mt-6 relative z-10">
                <button
                  onClick={handleReadBook}
                  className="flex-1 bg-yellow-400 border-b-4 border-yellow-600 hover:bg-yellow-300 text-slate-800 font-extrabold py-3.5 px-4 rounded-2xl text-center shadow-md active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2"
                >
                  <Lucide.BookOpen size={20} />
                  <span>{language === 'or' ? 'ଓଡ଼ିଆ ବହି ପଢ଼ନ୍ତୁ' : 'Read Odia Book'}</span>
                </button>
                <button
                  onClick={handleOpenTutorTab}
                  className="flex-1 bg-cyan-500 border-b-4 border-cyan-700 hover:bg-cyan-400 text-white font-extrabold py-3.5 px-4 rounded-2xl text-center shadow-md active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2"
                >
                  <Lucide.Mic size={20} />
                  <span>{language === 'or' ? 'ଗୁନ୍ଦୁଲୁ ସହ କଥା' : 'Talk with Gundulu'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Large Visual Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Card 1: Read Storybook / Book Viewer */}
          <div 
            onClick={handleReadBook}
            className="group cursor-pointer bg-gradient-to-br from-amber-100 to-orange-100/60 border-4 border-amber-200 rounded-[3rem] p-8 flex flex-col justify-between shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-amber-400 border-4 border-white flex items-center justify-center text-3xl shadow-md">
                📖
              </div>
              <span className="bg-amber-200/60 text-amber-800 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full">
                {language === 'or' ? 'ପୁସ୍ତକ' : 'Storybook'}
              </span>
            </div>

            <div>
              <h3 className="text-3xl font-black text-amber-900 leading-tight mb-2 group-hover:text-amber-950 transition-colors">
                {language === 'or' ? 'ଶିଶୁ ବାଟିକା ପାଠ୍ୟପୁସ୍ତକ' : 'Shishu Vatika Textbook'}
              </h3>
              <p className="text-amber-700 font-bold text-lg mb-6">
                {language === 'or' ? 'ଆସ ଓଡ଼ିଆ କାହାଣୀ ଓ ଗୀତ ବହି ପଢିବା!' : 'Let us read stories, rhymes, and letters together!'}
              </p>
              <div className="inline-flex items-center gap-2 text-amber-800 font-black text-sm uppercase tracking-wider bg-white py-3 px-6 rounded-2xl shadow-sm border border-amber-200">
                <span>{language === 'or' ? 'ପଢିବା ଆରମ୍ଭ କରନ୍ତୁ' : 'Start Reading'}</span>
                <Lucide.ArrowRight size={16} />
              </div>
            </div>
          </div>

          {/* Card 2: Voice Chat / Gundulu Mic Interface */}
          <div 
            onClick={handleOpenTutorTab}
            className="group cursor-pointer bg-gradient-to-br from-pink-100 to-purple-100/60 border-4 border-pink-200 rounded-[3rem] p-8 flex flex-col justify-between shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-pink-400 border-4 border-white flex items-center justify-center text-3xl shadow-md relative">
                <div className="absolute -inset-1 rounded-[1.5rem] bg-pink-400 animate-ping opacity-25" />
                🎙️
              </div>
              <span className="bg-pink-200/60 text-pink-800 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full">
                {language === 'or' ? 'ମାଇକ୍ରୋଫୋନ୍' : 'Speech Chat'}
              </span>
            </div>

            <div>
              <h3 className="text-3xl font-black text-pink-900 leading-tight mb-2 group-hover:text-pink-950 transition-colors">
                {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ ସହ କଥାବାର୍ତ୍ତା' : 'Speak with Gundulu'}
              </h3>
              <p className="text-pink-700 font-bold text-lg mb-4">
                {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ କୁ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ ଓ କାହାଣୀ ଶୁଣନ୍ତୁ!' : 'Ask Gundulu questions and listen to stories!'}
              </p>

              {/* Premium fluid jumping soundwave visualizer */}
              <div className="flex items-end gap-1.5 h-8 mb-6 justify-start pl-1">
                <span className="w-1.5 bg-pink-400 rounded-full wave-bar" style={{ animationDelay: '0.1s', height: '60%' }}></span>
                <span className="w-1.5 bg-pink-500 rounded-full wave-bar" style={{ animationDelay: '0.3s', height: '100%' }}></span>
                <span className="w-1.5 bg-purple-500 rounded-full wave-bar" style={{ animationDelay: '0.2s', height: '80%' }}></span>
                <span className="w-1.5 bg-indigo-500 rounded-full wave-bar" style={{ animationDelay: '0.4s', height: '50%' }}></span>
                <span className="w-1.5 bg-pink-500 rounded-full wave-bar" style={{ animationDelay: '0.5s', height: '90%' }}></span>
                <span className="w-1.5 bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.25s', height: '70%' }}></span>
              </div>

              <div className="inline-flex items-center gap-2 text-pink-800 font-black text-sm uppercase tracking-wider bg-white py-3 px-6 rounded-2xl shadow-sm border border-pink-200">
                <span>{language === 'or' ? 'କଥାବାର୍ତ୍ତା ଆରମ୍ଭ କରନ୍ତୁ' : 'Start Talking'}</span>
                <Lucide.ArrowRight size={16} />
              </div>
            </div>
          </div>

          {/* Card 3: Slate Blackboard / Drawing slate */}
          <div 
            onClick={() => { playPopSound(); setShowBlackboard(true); }}
            className="group cursor-pointer bg-gradient-to-br from-emerald-100 to-teal-100/60 border-4 border-emerald-200 rounded-[3rem] p-8 flex flex-col justify-between shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-400 border-4 border-white flex items-center justify-center text-3xl shadow-md">
                🖍️
              </div>
              <span className="bg-emerald-200/60 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full">
                {language === 'or' ? 'କଳାପଟା' : 'Slate Board'}
              </span>
            </div>

            <div>
              <h3 className="text-3xl font-black text-emerald-900 leading-tight mb-2 group-hover:text-emerald-950 transition-colors">
                {language === 'or' ? 'ଗୁନ୍ଦୁଲୁ କଳାପଟା' : "Gundulu Slate Board"}
              </h3>
              <p className="text-emerald-700 font-bold text-lg mb-6">
                {language === 'or' ? 'ଚାଲ ଚିତ୍ର ଆଙ୍କିବା, ଅକ୍ଷର ଲେଖିବା ଓ ଖେଳିବା!' : 'Let us draw pictures, write letters and numbers!'}
              </p>
              <div className="inline-flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-wider bg-white py-3 px-6 rounded-2xl shadow-sm border border-emerald-200">
                <span>{language === 'or' ? 'ଲେଖିବା ଆରମ୍ଭ କରନ୍ତୁ' : 'Start Drawing'}</span>
                <Lucide.ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Sticker Book Section */}
        <div className="bg-white/80 backdrop-blur-md border-4 border-teal-200 rounded-[3rem] p-8 shadow-xl shadow-teal-200/5 mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 border-b-2 border-teal-100/50 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center text-2xl shadow-sm border border-teal-200">
                🎨
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800">
                  {language === 'or' ? 'ମୋର ସୁନ୍ଦର ଷ୍ଟିକର ସଂଗ୍ରହ' : 'My Sticker Collection'}
                </h3>
                <p className="text-sm font-bold text-teal-600">
                  {language === 'or' ? 'ପଢ଼ିବା ସହ ନୂଆ ଷ୍ଟିକର ମୁକ୍ତ କରନ୍ତୁ!' : 'Earn cute stickers as you learn and talk!'}
                </p>
              </div>
            </div>
            
            <div className="bg-teal-50 border border-teal-200/50 px-4 py-2 rounded-2xl text-xs font-bold text-teal-700">
              {language === 'or' ? `ମୋଟ୍ ସଂଗ୍ରହ: ${STICKERS_DATA.filter(s => isPremium || !s.premiumOnly).length} / ${STICKERS_DATA.length}` : `Collected: ${STICKERS_DATA.filter(s => isPremium || !s.premiumOnly).length} / ${STICKERS_DATA.length}`}
            </div>
          </div>

          {/* Stickers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-5">
            {STICKERS_DATA.map((sticker) => {
              const isUnlocked = isPremium || !sticker.premiumOnly;
              return (
                <div
                  key={sticker.id}
                  onClick={() => handleStickerClick(sticker)}
                  className={`aspect-square rounded-[2rem] border-4 p-3 flex flex-col items-center justify-center relative cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400 hover:shadow-md'
                      : 'bg-slate-100/60 border-slate-200 filter grayscale opacity-75'
                  }`}
                >
                  <div className="text-4xl sm:text-5xl mb-2 filter drop-shadow-md transition-transform duration-300 group-hover:scale-110">
                    {sticker.emoji}
                  </div>
                  
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center max-w-full truncate leading-tight">
                    {language === 'or' ? sticker.nameOr : sticker.nameEn}
                  </span>

                  {/* Lock Indicator */}
                  {!isUnlocked && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-white text-[10px] shadow-sm">
                      <Lucide.Lock size={10} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL 1: Large Unlocked Sticker Preview Dialog */}
      <AnimatePresence>
        {selectedSticker && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white border-8 border-yellow-300 rounded-[3rem] p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl"
            >
              {/* Colorful background confetti sparkles representation */}
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-100/20 via-transparent to-transparent pointer-events-none" />

              <button
                onClick={() => { playPopSound(); setSelectedSticker(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2.5 transition-colors cursor-pointer"
              >
                <Lucide.X size={20} />
              </button>

              <h4 className="text-sm font-extrabold text-teal-600 uppercase tracking-widest mb-4">
                🎉 {language === 'or' ? 'ଷ୍ଟିକର ମିଳିଗଲା!' : 'Sticker Collected!'} 🎉
              </h4>

              <div className="w-48 h-48 rounded-full bg-yellow-50 border-4 border-yellow-200 flex items-center justify-center text-8xl mx-auto mb-6 shadow-inner animate-pulse">
                {selectedSticker.emoji}
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-4xl font-black text-slate-800">
                  {selectedSticker.nameEn}
                </h3>
                <p className="text-2xl font-extrabold text-amber-500">
                  {selectedSticker.nameOr}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    playPopSound();
                    const text = language === 'or' 
                      ? `${selectedSticker.nameEn} ମାନେ ${selectedSticker.nameOr}` 
                      : `${selectedSticker.nameEn}!`;
                    speakText(text);
                  }}
                  className="flex-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-b-4 border-cyan-300 font-extrabold py-3.5 px-4 rounded-2xl active:translate-y-0.5 active:border-b-0 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Lucide.Volume2 size={20} />
                  <span>{language === 'or' ? 'ଶବ୍ଦ ଶୁଣନ୍ତୁ' : 'Say Name'}</span>
                </button>
                
                <button
                  onClick={() => { playPopSound(); setSelectedSticker(null); }}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-slate-800 border-b-4 border-yellow-600 font-extrabold py-3.5 px-4 rounded-2xl active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer"
                >
                  {language === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Locked Premium Sticker Dialog */}
      <AnimatePresence>
        {showStickerLockModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-slate-900 border-4 border-slate-700/50 rounded-[3rem] p-8 max-w-sm w-full text-center relative overflow-hidden shadow-2xl"
            >
              <button
                onClick={() => { playPopSound(); setShowStickerLockModal(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 rounded-full p-2"
              >
                <Lucide.X size={20} />
              </button>

              <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-4xl mx-auto mb-6 text-slate-400 filter grayscale">
                {showStickerLockModal.emoji}
              </div>

              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Lucide.Lock size={20} />
              </div>

              <h3 className="text-2xl font-black text-white mb-2">
                {language === 'or' ? 'ଷ୍ଟିକରଟି ଲକ୍ ଅଛି!' : 'Sticker is Locked!'}
              </h3>
              
              <p className="text-sm font-bold text-slate-400 leading-relaxed mb-6">
                {language === 'or' 
                  ? `ଏହି ଷ୍ଟିକର ସଂଗ୍ରହ କରିବାକୁ ଏବଂ ଆମ ସମସ୍ତ ସୁବିଧା ପାଇବାକୁ ପ୍ରିମିୟମ୍ ପ୍ଲାନ୍ ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ!` 
                  : `Subscribe to the Premium Plan to unlock the ${showStickerLockModal.nameEn} sticker and collect all items!`}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    playPopSound();
                    setShowStickerLockModal(null);
                    onUpgrade();
                  }}
                  className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white border-b-4 border-orange-700 font-extrabold py-3.5 px-4 rounded-2xl active:translate-y-0.5 active:border-b-0 transition-all cursor-pointer"
                >
                  🚀 {language === 'or' ? 'ପ୍ଲାନ୍ ଦେଖନ୍ତୁ (₹୪୯ ରୁ ଆରମ୍ଭ)' : 'View Plans (Starts at ₹49)'}
                </button>
                
                <button
                  onClick={() => { playPopSound(); setShowStickerLockModal(null); }}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-extrabold py-3 px-4 rounded-2xl transition-all cursor-pointer"
                >
                  {language === 'or' ? 'ପରେ ଦେଖିବା' : 'Maybe Later'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Blackboard Modal */}
      <AnimatePresence>
        {showBlackboard && (
          <MathBlackboard
            language={language}
            onClose={() => setShowBlackboard(false)}
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
