import React from 'react';
import { motion } from 'motion/react';
import { Brain, BarChart3, CheckCircle2, Globe, Flame, MessageCircle, Target, Trophy, Zap, Award, Sparkles, Star } from 'lucide-react';
import { translations } from '../translations';
import { DailyChallenge } from './DailyChallenge';

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
}

export function Dashboard({ user, leaderboard, language, isPremium, onUpgrade, chapters, dailyChallenge, hasDailyPractice, todayDailySubject, tomorrowDailySubject, onChallengeComplete, onOpenTutor, onOpenDailyPractice, onShareDailyPractice }: DashboardProps) {
  const t = translations[language];
  const userRank = leaderboard.findIndex((s: any) => s.id === user.id) + 1;
  const rankDisplay = userRank > 0 ? userRank : '-';
  
  const dailyGoal = 500;
  const dailyProgress = Math.min(((user?.points_today || 0) / dailyGoal) * 100, 100);

  const stats = [
    { label: t.pointsToday, value: user?.points_today || 0, icon: <Zap size={20} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t.rank, value: rankDisplay, icon: <Trophy size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t.currentStreak, value: `${user?.streak || 0} ${t.activeStreak}`, icon: <Flame size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t.nextLeague, value: user?.league || 'Bronze', icon: <Award size={20} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const proTips = [
    "Consistency is key! Try to maintain your streak for bonus XP.",
    "Use the AI Tutor for complex math problems to see step-by-step solutions.",
    "Take a monthly test to evaluate your overall progress in each subject.",
    "Practice makes perfect! Use the practice questions after every chapter.",
    "Compete in the leaderboard to stay motivated and earn rewards."
  ];

  const [randomTip] = React.useState(proTips[Math.floor(Math.random() * proTips.length)]);

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-6 pb-20"
    >
      {/* AI Tutor Card - Compact & Top-Aligned */}
      <motion.div 
        variants={itemVariants}
        onClick={onOpenTutor}
        className="glass-card neon-border rounded-3xl p-4 md:p-5 relative overflow-hidden cursor-pointer group hover:border-emerald-500/50 transition-all bg-gradient-to-br from-emerald-500/10 to-transparent"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none group-hover:bg-emerald-500/20 transition-colors"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
            <img src="/gundulu.png" alt="Gundulu" className="w-full h-full object-cover" onError={(e) => { console.error("Image failed to load:", e); e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <Brain size={28} className="text-emerald-500 hidden" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase tracking-widest">
                <Sparkles size={10} />
                Voice Enabled
              </div>
              <Zap size={14} className="text-emerald-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">Talk to Gundulu</h3>
            <p className="text-slate-400 text-[11px] font-medium line-clamp-1">Your AI tutor is ready to help. Tap to start a conversation!</p>
          </div>
        </div>
      </motion.div>

      {/* Welcome Section - More Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black text-white tracking-tight">
            {language === 'en' ? 'Welcome back,' : 'ସ୍ୱାଗତ,'} <span className="text-emerald-500">{user?.name || 'Student'}!</span>
          </h1>
          <p className="text-slate-400 text-[9px] font-medium uppercase tracking-[0.2em]">
            {t.keepGoing} • {new Date().toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/50 border border-white/5 backdrop-blur-md flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{t.dailyGoal}</p>
              <p className="text-[10px] font-black text-white">{user?.points_today || 0} / {dailyGoal} XP</p>
            </div>
            <div className="relative w-8 h-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-white/5" />
                <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={88} strokeDashoffset={88 - (88 * dailyProgress) / 100} className="text-emerald-500 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target size={10} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Smaller */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            className="glass-card neon-border rounded-xl p-3 flex flex-col items-center text-center space-y-1.5 group hover:scale-105 transition-all"
          >
            <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform`}>
              {React.cloneElement(stat.icon as any, { size: 16 })}
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-base font-black text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Progress Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="w-full text-left glass-card neon-border rounded-3xl p-4 md:p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-all bg-gradient-to-br from-cyan-500/10 to-transparent">
            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-cyan-500/20 transition-colors"></div>
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[9px] font-black uppercase tracking-[0.2em]">
                  <CheckCircle2 size={12} />
                  Daily Practice
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {language === 'en' ? 'MCQ Practice for Your Class' : 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ MCQ ଅଭ୍ୟାସ'}
                </h3>
                <p className="text-slate-400 text-[11px] font-medium max-w-xl leading-relaxed">
                  {hasDailyPractice
                    ? (language === 'en' ? 'New class-wise questions are available. Practice today and keep the habit going.' : 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ନୂଆ ପ୍ରଶ୍ନ ଉପଲବ୍ଧ ଅଛି | ଆଜିଠୁ ଅଭ୍ୟାସ ଜାରି ରଖନ୍ତୁ |')
                    : (language === 'en' ? 'Open the practice tab to check whether today\'s question set has been published.' : 'ଆଜିର ପ୍ରଶ୍ନ ସେଟ୍ ପ୍ରକାଶିତ ହୋଇଛି କି ନାହିଁ ଦେଖିବାକୁ ଅଭ୍ୟାସ ଟ୍ୟାବ୍ ଖୋଲନ୍ତୁ |')}
                </p>
                {(todayDailySubject || tomorrowDailySubject) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {todayDailySubject && (
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">
                        {language === 'en' ? 'Today:' : 'ଆଜି:'} {todayDailySubject}
                      </span>
                    )}
                    {tomorrowDailySubject && (
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {language === 'en' ? 'Tomorrow:' : 'ଆସନ୍ତାକାଲି:'} {tomorrowDailySubject}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={onOpenDailyPractice}
                  className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-cyan-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-cyan-500/20 transition-all"
                >
                  {language === 'en' ? 'Open Tab' : 'ଟ୍ୟାବ୍ ଖୋଲନ୍ତୁ'}
                </button>
                <button
                  type="button"
                  onClick={onShareDailyPractice}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500/20 transition-all"
                >
                  <MessageCircle size={12} />
                  {language === 'en' ? 'Share Test' : 'ଟେଷ୍ଟ ଶେୟାର କରନ୍ତୁ'}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card neon-border rounded-3xl p-3 md:p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <BarChart3 size={16} />
                </div>
                <h3 className="text-sm font-black text-white tracking-tight">Learning Progress</h3>
              </div>
              <button className="text-[8px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">View Detailed Report</button>
            </div>

            <div className="space-y-2">
              {user?.subject_progress && Object.entries(user.subject_progress).length > 0 ? (
                Object.entries(user.subject_progress).map(([subject, progress]: [string, any], idx) => (
                  <div key={subject} className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{translations[language].subjects?.[subject] || subject}</span>
                      <span className="text-[9px] font-bold text-slate-500">{progress}% Complete</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, delay: idx * 0.2 }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 space-y-2">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                    <BarChart3 size={20} />
                  </div>
                  <p className="text-slate-500 font-mono text-[10px] max-w-[180px] mx-auto">No progress recorded yet. Start learning to see your progress!</p>
                </div>
              )}
            </div>
          </div>

          {/* Pro Tip Section - Smaller */}
          <div className="glass-card rounded-2xl p-3 border border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-[7px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">Pro Tip of the Day</h4>
              <p className="text-white text-[11px] font-medium leading-tight italic">"{randomTip}"</p>
            </div>
          </div>
        </div>

        {/* Sidebar Sections - More Compact */}
        <div className="space-y-6">
          {/* Daily Challenge */}
          {dailyChallenge && (
            <motion.div variants={itemVariants}>
              <DailyChallenge 
                challenge={dailyChallenge} 
                user={user} 
                language={language} 
                onComplete={onChallengeComplete || (() => {})}
              />
            </motion.div>
          )}

          {/* Recent Badges - Smaller */}
          <div className="glass-card neon-border rounded-3xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <Award size={14} />
                </div>
                <h3 className="text-sm font-black text-white tracking-tight">Achievements</h3>
              </div>
              <button className="text-[7px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">All</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {user?.stats?.badges && user.stats.badges.length > 0 ? (
                user.stats.badges.slice(0, 3).map((badge: string, i: number) => (
                  <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group cursor-help relative">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Star size={14} fill={i === 0 ? "currentColor" : "none"} />
                    </div>
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-slate-900 border border-white/10 text-[7px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {badge}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 p-3 border border-dashed border-white/10 rounded-2xl text-center">
                  <p className="text-slate-500 text-[7px] font-black uppercase tracking-widest">No badges yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
