import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './GunduluHuman.css';
import { getAI } from '../services/aiService';

const GunduluHuman = ({ skipInitialGreeting = false, onBack }: { skipInitialGreeting?: boolean; onBack?: () => void }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const language: 'or-IN' = 'or-IN';
  const hasPlayedGreetingRef = useRef(false);
  const responseTurnRef = useRef(0);
  
  // Initial Status Text (Static before speech starts)
  const [status, setStatus] = useState(
    "ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ"
  );
  const [subtitle, setSubtitle] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const speakWithBrowserTtsFallback = (text: string, onDone?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.pitch = 1.8;
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    window.speechSynthesis.speak(utterance);
  };

  const speakWithGeminiVoice = async (text: string, onDone?: () => void) => {
    try {
      stopCurrentAudio();
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const response = await fetch('/api/tts/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) {
        throw new Error(`TTS HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        stopCurrentAudio();
        onDone?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        stopCurrentAudio();
        speakWithBrowserTtsFallback(text, onDone);
      };
      await audio.play();
    } catch (err) {
      console.warn('Gemini voice unavailable, using browser TTS fallback.', err);
      setIsSpeaking(false);
      speakWithBrowserTtsFallback(text, onDone);
    }
  };

  useEffect(() => {
    hasPlayedGreetingRef.current = false;
    responseTurnRef.current = 0;
    setStatus("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
    setSubtitle('');

    // 1. THE LAUNCH DAY GREETING LOGIC
    const speakGreeting = () => {
      if (hasPlayedGreetingRef.current) return;
      hasPlayedGreetingRef.current = true;

      // Your custom message with blessings
      const greeting = "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆସ, ଏବେ ଏକାଠି ପଢ଼ିବା ଓ ଆଗକୁ ବଢ଼ିବା।";
      
      setSubtitle(greeting);
      setStatus(greeting);

      speakWithGeminiVoice(greeting, () => {
        triggerVisualNudge();
        setStatus("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
      });
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
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("ଗୁଣ୍ଡୁଲୁ ଶୁଣୁଛି... 👂");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSubtitle(`ଆପଣ କହିଲେ: "${transcript}"`);
        processWithGemini(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const errorMsg = "ଶୁଣିପାରିଲି ନାହିଁ | ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
        setSubtitle(errorMsg);
        setStatus(errorMsg);
      };

      recognitionRef.current = recognition;
    }

    // Cleanup speech on unmount
    return () => {
      window.speechSynthesis.cancel();
      stopCurrentAudio();
      window.removeEventListener('startGunduluGreeting', handleStartGreeting);
    };
  }, [language, skipInitialGreeting]);

  const triggerVisualNudge = () => {
    setIsWaitingForInput(true);
    setTimeout(() => setIsWaitingForInput(false), 3000);
  };

  // 3. AI PROCESSING (GEMINI)
  const processWithGemini = async (transcript: string) => {
    setStatus("ଗୁଣ୍ଡୁଲୁ ଚିନ୍ତା କରୁଛି...");
    setIsListening(false);
    
    try {
      const ai = getAI();
      const model = 'gemini-3-flash-preview';
      const turn = responseTurnRef.current;
      
      const systemInstruction = `
        Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. 
        Tone: Energetic and supportive. Use natural "Pila" dialect.
        Language Policy: STRICT ODIA OUTPUT ONLY.
        Input Policy: User may speak in Odia or English. Always understand both, but always reply only in Odia.
        Style: Short, conversational voice responses.
        Conversation Rule: Greet only once at launch. For normal conversation, do NOT re-introduce yourself repeatedly.
        Conversation Rule: Do NOT repeat slogans like "Jay Jagannath" or "Jay Maa Tarini" unless the student explicitly asks for devotional/cultural greeting.
        Conversation Rule: Keep replies natural and lesson-focused after greeting.
        Context: This is response turn number ${turn + 1}. If turn > 1, avoid intro lines and start directly with answer.
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

      const response = result.text || "ମୁଁ ଭଲଭାବେ ଶୁଣି ପାରିଲି ନାହିଁ, ଆଉଥରେ କହନ୍ତୁ।";
        responseTurnRef.current += 1;
      setSubtitle(response);
      speakResponse(response);
    } catch (error) {
      const errorMsg = "ଓଃ! କିଛି ଭୁଲ୍ ହୋଇଗଲା |";
      setSubtitle(errorMsg);
      speakResponse(errorMsg);
    }
  };

  const speakResponse = (text: string) => {
    speakWithGeminiVoice(text, () => {
      triggerVisualNudge();
      setStatus("କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
    });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="immersive-container">
      {/* Close/Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          title="Close Gundulu Chat"
        >
          <X size={24} />
        </button>
      )}

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
          {isListening ? "ବନ୍ଦ କରନ୍ତୁ" : "ଆରମ୍ଭ କରନ୍ତୁ"}
        </button>
      </div>
    </div>
  );
};

export default GunduluHuman;
