import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
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
    [/\bganita\b|\bganit\b|\bmaths?\b/gi, 'ଗଣିତ'],
    [/\bbigyan\b|\bbigyaan\b|\bscience\b/gi, 'ବିଜ୍ଞାନ'],
    [/\bodia\b|\bodisha\b|\bodia\b/gi, 'ଓଡ଼ିଆ'],
    [/\benglish\b|\binglish\b/gi, 'ଇଂରାଜୀ'],
    [/\bhindi\b|\bhindhi\b/gi, 'ହିନ୍ଦୀ'],
    [/\bsanskrit\b|\bsanskruta\b/gi, 'ସଂସ୍କୃତ'],
    [/\bparibesh\b|\bevs\b/gi, 'ପରିବେଶ'],
    [/\bithihas\b|\bhistory\b/gi, 'ଇତିହାସ'],
    [/\bbhugol\b|\bgeography\b/gi, 'ଭୂଗୋଳ'],
    [/\bshiksha\b|\bshikshya\b/gi, 'ଶିକ୍ଷା'],
    [/\bkrushi\b|\bagriculture\b/gi, 'କୃଷି'],
    [/\bparyatan\b|\btourism\b/gi, 'ପର୍ଯ୍ୟଟନ'],
    [/\bvidyarthi\b|\bstudent\b/gi, 'ଛାତ୍ର'],
    [/\bek\b|\bone\b/gi, '୧'],
    [/\bdo\b|\btwo\b/gi, '୨'],
    [/\bteen\b|\bthree\b/gi, '୩'],
    [/\bchar\b|\bfour\b/gi, '୪'],
    [/\bpaanch\b|\bfive\b/gi, '୫'],
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
  
  // Call Timer State
  const [callDuration, setCallDuration] = useState(0);

  // Output language for TTS (Gundulu always replies in Odia).
  const language = 'or-IN';
  
  // Supported recognition languages (Odia, Hindi, English)
  const recognitionLanguages = [
    { code: 'or-IN', label: 'ଓଡ଼ିଆ (Odia)' },
    { code: 'hi-IN', label: 'हिंदी (Hindi)' },
    { code: 'en-IN', label: 'English' }
  ];
  const [inputLanguage, setInputLanguage] = useState('hi-IN'); // Default to Hindi for best Indian voice model ASR
  
  const hasPlayedGreetingRef = useRef(false);
  const responseTurnRef = useRef(0);
  
  // Immersive Status States
  const [status, setStatus] = useState("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
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

  const speakWithGeminiVoice = async (text: string, onDone?: () => void, retries = 2): Promise<void> => {
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
      if (retries > 0) {
        const delay = (3 - retries) * 2000; 
        console.warn(`Gemini TTS error. Retrying in ${delay}ms... (${retries} attempts left)`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        return speakWithGeminiVoice(text, onDone, retries - 1);
      }
      console.warn('Gemini voice unavailable, using browser TTS fallback.', err);
      setIsSpeaking(false);
      speakWithBrowserTtsFallback(text, onDone);
    }
  };

  // 1. Call duration counter effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Main initialization
  useEffect(() => {
    hasPlayedGreetingRef.current = false;
    responseTurnRef.current = 0;
    setStatus("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
    setSubtitle('');

    const speakGreeting = () => {
      if (hasPlayedGreetingRef.current) return;
      hasPlayedGreetingRef.current = true;

      const greeting = "ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। ଆସ, ଏବେ ଏକାଠି ପଢ଼ିବା ଓ ଆଗକୁ ବଢ଼ିବା।";
      setSubtitle(greeting);
      setStatus("ଗୁଣ୍ଡୁଲୁ କହୁଛି...");

      speakWithGeminiVoice(greeting, () => {
        triggerVisualNudge();
        setStatus("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
      });
    };

    const handleStartGreeting = () => {
      speakGreeting();
    };
    window.addEventListener('startGunduluGreeting', handleStartGreeting);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = inputLanguage;
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
        setStatus("ମୁଁ ଶୁଣିପାରିଲି ନାହିଁ");
      };

      recognitionRef.current = recognition;
    }

    return () => {
      window.speechSynthesis.cancel();
      stopCurrentAudio();
      window.removeEventListener('startGunduluGreeting', handleStartGreeting);
    };
  }, [language, skipInitialGreeting, inputLanguage]);

  const triggerVisualNudge = () => {
    setIsWaitingForInput(true);
    setTimeout(() => setIsWaitingForInput(false), 3000);
  };

  const processWithGemini = async (speechInput: SpeechInput) => {
    setStatus("ଗୁଣ୍ଡୁଲୁ ଚିନ୍ତା କରୁଛି...");
    setIsListening(false);
    
    try {
      const ai = getAI();
      const modelName = 'gemini-2.5-flash';
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

      const modelInstance = ai.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const result = await modelInstance.generateContent({
        contents: [{ role: 'user', parts: [{ text: inputPayload }] }],
        generationConfig: {
          temperature: 0.7,
        },
      });

      const response = result.response.text() || "ମୁଁ ଭଲଭାବେ ଶୁଣି ପାରିଲି ନାହିଁ, ଆଉଥରେ କହନ୍ତୁ।";
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
      setStatus("ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
    });
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  // Helper to format call timer (MM:SS)
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Handle rotating input language cycle
  const rotateLanguage = () => {
    const currentIndex = recognitionLanguages.findIndex(l => l.code === inputLanguage);
    const nextIndex = (currentIndex + 1) % recognitionLanguages.length;
    setInputLanguage(recognitionLanguages[nextIndex].code);
  };

  // Get current active status state classes
  const getCallStateClass = () => {
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    if (isWaitingForInput) return 'waiting';
    return 'idle';
  };

  return (
    <div className={`immersive-call-container ${getCallStateClass()}`}>
      
      {/* 1. TOP STATS STATUS HUD */}
      <div className="call-top-hud">
        <div className="hud-left">
          <div className="live-pill animate-pulse"></div>
          <span className="hud-title">ଗୁଣ୍ଡୁଲୁ LIVE CALL</span>
        </div>
        <div className="hud-center">
          <div className="timer-badge">
            <Lucide.Clock size={14} className="mr-1 text-emerald-400" />
            <span>{formatTimer(callDuration)}</span>
          </div>
        </div>
        <div className="hud-right">
          <div className="network-signal">
            <span className="signal-bar active"></span>
            <span className="signal-bar active"></span>
            <span className="signal-bar active"></span>
            <span className="signal-bar active"></span>
          </div>
        </div>
      </div>

      {/* 2. MAIN 3D AVATAR SPHERE SECTION */}
      <div className="call-main-sphere">
        <div className="avatar-3d-orbit">
          
          {/* Orbital 3D perspective concentric rings */}
          <div className="orbital-ring ring-outer"></div>
          <div className="orbital-ring ring-mid"></div>
          <div className="orbital-ring ring-inner"></div>

          {/* Glowing background aurorafield */}
          <div className="glow-aura"></div>

          {/* Central Avatar Orb */}
          <div className="avatar-sphere" onClick={toggleListening}>
            <img src="/gundulu.png" alt="Gundulu" className="avatar-img-3d" />
            
            {/* Soft border ring overlay */}
            <div className="avatar-sphere-border"></div>
            
            {/* Interactive mic ripples inside sphere */}
            {isListening && (
              <div className="mic-ripple-inner">
                <Lucide.Mic size={36} className="text-emerald-400" />
              </div>
            )}
          </div>

          {/* Speak visualizer particles orbiting around */}
          {isSpeaking && (
            <div className="fluid-orbit-particles">
              <span className="particle p1"></span>
              <span className="particle p2"></span>
              <span className="particle p3"></span>
              <span className="particle p4"></span>
            </div>
          )}
        </div>
      </div>

      {/* 3. CALL STATUS DISPLAY */}
      <div className="call-status-box">
        <h2 className="call-state-title">{status}</h2>
        
        {/* Active Realtime Audio wave visualization */}
        {(isSpeaking || isListening) && (
          <div className="call-visualizer-wave">
            <span className="v-bar vb1"></span>
            <span className="v-bar vb2"></span>
            <span className="v-bar vb3"></span>
            <span className="v-bar vb4"></span>
            <span className="v-bar vb5"></span>
            <span className="v-bar vb6"></span>
            <span className="v-bar vb7"></span>
          </div>
        )}
      </div>

      {/* 4. SUBTITLE CAPTIONS DISPLAY */}
      <div className="call-subtitles-hud">
        {subtitle && (
          <div className="caption-bubble">
            <p className="caption-text">{subtitle}</p>
          </div>
        )}
      </div>

      {/* 5. BOTTOM CALL HUD ACTIONS PANEL */}
      <div className="call-bottom-hud-panel">
        
        {/* Toggle Speech Input Language */}
        <button 
          className="hud-action-btn glass-btn" 
          onClick={rotateLanguage}
          title="Change Speech Input Language"
        >
          <Lucide.Globe size={20} className="text-blue-300" />
          <span className="hud-btn-label">
            {recognitionLanguages.find(l => l.code === inputLanguage)?.label.split(' ')[0]}
          </span>
        </button>

        {/* Core Mute/Listen Action Toggle Button */}
        <button 
          className={`hud-action-btn main-mic-btn ${isListening ? 'active-listening' : ''}`}
          onClick={toggleListening}
          title={isListening ? "Mute Microphone" : "Tap to Speak"}
        >
          {isListening ? (
            <Lucide.Mic size={28} className="text-white animate-bounce" />
          ) : (
            <Lucide.MicOff size={28} className="text-white/60" />
          )}
          <span className="hud-btn-label">
            {isListening ? "ଶୁଣୁଛି..." : "କହନ୍ତୁ"}
          </span>
        </button>

        {/* Hang Up/End Call Button */}
        {onBack && (
          <button 
            className="hud-action-btn hang-up-btn" 
            onClick={onBack}
            title="End Voice Session"
          >
            <Lucide.PhoneOff size={24} className="text-white" />
            <span className="hud-btn-label">କାଟନ୍ତୁ</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default GunduluHuman;
