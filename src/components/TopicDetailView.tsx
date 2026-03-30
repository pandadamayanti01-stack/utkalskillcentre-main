import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Play, FileText, HelpCircle, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import { translations } from '../translations';
import { Chapter } from '../types';
import { getLocalizedSubject } from '../utils/helpers';
import { getYouTubeEmbedUrl } from '../utils/youtube';
import { PracticeQuestion } from './PracticeQuestion';
import { OfflineService } from '../services/offlineService';

interface TopicDetailViewProps {
  topic: Chapter;
  onBack: () => void;
  onTakeQuiz: () => void;
  language: 'or' | 'en';
  isPremium: boolean;
  onUpgrade: () => void;
}

export function TopicDetailView({ 
  topic, 
  onBack, 
  onTakeQuiz, 
  language,
  isPremium,
  onUpgrade
}: TopicDetailViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'video' | 'notes' | 'practice'>('video');

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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Topics</span>
      </motion.button>

      <motion.div variants={itemVariants} className="glass-card neon-border rounded-[2.5rem] overflow-hidden mb-8 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
        <div className="p-6 md:p-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{typeof topic.title === 'string' ? topic.title : topic.title[language]}</h1>
              {topic.teacherOrChannel && <p className="text-lg text-emerald-400 font-medium mt-2">{topic.teacherOrChannel}</p>}
            </div>
            
            {topic.quizId && (
              <button 
                onClick={onTakeQuiz}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] whitespace-nowrap border border-emerald-500/50"
              >
                <Trophy size={20} />
                <span>Take Quiz</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 bg-slate-900/50 p-2 rounded-2xl w-full md:w-fit mb-8 overflow-x-auto scrollbar-hide border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setActiveSubTab('video')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'video' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Play size={16} /> {translations[language].video}
            </button>
            {topic.notes && (
              <button 
                onClick={() => setActiveSubTab('notes')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'notes' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={16} /> {translations[language].notes}
              </button>
            )}
            {topic.quiz_questions && topic.quiz_questions.length > 0 && (
              <button 
                onClick={() => setActiveSubTab('practice')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'practice' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <HelpCircle size={16} /> Practice
              </button>
            )}
            <button 
              onClick={() => {
                if (topic.notes) {
                  OfflineService.saveNote(topic.id, topic.notes);
                  alert(language === 'en' ? 'Notes saved for offline!' : 'ନୋଟ୍ ଅଫଲାଇନ୍ ପାଇଁ ସେଭ୍ ହୋଇଛି!');
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Download size={16} /> {language === 'en' ? 'Save Offline' : 'ଅଫଲାଇନ୍ ସେଭ୍ କରନ୍ତୁ'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'video' && (
              <motion.div 
                key="video"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center"
              >
                {topic.videoUrl ? (
                  <iframe 
                    src={getYouTubeEmbedUrl(topic.videoUrl)}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                      <Play size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Video content is currently being updated.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeSubTab === 'notes' && (
              <motion.div 
                key="notes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-800/30 rounded-2xl p-8 prose prose-invert max-w-none border border-white/5"
              >
                <div className="markdown-body">
                  <Markdown>{topic.notes}</Markdown>
                </div>
              </motion.div>
            )}
            
            {activeSubTab === 'practice' && topic.quiz_questions && (
              <motion.div 
                key="practice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {(topic.quiz_questions || []).map((q, i) => (
                  <PracticeQuestion 
                    key={i} 
                    question={q} 
                    isPremium={isPremium} 
                    language={language} 
                    onUpgrade={onUpgrade} 
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
