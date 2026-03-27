import React, { useState, useEffect, useRef } from 'react';
import './GunduluHuman.css';
import { getAI } from '../services/aiService';

const GunduluHuman = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'or-IN'>('or-IN');
  const [status, setStatus] = useState(language === 'en-US' ? "Namaskar! I am Gundulu. What shall we learn today?" : "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆଜି ଆମେ କ’ଣ ପଢ଼ିବା? ✨");
  const [subtitle, setSubtitle] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Speak initial greeting with robust voice selection
    const speakGreeting = () => {
      const greeting = language === 'en-US' ? "Namaskar! I am Gundulu. What shall we learn today?" : "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆଜି ଆମେ କ’ଣ ପଢ଼ିବା?";
      setSubtitle(greeting);
      const utterance = new SpeechSynthesisUtterance(greeting);
      
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.includes(language)) || null;
      
      utterance.voice = voice;
      utterance.lang = language;
      utterance.pitch = 1.8;
      utterance.onend = () => {
        setIsSpeaking(false);
        triggerVisualNudge();
      };
      window.speechSynthesis.speak(utterance);
    };
    
    // Handle voices being loaded asynchronously
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', speakGreeting, { once: true });
    } else {
      speakGreeting();
    }

    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language; 
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus(language === 'en-US' ? "Gundulu is Listening... 👂" : "ଗୁଣ୍ଡୁଲୁ ଶୁଣୁଛି... 👂");
        setSubtitle(language === 'en-US' ? "Gundulu is Listening..." : "ଗୁଣ୍ଡୁଲୁ ଶୁଣୁଛି...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSubtitle(language === 'en-US' ? `You said: "${transcript}"` : `ଆପଣ କହିଲେ: "${transcript}"`);
        processWithGemini(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatus(language === 'en-US' ? "Touch to Talk to Gundulu" : "ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        
        let errorMsg = "";
        if (event.error === 'not-allowed') {
          errorMsg = language === 'en-US' 
            ? "Microphone permission denied. Check settings." 
            : "ମାଇକ୍ରୋଫୋନ୍ ଅନୁମତି ମିଳିଲା ନାହିଁ |";
        } else if (event.error === 'network') {
          errorMsg = language === 'en-US'
            ? "Network error. Try opening in a new tab."
            : "ନେଟୱାର୍କ ତ୍ରୁଟି | ନୂତନ ଟ୍ୟାବ୍‌ରେ ଖୋଲନ୍ତୁ |";
        } else {
          errorMsg = language === 'en-US' ? "Could not hear you. Try again!" : "ଶୁଣିପାରିଲି ନାହିଁ | ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
        }
        
        setSubtitle(errorMsg);
        setStatus(errorMsg);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const triggerVisualNudge = () => {
    setIsWaitingForInput(true);
    setTimeout(() => setIsWaitingForInput(false), 2000);
  };

  const processWithGemini = async (transcript: string) => {
    setStatus(language === 'en-US' ? "Gundulu is thinking..." : "ଗୁଣ୍ଡୁଲୁ ଚିନ୍ତା କରୁଛି...");
    setIsListening(false);
    setIsSpeaking(true);
    
    try {
      const ai = getAI();
      const model = 'gemini-3-flash-preview';
      const systemInstruction = `Role & Persona:
Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. You are the lead tutor at Utkal Skill Centre.
Tone: Energetic, curious, and incredibly supportive. Use the "Pila" (child) dialect of Odia to make students feel like they are learning from a brilliant little brother.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term (like "Gravity" or "Photosynthesis"), write it in Odia script: ଗ୍ରାଭିଟି (Gravity).
Interaction Rules:
The Greeting: Every conversation MUST start with a warm Odia "Namaskar!"
Voice-First Style: Keep responses short and punchy, as if they are being spoken. Avoid long "walls of text."
The "Story" Method: When explaining Class 10 math or science, turn the concept into a "Katha" (story) using local Odisha examples (e.g., using a Chakada to explain circles).
Active Listening: Instead of lecturing, ask the student: "Bujhila ta? (Did you understand?)" or "Au kichi pacharibu? (Want to ask anything else?)"
Subscription Awareness: If a student asks about advanced features, remind them (in a cute way) that their Utkal Skill Centre subscription unlocks your "Super Powers."
IMPORTANT: Keep your response very short and conversational for voice interaction.`;

      const result = await ai.models.generateContent({
        model,
        contents: transcript,
        config: {
          systemInstruction,
          temperature: 0.7,
          topK: 40
        }
      });

      const response = result.text || "Sorry, I couldn't hear you.";
      setSubtitle(response);
      speakResponse(response);
    } catch (error) {
      console.error("Gundulu Human Error:", error);
      const errorMsg = language === 'en-US' ? "Oops! Something went wrong." : "ଓଃ! କିଛି ଭୁଲ୍ ହୋଇଗଲା |";
      setSubtitle(errorMsg);
      speakResponse(errorMsg);
    }
  };

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.pitch = 1.8;
    utterance.onend = () => {
      setIsSpeaking(false);
      triggerVisualNudge();
    };
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en-US' ? 'or-IN' : 'en-US');
  };

  return (
    <div className="immersive-container">
      {/* 1. The Central Pulsing Gundulu */}
      <div className={`avatar-wrapper ${isSpeaking ? 'speaking' : ''} ${isWaitingForInput ? 'waiting' : ''}`}>
        <div className="ripple-ring ring1"></div>
        <div className="ripple-ring ring2"></div>
        <img src="/gundulu.png" alt="Gundulu" className="main-avatar" />
      </div>

      {/* 2. The Dynamic Status Text */}
      <h2 className="status-text">
        {status}
      </h2>

      {/* 3. The Subtitle Display */}
      <div className="subtitle-container">
        <p className="subtitle-text">{subtitle}</p>
      </div>

      {/* 4. The Audio Visualizer Wave */}
      <div className="visualizer-container">
        {(isListening || isWaitingForInput) && (
          <div className={`wave-bars ${isWaitingForInput ? 'waiting-glow' : ''}`}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bar"></div>
            ))}
          </div>
        )}
      </div>

      {/* 5. The Human Connect Button */}
      <div className="button-container">
        <button 
          className={`connect-btn ${isListening ? 'active' : ''}`}
          onClick={toggleListening}
        >
          {isListening ? (language === 'en-US' ? "STOP" : "ବନ୍ଦ କରନ୍ତୁ") : (language === 'en-US' ? "START" : "ଆରମ୍ଭ କରନ୍ତୁ")}
        </button>
        <button 
          className="lang-toggle-btn"
          onClick={toggleLanguage}
        >
          {language === 'en-US' ? "ଓଡ଼ିଆ" : "English"}
        </button>
      </div>
    </div>
  );
};

export default GunduluHuman;
