import React, { useState, useEffect, useRef } from 'react';
import './GunduluHuman.css';

const GunduluHuman = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState("Touch to Talk to Gundulu");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
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
        setStatus("Gundulu is Listening... 👂");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setStatus(`You said: "${transcript}"`);
        // Send to Gemini
        processWithGemini(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatus("Touch to Talk to Gundulu");
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const processWithGemini = async (transcript: string) => {
    setStatus("Gundulu is thinking...");
    setIsListening(false);
    setIsSpeaking(true);
    
    // Simulate Gemini response
    setTimeout(() => {
      const response = "Namaskar! That's a great question. Let me help you with that.";
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
        {isListening ? "STOP" : "START"}
      </button>
    </div>
  );
};

export default GunduluHuman;
