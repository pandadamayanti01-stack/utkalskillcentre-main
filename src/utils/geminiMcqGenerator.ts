import axios from 'axios';

// Replace with your Gemini API endpoint and key
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '<YOUR_GEMINI_API_KEY>';
console.log('[GeminiMCQ] Using GEMINI_API_KEY:', GEMINI_API_KEY);

export interface GeminiMcq {
  subject: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export async function generateMcqsWithGemini(textbookContent: string): Promise<GeminiMcq[]> {
  const prompt = `You are an expert teacher. Read the following textbook content and generate 5 multiple-choice questions (MCQs) for students. Each MCQ should:
Be written in Odia (ଓଡ଼ିଆ), except for English subject content, which should remain in English.
Cover all subjects present in the text.
Have a mix of easy, medium, and high difficulty questions.
Each question should have:
  1 question
  4 options (A, B, C, D)
  The correct answer (as the option letter)
  A brief explanation in the same language as the question

Textbook content:
${textbookContent}

Format your response as a JSON array, for example:
[
  {
    "subject": "ମାଥ୍ (Math)",
    "question": "୨ ଗୁଣିତ ୩ କେତେ?",
    "options": ["A. ୬", "B. ୫", "C. ୪", "D. ୭"],
    "correct_answer": "A",
    "explanation": "୨ ଗୁଣିତ ୩ ହେଉଛି ୬।"
  },
  {
    "subject": "English","
    "question": "What is the synonym of 'happy'?",
    "options": ["A. Sad", "B. Joyful", "C. Angry", "D. Tired"],
    "correct_answer": "B",
    "explanation": "‘Joyful’ is a synonym for ‘happy’."
  }
  // ...more questions
]
`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
    });
    // Gemini's response may contain the JSON as a string in response.data.candidates[0].content.parts[0].text
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini');
    // Try to extract the JSON array from the response
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    const jsonString = text.substring(jsonStart, jsonEnd);
    const mcqs: GeminiMcq[] = JSON.parse(jsonString);
    return mcqs;
  } catch (error) {
    console.error('[GeminiMCQ] Error generating MCQs:', error);
    throw error;
  }
}
