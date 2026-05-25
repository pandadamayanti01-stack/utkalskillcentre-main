import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Map, Compass, BookOpen, X, Filter, Flag, Trophy, Cloud, Star } from 'lucide-react';
import { SEO } from './SEO';
import { ROADMAP_DATA, ROADMAP_DATA_9 } from '../data/roadmapData';
import { translations } from '../translations';

interface SyllabusTrackerProps {
  user: any;
  language: 'en' | 'or';
  onBack: () => void;
}

export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ user, language, onBack }) => {
  const [selectedMonth, setSelectedMonth] = useState<any | null>(null);
  const [optionalFilter, setOptionalFilter] = useState<'All' | 'Hindi' | 'Sanskrit' | 'Vocational'>('All');
  const [currentMonth, setCurrentMonth] = useState<string>('');

  useEffect(() => {
    // Detect current real-world month and year
    const now = new Date();
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    setCurrentMonth(monthYear);
  }, []);

  const translate = (enText: string, orText: string) => language === 'en' ? enText : orText;

  // Helper to determine if a chapter is an optional subject and should be hidden
  const isVisibleChapter = (subject: string) => {
    const sub = subject.toLowerCase();
    
    // Core subjects that are always visible
    const coreSubjects = ['odia', 'english', 'math', 'algebra', 'geometry', 'science', 'physical_science', 'life_science', 'social_science', 'history', 'geography', 'odia_grammar', 'english_grammar'];
    if (coreSubjects.some(c => sub.includes(c))) return true;

    // Optional subject filtering
    if (optionalFilter === 'All') return true;
    if (optionalFilter === 'Hindi' && (sub.includes('hindi') || sub.includes('hindi_grammar'))) return true;
    if (optionalFilter === 'Sanskrit' && (sub.includes('sanskrit') || sub.includes('sanskrit_grammar'))) return true;
    if (optionalFilter === 'Vocational' && sub.includes('vocational')) return true;

    return false; // Hide other optional subjects
  };

  // Helper to safely translate subjects, respecting class overrides
  const getTranslatedSubject = (rawSubject: string) => {
    // If it's already a formatted string like "Physical Science[ଭୌତିକ ବିଜ୍ଞାନ]", just clean it up
    if (rawSubject.includes('[') || rawSubject.includes('(')) {
      return rawSubject.replace(/_/g, ' ');
    }

    const subKey = rawSubject.toLowerCase().replace(/\s+/g, '_');
    
    // Check class overrides (Class 10 override for social_science -> history)
    const overrides = translations[language]?.classSubjectOverrides?.class10 as Record<string, string>;
    if (overrides && overrides[subKey]) {
      return overrides[subKey];
    }

    // Check normal subjects mapping
    const subjectsMap = translations[language]?.subjects as Record<string, string>;
    if (subjectsMap && subjectsMap[subKey]) {
      return subjectsMap[subKey];
    }

    // Check board-specific mapping (BSE Odisha by default)
    const boardMap = translations[language]?.subjectsByBoard?.odisha as Record<string, string>;
    if (boardMap && boardMap[subKey]) {
      return boardMap[subKey];
    }

    // Fallback to raw subject if no translation found
    return rawSubject.replace(/_/g, ' ');
  };

  const studentClassStr = (user?.class || 'class10').toLowerCase().replace('class', '').trim();
  const activeRoadmap = studentClassStr === '9' ? ROADMAP_DATA_9 : ROADMAP_DATA;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-32"
    >
      <SEO 
        title={translate(
          `Gundulu's Journey - 9 Month Roadmap | Class ${studentClassStr}`,
          `ଗୁଣ୍ଡୁଲୁର ଯାତ୍ରା - ୯ ମାସର ରୋଡମ୍ୟାପ୍ | ${studentClassStr === '9' ? '୯ମ' : '୧୦ମ'} ଶ୍ରେଣୀ`
        )}
        description={`Follow Gundulu on a 9-month epic journey to master the entire Class ${studentClassStr} syllabus!`}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap sticky top-0 z-30 bg-white/90 backdrop-blur-xl py-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 flex items-center gap-3">
            <Compass className="text-emerald-500" size={32} />
            {translate("Gundulu's Journey", "ଗୁଣ୍ଡୁଲୁର ଯାତ୍ରା")}
          </h1>
          <p className="text-slate-500 max-w-2xl text-sm md:text-base font-medium">
            {translate(
              "Your epic 9-month roadmap from June 2026 to February 2027. Explore the islands below to see your recommended monthly chapters!",
              "ଜୁନ୍ ୨୦୨୬ ରୁ ଫେବୃଆରୀ ୨୦୨୭ ପର୍ଯ୍ୟନ୍ତ ଆପଣଙ୍କର ୯ ମାସର ରୋଡମ୍ୟାପ୍ | ମାସିକ ଅଧ୍ୟାୟଗୁଡିକ ଦେଖିବାକୁ ନିମ୍ନରେ ଥିବା ଦ୍ୱୀପପୁଞ୍ଜଗୁଡିକୁ ଏକ୍ସପ୍ଲୋର୍ କରନ୍ତୁ!"
            )}
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all font-bold text-sm shadow-sm"
        >
          <ArrowLeft size={16} />
          {translate('Return to Dashboard', 'ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ')}
        </button>
      </div>

      {/* Filter Section */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200">
          <Filter size={16} />
          {translate('Select Optional Subject:', 'ବୈକଳ୍ପିକ ବିଷୟ ବାଛନ୍ତୁ:')}
        </div>
        {['All', 'Hindi', 'Sanskrit', 'Vocational'].map((opt) => (
          <button
            key={opt}
            onClick={() => setOptionalFilter(opt as any)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all border ${
              optionalFilter === opt 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            {opt === 'All' ? translate('Show All', 'ସବୁ ଦେଖାନ୍ତୁ') : opt}
          </button>
        ))}
      </div>

      {/* Gamified Map Area */}
      <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-[3rem] border-4 border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-cyan-50/50 p-6 md:p-12 shadow-2xl">
        {/* Decorative Map Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
        
        {/* Decorative Floating Background Elements */}
        <Cloud className="absolute top-10 left-10 text-white opacity-40 animate-pulse" size={64} />
        <Cloud className="absolute top-1/4 right-10 text-white opacity-50" size={80} />
        <Cloud className="absolute top-1/2 left-4 text-white opacity-30" size={48} />
        <Star className="absolute top-1/3 left-1/4 text-yellow-300 opacity-60 animate-bounce" size={24} />
        <Star className="absolute bottom-1/4 right-1/4 text-yellow-400 opacity-50" size={32} />

        {/* The Winding Path Line */}
        <div className="absolute top-16 bottom-16 left-1/2 -translate-x-1/2 w-2 bg-emerald-200/50 rounded-full z-0">
          <div className="w-full h-full border-l-4 border-dashed border-emerald-400 rounded-full"></div>
        </div>

        {/* Start Marker */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white p-3 rounded-full shadow-lg border-2 border-emerald-400">
          <Flag className="text-emerald-500" size={24} />
        </div>

        <div className="flex flex-col gap-16 md:gap-20 relative z-10 py-16">
          {activeRoadmap.map((monthData, idx) => {
            const visibleCount = monthData.chapters.filter(c => isVisibleChapter(c.subject)).length;
            const isLeft = idx % 2 === 0;
            const isCurrentMonth = monthData.month === currentMonth;

            return (
              <div key={idx} className={`flex w-full ${isLeft ? 'justify-start' : 'justify-end'} relative md:px-12`}>
                {/* Horizontal connecting branch */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 h-2 bg-emerald-200/50 -z-10 w-[40%] md:w-[35%] rounded-full ${
                    isLeft ? 'left-1/2 md:left-[35%]' : 'right-1/2 md:right-[35%]'
                  }`}
                >
                  <div className={`w-full h-full border-t-4 border-dashed rounded-full ${isCurrentMonth ? 'border-amber-400' : 'border-emerald-400'}`}></div>
                </div>

                <motion.button
                  animate={{ y: [0, -12, 0] }}
                  transition={{ 
                    duration: 3 + (idx % 2), 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: idx * 0.3
                  }}
                  whileHover={{ scale: 1.1, rotate: isLeft ? -2 : 2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMonth(monthData)}
                  className={`group relative bg-white p-5 md:p-6 w-[140px] md:w-[180px] rounded-[2.5rem] border-[4px] shadow-[0_15px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] transition-all flex flex-col items-center justify-center text-center overflow-visible z-20 ${
                    isCurrentMonth ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-emerald-400 hover:border-emerald-500'
                  }`}
                >
                  {/* Outer Glow on Hover or Current Month */}
                  <div className={`absolute inset-0 rounded-[2.5rem] blur-xl transition-opacity ${
                    isCurrentMonth ? 'bg-amber-400/30 opacity-100 animate-pulse' : 'bg-emerald-400/20 opacity-0 group-hover:opacity-100'
                  }`}></div>
                  
                  {isCurrentMonth && (
                    <div className="absolute -top-4 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-white transform rotate-12 z-30">
                      CURRENT
                    </div>
                  )}

                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-1.5 mb-3 shadow-lg relative ${
                    isCurrentMonth ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30' : 'bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-emerald-500/30'
                  }`}>
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      {isCurrentMonth ? (
                        <Star className="text-amber-500 group-hover:text-orange-500 transition-colors" size={28} />
                      ) : (
                        <Map className="text-emerald-500 group-hover:text-cyan-500 transition-colors" size={28} />
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-0.5 tracking-wide leading-tight">
                    {monthData.month.split(' ')[0]}
                  </h3>
                  <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">
                    {monthData.month.split(' ')[1]}
                  </p>
                  
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 border-2 ${
                    isCurrentMonth ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <BookOpen size={12} className={isCurrentMonth ? 'text-amber-500' : 'text-emerald-500'} />
                    {visibleCount} Ch.
                  </div>
                </motion.button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal View for Selected Month */}
      <AnimatePresence>
        {selectedMonth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[85vh] bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                    <span className="text-emerald-600">
                      {selectedMonth.month}
                    </span>
                    <span className="text-slate-400 text-lg">Mission</span>
                  </h2>
                  <p className="text-slate-500 mt-1 text-sm font-medium">Recommended chapters to conquer this month.</p>
                </div>
                <button 
                  onClick={() => setSelectedMonth(null)}
                  className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedMonth.chapters.filter((c: any) => isVisibleChapter(c.subject)).map((chapter: any, idx: number) => {
                    // Clean up ugly file name artifacts from the title
                    let rawTitle = typeof chapter.title === 'string' ? chapter.title : (language === 'or' && chapter.title?.or ? chapter.title.or : (chapter.title?.en || ''));
                    
                    const cleanTitle = rawTitle
                      .replace(/Class\s*\d+/ig, '')
                      .replace(/Ch\s*\d+/ig, '')
                      .replace(/Chapter\s*\d+/ig, '')
                      .replace(/Ready/ig, '')
                      .replace(/\.pdf/ig, '')
                      .replace(/_/g, ' ')
                      .trim()
                      .replace(/^[-:]\s*/, ''); // Remove leading dashes or colons

                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="text-slate-800 font-bold text-sm md:text-base leading-tight mb-1">
                            {cleanTitle || rawTitle}
                          </h4>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                            {getTranslatedSubject(chapter.subject)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
