export async function solveMathDoubt(prompt: string, language: 'en' | 'or') {
  try {
    const res = await fetch('/api/ai/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Error ${res.status}`);
    }

    const data = await res.json();
    return data.text || "Sorry, I couldn't solve that. Please try again.";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Error connecting to AI tutor. Please try again later.";
  }
}

export async function translateContent(text: string | object, targetLanguage: 'en' | 'or') {
  try {
    const isJson = typeof text === 'object';
    const textPayload = isJson ? JSON.stringify(text) : text;

    const res = await fetch('/api/ai/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textPayload, targetLanguage, isJson }),
    });

    if (!res.ok) {
      return text; // Fallback to original text on error
    }

    const data = await res.json();
    
    if (isJson && data.text) {
      try {
        return JSON.parse(data.text);
      } catch (e) {
        console.error("Failed to parse translated JSON", e);
        return text; // Fallback to original if parsing fails
      }
    }

    return data.text || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // Fallback to original text
  }
}
