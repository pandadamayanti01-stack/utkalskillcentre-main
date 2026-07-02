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



export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    if (buffer.length >= 4) {
      const header = buffer.toString('utf8', 0, 4);
      if (header !== '%PDF') {
        console.log(`[extractPdfText] Buffer is already plain text (no %PDF header), skipping PDF parse.`);
        return buffer.toString('utf8');
      }
    }
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
import { generateMcqsWithGemini, getTargetLanguage, getGamificationInstructions } from '../utils/geminiMcqGenerator.js';
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
import { BSE_SYLLABUS_MAPPING_9, BSE_SYLLABUS_MAPPING_10 } from '../data/bseSyllabusMapping.js';

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
  type?: 'mcq' | 'subjective';
  chapter?: string;
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

export function normalizeSubjectKey(input?: string) {
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

  // Check Odia translation dictionary values:
  const odiaSubjectEntries = Object.entries(translations.or.subjects || {});
  const odiaDirectMatch = odiaSubjectEntries.find(([subjectKey]) => subjectKey.toLowerCase() === normalizedValue);
  if (odiaDirectMatch) {
    return odiaDirectMatch[0];
  }

  const odiaLabelMatch = odiaSubjectEntries.find(([, subjectLabel]) => {
    const normalizedLabel = String(subjectLabel || '').toLowerCase().replace(/[()]/g, '').replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
    return normalizedLabel === normalizedValue;
  });
  if (odiaLabelMatch) {
    return odiaLabelMatch[0];
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
  if (s === 'social_science' || s === 'social' || s === 'history' || s === 'geography') {
    list.push('Social_science', 'Social science', 'Social Science', 'History', 'Geography', 'Social Studies', 'Social_studies', 'social_science', 'geography', 'history');
  }
  if (s === 'physical_education' || s === 'physical') {
    list.push('Physical_education', 'Physical education', 'Physical Education', 'Physical', 'physical');
  }
  if (s === 'vocational') {
    list.push('Vocational', 'vocational');
  }

  return Array.from(new Set(list.filter(Boolean)));
}

export async function loadTextbookFromBucket(adminApp: App, className: string, subject: string, chapterTitle?: string): Promise<{ driveContent: DriveContentResult; source: GeneratedDailyMcqResult['source'] } | null> {
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

    console.log(`[Bucket Search] Querying ${folderSearchPatterns.length} prefixes in parallel...`);
    const searchPromises = folderSearchPatterns.map(async (prefix) => {
      try {
        const [files] = await bucket.getFiles({ prefix, maxResults: 50 });
        const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
        return { prefix, pdfFiles };
      } catch (err: any) {
        console.warn(`[Bucket Search] Error listing prefix ${prefix}:`, err.message);
        return { prefix, pdfFiles: [] };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    for (const { prefix, pdfFiles } of searchResults) {
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
    const txtFileName = bestFileName.replace(/\.pdf$/i, '.txt');
    const txtFile = bucket.file(txtFileName);
    try {
      const [txtExists] = await txtFile.exists();
      if (txtExists) {
        console.log(`[Bucket Cache] Found pre-parsed text cache: ${txtFileName}`);
        const [txtBuffer] = await txtFile.download();
        return {
          driveContent: {
            text: txtBuffer.toString('utf8'),
            fileName: txtFileName.split('/').pop() || txtFileName,
            mimeType: 'text/plain',
            buffer: txtBuffer,
          },
          source: {
            textbookId: `bucket:${txtFileName}`,
            textbookTitle: txtFileName.split('/').pop() || txtFileName,
            driveFileName: txtFileName,
            mimeType: 'text/plain',
          },
        };
      }
    } catch (cacheErr: any) {
      console.warn(`[Bucket Cache] Error checking or downloading text cache:`, cacheErr.message);
    }

    console.log(`[Bucket Cache] Cache not found. Downloading PDF and parsing: ${bestFileName}`);
    const [pdfBuffer] = await bestFile.download();
    
    // Parse the PDF text and save it to the bucket for future runs
    let parsedText = '';
    try {
      parsedText = await extractPdfText(pdfBuffer);
      if (parsedText && parsedText.trim().length > 50) {
        await txtFile.save(parsedText, { contentType: 'text/plain' });
        console.log(`[Bucket Cache] Successfully created and saved text cache: ${txtFileName}`);
      }
    } catch (parseErr: any) {
      console.warn(`[Bucket Cache] Failed to create or save text cache:`, parseErr.message);
    }

    return {
      driveContent: {
        text: parsedText,
        fileName: bestFileName.split('/').pop() || bestFileName,
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
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

function cleanOdiaOrthographyLocal(text: string): string {
  if (!text) return text;
  const correctionMap: Record<string, string> = {
    'ଦାଣ୍ଡି ଜାତ୍ରା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ଦାଣ୍ଡି ଜାରା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ଦାଣ୍ଡି ଜାର୍ତ୍ତା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ଦାଣ୍ଡି ଯାତ୍ର': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ମହାତ୍ମା ଗାନ୍ଧି': 'ମହାତ୍ମା ଗାନ୍ଧୀ',
    'ଗାନ୍ଧିଜି': 'ଗାନ୍ଧୀଜୀ',
    'ଜାତ୍ରା': 'ଯାତ୍ରା',
    'ପରିକ୍ଷା': 'ପରୀକ୍ଷା',
    'ପରିକ୍ଷାଗାର': 'ପରୀକ୍ଷାଗାର',
    'ବେବସାୟ': 'ବ୍ୟବସାୟ',
    'ୱେବସାୟ': 'ବ୍ୟବସାୟ',
    'ବେକରଣ': 'ବ୍ୟାକରଣ',
    'ବ୍ୟାକରନ': 'ବ୍ୟାକରଣ',
    'ସିକ୍ଷା': 'ଶିକ୍ଷା',
    'ଶିକ୍ଷନ': 'ଶିକ୍ଷଣ',
    'ସାହିତ୍ୟ ସାଥି': 'ସାହିତ୍ୟ ସାଥୀ',
    'ବର୍ନ': 'ବର୍ଣ୍ଣ',
    'ବର୍ନମାଳା': 'ବର୍ଣ୍ଣମାଳା',
    'ବାଳ ଓ ଗତି': 'ବଳ ଓ ଗତି',
    'ବାଲ ଓ ଗତି': 'ବଳ ଓ ଗତି',
    'ବାଲରାମ': 'ବଳରାମ',
    'ବାଲଦେବ': 'ବଳଦେବ',
    'ବାଲଶ୍ରୀ': 'ବଳଶ୍ରୀ',
    'ମାତୃଭକ୍ତି କଥା': 'ମାଡ଼ହାଣ୍ଡି କଥା',
    'Matrubhakti Katha': 'Madahandi Katha',
    'ଗୁନ୍ଦୁଲୁ': 'ଗୁନ୍ଦୁଲୁ',
    'ଗୁଣ୍ଡୁଳୁ': 'ଗୁନ୍ଦୁଲୁ',
    'ଗୁଣ୍ଡୁଲି': 'ଗୁନ୍ଦୁଲୁ',
    'ଗୁଣ୍ଡୁଲ': 'ଗୁନ୍ଦୁଲ',
  };
  let correctedText = text;
  for (const [incorrect, correct] of Object.entries(correctionMap)) {
    correctedText = correctedText.replaceAll(incorrect, correct);
  }
  return correctedText;
}

function cleanGeneratedQuestions(questions: any[], subject?: string): DailyMcqQuestion[] {
  const expectedLang = subject ? getExpectedLanguage(subject) : null;
  const isOdia = expectedLang === 'odia';
  const rawQuestions = Array.isArray(questions) ? questions : [];
  const cleaned = [];

  for (const q of rawQuestions) {
    // Handle potential key casing issues (question vs Question)
    let question = String(q?.question || q?.Question || '').trim();
    let options = Array.isArray(q?.options || q?.Options)
      ? (q.options || q.Options).map((o: any) => String(o || '').trim()).filter(Boolean)
      : [];
    let correct_answer = String(q?.correct_answer || q?.Correct_Answer || q?.answer || '').trim();
    let explanation = String(q?.explanation || q?.Explanation || '').trim();
    const type = (q?.type || q?.Type || '').toLowerCase() === 'subjective' ? 'subjective' : 'mcq';
    const chapter = String(q?.chapter || q?.Chapter || '').trim();
    
    if (isOdia) {
      question = cleanOdiaOrthographyLocal(question);
      options = options.map(o => cleanOdiaOrthographyLocal(o));
      correct_answer = cleanOdiaOrthographyLocal(correct_answer);
      explanation = cleanOdiaOrthographyLocal(explanation);
    }

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
  const mcqs = await generateMcqsWithGemini(
    input.pdfBuffer,
    Math.max(DAILY_MCQ_QUESTION_COUNT + 5, 15),
    input.subject,
    input.className,
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

  const expectedCount = getExpectedQuestionCount(result.class);
  const questions = result.questions.slice(0, expectedCount);
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

function getGeminiApiKeys(): string[] {
  const keysToTry: string[] = [];
  if (process.env.GEMINI_API_KEY) keysToTry.push(process.env.GEMINI_API_KEY);
  if (process.env.VITE_GEMINI_API_KEY && !keysToTry.includes(process.env.VITE_GEMINI_API_KEY)) {
    keysToTry.push(process.env.VITE_GEMINI_API_KEY);
  }
  for (let i = 1; i <= 7; i++) {
    const k = process.env[`GEMINI_ROTATOR_KEY_${i}`];
    if (k && !keysToTry.includes(k)) {
      keysToTry.push(k);
    }
  }
  return keysToTry;
}

function getExpectedQuestionCount(className: string): number {
  const normalized = className.toLowerCase().trim();
  if (normalized === 'class9') return 14;
  if (normalized === 'class10') return 15;
  return DAILY_MCQ_QUESTION_COUNT;
}

async function getChapterForOptionalSubject(
  db: FirebaseFirestore.Firestore,
  className: string,
  subject: string,
  dayOfMonth: number
): Promise<string | undefined> {
  try {
    const chaptersSnapshot = await db.collection('chapters')
      .where('class', '==', className)
      .get();
    
    const chapters: any[] = [];
    chaptersSnapshot.forEach(doc => {
      const data = doc.data();
      const stdSub = mapRoadmapSubjectToStandard(data.subject);
      if (stdSub === subject) {
        chapters.push({
          title: data.title || '',
          title_en: data.title_en || '',
          title_or: data.title_or || ''
        });
      }
    });

    if (chapters.length === 0) return undefined;
    
    // Rotate through chapters based on day of month
    const chIndex = (dayOfMonth - 1) % chapters.length;
    const chosen = chapters[chIndex];
    return chosen.title_or || chosen.title_en || chosen.title || undefined;
  } catch (error) {
    console.error(`[MCQ-AUTO] Error getting chapters for optional subject ${subject}:`, error);
    return undefined;
  }
}

function getPlaceholderQuestion(subject: string, chapter?: string): DailyMcqQuestion {
  const targetLanguage = getExpectedLanguage(subject) || 'odia';
  const isEnglish = targetLanguage === 'english';
  
  return {
    question: isEnglish 
      ? `Placeholder question for ${subject} ${chapter ? `(${chapter})` : ''}`
      : `${translations.or.subjects?.[subject] || subject} ବିଷୟର ଏକ ସାଧାରଣ ପ୍ରଶ୍ନ ${chapter ? `(${chapter})` : ''}`,
    options: isEnglish 
      ? ["Option A", "Option B", "Option C", "Option D"]
      : ["କ", "ଖ", "ଗ", "ଘ"],
    correct_answer: isEnglish ? "Option A" : "କ",
    explanation: isEnglish 
      ? "Placeholder explanation."
      : "ଏହା ଏକ ସାଧାରଣ ବ୍ୟାଖ୍ୟା।",
    marks: 1,
    type: 'mcq'
  };
}

function cleanOptionalQuestions(questions: any[], subject: string, count: number): DailyMcqQuestion[] {
  const expectedLang = getExpectedLanguage(subject);
  const isOdia = expectedLang === 'odia';
  const rawQuestions = Array.isArray(questions) ? questions : [];
  const cleaned = [];

  for (const q of rawQuestions) {
    let question = String(q?.question || q?.Question || '').trim();
    let options = Array.isArray(q?.options || q?.Options)
      ? (q.options || q.Options).map((o: any) => String(o || '').trim()).filter(Boolean)
      : [];
    let correct_answer = String(q?.correct_answer || q?.Correct_Answer || q?.answer || '').trim();
    let explanation = String(q?.explanation || q?.Explanation || '').trim();
    const type = (q?.type || q?.Type || '').toLowerCase() === 'subjective' ? 'subjective' : 'mcq';
    const chapter = String(q?.chapter || q?.Chapter || '').trim();

    if (isOdia) {
      question = cleanOdiaOrthographyLocal(question);
      options = options.map(o => cleanOdiaOrthographyLocal(o));
      correct_answer = cleanOdiaOrthographyLocal(correct_answer);
      explanation = cleanOdiaOrthographyLocal(explanation);
    }

    let reason = '';
    if (!question) reason = 'Missing question text';
    else if (type === 'mcq' && options.length < 2) reason = 'Not enough options (MCQ requires at least 2)';
    else if (type === 'mcq' && !correct_answer) reason = 'Missing correct answer for MCQ';
    else if (!isValidQuestionText(question)) reason = 'Invalid keywords in question';
    else if (!isValidQuestionText(explanation)) reason = 'Invalid keywords in explanation';

    if (reason) {
      continue;
    }

    cleaned.push({
      question,
      options,
      correct_answer,
      explanation,
      type: type as "mcq" | "subjective",
      chapter,
      marks: 1
    });
  }

  return cleaned.slice(0, count);
}

async function generateOptionalQuestionsFromPrompt(
  className: string,
  subject: string,
  count: number,
  chapterTitle?: string,
  textbookText?: string  // Pre-parsed plain text from .txt cache — injected directly, avoids Files API
): Promise<DailyMcqQuestion[]> {
  const keysToTry = getGeminiApiKeys();
  if (keysToTry.length === 0) {
    throw new Error('No GEMINI_API_KEY or GEMINI_ROTATOR_KEYs configured on the server.');
  }

  const targetLanguage = getTargetLanguage(subject);
  const gamificationRules = getGamificationInstructions(subject, className);

  let sanskritSpellingInstructions = '';
  if (subject.toLowerCase().includes('sanskrit')) {
    sanskritSpellingInstructions = `
    CRITICAL SANSKRIT ORTHOGRAPHY & SPELLING RULES:
    1. Script: Sanskrit questions, options, answers, and explanations MUST be written in clean Devanagari script (देवनागरी लिपि).
    2. Letter and Word Accuracy: Ensure absolute spelling correctness of Sanskrit words. Avoid letter substitution errors.
    3. Conjuncts & Halant: Use correct conjuncts/ligatures (e.g., द्व, द्ध, ज्ञ, क्ष, त्र, प्र, श्र) and proper halant placement (्) (e.g., correct is "किम्", "अस्ति", "पठति"). Do NOT output broken or disjointed Unicode characters.`;
  }

  // If we have pre-parsed textbook text, inject it directly so questions are grounded in real content
  const textbookContext = textbookText && textbookText.trim().length > 100
    ? `\n\nTEXTBOOK CONTENT (use this as the primary source for generating questions):\n---\n${textbookText.substring(0, 12000)}\n---`
    : '';

  const prompt = `You are a teacher. Generate exactly ${count} multiple-choice questions (MCQs) for the subject "${subject}" (Class: ${className}).
${chapterTitle ? `The questions should focus on the chapter/topic: "${chapterTitle}".` : 'The questions should cover general topics suitable for this class level.'}
Difficulty: MEDIUM.
${textbookContext}

Rules:
1. Make sure to generate EXACTLY ${count} questions.
2. Each question MUST be a multiple-choice question (MCQ) with exactly 4 options.
3. Keep the question text and options in the original language (${targetLanguage}). If the options are in Odia, capture them as strings in the options array.
4. Provide the correct answer and write a helpful explanation in ${targetLanguage} explaining why that answer is correct.
5. SCHEMA: Array of { "question": string, "options": string[], "correct_answer": string, "explanation": string, "type": "mcq", "chapter": string }.

${sanskritSpellingInstructions}

${gamificationRules}`;

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
    const apiKey = keysToTry[keyIdx];
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelId of models) {
        try {
          console.log(`[MCQ-OPTIONAL-PROMPT] Prompting ${modelId} with API key ${keyIdx + 1}...`);
          const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: { responseMimeType: "application/json" }
          });

          const result = await model.generateContent(prompt);
          const mcqs = JSON.parse(result.response.text());
          
          if (Array.isArray(mcqs) && mcqs.length > 0) {
            const cleaned = cleanOptionalQuestions(mcqs, subject, count);
            if (cleaned.length >= count) {
              console.log(`[MCQ-OPTIONAL-PROMPT] SUCCESS with ${modelId}!`);
              return cleaned;
            }
          }
        } catch (err: any) {
          console.warn(`[MCQ-OPTIONAL-PROMPT] Model ${modelId} failed: ${err.message}`);
          lastError = err;
        }
      }
    } catch (err: any) {
      console.warn(`[MCQ-OPTIONAL-PROMPT] API Key ${keyIdx + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All configured API keys failed to generate optional MCQs from prompt. Last error: ${lastError?.message || lastError}`);
}

async function generateOptionalQuestions(
  adminApp: App,
  className: string,
  subject: string,
  activeDate: string,
  count: number,
  chapterTitle?: string
): Promise<DailyMcqQuestion[]> {
  console.log(`[MCQ-OPTIONAL] Generating ${count} questions for ${className} ${subject} (chapter: ${chapterTitle || 'general'})...`);
  
  // Try to load textbook from bucket
  let bucketResult = null;
  try {
    bucketResult = await loadTextbookFromBucket(adminApp, className, subject, chapterTitle);
  } catch (err: any) {
    console.warn(`[MCQ-OPTIONAL] Could not load textbook from bucket for ${className} ${subject}: ${err.message}`);
  }

  if (bucketResult && bucketResult.driveContent.buffer) {
    const mimeType = bucketResult.driveContent.mimeType || '';

    // If the cached file is plain text (.txt), inject the text directly into the prompt.
    // Do NOT route through generateMcqsWithGemini (Files API PDF path) — it will fail
    // with '400: The document has no pages' because a .txt file is not a PDF.
    if (mimeType === 'text/plain') {
      console.log(`[MCQ-OPTIONAL] Textbook .txt cache found. Generating via text-prompt (skipping PDF Files API)...`);
      try {
        const textContent = bucketResult.driveContent.text || bucketResult.driveContent.buffer.toString('utf8');
        const mcqs = await generateOptionalQuestionsFromPrompt(className, subject, count, chapterTitle, textContent);
        if (mcqs.length >= count) return mcqs;
      } catch (err: any) {
        console.warn(`[MCQ-OPTIONAL] Text-prompt generation failed: ${err.message}. Trying pure fallback.`);
      }
    } else {
      // Real PDF buffer — use Gemini Files API vision path
      try {
        console.log(`[MCQ-OPTIONAL] Textbook PDF found. Generating via PDF vision...`);
        const mcqs = await generateMcqsWithGemini(
          bucketResult.driveContent.buffer,
          count + 2,
          subject,
          className,
          'daily',
          'medium',
          chapterTitle ? [chapterTitle] : undefined
        );
        const cleaned = cleanOptionalQuestions(mcqs, subject, count);
        if (cleaned.length >= count) return cleaned;
        console.warn(`[MCQ-OPTIONAL] PDF generation returned only ${cleaned.length}/${count} valid questions. Falling back to prompt generation.`);
      } catch (err: any) {
        console.warn(`[MCQ-OPTIONAL] PDF generation failed: ${err.message}. Falling back to prompt generation.`);
      }
    }
  }

  // Final fallback: pure prompt generation with no textbook content
  return generateOptionalQuestionsFromPrompt(className, subject, count, chapterTitle);
}

async function generateCoreQuestionsFromPrompt(
  className: string,
  subject: string,
  count: number,
  chapterTitles?: string[]
): Promise<DailyMcqQuestion[]> {
  const keysToTry = getGeminiApiKeys();
  if (keysToTry.length === 0) {
    throw new Error('No GEMINI_API_KEY or GEMINI_ROTATOR_KEYs configured on the server.');
  }

  const targetLanguage = getTargetLanguage(subject);
  const gamificationRules = getGamificationInstructions(subject, className);

  const prompt = `You are a teacher. Generate exactly ${count} questions from the syllabus of subject "${subject}" (Class: ${className}).
${chapterTitles && chapterTitles.length > 0 ? `The questions should focus on the chapters/topics: ${chapterTitles.map(c => `"${c}"`).join(', ')}.` : 'The questions should cover general syllabus-aligned topics suitable for this class.'}
Difficulty: MEDIUM.

MIX:
- First 4 questions: simple 1-mark MCQs.
- Next 3 questions: short 2-mark MCQs or simple subjective.
- Next 2 questions: medium 3-mark subjective questions.
- Last 1 question: detailed 5-mark subjective question.

Rules:
1. Make sure to generate EXACTLY ${count} questions.
2. Keep the question text and options in the original language (${targetLanguage}). If the options are in Odia, capture them as strings in the options array.
3. Provide the correct answer and write a helpful explanation in ${targetLanguage} explaining why that answer is correct.
4. SCHEMA: Array of { "question": string, "options": string[], "correct_answer": string, "explanation": string, "type": "mcq" | "subjective", "chapter": string }.

${gamificationRules}`;

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash-lite"
  ];

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
    const apiKey = keysToTry[keyIdx];
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelId of models) {
        try {
          console.log(`[MCQ-CORE-PROMPT] Prompting ${modelId} with API key ${keyIdx + 1}...`);
          const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: { responseMimeType: "application/json" }
          });

          const result = await model.generateContent(prompt);
          const mcqs = JSON.parse(result.response.text());
          
          if (Array.isArray(mcqs) && mcqs.length > 0) {
            const cleaned = cleanGeneratedQuestions(mcqs, subject);
            if (cleaned.length >= count) {
              console.log(`[MCQ-CORE-PROMPT] SUCCESS with ${modelId}!`);
              return cleaned;
            }
          }
        } catch (err: any) {
          console.warn(`[MCQ-CORE-PROMPT] Model ${modelId} failed: ${err.message}`);
          lastError = err;
        }
      }
    } catch (err: any) {
      console.warn(`[MCQ-CORE-PROMPT] API Key ${keyIdx + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All configured API keys failed to generate core MCQs from prompt. Last error: ${lastError?.message || lastError}`);
}

export function getCoreSubjectsForClass(className: string): string[] {
  const c = className.toLowerCase().trim();
  if (c === 'class1') return ['ganita_khela', 'jhulana_1'];
  if (c === 'class2') return ['maja_majare_ganita', 'jhulana_2'];
  if (c === 'class3') return ['bhasa_mahak_1', 'ganita_mela', 'paribesa_patha', 'pallavi', 'kala_sikhya', 'sharirika_sikhya'];
  if (c === 'class4') return ['ganita_mela', 'bhasa_mahak_2', 'paribesa_patha', 'pallavi', 'kala_sikhya', 'krida_yoga'];
  if (c === 'class5') return ['ganita_mela', 'bhasa_mahak_3', 'ama_chaturbaswara_pruthibi', 'pallavi', 'kala_sikhya', 'sharirika_yoga'];
  if (c === 'class6') return ['ganita_prakas', 'sahitya_sudha', 'jigyasa', 'samajika_bignana', 'jasmine', 'kausala_bodha', 'kalakunja', 'khela_sikhya'];
  if (c === 'class7') return ['ganita_prakas', 'sahitya_suman', 'jigyasa', 'samajika_bignana', 'jasmine', 'kausala_bodha', 'kalakruti', 'khela_sikhya'];
  if (c === 'class8') return ['ganita_prakas', 'sahitya_surabhi', 'jigyasa', 'samajika_bignana', 'jasmine', 'kausala_bodha', 'kruti', 'khela_sikhya'];
  if (c === 'class9' || c === 'class10') {
    return ['math', 'science', 'social_science', 'english', 'odia'];
  }
  return ['general'];
}

function cleanMixedQuestions(questions: any[], targetSubjects: string[]): DailyMcqQuestion[] {
  const rawQuestions = Array.isArray(questions) ? questions : [];
  const cleaned = [];

  for (let i = 0; i < targetSubjects.length; i++) {
    const sub = targetSubjects[i];
    const q = rawQuestions[i] || rawQuestions.find(rq => String(rq?.subject).toLowerCase() === sub.toLowerCase());
    
    let question = String(q?.question || q?.Question || '').trim();
    let options = Array.isArray(q?.options || q?.Options)
      ? (q.options || q.Options).map((o: any) => String(o || '').trim()).filter(Boolean)
      : [];
    let correct_answer = String(q?.correct_answer || q?.Correct_Answer || q?.answer || '').trim();
    let explanation = String(q?.explanation || q?.Explanation || '').trim();
    const type = 'mcq';
    const chapter = String(q?.chapter || q?.Chapter || '').trim();
    
    const isOdia = getExpectedLanguage(sub) === 'odia';
    if (isOdia) {
      question = cleanOdiaOrthographyLocal(question);
      options = options.map(o => cleanOdiaOrthographyLocal(o));
      correct_answer = cleanOdiaOrthographyLocal(correct_answer);
      explanation = cleanOdiaOrthographyLocal(explanation);
    }

    if (!question || options.length < 2 || !correct_answer) {
      cleaned.push(getPlaceholderQuestion(sub, chapter));
    } else {
      cleaned.push({
        question,
        options,
        correct_answer,
        explanation,
        type,
        chapter,
        subject: sub,
        marks: 1
      });
    }
  }

  return cleaned;
}

async function generateMixedCoreQuestionsFromPrompt(
  className: string,
  questionSubjects: string[],
  questionChapters: (string | undefined)[],
  count: number
): Promise<DailyMcqQuestion[]> {
  const keysToTry = getGeminiApiKeys();
  if (keysToTry.length === 0) {
    throw new Error('No GEMINI_API_KEY or GEMINI_ROTATOR_KEYs configured on the server.');
  }

  const questionsDescription = questionSubjects.map((sub, idx) => {
    const ch = questionChapters[idx];
    const lang = getTargetLanguage(sub);
    return `- Question ${idx + 1}: Subject: "${sub}"${ch ? ` (Chapter/Topic: "${ch}")` : ' (General syllabus concepts)'} & Language: ${lang}`;
  }).join('\n');

  const prompt = `You are a teacher. Generate exactly ${count} Multiple-Choice Questions (MCQs) for standard "${className}".
Each question MUST strictly correspond to the specified subject, chapter (if any), and language below:

${questionsDescription}

Rules:
1. Make sure to generate EXACTLY ${count} questions.
2. Each question MUST be a 1-mark Multiple-Choice Question (MCQ) with exactly 4 options.
3. Every question must be worth 1 mark (assign "marks": 1).
4. The difficulty must be MEDIUM.
5. Keep the question text and options in the target language specified for that question. If the options are in Odia, capture them as strings in the options array.
6. Provide the correct answer and write a helpful explanation in the target language explaining why that answer is correct.
7. SCHEMA: Array of { "question": string, "options": string[], "correct_answer": string, "explanation": string, "type": "mcq", "chapter": string, "subject": string }. Ensure "subject" matches the respective subject string from the list above.
8. The questions must be direct, formal, and strictly academic. No cartoon, anime, or gaming characters (e.g., no Naruto, Goku, Bheem, Doraemon, BGMI, Free Fire, etc.).
9. The explanations must be professional, educational, and explain the core concept directly without casual remarks or character dialogues.
10. Do NOT use raw LaTeX mathematical symbols or formatting delimiters (like $$, $, \\[, \\], \\frac, \\sqrt). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.
11. ODIA ORTHOGRAPHY & SPELLING (ଯୁକ୍ତାକ୍ଷର): When generating text in Odia, ensure absolute correctness of spelling and conjunct letters (ଯୁକ୍ତାକ୍ଷର, e.g., using proper ligatures like ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ଳ, ନ୍ତ, etc.). Avoid broken Unicode combinations (like ନ୍‌ଦ or ନ୍‌ଧ) and ensure historical names or terms (like "ଦାଣ୍ଡି ଯାତ୍ରା" / "Dandi March") are spelled exactly as they appear in standard Odia textbooks.
12. SANSKRIT/HINDI ORTHOGRAPHY: If any question is for Sanskrit or Hindi, use clean Devanagari script (देवनागरी लिपि) with proper conjuncts and halants.`;

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash-lite"
  ];

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
    const apiKey = keysToTry[keyIdx];
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelId of models) {
        try {
          console.log(`[MCQ-MIXED-PROMPT] Prompting ${modelId} with API key ${keyIdx + 1}...`);
          const model = genAI.getGenerativeModel({
            model: modelId,
            generationConfig: { responseMimeType: "application/json" }
          });

          const result = await model.generateContent(prompt);
          const mcqs = JSON.parse(result.response.text());
          
          if (Array.isArray(mcqs) && mcqs.length > 0) {
            const cleaned = cleanMixedQuestions(mcqs, questionSubjects);
            if (cleaned.length >= count) {
              console.log(`[MCQ-MIXED-PROMPT] SUCCESS with ${modelId}!`);
              return cleaned;
            }
          }
        } catch (err: any) {
          console.warn(`[MCQ-MIXED-PROMPT] Model ${modelId} failed: ${err.message}`);
          lastError = err;
        }
      }
    } catch (err: any) {
      console.warn(`[MCQ-MIXED-PROMPT] API Key ${keyIdx + 1} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All configured API keys failed to generate mixed core MCQs from prompt. Last error: ${lastError?.message || lastError}`);
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
  let coreQuestions: DailyMcqQuestion[] = [];
  let source: GeneratedDailyMcqResult['source'] = {
    textbookId: 'prompt-generation',
    textbookTitle: 'Prompt Generated Core Set'
  };

  const targetChapter = Array.isArray(params.chapters) && params.chapters.length > 0 ? params.chapters[0] : undefined;

  if (params.subject === 'mixed') {
    const coreSubjects = getCoreSubjectsForClass(params.className);
    const questionSubjects: string[] = [];
    for (let i = 0; i < 10; i++) {
      questionSubjects.push(coreSubjects[i % coreSubjects.length]);
    }

    const db = getDatabase(adminApp, databaseId);
    const dateObj = new Date(params.activeDate);
    const dayOfMonth = dateObj.getDate();

    let activeChapters: any[] = [];
    const normalizedClassName = params.className.toLowerCase().trim();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = monthNames[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    const monthStr = params.monthString || `${monthName} ${year}`;

    if (normalizedClassName === 'class9' || normalizedClassName === 'class10') {
      const activeMilestoneKey = getActiveMilestoneKeyForDate(params.activeDate);
      const milestones = normalizedClassName === 'class9' ? BSE_SYLLABUS_MAPPING_9 : BSE_SYLLABUS_MAPPING_10;
      const activeMilestone = milestones.find(m => m.key === activeMilestoneKey);
      if (activeMilestone) {
        try {
          const allChaptersSnapshot = await db.collection('chapters')
            .where('class', '==', params.className)
            .get();
          const allChapters: any[] = [];
          allChaptersSnapshot.forEach(doc => {
            const data = doc.data();
            allChapters.push({
              id: doc.id,
              title: data.title || '',
              title_en: data.title_en || null,
              title_or: data.title_or || null,
              subject: data.subject || 'other'
            });
          });
          for (const subKey of Object.keys(activeMilestone.subjects)) {
            const allowedSubstrings = activeMilestone.subjects[subKey];
            const matched = allChapters.filter(ch => {
              const stdSub = mapRoadmapSubjectToGranular(ch.subject, ch.title || ch.title_en || ch.title_or);
              if (stdSub !== subKey) return false;
              const titleStr = `${ch.title || ''} ${ch.title_en || ''} ${ch.title_or || ''}`.toLowerCase();
              return allowedSubstrings.some(allowed => titleStr.includes(allowed.toLowerCase()));
            });
            activeChapters.push(...matched);
          }
        } catch (e) {
          console.warn("[MCQ-AUTO] Failed to load chapters for optional/core details:", e);
        }
      }
    } else {
      const classRoadmap = ROADMAPS_BY_CLASS[normalizedClassName];
      if (classRoadmap) {
        const targetMonths = [monthStr];
        if (monthStr === 'July 2026') {
          targetMonths.push('June 2026');
        }
        activeChapters = [];
        for (const mStr of targetMonths) {
          const monthEntry = classRoadmap.find(entry => entry.month === mStr);
          if (monthEntry && Array.isArray(monthEntry.chapters)) {
            activeChapters.push(...monthEntry.chapters);
          }
        }
      }
    }

    const questionChapters: (string | undefined)[] = [];
    for (let i = 0; i < 10; i++) {
      const sub = questionSubjects[i];
      const subChapters = activeChapters.filter((ch: any) => mapRoadmapSubjectToStandard(ch.subject) === sub);
      let chTitle = undefined;
      if (subChapters.length > 0) {
        const chIdx = (dayOfMonth - 1 + i) % subChapters.length;
        const chosen = subChapters[chIdx];
        chTitle = chosen.title_or || chosen.title_en || chosen.title || undefined;
      }
      questionChapters.push(chTitle);
    }

    console.log(`[MCQ-AUTO] Generating 10 mixed core MCQs for subjects:`, questionSubjects);
    coreQuestions = await generateMixedCoreQuestionsFromPrompt(
      params.className,
      questionSubjects,
      questionChapters,
      10
    );
  } else {
    // Keep single subject fallback vision generation just in case
    let bucketResult = null;
    try {
      bucketResult = await loadTextbookFromBucket(adminApp, params.className, params.subject, targetChapter);
    } catch (error: any) {
      console.warn(`[MCQ-AUTO] Failed to load textbook from bucket for core: ${error.message}`);
    }

    if (bucketResult && bucketResult.driveContent.buffer) {
      try {
        console.log(`[MCQ-AUTO] Textbook PDF found for core subject. Generating via PDF vision...`);
        coreQuestions = await generateQuestionsFromText({
          className: params.className,
          subject: params.subject,
          board: params.board || 'odisha',
          activeDate: params.activeDate,
          pdfBuffer: bucketResult.driveContent.buffer,
          chapters: params.chapters,
        });
        source = bucketResult.source;
      } catch (error: any) {
        console.warn(`[MCQ-AUTO] PDF generation failed for core: ${error.message}. Falling back to prompt generation...`);
      }
    }

    if (coreQuestions.length === 0) {
      console.log(`[MCQ-AUTO] No textbook PDF or PDF generation failed. Generating core questions via prompt...`);
      coreQuestions = await generateCoreQuestionsFromPrompt(
        params.className,
        params.subject,
        DAILY_MCQ_QUESTION_COUNT,
        params.chapters
      );
      while (coreQuestions.length < DAILY_MCQ_QUESTION_COUNT) {
        coreQuestions.push(getPlaceholderQuestion(params.subject, targetChapter));
      }
    }
  }

  let finalQuestions = [...coreQuestions];
  const normalizedClassName = params.className.toLowerCase().trim();
  const dateObj = new Date(params.activeDate);
  const dayOfMonth = dateObj.getDate();

  if (normalizedClassName === 'class9' || normalizedClassName === 'class10') {
    const db = getDatabase(adminApp, databaseId);
    console.log(`[MCQ-AUTO] Class 9/10 detected. Generating optional subjects for daily set...`);
    
    // Hindi (2 questions)
    const hindiChapter = await getChapterForOptionalSubject(db, params.className, 'hindi', dayOfMonth);
    const hindiQuestions = await generateOptionalQuestions(
      adminApp,
      params.className,
      'hindi',
      params.activeDate,
      2,
      hindiChapter
    );
    while (hindiQuestions.length < 2) {
      hindiQuestions.push(getPlaceholderQuestion('hindi', hindiChapter));
    }

    // Sanskrit (2 questions)
    const sanskritChapter = await getChapterForOptionalSubject(db, params.className, 'sanskrit', dayOfMonth);
    const sanskritQuestions = await generateOptionalQuestions(
      adminApp,
      params.className,
      'sanskrit',
      params.activeDate,
      2,
      sanskritChapter
    );
    while (sanskritQuestions.length < 2) {
      sanskritQuestions.push(getPlaceholderQuestion('sanskrit', sanskritChapter));
    }

    finalQuestions = [
      ...coreQuestions,
      ...hindiQuestions,
      ...sanskritQuestions
    ];

    if (normalizedClassName === 'class10') {
      // Vocational (1 question)
      const vocationalChapter = await getChapterForOptionalSubject(db, params.className, 'vocational', dayOfMonth);
      const vocationalQuestions = await generateOptionalQuestions(
        adminApp,
        params.className,
        'vocational',
        params.activeDate,
        1,
        vocationalChapter
      );
      while (vocationalQuestions.length < 1) {
        vocationalQuestions.push(getPlaceholderQuestion('vocational', vocationalChapter));
      }

      finalQuestions = [
        ...finalQuestions,
        ...vocationalQuestions
      ];
    }
  }

  return {
    title: params.title?.trim() || (params.subject === 'mixed'
      ? `${params.className.replace(/class/i, 'Class ')} Daily Challenge`
      : `${getSubjectLabel(params.subject)} Daily Practice`),
    class: params.className,
    subject: params.subject,
    board: params.board || 'odisha',
    activeDate: params.activeDate,
    status: params.status || 'draft',
    month: params.monthString,
    questions: finalQuestions,
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

function getActiveMilestoneKeyForDate(dateString: string): 'ia1' | 'ia2' | 'half_yearly' | 'ia3' | 'ia4' | 'annual' {
  const now = new Date(dateString);
  const month = now.getMonth(); // 0 = Jan, 5 = Jun, 6 = Jul, 8 = Sep, 10 = Nov
  const date = now.getDate();

  // June 1 to July 15 -> ia1
  if (month === 5 || (month === 6 && date <= 15)) {
    return 'ia1';
  }
  // July 16 to August 31 -> ia2
  if ((month === 6 && date > 15) || month === 7) {
    return 'ia2';
  }
  // September 1 to September 15 -> half_yearly
  if (month === 8 && date <= 15) {
    return 'half_yearly';
  }
  // September 16 to November 15 -> ia3
  if ((month === 8 && date > 15) || month === 9 || (month === 10 && date <= 15)) {
    return 'ia3';
  }
  // November 16 to January 15 -> ia4
  if ((month === 10 && date > 15) || month === 11 || (month === 0 && date <= 15)) {
    return 'ia4';
  }
  // January 16 to May 31 -> annual
  return 'annual';
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

function mapRoadmapSubjectToGranular(roadmapSubject: string, chapterTitle?: string): string {
  const chSub = String(roadmapSubject || '').toLowerCase().trim();
  const titleText = String(chapterTitle || '').toLowerCase();
  
  const stdSub = chSub.includes('algebra') ? 'algebra' :
                 chSub.includes('geometry') ? 'geometry' :
                 chSub.includes('math') ? 'math' :
                 chSub.includes('life_science') ? 'life_science' :
                 chSub.includes('physical_science') ? 'physical_science' :
                 chSub.includes('social_science') ? 'social_science' :
                 chSub.includes('science') ? 'physical_science' :
                 (chSub.includes('social') || chSub.includes('history')) ? 'social_science' :
                 chSub.includes('geography') ? (
                   (titleText.includes('econom') || 
                    titleText.includes('price') || 
                    titleText.includes('consumer') || 
                    titleText.includes('poverty') || 
                    titleText.includes('unemploy') || 
                    titleText.includes('industrial') || 
                    titleText.includes('enterpris') ||
                    titleText.includes('ଅର୍ଥ') ||
                    titleText.includes('ଦର') ||
                    titleText.includes('ଭୋକ୍ତା')
                   ) ? 'economics' : 'geography'
                 ) :
                 chSub.includes('economics') ? 'economics' :
                 chSub.includes('english_grammar') ? 'english_grammar' :
                 chSub.includes('english') ? 'english' :
                 chSub.includes('odia_grammar') ? 'odia_grammar' :
                 chSub.includes('odia') ? 'odia' : chSub;
                 
  return stdSub;
}

function mapRoadmapSubjectToStandard(roadmapSubject: string): string {
  const raw = String(roadmapSubject || '').toLowerCase().trim();
  
  // Normalize spaces/punctuation/underscores
  const s = raw.replace(/\s+/g, '_').replace(/[\(\)]/g, '');

  // Math
  if (
    s === 'math' || s === 'mathematics' || s === 'algebra' || s === 'geometry' ||
    s === 'ganita_khela' || s === 'ganita_mela' || s === 'ganita_prakas' || s === 'maja_majare_ganita'
  ) {
    return 'math';
  }

  // Odia
  if (
    s === 'odia' || s === 'odia_grammar' || s === 'sahitya' || s === 'ସାହିତ୍ୟ' ||
    s === 'odia_grammar_odia_grammar' || s === 'ଓଡ଼ିଆ_ବ୍ୟାକରଣ_odia_grammar' ||
    s === 'jhulana_1' || s === 'jhulana_2' ||
    s === 'bhasa_mahak_1' || s === 'bhasa_mahak_2' || s === 'bhasa_mahak_3' ||
    s === 'sahitya_sudha' || s === 'sahitya_suman' || s === 'sahitya_surabhi'
  ) {
    return 'odia';
  }

  // English
  if (
    s === 'english' || s === 'english_grammar' ||
    s === 'pallavi' || s === 'jasmine'
  ) {
    return 'english';
  }

  // EVS
  if (
    s === 'evs' || s === 'paribesa_patha' || s === 'ama_chaturbaswara_pruthibi'
  ) {
    return 'evs';
  }

  // Science
  if (
    s === 'science' || s === 'physical_science' || s === 'life_science' ||
    s === 'science_curiosity' || s === 'jigyasa' ||
    s.includes('life_science') || s.includes('physical_science') || s.includes('ଜୀବବିଜ୍ଞାନ')
  ) {
    return 'science';
  }

  // Social Science
  if (
    s === 'social_science' || s === 'history' || s === 'geography' ||
    s === 'samajika_bignana'
  ) {
    return 'social_science';
  }

  // Sanskrit
  if (
    s === 'sanskrit' || s === 'sanskrit_grammar' ||
    s === 'sanskritakalika_1' || s === 'sanskritakalika_2' || s === 'sanskritakalika_3'
  ) {
    return 'sanskrit';
  }

  // Hindi
  if (
    s === 'hindi' || s === 'hindi_grammar' || s === 'hindi_kalika'
  ) {
    return 'hindi';
  }

  // Vocational
  if (
    s === 'vocational' || s === 'kausala_bodha' ||
    s === 'vocational_agriculture' || s === 'vocational_automotive' ||
    s === 'vocational_tourism' || s === 'vocational_electronics'
  ) {
    return 'vocational';
  }

  // Art
  if (
    s === 'art' || s === 'kala_sikhya' || s === 'kala_kruti' ||
    s === 'kalakruti' || s === 'kalakunja' || s === 'kruti'
  ) {
    return 'art';
  }

  // Physical Education
  if (
    s === 'physical_education' || s === 'physical' ||
    s === 'khela_sikhya' || s === 'krida_yoga' ||
    s === 'sharirika_sikhya' || s === 'sharirika_yoga'
  ) {
    return 'physical_education';
  }

  return raw;
}

export async function runScheduledGeneration(adminApp: App, databaseId: string, dateString?: string, specificClassName?: string, forceRegenerate: boolean = false) {
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

      // 1. Get the roadmap / syllabus chapters for this class
      const normalizedClassName = className.toLowerCase().trim();
      let activeChapters: any[] = [];

      if (normalizedClassName === 'class9' || normalizedClassName === 'class10') {
        // Class 9 or 10 -> Use Official BSE Syllabus Milestone mapping
        const activeMilestoneKey = getActiveMilestoneKeyForDate(activeDate);
        console.log(`[MCQ-AUTO] Class 9/10 active milestone: ${activeMilestoneKey}`);
        const milestones = normalizedClassName === 'class9' ? BSE_SYLLABUS_MAPPING_9 : BSE_SYLLABUS_MAPPING_10;
        const activeMilestone = milestones.find(m => m.key === activeMilestoneKey);
        
        if (activeMilestone) {
          // Fetch all chapters from database for this class, and filter based on title matching
          console.log(`[MCQ-AUTO] Loading all database chapters for ${className}...`);
          const allChaptersSnapshot = await db.collection('chapters')
            .where('class', '==', className)
            .get();
            
          const allChapters: any[] = [];
          allChaptersSnapshot.forEach(doc => {
            const data = doc.data();
            allChapters.push({
              id: doc.id,
              title: data.title || '',
              title_en: data.title_en || null,
              title_or: data.title_or || null,
              subject: data.subject || 'other'
            });
          });
          
          // Map database chapters to milestone subjects
          for (const subKey of Object.keys(activeMilestone.subjects)) {
            const allowedSubstrings = activeMilestone.subjects[subKey];
            
            const matchedChaptersForSub = allChapters.filter(ch => {
              const stdSub = mapRoadmapSubjectToGranular(ch.subject, ch.title || ch.title_en || ch.title_or);
              if (stdSub !== subKey) return false;
              
              const titleStr = `${ch.title || ''} ${ch.title_en || ''} ${ch.title_or || ''}`.toLowerCase();
              return allowedSubstrings.some(allowed => 
                titleStr.includes(allowed.toLowerCase())
              );
            });
            
            activeChapters.push(...matchedChaptersForSub);
          }
          console.log(`[MCQ-AUTO] Class 9/10 matched active chapters count: ${activeChapters.length}`);
        }
      } else {
        // Lower classes -> Use standard monthly roadmap
        const classRoadmap = ROADMAPS_BY_CLASS[normalizedClassName];
        if (classRoadmap) {
          const targetMonths = [monthString];
          if (monthString === 'July 2026') {
            targetMonths.push('June 2026');
          }
          activeChapters = [];
          for (const mStr of targetMonths) {
            const monthEntry = classRoadmap.find(entry => entry.month === mStr);
            if (monthEntry && Array.isArray(monthEntry.chapters)) {
              activeChapters.push(...monthEntry.chapters);
            }
          }
        }
      }

      // Always generate exactly one mixed set containing questions from multiple subjects
      const subjectsToGenerate = ['mixed'];

      console.log(`[MCQ-AUTO] Subjects to generate for ${className}:`, subjectsToGenerate);

      for (const subject of subjectsToGenerate) {
        const docId = `${className}_${subject}_${activeDate}`;
        const existingDoc = await db.collection('daily_mcqs').doc(docId).get();

        if (existingDoc.exists) {
          if (!forceRegenerate) {
            console.log(`[MCQ-AUTO] Skipped ${className} ${subject}: Daily set already exists for this date. (Use force to overwrite)`);
            skipped.push({ className: `${className} (${subject})`, reason: 'Daily set already exists for this class, subject, and date.' });
            continue;
          } else {
            console.log(`[MCQ-AUTO] Force overwrite enabled. Deleting existing daily set for ${className} ${subject} on ${activeDate}...`);
            await db.collection('daily_mcqs').doc(docId).delete();
          }
        }

        let selectedChapterTitles: string[] | undefined = undefined;

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
    
    // 1. Get translations for class name (excluding subject name to avoid confusion as requested)
    const classLabel = translations.en.classes?.[className as keyof typeof translations.en.classes] || className;
    const classLabelOr = translations.or.classes?.[className as keyof typeof translations.or.classes] || className;

    const notifTitle = `Daily MCQ Live 📝`;
    const notifTitleOr = `ଦୈନିକ MCQ ଲାଇଭ୍ 📝`;
    
    const notifMessage = `Today's Daily MCQ for ${classLabel} is now live. Solve it now to earn XP! 🚀`;
    const notifMessageOdia = `ଆଜିର ${classLabelOr} ପାଇଁ ଦୈନିକ MCQ ଲାଇଭ୍ ହୋଇଯାଇଛି। ସମାଧାନ କରି XP ହାସଲ କରନ୍ତୁ! 🚀`;

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
      const force = req.body?.force === true || req.query?.force === 'true' || req.body?.forceRegenerate === true || req.query?.forceRegenerate === 'true';
      const result = await runScheduledGeneration(adminApp, databaseId, activeDate, className, force);
      return res.json(result);
    } catch (error: unknown) {
      console.error('Run Daily MCQ Automation Error:', error);
      const { status, body } = adminRouteErrorResponse(error, 'Failed to run daily MCQ automation.');
      return res.status(status).json(body);
    }
  });

}
