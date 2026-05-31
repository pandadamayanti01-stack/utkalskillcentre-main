import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { ODISHA_DISTRICTS } from '../constants/districts';
import { TestSeriesRegistrationForm } from './TestSeriesRegistrationForm';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { GunduluTrailer } from './GunduluTrailer';
import NeuralBackground from './NeuralBackground';
import OdishaLiveMap from './OdishaLiveMap';
import ReactMarkdown from 'react-markdown';
import { generateHomeworkSheet } from '../services/aiService';

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
  onOpenCommunity?: () => void;
  following?: string[];
  onToggleFollow?: (targetUserId: string) => void;
  isTourStep3?: boolean;
  isTourStep4?: boolean;
  onOpenRajaPoster?: () => void;
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
      <div className="glass-card border-slate-700/50 rounded-[2rem] p-4 sm:p-6 lg:p-8 text-center bg-slate-900/40 flex flex-col items-center justify-center h-full hover:border-slate-600 hover:-translate-y-1 transition-all duration-500">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-2 sm:mb-4">
          <Lucide.TrendingUp size={16} className="sm:w-5 sm:h-5 text-slate-500" />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-[8px] sm:text-[10px]">
          {language === 'en' ? 'No Progress Data Yet' : 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପ୍ରଗତି ତଥ୍ୟ ନାହିଁ'}
        </p>
        <p className="text-slate-500 text-[8px] sm:text-xs mt-1 sm:mt-2 max-w-[200px]">
          {language === 'en' ? 'Take monthly tests to see your growth chart!' : 'ଆପଣଙ୍କର ବିକାଶ ଗ୍ରାଫ୍ ଦେଖିବା ପାଇଁ ମାସିକ ପରୀକ୍ଷା ଦିଅନ୍ତୁ!'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card neon-border rounded-3xl p-5 md:p-6 lg:p-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            {language === 'en' ? 'Your Progress Graph' : 'ଆପଣଙ୍କର ପ୍ରଗତି ଗ୍ରାଫ୍'}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            {language === 'en' ? 'Monthly Performance Analytics' : 'ମାସିକ ପ୍ରଦର୍ଶନ ବିଶ୍ଳେଷଣ'}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Lucide.TrendingUp size={12} />
          {chartData.length > 1 && chartData[chartData.length-1].score >= chartData[chartData.length-2].score 
            ? (language === 'en' ? 'Improving' : 'ଉନ୍ନତି ହେଉଛି') 
            : (language === 'en' ? 'Consistency is Key' : 'ନିରନ୍ତରତା ଅତ୍ୟନ୍ତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ')}
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
              formatter={(value) => [`${value}%`, language === 'en' ? 'SCORE' : 'ସ୍କୋର']}
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

export function Dashboard({ user, leaderboard, language, isPremium, onUpgrade, chapters, dailyChallenge, hasDailyPractice, todayDailySubject, tomorrowDailySubject, onChallengeComplete, onOpenTutor, onOpenDailyPractice, onShareDailyPractice, isRegistered = false, onRegistrationComplete, onOpenCommunity, following = [], onToggleFollow, isTourStep3, isTourStep4, onOpenRajaPoster }: DashboardProps) {
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
    
    // Video controls state
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    const toggleMute = () => {
      if (videoRef.current) {
        const newMutedState = !videoRef.current.muted;
        videoRef.current.muted = newMutedState;
        setIsMuted(newMutedState);
      }
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
    // Special Promotion Period: Till June 20th, 2026 (inclusive). No rotation.
    const isSpecialPromoPeriod = new Date() < new Date('2026-06-21T00:00:00');
    const promoVideoUrl = 'https://www.youtube.com/embed/Ml-_dY7FXrs';
    const videoUrl = isSpecialPromoPeriod 
      ? promoVideoUrl 
      : (classVideoMap[userClass] || classVideoMap['10']);

  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [dailyVideoId, setDailyVideoId] = useState<string | null>(isSpecialPromoPeriod ? 'Ml-_dY7FXrs' : null);

  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkClass, setHomeworkClass] = useState(userClass || '10');
  const [homeworkSubject, setHomeworkSubject] = useState('math');
  const [homeworkChapter, setHomeworkChapter] = useState('');
  const [homeworkDifficulty, setHomeworkDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [homeworkQCount, setHomeworkQCount] = useState(10);
  const [isGeneratingHomework, setIsGeneratingHomework] = useState(false);
  const [generatedHomework, setGeneratedHomework] = useState('');

  const [topStudyStudents, setTopStudyStudents] = useState<any[]>([]);
  const [displayedStudent, setDisplayedStudent] = useState<any | null>(null);
  const [activeRank, setActiveRank] = useState<number | null>(null);
  const [isSundayClosed, setIsSundayClosed] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'leaderboard'>('overview');

  // Odisha high-performance mock student profiles for development realism
  const mockLeaderboardProfiles = React.useMemo(() => [
    { id: 'mock_1', name: 'Rajesh Mohanty', points: 980, streak: 15, district: 'Khordha', school: 'Bhubaneswar Govt High School', avatar: '', dailyCompleted: true },
    { id: 'mock_2', name: 'Priyabrata Sahu', points: 870, streak: 9, district: 'Cuttack', school: 'Ravenshaw Collegiate School', avatar: '', dailyCompleted: true },
    { id: 'mock_3', name: 'Subhashree Dash', points: 810, streak: 12, district: 'Balasore', school: 'Balasore Zilla School', avatar: '', dailyCompleted: false },
    { id: 'mock_4', name: 'Sameer Patnaik', points: 740, streak: 7, district: 'Koraput', school: 'Jeypore High School', avatar: '', dailyCompleted: true },
    { id: 'mock_5', name: 'Chinmayee Mishra', points: 690, streak: 5, district: 'Khordha', school: 'Capital High School', avatar: '', dailyCompleted: false },
    { id: 'mock_6', name: 'Sourav Jena', points: 610, streak: 4, district: 'Cuttack', school: 'SCB Medical Public School', avatar: '', dailyCompleted: true },
    { id: 'mock_7', name: 'Swagatika Rout', points: 580, streak: 6, district: 'Balasore', school: 'Fakir Mohan High School', avatar: '', dailyCompleted: true },
    { id: 'mock_8', name: 'Rakesh Nayak', points: 520, streak: 3, district: 'Koraput', school: 'Koraput Govt Zilla School', avatar: '', dailyCompleted: false },
  ], []);

  // Blend actual leaderboard with mock data to show an active, full board
  const combinedLeaderboard = React.useMemo(() => {
    const list = [...leaderboard];
    
    mockLeaderboardProfiles.forEach(mock => {
      if (!list.some(s => s.name?.toLowerCase() === mock.name.toLowerCase())) {
        list.push({
          ...mock,
          class: user?.class || '10'
        });
      }
    });

    if (user && !list.some(s => s.id === user.id)) {
      list.push({
        id: user.id,
        name: user.name || 'Student',
        class: user.class || '10',
        points: user.points || 0,
        streak: user.streak || 0,
        district: user.district || 'Khordha',
        school: user.school || 'My School',
        avatar: user.avatar || '',
        dailyCompleted: user.points_today > 0
      });
    }

    return list.sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [leaderboard, user, mockLeaderboardProfiles]);

  // Apply selected district filter to the combined dataset
  const filteredList = React.useMemo(() => {
    return selectedDistrict
      ? combinedLeaderboard.filter(u => u.district?.toLowerCase() === selectedDistrict.toLowerCase())
      : combinedLeaderboard;
  }, [combinedLeaderboard, selectedDistrict]);

  const getBadgeInfo = (points: number) => {
    const level = Math.floor((points || 0) / 100) + 1;
    let badgeTitle = 'Curious Learner';
    let badgeTitleOdia = 'ଜିଜ୍ଞାସୁ ଛାତ୍ର';
    let badgeIcon = '🔍';

    if (level >= 10) {
      badgeTitle = 'Gundulu Legend';
      badgeTitleOdia = 'ଗୁନ୍ଦୁଲୁ ମହାରଥୀ';
      badgeIcon = '👑';
    } else if (level >= 7) {
      badgeTitle = 'Odia Math Master';
      badgeTitleOdia = 'ଗଣିତ ସମ୍ରାଟ';
      badgeIcon = '📐';
    } else if (level >= 5) {
      badgeTitle = 'Syllabus Conqueror';
      badgeTitleOdia = 'ପାଠ୍ୟକ୍ରମ ବିଜେତା';
      badgeIcon = '⚔️';
    } else if (level >= 3) {
      badgeTitle = 'Gundulu Scholar';
      badgeTitleOdia = 'ଗୁନ୍ଦୁଲୁ ପଣ୍ଡିତ';
      badgeIcon = '🎓';
    }

    return { level, title: language === 'en' ? `${badgeIcon} ${badgeTitle}` : `${badgeIcon} ${badgeTitleOdia}` };
  };

  useEffect(() => {
    const fetchTopStudyStudents = async () => {
      try {
        let docs: any[] = [];
        if (user?.class) {
          const q = query(
            collection(db, 'users'),
            where('class', '==', user.class)
          );
          const snapshot = await getDocs(q);
          docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        // If we didn't find any or class is not specified, fall back to global
        if (docs.length === 0) {
          const q = query(collection(db, 'users'));
          const snapshot = await getDocs(q);
          docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        const sorted = docs
          .filter((u: any) => u.role !== 'admin' && (u.totalStudyMinutes || 0) > 0)
          .sort((a: any, b: any) => (b.totalStudyMinutes || 0) - (a.totalStudyMinutes || 0))
          .slice(0, 6);

        setTopStudyStudents(sorted);
      } catch (err) {
        console.error("Error fetching top study students:", err);
      }
    };
    fetchTopStudyStudents();
  }, [user?.class]);

  useEffect(() => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (dayOfWeek === 0) {
      setIsSundayClosed(true);
      setDisplayedStudent(null);
      setActiveRank(null);
    } else {
      setIsSundayClosed(false);
      // Monday (1) = index 5 (Rank 6), Tuesday (2) = index 4 (Rank 5), ..., Saturday (6) = index 0 (Rank 1)
      const targetRank = 7 - dayOfWeek;
      const targetIndex = 6 - dayOfWeek;
      
      setActiveRank(targetRank);
      if (topStudyStudents.length >= targetRank) {
        setDisplayedStudent(topStudyStudents[targetIndex]);
      } else {
        setDisplayedStudent(null);
      }
    }
  }, [topStudyStudents]);

  useEffect(() => {
    // If in the special promotional period, lock the video ID and skip rotation
    if (new Date() < new Date('2026-06-21T00:00:00')) {
      setDailyVideoId('Ml-_dY7FXrs');
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
      className="space-y-5 sm:space-y-6 md:space-y-8 pb-20 lg:pb-8"
    >
      {/* Welcome Section - Hyper Premium Header */}
      <div className="flex flex-row items-start md:items-center justify-between gap-4 md:gap-6 relative z-20">
        
        {/* Left Side: Welcome Text + XP Badge */}
        <div className="flex flex-col gap-6 md:gap-4 relative z-10 flex-1 lg:flex-none lg:max-w-md min-w-0">
          
          {/* Welcome Text */}
          <div className="space-y-2">
            <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-1.5 h-8 md:w-2 md:h-12 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] shrink-0"></div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-700 to-slate-500 dark:from-white dark:via-white dark:to-slate-400 tracking-tighter leading-tight break-words">
                {language === 'en' ? 'Welcome back,' : 'ସ୍ୱାଗତ,'} <br className="sm:hidden" /><span className="text-emerald-500 drop-shadow-sm leading-tight">{user?.name || 'Student'}!</span>
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-4 sm:pl-6 flex items-center gap-1.5 sm:gap-2 truncate">
              <Lucide.Calendar size={10} className="text-emerald-500 sm:w-3 sm:h-3 shrink-0" />
              {new Date().toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* XP Badge */}
          <div className="flex items-center justify-start">
            <div className={`bg-slate-900/60 backdrop-blur-2xl px-4 md:px-6 py-3 md:py-4 rounded-3xl md:rounded-[2rem] flex items-center gap-3 md:gap-5 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_40px_rgba(0,0,0,0.5)] hover:border-emerald-500/30 transition-all duration-500 group cursor-default max-w-max ${isTourStep3 ? 'ring-[4px] ring-amber-500 scale-[1.03] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)] z-30 animate-pulse bg-slate-950/90' : ''}`}>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 md:gap-3 mb-0.5">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t.dailyGoal}</p>
                  <div className="flex items-center gap-1 text-orange-400" title="Current Streak">
                    <Lucide.Flame size={10} className="md:w-3 md:h-3" fill="currentColor" />
                    <span className="text-[9px] md:text-[10px] font-black">{user?.streak || 0}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1 justify-end">
                  <p className="text-xl md:text-2xl font-black text-white tracking-tighter">{user?.points_today || 0}</p>
                  <p className="text-[10px] md:text-xs font-bold text-emerald-500">/ {dailyGoal} XP</p>
                </div>
              </div>
              <div className="relative w-10 h-10 md:w-14 md:h-14 group">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-md group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-slate-800" />
                  <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - (100 * dailyProgress) / 100} className="text-emerald-400 transition-all duration-1000 drop-shadow-[0_0_8px_#10b981]" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <Lucide.Zap size={14} className="md:w-[18px] md:h-[18px] text-emerald-300 drop-shadow-md group-hover:scale-110 group-hover:text-white transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Desktop Only - Neural Sync Status */}
        <div className="hidden lg:flex flex-1 max-w-xl xl:max-w-2xl mx-4 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-emerald-500/10 rounded-[2rem] p-5 flex items-center gap-6 w-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_30px_-10px_rgba(16,185,129,0.15)] transition-all duration-500 hover:border-emerald-500/30">
            
            <div className="relative shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform duration-500">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping" style={{ animationDuration: '3s' }}></div>
              <Lucide.Target size={24} />
            </div>

            <div className="flex-1 space-y-2.5">
              <div className="flex justify-between items-end">
                <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {language === 'en' ? 'Daily Target Sync' : 'ଦୈନିକ ଲକ୍ଷ୍ୟ'}
                </h4>
                <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-400">{Math.round(dailyProgress)}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-white/20 shadow-inner relative">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full transition-all duration-1000" style={{ width: `${dailyProgress}%` }}>
                  <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 skew-x-12 animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic truncate">
                {language === 'en' ? 'Keep learning to maintain your streak and unlock rewards.' : 'ଆପଣଙ୍କର ଦୈନିକ ଲକ୍ଷ୍ୟ ପୂରଣ କରନ୍ତୁ |'}
              </p>
            </div>

          </div>
        </div>

        {/* Animated Gundulu Mascot Video (Right Side) */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 pointer-events-auto group shrink-0 -mt-2 md:mt-0">
          <div className="absolute inset-0 rounded-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)] ring-2 ring-emerald-500/20 bg-black">
            <video 
              ref={videoRef}
              src="/gundulu.mp4" 
              poster="/gundu2.0.png"
              autoPlay
              muted
              loop 
              playsInline
              className="w-full h-full object-cover scale-[1.1] relative z-10" 
            />
          </div>
          
          <button 
            onClick={toggleMute}
            className="absolute bottom-2 right-0 md:bottom-4 z-20 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 border border-emerald-300/30 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:from-emerald-500 hover:to-teal-700 hover:scale-110 shadow-[0_4px_15px_rgba(16,185,129,0.4)] cursor-pointer"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? (
              <Lucide.VolumeX size={16} className="fill-white" />
            ) : (
              <Lucide.Volume2 size={16} className="fill-white" />
            )}
          </button>
        </div>
      </div>

      {/* Premium Sub-Tab Switcher */}
      <div className="flex justify-start border-b border-white/5 pb-2 relative z-20">
        <div className="flex p-1 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'overview'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lucide.LayoutDashboard size={14} />
            <span>{language === 'en' ? 'Overview' : 'ପ୍ରୋଫାଇଲ୍ ସାରାଂଶ'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'leaderboard'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lucide.Trophy size={14} />
            <span>{language === 'en' ? 'Statewide Leaderboard' : 'ରାଜ୍ୟସ୍ତରୀୟ ଲିଡରବୋର୍ଡ'}</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'overview' ? (
        /* Main Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
          {/* Left Column - Core Interactions */}
          <div className="lg:col-span-8 space-y-8">
          


          {/* AI Tutor & Daily MCQ Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
            
            {/* AI Tutor Card - Hyper Premium Banner */}
            <motion.div 
              variants={itemVariants}
              onClick={() => {
                if (isPremium) {
                  onOpenTutor?.();
                } else {
                  setShowTrailer(true);
                }
              }}
              className={`bg-slate-900/60 backdrop-blur-2xl rounded-[2rem] p-4 sm:p-6 relative overflow-hidden cursor-pointer group border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_60px_-15px_rgba(0,0,0,0.7)] hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full ${isTourStep4 ? 'ring-[4px] ring-amber-500 scale-[1.03] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)] z-30 animate-pulse bg-slate-950/90' : ''}`}
            >
              {/* Edge-to-edge gradients */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-900/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -mr-[200px] -mt-[200px] pointer-events-none group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-1000"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              
              <div className="flex flex-col items-center justify-center gap-2 sm:gap-4 relative z-10 w-full text-center h-full">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-slate-950 border-[2px] sm:border-[3px] border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-emerald-400 transition-all duration-500 overflow-hidden relative group-hover:shadow-[0_0_60px_rgba(16,185,129,0.5)]">
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                    <img src="/gundulu.png" alt="Gundulu" className="w-full h-full object-cover relative z-10" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-7 sm:h-7 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] border-2 border-slate-900 group-hover:scale-110 transition-transform">
                    <Lucide.Sparkles size={10} className="sm:w-3 sm:h-3" />
                  </div>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2 flex flex-col items-center flex-1 justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                    <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-[inset_0_0_10px_rgba(16,185,129,0.1)] whitespace-nowrap">
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse"></span>
                      <span className="hidden sm:inline">{language === 'en' ? 'Gundulu AI Active' : 'ଗୁନ୍ଦୁଲୁ AI ସକ୍ରିୟ'}</span>
                      <span className="sm:hidden">{language === 'en' ? 'AI Active' : 'AI ସକ୍ରିୟ'}</span>
                    </div>
                  </div>
                  <h3 className="text-[11px] leading-tight sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tighter group-hover:text-white transition-colors whitespace-nowrap">
                    {language === 'en' ? 'Talk to Gundulu' : 'ଗୁନ୍ଦୁଲୁ ସହିତ କଥା ହୁଅନ୍ତୁ'}
                  </h3>
                  <p className="text-slate-400 text-[8px] sm:text-xs font-bold leading-relaxed max-w-[260px] mx-auto group-hover:text-slate-300 transition-colors hidden sm:block">
                    {language === 'en' 
                      ? 'Initiate a deep learning session. Ask complex questions and get instant, step-by-step voice answers.'
                      : 'ଗୋଟିଏ ଗଭୀର ଶିକ୍ଷା ସେସନ୍ ଆରମ୍ଭ କରନ୍ତୁ | ଗୁନ୍ଦୁଲୁ ଭଏସ୍ ଇଣ୍ଟରଫେସ୍ ମାଧ୍ୟମରେ ଜଟିଳ ପ୍ରଶ୍ନର ସମାଧାନ କରିବାକୁ ସକ୍ଷମ |'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Daily MCQ Card - Gamified */}
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] p-4 sm:p-6 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_40px_-10px_rgba(0,0,0,0.5)] relative group hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full">
              
              {/* Background glows (Isolated overflow-hidden) */}
              <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none group-hover:bg-cyan-500/20 transition-all"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600/0 via-cyan-500/50 to-cyan-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              
              {/* Hanging Bookmark Ribbon (Right Side) */}
              <div className="absolute top-0 right-3 sm:right-4 w-6 sm:w-8 h-14 sm:h-16 bg-gradient-to-b from-pink-500 to-rose-600 drop-shadow-[0_5px_10px_rgba(225,29,72,0.4)] z-20 flex justify-center pt-1.5 sm:pt-2 transition-all duration-500 group-hover:pt-2 group-hover:h-16 group-hover:sm:h-20"
                   style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }}>
                <div className="flex flex-col items-center text-white font-black text-[9px] sm:text-[11px] uppercase leading-[1.1] drop-shadow-md">
                  <span>M</span>
                  <span>C</span>
                  <span>Q</span>
                </div>
              </div>
              
              <div className="relative z-10 space-y-3 sm:space-y-4 flex flex-col flex-1">
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                  <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
                    <Lucide.CheckCircle2 size={10} className="drop-shadow-md sm:w-3 sm:h-3" />
                    {language === 'en' ? 'Knowledge Pulse' : 'ଜ୍ଞାନ ପରୀକ୍ଷା'}
                  </div>
                </div>
                
                <div className="text-center flex flex-col flex-1 justify-center">
                  <h3 className="text-[11px] leading-tight sm:text-2xl font-black text-white tracking-tighter mb-1.5 sm:mb-2 group-hover:text-cyan-50 transition-colors whitespace-nowrap">
                    {language === 'en' ? "Gundulu's Trial" : "ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ"}
                  </h3>
                  <p className="text-slate-400 text-[8px] sm:text-xs font-bold leading-relaxed max-w-[260px] mx-auto hidden sm:block">
                    {hasDailyPractice
                      ? (language === 'en' ? 'New cognitive nodes are available for your current tier. Synchronize now.' : 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ନୂଆ ପ୍ରଶ୍ନ ଉପଲବ୍ଧ ଅଛି | ବର୍ତ୍ତମାନ ସମାଧାନ କରନ୍ତୁ |')
                      : (language === 'en' ? 'Daily challenge status: PENDING. Check the practice matrix for updates.' : 'ଆଜିର ପ୍ରଶ୍ନ ସେଟ୍ ପ୍ରକାଶିତ ହୋଇଛି କି ନାହିଁ ଦେଖିବାକୁ ଅଭ୍ୟାସ ଟ୍ୟାବ୍ ଖୋଲନ୍ତୁ |')}
                  </p>
                </div>

                {(todayDailySubject || tomorrowDailySubject) && (
                  <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-1 pt-1 z-10 relative">
                    {todayDailySubject && (
                      <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-cyan-300 text-center truncate inline-block max-w-[120px] backdrop-blur-sm">
                        <span className="hidden sm:inline">{language === 'en' ? 'Topic: ' : 'ବିଷୟ: '}</span>
                        {translations[language].subjects?.[todayDailySubject.toLowerCase()] || translations[language].subjects?.[todayDailySubject] || todayDailySubject}
                      </span>
                    )}
                    {tomorrowDailySubject && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-slate-400 text-center truncate hidden sm:inline-block max-w-[120px] backdrop-blur-sm">
                        {language === 'en' ? 'Next: ' : 'ଆସନ୍ତାକାଲି: '} 
                        {translations[language].subjects?.[tomorrowDailySubject.toLowerCase()] || translations[language].subjects?.[tomorrowDailySubject] || tomorrowDailySubject}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="relative z-10 flex flex-row gap-1.5 sm:gap-3 mt-4 sm:mt-6 shrink-0">
                <button
                  type="button"
                  onClick={onOpenDailyPractice}
                  className="flex-1 px-2 sm:px-5 py-2 sm:py-3 rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all shadow-[0_10px_20px_-10px_rgba(6,182,212,0.8)] active:scale-95 border-t border-cyan-300 truncate whitespace-nowrap"
                >
                  {language === 'en' ? "Commence Trial" : "ଆରମ୍ଭ କରନ୍ତୁ"}
                </button>
                <button
                  type="button"
                  onClick={onShareDailyPractice}
                  className="px-2.5 sm:px-5 py-2 sm:py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 sm:w-[16px] sm:h-[16px] transition-transform group-hover:scale-110">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="hidden sm:inline">{language === 'en' ? 'Share' : 'ଶେୟାର'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Middle Row: Registration & Video Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8 w-full">
            {/* Test Series Registration - Premium Alert (Half Size Layout) */}
            {!isRegistered && (
              <motion.div 
                variants={itemVariants}
                className="bg-slate-900/70 backdrop-blur-2xl border border-amber-500/20 rounded-[2rem] p-6 relative overflow-hidden group hover:border-amber-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col justify-between h-full"
              >
                {/* Animated Premium Backgrounds */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-900/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[80px] -mr-[150px] -mt-[150px] pointer-events-none group-hover:bg-amber-500/20 transition-all duration-1000"></div>
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>

                <div className="flex flex-col justify-between h-full relative z-10">
                  <div className="flex flex-row items-center gap-4">
                    {/* Glowing Trophy Icon */}
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-amber-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500">
                        <Lucide.Trophy size={20} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                      </div>
                    </div>

                    {/* Text Content */}
                    <div className="flex-1 text-left">
                      <div className="inline-flex items-center gap-1 mb-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                        <Lucide.Sparkles size={10} className="animate-pulse" />
                        {language === 'en' ? 'Registration Open' : 'ପଞ୍ଜିକରଣ ଚାଲିଛି'}
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase drop-shadow-md mt-1">
                        {language === 'en' ? 'Monthly Test Series' : 'ମାସିକ ଟେଷ୍ଟ ସିରିଜ୍'}
                      </h3>
                    </div>
                  </div>

                  {/* Premium Action Button */}
                  <button 
                    onClick={() => setShowRegistrationForm(true)}
                    className="w-full px-4 py-2.5 mt-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-[11px] sm:text-xs uppercase tracking-[0.2em] shadow-[0_5px_15px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group/btn"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {language === 'en' ? 'Initialize Registration' : 'ପଞ୍ଜିକରଣ କରନ୍ତୁ'}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Class Community Chat Card */}
            <motion.div 
              variants={itemVariants}
              onClick={onOpenCommunity}
              className="bg-slate-900/60 backdrop-blur-2xl border border-indigo-500/30 rounded-[2rem] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_60px_-15px_rgba(0,0,0,0.5)] cursor-pointer group hover:border-indigo-400/50 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-900/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-400/30 transition-colors duration-1000 pointer-events-none"></div>
              
              <div className="flex flex-col h-full relative z-10 justify-between">
                <div className="flex flex-row items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-indigo-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500">
                      <Lucide.MessageCircle size={20} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="inline-flex items-center gap-1 mb-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_#818cf8] animate-pulse"></span>
                      {language === 'en' ? 'Live Chat' : 'ଲାଇଭ୍ ଚାଟ୍'}
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase drop-shadow-md mt-1">
                      {language === 'en' ? `CLASS ${userClass} COMMUNITY` : `ଶ୍ରେଣୀ ${userClass} କମ୍ୟୁନିଟି`}
                    </h3>
                  </div>
                </div>
                <p className="text-slate-400 text-[10px] sm:text-xs font-bold leading-relaxed mt-4 group-hover:text-slate-300 transition-colors">
                  {language === 'en' ? 'Join the discussion. Help your classmates, ask questions, and share knowledge in real-time!' : 'ଆଲୋଚନାରେ ଯୋଗ ଦିଅନ୍ତୁ | ସାଙ୍ଗମାନଙ୍କୁ ସାହାଯ୍ୟ କରନ୍ତୁ ଏବଂ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ!'}
                </p>
                <div className="mt-4 flex -space-x-2 overflow-hidden">
                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white">1</div>
                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">2</div>
                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-amber-500 flex items-center justify-center text-[8px] font-bold text-white">3</div>
                  <div className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white">+</div>
                </div>
              </div>
            </motion.div>

            {/* Class-wise YouTube Matrix - Cinema Style */}
            <div className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-red-500/30 hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full ${!isRegistered ? 'lg:col-span-2' : ''}`}>
              <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-red-500/5 rounded-full blur-[60px] -mr-16 sm:-mr-24 -mt-16 sm:-mt-24 pointer-events-none group-hover:bg-red-500/10 transition-all"></div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/0 via-red-500/50 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444] animate-pulse" />
                    {language === 'en' ? `Neural Feed • Tier ${userClass}` : `ଭିଡିଓ ଫିଡ୍ • ଶ୍ରେଣୀ ${userClass}`}
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'en' ? 'Live Archive' : 'ଭିଡିଓ ସଂଗ୍ରହ'}
                  </div>
                </div>
                
                <div className="aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-white/10 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative group-hover:scale-[1.02] group-hover:shadow-[0_10px_40px_rgba(239,68,68,0.2)] transition-all duration-500">
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
                  className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_10px_20px_-10px_rgba(239,68,68,0.8)] active:scale-95 border-t border-red-400"
                >
                  <Lucide.Youtube size={14} className="sm:w-4 sm:h-4" />
                  {language === 'en' ? 'Synchronize Subscription' : 'YouTube ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ'}
                </a>
              </div>
            </div>
          </div>

          {/* Performance & Motivation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
            <div className="md:col-span-2">
              {/* Performance Analytics */}
              <PerformanceChart 
                submissions={user?.submissions || []} 
                tests={chapters}
                language={language} 
              />
            </div>

            {/* Study Champion Card */}
            <div className="md:col-span-1">
              <div className={`glass-card rounded-[2rem] p-5 border relative overflow-hidden flex flex-col justify-between h-full hover:-translate-y-1 transition-all duration-500 ${
                isSundayClosed
                  ? 'border-white/5 bg-slate-950/20 opacity-80'
                  : displayedStudent?.id === user?.id 
                    ? 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-slate-900/40 to-amber-950/20 shadow-[0_10px_30px_rgba(234,179,8,0.1)] hover:border-yellow-500/50' 
                    : displayedStudent
                      ? 'border-white/10 bg-slate-900/40 hover:border-emerald-500/30'
                      : 'border-dashed border-white/10 bg-slate-950/10'
              }`}>
                {displayedStudent?.id === user?.id && !isSundayClosed && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-[40px] -mr-12 -mt-12 pointer-events-none animate-pulse"></div>
                )}
                
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-[8px] sm:text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                        {isSundayClosed
                          ? (language === 'en' ? 'Calculations In Progress' : 'ହିସାବ ଚାଲିଛି')
                          : displayedStudent
                            ? (language === 'en' ? `Study Champion (Rank ${activeRank})` : `ପଠନ ଚାମ୍ପିଅନ୍ (Rank ${activeRank})`)
                            : (language === 'en' ? `Study Champion (Rank ${activeRank})` : `ପଠନ ଚାମ୍ପିଅନ୍ (Rank ${activeRank})`)}
                      </h4>
                      <p className="text-[7px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        {isSundayClosed 
                          ? (language === 'en' ? 'Sunday Reset' : 'ରବିବାର ରିସେଟ୍')
                          : (language === 'en' ? 'Top Study Time This Week' : 'ସପ୍ତାହର ସର୍ବାଧିକ ପଠନ')}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg shrink-0 ${
                      isSundayClosed
                        ? 'bg-slate-800 border-slate-700 text-slate-500'
                        : displayedStudent?.id === user?.id
                          ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                          : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {isSundayClosed ? (
                        <Lucide.Timer size={14} />
                      ) : (
                        <Lucide.Trophy size={14} className={displayedStudent?.id === user?.id ? 'animate-bounce' : ''} />
                      )}
                    </div>
                  </div>

                  {isSundayClosed ? (
                    <div className="my-6 text-center space-y-2">
                      <Lucide.Hourglass className="mx-auto text-yellow-500/60 animate-spin" size={24} />
                      <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                        {language === 'en' 
                          ? 'Weekly Leaderboard is resetting. Check back tomorrow for the new lineup!' 
                          : 'ରବିବାର ପାଇଁ ମାନ୍ୟତା ତାଲିକା ରିସେଟ୍ ହେଉଛି। ଆସନ୍ତାକାଲି ନୂଆ ତାଲିକା ଦେଖନ୍ତୁ!'}
                      </p>
                    </div>
                  ) : displayedStudent ? (
                    <div className="flex items-center gap-3 my-3">
                      <div className="relative shrink-0">
                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden bg-white/5 shadow-md ${
                          displayedStudent.id === user.id ? 'border-yellow-500/50 ring-4 ring-yellow-500/10' : 'border-white/10'
                        }`}>
                          {displayedStudent.avatar ? (
                            <img 
                              src={displayedStudent.avatar} 
                              alt={displayedStudent.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          ) : (
                            <span className="text-sm font-black text-white">
                              {(displayedStudent.name || 'S')[0]}
                            </span>
                          )}
                        </div>
                        {displayedStudent.id === user.id && (
                          <div className="absolute -top-1.5 -right-1 bg-yellow-500 text-slate-950 p-0.5 rounded-full shadow-[0_0_8px_#eab308]">
                            <Lucide.Crown size={8} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {displayedStudent.id === user.id 
                            ? (language === 'en' ? 'You! (Study Champion)' : 'ଆପଣ! (ଚାମ୍ପିଅନ୍)')
                            : displayedStudent.name
                          }
                        </h3>
                        {displayedStudent.school && (
                          <p className="text-[9px] text-slate-400 truncate font-semibold flex items-center gap-1 mt-0.5">
                            <Lucide.School size={10} className="text-slate-500 shrink-0" />
                            {displayedStudent.school}
                          </p>
                        )}
                        {displayedStudent.district && (
                          <p className="text-[9px] text-slate-400 truncate font-semibold flex items-center gap-1 mt-0.5">
                            <Lucide.MapPin size={10} className="text-slate-500 shrink-0" />
                            {displayedStudent.district}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="my-6 text-center space-y-2 py-2 border border-dashed border-white/5 rounded-2xl bg-white/5">
                      <Lucide.UserPlus className="mx-auto text-slate-500 animate-pulse" size={20} />
                      <p className="text-[8px] sm:text-[9.5px] font-black text-slate-400 leading-normal uppercase tracking-wider">
                        {language === 'en' ? 'Spot Available!' : 'ସ୍ଥାନ ଖାଲି ଅଛି!'}
                      </p>
                      <p className="text-[7px] text-slate-500 max-w-[80%] mx-auto leading-tight">
                        {language === 'en' 
                          ? 'Study more to claim this rank this week!' 
                          : 'ଏହି ସ୍ଥାନ ହାସଲ କରିବା ପାଇଁ ଅଧିକ ପାଠ ପଢନ୍ତୁ!'}
                      </p>
                    </div>
                  )}

                  {!isSundayClosed && (
                    <>
                      <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          {language === 'en' ? 'Study Time' : 'ପଠନ ସମୟ'}
                        </span>
                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {(() => {
                            const mins = displayedStudent?.totalStudyMinutes || 0;
                            const hrs = Math.floor(mins / 60);
                            const m = mins % 60;
                            return `${hrs}h ${m}m`;
                          })()}
                        </span>
                      </div>

                      <p className="text-[8px] sm:text-[9.5px] font-bold text-slate-400 leading-relaxed mt-3">
                        {displayedStudent
                          ? displayedStudent.id === user?.id
                            ? (language === 'en' 
                                ? "Amazing! You are leading the charts. Keep it up! 🌟" 
                                : "ଚମତ୍କାର! ଆପଣ ସବୁଠୁ ଆଗରେ ଅଛନ୍ତି | ଏମିତି ପଢା ଜାରି ରଖନ୍ତୁ! 🌟")
                            : (language === 'en'
                                ? `Rank ${activeRank} Champion. Keep studying to beat them! 💪`
                                : `Rank ${activeRank} ଚାମ୍ପିଅନ୍। ସେମାନଙ୍କୁ ପଛରେ ପକାଇବା ପାଇଁ ପଢା ଜାରି ରଖନ୍ତୁ! 💪`)
                          : (language === 'en'
                              ? "Become the next Study Champion! Keep studying hard! 💪"
                              : "ପରବର୍ତ୍ତୀ ଚାମ୍ପିଅନ୍ ହେବା ପାଇଁ ପାଠପଢ଼ା ଜାରି ରଖନ୍ତୁ! 💪")
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Motivation Insight */}
            <div className="md:col-span-1">
              <div className="glass-card rounded-[2rem] p-4 sm:p-6 border-blue-500/20 bg-slate-900/40 relative overflow-hidden flex flex-col justify-center h-full hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-500">
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3 relative z-10">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Lucide.Sparkles size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h4 className="text-[7px] sm:text-[9px] font-black text-blue-400 uppercase tracking-wider">{language === 'en' ? "Today's Inspiration" : 'ଆଜିର ପ୍ରେରଣା'}</h4>
                    <p className="text-slate-300 text-[9px] sm:text-xs font-bold leading-relaxed italic tracking-tight line-clamp-4">"{todayQuote}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Stats & Global Rankings */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-6 lg:gap-8">
            <OdishaLiveMap language={language} />

            {/* Learning Progress Matrix */}
            <div className="glass-card rounded-[2rem] p-4 sm:p-6 border-white/5 space-y-3 sm:space-y-4 flex flex-col hover:border-white/10 hover:-translate-y-1 transition-all duration-500 h-[250px] sm:h-[300px] lg:h-auto overflow-hidden">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2.5 truncate">
                <div className="p-1 sm:p-1.5 bg-emerald-500/10 rounded-lg sm:rounded-xl text-emerald-500 border border-emerald-500/20 shrink-0">
                  <Lucide.BarChart3 size={14} className="sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-[11px] sm:text-md font-black text-white tracking-tight truncate">
                  {language === 'en' ? 'Subject Mastery' : 'ବିଷୟରେ ଦକ୍ଷତା'}
                </h3>
              </div>
              <Lucide.TrendingUp size={12} className="text-emerald-500 hidden sm:block shrink-0" />
            </div>

            <div className="space-y-2.5 sm:space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {user?.subject_progress && Object.entries(user.subject_progress).length > 0 ? (
                Object.entries(user.subject_progress).map(([subject, progress]: [string, any], idx) => (
                  <div key={subject} className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[70%]">
                        {translations[language].subjects?.[subject] || subject}
                      </span>
                      <span className="text-[8px] sm:text-[10px] font-black text-emerald-400 tabular-nums">{progress}%</span>
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
                  <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest leading-relaxed">
                    {language === 'en' ? (
                      <>No data detected.<br/>Commence learning protocols.</>
                    ) : (
                      <>କୌଣସି ଡାଟା ମିଳିଲା ନାହିଁ ।<br/>ପଢ଼ା ଆରମ୍ଭ କରନ୍ତୁ ।</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Achievement Nodes */}
          <div className="glass-card rounded-3xl p-5 md:p-6 border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-500/10 rounded-xl text-purple-500 border border-purple-500/20">
                  <Lucide.Award size={16} />
                </div>
                <h3 className="text-md font-black text-white tracking-tight">{t.badges}</h3>
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
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">
                    {language === 'en' ? 'No nodes unlocked' : 'କୌଣସି ପଦକ ଅନ୍‌ଲକ୍ ହୋଇନାହିଁ'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Statewide Leaderboard Section */
        <div className="space-y-6 sm:space-y-8 force-dark-theme">
          {/* Header Summary Card */}
          <div className="glass-card rounded-[2rem] p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-slate-900/40 to-indigo-950/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-500/30 transition-all duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
            <div className="space-y-2 text-center md:text-left flex-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest inline-block animate-pulse">
                🏆 {language === 'en' ? 'Gamification Arena' : 'ଗେମିଫିକେସନ୍ ଆରେନା'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {language === 'en' ? 'Statewide Regional Leaderboard' : 'ରାଜ୍ୟସ୍ତରୀୟ ଆଞ୍ଚଳିକ ଲିଡରବୋର୍ଡ'}
              </h2>
              <p className="text-xs text-slate-400 font-bold max-w-xl">
                {language === 'en'
                  ? 'Track your rank, sync daily challenges, and earn exclusive Odia scholar badges as you compete with students across Odisha!'
                  : 'ଆପଣଙ୍କର ମାନ୍ୟତା ଟ୍ରାକ୍ କରନ୍ତୁ, ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ ସମାଧାନ କରନ୍ତୁ ଏବଂ ଓଡ଼ିଶାର ଅନ୍ୟ ଛାତ୍ରମାନଙ୍କ ସହ ପ୍ରତିଦ୍ୱନ୍ଦ୍ୱିତା କରି ଓଡ଼ିଆ ସ୍କଲାର ବ୍ୟାଜ୍ ହାସଲ କରନ୍ତୁ!'}
              </p>
            </div>

            {/* Quick Stats Block */}
            <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-3xl border border-white/5 shrink-0 w-full md:w-auto justify-around md:justify-start">
              <div className="text-center px-4 border-r border-white/5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'en' ? 'Your Rank' : 'ଆପଣଙ୍କ ରାଙ୍କ'}</p>
                <p className="text-lg font-black text-emerald-400 font-mono">
                  #{combinedLeaderboard.findIndex(s => s.id === user?.id) + 1 || '-'}
                </p>
              </div>
              <div className="text-center px-4 border-r border-white/5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'en' ? 'Current Tier' : 'ଆପଣଙ୍କ ସ୍ତର'}</p>
                <p className="text-lg font-black text-amber-400 font-mono">
                  Lvl {getBadgeInfo(user?.points || 0).level}
                </p>
              </div>
              <div className="text-center px-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'en' ? 'Daily MCQ' : 'ଦୈନିକ MCQ'}</p>
                <p className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  user?.points_today > 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                }`}>
                  {user?.points_today > 0
                    ? (language === 'en' ? 'Completed' : 'ସମାପ୍ତ')
                    : (language === 'en' ? 'Pending' : 'ବାକି ଅଛି')}
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Table Content with Sidebar-styled filters */}
          <div className="glass-card rounded-[2.5rem] p-4 sm:p-6 md:p-8 border-white/5 bg-slate-900/40 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20">
                  <Lucide.Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-md font-black text-white tracking-tight">
                    {language === 'en' ? 'Odisha District Rankings' : 'ଓଡ଼ିଶା ଜିଲ୍ଲା ମାନ୍ୟତା ତାଲିକା'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {language === 'en' ? 'Ranked by overall study effort' : 'ସାମଗ୍ରିକ ପଠନ ପ୍ରୟାସ ଉପରେ ଆଧାରିତ'}
                  </p>
                </div>
              </div>

              {/* District Filter Component */}
              <DistrictLeaderboardFilter 
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                language={language}
              />
            </div>

            {/* Top Students Ranked List */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Rank' : 'ମାନ୍ୟତା'}</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Student' : 'ଛାତ୍ର'}</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'District' : 'ଜିଲ୍ଲା'}</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Badge Title' : 'ପଦକ ଆଖ୍ୟା'}</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-center">{language === 'en' ? 'Daily MCQ' : 'ଦୈନିକ MCQ'}</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-right">{language === 'en' ? 'XP Points' : 'XP ପଏଣ୍ଟ'}</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-right">{language === 'en' ? 'Action' : 'କାର୍ଯ୍ୟ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.map((student, idx) => {
                    const isCurrentUser = student.id === user?.id;
                    const badgeInfo = getBadgeInfo(student.points || 0);
                    const globalRank = combinedLeaderboard.findIndex(s => s.id === student.id) + 1;
                    
                    return (
                      <tr 
                        key={student.id} 
                        className={`hover:bg-white/5 transition-all duration-200 ${
                          isCurrentUser 
                            ? 'bg-emerald-500/5 border-l-4 border-l-emerald-500' 
                            : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* Rank Position */}
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            globalRank === 1 ? 'bg-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                            globalRank === 2 ? 'bg-slate-300 text-slate-950 shadow-[0_0_15px_rgba(203,213,225,0.4)]' :
                            globalRank === 3 ? 'bg-amber-600 text-slate-950 shadow-[0_0_15px_rgba(217,119,6,0.4)]' :
                            'text-slate-500'
                          }`}>
                            {globalRank}
                          </div>
                        </td>

                        {/* Name and School */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                              {student.avatar ? (
                                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-black text-white uppercase">{student.name?.[0] || 'S'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span className={isCurrentUser ? 'text-emerald-400' : 'text-white'}>
                                  {student.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black uppercase tracking-wider">
                                    {language === 'en' ? 'You' : 'ଆପଣ'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-500 font-semibold block mt-0.5 max-w-[200px] truncate">
                                {student.school || (language === 'en' ? 'Regional High School' : 'ଆଞ୍ଚଳିକ ଉଚ୍ଚ ବିଦ୍ୟାଳୟ')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* District name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                            <Lucide.MapPin size={12} className="text-slate-500 shrink-0" />
                            <span>
                              {(() => {
                                const matched = ODISHA_DISTRICTS.find(d => d.en.toLowerCase() === student.district?.toLowerCase());
                                return matched 
                                  ? (language === 'en' ? matched.en : matched.or)
                                  : student.district;
                              })()}
                            </span>
                          </div>
                        </td>

                        {/* Rank Badge */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-black text-slate-400 border border-white/5 font-mono">
                              Lvl {badgeInfo.level}
                            </span>
                            <span className="text-xs font-black text-amber-400 uppercase tracking-tight">
                              {badgeInfo.title}
                            </span>
                          </div>
                        </td>

                        {/* Daily MCQ Completion check */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            {student.dailyCompleted ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" title="Daily Challenge Completed!">
                                <Lucide.Check size={12} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-600" title="Daily Challenge Pending">
                                <Lucide.Clock size={10} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* XP Points */}
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1 text-emerald-400 font-mono font-black text-xs">
                            <Lucide.Zap size={12} className="text-amber-500 shrink-0 animate-pulse" />
                            <span>{student.points || 0} XP</span>
                          </div>
                        </td>

                        {/* Action buttons (Follow/Friends) */}
                        <td className="px-6 py-4 text-right">
                          {student.id !== user?.id && (
                            <button
                              onClick={() => onToggleFollow?.(student.id)}
                              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                following?.includes(student.id)
                                  ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-red-950/40 hover:text-red-400'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/20 shadow-sm'
                              }`}
                            >
                              {following?.includes(student.id)
                                ? (language === 'en' ? 'Following' : 'ଅନୁସରଣ କରୁଛନ୍ତି')
                                : (language === 'en' ? '+ Follow' : '+ ଅନୁସରଣ')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* AI Disclaimer */}
          <div className="max-w-7xl mx-auto px-6 mt-12 mb-8 space-y-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] text-center bg-white/5 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
              <span className="text-amber-500/80 mr-2">◆</span>
              {language === 'en' 
                ? 'AI systems can make mistakes. Please double-check critical information with your textbooks.' 
                : 'AI ସିଷ୍ଟମ୍ ଭୁଲ୍ କରିପାରେ। ଦୟାକରି ଆପଣଙ୍କ ପାଠ୍ୟପୁସ୍ତକ ସହିତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା ଯାଞ୍ଚ କରନ୍ତୁ।'}
              <span className="text-amber-500/80 ml-2">◆</span>
            </p>

            {/* SOCIAL MEDIAS ROW */}
            <div className="flex items-center justify-center gap-4 bg-slate-900/40 py-4 px-6 rounded-3xl border border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">{language === 'en' ? 'Connect:' : 'ଯୋଗାଯୋଗ:'}</span>
              <a
                href="https://www.facebook.com/share/1JAq6DY6Sq/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre Facebook page"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/25 bg-blue-500/10 text-blue-500 transition-all hover:bg-blue-500 hover:text-white hover:scale-110 active:scale-95"
              >
                <Lucide.Facebook size={18} />
              </a>
              <a
                href="https://instagram.com/utkalskillcentre"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre Instagram profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-400/25 bg-pink-500/10 text-pink-500 transition-all hover:bg-pink-500 hover:text-white hover:scale-110 active:scale-95"
              >
                <Lucide.Instagram size={18} />
              </a>
              <a
                href="https://whatsapp.com/channel/utkalskillcentre"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre WhatsApp channel"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-500 transition-all hover:bg-emerald-500 hover:text-white hover:scale-110 active:scale-95"
              >
                <Lucide.MessageSquare size={18} />
              </a>
              <a
                href="https://www.youtube.com/@UtkalSkillCenter"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre YouTube channel"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 text-red-500 transition-all hover:bg-red-500 hover:text-white hover:scale-110 active:scale-95"
              >
                <Lucide.Youtube size={18} />
              </a>
            </div>
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
