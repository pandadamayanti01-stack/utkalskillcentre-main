import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getTargetLanguage(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('english')) return 'English';
  if (s.includes('odia')) return 'Odia (ଓଡ଼ିଆ)';
  if (s.includes('hindi')) return 'Hindi (ହିନ୍ଦୀ)';
  if (s.includes('sanskrit')) return 'Sanskrit (ସଂସ୍କୃତ)';
  return 'Odia (ଓଡ଼ିଆ)';
}

/**
 * Intelligent Slicing: If PDF is too large, extract a manageable range of pages.
 */
async function focusPdfContent(pdfBuffer: Buffer): Promise<Buffer> {
  // If under 25MB, don't slice
  if (pdfBuffer.length < 25 * 1024 * 1024) return pdfBuffer;
  
  console.log(`[GeminiMCQ] File too large (${(pdfBuffer.length/1024/1024).toFixed(1)}MB). Slicing pages for focus...`);
  
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Create a new document with only the first 80 pages (or less if it's smaller)
    const newPdfDoc = await PDFDocument.create();
    const pagesToCopy = Math.min(pageCount, 80);
    const indices = Array.from({ length: pagesToCopy }, (_, i) => i);
    
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, indices);
    copiedPages.forEach(page => newPdfDoc.addPage(page));
    
    const slicedBuffer = Buffer.from(await newPdfDoc.save());
    console.log(`[GeminiMCQ] Sliced PDF to ${pagesToCopy} pages. New size: ${(slicedBuffer.length/1024/1024).toFixed(1)}MB`);
    return slicedBuffer;
  } catch (err) {
    console.error("[GeminiMCQ] Slicing failed, trying original buffer:", err);
    return pdfBuffer;
  }
}

export async function generateMcqsWithGemini(
  pdfBuffer: Buffer,
  count: number = 10,
  subject: string = 'general',
  mode: 'daily' | 'monthly' = 'daily',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<any[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);
  const targetLanguage = getTargetLanguage(subject);

  // Focus the content if it's a massive book
  const processedBuffer = await focusPdfContent(pdfBuffer);

  const tempPath = path.join(os.tmpdir(), `usc_gen_${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, processedBuffer);

  try {
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: "application/pdf",
      displayName: `Book_${subject}_Focused`,
    });

    const file = uploadResult.file;
    let activeFile = await fileManager.getFile(file.name);
    let attempts = 0;
    while (activeFile.state === FileState.PROCESSING && attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      activeFile = await fileManager.getFile(file.name);
      attempts++;
    }

    if (activeFile.state !== FileState.ACTIVE) throw new Error("File focus failed.");
    console.log("[GeminiMCQ] Focused File ACTIVE.");

    const prompt = `You are a teacher. Generate exactly ${mode === 'monthly' ? 23 : count} questions from this book for a Daily Practice set.
       MIX: 
       - First 4 questions: simple 1-mark MCQs.
       - Next 3 questions: short 2-mark MCQs or simple subjective.
       - Next 2 questions: medium 3-mark subjective questions.
       - Last 1 question: detailed 5-mark subjective question.
       DIFFICULTY: ${difficulty.toUpperCase()}.
       SCHEMA: Array of { "question": string, "options": string[], "correct_answer": string, "explanation": string, "type": "mcq" | "subjective", "chapter": string }.
       Language: ${targetLanguage}.`;

    // Priority model list
    const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"];
    
    for (const modelId of models) {
      try {
        console.log(`[GeminiMCQ] Prompting ${modelId}...`);
        const model = genAI.getGenerativeModel({ 
          model: modelId,
          generationConfig: { responseMimeType: "application/json" }
        });

        const result = await model.generateContent([{ text: prompt }, { fileData: { mimeType: file.mimeType, fileUri: file.uri } }]);
        const questions = JSON.parse(result.response.text());
        
        if (Array.isArray(questions) && questions.length > 0) {
          console.log(`[GeminiMCQ] SUCCESS with ${modelId}!`);
          return questions;
        }
      } catch (err: any) {
        console.warn(`[GeminiMCQ] ${modelId} failed: ${err.message}`);
      }
    }

    throw new Error("Focus mode failed to produce results. Try manual generation.");

  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}
