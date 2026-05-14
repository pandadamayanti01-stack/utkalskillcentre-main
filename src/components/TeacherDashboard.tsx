import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateHomeworkSheet } from '../services/aiService';

interface TeacherDashboardProps {
  user: any;
  language: 'en' | 'or';
  chapters: any[];
}

export function TeacherDashboard({ user, language, chapters }: TeacherDashboardProps) {
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkClass, setHomeworkClass] = useState('10');
  const [homeworkSubject, setHomeworkSubject] = useState('math');
  const [homeworkChapter, setHomeworkChapter] = useState('');
  const [homeworkDifficulty, setHomeworkDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [homeworkQCount, setHomeworkQCount] = useState(10);
  const [isGeneratingHomework, setIsGeneratingHomework] = useState(false);
  const [generatedHomework, setGeneratedHomework] = useState('');

  // Tuition Batches Mock State
  const [batches, setBatches] = useState([
    { id: '1', name: 'Class 10 Evening Batch', code: 'UTKAL-X-EVE', studentsCount: 14 },
    { id: '2', name: 'Class 9 Morning Math', code: 'UTKAL-IX-MORN', studentsCount: 8 }
  ]);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    const code = `UTKAL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setBatches([...batches, { id: Date.now().toString(), name: newBatchName, code, studentsCount: 0 }]);
    setNewBatchName('');
    setShowNewBatchModal(false);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* 1. Header Banner */}
      <motion.div variants={itemVariants} className="glass-card rounded-[2.5rem] p-8 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900/80 border border-purple-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest">
              <Lucide.Sparkles size={14} className="animate-pulse" />
              {language === 'en' ? 'Educator Studio Mode' : 'ଶିକ୍ଷକ ଷ୍ଟୁଡିଓ ମୋଡ୍'}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {language === 'en' ? `Welcome, ${user?.name || 'Educator'}!` : `ସ୍ୱାଗତମ୍, ${user?.name || 'ଶିକ୍ଷକ'}!`}
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              {language === 'en' 
                ? 'Empowering Odisha teachers with instant AI question generators, printable worksheets, and virtual tuition batch tracking.'
                : 'ଓଡ଼ିଆ ଶିକ୍ଷକମାନଙ୍କ ପାଇଁ AI ପ୍ରଶ୍ନପତ୍ର ନିର୍ମାତା, ପ୍ରିଣ୍ଟେବଲ୍ ୱାର୍କସିଟ୍ ଏବଂ ଟ୍ୟୁସନ୍ ବ୍ୟାଚ୍ ଟ୍ରାକିଂ ବ୍ୟବସ୍ଥା।'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => setShowHomeworkModal(true)}
              className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-900/30 transition-all flex items-center justify-center gap-2 group"
            >
              <Lucide.Printer size={18} className="group-hover:scale-110 transition-transform" />
              <span>{language === 'en' ? 'AI Worksheet Maker' : 'AI ପ୍ରଶ୍ନପତ୍ର ପ୍ରସ୍ତୁତକାରୀ'}</span>
            </button>
            <button 
              onClick={() => setShowNewBatchModal(true)}
              className="px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
            >
              <Lucide.Plus size={18} />
              <span>{language === 'en' ? 'New Batch' : 'ନୂଆ ବ୍ୟାଚ୍'}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Flagship AI Worksheet Generator Card */}
      <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 border border-purple-500/20">
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.3)] flex items-center justify-center shrink-0">
            <span className="text-4xl">📝</span>
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              {language === 'en' ? 'Viral Growth Tool' : 'ଭାଇରାଲ୍ ଗ୍ରୋଥ୍ ଟୁଲ୍'}
            </div>
            <h3 className="text-2xl font-black text-white">
              {language === 'en' ? 'AI Homework & Test Sheet Generator' : 'AI ପ୍ରଶ୍ନପତ୍ର ଓ ହୋମୱାର୍କ ପ୍ରସ୍ତୁତକାରୀ'}
            </h3>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {language === 'en' 
                ? 'Generate bilingual school-standard homework worksheets, mock test sheets, and confidential teacher answer keys. Printed sheets automatically embed the Utkal QR badge for your students to download the app.'
                : 'ଗୁଣ୍ଡୁଲୁ AI ଦ୍ୱାରା ଦ୍ୱିଭାଷୀ ବିଦ୍ୟାଳୟ-ମାନକ ହୋମୱାର୍କ ସିଟ୍ ଓ ମକ୍ ଟେଷ୍ଟ ତୁରନ୍ତ ପ୍ରସ୍ତୁତ କରନ୍ତୁ। ପ୍ରିଣ୍ଟେବଲ୍ ସିଟ୍ ରେ ଛାତ୍ରମାନଙ୍କ ପାଇଁ QR କୋଡ୍ ରହିବ।'}
            </p>
            <div className="pt-2">
              <button 
                onClick={() => setShowHomeworkModal(true)}
                className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-purple-900/30 transition-all"
              >
                {language === 'en' ? 'Open Generator Studio →' : 'ଷ୍ଟୁଡିଓ ଖୋଲନ୍ତୁ →'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Tuition Batch / Student Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 border border-white/10 space-y-6 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Lucide.Users size={20} />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'en' ? 'Tuition Batches' : 'ଟ୍ୟୁସନ୍ ବ୍ୟାଚ୍ ସମୂହ'}
              </h3>
            </div>
            <button 
              onClick={() => setShowNewBatchModal(true)}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Lucide.Plus size={14} /> {language === 'en' ? 'Add Batch' : 'ବ୍ୟାଚ୍ ଯୋଡନ୍ତୁ'}
            </button>
          </div>

          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-purple-500/30 transition-colors">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">{batch.name}</h4>
                  <p className="text-xs text-slate-400 font-medium">Invite Code: <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{batch.code}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">{batch.studentsCount}</span>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Students</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 4. Student Performance Radar */}
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 border border-white/10 space-y-6 bg-slate-900/40 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Lucide.TrendingUp size={20} />
              </div>
              <h3 className="text-lg font-black text-white">
                {language === 'en' ? 'Batch Analytics Radar' : 'ବ୍ୟାଚ୍ ଆନାଲିଟିକ୍ସ'}
              </h3>
            </div>
            <p className="text-slate-400 text-xs">
              {language === 'en' ? 'Monitor daily MCQ accuracy and test scores for linked students.' : 'ଲିଙ୍କ୍ ହୋଇଥିବା ଛାତ୍ରଛାତ୍ରୀଙ୍କ ସ୍କୋର୍ ଓ ପ୍ରଗତି ଟ୍ରାକ୍ କରନ୍ତୁ।'}
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/5 text-center space-y-3">
            <Lucide.BarChart2 size={40} className="mx-auto text-emerald-400 opacity-80" />
            <p className="text-sm font-bold text-white">Average Batch Accuracy: <span className="text-emerald-400">84%</span></p>
            <p className="text-xs text-slate-400">Top Performing Topic: Quadratic Equations</p>
          </div>
        </motion.div>
      </div>

      {/* New Batch Modal */}
      <AnimatePresence>
        {showNewBatchModal && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-black text-white">Create New Tuition Batch</h3>
                <button onClick={() => setShowNewBatchModal(false)} className="text-slate-400 hover:text-white">
                  <Lucide.X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateBatch} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">Batch Name</label>
                  <input 
                    type="text" 
                    value={newBatchName} 
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="e.g. Class 10 Evening Batch" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold outline-none focus:border-purple-500" 
                    autoFocus
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                  Generate Invite Code
                </button>
              </form>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* AI Homework Generator Modal */}
      <AnimatePresence>
        {showHomeworkModal && createPortal(
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900/90 border border-purple-500/20 rounded-[32px] w-full max-w-3xl p-6 sm:p-8 relative shadow-2xl my-8 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <h3 className="text-xl font-black text-white">
                      {language === 'en' ? 'Gundulu AI Homework Maker' : 'ଗୁଣ୍ଡୁଲୁ AI ପ୍ରଶ୍ନପତ୍ର ନିର୍ମାତା'}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Create printable school worksheets instantly
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowHomeworkModal(false);
                    setGeneratedHomework('');
                  }}
                  className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Lucide.X size={20} />
                </button>
              </div>

              {!generatedHomework ? (
                <div className="space-y-6 overflow-y-auto pr-2 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Select Class */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class / Standard</label>
                      <select 
                        value={homeworkClass}
                        onChange={(e) => setHomeworkClass(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <option key={num} value={num}>Class {num}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Subject */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
                      <select 
                        value={homeworkSubject}
                        onChange={(e) => setHomeworkSubject(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none"
                      >
                        <option value="math">Mathematics (ଗଣିତ)</option>
                        <option value="science">Science (ବିଜ୍ଞାନ)</option>
                        <option value="english">English (ଇଂରାଜୀ)</option>
                        <option value="odia">Odia (ଓଡ଼ିଆ)</option>
                      </select>
                    </div>
                  </div>

                  {/* Chapter Select / Type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select or Type Chapter Title</label>
                    {chapters && chapters.filter(c => String(c.class || '').replace(/\D/g, '') === String(homeworkClass) && (c.subject || '').toLowerCase() === homeworkSubject).length > 0 ? (
                      <select
                        value={homeworkChapter}
                        onChange={(e) => setHomeworkChapter(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none"
                      >
                        <option value="">-- Choose Chapter --</option>
                        {chapters
                          .filter(c => String(c.class || '').replace(/\D/g, '') === String(homeworkClass) && (c.subject || '').toLowerCase() === homeworkSubject)
                          .map((c, i) => (
                            <option key={i} value={c.title}>{c.title}</option>
                          ))
                        }
                      </select>
                    ) : (
                      <input 
                        type="text"
                        placeholder="e.g. Quadratic Equations, Linear Motion, Pronouns..."
                        value={homeworkChapter}
                        onChange={(e) => setHomeworkChapter(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none placeholder:text-slate-700"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Select Difficulty */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['easy', 'medium', 'hard'].map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setHomeworkDifficulty(diff as any)}
                            className={`py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                              homeworkDifficulty === diff 
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30' 
                                : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Question Count */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Questions</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[5, 10, 15].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setHomeworkQCount(count)}
                            className={`py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                              homeworkQCount === count 
                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/30' 
                                : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {count} Qs
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 shrink-0">
                    <button
                      type="button"
                      disabled={isGeneratingHomework || !homeworkChapter}
                      onClick={async () => {
                        setIsGeneratingHomework(true);
                        try {
                          const sheet = await generateHomeworkSheet(
                            `Class ${homeworkClass}`,
                            homeworkSubject.toUpperCase(),
                            homeworkChapter,
                            homeworkDifficulty,
                            homeworkQCount,
                            language
                          );
                          setGeneratedHomework(sheet);
                        } catch (err) {
                          alert('Failed to generate. Please try again!');
                        } finally {
                          setIsGeneratingHomework(false);
                        }
                      }}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-900/30 transition-all transform hover:scale-102 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isGeneratingHomework ? (
                        <>
                          <Lucide.Loader2 size={16} className="animate-spin" />
                          <span>Gundulu AI is Compiling Worksheet...</span>
                        </>
                      ) : (
                        <>
                          <Lucide.Sparkles size={16} />
                          <span>Generate Homework Sheet ✨</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto border border-white/5 rounded-2xl p-6 bg-slate-950/50 mb-6 relative">
                    <div id="printable-homework-sheet" className="prose prose-invert max-w-none text-slate-300 font-medium">
                      <style>{`
                        @media print {
                          body * {
                            visibility: hidden;
                          }
                          #printable-homework-sheet, #printable-homework-sheet * {
                            visibility: visible;
                          }
                          #printable-homework-sheet {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white !important;
                            color: black !important;
                            padding: 40px !important;
                          }
                          .print-hidden {
                            display: none !important;
                          }
                        }
                      `}</style>
                      
                      <ReactMarkdown>{generatedHomework}</ReactMarkdown>

                      {/* Viral Growth Inviter block (Printed on Worksheet) */}
                      <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-500 text-center space-y-4">
                        <div className="inline-flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 px-5 py-3 rounded-2xl text-purple-400">
                          <Lucide.Sparkles size={18} className="animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-widest">Verified by Utkal Skill Centre AI</span>
                        </div>
                        <h4 className="text-md font-black text-white leading-snug">
                          {language === 'en' 
                            ? 'Students! Check step-by-step interactive solutions on the App!' 
                            : 'ଛାତ୍ରଛାତ୍ରୀମାନେ! ଆପ୍ ରେ ପଦକ୍ଷେପ-କ୍ରମିକ ସମାଧାନ ଏବଂ ସନ୍ଦେହ ମୋଚନ ଦେଖନ୍ତୁ!'}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-lg mx-auto">
                          {language === 'en'
                            ? 'Scan this worksheets custom invitation to ask Gundulu AI, practice daily MCQs, and access bilingual textbooks for FREE!'
                            : 'ମାଗଣାରେ ଗୁଣ୍ଡୁଲୁ AI କୁ ପ୍ରଶ୍ନ ପଚାରିବା, ଦୈନିକ MCQ ଟେଷ୍ଟ ଦେବା ଏବଂ ପାଠ୍ୟପୁସ୍ତକ ପାଇଁ ଆପ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ!'}
                        </p>
                        
                        {/* Interactive Vector Mock QR Code block */}
                        <div className="w-40 h-40 bg-white p-3 rounded-2xl mx-auto flex flex-col justify-between shadow-xl">
                          <div className="flex justify-between h-[30%]">
                            <div className="w-[30%] h-full bg-purple-600 rounded" />
                            <div className="w-[30%] h-full bg-purple-600 rounded" />
                          </div>
                          <div className="flex justify-between items-center h-[30%]">
                            <div className="w-[30%] h-full flex items-center justify-center font-black text-[9px] text-purple-600 uppercase tracking-tighter">UTKAL</div>
                            <div className="w-[30%] h-full bg-purple-600 rounded" />
                          </div>
                          <div className="flex justify-between h-[30%]">
                            <div className="w-[30%] h-full bg-purple-600 rounded" />
                            <div className="w-[30%] h-full bg-purple-600 rounded" />
                          </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">www.utkalskillcentre.com</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGeneratedHomework('')}
                      className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-black text-xs uppercase tracking-wider transition-all"
                    >
                      {language === 'en' ? 'Create Another Worksheet' : 'ଆଉ ଏକ ପ୍ରସ୍ତୁତ କରନ୍ତୁ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Lucide.Printer size={16} />
                      <span>{language === 'en' ? 'Print Worksheet / Save PDF' : 'ପ୍ରିଣ୍ଟ କରନ୍ତୁ / PDF ସେଭ୍ କରନ୍ତୁ'}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </motion.div>
  );
}
