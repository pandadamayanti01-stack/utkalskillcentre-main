import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc ,getDoc} from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Eye, FileDown, Plus, Trash2, Zap, Sparkles, Globe } from 'lucide-react';
import { db as firestore } from '../../firebase';
import { DailyMcq, DailyMcqQuestion } from '../../types';
import { translations } from '../../translations';
import { DAILY_MCQ_QUESTION_COUNT, getConfiguredDailyMcqSequence, getDailyMcqMarksForIndex, getRotatingDailyMcqSubject, getTomorrowDateString, normalizeDailyMcqQuestions, withDailyMcqMarks } from '../../utils/dailyMcq';
import { exportDailyMcqToPdf } from '../../utils/dailyMcqPdfExport';
import { cleanMathNotation } from '../DigitalLibraryView';

declare global {
  interface Window {
    __API_ORIGIN__?: string;
  }
}
interface DailyMcqTabProps {
  mcqs: DailyMcq[];
  textbooks: any[];
  subjectRotation?: string[];
  showNotification: (message: string, type?: 'success' | 'error') => void;
}

type DailyMcqDraft = Omit<DailyMcq, 'id' | 'createdAt' | 'updatedAt'> & {
  questions: DailyMcqQuestion[];
};

const createBlankQuestion = (): DailyMcqQuestion => ({
  question: '',
  options: ['', '', '', ''],
  correct_answer: '',
  explanation: '',
  marks: 1,
});

async function readJsonResponse(response: Response) {
  const responseText = await response.text();
  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return { error: responseText };
  }
}

function apiFailureMessage(payload: Record<string, unknown> | null | undefined, fallback: string): string {
  const msg = (typeof payload?.error === 'string' && payload.error.trim()) || fallback;
  const hint = typeof payload?.hint === 'string' && payload.hint.trim() ? payload.hint.trim() : '';
  return hint ? `${msg} — ${hint}` : msg;
}

const defaultMcq = (subjectRotation?: string[]): DailyMcqDraft => {
  const activeDate = new Date().toISOString().split('T')[0];
  return {
    title: '',
    class: 'class5',
    subject: getRotatingDailyMcqSubject(activeDate, subjectRotation),
    activeDate,
    questions: Array.from({ length: DAILY_MCQ_QUESTION_COUNT }, () => createBlankQuestion()),
    status: 'draft',
    board: 'Odisha State Board',
  };
};

export function DailyMcqTab({ mcqs, textbooks, subjectRotation, showNotification }: DailyMcqTabProps) {
  const effectiveRotation = useMemo(() => getConfiguredDailyMcqSequence(subjectRotation), [subjectRotation]);
  const [isCreating, setIsCreating] = useState(false);
  const [newMcq, setNewMcq] = useState<DailyMcqDraft>(defaultMcq(effectiveRotation));
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingFromDrive, setIsGeneratingFromDrive] = useState(false);
  const [isRunningAutoGeneration, setIsRunningAutoGeneration] = useState(false);
  const [autoGenClass, setAutoGenClass] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const sortedMcqs = useMemo(
    () => [...mcqs].sort((left, right) => new Date(right.activeDate || 0).getTime() - new Date(left.activeDate || 0).getTime()),
    [mcqs]
  );

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const hasPublishedSetForToday = useMemo(
    () => sortedMcqs.some((mcq) => mcq.activeDate === today && mcq.status === 'published'),
    [sortedMcqs, today]
  );

  const nextSevenDaysRotation = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      const dateString = date.toISOString().split('T')[0];
      const subject = getRotatingDailyMcqSubject(dateString, effectiveRotation);
      return { date: dateString, subject };
    });
  }, [effectiveRotation, today]);

  const matchingSourceTextbook = useMemo(() => {
    return textbooks.find((book) => {
      const bookClass = String(book.class || '').toLowerCase();
      const bookSubject = String(book.subject || '').toLowerCase();
      return bookClass === String(newMcq.class || '').toLowerCase()
        && bookSubject === String(newMcq.subject || '').toLowerCase()
        && (book.download_url || book.driveFileId || book.driveUrl);
    });
  }, [newMcq.class, newMcq.subject, textbooks]);

  const resetForm = () => {
    setNewMcq(defaultMcq(effectiveRotation));
    setIsCreating(false);
  };

  const handleQuestionChange = (questionIndex: number, field: keyof DailyMcqQuestion, value: string) => {
    const nextQuestions = [...newMcq.questions];
    nextQuestions[questionIndex] = {
      ...nextQuestions[questionIndex],
      [field]: value,
    };
    setNewMcq((prev) => ({ ...prev, questions: nextQuestions }));
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const nextQuestions = [...newMcq.questions];
    const nextOptions = [...nextQuestions[questionIndex].options];
    nextOptions[optionIndex] = value;
    nextQuestions[questionIndex] = {
      ...nextQuestions[questionIndex],
      options: nextOptions,
    };
    setNewMcq((prev) => ({ ...prev, questions: nextQuestions }));
  };

  const handleSave = async () => {
    const cleanedQuestions = newMcq.questions.map((question, index) => {
      const marks = getDailyMcqMarksForIndex(index);
      const isSubjective = marks > 1;
      
      return {
        question: question.question.trim(),
        options: isSubjective ? [] : question.options.map((option) => option.trim()).filter(Boolean),
        correct_answer: question.correct_answer.trim(),
        explanation: question.explanation?.trim() || '',
        marks,
        type: isSubjective ? 'subjective' : 'mcq',
      };
    });

    const isInvalid = cleanedQuestions.length !== DAILY_MCQ_QUESTION_COUNT || cleanedQuestions.some((question) => {
      if (!question.question || !question.correct_answer) return true;
      if (question.type === 'mcq') {
        return question.options.length < 2 || !question.options.includes(question.correct_answer);
      }
      return false;
    });
    if (isInvalid) {
      showNotification(`Please complete all ${DAILY_MCQ_QUESTION_COUNT} questions and ensure each correct answer matches one option.`, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const subject = getRotatingDailyMcqSubject(newMcq.activeDate, effectiveRotation);
      const subjectLabel = translations.en.subjects?.[subject] || subject;
      await addDoc(collection(firestore, 'daily_mcqs'), {
        title: newMcq.title.trim() || `${subjectLabel} Daily Practice`,
        class: newMcq.class,
        board: newMcq.board || 'Odisha State Board',
        subject,
        activeDate: newMcq.activeDate,
        questions: cleanedQuestions,
        status: newMcq.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showNotification('Daily MCQ set saved successfully.');
      resetForm();
    } catch (error) {
      console.error('Save Daily MCQ Error:', error);
      showNotification('Failed to save daily MCQ set.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateFromDrive = async () => {
    if (!matchingSourceTextbook) {
      showNotification('No textbook source matches this class and subject yet.', 'error');
      return;
    }

    setIsGeneratingFromDrive(true);
    try {
      // Use full backend URL in production, relative in development
      const apiBase = process.env.NODE_ENV === 'production'
        ? (window.__API_ORIGIN__ || window.location.origin)
        : '';
      const response = await fetch(apiBase + '/api/admin/daily-mcqs/generate-from-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className: newMcq.class,
          subject: newMcq.subject,
          activeDate: newMcq.activeDate,
          board: matchingSourceTextbook.board || undefined,
          title: newMcq.title || undefined,
          status: newMcq.status,
          difficulty: difficulty
        }),
      });

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(apiFailureMessage(payload as Record<string, unknown>, 'Failed to generate daily MCQ from Drive.'));
      }

      setNewMcq((prev) => ({
        ...prev,
        title: payload.title || prev.title,
        subject: payload.subject || prev.subject,
        questions: Array.isArray(payload.questions) ? withDailyMcqMarks(payload.questions) : prev.questions,
      }));
      showNotification(`Daily MCQ generated from ${payload?.source?.driveFileName || payload?.source?.textbookTitle || 'textbook source'}.`);
    } catch (error: any) {
      console.error('Generate Daily MCQ From Drive Error:', error);
      showNotification(error?.message || 'Failed to generate daily MCQ from Drive.', 'error');
    } finally {
      setIsGeneratingFromDrive(false);
    }
  };

  const handleRunAutoGeneration = async () => {
    setIsRunningAutoGeneration(true);
    try {
      // Use full backend URL in production, relative in development
      const apiBase2 = process.env.NODE_ENV === 'production'
        ? (window.__API_ORIGIN__ || window.location.origin)
        : '';
      const response = await fetch(apiBase2 + '/api/admin/daily-mcqs/run-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activeDate: today, className: autoGenClass === 'all' ? undefined : autoGenClass }),
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(apiFailureMessage(payload as Record<string, unknown>, 'Failed to run daily auto-generation.'));
      }

      const generatedCount = Array.isArray(payload.generated) ? payload.generated.length : 0;
      const skippedCount = Array.isArray(payload.skipped) ? payload.skipped.length : 0;
      showNotification(`Auto-generation completed for ${generatedCount} classes${skippedCount ? `, skipped ${skippedCount}` : ''}.`);
    } catch (error: any) {
      console.error('Run Daily MCQ Auto Generation Error:', error);
      showNotification(error?.message || 'Failed to run daily auto-generation.', 'error');
    } finally {
      setIsRunningAutoGeneration(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-cyan-500 rounded-full shadow-[0_0_10px_#06b6d4]"></div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">Daily Challenge Engine</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Orchestrating {DAILY_MCQ_QUESTION_COUNT} daily knowledge trials</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <select
              value={autoGenClass}
              onChange={(e) => setAutoGenClass(e.target.value)}
              className="bg-black/40 border border-cyan-500/20 text-cyan-400 rounded-xl px-4 py-2 font-bold text-[10px] uppercase tracking-widest focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Classes</option>
              {Array.from({ length: 10 }, (_, index) => `class${index + 1}`).map((value) => (
                <option key={value} value={value}>{value.toUpperCase()}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRunAutoGeneration}
              disabled={isRunningAutoGeneration}
              className="px-6 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              {isRunningAutoGeneration ? 'Automated Pulse Active...' : autoGenClass === 'all' ? 'Trigger Global Auto-Pulse' : 'Trigger Auto-Pulse'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating((prev) => !prev)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            {isCreating ? <Trash2 size={16} /> : <Plus size={16} />}
            {isCreating ? 'Discard Draft' : 'Construct New Trial'}
          </button>
        </div>
      </div>

      {!hasPublishedSetForToday && (
        <div className="glass-card border-amber-500/20 bg-amber-500/5 p-6 rounded-[2rem] flex items-center gap-4 text-amber-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="font-black tracking-tight text-lg leading-none">Visibility Gap Detected</p>
            <p className="text-[10px] text-amber-200/60 font-bold uppercase tracking-widest mt-1">No published challenge exists for {today}. Students are currently in visual blackout.</p>
          </div>
        </div>
      )}

      <div className="glass-card p-8 rounded-[2.5rem] border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-xl text-slate-400">
              <Eye size={20} />
            </div>
            <h4 className="text-xl font-black text-white tracking-tight">Temporal Rotation Preview</h4>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">7-Day Horizon</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {nextSevenDaysRotation.map((item, index) => (
            <div key={item.date} className={`rounded-[2rem] border px-6 py-5 transition-all group ${index === 0 ? 'border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.05)]' : 'border-white/5 bg-black/20 hover:border-white/10'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3 group-hover:text-cyan-500 transition-colors">{index === 0 ? 'Active Now' : index === 1 ? 'Next Pulse' : item.date}</p>
              <p className="text-md font-black text-white tracking-tight leading-none group-hover:translate-x-1 transition-transform">{translations.en.subjects?.[item.subject] || item.subject}</p>
            </div>
          ))}
        </div>
      </div>

      {isCreating && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 rounded-[3rem] relative overflow-hidden border-emerald-500/20">
          <div className="absolute top-0 right-0 p-10 opacity-5">
            <Zap size={150} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Trial Designation</label>
              <input
                type="text"
                value={newMcq.title}
                onChange={(e) => setNewMcq((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-bold text-lg tracking-tight"
                placeholder="Leave blank for Neural Auto-Naming"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Target Activation Date</label>
              <input
                type="date"
                value={newMcq.activeDate}
                onChange={(e) => setNewMcq((prev) => ({
                  ...prev,
                  activeDate: e.target.value,
                  subject: getRotatingDailyMcqSubject(e.target.value, effectiveRotation),
                }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-bold tracking-widest"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Academic Tier</label>
              <select
                value={newMcq.class}
                onChange={(e) => setNewMcq((prev) => ({ ...prev, class: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-black uppercase tracking-widest cursor-pointer"
              >
                {Array.from({ length: 10 }, (_, index) => `class${index + 1}`).map((value) => (
                  <option key={value} value={value} className="bg-slate-900">{value.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Governance Board</label>
              <select
                value={newMcq.board}
                onChange={(e) => setNewMcq((prev) => ({ ...prev, board: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-black uppercase tracking-widest cursor-pointer"
              >
                <option value="odisha" className="bg-slate-900">BSE / CHSE ODISHA</option>
                <option value="aurobindo" className="bg-slate-900">SACIE (AUROBINDO)</option>
                <option value="oav" className="bg-slate-900">OAV (ADARSHA)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Neural Synced Subject</label>
              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-6 py-4 text-emerald-400 font-black text-lg tracking-tight flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                {translations.en.subjects?.[newMcq.subject || 'math'] || newMcq.subject}
              </div>
            </div>
          </div>

          <div className="mt-12 p-8 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/20 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 border border-cyan-500/30">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-xl font-black text-white tracking-tight">Neural Ingestion Engine</p>
                <p className="text-[10px] text-cyan-500/60 font-bold uppercase tracking-widest mt-1">Generate questions from Cloud Repository</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="flex-1 lg:flex-none">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full lg:w-32 bg-black/40 border border-white/10 rounded-2xl px-6 py-3 text-white focus:outline-none focus:border-cyan-500/30 font-black uppercase text-[10px] tracking-widest"
                >
                  <option value="easy" className="bg-slate-900">Easy</option>
                  <option value="medium" className="bg-slate-900">Medium</option>
                  <option value="hard" className="bg-slate-900">Hard</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleGenerateFromDrive}
                disabled={!matchingSourceTextbook || isGeneratingFromDrive}
                className="flex-1 lg:flex-none px-10 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-cyan-900/20"
              >
                {isGeneratingFromDrive ? 'Synthesizing...' : 'Commence Generation'}
              </button>
            </div>
          </div>

          <div className="mt-12 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h5 className="text-xl font-black text-white tracking-tighter uppercase">Trial Data Matrix</h5>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{DAILY_MCQ_QUESTION_COUNT} Nodes Required</span>
            </div>

            {newMcq.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="glass-card bg-black/20 border-white/5 p-8 rounded-[2.5rem] space-y-6 group/node hover:border-emerald-500/20 transition-all duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-emerald-400 group-hover/node:scale-110 transition-transform">
                      {questionIndex + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white tracking-tight uppercase">Knowledge Node</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{getDailyMcqMarksForIndex(questionIndex)} Quantum Points</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getDailyMcqMarksForIndex(questionIndex) === 1 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]'}`}></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{getDailyMcqMarksForIndex(questionIndex) === 1 ? 'Standard Node' : 'Extended Node'}</span>
                  </div>
                </div>

                <textarea
                  value={question.question}
                  onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                  rows={3}
                  className="w-full bg-black/40 border border-white/5 rounded-3xl px-8 py-6 text-white focus:outline-none focus:border-emerald-500/20 transition-all resize-none font-medium leading-relaxed"
                  placeholder="Input Node Question Data..."
                />

                {getDailyMcqMarksForIndex(questionIndex) === 1 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="relative group/option">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 group-focus-within/option:text-emerald-500 transition-colors uppercase tracking-widest">{String.fromCharCode(65 + optionIndex)}</span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                          className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white focus:outline-none focus:border-emerald-500/20 transition-all text-sm font-medium"
                          placeholder={`Option ${optionIndex + 1} Value`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl border border-dashed border-cyan-500/20 bg-cyan-500/5 text-center">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-2">Extended Cognitive Response</p>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">This node triggers an open-text response channel. Options are disabled for this mark weight.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                      {getDailyMcqMarksForIndex(questionIndex) === 1 ? 'Master Key' : 'Reference Model Answer'}
                    </label>
                    <input
                      type="text"
                      value={question.correct_answer}
                      onChange={(e) => handleQuestionChange(questionIndex, 'correct_answer', e.target.value)}
                      className={`w-full bg-black/40 border rounded-2xl px-6 py-4 text-sm font-black focus:outline-none transition-all ${getDailyMcqMarksForIndex(questionIndex) === 1 ? 'border-emerald-500/20 text-emerald-400 focus:border-emerald-500' : 'border-cyan-500/20 text-cyan-400 focus:border-cyan-500'}`}
                      placeholder={getDailyMcqMarksForIndex(questionIndex) === 1 ? 'Exact Match Required' : 'Input Cognitive Reference Target'}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Supplemental Explanation</label>
                    <input
                      type="text"
                      value={question.explanation || ''}
                      onChange={(e) => handleQuestionChange(questionIndex, 'explanation', e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/20 transition-all text-sm font-medium"
                      placeholder="Optional logic breakdown..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 space-y-6 pt-12 border-t border-white/5">
            <div className="max-w-xs mx-auto">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-4">Deployment Visibility</label>
              <select
                value={newMcq.status}
                onChange={(e) => setNewMcq((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-8 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-black uppercase tracking-[0.3em] text-center cursor-pointer transition-all"
              >
                <option value="draft" className="bg-slate-900">Encrypted Draft</option>
                <option value="published" className="bg-slate-900">Live Deployment</option>
              </select>
            </div>

            <div className="flex flex-col md:flex-row gap-6 pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] text-white rounded-[2rem] py-6 font-black text-[12px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-emerald-900/40 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Synchronizing Node Matrix...' : 'Commence Trial Deployment'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/5"
              >
                Discard Trial
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-8">
        {sortedMcqs.map((mcq, i) => {
          const questions = normalizeDailyMcqQuestions(mcq);

          return (
            <motion.div 
              key={mcq.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-8 rounded-[2.5rem] border-white/5 group hover:border-cyan-500/30 transition-all duration-500 space-y-6"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-white tracking-tight group-hover:text-cyan-400 transition-colors">{mcq.title}</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mcq.class}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{translations.en.subjects?.[mcq.subject || 'math'] || mcq.subject || 'general'}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mcq.activeDate}</span>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg ${
                  mcq.status === 'published' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {mcq.status}
                </span>
              </div>               <div className="glass-card bg-black/40 border-white/5 rounded-3xl p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-white font-medium leading-relaxed italic">"{cleanMathNotation(questions[0]?.question || 'Node data corrupted or empty')}"</p>
                  <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-black text-cyan-400 uppercase tracking-widest whitespace-nowrap">
                    {questions.length} Matrix Nodes
                  </div>
                </div>
                
                {mcq.source?.driveFileName && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/5 rounded-full border border-cyan-500/10 w-fit">
                    <Globe size={10} className="text-cyan-500" />
                    <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest">Ingested from: {mcq.source.driveFileName}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {questions[0]?.options?.map((option, index) => (
                    <div key={index} className={`rounded-2xl px-5 py-3 text-sm font-medium border flex items-center gap-4 transition-all ${
                      option === questions[0]?.correct_answer 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                      : 'border-white/5 bg-white/5 text-slate-400'
                    }`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${option === questions[0]?.correct_answer ? 'text-emerald-500' : 'text-slate-600'}`}>{String.fromCharCode(65 + index)}</span>
                      {cleanMathNotation(option)}
                    </div>
                  ))}
                </div>
                
                {questions[0]?.explanation && (
                  <div className="pt-4 border-t border-white/5 flex gap-4">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest pt-1">Logic</div>
                    <div className="text-xs text-slate-500 leading-relaxed font-medium italic">{cleanMathNotation(questions[0].explanation)}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const mcqRef = doc(firestore, 'daily_mcqs', mcq.id);
                      const mcqSnap = await getDoc(mcqRef);
                      const fullData = mcqSnap.data()|| mcq;
                      await updateDoc(mcqRef, {
                        ...fullData,
                        status: mcq.status === 'published' ? 'draft' : 'published',
                        updatedAt: serverTimestamp(),
                      });
                      showNotification(mcq.status === 'published' ? 'Challenge encrypted (moved to draft).' : 'Challenge broadcasted successfully.');
                    } catch (error) {
                      console.error('Status Toggle Error:', error);
                      showNotification('Failed to toggle visibility.', 'error');
                    }
                  }}
                  className="flex-[2] py-4 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95"
                >
                  {mcq.status === 'published' ? <Eye size={16} /> : <CheckCircle2 size={16} />}
                  {mcq.status === 'published' ? 'Deactivate Node' : 'Activate Node'}
                </button>
                <button
                  type="button"
                  onClick={() => exportDailyMcqToPdf(mcq)}
                  className="w-14 h-14 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95"
                  title="Export Knowledge PDF"
                >
                  <FileDown size={20} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirmDeleteId !== mcq.id) {
                      setConfirmDeleteId(mcq.id);
                      setTimeout(() => setConfirmDeleteId(null), 5000);
                      return;
                    }

                    try {
                      await deleteDoc(doc(firestore, 'daily_mcqs', mcq.id));
                      setConfirmDeleteId(null);
                      showNotification('Node purged from temporal stream.');
                    } catch (error) {
                      console.error('Purge Error:', error);
                      showNotification('Purge execution failed.', 'error');
                    }
                  }}
                  className={`flex-1 h-14 rounded-2xl transition-all border flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest active:scale-95 ${confirmDeleteId === mcq.id ? 'bg-red-600 text-white border-red-400' : 'bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border-red-500/20'}`}
                >
                  <Trash2 size={18} />
                  {confirmDeleteId === mcq.id ? 'Confirm' : ''}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
