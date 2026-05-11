import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Lucide from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { translations } from '../translations';
import { DailyChallenge } from './DailyChallenge';
import { LeaderboardView } from './LeaderboardView';
import { DistrictLeaderboardFilter } from './DistrictLeaderboardFilter';
import { TestSeriesRegistrationForm } from './TestSeriesRegistrationForm';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { GunduluTrailer } from './GunduluTrailer';
import NeuralBackground from './NeuralBackground';
import OdishaLiveMap from './OdishaLiveMap';

interface DashboardProps {
  user: any;
  leaderboard: any[];
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade: () => void;
  chapters: any[];
  dailyChallenge: any;
  hasDailyPractice?: boolean;
  todayDailySubject?: string;
  tomorrowDailySubject?: string;
  onChallengeComplete?: () => void;
  onOpenTutor?: () => void;
  onOpenDailyPractice?: () => void;
  onShareDailyPractice?: () => void;
  isRegistered?: boolean;
  onRegistrationComplete?: () => void;
}
function PerformanceChart({ submissions, tests, language }: any) {
  const chartData = React.useMemo(() => {
    // Combine test data with submissions to get scores
    // This is a simplified version, ideally we'd pass processed data
    const data = submissions
      .filter((s: any) => s.score !== undefined || s.finalScore !== undefined)
      .sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
      .map((s: any) => {
        const score = s.finalScore !== undefined ? s.finalScore : s.score;
        const total = s.totalMaxMarks || s.totalQuestions || 25; // Default 25 for our new pattern
        const percentage = Math.round((score / total) * 100);
        
        return {
          name: s.month ? `${s.month.slice(0, 3)}` : 'Test',
          score: percentage,
        };
      });
    return data;
  }, [submissions]);

  if (chartData.length === 0) {
    return (
      <div className="glass-card neon-border rounded-[2.5rem] p-8 text-center bg-slate-900/30">
        <Lucide.TrendingUp size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Progress Data Yet</p>
        <p className="text-slate-500 text-xs mt-2">Take monthly tests to see your growth chart!</p>
      </div>
    );
  }

  return (
    <div className="glass-card neon-border rounded-3xl p-5 md:p-6 lg:p-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Your Progress Graph</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Monthly Performance Analytics</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Lucide.TrendingUp size={12} />
          {chartData.length > 1 && chartData[chartData.length-1].score >= chartData[chartData.length-2].score ? 'Improving' : 'Consistency is Key'}
        </div>
      </div>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#10b981', fontWeight: 800, fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}
              formatter={(value) => [`${value}%`, 'SCORE']}
            />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorScore)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Dashboard({ user, leaderboard, language, isPremium, onUpgrade, chapters, dailyChallenge, hasDailyPractice, todayDailySubject, tomorrowDailySubject, onChallengeComplete, onOpenTutor, onOpenDailyPractice, onShareDailyPractice, isRegistered = false, onRegistrationComplete }: DashboardProps) {
    // Map class to YouTube video URL (embed links)
    const classVideoMap: Record<string, string> = {
      '1': 'https://www.youtube.com/embed/DxouHyB-IA8',
      '2': 'https://www.youtube.com/embed/Bg4niJioJDM',
      '3': 'https://www.youtube.com/embed/V0QFi18XJD4',
      '4': 'https://www.youtube.com/embed/d1VEPvR_nN8',
      '5': 'https://www.youtube.com/embed/vafpnkmiIvg',
      '6': 'https://www.youtube.com/embed/GZ1U75OV8DM',
      '7': 'https://www.youtube.com/embed/k_hco44HUxI',
      '8': 'https://www.youtube.com/embed/le5ItqGPKCU',
      '9': 'https://www.youtube.com/embed/0rfIj1MXzz4',
      '10': 'https://www.youtube.com/embed/OtTttUFqbPQ',
    };
    // Normalize user.class to string number (handles 'Class 1', 1, '1', etc.)
    let userClass = '10';
    if (user?.class) {
      if (typeof user.class === 'number') {
        userClass = String(user.class);
      } else if (typeof user.class === 'string') {
        const match = user.class.match(/(\d+)/);
        if (match) userClass = match[1];
      }
    }
    // Special Promotion Period: Till June 19th, 2026 (inclusive). No rotation.
    const isSpecialPromoPeriod = new Date() < new Date('2026-06-20T00:00:00');
    const promoVideoUrl = 'https://www.youtube.com/embed/RJv0UJDSWlk';
    const videoUrl = isSpecialPromoPeriod 
      ? promoVideoUrl 
      : (classVideoMap[userClass] || classVideoMap['10']);

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [dailyVideoId, setDailyVideoId] = useState<string | null>(isSpecialPromoPeriod ? 'RJv0UJDSWlk' : null);

  useEffect(() => {
    // If in the special promotional period, lock the video ID and skip rotation
    if (new Date() < new Date('2026-06-20T00:00:00')) {
      setDailyVideoId('RJv0UJDSWlk');
      return;
    }

    const fetchLatestVideos = async () => {
      try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?channel_id=UCVsuuu7DyRY4-qbn8PrVBhg`);
        const data = await response.json();
        if (data.status === 'ok' && data.items && data.items.length > 0) {
          // Filter videos by user class (e.g., "Class 10", "ଶ୍ରେଣୀ 10", or "ଦଶମ")
          const odiaClassNames: Record<string, string> = {
            '1': 'ପ୍ରଥମ', '2': 'ଦ୍ୱିତୀୟ', '3': 'ତୃତୀୟ', '4': 'ଚତୁର୍ଥ', '5': 'ପଞ୍ଚମ',
            '6': 'ଷଷ୍ଠ', '7': 'ସପ୍ତମ', '8': 'ଅଷ୍ଟମ', '9': 'ନବମ', '10': 'ଦଶମ'
          };
          
          const classSpecificVideos = data.items.filter((item: any) => {
            const title = item.title.toLowerCase();
            const odiaOrdinal = odiaClassNames[userClass];
            
            return title.includes(`class ${userClass}`) || 
                   title.includes(`ଶ୍ରେଣୀ ${userClass}`) ||
                   (odiaOrdinal && title.includes(odiaOrdinal));
          });

          if (classSpecificVideos.length > 0) {
            // Rotate based on day, looping back if list is small
            const dayIndex = new Date().getDate() % classSpecificVideos.length;
            const videoUrl = classSpecificVideos[dayIndex].link;
            const videoId = videoUrl.split('v=')[1]?.split('&')[0];
            
            if (videoId) {
              setDailyVideoId(videoId);
            }
          } else {
            setDailyVideoId(null); // Fallback to hardcoded classVideoMap
          }
        }
      } catch (error) {
        console.error('Error fetching YouTube videos:', error);
      }
    };
    fetchLatestVideos();
  }, [userClass]); // Re-fetch/re-filter if class changes

  const filteredLeaderboard = selectedDistrict
    ? leaderboard.filter(u => u.district === selectedDistrict)
    : leaderboard;
  const t = translations[language];
  const userRank = leaderboard.findIndex((s: any) => s.id === user.id) + 1;
  const rankDisplay = userRank > 0 ? userRank : '-';
  
  const dailyGoal = 500;
  const dailyProgress = Math.min(((user?.points_today || 0) / dailyGoal) * 100, 100);

  const stats = [
    { label: t.pointsToday, value: user?.points_today || 0, icon: <Lucide.Zap size={20} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t.rank, value: rankDisplay, icon: <Lucide.Trophy size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t.currentStreak, value: `${user?.streak || 0} ${t.activeStreak}`, icon: <Lucide.Flame size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t.nextLeague, value: user?.league || 'Bronze', icon: <Lucide.Award size={20} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];


  // Daily motivational quotes in English and Odia
  const dailyQuotes = [
    {
      en: "Success is the sum of small efforts, repeated day in and day out.",
      or: "ସଫଳତା ହେଉଛି ଛୋଟ ଛୋଟ ପ୍ରୟାସର ଯୋଗଫଳ, ଦିନକୁ ଦିନ ପୁନରାବୃତ୍ତି କର।"
    },
    {
      en: "Believe in yourself and all that you are.",
      or: "ନିଜ ଉପରେ ବିଶ୍ୱାସ ରଖନ୍ତୁ ଏବଂ ନିଜର ସାମର୍ଥ୍ୟ ଉପରେ ଆସ୍ଥା ରଖନ୍ତୁ।"
    },
    {
      en: "Every day is a new beginning. Take a deep breath and start again.",
      or: "ପ୍ରତିଦିନ ଏକ ନୂତନ ଆରମ୍ଭ। ଗଭୀର ଶ୍ୱାସ ନିଅନ୍ତୁ ଏବଂ ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ।"
    },
    {
      en: "Hard work beats talent when talent doesn't work hard.",
      or: "କଠିନ ପରିଶ୍ରମ ପ୍ରତିଭାକୁ ପଛରେ ପକାଇଦିଏ, ଯେତେବେଳେ ପ୍ରତିଭା କଠିନ ପରିଶ୍ରମ କରେନାହିଁ।"
    },
    {
      en: "Dream big, work hard, stay focused, and surround yourself with good people.",
      or: "ବଡ଼ ସ୍ୱପ୍ନ ଦେଖନ୍ତୁ, କଠିନ ପ୍ରୟାସ କରନ୍ତୁ, ଏକାଗ୍ର ରୁହନ୍ତୁ ଏବଂ ଭଲ ଲୋକମାନେ ସହିତ ରୁହନ୍ତୁ।"
    },
    {
      en: "Use the AI Tutor for complex math problems to see step-by-step solutions.",
      or: "ଜଟିଳ ଗଣିତ ସମସ୍ୟା ପାଇଁ AI Tutor ବ୍ୟବହାର କରନ୍ତୁ ଏବଂ ପଦକ୍ଷେପ ଦରକ୍ଷେପ ସମାଧାନ ଦେଖନ୍ତୁ।"
    }
  ];

  // Pick quote based on day of year
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const todayQuote = dailyQuotes[dayOfYear % dailyQuotes.length][language];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -20 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <NeuralBackground />
      <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-5 sm:space-y-6 md:space-y-8 pb-24"
    >
      {/* Welcome Section - Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
              {language === 'en' ? 'Welcome back,' : 'ସ୍ୱାଗତ,'} <span className="text-emerald-500">{user?.name || 'Scholar'}!</span>
            </h1>
          </div>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] pl-4">
            {t.keepGoing} • {new Date().toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="glass-card px-5 py-2.5 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-emerald-500/25 hover:scale-102 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t.dailyGoal}</p>
              <p className="text-[12px] font-black text-white tracking-tight">{user?.points_today || 0} <span className="text-emerald-500">/ {dailyGoal} XP</span></p>
            </div>
            <div className="relative w-9 h-9 group">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - (100 * dailyProgress) / 100} className="text-emerald-400 transition-all duration-1000 drop-shadow-[0_0_5px_#10b981]" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lucide.Target size={12} className="text-emerald-400 group-hover:scale-115 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
        
        {/* Left Column - Core Interactions */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* AI Tutor Card - Futuristic Neural Link */}
          <motion.div 
            variants={itemVariants}
            onClick={() => {
              if (isPremium) {
                onOpenTutor?.();
              } else {
                setShowTrailer(true);
              }
            }}
            className="glass-card rounded-3xl p-5 md:p-6 lg:p-8 relative overflow-hidden cursor-pointer group hover:border-emerald-500/30 transition-all duration-500"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700"></div>
            
            <div className="flex flex-col sm:flex-row items-center gap-5 md:gap-6 relative z-10 w-full">
              <div className="relative shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-900 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-all duration-500 overflow-hidden relative">
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                  <img src="/gundulu.png" alt="Gundulu" className="w-full h-full object-cover relative z-10" />
                </div>
                <div className="absolute -bottom-1 -right-0.5 w-6 h-6 md:w-7 md:h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] border-2 border-slate-900">
                  <Lucide.Brain size={12} className="md:size-3.5" />
                </div>
              </div>
              
              <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {language === 'en' ? 'Gundulu Active' : 'ଗୁଣ୍ଡୁଲୁ ସକ୍ରିୟ'}
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {language === 'en' ? 'Talk to Gundulu' : 'ଗୁଣ୍ଡୁଲୁ ସହିତ କଥା ହୁଅନ୍ତୁ'}
                </h3>
                <p className="text-slate-400 text-xs md:text-sm font-medium leading-normal max-w-lg hidden sm:block">
                  {language === 'en' 
                    ? 'Initiate a deep learning session. Gundulu is optimized to resolve complex mathematical theorems and academic queries via voice interface.'
                    : 'ଗୋଟିଏ ଗଭୀର ଶିକ୍ଷା ସେସନ୍ ଆରମ୍ଭ କରନ୍ତୁ | ଗୁଣ୍ଡୁଲୁ ଭଏସ୍ ଇଣ୍ଟରଫେସ୍ ମାଧ୍ୟମରେ ଜଟିଳ ଗାଣିତିକ ଏବଂ ଶିକ୍ଷାଗତ ପ୍ରଶ୍ନର ସମାଧାନ କରିବାକୁ ସକ୍ଷମ |'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Test Series Registration - Premium Alert */}
          {!isRegistered && (
            <motion.div 
              variants={itemVariants}
              className="glass-card border-amber-500/20 rounded-3xl p-5 md:p-6 lg:p-8 relative overflow-hidden group hover:border-amber-500/40 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none"></div>
              <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(245,158,11,0.1)] group-hover:rotate-12 transition-transform">
                  <Lucide.Trophy size={28} className="text-amber-500" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-wider">
                    <Lucide.Sparkles size={10} />
                    {language === 'en' ? 'Registration Phase Open' : 'ପଞ୍ଜିକରଣ ଚାଲିଛି'}
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">
                    {language === 'en' ? 'Monthly Test Series' : 'ମାସିକ ଟେଷ୍ଟ ସିରିଜ୍'}
                  </h3>
                  <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed max-w-xl italic">
                    "{language === 'en' 
                      ? 'Compete in the ultimate state-level examination. Scholar prizes up to ₹10,000 available for top-tier performers.' 
                      : 'ରାଜ୍ୟ ସ୍ତରୀୟ ପରୀକ୍ଷାରେ ପ୍ରତିଯୋଗିତା କରନ୍ତୁ ଏବଂ ₹୧୦,୦୦୦ ପର୍ଯ୍ୟନ୍ତ ପୁରସ୍କାର ଜିତନ୍ତୁ |'}"
                  </p>
                </div>
                <button 
                  onClick={() => setShowRegistrationForm(true)}
                  className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all"
                >
                  {language === 'en' ? 'Initialize Registration' : 'ପଞ୍ଜିକରଣ କରନ୍ତୁ'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Daily Challenge & Video Matrix */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Daily MCQ Card */}
            <div className="glass-card rounded-3xl p-5 md:p-6 lg:p-8 border-cyan-500/20 relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-500 flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none group-hover:bg-cyan-500/20 transition-all"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-wider">
                  <Lucide.CheckCircle2 size={12} />
                  Knowledge Pulse
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase mb-1.5">
                    {language === 'en' ? "Gundulu's Trial" : "ଗୁଣ୍ଡୁଲୁର ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ"}
                  </h3>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed italic">
                    {hasDailyPractice
                      ? (language === 'en' ? 'New cognitive nodes are available for your current tier. Synchronize now.' : 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ନୂଆ ପ୍ରଶ୍ନ ଉପଲବ୍ଧ ଅଛି | ବର୍ତ୍ତମାନ ସମାଧାନ କରନ୍ତୁ |')
                      : (language === 'en' ? 'Daily challenge status: PENDING. Check the practice matrix for updates.' : 'ଆଜିର ପ୍ରଶ୍ନ ସେଟ୍ ପ୍ରକାଶିତ ହୋଇଛି କି ନାହିଁ ଦେଖିବାକୁ ଅଭ୍ୟାସ ଟ୍ୟାବ୍ ଖୋଲନ୍ତୁ |')}
                  </p>
                </div>

                {(todayDailySubject || tomorrowDailySubject) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {todayDailySubject && (
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase tracking-wider text-cyan-300">
                        {language === 'en' ? 'Current:' : 'ଆଜି:'} {todayDailySubject}
                      </span>
                    )}
                    {tomorrowDailySubject && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-500">
                        {language === 'en' ? 'Next:' : 'ଆସନ୍ତାକାଲି:'} {tomorrowDailySubject}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="button"
                  onClick={onOpenDailyPractice}
                  className="flex-1 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-xl shadow-cyan-900/20 active:scale-95"
                >
                  {language === 'en' ? "Commence Trial" : "ଆରମ୍ଭ କରନ୍ତୁ"}
                </button>
                <button
                  type="button"
                  onClick={onShareDailyPractice}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-1.5"
                >
                  <Lucide.MessageCircle size={12} />
                  {language === 'en' ? 'Broadcast' : 'ଶେୟାର'}
                </button>
              </div>
            </div>

            {/* Class-wise YouTube Matrix */}
            <div className="glass-card rounded-3xl p-5 md:p-6 lg:p-8 border-white/5 relative overflow-hidden group flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/50 to-transparent" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Neural Feed • Tier {userClass}
                  </div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'en' ? 'Live Archive' : 'ଭିଡିଓ ସଂଗ୍ରହ'}
                  </div>
                </div>
                
                <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl relative group-hover:scale-[1.01] transition-transform duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
                  <iframe
                    width="100%"
                    height="100%"
                    src={dailyVideoId ? `https://www.youtube.com/embed/${dailyVideoId}?autoplay=0&rel=0` : videoUrl}
                    title={`Daily Learning Feed`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="relative z-0"
                  ></iframe>
                </div>

                <a
                  href="https://www.youtube.com/@UtkalSkillCenter?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-wider transition-all shadow-xl shadow-red-900/20 active:scale-95"
                >
                  <Lucide.Youtube size={14} />
                  {language === 'en' ? 'Synchronize Subscription' : 'YouTube ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ'}
                </a>
              </div>
            </div>
          </div>

          {/* Performance Analytics */}
          <PerformanceChart 
            submissions={user?.submissions || []} 
            tests={chapters}
            language={language} 
          />

        </div>

        {/* Right Column - Stats & Global Rankings */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Motivation Insight */}
          <div className="glass-card rounded-3xl p-5 md:p-6 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent relative overflow-hidden">
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 shadow-lg">
                <Lucide.Sparkles size={22} />
              </div>
              <div>
                <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-1.5">{language === 'en' ? "Today's Inspiration" : 'ଆଜିର ପ୍ରେରଣା'}</h4>
                <p className="text-white text-sm font-bold leading-normal italic tracking-tight">"{todayQuote}"</p>
              </div>
            </div>
          </div>

          <OdishaLiveMap language={language} />

          {/* Learning Progress Matrix */}
          <div className="glass-card rounded-3xl p-5 md:p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                  <Lucide.BarChart3 size={16} />
                </div>
                <h3 className="text-md font-black text-white tracking-tight">Subject Mastery</h3>
              </div>
              <Lucide.TrendingUp size={14} className="text-emerald-500" />
            </div>

            <div className="space-y-4">
              {user?.subject_progress && Object.entries(user.subject_progress).length > 0 ? (
                Object.entries(user.subject_progress).map(([subject, progress]: [string, any], idx) => (
                  <div key={subject} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{translations[language].subjects?.[subject] || subject}</span>
                      <span className="text-[10px] font-black text-emerald-400 tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1.5, delay: idx * 0.1, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 space-y-4 opacity-40">
                  <Lucide.BarChart3 size={40} className="mx-auto text-slate-600" />
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest leading-relaxed">No data detected.<br/>Commence learning protocols.</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievement Nodes */}
          <div className="glass-card rounded-3xl p-5 md:p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/20">
                  <Lucide.Award size={16} />
                </div>
                <h3 className="text-md font-black text-white tracking-tight">Achievements</h3>
              </div>
              <Lucide.Star size={14} className="text-purple-500" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {user?.stats?.badges && user.stats.badges.length > 0 ? (
                user.stats.badges.slice(0, 6).map((badge: string, i: number) => (
                  <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group cursor-help relative hover:border-purple-500/30 transition-all">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Lucide.Star size={18} fill={i === 0 ? "currentColor" : "none"} />
                    </div>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-2xl">
                      {badge}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-8 border border-dashed border-white/5 rounded-[2rem] text-center opacity-30">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">No nodes unlocked</p>
                </div>
              )}
            </div>
          </div>

          {/* Global Rankings Matrix */}
          <div className="space-y-6">
            <LeaderboardView
              leaderboard={filteredLeaderboard}
              language={language}
              following={user?.following || []}
              user={user}
            />
            <div className="px-2">
              <DistrictLeaderboardFilter
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                language={language}
              />
            </div>
          </div>
        </div>
      </div>
          {/* AI Disclaimer */}
          <div className="max-w-7xl mx-auto px-6 mt-12 mb-8">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] text-center bg-white/5 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
              <span className="text-amber-500/80 mr-2">◆</span> AI systems can make mistakes. Please double-check critical information with your textbooks. <span className="text-amber-500/80 ml-2">◆</span>
            </p>
          </div>
      </motion.div>

      <AnimatePresence>
        {showRegistrationForm && (
          <TestSeriesRegistrationForm 
            user={user} 
            language={language} 
            onClose={() => {
              setShowRegistrationForm(false);
              onRegistrationComplete?.();
            }} 
          />
        )}
      </AnimatePresence>

      {showTrailer && (
        <GunduluTrailer 
          language={language}
          onClose={() => setShowTrailer(false)}
          onSubscribe={() => {
            setShowTrailer(false);
            onUpgrade();
          }}
        />
      )}
    </div>
  );
}


function StatCard({ icon, label, value, subValue }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass-card rounded-3xl p-6 hover:border-white/20 transition-all group relative overflow-hidden"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 group-hover:scale-110 transition-all border border-white/5">{icon}</div>
        <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 relative z-10">
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        {subValue && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{subValue}</span>}
      </div>
    </motion.div>
  );
}

function TopicProgress({ label, progress, color }: any) {
  return (
    <div className="group space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
        <span className="text-xs font-black text-emerald-400">{progress}%</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color} shadow-lg shadow-current/20 relative`}
        >
           <div className="absolute inset-0 bg-white/10"></div>
        </motion.div>
      </div>
    </div>
  );
}
