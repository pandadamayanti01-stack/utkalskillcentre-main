import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateHomeworkSheet, generateLessonPlan, generatePracticalActivities } from '../services/aiService';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  query,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { CLASS_SUBJECTS } from './DigitalLibraryView';
import NeuralBackground from './NeuralBackground';

interface TeacherDashboardProps {
  user: any;
  language: 'en' | 'or';
  chapters: any[];
  setActiveTab?: (tab: string) => void;
  textbooksCount?: number;
  isPremium?: boolean;
  loadChapters?: (classStr: string) => Promise<void>;
}

export function TeacherDashboard({ 
  user, 
  language, 
  chapters, 
  setActiveTab, 
  textbooksCount = 0, 
  isPremium = false,
  loadChapters 
}: TeacherDashboardProps) {
  // Subtabs State
  const [activeSubTab, setActiveSubTab] = useState<'workspace' | 'library' | 'broadcast' | 'educator_board'>('workspace');

  // Video Suggestion Form State
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestUrl, setSuggestUrl] = useState('');
  const [suggestSubject, setSuggestSubject] = useState('algebra');
  const [suggestClass, setSuggestClass] = useState('10');
  const [isSuggesting, setIsSuggesting] = useState(false);

  // AI Generator Modal State
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [generatorType, setGeneratorType] = useState<'worksheet' | 'lesson_plan' | 'practical_activity'>('worksheet');
  
  // Generator Inputs
  const [inputClass, setInputClass] = useState('10');
  const [inputSubject, setInputSubject] = useState('algebra');
  const [inputChapter, setInputChapter] = useState('');
  const [inputDifficulty, setInputDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [inputQCount, setInputQCount] = useState(10);
  
  // Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [answerKeyMode, setAnswerKeyMode] = useState<'student' | 'teacher'>('student');
  const [loadingStep, setLoadingStep] = useState(0);

  // Mascot Video Control Refs & State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  // sound mute toggle handler
  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  // Local Resources Library State
  const [savedResources, setSavedResources] = useState<any[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // Fetch suggested videos live status
  const [mySuggestions, setMySuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Tuition Batches Mock State
  const [batches, setBatches] = useState([
    { id: '1', name: 'Class 10 Evening Batch', code: 'UTKAL-X-EVE', studentsCount: 14 },
    { id: '2', name: 'Class 9 Morning Math', code: 'UTKAL-IX-MORN', studentsCount: 8 }
  ]);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  // Teaching Tips
  const teacherTips = useMemo(() => [
    "Tip: Introduce a 5E Lesson Plan for active student engagement. (ପାଞ୍ଚଟି 'E' ପାଠ୍ୟଯୋଜନା ଦ୍ୱାରା ପିଲାଙ୍କୁ ଅଧିକ ସକ୍ରିୟ କରନ୍ତୁ।)",
    "Tip: Worksheets with mixed difficulty levels help test overall student progress. (ସାଧାରଣ ଓ ଜଟିଳ ପ୍ରଶ୍ନପତ୍ରର ମିଶ୍ରଣରେ ପିଲାଙ୍କ ପ୍ରଗତି ସହଜରେ ମାପିହେବ।)",
    "Tip: Promote your best video lectures to help students across Odisha. (ଆପଣଙ୍କର ଭିଡିଓ ଲେସନଗୁଡ଼ିକୁ ପ୍ରୋମୋଟ୍ କରି ଓଡ଼ିଶାର ଅନ୍ୟ ପିଲାଙ୍କ ସହାୟତା କରନ୍ତୁ।)",
    "Tip: Check the textbooks catalog to map questions exactly to the syllabus. (ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ କରିବା ପାଇଁ ବୁକ୍ କାଟାଲଗ୍ ଯାଞ୍ଚ କରନ୍ତୁ।)",
    "Tip: Use low-cost materials for science experiment demonstrations. (ସ୍ୱଳ୍ପ ମୂଲ୍ୟରେ ବିଜ୍ଞାନ ପରୀକ୍ଷା ମଡେଲ ସୃଷ୍ଟି କରି ଶ୍ରେଣୀ ଗୃହରେ ପ୍ରଦର୍ଶନ କରନ୍ତୁ।)",
    "Tip: Use bilingual worksheets (Odia/English) for better concept clarity. (ଓଡ଼ିଆ ଓ ଇଂରାଜୀର ସମ୍ମିଶ୍ରଣରେ ଦ୍ୱିଭାଷୀ ପ୍ରଶ୍ନପତ୍ର ପିଲାଙ୍କ ଧାରଣା ଅଧିକ ସ୍ପଷ୍ଟ କରେ।)"
  ], []);

  const [currentTip, setCurrentTip] = useState('');

  // Load random tip and localStorage generated cache on mount
  useEffect(() => {
    const randomTip = teacherTips[Math.floor(Math.random() * teacherTips.length)];
    setCurrentTip(randomTip);

    try {
      const saved = localStorage.getItem('teacher_generated_resources');
      if (saved) {
        setSavedResources(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to load saved resources:", err);
    }
  }, [teacherTips]);

  // Real-time Firestore sync of video suggestions
  useEffect(() => {
    const teacherId = user?.uid || user?.id;
    if (!teacherId) return;

    setIsLoadingSuggestions(true);
    try {
      const q = query(
        collection(db, 'suggested_videos'),
        where('teacherId', '==', teacherId),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMySuggestions(list);
        setIsLoadingSuggestions(false);
      }, (error) => {
        console.error("Error subscribing to suggested videos:", error);
        setIsLoadingSuggestions(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Failed to set up suggested_videos listener:", err);
      setIsLoadingSuggestions(false);
    }
  }, [user]);

  // Animated pipeline progress step advancing
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 2200);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load chapters for inputClass automatically
  useEffect(() => {
    if (loadChapters && inputClass) {
      loadChapters(inputClass);
    }
  }, [inputClass, loadChapters]);

  // Usage Guard Calculations
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentUsage = user?.aiUsage?.[currentMonth] || 0;
  const hasRemainingRuns = isPremium || currentUsage < 5;

  // Video Suggestion Submission Handler
  const handleSuggestVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPremium) {
      alert(language === 'en' 
        ? "Video suggestions are a Pro feature. Please subscribe to promote your lessons!" 
        : "ଭିଡିଓ ସୁପାରିଶ କରିବା ଏକ ପ୍ରୋ ଫିଚର । ନିଜ ଭିଡିଓ ପ୍ରୋମୋଟ୍ କରିବା ପାଇଁ ଦୟାକରି ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ!");
      setActiveTab?.('plans');
      return;
    }

    if (!suggestTitle.trim() || !suggestUrl.trim()) return;
    setIsSuggesting(true);

    try {
      let videoId = suggestUrl;
      const ytMatch = suggestUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        videoId = ytMatch[1];
      }

      const teacherId = user?.uid || user?.id || '';
      const teacherName = user?.name || 'Educator';

      await addDoc(collection(db, 'suggested_videos'), {
        teacherId,
        teacherName,
        title: suggestTitle.trim(),
        url: suggestUrl.trim(),
        videoId,
        subject: suggestSubject,
        classStr: suggestClass,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      alert(language === 'en' 
        ? "Video suggested successfully! Once approved by the Admin, it will be published in the Smart Classes library for all students in Odisha. ✨"
        : "ଭିଡିଓ ସଫଳତାର ସହ ସୁପାରିଶ ହୋଇଛି! ଆଡମିନ୍ ଯାଞ୍ଚ କରିବା ପରେ ଏହା ଓଡ଼ିଶାର ସମସ୍ତ ପିଲାଙ୍କ ପାଇଁ ସ୍ମାର୍ଟ କ୍ଲାସ ଲାଇବ୍ରେରୀରେ ପ୍ରକାଶିତ ହେବ। ✨");
      
      setSuggestTitle('');
      setSuggestUrl('');
    } catch (err) {
      console.error("Error suggesting video: ", err);
      alert("Failed to submit video suggestion. Please try again.");
    } finally {
      setIsSuggesting(false);
    }
  };

  // AI Content Generation Trigger
  const handleGenerate = async () => {
    if (!inputChapter.trim()) {
      alert(language === 'en' ? "Please enter or select a chapter title." : "ଦୟାକରି ଏକ ଅଧ୍ୟାୟ ଶିରୋନାମା ଚୟନ କରନ୍ତୁ କିମ୍ବା ଲେଖନ୍ତୁ।");
      return;
    }

    if (!hasRemainingRuns) {
      alert(language === 'en'
        ? "You have used all 5 free Gundulu AI generations for this month. Upgrade to Educator Pro for unlimited access!"
        : "ଆପଣ ଏହି ମାସ ପାଇଁ ସମସ୍ତ ୫ଟି ମାଗଣା ଗୁନ୍ଦୁଲୁ AI ଜେନେରେସନ୍ ବ୍ୟବହାର କରିସାରିଛନ୍ତି। ଅସୀମିତ ବ୍ୟବହାର ପାଇଁ ଶିକ୍ଷକ ପ୍ରୋ କୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!");
      setShowGeneratorModal(false);
      setActiveTab?.('plans');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    try {
      const classKey = `class${inputClass}`;
      const subjectsList = CLASS_SUBJECTS[classKey] || [];
      const foundSub = subjectsList.find(s => s.key === inputSubject);
      const displaySubjectName = foundSub ? foundSub.labelEn : inputSubject;

      let result = '';
      if (generatorType === 'worksheet') {
        result = await generateHomeworkSheet(
          `Class ${inputClass}`,
          displaySubjectName,
          inputChapter,
          inputDifficulty,
          inputQCount,
          language
        );
      } else if (generatorType === 'lesson_plan') {
        result = await generateLessonPlan(
          `Class ${inputClass}`,
          displaySubjectName,
          inputChapter,
          language
        );
      } else if (generatorType === 'practical_activity') {
        result = await generatePracticalActivities(
          `Class ${inputClass}`,
          displaySubjectName,
          inputChapter,
          language
        );
      }

      setGeneratedContent(result);

      // Save to localStorage library
      try {
        const newResource = {
          id: Math.random().toString(36).substring(2, 11),
          type: generatorType,
          classStr: inputClass,
          subject: inputSubject,
          chapter: inputChapter,
          difficulty: inputDifficulty,
          qCount: inputQCount,
          content: result,
          timestamp: new Date().toISOString()
        };
        const currentSaved = localStorage.getItem('teacher_generated_resources');
        const list = currentSaved ? JSON.parse(currentSaved) : [];
        const updated = [newResource, ...list];
        setSavedResources(updated);
        localStorage.setItem('teacher_generated_resources', JSON.stringify(updated));
      } catch (saveErr) {
        console.error("Failed to save resource to localStorage:", saveErr);
      }

      // Increment usage in Firestore
      await updateDoc(doc(db, 'users', user.id || user.uid), {
        [`aiUsage.${currentMonth}`]: increment(1)
      });
    } catch (err) {
      console.error("AI Generation Error:", err);
      alert(language === 'en' ? "Failed to generate content. Please try again." : "ସୃଷ୍ଟି କରିବାରେ ବିଫଳ ହେଲା। ଦୟାକରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।");
    } finally {
      setIsGenerating(false);
    }
  };

  const getWorksheetParts = (text: string) => {
    const lines = text.split('\n');
    let splitIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const isAnswerKeyHeader = 
        (line.includes('answer key') || line.includes('model solutions') || line.includes('ଉତ୍ତର ସୂଚୀ') || line.includes('ସମାଧାନ')) &&
        (line.includes('#') || /^[0-9]\.?\s*\**/i.test(line.trim()) || line.includes('**'));
      
      if (isAnswerKeyHeader && i > 5) {
        splitIndex = i;
        break;
      }
    }
    
    if (splitIndex !== -1) {
      let questionEndIndex = splitIndex;
      if (questionEndIndex > 0 && lines[questionEndIndex - 1].trim() === '---') {
        questionEndIndex--;
      }
      
      const questions = lines.slice(0, questionEndIndex).join('\n');
      const answers = lines.slice(splitIndex).join('\n');
      return { questions, answers };
    }
    
    const parts = text.split(/\n##?\s*ANSWER KEY|\n##?\s*ANSWER|\n##?\s*MODEL SOLUTIONS|\n##?\s*ଉତ୍ତର ସୂଚୀ|\n##?\s*ସମାଧାନ/i);
    if (parts.length > 1) {
      const questions = parts[0] || '';
      const answers = parts.slice(1).join('\n') || '';
      return { questions, answers };
    }
    
    return { questions: text, answers: '' };
  };

  const handlePrint = () => {
    const printableArea = document.getElementById('printable-area');
    if (!printableArea) return;

    const printContainer = document.createElement('div');
    printContainer.id = 'print-root';
    printContainer.className = printableArea.className;
    printContainer.innerHTML = printableArea.innerHTML;
    
    document.body.appendChild(printContainer);
    window.print();
    document.body.removeChild(printContainer);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    const code = `UTKAL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setBatches([...batches, { id: Date.now().toString(), name: newBatchName, code, studentsCount: 0 }]);
    setNewBatchName('');
    setShowNewBatchModal(false);
  };

  const currentWorksheetMarkdown = generatedContent;
  const { questions: studentQuestions, answers: teacherAnswers } = getWorksheetParts(currentWorksheetMarkdown);

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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <NeuralBackground />
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 max-w-7xl mx-auto pb-12 relative z-10"
      >
        {/* 1. Welcome Header Banner */}
        <motion.div 
          variants={itemVariants} 
          className="relative overflow-hidden rounded-none sm:rounded-[2.5rem] border-x-0 sm:border border-purple-500/25 bg-slate-950/80 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-950/50 via-slate-950/80 to-slate-950 p-5 sm:p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(124,58,237,0.25)] -mx-4 -mt-4 sm:mx-0 sm:mt-0 backdrop-blur-2xl"
        >
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-80 h-80 bg-emerald-500/8 rounded-full blur-[110px] pointer-events-none" />
          <div className="absolute left-1/3 top-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10 w-full">
            <div className="space-y-3 flex-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-widest shadow-inner">
                <Lucide.Sparkles size={11} className="animate-pulse text-purple-400" />
                {language === 'en' ? 'Educator Studio Copilot' : 'ଶିକ୍ଷକ ଷ୍ଟୁଡିଓ କୋପାଇଲଟ୍'}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-300 tracking-tight leading-tight">
                {language === 'en' ? `Welcome, ${user?.name || 'Educator'}!` : `ସ୍ୱାଗତମ୍, ${user?.name || 'ଶିକ୍ଷକ'}!`}
              </h1>
              <p className="text-slate-400 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
                {language === 'en' 
                  ? 'Create BSE Odisha syllabus aligned worksheets, structured OPEPA-compliant lesson plans, zero-cost science experiment guides, and promote YouTube lesson videos globally.'
                  : 'BSE ଓଡ଼ିଶା ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ ପ୍ରଶ୍ନପତ୍ର, OPEPA-ସମ୍ମତ ପାଠ୍ୟ ଯୋଜନା, ସ୍ଵଳ୍ପ ଖର୍ଚ୍ଚ ବିଜ୍ଞାନ ପରୀକ୍ଷା ଗାଇଡ୍ ସୃଷ୍ଟି କରନ୍ତୁ ଏବଂ ଶିକ୍ଷଣୀୟ ଭିଡିଓ ସାରା ଓଡ଼ିଶାର ପିଲାଙ୍କ ସହ ଶେୟାର କରନ୍ତୁ।'}
              </p>

              {currentTip && (
                <div className="relative mt-4 bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 rounded-2xl text-purple-300 text-xs font-bold max-w-lg shadow-inner flex items-center gap-2 animate-fade-in">
                  <Lucide.MessageCircle size={14} className="text-purple-400 shrink-0" />
                  <span>{currentTip}</span>
                </div>
              )}

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-3 gap-3.5 max-w-lg mt-6">
                <div className="bg-slate-900/60 border border-white/5 hover:border-amber-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md transition-all duration-300 hover:scale-[1.02] shadow-inner group/metric">
                  <span className="text-[9px] font-black text-slate-500 group-hover/metric:text-amber-400 uppercase tracking-wider transition-colors">{language === 'en' ? 'Catalog Books' : 'ପାଠ୍ୟପୁସ୍ତକ'}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-5 h-5 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Lucide.BookOpen size={11} />
                    </div>
                    <span className="text-sm sm:text-base font-black text-white">{textbooksCount}</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/5 hover:border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md transition-all duration-300 hover:scale-[1.02] shadow-inner group/metric">
                  <span className="text-[9px] font-black text-slate-500 group-hover/metric:text-purple-400 uppercase tracking-wider transition-colors">{language === 'en' ? 'Gundulu AI Usage' : 'ଗୁନ୍ଦୁଲୁ AI ବ୍ୟବହାର'}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-5 h-5 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Lucide.Sparkles size={11} className="animate-pulse" />
                    </div>
                    <span className="text-sm sm:text-base font-black text-white">{currentUsage} / 5</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md transition-all duration-300 hover:scale-[1.02] shadow-inner group/metric">
                  <span className="text-[9px] font-black text-slate-500 group-hover/metric:text-emerald-400 uppercase tracking-wider transition-colors">{language === 'en' ? 'Studio Status' : 'ଷ୍ଟୁଡିଓ ସ୍ଥିତି'}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-wider">{language === 'en' ? 'Active' : 'ସକ୍ରିୟ'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Gundulu Mascot Copilot & Pricing */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end gap-4 shrink-0 w-full md:w-auto self-stretch justify-between pointer-events-auto">
              {/* Animated Gundulu Mascot Video */}
              <div className="relative w-36 h-36 rounded-full overflow-hidden shadow-[0_0_35px_rgba(168,85,247,0.25)] ring-2 ring-purple-500/20 bg-black hidden md:block self-end group/mascot hover:scale-105 transition-all duration-300 pointer-events-auto">
                <video 
                  ref={videoRef}
                  src="/gundulu.mp4" 
                  poster="/gundu2.0.png"
                  autoPlay
                  muted
                  loop 
                  playsInline
                  className="w-full h-full object-cover scale-[1.05] object-[center_40%] relative z-10 transition-transform duration-300 group-hover/mascot:scale-110" 
                />
                <div className="absolute -bottom-1 -left-1 bg-slate-950 border border-purple-500/30 px-2 py-0.5 rounded-lg text-[7.5px] font-black uppercase tracking-wider text-purple-300 shadow-md z-20">
                  Copilot
                </div>
                <button 
                  type="button"
                  onClick={toggleMute}
                  className="absolute bottom-2 right-2 z-20 w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 border border-purple-300/30 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:from-purple-600 hover:to-indigo-700 hover:scale-110 shadow-[0_2px_8px_rgba(168,85,247,0.4)] cursor-pointer"
                  title={isMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  {isMuted ? (
                    <Lucide.VolumeX size={12} className="fill-white" />
                  ) : (
                    <Lucide.Volume2 size={12} className="fill-white" />
                  )}
                </button>
              </div>

              {/* Pricing Section */}
              <div className="w-full">
                {isPremium ? (
                  <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/5 to-transparent border border-amber-500/40 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 backdrop-blur-md shadow-xl flex items-center gap-3 sm:gap-4 relative overflow-hidden group hover:border-amber-500/60 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/25 flex items-center justify-center text-amber-400 border border-amber-500/30 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                      <Lucide.Award size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest">{language === 'en' ? 'PRO EDUCATOR' : 'ପ୍ରୋ ଶିକ୍ଷକ'}</h4>
                      <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5">{language === 'en' ? 'Unlimited Studio Access' : 'ଅସୀମିତ AI ସୁବିଧା'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/80 border border-purple-500/25 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 backdrop-blur-md shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 hover:border-purple-500/40 transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 shrink-0">
                        <Lucide.Lock size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">{language === 'en' ? 'Free Tier Studio' : 'ମାଗଣା ଷ୍ଟୁଡିଓ'}</h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold mt-0.5">{currentUsage}/5 {language === 'en' ? 'Gundulu AI monthly runs used' : 'ଗୁନ୍ଦୁଲୁ AI ବ୍ୟବହାର ହୋଇଛି'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab?.('plans')}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-purple-950/35 hover:scale-[1.02] active:scale-[0.98] shrink-0 border border-purple-500/30"
                    >
                      {language === 'en' ? 'Upgrade to Pro' : 'ପ୍ରୋ କୁ ଅପଗ୍ରେଡ୍'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Premium Sub-Tab Switcher */}
        <div className="flex flex-col gap-2 relative z-20 px-4 sm:px-0 mt-4">
          <div className="flex flex-wrap p-1 bg-slate-950/60 backdrop-blur-md border border-white/10 rounded-2xl w-fit">
            <button
              onClick={() => setActiveSubTab('workspace')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'workspace'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lucide.Sparkles size={14} />
              <span>{language === 'en' ? 'Gundulu AI Workspace' : 'ଗୁନ୍ଦୁଲୁ AI ୱର୍କସ୍ପେସ୍'}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('library')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'library'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lucide.Bookmark size={14} />
              <span>{language === 'en' ? 'My Library' : 'ମୋ ଲାଇବ୍ରେରୀ'}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('broadcast')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'broadcast'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lucide.Youtube size={14} />
              <span>{language === 'en' ? 'Broadcast Queue' : 'ପ୍ରସାରଣ ଧାଡି'}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('educator_board')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'educator_board'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lucide.Trophy size={14} />
              <span>{language === 'en' ? 'Educator Board' : 'ଶିକ୍ଷକ ବୋର୍ଡ'}</span>
            </button>
          </div>
          
          {/* Single Line Clean Tab Subtitle / Instruction */}
          <p className="text-[11px] font-bold text-purple-400/85 tracking-wide pl-2 italic">
            {activeSubTab === 'workspace' && (language === 'en' ? '✦ Create BSE-aligned worksheets, OPEPA lesson plans, and zero-cost science activities.' : '✦ BSE-ସମ୍ମତ ପ୍ରଶ୍ନପତ୍ର, ପାଠ୍ୟ ଯୋଜନା ଓ ବିଜ୍ଞାନ କାର୍ଯ୍ୟକଳาପ ସୃଷ୍ଟି କରନ୍ତୁ।')}
            {activeSubTab === 'library' && (language === 'en' ? '✦ View, copy, and print your previously generated AI teaching materials.' : '✦ ଆପଣଙ୍କ ଦ୍ୱାରା ପୂର୍ବରୁ ପ୍ରସ୍ତୁତ କରାଯାଇଥିବା ଶିକ୍ଷଣ ସାମଗ୍ରୀ ଦେଖନ୍ତୁ ଓ ପ୍ରିଣ୍ଟ କରନ୍ତୁ।')}
            {activeSubTab === 'broadcast' && (language === 'en' ? '✦ Monitor the curation status of your suggested YouTube lesson videos.' : '✦ ଆପଣଙ୍କ ଦ୍ୱାରା ସୁପାରିଶ ହୋଇଥିବା ୟୁଟ୍ୟୁବ୍ ଭିଡିଓର ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ।')}
            {activeSubTab === 'educator_board' && (language === 'en' ? '✦ View top contributing educators and contribution streaks across Odisha.' : '✦ ଓଡ଼ିଶାର ସର୍ବୋତ୍ତମ ଅବଦାନକାରୀ ଶିକ୍ଷକ ଏବଂ ସେମାନଙ୍କର ରାଙ୍କ ଦେଖନ୍ତୁ।')}
          </p>
        </div>

        <div className="space-y-8">
          {activeSubTab === 'workspace' && (
            <div className="space-y-8">
              {/* AI Studio Engines Grid */}
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300 flex items-center gap-2.5">
                  <Lucide.Sparkles size={22} className="text-purple-400 animate-pulse" />
                  <span>{language === 'en' ? 'Gundulu AI Engines' : 'ଗୁନ୍ଦୁଲୁ AI ଷ୍ଟୁଡିଓ ଇଞ୍ଜିନ୍'}</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: AI Worksheet Maker */}
                  <motion.div 
                    whileHover={{ y: -8, scale: 1.01 }}
                    className="relative group rounded-[2.2rem] p-6 border border-purple-500/10 bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-purple-950/20 hover:border-purple-500/40 hover:shadow-[0_20px_50px_rgba(168,85,247,0.18)] transition-all duration-500 flex flex-col justify-between min-h-[350px] overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    
                    <div className="space-y-5 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/25 shadow-inner transition-colors duration-300">
                          <Lucide.FileText size={26} />
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[8px] font-black uppercase tracking-wider">
                          BSE Odisha
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-white flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                          {language === 'en' ? 'Gundulu Worksheet Maker' : 'ଗୁନ୍ଦୁଲୁ ପ୍ରଶ୍ନପତ୍ର ନିର୍ମାତା'}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[8.5px] font-black uppercase tracking-wider w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_5px_#a855f7] animate-pulse" />
                          <span>Worksheet Engine Live</span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed font-medium pt-1">
                          {language === 'en'
                            ? 'Generate school-standard homework worksheets with customized questions and teacher answer keys.'
                            : 'ବିଦ୍ୟାଳୟ ମାନକ ଅନୁଯାୟୀ ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀରେ ହୋମୱାର୍କ ପ୍ରଶ୍ନପତ୍ର ଓ ଶିକ୍ଷକଙ୍କ ପାଇଁ ଉତ୍ତର ଚାବି ତୁରନ୍ତ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setGeneratorType('worksheet');
                        setGeneratedContent('');
                        setShowGeneratorModal(true);
                      }}
                      className="relative z-10 w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-purple-950/35 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-purple-500/30"
                    >
                      <span>{language === 'en' ? 'Open Studio' : 'ଷ୍ଟୁଡିଓ ଖୋଲନ୍ତୁ'}</span>
                      <Lucide.ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>

                  {/* Card 2: AI Lesson Plan Creator */}
                  <motion.div 
                    whileHover={{ y: -8, scale: 1.01 }}
                    className="relative group rounded-[2.2rem] p-6 border border-blue-500/10 bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-blue-950/20 hover:border-blue-500/40 hover:shadow-[0_20px_50px_rgba(59,130,246,0.18)] transition-all duration-500 flex flex-col justify-between min-h-[350px] overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    
                    <div className="space-y-5 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/25 shadow-inner transition-colors duration-300">
                          <Lucide.Presentation size={26} />
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[8px] font-black uppercase tracking-wider">
                          OPEPA 5E
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-white group-hover:text-blue-300 transition-colors">
                          {language === 'en' ? 'Gundulu Lesson Planner' : 'ଗୁନ୍ଦୁଲୁ ପାଠ୍ୟ ଯୋଜନା ପ୍ରସ୍ତୁତକାରୀ'}
                        </h4>

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[8.5px] font-black uppercase tracking-wider w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_#3b82f6] animate-pulse" />
                          <span>5E Plan Builder Active</span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed font-medium pt-1">
                          {language === 'en'
                            ? 'Generate OPEPA guidelines aligned structured teaching plans containing learning objectives and TLM lists.'
                            : 'BSE ଓଡ଼ିଶା ଓ OPEPA ନିର୍ଦ୍ଦେଶାବଳୀ ଅନୁଯାୟୀ ଶିକ୍ଷଣ ଉଦ୍ଦେଶ୍ୟ ଓ TLM ସହିତ ବିସ୍ତୃତ ପାଠ୍ୟ ଯୋଜନା ପ୍ରସ୍ତୁତ କରନ୍ତୁ।'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setGeneratorType('lesson_plan');
                        setGeneratedContent('');
                        setShowGeneratorModal(true);
                      }}
                      className="relative z-10 w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-blue-950/35 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-blue-500/30"
                    >
                      <span>{language === 'en' ? 'Open Studio' : 'ଷ୍ଟୁଡିଓ ଖୋଲନ୍ତୁ'}</span>
                      <Lucide.ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>

                  {/* Card 3: AI Activities & Projects */}
                  <motion.div 
                    whileHover={{ y: -8, scale: 1.01 }}
                    className="relative group rounded-[2.2rem] p-6 border border-emerald-500/10 bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-emerald-950/20 hover:border-emerald-500/40 hover:shadow-[0_20px_50px_rgba(16,185,129,0.18)] transition-all duration-500 flex flex-col justify-between min-h-[350px] overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />
                    
                    <div className="space-y-5 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/25 shadow-inner transition-colors duration-300">
                          <Lucide.Sparkles size={26} />
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-wider">
                          Zero Cost
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                          {language === 'en' ? 'Gundulu Activities Guide' : 'ଗୁନ୍ଦୁଲୁ କାର୍ଯ୍ୟକଳାପ ସହାୟକ'}
                        </h4>

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[8.5px] font-black uppercase tracking-wider w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981] animate-pulse" />
                          <span>Activity Tracker Active</span>
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed font-medium pt-1">
                          {language === 'en'
                            ? 'Generate hands-on classroom activities, math models, and projects using low-cost materials for any subject.'
                            : 'ଘରୋଇ କିମ୍ବା ସ୍ୱଳ୍ପ ମୂଲ୍ୟର ସାମଗ୍ରୀ ବ୍ୟବହାର କରି ହ୍ୟାଣ୍ଡସ-ଅନ୍ କାର୍ଯ୍ୟକଳାପ, ଗଣିତ ମଡେଲ ଏବଂ ପ୍ରକଳ୍ପ ଗାଇଡ୍ ସୃଷ୍ଟି କରନ୍ତୁ।'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setGeneratorType('practical_activity');
                        setGeneratedContent('');
                        setShowGeneratorModal(true);
                      }}
                      className="relative z-10 w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-950/35 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-emerald-500/30"
                    >
                      <span>{language === 'en' ? 'Open Studio' : 'ଷ୍ଟୁଡିଓ ଖୋଲନ୍ତୁ'}</span>
                      <Lucide.ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                </div>
              </div>

              {/* 3. Global Video Promotion Form & Textbooks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Educator Broadcast Control Center */}
                <motion.div 
                  className="relative overflow-hidden border border-emerald-500/25 bg-slate-950/80 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950/80 to-slate-950 shadow-[0_20px_50px_-10px_rgba(16,185,129,0.15)] rounded-[2.2rem] p-8 lg:col-span-2 space-y-6"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 border-b border-white/5 pb-5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <Lucide.Youtube size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {language === 'en' ? 'Educator Broadcast Center' : 'ଶିକ୍ଷକ ପ୍ରସାରଣ କେନ୍ଦ୍ର'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {language === 'en' 
                          ? 'Submit your YouTube study video. Approved videos publish globally in our Smart Classes library.' 
                          : 'ନିଜ ଶିକ୍ଷଣୀୟ ୟୁଟ୍ୟୁବ୍ ଭିଡିଓ ଦାଖଲ କରନ୍ତୁ । ମଞ୍ଜୁରୀ ପରେ ଏହା ଓଡ଼ିଶାର ସମସ୍ତ ପିଲାଙ୍କ ସ୍ମାର୍ଟ କ୍ଲାସ ଲାଇବ୍ରେରୀରେ ଦେଖାଯିବ।'}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSuggestVideo} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Title (ଭିଡିଓ ର ନାମ)</label>
                        <input 
                          type="text" 
                          value={suggestTitle} 
                          onChange={(e) => setSuggestTitle(e.target.value)}
                          placeholder="e.g. Speed & Velocity Class 9 Science" 
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white font-bold placeholder:text-slate-700 outline-none focus:border-emerald-500/55 focus:bg-slate-950 transition-all duration-300" 
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YouTube Video URL (ୟୁଟ୍ୟୁବ୍ ଭିଡିଓ URL)</label>
                        <input 
                          type="url" 
                          value={suggestUrl} 
                          onChange={(e) => setSuggestUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..." 
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-white font-bold placeholder:text-slate-700 outline-none focus:border-emerald-500/55 focus:bg-slate-950 transition-all duration-300" 
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Class (ଶ୍ରେଣୀ)</label>
                        <select 
                          value={suggestClass}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSuggestClass(val);
                            const classKey = `class${val}`;
                            const subjects = CLASS_SUBJECTS[classKey] || [];
                            if (subjects.length > 0) {
                              setSuggestSubject(subjects[0].key);
                            }
                          }}
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-white/10 text-white font-bold outline-none focus:border-emerald-500/55 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2310B981%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_16px_center] bg-no-repeat pr-10"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                            <option key={c} value={c}>Class {c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject (ବିଷୟ)</label>
                        <select 
                          value={suggestSubject}
                          onChange={(e) => setSuggestSubject(e.target.value)}
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-white/10 text-white font-bold outline-none focus:border-emerald-500/55 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2310B981%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_16px_center] bg-no-repeat pr-10"
                        >
                          {(CLASS_SUBJECTS[`class${suggestClass}`] || []).map(sub => (
                            <option key={sub.key} value={sub.key}>
                              {language === 'en' ? sub.labelEn : sub.labelOr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSuggesting}
                      className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-emerald-950/20"
                    >
                      {isSuggesting ? <Lucide.Loader2 size={16} className="animate-spin" /> : null}
                      <span>{language === 'en' ? 'Suggest Video Lesson' : 'ଭିଡିଓ ସୁପାରିଶ କରନ୍ତୁ'}</span>
                    </button>
                    
                    <p className="text-[10px] text-amber-500/80 font-bold text-center">
                      * Suggested video lessons go into the curation queue and will be published globally on approval.
                    </p>
                  </form>
                </motion.div>

                {/* Textbooks Catalog Card */}
                <motion.div 
                  className="relative overflow-hidden border border-amber-500/15 bg-gradient-to-br from-slate-900/40 via-amber-500/5 to-transparent rounded-[2.2rem] p-8 shadow-xl flex flex-col justify-between min-h-[380px] hover:border-amber-500/30 transition-all duration-500 group"
                >
                  <div className="absolute -right-20 -bottom-20 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/25 flex items-center justify-center">
                        <Lucide.BookOpen size={22} />
                      </div>
                      <h3 className="text-lg font-black text-white">
                        {language === 'en' ? 'Textbooks Catalog' : 'ପାଠ୍ୟପୁସ୍ତକ ତାଲିକା'}
                      </h3>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                      {language === 'en' 
                        ? 'Full access to school textbooks from Standard 1 to Standard 10 for lesson mapping and curriculum preparation.' 
                        : 'ପାଠ୍ୟ ଯୋଜନା ପ୍ରସ୍ତୁତି ନିମନ୍ତେ ପ୍ରଥମ ରୁ ଦଶମ ଶ୍ରେଣୀର ପାଠ୍ୟପୁସ୍ତକ ସବୁ ବ୍ରାଉଜ୍ କରନ୍ତୁ।'}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-2">
                      <div className="flex items-baseline justify-center gap-1.5">
                        <span className="text-4xl font-black text-amber-400">{textbooksCount}</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Books Loaded</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">BSE Odisha Curriculum Books</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab && setActiveTab('textbooks')}
                      className="relative z-10 w-full py-3.5 mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-950/35 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-amber-500/30"
                    >
                      <span>{language === 'en' ? 'Browse All Books' : 'ପାଠ୍ୟପୁସ୍ତକ ଦେଖନ୍ତୁ'}</span>
                      <Lucide.ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Original Tuition Batch Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <motion.div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6 bg-slate-900/40">
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

                {/* Student Performance Radar */}
                <motion.div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6 bg-slate-900/40 flex flex-col justify-between">
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

                {/* AI Diagnostics */}
                <motion.div className="glass-card rounded-3xl p-6 border border-red-500/20 space-y-6 bg-gradient-to-br from-slate-900/40 via-red-500/5 to-transparent flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                          <Lucide.ShieldAlert size={20} />
                        </div>
                        <h3 className="text-lg font-black text-white">
                          {language === 'en' ? 'Gundulu AI Diagnostics' : 'ଗୁନ୍ଦୁଲୁ AI ନିଦାନ ପ୍ୟାନେଲ୍'}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-widest border border-red-500/30">
                        {language === 'en' ? 'Gaps Found' : 'ତ୍ରୁଟି ଚିହ୍ନଟ'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">
                      {language === 'en' ? 'Gundulu AI identified conceptual learning gap in your batches.' : 'ଆପଣଙ୍କ ବ୍ୟାଚ୍‌ରେ ଗୁନ୍ଦୁଲୁ AI ଦ୍ଵାରା ଶିକ୍ଷଣ ତ୍ରୁଟି ଚିହ୍ନଟ ହୋଇଛି ।'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">{language === 'en' ? 'Concept Hazard' : 'ସଂକଳ୍ପ ବିପଦ'}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white leading-snug">
                      Class 7 Science - Air Pressure / Air (ବାୟୁ)
                    </h4>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>{language === 'en' ? 'Avg. Accuracy:' : 'ହାରାହାରି ସ୍କୋର:'}</span>
                      <span className="text-red-400">72%</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setGeneratorType('worksheet');
                      setInputClass('7');
                      setInputSubject('science');
                      setInputChapter(language === 'en' ? 'Air Pressure' : 'ବାୟୁ');
                      setInputDifficulty('medium');
                      setInputQCount(10);
                      setGeneratedContent('');
                      setShowGeneratorModal(true);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lucide.Printer size={14} />
                    <span>{language === 'en' ? 'Auto-Generate Revision' : 'ସଂଶୋଧନ ସିଟ୍ ପ୍ରସ୍ତୁତ'}</span>
                  </button>
                </motion.div>
              </div>
            </div>
          )}

          {/* 2. My Library Tab */}
          {activeSubTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 border border-white/5 rounded-3xl backdrop-blur-md">
                <div className="relative w-full sm:max-w-xs">
                  <Lucide.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder={language === 'en' ? "Search resources..." : "ସାମଗ୍ରୀ ସନ୍ଧାନ କରନ୍ତୁ..."}
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                  />
                </div>
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full shrink-0">
                  {savedResources.length} {language === 'en' ? 'Items Saved' : 'ଟି ସାମଗ୍ରୀ ସଂରକ୍ଷିତ'}
                </span>
              </div>

              {/* Resources Grid */}
              {(() => {
                const filtered = savedResources.filter(res => 
                  (res.chapter || '').toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
                  (res.subject || '').toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
                  (res.type || '').toLowerCase().includes(librarySearchQuery.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="border border-white/5 bg-slate-900/10 rounded-[2.2rem] p-12 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 mx-auto">
                        <Lucide.FolderOpen size={28} />
                      </div>
                      <div>
                        <h4 className="text-md font-black text-white">{language === 'en' ? 'No Resources Found' : 'କୌଣସି ସାମଗ୍ରୀ ମିଳିଲା ନାହିଁ'}</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                          {language === 'en' 
                            ? 'Generate worksheets, lesson plans, or activities under the Gundulu AI Workspace tab to build your library.' 
                            : 'ମୋ ଲାଇବ୍ରେରୀ ଗଠନ କରିବା ପାଇଁ ଗୁନ୍ଦୁଲୁ AI ୱର୍କସ୍ପେସ୍ ରୁ ନୂତନ ସାମଗ୍ରୀ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।'}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((res) => {
                      const classKey = `class${res.classStr}`;
                      const subjects = CLASS_SUBJECTS[classKey] || [];
                      const foundSub = subjects.find(s => s.key === res.subject);
                      const subjectLabel = foundSub ? (language === 'en' ? foundSub.labelEn : foundSub.labelOr) : res.subject;

                      return (
                        <div 
                          key={res.id} 
                          className="glass-card rounded-[2.2rem] border border-white/5 hover:border-purple-500/35 bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-purple-950/10 p-6 flex flex-col justify-between hover:shadow-[0_15px_35px_rgba(168,85,247,0.1)] transition-all duration-300 group min-h-[200px]"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <span className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[8px] font-black uppercase tracking-wider">
                                {res.type === 'worksheet' && (language === 'en' ? 'Worksheet' : 'ପ୍ରଶ୍ନପତ୍ର')}
                                {res.type === 'lesson_plan' && (language === 'en' ? 'Lesson Plan' : 'ପାଠ୍ୟ ଯୋଜନା')}
                                {res.type === 'practical_activity' && (language === 'en' ? 'Activities' : 'କାର୍ଯ୍ୟକଳାପ')}
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold">
                                {new Date(res.timestamp).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-white font-black text-sm truncate leading-snug">{res.chapter}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                Class {res.classStr} • {subjectLabel}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-4 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setGeneratorType(res.type);
                                setGeneratedContent(res.content);
                                setInputClass(res.classStr);
                                setInputSubject(res.subject);
                                setInputChapter(res.chapter);
                                setInputDifficulty(res.difficulty || 'medium');
                                setInputQCount(res.qCount || 10);
                                setShowGeneratorModal(true);
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-950/20 hover:scale-[1.01]"
                            >
                              <Lucide.Printer size={12} />
                              <span>{language === 'en' ? 'Open & Print' : 'ଖୋଲନ୍ତୁ ଓ ପ୍ରିଣ୍ଟ'}</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(language === 'en' ? "Are you sure you want to delete this resource?" : "ଆପଣ ଏହି ସାମଗ୍ରୀକୁ ଡିଲିଟ୍ କରିବାକୁ ଚାହାଁନ୍ତି କି?")) {
                                  const updated = savedResources.filter(item => item.id !== res.id);
                                  setSavedResources(updated);
                                  localStorage.setItem('teacher_generated_resources', JSON.stringify(updated));
                                }
                              }}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer"
                              title="Delete resource"
                            >
                              <Lucide.Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* 3. Broadcast Queue Tab */}
          {activeSubTab === 'broadcast' && (
            <motion.div
              key="broadcast"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {isLoadingSuggestions ? (
                <div className="flex justify-center p-12">
                  <Lucide.Loader2 className="animate-spin text-purple-500" size={28} />
                </div>
              ) : mySuggestions.length === 0 ? (
                <div className="border border-white/5 bg-slate-900/10 rounded-[2.2rem] p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 mx-auto">
                    <Lucide.Youtube size={28} />
                  </div>
                  <div>
                    <h4 className="text-md font-black text-white">{language === 'en' ? 'No Suggested Video Lessons' : 'କୌଣସି ଭିଡିଓ ସୁପାରିଶ ମିଳିଲା ନାହିଁ'}</h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      {language === 'en' 
                        ? 'Promote your video lessons to make them available to all students in Odisha in the Smart Classes library!' 
                        : 'ଓଡ଼ିଶାର ସମସ୍ତ ପିଲାଙ୍କ ପାଇଁ ସ୍ମାର୍ଟ କ୍ଲାସ୍ ଲାଇବ୍ରେରୀରେ ନିଜ ଭିଡିଓ ପ୍ରୋମୋଟ୍ କରିବାକୁ ୱର୍କସ୍ପେସ୍ ରୁ ଭିଡିଓ ସୁପାରିଶ କରନ୍ତୁ।'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mySuggestions.map((vid) => {
                    const classKey = `class${vid.classStr}`;
                    const subjects = CLASS_SUBJECTS[classKey] || [];
                    const foundSub = subjects.find(s => s.key === vid.subject);
                    const subjectLabel = foundSub ? (language === 'en' ? foundSub.labelEn : foundSub.labelOr) : vid.subject;

                    return (
                      <div 
                        key={vid.id} 
                        className="glass-card rounded-[2.2rem] border border-white/5 hover:border-emerald-500/35 bg-gradient-to-br from-slate-900/60 via-slate-950/80 to-emerald-950/10 p-5 flex flex-col justify-between hover:shadow-[0_15px_35px_rgba(16,185,129,0.1)] transition-all duration-300 group"
                      >
                        <div className="space-y-4">
                          {/* Video Thumbnail Embed Mockup */}
                          <div className="w-full aspect-video rounded-2xl overflow-hidden shrink-0 relative bg-black/60 border border-white/5 shadow-inner">
                            <img 
                              src={`https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg`} 
                              alt={vid.title} 
                              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/placeholder/mqdefault.jpg';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Lucide.Youtube size={26} className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] group-hover:scale-110 transition-transform" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-white font-black text-xs leading-snug line-clamp-2" title={vid.title}>
                              {vid.title}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              Class {vid.classStr} • {subjectLabel}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                          <span className="text-[9px] text-slate-500 font-bold">
                            {vid.createdAt?.seconds ? new Date(vid.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                          </span>
                          
                          {vid.status === 'approved' && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse" />
                              <span>{language === 'en' ? 'Approved & Live' : 'ମଞ୍ଜୁରୀ ଓ ଲାଇଭ୍'}</span>
                            </span>
                          )}
                          {vid.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-400 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#f59e0b]" />
                              <span>{language === 'en' ? 'Under Review' : 'ଯାଞ୍ଚ ଚାଲିଛି'}</span>
                            </span>
                          )}
                          {vid.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/35 text-red-400 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              <span>{language === 'en' ? 'Feedback Sent' : 'ପ୍ରତ୍ୟାଖ୍ୟାତ'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* 4. Educator Board Tab */}
          {activeSubTab === 'educator_board' && (
            <motion.div
              key="educator_board"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">{language === 'en' ? 'Odisha Educator Leaderboard' : 'ଓଡ଼ିଶା ଶିକ୍ଷକ ଲିଡରବୋର୍ଡ'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Top Contributing Teachers across Districts</p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Lucide.Trophy size={11} className="text-purple-400 animate-bounce" />
                    <span>Statewide Ranks</span>
                  </div>
                </div>

                <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5">
                  {[
                    { rank: 1, name: "Pradip Kumar Sahoo", district: "Khordha", points: 1450, streak: 8, school: "BJB High School, Bhubaneswar", totalLessons: 24, badge: "Grandmaster" },
                    { rank: 2, name: "Sasmita Patra", district: "Cuttack", points: 1280, streak: 5, school: "Ravenshaw Girls High School", totalLessons: 18, badge: "Master Guide" },
                    { rank: 3, name: "Manoj Kumar Dash", district: "Balasore", points: 1120, streak: 12, school: "Balasore Zilla School", totalLessons: 15, badge: "Super Curator" },
                    { rank: 4, name: "Sujata Mohanty", district: "Ganjam", points: 980, streak: 4, school: "City High School, Berhampur", totalLessons: 11, badge: "Top Contributor" },
                    { rank: 5, name: "Debendra Nayak", district: "Sambalpur", points: 890, streak: 7, school: "CSB High School, Sambalpur", totalLessons: 9, badge: "Top Contributor" },
                    { rank: 6, name: "Anuradha Biswal", district: "Puri", points: 740, streak: 3, school: "Puri Zilla School", totalLessons: 6, badge: "Active Guide" }
                  ].map((teacher, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/40 hover:bg-slate-950/80 transition-colors gap-3">
                      <div className="flex items-center gap-4">
                        {/* Rank Indicator */}
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 border border-white/5 ${
                          teacher.rank === 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                          teacher.rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                          teacher.rank === 3 ? 'bg-amber-700/20 text-amber-600' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {teacher.rank}
                        </span>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-white text-sm leading-snug">{teacher.name}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[8px] font-black uppercase tracking-wider">
                              {teacher.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {teacher.school} • <span className="text-purple-400 font-bold">{teacher.district}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-auto shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contributions</p>
                            <p className="text-xs font-black text-white">{teacher.totalLessons} Lessons</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Points</p>
                            <p className="text-xs font-black text-purple-400">{teacher.points} pts</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl text-orange-400" title="Active Streak">
                          <Lucide.Flame size={12} fill="currentColor" />
                          <span className="text-xs font-black">{teacher.streak}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Social Connect Links */}
        <div className="flex items-center justify-center gap-4 bg-slate-900/40 py-4 px-6 rounded-3xl border border-white/5 mt-12">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Connect:</span>
          <a
            href="https://www.facebook.com/share/1JAq6DY6Sq/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Utkal Skill Centre Facebook page"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95"
          >
            <Lucide.Facebook size={18} />
          </a>
          <a
            href="https://instagram.com/utkalskillcentre"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Utkal Skill Centre Instagram profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95"
          >
            <Lucide.Instagram size={18} />
          </a>
          <a
            href="https://whatsapp.com/channel/utkalskillcentre"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Utkal Skill Centre WhatsApp channel"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95"
          >
            <Lucide.MessageSquare size={18} />
          </a>
          <a
            href="https://www.youtube.com/@UtkalSkillCenter"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Utkal Skill Centre YouTube channel"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95"
          >
            <Lucide.Youtube size={18} />
          </a>
        </div>

        {/* New Batch Modal */}
        <AnimatePresence>
          {showNewBatchModal && createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 border border-purple-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 force-dark-theme"
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
                    className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Generate Invite Code
                  </button>
                </form>
              </motion.div>
            </div>,
            document.body
          )}
        </AnimatePresence>

        {/* Unified AI Generator & Print Modal (Dual-Pane Split Studio layout) */}
        <AnimatePresence>
          {showGeneratorModal && createPortal(
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="print-modal-overlay fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:block print:static print:overflow-visible"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="print-modal-card bg-slate-900/95 border border-purple-500/20 rounded-[32px] w-full max-w-6xl relative shadow-2xl my-4 overflow-hidden h-[90vh] flex flex-col force-dark-theme print:max-h-none print:h-auto print:my-0 print:border-none print:bg-white print:shadow-none print:rounded-none print:block print:static print:overflow-visible"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none print:hidden" />
                
                {/* Header */}
                <div className="flex items-center justify-between shrink-0 border-b border-white/10 px-6 py-4 print:hidden relative z-20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      {generatorType === 'worksheet' && <Lucide.FileText size={20} />}
                      {generatorType === 'lesson_plan' && <Lucide.Presentation size={20} />}
                      {generatorType === 'practical_activity' && <Lucide.Sparkles size={20} />}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        {generatorType === 'worksheet' && (language === 'en' ? 'Gundulu Worksheet Maker' : 'ଗୁନ୍ଦୁଲୁ ପ୍ରଶ୍ନପତ୍ର ନିର୍ମାତା')}
                        {generatorType === 'lesson_plan' && (language === 'en' ? 'Gundulu Lesson Planner' : 'ଗୁନ୍ଦୁଲୁ ପାଠ୍ୟ ଯୋଜନା ପ୍ରସ୍ତୁତକାରୀ')}
                        {generatorType === 'practical_activity' && (language === 'en' ? 'Gundulu Activities Guide' : 'ଗୁନ୍ଦୁଲୁ କାର୍ଯ୍ୟକଳାପ ସହାୟକ')}
                      </h3>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        {language === 'en' ? 'Gundulu AI Workspace' : 'ଗୁନ୍ଦୁଲୁ AI ୱର୍କସ୍ପେସ୍'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowGeneratorModal(false);
                      setGeneratedContent('');
                    }}
                    className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Lucide.X size={18} />
                  </button>
                </div>

                {/* Workspace Main Split Body */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0 print:block print:overflow-visible">
                  
                  {/* Left Config Panel */}
                  <div className="w-full md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-white/10 bg-slate-950/40 p-6 flex flex-col justify-between overflow-y-auto print:hidden space-y-6 relative z-10">
                    <div className="space-y-5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest">
                        <Lucide.Sliders size={12} />
                        <span>{language === 'en' ? 'Parameters' : 'ପାରାମିଟର'}</span>
                      </div>

                      {/* Class Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Class / Standard' : 'ଶ୍ରେଣୀ'}</label>
                        <select 
                          value={inputClass}
                          disabled={isGenerating}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInputClass(val);
                            const classKey = `class${val}`;
                            const subjects = CLASS_SUBJECTS[classKey] || [];
                            if (subjects.length > 0) {
                              setInputSubject(subjects[0].key);
                            }
                            setInputChapter('');
                          }}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none cursor-pointer disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-8"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <option key={num} value={num}>Class {num}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Subject' : 'ବିଷୟ'}</label>
                        <select 
                          value={inputSubject}
                          disabled={isGenerating}
                          onChange={(e) => setInputSubject(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none cursor-pointer disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-8"
                        >
                          {(CLASS_SUBJECTS[`class${inputClass}`] || []).map(sub => (
                            <option key={sub.key} value={sub.key}>
                              {language === 'en' ? sub.labelEn : sub.labelOr}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Chapter Select / Type */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Chapter / Topic' : 'ଅଧ୍ୟାୟ / ପ୍ରସଙ୍ଗ'}</label>
                        {chapters && chapters.filter(c => String(c.class || '').replace(/\D/g, '') === String(inputClass) && (c.subject || '').toLowerCase() === inputSubject).length > 0 ? (
                          <select
                            value={inputChapter}
                            disabled={isGenerating}
                            onChange={(e) => setInputChapter(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none cursor-pointer disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-8"
                          >
                            <option value="">{language === 'en' ? '-- Choose Chapter --' : '-- ଅଧ୍ୟାୟ ଚୟନ କରନ୍ତୁ --'}</option>
                            {chapters
                              .filter(c => String(c.class || '').replace(/\D/g, '') === String(inputClass) && (c.subject || '').toLowerCase() === inputSubject)
                              .map((c, i) => (
                                <option key={i} value={c.title}>{c.title}</option>
                              ))
                            }
                          </select>
                        ) : (
                          <input 
                            type="text"
                            disabled={isGenerating}
                            placeholder={language === 'en' ? "e.g. Quadratic Equations..." : "ଯେପରିକି ଦ୍ଵିଘାତ ସମୀକରଣ..."}
                            value={inputChapter}
                            onChange={(e) => setInputChapter(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-white font-bold focus:border-purple-500 outline-none placeholder:text-slate-700 disabled:opacity-50"
                          />
                        )}
                      </div>

                      {/* Worksheet specific controls */}
                      {generatorType === 'worksheet' && (
                        <div className="space-y-4">
                          {/* Difficulty */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Difficulty' : 'କଠିନତା ସ୍ତର'}</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {['easy', 'medium', 'hard'].map((diff) => (
                                <button
                                  key={diff}
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => setInputDifficulty(diff as any)}
                                  className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                                    inputDifficulty === diff 
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'en' ? 'Questions Count' : 'ପ୍ରଶ୍ନ ସଂଖ୍ୟା'}</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[5, 10, 15].map((count) => (
                                <button
                                  key={count}
                                  type="button"
                                  disabled={isGenerating}
                                  onClick={() => setInputQCount(count)}
                                  className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 ${
                                    inputQCount === count 
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
                      )}
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={handleGenerate}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl hover:shadow-purple-950/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 border border-purple-500/30"
                      >
                        {isGenerating ? (
                          <>
                            <Lucide.Loader2 size={14} className="animate-spin" />
                            <span>{language === 'en' ? 'Generating...' : 'ପ୍ରସ୍ତୁତ ହେଉଛି...'}</span>
                          </>
                        ) : (
                          <>
                            <Lucide.Sparkles size={14} />
                            <span>{language === 'en' ? 'Generate ✨' : 'ପ୍ରସ୍ତୁତ କରନ୍ତୁ ✨'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Preview Canvas */}
                  <div className="flex-1 bg-slate-950/10 flex flex-col overflow-hidden relative print:bg-white print:overflow-visible print:block print:static">
                    {isGenerating ? (
                      // 1. Loading pipeline state
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-center items-center text-center space-y-6">
                        <div className="relative">
                          <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-pulse" />
                          <div className="w-20 h-20 rounded-3xl bg-slate-950 border border-purple-500/30 flex items-center justify-center text-purple-400 relative">
                            <Lucide.Sparkles size={36} className="animate-pulse" />
                            <div className="absolute inset-0 rounded-3xl border-2 border-transparent border-t-purple-500 animate-spin" />
                          </div>
                        </div>
                        
                        <div className="space-y-2 max-w-md">
                          <h4 className="text-lg font-black text-white tracking-wide">
                            {language === 'en' ? 'AI Generation Studio Pipeline' : 'AI ଜେନେରେସନ୍ ଷ୍ଟୁଡିଓ ପାଇପଲାଇନ୍'}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {language === 'en' ? 'Gundulu AI is building your custom pedagogical resources.' : 'ଗୁନ୍ଦୁଲୁ AI ଆପଣଙ୍କ ପାଇଁ ଶିକ୍ଷଣୀୟ ସାମଗ୍ରୀ ପ୍ରସ୍ତୁତ କରୁଛି।'}
                          </p>
                        </div>

                        {/* Multi-step progress list */}
                        <div className="w-full max-w-sm bg-slate-950/60 border border-white/5 rounded-2xl p-4 text-left space-y-3">
                          {[
                            { id: 0, labelEn: 'Connecting to Gundulu AI Engine...', labelOr: 'ଗୁନ୍ଦୁଲୁ AI ଇଞ୍ଜିନ୍ ସହ ସଂଯୋଗ ହେଉଛି...' },
                            { id: 1, labelEn: 'Analyzing BSE Odisha syllabus guidelines...', labelOr: 'BSE ଓଡ଼ିଶା ପାଠ୍ୟକ୍ରମ ନିର୍ଦ୍ଦେଶาବଳୀ ବିଶ୍ଳେଷଣ ହେଉଛି...' },
                            { id: 2, labelEn: 'Drafting high-quality bilingual content...', labelOr: 'ଉଚ୍ଚ-ଗୁଣବତ୍ତା ଦ୍ଵିଭାଷୀ ବିଷୟବସ୍ତୁ ପ୍ରସ୍ତୁତ ହେଉଛି...' },
                            { id: 3, labelEn: 'Structuring plans / pedagogical keys...', labelOr: 'ଶିକ୍ଷାଦାନ ପଦ୍ଧତି ଅନୁଯାୟୀ ଯୋଜନା ଗଠନ କରାଯାଉଛି...' },
                            { id: 4, labelEn: 'Finalizing layout and print styling...', labelOr: 'ଲେଆଉଟ୍ ଏବଂ ପ୍ରିଣ୍ଟ୍ ଶୈଳୀ ଚୂଡ଼ାନ୍ତ କରାଯାଉଛି...' }
                          ].map((step) => {
                            const isActive = loadingStep === step.id;
                            const isCompleted = loadingStep > step.id;
                            return (
                              <div key={step.id} className="flex items-center gap-3 transition-opacity duration-300">
                                {isCompleted ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <Lucide.Check size={10} strokeWidth={3} />
                                  </div>
                                ) : isActive ? (
                                  <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                  </div>
                                )}
                                <span className={`text-[11px] font-bold ${isCompleted ? 'text-slate-400 line-through' : isActive ? 'text-purple-400 font-extrabold' : 'text-slate-600'}`}>
                                  {language === 'en' ? step.labelEn : step.labelOr}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : !generatedContent ? (
                      // 2. Empty state
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-center items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500">
                          <Lucide.FileText size={24} />
                        </div>
                        <div className="space-y-1 max-w-sm">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">
                            {language === 'en' ? 'Empty Preview Canvas' : 'ଖାଲି ପ୍ରିଭ୍ୟୁ କ୍ୟାଭାସ୍'}
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            {language === 'en' 
                              ? 'Configure standard syllabus parameters on the left side panel and click Generate to preview the resource.'
                              : 'ବାମ ପାର୍ଶ୍ୱ ପ୍ୟାନେଲରେ ମାନକ ପାଠ୍ୟକ୍ରମ ପାରାମିଟର ସେଟ୍ କରନ୍ତୁ ଏବଂ ପୂର୍ବାବଲୋକନ ଦେଖିବାକୁ ଜେନେରେଟ୍ କ୍ଲିକ୍ କରନ୍ତୁ।'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      // 3. Success preview state
                      <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8 print:p-0 print:overflow-visible print:block print:static">
                        
                        {/* Top Action Ribbon inside canvas */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0 print:hidden bg-slate-900/60 p-4 border border-white/5 rounded-2xl">
                          {generatorType === 'worksheet' ? (
                            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
                              <button
                                onClick={() => setAnswerKeyMode('student')}
                                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  answerKeyMode === 'student' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {language === 'en' ? 'Student Version' : 'ଛାତ୍ର ସଂସ୍କରଣ'}
                              </button>
                              <button
                                onClick={() => setAnswerKeyMode('teacher')}
                                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  answerKeyMode === 'teacher' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {language === 'en' ? 'Teacher Answer Key' : 'ଶିକ୍ଷକ ଉତ୍ତର ସୂଚୀ'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-black text-purple-400 uppercase tracking-widest">
                              <Lucide.Sparkles size={14} className="animate-pulse" />
                              <span>{language === 'en' ? 'Content Generated Successfully' : 'ବିଷୟବସ୍ତୁ ସଫଳତାର ସହ ପ୍ରସ୍ତୁତ ହେଲା'}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedContent);
                                alert(language === 'en' ? "Copied to clipboard!" : "କ୍ଲିପବୋର୍ଡରେ କପି ହୋଇଛି!");
                              }}
                              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white/5"
                            >
                              <Lucide.Copy size={12} />
                              <span>{language === 'en' ? 'Copy Text' : 'କପି କରନ୍ତୁ'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handlePrint}
                              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Lucide.Printer size={12} />
                              <span>{language === 'en' ? 'Print / Save PDF' : 'ପ୍ରିଣ୍ଟ / PDF'}</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => setGeneratedContent('')}
                              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title={language === 'en' ? 'Clear Content' : 'ସଫା କରନ୍ତୁ'}
                            >
                              <Lucide.Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* White Paper sheet preview */}
                        <div className="flex-1 overflow-y-auto border border-slate-200/10 rounded-2xl p-6 md:p-8 bg-white text-slate-900 mb-2 relative print:border-none print:bg-white print:p-0 print:overflow-visible print:block print:static shadow-inner">
                          <div id="printable-area" className="prose prose-slate max-w-none text-slate-900 font-medium print:text-black print:prose-neutral print:font-normal animate-fade-in">
                            <style>{`
                              @media print {
                                body > :not(#print-root) { display: none !important; }
                                #print-root { display: block !important; position: relative !important; width: 100% !important; background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                                #print-root, #print-root * { color: black !important; }
                              }
                            `}</style>
                            
                            {generatorType === 'worksheet' ? (
                              answerKeyMode === 'student' ? (
                                <>
                                  <ReactMarkdown>{studentQuestions}</ReactMarkdown>
                                  <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-300 text-center space-y-4 print:text-black print:border-slate-300">
                                    <div className="inline-flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 px-5 py-3 rounded-2xl text-purple-700">
                                      <Lucide.Sparkles size={18} />
                                      <span className="text-xs font-black uppercase tracking-widest">Verified by Utkal Skill Centre AI</span>
                                    </div>
                                    <h4 className="text-md font-black text-slate-800 leading-snug print:text-black">
                                      {language === 'en' ? 'Check step-by-step interactive solutions on the App!' : 'ମୋବାଇଲ୍ ଆପ୍ ରେ ପଦକ୍ଷେପ-କ୍ରମିକ ସମାଧାନ ଏବଂ ସନ୍ଦେହ ମୋଚନ ଦେଖନ୍ତୁ!'}
                                    </h4>
                                    <p className="text-xs text-slate-500 max-w-lg mx-auto print:text-slate-600">
                                      {language === 'en' ? 'Scan this worksheet code to ask Gundulu AI, practice daily MCQs, and access bilingual textbooks for FREE!' : 'ମାଗଣାରେ ଗୁନ୍ଦୁଲୁ AI କୁ ପ୍ରଶ୍ନ ପଚାରିବା, ଦୈନିକ MCQ ଟେଷ୍ଟ ଦେବା ଏବଂ ପାଠ୍ୟପୁସ୍ତକ ପାଇଁ ଆପ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ!'}
                                    </p>
                                    <div className="w-32 h-32 bg-white p-2.5 rounded-2xl mx-auto flex flex-col justify-between shadow-xl border border-slate-200">
                                      <div className="flex justify-between h-[30%]"><div className="w-[30%] h-full bg-purple-600 rounded" /><div className="w-[30%] h-full bg-purple-600 rounded" /></div>
                                      <div className="flex justify-between items-center h-[30%]"><div className="w-[30%] h-full flex items-center justify-center font-black text-[8px] text-purple-600 uppercase tracking-tighter">UTKAL</div><div className="w-[30%] h-full bg-purple-600 rounded" /></div>
                                      <div className="flex justify-between h-[30%]"><div className="w-[30%] h-full bg-purple-600 rounded" /><div className="w-[30%] h-full bg-purple-600 rounded" /></div>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">www.utkalskillcentre.com</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="border-b-2 border-red-500/30 pb-3 mb-6 text-center print:text-black">
                                    <span className="text-[10px] font-black text-red-700 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full uppercase tracking-wider print:text-red-700 print:border-red-300">
                                      TEACHER ANSWER KEY • pedagogical reference
                                    </span>
                                  </div>
                                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                                </>
                              )
                            ) : (
                              <ReactMarkdown>{generatedContent}</ReactMarkdown>
                            )}
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex gap-4 shrink-0 print:hidden">
                          <button
                            type="button"
                            onClick={() => setGeneratedContent('')}
                            className="flex-1 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                          >
                            {language === 'en' ? 'Create Another' : 'ଆଉ ଏକ ପ୍ରସ୍ତୁତ କରନ୍ତୁ'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedContent);
                              alert(language === 'en' ? "Copied to clipboard!" : "କ୍ଲିପବୋର୍ଡରେ କପି ହୋଇଛି!");
                            }}
                            className="flex-1 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <Lucide.Copy size={16} />
                            <span>{language === 'en' ? 'Copy Text' : 'କପି କରନ୍ତୁ'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handlePrint}
                            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Lucide.Printer size={16} />
                            <span>{language === 'en' ? 'Print / Save PDF' : 'ପ୍ରିଣ୍ଟ / PDF ସେଭ୍'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>,
            document.body
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
