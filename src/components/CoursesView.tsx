import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  Play, 
  FileText, 
  HelpCircle, 
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { getLocalizedSubject } from '../utils/helpers';

interface Chapter {
  id: string;
  title: string;
  subject: string;
  class: string;
  board: string;
  thumbnail_url?: string;
  playlist_id?: string;
  notes?: string;
  practice_questions?: any[];
  quiz_questions?: any[];
}

interface CoursesViewProps {
  chapters: Chapter[];
  language: 'en' | 'or';
  onSelectChapter: (chapter: Chapter) => void;
  user: any;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ 
  chapters, 
  language, 
  onSelectChapter,
  user 
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const subjects = Array.from(new Set(chapters.map(c => c.subject)));

  const filteredChapters = chapters.filter(chapter => {
    const matchesSearch = chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chapter.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || chapter.subject === selectedSubject;
    const matchesClass = !user?.class || chapter.class === user.class;
    return matchesSearch && matchesSubject && matchesClass;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            {t.courses} <span className="text-emerald-500">Library</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
            {user?.class ? t.classes[user.class] : 'All Classes'} • {filteredChapters.length} Topics Found
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder={language === 'en' ? "Search chapters..." : "ଅଧ୍ୟାୟ ଖୋଜନ୍ତୁ..."}
              className="w-full md:w-80 pl-12 pr-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setSelectedSubject('all')}
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedSubject === 'all' ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          All Subjects
        </button>
        {subjects.map(subject => (
          <button 
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${selectedSubject === subject ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
          >
            {getLocalizedSubject(subject, language)}
          </button>
        ))}
      </div>

      {/* Chapters Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={viewMode + selectedSubject + searchQuery}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
        >
          {filteredChapters.map((chapter) => (
            <motion.div 
              key={chapter.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              onClick={() => onSelectChapter(chapter)}
              className={`group cursor-pointer glass-card neon-border overflow-hidden transition-all ${viewMode === 'grid' ? 'rounded-[2.5rem] flex flex-col' : 'rounded-3xl flex items-center p-4 gap-6'}`}
            >
              <div className={`relative overflow-hidden bg-slate-800 ${viewMode === 'grid' ? 'aspect-video w-full' : 'w-32 h-20 rounded-2xl shrink-0'}`}>
                {chapter.thumbnail_url ? (
                  <img src={chapter.thumbnail_url} alt={chapter.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <BookOpen size={viewMode === 'grid' ? 48 : 24} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl scale-0 group-hover:scale-100 transition-transform">
                    <Play size={24} fill="currentColor" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  {getLocalizedSubject(chapter.subject, language)}
                </div>
              </div>

              <div className={`p-6 flex-1 flex flex-col ${viewMode === 'list' ? 'p-0' : ''}`}>
                <h3 className="text-xl font-black text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {chapter.title}
                </h3>
                
                <div className="flex items-center gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <FileText size={12} />
                    {chapter.notes ? 'Notes' : 'No Notes'}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <HelpCircle size={12} />
                    {chapter.practice_questions?.length || 0} Practice
                  </div>
                </div>

                {user?.subject_progress?.[chapter.subject] !== undefined && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Subject Progress</span>
                      <span className="text-[8px] font-black text-emerald-500">{user.subject_progress[chapter.subject]}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${user.subject_progress[chapter.subject]}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {viewMode === 'list' && (
                <div className="pr-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {filteredChapters.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700 border border-dashed border-white/10">
                <Search size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No Chapters Found</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">We couldn't find any chapters matching your search or filters. Try adjusting them!</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
