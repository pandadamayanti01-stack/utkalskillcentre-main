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
import type { Express } from 'express';
import { App, getApp as getAdminApp, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { google } from 'googleapis';
import cron from 'node-cron';

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

let lastAutomationRunKey = '';
let schedulerStarted = false;

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

const TEXTBOOK_BUCKET_NAME = process.env.TEXTBOOK_STORAGE_BUCKET || 'utkalskillcentre-admin';

import { SUBJECT_FILE_KEYWORDS } from '../constants.js';

async function loadTextbookFromBucket(adminApp: App, className: string, subject: string): Promise<{ driveContent: DriveContentResult; source: GeneratedDailyMcqResult['source'] } | null> {
  const classDigit = className.replace(/[^0-9]/g, '');
  // Try both Class X and Class_X folder patterns
  const possibleClassFolders = [`Class ${classDigit}/`, `Class_${classDigit}/`];
  const subjectKey = normalizeSubjectKey(subject);
  const keywords = SUBJECT_FILE_KEYWORDS[subjectKey] || [subjectKey.replace(/_/g, ' '), subjectKey.replace(/_/g, '')];

  try {
    const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
    let bestScore = 0;
    let bestFile = null;
    let bestFileName = '';
    
    // Build possible folder patterns based on your bucket structure: "Class X/Subject/"
    const subjectFolder = subject.charAt(0).toUpperCase() + subject.slice(1);
    const folderSearchPatterns = [];
    for (const classFolder of possibleClassFolders) {
      folderSearchPatterns.push(`${classFolder}${subjectFolder}/`);
      folderSearchPatterns.push(classFolder); // Fallback to root of Class folder
    }

    for (const prefix of folderSearchPatterns) {
      console.log(`[Bucket Search] Checking prefix: ${prefix}`);
      const [files] = await bucket.getFiles({ prefix, maxResults: 50 });
      const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
      
      for (const f of pdfFiles) {
        const lower = f.name.toLowerCase().replace(/[_\s]+/g, '');
        let score = 0;
        for (const kw of keywords) {
          const normKw = kw.toLowerCase().replace(/[_\s]+/g, '');
          if (lower.includes(normKw)) score += normKw.length;
        }
        
        // Bonus for being in the correct subject subfolder
        if (f.name.includes(`/${subjectFolder}/`)) score += 10;

        if (score > bestScore) {
          bestScore = score;
          bestFile = f;
          bestFileName = f.name;
        }
      }
      if (bestFile && bestScore > 5) break; // Found a good match in the subject folder, stop searching
    }
    
    if (!bestFile || bestScore <= 0) {
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
}) {
  const target = DAILY_MCQ_QUESTION_COUNT;
  if (!input.pdfBuffer || input.pdfBuffer.length === 0) {
    throw new Error('No textbook content available for MCQ generation.');
  }
  
  console.log('[DailyMCQ] Generating with Native PDF Vision...');
  // Pass the raw buffer directly to our updated Gemini utility
  const mcqs = await generateMcqsWithGemini(input.pdfBuffer, Math.max(DAILY_MCQ_QUESTION_COUNT + 5, 15), input.subject);
  
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
  const docId = `${result.class}_${result.activeDate}`;
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
}) {
  // 1. Strictly load from Firebase Storage bucket
  const bucketResult = await loadTextbookFromBucket(adminApp, params.className, params.subject);
  
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
  });

  return {
    title: params.title?.trim() || `${getSubjectLabel(params.subject)} Daily Practice`,
    class: params.className,
    subject: params.subject,
    board: params.board || 'odisha',
    activeDate: params.activeDate,
    status: params.status || 'draft',
    questions,
    source,
  } satisfies GeneratedDailyMcqResult;
}

async function getAvailableBucketSubjects(adminApp: App, className: string): Promise<string[]> {
  try {
    const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
    const classDigit = className.replace(/[^0-9]/g, '');
    const possibleClassFolders = [`Class ${classDigit}/`, `Class_${classDigit}/`];
    
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
  const hasCustomRotation = Array.isArray(settings.dailyMcqSubjectRotation) && settings.dailyMcqSubjectRotation.length > 0;
  const status = settings.dailyMcqAutomationPublishMode === 'published' ? 'published' : DEFAULT_AUTOMATION_STATUS;

  // Per-class subject lists from subjectsByClass; fall back to admin rotation or global default
  const subjectsByClass = (translations.en as any).subjectsByClass?.odisha as Record<string, string[]> | undefined;

  const generated: Array<{ className: string; subject: string; id: string }> = [];
  const skipped: Array<{ className: string; reason: string }> = [];

  console.log('[MCQ-AUTO] Starting MCQ generation for date:', activeDate);
  console.log('[MCQ-AUTO] Effective classes:', effectiveClasses);
  for (const className of effectiveClasses) {
    try {
      console.log(`[MCQ-AUTO] Processing class: ${className}`);
      const existing = await db.collection('daily_mcqs').where('class', '==', className).where('activeDate', '==', activeDate).get();
      if (!existing.empty) {
        console.log(`[MCQ-AUTO] Skipped ${className}: Daily set already exists for this date.`);
        skipped.push({ className, reason: 'Daily set already exists for this class and date.' });
        continue;
      }

      // Determine which subjects are actually available in the bucket for this class
      const availableBucketSubjects = await getAvailableBucketSubjects(adminApp, className);
      console.log(`[MCQ-AUTO] Available subjects in bucket for ${className}:`, availableBucketSubjects);

      const classSubjects = (availableBucketSubjects.length > 0) 
        ? availableBucketSubjects 
        : ((!hasCustomRotation && subjectsByClass?.[className]) || settings.dailyMcqSubjectRotation);
      
      const subject = getRotatingDailyMcqSubject(activeDate, classSubjects);
      console.log(`[MCQ-AUTO] Selected subject for ${className}:`, subject);

      const generatedSet = await buildGeneratedDailyMcq(adminApp, databaseId, {
        className,
        subject,
        activeDate,
        status,
      });
      console.log(`[MCQ-AUTO] Generated MCQ set for ${className} ${subject}`);
      const saved = await upsertDailyMcq(adminApp, databaseId, generatedSet);
      console.log(`[MCQ-AUTO] Saved MCQ for ${className} ${subject} with id ${String(saved.id)}`);
      generated.push({ className, subject, id: String(saved.id) });
    } catch (error: any) {
      console.error(`[MCQ-AUTO] Error for class ${className}:`, error?.message || error);
      skipped.push({ className, reason: error?.message || 'Unknown generation error' });
    }
  }

  console.log('[MCQ-AUTO] Generation complete. Generated:', generated, 'Skipped:', skipped);
  return { activeDate, generated, skipped };
}

function getTimePartsInZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

async function tickAutomation(adminApp: App, databaseId: string) {
  const db = getDatabase(adminApp, databaseId);
  const settingsDoc = await db.collection('system_settings').doc('config').get();
  const settings = (settingsDoc.data() || {}) as AutomationSettings;
  if (!settings.dailyMcqAutomationEnabled) {
    return;
  }

  const timeZone = settings.dailyMcqAutomationTimeZone || DEFAULT_AUTOMATION_TIME_ZONE;
  const desiredTime = settings.dailyMcqAutomationTime || DEFAULT_AUTOMATION_TIME;
  const current = getTimePartsInZone(timeZone);
  const runKey = `${current.dateKey}@${desiredTime}@${timeZone}`;

  if (current.time !== desiredTime || lastAutomationRunKey === runKey) {
    return;
  }

  lastAutomationRunKey = runKey;
  const result = await runScheduledGeneration(adminApp, databaseId, current.dateKey);
  console.log('Daily MCQ automation completed:', result);
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

  app.post('/api/admin/daily-mcqs/run-auto', async (req, res) => {
    try {
      const adminApp = getApp();
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized.' });
      }

      const activeDate = String(req.body?.activeDate || '').trim() || undefined;
      const className = String(req.body?.className || '').trim() || undefined;
      const result = await runScheduledGeneration(adminApp, databaseId, activeDate, className);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Run Daily MCQ Automation Error:', error);
      const { status, body } = adminRouteErrorResponse(error, 'Failed to run daily MCQ automation.');
      return res.status(status).json(body);
    }
  });

  if (!schedulerStarted) {
    schedulerStarted = true;
    cron.schedule('* * * * *', async () => {
      try {
        const adminApp = getApp();
        if (adminApp) {
          await tickAutomation(adminApp, databaseId);
        }
      } catch (error) {
        console.error('Daily MCQ scheduler tick failed:', error);
      }
    });
    console.log('Daily MCQ automation scheduler registered.');
  }
}
