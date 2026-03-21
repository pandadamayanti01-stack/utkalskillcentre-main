import React from 'react';
import { motion } from 'motion/react';
import { Brain, BarChart3, CheckCircle2, Globe, Flame } from 'lucide-react';
import { translations } from '../translations';

interface DashboardProps {
  user: any;
  leaderboard: any[];
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade: () => void;
  chapters: any[];
}

export function Dashboard({ user, leaderboard, language, isPremium, onUpgrade, chapters }: DashboardProps) {
  const userRank = leaderboard.findIndex((s: any) => s.name === user.name) + 1 || '-';
  const stats = {
    streak: user.streak || 0,
    level: Math.floor((user.points || 0) / 1000) + 1,
    experience: (user.points || 0) % 1000 / 10,
    accuracy: user.stats?.accuracy || 0,
    league: user.stats?.league || 'Bronze',
    badges: user.stats?.badges || [],
    weeklyPoints: user.points || 0
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
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
      className="space-y-8"
    >
      {/* Top Section: Level & League */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card neon-border rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-slate-800/50 border border-white/10 p-2 flex items-center justify-center shadow-2xl relative group">
                <img src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'} alt="Avatar" className="w-full h-full group-hover:scale-110 transition-transform" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-slate-900 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                  {stats.level}
                </div>
              </div>
              <div>
                <h3 className="text-4xl font-black text-white mb-1 tracking-tight">
                  {translations[language].level} <span className="text-gradient">{stats.level}</span>
                </h3>
                <p className="text-emerald-400 text-sm font-medium uppercase tracking-widest">Next Level in {100 - stats.experience} XP</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest shadow-xl">
              {translations[language][stats.league.toLowerCase() as keyof typeof translations[typeof language]]}
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            <div className="h-4 bg-black/40 rounded-full overflow-hidden p-1 border border-white/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.experience}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-blue-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span>Level {stats.level}</span>
              <span>Level {stats.level + 1}</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none"></div>
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.3 }}
            className="w-20 h-20 rounded-3xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-6 shadow-[0_0_30px_rgba(249,115,22,0.3)] border border-orange-500/30 group-hover:scale-110 transition-transform"
          >
            <Flame size={40} className={stats.streak > 0 ? 'animate-bounce' : ''} />
          </motion.div>
          <div className="text-5xl font-black text-white mb-2 tracking-tighter">{stats.streak} <span className="text-2xl text-slate-400 font-medium">{translations[language].streak}</span></div>
          <p className="text-orange-400/80 text-sm font-medium uppercase tracking-widest">
            {stats.streak > 0 ? "You're on fire!" : "Start your streak today!"}
          </p>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<BarChart3 className="text-emerald-500" />} label={translations[language].effortPoints} value={stats.weeklyPoints} subValue="This Week" />
        <StatCard icon={<CheckCircle2 className="text-blue-500" />} label={translations[language].accuracy} value={`${stats.accuracy}%`} subValue="Avg. Score" />
        <StatCard icon={<Globe className="text-purple-500" />} label={translations[language].badges} value={stats.badges.length} subValue="Earned" />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{translations[language].myProgress}</h3>
          </div>
          <div className="glass-card rounded-3xl p-8">
            <div className="space-y-6">
              {user.completed_chapters && user.completed_chapters.length > 0 ? (
                user.completed_chapters.slice(0, 3).map((chapterId: string, i: number) => {
                  const chapter = chapters.find((c: any) => c.id === chapterId);
                  return (
                    <TopicProgress 
                      key={i} 
                      label={chapter?.title || "Unknown Topic"} 
                      progress={100} 
                      color="bg-gradient-to-r from-emerald-400 to-cyan-400" 
                    />
                  );
                })
              ) : (
                <p className="text-slate-500 text-center py-4 font-mono text-sm">No progress recorded yet. Start learning to see your progress!</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{translations[language].badges}</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {stats.badges && stats.badges.length > 0 ? (
                stats.badges.map((badge: string, i: number) => (
                  <div key={i} className="flex-shrink-0 w-20 h-20 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center text-3xl hover:scale-110 transition-all cursor-help">
                    {badge === 'first_quiz' ? '🌟' : badge === 'streak_3' ? '🔥' : '🏅'}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No badges earned yet. Complete quizzes to earn badges!</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
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
        <span className="text-sm text-slate-400 font-medium uppercase tracking-wider">{label}</span>
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
        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{label}</span>
        <span className="text-xs font-bold text-slate-500">{progress}%</span>
      </div>
      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full rounded-full ${color} shadow-lg shadow-current/20`}
        />
      </div>
    </div>
  );
}
