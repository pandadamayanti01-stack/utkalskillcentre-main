import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Youtube, PlayCircle, BookOpen, Clock, Lock, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, getDocsFromServer, query, where } from 'firebase/firestore';
import { CinematicPlayer } from './SmartClasses/CinematicPlayer';
import { CHAPTERS_MAP } from '../data/chaptersMap';

export function formatChapterName(rawName: string) {
  let name = rawName.replace(/^Class\d+_/i, '');
  name = name.replace(/_/g, ' ');
  name = name.replace(/^(Chapter\s*\d+)\s+([^-])/i, '$1 - $2');
  return name.trim();
}

export function SmartClassesView({ user, language, isPremium, onUpgrade, onBack }: any) {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [playingChapter, setPlayingChapter] = useState<string | null>(null);

  const studentClassStr = (user?.class || 'class10').toLowerCase().replace('class', '').trim();

  useEffect(() => {
    fetchVideos();
  }, [studentClassStr]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'curated_videos'), where('classStr', '==', studentClassStr));
      const snap = await getDocsFromServer(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const subjects = Object.keys(CHAPTERS_MAP[studentClassStr] || {}).filter(sub => sub.toLowerCase() !== 'algebra');
  
  // Set default subject if none selected
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  const chaptersForSubject = selectedSubject ? (CHAPTERS_MAP[studentClassStr][selectedSubject] || []) : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            Smart Classes <Sparkles className="text-yellow-400" size={28} />
          </h1>
          <p className="text-slate-400 mt-1">
            Cinematic video lessons for Class {studentClassStr} 
          </p>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {subjects.map(sub => {
          const isActive = selectedSubject === sub;
          return (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                  : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
            >
              {sub.replace('_', ' ').toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Chapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-slate-500">Loading your cinematic universe...</div>
        ) : chaptersForSubject.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500">No chapters found for this subject.</div>
        ) : (
          chaptersForSubject.map((ch: string, idx: number) => {
            const chapterVideos = videos.filter(v => v.chapter === ch);
            const hasVideos = chapterVideos.length > 0;
            const isLocked = !isPremium && idx > 2; // Freemium model: lock after 3 chapters
            const formattedName = formatChapterName(ch);

            return (
              <div key={ch} className="glass-card rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-all flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-red-500/10 transition-colors" />
                
                <div className="flex-1 space-y-4 relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 shrink-0">
                      <BookOpen size={24} />
                    </div>
                    {hasVideos && (
                      <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
                        <Youtube size={12} />
                        {chapterVideos.length} Videos
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm text-red-400 font-black tracking-widest uppercase mb-1">
                      {formattedName.split('-')[0] || 'CHAPTER'}
                    </p>
                    <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
                      {formattedName.split('-').slice(1).join('-') || formattedName}
                    </h3>
                    <p className="text-slate-400 text-xs mt-2 flex items-center gap-2">
                      <Clock size={12} /> Approx 45 mins
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 relative z-10">
                  {isLocked ? (
                    <button 
                      onClick={onUpgrade}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 font-bold text-sm flex items-center justify-center gap-2 hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
                    >
                      <Lock size={16} />
                      Unlock with Premium
                    </button>
                  ) : hasVideos ? (
                    <button 
                      onClick={() => setPlayingChapter(ch)}
                      className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] flex items-center justify-center gap-2"
                    >
                      <PlayCircle size={18} />
                      Start Smart Class
                    </button>
                  ) : (
                    <button 
                      disabled
                      className="w-full py-4 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fullscreen Cinematic Player Overlay */}
      <AnimatePresence>
        {playingChapter && (
          <CinematicPlayer 
            chapterName={playingChapter}
            videos={videos.filter(v => v.chapter === playingChapter && v.subject === selectedSubject)}
            onClose={() => setPlayingChapter(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
