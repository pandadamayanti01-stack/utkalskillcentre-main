import React, { useState } from 'react';
import { 
  Book, 
  Download, 
  Search, 
  Filter, 
  BookOpen, 
  FileText, 
  ChevronRight, 
  LayoutGrid, 
  List,
  ArrowDownToLine,
  Eye,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { getLocalizedSubject } from '../utils/helpers';

interface Textbook {
  id: string;
  title: string;
  subject: string;
  class: string;
  board: string;
  thumbnail_url?: string;
  pdf_url: string;
  file_size?: string;
  pages?: number;
  last_updated?: string;
  is_downloaded?: boolean;
}

interface TextbooksViewProps {
  textbooks: Textbook[];
  language: 'en' | 'or';
  onDownload: (textbook: Textbook) => void;
  onView: (textbook: Textbook) => void;
  user: any;
}

export const TextbooksView: React.FC<TextbooksViewProps> = ({ 
  textbooks, 
  language, 
  onDownload, 
  onView,
  user 
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const subjects = Array.from(new Set(textbooks.map(t => t.subject)));

  const filteredTextbooks = textbooks.filter(textbook => {
    const matchesSearch = textbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         textbook.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || textbook.subject === selectedSubject;
    const matchesClass = !user?.class || textbook.class === user.class;
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
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1 }
  };

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            Digital <span className="text-blue-500">Textbooks</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
            {user?.class ? t.classes[user.class] : 'All Classes'} • {filteredTextbooks.length} Books Available
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search textbooks..."
              className="w-full md:w-80 pl-12 pr-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
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
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedSubject === 'all' ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          All Subjects
        </button>
        {subjects.map(subject => (
          <button 
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${selectedSubject === subject ? 'bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
          >
            {getLocalizedSubject(subject, language)}
          </button>
        ))}
      </div>

      {/* Textbooks Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={viewMode + selectedSubject + searchQuery}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}
        >
          {filteredTextbooks.map((textbook) => (
            <motion.div 
              key={textbook.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className={`group glass-card neon-border overflow-hidden transition-all ${viewMode === 'grid' ? 'rounded-[2.5rem] flex flex-col' : 'rounded-3xl flex items-center p-4 gap-6'}`}
            >
              <div className={`relative overflow-hidden bg-slate-800 ${viewMode === 'grid' ? 'aspect-[3/4] w-full' : 'w-24 h-32 rounded-2xl shrink-0'}`}>
                {textbook.thumbnail_url ? (
                  <img src={textbook.thumbnail_url} alt={textbook.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Book size={viewMode === 'grid' ? 48 : 24} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                  <button 
                    onClick={() => onView(textbook)}
                    className="w-full py-2.5 rounded-xl bg-blue-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-400 transition-all shadow-lg"
                  >
                    <Eye size={14} />
                    Read Now
                  </button>
                  <button 
                    onClick={() => onDownload(textbook)}
                    className="w-full py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  {getLocalizedSubject(textbook.subject, language)}
                </div>
                {textbook.is_downloaded && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </div>

              <div className={`p-6 flex-1 flex flex-col ${viewMode === 'list' ? 'p-0' : ''}`}>
                <h3 className="text-lg font-black text-white mb-2 tracking-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                  {textbook.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <FileText size={12} />
                    {textbook.pages || '---'} Pages
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <ArrowDownToLine size={12} />
                    {textbook.file_size || '---'}
                  </div>
                </div>
              </div>

              {viewMode === 'list' && (
                <div className="pr-4 flex gap-2">
                  <button 
                    onClick={() => onView(textbook)}
                    className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all border border-white/5"
                  >
                    <Eye size={20} />
                  </button>
                  <button 
                    onClick={() => onDownload(textbook)}
                    className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-white/5"
                  >
                    <Download size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {filteredTextbooks.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700 border border-dashed border-white/10">
                <BookOpen size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No Textbooks Found</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">We couldn't find any textbooks matching your search. Try adjusting your filters!</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Offline Notice */}
      <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-white font-bold">Offline Access</h4>
          <p className="text-sm text-slate-500">Downloaded textbooks can be accessed anytime from the <span className="text-amber-500 font-bold">Offline Library</span>, even without an internet connection.</p>
        </div>
      </div>
    </div>
  );
};
