import React, { useState, useEffect, useRef } from 'react';
import './GunduluHuman.css';

const GunduluHuman = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("ନମସ୍କାର, ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆଜି ଆମେ କଣ ପଢିବା?");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Speak initial greeting with robust voice selection
    const speakGreeting = () => {
      const utterance = new SpeechSynthesisUtterance("ନମସ୍କାର, ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆଜି ଆମେ କଣ ପଢିବା?");
      
      const voices = window.speechSynthesis.getVoices();
      // Try to find an Odia voice, fallback to system default
      const odiaVoice = voices.find(v => v.lang.includes('or-IN') || v.lang.includes('or'));
      
      utterance.voice = odiaVoice || null;
      utterance.lang = 'or-IN';
      utterance.pitch = 1.8;
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
      // Set language to Odia (India)
      recognition.lang = 'or-IN'; 
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("ଗୁଣ୍ଡୁଲୁ ଶୁଣୁଛି... 👂");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setStatus(`ଆପଣ କହିଲେ: "${transcript}"`);
        // Send to Gemini
        processWithGemini(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatus("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const processWithGemini = async (transcript: string) => {
    setStatus("ଗୁଣ୍ଡୁଲୁ ଚିନ୍ତା କରୁଛି...");
    setIsListening(false);
    setIsSpeaking(true);
    
    // Simulate Gemini response
    setTimeout(() => {
      const response = "ନମସ୍କାର! ଏହା ଏକ ଭଲ ପ୍ରଶ୍ନ। ମୁଁ ଆପଣଙ୍କୁ ଏଥିରେ ସାହାଯ୍ୟ କରିବି।";
      setStatus(response);
      speakResponse(response);
    }, 1500);
  };

  const speakResponse = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'or-IN';
    utterance.pitch = 1.8;
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
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
      <div className={`avatar-wrapper ${isSpeaking ? 'speaking' : ''}`}>
        <div className="ripple-ring ring1"></div>
        <div className="ripple-ring ring2"></div>
        <img src="/gundulu.png" alt="Gundulu" className="main-avatar" />
      </div>

      {/* 2. The Dynamic Status Text */}
      <h2 className="status-text">
        {status}
      </h2>

      {/* 3. The Audio Visualizer Wave */}
      <div className="visualizer-container">
        {isListening && (
          <div className="wave-bars">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bar"></div>
            ))}
          </div>
        )}
      </div>

      {/* 4. The Human Connect Button */}
      <button 
        className={`connect-btn ${isListening ? 'active' : ''}`}
        onClick={toggleListening}
      >
        {isListening ? "ବନ୍ଦ କରନ୍ତୁ" : "ଆରମ୍ଭ କରନ୍ତୁ"}
      </button>
    </div>
  );
};

export default GunduluHuman;
