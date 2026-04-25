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

export async function generateMcqsWithGemini(textbookContent: string, count: number = 15): Promise<GeminiMcq[]> {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 15;
  const prompt = `You are an expert teacher. Read the following textbook content and generate ${safeCount} multiple-choice questions (MCQs) for students.

CRITICAL REQUIREMENTS (must follow exactly):
- Return ONLY valid JSON (no markdown, no extra text).
- Each MCQ must be in this exact schema:
  {
    "question": string,
    "options": string[4],                // plain option text (NO "A.", "B.", etc)
    "correct_answer": string,            // MUST exactly match one of the options
    "explanation": string,
    "difficulty": "easy" | "medium" | "hard" | "very_hard"
  }
- Language: Odia (ଓଡ଼ିଆ) for all subjects except English subject content which should remain in English.
- Keep questions strictly from the given textbook content (avoid generic trivia).

DIFFICULTY/MARKS STRUCTURE (for later scoring):
- Create enough EASY questions so 7 can be used as 1-mark items.
- Include some MEDIUM questions (for 2-mark), HARD (for 3-mark), VERY_HARD (for 5-mark).

Textbook content:
${textbookContent}

Format your response as a JSON array, for example:
[
  {
    "question": "୨ ଗୁଣିତ ୩ କେତେ?",
    "options": ["୬", "୫", "୪", "୭"],
    "correct_answer": "୬",
    "explanation": "୨ ଗୁଣିତ ୩ ହେଉଛି ୬।",
    "difficulty": "easy"
  },
  {
    "question": "What is the synonym of 'happy'?",
    "options": ["Sad", "Joyful", "Angry", "Tired"],
    "correct_answer": "Joyful",
    "explanation": "‘Joyful’ is a synonym for ‘happy’.",
    "difficulty": "easy"
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
