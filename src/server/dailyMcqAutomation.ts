import { GoogleGenAI } from '@google/genai';
import type { Express } from 'express';
import type { App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { google } from 'googleapis';
import cron from 'node-cron';
// PDF extraction helper for ESM/CJS interop
let PDFParse: any;
try {
  PDFParse = require('pdf-parse');
  if (PDFParse && PDFParse.default) PDFParse = PDFParse.default;
} catch (e) {
  try {
    PDFParse = (await import('pdf-parse')).default || (await import('pdf-parse'));
  } catch (e2) {
    throw new Error('pdf-parse module could not be loaded');
  }
}

async function extractPdfText(buffer: Buffer) {
  // Try as function (CJS), then as constructor (ESM)
  if (typeof PDFParse === 'function') {
    const parsed = await PDFParse(buffer);
    return parsed.text || '';
  }
  if (typeof PDFParse === 'object' && typeof PDFParse === 'function') {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    return parsed.text || '';
  }
  throw new Error('pdf-parse is not a valid function or class');
}
import { getRotatingDailyMcqSubject } from '../utils/dailyMcq';
import { translations } from '../translations';
import { createGoogleAuth } from './googleCredentials';

const DEFAULT_AUTOMATION_TIME = '07:00';
const DEFAULT_AUTOMATION_TIME_ZONE = 'Asia/Kolkata';
const DEFAULT_AUTOMATION_STATUS = 'draft';
const MAX_SOURCE_TEXT_LENGTH = 18000;
const DEFAULT_ENABLED_CLASSES = Array.from({ length: 10 }, (_, index) => `class${index + 1}`);

type DailyMcqQuestion = {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
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

  return new GoogleGenAI({ apiKey });
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

    return {
      text: Buffer.from(exportResponse.data as ArrayBuffer).toString('utf8'),
      fileName,
      mimeType,
    };
  }

  const fileResponse = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );
  const fileBuffer = Buffer.from(fileResponse.data as ArrayBuffer);

  if (mimeType === 'application/pdf') {
    return {
      text: await extractPdfText(fileBuffer),
      fileName,
      mimeType,
    };
  }

  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('xml')) {
    return {
      text: fileBuffer.toString('utf8'),
      fileName,
      mimeType,
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
  const response = await fetch(url);
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

const TEXTBOOK_BUCKET_NAME = process.env.TEXTBOOK_STORAGE_BUCKET || 'run-sources-utkalskillcentre-us-central1';

const SUBJECT_FILE_KEYWORDS: Record<string, string[]> = {
  // Language subjects
  odia: ['sahitya sudha', 'sahitya surabhi', 'bhasha mahak', 'bhasa nahak', 'jhulana', 'odia'],
  odia_grammar: ['odia grammar'],
  english: ['pallavi', 'jasmine', 'english'],
  english_grammar: ['english grammar'],
  hindi: ['hindi kalika', 'hindi manjari', 'hindi saurabh', 'hindi'],
  hindi_grammar: ['hindi grammar', 'hindi byakaran'],
  sanskrit: ['sanskruta kalika', 'sanaskruta kalika', 'sanskruta sourav', 'sanskruta', 'sanskrit'],
  sanskrit_grammar: ['sanskrit grammar'],
  // Math
  math: ['ganita mela', 'ganita prakash', 'maja majare ganita', 'algebra', 'geometry', 'ganita', 'math'],
  algebra: ['algebra'],
  geometry: ['geometry'],
  // Science
  science: ['physical science', 'life science', 'science'],
  science_curiosity: ['jingyasha', 'jigyansa'],
  physical_science: ['physical science'],
  life_science: ['life science'],
  // Social
  history: ['history'],
  geography: ['geography'],
  social_science: ['social science', 'samajika bigyan'],
  // EVS (classes 3-5)
  evs: ['bichitra pruthibi', 'ama bichitra biswa', 'bichitra biswa', 'evs'],
  // Arts & physical
  art: ['indradhanu', 'kalakunja', 'nabarasa', 'kruti', 'art'],
  art_health: ['indradhanu', 'nabarasa', 'art', 'health'],
  physical_education: ['khela o yoga', 'khelajoga', 'krida yoga', 'khel shikhya', 'khela sahitya', 'physical education'],
  // Vocational
  vocational: ['koshalbodha', 'kousalabodha', 'vocational'],
};

async function loadTextbookFromBucket(adminApp: App, className: string, subject: string): Promise<{ driveContent: DriveContentResult; source: GeneratedDailyMcqResult['source'] } | null> {
  const classDigit = className.replace(/[^0-9]/g, '');
  const classFolder = `Class ${classDigit}/`;
  const subjectKey = normalizeSubjectKey(subject);
  const keywords = SUBJECT_FILE_KEYWORDS[subjectKey] || [subjectKey.replace(/_/g, ' '), getSubjectLabel(subject).toLowerCase()];

  try {
    const bucket = getAdminStorage(adminApp).bucket(TEXTBOOK_BUCKET_NAME);
    const [files] = await bucket.getFiles({ prefix: classFolder, maxResults: 100 });
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));

    if (!pdfFiles.length) return null;

    // Score each file by keyword match (prefer more specific match)
    const scored = pdfFiles.map((f) => {
      const lower = f.name.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) score += kw.split(' ').length + 1;
      }
      return { file: f, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best.score <= 0) return null;

    const [buffer] = await best.file.download();
    const text = await extractPdfText(buffer);
    return {
      driveContent: {
        text,
        fileName: best.file.name.split('/').pop() || best.file.name,
        mimeType: 'application/pdf',
      },
      source: {
        textbookId: `bucket:${best.file.name}`,
        textbookTitle: best.file.name.split('/').pop() || best.file.name,
        driveFileName: best.file.name,
        mimeType: 'application/pdf',
      },
    };
  } catch (error: any) {
    console.warn(`Bucket textbook load failed for ${className}/${subject}:`, error?.message);
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

  const driveFileId = extractDriveFileId(textbook.driveFileId || textbook.driveUrl);
  if (!driveFileId) {
    throw new Error(`Textbook ${textbook.title || textbook.id} does not have a usable download URL or Drive source.`);
  }

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
      sourceUrl: String(textbook.driveUrl || '').trim() || undefined,
      driveFileName: driveContent.fileName,
      mimeType: driveContent.mimeType,
    },
  };
}

function cleanGeneratedQuestions(questions: any[]): DailyMcqQuestion[] {
  return (Array.isArray(questions) ? questions : [])
    .map((question) => ({
      question: String(question?.question || '').trim(),
      options: Array.isArray(question?.options)
        ? question.options.map((option: any) => String(option || '').trim()).filter(Boolean)
        : [],
      correct_answer: String(question?.correct_answer || '').trim(),
      explanation: String(question?.explanation || '').trim(),
    }))
    .filter((question) => question.question && question.options.length >= 2 && question.correct_answer && question.options.includes(question.correct_answer))
    .slice(0, 5);
}

async function generateQuestionsFromText(input: {
  className: string;
  subject: string;
  board?: string;
  activeDate: string;
  sourceText: string;
}) {
  const ai = getGeminiClient();
  const subjectLabel = getSubjectLabel(input.subject);
  const classLabel = getClassLabel(input.className);
  const trimmedSource = input.sourceText.replace(/\s+/g, ' ').trim().slice(0, MAX_SOURCE_TEXT_LENGTH);

  if (!trimmedSource) {
    throw new Error('No readable textbook content was extracted from the selected Drive file.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',
    contents: `Create 5 daily multiple-choice questions for ${classLabel} on ${subjectLabel}${input.board ? ` for ${input.board}` : ''}. The questions must be based only on the textbook content below and suitable for school students. Keep options short, clear, and syllabus-aligned. Return strict JSON with this shape only: {"questions":[{"question":"...","options":["...","...","...","..."],"correct_answer":"...","explanation":"..."}]}. Textbook content: ${trimmedSource}`,
    config: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  let rawText = response.text || '{}';
  // Strip markdown code fences if present
  rawText = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Sanitise bad escape sequences that Gemini sometimes produces from Odia content
  rawText = rawText.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  const parsed = JSON.parse(rawText);
  const questions = cleanGeneratedQuestions(parsed.questions);

  if (questions.length !== 5) {
    throw new Error('The AI response did not return 5 valid MCQ questions.');
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
  const existingSnapshot = await db
    .collection('daily_mcqs')
    .where('class', '==', result.class)
    .where('activeDate', '==', result.activeDate)
    .get();

  const payload = {
    title: result.title,
    class: result.class,
    subject: result.subject,
    activeDate: result.activeDate,
    status: result.status,
    questions: result.questions,
    source: result.source,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existingSnapshot.empty) {
    const target = existingSnapshot.docs[0];
    await target.ref.set(payload, { merge: true });
    return { id: target.id, ...payload };
  }

  const created = await db.collection('daily_mcqs').add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id: created.id, ...payload };
}

async function buildGeneratedDailyMcq(adminApp: App, databaseId: string, params: {
  className: string;
  subject: string;
  activeDate: string;
  board?: string;
  title?: string;
  status?: 'draft' | 'published';
}) {
  let driveContent: DriveContentResult;
  let source: GeneratedDailyMcqResult['source'];

  // 1. Try loading from Firebase Storage bucket (preferred)
  const bucketResult = await loadTextbookFromBucket(adminApp, params.className, params.subject);
  if (bucketResult) {
    driveContent = bucketResult.driveContent;
    source = bucketResult.source;
  } else {
    // 2. Try Firestore textbook record (download_url or Drive link)
    const textbook = await findMatchingTextbookSource(adminApp, databaseId, params);
    if (textbook) {
      const textbookSource = await getTextbookContentFromSource(textbook, params.className, params.subject);
      driveContent = textbookSource.driveContent;
      source = textbookSource.source;
    } else {
      // 3. Fallback to shared Drive folder
      const fallback = await getFallbackDriveContent(params.className, params.subject);
      if (!fallback) {
        throw new Error(`No textbook source found for ${params.className} ${params.subject}. Upload PDFs to the storage bucket under "Class X/" folders, or add a textbook with a download URL in admin.`);
      }
      driveContent = fallback.driveContent;
      source = fallback.source;
    }
  }
  const questions = await generateQuestionsFromText({
    className: params.className,
    subject: params.subject,
    board: params.board || 'odisha',
    activeDate: params.activeDate,
    sourceText: driveContent.text,
  });

  return {
    title: params.title?.trim() || `${getSubjectLabel(params.subject)} Daily Practice`,
    class: params.className,
    subject: params.subject,
    activeDate: params.activeDate,
    status: params.status || 'draft',
    questions,
    source,
  } satisfies GeneratedDailyMcqResult;
}

async function runScheduledGeneration(adminApp: App, databaseId: string, dateString?: string) {
  const db = getDatabase(adminApp, databaseId);
  const settingsDoc = await db.collection('system_settings').doc('config').get();
  const settings = (settingsDoc.data() || {}) as AutomationSettings;
  const activeDate = dateString || new Date().toISOString().split('T')[0];
  const effectiveClasses = Array.isArray(settings.enabledClasses) && settings.enabledClasses.length > 0
    ? settings.enabledClasses
    : DEFAULT_ENABLED_CLASSES;
  const hasCustomRotation = Array.isArray(settings.dailyMcqSubjectRotation) && settings.dailyMcqSubjectRotation.length > 0;
  const status = settings.dailyMcqAutomationPublishMode === 'published' ? 'published' : DEFAULT_AUTOMATION_STATUS;

  // Per-class subject lists from subjectsByClass; fall back to admin rotation or global default
  const subjectsByClass = (translations.en as any).subjectsByClass?.odisha as Record<string, string[]> | undefined;

  const generated: Array<{ className: string; subject: string; id: string }> = [];
  const skipped: Array<{ className: string; reason: string }> = [];

  for (const className of effectiveClasses) {
    try {
      const existing = await db.collection('daily_mcqs').where('class', '==', className).where('activeDate', '==', activeDate).get();
      if (!existing.empty) {
        skipped.push({ className, reason: 'Daily set already exists for this class and date.' });
        continue;
      }

      // Use class-specific subject list (Option A), unless admin overrode with a custom rotation
      const classSubjects = (!hasCustomRotation && subjectsByClass?.[className]) || undefined;
      const subject = getRotatingDailyMcqSubject(activeDate, classSubjects || settings.dailyMcqSubjectRotation);

      const generatedSet = await buildGeneratedDailyMcq(adminApp, databaseId, {
        className,
        subject,
        activeDate,
        status,
      });
      const saved = await upsertDailyMcq(adminApp, databaseId, generatedSet);
      generated.push({ className, subject, id: String(saved.id) });
    } catch (error: any) {
      skipped.push({ className, reason: error?.message || 'Unknown generation error' });
    }
  }

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

export function registerDailyMcqAutomation(app: Express, adminApp: App | null, databaseId: string) {
  app.post('/api/admin/daily-mcqs/generate-from-drive', async (req, res) => {
    try {
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized. Set FIREBASE_PROJECT_ID or provide firebase-applet-config.json on the server.' });
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
    } catch (error: any) {
      console.error('Generate Daily MCQ From Drive Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to generate daily MCQ from Drive.' });
    }
  });

  app.post('/api/admin/daily-mcqs/run-auto', async (req, res) => {
    try {
      if (!adminApp) {
        return res.status(503).json({ error: 'Firebase Admin is not initialized. Set FIREBASE_PROJECT_ID or provide firebase-applet-config.json on the server.' });
      }

      const activeDate = String(req.body?.activeDate || '').trim() || undefined;
      const result = await runScheduledGeneration(adminApp, databaseId, activeDate);
      return res.json(result);
    } catch (error: any) {
      console.error('Run Daily MCQ Automation Error:', error);
      return res.status(500).json({ error: error?.message || 'Failed to run daily MCQ automation.' });
    }
  });

  if (adminApp && !schedulerStarted) {
    schedulerStarted = true;
    cron.schedule('* * * * *', async () => {
      try {
        await tickAutomation(adminApp, databaseId);
      } catch (error) {
        console.error('Daily MCQ scheduler tick failed:', error);
      }
    });
    console.log('Daily MCQ automation scheduler registered.');
  }
}