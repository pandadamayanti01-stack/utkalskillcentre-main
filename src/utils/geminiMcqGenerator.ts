import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function getTargetLanguage(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('english')) return 'English';
  if (s.includes('odia')) return 'Odia (ଓଡ଼ିଆ)';
  if (s.includes('hindi')) return 'Hindi (ହିନ୍ଦୀ)';
  if (s.includes('sanskrit')) return 'Sanskrit (ସଂସ୍କୃତ)';
  return 'Odia (ଓଡ଼ିଆ)';
}

export function getGamificationInstructions(subject: string, className: string): string {
  const normalizedClass = className.toLowerCase().trim();
  const classDigit = parseInt(normalizedClass.replace(/[^0-9]/g, ''), 10) || 10;
  
  // Decide character tier based on grade level
  const characterTier = classDigit <= 5
    ? "Primary Characters (Chhota Bheem, Raju, Doraemon, Shinchan, Motu, Patlu, Krishna, Hanuman)"
    : "Secondary Characters (Naruto, Goku, Luffy, Tanjiro, Spider-Man, BGMI, Free Fire, Esports)";
    
  return `
GAMIFICATION & LOCAL PERSONA INTEGRATION RULES:
1. You MUST integrate characters from the following list into the questions: ${characterTier}.
2. Weave these characters into the question text naturally based on the subject:
   - Math (math, algebra, geometry, ganita_mela, ganitaprakas): Have characters count items (laddoos, dorayakis, chakra/power points), calculate training speeds, or measure historical landmarks of Odisha (like Puri chariot wheels or Konark Sun Temple dimensions).
   - Science (science, jigyasa, physical/life science, evs): Have characters explain science concepts via their gadgets/powers (Doraemon's Bamboo Copter for gravity, Goku's blasts for energy transfer, Spider-Man's webs for tension/elasticity) or local environmental tasks (protecting Olive Ridley turtles at Gahirmatha, cleaning Chilika Lake).
   - English: Use character story scenarios to test grammar rules, proper nouns, verb tenses, and punctuation.
   - Odia (odia, sahitya_surabhi): Write grammar questions (Noun/Pronoun/Verb/Adjective/Subject-Object identification) in Odia based on character actions.
   - Social Science (history, geography, samajika_bignana): Have characters travel to and ask questions about iconic Odisha heritage sites (Konark Temple, Udayagiri Caves, Lingaraj Temple, Dhauli Peace Pagoda) or geographical landmarks (Mahanadi River, Chilika Lake, Similipal Forest, Hirakud Dam).
   - Kruti (Art/Craft): Have characters interact with traditional Odisha arts (painting Raghurajpur Pattachitra using natural shell colors, sewing Pipili Applique/Chandua motifs, inspecting Cuttack Silver Filigree, modeling clay toys for Rath Yatra).
   - Khela Sikhya / Sharirika Yoga (Physical Ed): Have characters play traditional games (Kabaddi, Kho-Kho, Gilli-Danda) or practice healthy yoga poses (Padmasana, Tadasana, Pranayama breathing).
3. The explanation field should feature cheering remarks from the hosting character in Odia (e.g. "ନାରୁତୋ କୁହେ: ସାବାସ୍! ତୁମେ ଏହାକୁ ଠିକ୍ ସମାଧାନ କଲ!" or "ଭୀମ କୁହେ: ବହୁତ ବଢିଆ! ତୁମେ ମୋ ଲଡୁ ଖାଇବା ବେଗ ପରି ଗଣିତ ସମାଧାନ କଲ!").
4. ALWAYS match the target language rules: English for English subject, Odia for all other subjects. No LaTeX formulas.
5. ODIA ORTHOGRAPHY & SPELLING (ଯୁକ୍ତାକ୍ଷର): When generating text in Odia, ensure absolute correctness of spelling and conjunct letters (ଯୁକ୍ତାକ୍ଷର, e.g., using proper ligatures like ନ୍ଦ, ନ୍ଧ, ଷ୍ଟ, ତ୍ତ, ଳ, ନ୍ତ, etc.). Avoid broken Unicode combinations (like ନ୍‌ଦ or ନ୍‌ଧ) and ensure historical names or terms (like "ଦାଣ୍ଡି ଯାତ୍ରା" / "Dandi March") are spelled exactly as they appear in standard Odia textbooks.`;
}

/**
 * Intelligent Slicing: If PDF is too large, extract a manageable range of pages.
 */
async function focusPdfContent(pdfBuffer: Buffer): Promise<Buffer> {
  // If under 150MB, don't slice
  if (pdfBuffer.length < 150 * 1024 * 1024) return pdfBuffer;
  
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
  className: string = 'class10',
  mode: 'daily' | 'monthly' = 'daily',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  chapters?: string[]
): Promise<any[]> {
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

  if (keysToTry.length === 0) {
    throw new Error('No GEMINI_API_KEY or GEMINI_ROTATOR_KEYs configured on the server.');
  }

  const targetLanguage = getTargetLanguage(subject);

  // Focus the content if it's a massive book
  const processedBuffer = await focusPdfContent(pdfBuffer);

  const tempPath = path.join(os.tmpdir(), `usc_gen_${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, processedBuffer);

  let lastError: any = null;

  try {
    for (let keyIdx = 0; keyIdx < keysToTry.length; keyIdx++) {
      const apiKey = keysToTry[keyIdx];
      const obscuredKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
      console.log(`[GeminiMCQ] Attempting generation using Key ${keyIdx + 1}/${keysToTry.length} (${obscuredKey})`);
      
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const fileManager = new GoogleAIFileManager(apiKey);

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

        if (activeFile.state !== FileState.ACTIVE) {
          throw new Error("File processing failed.");
        }
        console.log("[GeminiMCQ] Focused File ACTIVE.");

        const gamificationRules = getGamificationInstructions(subject, className);
        let prompt = '';
        if (chapters && chapters.length > 0) {
          const chaptersList = chapters.map(ch => `"${ch}"`).join(', ');
          prompt = `You are an expert textbook parser and educational content assistant.
Your task is to analyze the provided textbook PDF, locate the actual exercises, question banks, or chapter-end question sections for the following specific chapters: ${chaptersList}.

Instructions:
1. Locate the printed exercises at the end of the specified chapters in the PDF.
2. Find the multiple-choice questions (MCQs) that have options (typically labelled with letters like A, B, C, D or Odia characters like କ, ଖ, ଗ, ଘ).
3. When extracting or adapting questions, apply the gamification and character integration rules listed below where appropriate (e.g. you can slightly adapt generic name nouns in the question stems to match the characters).
4. Keep the question text and options in the original language (${targetLanguage}). If the options are in Odia (କ, ଖ, ଗ, ଘ), capture them as strings in the options array.
5. Provide the correct answer and write a helpful explanation in ${targetLanguage} explaining why that answer is correct, citing the page number or section if possible.
6. Return exactly ${mode === 'monthly' ? 23 : count} questions.
7. SCHEMA: Array of { "question": string, "options": string[], "correct_answer": string, "explanation": string, "type": "mcq", "chapter": string }.

Fallback:
If the specified chapter exercises do not contain enough exact MCQs (less than ${mode === 'monthly' ? 23 : count}), supplement the list by converting other exercise questions (such as fill-in-the-blanks or short questions) from those chapters into MCQ format, using the exact text from the textbook as the question stem. Only generate brand-new questions based on the chapter content as a last resort if no exercise text is available.
        
${gamificationRules}`;
        } else {
          prompt = `You are a teacher. Generate exactly ${mode === 'monthly' ? 23 : count} questions from this book for a Daily Practice set.
           MIX: 
           - First 4 questions: simple 1-mark MCQs.
           - Next 3 questions: short 2-mark MCQs or simple subjective.
           - Next 2 questions: medium 3-mark subjective questions.
           - Last 1 question: detailed 5-mark subjective question.
           DIFFICULTY: ${difficulty.toUpperCase()}.
           SCHEMA: Array of { "question": string, "options": string[], "correct_answer": string, "explanation": string, "type": "mcq" | "subjective", "chapter": string }.
           Language: ${targetLanguage}.
           
${gamificationRules}`;
        }

        const models = [
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-3.1-flash-lite",
          "gemini-2.0-flash-lite"
        ];
        
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
            console.warn(`[GeminiMCQ] Model ${modelId} failed: ${err.message}`);
            lastError = err;
          }
        }
      } catch (err: any) {
        console.warn(`[GeminiMCQ] API Key ${keyIdx + 1} failed: ${err.message}`);
        lastError = err;
      }
    }

    throw new Error(`All configured API keys failed to generate MCQs. Last error: ${lastError?.message || lastError}`);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

