import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import * as Lucide from 'lucide-react';
import { db as firestore } from '../firebase';
import { DailyMcq, DailyMcqSubmission } from '../types';
import { translations } from '../translations';
import { normalizeDailyMcqQuestions } from '../utils/dailyMcq';
import { copyTextToClipboard, getDailyMcqShareUrl, openDailyMcqWhatsAppShare } from '../utils/dailyMcqShare';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { SEO } from './SEO';
import { vibrate, playSuccessChime } from '../pwa';
import { cleanMathNotation } from './DigitalLibraryView';
import confetti from 'canvas-confetti';

interface DailyMcqViewProps {
  mcqs: DailyMcq[];
  submissions: DailyMcqSubmission[];
  user: any;
  language: 'en' | 'or';
  onBack: () => void;
  onSubmissionSuccess?: () => void;
}

const ATTEMPT_REWARD = 1;

// Subject styles mapping for premium themed cards
const getSubjectStyle = (subject: string = '') => {
  const normalized = subject.toLowerCase().trim();
  if (normalized.includes('math') || normalized.includes('algebra') || normalized.includes('geometry')) {
    return {
      gradient: 'from-amber-600/20 via-orange-600/10 to-transparent',
      border: 'border-orange-500/30 hover:border-orange-500/50',
      text: 'text-orange-400',
      badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/20',
      icon: Lucide.Compass,
      lightBg: 'bg-orange-50',
      accentColor: '#f97316'
    };
  }
  if (normalized.includes('science') || normalized.includes('physics') || normalized.includes('chemistry') || normalized.includes('biology')) {
    return {
      gradient: 'from-emerald-600/20 via-teal-600/10 to-transparent',
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
      icon: Lucide.Atom,
      lightBg: 'bg-emerald-50',
      accentColor: '#10b981'
    };
  }
  if (normalized.includes('english')) {
    return {
      gradient: 'from-violet-600/20 via-purple-600/10 to-transparent',
      border: 'border-violet-500/30 hover:border-violet-500/50',
      text: 'text-violet-400',
      badge: 'bg-violet-500/15 text-violet-300 border border-violet-500/20',
      icon: Lucide.BookOpen,
      lightBg: 'bg-violet-50',
      accentColor: '#8b5cf6'
    };
  }
  if (normalized.includes('odia')) {
    return {
      gradient: 'from-cyan-600/20 via-sky-600/10 to-transparent',
      border: 'border-cyan-500/30 hover:border-cyan-500/50',
      text: 'text-cyan-400',
      badge: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20',
      icon: Lucide.PenTool,
      lightBg: 'bg-cyan-50',
      accentColor: '#06b6d4'
    };
  }
  if (normalized.includes('social') || normalized.includes('history') || normalized.includes('geography')) {
    return {
      gradient: 'from-rose-600/20 via-pink-600/10 to-transparent',
      border: 'border-rose-500/30 hover:border-rose-500/50',
      text: 'text-rose-400',
      badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
      icon: Lucide.Globe,
      lightBg: 'bg-rose-50',
      accentColor: '#f43f5e'
    };
  }
  if (normalized.includes('hindi') || normalized.includes('sanskrit')) {
    return {
      gradient: 'from-indigo-600/20 via-blue-600/10 to-transparent',
      border: 'border-indigo-500/30 hover:border-indigo-500/50',
      text: 'text-indigo-400',
      badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20',
      icon: Lucide.Languages,
      lightBg: 'bg-indigo-50',
      accentColor: '#6366f1'
    };
  }
  return {
    gradient: 'from-slate-600/20 via-slate-700/10 to-transparent',
    border: 'border-white/10 hover:border-white/20',
    text: 'text-slate-400',
    badge: 'bg-white/5 text-slate-400 border border-white/10',
    icon: Lucide.HelpCircle,
    lightBg: 'bg-slate-100',
    accentColor: '#64748b'
  };
};

export function DailyMcqView({ mcqs, submissions, user, language, onBack, onSubmissionSuccess }: DailyMcqViewProps) {
  const [localSubmissions, setLocalSubmissions] = useState<DailyMcqSubmission[]>(submissions);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [submittingMcqId, setSubmittingMcqId] = useState<string | null>(null);
  const [copiedMcqId, setCopiedMcqId] = useState<string | null>(null);
  
  // Focused Practice mode states
  const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  useEffect(() => {
    setLocalSubmissions(submissions);
  }, [submissions]);

  const { isListening, startListening, stopListening } = useVoiceInput(language);

  const t = language === 'en'
    ? {
        title: 'Daily Challenge Arena',
        subtitle: 'Solve daily board-pattern questions, level up, and earn study rewards.',
        noItems: 'No practice questions have been published for your class yet.',
        chooseAnswer: 'Select the best option to lock in your answer.',
        submit: 'Submit Answer',
        correct: 'Correct answer',
        wrong: 'Incorrect answer',
        explanation: 'Expert Explanation',
        todaysSet: 'Today\'s Set',
        previousSet: 'Recent Challenges',
        forClass: 'For',
        back: 'Dashboard',
        scheduleNotice: 'New challenges arrive Monday to Saturday at 6 AM.',
        rewardLine: 'Earn 1 effort point for attempting, plus marks for each correct response.',
        alreadySubmitted: 'Challenge Completed',
        earned: 'Earned',
        score: 'Score',
        submitSet: 'Submit Challenge',
        completeAll: 'Please answer every question in this set before submitting.',
        share: 'WhatsApp',
        copyLink: 'Copy Link',
        copied: 'Copied!',
        shareHint: 'Share this challenge with your classmates so they can test their knowledge!',
        submitFailed: 'Could not submit your answer. Please try again.',
        typeAnswer: 'Type your detailed answer here...',
        yourAnswer: 'Your Answer',
        modelAnswer: 'Model Answer',
        startPractice: 'Start Challenge',
        reviewAnswers: 'Review Results',
        streak: 'Day Streak',
        totalPoints: 'Total Points',
        accuracy: 'Avg. Accuracy',
        pending: 'Pending',
        question: 'Question',
        marks: 'Marks',
        pointsAvailable: 'Points Available',
        voiceHint: 'Hold the microphone to type with your voice'
      }
    : {
        title: 'ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ ଆରେନା',
        subtitle: 'ଦୈନିକ ପରୀକ୍ଷା ଉପଯୋଗୀ ପ୍ରଶ୍ନ ସମାଧାନ କରନ୍ତୁ, ନିଜର ସ୍ତର ବଢାନ୍ତୁ ଏବଂ ପଏଣ୍ଟ ଅର୍ଜନ କରନ୍ତୁ।',
        noItems: 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପ୍ରାକ୍ଟିସ୍ ପ୍ରଶ୍ନ ପ୍ରକାଶିତ ହୋଇନାହିଁ |',
        chooseAnswer: 'ସଠିକ୍ ବିକଳ୍ପ ଚୟନ କରି ନିଜର ଉତ୍ତର ଲକ୍ କରନ୍ତୁ।',
        submit: 'ଉତ୍ତର ସବମିଟ୍ କରନ୍ତୁ',
        correct: 'ଠିକ୍ ଉତ୍ତର',
        wrong: 'ଭୁଲ ଉତ୍ତର',
        explanation: 'ବିଶେଷଜ୍ଞ ସ୍ପଷ୍ଟୀକରଣ',
        todaysSet: 'ଆଜିର ସେଟ୍',
        previousSet: 'ନିକଟ ଅତୀତର ଚ୍ୟାଲେଞ୍ଜ',
        forClass: 'ପାଇଁ',
        back: 'ଡ୍ୟାସବୋର୍ଡ',
        scheduleNotice: 'ସୋମବାର ରୁ ଶନିବାର ସକାଳ ୬ ଟାରେ ନୂଆ ଚ୍ୟାଲେଞ୍ଜ ପ୍ରକାଶିତ ହୁଏ।',
        rewardLine: 'ଚେଷ୍ଟା ପାଇଁ ୧ ପଏଣ୍ଟ ଏବଂ ପ୍ରତ୍ୟେକ ଠିକ୍ ଉତ୍ତର ପାଇଁ ତାହାର ମାର୍କ ଅନୁଯାୟୀ ପଏଣ୍ଟ ମିଳିବ |',
        alreadySubmitted: 'ଚ୍ୟାଲେଞ୍ଜ ସମ୍ପୂର୍ଣ୍ଣ ହେଲା',
        earned: 'ଅର୍ଜନ',
        score: 'ସ୍କୋର',
        submitSet: 'ଚ୍ୟାଲେଞ୍ଜ ସବମିଟ୍ କରନ୍ତୁ',
        completeAll: 'ସବମିଟ୍ କରିବା ପୂର୍ବରୁ ଏହି ସେଟ୍‌ର ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ |',
        share: 'WhatsApp',
        copyLink: 'ଲିଙ୍କ କପି',
        copied: 'କପି ହେଲା!',
        shareHint: 'ଏହି ଚ୍ୟାଲେଞ୍ଜକୁ ଆପଣଙ୍କ ସାଙ୍ଗମାନଙ୍କ ସହ ଶେୟାର କରନ୍ତୁ ଯେପରି ସେମାନେ ମଧ୍ୟ ନିଜର ପରୀକ୍ଷା କରିପାରିବେ!',
        submitFailed: 'ଉତ୍ତର ସବମିଟ୍ ହୋଇପାରିଲା ନାହିଁ | ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |',
        typeAnswer: 'ଏଠାରେ ଆପଣଙ୍କର ବିସ୍ତୃତ ଉତ୍ତର ଲେଖନ୍ତୁ...',
        yourAnswer: 'ଆପଣଙ୍କ ଉତ୍ତର',
        modelAnswer: 'ସଠିକ୍ ଉତ୍ତର',
        startPractice: 'ଚ୍ୟାଲେଞ୍ଜ ଆରମ୍ଭ କରନ୍ତୁ',
        reviewAnswers: 'ଫଳାଫଳ ଦେଖନ୍ତୁ',
        streak: 'ପଢ଼ା ଧାରା',
        totalPoints: 'ସମୁଦାୟ ପଏଣ୍ଟ',
        accuracy: 'ହାରାହାରି ସଠିକତା',
        pending: 'ବାକି ଅଛି',
        question: 'ପ୍ରଶ୍ନ',
        marks: 'ମାର୍କ',
        pointsAvailable: 'ମିଳିବାକୁ ଥିବା ପଏଣ୍ଟ',
        voiceHint: 'ଭଏସ୍ ଟାଇପିଂ ପାଇଁ ମାଇକ୍ରୋଫୋନକୁ ଦବାଇ ରଖନ୍ତୁ'
      };

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  const sortedMcqs = useMemo(() => {
    return [...mcqs]
      .filter((mcq: any) => {
        const boardMap: Record<string, string> = {
          'odisha': 'Odisha State Board',
          'oav': 'OAV (Adarsha)',
          'aurobindo': 'SACIE (Aurobindo)',
          'saraswati': 'Saraswati Sishu Mandir'
        };

        const mcqBoard = String(mcq.board || 'Odisha State Board').trim();
        const userBoardRaw = String(user?.board || 'odisha').trim();
        const userBoardFull = boardMap[userBoardRaw] || userBoardRaw;

        return mcqBoard === userBoardFull || 
               mcqBoard === userBoardRaw || 
               mcqBoard.includes('Odisha Board') ||
               (userBoardRaw === 'odisha' && mcqBoard === 'Odisha State Board');
      })
      .sort((left, right) => new Date(right.activeDate || 0).getTime() - new Date(left.activeDate || 0).getTime());
  }, [mcqs, user?.board]);

  const submissionMap = useMemo(
    () => Object.fromEntries(localSubmissions.map((submission) => [submission.mcqId, submission])),
    [localSubmissions]
  );

  // Statistics calculations
  const stats = useMemo(() => {
    const totalPoints = localSubmissions.reduce((sum, s) => sum + (s.totalPointsEarned || 0), 0);
    const totalQuestionsSolved = localSubmissions.reduce((sum, s) => sum + (s.totalQuestions || 0), 0);
    const totalCorrectSolved = localSubmissions.reduce((sum, s) => sum + (s.correctCount || 0), 0);
    const averageAccuracy = totalQuestionsSolved > 0 ? Math.round((totalCorrectSolved / totalQuestionsSolved) * 100) : 0;
    const pendingCount = sortedMcqs.filter(mcq => !submissionMap[mcq.id]).length;
    return {
      totalPoints,
      averageAccuracy,
      pendingCount,
      streak: user?.streak || 0
    };
  }, [localSubmissions, sortedMcqs, submissionMap, user?.streak]);

  const formatDate = (value: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleShareOnWhatsApp = (mcq: DailyMcq) => {
    const submission = submissionMap[mcq.id];
    const scoreText = submission ? `${submission.correctCount}/${submission.totalQuestions}` : undefined;
    const subjectLabel = mcq.subject ? (translations[language].subjects?.[mcq.subject] || mcq.subject) : undefined;
    const classLabel = translations[language].classes?.[mcq.class] || mcq.class;
    openDailyMcqWhatsAppShare({ language, subjectLabel, classLabel, scoreText });
  };

  const handleCopyLink = async (mcqId: string) => {
    try {
      await copyTextToClipboard(getDailyMcqShareUrl());
      setCopiedMcqId(mcqId);
      window.setTimeout(() => {
        setCopiedMcqId((currentId) => currentId === mcqId ? null : currentId);
      }, 2000);
    } catch (error) {
      console.error('Daily MCQ copy link error:', error);
    }
  };

  const handleSubmit = async (mcq: DailyMcq) => {
    const questions = normalizeDailyMcqQuestions(mcq);
    const answers = selectedAnswers[mcq.id] || [];
    if (!user?.id || submissionMap[mcq.id] || submittingMcqId === mcq.id || questions.length === 0) return;
    
    // Find first unanswered question index
    const unansweredIndex = questions.findIndex((_, idx) => !answers[idx] || answers[idx].trim().length === 0);
    if (unansweredIndex !== -1) {
      setCurrentQuestionIndex(unansweredIndex);
      window.alert(t.completeAll);
      return;
    }

    const correctCount = questions.reduce((count, question, index) => {
      if (question.type === 'subjective') return count + (answers[index]?.trim().length > 0 ? 1 : 0);
      return count + (answers[index] === question.correct_answer ? 1 : 0);
    }, 0);
    
    const correctBonus = questions.reduce((sum, question, index) => {
      const isCorrect = question.type === 'subjective' 
        ? answers[index]?.trim().length > 0 
        : answers[index] === question.correct_answer;
        
      if (!isCorrect) return sum;
      const marks = typeof question.marks === 'number' ? question.marks : 1;
      return sum + marks;
    }, 0);
    const totalPointsEarned = ATTEMPT_REWARD + correctBonus;
    const submissionRef = doc(firestore, 'daily_mcq_submissions', `${user.id}_${mcq.id}`);
    const userRef = doc(firestore, 'users', user.id);
    const progressRef = doc(collection(firestore, 'user_progress'));

    setSubmittingMcqId(mcq.id);
    try {
      await runTransaction(firestore, async (transaction) => {
        const existingSubmission = await transaction.get(submissionRef);
        if (existingSubmission.exists()) {
          throw new Error('already-submitted');
        }

        const userSnap = await transaction.get(userRef);
        const currentPoints = userSnap.exists() ? Math.floor(Number(userSnap.data().points || 0)) : 0;
        const currentPointsToday = userSnap.exists() ? Math.floor(Number((userSnap.data() as any).points_today || 0)) : 0;

        transaction.set(submissionRef, {
          mcqId: mcq.id,
          userId: user.id,
          answers,
          correctCount,
          totalQuestions: questions.length,
          attemptReward: ATTEMPT_REWARD,
          correctBonus,
          totalPointsEarned,
          submittedDate: today,
          submittedAt: serverTimestamp(),
        });

        transaction.set(userRef, {
          points: currentPoints + Math.floor(totalPointsEarned),
          points_today: currentPointsToday + Math.floor(totalPointsEarned),
          updatedAt: serverTimestamp(),
        }, { merge: true });

        transaction.set(progressRef, {
          userId: user.id,
          date: today,
          pointsEarned: totalPointsEarned,
          type: 'daily_mcq',
          referenceId: mcq.id,
          correctCount,
          totalQuestions: questions.length,
          createdAt: serverTimestamp(),
        });
      });

      const newSubmission: DailyMcqSubmission = {
        id: `${user.id}_${mcq.id}`,
        mcqId: mcq.id,
        userId: user.id,
        answers,
        correctCount,
        totalQuestions: questions.length,
        attemptReward: ATTEMPT_REWARD,
        correctBonus,
        totalPointsEarned,
        submittedDate: today,
        submittedAt: new Date() as any,
      };
      setLocalSubmissions(prev => [...prev, newSubmission]);
      onSubmissionSuccess?.();
      
      // Haptics & Sound alerts
      const allCorrect = correctCount === questions.length;
      playSuccessChime(correctCount > 0);
      if (allCorrect) {
        vibrate([50, 30, 100]);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else if (correctCount >= Math.ceil(questions.length * 0.7)) {
        vibrate(60);
        confetti({
          particleCount: 85,
          spread: 60,
          origin: { y: 0.6 }
        });
      } else if (correctCount > 0) {
        vibrate(60);
      } else {
        vibrate([120, 60, 120]);
      }
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'already-submitted') {
        console.error('Daily MCQ submit error:', error);
        window.alert(t.submitFailed);
      }
    } finally {
      setSubmittingMcqId(null);
    }
  };

  const mcqFaqs = [
    {
      question: "Are these Daily MCQs free for all students?",
      answer: "Yes, the Daily MCQ Practice sets at Utkal Skill Centre are free for all registered students to help them prepare for their Odisha Board exams."
    },
    {
      question: "How can I earn points by solving daily practice questions?",
      answer: "Students earn 1 point for every attempt and additional points for each correct answer. These points help in improving your state-wide effort ranking."
    },
    {
      question: "Can I use voice input to answer subjective questions?",
      answer: "Yes, our AI-powered dashboard supports voice input in both Odia and English. Simply hold the microphone icon to speak your answer."
    }
  ];

  // Active MCQ calculations
  const activeMcq = useMemo(() => sortedMcqs.find(mcq => mcq.id === selectedMcqId), [sortedMcqs, selectedMcqId]);
  const activeQuestions = useMemo(() => activeMcq ? normalizeDailyMcqQuestions(activeMcq) : [], [activeMcq]);
  const currentQuestion = activeQuestions[currentQuestionIndex];
  const submission = activeMcq ? submissionMap[activeMcq.id] : undefined;
  const isSubmitted = Boolean(submission);
  const selectedSetAnswers = activeMcq ? (selectedAnswers[activeMcq.id] || []) : [];

  // Completed questions count for progress bar
  const answeredCount = useMemo(() => {
    if (!activeMcq) return 0;
    return activeQuestions.reduce((count, _, idx) => {
      const hasAnswer = selectedSetAnswers[idx] !== undefined && String(selectedSetAnswers[idx]).trim().length > 0;
      return (hasAnswer || isSubmitted) ? count + 1 : count;
    }, 0);
  }, [activeMcq, activeQuestions, selectedSetAnswers, isSubmitted]);

  const progressPercent = useMemo(() => {
    if (activeQuestions.length === 0) return 0;
    return (answeredCount / activeQuestions.length) * 100;
  }, [answeredCount, activeQuestions]);

  const activeSubjectStyle = useMemo(() => {
    return activeMcq ? getSubjectStyle(activeMcq.subject) : getSubjectStyle('');
  }, [activeMcq]);

  const ActiveSubjectIcon = activeSubjectStyle.icon;

  return (
    <motion.div
      key="daily-mcq-view"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20 max-w-5xl mx-auto px-4"
    >
      <SEO 
        title={`Daily MCQ Practice 2026 | Odisha Board Latest Pattern Questions`}
        description="Master your daily MCQs and practice sets for Odisha State Board. Gundulu AI helps you learn faster with practice sets for your monthly exams."
        schemaType="FAQPage"
        faqs={mcqFaqs}
      />

      <AnimatePresence mode="wait">
        {!selectedMcqId ? (
          // DASHBOARD MODE
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Header & Subtitle */}
            <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/5 pb-6">
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t.title}</h1>
                <p className="text-sm text-slate-400 max-w-2xl">{t.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-all font-semibold text-sm cursor-pointer"
              >
                <Lucide.ArrowLeft size={16} />
                {t.back}
              </button>
            </div>

            {/* Schedule Notice banner */}
            <div className="flex items-center gap-3 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-2xl shadow-inner">
              <Lucide.Clock size={18} className="shrink-0" />
              <span>{t.scheduleNotice}</span>
            </div>

            {/* Revision Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Streak Card */}
              <div className="glass-card rounded-[1.5rem] p-4 flex items-center gap-3.5 bg-gradient-to-br from-orange-500/10 to-transparent">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-lg shadow-orange-500/5">
                  <Lucide.Flame size={22} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{t.streak}</p>
                  <p className="text-lg font-black text-white leading-tight">{stats.streak} {language === 'en' ? 'Days' : 'ଦିନ'}</p>
                </div>
              </div>

              {/* Points Card */}
              <div className="glass-card rounded-[1.5rem] p-4 flex items-center gap-3.5 bg-gradient-to-br from-amber-500/10 to-transparent">
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                  <Lucide.Coins size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{t.totalPoints}</p>
                  <p className="text-lg font-black text-white leading-tight">{stats.totalPoints} XP</p>
                </div>
              </div>

              {/* Accuracy Card */}
              <div className="glass-card rounded-[1.5rem] p-4 flex items-center gap-3.5 bg-gradient-to-br from-cyan-500/10 to-transparent">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                  <Lucide.Target size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{t.accuracy}</p>
                  <p className="text-lg font-black text-white leading-tight">{stats.averageAccuracy}%</p>
                </div>
              </div>

              {/* Pending Challenges Card */}
              <div className="glass-card rounded-[1.5rem] p-4 flex items-center gap-3.5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <Lucide.BookOpen size={22} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">{t.pending}</p>
                  <p className="text-lg font-black text-white leading-tight">{stats.pendingCount} Sets</p>
                </div>
              </div>
            </div>

            {/* List of sets */}
            {sortedMcqs.length === 0 ? (
              <div className="glass-card rounded-[2rem] border border-dashed border-white/10 p-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5 shadow-inner">
                  <Lucide.HelpCircle size={28} />
                </div>
                <h2 className="text-xl font-bold text-white">{t.title}</h2>
                <p className="text-slate-400 max-w-lg mx-auto">{t.noItems}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedMcqs.map((mcq) => {
                  const submission = submissionMap[mcq.id];
                  const isToday = mcq.activeDate === today;
                  const isSubmitted = Boolean(submission);
                  const questions = normalizeDailyMcqQuestions(mcq);
                  const style = getSubjectStyle(mcq.subject);
                  const SubjectIcon = style.icon;

                  return (
                    <div 
                      key={mcq.id} 
                      className={`glass-card rounded-[2rem] border p-6 flex flex-col justify-between gap-5 transition-all duration-300 hover:shadow-xl hover:shadow-${style.accentColor}/5 bg-gradient-to-br ${style.gradient} to-slate-950/80 ${style.border}`}
                    >
                      <div className="space-y-4">
                        {/* Badges Row */}
                        <div className="flex items-center gap-2 flex-wrap justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${isToday ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 animate-pulse' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                              {isToday ? t.todaysSet : t.previousSet}
                            </span>
                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {t.forClass} {mcq.class}
                            </span>
                            {mcq.subject && (
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${style.badge}`}>
                                {translations[language].subjects?.[mcq.subject] || mcq.subject}
                              </span>
                            )}
                          </div>
                          
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-semibold bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                            <Lucide.Calendar size={13} />
                            {formatDate(mcq.activeDate)}
                          </div>
                        </div>

                        {/* Title & Subject Icon */}
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${style.text} shrink-0`}>
                            <SubjectIcon size={24} />
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-xl font-bold text-white leading-tight">{mcq.title}</h2>
                            <p className="text-xs text-slate-400 font-medium">
                              {questions.length} {questions.length === 1 ? 'Question' : 'Questions'} &bull;&nbsp;
                              {questions.reduce((sum, q) => sum + (q.marks || 1), 0) + ATTEMPT_REWARD} {t.pointsAvailable}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Info hint text */}
                      <p className="text-[11px] text-slate-500 leading-normal italic">{t.shareHint}</p>

                      {/* Action buttons & Score card */}
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
                        {/* Left: Score Card / Start Trigger */}
                        <div>
                          {isSubmitted ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider">
                              <Lucide.Trophy size={14} className="text-amber-400" />
                              <span>{t.score}: {submission.correctCount}/{submission.totalQuestions}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMcqId(mcq.id);
                                setCurrentQuestionIndex(0);
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-300 cursor-pointer"
                            >
                              <Lucide.Play size={12} fill="white" />
                              {t.startPractice}
                            </button>
                          )}
                        </div>

                        {/* Right: Review Results, Share, Copy */}
                        <div className="flex items-center gap-2">
                          {isSubmitted && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMcqId(mcq.id);
                                setCurrentQuestionIndex(0);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-[0.1em] hover:bg-cyan-500/20 transition-all cursor-pointer"
                            >
                              <Lucide.Sparkles size={13} />
                              {t.reviewAnswers}
                            </button>
                          )}
                          
                          <button
                            type="button"
                            onClick={() => handleCopyLink(mcq.id)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
                            title={t.copyLink}
                          >
                            {copiedMcqId === mcq.id ? <Lucide.Check size={14} className="text-emerald-400 animate-bounce" /> : <Lucide.Copy size={14} />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleShareOnWhatsApp(mcq)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-black uppercase tracking-[0.1em] hover:bg-[#25D366] hover:text-black hover:shadow-[0_0_15px_rgba(37,211,102,0.4)] hover:scale-105 transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden shrink-0"
                            title={t.share}
                          >
                            <span className="absolute right-1 top-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <svg 
                              viewBox="0 0 24 24" 
                              width="14" 
                              height="14" 
                              className="fill-current shrink-0"
                            >
                              <path d="M12.004 2C6.51 2 2.014 6.5 2.014 12c0 2.14.675 4.143 1.836 5.813L2.027 22l4.31-.837a9.902 9.902 0 0 0 5.666 1.834c5.495 0 9.99-4.5 9.99-10S17.5 2 12.004 2zm0 1.637c4.61 0 8.353 3.75 8.353 8.363 0 4.614-3.743 8.364-8.353 8.364-1.63 0-3.155-.472-4.46-1.29l-.32-.205-2.643.512.52-2.545-.226-.35a8.293 8.293 0 0 1-1.226-4.484c0-4.613 3.743-8.363 8.353-8.363zm-3.666 4.62c-.173 0-.397.07-.57.25-.175.18-.675.66-.675 1.61s.7 1.87.8 2.01c.1.14 1.362 2.08 3.3 2.91.46.2.82.32 1.1.41.463.15.883.13 1.218.08.373-.05.77-.25.88-.49.11-.24.11-.45.08-.49-.03-.04-.12-.07-.25-.13l-1.18-.58c-.14-.07-.24-.04-.32.08l-.51.64c-.1.13-.2.14-.33.08-.13-.07-.56-.21-1.07-.66-.4-.35-.67-.79-.75-.92-.08-.14-.01-.21.06-.27l.42-.49c.07-.08.1-.14.15-.24a.27.27 0 0 0-.01-.26l-.53-1.27c-.15-.36-.3-.3-.41-.3z"/>
                            </svg>
                            <span>{t.share}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          // QUIZ PRACTICE MODE (Step-by-step arena)
          <motion.div
            key="practice-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Top Control Bar */}
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
              <button
                type="button"
                onClick={() => setSelectedMcqId(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all font-semibold text-xs cursor-pointer"
              >
                <Lucide.ArrowLeft size={14} />
                {language === 'en' ? 'Back' : 'ଫେରିଯାନ୍ତୁ'}
              </button>

              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-white/5 ${activeSubjectStyle.text}`}>
                  <ActiveSubjectIcon size={16} />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">{activeMcq?.title}</span>
              </div>

              <div className="inline-flex items-center gap-1 bg-black/20 border border-white/5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-amber-400">
                <Lucide.Coins size={12} />
                <span>+{currentQuestion?.marks || 1} XP</span>
              </div>
            </div>

            {/* Premium Linear Progress Tracker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                <span>{t.question} {currentQuestionIndex + 1} / {activeQuestions.length}</span>
                <span className={activeSubjectStyle.text}>{Math.round(progressPercent)}% {language === 'en' ? 'Completed' : 'ସମାପ୍ତ'}</span>
              </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div 
                  className={`h-full bg-gradient-to-r ${activeSubjectStyle.gradient} to-cyan-500 rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Display Wrapper with Framer Motion slide */}
            <div className="relative min-h-[350px] flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`question-card-${currentQuestionIndex}`}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="glass-card rounded-[2rem] p-6 space-y-6 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    {/* Header: Question indicator + Marks */}
                    <div className="flex items-center justify-between">
                      <span className="px-3.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        {t.question} {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {t.marks}: {currentQuestion?.marks || 1}
                      </span>
                    </div>

                    {/* Question text */}
                    <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed">
                      {cleanMathNotation(currentQuestion?.question)}
                    </h3>

                    {/* Options Grid / Textarea */}
                    {currentQuestion?.type === 'subjective' ? (
                      // Subjective Input Layout
                      <div className="space-y-4 relative">
                        <textarea
                          disabled={isSubmitted}
                          placeholder={t.typeAnswer}
                          value={selectedSetAnswers[currentQuestionIndex] || ''}
                          onChange={(e) => {
                            const nextAnswers = [...selectedSetAnswers];
                            nextAnswers[currentQuestionIndex] = e.target.value;
                            setSelectedAnswers((prev) => ({ ...prev, [selectedMcqId!]: nextAnswers }));
                          }}
                          className="w-full min-h-[140px] rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/40 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all outline-none resize-none pr-14"
                        />
                        
                        {/* Voice microphone UI */}
                        {!isSubmitted && (
                          <div className="absolute right-4 bottom-4 flex items-center gap-3">
                            {isListening && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/25"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                {language === 'en' ? 'Listening...' : 'ଶୁଣୁଛି...'}
                              </motion.div>
                            )}
                            
                            <div className="relative">
                              {/* Voice neural active rings */}
                              {isListening && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <motion.div 
                                    animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    className="absolute w-16 h-16 rounded-full border border-emerald-500/40"
                                  />
                                  <motion.div 
                                    animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.6 }}
                                    className="absolute w-16 h-16 rounded-full border border-emerald-500/20"
                                  />
                                </div>
                              )}
                              
                              <button
                                type="button"
                                onMouseDown={() => startListening((text) => {
                                  setSelectedAnswers((prev) => {
                                    const currentAnswers = prev[selectedMcqId!] || [];
                                    const nextAnswers = [...currentAnswers];
                                    nextAnswers[currentQuestionIndex] = (nextAnswers[currentQuestionIndex] || '').trim() + ' ' + text.trim();
                                    return { ...prev, [selectedMcqId!]: nextAnswers };
                                  });
                                })}
                                onMouseUp={stopListening}
                                onTouchStart={(e) => {
                                  e.preventDefault();
                                  startListening((text) => {
                                    setSelectedAnswers((prev) => {
                                      const currentAnswers = prev[selectedMcqId!] || [];
                                      const nextAnswers = [...currentAnswers];
                                      nextAnswers[currentQuestionIndex] = (nextAnswers[currentQuestionIndex] || '').trim() + ' ' + text.trim();
                                      return { ...prev, [selectedMcqId!]: nextAnswers };
                                    });
                                  });
                                }}
                                onTouchEnd={stopListening}
                                className={`relative p-3.5 rounded-full transition-all duration-300 cursor-pointer ${isListening ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-white/10'}`}
                                title={t.voiceHint}
                              >
                                <Lucide.Mic size={18} className={isListening ? 'animate-pulse' : ''} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Subjective submissions review details */}
                        {isSubmitted && (
                          <div className="space-y-4 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/60 mb-1">{t.yourAnswer}</p>
                              <p className="text-sm text-slate-200">{submission?.answers?.[currentQuestionIndex] || 'No answer submitted'}</p>
                            </div>
                            <div className="pt-3 border-t border-white/5">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/60 mb-1">{t.modelAnswer}</p>
                              <p className="text-sm text-emerald-300 font-semibold">{cleanMathNotation(currentQuestion?.correct_answer)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Multiple Choice Grid Layout
                      <div className="grid grid-cols-1 gap-3.5">
                        {currentQuestion?.options?.map((option, optionIndex) => {
                          const isSelected = selectedSetAnswers[currentQuestionIndex] === option;
                          const isCorrectOption = option === currentQuestion.correct_answer;
                          const isWrongSelected = submission?.answers?.[currentQuestionIndex] === option && option !== currentQuestion.correct_answer;

                          let optionClasses = 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/20';
                          let keycapClasses = 'bg-white/10 text-slate-400';

                          if (isSelected) {
                            optionClasses = 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
                            keycapClasses = 'bg-cyan-500 text-white';
                          }
                          if (isSubmitted) {
                            if (isCorrectOption) {
                              optionClasses = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
                              keycapClasses = 'bg-emerald-500 text-white';
                            } else if (isWrongSelected) {
                              optionClasses = 'border-red-500/50 bg-red-500/10 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
                              keycapClasses = 'bg-red-500 text-white';
                            } else {
                              optionClasses = 'border-white/5 bg-white/2 opacity-40 text-slate-400 cursor-default';
                              keycapClasses = 'bg-white/5 text-slate-500';
                            }
                          }

                          return (
                            <button
                              key={`option-${optionIndex}`}
                              type="button"
                              disabled={isSubmitted}
                              onClick={() => {
                                vibrate(12);
                                const nextAnswers = [...selectedSetAnswers];
                                nextAnswers[currentQuestionIndex] = option;
                                setSelectedAnswers((prev) => ({ ...prev, [selectedMcqId!]: nextAnswers }));
                              }}
                              className={`w-full text-left rounded-2xl border px-5 py-4 flex items-center gap-4 transition-all duration-300 cursor-pointer ${optionClasses}`}
                            >
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${keycapClasses}`}>
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className="text-sm font-semibold leading-snug">{cleanMathNotation(option)}</span>
                              
                              {/* Submit icon feedback */}
                              {isSubmitted && isCorrectOption && (
                                <Lucide.CheckCircle2 size={18} className="text-emerald-400 ml-auto shrink-0" />
                              )}
                              {isSubmitted && isWrongSelected && (
                                <Lucide.XCircle size={18} className="text-red-400 ml-auto shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation details container */}
                    {isSubmitted && currentQuestion?.explanation && (
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex gap-3">
                        <Lucide.Lightbulb size={20} className="text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/80 mb-1">{t.explanation}</p>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            {cleanMathNotation(currentQuestion.explanation)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rewards reminder line */}
                  <div className="mt-8 flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/5 border border-cyan-500/10 px-3.5 py-2.5 rounded-2xl shadow-inner w-fit font-medium">
                    <Lucide.Coins size={14} />
                    <span>{t.rewardLine}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => {
                  vibrate(10);
                  setCurrentQuestionIndex(idx => Math.max(0, idx - 1));
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-xs cursor-pointer"
              >
                <Lucide.ChevronLeft size={16} />
                {language === 'en' ? 'Previous' : 'ପୂର୍ବବର୍ତ୍ତୀ'}
              </button>

              {/* Submit / Scorecard / Next Button */}
              {currentQuestionIndex === activeQuestions.length - 1 && !isSubmitted ? (
                // Submit Button on last slide
                <button
                  type="button"
                  onClick={() => activeMcq && void handleSubmit(activeMcq)}
                  disabled={submittingMcqId === activeMcq?.id}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-emerald-500/10 transition-all cursor-pointer animate-pulse"
                >
                  {submittingMcqId === activeMcq?.id ? (
                    <Lucide.Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Lucide.Coins size={14} />
                  )}
                  {t.submitSet}
                </button>
              ) : (
                // Next Slide Button
                <button
                  type="button"
                  disabled={currentQuestionIndex === activeQuestions.length - 1}
                  onClick={() => {
                    vibrate(10);
                    setCurrentQuestionIndex(idx => Math.min(activeQuestions.length - 1, idx + 1));
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-xs cursor-pointer"
                >
                  {language === 'en' ? 'Next' : 'ପରବର୍ତ୍ତୀ'}
                  <Lucide.ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* Score Summary box displayed once completed */}
            {isSubmitted && (
              <div className={`mt-4 rounded-2xl border p-5 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r ${submission?.correctCount === submission?.totalQuestions ? 'from-emerald-500/15 to-transparent border-emerald-500/20' : 'from-amber-500/15 to-transparent border-amber-500/20'}`}>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 font-black text-sm uppercase tracking-wider ${submission?.correctCount === submission?.totalQuestions ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {submission?.correctCount === submission?.totalQuestions ? (
                      <Lucide.CheckCircle2 size={18} />
                    ) : (
                      <Lucide.XCircle size={18} />
                    )}
                    <span>{t.alreadySubmitted}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">
                    {t.score}: {submission?.correctCount} / {submission?.totalQuestions} Questions Correct
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-black/20 text-amber-300 text-xs font-black uppercase tracking-[0.2em] border border-amber-500/10">
                  <Lucide.Coins size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
                  <span>{t.earned} +{submission?.totalPointsEarned} XP</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning/Disclaimer at the bottom */}
      <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500/50 uppercase tracking-widest mt-12 border-t border-white/5 pt-6">
        <Lucide.AlertTriangle size={12} />
        <span>Gundulu AI can make mistakes. Always cross-verify answers.</span>
      </div>
    </motion.div>
  );
}