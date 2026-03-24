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

export interface Chapter {
  id: string;
  class: string;
  board: string;
  language: string;
  subject: string;
  title: string;
  playlist_id: string;
  notes?: string;
  status?: 'draft' | 'published';
  practice_questions?: { question: string; answer: string; ai_answer?: string }[];
  quiz_questions?: { question: string; options: string[]; correct_answer: string; hint?: string }[];
  translationGroupId?: string;
}

export interface MonthlyTest {
  id: string;
  class: string;
  subject: string;
  month: string;
  year: number;
  language?: string;
  questions: { question: string; options: string[]; correct_answer: string }[];
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
  status?: 'draft' | 'published';
  created_at?: any;
}

export interface SystemSettings {
  enabledClasses?: string[];
  maintenanceMode?: boolean;
}
