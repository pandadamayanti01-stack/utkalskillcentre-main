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
  
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync deck language when parent language changes
  useEffect(() => {
    setDeckLanguage(language);
  }, [language]);

  // Slides count
  const TOTAL_SLIDES = 5;

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
          { title: "Mother-Tongue First", desc: "Democratizing state-board syllabus tutoring in colloquial Odia." },
          { title: "Digital Study Companion", desc: "Gundulu AI tutor provides warm, interactive, and personalized explanations." },
          { title: "Budget & Network Resilient", desc: "Lightweight offline-first PWA, optimized for rural 2G/3G connections and mobile-only families." }
        ],
        speakerNotes: "Hello judges! Welcome to Utkal Skill Centre. We are building the future of accessible, bilingual education in India. By combining native Odia curriculum tutoring with state-of-the-art conversational AI, we are bringing an elite personal tutor directly to the fingertips of millions of students in rural Odisha, completely in their mother tongue, removing linguistic and economic barriers."
      },
      {
        title: "Our Journey & Active Launch Milestones",
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
        title: "A Magical, Gamified Learning Portal",
        subtitle: "Interactive Onboarding, Animated Welcome & Instant Engagement",
        tagline: "PRODUCT DESIGN & CUSTOMER JOURNEY",
        bullets: [
          { title: "Frictionless Signup", desc: "Bypass mode with mobile OTP allows parents with no email to log in instantly." },
          { title: "Interactive Launch Event", desc: "Students pop floating balloons containing Odia vowels to release sound particles." },
          { title: "Premium Visual Rewards", desc: "Watching Gundulu's vertical welcome animation grants a Founding Golden Ticket with +500 XP." }
        ],
        speakerNotes: "To hook young learners on their very first launch, we built a highly gamified greeting sequence. Students pop interactive helium balloons to hear synthesized audio pops and watch a snappy 12-second vertical welcome animation from their mascot, Gundulu. This rewards them with a Gold Founding Member Ticket and programmatically syncs +500 XP to Firestore to drive instant daily retention."
      },
      {
        title: "High-Performance Serverless Architecture",
        subtitle: "Google Cloud Run, Vertex AI & Low-Latency Offline Fallbacks",
        tagline: "ENTERPRISE-GRADE TECH STACK",
        bullets: [
          { title: "Vertex AI & Cloud Run", desc: "Securely hosted Express backend using Vertex AI APIs with local Ambient ADC credentials." },
          { title: "Quota & Fail-Safe Routing", desc: "Ambient fallback routes requests dynamically between Vertex AI and Google AI Studio." },
          { title: "Zero-Cost Browser Synthesis", desc: "If Voice APIs hit rate-limits (429), client fallbacks offload SpeechSynthesis to the browser." },
          { title: "FastMCP Agent Tooling", desc: "Exposes schema tools to the Google Agent Developer Kit for database and live state tracking." }
        ],
        speakerNotes: "Our technical architecture is incredibly robust and cost-resilient. Running on Google Cloud Run serverless means our base operational cost is practically $0.00. To guarantee low-latency operation on slow 2G rural networks, we built a multi-tier fallback: if the premium server TTS API is offline or throttled, the client PWA instantly synthesizes voice logs locally via the browser's audio engine."
      },
      {
        title: "Business Viability & Future AI Roadmap",
        subtitle: "Proven Demand, Virtually $0.00 Overhead & Native Speed Conversations",
        tagline: "GROWTH, TRACTION & SUSTAINABILITY",
        bullets: [
          { title: "Proven Pilot Traction", desc: "Successfully onboarded 434 active students with 5 paying premium subscribers." },
          { title: "Highly Scalable margins", desc: "Serving syllabus guides statically keeps operational cost at $0.00, enabling ₹99/mo subscriptions." },
          { title: "Future Specialized AI Tutor", desc: "Transitioning to training lightweight Google AI models specifically on Odia educational transcripts for native speech speeds." }
        ],
        speakerNotes: "We have already proven commercial demand, onboarding 434 pilot students and securing 5 paying premium subscribers on our ₹99/month tier. Our serverless setup keeps operational costs near-zero. In the future, we plan to train lightweight Google AI models specifically on Odia educational transcripts, enabling Gundulu to speak with native speed and zero API overhead!"
      }
    ],
    or: [
      {
        title: "ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର",
        subtitle: "ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳର ପିଲାମାନଙ୍କ ପାଇଁ କଥାବାର୍ତ୍ତା କରୁଥିବା ଏଆଇ (AI) ମାଧ୍ୟମରେ ପାଠପଢ଼ା",
        tagline: "ପ୍ରଥମ ସ୍ଥାନ ହାକାଥନ୍ ପ୍ରଦର୍ଶନୀ",
        bullets: [
          { title: "ମାତୃଭାଷାକୁ ପ୍ରାଥମିକତା", desc: "ଓଡ଼ିଶା ବୋର୍ଡ ପାଠ୍ୟକ୍ରମକୁ ସରଳ ଓଡ଼ିଆ ଭାଷାରେ ଉପଲବ୍ଧ କରାଇବା।" },
          { title: "ଡିଜିଟାଲ୍ ପଢ଼ା ସାଥୀ", desc: "ଗୁନ୍ଦୁଲୁ ଏଆଇ (Gundulu AI) ପିଲାମାନଙ୍କୁ ଭଉଣୀ ଭଳି ଆଦରରେ ସବୁ ପାଠ ବୁଝାଇଥାଏ।" },
          { title: "ନେଟୱର୍କ ସମସ୍ୟାର ସମାଧାନ", desc: "ଏକ ହାଲୁକା PWA ଆପ୍ ଯାହା ଗ୍ରାମାଞ୍ଚଳର 2G/3G ଇଣ୍ଟରନେଟ୍ ରେ ମଧ୍ୟ ବହୁତ ସ୍ପିଡ୍ ଚାଲେ।" }
        ],
        speakerNotes: "ପ୍ରଣାମ ବିଚାରକ ମଣ୍ଡଳୀ! ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରକୁ ଆପଣମାନଙ୍କୁ ସ୍ୱାଗତ। ଆମେ ଓଡ଼ିଶାର ସରକାରୀ ବିଦ୍ୟାଳୟର ପିଲାମାନଙ୍କ ପାଇଁ ମାତୃଭାଷାରେ ବିଶ୍ୱସ୍ତରୀୟ ଏଆଇ ଶିକ୍ଷା ସାଥୀ ତିଆରି କରିଛୁ। ଓଡ଼ିଆ ଭାଷା ଓ ସରକାରୀ ପାଠ୍ୟକ୍ରମକୁ ଏକାଠି କରି ଆମେ ପିଲାମାନଙ୍କ ମୋବାଇଲ୍ ରେ ଗୁନ୍ଦୁଲୁ ଏଆଇ ଟ୍ୟୁଟର ପହଞ୍ଚାଇଛୁ, ଯାହା ସେମାନଙ୍କୁ ସମ୍ପୂର୍ଣ୍ଣ ମାତୃଭାଷାରେ ଏକ ବଡ଼ ଭଉଣୀ ଭଳି ଗାଇଡ୍ କରୁଛି।"
      },
      {
        title: "ଆମର ଯାତ୍ରା ଏବଂ ଶୁଭାରମ୍ଭ ମାଇଲଖୁଣ୍ଟ",
        subtitle: "ଏପ୍ରିଲ୍ ୧ (ଉତ୍କଳ ଦିବସ) ରୁ ଆରମ୍ଭ ਹੋଇଥିବା ଶିକ୍ଷା ସେବା",
        tagline: "ଆମର ସଂଳାପ ଏବଂ ମାଇଲଖୁଣ୍ଟ",
        bullets: [
          { title: "🌸 ଏପ୍ରିଲ୍ ୧ ଶୁଭାରମ୍ଭ", desc: "ଓଡ଼ିଶାର ଗର୍ବ ଓ ଗୌରବର ଦିନ ଉତ୍କଳ ଦିବସରେ ଆମର ଅଫିସିଆଲ୍ ପ୍ଲାଟଫର୍ମ ଆରମ୍ଭ କରିଥିଲୁ।" },
          { title: "📱 ପ୍ରୋଗ୍ରେସିଭ୍ ୱେବ୍ ଆପ୍ (PWA)", desc: "ଗ୍ରାମାଞ୍ଚଳର ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ଗୁଡ଼ିକ ପାଇଁ ଏକ ଦ୍ରୁତ, ଅଫଲାଇନ୍-ଅପ୍ଟିମାଇଜ୍ଡ୍ PWA ଆପ୍ ପ୍ରସ୍ତୁତ କଲୁ।" },
          { title: "🎒 ଓଡ଼ିଆ ମାଧ୍ୟମ ପିଲାଙ୍କ ଲକ୍ଷ୍ୟ", desc: "ଇଂରାଜୀ ଆପ୍ ଦ୍ୱାରା ଅଣଦେଖା ହୋଇଥିବା ସରକାରୀ ବିଦ୍ୟାଳୟର ପିଲାମାନଙ୍କୁ ସାହାଯ୍ୟ କରିବା।" }
        ],
        speakerNotes: "ଆମର ଶିକ୍ଷା ଯାତ୍ରା ଅତି ନିଆରା। ଓଡ଼ିଶାର ପିଲାମାନଙ୍କ ସ୍ୱାର୍ଥ ରକ୍ଷା ପାଇଁ ଏପ୍ରିଲ୍ ୧ - ଉତ୍କଳ ଦିବସରେ ଆମେ ଆମର ୱେବସାଇଟ୍ ଶୁଭାରମ୍ଭ କରିଥିଲୁ। ଏହା ପରେ ଗ୍ରାମାଞ୍ଚଳରେ ଧିମା ଇଣ୍ଟରନେଟ୍ ରେ ପାଠପଢ଼ାକୁ ସହଜ କରିବାକୁ ଆମେ ଆମର PWA ଆପ୍ ପ୍ରସ୍ତୁତ କଲୁ, ଯାହା ସ୍ୱଳ୍ପ ବ୍ୟାଣ୍ଡୱିଡଥ୍ ରେ ମଧ୍ୟ ବିନା ରୋକଟୋକରେ ଚାଲିପାରୁଛି।"
      },
      {
        title: "ମନୋରଞ୍ଜନ ଓ ଗେମିଂ ସହ ପାଠପଢ଼ା",
        subtitle: "ଆକର୍ଷଣୀୟ ବେଲୁନ୍ ଖେଳ, ଭିଡିଓ ଏବଂ ଉତ୍ସାହଜନକ ପୁରସ୍କାର",
        tagline: "ପ୍ରଡକ୍ଟ ଡିଜାଇନ୍ ଏବଂ ଆନନ୍ଦଦାୟକ ପର୍ଯ୍ୟାୟ",
        bullets: [
          { title: "ସରଳ ପ୍ରବେଶ ପ୍ରଣାଳୀ", desc: "କୌଣସି ଜଟିଳ ଫର୍ମ ବିନା କେବଳ ମୋବାଇଲ୍ ଦ୍ୱାରା ଲଗଇନ୍ କରି ତୁରନ୍ତ ଆରମ୍ଭ କରିପାରିବେ।" },
          { title: "ବେଲୁନ୍ ଫୁଟାଇବା ଖେଳ", desc: "ପ୍ରଥମ ଲଗଇନ୍ ରେ ପିଲାମାନେ ବେଲୁନ୍ ଫୁଟାଇ ଓଡ଼ିଆ ଅକ୍ଷର ଶିଖନ୍ତି ଏବଂ ଶବ୍ଦ ଇଫେକ୍ଟ ଶୁଣନ୍ତି।" },
          { title: "ଗୋଲ୍ଡେନ୍ ହୋଲୋଗ୍ରାଫିକ୍ ଟିକେଟ୍", desc: "ଗୁନ୍ଦୁଲୁର ୧୨-ସେକେଣ୍ଡ୍ ର ସ୍ୱାଗତ ଭିଡିଓ ଦେଖିଲେ ପିଲାମାନଙ୍କୁ ଗୋଲ୍ଡେନ୍ ପାସ୍ ଏବଂ +୫୦୦ XP ମିଳେ।" }
        ],
        speakerNotes: "ଛୋଟ ପିଲାଙ୍କ ମନରେ ପାଠପଢ଼ା ପାଇଁ ଉତ୍ସାହ ଭରିବାକୁ ଆମେ ଏକ ସୁନ୍ଦର ବେଲୁନ୍ ଗେମ୍ ରଖିଛୁ। ପିଲାମାନେ ରଙ୍ଗବେରଙ୍ଗ ବେଲୁନ୍ ଫୁଟାଇବା ପରେ ସେମାନଙ୍କ ସାମ୍ନାରେ ଗୁନ୍ଦୁଲୁର ଏକ ୧୨-ସେକେଣ୍ଡ୍ ର ମନୋରଞ୍ଜକ ଓଡ଼ିଆ ଆନିମେସନ୍ ପ୍ଲେ ହୁଏ। ଏହା ପରେ ସେମାନଙ୍କୁ ଏକ ଗୋଲ୍ଡେନ୍ ଫାଉଣ୍ଡିଂ ମେମ୍ବର ପାସ୍ ଏବଂ ୫୦୦ XP ମିଳିଥାଏ, ଯାହା ପିଲାଙ୍କୁ ପ୍ରତିଦିନ ପଢ଼ିବାକୁ ଆକର୍ଷିତ କରେ।"
      },
      {
        title: "ଶକ୍ତିଶାଳୀ ଏବଂ ସୁରକ୍ଷିତ ସର୍ଭର ବ୍ୟବସ୍ଥା",
        subtitle: "ଗୁଗଲ୍ କ୍ଲାଉଡ୍ ରନ୍, ଭର୍ଟେକ୍ସ ଏଆଇ ଏବଂ ଜିରୋ-କଷ୍ଟ ବ୍ରାଉଜର୍ ଟିଟିଏସ୍ (TTS)",
        tagline: "ଉଚ୍ଚ ସ୍ତରୀୟ ଟେକ୍ନୋଲୋଜି",
        bullets: [
          { title: "ଭର୍ଟେକ୍ସ ଏଆଇ ଓ କ୍ଲାଉଡ୍ ରନ୍", desc: "ସର୍ଭରଲେସ୍ ଏକ୍ସପ୍ରେସ୍ ବ୍ୟାକେଣ୍ଡ ଗୁଗଲ୍ କ୍ଲାଉଡ୍ ରନ୍ ଉପରେ ସମ୍ପୂର୍ଣ୍ଣ ସୁରକ୍ଷିତ ଭାବେ ଚାଲୁଛି।" },
          { title: "ସର୍ଭର ଅଟୋମେଟିକ୍ ସୁରକ୍ଷା", desc: "ଭର୍ଟେକ୍ସ ଏଆଇ ଏବଂ ଗୁଗଲ୍ ଏଆଇ ଷ୍ଟୁଡିଓ ମଧ୍ୟରେ ସ୍ୱୟଂଚାଳିତ ଭାବେ ରିକ୍ୱେଷ୍ଟ୍ ପରିଚାଳନା।" },
          { title: "ମାଗଣା ବ୍ରାଉଜର୍ ଟିଟିଏସ୍ ଫଲବ୍ୟାକ୍", desc: "ଯଦି ଏପିଆଇ (API) ଲିମିଟ୍ ହୁଏ, ଆପ୍ ତୁରନ୍ତ ୟୁଜର୍ ର ବ୍ରାଉଜର୍ ବ୍ୟବହାର କରି ଓଡ଼ିଆ ଭଏସ୍ ଉତ୍ପନ୍ନ କରେ।" },
          { title: "FastMCP ଏଜେଣ୍ଟ୍ ବ୍ରିଜ୍", desc: "ଗୁଗଲ୍ ର ଏଜେଣ୍ଟ୍ ଡେଭେଲପର୍ କିଟ୍ ସହ ଡାଟାବେସ୍ ଯୋଡ଼ିବା ପାଇଁ ସ୍ୱତନ୍ତ୍ର ସର୍ଭର ଟୁଲ୍ସ।" }
        ],
        speakerNotes: "ଆମର ବ୍ୟାକେଣ୍ଡ ଗୁଗଲ୍ କ୍ଲାଉଡ୍ ରନ୍ ର ସର୍ଭରଲେସ୍ ଟେକ୍ନୋଲୋଜିରେ ହୋଷ୍ଟ ହୋଇଛି, ଯାହାଦ୍ୱାରା ଆମର ମାସିକ ସର୍ଭର ଖର୍ଚ୍ଚ ପ୍ରାୟ ଶୂନ ଟଙ୍କା। ଗ୍ରାମାଞ୍ଚଳରେ ଧିମା ଇଣ୍ଟରନେଟ୍ ରେ ଭଏସ୍ ସମସ୍ୟା ଦୂର କରିବାକୁ ଆମେ ବ୍ରାଉଜର୍ ଆଧାରିତ ଫଲବ୍ୟାକ୍ ତିଆରି କରିଛୁ। ସର୍ଭର ଯଦି ବ୍ୟସ୍ତ ରହେ, ମୋବାଇଲ୍ ବ୍ରାଉଜର୍ ନିଜେ ଓଡ଼ିଆ କଥା କହି ପିଲାଙ୍କୁ ଶୁଣାଏ।"
      },
      {
        title: "ବ୍ୟବସାୟିକ ସଫଳତା ଏବଂ ଏଆଇ ରୋଡ୍ ମ୍ୟାପ୍",
        subtitle: "ଉଚ୍ଚ ଲାଭ, ସକ୍ରିୟ ଛାତ୍ର ଏବଂ ଦ୍ରୁତତମ ଏଆଇ (AI) ର ପ୍ରଶିକ୍ଷଣ",
        tagline: "ବୃଦ୍ଧି, ଆକର୍ଷଣ ଏବଂ ସ୍ଥିରତା",
        bullets: [
          { title: "ସକ୍ରିୟ ଛାତ୍ରଛାତ୍ରୀ", desc: "ପାଇଲଟ୍ ପର୍ଯ୍ୟାୟରେ ମାତ୍ର କିଛି ଦିନରେ ୪୩୪ ଜଣ ସକ୍ରିୟ ଛାତ୍ର ଏବଂ ୫ ଜଣ ପ୍ରିମିୟମ୍ ସଦସ୍ୟ ଯୋଡ଼ିଛୁ।" },
          { title: "ମାସିକ ମାତ୍ର ୯୯ ଟଙ୍କା", desc: "ଷ୍ଟାଟିକ୍ ବ୍ରାଉଜର୍ ହୋଷ୍ଟିଂ ଏବଂ ପିଲାଙ୍କ ମୋବାଇଲ୍ ଟିଟିଏସ୍ ବ୍ୟବହାର ହେତୁ ସର୍ଭର ଖର୍ଚ୍ଚ ପ୍ରାୟ ଶୂନ ଟଙ୍କା।" },
          { title: "ଓଡ଼ିଆ ଏଆଇ ମଡେଲ୍ ର ରୂପରେଖ", desc: "ଭବିଷ୍ୟତରେ ଗୁଗଲ୍ ର ହାଲୁକା ଏଆଇ ମଡେଲକୁ ଆମ ଓଡ଼ିଆ ପାଠ୍ୟକ୍ରମରେ ଟ୍ରେନିଂ କରି ଦ୍ରୁତ ଗତିରେ କଥା କହିବା।" }
        ],
        speakerNotes: "ଆମେ ଆମର ପାଇଲଟ୍ ପର୍ଯ୍ୟାୟରେ ମାତ୍ର କିଛି ଦିନରେ ୪୩୪ ଜଣ ସକ୍ରିୟ ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ଯୋଡ଼ିଛୁ ଏବଂ ୫ ଜଣ ପ୍ରିମିୟମ୍ ସଦସ୍ୟ ମାସିକ ୯୯ ଟଙ୍କା ଦେଇ ପଢୁଛନ୍ତି। ଆମର ସ୍କେଲିଂ ଖର୍ଚ୍ଚ ଅତି ନଗଣ୍ୟ। ଆମର ପରବର୍ତ୍ତୀ ଲକ୍ଷ୍ୟ ହେଉଛି ଗୁଗଲ୍ ର ଓପନ୍ ଏଆଇ ମଡେଲ୍ ଗୁଡ଼ିକୁ ଆମ ଓଡ଼ିଆ ଶିକ୍ଷା ସଂଳାପରେ ପ୍ରଶିକ୍ଷିତ (Fine-Tune) କରିବା, ଯାହା ବିଶ୍ୱର ସବୁଠୁ ଶସ୍ତା ଓ ଦ୍ରୁତତମ ଓଡ଼ିଆ ଏଆଇ ଟ୍ୟୁଟର୍ ହେବ। ଧନ୍ୟବାଦ।"
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
                          {deckLanguage === 'or' ? 'ସୌମ୍ୟରଞ୍ଜନ ମହାପାତ୍ର' : 'Soumyaranjan Mohapatra'}
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

              {/* SLIDE 2 SHOWCASE: Beautiful Bilingual Milestone Timeline */}
              {currentSlide === 1 && (
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

              {/* SLIDE 3 SHOWCASE: Interactive Balloon-Popping Simulation & Vertical Video Player */}
              {currentSlide === 2 && (
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
                </div>
              )}

              {/* SLIDE 5 SHOWCASE: Roadmap 3-Phase Interactive Timeline & Pilot Stats */}
              {currentSlide === 4 && (
                <div className="w-full max-w-md space-y-4">
                  {/* Pilot Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-center hover:border-emerald-500/30 transition-all">
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Active Pilot Users</span>
                      <h3 className="text-2xl font-black text-emerald-400 mt-1">434</h3>
                      <span className="text-[8px] text-slate-400">Rural school students onboarded</span>
                    </div>
                    <div className="bg-slate-900 border border-white/5 p-3 rounded-2xl text-center hover:border-[#b34d1f]/30 transition-all">
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Paying Subscribers</span>
                      <h3 className="text-2xl font-black text-amber-400 mt-1">5</h3>
                      <span className="text-[8px] text-slate-400">Validating commercial demand at ₹99</span>
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
    </div>
  );
};
