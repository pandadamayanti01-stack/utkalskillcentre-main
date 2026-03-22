import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { ProgressChart } from './ProgressChart';

export function ParentDashboard({ user, chapters, leaderboard, language, onBack, userProgress }: any) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [generatingInsights, setGeneratingInsights] = useState(false);

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
      if (data.length > 0) {
        generateInsights(data);
      }
    }, (error) => {
      console.error("Parent Dashboard Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id]);

  const generateInsights = async (quizData: any[]) => {
    if (aiInsights || generatingInsights) return;
    setGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze these quiz results for a student named ${user.name} and provide 3-4 concise, actionable insights for their parent. 
      Data: ${JSON.stringify(quizData.map(r => ({ chapter: r.chapterId, accuracy: r.accuracy, score: r.score, total: r.total })))}
      Format the response as a short list of bullet points. Focus on strengths and areas for improvement.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });
      setAiInsights(response.text || "No insights available yet.");
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
      className="max-w-4xl mx-auto pb-12"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Profile</span>
        </button>
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest">
          Parent Mode
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.chaptersCompleted} / {stats.totalChapters}</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Chapters Completed</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-emerald-500 mb-1">{stats.avgScore}%</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Average Accuracy</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-blue-500 mb-1">{stats.totalQuizzes}</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Quizzes Taken</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8">
        <ProgressChart data={userProgress} language={language} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">Recent Activity</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card neon-border rounded-3xl p-12 text-center">
              <p className="text-slate-500">No activity recorded yet. Encourage your child to take a quiz!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r) => {
                const chapter = chapters.find((c: any) => c.id === r.chapterId);
                return (
                  <motion.div 
                    variants={itemVariants}
                    key={r.id} 
                    className="glass-card neon-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${r.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-500' : r.accuracy >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                        {r.accuracy}%
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{chapter?.title || 'Unknown Chapter'}</h4>
                        <p className="text-xs text-slate-500">{r.timestamp?.toDate().toLocaleDateString()} • {r.score}/{r.total} Correct</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-600 tracking-widest">
                      {chapter?.subject}
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
                <h3 className="text-lg font-semibold text-white">Effort Ranking</h3>
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

          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles size={20} className="text-emerald-400" />
              AI Insights
            </h3>
            {generatingInsights ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={16} className="animate-spin" />
                Analyzing performance...
              </div>
            ) : aiInsights ? (
              <div className="text-xs text-slate-300 mb-4 leading-relaxed prose prose-invert prose-xs">
                <Markdown>{aiInsights}</Markdown>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">Take more quizzes to unlock AI-powered skill gap analysis and personalized learning paths.</p>
            )}
            <button className="w-full py-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all">
              View Detailed Report
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
