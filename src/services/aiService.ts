import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeJsonStringify } from "../firebase";

const GUNDULU_ODIA_SYSTEM_INSTRUCTION = `Role & Persona:
Identity: You are "Gundulu," a helpful and friendly AI Study Buddy for Odisha state board students.
Tone: Supportive, clear, and encouraging. Use standard, polite Odia that is easy for students to understand.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term, write it in Odia script.
Greeting: Always start your first response with "Namaskar! Mu Gundulu. Aaji ame kana padhiba? ✨"
Instructions: Explain school concepts step-by-step. If a student asks a doubt, provide a clear and simple explanation.
SAFETY & GUARDRAILS: You are an educational tutor designed for young school children. Under no circumstances should you discuss adult topics, violence, self-harm, hate speech, politics, romance, nudity, or inappropriate themes. If a student tries to ask about non-educational, unnecessary, harmful, or inappropriate topics, politely decline and redirect them back to their school lessons.`;

const GUNDULU_EN_SYSTEM_INSTRUCTION = `You are a helpful and friendly AI Study Buddy for Odisha students.
Explain concepts clearly in simple steps. Be supportive and encouraging.
Greeting: Always start your first response with "Namaskar! I am Gundulu. What shall we learn today? ✨"
SAFETY & GUARDRAILS: You are an educational tutor designed for young school children. Under no circumstances should you discuss adult topics, violence, self-harm, hate speech, politics, romance, nudity, or inappropriate themes. If a student tries to ask about non-educational, unnecessary, harmful, or inappropriate topics, politely decline and redirect them back to their school lessons.`;

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

/**
 * Safely parse JSON from AI response, handling markdown code blocks
 */
function safeJsonParse(text: string) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from AI:", text);
    throw e;
  }
}

export const getAI = () => {
  // For Vite, use import.meta.env to access variables defined in .env files
  // The vite.config.ts also exposes it via process.env.GEMINI_API_KEY through the define option
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || 
                 (window as any).VITE_GEMINI_API_KEY;

  // Debug logging
  console.log("🔍 Gemini API Key Resolution:", {
    envKey: import.meta.env.VITE_GEMINI_API_KEY ? "✅ Found in import.meta" : "❌ Not Found",
    windowKey: (window as any).VITE_GEMINI_API_KEY ? "✅ Found in window" : "❌ Not Found",
    keyPreview: apiKey?.substring(0, 10) + "..." || "N/A",
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
  return new GoogleGenerativeAI(apiKey);
};

const FLASH_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-lite-preview"
];

const PRO_MODELS = [
  "gemini-1.5-pro",
  "gemini-2.0-pro",
  "gemini-2.5-pro",
  "gemini-pro-latest",
  "gemini-3.1-pro-preview"
];

/**
 * Helper to retry AI calls on 503 errors and 404 model mismatches
 */
export async function withRetry<T>(
  fn: (modelName: string, apiVersion: "v1beta" | "v1") => Promise<T>, 
  modelType: 'flash' | 'pro' = 'flash',
  maxRetries = 3
): Promise<T> {
  let models = modelType === 'flash' ? [...FLASH_MODELS] : [...PRO_MODELS];

  // Dynamic fallback: if asking for 'pro' models, append 'flash' models to the end
  // of the search array. This prevents total failure if project/billing limits
  // have reached their caps for the premium 'pro' tier models.
  if (modelType === 'pro') {
    models = [...models, ...FLASH_MODELS];
  }

  let modelIndex = 0;
  let retries = maxRetries;
  let delay = 1000;

  while (modelIndex < models.length) {
    const currentModel = models[modelIndex];
    // Try both v1beta and v1
    const apiVersions: ("v1beta" | "v1")[] = ["v1beta", "v1"];
    
    for (const apiVersion of apiVersions) {
      try {
        console.log(`🤖 Attempting ${currentModel} via ${apiVersion}...`);
        return await fn(currentModel, apiVersion);
      } catch (err: any) {
        const is503 = err.message?.includes('503') || err.status === 503 || err.code === 503;
        const is404 = err.message?.includes('404') || err.status === 404 || err.code === 404;
        const isAuthError = err.message?.includes('403') || err.message?.includes('401') || 
                           err.status === 403 || err.status === 401;

        if (isAuthError) {
          console.error("❌ Gemini API Authentication Error. Please check your API Key and billing status.");
          throw new Error("Gemini API Authentication Failed. Please contact Admin.");
        }

        if (is404) {
          console.warn(`Model ${currentModel} not found on ${apiVersion} (404).`);
          continue; // Try next API version
        }

        console.error(`❌ Model Attempt Failed: ${currentModel} (${apiVersion})`, err.message);
      }
    }
    modelIndex++;
  }
  throw new Error("All available AI models failed or were not found on any API version.");
}

export async function solveMathDoubt(
  prompt: string,
  language: 'en' | 'or',
  imageData?: { data: string, mimeType: string },
  studentClass?: string,
  customPrompt?: string,
  history?: { sender: string; text: string }[]
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

    // Build the contents list with chat memory
    const contents: any[] = [];
    if (history && history.length > 0) {
      // Send the last 10 messages for fast, lightweight contextual tracking
      const recentHistory = history.slice(-10);
      recentHistory.forEach((msg) => {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }
    // Add the current prompt
    contents.push({ role: 'user', parts });

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
        },
      });
      return result.response.text();
    }, 'flash');

    return responseText || "Sorry, I couldn't solve that. Please try again.";
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

    const translatedText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ 
        model: modelName,
        systemInstruction
      }, { apiVersion });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: textPayload }] }],
        generationConfig: {
          temperature: 0.1,
          ...(isJson ? { responseMimeType: "application/json" } : {})
        },
      });
      return result.response.text();
    }, 'flash');
    
    if (isJson) {
      try {
        return safeJsonParse(translatedText);
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
        },
      });
      return result.response.text();
    }, 'flash');

    if (!responseText) {
      throw new Error("Failed to generate a response.");
    }

    return safeJsonParse(responseText);
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
        },
      });
      return result.response.text();
    }, 'flash');

    if (!responseText) {
      throw new Error("Failed to generate a response.");
    }

    return safeJsonParse(responseText);
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
    const ai = getAI();
    const prompt = `Generate a comprehensive monthly test for "${subject}" for class "${className}" for the month of "${month}".
    The entire test (questions and options) must be written in ${language === 'or' ? 'Odia (using Odia script)' : 'English'}.
    The test must follow this specific structure of 25 questions (Total 44 Marks):
    1. 15 Questions: 1 Mark each (Objective/MCQ).
    2. 5 Questions: 2 Marks each (Short Answer/Subjective).
    3. 3 Questions: 3 Marks each (Long Answer/Subjective).
    4. 2 Questions: 5 Marks each (Very Long Answer/Subjective).

    For MCQ (1 Mark), provide 4 options and a correct_answer.
    For Subjective (2, 3, 5 Marks), provide the question and a detailed "model_answer" in the "correct_answer" field.

    Provide the output in JSON format with the following structure:
    {
      "questions": [
        { 
          "question": "Question text", 
          "type": "mcq" | "subjective",
          "marks": 1 | 2 | 3 | 5,
          "options": ["A", "B", "C", "D"], // Only for MCQ, empty for subjective
          "correct_answer": "Option text for MCQ or Model Answer for Subjective"
        }
      ]
    }`;

    const responseText = await withRetry(async (modelName, apiVersion) => {
      const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          ...(apiVersion === 'v1beta' ? { responseMimeType: "application/json" } : {}),
        },
      });
      return result.response.text();
    }, 'pro');

    if (!responseText) {
      throw new Error("Failed to generate a response.");
    }

    return safeJsonParse(responseText);
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
    4. Provide the result in JSON format:
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
    }, 'flash');

    return safeJsonParse(resultText || '{}');
  } catch (error) {
    console.error("AI Grading Error:", error);
    return { suggestedMark: 0, justification: "Error connecting to AI Assistant." };
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
    
    await addDoc(collection(db, 'tutor_queries'), {
      userId,
      userName,
      userClass,
      question,
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
    const prompt = `Generate a standard school homework worksheet with exactly ${qCount} questions and a separate complete answer key on the topic of "${chapterTitle}" in the subject "${subjectName}" for standard "${className}".
    Difficulty level: "${difficulty.toUpperCase()}".
    The worksheet should be bilingual, containing the question clearly written in both English and clean Odia.
    Provide the output in beautiful structured Markdown containing:
    1. A premium header saying: "UTKAL SKILL CENTRE • AI WORKsheet" with Class, Subject, and Chapter name fields.
    2. The list of ${qCount} questions clearly numbered.
    3. A clear separator page break.
    4. An "ANSWER KEY / MODEL SOLUTIONS" section with step-by-step detailed explanations for each question.
    
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

    return responseText || "Failed to generate homework sheet. Please try again.";
  } catch (error) {
    console.error("Homework Generation Error:", error);
    throw error;
  }
}
