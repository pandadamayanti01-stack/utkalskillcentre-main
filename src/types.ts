export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  board: string;
  subjects?: string[];
  preferred_language: string;
  points: number;
  role: string;
  phoneNumber?: string;
  avatar?: string;
  streak?: number;
  lastActiveDate?: string;
  shareCount?: number;
  statusShared?: boolean;
  parent_pin?: string;
  completed_chapters?: string[];
  parentShowLeaderboard?: boolean;
  stats?: {
    streak: number;
    level: number;
    experience: number;
    accuracy: number;
    league: League;
    badges: string[];
    weeklyPoints: number;
    lastActive?: string;
  };
}

export interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string;
  hint?: string;
  chapter_id?: string;
}

export interface BilingualContent {
  en: string;
  or: string;
}

export interface VideoOption {
  url: string;
  teacherOrChannel: string;
}

export interface Chapter {
  id: string;
  textbookId?: string; // Link to Textbook
  title: string;
  class: string;
  board: string;
  subject: string;
  order: number;
  videoUrl: string; // Keep for backward compatibility
  teacherOrChannel?: string; // Keep for backward compatibility
  videos?: VideoOption[]; // New field
  notes?: string; // AI Context Source
  notesUrl?: string; // New field for document URL
  quizId?: string; // Link to Test
  status?: 'draft' | 'published';
  translationGroupId?: string;
  quiz_questions?: any[]; // Added quiz_questions
}

export interface Test {
  id: string;
  title: BilingualContent;
  chapterIds: string[]; // Link to Chapters
  questions: { question: string; options: string[]; correct_answer: string; tutor_explanation?: string }[];
  status: 'draft' | 'published';
  results_published: boolean;
  translationGroupId?: string;
}

export interface MonthlyTestSubmission {
  id: string;
  testId: string;
  userId: string;
  userName: string;
  class: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  rank?: number;
  submittedAt: any;
}

export interface Textbook {
  id: string;
  class: string;
  board: string;
  subject: string;
  title: string;
  download_url: string;
  thumbnail_url?: string;
  created_at?: any;
}

export interface SystemSettings {
  enabledClasses?: string[];
  maintenanceMode?: boolean;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
