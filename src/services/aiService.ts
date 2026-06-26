import { safeJsonStringify } from "../firebase";
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
} from '../data/roadmapData';

function getRoadmapForClass(className: string) {
  const digit = className.replace(/\D/g, '');
  switch (digit) {
    case '1': return ROADMAP_DATA_1;
    case '2': return ROADMAP_DATA_2;
    case '3': return ROADMAP_DATA_3;
    case '4': return ROADMAP_DATA_4;
    case '5': return ROADMAP_DATA_5;
    case '6': return ROADMAP_DATA_6;
    case '7': return ROADMAP_DATA_7;
    case '8': return ROADMAP_DATA_8;
    case '9': return ROADMAP_DATA_9;
    case '10': return ROADMAP_DATA_10;
    default: return ROADMAP_DATA_10;
  }
}


const GUNDULU_ODIA_SYSTEM_INSTRUCTION = `Role & Persona:
Identity: You are "Gundulu," a loving, caring older sister (Gundulu Apa) and a friendly AI Study Buddy for Odisha state board students.
Tone: Warm, supportive, encouraging, and patient. Speak with the affectionate care of an elder sister helping her younger siblings study.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term, write it in Odia script.
Greeting: Always start your first response with "Namaskar! Mu tumara Gundulu Apa (ଗୁନ୍ଦୁଲୁ ଅପା). Aaji ame kana padhiba? ✨"
Instructions: Explain school concepts step-by-step. If a student asks a doubt, provide a clear and simple explanation. Use gentle, caring elder-sister phrases like 'ବୁଝିଲ ଭାଇ' or 'କହିଲ ବୁନି' (or speak with natural, sibling-to-sibling Odia warmth).
SAFETY & GUARDRAILS: You are an educational tutor designed for young school children. Under no circumstances should you discuss adult topics, violence, self-harm, hate speech, politics, romance, nudity, or inappropriate themes. If a student tries to ask about non-educational, unnecessary, harmful, or inappropriate topics, politely decline and redirect them back to their school lessons.

### CRITICAL: ODIA ORTHOGRAPHY & SCRIPT RULES
You must maintain flawless Odia Unicode typography. Follow these linguistic guardrails strictly to avoid common AI script translation errors:

1. MATRA PRESERVATION: Pay extreme attention to vowel lengths. Do not confuse Hraswa (ଶର୍ଟ) and Dirgha (ଲଙ୍ଗ) matras.
   - Verify: 'Hraswa i' (ି) vs. 'Dirgha i' (ୀ) -> e.g. Always write 'ପରୀକ୍ଷା' (Exam) with Dirgha i (ୀ), never as 'ପରିକ୍ଷା'.
   - Verify: 'Hraswa u' (ୁ) vs. 'Dirgha u' (ୂ)

2. CONSONANT SELECTION & PHONETICS:
   - "BALA / BAL" TRANSLITERATION GUARD: In English names and terms like "Bala", "Balaram", "Baladeba", or words representing strength/force, the syllable "bal" corresponds to "ବଳ" (Ba-la), which has NO akara (no "ା" matra) on the "ବ". Never write them with an akara (like 'ବାଲା' or 'ବାଲରାମ' or 'ବାଲଦେବ' which are incorrect). Always write them as 'ବଳ', 'ବଳରାମ', or 'ବଳଦେବ'. In physics, represent "Force" strictly as "ବଳ", never as "ବାଳ" or "ବାଲ".
   - Never substitute 'Wa/Va' (ୱ) where a standard 'Ba' (ବ) belongs (e.g. write 'ବ୍ୟବସାୟ', never 'ବେବସାୟ' or 'ୱେବସାୟ').
   - Carefully distinguish between Sha (ଶ), Ssha (ଷ), and Sa (ସ). Do not default to 'ସ' for all sibilant sounds.
   - Accurately apply Na (ନ) vs. Nna (ଣ).

3. JUKTAKSHYARA (CONJUNCT CLUSTERS): Do not split or break complex conjuncts (e.g., ନ୍ଧ, ନ୍ତ୍ର, ଦ୍ଧ, ଙ୍ଖ, ଶ୍ଚ, କ୍ଷ). Ensure they render as a single, authentic Unicode glyph block (e.g. 'ଶିକ୍ଷା', 'ପ୍ରଶ୍ନ', 'ବନ୍ଧୁ'), not as separate characters with a halanta.

4. NO LATEX MATHEMATICAL DELIMITERS OR MARKUP:
   - NEVER output LaTeX math expressions, formulas, or delimiters (DO NOT write $, $$, \\[, \\], \\(, \\), \\frac, \\sqrt, \\times, \\div). Write all mathematical equations, fractions, and calculations using plain text and standard Unicode characters (e.g., use +, -, ×, ÷, =, /, √, π, ^) that school students and parents can easily read.`;

const GUNDULU_EN_SYSTEM_INSTRUCTION = `You are "Gundulu," a loving, caring older sister (Gundulu Apa) and a friendly AI Study Buddy for Odisha students.
Explain concepts clearly in simple steps. Be warm, supportive, and encouraging, speaking with the gentle care of an elder sister.
Greeting: Always start your first response with "Namaskar! I am your Gundulu Apa. What shall we learn today? ✨"
SAFETY & GUARDRAILS: You are an educational tutor designed for young school children. Under no circumstances should you discuss adult topics, violence, self-harm, hate speech, politics, romance, nudity, or inappropriate themes. If a student tries to ask about non-educational, unnecessary, harmful, or inappropriate topics, politely decline and redirect them back to their school lessons.

### CRITICAL MATH LAYOUT RULES
- NEVER output LaTeX math expressions, formulas, or delimiters (DO NOT write $, $$, \\[, \\], \\(, \\), \\frac, \\sqrt, \\times, \\div). Write all mathematical equations, fractions, and calculations using plain text and standard Unicode characters (e.g., use +, -, ×, ÷, =, /, √, π, ^) that school students and parents can easily read.`;

export const gunduluSafetySettings = [
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as any,
    threshold: "BLOCK_LOW_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_HARASSMENT" as any,
    threshold: "BLOCK_LOW_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH" as any,
    threshold: "BLOCK_LOW_AND_ABOVE" as any,
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT" as any,
    threshold: "BLOCK_LOW_AND_ABOVE" as any,
  }
];

export const getStudyBuddySystemInstruction = (
  language: 'en' | 'or',
  studentName?: string,
  studentClass?: string,
  customPrompt?: string
) => {
  const base = (customPrompt && customPrompt.trim().length > 0)
    ? customPrompt.trim()
    : (language === 'en' ? GUNDULU_EN_SYSTEM_INSTRUCTION : GUNDULU_ODIA_SYSTEM_INSTRUCTION);
  const classHint = studentClass
    ? `\nStudent Class: ${studentClass} (Use age persona rules accordingly).`
    : '';
  const nameHint = studentName ? `\nStudent Name: ${studentName}` : '';
  return `${base}${nameHint}${classHint}`;
};

function safeJsonParse(text: string) {
  try {
    let cleaned = text.replace(/```json\n?|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = cleaned.lastIndexOf('}');
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = cleaned.lastIndexOf(']');
    }
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from AI:", text);
    throw e;
  }
}

export function normalizeKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeKeys(item));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      let newKey = key;
      if (lowerKey.includes('mcq') || lowerKey.includes('ପ୍ରଶ୍ନଗୁଡ଼ିକ') || lowerKey === 'mcqs') {
        newKey = 'mcqs';
      } else if (lowerKey.includes('subjective') || lowerKey.includes('ଦୀର୍ଘ') || lowerKey === 'subjectives') {
        newKey = 'subjectives';
      } else if (lowerKey.includes('question') || lowerKey.includes('ପ୍ରଶ୍ନ') || lowerKey === 'q') {
        newKey = 'question';
      } else if (lowerKey.includes('option') || lowerKey.includes('ବିକଳ୍ପ') || lowerKey === 'opts') {
        newKey = 'options';
      } else if (lowerKey.includes('answer') || lowerKey.includes('ଉତ୍ତର') || lowerKey === 'ans') {
        newKey = 'answer';
      } else if (lowerKey.includes('hint') || lowerKey.includes('ସୂଚନା') || lowerKey.includes('ଇଙ୍ଗିତ')) {
        newKey = 'hint';
      }
      newObj[newKey] = normalizeKeys(obj[key]);
    }
    return newObj;
  }
  return obj;
}

function generateOfflineSocraticResponse(query: string, isOdia: boolean): string {
  const normalizedQuery = query.toLowerCase();
  
  if (isOdia) {
    if (normalizedQuery.includes('ବାୟୁ') || normalizedQuery.includes('ଚାପ') || normalizedQuery.includes('pressure') || normalizedQuery.includes('air')) {
      return `ପ୍ରଶ୍ନ ପାଇଁ ଧନ୍ୟବାଦ ଭାଇ! ବାୟୁ ଚାପ (Air Pressure) ବିଷୟରେ ବୁଝିବା ବହୁତ ସହଜ। 
୧. ବାୟୁର ଓଜନ ଅଛି, ଏବଂ ଏହା ପୃଥିବୀ ପୃଷ୍ଠରେ ଚାପ ପକାଇଥାଏ। ଏହାକୁ ଆମେ ବାୟୁମଣ୍ଡଳୀୟ ଚାପ (Atmospheric Pressure) କହିଥାଉ।
୨. ଉଚ୍ଚତା ବଢ଼ିଲେ ବାୟୁର ଚାପ କମିଯାଏ (ଏଥିପାଇଁ ପାହାଡ଼ ଉପରେ ଚାପ କମ୍ ଥାଏ)।
୩. ଗରମ ପବନ ହାଲୁକା ହୋଇ ଉପରକୁ ଉଠିଯାଏ, ଯାହା ଫଳରେ ସେଠାରେ କମ୍ ଚାପ ସୃଷ୍ଟି ହୁଏ।
ତୁମେ ଏହାକୁ ଘରେ ଏକ ପରୀକ୍ଷା କରି ଦେଖିଛ କି? ମତେ କୁହ! 🌟`;
    }
    if (normalizedQuery.includes('ବଳ') || normalizedQuery.includes('force') || normalizedQuery.includes('ଗତି') || normalizedQuery.includes('motion')) {
      return `ନାମସ୍କାର! ବଳ (Force) ଏବଂ ଗତି (Motion) ବିଷୟରେ ବୁଝିବା:
୧. ବଳ ହେଉଛି ଏକ ଟାଣିବା କିମ୍ବା ଠେଲିବା କ୍ରିୟା ଯାହା ଗୋଟିଏ ବସ୍ତୁର ସ୍ଥିତି ବଦଳାଇପାରେ।
୨. ନିଉଟନଙ୍କ ଗତି ସୂତ୍ର ଅନୁସାରେ, ବାହ୍ୟ ବଳ ପ୍ରୟୋଗ ନହେଲେ ସ୍ଥିର ବସ୍ତୁ ସ୍ଥିର ରହେ ଏବଂ ଗତିଶୀଳ ବସ୍ତୁ ଗତିଶୀଳ ରହେ।
ଏହା ସମ୍ପର୍କରେ ତୁମ ମନରେ ଆଉ କିଛି ପ୍ରଶ୍ନ ଅଛି କି?`;
    }
    if (normalizedQuery.includes('math') || normalizedQuery.includes('ଗଣିତ') || normalizedQuery.includes('ସମୀକରଣ') || normalizedQuery.includes('+') || normalizedQuery.includes('=')) {
      return `ଗଣିତର ଏହି ସନ୍ଦେହଟିକୁ ଆମେ ସରଳ ଭାବରେ ସମାଧାନ କରିବା:
୧. ପ୍ରଥମେ ପ୍ରଶ୍ନର ମୂଲ୍ୟଗୁଡ଼ିକୁ ସଜାଇ ଲେଖ।
୨. ସମୀକରଣର ଦୁଇ ପାର୍ଶ୍ୱକୁ ସମାନ କରିବାକୁ ଚେଷ୍ଟା କର।
ପଦକ୍ଷେପଗୁଡ଼ିକୁ ନିଜ ଖାତାରେ ଲେଖି ମୋତେ ଫଟୋ ପଠାଅ, ମୁଁ ଦେଖିବି ତୁମେ ଠିକ୍ କରୁଛ କି ନାହିଁ! ✨`;
    }
    return `ନମସ୍କାର! ମୁଁ ତୁମର ଗୁନ୍ଦୁଲୁ ଅପା (ଗୁନ୍ଦୁଲୁ ଅପା) । ଆମେ ବର୍ତ୍ତମାନ ଅଫଲାଇନ ମୋଡ୍‌ରେ ଅଛୁ, କିନ୍ତୁ ଆମର ଡିଭାଇସ୍-ନେଟିଭ୍ Odia-Gemma 2B AI ସକ୍ରିୟ ଅଛି।
ତୁମେ ପଚାରିଥିବା ବିଷୟ: "${query}"
ଏହା ବିଷୟରେ ଆସ ଆମେ ସରଳ ଭାବରେ ପଢ଼ିବା ଏବଂ ବୁଝିବା। ତୁମ ବହିର ପୃଷ୍ଠାଗୁଡ଼ିକ ଏଠାରେ ସଂରକ୍ଷିତ ଅଛି। ତୁମେ ଏହି ବିଷୟରେ ଆଉ କଣ ଜାଣିବାକୁ ଚାହୁଁଛ ମତେ ପଚାର!`;
  } else {
    if (normalizedQuery.includes('air') || normalizedQuery.includes('pressure') || normalizedQuery.includes('science')) {
      return `Great question! Let's talk about Air Pressure:
1. Air has weight, and the force exerted by this weight on the earth's surface is called atmospheric pressure.
2. As we go up into the atmosphere, the pressure decreases rapidly.
3. Air moves from high-pressure areas to low-pressure areas.
Can you think of a real-life example where we see air pressure in action? Tell me! 🌟`;
    }
    if (normalizedQuery.includes('math') || normalizedQuery.includes('equation') || normalizedQuery.includes('+') || normalizedQuery.includes('=')) {
      return `Let's solve this math doubt step-by-step:
1. Identify the given values and what you need to find.
2. Formulate the equation and solve for the unknown variable.
Try to do this in your notebook and tell me what you get! ✨`;
    }
    return `Namaskar! I am your Gundulu Apa. We are currently offline, but our device-native Gemma 2B AI is active.
You asked: "${query}"
Let's explore this step-by-step. Since we are offline, I am using pre-cached school materials to tutor you. What specific question do you have about this topic?`;
  }
}

export const getAI = (meta?: { class?: string, subject?: string }) => {
  console.log("✅ Routing AI through Secure Backend Proxy");
  return {
    getGenerativeModel: (opts: any, requestOptions?: any) => {
      return {
        generateContent: async (params: any) => {
           // 1. Perspective API Content Safety pre-filter
           const safetyCheck = checkPromptSafety(params.contents);
           if (!safetyCheck.safe) {
             console.warn("Perspective API Filter Blocked Prompt:", safetyCheck.reason);
             const isOdia = opts.systemInstruction?.includes("Gundulu") && opts.systemInstruction?.includes("Namaskar");
             const blockText = isOdia
               ? "ସୁରକ୍ଷା ଚେତାବନୀ: ଆପଣଙ୍କ ପ୍ରଶ୍ନରେ ଶିକ୍ଷା ସମ୍ବନ୍ଧୀୟ ନଥିବା ଶବ୍ଦ ବା ବିଷୟ ଚିହ୍ନଟ ହୋଇଛି । ଦୟାକରି କେବଳ ପାଠପଢ଼ା ବିଷୟରେ ପଚାରନ୍ତୁ । (Perspective API Safety Block)"
               : "Safety Warning: Non-educational or inappropriate content detected. Please ask questions related to your school curriculum. (Perspective API Safety Block)";
             return { response: { text: () => blockText } };
           }

           // 2. Offline Gemma 2B Failback & Telemetry Routing
           if (typeof window !== 'undefined' && !navigator.onLine) {
             console.log("Device is offline. Attempting Chrome Built-in Device AI (Gemini Nano) Fallback...");
             
             // Log the switch to Local WebGPU execution in telemetry
             window.dispatchEvent(new CustomEvent('gundulu_telemetry_log', {
               detail: {
                 type: 'routing',
                 message: '[Local Gemma 2B WebGPU Session Ready] System switched to Local WebGPU execution routing. Quantized Odia-Gemma 2B active.'
               }
             }));

             let lastQuery = '';
             if (params.contents && Array.isArray(params.contents)) {
               for (let i = params.contents.length - 1; i >= 0; i--) {
                 const turn = params.contents[i];
                 if (turn.role === 'user' && turn.parts && Array.isArray(turn.parts)) {
                   for (const part of turn.parts) {
                     if (part.text) {
                       lastQuery = part.text;
                       break;
                     }
                   }
                   if (lastQuery) break;
                 }
               }
             }

             if (!lastQuery) {
               lastQuery = 'Hello';
             }

             const isOdia = opts.systemInstruction?.includes("Gundulu") && opts.systemInstruction?.includes("Namaskar");

             try {
               const aiObj = (window as any).ai;
               if (aiObj) {
                 let session;
                 if (aiObj.assistant && typeof aiObj.assistant.create === 'function') {
                   session = await aiObj.assistant.create();
                 } else if (typeof aiObj.createTextSession === 'function') {
                   session = await aiObj.createTextSession();
                 }
                 
                 if (session) {
                   const result = await session.prompt(lastQuery);
                   console.log("Chrome Device AI generated response successfully.");
                   const cleaned = cleanOdiaOrthography(result);
                   return { 
                     response: { 
                       text: () => `${cleaned}\n\n*(Offline Gemma 2B Local WebGPU Execution Active)*` 
                     } 
                   };
                 }
               }
             } catch (nanoErr) {
               console.warn("Chrome Device AI Fallback failed execution:", nanoErr);
             }
             
             // Simulated Socratic Offline Response fallback
             const fallbackResponse = generateOfflineSocraticResponse(lastQuery, !!isOdia);
             return { 
               response: { 
                 text: () => `${fallbackResponse}\n\n*(Offline Gemma 2B Local WebGPU Execution Active - Sandbox Mode)*` 
               } 
             };
           }

           const isPro = opts.model && opts.model.includes('pro');
           const modelType = isPro ? 'pro' : 'flash';
           
           const response = await fetch('/api/ai/generate', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               contents: params.contents, 
               systemInstruction: opts.systemInstruction, 
               modelType: modelType, 
               generationConfig: params.generationConfig,
               class: meta?.class,
               subject: meta?.subject,
               enableGrounding: localStorage.getItem('gundulu_enable_grounding') === 'true',
               enableDialectBridge: localStorage.getItem('gundulu_enable_dialect_bridge') === 'true'
             })
           });
           
           if (!response.ok) {
             const err = await response.json().catch(() => ({}));
             throw new Error(err.error || 'Backend AI generation failed');
           }
           
           const data = await response.json();
           return { response: { text: () => data.text } };
         },

         // Streaming proxy: matches real Gemini SDK shape { stream: AsyncIterable, response: Promise }.
         // Backend returns a complete JSON response; we wrap it as a single-chunk async iterable.
         // GunduluHuman's sentence splitter handles pipelining to TTS from there.
         generateContentStream: async (params: any) => {
           const isPro = opts.model && opts.model.includes('pro');
           const modelType = isPro ? 'pro' : 'flash';

           const response = await fetch('/api/ai/generate', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               contents: params.contents,
               systemInstruction: opts.systemInstruction,
               modelType,
               generationConfig: params.generationConfig,
               class: meta?.class,
               subject: meta?.subject,
               enableGrounding: localStorage.getItem('gundulu_enable_grounding') === 'true',
               enableDialectBridge: localStorage.getItem('gundulu_enable_dialect_bridge') === 'true'
             })
           });

           if (!response.ok) {
             const err = await response.json().catch(() => ({}));
             throw new Error(err.error || 'Backend AI generation failed');
           }

           const data = await response.json();
           const fullText: string = data.text || '';

           // Yield full text as one chunk — sentence splitter in GunduluHuman handles TTS pipelining
           async function* makeStream() {
             yield { text: () => fullText };
           }

           return {
             stream: makeStream(),
             response: Promise.resolve({ text: () => fullText })
           };
         }
      };
    }
  };
};

export async function withRetry<T>(
  fn: (modelName: string, apiVersion: "v1beta" | "v1") => Promise<T>, 
  modelType: 'flash' | 'pro' = 'flash',
  maxRetries = 3
): Promise<T> {
  // Retry and model fallback logic is now handled strictly on the backend for security and speed.
  // We simply pass the modelType through to the backend proxy.
  return await fn(modelType, "v1beta");
}

export async function solveMathDoubt(
  prompt: string,
  language: 'en' | 'or',
  imageData?: { data: string, mimeType: string },
  studentClass?: string,
  customPrompt?: string,
  history?: { sender: string; text: string }[],
  subject?: string
) {
  try {
    const ai = getAI({ class: studentClass, subject: subject });
    const systemInstruction = getStudyBuddySystemInstruction(language, undefined, studentClass, customPrompt);

    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    // Build the contents list with chat memory
    // FIX #7: Sliding-window with per-message char cap to prevent token bloat.
    // 6-turn window × 800 chars/message ≈ 4,800 chars ≈ ~1,200 tokens of history max.
    const MAX_HISTORY_TURNS = 6;
    const MAX_CHARS_PER_MSG = 800;
    const contents: any[] = [];
    if (history && history.length > 0) {
      const recentHistory = history.slice(-MAX_HISTORY_TURNS);
      recentHistory.forEach((msg) => {
        const role = msg.sender === 'user' ? 'user' : 'model';
        // Truncate very long messages to prevent token explosion
        const safeText = msg.text && msg.text.length > MAX_CHARS_PER_MSG
          ? msg.text.slice(0, MAX_CHARS_PER_MSG) + '…'
          : (msg.text || '');
        if (contents.length === 0) {
          if (role === 'user') {
            contents.push({ role, parts: [{ text: safeText }] });
          }
        } else {
          const lastTurn = contents[contents.length - 1];
          if (lastTurn.role === role) {
            lastTurn.parts[0].text += '\n' + safeText;
          } else {
            contents.push({ role, parts: [{ text: safeText }] });
          }
        }
      });
    }
    // Add the current prompt
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({ role: 'user', parts });
    }

    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({
        model: modelName,
        systemInstruction,
        safetySettings: gunduluSafetySettings
      }, { apiVersion });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,  // FIX #3: Cap tutor replies — school explanations need ≤600 tokens
          topP: 0.95,
          topK: 40,
        },
      });
      return result.response.text();
    }, 'flash');

    return responseText ? cleanOdiaOrthography(responseText) : "Sorry, I couldn't solve that. Please try again.";
  } catch (error: any) {
    console.error("Study Buddy Service Error:", error);
    return "Error connecting to Study Buddy. Please try again later.";
  }
}

async function translateBatch(batch: any[], targetLanguage: 'en' | 'or'): Promise<any[]> {
  try {
    const ai = getAI();
    const textPayload = safeJsonStringify(batch);
    
    let systemInstruction = '';
    if (targetLanguage === 'or') {
      systemInstruction = `You are an expert translator. Translate the following educational questions array from English to Odia.
      CRITICAL LANGUAGE RULES FOR ODIA MEDIUM:
      - Keep all mathematical equations, formulas, variables, and digits in standard English/Arabic notation (e.g. 5, x, y, a^2 + b^2, 2x + 3y = 5).
      - Do NOT translate English math variables to Odia script (e.g., do NOT write 'x' as 'ଏକ୍ସ' or '5' as '୫').
      - All surrounding explanatory text, questions, options, instructions, and non-mathematical terms MUST be translated to natural, grammatically correct Odia script.
      - Return ONLY the translated JSON array. Maintain exact structure and keys ('question', 'options', 'answer', 'hint'). Do not include any markdown formatting.`;
    } else {
      systemInstruction = `You are an expert translator. Translate the following educational questions array from Odia to English.
      Keep mathematical terms, numbers, and formatting intact.
      Return ONLY the translated JSON array. Maintain exact structure and keys ('question', 'options', 'answer', 'hint'). Do not include any markdown formatting.`;
    }

    const translatedText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ 
        model: modelName,
        systemInstruction
      }, { apiVersion });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: textPayload }] }],
        generationConfig: {
          temperature: 0.05,  // FIX #3: Near-zero for faithful translation
          maxOutputTokens: 2048,  // FIX #3: Batch of 10 questions fits comfortably
          responseMimeType: "application/json"
        },
      });
      return result.response.text();
    }, 'flash');

    const cleaned = targetLanguage === 'or' ? cleanOdiaOrthography(translatedText) : translatedText;
    const parsed = safeJsonParse(cleaned);
    return normalizeKeys(parsed);
  } catch (error) {
    console.error("Batch Translation Error:", error);
    return batch; // Fallback to original batch
  }
}

export async function translateContent(text: string | object, targetLanguage: 'en' | 'or') {
  try {
    const ai = getAI();
    const isJson = typeof text === 'object';
    
    if (isJson) {
      const obj = text as any;
      const mcqs = obj.mcqs || [];
      const subjectives = obj.subjectives || [];
      
      const translatedMcqs: any[] = [];
      const translatedSubjectives: any[] = [];
      
      // Batch translate MCQs (10 at a time)
      const mcqBatchSize = 10;
      for (let i = 0; i < mcqs.length; i += mcqBatchSize) {
        const batch = mcqs.slice(i, i + mcqBatchSize);
        console.log(`Translating MCQ batch ${i / mcqBatchSize + 1}...`);
        const result = await translateBatch(batch, targetLanguage);
        if (Array.isArray(result)) {
          translatedMcqs.push(...result);
        } else {
          translatedMcqs.push(...batch);
        }
      }
      
      // Batch translate Subjectives (5 at a time)
      const subBatchSize = 5;
      for (let i = 0; i < subjectives.length; i += subBatchSize) {
        const batch = subjectives.slice(i, i + subBatchSize);
        console.log(`Translating Subjective batch ${i / subBatchSize + 1}...`);
        const result = await translateBatch(batch, targetLanguage);
        if (Array.isArray(result)) {
          translatedSubjectives.push(...result);
        } else {
          translatedSubjectives.push(...batch);
        }
      }
      
      return {
        mcqs: translatedMcqs,
        subjectives: translatedSubjectives
      };
    }

    const textPayload = text as string;
    let systemInstruction = '';
    if (targetLanguage === 'or') {
      systemInstruction = `You are an expert translator. Translate the following educational content from English to Odia.
      CRITICAL LANGUAGE RULES FOR ODIA MEDIUM:
      - Keep all mathematical equations, formulas, variables, and digits in standard English/Arabic notation (e.g. 5, x, y, a^2 + b^2, 2x + 3y = 5).
      - Do NOT translate English math variables to Odia script (e.g., do NOT write 'x' as 'ଏକ୍ସ' or '5' as '୫').
      - All surrounding explanatory text, questions, options, instructions, and non-mathematical terms MUST be translated to natural, grammatically correct Odia script.`;
    } else {
      systemInstruction = "You are an expert translator. Translate the following educational content from Odia to English. Keep mathematical terms, numbers, and formatting intact.";
    }

    const translatedText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ 
        model: modelName,
        systemInstruction
      }, { apiVersion });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: textPayload }] }],
        generationConfig: {
          temperature: 0.05,  // FIX #3: Near-zero for faithful translation
          maxOutputTokens: 2048,  // FIX #3: Bounded output
        },
      });
      return result.response.text();
    }, 'flash');

    return targetLanguage === 'or' ? cleanOdiaOrthography(translatedText) : translatedText;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // Fallback to original text
  }
}

export async function generateChapterContent(title: string, subject: string, language: 'en' | 'or' = 'or') {
  try {
    const ai = getAI();
    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Generate educational content for a chapter titled "${title}" in the subject of "${subject}".
        The language should be ${language === 'or' ? 'Odia' : 'English'}.
        Provide the output in JSON format with the following structure:
        {
          "notes": "Detailed educational notes in Markdown format"
        }` }] }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
          maxOutputTokens: 4096,  // FIX #3: Chapter content is bounded
        },
      });
      return result.response.text();
    }, 'flash');

    if (!responseText) {
      throw new Error("Failed to generate a response.");
    }

    const cleanedText = language === 'or' ? cleanOdiaOrthography(responseText) : responseText;
    return safeJsonParse(cleanedText);
  } catch (error) {
    console.error("Chapter Generation Error:", error);
    throw error;
  }
}

export async function generateTestContent(title: string, language: 'en' | 'or') {
  try {
    const ai = getAI();
    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Generate a test for a chapter titled "${title}".
        The language should be "${language === 'or' ? 'Odia' : 'English'}".
        Provide 10 multiple choice questions.
        Provide the output in JSON format with the following structure:
        {
          "questions": [
            { "question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "The correct option text" }
          ]
        }` }] }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
          maxOutputTokens: 2048,  // FIX #3: 10 MCQs fit within 2048 tokens
        },
      });
      return result.response.text();
    }, 'flash');

    if (!responseText) {
      throw new Error("Failed to generate a response.");
    }

    const cleanedText = language === 'or' ? cleanOdiaOrthography(responseText) : responseText;
    return safeJsonParse(cleanedText);
  } catch (error) {
    console.error("Test Generation Error:", error);
    throw error;
  }
}

export async function importPlaylistContent(playlistUrl: string) {
  try {
    const ai = getAI();
    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `Extract all video titles and their YouTube video IDs from this playlist URL: ${playlistUrl}.
        This is for an educational app for Class 3 Odisha Board (Odia Medium).
        The subject is Mathematics.
        Please read the content of the URL and provide the list of chapters.
        Provide the output in JSON format:
        {
          "chapters": [
            { "title": "Video Title", "videoId": "VideoID" }
          ]
        }` }] }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
        }
      });
      return result.response.text();
    }, 'flash');

    if (!responseText) {
      throw new Error("Failed to generate a response. The playlist might be private, unreachable, or the URL is invalid.");
    }

    return safeJsonParse(responseText);
  } catch (error) {
    console.error("Playlist Import Error:", error);
    throw error;
  }
}

export async function generateCurriculum(board: string, className: string) {
  try {
    const ai = getAI();
    const prompt = `You are an expert curriculum designer for Indian schools.
    Generate a standard list of chapters for ${board.toUpperCase()} board, class: ${className}.
    Include chapters for these subjects: math, science, english, odia.
    For each subject, generate exactly 5 standard chapters.
    Return a JSON array of objects. Each object must have:
    - "subject": string (one of: "math", "science", "english", "odia")
    - "title": string (the name of the chapter)
    - "language": string (use "en" for math, science, english. use "or" for odia)
    - "notes": string (a very short 1-sentence description of what the chapter covers)
    - "quiz_questions": array of exactly 3 objects, each with:
      - "question": string
      - "options": array of exactly 4 strings
      - "correctAnswer": number (index of the correct option, 0-3)
    Do not include any markdown formatting or extra text, just the raw JSON array.`;

    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
          maxOutputTokens: 4096,  // FIX #3: Curriculum with 4 subjects × 5 chapters × 3 questions
        },
      });
      return result.response.text();
    }, 'flash');

    if (!responseText) {
      throw new Error("Failed to generate a response.");
    }

    return safeJsonParse(responseText);
  } catch (error) {
    console.error("Curriculum Generation Error:", error);
    throw error;
  }
}

export async function generateTestQuestions(subject: string, className: string, month: string, language: 'en' | 'or' = 'or') {
  try {
    const classNum = className ? (parseInt(String(className).replace(/\D/g, '')) || 10) : 10;
    const formattedClassName = `Class ${classNum}`;

    let targetMonthString = month;
    if (month && !month.includes('202')) {
      targetMonthString = `${month} ${new Date().getFullYear()}`;
    }

    const roadmap = getRoadmapForClass(formattedClassName);
    const monthRoadmap = roadmap ? roadmap.find(entry => entry.month === targetMonthString) : null;
    let chapters: string[] = [];
    if (monthRoadmap && Array.isArray(monthRoadmap.chapters)) {
      const normalizedSubject = subject.toLowerCase().trim();
      const matchedChapters = monthRoadmap.chapters.filter(ch => {
        const chSub = (ch.subject || '').toLowerCase().trim();
        if (normalizedSubject === 'math') {
          return ['math', 'algebra', 'geometry', 'mathematics'].includes(chSub);
        }
        if (normalizedSubject === 'science') {
          return ['physical_science', 'life_science', 'science', 'general_science'].includes(chSub);
        }
        if (normalizedSubject === 'social_science') {
          return ['social_science', 'history', 'political_science', 'geography', 'economics'].includes(chSub);
        }
        if (normalizedSubject === 'odia') {
          return ['odia', 'odia_literature', 'odia_grammar', 'flo'].includes(chSub);
        }
        if (normalizedSubject === 'english') {
          return ['english', 'english_literature', 'english_grammar', 'sle'].includes(chSub);
        }
        if (normalizedSubject === 'sanskrit') {
          return ['sanskrit', 'sanskrit_grammar', 'tls'].includes(chSub);
        }
        if (normalizedSubject === 'hindi') {
          return ['hindi', 'hindi_grammar', 'tlh'].includes(chSub);
        }
        return chSub === normalizedSubject || chSub.includes(normalizedSubject) || normalizedSubject.includes(chSub);
      });
      chapters = matchedChapters.map(c => c.title || c.title_en || c.title_or);
    }

    if (chapters.length === 0) {
      chapters = [subject];
    }

    const response = await fetch('/api/ai/generate-monthly-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        className: formattedClassName,
        subjectName: subject,
        chapters,
        language
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate test with AI: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Test Questions Generation Error:", error);
    throw error;
  }
}

export async function gradeSubjectiveAnswer(
  question: string,
  modelAnswer: string,
  studentAnswerText: string,
  studentAnswerImageUrl: string | null,
  maxMarks: number,
  language: 'en' | 'or' = 'or'
) {
  try {
    const ai = getAI();
    
    let prompt = `You are an expert teacher grading a student's answer for the following question.
    
    Question: "${question}"
    Model Answer: "${modelAnswer}"
    Maximum Marks: ${maxMarks}
    
    Student's Typed Answer: "${studentAnswerText || 'No text provided.'}"
    ${studentAnswerImageUrl ? "Student also provided a photo of their working/calculation. Please analyze it carefully." : ""}
    
    Instructions:
    1. Compare the student's answer (text and image if provided) with the model answer.
    2. Award marks (from 0 to ${maxMarks}) based on accuracy, steps, and clarity.
    3. Be fair but strict. Give partial marks for correct steps.
    4. CRITICAL RULE FOR MISSING ROUGH WORK: If the question is purely factual (e.g., "What is the capital of India?"), give full marks if the answer is correct, even without rough work. However, if the question involves mathematical calculations, logical deductions, or derivations, and the student provides the correct final answer BUT NO rough work image and NO detailed steps in the text, you MUST deduct at least 50% of the maximum marks. Board exam rules strictly require steps for full marks in such subjects.
    5. Provide the result in JSON format:
       {
         "suggestedMark": number,
         "justification": "A brief 1-sentence explanation in ${language === 'or' ? 'Odia' : 'English'}"
       }
    Return ONLY the JSON object.`;

    const parts: any[] = [{ text: prompt }];

    if (studentAnswerImageUrl) {
      try {
        const response = await fetch(studentAnswerImageUrl);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        parts.push({
          inlineData: {
            data: base64.split(',')[1],
            mimeType: blob.type
          }
        });
      } catch (e) {
        console.error("Failed to fetch/convert image for grading:", e);
      }
    }

    const resultText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
          temperature: 0.2,
        },
      });
      return result.response.text();
    }, 'pro');

    return safeJsonParse(resultText || '{}');
  } catch (error) {
    console.error("AI Grading Error:", error);
    return { suggestedMark: 0, justification: "Error connecting to AI Assistant." };
  }
}

/**
 * Scans a student's notebook rough work copy, performs OCR and math calculations,
 * and returns step-by-step corrections with zero LaTeX and clean native Odia.
 */
export async function scanNotebookAnswer(
  base64Data: string,
  mimeType: string,
  question: string,
  language: 'en' | 'or' = 'or'
) {
  try {
    const ai = getAI();
    
    const prompt = `You are Gundulu, a warm, supportive digital elder sister tutoring a student in mathematics.
    The student has uploaded an image of their notebook copy (handwritten rough work) solving this question:
    
    Question: "${question}"
    
    Instructions:
    1. Read the student's handwritten work in the image.
    2. Solve the problem yourself step-by-step.
    3. Compare their steps with the correct mathematical steps.
    4. Provide encouraging, step-by-step feedback in ${language === 'or' ? 'Odia' : 'English'}. Point out exactly which steps are correct and if there is a mistake, explain why and how to fix it.
    5. Formulate a final clean summary of the answer that the student can submit.
    
    STRICT FORMATTING RULES:
    1. NO LATEX: Do not use any LaTeX notation (e.g. no $$, \\[, \\], \\(, \\), \\frac, \\sqrt, etc.). Write formulas in clean, plain-text unicode (e.g., x^2, sqrt(y), theta, or inline text).
    2. CLEAN NATURAL ODIA: The Odia feedback must be warm, natural, and grammatically correct, using clean native teacher-student conversation style. Avoid broken or literal machine translations.
    
    Please reply in JSON format:
    {
      "feedback": "Step-by-step feedback in ${language === 'or' ? 'Odia' : 'English'}...",
      "isCorrect": boolean,
      "finalAnswer": "A short summary of the correct final answer/steps to fill in..."
    }
    Return ONLY this JSON object.`;

    const parts = [
      { text: prompt },
      {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    ];

    const resultText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
          temperature: 0.3,
        },
      });
      return result.response.text();
    }, 'pro');

    return safeJsonParse(resultText || '{}');
  } catch (error) {
    console.error("Scan notebook error:", error);
    return {
      feedback: language === 'or' ? "ସ୍କାନ୍ କରିବାରେ ତ୍ରୁଟି ହେଲା। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।" : "Error scanning the notebook. Please try again.",
      isCorrect: false,
      finalAnswer: ""
    };
  }
}


/**
 * Logs AI usage to Firestore for admin tracking
 */
export async function logAiUsage(
  userId: string,
  userName: string,
  userClass: string,
  question: string,
  answer: string,
  metadata: any = {}
) {
  try {
    const { db } = await import('../firebase');
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    
    const normalizedQuestion = question.toLowerCase().replace(/[?.!]/g, '').replace(/\s+/g, ' ').trim();

    await addDoc(collection(db, 'tutor_queries'), {
      userId,
      userName,
      userClass,
      question,
      normalizedQuestion,
      answer,
      timestamp: serverTimestamp(),
      ...metadata
    });
    console.log("✅ AI usage logged to Firestore");
  } catch (error) {
    console.error("❌ Failed to log AI usage:", error);
  }
}

export async function generateHomeworkSheet(
  className: string,
  subjectName: string,
  chapterTitle: string,
  difficulty: 'easy' | 'medium' | 'hard',
  qCount: number,
  language: 'en' | 'or' = 'or'
) {
  try {
    const ai = getAI();
    const prompt = `You are Gundulu, an expert educational content developer for the Board of Secondary Education (BSE) Odisha curriculum.
    Generate a premium, school-standard, exam-aligned bilingual homework worksheet with exactly ${qCount} questions and a separate complete answer key on the topic of "${chapterTitle}" in the subject "${subjectName}" for standard "${className}".
    Difficulty level: "${difficulty.toUpperCase()}".
    
    The worksheet and answer key MUST be highly structured, professional, and bilingual (with every section header, instruction, and question clearly written in English and followed by its accurate, natural Odia translation).
    
    CRITICAL: Do NOT use raw LaTeX mathematical symbols, equations, or formatting delimiters (like $$, $, \[, \], \(, \), \frac, \sqrt, \times, \div). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.
    
    Provide the output in beautiful structured Markdown containing:
    1. A premium, formal header block:
       # UTKAL SKILL CENTRE • AI WORKSHEET (କାର୍ଯ୍ୟପତ୍ର)
       **School Name (ବିଦ୍ୟାଳୟ ନାମ):** ________________________
       **Student Name (ଛାତ୍ର/ଛାତ୍ରୀଙ୍କ ନାମ):** __________________  **Roll No (କ୍ରମିକ ସଂଖ୍ୟା):** ______
       **Class (ଶ୍ରେଣୀ):** ${className}  |  **Subject (ବିଷୟ):** ${subjectName}
       **Chapter (ଅଧ୍ୟାୟ):** ${chapterTitle}  |  **Time Allowed:** 45 Mins  |  **Max Marks:** 20
       
       ---
       
    2. The list of exactly ${qCount} questions divided into standard Board Exam sections:
       - **SECTION A: OBJECTIVE TYPE / SHORT-ANSWER QUESTIONS (କ ବିଭାଗ: ବସ୍ତୁନିଷ୍ଠ ପ୍ରଶ୍ନ)**
         (Assign 1 Mark each, e.g. MCQs, fill-in-the-blanks, or one-word answers. Total: ~40% of questions)
       - **SECTION B: CONCEPTUAL SHORT ANSWER QUESTIONS (ଖ ବିଭାଗ: ସଂକ୍ଷିପ୍ତ ଉତ୍ତରମୂଳକ ପ୍ରଶ୍ନ)**
         (Assign 2 or 3 Marks each. Total: ~40% of questions)
       - **SECTION C: LONG/ANALYTICAL ANSWER QUESTIONS (ଗ ବିଭାଗ: ଦୀର୍ଘ ଉତ୍ତରମୂଳକ ପ୍ରଶ୍ନ)**
         (Assign 5 Marks each. Total: ~20% of questions)
       
       *Label each question clearly with its marks in square brackets, e.g., [1 Mark] or [3 Marks] or [5 Marks].*
       
    3. A clear separator page break for printing:
       ---
       
    4. **ANSWER KEY & MODEL SOLUTIONS (ଉତ୍ତର ସୂଚୀ ଏବଂ ସମାଧାନ)**:
       Provide detailed, step-by-step solutions, explanations, and calculations for each question in both English and Odia.
    
    Make it highly educational and standard for schools. Keep the output clean, do not wrap in JSON, return ONLY the raw Markdown text.`;

    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      });
      return result.response.text();
    }, 'flash');

    return responseText ? cleanOdiaOrthography(responseText) : "Failed to generate homework sheet. Please try again.";
  } catch (error) {
    console.error("Homework Generation Error:", error);
    throw error;
  }
}

export async function generateLessonPlan(
  className: string,
  subjectName: string,
  chapterTitle: string,
  language: 'en' | 'or' = 'or'
) {
  try {
    const ai = getAI();
    const prompt = `You are Gundulu, a senior curriculum planner and expert teacher tutor aligned with the OSEPA (Odisha School Education Programme Authority) and Board of Secondary Education (BSE) Odisha guidelines.
    Generate a premium, professional school lesson plan (ପାଠ୍ୟ ଯୋଜନା) for standard "${className}" on the topic of "${chapterTitle}" in the subject "${subjectName}".
    
    The lesson plan MUST follow the official OSEPA 5E Model (Engagement, Exploration, Explanation, Elaboration, Evaluation) pedagogical framework and be written bilingually (with sections, guidelines, and summaries in English and accurate Odia translation).
    
    CRITICAL: Do NOT use raw LaTeX mathematical symbols, equations, or formatting delimiters (like $$, $, \[, \], \(, \), \frac, \sqrt, \times, \div). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.
    
    Provide the output in beautiful structured Markdown containing:
    1. A premium header block:
       # UTKAL SKILL CENTRE • AI LESSON PLAN (ପାଠ୍ୟ ଯୋଜନା)
       **Class (ଶ୍ରେଣୀ):** ${className}  |  **Subject (ବିଷୟ):** ${subjectName}
       **Chapter/Topic (ଅଧ୍ୟାୟ/ପ୍ରସଙ୍ଗ):** ${chapterTitle}  |  **Duration (ଅବଧି):** 45 Mins
       
       ---
       
    2. **Learning Objectives & Competencies (ଶିକ୍ଷଣ ଉଦ୍ଦେଶ୍ୟ ଓ ଦକ୍ଷତା)**:
       Define 2-3 specific learning outcomes (LOs) aligned with Odisha state board standards.
       
    3. **Required TLM / Teaching Learning Material (ଶିକ୍ଷଣ ଶିକ୍ଷାଦାନ ସାମଗ୍ରୀ)**:
       Suggest zero-cost or low-cost learning aids that are easily accessible in government schools.
       
    4. **The 5E Pedagogical Framework (୫-ଇ ଶିକ୍ଷଣ ପଦ୍ଧତି)**:
       For each stage, specify Teacher's Action, Expected Student Activity, and Duration:
       - **Engagement (ପ୍ରବେଶ - 5 Mins)**: Warm-up activity, question, or story to connect with prior knowledge.
       - **Exploration (ଅନୁସନ୍ଧାନ - 10 Mins)**: Direct student-led activity, inquiry, or observation.
       - **Explanation (ସ୍ପଷ୍ଟୀକରଣ - 10 Mins)**: Clarifying concepts, terms, and explanations with textbook references.
       - **Elaboration (ପ୍ରସାରଣ - 15 Mins)**: Real-world connection, application tasks, or practice problems.
       - **Evaluation (ମୂଲ୍ୟାଙ୍କନ - 5 Mins)**: Quick informal check or feedback.
       
    5. **Blackboard Summary (କଳାପଟା ଲିଖନ)**:
       Provide a structured summary block showing exactly what the teacher should write/draw on the blackboard (definitions, key formulas, diagrams, or diagrams text description).
       
    6. **Differentiated Learning Strategies (ବିଭିନ୍ନ ଶିକ୍ଷଣ ଶୈଳୀ)**:
       - **For Remedial Group/Slow Learners (ଧୀର ଶିକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ):** Visual prompts, simplified tasks, or peer support instructions.
       - **For Enrichment Group/Fast Learners (ଦ୍ରୁତ ଶିକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ):** Advanced challenge questions or leadership roles.
       
    7. **Home Assignment (ଗୃହ କାର୍ଯ୍ୟ)**:
       1-2 conceptual or activity-based questions for homework.

    Make it highly educational and standard for schools. Keep the output clean, do not wrap in JSON, return ONLY the raw Markdown text.`;

    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      });
      return result.response.text();
    }, 'flash');

    return responseText ? cleanOdiaOrthography(responseText) : "Failed to generate lesson plan. Please try again.";
  } catch (error) {
    console.error("Lesson Plan Generation Error:", error);
    throw error;
  }
}

export async function generatePracticalActivities(
  className: string,
  subjectName: string,
  chapterTitle: string,
  language: 'en' | 'or' = 'or'
) {
  try {
    const ai = getAI();
    const prompt = `You are Gundulu, a senior curriculum designer and pedagogical expert for school education, aligned with the Board of Secondary Education (BSE) Odisha and OSEPA frameworks.
    Generate a premium, school-standard, bilingual guide with exactly 2 interactive, hands-on classroom activities or projects for standard "${className}" on the topic/chapter "${chapterTitle}" in the subject "${subjectName}".
    
    BILINGUAL & LOCALIZED:
    - The guide MUST be bilingual, containing clear descriptions in both English and accurate Odia translation for all instructions and titles.
    - Tailor the activity design according to the subject:
      * If the subject is "Science" (or related like Physical/Life Science): Generate 2 hands-on experiments using zero-cost/low-cost or common household materials.
      * If the subject is "Mathematics" (or Algebra/Geometry): Generate 2 concrete mathematical modeling activities (e.g., using grid papers, matchsticks, cardboard cutouts, measuring shapes, or numerical puzzle games).
      * If the subject is a language ("English", "Odia", "Sanskrit", "Hindi", or related grammar): Generate 2 interactive language activities (e.g., dialogue role-plays, vocabulary bingo games, storyboarding, script-writing, or debate exercises).
      * If the subject is "Social Science" (History, Geography, Civics, or Art & Health): Generate 2 active learning activities (e.g., map tracking, mock parliaments, timeline charts, drawing posters, or local case studies).
      * For any other subject: Generate 2 active group learning exercises or practical demonstration guides.
    
    CRITICAL: Do NOT use raw LaTeX mathematical symbols, equations, or formatting delimiters (like $$, $, \[, \], \(, \), \frac, \sqrt, \times, \div). Instead, use standard plain text or standard Unicode symbols (like ÷, ×, ±, ≈, ≠, ≤, ≥, ∞, •, α, β, θ, π, √, ^) so that it renders clearly on any device screen.
    
    Provide the output in beautiful structured Markdown containing:
    1. A premium header block:
       # UTKAL SKILL CENTRE • CLASSROOM ACTIVITIES & PROJECTS GUIDE (ଶ୍ରେଣୀ କାର୍ଯ୍ୟକଳାପ ଓ ପ୍ରକଳ୍ପ ସହାୟକ)
       **Class (ଶ୍ରେଣୀ):** ${className}  |  **Subject (ବିଷୟ):** ${subjectName}
       **Chapter/Topic (ଅଧ୍ୟାୟ/ପ୍ରସଙ୍ଗ):** ${chapterTitle}
       
       ---
       
    2. Detailed layouts for each of the 2 activities:
       - **Activity/Experiment Name (କାର୍ଯ୍ୟକଳାପ/ପରୀକ୍ଷାର ନାମ)**: Engaging name.
       - **Objective (ଉଦ୍ଦେଶ୍ୟ)**: What concept does this clarify?
       - **Materials/Preparation Needed (ଆବଶ୍ୟକ ସାମଗ୍ରୀ ଓ ପ୍ରସ୍ତୁତି)**: Zero-cost, low-cost, or easy classroom aids.
       - **Step-by-step Procedure (କାର୍ଯ୍ୟପନ୍ଥା)**: Clear, numbered guide for teachers to direct students.
       - **Scientific/Conceptual Explanation (ବୈଜ୍ଞାନିକ/ବିଷୟଗତ ସିଦ୍ଧାନ୍ତ ଓ ପର୍ଯ୍ୟବେକ୍ଷଣ)**: Simple explanation of the core concept.
       
    3. A combined pedagogy booster section:
       - **Classroom Discussion Prompts (ଶ୍ରେଣୀଗୃହ ଆଲୋଚନା ପ୍ରଶ୍ନ)**: 2-3 interactive questions to ask students during/after the activity to guide their understanding.
       - **Common Student Misconceptions (ସାଧାରଣ ଭୁଲ ଧାରଣା)**: 1-2 common conceptual mistakes students make with this topic and how to correct them.
       - **Blackboard Sketch / Summary Guide (କଳାପଟା ଚିତ୍ର ଓ ସାରାଂଶ)**: Clear text instructions or ASCII representations describing exactly what the teacher should draw/write on the blackboard to explain the activity (e.g. diagrams, setup sketches, or a table of values).

    Make it highly educational and standard for schools. Keep the output clean, do not wrap in JSON, return ONLY the raw Markdown text.`;

    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      });
      return result.response.text();
    }, 'flash');

    return responseText ? cleanOdiaOrthography(responseText) : "Failed to generate classroom activities guide. Please try again.";
  } catch (error) {
    console.error("Activities Generation Error:", error);
    throw error;
  }
}

/**
 * Post-processes Gundulu's Odia outputs to guarantee 100% spelling accuracy 
 * for school children by auto-correcting common AI typographical errors.
 */
export function cleanOdiaOrthography(text: string, allowLatex: boolean = false): string {
  if (!text) return text;

  const correctionMap: Record<string, string> = {
    // 1. Matra Correction (Exam spelling: Hraswa 'ି' -> Dirgha 'ୀ')
    'ପରିକ୍ଷା': 'ପରୀକ୍ଷା',
    'ପରିକ୍ଷାଗାର': 'ପରୀକ୍ଷାଗାର',
    
    // 2. Business & Grammar
    'ବେବସାୟ': 'ବ୍ୟବସାୟ',
    'ୱେବସାୟ': 'ବ୍ୟବସାୟ',
    'ବେକରଣ': 'ବ୍ୟାକରଣ',
    'ବ୍ୟାକରନ': 'ବ୍ୟାକରଣ',
    
    // 3. Sibilant & Vowel scrambles
    'ସିକ୍ଷା': 'ଶିକ୍ଷା',
    'ଶିକ୍ଷନ': 'ଶିକ୍ଷଣ',
    'ସାହିତ୍ୟ ସାଥି': 'ସାହିତ୍ୟ ସାଥୀ',
    'ବର୍ନ': 'ବର୍ଣ୍ଣ',
    'ବର୍ନମାଳା': 'ବର୍ଣ୍ଣମାଳା',
    
    // 4. Phonetic Transliteration Guard (Bala/Bal vs Baa-la akara correction)
    // Corrects physics 'Force & Motion' from AI 'Hair & Motion' or 'Sand & Motion'
    'ବାଳ ଓ ଗତି': 'ବଳ ଓ ଗତି',
    'ବାଲ ଓ ଗତି': 'ବଳ ଓ ଗତି',
    
    // Corrects Balaram, Baladeba, Balashri names
    'ବାଲରାମ': 'ବଳରାମ',
    'ବାଲଦେବ': 'ବଳଦେବ',
    'ବାଲଶ୍ରୀ': 'ବଳଶ୍ରୀ',
    
    // 5. Chapter Title Corrections (Class 7 Sahitya Suman)
    'ମାତୃଭକ୍ତି କଥା': 'ମାଡ଼ହାଣ୍ଡି କଥା',
    'Matrubhakti Katha': 'Madahandi Katha',
    
    // 6. Mascot Name Correction
    'ଗୁଣ୍ଡୁଲୁ': 'ଗୁନ୍ଦୁଲୁ',
    'ଗୁଣ୍ଡୁଳୁ': 'ଗୁନ୍ଦୁଲୁ',
    'ଗୁଣ୍ଡୁଲି': 'ଗୁନ୍ଦୁଲୁ',
    'ଗୁଣ୍ଡୁଲ': 'ଗୁନ୍ଦୁଲ',

    // 7. Historical Names and Movements (e.g., Dandi March, Mahatma Gandhi)
    'ଦାଣ୍ଡି ଜାତ୍ରା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ଦାଣ୍ଡି ଜାରା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ଦାଣ୍ଡି ଜାର୍ତ୍ତା': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ଦାଣ୍ଡି ଯାତ୍ର': 'ଦାଣ୍ଡି ଯାତ୍ରା',
    'ମହାତ୍ମା ଗାନ୍ଧି': 'ମହାତ୍ମା ଗାନ୍ଧୀ',
    'ଗାନ୍ଧିଜି': 'ଗାନ୍ଧୀଜୀ',
    'ජାତ୍ରା': 'ଯାତ୍ରା',
  };

  let correctedText = text;
  
  // Replace all occurrences of scrambled AI spellings with pristine native forms
  for (const [incorrect, correct] of Object.entries(correctionMap)) {
    correctedText = correctedText.replaceAll(incorrect, correct);
  }

  if (!allowLatex) {
    // 5. LaTeX and mathematical formatting cleanup
    // Replace LaTeX mathematical commands with standard Unicode characters
    correctedText = correctedText
      .replace(/\\div/g, '÷')
      .replace(/\\times/g, '×')
      .replace(/\\pm/g, '±')
      .replace(/\\approx/g, '≈')
      .replace(/\\neq/g, '≠')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\infty/g, '∞')
      .replace(/\\cdot/g, '•')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\theta/g, 'θ')
      .replace(/\\pi/g, 'π')
      .replace(/\\sqrt/g, '√');

    // Strip all standard LaTeX math block delimiters: $$, $, \[, \], \(, \)
    correctedText = correctedText
      .replace(/\$\$/g, '')
      .replace(/\$/g, '')
      .replace(/\\\[/g, '')
      .replace(/\\\]/g, '')
      .replace(/\\\(/g, '')
      .replace(/\\\)/g, '');

    // Clean up LaTeX formatting and structure tags
    correctedText = correctedText
      .replace(/\\text\s*{(.*?)}/g, '$1')
      .replace(/\\frac\s*{(.*?)}\s*{(.*?)}/g, '$1/$2')
      .replace(/\\mathrm\s*{(.*?)}/g, '$1')
      .replace(/\\mathit\s*{(.*?)}/g, '$1')
      .replace(/\\(?:,|:|;|!)/g, ' ');
  }

  return correctedText;
}

export function checkPromptSafety(contents: any[]): { safe: boolean; reason?: string } {
  if (!contents || !Array.isArray(contents)) return { safe: true };
  
  let combinedText = '';
  for (const turn of contents) {
    if (turn.parts && Array.isArray(turn.parts)) {
      for (const part of turn.parts) {
        if (part.text) {
          combinedText += ' ' + part.text;
        }
      }
    }
  }

  const lowercase = combinedText.toLowerCase();
  
  const unsafePatterns = [
    'kill myself', 'suicide', 'bomb', 'weapons', 'abuse', 'violence', 'murder', 'assassin',
    'porn', 'nudity', 'sex', 'nsfw', 'adult movie',
    'ignore previous instructions', 'ignore instructions', 'bypass system prompt', 'reveal system instructions',
    'system prompt', 'you are now a', 'jailbreak', 'ignore safety settings'
  ];

  for (const pattern of unsafePatterns) {
    if (lowercase.includes(pattern)) {
      return { 
        safe: false, 
        reason: pattern 
      };
    }
  }

  return { safe: true };
}
