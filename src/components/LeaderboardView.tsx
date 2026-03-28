import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Flame } from 'lucide-react';
import { translations } from '../translations';

type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface LeaderboardViewProps {
  leaderboard: any[];
  language: 'en' | 'or';
  onBack: () => void;
  following: string[];
  user: any;
}

export function LeaderboardView({ leaderboard, language, onBack, following, user }: LeaderboardViewProps) {
  const [activeFilter, setActiveFilter] = useState<'league' | 'friends'>('league');
  const [activeLeague, setActiveLeague] = useState<League>('Bronze');
  const leagues: League[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

  const filteredLeaderboard = leaderboard.filter((s: any) => {
    if (activeFilter === 'friends') {
      return following.includes(s.id) || s.id === user.id;
    }
    // In a real app, this would be based on student.stats.league
    const idx = leaderboard.indexOf(s);
    if (idx < 10) return activeLeague === 'Platinum';
    if (idx < 25) return activeLeague === 'Gold';
    if (idx < 50) return activeLeague === 'Silver';
    return activeLeague === 'Bronze';
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div variants={itemVariants} className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].weeklyLeaderboard}</h2>
        <p className="text-slate-500">Celebrate effort and consistency! Resets every Sunday.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
        <div className="flex p-1 bg-slate-900/50 border border-white/5 rounded-2xl">
          <button
            onClick={() => setActiveFilter('league')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeFilter === 'league' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {translations[language].leagues}
          </button>
          <button
            onClick={() => setActiveFilter('friends')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeFilter === 'friends' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {translations[language].friends}
          </button>
        </div>

        {activeFilter === 'league' && (
          <div className="flex justify-center gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit mx-auto">
            {leagues.map((league) => (
              <button
                key={league}
                onClick={() => setActiveLeague(league)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeLeague === league 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {translations[language][league.toLowerCase()]}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-[40px] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Rank</th>
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Student</th>
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Consistency</th>
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">{translations[language].effortPoints}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaderboard.length > 0 ? (
              filteredLeaderboard.map((student: any, i: number) => (
                <motion.tr 
                  variants={itemVariants}
                  key={i} 
                  className="border-b border-white/5 hover:bg-white/5 transition-all"
                >
                  <td className="px-8 py-6">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      leaderboard.indexOf(student) === 0 ? 'bg-yellow-500 text-slate-900' : 
                      leaderboard.indexOf(student) === 1 ? 'bg-slate-300 text-slate-900' : 
                      leaderboard.indexOf(student) === 2 ? 'bg-orange-500 text-slate-900' : 'text-slate-500'
                    }`}>
                      {leaderboard.indexOf(student) + 1}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                        {student?.avatar ? (
                          <img src={student.avatar} alt={student?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm font-bold">{student?.name?.[0] || 'S'}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white flex items-center gap-2">
                          {student?.name}
                          {student.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-400 text-[10px] font-black bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20">
                              <Flame size={10} fill="currentColor" />
                              {student.streak}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{translations[language].classes[student.class] || student.class}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <div key={day} className={`w-2 h-2 rounded-full ${day <= (i % 5 + 1) ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-mono text-emerald-400 font-bold">{student.points}</td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-500">
                  No students in this league yet. Keep practicing to move up!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      
      <motion.div variants={itemVariants} className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-center">
        <p className="text-emerald-400 text-sm font-medium">
          🌟 You are in the top 15% of effort makers this week! Keep it up!
        </p>
      </motion.div>
    </motion.div>
  );
}
