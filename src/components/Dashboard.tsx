import React from 'react';
import { motion } from 'motion/react';
import { Brain, BarChart3, CheckCircle2, Globe, Flame, Target, Trophy, Zap, Award, Sparkles, Star } from 'lucide-react';
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
  onChallengeComplete?: () => void;
}

export function Dashboard({ user, leaderboard, language, isPremium, onUpgrade, chapters, dailyChallenge, onChallengeComplete }: DashboardProps) {
  const t = translations[language];
  const userRank = leaderboard.findIndex((s: any) => s.name === user.name) + 1 || '-';
  
  const dailyGoal = 500;
  const dailyProgress = Math.min(((user?.points_today || 0) / dailyGoal) * 100, 100);

  const stats = [
    { label: t.pointsToday, value: user?.points_today || 0, icon: <Zap size={20} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t.currentStreak, value: `${user?.streak || 0} ${t.activeStreak}`, icon: <Flame size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t.levelUp, value: `Lvl ${user?.level || 1}`, icon: <Trophy size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t.nextLeague, value: user?.league || 'Bronze', icon: <Award size={20} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const proTips = [
    "Consistency is key! Try to maintain your streak for bonus XP.",
    "Use the AI Solver for complex math problems to see step-by-step solutions.",
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
      className="space-y-8 pb-20"
    >
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight">
            {language === 'en' ? 'Welcome back,' : 'ସ୍ୱାଗତ,'} <span className="text-emerald-500">{user?.name || 'Student'}!</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em]">
            {t.keepGoing} • {new Date().toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-md flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.dailyGoal}</p>
              <p className="text-sm font-black text-white">{user?.points_today || 0} / {dailyGoal} XP</p>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * dailyProgress) / 100} className="text-emerald-500 transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target size={14} className="text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            className="glass-card neon-border rounded-[2rem] p-6 flex flex-col items-center text-center space-y-3 group hover:scale-105 transition-all"
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl font-black text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Progress Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card neon-border rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <BarChart3 size={24} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Learning Progress</h3>
              </div>
              <button className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">View Detailed Report</button>
            </div>

            <div className="space-y-6">
              {user?.subject_progress && Object.entries(user.subject_progress).length > 0 ? (
                Object.entries(user.subject_progress).map(([subject, progress]: [string, any], idx) => (
                  <div key={subject} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-black text-white uppercase tracking-widest">{translations[language].subjects?.[subject] || subject}</span>
                      <span className="text-xs font-bold text-slate-500">{progress}% Complete</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
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
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                    <BarChart3 size={32} />
                  </div>
                  <p className="text-slate-500 font-mono text-sm max-w-xs mx-auto">No progress recorded yet. Start learning to see your progress!</p>
                </div>
              )}
            </div>
          </div>

          {/* Pro Tip Section */}
          <div className="glass-card rounded-[2rem] p-8 border border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Sparkles size={32} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Pro Tip of the Day</h4>
              <p className="text-white font-medium leading-relaxed italic">"{randomTip}"</p>
            </div>
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
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

          {/* Recent Badges */}
          <div className="glass-card neon-border rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <Award size={24} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Achievements</h3>
              </div>
              <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">All</button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {user?.stats?.badges && user.stats.badges.length > 0 ? (
                user.stats.badges.slice(0, 3).map((badge: string, i: number) => (
                  <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group cursor-help relative">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                      <Star size={20} fill={i === 0 ? "currentColor" : "none"} />
                    </div>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-[8px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {badge}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 p-8 border border-dashed border-white/10 rounded-3xl text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No badges yet</p>
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
