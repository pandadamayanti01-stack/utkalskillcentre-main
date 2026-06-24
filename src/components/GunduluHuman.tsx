import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import './GunduluHuman.css';
import { getAI } from '../services/aiService';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

const sanitizeTextForTTS = (text: string): string => {
  if (!text) return "";
  
  let clean = text;
  
  // 1. Remove all emojis (they cause speech engines to glitch or read code names)
  clean = clean.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '');
  
  // 2. Remove all markdown symbols (*, **, #, -, _, `)
  clean = clean.replace(/\*\*|\*|__|_|#|`|-/g, '');
  
  // 3. Remove English translations inside brackets like "(Integers)" or "(Photosynthesis)"
  clean = clean.replace(/\([a-zA-Z\s]+\)/g, '');
  clean = clean.replace(/\(\)/g, ''); // Clean empty brackets
  
  // 4. Translate numbers bilingually so they are read properly by the synthesizer
  const numberMap: Record<string, string> = {
    '0': '୦', '1': '୧', '2': '୨', '3': '୩', '4': '୪',
    '5': '୫', '6': '୬', '7': '୭', '8': '୮', '9': '୯'
  };
  for (const [eng, odia] of Object.entries(numberMap)) {
    clean = clean.replaceAll(eng, odia);
  }

  // 5. Replace common math symbols with standard spoken words
  clean = clean
    .replaceAll('+', ' ଯୁକ୍ତ ')
    .replaceAll('-', ' ବିୟୋଗ ')
    .replaceAll('=', ' ସମାନ ')
    .replaceAll('/', ' ବିଭକ୍ତ ')
    .replaceAll('*', ' ଗୁଣନ ');

  return clean.trim();
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

const GunduluHuman = ({ skipInitialGreeting = false, userClass, onBack, isPremium = false, onUpgrade, user }: { skipInitialGreeting?: boolean; userClass?: string; onBack?: () => void; isPremium?: boolean; onUpgrade?: () => void; user?: any }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);

  const isListeningRef = useRef(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);
  
  // Call Timer State
  const [callDuration, setCallDuration] = useState(0);
  const [freeQueriesCount, setFreeQueriesCount] = useState<number>(0);
  const isFreePeriod = new Date() < new Date('2026-07-12T00:00:00+05:30');

  useEffect(() => {
    const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
    setFreeQueriesCount(parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10));
  }, [user]);

  const isGreeting = (text: string) => {
    const cleaned = text.trim().toLowerCase().replace(/[?.!,]/g, '');
    const greetings = ['hi', 'hello', 'hey', 'namaskar', 'namaskara', 'namaste', 'kemiti achha', 'how are you', 'good morning', 'good evening', 'thanks', 'thank you', 'dhanyabad', 'dhanyabada', 'ok', 'okay'];
    return greetings.includes(cleaned) || cleaned.length < 5;
  };

  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapter, setActiveChapter] = useState<any>(null);

  useEffect(() => {
    if (userClass) {
      const loadChapters = async () => {
        try {
          const q = query(
            collection(db, 'chapters'),
            where('class', '==', userClass)
          );
          const snapshot = await getDocs(q);
          const list = snapshot.docs.map(doc => doc.data());
          setChapters(list);
          console.log(`[Gundulu RAG] Successfully loaded ${list.length} chapters for class ${userClass}`);
        } catch (err) {
          console.error('[Gundulu RAG] Failed to load chapters:', err);
        }
      };
      loadChapters();
    }
  }, [userClass]);

  // Output language for TTS (Gundulu always replies in Odia).
  const language = 'or-IN';
  
  // Supported recognition languages (Odia, Hindi, English)
  const recognitionLanguages = [
    { code: 'or-IN', label: 'ଓଡ଼ିଆ (Odia)' },
    { code: 'hi-IN', label: 'हिंदी (Hindi)' },
    { code: 'en-IN', label: 'English' }
  ];
  const [inputLanguage, setInputLanguage] = useState('hi-IN'); // Default to Hindi ASR (with corrections) for best phonetic recognition accuracy in browsers
  
  const hasPlayedGreetingRef = useRef(false);
  const responseTurnRef = useRef(0);
  const silenceTimeoutRef = useRef<any>(null);
  const transcriptBufferRef = useRef<string>('');
  const chatHistoryRef = useRef<any[]>([]);
  const [usePremiumVoice, setUsePremiumVoice] = useState(() => {
    const saved = localStorage.getItem('gundulu_use_premium_voice');
    if (saved === null) return true; // Default to premium voice for immediate WOW effect
    return saved === 'true';
  });
  
  // Immersive Status States
  const [status, setStatus] = useState("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
  const [subtitle, setSubtitle] = useState("");
  const subtitleContainerRef = useRef<HTMLDivElement>(null);
  const activeSubtitleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const sphereRef = useRef<HTMLDivElement>(null);

  // Web Audio API refs for real-time lip-sync avatar pulsing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioVolumeRef = useRef<number>(0);

  // Auto-scroll subtitle container to bottom whenever subtitle updates
  useEffect(() => {
    if (subtitleContainerRef.current) {
      subtitleContainerRef.current.scrollTop = subtitleContainerRef.current.scrollHeight;
    }
  }, [subtitle]);

  useEffect(() => {
    const sphere = sphereRef.current;
    if (!sphere) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = sphere.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left - rect.width / 2;
      const y = clientY - rect.top - rect.height / 2;

      const tiltX = -(y / (rect.height / 2)) * 20;
      const tiltY = (x / (rect.width / 2)) * 20;

      sphere.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.06)`;
    };

    const handleLeave = () => {
      sphere.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
    };

    sphere.addEventListener('mousemove', handleMove);
    sphere.addEventListener('mouseleave', handleLeave);
    sphere.addEventListener('touchmove', handleMove);
    sphere.addEventListener('touchend', handleLeave);

    return () => {
      sphere.removeEventListener('mousemove', handleMove);
      sphere.removeEventListener('mouseleave', handleLeave);
      sphere.removeEventListener('touchmove', handleMove);
      sphere.removeEventListener('touchend', handleLeave);
    };
  }, []);

  const stopCurrentAudio = () => {
    if (activeSubtitleIntervalRef.current) {
      clearInterval(activeSubtitleIntervalRef.current);
      activeSubtitleIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sphereRef.current) {
      sphereRef.current.style.transform = 'scale(1)';
    }
    audioVolumeRef.current = 0;
  };

  const animateSubtitle = (text: string, isBrowserTts: boolean = false) => {
    if (activeSubtitleIntervalRef.current) {
      clearInterval(activeSubtitleIntervalRef.current);
      activeSubtitleIntervalRef.current = null;
    }
    setSubtitle('');
    if (!text) return;

    const words = text.split(/\s+/);
    let currentWordIndex = 0;
    let currentText = '';
    
    // Naturally time the appearance of words:
    const wordInterval = isBrowserTts ? 320 : 280;

    activeSubtitleIntervalRef.current = setInterval(() => {
      if (currentWordIndex < words.length) {
        currentText += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex];
        setSubtitle(currentText);
        currentWordIndex++;
      } else {
        if (activeSubtitleIntervalRef.current) {
          clearInterval(activeSubtitleIntervalRef.current);
          activeSubtitleIntervalRef.current = null;
        }
      }
    }, wordInterval);
  };

  const renderTextbookVisual = (chapter: any) => {
    const chapterTitleStr = typeof chapter.title === 'string' 
      ? (chapter.title_or || chapter.title) 
      : ((chapter.title as any)?.or || (chapter.title as any)?.en || '');
    const title = (chapterTitleStr || '').toLowerCase();
    
    // 1. Check if the chapter has a real database image URL
    if (chapter.imageUrl) {
      return <img src={chapter.imageUrl} alt={chapter.title} className="textbook-slide-img" />;
    }
    
    // 2. Integers (Number Line Diagram)
    if (title.includes('integer') || title.includes('ପୂର୍ଣ୍ଣ')) {
      return (
        <div className="interactive-diagram integer-line">
          <div className="diagram-title-label">ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା ରେଖା (Integers Number Line)</div>
          <svg viewBox="0 0 400 100" className="w-full h-auto">
            {/* Axis line */}
            <line x1="20" y1="50" x2="380" y2="50" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
            <polygon points="380,45 390,50 380,55" fill="#a78bfa" />
            <polygon points="20,45 10,50 20,55" fill="#a78bfa" />
            
            {/* Ticks and values */}
            {[-3, -2, -1, 0, 1, 2, 3].map((val, idx) => {
              const x = 50 + idx * 50;
              const isZero = val === 0;
              const isPositive = val > 0;
              return (
                <g key={val} className="animate-pulse">
                  <line x1={x} y1="42" x2={x} y2="58" stroke={isZero ? '#10b981' : (isPositive ? '#60a5fa' : '#f87171')} strokeWidth="2" />
                  <circle cx={x} cy="50" r="4" fill={isZero ? '#10b981' : (isPositive ? '#3b82f6' : '#ef4444')} />
                  <text x={x} y="80" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">
                    {val}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="diagram-legend">
            <span className="legend-item text-red-400">ଋଣାତ୍ମକ (-)</span>
            <span className="legend-item text-emerald-400">ଶୂନ (୦)</span>
            <span className="legend-item text-blue-400">ଧନାତ୍ମକ (+)</span>
          </div>
        </div>
      );
    }

    // 3. Fractions & Decimals (Circle Pie Chart Diagram)
    if (title.includes('fraction') || title.includes('decimal') || title.includes('ଭଗ୍ନାଂଶ')) {
      return (
        <div className="interactive-diagram fraction-circle">
          <div className="diagram-title-label">ଭଗ୍ନାଂଶ ଚିତ୍ର (Fraction Circle Representation - 3/4)</div>
          <svg viewBox="0 0 200 200" className="w-32 h-32 mx-auto">
            {/* Circle sections */}
            <path d="M100,100 L100,20 A80,80 0 0,1 180,100 Z" fill="#3b82f6" stroke="#0e0a29" strokeWidth="2" opacity="0.85" />
            <path d="M100,100 L180,100 A80,80 0 0,1 100,180 Z" fill="#3b82f6" stroke="#0e0a29" strokeWidth="2" opacity="0.85" />
            <path d="M100,100 L100,180 A80,80 0 0,1 20,100 Z" fill="#3b82f6" stroke="#0e0a29" strokeWidth="2" opacity="0.85" />
            <path d="M100,100 L20,100 A80,80 0 0,1 100,20 Z" fill="rgba(255,255,255,0.15)" stroke="#a78bfa" strokeWidth="2" strokeDasharray="4" />
            <circle cx="100" cy="100" r="6" fill="#10b981" />
          </svg>
          <div className="diagram-fraction-label">୩ / ୪ (Three-Fourths)</div>
        </div>
      );
    }

    // 4. Geometry (Triangle Diagram)
    if (title.includes('geometry') || title.includes('triangle') || title.includes('ଜ୍ୟାମିତି') || title.includes('ତ୍ରିଭୁଜ')) {
      return (
        <div className="interactive-diagram geometry-triangle">
          <div className="diagram-title-label">ସମକୋଣୀ ତ୍ରିଭୁଜ (Right Angle Triangle)</div>
          <svg viewBox="0 0 200 160" className="w-36 h-auto mx-auto">
            <polygon points="40,30 40,130 160,130" fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6" strokeWidth="3" strokeLinejoin="round" />
            <path d="M40,118 L52,118 L52,130" fill="none" stroke="#10b981" strokeWidth="2" />
            <text x="30" y="80" fill="#f87171" fontSize="12" fontWeight="700">A (ଉଚ୍ଚତା)</text>
            <text x="100" y="145" fill="#60a5fa" fontSize="12" fontWeight="700">B (ଭୂମି)</text>
            <text x="110" y="75" fill="#fbbf24" fontSize="12" fontWeight="700">C (ଅତିଭୁଜ)</text>
          </svg>
        </div>
      );
    }

    // 5. Default/Welcome concept card
    const isWelcome = title.includes('welcome') || title.includes('ସ୍ୱାଗତମ୍');
    return (
      <div className="interactive-diagram abstract-diagram">
        {isWelcome ? (
          <div className="welcome-concept-slide">
            <div className="welcome-avatar-ripple">
              <div className="welcome-card-avatar-container">
                <img src="/gundulu-v3.png" alt="Welcome Gundulu" className="welcome-card-avatar" />
              </div>
            </div>
            <p className="welcome-card-text">ଆସ ଏକାଠି ପାଠ ପଢିବା!</p>
          </div>
        ) : (
          <div className="abstract-math-slide">
            <svg viewBox="0 0 200 100" className="w-full h-16 opacity-70">
              <path d="M10,50 Q50,10 100,50 T190,50" fill="none" stroke="#60a5fa" strokeWidth="2" />
              <path d="M10,50 Q50,90 100,50 T190,50" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="3" />
            </svg>
            <div className="math-formulas">
              <span className="formula-badge">x = (-b ± √D) / 2a</span>
              <span className="formula-badge">A = πr²</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const speakWithBrowserTtsFallback = (text: string, onDone?: () => void) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    
    // Attempt to locate premium natural voice engines installed in Chrome/Android/iOS
    const voices = window.speechSynthesis.getVoices();
    // Prioritize a sweet, cute female voice (Heera, Zira, Susan, Hazel, or containing 'female')
    let premiumVoice = voices.find(v => 
      v.lang.startsWith(language) && 
      (v.name.includes('Heera') || v.name.includes('Zira') || v.name.toLowerCase().includes('female') || v.name.includes('Susan') || v.name.includes('Hazel') || v.name.includes('Google US English') || v.name.includes('Google UK English Female'))
    );
    
    if (!premiumVoice) {
      premiumVoice = voices.find(v => 
        v.lang.startsWith(language) && 
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')) &&
        !v.name.includes('David') && !v.name.includes('Ravi') && !v.name.toLowerCase().includes('male')
      ) || voices.find(v => v.lang.startsWith(language));
    }
    
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }
    
    utterance.pitch = 1.25; // cute, sweet girl voice pitch
    utterance.rate = 0.85;

    utterance.onstart = () => {
      setIsSpeaking(true);
      animateSubtitle(text, true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      onDone?.();
    };
    window.speechSynthesis.speak(utterance);
  };

  const speakWithGeminiVoice = async (text: string, onDone?: () => void, retries = 1): Promise<void> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("Gemini TTS connection timed out (2.5s limit reached). Triggering immediate local browser TTS fallback...");
      controller.abort();
    }, 2500);

    try {
      stopCurrentAudio();
      window.speechSynthesis.cancel();
      setIsSpeaking(true);

      const response = await fetch('/api/tts/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw { status: response.status, message: `TTS HTTP ${response.status}` };
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
      
      animateSubtitle(text, false);

      // Web Audio API analysis for real-time lip-sync/volume pulsing
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 64; // Small fftSize for fast, lightweight performance
          analyserRef.current = analyser;
        }
      }

      if (audioContextRef.current && analyserRef.current) {
        try {
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          
          const source = audioContextRef.current.createMediaElementSource(audio);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const updateVolumeScale = () => {
            if (!analyserRef.current || !sphereRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Sync volume to audioVolumeRef for the Canvas waveform
            audioVolumeRef.current = average;

            // Scale the sphere slightly based on voice volume (Max 15% enlargement)
            const scale = 1 + (average / 255) * 0.15;
            sphereRef.current.style.transform = `scale(${scale})`;
            
            animationFrameRef.current = requestAnimationFrame(updateVolumeScale);
          };
          
          animationFrameRef.current = requestAnimationFrame(updateVolumeScale);
        } catch (e) {
          console.warn("Web Audio API binding failed:", e);
        }
      }

      await audio.play();
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isQuotaExceeded = err?.status === 429;
      const isAborted = err?.name === 'AbortError';
      
      if (retries > 0 && !isQuotaExceeded && !isAborted) {
        const delay = (2 - retries) * 1500; 
        console.warn(`Gemini TTS error. Retrying in ${delay}ms... (${retries} attempts left)`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        return speakWithGeminiVoice(text, onDone, retries - 1);
      }
      
      console.warn(isAborted ? 'Gemini TTS timed out, falling back to browser TTS.' : 'Gemini voice unavailable, using browser TTS fallback.', err);
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
    chatHistoryRef.current = []; // Reset previous chat history on mount
    setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
    setSubtitle('');

    const speakGreeting = () => {
      if (hasPlayedGreetingRef.current) return;
      const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
      const freeQueriesUsed = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
      if (!isPremium && freeQueriesUsed >= 5 && !isFreePeriod) return; // Do not greet if paywalled

      hasPlayedGreetingRef.current = true;

      const greeting = "ନମସ୍କାର! ମୁଁ ଗୁନ୍ଦୁଲୁ। ଆସ, ଏବେ ଏକାଠି ପଢ଼ିବା ଓ ଆଗକୁ ବଢ଼ିବା।";
      setStatus("ଗୁନ୍ଦୁଲୁ କହୁଛି...");

      const activePremiumVoice = localStorage.getItem('gundulu_use_premium_voice') !== 'false';
      const speakFn = activePremiumVoice ? speakWithGeminiVoice : speakWithBrowserTtsFallback;
      speakFn(sanitizeTextForTTS(greeting), () => {
        triggerVisualNudge();
        if (recognitionRef.current && !isListeningRef.current) {
          transcriptBufferRef.current = '';
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Speech recognition failed to auto-start after greeting:", e);
            setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
          }
        } else {
          setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
        }
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
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setStatus("ଗୁନ୍ଦୁଲୁ ଶୁଣୁଛି... 👂");
        transcriptBufferRef.current = '';
      };

      recognition.onresult = (event: any) => {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += text + ' ';
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript) {
          transcriptBufferRef.current += normalizeTranscript(finalTranscript);
        }

        const currentDisplay = (transcriptBufferRef.current + interimTranscript).trim();
        if (currentDisplay) {
          setSubtitle(`ଆପଣ କହିଲେ: "${currentDisplay}"`);
        }

        // Auto-submit after 1.2 seconds of silence for snappy, WhatsApp-call style responsiveness
        silenceTimeoutRef.current = setTimeout(() => {
          recognition.stop();
          const finalText = transcriptBufferRef.current.trim();
          if (finalText) {
            processWithGemini({ primary: finalText, candidates: [finalText] });
          }
        }, 1200);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
          silenceTimeoutRef.current = null;
        }
        if (event.error === 'no-speech') {
          setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
          return;
        }
        const errorMsg = "ଶୁଣିପାରିଲି ନାହିଁ | ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
        setSubtitle(errorMsg);
        setStatus("ମୁଁ ଶୁଣିପାରିଲି ନାହିଁ");
      };

      recognitionRef.current = recognition;
    }

    return () => {
      window.speechSynthesis.cancel();
      stopCurrentAudio();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      window.removeEventListener('startGunduluGreeting', handleStartGreeting);
    };
  }, [language, skipInitialGreeting, inputLanguage]);

  const triggerVisualNudge = () => {
    setIsWaitingForInput(true);
    setTimeout(() => setIsWaitingForInput(false), 3000);
  };

  const processWithGemini = async (speechInput: SpeechInput) => {
    setStatus("ଗୁନ୍ଦୁଲୁ ଚିନ୍ତା କରୁଛି...");
    setIsListening(false);
    
    try {
      const ai = getAI();
      const modelName = 'gemini-2.5-flash';
      const turn = responseTurnRef.current;

      // Dynamic Textbook RAG matching based on school curriculum chapters with Weighted Keyword Intersection Scoring
      let textbookContext = '';
      if (chapters && chapters.length > 0 && speechInput.primary) {
        const spokenWords = speechInput.primary
          .toLowerCase()
          .replace(/[?.!,:;()]/g, '')
          .split(/\s+/)
          .filter((w: string) => w.length > 3);

        const scoredChapters = chapters.map(ch => {
          const title = (ch.title || '').toLowerCase();
          const subject = (ch.subject || '').toLowerCase();
          const notes = (ch.notes || '').toLowerCase();
          
          let score = 0;
          for (const word of spokenWords) {
            // Highly value matches in Title (weight 10)
            if (title.includes(word)) score += 10;
            // Value matches in Subject (weight 5)
            if (subject.includes(word)) score += 5;
            // Value matches in Notes content (weight 2)
            if (notes.includes(word)) score += 2;
          }
          return { chapter: ch, score };
        });

        // Filter chapters with score > 0 and sort by score descending
        const matchingChapters = scoredChapters
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(item => item.chapter);

        // Fallback to first 3 chapters only if there are no search hits at all
        const selectedChapters = matchingChapters.length > 0 
          ? matchingChapters.slice(0, 3) 
          : chapters.slice(0, 3);

        if (matchingChapters.length > 0) {
          setActiveChapter(matchingChapters[0]);
        }

        textbookContext = selectedChapters.map(ch => 
          `[Textbook Chapter: ${ch.title} | Subject: ${ch.subject}]\nVerified Lesson Notes: ${ch.notes || 'No specific textbook notes available.'}`
        ).join('\n\n');
        
        console.log(`[Gundulu RAG] Matching chapters selected by relevance score:`, selectedChapters.map(ch => ch.title));
      }
      
      const systemInstruction = `
        Identity & Persona: You are "Gundulu," a warm, highly interactive, and brilliant virtual tutor from Odisha (personality of a sweet, encouraging elder sibling tutor).
        Pedagogical Tone: Speak with immense warmth and encouragement. Use diverse praise expressions naturally.
        Teacher Behavior Rules:
          1. Actively encourage the student when they ask a question. Praise their curiosity.
          2. NEVER give away the whole answer at once, especially for math or sequences (e.g., counting, addition). Use scaffolded, interactive Socratic teaching.
             - Example (Counting for Class 1): If the student asks to learn counting 1 to 10, explain "1 and 2" first, then ask "Can you tell me what comes next?". Do not explain the whole list. Once they answer "3", praise them, explain "3", and ask "What comes after 3?".
             - Example (Addition/Subtraction/Math): Break the problem into the very first small step. Ask them to solve that first step, then proceed to the next step based on their response.
          3. Socratic Prompting: Ask the student one simple, sweet question at a time to keep them engaged in the interactive learning loop.
          4. No repetition of praises: Only use praises like "Aree wah!" or "Sabas!" occasionally or at the first turn. Do not repeat the same praise phrase in every single response as it gets highly repetitive. Use diverse, natural Odia encouragements.
          5. When mentioning technical English terms (e.g., Photosynthesis, Gravity, Friction), translate them to their standard Odia names so students learn both.
          6. Never read raw text robotic-style. Explain it like a passionate, friendly private home tutor.
          7. Conclude your answer with a highly engaging, sweet follow-up question (e.g., "Bujhiparlu ta? Na au thare kahibi?" / "Bala lagila ta? Au kichi prashna achi?").
        
        Oral-First Formatting Rules (CRITICAL FOR TTS NATURALNESS):
          1. NEVER output Markdown formatting (do NOT use **, *, #, _, -, or lists).
          2. NEVER output emojis or emoticons (e.g. do NOT use ✨, 😊, etc.) as they glitch the voice synthesizer.
          3. Spell out all numbers and mathematical operations phonetically in Odia text (e.g. write "ତିନି ବିଭକ୍ତ ଚାରି" instead of "3/4", and "ସମାନ" instead of "=").
          4. NEVER put English translation terms in brackets (e.g. do NOT write "ପ୍ଲାଣ୍ଟ (plant)"). Instead, write the Odia word or write the English word phonetically in Odia script (e.g. "ପ୍ଲାଣ୍ଟ").
          5. Use punctuation (commas and periods) strategically to force natural breathing pauses in speech synthesis.
          
        Language Policy: STRICT ODIA OUTPUT ONLY.
        Input Policy: User may speak in Odia or English. Always understand both, but always reply only in Odia.
        ASR Rule: Speech-to-text can be wrong for Odisha names/words. Use context to auto-correct likely misheard words.
        ASR Rule: Prefer Odisha school/local words (district names, subjects, textbook terms) when candidates are similar.
        Style: Conversational, friendly private tutor voice.
        Context: This is response turn number ${turn + 1}. If turn > 1, avoid intro lines and start directly with answer.
        Constraint: Keep your response extremely brief, simple, and conversational (maximum 1-2 short sentences, under 30 words) so that the student isn't overwhelmed and the voice synthesis is nearly instantaneous (like a real WhatsApp voice call!). Never give long list-style lectures.
 
        ${textbookContext ? `
        Verified Textbook Context (Primary Source of Knowledge):
        You MUST answer the student's question using ONLY the facts and details provided in the official textbook notes below. 
        - STRICT RULE: Do NOT invent or assume any facts, dates, characters, or formulas that are not explicitly written in the context below. 
        - STRICT RULE: If the student asks a question about this chapter that is not covered in the textbook notes below, politely explain in Odia: "I can only teach what is in our Class textbook lesson. Let's look at this part together!"
        
        ${textbookContext}
        ` : ''}
      `;

      const inputPayload = `
Primary speech transcript: ${speechInput.primary}
Alternative transcripts: ${speechInput.candidates.join(' | ') || 'N/A'}
ASR confidence: ${typeof speechInput.confidence === 'number' ? speechInput.confidence.toFixed(2) : 'unknown'}

Understand user intent from these transcripts and respond in Odia only.
      `.trim();

      // 1. Append user payload to chat history
      const userContent = { role: 'user', parts: [{ text: inputPayload }] };
      chatHistoryRef.current.push(userContent);

      // 2. Limit history to keep up to last 3 entries (saves 50% on input token context memory costs!)
      if (chatHistoryRef.current.length > 3) {
        chatHistoryRef.current = chatHistoryRef.current.slice(-3);
      }

      const modelInstance = ai.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const result = await modelInstance.generateContent({
        contents: chatHistoryRef.current,
        generationConfig: {
          temperature: 0.7,
        },
      });

      const response = result.response.text() || "ମୁଁ ଭଲଭାବେ ଶୁଣି ପାରିଲି ନାହିଁ, ଆଉଥରେ କହନ୍ତୁ।";
      
      // 3. Append model response to chat history
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: response }] });

      responseTurnRef.current += 1;

      // Increment free queries token counter for unsubscribed users if it is a valid academic query and not safety-blocked
      const academicQuery = !isGreeting(speechInput.primary);
      if (!isPremium && academicQuery) {
        const isSafetyBlocked = response.includes("Safety Warning") || response.includes("Perspective API") || response.includes("ସୁରକ୍ଷା ଚେତାବନୀ");
        if (!isSafetyBlocked) {
          const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
          const currentFreeCount = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
          localStorage.setItem(getFreeQueriesKey(), (currentFreeCount + 1).toString());
          setFreeQueriesCount(currentFreeCount + 1);
          
          if (currentFreeCount + 1 >= 5 && !isFreePeriod) {
            window.speechSynthesis.cancel();
            stopCurrentAudio();
            recognitionRef.current?.stop();
            setIsSpeaking(false);
            setIsListening(false);
          }
        }
      }

      speakResponse(response);
    } catch (error) {
      const errorMsg = "ଓଃ! କିଛି ଭୁଲ୍ ହୋଇଗଲା |";
      speakResponse(errorMsg);
    }
  };

  const speakResponse = (text: string) => {
    const activePremiumVoice = localStorage.getItem('gundulu_use_premium_voice') !== 'false';
    const speakFn = activePremiumVoice ? speakWithGeminiVoice : speakWithBrowserTtsFallback;
    const sanitized = sanitizeTextForTTS(text);
    speakFn(sanitized, () => {
      triggerVisualNudge();
      // Automatically start listening for student's response (seamless hands-free loop!)
      if (recognitionRef.current && !isListeningRef.current) {
        const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
        const freeQueriesUsed = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
        if (!isPremium && freeQueriesUsed >= 5 && !isFreePeriod) {
          return;
        }

        transcriptBufferRef.current = '';
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Speech recognition failed to auto-start:", e);
          setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
        }
      } else {
        setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ");
      }
    });
  };

  const toggleListening = () => {
    if (!isPremium && freeQueriesCount >= 5 && !isFreePeriod) {
      if (onUpgrade) onUpgrade();
      return;
    }

    if (isListeningRef.current) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      recognitionRef.current?.stop();
      
      const finalCompiled = transcriptBufferRef.current.trim();
      if (finalCompiled) {
        processWithGemini({ primary: finalCompiled, candidates: [finalCompiled] });
      }
    } else {
      transcriptBufferRef.current = '';
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('Speech recognition start error:', e);
      }
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

  // Cleanly terminates all Web Speech, audio play, and listening elements on click "End" / Hang up
  const handleHangUp = () => {
    window.speechSynthesis.cancel();
    stopCurrentAudio();
    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort(); // Immediately abort microphone listening
      }
    } catch (e) {
      console.warn('Error aborting speech recognition:', e);
    }
    setIsSpeaking(false);
    setIsListening(false);
    if (onBack) onBack();
  };

  // Get current active status state classes
  const getCallStateClass = () => {
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    if (isWaitingForInput) return 'waiting';
    return 'idle';
  };

  return (
    <div className={`immersive-call-container ${getCallStateClass()} ${activeChapter ? 'has-visual-card' : ''} force-dark-theme`}>
      
      {isFreePeriod && (
        <div 
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full flex items-center justify-center gap-2 text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest z-[90] shadow-lg backdrop-blur-md"
          style={{ width: 'max-content', maxWidth: '90%' }}
        >
          <Lucide.Sparkles size={12} className="text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
          <span>
            {language.startsWith('or') || inputLanguage.startsWith('or')
              ? '🎉 ମାଗଣା ପ୍ରଦର୍ଶନ ଅଫର! ୧୧ ଜୁଲାଇ ୨୦୨୬ ରାତି ୧୧:୫୯ ଟା ପର୍ଯ୍ୟନ୍ତ ଗୁନ୍ଦୁଲୁ AI ର ଅସୀମିତ ବ୍ୟବହାର କରନ୍ତୁ।'
              : '🎉 Free Showcase Access Active! Enjoy unlimited learning until July 11, 2026 at 11:59 PM.'}
          </span>
        </div>
      )}

      {/* Dynamic Swirling Siri-Style Background Aura Blobs */}
      <div className="bg-glow-blobs">
        <div className="glow-blob blob-violet"></div>
        <div className="glow-blob blob-emerald"></div>
        <div className="glow-blob blob-amber"></div>
      </div>
      
      {/* 2. DUAL WORKSPACE: 3D AVATAR + VISUAL TEXTBOOK CARD */}
      <div className="call-visual-workspace">
        
        {/* Left/Top: Main 3D Avatar sphere */}
        <div className="call-main-sphere">
          <div className="avatar-3d-orbit">
            
            {/* Orbital 3D perspective concentric rings */}
            <div className="orbital-ring ring-outer"></div>
            <div className="orbital-ring ring-mid"></div>
            <div className="orbital-ring ring-inner"></div>

            {/* Glowing Siri Waves (Rippling Around the Central Glass Orb) */}
            {(isListening || isSpeaking) && (
              <div className="neon-siri-waves">
                <div className="siri-wave wave-1"></div>
                <div className="siri-wave wave-2"></div>
                <div className="siri-wave wave-3"></div>
              </div>
            )}

            {/* Glowing background aurorafield */}
            <div className="glow-aura"></div>

            {/* Central Avatar Orb */}
            <div ref={sphereRef} className="avatar-sphere" onClick={toggleListening}>
              <div className="avatar-img-container">
                <img src="/gundulu-v3.png" alt="Gundulu" className="avatar-img-3d" />
              </div>
              
              {/* Glossy glass reflection cover */}
              <div className="avatar-glass-shine"></div>
              
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

        {/* Right/Bottom: Interactive Textbook Pictorial Lesson Card */}
        {activeChapter && (
          <div className="textbook-visual-card animate-fade-in">
            <div className="card-glass-header">
              <span className="chapter-badge">{activeChapter.subject || "GUNDULU AI TUTOR"}</span>
              <h3 className="chapter-card-title">
                {typeof activeChapter.title === 'string'
                  ? (activeChapter.title_or || activeChapter.title)
                  : ((activeChapter.title as any)?.or || (activeChapter.title as any)?.en || "Untitled Chapter")}
              </h3>
            </div>
            <div className="card-visual-body">
              {renderTextbookVisual(activeChapter)}
            </div>
            <div className="card-notes-preview">
              <p className="notes-heading">ପାଠ୍ୟକ୍ରମ ବିବରଣୀ (Lesson Overview):</p>
              <p className="notes-text">{activeChapter.notes || "ନମସ୍କାର! ଗୁନ୍ଦୁଲୁ ସହ ପଢିବା ପାଇଁ ଆପଣଙ୍କ ସ୍ୱାଗତ।"}</p>
            </div>
          </div>
        )}

      </div>

      {/* 3. CALL STATUS DISPLAY */}
      <div className="call-status-box">
        <h2 className="call-state-title">{status}</h2>
        
        {/* Active Realtime Audio wave visualization */}
        <div className="call-visualizer-wave-container w-full max-w-[200px] mx-auto mt-2">
          <AudioWaveform isSpeaking={isSpeaking} isListening={isListening} audioVolumeRef={audioVolumeRef} />
        </div>
      </div>

      {/* 4. SUBTITLE CAPTIONS DISPLAY */}
      <div className="call-subtitles-hud">
        {subtitle && (
          <div ref={subtitleContainerRef} className="caption-bubble">
            <p className="caption-text">{subtitle}</p>
          </div>
        )}
      </div>

      {/* 5. BOTTOM CALL HUD ACTIONS PANEL - Voice Switcher + Hang Up */}
      <div className="call-bottom-hud-panel single-stop-hud" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <button 
          className="hud-action-btn glass-btn"
          onClick={() => {
            const nextState = !usePremiumVoice;
            setUsePremiumVoice(nextState);
            localStorage.setItem('gundulu_use_premium_voice', String(nextState));
            // Stop current audio so it can adapt instantly
            stopCurrentAudio();
            setIsSpeaking(false);
            setStatus(nextState ? "Premium Voice Enabled ✨" : "Standard Voice Enabled 📱");
            setTimeout(() => setStatus("ଗୁନ୍ଦୁଲୁ ସହ କଥା ହେବା ପାଇଁ ସ୍ପର୍ଶ କରନ୍ତୁ"), 1500);
          }}
          title={usePremiumVoice ? "Switch to Standard Voice (Free)" : "Switch to Premium AI Voice (Cloud)"}
          style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.08)', 
            background: usePremiumVoice ? 'rgba(124, 58, 237, 0.25)' : 'rgba(255,255,255,0.04)', 
            boxShadow: usePremiumVoice ? '0 0 15px rgba(124, 58, 237, 0.4)' : 'none',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}
        >
          <Lucide.Sparkles size={22} className={usePremiumVoice ? 'text-violet-400' : 'text-slate-400'} />
          <span className="hud-btn-label" style={{ fontSize: '0.62rem', whiteSpace: 'nowrap', marginTop: '1px' }}>
            {usePremiumVoice ? "Premium" : "Standard"}
          </span>
        </button>

        {onBack && (
          <button 
            className="hud-action-btn hang-up-btn" 
            onClick={handleHangUp}
            title="End Voice Session"
          >
            <Lucide.PhoneOff size={28} className="text-white" />
            <span className="hud-btn-label">କାଟନ୍ତୁ</span>
          </button>
        )}
      </div>

      {/* Premium Upgrade Overlay */}
      {!isPremium && freeQueriesCount >= 5 && !isFreePeriod && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 text-center select-none animate-fade-in force-dark-theme">
          <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative max-w-md w-full bg-slate-900/60 border border-emerald-500/20 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 shadow-2xl flex flex-col items-center gap-6">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-emerald-500 blur-xl opacity-20 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-slate-950 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover scale-[0.95]" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-emerald-400 uppercase tracking-wide">
                {inputLanguage.startsWith('or') || language.startsWith('or') ? 'ମାଗଣା ଭଏସ୍ ସୀମା ଶେଷ! 🎤' : 'Voice Trial Limit Reached! 🎤'}
              </h3>
              <p className="text-xs md:text-sm font-bold text-slate-350 leading-relaxed">
                {inputLanguage.startsWith('or') || language.startsWith('or')
                  ? 'ଗୁନ୍ଦୁଲୁ ଆପା ସହିତ ବିନା କୌଣସି ବାଧାରେ ସିଧାସଳଖ କଥାବାର୍ତ୍ତା କରିବା ପାଇଁ ପ୍ରିମିୟମ୍‌କୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!'
                  : 'Upgrade to Gundulu Premium to converse naturally in Odia with Gundulu Voice Tutor, grade your speech pronunciation, and get unlimited voice answers.'}
              </p>
            </div>
            
            <div className="flex flex-col gap-3.5 w-full mt-2">
              <button
                onClick={onUpgrade}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:scale-105 active:scale-95 transition-all shadow-[0_8px_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest cursor-pointer"
              >
                <Lucide.Sparkles size={14} className="animate-pulse" />
                <span>{inputLanguage.startsWith('or') || language.startsWith('or') ? 'ପ୍ରିମିୟମ ଅପଗ୍ରେଡ୍' : 'Upgrade to Premium'}</span>
              </button>
              
              <button
                onClick={onBack}
                className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
              >
                {inputLanguage.startsWith('or') || language.startsWith('or') ? 'ଫେରିଯାଆନ୍ତୁ' : 'Go Back'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface AudioWaveformProps {
  isSpeaking: boolean;
  isListening: boolean;
  audioVolumeRef: React.RefObject<number>;
}

export function AudioWaveform({ isSpeaking, isListening, audioVolumeRef }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const drawWave = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      amplitude: number,
      frequency: number,
      speed: number,
      color: string,
      lineWidth: number
    ) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      for (let x = 0; x < width; x++) {
        const envelope = Math.sin((x / width) * Math.PI);
        const y = height / 2 + Math.sin(x * frequency + phase * speed) * amplitude * envelope;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    const render = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      let baseAmplitude = 3;
      let targetColor1 = 'rgba(148, 163, 184, 0.25)'; // slate-400
      let targetColor2 = 'rgba(100, 116, 139, 0.15)'; // slate-500
      let targetColor3 = 'rgba(71, 85, 105, 0.1)';   // slate-600

      if (isSpeaking) {
        const volumeFactor = audioVolumeRef?.current !== undefined 
          ? (audioVolumeRef.current / 255) * 30 
          : 0;
        baseAmplitude = Math.max(8, volumeFactor > 0 ? volumeFactor : 15 + Math.sin(phase * 0.1) * 5);
        targetColor1 = 'rgba(139, 92, 246, 0.7)'; // Speaking: Violet
        targetColor2 = 'rgba(236, 72, 153, 0.5)'; // Pink
        targetColor3 = 'rgba(99, 102, 241, 0.3)'; // Indigo
      } else if (isListening) {
        baseAmplitude = 18 + Math.sin(phase * 0.25) * 8;
        targetColor1 = 'rgba(6, 182, 212, 0.7)';  // Listening: Cyan
        targetColor2 = 'rgba(16, 185, 129, 0.5)';  // Emerald
        targetColor3 = 'rgba(34, 197, 94, 0.3)';   // Green
      }

      phase += 0.12;

      // Render 3 layers of waves for rich organic depth
      drawWave(ctx, width, height, baseAmplitude * 0.6, 0.04, 0.7, targetColor3, 1);
      drawWave(ctx, width, height, baseAmplitude * 0.8, 0.03, -1.0, targetColor2, 1.5);
      drawWave(ctx, width, height, baseAmplitude, 0.02, 0.8, targetColor1, 2.5);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isSpeaking, isListening, audioVolumeRef]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-10 pointer-events-none rounded-xl"
      style={{ display: 'block', maxHeight: '40px' }}
    />
  );
}

export default GunduluHuman;
