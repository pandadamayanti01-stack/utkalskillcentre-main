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
