import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, BookOpen, Shapes, Brain, Globe, PenTool, ChevronRight, Play, FileText, HelpCircle, CheckCircle2 } from 'lucide-react';
import { translations } from '../translations';
import { safeJsonStringify } from '../firebase';
import { Chapter } from '../types';
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from '../utils/youtube';
import { getLocalizedSubject } from '../utils/helpers';
import { QuizEngine } from './QuizEngine';
import { TopicDetailView } from './TopicDetailView';

interface CoursesViewProps {
  user: any;
  chapters: Chapter[];
  language: 'or' | 'en';
  isPremium: boolean;
  onUpgrade: () => void;
  onBack: () => void;
}

export function CoursesView({ user, chapters, language, isPremium, onUpgrade, onBack }: CoursesViewProps) {
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [recentlyViewed, setRecentlyViewed] = useState<Chapter[]>([]);

  // Load recently viewed from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`recently_viewed_${user?.id}`);
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        const recent = ids.map((id: string) => chapters.find((c: Chapter) => c.id === id)).filter(Boolean);
        setRecentlyViewed(recent);
      } catch (e) {
        console.error("Error parsing recently viewed", e);
      }
    }
  }, [chapters, user?.id]);

  const handleSelectChapter = (chapter: Chapter) => {
    setSelected(chapter);
    
    // Update recently viewed
    const updatedIds = [chapter.id, ...recentlyViewed.map(c => c.id).filter(id => id !== chapter.id)].slice(0, 3);
    localStorage.setItem(`recently_viewed_${user?.id}`, safeJsonStringify(updatedIds));
    
    const recent = updatedIds.map(id => chapters.find(c => c.id === id)).filter(Boolean) as Chapter[];
    setRecentlyViewed(recent);
  };

  const boardKey = useMemo(() => {
    if (!user?.board) return 'odisha';
    const b = user.board.toLowerCase();
    if (b.includes('saraswati')) return 'saraswati';
    if (b.includes('cbse')) return 'cbse';
    return 'odisha';
  }, [user?.board]);

  const classFilteredChapters = useMemo(() => {
    return chapters.filter((c: Chapter) => {
      const matchesClass = !user?.class || c.class === user.class;
      const matchesBoard = !user?.board || c.board === boardKey;
      return matchesClass && matchesBoard;
    });
  }, [chapters, user?.class, user?.board, boardKey]);

  const availableSubjects = useMemo(() => {
    const predefined = translations[language]?.subjects ? Object.keys(translations[language].subjects) : [];
    const existingInChapters = new Set<string>(classFilteredChapters.map((c: Chapter) => c.subject));
    
    // Only show subjects that have at least one chapter
    const filteredPredefined = predefined.filter(s => existingInChapters.has(s));
    const othersInChapters = Array.from(existingInChapters).filter(s => !predefined.includes(s));
    
    return ['all', ...filteredPredefined, ...othersInChapters];
  }, [language, classFilteredChapters]);

  const filteredChapters = classFilteredChapters.filter((c: Chapter) => {
    if (subjectFilter === 'all') return true;
    return c.subject === subjectFilter;
  });

  // Requirement: Only show one entry per logical chapter
  const uniqueChapters = useMemo(() => {
    return Array.from(
      filteredChapters.reduce((acc: Map<string, Chapter>, current: Chapter) => {
        const groupId = current.translationGroupId || current.id;
        const existing = acc.get(groupId);
        if (!existing || current.language === 'en') {
          acc.set(groupId, current);
        }
        return acc;
      }, new Map<string, Chapter>()).values()
    ) as Chapter[];
  }, [filteredChapters]);

  useEffect(() => {
    if (selected) {
      const updatedSelected = chapters.find((c: Chapter) => c.id === selected.id || (c.translationGroupId && c.translationGroupId === selected.translationGroupId));
      if (updatedSelected) {
        setSelected(updatedSelected);
      } else {
        setSelected(null);
      }
    }
  }, [chapters]);

  if (quizMode && selected) {
    return (
      <QuizEngine 
        questions={selected.quiz_questions || []} 
        onComplete={() => setQuizMode(false)} 
        language={language} 
        userId={user.id}
        chapterId={selected.id}
      />
    );
  }

  if (selected) {
    return (
      <TopicDetailView 
        topic={selected} 
        onBack={() => setSelected(null)} 
        onTakeQuiz={() => setQuizMode(true)} 
        language={language} 
        isPremium={isPremium}
        onUpgrade={onUpgrade}
      />
    );
  }

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
      className="space-y-10 pb-20"
    >
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {translations[language].courses}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} • {user?.board}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableSubjects.map((s: string) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                subjectFilter === s 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
              }`}
            >
              {s === 'all' ? translations[language].allSubjects : (translations[language].subjects[s as keyof typeof translations.en.subjects] || s)}
            </button>
          ))}
        </div>
      </motion.div>

      {subjectFilter === 'all' && recentlyViewed.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <Clock size={18} />
            <h3 className="text-lg font-bold text-white">
              {language === 'en' ? "Continue Learning" : "ପଢା ଜାରି ରଖନ୍ତୁ"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentlyViewed.map((chapter) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={chapter.id}
                onClick={() => handleSelectChapter(chapter)}
                className="flex items-center gap-4 p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="w-16 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                  <img 
                    src={getYouTubeThumbnail(chapter.playlist_id)} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    alt={chapter.title}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase truncate">
                    {getLocalizedSubject(chapter.subject, language)}
                  </p>
                  <h4 className="text-sm font-semibold text-white truncate">{chapter.title}</h4>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {uniqueChapters.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-white/5 rounded-3xl">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <BookOpen size={48} className="text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{translations[language].noContent}</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {language === 'en' 
              ? "We're currently working on adding content for this subject. Please check back soon!" 
              : "ଆମେ ବର୍ତ୍ତମାନ ଏହି ବିଷୟ ପାଇଁ ବିଷୟବସ୍ତୁ ଯୋଡିବା ପାଇଁ କାର୍ଯ୍ୟ କରୁଛୁ। ଦୟାକରି ଶୀଭ୍ର ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ!"}
          </p>
        </motion.div>
      ) : subjectFilter === 'all' ? (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {availableSubjects.filter(s => s !== 'all').map((subject: string) => {
            const subjectChapters = chapters.filter((c: Chapter) => c.subject === subject);
            const count = Array.from(new Set(subjectChapters.map((c: Chapter) => c.translationGroupId || c.id))).length;
            
            return (
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                key={subject}
                onClick={() => setSubjectFilter(subject)}
                className="group relative flex flex-col items-center justify-center p-8 glass-card rounded-[2rem] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none"></div>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all text-emerald-500 relative z-10 shadow-lg">
                  {subject.toLowerCase().includes('math') ? <Shapes size={32} /> :
                   subject.toLowerCase().includes('sci') ? <Brain size={32} /> :
                   subject.toLowerCase().includes('eng') ? <Globe size={32} /> :
                   subject.toLowerCase().includes('odi') ? <PenTool size={32} /> :
                   <BookOpen size={32} />}
                </div>
                <h3 className="text-xl font-black text-white mb-1 tracking-tight relative z-10">
                  {translations[language].subjects[subject as keyof typeof translations.en.subjects] || subject}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest relative z-10">
                  {count} {language === 'en' ? 'Chapters' : 'ଅଧ୍ୟାୟ'}
                </p>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {uniqueChapters.map((chapter: Chapter) => (
            <motion.button 
              whileHover={{ y: -5 }}
              key={chapter.id}
              onClick={() => handleSelectChapter(chapter)}
              className="group text-left glass-card rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none"></div>
              <div className="aspect-video rounded-2xl bg-slate-800 mb-4 overflow-hidden relative flex-shrink-0 z-10 shadow-lg">
                <img 
                  src={getYouTubeThumbnail(chapter.playlist_id)} 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform"
                  alt={chapter.title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform">
                    <Play fill="currentColor" size={20} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {getLocalizedSubject(chapter.subject, language)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-2 min-h-[3.5rem] tracking-tight relative z-10">{chapter.title}</h3>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5 text-[10px] text-slate-400 font-bold uppercase tracking-wider relative z-10">
                <div className="flex items-center gap-1"><Play size={12} className="text-emerald-500" /> Video</div>
                {chapter.notes && <div className="flex items-center gap-1"><FileText size={12} className="text-blue-500" /> Notes</div>}
                {chapter.practice_questions && chapter.practice_questions.length > 0 && <div className="flex items-center gap-1"><HelpCircle size={12} className="text-purple-500" /> Practice</div>}
                {chapter.quiz_questions && chapter.quiz_questions.length > 0 && <div className="flex items-center gap-1"><CheckCircle2 size={12} className="text-orange-500" /> Quiz</div>}
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
