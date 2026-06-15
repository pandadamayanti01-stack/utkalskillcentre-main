// Helper: Split textbook text into chapters using regex
function splitTextIntoChapters(text: string): { title: string, content: string }[] {
  const chapterRegex = /(chapter\s*\d+|ch\.?\s*\d+|lesson\s*\d+|unit\s*\d+)/gi;
  const matches = [...text.matchAll(chapterRegex)];
  if (matches.length === 0) {
    // If no chapters found, treat whole text as one chapter
    return [{ title: 'Full Text', content: text }];
  }
  const chapters = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    const title = matches[i][0];
    const content = text.slice(start, end).trim();
    chapters.push({ title, content });
  }
  return chapters;
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import webpush from 'web-push';
import type { Express } from 'express';
import { App, getApp as getAdminApp, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { google } from 'googleapis';

// Use the modern PDFParse class from the new pdf-parse package
import { PDFParse } from 'pdf-parse';

// Language detection helpers
function detectOdia(text: string) {
  // Odia Unicode range: \u0B00-\u0B7F
  return /[\u0B00-\u0B7F]/.test(text);
}
function detectHindi(text: string) {
  // Devanagari Unicode range: \u0900-\u097F
  return /[\u0900-\u097F]/.test(text);
}
function detectSanskrit(text: string) {
  // Sanskrit is also Devanagari, but we can treat like Hindi for now
  return detectHindi(text);
}
function detectEnglish(text: string) {
  // Basic: contains mostly a-zA-Z and common punctuation
  return /^[\x00-\x7F\s.,'"!?;:()\-]+$/.test(text);
}

function getExpectedLanguage(subject: string): 'odia' | 'english' | 'hindi' | 'sanskrit' | null {
  const s = subject.toLowerCase();
  if (s.includes('odia')) return 'odia';
  if (s.includes('english')) return 'english';
  if (s.includes('hindi')) return 'hindi';
  if (s.includes('sanskrit')) return 'sanskrit';
  return null;
}



async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}
import { capDailyMcqQuestionList, DAILY_MCQ_QUESTION_COUNT, getDailyMcqMarksForIndex, getRotatingDailyMcqSubject } from '../utils/dailyMcq.js';
import { translations } from '../translations.js';
import { createGoogleAuth } from './googleCredentials.js';
import { generateMcqsWithGemini } from '../utils/geminiMcqGenerator.js';
import {
  ROADMAP_DATA_1,
  ROADMAP_DATA_2,
  ROADMAP_DATA_3,
  ROADMAP_DATA_4,
  ROADMAP_DATA_5,
  ROADMAP_DATA_6,
  ROADMAP_DATA_7,
  ROADMAP_DATA_8,
  ROADMAP_DATA_9,
  ROADMAP_DATA_10
} from '../data/roadmapData.js';

const DEFAULT_AUTOMATION_TIME = '07:00';
const DEFAULT_AUTOMATION_TIME_ZONE = 'Asia/Kolkata';
const DEFAULT_AUTOMATION_STATUS = 'published';
const MAX_SOURCE_TEXT_LENGTH = 100000; // Increased to ~80-100 pages to bypass long prefaces
const DEFAULT_ENABLED_CLASSES = Array.from({ length: 10 }, (_, index) => `class${index + 1}`);

type DailyMcqQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  marks?: number;
};

type AutomationSettings = {
  enabledClasses?: string[];
  dailyMcqSubjectRotation?: string[];
  dailyMcqAutomationEnabled?: boolean;
  dailyMcqAutomationTime?: string;
  dailyMcqAutomationTimeZone?: string;
  dailyMcqAutomationPublishMode?: 'draft' | 'published';
};

type TextbookSource = {
  id: string;
  title?: string;
  class: string;
  subject: string;
  board?: string;
  download_url?: string;
  driveFileId?: string;
  driveUrl?: string;
};

type GeneratedDailyMcqResult = {
  title: string;
  class: string;
  subject: string;
  board: string;
  activeDate: string;
  status: 'draft' | 'published';
  month?: string;
  questions: DailyMcqQuestion[];
  source: {
    textbookId: string;
    textbookTitle?: string;
    driveFileId?: string;
    sourceUrl?: string;
    driveFileName?: string;
    mimeType?: string;
  };
};

type DriveContentResult = {
  text: string;
  fileName: string;
  mimeType: string;
  buffer?: Buffer;
};

function getDatabase(adminApp: App, databaseId: string) {
  return getAdminFirestore(adminApp, databaseId);
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  return new GoogleGenerativeAI(apiKey);
}

function getDriveAuth() {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\n/g, '\n');

  if (clientEmail && privateKey) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  }

  return createGoogleAuth(['https://www.googleapis.com/auth/drive.readonly']);
}

function extractDriveFileId(input?: string) {
  const rawValue = String(input || '').trim();
  if (!rawValue) {
    return '';
  }

  const directMatch = rawValue.match(/^[a-zA-Z0-9_-]{20,}$/);
  if (directMatch) {
    return directMatch[0];
  }

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /folders\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = rawValue.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return rawValue;
}

function getSubjectLabel(subject: string) {
  return translations.en.subjects?.[subject] || subject.replace(/_/g, ' ');
}

function normalizeSubjectKey(input?: string) {
  const rawValue = String(input || '').trim().toLowerCase();
  if (!rawValue) {
    return '';
  }

  const normalizedValue = rawValue.replace(/[()]/g, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
  const subjectEntries = Object.entries(translations.en.subjects || {});
  const directMatch = subjectEntries.find(([subjectKey]) => subjectKey.toLowerCase() === normalizedValue);
  if (directMatch) {
    return directMatch[0];
  }

  const labelMatch = subjectEntries.find(([, subjectLabel]) => {
    const normalizedLabel = String(subjectLabel || '').toLowerCase().replace(/[()]/g, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
    return normalizedLabel === normalizedValue;
  });
  if (labelMatch) {
    return labelMatch[0];
  }

  return normalizedValue.replace(/\s+/g, '_');
}

function getClassLabel(className: string) {
  return translations.en.classes?.[className] || className;
}

async function loadDriveTextContent(fileId: string) {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType',
    supportsAllDrives: true,
  });

  const mimeType = fileMetadata.data.mimeType || 'application/octet-stream';
  const fileName = fileMetadata.data.name || fileId;

  if (mimeType === 'application/vnd.google-apps.folder') {
    throw new Error(`FOLDER:${fileId}`);
  }

  if (mimeType === 'application/vnd.google-apps.document') {
    const exportResponse = await drive.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(exportResponse.data as ArrayBuffer);
    return {
      text: buffer.toString('utf8'),
      fileName,
      mimeType,
      buffer,
    };
  }

  const fileResponse = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  const fileBuffer = Buffer.from(fileResponse.data as ArrayBuffer);

  if (mimeType === 'application/pdf') {
    return {
      text: '', // Skip extraction, we'll use vision
      fileName,
      mimeType,
      buffer: fileBuffer,
    };
  }

  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('xml')) {
    return {
      text: fileBuffer.toString('utf8'),
      fileName,
      mimeType,
      buffer: fileBuffer,
    };
  }

  throw new Error(`Unsupported Google Drive file type for auto-generation: ${mimeType}`);
}

function inferMimeTypeFromUrl(url: string, headerValue?: string | null) {
  const headerMime = String(headerValue || '').split(';')[0].trim().toLowerCase();
  if (headerMime && headerMime !== 'application/octet-stream') {
    return headerMime;
  }

  const normalizedUrl = String(url || '').toLowerCase();
  if (normalizedUrl.includes('.pdf')) return 'application/pdf';
  if (normalizedUrl.includes('.txt')) return 'text/plain';
  if (normalizedUrl.includes('.json')) return 'application/json';
  if (normalizedUrl.includes('.csv')) return 'text/csv';
  return headerMime || 'application/octet-stream';
}

function getFileNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] || 'textbook');
  } catch {
    return 'textbook';
  }
}

async function loadUrlTextContent(url: string): Promise<DriveContentResult> {
  // Handle Google Drive links by converting them to direct download links
  let downloadUrl = url;
  if (url.includes('drive.google.com')) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      // Use the direct download endpoint (may require file to be public or API key)
      downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
    }
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch textbook source URL (${response.status}).`);
  }

  const mimeType = inferMimeTypeFromUrl(url, response.headers.get('content-type'));
  const fileName = getFileNameFromUrl(url);

  if (mimeType === 'application/pdf') {
    const arrayBuffer = await response.arrayBuffer();
    return {
      text: await extractPdfText(Buffer.from(arrayBuffer)),
      fileName,
      mimeType,
    };
  }

  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('xml')) {
    return {
      text: await response.text(),
      fileName,
      mimeType,
    };
  }

  throw new Error(`Unsupported textbook URL content type for auto-generation: ${mimeType}`);
}

const TEXTBOOK_BUCKET_NAME = 'utkalskillcentre.firebasestorage.app';

import { SUBJECT_FILE_KEYWORDS } from '../constants.js';

function getSubjectFolderNames(subject: string): string[] {
  const s = subject.toLowerCase().trim();
  const list = [subject];
  
  const capitalized = s.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('_');
  const readable = s.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  const uppercase = s.toUpperCase();
  const lowercase = s.toLowerCase();
  
  list.push(capitalized, readable, uppercase, lowercase);

  if (s === 'math' || s === 'mathematics') {
    list.push('Mathematics', 'mathematics', 'Maths', 'maths', 'Math', 'math', 'Algebra', 'Geometry');
  }
  if (s === 'science') {
    list.push('Science', 'science', 'Physical_science', 'Life_science', 'Physical science', 'Life science', 'Science_curiosity', 'Science Curiosity');
  }
  if (s === 'social_science' || s === 'social') {
    list.push('Social_science', 'Social science', 'Social Science', 'History', 'Geography', 'Social Studies', 'Social_studies');
  }
  if (s === 'physical_education' || s === 'physical') {
    list.push('Physical_education', 'Physical education', 'Physical Education', 'Physical', 'physical');
  }
  if (s === 'vocational') {
    list.push('Vocational', 'vocational');
  }

  return Array.from(new Set(list.filter(Boolean)));
}

async function loadTextbookFromBucket(adminApp: App, className: string, subject: string, chapterTitle?: string): Promise<{ driveContent: DriveContentResult; source: GeneratedDailyMcqResult['source'] } | null> {
  const classDigit = className.replace(/[^0-9]/g, '');
  // Try both Class X and Class_X folder patterns inside chapterwise and Chapter Wise Text Book directories
  const possibleClassFolders = [
    `chapterwise/Class ${classDigit}/`,
    `chapterwise/Class_${classDigit}/`,
    `Chapterwise/Class ${classDigit}/`,
    `Chapterwise/Class_${classDigit}/`,
    `Chapter Wise Text Book/Class ${classDigit}/`,
    `Chapter Wise Text Book/Class_${classDigit}/`
  ];
  
  const subjectKey = normalizeSubjectKey(subject);
  const keywords = SUBJECT_FILE_KEYWORDS[subjectKey] || [subjectKey.replace(/_/g, ' '), subjectKey.replace(/_/g, '')];

  let chNum: number | null = null;
  if (chapterTitle) {
    const match = chapterTitle.match(/(?:chapter|ch\.?|lesson|unit)\s*(\d+)/i);
    if (match) chNum = parseInt(match[1]);
  }

  try {
    const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
    let bestFile = null;
    let bestFileName = '';
    
    // Build possible folder patterns based on your bucket structure
    const folderSearchPatterns = [];
    const folderCandidates = getSubjectFolderNames(subject);
    for (const classFolder of possibleClassFolders) {
      for (const folderCandidate of folderCandidates) {
        folderSearchPatterns.push(`${classFolder}${folderCandidate}/`);
      }
    }

    for (const prefix of folderSearchPatterns) {
      console.log(`[Bucket Search] Checking prefix: ${prefix}`);
      const [files] = await bucket.getFiles({ prefix, maxResults: 50 });
      const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfFiles.length === 0) continue;

      // If we have a chapter number, try to find the specific chapter PDF file
      if (chNum !== null) {
        const chPatterns = [
          `chapter ${chNum}`,
          `chapter_${chNum}`,
          `chapter ${String(chNum).padStart(2, '0')}`,
          `chapter_${String(chNum).padStart(2, '0')}`,
          `ch${String(chNum).padStart(2, '0')}`,
          `ch${chNum}`,
          `ch_${String(chNum).padStart(2, '0')}`,
          `ch_${chNum}`
        ];
        
        const matched = pdfFiles.find(f => {
          const lowerName = f.name.toLowerCase();
          return chPatterns.some(p => lowerName.includes(p));
        });
        
        if (matched) {
          bestFile = matched;
          bestFileName = matched.name;
          console.log(`[Bucket Search] Found chapter-specific file: ${bestFileName}`);
          break;
        }
      }

      // Fallback: search using subject keywords and match score
      let bestScore = 0;
      for (const f of pdfFiles) {
        const lower = f.name.toLowerCase().replace(/[_\s]+/g, '');
        let score = 0;
        for (const kw of keywords) {
          const normKw = kw.toLowerCase().replace(/[_\s]+/g, '');
          if (lower.includes(normKw)) score += normKw.length;
        }

        if (score > bestScore) {
          bestScore = score;
          bestFile = f;
          bestFileName = f.name;
        }
      }
      
      if (bestFile && bestScore > 5) {
        console.log(`[Bucket Search] Found fallback matching file: ${bestFileName} (score: ${bestScore})`);
        break;
      }
    }
    
    if (!bestFile) {
      console.warn(`[Bucket Debug] No PDF file matched keywords for ${className}/${subject} in ${TEXTBOOK_BUCKET_NAME}`);
      return null;
    }
    const [buffer] = await bestFile.download();
    return {
      driveContent: {
        text: '', 
        fileName: bestFileName.split('/').pop() || bestFileName,
        mimeType: 'application/pdf',
        buffer,
      },
      source: {
        textbookId: `bucket:${bestFileName}`,
        textbookTitle: bestFileName.split('/').pop() || bestFileName,
        driveFileName: bestFileName,
        mimeType: 'application/pdf',
      },
    };
  } catch (error: any) {
    console.warn(`[Bucket Debug] Bucket textbook load failed for ${className}/${subject}:`, error?.message);
    return null;
  }
}

function getDriveFolderCandidateScore(fileName: string, className: string, subject: string) {
  const normalizedName = String(fileName || '').toLowerCase();
  const subjectLabel = getSubjectLabel(subject).toLowerCase();
  const classDigits = className.replace(/[^0-9]/g, '');
  let score = 0;

  if (normalizedName.includes(subject.toLowerCase())) score += 5;
  if (normalizedName.includes(subjectLabel)) score += 5;
  if (classDigits && normalizedName.includes(`class ${classDigits}`)) score += 4;
  if (classDigits && normalizedName.includes(`class${classDigits}`)) score += 4;
  if (classDigits && normalizedName.includes(`std ${classDigits}`)) score += 3;
  if (classDigits && normalizedName.includes(`grade ${classDigits}`)) score += 3;

  return score;
}

async function loadDriveFolderBestMatch(folderId: string, className: string, subject: string): Promise<DriveContentResult> {
  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  const filesResponse = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType)',
    pageSize: 50,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const candidates = (filesResponse.data.files || [])
    .filter((file) => Boolean(file.id) && file.mimeType !== 'application/vnd.google-apps.folder')
    .map((file) => ({
      id: String(file.id),
      name: String(file.name || ''),
      mimeType: String(file.mimeType || ''),
      score: getDriveFolderCandidateScore(String(file.name || ''), className, subject),
    }))
    .sort((left, right) => right.score - left.score);

  if (!candidates.length) {
    throw new Error('No readable files were found inside the selected Google Drive folder.');
  }

  const bestCandidate = candidates[0];
  if (bestCandidate.score <= 0) {
    throw new Error(`No likely matching file was found inside the shared Drive folder for ${className} ${subject}. Rename files to include class and subject, or add textbook-specific Drive links in admin.`);
  }
  return loadDriveTextContent(bestCandidate.id);
}

async function getFallbackDriveContent(className: string, subject: string) {
  const folderUrl = process.env.GOOGLE_DRIVE_TEXTBOOKS_FOLDER_URL || process.env.GOOGLE_DRIVE_TEXTBOOKS_FOLDER_ID || '';
  const folderId = extractDriveFileId(folderUrl);
  if (!folderId) {
    return null;
  }

  const driveContent = await loadDriveFolderBestMatch(folderId, className, subject);
  return {
    driveContent,
    source: {
      textbookId: 'shared-drive-folder',
      textbookTitle: 'Shared Drive Textbook Folder',
      driveFileId: folderId,
      driveFileName: driveContent.fileName,
      mimeType: driveContent.mimeType,
    },
  };
}

async function getTextbookContentFromSource(textbook: TextbookSource, className: string, subject: string) {
  const sourceUrl = String(textbook.download_url || '').trim();
  const driveFileId = extractDriveFileId(sourceUrl || textbook.driveFileId || textbook.driveUrl);

  if (driveFileId) {
    // If it's a Drive link (even in the download_url field), use the authenticated API
    let driveContent: DriveContentResult;
    try {
      driveContent = await loadDriveTextContent(driveFileId);
    } catch (error: any) {
      if (typeof error?.message === 'string' && error.message.startsWith('FOLDER:')) {
        driveContent = await loadDriveFolderBestMatch(driveFileId, className, subject);
      } else {
        throw error;
      }
    }
    return {
      driveContent,
      source: {
        textbookId: textbook.id,
        textbookTitle: textbook.title,
        driveFileId,
        sourceUrl: sourceUrl || undefined,
        driveFileName: driveContent.fileName,
        mimeType: driveContent.mimeType,
      },
    };
  }

  if (sourceUrl) {
    const urlContent = await loadUrlTextContent(sourceUrl);
    return {
      driveContent: urlContent,
      source: {
        textbookId: textbook.id,
        textbookTitle: textbook.title,
        sourceUrl,
        driveFileName: urlContent.fileName,
        mimeType: urlContent.mimeType,
      },
    };
  }

  throw new Error(`Textbook ${textbook.title || textbook.id} does not have a usable download URL or Drive source.`);
}

const UNWANTED_KEYWORDS = [
  'website', '.com', '.in', 'publisher', 'publication',
  'www', 'http', 'https', 'copyright', 'email', 'contact', 'phone', 'address', 'utkalskillcentre'
];

function isValidQuestionText(text: string) {
  const lower = text.toLowerCase();
  // Only reject if it contains absolute "junk" keywords
  return !UNWANTED_KEYWORDS.some(keyword => lower.includes(keyword));
}

function cleanGeneratedQuestions(questions: any[], subject?: string): DailyMcqQuestion[] {
  const expectedLang = subject ? getExpectedLanguage(subject) : null;
  const rawQuestions = Array.isArray(questions) ? questions : [];
  const cleaned = [];

  for (const q of rawQuestions) {
    // Handle potential key casing issues (question vs Question)
    const question = String(q?.question || q?.Question || '').trim();
    const options = Array.isArray(q?.options || q?.Options)
      ? (q.options || q.Options).map((o: any) => String(o || '').trim()).filter(Boolean)
      : [];
    const correct_answer = String(q?.correct_answer || q?.Correct_Answer || q?.answer || '').trim();
    const explanation = String(q?.explanation || q?.Explanation || '').trim();
    const type = (q?.type || q?.Type || '').toLowerCase() === 'subjective' ? 'subjective' : 'mcq';
    const chapter = String(q?.chapter || q?.Chapter || '').trim();
    
    let reason = '';
    if (!question) reason = 'Missing question text';
    else if (type === 'mcq' && options.length < 2) reason = 'Not enough options (MCQ requires at least 2)';
    else if (type === 'mcq' && !correct_answer) reason = 'Missing correct answer for MCQ';
    else if (!isValidQuestionText(question)) reason = 'Invalid keywords in question';
    else if (!isValidQuestionText(explanation)) reason = 'Invalid keywords in explanation';
    
    if (reason) {
      console.warn(`[MCQ-EXTRACT] Skipped question: "${question.slice(0, 50)}..." Reason: ${reason}`);
      continue;
    }

    cleaned.push({ 
      question, 
      options, 
      correct_answer, 
      explanation, 
      type: type as "mcq" | "subjective",
      chapter
    });
  }
  
  console.log(`[MCQ-EXTRACT] Total valid questions: ${cleaned.length} / ${rawQuestions.length}`);
  return capDailyMcqQuestionList(cleaned).map((q, index) => ({ 
    ...q, 
    marks: getDailyMcqMarksForIndex(index) 
  }));
}

async function generateQuestionsFromText(input: {
  className: string;
  subject: string;
  board?: string;
  activeDate: string;
  pdfBuffer: Buffer;
  chapters?: string[];
}) {
  const target = DAILY_MCQ_QUESTION_COUNT;
  if (!input.pdfBuffer || input.pdfBuffer.length === 0) {
    throw new Error('No textbook content available for MCQ generation.');
  }
  
  console.log('[DailyMCQ] Generating with Native PDF Vision...');
  // Pass the raw buffer directly to our updated Gemini utility
  const mcqs = await generateMcqsWithGemini(
    input.pdfBuffer,
    Math.max(DAILY_MCQ_QUESTION_COUNT + 5, 15),
    input.subject,
    'daily',
    'medium',
    input.chapters
  );
  
  // Validate and cap the MCQs
  const questions = cleanGeneratedQuestions(mcqs, input.subject);
  if (questions.length < target) {
    throw new Error(
      `Expected ${target} MCQs for the daily set but only ${questions.length} valid question(s) could be generated.`,
    );
  }
  return questions;
}

async function findMatchingTextbookSource(adminApp: App, databaseId: string, params: { className: string; subject: string; board?: string }) {
  const db = getDatabase(adminApp, databaseId);
  const snapshot = await db
    .collection('textbooks')
    .where('class', '==', params.className)
    .get();

  const expectedSubject = normalizeSubjectKey(params.subject);

  const allBooks = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((book: any) => String(book.download_url || '').trim() || extractDriveFileId(book.driveFileId || book.driveUrl));

  // Prefer exact subject match; fall back to books with empty/missing subject (wildcard)
  const exactMatches = allBooks.filter((book: any) => normalizeSubjectKey(book.subject) === expectedSubject);
  const wildcardMatches = allBooks.filter((book: any) => !normalizeSubjectKey(book.subject));
  const textbooks = exactMatches.length > 0 ? exactMatches : wildcardMatches;

  if (!textbooks.length) {
    return null;
  }

  if (params.board) {
    const boardMatch = textbooks.find((book: any) => String(book.board || '').toLowerCase() === String(params.board || '').toLowerCase());
    if (boardMatch) {
      return boardMatch as TextbookSource;
    }
  }

  const publishedMatch = textbooks.find((book: any) => book.status === 'published');
  return (publishedMatch || textbooks[0]) as TextbookSource;
}

async function upsertDailyMcq(adminApp: App, databaseId: string, result: GeneratedDailyMcqResult) {
  const db = getDatabase(adminApp, databaseId);
  const docId = `${result.class}_${result.subject}_${result.activeDate}`;
  const docRef = db.collection('daily_mcqs').doc(docId);

  const questions = capDailyMcqQuestionList(result.questions);
  const payload = {
    id: docId,
    title: result.title,
    class: result.class,
    subject: result.subject,
    board: result.board || 'odisha',
    activeDate: result.activeDate,
    status: result.status,
    month: result.month || '',
    questions,
    source: result.source,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(payload, { merge: true });
  return { id: docId, ...payload };
}

async function buildGeneratedDailyMcq(adminApp: App, databaseId: string, params: {
  className: string;
  subject: string;
  activeDate: string;
  board?: string;
  title?: string;
  status?: 'draft' | 'published';
  chapters?: string[];
  monthString?: string;
}) {
  // 1. Strictly load from Firebase Storage bucket
  const targetChapter = Array.isArray(params.chapters) && params.chapters.length > 0 ? params.chapters[0] : undefined;
  const bucketResult = await loadTextbookFromBucket(adminApp, params.className, params.subject, targetChapter);
  
  if (!bucketResult) {
    const classDigit = params.className.replace(/[^0-9]/g, '');
    const subjectFolder = params.subject.charAt(0).toUpperCase() + params.subject.slice(1);
    throw new Error(`No textbook found in bucket for ${params.className} ${params.subject}. Please upload a PDF to "Class ${classDigit}/${subjectFolder}/" in your storage bucket.`);
  }

  const driveContent = bucketResult.driveContent;
  const source = bucketResult.source;

  const questions = await generateQuestionsFromText({
    className: params.className,
    subject: params.subject,
    board: params.board || 'odisha',
    activeDate: params.activeDate,
    pdfBuffer: driveContent.buffer!,
    chapters: params.chapters,
  });

  return {
    title: params.title?.trim() || `${getSubjectLabel(params.subject)} Daily Practice`,
    class: params.className,
    subject: params.subject,
    board: params.board || 'odisha',
    activeDate: params.activeDate,
    status: params.status || 'draft',
    month: params.monthString,
    questions,
    source,
  } satisfies GeneratedDailyMcqResult;
}

async function getAvailableBucketSubjects(adminApp: App, className: string): Promise<string[]> {
  try {
    const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
    const classDigit = className.replace(/[^0-9]/g, '');
    const possibleClassFolders = [
      `chapterwise/Class ${classDigit}/`,
      `chapterwise/Class_${classDigit}/`,
      `Chapterwise/Class ${classDigit}/`,
      `Chapterwise/Class_${classDigit}/`,
      `Chapter Wise Text Book/Class ${classDigit}/`,
      `Chapter Wise Text Book/Class_${classDigit}/`
    ];
    
    const subjects = new Set<string>();
    for (const prefix of possibleClassFolders) {
      // List files with this prefix to identify subject subfolders
      const [files] = await bucket.getFiles({ prefix, maxResults: 100 });
      for (const file of files) {
        // Expected path: "Class X/Subject/Book.pdf" or "Class X/Subject.pdf"
        const relativePath = file.name.slice(prefix.length);
        const parts = relativePath.split('/');
        
        if (parts.length >= 2 && parts[0].trim()) {
          // It's in a subfolder, e.g. "Math/Algebra.pdf" -> subject is "Math"
          subjects.add(parts[0].toLowerCase().trim());
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
          // It's a file directly in the class folder, e.g. "Math.pdf" -> subject is "Math"
          const fileName = parts[0].split('.')[0];
          if (fileName) subjects.add(fileName.toLowerCase().trim());
        }
      }
    }
    return Array.from(subjects).filter(s => s && s !== 'textbooks' && !s.includes('vocational'));
  } catch (error) {
    console.error(`[MCQ-AUTO] Error scanning bucket for ${className}:`, error);
    return [];
  }
}

const ROADMAPS_BY_CLASS: Record<string, any[]> = {
  class1: ROADMAP_DATA_1,
  class2: ROADMAP_DATA_2,
  class3: ROADMAP_DATA_3,
  class4: ROADMAP_DATA_4,
  class5: ROADMAP_DATA_5,
  class6: ROADMAP_DATA_6,
  class7: ROADMAP_DATA_7,
  class8: ROADMAP_DATA_8,
  class9: ROADMAP_DATA_9,
  class10: ROADMAP_DATA_10,
};

function mapRoadmapSubjectToStandard(roadmapSubject: string): string {
  const s = String(roadmapSubject || '').toLowerCase().trim();
  if (s === 'ganita_khela' || s === 'maja_majare_ganita' || s === 'math' || s === 'algebra' || s === 'geometry') return 'math';
  if (s === 'jhulana_1' || s === 'jhulana_2' || s === 'odia' || s === 'odia_grammar' || s === 'sahitya') return 'odia';
  if (s === 'pallavi' || s === 'english' || s === 'english_grammar') return 'english';
  if (s === 'paribesa_patha' || s === 'evs') return 'evs';
  if (s === 'science' || s === 'physical_science' || s === 'life_science' || s === 'science_curiosity') return 'science';
  if (s === 'social_science' || s === 'history' || s === 'geography') return 'social_science';
  if (s === 'sanskrit' || s === 'sanskrit_grammar') return 'sanskrit';
  if (s === 'hindi' || s === 'hindi_grammar') return 'hindi';
  if (s === 'vocational' || s === 'vocational_agriculture' || s === 'vocational_automotive' || s === 'vocational_tourism' || s === 'vocational_electronics') return 'vocational';
  if (s === 'art' || s === 'kala_sikhya' || s === 'kala_kruti') return 'art';
  if (s === 'physical_education' || s === 'sharirika_sikhya' || s === 'physical') return 'physical_education';
  return s;
}

export async function runScheduledGeneration(adminApp: App, databaseId: string, dateString?: string, specificClassName?: string) {
  const db = getDatabase(adminApp, databaseId);
  const settingsDoc = await db.collection('system_settings').doc('config').get();
  const settings = (settingsDoc.data() || {}) as AutomationSettings;
  const activeDate = dateString || new Date().toISOString().split('T')[0];
  const effectiveClasses = specificClassName
    ? [specificClassName]
    : (Array.isArray(settings.enabledClasses) && settings.enabledClasses.length > 0
      ? settings.enabledClasses
      : DEFAULT_ENABLED_CLASSES);
  const status = settings.dailyMcqAutomationPublishMode === 'published' ? 'published' : DEFAULT_AUTOMATION_STATUS;

  const generated: Array<{ className: string; subject: string; id: string }> = [];
  const skipped: Array<{ className: string; reason: string }> = [];

  console.log('[MCQ-AUTO] Starting MCQ generation for date:', activeDate);
  console.log('[MCQ-AUTO] Effective classes:', effectiveClasses);

  // Parse month and year from activeDate (using UTC/Kolkata date construction safely)
  const dateObj = new Date(activeDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const monthString = `${monthName} ${year}`; // e.g. "June 2026"
  const dayOfMonth = dateObj.getDate();

  for (const className of effectiveClasses) {
    try {
      console.log(`[MCQ-AUTO] Processing class: ${className}`);

      // 1. Get the roadmap for this class
      const normalizedClassName = className.toLowerCase().trim();
      const classRoadmap = ROADMAPS_BY_CLASS[normalizedClassName];
      
      let activeChapters: any[] = [];
      if (classRoadmap) {
        const monthEntry = classRoadmap.find(entry => entry.month === monthString);
        if (monthEntry && Array.isArray(monthEntry.chapters)) {
          activeChapters = monthEntry.chapters;
        }
      }

      // If no chapters scheduled for this month, fall back to old sequence selection
      let subjectsToGenerate: string[] = [];
      if (activeChapters.length === 0) {
        console.warn(`[MCQ-AUTO] No chapters scheduled in roadmap for ${className} in ${monthString}. Falling back to default rotation.`);
        const availableBucketSubjects = await getAvailableBucketSubjects(adminApp, className);
        const subjectsByClass = (translations.en as any).subjectsByClass?.odisha as Record<string, string[]> | undefined;
        const hasCustomRotation = Array.isArray(settings.dailyMcqSubjectRotation) && settings.dailyMcqSubjectRotation.length > 0;
        const fallbackSubjects = (availableBucketSubjects.length > 0)
          ? availableBucketSubjects
          : ((!hasCustomRotation && subjectsByClass?.[className]) || settings.dailyMcqSubjectRotation);
        
        const sub = getRotatingDailyMcqSubject(activeDate, fallbackSubjects);
        subjectsToGenerate = [sub];
      } else {
        // Standardize the subjects in the active roadmap chapters
        const subjectsInMonth = Array.from(new Set(activeChapters.map((ch: any) => mapRoadmapSubjectToStandard(ch.subject))));
        
        // Group electives: sanskrit, hindi, vocational
        const electiveGroup = ['sanskrit', 'hindi', 'vocational'];
        const rotationSlots: (string | string[])[] = [];
        let hasElectives = false;

        for (const sub of subjectsInMonth) {
          if (electiveGroup.includes(sub)) {
            hasElectives = true;
          } else {
            rotationSlots.push(sub);
          }
        }
        if (hasElectives) {
          rotationSlots.push(electiveGroup);
        }

        // Select the active slot for today
        const slotIndex = (dayOfMonth - 1) % rotationSlots.length;
        const activeSlot = rotationSlots[slotIndex];

        if (Array.isArray(activeSlot)) {
          // It's the elective day slot. Generate all electives scheduled for this month.
          subjectsToGenerate = activeSlot.filter(sub => subjectsInMonth.includes(sub));
        } else {
          subjectsToGenerate = [activeSlot];
        }
      }

      console.log(`[MCQ-AUTO] Subjects to generate for ${className}:`, subjectsToGenerate);

      for (const subject of subjectsToGenerate) {
        // Check if the daily set for this subject already exists for this date
        const existing = await db.collection('daily_mcqs')
          .where('class', '==', className)
          .where('subject', '==', subject)
          .where('activeDate', '==', activeDate)
          .get();

        if (!existing.empty) {
          console.log(`[MCQ-AUTO] Skipped ${className} ${subject}: Daily set already exists for this date.`);
          skipped.push({ className: `${className} (${subject})`, reason: 'Daily set already exists for this class, subject, and date.' });
          continue;
        }

        // Get the specific roadmap chapters for this subject
        const subjectChapters = activeChapters.filter((ch: any) => mapRoadmapSubjectToStandard(ch.subject) === subject);
        
        let selectedChapterTitles: string[] | undefined = undefined;
        if (subjectChapters.length > 0) {
          // Select only one chapter based on rotation of day of month
          const chIndex = (dayOfMonth - 1) % subjectChapters.length;
          const chosenChapter = subjectChapters[chIndex];
          const title = chosenChapter.title_or || chosenChapter.title_en || chosenChapter.title || '';
          if (title) {
            selectedChapterTitles = [title];
          }
        }

        const generatedSet = await buildGeneratedDailyMcq(adminApp, databaseId, {
          className,
          subject,
          activeDate,
          status,
          chapters: selectedChapterTitles,
          monthString,
        });

        console.log(`[MCQ-AUTO] Generated MCQ set for ${className} ${subject}`);
        const saved = await upsertDailyMcq(adminApp, databaseId, generatedSet);
        console.log(`[MCQ-AUTO] Saved MCQ for ${className} ${subject} with id ${String(saved.id)}`);
        generated.push({ className, subject, id: String(saved.id) });

        // Trigger daily MCQ notifications for students of this class
        if (status === 'published') {
          sendDailyMcqNotification(adminApp, databaseId, className, subject, activeDate).catch((err) => {
            console.error(`[MCQ-AUTO] Failed to send notifications for ${className}:`, err);
          });
        }
      }
    } catch (error: any) {
      console.error(`[MCQ-AUTO] Error for class ${className}:`, error?.message || error);
      skipped.push({ className, reason: error?.message || 'Unknown generation error' });
    }
  }

  console.log('[MCQ-AUTO] Generation complete. Generated:', generated, 'Skipped:', skipped);
  return { activeDate, generated, skipped };
}

async function sendDailyMcqNotification(
  adminApp: App,
  databaseId: string,
  className: string,
  subject: string,
  activeDate: string
) {
  try {
    const db = getAdminFirestore(adminApp, databaseId);
    
    // 1. Get translations for the subject name
    const subjectEn = translations.en.subjects?.[subject as keyof typeof translations.en.subjects] || subject.replace(/_/g, ' ');
    const subjectOr = translations.or.subjects?.[subject as keyof typeof translations.or.subjects] || subject.replace(/_/g, ' ');
    const classLabel = translations.en.classes?.[className as keyof typeof translations.en.classes] || className;
    const classLabelOr = translations.or.classes?.[className as keyof typeof translations.or.classes] || className;

    const notifTitle = `Daily MCQ Live 📝`;
    const notifTitleOr = `ଦୈନିକ MCQ ଲାଇଭ୍ 📝`;
    
    const notifMessage = `Today's Daily MCQ for ${classLabel} (${subjectEn}) is now live. Solve it now to earn XP! 🚀`;
    const notifMessageOdia = `ଆଜିର ${classLabelOr} (${subjectOr}) ପାଇଁ ଦୈନିକ MCQ ଲାଇଭ୍ ହୋଇଯାଇଛି। ସମାଧାନ କରି XP ହାସଲ କରନ୍ତୁ! 🚀`;

    // 2. Add document to 'notifications' collection in Firestore
    await db.collection('notifications').add({
      title: notifTitle,
      titleOdia: notifTitleOr,
      message: notifMessage,
      messageOdia: notifMessageOdia,
      audience: className,
      createdAt: FieldValue.serverTimestamp()
    });

    console.log(`[MCQ-NOTIFICATION] Saved system notification for ${className} ${subject}`);

    // 3. Query all users in this class who have active push subscriptions
    const usersSnapshot = await db.collection('users')
      .where('class', '==', className)
      .where('pushSubscription', '!=', null)
      .get();

    if (usersSnapshot.empty) {
      console.log(`[MCQ-NOTIFICATION] No push subscribers found in class ${className}`);
      return;
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BHk1uroqx4HMHX1c3ldVPuO3AYWBGByuqlYBjWPW2YttFtiurT8cI731ckrp7K_Q491TtgpAkZL7ioLvVKtmtJo';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'YGxwRzEnUaPqPygwknmuurDPEQVAwrEobKosW18pGVA';

    if (vapidPublicKey && vapidPrivateKey) {
      try {
        webpush.setVapidDetails(
          'mailto:support@utkalskillcentre.com',
          vapidPublicKey,
          vapidPrivateKey
        );
      } catch (err: any) {
        console.error('[MCQ-NOTIFICATION] VAPID config error:', err.message);
      }
    }

    let sentCount = 0;
    const promises = [];

    for (const docSnap of usersSnapshot.docs) {
      const userData = docSnap.data();
      const subscription = userData.pushSubscription;
      const userLang = userData.language || 'en';

      if (subscription && subscription.endpoint) {
        const payload = JSON.stringify({
          title: userLang === 'or' ? notifTitleOr : notifTitle,
          body: userLang === 'or' ? notifMessageOdia : notifMessage,
          url: '/daily_mcqs'
        });

        promises.push(
          webpush.sendNotification(subscription, payload)
            .then(() => { sentCount++; })
            .catch((err: any) => {
              console.error(`[MCQ-NOTIFICATION] Failed for user ${docSnap.id}:`, err.message);
              // Clean up expired subscriptions
              if (err.statusCode === 410 || err.statusCode === 404) {
                db.collection('users').doc(docSnap.id).update({
                  pushSubscription: null
                }).catch(() => {});
              }
            })
        );
      }
    }

    await Promise.allSettled(promises);
    console.log(`[MCQ-NOTIFICATION] Sent push notifications to ${sentCount} devices in ${className}`);
  } catch (err: any) {
    console.error(`[MCQ-NOTIFICATION] Error dispatching MCQ notification:`, err.message || err);
  }
}

/** Firestore / gRPC errors expose numeric `code` (e.g. 7 PERMISSION_DENIED, 16 UNAUTHENTICATED). */
function adminRouteErrorResponse(
  error: unknown,
  fallbackMessage: string
): { status: number; body: Record<string, unknown> } {
  const err = error as { code?: number; message?: string; details?: string };
  const grpcCode = typeof err?.code === 'number' ? err.code : undefined;
  const message =
    (typeof err?.message === 'string' && err.message.trim()) ||
    (error instanceof Error ? error.message : null) ||
    fallbackMessage;

  const base: Record<string, unknown> = { error: message };
  if (grpcCode !== undefined) base.grpcCode = grpcCode;
  if (typeof err?.details === 'string' && err.details) base.details = err.details;

  if (grpcCode === 16) {
    return {
      status: 503,
      body: {
        ...base,
        hint: 'Credentials were rejected. Verify GOOGLE_APPLICATION_CREDENTIALS points to an active JSON key for this GCP project.',
      },
    };
  }
  if (grpcCode === 7) {
    return {
      status: 403,
      body: {
        ...base,
        hint:
          'IAM: grant this service account at least roles/datastore.user (Cloud Datastore User) on the project, or a role that includes Firestore access for the database you use.',
      },
    };
  }

  return { status: 500, body: base };
}

export function registerDailyMcqAutomation(app: Express, providedAdminApp: App | null, databaseId: string) {
  // Helper to get the admin app (either provided or initialized on demand)
  const getApp = () => {
    if (providedAdminApp) return providedAdminApp;
    if (getApps().length > 0) return getAdminApp();
    return null;
  };

  app.post('/api/admin/daily-mcqs/generate-from-drive', async (req, res) => {
    try {
      const adminApp = getApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const className = String(req.body?.className || '').trim();
      const subject = String(req.body?.subject || '').trim().toLowerCase();
      const activeDate = String(req.body?.activeDate || '').trim() || new Date().toISOString().split('T')[0];
      const board = String(req.body?.board || '').trim() || undefined;
      const title = String(req.body?.title || '').trim() || undefined;
      const status = req.body?.status === 'published' ? 'published' : 'draft';

      if (!className || !subject) {
        return res.status(400).json({ error: 'className and subject are required.' });
      }

      const generated = await buildGeneratedDailyMcq(adminApp, databaseId, {
        className,
        subject,
        activeDate,
        board,
        title,
        status,
      });

      return res.json(generated);
    } catch (error: unknown) {
      console.error('Generate Daily MCQ From Drive Error:', error);
      const { status, body } = adminRouteErrorResponse(error, 'Failed to generate daily MCQ from Drive.');
      return res.status(status).json(body);
    }
  });

  app.all('/api/admin/daily-mcqs/run-auto', async (req, res) => {
    try {
      // Automated Cron sends HTTP GET. We accept both GET and POST.
      const authHeader = req.headers.authorization;
      if (req.method === 'GET' && process.env.CRON_SECRET) {
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return res.status(401).json({ error: 'Unauthorized Cron Request' });
        }
      }

      const adminApp = getApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const activeDate = String(req.body?.activeDate || req.query?.activeDate || '').trim() || undefined;
      const className = String(req.body?.className || req.query?.className || '').trim() || undefined;
      const result = await runScheduledGeneration(adminApp, databaseId, activeDate, className);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Run Daily MCQ Automation Error:', error);
      const { status, body } = adminRouteErrorResponse(error, 'Failed to run daily MCQ automation.');
      return res.status(status).json(body);
    }
  });

}
