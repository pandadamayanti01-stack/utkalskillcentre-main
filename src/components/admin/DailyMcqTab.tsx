import React, { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, Eye, Plus, Trash2 } from 'lucide-react';
import { db as firestore } from '../../firebase';
import { DailyMcq, DailyMcqQuestion } from '../../types';
import { translations } from '../../translations';
import { getConfiguredDailyMcqSequence, getRotatingDailyMcqSubject, getTomorrowDateString, normalizeDailyMcqQuestions } from '../../utils/dailyMcq';

// Fix for window.__API_ORIGIN__ type error
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

const defaultMcq = (subjectRotation?: string[]): DailyMcqDraft => {
  const activeDate = new Date().toISOString().split('T')[0];
  return {
    title: '',
    class: 'class5',
    subject: getRotatingDailyMcqSubject(activeDate, subjectRotation),
    activeDate,
    questions: Array.from({ length: 5 }, () => createBlankQuestion()),
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

    const isInvalid = cleanedQuestions.length !== 5 || cleanedQuestions.some((question) => !question.question || question.options.length < 2 || !question.correct_answer || !question.options.includes(question.correct_answer));
    if (isInvalid) {
      showNotification('Please complete all 5 questions and ensure each correct answer matches one option.', 'error');
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
        throw new Error(payload?.error || 'Failed to generate daily MCQ from Drive.');
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
        throw new Error(payload?.error || 'Failed to run daily auto-generation.');
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
      {/* ...existing JSX... */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sortedMcqs.map((mcq) => {
          const questions = normalizeDailyMcqQuestions(mcq);

          return (
            <div key={mcq.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
              {/* ...existing JSX... */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Fetch the full MCQ document to ensure all required fields are present
                      const mcqRef = doc(firestore, 'daily_mcqs', mcq.id);
                      const mcqSnap = await getDoc(mcqRef); // FIX: use getDoc
                      const fullData = mcqSnap?.data() || mcq;
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
                {/* ...delete button... */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
