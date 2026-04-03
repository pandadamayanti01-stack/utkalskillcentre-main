import React, { useState, useEffect, useRef } from 'react';
import './GunduluHuman.css';
import { getAI } from '../services/aiService';

const GunduluHuman = ({ skipInitialGreeting = false }: { skipInitialGreeting?: boolean }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'or-IN'>('or-IN');
  
  // Initial Status Text (Static before speech starts)
  const [status, setStatus] = useState(
    language === 'en-US' 
      ? "Namaskar! I am Gundulu. Happy Utkal Divas! " 
      : "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। ପବିତ୍ର ଉତ୍କଳ ଦିବସର ଅଭିନନ୍ଦନ! "
  );
  const [subtitle, setSubtitle] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // 1. THE LAUNCH DAY GREETING LOGIC
    const speakGreeting = () => {
      // Your custom message with blessings
      const greeting = language === 'en-US' 
        ? "Namaskar! I am Gundulu. Happy Utkal Divas! 🚩 We start our journey together on April 7th. Let’s study, win, and grow! Jay Jagannath, Jay Maa Tarini!" 
        : "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। ପବିତ୍ର ଉତ୍କଳ ଦିବସର ଅଭିନନ୍ଦନ! 🚩 ଆସନ୍ତା ଏପ୍ରିଲ୍ ୭ରୁ ଆମେ ଏକାଠି ପଢ଼ିବା ଓ ଆଗକୁ ବଢ଼ିବା। ଜୟ ଜଗନ୍ନାଥ, ଜୟ ମା' ତାରିଣୀ!";
      
      setSubtitle(greeting);
      setStatus(greeting);

      // Cancel any pending speech before starting
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(greeting);
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.includes(language)) || null;
      
      utterance.voice = voice;
      utterance.lang = language;
      utterance.pitch = 1.8; // The "Baby Genius" high pitch
      utterance.rate = 0.9;  // Slightly slower for clear Odia pronunciation
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        triggerVisualNudge();
        // Reset status to guidance text after greeting
        setStatus(language === 'en-US' ? "Touch to Talk to Gundulu" : "ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
      };

      window.speechSynthesis.speak(utterance);
    };

    const handleStartGreeting = () => {
      speakGreeting();
    };
    window.addEventListener('startGunduluGreeting', handleStartGreeting);

    // Handle voices loading (Chrome/Safari specific)
    // REMOVED: Automatic greeting on mount to comply with autoplay policy
    /*
    if (!skipInitialGreeting) {
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', speakGreeting, { once: true });
      } else {
        speakGreeting();
      }
    }
    */
    
    // 2. INITIALIZE SPEECH RECOGNITION (STT)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = language; 
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus(language === 'en-US' ? "Gundulu is Listening... 👂" : "ଗୁଣ୍ଡୁଲୁ ଶୁଣୁଛି... 👂");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSubtitle(language === 'en-US' ? `You said: "${transcript}"` : `ଆପଣ କହିଲେ: "${transcript}"`);
        processWithGemini(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const errorMsg = language === 'en-US' ? "Could not hear you. Try again!" : "ଶୁଣିପାରିଲି ନାହିଁ | ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
        setSubtitle(errorMsg);
        setStatus(errorMsg);
      };

      recognitionRef.current = recognition;
    }

    // Cleanup speech on unmount
    return () => {
      window.speechSynthesis.cancel();
      window.removeEventListener('startGunduluGreeting', handleStartGreeting);
    };
  }, [language, skipInitialGreeting]);

  const triggerVisualNudge = () => {
    setIsWaitingForInput(true);
    setTimeout(() => setIsWaitingForInput(false), 3000);
  };

  // 3. AI PROCESSING (GEMINI)
  const processWithGemini = async (transcript: string) => {
    setStatus(language === 'en-US' ? "Gundulu is thinking..." : "ଗୁଣ୍ଡୁଲୁ ଚିନ୍ତା କରୁଛି...");
    setIsListening(false);
    
    try {
      const ai = getAI();
      const model = 'gemini-3-flash-preview';
      
      const systemInstruction = `
        Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. 
        Tone: Energetic and supportive. Use "Pila" dialect.
        Language: STRICT ODIA ONLY. 
        Style: Short, conversational responses for voice.
        Cultural: If mentioned, celebrate Utkal Divas or Maa Tarini/Jagannath.
        Constraint: Keep response under 3 sentences.
      `;

      const result = await ai.models.generateContent({
        model,
        contents: transcript,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const response = result.text || "Sorry, I couldn't hear you.";
      setSubtitle(response);
      speakResponse(response);
    } catch (error) {
      const errorMsg = language === 'en-US' ? "Oops! Something went wrong." : "ଓଃ! କିଛି ଭୁଲ୍ ହୋଇଗଲା |";
      setSubtitle(errorMsg);
      speakResponse(errorMsg);
    }
  };

  const speakResponse = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.pitch = 1.8;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      triggerVisualNudge();
      setStatus(language === 'en-US' ? "Touch to Talk" : "କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
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
      {/* Visual Avatar */}
      <div className={`avatar-wrapper ${isSpeaking ? 'speaking' : ''} ${isWaitingForInput ? 'waiting' : ''}`}>
        <div className="ripple-ring ring1"></div>
        <div className="ripple-ring ring2"></div>
        <img src="/gundulu.png" alt="Gundulu" className="main-avatar" />
      </div>

      {/* Dynamic Header */}
      <h2 className="status-text px-4 text-center">
        {status}
      </h2>

      {/* Subtitles */}
      <div className="subtitle-container">
        <p className="subtitle-text italic">{subtitle}</p>
      </div>

      {/* Interaction Buttons */}
      <div className="button-container">
        <button 
          className={`connect-btn ${isListening ? 'active animate-pulse' : ''}`}
          onClick={toggleListening}
        >
          {isListening ? (language === 'en-US' ? "STOP" : "ବନ୍ଦ କରନ୍ତୁ") : (language === 'en-US' ? "START" : "ଆରମ୍ଭ କରନ୍ତୁ")}
        </button>
        <button className="lang-toggle-btn" onClick={toggleLanguage}>
          {language === 'en-US' ? "ଓଡ଼ିଆ" : "English"}
        </button>
      </div>
    </div>
  );
};

export default GunduluHuman;
