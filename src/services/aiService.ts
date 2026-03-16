import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function solveMathDoubt(prompt: string, language: 'en' | 'or') {
  try {
    const systemInstruction = language === 'en' 
      ? "You are a friendly Math Tutor for Odisha Board students (Class 5-10). Provide step-by-step simple explanations in English."
      : "You are a friendly Math Tutor for Odisha Board students (Class 5-10). Provide step-by-step simple explanations in Odia language. Use Odia script for the explanation but you can use numbers and mathematical symbols as they are.";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Sorry, I couldn't solve that. Please try again.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Error connecting to AI tutor. Please check your API key.";
  }
}
