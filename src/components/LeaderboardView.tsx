import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Flame, Loader2, Crown, Trophy, Medal } from 'lucide-react';
import { translations } from '../translations';
import { db as firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface LeaderboardViewProps {
  leaderboard: any[];
  language: 'en' | 'or';
  onBack?: () => void;
  following: string[];
  user: any;
  onToggleFollow?: (targetUserId: string) => void;
}

export function LeaderboardView({ leaderboard, language, onBack, following, user, onToggleFollow }: LeaderboardViewProps) {
  const [activeFilter, setActiveFilter] = useState<'league' | 'friends'>('league');
  const [activeLeague, setActiveLeague] = useState<League>('Bronze');
  const leagues: League[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const [friendProfiles, setFriendProfiles] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    if (activeFilter !== 'friends' || following.length === 0) {
      setFriendProfiles([]);
      return;
    }
    const fetchFriendsProfiles = async () => {
      setLoadingFriends(true);
      try {
        const missingIds = following.filter(id => !leaderboard.some((s: any) => s.id === id));
        if (missingIds.length === 0) {
          setFriendProfiles([]);
          return;
        }
        const promises = missingIds.map(id => getDoc(doc(firestore, 'public_profiles', id)));
        const snaps = await Promise.all(promises);
        const fetched = snaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() }));
        setFriendProfiles(fetched);
      } catch (err) {
        console.error("Failed to fetch friend profiles:", err);
      } finally {
        setLoadingFriends(false);
      }
    };
    fetchFriendsProfiles();
  }, [activeFilter, following, leaderboard]);

  const filteredLeaderboard = useMemo(() => {
    if (activeFilter === 'friends') {
      const localFriends = leaderboard.filter((s: any) => following.includes(s.id) || s.id === user.id);
      const localFriendIds = new Set(localFriends.map(f => f.id));
      const extraFriends = friendProfiles.filter(f => !localFriendIds.has(f.id));
      return [...localFriends, ...extraFriends].sort((a, b) => (b.points || 0) - (a.points || 0));
    }
    // In a real app, this would be based on student.stats.league
    return leaderboard.filter((s: any) => {
      const idx = leaderboard.indexOf(s);
      if (idx < 10) return activeLeague === 'Platinum';
      if (idx < 25) return activeLeague === 'Gold';
      if (idx < 50) return activeLeague === 'Silver';
      return activeLeague === 'Bronze';
    });
  }, [activeFilter, activeLeague, leaderboard, following, friendProfiles, user.id]);

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
      {onBack && (
        <motion.button 
          variants={itemVariants}
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{language === 'en' ? 'Back to Dashboard' : 'ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ'}</span>
        </motion.button>
      )}

      <motion.div variants={itemVariants} className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].weeklyLeaderboard}</h2>
        <p className="text-slate-500">{language === 'en' ? 'Celebrate effort and consistency! Resets every Sunday.' : 'ପରିଶ୍ରମ ଓ ନିରନ୍ତରତାକୁ ଉତ୍ସାହିତ କରନ୍ତୁ! ପ୍ରତି ରବିବାର ଏହା ରିସେଟ୍ ହୁଏ।'}</p>
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
          <div className="flex flex-wrap justify-center gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit mx-auto">
            {leagues.map((league) => {
              const gradients: Record<League, string> = {
                Bronze: 'from-orange-700 to-amber-800 shadow-orange-900/30',
                Silver: 'from-slate-200 to-slate-400 shadow-slate-900/30 text-slate-900',
                Gold: 'from-yellow-300 to-amber-500 shadow-yellow-900/30 text-slate-900',
                Platinum: 'from-cyan-300 to-blue-500 shadow-cyan-900/30 text-slate-900'
              };
              const isActive = activeLeague === league;
              const isDarkText = league !== 'Bronze';
              
              return (
                <button
                  key={league}
                  onClick={() => setActiveLeague(league)}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? `bg-gradient-to-br ${gradients[league]} shadow-lg scale-105 ${isDarkText ? 'text-slate-900' : 'text-white'}` 
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {translations[language][league.toLowerCase()]}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* 🏆 PREMIUM PODIUM UI - X FACTOR 🏆 */}
      {!loadingFriends && filteredLeaderboard.length >= 3 && activeFilter === 'league' && (
        <motion.div variants={itemVariants} className="flex justify-center items-end gap-3 md:gap-8 pt-16 pb-12 w-full max-w-3xl mx-auto">
          {/* Rank 2 (Silver) */}
          <div className="flex flex-col items-center relative group w-1/3 max-w-[140px]">
            <div className="absolute -top-16 z-20 group-hover:-translate-y-2 transition-transform duration-500">
              <div className="w-16 h-16 rounded-full border-[3px] border-slate-300 bg-slate-800 overflow-hidden shadow-[0_0_25px_rgba(203,213,225,0.4)]">
                {filteredLeaderboard[1]?.avatar ? <img src={filteredLeaderboard[1].avatar} className="w-full h-full object-cover"/> : <span className="text-xl font-black flex items-center justify-center h-full text-white">{filteredLeaderboard[1]?.name?.[0] || 'S'}</span>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-slate-200 to-slate-400 rounded-full p-1.5 text-slate-900 shadow-lg border border-slate-100/50">
                <Medal size={14} fill="currentColor" />
              </div>
            </div>
            <div className="w-full h-32 md:h-40 bg-gradient-to-t from-slate-900/90 via-slate-800/80 to-slate-400/20 rounded-t-3xl border-t-[3px] border-x border-slate-300/40 flex flex-col items-center justify-start pt-6 shadow-[inset_0_20px_20px_rgba(203,213,225,0.1),0_0_30px_rgba(203,213,225,0.05)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_0%,transparent_100%)] opacity-50" />
              <span className="text-3xl font-black text-slate-300 drop-shadow-lg relative z-10">2</span>
              <span className="text-xs font-black mt-2 truncate w-[90%] text-center relative z-10" style={{ color: '#e2e8f0' }}>{filteredLeaderboard[1]?.name}</span>
              <span className="text-[10px] md:text-xs text-emerald-400 font-mono font-bold mt-0.5 relative z-10">{filteredLeaderboard[1]?.points} XP</span>
            </div>
          </div>

          {/* Rank 1 (Gold) */}
          <div className="flex flex-col items-center relative group z-10 w-1/3 max-w-[160px]">
            <div className="absolute -top-24 z-20 group-hover:-translate-y-3 transition-transform duration-500">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] z-30 animate-pulse">
                <Crown size={36} fill="currentColor" />
              </div>
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-yellow-400 bg-slate-800 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.6)]">
                {filteredLeaderboard[0]?.avatar ? <img src={filteredLeaderboard[0].avatar} className="w-full h-full object-cover"/> : <span className="text-2xl font-black flex items-center justify-center h-full text-white">{filteredLeaderboard[0]?.name?.[0] || 'S'}</span>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full p-2 text-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-200">
                <Trophy size={16} fill="currentColor" />
              </div>
            </div>
            <div className="w-full h-40 md:h-48 bg-gradient-to-t from-slate-900/90 via-amber-900/50 to-yellow-500/30 rounded-t-3xl border-t-[4px] border-x border-yellow-400/60 flex flex-col items-center justify-start pt-8 shadow-[inset_0_20px_30px_rgba(250,204,21,0.15),0_-10px_40px_rgba(250,204,21,0.1)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2)_0%,transparent_100%)] opacity-50" />
              <div className="absolute top-0 inset-x-0 h-1/2 bg-yellow-400/10 blur-xl rounded-full" />
              <span className="text-4xl md:text-5xl font-black text-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] relative z-10">1</span>
              <span className="text-sm md:text-base font-black mt-2 md:mt-3 truncate w-[90%] text-center relative z-10" style={{ color: '#facc15' }}>{filteredLeaderboard[0]?.name}</span>
              <span className="text-xs md:text-sm text-yellow-300 font-mono font-black mt-1 relative z-10 px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/20">{filteredLeaderboard[0]?.points} XP</span>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="flex flex-col items-center relative group w-1/3 max-w-[140px]">
            <div className="absolute -top-16 z-20 group-hover:-translate-y-2 transition-transform duration-500">
              <div className="w-16 h-16 rounded-full border-[3px] border-orange-700 bg-slate-800 overflow-hidden shadow-[0_0_20px_rgba(194,65,12,0.4)]">
                {filteredLeaderboard[2]?.avatar ? <img src={filteredLeaderboard[2].avatar} className="w-full h-full object-cover"/> : <span className="text-xl font-black flex items-center justify-center h-full text-white">{filteredLeaderboard[2]?.name?.[0] || 'S'}</span>}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-orange-500 to-red-700 rounded-full p-1.5 text-white shadow-lg border border-orange-400/50">
                <Medal size={14} fill="currentColor" />
              </div>
            </div>
            <div className="w-full h-28 md:h-36 bg-gradient-to-t from-slate-900/90 via-slate-800/80 to-orange-700/20 rounded-t-3xl border-t-[3px] border-x border-orange-700/40 flex flex-col items-center justify-start pt-6 shadow-[inset_0_20px_20px_rgba(194,65,12,0.1),0_0_20px_rgba(194,65,12,0.05)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_0%,transparent_100%)] opacity-30" />
              <span className="text-3xl font-black text-orange-600 drop-shadow-lg relative z-10">3</span>
              <span className="text-xs font-black mt-2 truncate w-[90%] text-center relative z-10" style={{ color: '#fdba74' }}>{filteredLeaderboard[2]?.name}</span>
              <span className="text-[10px] md:text-xs text-emerald-400 font-mono font-bold mt-0.5 relative z-10">{filteredLeaderboard[2]?.points} XP</span>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-[40px] overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">{language === 'en' ? 'Rank' : 'ମାନ୍ୟତା'}</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">{language === 'en' ? 'Student' : 'ଛାତ୍ର'}</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">{language === 'en' ? 'Consistency' : 'ନିରନ୍ତରତା'}</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">{translations[language].effortPoints}</th>
              <th className="px-3 sm:px-8 py-4 sm:py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">{language === 'en' ? 'Action' : 'କାର୍ଯ୍ୟ'}</th>
            </tr>
          </thead>
          <tbody>
            {loadingFriends ? (
              <tr>
                <td colSpan={5} className="px-3 sm:px-8 py-20 text-center text-slate-500">
                  <Loader2 className="animate-spin text-emerald-500 mx-auto mb-2" size={32} />
                  {language === 'en' ? 'Loading friends...' : 'ସାଙ୍ଗମାନଙ୍କ ମାନ୍ୟତା ଲୋଡ୍ ହେଉଛି...'}
                </td>
              </tr>
            ) : filteredLeaderboard.length > 0 ? (
              filteredLeaderboard.map((student: any, i: number) => {
                const isPromotionZone = i < 5 && activeLeague !== 'Platinum';
                const isDemotionZone = i >= filteredLeaderboard.length - 5 && activeLeague !== 'Bronze' && filteredLeaderboard.length >= 10;
                
                return (
                  <motion.tr 
                    variants={itemVariants}
                    key={i} 
                    className={`border-b border-white/5 hover:bg-white/10 hover:scale-[1.01] hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 relative group z-0 hover:z-10 bg-slate-900/20 ${
                      isPromotionZone ? 'border-l-4 border-l-emerald-500/80 bg-gradient-to-r from-emerald-500/5 to-transparent' : 
                      isDemotionZone ? 'border-l-4 border-l-red-500/80 bg-gradient-to-r from-red-500/5 to-transparent' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <td className="px-3 sm:px-8 py-4 sm:py-6">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_#eab308]' : 
                      i === 1 ? 'bg-slate-300 text-slate-900 shadow-[0_0_15px_#cbd5e1]' : 
                      i === 2 ? 'bg-orange-500 text-slate-900 shadow-[0_0_15px_#f97316]' : 'text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                        {student?.avatar ? (
                          <img src={student.avatar} alt={student?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-sm font-bold">{student?.name?.[0] || 'S'}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-black flex items-center gap-2 ${student?.id === user?.id ? 'text-emerald-400' : 'text-cyan-400'}`}>
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
                  <td className="px-3 sm:px-8 py-4 sm:py-6">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <div key={day} className={`w-2 h-2 rounded-full ${day <= (i % 5 + 1) ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 sm:px-8 py-4 sm:py-6 text-right font-mono text-emerald-400 font-bold group-hover:scale-110 transition-transform origin-right">{student.points}</td>
                  <td className="px-3 sm:px-8 py-4 sm:py-6 text-right">
                    {student.id !== user.id && (
                      <button
                        onClick={() => onToggleFollow?.(student.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer ${
                          following.includes(student.id)
                            ? 'bg-slate-800 hover:bg-red-950/80 hover:text-red-400 hover:border-red-500/20 text-slate-400 border border-slate-700'
                            : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 hover:shadow-emerald-500/30 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {following.includes(student.id) ? (language === 'en' ? 'Following' : 'ଅନୁସରଣ') : (language === 'en' ? '+ Follow' : '+ ଅନୁସରଣ')}
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })
            ) : (
              <tr>
                <td colSpan={5} className="px-3 sm:px-8 py-20 text-center text-slate-500">
                  {language === 'en' ? 'No students in this league yet. Keep practicing to move up!' : 'ଏହି ଲିଗ୍‌ରେ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଛାତ୍ର ନାହାଁନ୍ତି। ଆଗକୁ ବଢିବା ପାଇଁ ଅଭ୍ୟାସ ଜାରି ରଖନ୍ତୁ!'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      
      <motion.div variants={itemVariants} className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-center">
        <p className="text-emerald-400 text-sm font-medium">
          🌟 {language === 'en' ? 'You are in the top 15% of effort makers this week! Keep it up!' : 'ଆପଣ ଏହି ସପ୍ତାହର ଶୀର୍ଷ ୧୫% ପରିଶ୍ରମୀ ଛାତ୍ରଙ୍କ ମଧ୍ୟରେ ଅଛନ୍ତି! ଏମିତି ଜାରି ରଖନ୍ତୁ!'}
        </p>
      </motion.div>
    </motion.div>
  );
}
