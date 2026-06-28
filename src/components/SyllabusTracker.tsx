import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Map as MapIcon, Compass, BookOpen, X, Filter, Flag, Trophy, Cloud, Star } from 'lucide-react';
import { SEO } from './SEO';
import {
  ROADMAP_DATA,
  ROADMAP_DATA_1,
  ROADMAP_DATA_2,
  ROADMAP_DATA_3,
  ROADMAP_DATA_4,
  ROADMAP_DATA_5,
  ROADMAP_DATA_6,
  ROADMAP_DATA_7,
  ROADMAP_DATA_8,
  ROADMAP_DATA_9,
  ROADMAP_DATA_10
} from '../data/roadmapData';
import { BSE_SYLLABUS_MAPPING_9, BSE_SYLLABUS_MAPPING_10 } from '../data/bseSyllabusMapping';
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

  const studentClassStr = (user?.class || 'class10').toLowerCase().replace('class', '').trim();

  useEffect(() => {
    // Detect current real-world month and year
    const now = new Date();
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    setCurrentMonth(monthYear);
  }, []);

  // Reset optional subject filter when class changes
  useEffect(() => {
    setOptionalFilter('All');
  }, [studentClassStr]);

  const translate = (enText: string, orText: string) => language === 'en' ? enText : orText;

  const isVisibleChapter = (subject: string) => {
    // If it's not class 9 or 10, there are no optional subjects/filters to apply
    if (studentClassStr !== '9' && studentClassStr !== '10') return true;

    const sub = subject.toLowerCase();
    
    // Core subjects that are always visible
    const coreSubjects = [
      'odia', 'english', 'math', 'algebra', 'geometry', 'science', 'physical_science', 'life_science', 
      'social_science', 'history', 'geography', 'odia_grammar', 'english_grammar',
      'ganita_prakas', 'sahitya_surabhi', 'jigyasa', 'samajika_bignana', 'jasmine', 'kruti', 'khela_sikhya', 'kausala_bodha'
    ];
    if (coreSubjects.some(c => sub.includes(c))) return true;

    // Optional subject filtering
    if (optionalFilter === 'All') return true;
    if (optionalFilter === 'Hindi' && (sub.includes('hindi') || sub.includes('hindi_grammar') || sub.includes('hindi_kalika'))) return true;
    if (optionalFilter === 'Sanskrit' && (sub.includes('sanskrit') || sub.includes('sanskrit_grammar') || sub.includes('sanskritakalika'))) return true;
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
    
    // Check class overrides (Respecting specific class overrides)
    const classKey = `class${studentClassStr}`;
    const overrides = translations[language]?.classSubjectOverrides?.[classKey] as Record<string, string>;
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

  const getRoadmapForClass = (classStr: string) => {
    switch (classStr) {
      case '1': return ROADMAP_DATA_1;
      case '2': return ROADMAP_DATA_2;
      case '3': return ROADMAP_DATA_3;
      case '4': return ROADMAP_DATA_4;
      case '5': return ROADMAP_DATA_5;
      case '6': return ROADMAP_DATA_6;
      case '7': return ROADMAP_DATA_7;
      case '8': return ROADMAP_DATA_8;
      case '9': return ROADMAP_DATA_9;
      case '10': return ROADMAP_DATA_10;
      default: return ROADMAP_DATA; // fallback to Class 10 (ROADMAP_DATA)
    }
  };

  const getOdiaClassStr = (classStr: string) => {
    switch (classStr) {
      case '1': return '୧ମ';
      case '2': return '୨ୟ';
      case '3': return '୩ୟ';
      case '4': return '୪ର୍ଥ';
      case '5': return '୫ମ';
      case '6': return '୬ଷ୍ଠ';
      case '7': return '୭ମ';
      case '8': return '୮ମ';
      case '9': return '୯ମ';
      case '10': return '୧୦ମ';
      default: return classStr;
    }
  };

  const activeRoadmap = getRoadmapForClass(studentClassStr);

  const [activeMilestoneKey, setActiveMilestoneKey] = useState<string>('');

  useEffect(() => {
    if (studentClassStr === '9' || studentClassStr === '10') {
      fetch(`/api/syllabus/class-${studentClassStr}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.activeMilestone) {
            setActiveMilestoneKey(data.activeMilestone);
          }
        })
        .catch(err => console.error('Error fetching active milestone:', err));
    }
  }, [studentClassStr]);

  // Flatten and cache all chapters for Class 9/10 to filter dynamically
  const allClassChapters = React.useMemo(() => {
    if (studentClassStr !== '9' && studentClassStr !== '10') return [];
    const roadmap = getRoadmapForClass(studentClassStr);
    if (!Array.isArray(roadmap)) return [];
    
    const chaptersMap = new Map<string, any>();
    roadmap.forEach(entry => {
      if (Array.isArray(entry.chapters)) {
        entry.chapters.forEach(ch => {
          chaptersMap.set(ch.id, {
            ...ch,
            month: entry.month // Store month to map optional subjects later
          });
        });
      }
    });
    return Array.from(chaptersMap.values());
  }, [studentClassStr]);

  // Filter and group standard chapters into their official exam milestones
  const milestonesWithChapters = React.useMemo(() => {
    if (studentClassStr !== '9' && studentClassStr !== '10') return [];
    const mappings = studentClassStr === '9' ? BSE_SYLLABUS_MAPPING_9 : BSE_SYLLABUS_MAPPING_10;
    
    const milestoneMonthsMap: Record<string, string[]> = {
      ia1: ["June 2026", "July 2026"],
      ia2: ["August 2026"],
      half_yearly: ["June 2026", "July 2026", "August 2026", "September 2026"],
      ia3: ["October 2026", "November 2026"],
      ia4: ["December 2026", "January 2027"],
      annual: [
        "June 2026", "July 2026", "August 2026", "September 2026",
        "October 2026", "November 2026", "December 2026", "January 2027",
        "February 2027"
      ]
    };

    return mappings.map(milestone => {
      const matchedChapters: any[] = [];
      
      // 1. Match core subjects
      Object.keys(milestone.subjects).forEach(subKey => {
        const allowedSubstrings = milestone.subjects[subKey];
        
        const matches = allClassChapters.filter(ch => {
          const chSub = ch.subject.toLowerCase();
          
          // Map standard subjects (e.g. algebra/geometry/math -> math, physical/life_science -> science, etc.)
          const titleText = `${ch.title || ''} ${ch.title_en || ''} ${ch.title_or || ''}`.toLowerCase();
          const stdSub = chSub.includes('algebra') ? 'algebra' :
                         chSub.includes('geometry') ? 'geometry' :
                         chSub.includes('math') ? 'math' :
                         chSub.includes('life_science') ? 'life_science' :
                         chSub.includes('physical_science') ? 'physical_science' :
                         chSub.includes('social_science') ? 'social_science' :
                         chSub.includes('science') ? 'physical_science' :
                         (chSub.includes('social') || chSub.includes('history')) ? 'social_science' :
                         chSub.includes('geography') ? (
                           (titleText.includes('econom') || 
                            titleText.includes('price') || 
                            titleText.includes('consumer') || 
                            titleText.includes('poverty') || 
                            titleText.includes('unemploy') || 
                            titleText.includes('industrial') || 
                            titleText.includes('enterpris') ||
                            titleText.includes('ଅର୍ଥ') ||
                            titleText.includes('ଦର') ||
                            titleText.includes('ଭୋକ୍ତା')
                           ) ? 'economics' : 'geography'
                         ) :
                         chSub.includes('economics') ? 'economics' :
                         chSub.includes('english_grammar') ? 'english_grammar' :
                         chSub.includes('english') ? 'english' :
                         chSub.includes('odia_grammar') ? 'odia_grammar' :
                         chSub.includes('odia') ? 'odia' : chSub;
                         
          if (stdSub !== subKey) return false;
          
          return allowedSubstrings.some(allowed => 
            titleText.includes(allowed.toLowerCase())
          );
        });
        
        matchedChapters.push(...matches);
      });
      
      // 2. Match optional subjects dynamically by study month
      const allowedMonths = milestoneMonthsMap[milestone.key] || [];
      const optionalMatches = allClassChapters.filter(ch => {
        const chSub = ch.subject.toLowerCase();
        const isOptional = chSub.includes('hindi') || chSub.includes('sanskrit') || chSub.includes('vocational');
        if (!isOptional) return false;
        
        return allowedMonths.includes((ch as any).month);
      });
      
      matchedChapters.push(...optionalMatches);
      
      return {
        ...milestone,
        chapters: matchedChapters
      };
    });
  }, [studentClassStr, allClassChapters]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-32"
    >
      <SEO 
        title={translate(
          `Gundulu's Journey - 9 Month Roadmap | Class ${studentClassStr}`,
          `ଗୁଣ୍ଡୁଲୁର ଯାତ୍ରା - ୯ ମାସର ରୋଡମ୍ୟାପ୍ | ${getOdiaClassStr(studentClassStr)} ଶ୍ରେଣୀ`
        )}
        description={`Follow Gundulu on a 9-month epic journey to master the entire Class ${studentClassStr} syllabus!`}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap py-4 border-b border-white/5">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 flex items-center gap-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            <Compass className="text-emerald-400" size={32} />
            {translate("Gundulu's Journey", "ଗୁଣ୍ଡୁଲୁର ଯାତ୍ରା")}
          </h1>
          <p className="text-slate-400 max-w-2xl text-sm md:text-base font-semibold">
            {translate(
              "Your epic 9-month roadmap from June 2026 to February 2027. Explore the islands below to see your recommended monthly chapters!",
              "ଜୁନ୍ ୨୦୨୬ ରୁ ଫେବୃଆରୀ ୨୦୨୭ ପର୍ଯ୍ୟନ୍ତ ଆପଣଙ୍କର ୯ ମାସର ରୋଡମ୍ୟାପ୍ | ମାସିକ ଅଧ୍ୟାୟଗୁଡିକ ଦେଖିବାକୁ ନିମ୍ନରେ ଥିବା ଦ୍ୱୀପପୁଞ୍ଜଗୁଡିକୁ ଏକ୍ସପ୍ଲୋର୍ କରନ୍ତୁ!"
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(studentClassStr === '9' || studentClassStr === '10') && (
            <a
              href="/bse-odisha-syllabus-and-exam-notifications.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold text-sm shadow-sm"
            >
              <BookOpen size={16} />
              {translate('Syllabus PDF', 'ସିଲାବସ୍ PDF')}
            </a>
          )}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-all font-bold text-sm shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            {translate('Return to Dashboard', 'ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ')}
          </button>
        </div>
      </div>

      {/* Filter Section */}
      {(studentClassStr === '9' || studentClassStr === '10') && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-sm bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10">
            <Filter size={16} className="text-emerald-400" />
            {translate('Select Optional Subject:', 'ବୈକଳ୍ପିକ ବିଷୟ ବାଛନ୍ତୁ:')}
          </div>
          {(studentClassStr === '9' ? ['All', 'Hindi', 'Sanskrit'] : ['All', 'Hindi', 'Sanskrit', 'Vocational']).map((opt) => (
            <button
              key={opt}
              onClick={() => setOptionalFilter(opt as any)}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border cursor-pointer ${
                optionalFilter === opt 
                  ? 'bg-[#b34d1f] text-white border-[#b34d1f] shadow-md shadow-orange-950/20' 
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/10'
              }`}
              style={optionalFilter === opt ? { color: '#ffffff' } : undefined}
            >
              {opt === 'All' ? translate('Show All', 'ସବୁ ଦେଖାନ୍ତୁ') : opt}
            </button>
          ))}
        </div>
      )}

      {/* Gamified Map Area */}
      <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/30 backdrop-blur-md p-6 md:p-12 shadow-2xl force-dark-theme">
        {/* Decorative Map Background */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
        
        {/* Decorative Floating Background Elements */}
        <Cloud className="absolute top-10 left-10 text-white opacity-10 animate-pulse" size={64} />
        <Cloud className="absolute top-1/4 right-10 text-white opacity-20" size={80} />
        <Cloud className="absolute top-1/2 left-4 text-white opacity-10" size={48} />
        <Star className="absolute top-1/3 left-1/4 text-yellow-500/40 opacity-60 animate-bounce" size={24} />
        <Star className="absolute bottom-1/4 right-1/4 text-yellow-500/40 opacity-50" size={32} />

        {/* The Winding Path Line */}
        <div className="absolute top-16 bottom-16 left-1/2 -translate-x-1/2 w-2 bg-emerald-950/40 rounded-full z-0">
          <div className="w-full h-full border-l-4 border-dashed border-emerald-500/30 rounded-full"></div>
        </div>

        {/* Start Marker */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-950 p-3 rounded-full shadow-lg border border-emerald-500/30">
          <Flag className="text-emerald-400" size={24} />
        </div>

        <div className="flex flex-col gap-16 md:gap-20 relative z-10 py-16">
          {(studentClassStr === '9' || studentClassStr === '10' ? milestonesWithChapters : activeRoadmap).map((monthData: any, idx) => {
            const isMilestone = studentClassStr === '9' || studentClassStr === '10';
            const visibleCount = monthData.chapters.filter((c: any) => isVisibleChapter(c.subject)).length;
            const isLeft = idx % 2 === 0;
            
            // Check if active based on monthly or milestone key
            const isCurrent = isMilestone 
              ? monthData.key === activeMilestoneKey
              : monthData.month === currentMonth;

            return (
              <div key={idx} className={`flex w-full ${isLeft ? 'justify-start' : 'justify-end'} relative md:px-12`}>
                {/* Horizontal connecting branch */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 h-2 bg-emerald-950/40 -z-10 w-[40%] md:w-[35%] rounded-full ${
                    isLeft ? 'left-1/2 md:left-[35%]' : 'right-1/2 md:right-[35%]'
                  }`}
                >
                  <div className={`w-full h-full border-t-4 border-dashed rounded-full ${isCurrent ? 'border-amber-500/30' : 'border-emerald-500/30'}`}></div>
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
                  className={`group relative bg-slate-950/80 p-5 md:p-6 w-[150px] md:w-[220px] rounded-[2.5rem] border shadow-[0_15px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all flex flex-col items-center justify-center text-center overflow-visible z-20 cursor-pointer ${
                    isCurrent ? 'border-amber-400/50 ring-4 ring-amber-400/10' : 'border-white/10 hover:border-emerald-500/50'
                  }`}
                >
                  {/* Outer Glow on Hover or Current Month */}
                  <div className={`absolute inset-0 rounded-[2.5rem] blur-xl transition-opacity ${
                    isCurrent ? 'bg-amber-400/10 opacity-100 animate-pulse' : 'bg-emerald-400/10 opacity-0 group-hover:opacity-100'
                  }`}></div>
                  
                  {isCurrent && (
                    <div className="absolute -top-4 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg border border-white/20 transform rotate-12 z-30">
                      {isMilestone ? (language === 'en' ? 'ACTIVE TEST' : 'ସକ୍ରିୟ ପରୀକ୍ଷା') : (language === 'en' ? 'CURRENT' : 'ସାମ୍ପ୍ରତିକ')}
                    </div>
                  )}

                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full p-1.5 mb-3 shadow-lg relative ${
                    isCurrent ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20' : 'bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-emerald-500/20'
                  }`}>
                    <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                      {isCurrent ? (
                        <Star className="text-amber-400 group-hover:text-orange-400 transition-colors" size={24} />
                      ) : (
                        <MapIcon className="text-emerald-400 group-hover:text-cyan-400 transition-colors" size={24} />
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-xs md:text-sm font-black text-white mb-1 tracking-wide leading-snug font-serif px-1 max-w-full overflow-hidden text-ellipsis">
                    {isMilestone 
                      ? (language === 'en' ? monthData.title_en : monthData.title_or)
                      : monthData.month.split(' ')[0]}
                  </h3>
                  <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-3 leading-none">
                    {isMilestone
                      ? (language === 'en' ? monthData.target_date_en : monthData.target_date_or)
                      : monthData.month.split(' ')[1]}
                  </p>
                  
                  <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black flex items-center gap-1 border ${
                    isCurrent ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-white/5 text-slate-300 border-white/10'
                  }`}>
                    <BookOpen size={10} className={isCurrent ? 'text-amber-400' : 'text-emerald-400'} />
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden force-dark-theme"
            >
              <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 font-serif">
                    <span className="text-emerald-400">
                      {(studentClassStr === '9' || studentClassStr === '10')
                        ? (language === 'en' ? selectedMonth.title_en : selectedMonth.title_or)
                        : selectedMonth.month}
                    </span>
                    <span className="text-slate-400 text-lg font-sans font-bold uppercase tracking-widest">{language === 'en' ? 'Mission' : 'ଲକ୍ଷ୍ୟ'}</span>
                  </h2>
                  <p className="text-slate-400 mt-1 text-sm font-semibold">
                    {(studentClassStr === '9' || studentClassStr === '10')
                      ? (language === 'en' ? 'Recommended chapters for this exam milestone.' : 'ଏହି ପରୀକ୍ଷା ମୂଲ୍ୟାଙ୍କନ ପାଇଁ ପ୍ରସ୍ତାବିତ ଅଧ୍ୟାୟଗୁଡ଼ିକ।')
                      : (language === 'en' ? 'Recommended chapters to conquer this month.' : 'ଏହି ମାସରେ ସମାପ୍ତ କରିବାକୁ ଥିବା ଅଧ୍ୟାୟଗୁଡ଼ିକ।')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedMonth(null)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/40">
                {/* Milestone Test Series Call To Action (For Class 9 and 10) */}
                {(studentClassStr === '9' || studentClassStr === '10') && (
                  <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-orange-950/10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                        <Trophy className="text-orange-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-white font-black text-base md:text-lg tracking-wide leading-snug">
                          {language === 'en' 
                            ? `Take the ${selectedMonth.title_en} Mock Exam!` 
                            : `${selectedMonth.title_or} ମକ୍ ପରୀକ୍ଷା ଦିଅନ୍ତୁ!`}
                        </h3>
                        <p className="text-slate-300 text-xs md:text-sm font-medium mt-0.5">
                          {language === 'en'
                            ? "Practice standard BSE Odisha pattern mock tests to score top marks."
                            : "ଉତ୍ତମ ନମ୍ବର ରଖିବା ପାଇଁ standard BSE Odisha ପ୍ୟାଟର୍ଣ୍ଣ ମକ୍ ଟେଷ୍ଟ ଅଭ୍ୟାସ କରନ୍ତୁ।"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMonth(null); // Close modal
                        // Trigger event to change tab to monthly tests
                        window.dispatchEvent(new CustomEvent('changeTab', { detail: 'monthly_tests' }));
                      }}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-sm shadow-md hover:shadow-orange-500/20 transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
                    >
                      <Trophy size={16} />
                      {language === 'en' ? 'Go to Test Series' : 'ଟେଷ୍ଟ ସିରିଜ୍ କୁ ଯାଆନ୍ତୁ'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedMonth.chapters.filter((c: any) => isVisibleChapter(c.subject)).map((chapter: any, idx: number) => {
                    // Clean up ugly file name artifacts from the title
                    let rawTitle = typeof chapter.title === 'string'
                      ? ((language === 'en' ? chapter.title_en : chapter.title_or) || chapter.title)
                      : ((chapter.title as any)?.[language] || (chapter.title as any)?.or || (chapter.title as any)?.en || "Untitled Chapter");
                    
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
                      <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <BookOpen size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-sm md:text-base leading-tight mb-2">
                            {cleanTitle || rawTitle}
                          </h4>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white/5 text-slate-400 border border-white/5">
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
