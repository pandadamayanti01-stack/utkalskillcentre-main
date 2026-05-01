import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenAI(process.env.VITE_GEMINI_API_KEY || "");
  try {
    // There is no direct listModels in @google/genai web SDK, 
    // but we can try to initialize some common ones.
    const models = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-1.5-pro-latest",
      "gemini-2.0-flash-exp"
    ];

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("hi");
        console.log(`✅ Model ${modelName} is WORKING`);
      } catch (e: any) {
        console.log(`❌ Model ${modelName} FAILED: ${e.message}`);
      }
    }
  } catch (error: any) {
    console.error("Error listing models:", error.message);
  }
}

listModels();
