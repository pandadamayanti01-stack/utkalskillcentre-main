import React, { useState } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  Trophy, 
  ChevronRight, 
  Search, 
  Filter, 
  LayoutGrid, 
  List,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Lock,
  Star,
  Zap,
  Award,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { getLocalizedSubject } from '../utils/helpers';

interface MonthlyTest {
  id: string;
  title: string;
  subject: string;
  class: string;
  month: string;
  year: number;
  duration: number; // in minutes
  questions_count: number;
  is_completed?: boolean;
  score?: number;
  total_score?: number;
  is_locked?: boolean;
}

interface MonthlyTestsViewProps {
  tests: MonthlyTest[];
  language: 'en' | 'or';
  onStartTest: (test: MonthlyTest) => void;
  user: any;
}

export const MonthlyTestsView: React.FC<MonthlyTestsViewProps> = ({ 
  tests, 
  language, 
  onStartTest,
  user 
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const subjects = Array.from(new Set(tests.map(t => t.subject)));

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         test.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || test.subject === selectedSubject;
    const matchesClass = !user?.class || test.class === user.class;
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
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <ClipboardList size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              Monthly <span className="text-purple-500">Tests</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
              {user?.class ? t.classes[user.class] : 'All Classes'} • {filteredTests.length} Tests Available
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-purple-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search tests..."
              className="w-full md:w-80 pl-12 pr-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
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
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedSubject === 'all' ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          All Subjects
        </button>
        {subjects.map(subject => (
          <button 
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border whitespace-nowrap ${selectedSubject === subject ? 'bg-purple-500 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
          >
            {getLocalizedSubject(subject, language)}
          </button>
        ))}
      </div>

      {/* Monthly Tests Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={viewMode + selectedSubject + searchQuery}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}
        >
          {filteredTests.map((test) => (
            <motion.div 
              key={test.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              onClick={() => !test.is_locked && onStartTest(test)}
              className={`group cursor-pointer glass-card neon-border overflow-hidden transition-all ${viewMode === 'grid' ? 'rounded-[2.5rem] flex flex-col' : 'rounded-3xl flex items-center p-4 gap-6'} ${test.is_locked ? 'opacity-70 grayscale' : ''}`}
            >
              <div className={`relative overflow-hidden bg-slate-800 ${viewMode === 'grid' ? 'aspect-video w-full' : 'w-32 h-20 rounded-2xl shrink-0'}`}>
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/20 to-blue-600/20">
                  <ClipboardList size={viewMode === 'grid' ? 48 : 24} className="text-purple-500/40" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {test.is_locked ? (
                    <Lock size={32} className="text-slate-400" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-xl scale-0 group-hover:scale-100 transition-transform">
                      <Play size={24} fill="currentColor" className="ml-1" />
                    </div>
                  )}
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  {getLocalizedSubject(test.subject, language)}
                </div>
                {test.is_completed && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </div>

              <div className={`p-6 flex-1 flex flex-col ${viewMode === 'list' ? 'p-0' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black text-white tracking-tight group-hover:text-purple-400 transition-colors line-clamp-1">
                    {test.title}
                  </h3>
                  {test.is_completed && test.score !== undefined && (
                    <div className="flex items-center gap-1 text-emerald-400 font-black text-sm">
                      <Trophy size={14} />
                      {Math.round((test.score / (test.total_score || 100)) * 100)}%
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <Calendar size={12} />
                    {test.month} {test.year}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {test.duration} Min
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <Zap size={12} />
                    {test.questions_count} Qs
                  </div>
                </div>
              </div>

              {viewMode === 'list' && (
                <div className="pr-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                    {test.is_locked ? <Lock size={18} /> : <ChevronRight size={20} />}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {filteredTests.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700 border border-dashed border-white/10">
                <ClipboardList size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No Tests Found</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">We couldn't find any monthly tests matching your search. Try adjusting your filters!</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-purple-500/10 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500">
            <Award size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tests Completed</p>
            <p className="text-xl font-black text-white">{tests.filter(t => t.is_completed).length} / {tests.length}</p>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Average Score</p>
            <p className="text-xl font-black text-white">82%</p>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Test</p>
            <p className="text-xl font-black text-white">April 1st</p>
          </div>
        </div>
      </div>
    </div>
  );
};
