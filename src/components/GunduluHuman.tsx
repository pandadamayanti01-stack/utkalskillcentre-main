import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './GunduluHuman.css';
import { getAI } from '../services/aiService';

type SpeechInput = {
  primary: string;
  candidates: string[];
  confidence?: number;
};

const normalizeTranscript = (raw: string): string => {
  let text = (raw || '').trim();
  if (!text) return text;

  // Expanded corrections for Odia phonetic/ASR errors and common Indian language mishears
  const corrections: Array<[RegExp, string]> = [
    // Place names (existing)
    [/\bcanada\b|\bkanada\b|\bkenada\b/gi, 'Keonjhar'],
    [/\bkendar\b|\bkendhar\b|\bkenjhar\b|\bkionjhar\b|\bkiyonjhar\b/gi, 'Keonjhar'],
    [/\bkendujhar\b|\bkendu jhar\b|\bkendu jharh\b/gi, 'Keonjhar'],
    [/\bbalasor\b|\bbalesor\b|\bbaleshwar\b|\bbalashore\b/gi, 'Balasore'],
    [/\bmayurbanj\b|\bmoyurbhanj\b|\bmayurvhanj\b/gi, 'Mayurbhanj'],
    [/\bkhorda\b|\bkhurda\b|\bkhordha\b/gi, 'Khordha'],
    [/\bjajpur\b|\bjazpur\b|\bjajpor\b/gi, 'Jajpur'],
    [/\bganjam\b|\bgunjam\b|\bgonjam\b/gi, 'Ganjam'],
    [/\bcuttak\b|\bkatak\b|\bcuttack\b/gi, 'Cuttack'],
    [/\bbhubanesor\b|\bbhubaneshor\b|\bbbsr\b/gi, 'Bhubaneswar'],
    // Odia phonetic/ASR errors
    [/\bganita\b|\bganit\b|\bmaths?\b/gi, 'ଗଣିତ'],
    [/\bbigyan\b|\bbigyaan\b|\bscience\b/gi, 'ବିଜ୍ଞାନ'],
    [/\bodia\b|\bodisha\b|\bodia\b/gi, 'ଓଡ଼ିଆ'],
    [/\benglish\b|\binglish\b/gi, 'ଇଂରାଜୀ'],
    [/\bhindi\b|\bhindhi\b/gi, 'ହିନ୍ଦୀ'],
    [/\bsanskrit\b|\bsanskruta\b/gi, 'ସଂସ୍କୃତ'],
    [/\bparibesh\b|\bevs\b/gi, 'ପରିବେଶ'],
    [/\bithihas\b|\bhistory\b/gi, 'ଇତିହାସ'],
    [/\bbhugol\b|\bgeography\b/gi, 'ଭୂଗୋଳ'],
    // Common Indian language mishears
    [/\bshiksha\b|\bshikshya\b/gi, 'ଶିକ୍ଷା'],
    [/\bkrushi\b|\bagriculture\b/gi, 'କୃଷି'],
    [/\bparyatan\b|\btourism\b/gi, 'ପର୍ଯ୍ୟଟନ'],
    [/\bvidyarthi\b|\bstudent\b/gi, 'ଛାତ୍ର'],
    // Numbers (Hindi/English to Odia)
    [/\bek\b|\bone\b/gi, '୧'],
    [/\bdo\b|\btwo\b/gi, '୨'],
    [/\bteen\b|\bthree\b/gi, '୩'],
    [/\bchar\b|\bfour\b/gi, '୪'],
    [/\bpaanch\b|\bfive\b/gi, '୫'],
    // Add more as needed for your context
  ];

  for (const [pattern, replacement] of corrections) {
    text = text.replace(pattern, replacement);
  }

  return text;
};

const extractSpeechInput = (event: any): SpeechInput => {
  const result = event?.results?.[0];
  const candidates: string[] = [];
  if (result && typeof result.length === 'number') {
    for (let i = 0; i < result.length; i += 1) {
      const candidate = normalizeTranscript(result[i]?.transcript || '');
      if (candidate && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  }

  const primary = candidates[0] || normalizeTranscript(result?.[0]?.transcript || '');
  const confidence = result?.[0]?.confidence;
  return { primary, candidates: candidates.slice(0, 3), confidence };
};

const GunduluHuman = ({ skipInitialGreeting = false, onBack }: { skipInitialGreeting?: boolean; onBack?: () => void }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  // Accept Odia, Hindi, and English input (always reply in Odia)
  // Use 'hi-IN' for best Indian ASR, fallback to 'or-IN' if needed
  const recognitionLanguages = ['or-IN', 'hi-IN', 'en-IN'];
  const [inputLanguage, setInputLanguage] = useState('hi-IN'); // Default to Hindi for best recognition
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
      recognition.lang = inputLanguage; // Use selected input language
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("ଗୁଣ୍ଡୁଲୁ ଶୁଣୁଛି... 👂");
      };

      recognition.onresult = (event: any) => {
        const speechInput = extractSpeechInput(event);
        setSubtitle(`ଆପଣ କହିଲେ: "${speechInput.primary}"`);
        processWithGemini(speechInput);
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
  const processWithGemini = async (speechInput: SpeechInput) => {
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
        ASR Rule: Speech-to-text can be wrong for Odisha names/words. Use context to auto-correct likely misheard words.
        ASR Rule: Prefer Odisha school/local words (district names, subjects, textbook terms) when candidates are similar.
        ASR Rule: If still unclear, ask ONE short clarification question in Odia.
        Style: Short, conversational voice responses.
        Conversation Rule: Greet only once at launch. For normal conversation, do NOT re-introduce yourself repeatedly.
        Conversation Rule: Do NOT repeat slogans like "Jay Jagannath" or "Jay Maa Tarini" unless the student explicitly asks for devotional/cultural greeting.
        Conversation Rule: Keep replies natural and lesson-focused after greeting.
        Context: This is response turn number ${turn + 1}. If turn > 1, avoid intro lines and start directly with answer.
        Constraint: Keep response under 3 sentences.
      `;

      const inputPayload = `
Primary speech transcript: ${speechInput.primary}
Alternative transcripts: ${speechInput.candidates.join(' | ') || 'N/A'}
ASR confidence: ${typeof speechInput.confidence === 'number' ? speechInput.confidence.toFixed(2) : 'unknown'}

Understand user intent from these transcripts and respond in Odia only.
      `.trim();

      const result = await ai.models.generateContent({
        model,
        contents: inputPayload,
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

  // Optional: UI for language selection (Odia, Hindi, English)
  // You can style this as needed
  const renderLanguageSelector = () => (
    <div className="language-selector" style={{ textAlign: 'center', marginBottom: 8 }}>
      <label style={{ marginRight: 8 }}>Voice Input Language:</label>
      <select value={inputLanguage} onChange={e => setInputLanguage(e.target.value)}>
        <option value="hi-IN">Hindi (best Indian ASR)</option>
        <option value="or-IN">Odia</option>
        <option value="en-IN">English (India)</option>
      </select>
    </div>
  );

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

      {/* Language Selector */}
      {renderLanguageSelector()}

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
