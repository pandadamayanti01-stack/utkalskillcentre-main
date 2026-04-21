import React, { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc ,getDoc} from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Eye, Plus, Trash2 } from 'lucide-react';
import { db as firestore } from '../../firebase';
import { DailyMcq, DailyMcqQuestion } from '../../types';
import { translations } from '../../translations';
import { DAILY_MCQ_QUESTION_COUNT, getConfiguredDailyMcqSequence, getRotatingDailyMcqSubject, getTomorrowDateString, normalizeDailyMcqQuestions } from '../../utils/dailyMcq';

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
    const cleanedQuestions = newMcq.questions.map((question) => ({
      question: question.question.trim(),
      options: question.options.map((option) => option.trim()).filter(Boolean),
      correct_answer: question.correct_answer.trim(),
      explanation: question.explanation?.trim() || '',
    }));

    const isInvalid = cleanedQuestions.length !== DAILY_MCQ_QUESTION_COUNT || cleanedQuestions.some((question) => !question.question || question.options.length < 2 || !question.correct_answer || !question.options.includes(question.correct_answer));
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
        questions: Array.isArray(payload.questions) ? payload.questions : prev.questions,
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
        body: JSON.stringify({ activeDate: today }),
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
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-bold text-white">Daily MCQ Practice</h3>
          <p className="text-slate-400 text-sm">Create a {DAILY_MCQ_QUESTION_COUNT}-question daily set. The subject rotates automatically by date.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRunAutoGeneration}
            disabled={isRunningAutoGeneration}
            className="bg-cyan-600/80 hover:bg-cyan-500 disabled:opacity-60 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <CheckCircle2 size={18} />
            {isRunningAutoGeneration ? 'Running Auto...' : 'Run Today\'s Auto Generation'}
          </button>
          <button
            type="button"
            onClick={() => setIsCreating((prev) => !prev)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            {isCreating ? 'Close Form' : 'Add Daily Set'}
          </button>
        </div>
      </div>

      {!hasPublishedSetForToday && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-200">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-bold">Today&apos;s daily set is not published.</p>
            <p className="text-sm text-amber-100/80">Students only see today&apos;s published set. Publish one for {today} to make practice visible.</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-white font-bold">Next 7 Days Rotation</h4>
            <p className="text-slate-400 text-sm">Preview the configured subject order before publishing daily sets.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {nextSevenDaysRotation.map((item, index) => (
            <div key={item.date} className={`rounded-xl border px-4 py-3 ${index === 0 ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-white/10 bg-black/20'}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : item.date}</p>
              <p className="text-sm font-bold text-white">{translations.en.subjects?.[item.subject] || item.subject}</p>
            </div>
          ))}
        </div>
      </div>

      {isCreating && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Title</label>
              <input
                type="text"
                value={newMcq.title}
                onChange={(e) => setNewMcq((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                placeholder="Optional title, otherwise auto-generated"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Active Date</label>
              <input
                type="date"
                value={newMcq.activeDate}
                onChange={(e) => setNewMcq((prev) => ({
                  ...prev,
                  activeDate: e.target.value,
                  subject: getRotatingDailyMcqSubject(e.target.value, effectiveRotation),
                }))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class</label>
              <select
                value={newMcq.class}
                onChange={(e) => setNewMcq((prev) => ({ ...prev, class: e.target.value }))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              >
                {Array.from({ length: 10 }, (_, index) => `class${index + 1}`).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rotating Subject</label>
              <div className="w-full bg-slate-900 border border-cyan-500/20 rounded-xl px-4 py-2 text-cyan-300 font-semibold">
                {translations.en.subjects?.[newMcq.subject || 'math'] || newMcq.subject}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Rotation: {effectiveRotation.map((subject) => translations.en.subjects?.[subject] || subject).join(' -> ')}.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Generate from Google Drive textbook</p>
              <p className="text-xs text-cyan-100/80 mt-1">
                {matchingSourceTextbook
                  ? `Matched source: ${matchingSourceTextbook.title || 'Untitled textbook'}${matchingSourceTextbook.board ? ` • ${matchingSourceTextbook.board}` : ''}`
                  : 'Add a textbook with the same class and subject, using either an uploaded bucket URL or a Google Drive file/link.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateFromDrive}
              disabled={!matchingSourceTextbook || isGeneratingFromDrive}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-100 font-semibold transition-all"
            >
              {isGeneratingFromDrive ? 'Generating...' : 'Generate From Source'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-500 uppercase">Daily Questions</label>
              <span className="text-xs text-slate-500">{DAILY_MCQ_QUESTION_COUNT} questions required</span>
            </div>

            {newMcq.questions.map((question, questionIndex) => (
              <div key={questionIndex} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
                <p className="text-sm font-bold text-white">Question {questionIndex + 1}</p>
                <textarea
                  value={question.question}
                  onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none resize-none"
                  placeholder="Write the MCQ question here"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Option {optionIndex + 1}</label>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correct Answer</label>
                    <input
                      type="text"
                      value={question.correct_answer}
                      onChange={(e) => handleQuestionChange(questionIndex, 'correct_answer', e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/20 rounded-xl px-4 py-2 text-emerald-300 focus:outline-none"
                      placeholder="Must match one option exactly"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Explanation</label>
                    <input
                      type="text"
                      value={question.explanation || ''}
                      onChange={(e) => handleQuestionChange(questionIndex, 'explanation', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                      placeholder="Optional short explanation"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
            <select
              value={newMcq.status}
              onChange={(e) => setNewMcq((prev) => ({ ...prev, status: e.target.value as 'draft' | 'published' }))}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Daily Set'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-8 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sortedMcqs.map((mcq) => {
          const questions = normalizeDailyMcqQuestions(mcq);

          return (
            <div key={mcq.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="text-white font-bold text-lg">{mcq.title}</h4>
                  <p className="text-slate-400 text-sm">{mcq.class} • {translations.en.subjects?.[mcq.subject || 'math'] || mcq.subject || 'general'} • {mcq.activeDate}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${mcq.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {mcq.status}
                </span>
              </div>

              <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white font-medium leading-relaxed">{questions[0]?.question || 'No questions available'}</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-cyan-300 whitespace-nowrap">{questions.length} questions</span>
                </div>
                {mcq.source?.driveFileName && (
                  <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">Source: {mcq.source.driveFileName}</p>
                )}
                <div className="grid grid-cols-1 gap-2">
                  {questions[0]?.options?.map((option, index) => (
                    <div key={index} className={`rounded-xl px-3 py-2 text-sm border ${option === questions[0]?.correct_answer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                      {option}
                    </div>
                  ))}
                </div>
                {questions[0]?.explanation && (
                  <div className="text-sm text-slate-400 border-t border-white/5 pt-3">
                    <span className="text-slate-500 uppercase tracking-[0.2em] text-[10px] font-bold mr-2">Explanation</span>
                    {questions[0].explanation}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Fetch the full MCQ document to ensure all required fields are present
                      const mcqRef = doc(firestore, 'daily_mcqs', mcq.id);
                      const mcqSnap = await getDoc(mcqRef);
                      const fullData = mcqSnap.data()|| mcq;
                      if (!fullData) throw new Error('Could not fetch MCQ data');
                      await updateDoc(mcqRef, {
                        ...fullData,
                        status: mcq.status === 'published' ? 'draft' : 'published',
                        updatedAt: serverTimestamp(),
                      });
                      showNotification(mcq.status === 'published' ? 'Daily set moved to draft.' : 'Daily set published successfully.');
                    } catch (error) {
                      console.error('Toggle Daily MCQ Status Error:', error);
                      showNotification('Failed to update daily set status.', 'error');
                    }
                  }}
                  className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {mcq.status === 'published' ? <Eye size={14} /> : <CheckCircle2 size={14} />}
                  {mcq.status === 'published' ? 'Move to Draft' : 'Publish'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirmDeleteId !== mcq.id) {
                      setConfirmDeleteId(mcq.id);
                      return;
                    }

                    try {
                      await deleteDoc(doc(firestore, 'daily_mcqs', mcq.id));
                      setConfirmDeleteId(null);
                      showNotification('Daily set deleted successfully.');
                    } catch (error) {
                      console.error('Delete Daily MCQ Error:', error);
                      showNotification('Failed to delete daily set.', 'error');
                    }
                  }}
                  className={`px-4 text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${confirmDeleteId === mcq.id ? 'bg-red-600 text-white' : 'bg-red-600/20 hover:bg-red-600/30 text-red-400'}`}
                >
                  <Trash2 size={14} />
                  {confirmDeleteId === mcq.id ? 'Confirm Delete' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
