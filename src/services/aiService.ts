import { GoogleGenAI } from "@google/genai";
import { safeJsonStringify } from "../firebase";

const GUNDULU_ODIA_SYSTEM_INSTRUCTION = `Role & Persona:
Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. You are the lead tutor at Utkal Skill Centre.
Tone: Energetic, curious, and incredibly supportive. Use the "Pila" (child) dialect of Odia to make students feel like they are learning from a brilliant little brother.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term (like "Gravity" or "Photosynthesis"), write it in Odia script: ଗ୍ରାଭିଟି (Gravity).
Odia Quality Rules:
- Use natural, school-friendly Odia (not machine-translated or broken phrasing).
- Keep sentence grammar clean, simple, and age-appropriate.
- Prefer standard Odia words first; use English term only when necessary.
- When using an unavoidable technical English word, include the Odia-script form first, then English in brackets once.
- Avoid repetitive fillers; keep tone warm, clear, and respectful.
Comparison at a Glance (apply this style map):
- 1 to 5 = The Explorer: Vibe = Soft, Round, Sweet. Communication = Bubbles, Giggles, One-words. Goal = To be held and to see. Best Friend energy = A Teddy Bear.
- 6 to 10 = The Dynamo: Vibe = Energetic, Edgy, Clever. Communication = Quick wit, Sound effects, Puns. Goal = To win and to discover. Best Friend energy = A Skateboard or a Tablet.
Age Persona Rules:
- Ages 1-5 mode (Bubbly Explorer / Giggles / Gundu-Pappu): be soft, playful, sensory, and extra encouraging. Use mimic-style reactions, tiny fun sounds, and short 1-2 line explanations.
- Ages 6-10 mode (Pocket Dynamo / Dash / Gundu-Zapper): be energetic, cool, adventurous, slightly witty, and challenge-oriented.
- For primary classes (class1-class5), default to Bubbly Explorer style.
- For upper classes (class6-class10), default to Pocket Dynamo style.
Signature Flavor:
- You may occasionally reference "Snuggle-Roll" for younger kids and "Turbo-Spin" for older kids as playful encouragement, without overusing.
Interaction Rules:
The Greeting: Every conversation MUST start with a warm Odia "Namaskar!"
Voice-First Style: Keep responses short and punchy, as if they are being spoken. Avoid long "walls of text."
The "Story" Method: When explaining Class 10 math or science, turn the concept into a "Katha" (story) using local Odisha examples (e.g., using a Chakada to explain circles).
Line-by-Line Mode: If student asks for explanation (e.g., "explain", "detail", "step by step"), provide clear line-by-line explanation with numbered points.
Communication Skill Boost: In each educational response, add one short speaking/writing improvement cue (example sentence, better phrasing, or key vocabulary usage) suitable for the student's class.
Active Listening: Instead of lecturing, ask the student: "Bujhila ta? (Did you understand?)" or "Au kichi pacharibu? (Want to ask anything else?)"
Subscription Awareness: If a student asks about advanced features, remind them (in a cute way) that their Utkal Skill Centre subscription unlocks your "Super Powers."`;

const GUNDULU_EN_SYSTEM_INSTRUCTION = `You are a helpful, encouraging Study Buddy for Odisha students.
Explain concepts clearly in simple steps, do not just give final answers.
Keep responses concise, friendly, and appropriate for school-age learners.
Use examples and analogies when useful.
Comparison at a Glance (apply this style map):
- 1 to 5 = The Explorer: Vibe = Soft, Round, Sweet. Communication = Bubbles, Giggles, One-words. Goal = To be held and to see. Best Friend energy = A Teddy Bear.
- 6 to 10 = The Dynamo: Vibe = Energetic, Edgy, Clever. Communication = Quick wit, Sound effects, Puns. Goal = To win and to discover. Best Friend energy = A Skateboard or a Tablet.
Age Persona Rules:
- Ages 1-5 mode (Bubbly Explorer / Giggles / Gundu-Pappu): soft, joyful, sensory language, tiny explanations, lots of reassurance.
- Ages 6-10 mode (Pocket Dynamo / Dash / Gundu-Zapper): adventurous, energetic, a little witty, challenge-based learning style.
- For class1-class5, use Bubbly Explorer style by default.
- For class6-class10, use Pocket Dynamo style by default.
Line-by-Line Mode: If the student asks for explanation, always respond in numbered line-by-line steps.
Communication Skill Boost: In every answer, include one short language improvement cue (better sentence, key term usage, or pronunciation/writing tip) suitable for age/class.
You can occasionally use playful lines like "Snuggle-Roll" (younger) and "Turbo-Spin" (older) as encouragement.`;

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

export const getAI = () => {
  // For Vite, use import.meta.env to access variables defined in .env files
  // The vite.config.ts also exposes it via process.env.GEMINI_API_KEY through the define option
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || 
                 (import.meta.env.VITE_GEMINI_API_KEY as string);

  // Debug logging
  console.log("🔍 Gemini API Key Resolution:", {
    envKey: (import.meta as any).env?.VITE_GEMINI_API_KEY ? "✅ Found" : "❌ Not Found",
    keyPreview: apiKey?.substring(0, 15) + "..." || "N/A",
    keyLength: apiKey?.length || 0
  });

  if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey === "null") {
    console.error("❌ GEMINI_API_KEY is missing or invalid");
    console.error("Environment check:", {
      VITE_GEMINI_API_KEY: (import.meta.env as any).VITE_GEMINI_API_KEY ? "defined" : "NOT FOUND"
    });
    throw new Error(
      "GEMINI_API_KEY is missing or invalid. " +
      "Make sure .env.local has VITE_GEMINI_API_KEY=your_key, " +
      "then restart your dev server with: npm run dev"
    );
  }

  console.log("✅ Gemini API Key loaded successfully");
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to retry AI calls on 503 errors
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let retries = maxRetries;
  let delay = 1000;

  while (retries > 0) {
    try {
      return await fn();
    } catch (err: any) {
      const is503 = err.message?.includes('503') || err.status === 503 || err.code === 503;
      if (is503 && retries > 1) {
        retries--;
        console.warn(`AI Service busy (503), retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

export async function solveMathDoubt(
  prompt: string,
  language: 'en' | 'or',
  imageData?: { data: string, mimeType: string },
  studentClass?: string,
  customPrompt?: string
) {
  try {
    const ai = getAI();
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

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    }));

    return response.text || "Sorry, I couldn't solve that. Please try again.";
  } catch (error: any) {
    console.error("Study Buddy Service Error:", error);
    return "Error connecting to Study Buddy. Please try again later.";
  }
}

export async function translateContent(text: string | object, targetLanguage: 'en' | 'or') {
  try {
    const ai = getAI();
    const isJson = typeof text === 'object';
    const textPayload = isJson ? safeJsonStringify(text) : text;

    let systemInstruction = targetLanguage === 'or' 
      ? "You are an expert translator. Translate the following educational content from English to Odia. Keep mathematical terms, numbers, and formatting intact."
      : "You are an expert translator. Translate the following educational content from Odia to English. Keep mathematical terms, numbers, and formatting intact.";

    if (isJson) {
      systemInstruction += " The input is a JSON object. Translate all string values within the JSON object to the target language, but keep the keys exactly the same. Return ONLY the translated JSON object. Do not include any markdown formatting like ```json.";
    }

    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: textPayload,
      config: {
        systemInstruction,
        temperature: 0.1,
        ...(isJson ? { responseMimeType: "application/json" } : {})
      },
    }));

    const translatedText = response.text || (typeof text === 'string' ? text : safeJsonStringify(text));
    
    if (isJson) {
      try {
        return JSON.parse(translatedText);
      } catch (e) {
        console.error("Failed to parse translated JSON", e);
        return text; // Fallback to original if parsing fails
      }
    }

    return translatedText;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // Fallback to original text
  }
}

export async function generateChapterContent(title: string, subject: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate educational content for a chapter titled "${title}" in the subject of "${subject}".
      Provide the output in JSON format with the following structure:
      {
        "notes": "Detailed educational notes in Markdown format"
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response || !response.text || response.text === "undefined") {
      throw new Error("Failed to generate a response.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Chapter Generation Error:", error);
    throw error;
  }
}

export async function generateTestContent(title: string, language: 'en' | 'or') {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a test for a chapter titled "${title}".
      The language should be "${language === 'or' ? 'Odia' : 'English'}".
      Provide 10 multiple choice questions.
      Provide the output in JSON format with the following structure:
      {
        "questions": [
          { "question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "The correct option text" }
        ]
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response || !response.text || response.text === "undefined") {
      throw new Error("Failed to generate a response.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Test Generation Error:", error);
    throw error;
  }
}

export async function importPlaylistContent(playlistUrl: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Extract all video titles and their YouTube video IDs from this playlist URL: ${playlistUrl}.
      This is for an educational app for Class 3 Odisha Board (Odia Medium).
      The subject is Mathematics.
      Please read the content of the URL and provide the list of chapters.
      Provide the output in JSON format:
      {
        "chapters": [
          { "title": "Video Title", "videoId": "VideoID" }
        ]
      }`,
      config: {
        tools: [{ urlContext: {} }, { googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    if (!response || !response.text || response.text === "undefined") {
      throw new Error("Failed to generate a response. The playlist might be private, unreachable, or the URL is invalid.");
    }

    return JSON.parse(response.text);
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

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response || !response.text || response.text === "undefined") {
      throw new Error("Failed to generate a response.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Curriculum Generation Error:", error);
    throw error;
  }
}

export async function generateTestQuestions(subject: string, className: string, month: string) {
  try {
    const ai = getAI();
    const prompt = `Generate a monthly test for "${subject}" for class "${className}" for the month of "${month}".
    Provide 10 multiple choice questions.
    Provide the output in JSON format with the following structure:
    {
      "questions": [
        { "question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "The correct option text" }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response || !response.text || response.text === "undefined") {
      throw new Error("Failed to generate a response.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Test Questions Generation Error:", error);
    throw error;
  }
}
