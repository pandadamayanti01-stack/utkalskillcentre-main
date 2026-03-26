import React, { useState, useEffect, useRef } from 'react';
import './GunduluHuman.css';

const GunduluHuman = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [language, setLanguage] = useState<'en-US' | 'or-IN'>('en-US');
  const [status, setStatus] = useState(language === 'en-US' ? "Namaskar! I am Gundulu. What shall we learn today?" : "ନମସ୍କାର, ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆଜି ଆମେ କଣ ପଢିବା?");
  const [subtitle, setSubtitle] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Speak initial greeting with robust voice selection
    const speakGreeting = () => {
      const greeting = language === 'en-US' ? "Namaskar! I am Gundulu. What shall we learn today?" : "ନମସ୍କାର, ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆଜି ଆମେ କଣ ପଢିବା?";
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
    
    // Simulate Gemini response
    setTimeout(() => {
      const response = language === 'en-US' ? "Namaskar! That's a great question. Let me help you with that." : "ନମସ୍କାର! ଏହା ଏକ ଭଲ ପ୍ରଶ୍ନ। ମୁଁ ଆପଣଙ୍କୁ ଏଥିରେ ସାହାଯ୍ୟ କରିବି।";
      setSubtitle(response);
      speakResponse(response);
    }, 1500);
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

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
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
