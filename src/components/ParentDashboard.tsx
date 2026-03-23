import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { ProgressChart } from './ProgressChart';
import { translations } from '../translations';
import { getLocalizedSubject } from '../utils/helpers';

export function ParentDashboard({ user, chapters, leaderboard, language, onBack, userProgress }: any) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [skillGap, setSkillGap] = useState<any>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const t = translations[language];

  useEffect(() => {
    const q = query(
      collection(firestore, 'quiz_results'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(data);
      setLoading(false);
      if (data.length > 0 && !aiInsights) {
        generateInsights(data);
      }
    }, (error) => {
      console.error("Parent Dashboard Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id]);

  const generateInsights = async (quizData: any[]) => {
    if (generatingInsights) return;
    setGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze these quiz results for a student named ${user.name} and provide actionable insights for their parent. 
      Data: ${JSON.stringify(quizData.map(r => ({ chapter: r.chapterId, accuracy: r.accuracy, score: r.score, total: r.total })))}
      
      Return a JSON object with:
      - insights: string (markdown bullet points)
      - skillGap: { strengths: string[], weaknesses: string[] }
      
      Focus on specific chapters and accuracy trends.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      setAiInsights(result.insights || "No insights available yet.");
      setSkillGap(result.skillGap || null);
    } catch (err) {
      console.error("Failed to generate AI insights:", err);
      setAiInsights("Unable to generate AI insights at this time.");
    } finally {
      setGeneratingInsights(false);
    }
  };

  const stats = {
    totalQuizzes: results.length,
    avgScore: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length) : 0,
    chaptersCompleted: user.completed_chapters?.length || 0,
    totalChapters: chapters.length
  };

  const userRank = leaderboard.findIndex((s: any) => s.name === user.name) + 1 || '-';

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
      className="max-w-4xl mx-auto pb-12 px-4"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>{language === 'or' ? 'ପ୍ରୋଫାଇଲକୁ ଫେରିଯାଅ' : 'Back to Profile'}</span>
        </button>
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest">
          {t.profile.parentDashboard}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.chaptersCompleted} / {stats.totalChapters}</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{language === 'or' ? 'ସମାପ୍ତ ଅଧ୍ୟାୟ' : 'Chapters Completed'}</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-emerald-500 mb-1">{stats.avgScore}%</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t.accuracy}</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-blue-500 mb-1">{stats.totalQuizzes}</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{language === 'or' ? 'ଦିଆଯାଇଥିବା କୁଇଜ୍' : 'Quizzes Taken'}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8">
        <ProgressChart data={userProgress} language={language} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">{t.profile.recentActivity}</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card neon-border rounded-3xl p-12 text-center">
              <p className="text-slate-500">{t.profile.noActivityYet}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r) => {
                const chapter = chapters.find((c: any) => c.id === r.chapterId);
                return (
                  <motion.div 
                    variants={itemVariants}
                    key={r.id} 
                    className="glass-card neon-border rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shadow-lg ${r.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10' : r.accuracy >= 50 ? 'bg-yellow-500/10 text-yellow-500 shadow-yellow-500/10' : 'bg-red-500/10 text-red-500 shadow-red-500/10'}`}>
                        {r.accuracy}%
                      </div>
                      <div>
                        <h4 className="text-white font-semibold group-hover:text-emerald-400 transition-colors">{chapter?.title || 'Unknown Chapter'}</h4>
                        <p className="text-xs text-slate-500">{r.timestamp?.toDate().toLocaleDateString()} • {r.score}/{r.total} {language === 'or' ? 'ସଠିକ୍' : 'Correct'}</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-600 tracking-widest bg-slate-800/50 px-3 py-1 rounded-full">
                      {getLocalizedSubject(chapter?.subject || '', language)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          {user?.parentShowLeaderboard !== false && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{t.profile.effortRanking}</h3>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                  Rank #{userRank}
                </div>
              </div>
              <div className="glass-card neon-border rounded-3xl p-6 overflow-hidden">
                <div className="space-y-4">
                  {leaderboard.slice(0, 5).map((student: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between ${student.name === user.name ? 'bg-emerald-500/10 -mx-6 px-6 py-2 border-y border-emerald-500/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-xs font-bold ${i < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>{i + 1}</span>
                        <span className={`text-sm ${student.name === user.name ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{student.name}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">{student.points}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">Weekly Effort Points</p>
              </div>
            </>
          )}

          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Sparkles size={48} />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
              <Sparkles size={20} className="text-emerald-400" />
              {t.profile.parentInsights}
            </h3>

            {generatingInsights ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-8 justify-center">
                <Loader2 size={16} className="animate-spin" />
                {t.profile.analyzingPerformance}
              </div>
            ) : aiInsights ? (
              <div className="space-y-6 relative z-10">
                <div className="text-xs text-slate-300 leading-relaxed prose prose-invert prose-xs">
                  <Markdown>{aiInsights}</Markdown>
                </div>

                {skillGap && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle2 size={12} />
                        {t.profile.strengths}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillGap.strengths?.map((s: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px]">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
                        <AlertCircle size={12} />
                        {t.profile.areasToImprove}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillGap.weaknesses?.map((w: string, i: number) => (
                          <span key={i} className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px]">{w}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{t.profile.unlockInsights}</p>
            )}
            
            <button className="w-full mt-6 py-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-emerald-500/20">
              {t.profile.viewDetailedReport}
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
