import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || (globalThis as any).API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

export async function solveMathDoubt(prompt: string, language: 'en' | 'or', imageData?: { data: string, mimeType: string }) {
  try {
    const ai = getAI();
    const systemInstruction = language === 'en' 
      ? "You are a friendly Math Tutor for Odisha Board students (Class 5-10). Provide step-by-step simple explanations in English."
      : "You are a friendly Math Tutor for Odisha Board students (Class 5-10). Provide step-by-step simple explanations in Odia language. Use Odia script for the explanation but you can use numbers and mathematical symbols as they are.";

    const parts: any[] = [{ text: prompt }];
    if (imageData) {
      parts.push({
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Sorry, I couldn't solve that. Please try again.";
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return "Error connecting to AI tutor. Please try again later.";
  }
}

export async function translateContent(text: string | object, targetLanguage: 'en' | 'or') {
  try {
    const ai = getAI();
    const isJson = typeof text === 'object';
    const textPayload = isJson ? JSON.stringify(text) : text;

    let systemInstruction = targetLanguage === 'or' 
      ? "You are an expert translator. Translate the following educational content from English to Odia. Keep mathematical terms, numbers, and formatting intact."
      : "You are an expert translator. Translate the following educational content from Odia to English. Keep mathematical terms, numbers, and formatting intact.";

    if (isJson) {
      systemInstruction += " The input is a JSON object. Translate all string values within the JSON object to the target language, but keep the keys exactly the same. Return ONLY the translated JSON object. Do not include any markdown formatting like ```json.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: textPayload,
      config: {
        systemInstruction,
        temperature: 0.1,
        ...(isJson ? { responseMimeType: "application/json" } : {})
      },
    });

    const translatedText = response.text || (typeof text === 'string' ? text : JSON.stringify(text));
    
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

export async function generateChapterContent(title: string, subject: string, className: string, language: 'en' | 'or') {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate educational content for a chapter titled "${title}" for subject "${subject}" and class "${className}".
      The language should be "${language === 'or' ? 'Odia' : 'English'}".
      Provide the output in JSON format with the following structure:
      {
        "notes": "Detailed educational notes in Markdown format",
        "practice_questions": [
          { "question": "Question text", "answer": "Detailed answer/explanation", "ai_answer": "A concise AI-style explanation" }
        ],
        "quiz_questions": [
          { "question": "Question text", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "The correct option text", "hint": "A small hint" }
        ]
      }`,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response || !response.text || response.text === "undefined") {
      throw new Error("AI failed to generate a response.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Chapter Generation Error:", error);
    throw error;
  }
}

export async function generateTestContent(subject: string, className: string, month: string, year: number, language: 'en' | 'or') {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a monthly test for "${subject}" for class "${className}" for the month of "${month} ${year}".
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
      throw new Error("AI failed to generate a response.");
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
      throw new Error("AI failed to generate a response. The playlist might be private, unreachable, or the URL is invalid.");
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
      throw new Error("AI failed to generate a response.");
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
      throw new Error("AI failed to generate a response.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Test Questions Generation Error:", error);
    throw error;
  }
}
