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
  difficulty: "easy" | "medium" | "hard" | "very_hard";
  type: "mcq" | "subjective";
}

export async function generateMcqsWithGemini(textbookContent: string, count: number = 15): Promise<GeminiMcq[]> {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 10;
  const prompt = `You are an expert teacher. Read the following textbook content and generate a set of ${safeCount} practice questions for students.

STRUCTURE REQUIREMENTS:
- Total Questions: ${safeCount}
- 7 Questions: Multiple Choice (MCQ) - These should be EASY (1-mark level).
- 3 Questions: Subjective/Descriptive (Short Answer) - These should be MEDIUM/HARD (2, 3, or 5 mark level).

CRITICAL REQUIREMENTS (must follow exactly):
- Return ONLY valid JSON (no markdown, no extra text).
- Each question must be in this exact schema:
  {
    "question": string,
    "type": "mcq" | "subjective",
    "options": string[],                 // For MCQ: 4 options (NO "A.", "B.", etc). For subjective: EMPTY ARRAY [].
    "correct_answer": string,            // For MCQ: exactly match one option. For subjective: a model short answer.
    "explanation": string,               // Detailed logic or step-by-step solution.
    "difficulty": "easy" | "medium" | "hard" | "very_hard"
  }
- Language: Odia (ଓଡ଼ିଆ) for all subjects except English subject content which should remain in English.
- Keep questions strictly from the given textbook content.

Textbook content:
${textbookContent}

Format your response as a JSON array, for example:
[
  {
    "question": "୨ ଗୁଣିତ ୩ କେତେ?",
    "type": "mcq",
    "options": ["୬", "୫", "୪", "୭"],
    "correct_answer": "୬",
    "explanation": "୨ ଗୁଣିତ ୩ ହେଉଛି ୬।",
    "difficulty": "easy"
  },
  {
    "question": "ଦ୍ୟୁତି-ସଂଶ୍ଲେଷଣ (Photosynthesis) କହିଲେ କଣ ବୁଝ?",
    "type": "subjective",
    "options": [],
    "correct_answer": "ସବୁଜ ଉଦ୍ଭିଦମାନେ ସୂର୍ଯ୍ୟାଲୋକ ଉପସ୍ଥିତିରେ ନିଜ ଖାଦ୍ୟ ପ୍ରସ୍ତୁତ କରିବା ପ୍ରକ୍ରିୟାକୁ ଦ୍ୟୁତି-ସଂଶ୍ଲେଷଣ କୁହାଯାଏ।",
    "explanation": "ଏହି ପ୍ରକ୍ରିୟାରେ ଅଙ୍ଗାରକାମ୍ଳ ଏବଂ ଜଳ ବ୍ୟବହାର ହୁଏ।",
    "difficulty": "medium"
  }
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
