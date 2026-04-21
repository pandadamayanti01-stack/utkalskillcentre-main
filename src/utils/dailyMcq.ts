import { DailyMcq, DailyMcqQuestion } from '../types';

/** Questions per daily MCQ set (kept in sync with Firestore rules + automation). */
export const DAILY_MCQ_QUESTION_COUNT = 5;

/** Never use `slice(0, MAYBE_UNDEFINED)` — that keeps the whole array. */
export function capDailyMcqQuestionList<T>(questions: T[]): T[] {
  const max =
    typeof DAILY_MCQ_QUESTION_COUNT === 'number' && DAILY_MCQ_QUESTION_COUNT > 0
      ? DAILY_MCQ_QUESTION_COUNT
      : 5;
  return questions.slice(0, max);
}

export const DAILY_MCQ_SUBJECT_SEQUENCE = ['math', 'english', 'science', 'odia', 'social'] as const;

export type DailyMcqSubject = (typeof DAILY_MCQ_SUBJECT_SEQUENCE)[number];

export function getConfiguredDailyMcqSequence(sequence?: string[] | null): string[] {
  if (!Array.isArray(sequence)) {
    return [...DAILY_MCQ_SUBJECT_SEQUENCE];
  }

  const normalized = sequence
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : [...DAILY_MCQ_SUBJECT_SEQUENCE];
}

export function getRotatingDailyMcqSubject(dateString: string, sequence?: string[] | null): string {
  const parsed = new Date(dateString);
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const effectiveSequence = getConfiguredDailyMcqSequence(sequence);
  const dayNumber = Math.floor(Date.UTC(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate()) / 86400000);
  return effectiveSequence[((dayNumber % effectiveSequence.length) + effectiveSequence.length) % effectiveSequence.length];
}

export function getTomorrowDateString(dateString?: string): string {
  const parsed = dateString ? new Date(dateString) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  safeDate.setDate(safeDate.getDate() + 1);
  return safeDate.toISOString().split('T')[0];
}

export function normalizeDailyMcqQuestions(mcq: DailyMcq): DailyMcqQuestion[] {
  if (Array.isArray(mcq.questions) && mcq.questions.length > 0) {
    return mcq.questions;
  }

  if (mcq.question && Array.isArray(mcq.options) && mcq.correct_answer) {
    return [
      {
        question: mcq.question,
        options: mcq.options,
        correct_answer: mcq.correct_answer,
        explanation: mcq.explanation,
      },
    ];
  }

  return [];
}