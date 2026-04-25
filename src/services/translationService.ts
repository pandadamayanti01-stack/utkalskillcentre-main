import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function translateToBilingual(text: string): Promise<{ en: string; or: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text into both English and Odia. Return the result as a JSON object with keys "en" and "or".
    Text: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING },
          or: { type: Type.STRING },
        },
        required: ["en", "or"],
      },
    },
  });

  return JSON.parse(response.text || '{"en": "", "or": ""}');
}
