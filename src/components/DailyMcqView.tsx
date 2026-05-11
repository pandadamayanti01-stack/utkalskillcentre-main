import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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

interface DailyMcqViewProps {
  mcqs: DailyMcq[];
  submissions: DailyMcqSubmission[];
  user: any;
  language: 'en' | 'or';
  onBack: () => void;
}

const ATTEMPT_REWARD = 1;

export function DailyMcqView({ mcqs, submissions, user, language, onBack }: DailyMcqViewProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [submittingMcqId, setSubmittingMcqId] = useState<string | null>(null);
  const [copiedMcqId, setCopiedMcqId] = useState<string | null>(null);
  const { isListening, startListening, stopListening } = useVoiceInput(language);

  const t = language === 'en'
    ? {
        title: 'Daily MCQ Practice',
        subtitle: 'Class-wise multiple choice questions uploaded by admin for daily revision.',
        noItems: 'No practice questions have been published for your class yet.',
        chooseAnswer: 'Choose one answer and submit.',
        submit: 'Submit Answer',
        correct: 'Correct answer',
        wrong: 'Incorrect answer',
        explanation: 'Explanation',
        todaysSet: 'Today\'s Practice',
        previousSet: 'Recent Practice',
        forClass: 'For',
        back: 'Dashboard',
        rewardLine: 'Earn 1 point for the attempt, plus marks for each correct answer.',
        alreadySubmitted: 'Already attempted',
        earned: 'Earned',
        score: 'Score',
        submitSet: 'Submit Daily Set',
        completeAll: 'Answer every question in this set before submitting.',
        share: 'Share on WhatsApp',
        copyLink: 'Copy Link',
        copied: 'Copied',
        shareHint: 'Share today\'s subject and class with friends so they can open the link, log in, and attempt the same test.',
        submitFailed: 'Could not submit your answer. Please try again.',
        typeAnswer: 'Type your answer here...',
        yourAnswer: 'Your Answer',
        modelAnswer: 'Model Answer',
      }
    : {
        title: 'ଦୈନିକ MCQ ଅଭ୍ୟାସ',
        subtitle: 'ଆଡମିନ୍ ଦ୍ୱାରା ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ଅପଲୋଡ୍ ହୋଇଥିବା ଦୈନିକ ଅଭ୍ୟାସ ପ୍ରଶ୍ନ |',
        noItems: 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପ୍ରାକ୍ଟିସ୍ ପ୍ରଶ୍ନ ପ୍ରକାଶିତ ହୋଇନାହିଁ |',
        chooseAnswer: 'ଏକ ଉତ୍ତର ଚୟନ କରି ସବମିଟ୍ କରନ୍ତୁ |',
        submit: 'ଉତ୍ତର ସବମିଟ୍ କରନ୍ତୁ',
        correct: 'ଠିକ୍ ଉତ୍ତର',
        wrong: 'ଭୁଲ ଉତ୍ତର',
        explanation: 'ବ୍ୟାଖ୍ୟା',
        todaysSet: 'ଆଜିର ଅଭ୍ୟାସ',
        previousSet: 'ସମ୍ପ୍ରତିର ଅଭ୍ୟାସ',
        forClass: 'ପାଇଁ',
        back: 'ଡ୍ୟାସବୋର୍ଡ',
        rewardLine: 'ଚେଷ୍ଟା ପାଇଁ 1 ପଏଣ୍ଟ ଏବଂ ପ୍ରତ୍ୟେକ ଠିକ୍ ଉତ୍ତର ପାଇଁ ତାହାର ମାର୍କ ଅନୁଯାୟୀ ପଏଣ୍ଟ ମିଳିବ |',
        alreadySubmitted: 'ପୂର୍ବରୁ ଚେଷ୍ଟା କରାଯାଇଛି',
        earned: 'ଅର୍ଜନ',
        score: 'ସ୍କୋର',
        submitSet: 'ଦୈନିକ ସେଟ୍ ସବମିଟ୍ କରନ୍ତୁ',
        completeAll: 'ସବମିଟ୍ ପୂର୍ବରୁ ଏହି ସେଟ୍‌ର ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ |',
        share: 'WhatsApp ରେ ଶେୟାର କରନ୍ତୁ',
        copyLink: 'ଲିଙ୍କ କପି କରନ୍ତୁ',
        copied: 'କପି ହେଲା',
        shareHint: 'ଆଜିର ବିଷୟ ଏବଂ ଶ୍ରେଣୀ ସହିତ ଏହାକୁ ଶେୟାର କରନ୍ତୁ, ଯେଉଁଠାରେ ଅନ୍ୟ ଛାତ୍ର ଲିଙ୍କ ଖୋଲି ଲଗିନ୍ କରି ସେହି ଟେଷ୍ଟ ଦେଇପାରିବେ |',
        submitFailed: 'ଆପଣଙ୍କ ଉତ୍ତର ସବମିଟ୍ ହୋଇପାରିଲା ନାହିଁ | ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |',
        typeAnswer: 'ଏଠାରେ ଆପଣଙ୍କର ଉତ୍ତର ଲେଖନ୍ତୁ...',
        yourAnswer: 'ଆପଣଙ୍କ ଉତ୍ତର',
        modelAnswer: 'ସଠିକ୍ ଉତ୍ତର',
      };

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  const sortedMcqs = useMemo(() => {
    return [...mcqs]
      .filter((mcq: any) => {
        // Map short keys to full names for backward compatibility
        const boardMap: Record<string, string> = {
          'odisha': 'Odisha State Board',
          'oav': 'OAV (Adarsha)',
          'aurobindo': 'SACIE (Aurobindo)',
          'saraswati': 'Saraswati Sishu Mandir'
        };

        const mcqBoard = String(mcq.board || 'Odisha State Board').trim();
        const userBoardRaw = String(user?.board || 'odisha').trim();
        const userBoardFull = boardMap[userBoardRaw] || userBoardRaw;

        // Check if it matches the key, the full name, or if the board is 'Odisha Board (Odia Medium)'
        return mcqBoard === userBoardFull || 
               mcqBoard === userBoardRaw || 
               mcqBoard.includes('Odisha Board') ||
               (userBoardRaw === 'odisha' && mcqBoard === 'Odisha State Board');
      })
      .sort((left, right) => new Date(right.activeDate || 0).getTime() - new Date(left.activeDate || 0).getTime());
  }, [mcqs, user?.board]);

  const submissionMap = useMemo(
    () => Object.fromEntries(submissions.map((submission) => [submission.mcqId, submission])),
    [submissions]
  );

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
    const subjectLabel = mcq.subject ? (translations[language].subjects?.[mcq.subject] || mcq.subject) : undefined;
    const classLabel = translations[language].classes?.[mcq.class] || mcq.class;
    openDailyMcqWhatsAppShare({ language, subjectLabel, classLabel });
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
    if (answers.length !== questions.length || answers.some((answer) => !answer)) {
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

    // Debug log for submission data
    console.log('Submitting Daily MCQ:', {
      submissionId: `${user.id}_${mcq.id}`,
      mcqId: mcq.id,
      userId: user.id,
      answers,
      correctCount,
      totalQuestions: questions.length,
      attemptReward: ATTEMPT_REWARD,
      correctBonus,
      totalPointsEarned,
      submittedDate: today,
      user,
      mcq,
      questions,
      progressRef: progressRef.id,
    });
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
      
      // Dynamic mobile app haptics and sound alerts on successful MCQ submission
      const allCorrect = correctCount === questions.length;
      playSuccessChime(correctCount > 0); // Play upward success major chime or warning chord
      if (allCorrect) {
        vibrate([50, 30, 100]); // Fast double vibration for 100% correct score!
      } else if (correctCount > 0) {
        vibrate(60); // Clean success pulse
      } else {
        vibrate([120, 60, 120]); // Gentle correction double pulse
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

  return (
    <motion.div
      key="daily-mcq-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <SEO 
        title={`Daily MCQ Practice 2026 | Odisha Board Latest Pattern Questions`}
        description="Master your daily MCQs and practice sets for Odisha State Board. Gundulu AI helps you learn faster with practice sets for your monthly exams."
        schemaType="FAQPage"
        faqs={mcqFaqs}
      />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-slate-400 max-w-2xl">{t.subtitle}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-amber-500/80 uppercase tracking-wider">
            <Lucide.AlertTriangle size={14} className="text-amber-500" />
            <span>AI can make mistakes. Please double-check answers.</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-all"
        >
          <Lucide.ArrowLeft size={16} />
          {t.back}
        </button>
      </div>

      {sortedMcqs.length === 0 ? (
        <div className="glass-card rounded-[2rem] border border-dashed border-white/10 p-10 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
            <Lucide.HelpCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">{t.title}</h2>
          <p className="text-slate-400 max-w-lg mx-auto">{t.noItems}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sortedMcqs.map((mcq) => {
            const submission = submissionMap[mcq.id];
            const isToday = mcq.activeDate === today;
            const isSubmitted = Boolean(submission);
            const questions = normalizeDailyMcqQuestions(mcq);
            const selectedSetAnswers = selectedAnswers[mcq.id] || [];

            return (
              <div key={mcq.id} className="glass-card neon-border rounded-[2rem] p-6 space-y-5 bg-gradient-to-br from-slate-900/80 to-slate-950/80">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${isToday ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                        {isToday ? t.todaysSet : t.previousSet}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {t.forClass} {mcq.class}
                      </span>
                      {mcq.subject && (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {translations[language].subjects?.[mcq.subject] || mcq.subject}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{mcq.title}</h2>
                    <p className="text-[11px] text-slate-400">{t.shareHint}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="inline-flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
                      <Lucide.Calendar size={14} />
                      {formatDate(mcq.activeDate)}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(mcq.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-black uppercase tracking-[0.15em] hover:bg-white/10 transition-all"
                      >
                        <Lucide.Copy size={14} />
                        {copiedMcqId === mcq.id ? t.copied : t.copyLink}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareOnWhatsApp(mcq)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-[0.15em] hover:bg-emerald-500/20 transition-all"
                      >
                        <Lucide.MessageCircle size={14} />
                        {t.share}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-black/20 border border-white/5 p-5 space-y-5">
                  <p className="text-xs text-cyan-300 flex items-center gap-2">
                    <Lucide.Coins size={14} />
                    {t.rewardLine}
                  </p>

                  <div className="space-y-5">
                    {questions.map((question, questionIndex) => (
                      <div key={`${mcq.id}-question-${questionIndex}`} className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                        <div>
                          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Question {questionIndex + 1}</p>
                          <p className="text-white text-base leading-relaxed">{cleanMathNotation(question.question)}</p>
                        </div>

                        {question.type === 'subjective' ? (
                          <div className="space-y-3 relative">
                            <textarea
                              disabled={isSubmitted}
                              placeholder={t.typeAnswer}
                              value={selectedSetAnswers[questionIndex] || ''}
                              onChange={(e) => {
                                const nextAnswers = [...selectedSetAnswers];
                                nextAnswers[questionIndex] = e.target.value;
                                setSelectedAnswers((prev) => ({ ...prev, [mcq.id]: nextAnswers }));
                              }}
                              className="w-full min-h-[100px] rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/40 focus:bg-white/10 transition-all outline-none resize-none pr-12"
                            />
                            {!isSubmitted && (
                              <div className="absolute right-4 bottom-4 flex flex-col items-center gap-3">
                                {isListening && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                    {language === 'en' ? 'Listening...' : 'ଶୁଣୁଛି...'}
                                  </motion.div>
                                )}
                                <button
                                  type="button"
                                  onMouseDown={() => startListening((text) => {
                                    setSelectedAnswers((prev) => {
                                      const currentAnswers = prev[mcq.id] || [];
                                      const nextAnswers = [...currentAnswers];
                                      nextAnswers[questionIndex] = (nextAnswers[questionIndex] || '').trim() + ' ' + text.trim();
                                      return { ...prev, [mcq.id]: nextAnswers };
                                    });
                                  })}
                                  onMouseUp={stopListening}
                                  onTouchStart={(e) => {
                                    e.preventDefault(); // Prevent ghost clicks
                                    startListening((text) => {
                                      setSelectedAnswers((prev) => {
                                        const currentAnswers = prev[mcq.id] || [];
                                        const nextAnswers = [...currentAnswers];
                                        nextAnswers[questionIndex] = (nextAnswers[questionIndex] || '').trim() + ' ' + text.trim();
                                        return { ...prev, [mcq.id]: nextAnswers };
                                      });
                                    });
                                  }}
                                  onTouchEnd={stopListening}
                                  className={`relative p-4 rounded-full transition-all ${isListening ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-white/10'}`}
                                  title="Hold to speak"
                                >
                                  {isListening && (
                                    <>
                                      <motion.div 
                                        initial={{ scale: 1, opacity: 0.5 }}
                                        animate={{ scale: 1.8, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                        className="absolute inset-0 rounded-full bg-emerald-500"
                                      />
                                      <motion.div 
                                        initial={{ scale: 1, opacity: 0.5 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                                        className="absolute inset-0 rounded-full bg-emerald-500"
                                      />
                                    </>
                                  )}
                                  <div className="relative z-10">
                                    {isListening ? <Lucide.Mic size={22} className="animate-pulse" /> : <Lucide.Mic size={22} />}
                                  </div>
                                </button>
                                <p className={`text-[8px] font-bold uppercase tracking-tighter transition-opacity ${isListening ? 'opacity-100 text-emerald-400' : 'opacity-40 text-slate-500'}`}>
                                  {language === 'en' ? 'Hold to speak' : 'ଧରି ରଖନ୍ତୁ'}
                                </p>
                              </div>
                            )}
                            {isSubmitted && (
                              <div className="space-y-3 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                                <div>
                                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400/60 mb-1">{t.yourAnswer}</p>
                                  <p className="text-sm text-slate-300">{submission?.answers?.[questionIndex]}</p>
                                </div>
                                <div className="pt-3 border-t border-white/5">
                                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400/60 mb-1">{t.modelAnswer}</p>
                                  <p className="text-sm text-emerald-100">{cleanMathNotation(question.correct_answer)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {question.options.map((option, optionIndex) => {
                              const isSelected = selectedSetAnswers[questionIndex] === option;
                              const isCorrectOption = option === question.correct_answer;
                              const isWrongSelected = submission?.answers?.[questionIndex] === option && option !== question.correct_answer;

                              let optionClasses = 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10';
                              if (isSelected) optionClasses = 'border-cyan-400/40 bg-cyan-500/10 text-white';
                              if (isSubmitted && isCorrectOption) optionClasses = 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100';
                              if (isSubmitted && isWrongSelected) optionClasses = 'border-red-500/40 bg-red-500/15 text-red-100';

                              return (
                                <button
                                  key={`${mcq.id}-${questionIndex}-${optionIndex}`}
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => {
                                    vibrate(12);
                                    const nextAnswers = [...selectedSetAnswers];
                                    nextAnswers[questionIndex] = option;
                                    setSelectedAnswers((prev) => ({ ...prev, [mcq.id]: nextAnswers }));
                                  }}
                                  className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${optionClasses} ${isSubmitted ? 'cursor-default' : ''}`}
                                >
                                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mr-3">{String.fromCharCode(65 + optionIndex)}</span>
                                  <span className="text-sm font-medium">{cleanMathNotation(option)}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {isSubmitted && question.explanation && (
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t.explanation}</p>
                            <p className="text-sm text-slate-200 leading-relaxed">{cleanMathNotation(question.explanation)}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {!submission ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t.chooseAnswer}</p>
                      <button
                        type="button"
                        onClick={() => void handleSubmit(mcq)}
                        disabled={questions.length === 0 || selectedSetAnswers.length !== questions.length || selectedSetAnswers.some((answer) => !answer) || submittingMcqId === mcq.id}
                        className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 transition-all flex items-center justify-center gap-2"
                      >
                        {submittingMcqId === mcq.id ? <Lucide.Loader2 size={16} className="animate-spin" /> : <Lucide.Coins size={16} />}
                        {t.submitSet}
                      </button>
                    </div>
                  ) : (
                    <div className={`rounded-2xl border p-4 space-y-3 ${submission.correctCount === submission.totalQuestions ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className={`flex items-center gap-2 font-bold ${submission.correctCount === submission.totalQuestions ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {submission.correctCount === submission.totalQuestions ? <Lucide.CheckCircle2 size={18} /> : <Lucide.XCircle size={18} />}
                          {t.score}: {submission.correctCount}/{submission.totalQuestions}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-black/20 text-amber-300 text-xs font-black uppercase tracking-[0.2em]">
                          <Lucide.Coins size={14} />
                          {t.earned} +{submission.totalPointsEarned}
                        </div>
                      </div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{t.alreadySubmitted}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}