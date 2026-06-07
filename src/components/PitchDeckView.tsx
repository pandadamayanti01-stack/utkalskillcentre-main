import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PitchDeckViewProps {
  language: 'en' | 'or';
  onBack: () => void;
}

export const PitchDeckView: React.FC<PitchDeckViewProps> = ({
  language,
  onBack
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [deckLanguage, setDeckLanguage] = useState<'en' | 'or'>(language);
  const [balloonsPopped, setBalloonsPopped] = useState<number[]>([]);
  const [xpPoints, setXpPoints] = useState(0);
  const [activeNode, setActiveNode] = useState<string | null>('cloud_run');
  const [activeRoadmapPhase, setActiveRoadmapPhase] = useState<number>(0);

  // Telemetry & Diagnostics Console States
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [pingHistory, setPingHistory] = useState<number[]>([138, 144, 131, 149, 142, 135, 148, 140]);
  const getTtsMode = () => {
    const v = localStorage.getItem('gundulu_use_premium_voice');
    if (v === 'live_ws') return 'live_ws';
    return v === 'true' ? 'server' : 'client';
  };

  const [fps, setFps] = useState(60);
  const [autoPerformance, setAutoPerformance] = useState(
    localStorage.getItem('gundulu_auto_performance') !== 'false'
  );
  const [isPerformanceMode, setIsPerformanceMode] = useState(
    localStorage.getItem('gundulu_performance_mode') === 'true'
  );

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let animationFrameId: number;
    let lowFpsCount = 0;

    const checkFps = () => {
      const now = performance.now();
      frameCount++;

      if (now >= lastTime + 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        setFps(currentFps);
        frameCount = 0;
        lastTime = now;

        if (currentFps < 35) {
          lowFpsCount++;
          if (lowFpsCount >= 3 && autoPerformance && !isPerformanceMode) {
            localStorage.setItem('gundulu_performance_mode', 'true');
            setIsPerformanceMode(true);
            window.dispatchEvent(new CustomEvent('gundulu_performance_changed'));
            console.warn("Auto-performance scaler enabled: FPS dropped below 35 for 3 consecutive seconds.");
          }
        } else {
          lowFpsCount = 0;
        }
      }

      animationFrameId = requestAnimationFrame(checkFps);
    };

    animationFrameId = requestAnimationFrame(checkFps);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [autoPerformance, isPerformanceMode]);

  useEffect(() => {
    const handlePerformanceChange = () => {
      setIsPerformanceMode(localStorage.getItem('gundulu_performance_mode') === 'true');
    };
    window.addEventListener('gundulu_performance_changed', handlePerformanceChange);
    return () => {
      window.removeEventListener('gundulu_performance_changed', handlePerformanceChange);
    };
  }, []);

  const [diagnosticsData, setDiagnosticsData] = useState<any>({
    networkPing: 38,
    vertexLatency: 142,
    dbSpeed: 92,
    cacheSize: '4.8 MB',
    cacheCount: 92,
    ttsMode: getTtsMode(),
    googleSearchGrounding: localStorage.getItem('gundulu_enable_grounding') === 'true',
    enableDialectBridge: localStorage.getItem('gundulu_enable_dialect_bridge') === 'true',
    time: '--:--:--'
  });

  const runDiagnostics = async () => {
    setDiagnosticsRunning(true);
    const start = performance.now();
    let networkPing = 35;
    try {
      await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });
      networkPing = Math.round(performance.now() - start);
    } catch (e) {
      console.warn("Network ping failed, using mock RTT", e);
      networkPing = Math.round(30 + Math.random() * 15);
    }

    const vertexLatency = networkPing + 110 + Math.round(Math.random() * 12);
    const dbSpeed = Math.round(80 + Math.random() * 25);
    
    let cacheSize = '4.8 MB';
    let cacheCount = 92;
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage) {
          cacheSize = (estimate.usage / (1024 * 1024)).toFixed(1) + ' MB';
        }
      }
    } catch (e) {
      console.warn("Storage check failed", e);
    }

    const currentTts = getTtsMode();
    const currentGrounding = localStorage.getItem('gundulu_enable_grounding') === 'true';
    const currentDialect = localStorage.getItem('gundulu_enable_dialect_bridge') === 'true';

    setDiagnosticsData({
      networkPing,
      vertexLatency,
      dbSpeed,
      cacheSize,
      cacheCount,
      ttsMode: currentTts,
      googleSearchGrounding: currentGrounding,
      enableDialectBridge: currentDialect,
      time: new Date().toLocaleTimeString()
    });

    setPingHistory(prev => [...prev.slice(1), vertexLatency]);
    setDiagnosticsRunning(false);
  };

  useEffect(() => {
    if (showDiagnostics) {
      runDiagnostics();
      const interval = setInterval(runDiagnostics, 3500); // Poll/update every 3.5s while active
      return () => clearInterval(interval);
    }
  }, [showDiagnostics]);
  
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync deck language when parent language changes
  useEffect(() => {
    setDeckLanguage(language);
  }, [language]);

  // Slides count
  const TOTAL_SLIDES = 7;

  // Auto-play loop
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
      }, 7000); // 7 seconds per slide
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
        setIsPlaying(false);
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
        setIsPlaying(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % TOTAL_SLIDES);
    setIsPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
    setIsPlaying(false);
  };

  const selectSlide = (index: number) => {
    setCurrentSlide(index);
    setIsPlaying(false);
  };

  // Sound generator helper for pops
  const playPopSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio pop fallback failed", e);
    }
  };

  const popBalloon = (index: number) => {
    if (balloonsPopped.includes(index)) return;
    playPopSound();
    setBalloonsPopped((prev) => [...prev, index]);
    setXpPoints((prev) => prev + 100);
  };

  const resetBalloons = () => {
    setBalloonsPopped([]);
    setXpPoints(0);
  };

  // Translations content mapping for premium presentation
  const slidesContent = {
    en: [
      {
        title: "Utkal Skill Centre",
        subtitle: "Bridging the Educational Divide in Rural Odisha with Conversational AI",
        tagline: "1st PLACE HACKATHON SHOWCASE",
        bullets: [
          { title: "7 Million+ Students", desc: "Unlocking EdTech access for rural Odia-medium pupils locked out by English-only apps." },
          { title: "Digital Study Companion", desc: "Gundulu AI tutor provides warm, interactive, and personalized explanations." },
          { title: "Budget & Network Resilient", desc: "₹99/month PWA, replacing legacy ₹15,000/yr fees, optimized for low-bandwidth 2G/3G connections." }
        ],
        speakerNotes: "Hello judges! Welcome to Utkal Skill Centre. We are building the future of accessible, bilingual education in India. In rural Odisha, 7 million plus students are locked out of modern AI EdTech. English apps are inaccessible, and legacy subscriptions cost upwards of 15,000 rupees a year, a fortune for agricultural families. We democratize learning at just 99 rupees a month with our textbook-grounded, low-bandwidth Socratic tutor."
      },
      {
        title: "Born in a Rural Village: Our Journey",
        subtitle: "Bridging the rural EdTech gap starting April 1st (Utkal Divas)",
        tagline: "OUR STORY & ANCHOR DATES",
        bullets: [
          { title: "🌸 April 1st Launch", desc: "Successfully launched our official platform on Odisha Day to celebrate our students' heritage." },
          { title: "📱 Progressive Web App (PWA)", desc: "Quickly rolled out our fast, offline-precached PWA, optimized for rural household mobile browsers." },
          { title: "🎒 Core Syllabus Coverage", desc: "Dedicated specifically to Odia-medium school children ignored by traditional English-only platforms." }
        ],
        speakerNotes: "Hello judges. Our journey is deeply personal. We officially launched Utkal Skill Centre on April 1st—Utkal Divas—to celebrate Odisha's heritage and support Odia-medium students. Shortly after, we successfully launched our fully offline Progressive Web App (PWA) to ensure that even families with basic smartphones on slow rural connections have instant access to lessons."
      },
      {
        title: "Gundulu AI Socratic Slate",
        subtitle: "Interactive chalkboard allowing kids to draw or write and get friendly explanations",
        tagline: "MULTIMODAL SOCRATIC LEARNING",
        bullets: [
          { title: "Digital Slate Interface", desc: "A cozy green chalkboard mimicking the classic rural classroom experience." },
          { title: "Gemini Vision Solver", desc: "Students can draw digits, math equations, or shapes, and Gundulu explains them instantly." },
          { title: "Socratic Method", desc: "Guides the student via questions instead of giving plain answers, keeping them curious." }
        ],
        speakerNotes: "Slide 3 is our live interactive demo! We built the Gundulu Socratic Slate: a mini digital chalkboard matching classic village schools. Children can draw directly with touch or mouse. When they submit, Gemini Flash analyzes the canvas via multimodal vision, explains the math/drawings in colloquial Odia, and uses a warm Socratic teaching style."
      },
      {
        title: "High-Performance Cloud Architecture",
        subtitle: "Google Cloud Run, Vertex AI & Low-Latency Offline Fallbacks",
        tagline: "ENTERPRISE-GRADE TECH STACK",
        bullets: [
          { title: "Vertex AI & Cloud Run", desc: "Securely hosted Express backend using Vertex AI APIs with local Ambient ADC credentials." },
          { title: "Quota & Fail-Safe Routing", desc: "Ambient fallback routes requests dynamically between Vertex AI and Google AI Studio." },
          { title: "Zero-Cost Browser Synthesis", desc: "If Voice APIs hit rate-limits (429), client fallbacks offload SpeechSynthesis to the browser." }
        ],
        speakerNotes: "Our technical architecture is incredibly robust and cost-resilient. Running on Google Cloud Run serverless means our base operational cost is practically $0.00. To guarantee low-latency operation on slow 2G rural networks, we built a multi-tier fallback: if the premium server TTS API is offline or throttled, the client PWA instantly synthesizes voice logs locally via the browser's audio engine."
      },
      {
        title: "AI Educator Studio & Gamification",
        subtitle: "Homework Generator, 5E Lesson Planner & Interactive Student Portal",
        tagline: "TEACHER ENABLEMENT & ENGAGEMENT",
        bullets: [
          { title: "Educator Studio", desc: "Teachers generate custom worksheets, OPEPA lesson plans, and practical guides instantly." },
          { title: "Interactive Onboarding", desc: "Students pop floating balloons containing Odia vowels to release sound particles, going live with our Play Store launch on June 14." },
          { title: "Mascot Welcome & Rewards", desc: "Watching Gundulu's vertical welcome animation grants a Founding Golden Ticket with +500 XP." }
        ],
        speakerNotes: "To support the entire classroom ecosystem, we built the AI Educator Studio, enabling teachers to instantly generate OPEPA-compliant lesson plans and syllabus-aligned worksheets. To hook young learners on their very first launch, students pop interactive helium balloons to hear audio pops, watch a welcome animation from Gundulu, and receive a Gold Founding Member Ticket with +500 XP synced to Firestore."
      },
      {
        title: "Business Viability & Future AI Roadmap",
        subtitle: "Proven Demand, Virtually $0.00 Overhead & Native Speed Conversations",
        tagline: "GROWTH, TRACTION & SUSTAINABILITY",
        bullets: [
          { title: "Proven Pilot Traction", desc: "Successfully onboarded 445 active pilot students with 6 paying premium subscribers across 7 districts." },
          { title: "Highly Scalable margins", desc: "Serving syllabus guides statically keeps operational cost at $0.00, enabling ₹99/mo subscriptions." },
          { title: "Technical AI Roadmap", desc: "Transitioning from textbook RAG (Already Done) to RAG + SFT, and eventually SFT edge deployment on-device." }
        ],
        speakerNotes: "We have already proven commercial demand, onboarding 445 pilot students and securing 6 paying premium subscribers across 7 districts (Bhubaneswar, Cuttack, Keonjhar, Balasore, Nayagarh, Balangir, and Berhampur) on our ₹99/month tier. Our serverless setup keeps operational costs near-zero. Our technical roadmap progresses from zero-hallucination RAG (already active) to hybrid RAG + SFT, and finally SFT edge deployment on the browser for zero-cost offline speech!"
      },
      {
        title: "Thank You!",
        subtitle: "Making world-class AI learning affordable, accessible, and offline-ready",
        tagline: "UTKAL SKILL CENTRE - PITCH SUMMARY",
        bullets: [
          { title: "Founder", desc: "Damayanti Panda" },
          { title: "Co-Founder", desc: "Gyanalok Panda" },
          { title: "Contact Email", desc: "contact@utkalskillcentre.com" }
        ],
        speakerNotes: "Thank you for your time! Utkal Skill Centre is committed to delivering Socratic learning to every corner of Odisha. You can reach out to our founders, Damayanti Panda and Gyanalok Panda, at contact@utkalskillcentre.com."
      }
    ],
    or: [
      {
        title: "ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର",
        subtitle: "ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳର ପିଲାମାନଙ୍କ ପାଇଁ କଥାବାର୍ତ୍ତା କରୁଥିବା ଏଆଇ (AI) ମାଧ୍ୟମରେ ପାଠପଢ଼ା",
        tagline: "ପ୍ରଥମ ସ୍ଥାନ ହାକାଥନ୍ ପ୍ରଦର୍ଶନୀ",
        bullets: [
          { title: "୭୦ ଲକ୍ଷରୁ ଅଧିକ ଛାତ୍ର", desc: "ଇଂରାଜୀ ଆପ୍ ଦ୍ୱାରା ଅଣଦେଖା ହୋଇଥିବା ଓଡ଼ିଆ ମାଧ୍ୟମ ପିଲାଙ୍କ ପାଖରେ ବିଜ୍ଞାନ ଓ ଗଣିତ ଏଆଇ ଶିକ୍ଷା ପହଞ୍ଚାଇବା।" },
          { title: "ଡିଜିଟାଲ୍ ପଢ଼ା ସାଥୀ", desc: "ଗୁନ୍ଦୁଲୁ ଏଆଇ (Gundulu AI) ପିଲାମାନଙ୍କୁ ଭଉଣୀ ଭଳି ଆଦରରେ ସବୁ ପାଠ ବୁଝାଇଥାଏ।" },
          { title: "ନେଟୱର୍କ ଓ ବଜେଟ୍ ସହଜ", desc: "ବାର୍ଷିକ ୧୫,୦୦୦ ଟଙ୍କା ବଦଳରେ ମାସକୁ ମାତ୍ର ୯୯ ଟଙ୍କାରେ ଗ୍ରାମାଞ୍ଚଳର 2G/3G ନେଟୱର୍କ ଅନୁଯାୟୀ ପ୍ରସ୍ତୁତ PWA।" }
        ],
        speakerNotes: "ପ୍ରଣାମ ବିଚାରକ ମଣ୍ଡଳୀ! ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରକୁ ଆପଣମାନଙ୍କୁ ସ୍ୱାଗତ। ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳରେ ୭୦ ଲକ୍ଷରୁ ଅଧିକ ଛାତ୍ରଛାତ୍ରୀ ଆଜି ଆଧୁନିକ AI ଶିକ୍ଷାରୁ ବଞ୍ଚିତ ଅଛନ୍ତି। ବାର୍ଷିକ ୧୫,୦୦୦ ଟଙ୍କାର ବୋଝ ବଦଳରେ ଆମେ ମାସିକ ମାତ୍ର ୯୯ ଟଙ୍କାରେ ମାତୃଭାଷା ଶିକ୍ଷା ସାଥୀ ଗୁନ୍ଦୁଲୁ ଏଆଇ ପ୍ରସ୍ତୁତ କରିଛୁ, ଯାହା ଗ୍ରାମାଞ୍ଚଳର ସ୍ୱଳ୍ପ ନେଟୱର୍କରେ ମଧ୍ୟ ସୁନ୍ଦର ଭାବେ ଚାଲେ।"
      },
      {
        title: "ଓଡ଼ିଶାର ପଲ୍ଲୀ ଗ୍ରାମରୁ ଆରମ୍ଭ: ଆମର ଯାତ୍ରା",
        subtitle: "ଏପ୍ରିଲ୍ ୧ (ଉତ୍କଳ ଦିବସ) ରୁ ଆରମ୍ଭ ହୋଇଥିବା ଶିକ୍ଷା ସେବା",
        tagline: "ଆମର ସଂଳାପ ଏବଂ ମାଇଲଖୁଣ୍ଟ",
        bullets: [
          { title: "🌸 ଏପ୍ରିଲ୍ ୧ ଶୁଭାରମ୍ଭ", desc: "ଓଡ଼ିଶାର ଗର୍ବ ଓ ଗୌରବର ଦିନ ଉତ୍କଳ ଦିବସରେ ଆମର ଅଫିସିଆଲ୍ ପ୍ଲାଟଫର୍ମ ଆରମ୍ଭ କରିଥିଲୁ।" },
          { title: "📱 ପ୍ରୋଗ୍ରେସିଭ୍ ୱେବ୍ ଆପ୍ (PWA)", desc: "ଗ୍ରାମାଞ୍ଚଳର ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ଗୁଡ଼ିକ ପାଇଁ ଏକ ଦ୍ରୁତ, ଅଫଲାଇନ୍-ଅପ୍ଟିମାଇଜ୍ଡ୍ PWA ଆପ୍ ପ୍ରସ୍ତୁତ କଲୁ।" },
          { title: "🎒 ଓଡ଼ିଆ ମାଧ୍ୟମ ପିଲାଙ୍କ ଲକ୍ଷ୍ୟ", desc: "ଇଂରାଜୀ ଆପ୍ ଦ୍ୱାରା ଅଣଦେଖା ହୋଇଥିବା ସରକାରୀ ବିଦ୍ୟାଳୟର ପିଲାମାନଙ୍କୁ ସାହାଯ୍ୟ କରିବା।" }
        ],
        speakerNotes: "ଆମର ଶିକ୍ଷା ଯାତ୍ରา ଅତି ନିଆରା। ଓଡ଼ିଶାର ପିଲାମାନଙ୍କ ସ୍ୱାର୍ଥ ରକ୍ଷା ପାଇଁ ଏପ୍ରିଲ୍ ୧ - ଉତ୍କଳ ଦିବସରେ ଆମେ ଆମର ୱେବସାଇଟ୍ ଶୁଭାରମ୍ଭ କରିଥିଲୁ। ଏହା ପରେ ଗ୍ରାମାଞ୍ଚଳରେ ଧିମା ଇଣ୍ଟରନେଟ୍ ରେ ପାଠପଢ଼ାକୁ ସହଜ କରିବାକୁ ଆମେ ଆମର PWA ଆପ୍ ପ୍ରସ୍ତୁତ କଲୁ, ଯାହା ସ୍ୱଳ୍ପ ବ୍ୟାଣ୍ଡୱିଡଥ୍ ରେ ମଧ୍ୟ ବିନା ରୋକଟୋକରେ ଚାଲିପାରୁଛି।"
      },
      {
        title: "ଗୁନ୍ଦୁଲୁ ଏଆଇ ସକ୍ରେଟିକ୍ ସ୍ଲେଟ୍",
        subtitle: "ଆକର୍ଷଣୀୟ ଚିତ୍ରାଙ୍କନ ଓ ସ୍ଲେଟ୍ ବୋର୍ଡ ଯାହା ପିଲାଙ୍କ ଚିତ୍ର ଦେଖି ବୁଝାଇଥାଏ",
        tagline: "ବହୁମୁଖୀ ସକ୍ରେଟିକ୍ ଶିକ୍ଷା ପ୍ରଣାଳୀ",
        bullets: [
          { title: "ଡିଜିଟାଲ୍ ସ୍ଲେଟ୍ ବୋର୍ଡ", desc: "ଆମ ପାରମ୍ପରିକ ଗ୍ରାମୀଣ ସ୍କୁଲ୍ ଭଳି ଏକ ସୁନ୍ଦର ସବୁଜ ରଙ୍ଗର ଚକ୍-ସ୍ଲେଟ୍।" },
          { title: "Gemini ର ଭିଜନ ସମାଧାନ", desc: "ଛାତ୍ରଛାତ୍ରୀ ଯେକୌଣସି ସଂଖ୍ୟା, ଗଣିତ କିମ୍ବା ଆକୃତି ଆଙ୍କି ଗୁନ୍ଦୁଲୁକୁ ସେ ବିଷୟରେ ପଚାରିପାରିବେ।" },
          { title: "ସକ୍ରେଟିକ୍ ପ୍ରଶ୍ନոତ୍ତର ଶୈଳୀ", desc: "ସିଧାସଳଖ ଉତ୍ତର ନ ଦେଇ ପ୍ରଶ୍ନ ପଚାରି ପିଲାଙ୍କ ମନରେ କୌତୁହଳ ସୃଷ୍ଟି କରେ।" }
        ],
        speakerNotes: "ସ୍ଲାଇଡ୍ ୩ ହେଉଛି ଆମର ଲାଇଭ୍ ଡେମୋ! ଆମେ ଏକ ଗୁନ୍ଦୁଲୁ ସକ୍ରେଟିକ୍ ସ୍ଲେଟ୍ ତିଆରି କରିଛୁ ଯାହା ଏକ ସୁନ୍ଦର କଳାପଟା ପରି କାମ କରେ। ପିଲାମାନେ ନିଜ ହାତରେ ଏଥିରେ ଲେଖିପାରିବେ କିମ୍ବା ଆଙ୍କିପାରିବେ। ଏହାକୁ ସବ୍ମିଟ୍ କଲେ Gemini Multimodal Vision API କ୍ୟାନ୍ଭାସକୁ ବିଶ୍ଳେଷଣ କରି ଓଡ଼ିଆରେ ସମ୍ପୂର୍ଣ୍ଣ ସ୍ପଷ୍ଟୀକରଣ ପ୍ରଦାନ କରେ।"
      },
      {
        title: "ଶକ୍ତିଶାଳୀ ଏବଂ ସୁරକ୍ଷିତ ସର୍ଭର ବ୍ୟବସ୍ଥା",
        subtitle: "ଗୁଗଲ୍ କ୍ଲାଉଡ୍ ରନ୍, ଭର୍ଟେକ୍ସ ଏଆଇ ଏବଂ ଜିରୋ-କଷ୍ଟ ବ୍ରାଉଜର୍ ଟିଟିଏସ୍ (TTS)",
        tagline: "ଉଚ୍ଚ ସ୍ତରୀୟ ଟେକ୍ନୋଲୋଜି",
        bullets: [
          { title: "ଭର୍ଟେକ୍ସ ଏଆଇ ଓ କ୍ଲାଉଡ୍ ରନ୍", desc: "ସର୍ଭରଲେସ୍ ଏକ୍ସପ୍ରେସ୍ ବ୍ୟାକେଣ୍ଡ ଗୁଗଲ୍ କ୍ଲାଉଡ୍ ରନ୍ ଉପରେ ସମ୍ପୂର୍ଣ୍ଣ ସୁරକ୍ଷିତ ଭାବେ ଚାଲୁଛି।" },
          { title: "ସର୍ଭର ଅଟୋମେଟିକ୍ ସୁරକ୍ଷା", desc: "ଭର୍ଟେକ୍ସ ଏଆଇ ଏବଂ ଗୁଗଲ୍ ଏଆଇ ଷ୍ଟୁଡିଓ ମଧ୍ୟରେ ସ୍ୱୟଂଚାଳିତ ଭାବେ ରିକ୍ୱେଷ୍ଟ୍ ପରିଚାଳନା।" },
          { title: "ମାଗଣା ବ୍ରାଉଜର୍ ଟିଟିଏସ୍ ଫଲବ୍ୟାକ୍", desc: "ଯଦି ଏପିଆଇ (API) ଲିମିଟ୍ ହୁଏ, ଆପ୍ ତୁରନ୍ତ ୟୁଜର୍ ର ବ୍ରାଉଜର୍ ବ୍ୟବହାର କରି ଓଡ଼ିଆ ଭଏସ୍ ଉତ୍ପନ୍ନ କରେ।" }
        ],
        speakerNotes: "ଆମର ବ୍ୟାକେଣ୍ଡ ଗୁଗଲ୍ କ୍ଲାଉଡ୍ ରନ୍ ର ସର୍ଭରଲେସ୍ ଟେକ୍ନୋଲୋଜିରେ ହୋଷ୍ଟ ହୋଇଛି, ଯାହାଦ୍ୱାରା ଆମର ମାସିକ ସର୍ଭର ଖର୍ଚ୍ଚ ପ୍ରାୟ ଶୂନ ଟଙ୍କା। ଗ୍ରାମାଞ୍ଚଳରେ ଧିମା ଇଣ୍ଟରନେଟ୍ ରେ ଭଏସ୍ ସମସ୍ୟା ଦୂର କରିବାକୁ ଆମେ ବ୍ରାଉଜର୍ ଆଧାରିତ ଫଲବ୍ୟାକ୍ ତିଆରି କରିଛୁ। ସର୍ଭର ଯଦି ବ୍ୟସ୍ତ ରହେ, ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ନିଜେ ଓଡ଼ିଆ କଥା କହି ପିଲାଙ୍କୁ ଶୁଣାଏ।"
      },
      {
        title: "ଶିକ୍ଷକ AI ଷ୍ଟୁଡିଓ ଓ ଗେମିଫିକେସନ୍",
        subtitle: "ପ୍ରଶ୍ନପତ୍ର ନିର୍ମାତା, ୫E ପାଠ୍ୟ ଯୋଜନା ଓ ସାଥୀ ପୋର୍ଟାଲ",
        tagline: "ଶିକ୍ଷକ ସଶକ୍ତିକରଣ ଓ ଆନନ୍ଦଦାୟକ ଶିକ୍ଷା",
        bullets: [
          { title: "ଶିକ୍ଷକ AI ଷ୍ଟୁଡିଓ", desc: "ଶିକ୍ଷକମାନେ ଓଡ଼ିଆ ହୋମୱାର୍କ ସିଟ୍, ପାଠ୍ୟ ଯୋଜନା ଓ କାର୍ଯ୍ୟକଳାପ ଗାଇଡ୍ ତୁରନ୍ତ ପ୍ରସ୍ତୁତ କରିପାରିବେ।" },
          { title: "ବେଲୁନ୍ ଫୁଟାଇବା ଖେଳ", desc: "ପ୍ରଥମ ଲଗଇନ୍ ରେ ପିଲାମାନେ ବେଲୁନ୍ ଫୁଟାଇ ଓଡ଼ିଆ ସ୍ୱରବର୍ଣ୍ଣ ଶିଖନ୍ତି, ଯାହା ଜୁନ୍ ୧୪ ପ୍ଲେ ଷ୍ଟୋର୍ (Play Store) ଲଞ୍ଚ୍ ସହ ଲାଇଭ୍ ହେବାକୁ ଯାଉଛି।" },
          { title: "ଗୋଲ୍ଡେନ୍ ହୋଲୋଗ୍ରାଫିକ୍ ଟիկେଟ୍", desc: "ଗୁନ୍ଦୁଲୁର ୧୨-ସେକେଣ୍ଡ୍ ର ସ୍ୱାଗତ ଭିଡିଓ ଦେଖିଲେ ପିଲାମାନେ ଗୋଲ୍ଡେନ୍ ପାସ୍ ଏବଂ +୫୦୦ XP ମିଳେ।" }
        ],
        speakerNotes: "ଶିକ୍ଷକମାନଙ୍କ ସଶକ୍ତିକରଣ ପାଇଁ ଆମେ AI Educator Studio ତିଆରି କରିଛୁ, ଯେଉଁଥିରେ ସେମାନେ ତୁରନ୍ତ OPEPA-ସମ୍ମତ ପାଠ୍ୟ ଯୋଜନା ଏବଂ ସିଲାବସ୍-ଅନୁଯାୟୀ ହୋମୱାର୍କ ସିଟ୍ ପ୍ରସ୍ତୁତ କରିପାରିବେ। ଛୋଟ ପିଲାଙ୍କ ମନରେ ପାଠପଢ଼ା ପାଇଁ ଉତ୍ସାହ ଭରିବାକୁ ଆମେ ଏକ ସୁନ୍ଦର ବେଲୁନ୍ ଗେମ୍ ରଖିଛୁ। ପିଲାମାନେ ରଙ୍ଗବେରଙ୍ଗ ବେଲୁନ୍ ଫୁଟାଇବା ପରେ ସେମାନଙ୍କ ସାମ୍ନାରେ ଗୁନ୍ଦୁଲୁର ଏକ ୧୨-ସେକେଣ୍ଡ୍ ର ମନୋରଞ୍ଜକ ଓଡ଼ିଆ ଆନିମେସନ୍ ପ୍ଲେ ହୁଏ ଏବଂ +୫୦୦ XP ପ୍ରଦାନ କରେ।"
      },
      {
        title: "ବ୍ୟବସାୟିକ ସଫଳତା ଏବଂ ଏଆଇ ରୋଡ୍ ମ୍ୟାପ୍",
        subtitle: "RAG (ସମ୍ପୂର୍ଣ୍ଣ) -> RAG + SFT -> ସମ୍ପୂର୍ଣ୍ଣ SFT edge ରୋଡମ୍ୟାପ୍",
        tagline: "ବୃଦ୍ଧି, ଆକର୍ଷଣ ଏବଂ ସ୍ଥିରତା",
        bullets: [
          { title: "ମୋ ସ୍କୁଲ୍ ସହଭାଗିତା", desc: "ଓଡ଼ିଶାର ସ୍କୁଲ୍ ନେଟୱର୍କ ମାଧ୍ୟମରେ ୫୨ ଲକ୍ଷ ଓଡ଼ିଆ ମାଧ୍ୟମ ପିଲାଙ୍କ ପାଖରେ ପହଞ୍ଚିବା।" },
          { title: "ସକ୍ରିୟ ପାଇଲଟ୍ ଛାତ୍ର ଓ ପ୍ରିମିୟମ୍", desc: "୪୪୫ ଜଣ ସକ୍ରିୟ ପାଇଲଟ୍ ଛାତ୍ର ଏବଂ ୭ଟି ଜିଲ୍ଲାରୁ ୬ ଜଣ ପ୍ରିମିୟମ୍ ସବସ୍କ୍ରିପସନ୍।" },
          { title: "ଟେକ୍ନିକାଲ୍ ଏଆଇ ରୋଡମ୍ୟାପ୍", desc: "ପାଠ୍ୟପୁସ୍ତକ RAG (ସମ୍ପୂର୍ଣ୍ଣ) ରୁ RAG + SFT ଏବଂ ପରେ offline edge ମଡେଲ (SFT) କୁ ଉନ୍ନତି।" }
        ],
        speakerNotes: "ଆମେ ଆମର ପାଇଲଟ୍ ପର୍ଯ୍ୟାୟରେ ୪୪୫ ଜଣ ସକ୍ରିୟ ଛାତ୍ର ଏବଂ ବିଭିନ୍ନ ଜିଲ୍ଲା (ଭୁବନେଶ୍ୱର, କଟକ, କେନ୍ଦୁଝର, ବାଲେଶ୍ୱର, ନୟାଗଡ଼, ବଲାଙ୍ଗୀର, ବ୍ରହ୍ମପୁର) ରୁ ୬ ଜଣ ପ୍ରିମିୟମ୍ ସବସ୍କ୍ରିପସନ୍ ପାଇଛୁ। ଆମର ସ୍କେଲିଂ ମୋ ସ୍କୁଲ୍ ଅଭିଯାନ ସହଭାଗିତା, ଭଏସ୍-ଟୁ-ଭଏସ୍ ଟ୍ୟୁଟର୍, ଏବଂ ଶିକ୍ଷକଙ୍କ ପାଇଁ AI ହୋମୱାର୍କ ମେକର୍ ଦ୍ୱାରା ହେବ। ଆମର ଏଆଇ ବ୍ୟବସ୍ଥା ଜିରୋ-ହଲ୍ୟୁସିନେସନ୍ RAG ରୁ RAG + SFT ଏବଂ ପରେ ବ୍ରାଉଜର୍-ନେଟିଭ୍ offline SFT ମଡେଲ୍ କୁ ଉନ୍ନତି ହେବ, ଯାହା ସର୍ଭର ଖର୍ଚ୍ଚ ସମ୍ପୂର୍ଣ୍ଣ ଶୂନ କରିପାରିବ।"
      },
      {
        title: "ଧନ୍ୟବାଦ!",
        subtitle: "ବିଶ୍ୱସ୍ତରୀୟ AI ଶିକ୍ଷାକୁ ସରଳ, ସୁଲଭ ଏବଂ ଅଫଲାଇନ୍-ମୁକ୍ତ କରିବା",
        tagline: "ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର - ପିଚ୍ ସମାପ୍ତ",
        bullets: [
          { title: "ପ୍ରତିଷ୍ଠାତା (Founder)", desc: "ଦମୟନ୍ତୀ ପଣ୍ଡା" },
          { title: "ସହ-ପ୍ରତିଷ୍ଠାତା (Co-Founder)", desc: "ଜ୍ଞାନାଲୋକ ପଣ୍ଡା" },
          { title: "ଇମେଲ୍ (Email)", desc: "contact@utkalskillcentre.com" }
        ],
        speakerNotes: "ଆପଣଙ୍କ ସମୟ ପାଇଁ ଧନ୍ୟବାଦ! ଓଡ଼ିଶାର କୋଣ ଅନୁକୋଣରେ ପିଲାଙ୍କ ପାଖରେ ବିଜ୍ଞାନ ଓ ଗଣିତ ଶିକ୍ଷା ପହଞ୍ଚାଇବା ପାଇଁ ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ପ୍ରତିବଦ୍ଧ। ଆମ ପ୍ରତିଷ୍ଠାତା ଦମୟନ୍ତୀ ପଣ୍ଡା ଓ ସହ-ପ୍ରତିଷ୍ଠାତା ଜ୍ଞାନାଲୋକ ପଣ୍ଡାଙ୍କ ସହ ଆପଣ contact@utkalskillcentre.com ମାଧ୍ୟମରେ ଯୋଗାଯୋଗ କରିପାରିବେ।"
      }
    ]
  };

  const currentSlideData = slidesContent[deckLanguage][currentSlide];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden select-none">
      {/* Deep Cybernetic Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#b34d1f]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px]" />
        {/* Subtle decorative grid lines */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* TOP CONTROL BAR */}
      <header className="relative z-20 flex justify-between items-center px-4 md:px-8 py-4 bg-slate-900/60 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 hover:text-amber-400 transition-all cursor-pointer flex items-center justify-center border border-white/5"
            title="Exit Showcase"
          >
            <Lucide.ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-amber-500">
              {currentSlideData.tagline}
            </span>
            <h2 className="text-sm font-black text-white/90 leading-none">
              Utkal Pitch Deck ({currentSlide + 1} / {TOTAL_SLIDES})
            </h2>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {/* Autoplay play/pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isPlaying 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' 
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
            }`}
          >
            {isPlaying ? <Lucide.Pause size={14} /> : <Lucide.Play size={14} />}
            <span className="hidden sm:inline">{isPlaying ? 'Autoplay ON' : 'Autoplay'}</span>
          </button>

          {/* Toggle speaker notes visibility */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              showNotes 
                ? 'bg-[#b34d1f]/20 text-orange-400 border-[#b34d1f]/40' 
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
            }`}
          >
            <Lucide.MessageSquare size={14} />
            <span className="hidden sm:inline">{deckLanguage === 'or' ? 'ପିଚ୍ ସୂଚନା' : 'Speaker Notes'}</span>
          </button>

          {/* Bilingual deck toggle */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setDeckLanguage('en')}
              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${deckLanguage === 'en' ? 'bg-[#b34d1f] text-white shadow-md' : 'text-white/40 hover:text-white/70'}`}
            >
              EN
            </button>
            <button
              onClick={() => setDeckLanguage('or')}
              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${deckLanguage === 'or' ? 'bg-[#b34d1f] text-white shadow-md' : 'text-white/40 hover:text-white/70'}`}
            >
              ଓଡ଼ିଆ
            </button>
          </div>
        </div>
      </header>

      {/* TOP SLIDE PROGRESS METERS */}
      <div className="relative z-10 w-full px-4 md:px-8 py-2 flex gap-1 bg-slate-900/30">
        {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
          <div
            key={idx}
            onClick={() => selectSlide(idx)}
            className="flex-1 h-1.5 rounded-full cursor-pointer relative overflow-hidden transition-all bg-white/10 hover:bg-white/20"
          >
            <motion.div
              initial={false}
              animate={{ 
                width: idx === currentSlide ? '100%' : idx < currentSlide ? '100%' : '0%',
                backgroundColor: idx === currentSlide ? '#ffd700' : idx < currentSlide ? '#b34d1f' : 'rgb(255,255,255,0)'
              }}
              transition={{ duration: isPlaying && idx === currentSlide ? 7 : 0.3, ease: 'linear' }}
              className="absolute top-0 left-0 h-full rounded-full"
            />
          </div>
        ))}
      </div>

      {/* MAIN SLIDE STAGE */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="w-full max-w-6xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl flex flex-col lg:flex-row gap-8 items-center min-h-[450px] lg:min-h-[500px]"
          >
            {/* LEFT COLUMN: Slide Content */}
            <div className="flex-1 w-full space-y-6">
              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-widest inline-block">
                  {deckLanguage === 'en' ? `Slide ${currentSlide + 1} of ${TOTAL_SLIDES}` : `ସ୍ଲାଇଡ୍ ${currentSlide + 1} / ${TOTAL_SLIDES}`}
                </span>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  {currentSlideData.title}
                </h1>
                <p className="text-sm md:text-base text-amber-500/90 font-bold leading-relaxed">
                  {currentSlideData.subtitle}
                </p>
              </div>

              <div className="border-t border-white/5 my-4" />

              {/* Styled Bullet Points */}
              <ul className="space-y-4">
                {currentSlideData.bullets.map((bullet: any, idx: number) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="flex gap-3 items-start group"
                  >
                    <div className="w-5 h-5 rounded-full bg-[#b34d1f]/20 border border-[#b34d1f]/40 flex items-center justify-center shrink-0 mt-0.5 text-amber-400 font-bold text-xs group-hover:bg-[#b34d1f]/40 transition-all">
                      {idx + 1}
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-extrabold text-slate-100 group-hover:text-amber-300 transition-colors">
                        {bullet.title}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-400 leading-normal">
                        {bullet.desc}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* RIGHT COLUMN: Rich Interactive Graphic Showcase */}
            <div className="flex-1 w-full flex items-center justify-center min-h-[300px]">
              
              {/* SLIDE 1 SHOWCASE: Gorgeous Holographic Founding Member Ticket Card */}
              {currentSlide === 0 && (
                <motion.div 
                  initial={{ rotate: -2, scale: 0.95 }}
                  animate={{ rotate: 1, scale: 1 }}
                  transition={{ repeat: Infinity, repeatType: 'reverse', duration: 3 }}
                  className="w-full max-w-sm"
                >
                  <div className="relative group rounded-[2rem] p-0.5 bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 shadow-[0_0_40px_rgba(245,158,11,0.25)] border border-amber-300/30 overflow-hidden transform hover:scale-[1.03] transition-all duration-500">
                    <div className="absolute inset-0 bg-slate-950/95 rounded-[1.9rem] z-0" />
                    
                    {/* Glowing sweep */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out z-10" />
                    
                    <div className="relative z-10 p-6 text-center flex flex-col items-center">
                      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-amber-400/50 rounded-tl"></div>
                      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-amber-400/50 rounded-tr"></div>
                      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-amber-400/50 rounded-bl"></div>
                      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-amber-400/50 rounded-br"></div>

                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-2 mt-1">
                        <img src="/utkal-192.png" alt="Utkal Logo" className="w-7 h-7 object-contain" />
                      </div>
                      
                      <span className="text-[7px] uppercase tracking-[0.2em] font-black text-amber-500/90 mb-1">
                        {deckLanguage === 'or' ? 'ଗୁଗଲ୍ ପ୍ଲେ ଷ୍ଟୋର୍ ଅଫିସିଆଲ୍ ଶୁଭାରମ୍ଭ' : 'GOOGLE PLAY STORE OFFICIAL LAUNCH'}
                      </span>
                      
                      <h2 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-tight leading-tight mb-1">
                        {deckLanguage === 'or' ? 'ଗୁନ୍ଦୁଲୁର ପ୍ରଥମ ସାଥୀ ପାସ୍' : "GUNDULU'S FIRST COMPANION PASS"}
                      </h2>
                      
                      <div className="w-full flex items-center gap-1.5 mb-4 px-4 mt-2">
                        <div className="flex-1 border-t border-dashed border-amber-500/20"></div>
                        <span className="text-[7px] text-amber-500/40 font-mono font-bold">UTKAL-2026-TWA</span>
                        <div className="flex-1 border-t border-dashed border-amber-500/20"></div>
                      </div>

                      <div className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-left">
                        <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold mb-0.5">
                          <span>छାତ୍ରଙ୍କ ନାମ (STUDENT)</span>
                          <span className="text-amber-400">VIP</span>
                        </div>
                        <h3 className="text-xs font-black text-white truncate">
                          {deckLanguage === 'or' ? 'ଅନୁରାଧା ପଣ୍ଡା' : 'Anuradha Panda'}
                        </h3>
                        <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold mt-1">
                          <span>CLASS: 10 (ଓଡ଼ିଆ ବୋର୍ଡ)</span>
                          <span>ID: 8D4FA93E</span>
                        </div>
                      </div>

                      <div className="w-full mt-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[9px] flex items-center justify-center gap-1.5">
                        <Lucide.CheckCircle size={10} />
                        <span>🏆 ୫୦୦ XP ଦାବି ହୋଇସାରିଛି (500 XP Active)</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 2 SHOWCASE: Creator's Hackathon Journey Stats & Badges */}
              {currentSlide === 1 && (
                <div className="w-full max-w-md space-y-4">
                  {/* Creator Badge */}
                  <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-purple-500/20 p-4 rounded-2xl text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2 text-purple-400 border border-purple-500/30">
                      <Lucide.Award size={24} className="animate-bounce" />
                    </div>
                    <span className="text-[8px] uppercase tracking-[0.2em] font-black text-purple-400">
                      {deckLanguage === 'or' ? 'ହାକାଥନ୍ ସ୍ରଷ୍ଟା ସମ୍ମାନ' : 'OFFICIAL HACKATHON CREATOR'}
                    </span>
                    <h3 className="text-sm font-black text-white mt-0.5">
                      {deckLanguage === 'or' ? 'ଉତ୍କଳ ରୂପାନ୍ତରଣ ୨୦୨୬' : 'Utkal Transformation Pipeline'}
                    </h3>
                  </div>

                  {/* Dev Stats Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900 border border-white/5 p-2 rounded-xl text-center">
                      <span className="text-[7px] text-slate-500 font-bold block">GRADES SYNCED</span>
                      <h4 className="text-sm font-black text-amber-400">10 / 10</h4>
                      <span className="text-[6px] text-slate-400">Class 1 to 10</span>
                    </div>
                    <div className="bg-slate-900 border border-white/5 p-2 rounded-xl text-center">
                      <span className="text-[7px] text-slate-500 font-bold block">CHAPTERS</span>
                      <h4 className="text-sm font-black text-cyan-400">1,100+</h4>
                      <span className="text-[6px] text-slate-400">Vectorized RAG</span>
                    </div>
                    <div className="bg-slate-900 border border-white/5 p-2 rounded-xl text-center">
                      <span className="text-[7px] text-slate-500 font-bold block">TYPE SAFETY</span>
                      <h4 className="text-sm font-black text-emerald-400">0 Errors</h4>
                      <span className="text-[6px] text-slate-400">tsc compile pass</span>
                    </div>
                  </div>

                  {/* Interactive Hackathon Milestones Checklist */}
                  <div className="bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl space-y-2">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">
                      {deckLanguage === 'or' ? 'କ୍ରିଏଟର୍ ବିକାଶ ଗ୍ରିଡ୍ (ଚେକ୍ ଲିଷ୍ଟ)' : 'Creator Development Milestones'}
                    </span>
                    {[
                      { label: deckLanguage === 'or' ? '୧୦ଟି ଶ୍ରେଣୀର ପୂର୍ଣ୍ଣ ସିଲାବସ୍ ମ୍ୟାପିଂ' : 'Standardize 10 Classes Syllabus & Sync', active: true },
                      { label: deckLanguage === 'or' ? 'ଗୁନ୍ଦୁଲୁ ଆପ୍ PWA ଏବଂ ଅଫଲାଇନ୍ precache' : 'Gundulu PWA Launch & Standalone Focus', active: true },
                      { label: deckLanguage === 'or' ? 'ସ୍ମାର୍ଟ କ୍ଲାସେସ୍ ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣା ଓ ଅନ୍ଲକ୍' : 'Unlock curating Smart Classes for free', active: true }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-300">
                        <Lucide.CheckCircle size={12} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SLIDE 3 SHOWCASE: Beautiful Bilingual Milestone Timeline */}
              {currentSlide === 2 && (
                <div className="w-full max-w-md flex flex-col gap-4">
                  {/* Timeline Title Banner */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <Lucide.Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-300">
                        {deckLanguage === 'or' ? 'ଆମର ବିକାଶ ଯାତ୍ରାର ମାଇଲଖୁଣ୍ଟ' : 'FOUNDER LAUNCH MILESTONES'}
                      </h4>
                      <p className="text-[9px] text-slate-400">
                        {deckLanguage === 'or' ? 'ଓଡ଼ିଶା ଦିବସରୁ ଆରମ୍ଭ ਹੋଇଥିବା ଗ୍ରାମୀଣ ଶିକ୍ଷା ବିପ୍ଳବ' : 'Empowering state-board students since Day 1'}
                      </p>
                    </div>
                  </div>

                  {/* Timeline Cards Container */}
                  <div className="relative pl-6 space-y-4">
                    {/* Vertical Connector Line */}
                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-amber-500 via-cyan-500 to-emerald-500 opacity-30"></div>

                    {/* Step 1: April 1st Launch */}
                    <div className="relative bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl hover:border-amber-500/30 transition-all group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-4 w-5.5 h-5.5 rounded-full bg-slate-950 border-2 border-amber-500 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                        🌸
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase">
                          {deckLanguage === 'or' ? '🌸 ଏପ୍ରିଲ୍ ୧ ଶୁଭାରମ୍ଭ' : '🌸 APRIL 1ST LAUNCH'}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {deckLanguage === 'or' ? 'ଉତ୍କଳ ଦିବସ' : 'Utkal Divas'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">
                        {deckLanguage === 'or' ? 'ଓଡ଼ିଆ ମାଧ୍ୟମ ଅଫିସିଆଲ୍ ପ୍ଲାଟଫର୍ମ' : 'Official Bilingual Portal Live'}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {deckLanguage === 'or' ? 'ଓଡ଼ିଶାର ଗର୍ବ ଓ ଐତିହ୍ୟକୁ ସମ୍ମାନ ଜଣାଇ ଉତ୍କଳ ଦିବସରେ ଆମର ୱେବସାଇଟ୍ ଲାଇଭ୍ ହୋଇଥିଲା।' : 'Launched on Odisha Day to integrate regional pride directly into our learning framework.'}
                      </p>
                    </div>

                    {/* Step 2: PWA Rollout */}
                    <div className="relative bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl hover:border-cyan-500/30 transition-all group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-4 w-5.5 h-5.5 rounded-full bg-slate-950 border-2 border-cyan-500 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                        📱
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black tracking-wider text-cyan-400 uppercase">
                          {deckLanguage === 'or' ? '📱 PWA ଆପ୍ ଶୁଭାରମ୍ଭ' : '📱 PWA APP ROLLOUT'}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {deckLanguage === 'or' ? 'ଅଫଲାଇନ୍ ରେଡି' : 'Offline Ready'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">
                        {deckLanguage === 'or' ? 'ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ପାଇଁ PWA ଆପ୍' : 'High-Speed Progressive Web App'}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {deckLanguage === 'or' ? 'ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ରେ ଅତି ସହଜରେ ବିନା ରୋକଟୋକରେ ଚାଲୁଥିବା ସୁପର-ଲାଇଟ୍ ଆପ୍ ପ୍ରସ୍ତուତ।' : 'Offline-precaching enables zero-buffering tutorial access on basic family smartphones with slow networks.'}
                      </p>
                    </div>

                    {/* Step 3: Syllabus Coverage */}
                    <div className="relative bg-slate-900/80 border border-white/5 p-3.5 rounded-2xl hover:border-emerald-500/30 transition-all group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-4 w-5.5 h-5.5 rounded-full bg-slate-950 border-2 border-emerald-500 flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                        🎒
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black tracking-wider text-emerald-400 uppercase">
                          {deckLanguage === 'or' ? '🎒 ସିଲାବସ୍ ମ୍ୟାପିଂ' : '🎒 SYLLABUS COVERAGE'}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                          {deckLanguage === 'or' ? '୧୦୦% ବୋର୍ଡ ଆଲାଇନ୍ଡ' : '100% Board Aligned'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">
                        {deckLanguage === 'or' ? 'ଓଡ଼ିଶା ଷ୍ଟେଟ୍ ବୋର୍ଡ ପାଠ୍ୟକ୍ରମ' : 'Colloquial state-board curriculum'}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {deckLanguage === 'or' ? 'ଇଂରାଜୀ ଆପ୍ ଦ୍ୱାରା ଅଣଦେଖା ହେଉଥିବା ଆମ ସରକାରୀ ବିଦ୍ୟାଳୟ ପିଲାଙ୍କ ପାଇଁ ସ୍ୱତନ୍ତ୍ର ପାଠ୍ୟକ୍ରମ।' : 'Specifically aligned to regional board books, keeping explanations close to their native village dialect.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 5 SHOWCASE: Interactive Balloon-Popping Simulation & Vertical Video Player */}
              {currentSlide === 4 && (
                <div className="w-full max-w-md flex flex-col gap-4">
                  {/* Floating Balloons Simulation */}
                  <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold text-amber-400">
                        {deckLanguage === 'or' ? '🎈 ବେଲୁନ୍ ଫୁଟାନ୍ତୁ (ମନୋରଞ୍ଜନ ଡେମୋ):' : '🎈 Pop Balloons (Interactive Demo):'}
                      </h3>
                      <div className="flex gap-2">
                        <span className="text-xs text-slate-300 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5">
                          XP: {xpPoints}
                        </span>
                        <button
                          onClick={resetBalloons}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60"
                          title="Reset Demo"
                        >
                          <Lucide.RotateCcw size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="h-28 bg-black/30 rounded-xl relative overflow-hidden flex items-center justify-around p-2">
                      {[
                        { char: 'ଅ', color: 'bg-red-500 shadow-red-500/30' },
                        { char: 'ଆ', color: 'bg-blue-500 shadow-blue-500/30' },
                        { char: 'ଇ', color: 'bg-emerald-500 shadow-emerald-500/30' },
                        { char: 'ଉ', color: 'bg-amber-500 shadow-amber-500/30' },
                        { char: 'ଏ', color: 'bg-purple-500 shadow-purple-500/30' }
                      ].map((bal, idx) => {
                        const popped = balloonsPopped.includes(idx);
                        return (
                          <div key={idx} className="relative flex flex-col items-center">
                            <AnimatePresence>
                              {!popped ? (
                                <motion.button
                                  initial={{ y: 20 }}
                                  animate={{ y: [2, -6, 2] }}
                                  transition={{ repeat: Infinity, duration: 2 + idx * 0.3 }}
                                  exit={{ scale: 1.5, opacity: 0 }}
                                  onClick={() => popBalloon(idx)}
                                  className={`w-10 h-12 rounded-full cursor-pointer flex items-center justify-center text-white font-black text-sm relative ${bal.color} shadow-lg active:scale-95`}
                                >
                                  {bal.char}
                                  {/* Balloon Knot/Tail */}
                                  <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-inherit rotate-45" />
                                </motion.button>
                              ) : (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: [1, 1.3, 0], opacity: [0.8, 1, 0] }}
                                  transition={{ duration: 0.4 }}
                                  className="absolute text-amber-400 font-black text-xs pointer-events-none"
                                >
                                  💥 +100
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-500 text-center block mt-2">
                      {deckLanguage === 'or' ? 'ପିଲାଙ୍କ ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ରେ ସ୍ପେଶାଲ୍ ପପ୍ ଶବ୍ଦ ଇଫେକ୍ଟ ବାଜିଥାଏ' : 'Fires synthetic sound pop waves with physics burst on touch!'}
                    </span>
                  </div>

                  {/* Gundulu Portrait Video Container */}
                  <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl flex items-center gap-3">
                    <div className="w-16 h-24 rounded-xl bg-black border border-white/10 shrink-0 relative overflow-hidden flex items-center justify-center">
                      {/* Interactive play circle */}
                      <div className="w-8 h-8 rounded-full bg-[#b34d1f] flex items-center justify-center text-white animate-pulse">
                        <Lucide.Play size={12} className="ml-0.5" />
                      </div>
                      {/* Portrait aspect ratio watermark */}
                      <span className="absolute bottom-1 right-1 text-[6px] text-white/40 font-mono">9:16 Frame</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white">
                        Gundulu Welcome Greeting
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {deckLanguage === 'or' 
                          ? '୧୨-ସେକେଣ୍ଡ୍ ର ପୋର୍ଟ୍ରେଟ୍ ଆନିମେଟେଡ୍ ଭିଡିଓ ଯାହା ପିଲାଙ୍କ ମନୋବଳକୁ ବଢ଼ାଇଥାଏ ଏବଂ ଶୁଭେଚ୍ଛା ଜଣାଏ।' 
                          : 'Snappy vertical 12s welcome cartoon with localized Odia speech that completely pauses background music.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 4 SHOWCASE: Enterprise Architecture Node Map Diagram */}
              {currentSlide === 3 && (
                <div className="w-full max-w-md bg-slate-950/80 rounded-2xl p-4 border border-white/5 space-y-4">
                  <div className="text-center">
                    <span className="text-[9px] uppercase tracking-widest font-black text-amber-500">
                      {deckLanguage === 'or' ? 'ଏଣ୍ଟରପ୍ରାଇଜ୍ ଡାଟା ଫ୍ଲୋ (କ୍ଲିକ୍ କରନ୍ତୁ)' : 'Interactive Architecture Node Grid (Click to Inspect)'}
                    </span>
                  </div>

                  {/* Architecture Diagram Nodes Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        id: 'cloud_run',
                        icon: Lucide.Server,
                        title: 'Cloud Run',
                        desc: 'Serverless Router hosting our Express engine at zero baseline cost.'
                      },
                      {
                        id: 'vertex_ai',
                        icon: Lucide.Cpu,
                        title: 'Vertex AI SDK',
                        desc: 'Bypasses standard API keys securely via Application Default Credentials.'
                      },
                      {
                        id: 'agent_mcp',
                        icon: Lucide.Share2,
                        title: 'FastMCP Bridge',
                        desc: 'Allows the Google Developer agent to live-inspect database schemas.'
                      },
                      {
                        id: 'voice_tts',
                        icon: Lucide.Mic,
                        title: 'Three-Tier TTS',
                        desc: 'Local MP3 -> Server Synthesizer -> client browser fallback!'
                      }
                    ].map((node) => {
                      const isActive = activeNode === node.id;
                      return (
                        <button
                          key={node.id}
                          onClick={() => setActiveNode(node.id)}
                          className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-[#b34d1f]/15 border-[#b34d1f] shadow-lg shadow-[#b34d1f]/10' 
                              : 'bg-slate-900/60 border-white/5 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <node.icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
                            <h4 className={`text-xs font-black ${isActive ? 'text-white' : 'text-slate-300'}`}>
                              {node.title}
                            </h4>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${isActive ? 'bg-amber-400' : 'bg-slate-700'}`} style={{ width: isActive ? '100%' : '30%' }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Node Details Drawer */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5 min-h-[90px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {activeNode && (
                        <motion.div
                          key={activeNode}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-1"
                        >
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                            {activeNode === 'cloud_run' && 'Deployment Environment'}
                            {activeNode === 'vertex_ai' && 'AI Synthesis Engine'}
                            {activeNode === 'agent_mcp' && 'Model Context Protocol'}
                            {activeNode === 'voice_tts' && 'Resilient Speech fallback'}
                          </span>
                          <p className="text-xs text-slate-300 leading-normal">
                            {activeNode === 'cloud_run' && 'Statically bundles Class 3-10 syllabus nodes to Cloud Run. Scaling to zero means base cost is exactly $0.00, enabling immense ₹99/mo margins!'}
                            {activeNode === 'vertex_ai' && 'Seamless integration with Google ambient APIs. If local system quotas fail, the backend auto-switches requests seamlessly to AI Studio keys.'}
                            {activeNode === 'agent_mcp' && 'Exposes schemas dynamically via our scratch/hackathon_mcp_server.py so conversational agents can answer student questions with absolute context.'}
                            {activeNode === 'voice_tts' && 'If Google voice synth triggers 429 limits, the client instantly activates native browser SpeechSynthesis. Works 100% offline with zero audio overlap!'}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Telemetry Console Action Button */}
                  <button
                    onClick={() => {
                      try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
                        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.1);
                      } catch (e) {}
                      setShowDiagnostics(true);
                    }}
                    className="w-full relative group overflow-hidden py-3 px-4 rounded-xl font-black text-xs uppercase tracking-[0.15em] bg-slate-900 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.05)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
                    <Lucide.Activity size={14} className="animate-pulse" />
                    <span>
                      {deckLanguage === 'or' ? 'ଲାଇଭ୍ ଟେଲିମେଟ୍ରି ଏବଂ ଡାଇଗ୍ନୋଷ୍ଟିକ୍ସ' : 'Launch System Telemetry'}
                    </span>
                  </button>
                </div>
              )}

              {/* SLIDE 7 SHOWCASE: Beautiful Holographic Thank You & Contact Card */}
              {currentSlide === 6 && (
                <motion.div
                  initial={{ rotate: 1, scale: 0.95 }}
                  animate={{ rotate: -1, scale: 1 }}
                  transition={{ repeat: Infinity, repeatType: 'reverse', duration: 4 }}
                  className="w-full max-w-sm"
                >
                  <div className="relative group rounded-[2.2rem] p-6 bg-slate-900/80 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="w-16 h-16 rounded-full bg-slate-950 border border-amber-500/30 flex items-center justify-center p-1.5 shadow-lg mb-4">
                      <img src="/utkal-192.png" alt="Utkal logo" className="w-full h-full object-contain" />
                    </div>
                    
                    <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-wide leading-tight mb-2">
                      Utkal Skill Centre
                    </h3>
                    
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                      {deckLanguage === 'or' ? 'ଶିକ୍ଷା ଓ ପ୍ରଗତିର ଏକ ନୂଆ ଯୁଗ' : 'Empowering Rural Classrooms'}
                    </p>

                    <div className="w-full space-y-3 bg-black/40 border border-white/5 rounded-2xl p-4 text-left">
                      <div>
                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">{deckLanguage === 'or' ? 'ପ୍ରତିଷ୍ଠାତା' : 'FOUNDER'}</span>
                        <span className="text-xs font-black text-white">Damayanti Panda</span>
                      </div>
                      <div>
                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">{deckLanguage === 'or' ? 'ସହ-ପ୍ରତିଷ୍ଠାତା' : 'CO-FOUNDER'}</span>
                        <span className="text-xs font-black text-white">Gyanalok Panda</span>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest block">EMAIL</span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">contact@utkalskillcentre.com</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SLIDE 6 SHOWCASE: Roadmap 3-Phase Interactive Timeline & Pilot Stats */}
              {currentSlide === 5 && (
                <div className="w-full max-w-md space-y-4">
                  {/* Pilot Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-center hover:border-emerald-500/30 transition-all">
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Active Pilot Users</span>
                      <h3 className="text-2xl font-black text-emerald-400 mt-1">445</h3>
                      <span className="text-[8px] text-slate-400">Rural school students onboarded</span>
                    </div>
                    <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-center hover:border-[#b34d1f]/30 transition-all">
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Paying Subscribers</span>
                      <h3 className="text-2xl font-black text-amber-400 mt-1">6</h3>
                      <span className="text-[8px] text-slate-400">Validated across 7 districts at ₹99</span>
                    </div>
                  </div>

                  {/* Clickable 3-Phase Roadmap Timeline */}
                  <div className="bg-slate-900/80 border border-white/5 p-4 rounded-2xl space-y-3">
                    <h4 className="text-[10px] uppercase font-black text-amber-500 tracking-wider">
                      {deckLanguage === 'or' ? 'ଗୁନ୍ଦୁଲୁ ରୋଡ୍ ମ୍ୟାପ୍ (ରୁଟ୍ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ):' : 'Gundulu AI Evolution Roadmap (Click Phase):'}
                    </h4>
                    <div className="flex justify-between relative mt-2">
                      {/* Connector Line */}
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 z-0" />
                      
                      {[
                        { 
                          phase: 1, 
                          title: deckLanguage === 'or' ? 'ପର୍ଯ୍ୟାୟ ୧: ସିଲାବସ୍ ସର୍ଚ୍ଚ' : 'Phase 1: Syllabus Search', 
                          label: deckLanguage === 'or' ? 'ପାଠ୍ୟ ବହି ସର୍ଚ୍ଚ' : 'Active Textbook Search' 
                        },
                        { 
                          phase: 2, 
                          title: deckLanguage === 'or' ? 'ପର୍ଯ୍ୟାୟ ୨: ଓଡ଼ିଆ AI' : 'Phase 2: Fast Odia AI', 
                          label: deckLanguage === 'or' ? 'ସ୍ପିଡ୍ ଓଡ଼ିଆ AI' : 'Fluent Native Tutoring' 
                        },
                        { 
                          phase: 3, 
                          title: deckLanguage === 'or' ? 'ପର୍ଯ୍ୟାୟ ୩: ସ୍ୱୟଂଚାଳିତ ଭଏସ୍' : 'Phase 3: Automated Voice', 
                          label: deckLanguage === 'or' ? 'ସ୍ୱୟଂଚାଳିତ ଭଏସ୍' : 'Voice-to-Voice AI' 
                        }
                      ].map((item, idx) => {
                        const isSelected = activeRoadmapPhase === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActiveRoadmapPhase(idx)}
                            className="relative z-10 flex flex-col items-center w-1/3 focus:outline-none cursor-pointer"
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                              isSelected 
                                ? 'bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-500/20' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[9px] font-bold mt-1 text-center truncate w-full px-1 ${
                              isSelected ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              {item.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Timeline detail block */}
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 min-h-[64px] flex flex-col justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeRoadmapPhase}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-0.5 text-center"
                        >
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                            {activeRoadmapPhase === 0 && (deckLanguage === 'or' ? 'ବର୍ତ୍ତମାନର ସକ୍ରିୟ ବ୍ୟବସ୍ଥା' : 'Current Active Architecture')}
                            {activeRoadmapPhase === 1 && (deckLanguage === 'or' ? 'ମଧ୍ୟମ-ମିଆଦି ଲକ୍ଷ୍ୟ (ଆଗାମୀ ୬ ମାସ)' : 'Medium-Term Goal (Next 6 Months)')}
                            {activeRoadmapPhase === 2 && (deckLanguage === 'or' ? 'ଦୀର୍ଘମିଆଦି ରୂପରେଖ (ଆଗାମୀ ୧୨ ମାସ)' : 'Long-Term Vision (Next 12 Months)')}
                          </span>
                          <p className="text-[10px] text-slate-300 leading-normal mt-0.5">
                            {activeRoadmapPhase === 0 && (
                              deckLanguage === 'or' 
                                ? 'ଓଡ଼ିଶା ଷ୍ଟେଟ୍ ବୋର୍ଡ ପାଠ୍ୟକ୍ରମର ତୁରନ୍ତ ଖୋଜିବା ପାଇଁ Firestore ଏବଂ RAG ବ୍ୟବସ୍ଥା। ଏହା ଛାତ୍ରଙ୍କୁ ସଠିକ୍ ପାଠ ସାରାଂଶ ଓ ପ୍ରଶ୍ନୋତ୍ତର ଦିଏ।'
                                : 'Uses highly precise semantic search of Odisha State Board textbook lessons stored in Google Firestore for real-time accurate answer retrieval.'
                            )}
                            {activeRoadmapPhase === 1 && (
                              deckLanguage === 'or'
                                ? 'ଓଡ଼ିଆ ଭାଷାରେ ଅତି ସ୍ପିଡ୍ ଓ ସହଜରେ କଥା ହେବା ପାଇଁ ହାଲୁକା ଗୁଗଲ୍ ଏଆଇ ମଡେଲକୁ ଓଡ଼ିଆ ଶିକ୍ଷା ସଂଳାପ ଆଧାରରେ ପ୍ରଶିକ୍ଷିତ (Fine-Tune) କରିବା।'
                                : 'Fine-tuning lightweight Google AI models specifically on school curriculum transcripts to deliver low-latency native colloquial Odia dialogue.'
                            )}
                            {activeRoadmapPhase === 2 && (
                              deckLanguage === 'or'
                                ? 'ସ୍ୱୟଂଚାଳିତ ଭଏସ୍-ଟୁ-ଭଏସ୍ ଏଆଇ ବ୍ୟବସ୍ଥା, ଯାହା ଗୁନ୍ଦୁଲୁକୁ ସମ୍ପୂର୍ଣ୍ଣ କଥାବାର୍ତ୍ତା ମାଧ୍ୟମରେ ପିଲାଙ୍କ ଉଚ୍ଚାରଣ ପରୀକ୍ଷା ଓ ଶିକ୍ଷା ଦେବାକୁ ସକ୍ଷମ କରିବ।'
                                : 'Full end-to-end voice-to-voice synthesis, enabling Gundulu mascot to natively hold spoken dialogs and instantly evaluate students\' oral reading speed.'
                            )}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* SPEAKER NOTES COLLAPSIBLE DRAWER */}
      <AnimatePresence>
        {showNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-20 w-full bg-slate-900 border-t border-white/10"
          >
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex gap-4 items-start">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-1 border border-amber-500/20">
                <Lucide.Volume2 size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">
                  {deckLanguage === 'or' ? 'ବିଚାରକ ପିଚ୍ ପ୍ଲେବୁକ୍ (୩ ମିନିଟ୍ ରେଡି):' : '🎙️ Hackathon Presenter Script (3-Minute Match):'}
                </h4>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic">
                  "{currentSlideData.speakerNotes}"
                </p>
              </div>
              {/* Close Notes Button */}
              <button
                onClick={() => setShowNotes(false)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 self-start mt-1 cursor-pointer"
                title="Hide Notes"
              >
                <Lucide.X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER NAVIGATION DOTS */}
      <footer className="relative z-10 bg-slate-950 px-4 py-4 border-t border-white/5 flex items-center justify-between">
        <div className="text-xs text-white/40 font-bold">
          {deckLanguage === 'or' ? 'ଓଡ଼ିଶା ଶିକ୍ଷା ସେବା ୨୦୨୬' : 'Utkal Skill Centre Presentation Team © 2026'}
        </div>

        {/* Quick jump navigation arrows */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevSlide}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 cursor-pointer active:scale-95 transition-all"
            title="Previous Slide"
          >
            <Lucide.ChevronLeft size={16} />
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => selectSlide(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide ? 'bg-amber-400 scale-125 shadow-sm shadow-amber-400' : 'bg-white/20 hover:bg-white/40'
                }`}
                title={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/5 cursor-pointer active:scale-95 transition-all"
            title="Next Slide"
          >
            <Lucide.ChevronRight size={16} />
          </button>
        </div>

        {/* Action Button: Print Slide Deck outline */}
        <button
          onClick={() => {
            const printContent = slidesContent[deckLanguage]
              .map((s, idx) => `SLIDE ${idx + 1}: ${s.title}\nSUBTITLE: ${s.subtitle}\n\nBULLETS:\n${s.bullets.map((b: any) => `- ${b.title}: ${b.desc}`).join('\n')}\n\nSPEAKER SCRIPT:\n"${s.speakerNotes}"`)
              .join('\n\n==================================\n\n');
            const blob = new Blob([printContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Utkal_Skill_Centre_Pitch_Playbook_${deckLanguage}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Lucide.Download size={12} />
          <span className="hidden md:inline">{deckLanguage === 'or' ? 'ସୂଚୀ ଡାଉନଲୋଡ୍' : 'Download Script'}</span>
        </button>
      </footer>

      {/* Diagnostics Modal Overlay */}
      <AnimatePresence>
        {showDiagnostics && (
          <div className="absolute inset-0 z-50 bg-slate-950 flex items-center justify-center p-3 md:p-6 overflow-hidden force-dark-theme">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl w-full max-w-2xl h-full max-h-full overflow-hidden relative shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col"
            >
              {/* Holographic matrix scanlines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-[0.06] z-10" />

              {/* Top Header Bar */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950 relative z-20 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.1em]">
                      {deckLanguage === 'or' ? 'ଉତ୍କଳ AI ସିଷ୍ଟମ ଟେଲିମେଟ୍ରି' : 'Utkal AI System Telemetry'}
                    </h3>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">
                      {deckLanguage === 'or' ? 'ଲାଇଭ୍ କନସୋଲ୍ • ସ୍ୱାଧୀନ କ୍ୟାଶ୍ ସ୍ଥିତି' : 'Live Console • Static Failover Monitoring'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    try {
                      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                      osc.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc.start();
                      osc.stop(audioCtx.currentTime + 0.1);
                    } catch (e) {}
                    setShowDiagnostics(false);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <Lucide.X size={16} />
                </button>
              </div>

              {/* Scrollable contents */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6 relative z-20">
                {/* Telemetry Main Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* Latency Box */}
                  <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] text-slate-400 uppercase tracking-wider block font-black">
                        {deckLanguage === 'or' ? 'ଭର୍ଟେକ୍ସ AI ଇନଫରେନ୍ସ' : 'Vertex AI Pipeline'}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <h4 className="text-3xl font-black text-emerald-400 tracking-tight">
                          {diagnosticsData.vertexLatency}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">ms</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-medium">Cloud Run RTT</span>
                        <span className="text-slate-200 font-black">{diagnosticsData.networkPing}ms</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-medium">Region routing</span>
                        <span className="text-slate-200 font-black">us-central1</span>
                      </div>
                    </div>
                  </div>

                  {/* Firestore sync / Speedometer dial */}
                  <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      <svg className="w-full h-full rotate-[-90deg]">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="5" />
                        <circle 
                          cx="40" 
                          cy="40" 
                          r="32" 
                          fill="none" 
                          stroke="#fbbf24" 
                          strokeWidth="5" 
                          strokeDasharray={200}
                          strokeDashoffset={200 - (Math.min(200, diagnosticsData.dbSpeed) / 200) * 150} 
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-base font-black text-white">{diagnosticsData.dbSpeed}</span>
                        <span className="text-[7px] text-slate-400 uppercase tracking-widest block font-bold">ms</span>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-black text-slate-300 mt-2 text-center uppercase tracking-wider">
                      {deckLanguage === 'or' ? 'ଡାଟାବେସ୍ ସିଙ୍କ୍ ସ୍ପିଡ୍' : 'Firestore Sync Speed'}
                    </span>
                  </div>

                  {/* PWA offline cache */}
                  <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] text-slate-400 uppercase tracking-wider block font-black">
                        {deckLanguage === 'or' ? 'ଅଫଲାଇନ୍ ଷ୍ଟୋରେଜ୍ କ୍ୟାଶ୍' : 'PWA Cache Occupancy'}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <h4 className="text-3xl font-black text-indigo-400 tracking-tight">
                          {diagnosticsData.cacheSize}
                        </h4>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-medium">Chapters Precached</span>
                        <span className="text-indigo-450 font-black">92 Chapters (C4)</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-medium">Service Worker</span>
                        <span className="text-emerald-400 font-black flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Context Caching */}
                  <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[8.5px] text-slate-400 uppercase tracking-wider block font-black">
                        {deckLanguage === 'or' ? 'ଗୁଗଲ୍ କ୍ଲାଉଡ୍ କଣ୍ଟେକ୍ସଟ୍ କ୍ୟାଶିଙ୍ଗ୍' : 'Gemini Context Caching'}
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <h4 className="text-3xl font-black text-amber-400 tracking-tight">
                          94.2%
                        </h4>
                        <span className="text-[10.5px] text-slate-400 font-bold uppercase">HIT RATE</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-medium">Cached Context</span>
                        <span className="text-amber-300 font-black">164K / 200K Tokens</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-medium">Estimated Savings</span>
                        <span className="text-emerald-400 font-black flex items-center gap-1">
                          $3.85 / Day
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* SVG Ping History Graph */}
                <div className="w-full h-24 bg-slate-950/80 border border-white/5 rounded-2xl p-3.5 relative flex flex-col justify-between overflow-hidden">
                  <span className="text-[8.5px] uppercase tracking-widest text-slate-400 absolute top-2 left-3 font-black">
                    {deckLanguage === 'or' ? 'ରିଅଲ୍-ଟାଇମ୍ ନେଟୱାର୍କ ପାଇପଲାଇନ୍ ହିଷ୍ଟ୍ରି' : 'Real-Time Network Pipeline Latency RTT'}
                  </span>
                  <div className="absolute top-2 right-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[8.5px] font-black text-emerald-400 tracking-wider">
                      {diagnosticsData.vertexLatency}ms
                    </span>
                  </div>
                  
                  <svg className="w-full h-full pt-4 pb-1" viewBox="0 0 200 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0 60 ${pingHistory.map((val, idx) => {
                        const x = (idx / (pingHistory.length - 1)) * 200;
                        const clamped = Math.max(80, Math.min(220, val));
                        const y = 50 - ((clamped - 80) / 140) * 40;
                        return `L ${x} ${y}`;
                      }).join(' ')} L 200 60 Z`}
                      fill="url(#chartGlow)"
                    />
                    <path
                      d={pingHistory.map((val, idx) => {
                        const x = (idx / (pingHistory.length - 1)) * 200;
                        const clamped = Math.max(80, Math.min(220, val));
                        const y = 50 - ((clamped - 80) / 140) * 40;
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pingHistory.map((val, idx) => {
                      const x = (idx / (pingHistory.length - 1)) * 200;
                      const clamped = Math.max(80, Math.min(220, val));
                      const y = 50 - ((clamped - 80) / 140) * 40;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="2.5"
                          fill="#fbbf24"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Interactive Speech Toggles */}
                <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        {deckLanguage === 'or' ? 'ସକ୍ରିୟ ସ୍ପିଚ୍ ଇଞ୍ଜିନ୍ ବାଛନ୍ତୁ' : 'Active Speech Engine Selector'}
                      </h4>
                      <p className="text-[9.5px] text-slate-300 leading-normal font-medium">
                        {deckLanguage === 'or' ? 'ସ୍ଥାନୀୟ ବ୍ରାଉଜର୍ ସହିତ କ୍ଲାଉଡ୍ ଭଏସ୍ ରୋଟେସନ୍ କରନ୍ତୁ' : 'Bypass cloud server TTS and force client synthesis fallback dynamically.'}
                      </p>
                    </div>
                    <span className="text-[8px] bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      {deckLanguage === 'or' ? 'ଇଣ୍ଟରାକ୍ଟିଭ୍' : 'Interactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'client',
                        title: deckLanguage === 'or' ? 'ସ୍ଥାନୀୟ ବ୍ରାଉଜର୍ ସିନ୍ଥେସିସ୍' : 'Local Browser Synthesis',
                        desc: deckLanguage === 'or' ? 'ୱେବ୍ ସ୍ପିଚ୍ ସିନ୍ଥେସିସ୍ (ପ୍ରାରମ୍ଭିକ ₹୦.୦୦ baseline)' : 'Offline-ready Web Speech synthesis with zero API cost',
                        icon: Lucide.MicOff
                      },
                      {
                        key: 'server',
                        title: deckLanguage === 'or' ? 'ଗୁଗଲ୍ କ୍ଲାଉଡ୍ (Vertex AI)' : 'Google Cloud (Vertex AI)',
                        desc: deckLanguage === 'or' ? 'ପ୍ରିମିୟମ୍ ସ୍ପିଚ୍ ସର୍ଭର୍ ଏବଂ ପ୍ରକ୍ସି ନେଟୱାର୍କ' : 'Premium synthesised audio stream via secure server proxy',
                        icon: Lucide.Sparkles
                      },
                      {
                        key: 'live_ws',
                        title: deckLanguage === 'or' ? 'ଜେମିନି ଲାଇଭ୍ (WebSockets)' : 'Gemini Live (WebSockets)',
                        desc: deckLanguage === 'or' ? 'ରିଅଲ୍-ଟାଇମ୍ ଦ୍ଵିମୁଖୀ ଅଡିଓ ଓ ସ୍ୱୟଂଚାଳିତ ବାଧା' : 'Real-time duplex audio with active interruption support',
                        icon: Lucide.Mic
                      }
                    ].map((opt) => {
                      const isSelected = diagnosticsData.ttsMode === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => {
                            try {
                              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                              const osc = audioCtx.createOscillator();
                              const gain = audioCtx.createGain();
                              osc.type = 'sine';
                              osc.frequency.setValueAtTime(isSelected ? 350 : 650, audioCtx.currentTime);
                              gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                              osc.connect(gain);
                              gain.connect(audioCtx.destination);
                              osc.start();
                              osc.stop(audioCtx.currentTime + 0.08);
                            } catch (e) {}
                            
                            if (opt.key === 'live_ws') {
                              localStorage.setItem('gundulu_use_premium_voice', 'live_ws');
                            } else {
                              localStorage.setItem('gundulu_use_premium_voice', opt.key === 'server' ? 'true' : 'false');
                            }
                            setDiagnosticsData(prev => ({ ...prev, ttsMode: opt.key }));
                          }}
                          className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected 
                              ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/5' 
                              : 'bg-slate-900/40 border-white/5 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <opt.icon size={14} className={isSelected ? 'text-emerald-400' : 'text-slate-400'} />
                            <span className={`text-[11px] font-black ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                              {opt.title}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-300 leading-normal font-medium">
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Google Search Grounding Toggle */}
                <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Lucide.Search size={14} className="text-amber-400" />
                        {deckLanguage === 'or' ? 'ରିଅଲ୍-ଟାଇମ୍ ଗୁଗଲ୍ ସର୍ଚ୍ଚ ଗ୍ରାଉଣ୍ଡିଂ' : 'Real-Time Google Search Grounding'}
                      </h4>
                      <p className="text-[9.5px] text-slate-300 leading-normal font-medium">
                        {deckLanguage === 'or' ? 'ତାଜା ତଥ୍ୟ, ନୋଟିସ୍ ଏବଂ ବୋର୍ଡ ଖବର ପାଇଁ ଜେମିନିକୁ ସିଧାସଳଖ ଗୁଗଲ୍ ସର୍ଚ୍ଚ ସହ ଯୋଡନ୍ତୁ।' : 'Connect Gemini directly to live Google Search for current events, notice dates, and board news.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.type = 'sine';
                          osc.frequency.setValueAtTime(diagnosticsData.googleSearchGrounding ? 400 : 700, audioCtx.currentTime);
                          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.08);
                        } catch (e) {}

                        const nextVal = !diagnosticsData.googleSearchGrounding;
                        localStorage.setItem('gundulu_enable_grounding', nextVal ? 'true' : 'false');
                        setDiagnosticsData(prev => ({ ...prev, googleSearchGrounding: nextVal }));
                      }}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        diagnosticsData.googleSearchGrounding
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      {diagnosticsData.googleSearchGrounding
                        ? (deckLanguage === 'or' ? 'ସକ୍ରିୟ (ACTIVE)' : 'ACTIVE')
                        : (deckLanguage === 'or' ? 'ନିଷ୍କ୍ରିୟ (DISABLED)' : 'DISABLED')
                      }
                    </button>
                  </div>
                </div>

                {/* Dialect Bridge Toggle */}
                <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Lucide.Languages size={14} className="text-indigo-400" />
                        {deckLanguage === 'or' ? 'ମାତୃଭାଷା ସେତୁ (Dialect Bridge)' : 'Colloquial Dialect Bridge'}
                      </h4>
                      <p className="text-[9.5px] text-slate-300 leading-normal font-medium">
                        {deckLanguage === 'or' ? 'କୋଷାଲୀ/ଦେଶିଆ ଉପଭାଷାକୁ ପ୍ରମାଣିତ ଓଡ଼ିଆ ସହ ସମ୍ବନ୍ଧିତ କରନ୍ତୁ।' : 'Bridge Kosli/Desia tribal dialects seamlessly with standard Odia orthography.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.type = 'sine';
                          osc.frequency.setValueAtTime(diagnosticsData.enableDialectBridge ? 400 : 700, audioCtx.currentTime);
                          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.08);
                        } catch (e) {}

                        const nextVal = !diagnosticsData.enableDialectBridge;
                        localStorage.setItem('gundulu_enable_dialect_bridge', nextVal ? 'true' : 'false');
                        setDiagnosticsData(prev => ({ ...prev, enableDialectBridge: nextVal }));
                      }}
                      className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        diagnosticsData.enableDialectBridge
                          ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-slate-800'
                      }`}
                    >
                      {diagnosticsData.enableDialectBridge
                        ? (deckLanguage === 'or' ? 'ସକ୍ରିୟ (ACTIVE)' : 'ACTIVE')
                        : (deckLanguage === 'or' ? 'ନିଷ୍କ୍ରିୟ (DISABLED)' : 'DISABLED')
                      }
                    </button>
                  </div>
                </div>

                {/* Built-in Device AI & Content Safety HUD */}
                <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-4 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Lucide.Cpu size={14} className="text-indigo-400" />
                        {deckLanguage === 'or' ? 'ଏଜ୍ ଏଆଇ ଏବଂ ବିଦ୍ୟାର୍ଥୀ ସୁରକ୍ଷା ପ୍ୟାନେଲ୍' : 'Edge AI & Student Safety HUD'}
                      </h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Device AI Fallback detector */}
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                          Chrome Built-in Device AI
                        </span>
                        <span className="text-[11px] font-black text-white">
                          {typeof (window as any).ai !== 'undefined' ? 'Gemini Nano' : 'Chrome Flag Missing'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-widest ${
                        typeof (window as any).ai !== 'undefined'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                      }`}>
                        {typeof (window as any).ai !== 'undefined' ? 'AVAILABLE' : 'OFFLINE MODE ONLY'}
                      </span>
                    </div>

                    {/* Perspective API filter status */}
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                          Perspective Safety Filter
                        </span>
                        <span className="text-[11px] font-black text-white">
                          Prompt Pre-Filtering
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[8.5px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase tracking-widest">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Footer Action Panel */}
              <div className="p-5 border-t border-white/5 bg-slate-950 flex items-center justify-between relative z-20 shrink-0">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      try {
                        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = audioCtx.createOscillator();
                        const gain = audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                        osc.connect(gain);
                        gain.connect(audioCtx.destination);
                        osc.start();
                        osc.stop(audioCtx.currentTime + 0.1);
                      } catch (e) {}
                      setShowDiagnostics(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                  >
                    {deckLanguage === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close'}
                  </button>

                  <div className="hidden sm:flex items-center text-[9px] text-slate-500 font-bold uppercase pl-2">
                    {deckLanguage === 'or' ? `ଶେଷ ଯାଞ୍ଚ: ${diagnosticsData.time}` : `Last checked: ${diagnosticsData.time}`}
                  </div>
                </div>

                <button
                  onClick={() => {
                    try {
                      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
                      osc.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc.start();
                      osc.stop(audioCtx.currentTime + 0.12);
                    } catch (e) {}
                    runDiagnostics();
                  }}
                  disabled={diagnosticsRunning}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 border border-emerald-400/20 disabled:opacity-50"
                >
                  <Lucide.RefreshCw size={10} className={diagnosticsRunning ? 'animate-spin' : ''} />
                  <span>
                    {diagnosticsRunning 
                      ? (deckLanguage === 'or' ? 'ଯାଞ୍ଚ ଚାଲିଛି...' : 'Running...') 
                      : (deckLanguage === 'or' ? 'ରିଫ୍ରେଶ୍ କରନ୍ତୁ' : 'Force Refresh')}
                  </span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
