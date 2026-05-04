import { GoogleGenerativeAI } from "@google/generative-ai";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return new GoogleGenerativeAI(apiKey);
};

export async function translateToBilingual(text: string): Promise<{ en: string; or: string }> {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ 
      model: "gemini-3.1-flash" 
    });

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Translate the following text into both English and Odia. Return the result as a JSON object with keys "en" and "or".
      Text: "${text}"` }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.response.text();
    return JSON.parse(resultText || '{"en": "", "or": ""}');
  } catch (error) {
    console.error("Bilingual Translation Error:", error);
    return { en: text, or: text }; // Fallback
  }
}
