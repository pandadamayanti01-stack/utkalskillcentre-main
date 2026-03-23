import React, { useState } from 'react';
import { 
  Trophy, 
  Medal, 
  Crown, 
  TrendingUp, 
  Users, 
  Globe, 
  Zap, 
  Flame, 
  Star,
  ChevronRight,
  Search,
  Filter,
  Award,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  streak: number;
  level: number;
  league: string;
  avatar?: string;
  rank?: number;
}

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  user: any;
  language: 'en' | 'or';
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ leaderboard, user, language }) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedLeaderboard = [...leaderboard]
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const filteredLeaderboard = sortedLeaderboard.filter(entry => 
    entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = sortedLeaderboard.slice(0, 3);
  const others = filteredLeaderboard.slice(3);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Trophy size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Global <span className="text-amber-500">Leaderboard</span></h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
              Compete with students across Odisha Board
            </p>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('global')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'global' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <Globe size={14} className="inline mr-2" />
            Global
          </button>
          <button 
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'friends' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <Users size={14} className="inline mr-2" />
            Friends
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-12 pb-8">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-2 md:order-1 flex flex-col items-center"
          >
            <div className="relative mb-4 group">
              <div className="w-24 h-24 rounded-[2rem] bg-slate-800 border-4 border-slate-400/30 p-1 flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-110 transition-transform">
                <img src={topThree[1].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[1].name}`} alt={topThree[1].name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-slate-400 border-4 border-slate-950 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg">
                2
              </div>
            </div>
            <h3 className="text-lg font-black text-white mb-1 truncate max-w-[150px]">{topThree[1].name}</h3>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-400/10 border border-slate-400/20 text-slate-400 text-xs font-black">
              <Zap size={12} fill="currentColor" />
              {topThree[1].points} XP
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {topThree[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="order-1 md:order-2 flex flex-col items-center -mt-8"
          >
            <div className="relative mb-6 group">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce">
                <Crown size={40} fill="currentColor" />
              </div>
              <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800 border-4 border-amber-500 p-1 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden group-hover:scale-110 transition-transform">
                <img src={topThree[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[0].name}`} alt={topThree[0].name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full bg-amber-500 border-4 border-slate-950 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
                1
              </div>
            </div>
            <h3 className="text-2xl font-black text-white mb-1 truncate max-w-[200px]">{topThree[0].name}</h3>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-black shadow-lg">
              <Zap size={14} fill="currentColor" />
              {topThree[0].points} XP
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="order-3 flex flex-col items-center"
          >
            <div className="relative mb-4 group">
              <div className="w-20 h-20 rounded-[1.5rem] bg-slate-800 border-4 border-orange-500/30 p-1 flex items-center justify-center shadow-2xl overflow-hidden group-hover:scale-110 transition-transform">
                <img src={topThree[2].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[2].name}`} alt={topThree[2].name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-orange-500 border-4 border-slate-950 flex items-center justify-center text-slate-950 font-black text-base shadow-lg">
                3
              </div>
            </div>
            <h3 className="text-lg font-black text-white mb-1 truncate max-w-[150px]">{topThree[2].name}</h3>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-black">
              <Zap size={12} fill="currentColor" />
              {topThree[2].points} XP
            </div>
          </motion.div>
        )}
      </div>

      {/* League Progression */}
      <div className="glass-card neon-border rounded-[2.5rem] p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Award size={24} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">League Progression</h3>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest">
            {user?.league || 'Bronze'} League
          </div>
        </div>

        <div className="relative pt-10 pb-4">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '45%' }}
              className="h-full bg-gradient-to-r from-orange-500 via-slate-400 to-yellow-400"
            />
          </div>
          
          <div className="relative flex justify-between">
            {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((league, idx) => (
              <div key={league} className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-4 border-slate-950 shadow-xl transition-all ${idx <= 1 ? 'bg-slate-800 text-white border-blue-500/50 scale-110' : 'bg-slate-900 text-slate-700 border-white/5'}`}>
                  <Trophy size={20} className={idx === 0 ? 'text-orange-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-yellow-400' : idx === 3 ? 'text-blue-400' : 'text-purple-400'} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${idx <= 1 ? 'text-white' : 'text-slate-600'}`}>{league}</span>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-center text-xs text-slate-500 font-medium">
          Earn <span className="text-white font-bold">500 more XP</span> this week to promote to <span className="text-yellow-400 font-bold">Gold League</span>!
        </p>
      </div>

      {/* Search & List */}
      <div className="space-y-4">
        <div className="relative group max-w-md mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-500 transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Search students..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all backdrop-blur-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="glass-card rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rank</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">League</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Streak</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {others.map((entry) => (
                  <motion.tr 
                    key={entry.id}
                    variants={itemVariants}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors group ${entry.name === user?.name ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="px-8 py-4">
                      <span className={`text-sm font-black ${entry.rank && entry.rank <= 10 ? 'text-white' : 'text-slate-500'}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 overflow-hidden group-hover:scale-110 transition-transform">
                          <img src={entry.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.name}`} alt={entry.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className={`text-sm font-black ${entry.name === user?.name ? 'text-amber-500' : 'text-white'}`}>
                            {entry.name}
                            {entry.name === user?.name && <span className="ml-2 text-[10px] font-black uppercase text-amber-500/60">(You)</span>}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Level {entry.level}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 w-fit">
                        <Award size={12} className={entry.league === 'Gold' ? 'text-yellow-400' : entry.league === 'Silver' ? 'text-slate-400' : 'text-orange-400'} />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{entry.league}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-1.5 text-orange-400 font-black text-sm">
                        <Flame size={14} fill="currentColor" />
                        {entry.streak}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-white font-black text-base">
                        <Zap size={16} className="text-amber-500" fill="currentColor" />
                        {entry.points.toLocaleString()}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {others.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700 border border-dashed border-white/10">
                <Users size={32} />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No other students found</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-amber-500/10 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Rank</p>
            <p className="text-xl font-black text-white">#{sortedLeaderboard.findIndex(e => e.name === user?.name) + 1 || '-'}</p>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Medal size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Reward</p>
            <p className="text-xl font-black text-white">500 XP to Gold</p>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weekly Goal</p>
            <p className="text-xl font-black text-white">85% Complete</p>
          </div>
        </div>
      </div>
    </div>
  );
};
