import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase';
import { solveMathDoubt } from '../services/aiService';

interface DigitalLibraryViewProps {
  user: any;
  chapters: any[];
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade?: () => void;
  onBack: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'gundulu';
  text: string;
}

// Map standard subjects to gorgeous, premium gradient card metadata
const SUBJECT_METADATA: Record<string, {
  labelEn: string;
  labelOr: string;
  gradient: string;
  icon: any;
  color: string;
  coverImage: string;
}> = {
  math: {
    labelEn: "Mathematics",
    labelOr: "ଗଣିତ",
    gradient: "from-teal-500 via-emerald-600 to-amber-500",
    icon: Lucide.Binary,
    color: "#34d399",
    coverImage: "/math_cover.png"
  },
  science: {
    labelEn: "General Science",
    labelOr: "ବିଜ୍ଞାନ",
    gradient: "from-cyan-500 via-blue-600 to-indigo-600",
    icon: Lucide.Atom,
    color: "#38bdf8",
    coverImage: "/science_cover.png"
  },
  social_science: {
    labelEn: "Social Science",
    labelOr: "ସାମାଜିକ ବିଜ୍ଞାନ",
    gradient: "from-amber-500 via-orange-600 to-red-600",
    icon: Lucide.Globe,
    color: "#f59e0b",
    coverImage: "/social_science_cover.png"
  },
  english: {
    labelEn: "English Literature",
    labelOr: "ଇଂରାଜୀ",
    gradient: "from-purple-500 via-pink-600 to-rose-600",
    icon: Lucide.BookOpen,
    color: "#c084fc",
    coverImage: "/english_cover.png"
  },
  odia: {
    labelEn: "Odia Literature",
    labelOr: "ଓଡ଼ିଆ",
    gradient: "from-orange-400 via-red-500 to-amber-600",
    icon: Lucide.Scroll,
    color: "#fb923c",
    coverImage: "/odia_cover.png"
  },
  epe: {
    labelEn: "Art & Health",
    labelOr: "କଳା ଓ ସ୍ୱାସ୍ଥ୍ୟ",
    gradient: "from-emerald-400 via-teal-600 to-cyan-600",
    icon: Lucide.Heart,
    color: "#34d399",
    coverImage: "/epe_cover.png"
  }
};

const getSubjectFallbackImage = (subKey: string): string => {
  const fallbacks: Record<string, string> = {
    math: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=400&auto=format&fit=crop",
    science: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=400&auto=format&fit=crop",
    social_science: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop",
    english: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop",
    odia: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=400&auto=format&fit=crop",
    epe: "https://images.unsplash.com/photo-1505232458627-a727264d7272?q=80&w=400&auto=format&fit=crop"
  };
  return fallbacks[subKey.toLowerCase()] || "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400&auto=format&fit=crop";
};

const getClassCode = (cls: string): string => {
  if (!cls) return "class10";
  const num = cls.toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
  return `class${num}`;
};

const getGenerativeBookCover = (subjectKey: string, title: string, idx: number, classCode?: string): string => {
  const meta = SUBJECT_METADATA[subjectKey.toLowerCase()] || SUBJECT_METADATA.math;
  const gradientId = `grad_${subjectKey}_${idx}`;
  
  const classNum = classCode ? classCode.replace('class', '') : '10';
  const displayClass = `CLASS ${classNum}`;
  const displayTitle = title.length > 22 ? title.substring(0, 19) + "..." : title;
  
  let decorativePattern = "";
  if (subjectKey === 'math') {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <circle cx="200" cy="180" r="140" />
        <circle cx="200" cy="180" r="90" />
        <line x1="200" y1="40" x2="200" y2="320" />
        <line x1="60" y1="180" x2="340" y2="180" />
        <path d="M 100,80 L 300,280 M 100,280 L 300,80" />
      </g>
    `;
  } else if (subjectKey === 'science') {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <ellipse cx="200" cy="170" rx="130" ry="50" transform="rotate(30 200 170)" />
        <ellipse cx="200" cy="170" rx="130" ry="50" transform="rotate(-30 200 170)" />
        <circle cx="200" cy="170" r="12" fill="white" fill-opacity="0.1" />
        <circle cx="200" cy="170" r="5" fill="white" />
      </g>
    `;
  } else if (subjectKey === 'social_science') {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <circle cx="200" cy="170" r="100" />
        <ellipse cx="200" cy="170" rx="100" ry="35" />
        <ellipse cx="200" cy="170" rx="35" ry="100" />
      </g>
    `;
  } else {
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <circle cx="200" cy="170" r="120" stroke-dasharray="4,4" />
        <circle cx="200" cy="170" r="80" />
        <path d="M 140,180 Q 200,160 200,200 Q 200,160 260,180" />
      </g>
    `;
  }

  const colors = meta.gradient.replace('from-', '').replace('via-', '').replace('to-', '').split(' ');
  const startColor = colors[0] === 'teal-500' ? '#0d9488' : colors[0] === 'cyan-500' ? '#0891b2' : colors[0] === 'amber-500' ? '#d97706' : colors[0] === 'purple-500' ? '#9333ea' : colors[0] === 'orange-400' ? '#fb923c' : '#10b981';
  const midColor = colors[1] === 'emerald-600' ? '#059669' : colors[1] === 'blue-600' ? '#2563eb' : colors[1] === 'orange-600' ? '#ea580c' : colors[1] === 'pink-600' ? '#db2777' : colors[1] === 'red-500' ? '#ef4444' : '#047857';
  const endColor = colors[2] === 'amber-500' ? '#f59e0b' : colors[2] === 'indigo-600' ? '#4f46e5' : colors[2] === 'red-600' ? '#dc2626' : colors[2] === 'rose-600' ? '#e11d48' : colors[2] === 'amber-600' ? '#d97706' : '#0e7490';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="50%" stop-color="${midColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>

      <rect width="400" height="533" rx="24" fill="url(#${gradientId})" />
      <rect width="25" height="533" fill="black" fill-opacity="0.15" />
      <line x1="25" y1="0" x2="25" y2="533" stroke="white" stroke-opacity="0.08" stroke-width="1" />

      ${decorativePattern}

      <rect x="40" y="320" width="320" height="170" rx="20" fill="#020617" fill-opacity="0.8" stroke="white" stroke-opacity="0.08" stroke-width="1" />

      <rect x="60" y="345" width="80" height="20" rx="10" fill="white" fill-opacity="0.08" />
      <text x="100" y="359" fill="#34d399" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" letter-spacing="1" text-anchor="middle">${displayClass}</text>

      <text x="320" y="359" fill="white" fill-opacity="0.4" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" text-anchor="end">CHAP ${idx}</text>

      <text x="60" y="410" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" letter-spacing="-0.5">${displayTitle}</text>
      <text x="60" y="460" fill="white" fill-opacity="0.3" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" letter-spacing="2">UTKAL DIGITAL LIBRARY</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
export const cleanMathNotation = (text: string): string => {
  if (!text) return "";

  let cleaned = text;

  // 1. Replace block math markers $$ ... $$ with bold formulas in blockquotes
  cleaned = cleaned.replace(/\$\$(.*?)\$\$/gs, (_, formula) => {
    return `\n> **${formula.trim()}**\n`;
  });

  // 2. Replace inline math markers $ ... $ with simple bold formulas
  cleaned = cleaned.replace(/\$(.*?)\$/g, (_, formula) => {
    return `**${formula.trim()}**`;
  });

  // 3. Clean up LaTeX formatting commands
  cleaned = cleaned.replace(/\\times/g, "×");
  cleaned = cleaned.replace(/\\div/g, "÷");
  cleaned = cleaned.replace(/\\pm/g, "±");
  cleaned = cleaned.replace(/\\theta/g, "θ");
  cleaned = cleaned.replace(/\\pi/g, "π");
  cleaned = cleaned.replace(/\\alpha/g, "α");
  cleaned = cleaned.replace(/\\beta/g, "β");
  cleaned = cleaned.replace(/\\gamma/g, "γ");
  cleaned = cleaned.replace(/\\delta/g, "δ");
  cleaned = cleaned.replace(/\\lambda/g, "λ");
  cleaned = cleaned.replace(/\\mu/g, "μ");
  cleaned = cleaned.replace(/\\sigma/g, "σ");
  cleaned = cleaned.replace(/\\phi/g, "φ");
  cleaned = cleaned.replace(/\\omega/g, "ω");
  cleaned = cleaned.replace(/\\Omega/g, "Ω");
  cleaned = cleaned.replace(/\\Sigma/g, "Σ");
  cleaned = cleaned.replace(/\\Delta/g, "Δ");
  cleaned = cleaned.replace(/\\triangle/g, "Δ");
  cleaned = cleaned.replace(/\\cdot/g, "·");
  cleaned = cleaned.replace(/\\sqrt\{(.*?)\}/g, "√$1");
  cleaned = cleaned.replace(/\\sqrt/g, "√");
  cleaned = cleaned.replace(/\\le/g, "≤");
  cleaned = cleaned.replace(/\\ge/g, "≥");
  cleaned = cleaned.replace(/\\neq/g, "≠");
  cleaned = cleaned.replace(/\\approx/g, "≈");
  cleaned = cleaned.replace(/\\infty/g, "∞");
  cleaned = cleaned.replace(/\^\\circ/g, "°");
  cleaned = cleaned.replace(/\\circ/g, "°");

  // LaTeX math spacing
  cleaned = cleaned.replace(/\\quad/g, "   ");
  cleaned = cleaned.replace(/\\qquad/g, "      ");
  cleaned = cleaned.replace(/\\[,;!]/g, " ");

  // LaTeX Fraction conversions
  cleaned = cleaned.replace(/\\frac\{(.*?)\}\{(.*?)\}/g, (_, num, den) => {
    const numClean = num.trim();
    const denClean = den.trim();
    const needsParens = (str: string) => /[\s+\-*/=<>]/g.test(str);
    const nStr = needsParens(numClean) ? `(${numClean})` : numClean;
    const dStr = needsParens(denClean) ? `(${denClean})` : denClean;
    return `${nStr}/${dStr}`;
  });

  // 4. Handle curly-braced exponents like 1^{2} or x^{10} to unicode superscripts
  cleaned = cleaned.replace(/(\w+|\([^)]+\))\^\{(.*?)\}/g, (_, base, exp) => {
    const unicodeSuperscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
    };
    let mappedExp = "";
    for (let char of exp) {
      mappedExp += unicodeSuperscripts[char] || char;
    }
    return `${base}${mappedExp}`;
  });

  // 5. Handle simple exponents like x^2 or 1^2 to unicode superscripts
  cleaned = cleaned.replace(/(\w+|\([^)]+\))\^([0-9+\-nxy])/g, (_, base, exp) => {
    const unicodeSuperscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ'
    };
    return `${base}${unicodeSuperscripts[exp] || ('^' + exp)}`;
  });

  // 6. Handle curly-braced subscripts like a_{1} or x_{2} or a_{n} to unicode subscripts
  cleaned = cleaned.replace(/(\w+)_\{(.*?)\}/g, (_, base, sub) => {
    const unicodeSubscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', 'n': 'ₙ', 'i': 'ᵢ',
      'j': 'ⱼ', 'k': 'ₖ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    let mappedSub = "";
    for (let char of sub) {
      mappedSub += unicodeSubscripts[char] || char;
    }
    return `${base}${mappedSub}`;
  });

  // 7. Handle simple subscripts like a_1 or x_2 or S_n to unicode subscripts
  cleaned = cleaned.replace(/(\w+)_([0-9nixy])/g, (_, base, sub) => {
    const unicodeSubscripts: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'n': 'ₙ', 'i': 'ᵢ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    return `${base}${unicodeSubscripts[sub] || sub}`;
  });

  // 8. Clean up remaining standalone backslashes or math formatting symbols
  cleaned = cleaned.replace(/\\{/g, "{").replace(/\\}/g, "}");

  return cleaned;
};

export const DigitalLibraryView: React.FC<DigitalLibraryViewProps> = ({
  user,
  chapters,
  language,
  isPremium,
  onUpgrade,
  onBack
}) => {
  // Navigation states: 'subjects' -> 'chapters' -> 'reader'
  const [currentView, setCurrentView] = useState<'subjects' | 'chapters' | 'reader'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<any | null>(null);

  const effectivePdfUrl = selectedChapter ? (selectedChapter.pdfUrl || selectedChapter.download_url || selectedChapter.driveUrl || '') : '';

  // Material reader settings
  const [readerMode, setReaderMode] = useState<'notes' | 'pdf'>('notes');
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [isNotepadSaved, setIsNotepadSaved] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  // Eye Care States
  const [eyeCareMode, setEyeCareMode] = useState<'off' | 'sepia' | 'dim'>('off');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isPdfFullScreen, setIsPdfFullScreen] = useState<boolean>(false);
  const [isChatFullScreen, setIsChatFullScreen] = useState<boolean>(false);

  // Gundulu chat states
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load / Save student notes in real-time
  useEffect(() => {
    if (selectedChapter) {
      const savedNotes = localStorage.getItem(`digilib_notes_${user?.id}_${selectedChapter.id}`);
      setPersonalNotes(savedNotes || '');
      setIsNotepadSaved(true);

      // Reset chatbot to initial greeting
      const greetEn = `Namaskar! Mu Gundulu. 🦜 I am your AI study companion for this chapter: "${selectedChapter.title}". Ask me any math formulas, definitions, or click the suggestions below! How can I help you today? ✨`;
      const greetOr = `ନମସ୍କାର! ମୁଁ ଗୁଣ୍ଡୁଲୁ। 🦜 ଆଜି ଆମେ ଏହି ଅଧ୍ୟାୟ ପଢ଼ିବା: "${selectedChapter.title}"। ଏହି ଅଧ୍ୟାୟର କୌଣସି ପ୍ରଶ୍ନ ବା ସୂତ୍ର ବୁଝିବା ପାଇଁ ମୋତେ ପଚାରନ୍ତୁ, ମୁଁ ସାହାଯ୍ୟ କରିବି! ✨`;
      setChatMessages([
        {
          id: 'initial',
          sender: 'gundulu',
          text: language === 'en' ? greetEn : greetOr
        }
      ]);
    }
  }, [selectedChapter, language, user?.id]);

  // Handle auto-saving notes after short typing delays (debounce)
  useEffect(() => {
    if (!selectedChapter) return;
    setIsNotepadSaved(false);

    const saveTimeout = setTimeout(() => {
      localStorage.setItem(`digilib_notes_${user?.id}_${selectedChapter.id}`, personalNotes);
      setIsNotepadSaved(true);
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [personalNotes]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, isAiLoading]);

  // Filter Chapters based on selectedSubject and Student Class
  const filteredChapters = useMemo(() => {
    if (!selectedSubject) return [];
    return chapters.filter((c: any) => {
      // Robust class matching (e.g., matching 'class10', '10', 'Class 10', '10th')
      const cleanClass = (cls: string) => {
        if (!cls) return '';
        return cls.toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
      };
      const classMatches = !user?.class || cleanClass(c.class) === cleanClass(user.class);
      const subjectMatches = c.subject?.toLowerCase() === selectedSubject.toLowerCase();
      // Ensure only published ones show
      return classMatches && subjectMatches && c.status === 'published';
    });
  }, [chapters, selectedSubject, user?.class]);

  // Send message to Gundulu AI Tutor
  const handleSendToGundulu = async (text: string) => {
    if (!text.trim() || isAiLoading || !selectedChapter) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsAiLoading(true);
    try {
      // Construct background context from current chapter notes
      const chapterContext = `
The student is currently reading the chapter: "${selectedChapter.title}".
Here is the official reference study guide for this chapter:
---
${selectedChapter.notes || 'No reference content uploaded.'}
---
Instructions:
1. You are Gundulu, the friendly AI tutor of Utkal Skill Centre.
2. Tutor the student step-by-step based primarily on the chapter reference guide above.
3. Keep your answers supportive, visual, and highly academic. Use bilingual friendly explanations.
4. If the student asks you for an MCQ test or quiz, start an interactive, engaging quiz: ask exactly one premium MCQ question at a time (with options labeled a, b, c, d), wait for their answer, provide friendly feedback on whether they got it right or wrong with a quick educational explanation, and then proceed to ask the next unique question. Do NOT repeat any questions that are already present in the chat history.
`;
      
      const response = await solveMathDoubt(
        text,
        language,
        undefined,
        user?.class || 'Class 10',
        chapterContext,
        chatMessages
      );

      const gMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'gundulu',
        text: response
      };
      setChatMessages(prev => [...prev, gMsg]);
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString() + '_err',
        sender: 'gundulu',
        text: language === 'en' 
          ? "Oops! I hit a small speedbump trying to fetch that answer. Could you ask me again? 🐾"
          : "ଓହୋ! ମୋର ସର୍ଭର କନେକ୍ସନରେ ସାମାନ୍ୟ ସମସ୍ୟା ହେଲା। ଦୟାକରି ଆଉଥରେ ପଚାରନ୍ତୁ! 🐾"
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col pb-24 font-sans relative overflow-x-hidden">
      {/* Dynamic SEO Metadata */}
      {(() => {
        const grade = user?.class || '10'; // Fallback to Class 10 if not logged in or class not defined
        const gradeInt = parseInt(grade.toString().toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', ''), 10) || 10;
        
        let title = language === 'en' ? 'Digital Library | Utkal Skill Centre' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ | ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର';
        let desc = language === 'en' 
          ? `Access complete school textbooks, chapter solutions, MCQs, study notes, and AI support for Classes 1 to 10 in Odia on Utkal Skill Centre.`
          : `ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ୧ ରୁ ୧୦ ଶ୍ରେଣୀ ପାଇଁ ଓଡ଼ିଆ ମିଡିୟମ୍ ସ୍କୁଲ୍ ବହି, ସମାଧାନ, MCQ ଏବଂ ଏଆଇ ଶିକ୍ଷକ ଗୁଣ୍ଡୁଲୁ ସହ ପାଠପଢ଼ନ୍ତୁ।`;

        let schemaData: any = null;

        if (selectedSubject && !selectedChapter) {
          const subMeta = SUBJECT_METADATA[selectedSubject.toLowerCase()];
          const subjectLabel = subMeta ? (language === 'en' ? subMeta.labelEn : subMeta.labelOr) : selectedSubject;
          title = `Class ${grade} ${subjectLabel} Odia Medium Textbook Solutions & Tests | Utkal Skill Centre`;
          desc = language === 'en'
            ? `Study Class ${grade} ${subjectLabel} on Utkal Skill Centre. Includes interactive Odia medium chapter guides, mock tests, and daily MCQs.`
            : `ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ଶ୍ରେଣୀ ${grade} ${subjectLabel} ବହି, ପ୍ରଶ୍ନର ଉତ୍ତର, ମକ ଟେଷ୍ଟ ଏବଂ MCQ ଅଭ୍ୟାସ କରନ୍ତୁ।`;

          schemaData = {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": `Class ${grade} ${subjectLabel} - Odia Medium`,
            "description": desc,
            "provider": {
              "@type": "EducationalOrganization",
              "name": "Utkal Skill Centre",
              "sameAs": "https://utkalskillcentre.com"
            },
            "educationalLevel": `Class ${grade}`,
            "typicalAgeRange": gradeInt <= 5 ? "6-11" : gradeInt <= 8 ? "11-14" : "14-16"
          };
        } else if (selectedChapter) {
          const subjectLabel = selectedChapter.subject || selectedSubject || '';
          title = `Class ${grade} ${subjectLabel} - ${selectedChapter.title} Guides & MCQs | Utkal Skill Centre`;
          desc = language === 'en'
            ? `Free solutions, textbook chapters, mock tests, and AI tutor support for Class ${grade} ${subjectLabel} Chapter: ${selectedChapter.title} on Utkal Skill Centre.`
            : `ଶ୍ରେଣୀ ${grade} ${subjectLabel} ଅଧ୍ୟାୟ: ${selectedChapter.title} ସମାଧାନ, ପରୀକ୍ଷା ପ୍ରଶ୍ନ ଏବଂ ଏଆଇ ଶିକ୍ଷକ ଗୁଣ୍ଡୁଲୁର ସାହାଯ୍ୟ ପାଆନ୍ତୁ।`;

          schemaData = {
            "@context": "https://schema.org",
            "@type": "Book",
            "name": `Class ${grade} ${subjectLabel} Solutions - ${selectedChapter.title}`,
            "bookFormat": "https://schema.org/EBook",
            "publisher": {
              "@type": "EducationalOrganization",
              "name": "Utkal Skill Centre"
            },
            "educationalAlignment": {
              "@type": "AlignmentObject",
              "alignmentType": "educationalLevel",
              "educationalFramework": "Odisha School Education Board",
              "targetName": `Class ${grade}`
            },
            "typicalAgeRange": gradeInt === 1 ? "6-7" : gradeInt === 2 ? "7-8" : gradeInt === 3 ? "8-9" : gradeInt === 4 ? "9-10" : gradeInt === 5 ? "10-11" : gradeInt === 6 ? "11-12" : gradeInt === 7 ? "12-13" : gradeInt === 8 ? "13-14" : gradeInt === 9 ? "14-15" : "15-16"
          };
        } else {
          // General library listing page
          schemaData = {
            "@context": "https://schema.org",
            "@type": "EducationalWebSite",
            "name": "Utkal Skill Centre Digital Library",
            "description": desc,
            "url": "https://utkalskillcentre.com/digital-library",
            "educationalLevel": "Classes 1 to 10"
          };
        }

        return (
          <Helmet>
            <title>{title}</title>
            <meta name="description" content={desc} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={desc} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={window.location.href} />
            {schemaData && (
              <script type="application/ld+json">
                {JSON.stringify(schemaData)}
              </script>
            )}
          </Helmet>
        );
      })()}
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-teal-950/10 blur-[120px] pointer-events-none" />

      {/* HEADER BAR */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Lucide.Library size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 bg-clip-text text-transparent">
              {language === 'en' ? 'Digital Library' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ'}
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
              {language === 'en' ? 'Official School Textbooks & AI Study Buddies' : 'ସମସ୍ତ ପାଠ୍ୟପୁସ୍ତକ ଓ ଏଆଇ ଅଧ୍ୟୟନ ସାଥୀ'}
            </p>
          </div>
        </div>

        {currentView !== 'subjects' && (
          <button
            onClick={() => {
              if (currentView === 'reader') {
                setCurrentView('chapters');
                setSelectedChapter(null);
              } else {
                setCurrentView('subjects');
                setSelectedSubject('');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black transition-all active:scale-95"
          >
            <Lucide.ArrowLeft size={16} />
            <span>{language === 'en' ? 'Go Back' : 'ଫେରିଯାଆନ୍ତୁ'}</span>
          </button>
        )}
      </div>

      {/* VIEW CONTAINER */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 flex-1 flex flex-col relative z-10">
        
        {/* VIEW 1: SUBJECT TEXTBOOK SELECTOR */}
        {currentView === 'subjects' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 flex flex-col"
          >
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                {language === 'en' ? 'Academic Year 2026' : 'ଶିକ୍ଷା ବର୍ଷ ୨୦୨୬'}
              </span>
              <h2 className="text-2xl md:text-4xl font-black mt-4 text-white">
                {language === 'en' ? 'Choose a Subject Textbook' : 'ଆପଣଙ୍କର ପାଠ୍ୟପୁସ୍ତକ ବାଛନ୍ତୁ'}
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                {language === 'en' 
                  ? 'Access original textbooks instantly, read simplified AI notes, and practice interactive questions with Gundulu.' 
                  : 'ସିଧାସଳଖ ମୂଳ ବହି ପଢ଼ନ୍ତୁ, ଏଆଇ ସଂକ୍ଷିପ୍ତ ସୂତ୍ର ଦେଖନ୍ତୁ ଏବଂ ଗୁଣ୍ଡୁଲୁ ସହ ପ୍ରଶ୍ନୋତ୍ତର ଅଭ୍ୟାସ କରନ୍ତୁ।'}
              </p>
            </div>

            {/* SUBJECT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Object.entries(SUBJECT_METADATA).map(([subKey, meta]) => {
                const Icon = meta.icon;
                const userClassCode = getClassCode(user?.class);
                const classSpecificCover = `/${userClassCode}_${subKey}_cover.png`;

                return (
                  <motion.div
                    key={subKey}
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => {
                      setSelectedSubject(subKey);
                      setCurrentView('chapters');
                    }}
                    className="relative rounded-3xl bg-slate-900/40 border border-white/5 flex flex-col cursor-pointer group hover:border-emerald-500/30 overflow-hidden shadow-lg shadow-black/40 transition-all duration-300 min-h-[340px]"
                  >
                    {/* Cover Image Top Section */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-950">
                      <img
                        src={classSpecificCover}
                        alt={meta.labelEn}
                        onError={(e) => {
                          const genericUrl = window.location.origin + meta.coverImage;
                          if (e.currentTarget.src !== genericUrl) {
                            e.currentTarget.src = genericUrl;
                          } else {
                            e.currentTarget.src = getGenerativeBookCover(subKey, meta.labelEn, 1, userClassCode);
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-60 group-hover:opacity-85"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-transparent to-black/30" />
                      
                      {/* Floating Subject Icon Badge */}
                      <div className={`absolute bottom-4 left-6 p-3.5 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white shadow-lg`}>
                        <Icon size={20} />
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      {/* Cover Title */}
                      <div>
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                          {language === 'en' ? 'Digital Textbook' : 'ଡିଜିଟାଲ୍ ପାଠ୍ୟପୁସ୍ତକ'}
                        </span>
                        <h3 className="text-lg font-extrabold text-white group-hover:text-emerald-300 transition-colors mt-1">
                          {language === 'en' ? meta.labelEn : meta.labelOr}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-bold">
                          {language === 'en' ? meta.labelOr : meta.labelEn}
                        </p>
                      </div>

                      {/* Footer Progress & Enter Button */}
                      <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1.5 font-bold">
                          <Lucide.BookOpen size={14} className="text-slate-500" />
                          <span>{language === 'en' ? 'BSE Odisha' : 'BSE ଓଡ଼ିଶା'}</span>
                        </span>
                        <div className="p-2 rounded-full bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-md">
                          <Lucide.ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: CHAPTERS DIRECTORY LIST */}
        {currentView === 'chapters' && (
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            className="flex-1 flex flex-col"
          >
            {/* Subject Banner */}
            <div className={`w-full rounded-3xl p-6 md:p-8 bg-gradient-to-r ${SUBJECT_METADATA[selectedSubject]?.gradient || 'from-emerald-600 to-teal-800'} mb-8 shadow-lg relative overflow-hidden`}>
              <div className="absolute right-6 bottom-[-20%] opacity-15 text-white pointer-events-none">
                {React.createElement(SUBJECT_METADATA[selectedSubject]?.icon || Lucide.BookOpen, { size: 160 })}
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/10 border border-white/20 text-white">
                    {user?.class ? user.class.toUpperCase() : 'BSE ODISHA'}
                  </span>
                  <h2 className="text-2xl md:text-4xl font-extrabold text-white mt-3">
                    {language === 'en' 
                      ? SUBJECT_METADATA[selectedSubject]?.labelEn 
                      : SUBJECT_METADATA[selectedSubject]?.labelOr}
                  </h2>
                  <p className="text-xs md:text-sm text-white/80 mt-1 font-medium">
                    {language === 'en' 
                      ? 'Read textbook chapters or use custom bilingually simplified interactive notes.' 
                      : 'ମୂଳ ବିଷୟବସ୍ତୁ ପଢ଼ନ୍ତୁ କିମ୍ବା ଆମର ସରଳୀକୃତ ଦ୍ୱିଭାଷୀ ଟିପ୍ପଣୀ ବ୍ୟବହାର କରନ୍ତୁ।'}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <span className="text-3xl font-black text-white">{filteredChapters.length}</span>
                  <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest mt-1">
                    {language === 'en' ? 'Chapters Live' : 'ଅଧ୍ୟାୟ ପ୍ରକାଶିତ'}
                  </p>
                </div>
              </div>
            </div>

            {/* CHAPTERS DIRECTORY CONTAINER */}
            {filteredChapters.length === 0 ? (
              <div className="w-full py-16 flex flex-col items-center justify-center text-center bg-slate-900/20 border border-dashed border-white/5 rounded-3xl">
                <div className="p-4 rounded-full bg-slate-800 text-slate-500 mb-4">
                  <Lucide.BookOpenCheck size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-300">
                  {language === 'en' ? 'Chapters Uploading Soon!' : 'ଅଧ୍ୟାୟ ଶୀଘ୍ର ଉପଲବ୍ଧ ହେବ!'}
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  {language === 'en'
                    ? 'Our teachers are currently preparing premium bilingually mapped materials for this textbook.'
                    : 'ଏହି ପାଠ୍ୟପୁସ୍ତକ ପାଇଁ ଆମର ଶିକ୍ଷକମାନେ ଖୁବ୍ ଶୀଘ୍ର ସରଳ ଦ୍ୱିଭାଷୀ ଅଧ୍ୟାୟ ପ୍ରକାଶ କରିବାକୁ ଯାଉଛନ୍ତି।'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredChapters.map((chap, idx) => (
                  <motion.div
                    key={chap.id}
                    whileHover={{ scale: 1.01, border: '1px solid rgba(16,185,129,0.3)' }}
                    onClick={() => {
                      setSelectedChapter(chap);
                      setCurrentView('reader');
                      setReaderMode((chap.pdfUrl || chap.download_url || chap.driveUrl) ? 'pdf' : 'notes');
                    }}
                    className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Chapter Thumbnail Book Cover */}
                      <div className="relative h-16 w-12 rounded-xl overflow-hidden bg-slate-950 border border-white/5 flex-shrink-0 group-hover:border-emerald-500/20 transition-colors shadow-md">
                        <img
                          src={chap.coverUrl || getGenerativeBookCover(selectedSubject, chap.title, idx + 1, getClassCode(user?.class))}
                          alt="Book Cover"
                          onError={(e) => {
                            e.currentTarget.src = getGenerativeBookCover(selectedSubject, chap.title, idx + 1, getClassCode(user?.class));
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 opacity-80 group-hover:opacity-100"
                        />
                        {/* Overlay floating chapter index badge */}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[8px] font-black text-emerald-400">
                          CH {idx + 1}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-white text-sm md:text-base group-hover:text-emerald-400 transition-colors">
                          {chap.title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          {(chap.pdfUrl || chap.download_url || chap.driveUrl) && (
                            <span className="flex items-center gap-1 text-sky-400 font-bold bg-sky-400/5 px-1.5 py-0.5 rounded-md border border-sky-400/10">
                              <Lucide.FileText size={10} />
                              <span>PDF</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-400/5 px-1.5 py-0.5 rounded-md border border-emerald-400/10">
                            <Lucide.Bot size={10} />
                            <span>AI Companion</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-md active:scale-95">
                      <Lucide.ArrowRight size={18} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 3: IMMERSIVE DUAL-PANE READER & AI CHAT ROOM */}
        {currentView === 'reader' && selectedChapter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col lg:flex-row gap-6 relative"
          >
            {/* LEFT / MAIN WORKSPACE PANEL (Reader Tab & Content Panel) */}
            <div className="flex-1 flex flex-col bg-slate-900/20 border border-white/5 rounded-3xl overflow-hidden p-6 relative">
              
              {/* Premium Chapter Title Banner with Cover Thumbnail */}
              <div className="flex items-center gap-4 pb-5 mb-5 border-b border-white/5">
                <div className="relative h-16 w-12 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-md flex-shrink-0">
                  <img
                    src={selectedChapter.coverUrl || getGenerativeBookCover(selectedSubject, selectedChapter.title, 1, getClassCode(user?.class))}
                    alt="Chapter Cover"
                    onError={(e) => {
                      e.currentTarget.src = getGenerativeBookCover(selectedSubject, selectedChapter.title, 1, getClassCode(user?.class));
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/5 px-2 py-0.5 rounded-md border border-emerald-400/10">
                      {language === 'en' ? 'BSE Textbook' : 'ବିଦ୍ୟାଳୟ ପାଠ୍ୟପୁସ୍ତକ'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {SUBJECT_METADATA[selectedSubject] ? (language === 'en' ? SUBJECT_METADATA[selectedSubject].labelEn : SUBJECT_METADATA[selectedSubject].labelOr) : ''}
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-black text-white leading-tight mt-1">
                    {selectedChapter.title}
                  </h2>
                </div>
              </div>

              {/* Material Sub-header Control Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-white/5">
                  <button
                    onClick={() => setReaderMode('notes')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all ${
                      readerMode === 'notes'
                        ? 'bg-[#b34d1f] text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lucide.Sparkles size={14} />
                    <span>{language === 'en' ? 'AI Study Guide' : 'AI ଟିପ୍ପଣୀ'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (effectivePdfUrl) {
                        setReaderMode('pdf');
                      } else {
                        alert(language === 'en' ? 'Original PDF not uploaded yet. Please use the AI Study Guide!' : 'ଏହି ବିଷୟର ମୂଳ PDF ଏପର୍ଯ୍ୟନ୍ତ ଅପଲୋଡ୍ ହୋଇନାହିଁ। ଦୟାକରି AI ଟିପ୍ପଣୀ ପଢ଼ନ୍ତୁ!');
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold tracking-wider transition-all ${
                      !effectivePdfUrl ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      readerMode === 'pdf'
                        ? 'bg-[#b34d1f] text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Lucide.BookOpen size={14} />
                    <span>{language === 'en' ? 'Original Textbook' : 'ମୂଳ ପାଠ୍ୟପୁସ୍ତକ'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => setIsPdfFullScreen(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Lucide.Maximize2 size={14} />
                    <span>{language === 'en' ? 'Full Screen' : 'ପୂର୍ଣ୍ଣ ସ୍କ୍ରିନ୍'}</span>
                  </button>

                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Lucide.Notebook size={14} />
                    <span>{isSidebarOpen ? (language === 'en' ? 'Hide Notepad' : 'ନୋଟପ୍ୟାଡ୍ ଲୁଚାନ୍ତୁ') : (language === 'en' ? 'Open Notepad' : 'ନୋଟପ୍ୟାଡ୍ ଦେଖନ୍ତୁ')}</span>
                  </button>
                </div>
              </div>

              {/* SLICK COMFORT EYE SHIELD & ZOOM TOOLBAR */}
              <div className="flex items-center justify-between gap-4 mt-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/5 relative z-10 flex-nowrap text-xs">
                {/* Left side: Compact logo & title */}
                <div className="flex items-center gap-1.5">
                  <Lucide.Eye size={13} className="text-amber-400 shrink-0" />
                  <span className="font-extrabold text-[10px] sm:text-xs text-slate-400 leading-none tracking-wide">
                    {language === 'en' ? 'Eye Care' : 'ନେତ୍ର ରକ୍ଷା'}
                  </span>
                </div>

                {/* Right side: Filter & Zoom Buttons in one row */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-nowrap">
                  {/* Eye care mode filters */}
                  <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-white/5 flex-nowrap">
                    <button
                      onClick={() => setEyeCareMode('off')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all ${
                        eyeCareMode === 'off' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {language === 'en' ? 'Off' : 'ନର୍ମାଲ୍'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('sepia')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${
                        eyeCareMode === 'sepia' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/10' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {language === 'en' ? 'Shield' : 'ସୁରକ୍ଷା'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('dim')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${
                        eyeCareMode === 'dim' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/10' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Lucide.Moon size={8} />
                      {language === 'en' ? 'Night' : 'ରାତି'}
                    </button>
                  </div>

                  {/* Zoom controls with - indicator + */}
                  {readerMode === 'notes' && (
                    <div className="flex items-center bg-slate-900/60 rounded-lg border border-white/5 p-0.5 flex-nowrap">
                      <button
                        onClick={() => {
                          if (fontSize === 'xlarge') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('normal');
                        }}
                        disabled={fontSize === 'normal'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom Out' : 'ଛୋଟ କରନ୍ତୁ'}
                      >
                        -
                      </button>
                      <span className="px-1 text-[8px] font-bold text-slate-500 uppercase select-none tracking-widest font-mono">
                        {fontSize === 'normal' ? '1x' : fontSize === 'large' ? '1.5x' : '2x'}
                      </span>
                      <button
                        onClick={() => {
                          if (fontSize === 'normal') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('xlarge');
                        }}
                        disabled={fontSize === 'xlarge'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom In' : 'ବଡ଼ କରନ୍ତୁ'}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIVE READING CANVAS */}
              <div className="flex-1 mt-6 overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin scrollbar-thumb-emerald-500/10">
                {readerMode === 'notes' ? (
                  <div 
                    className={`prose max-w-none p-4 md:p-6 rounded-2xl border transition-all duration-300 ${
                      eyeCareMode === 'sepia'
                        ? 'prose-stone border-amber-900/10'
                        : 'prose-invert border-white/5 bg-slate-900/20 text-slate-200'
                    } ${
                      fontSize === 'normal' ? 'text-base leading-relaxed' :
                      fontSize === 'large' ? 'text-lg md:text-xl leading-loose font-medium' :
                      'text-xl md:text-2xl leading-loose font-semibold'
                    }`}
                    style={{
                      backgroundColor: eyeCareMode === 'sepia' ? '#fbf0d9' : undefined,
                      color: eyeCareMode === 'sepia' ? '#433422' : undefined,
                      filter: eyeCareMode === 'dim' ? 'brightness(0.7)' : undefined,
                    }}
                  >
                    <ReactMarkdown>{cleanMathNotation(selectedChapter.notes || '*No study materials added yet.*')}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="w-full h-[60vh] rounded-2xl overflow-hidden bg-slate-950 border border-white/5 flex flex-col justify-between">
                    <iframe
                      src={`${effectivePdfUrl}#toolbar=0&navpanes=0`}
                      className="w-full flex-1"
                      title={selectedChapter.title}
                    />
                    <div className="p-4 bg-slate-900/60 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {language === 'en' ? 'Having trouble viewing? Open original PDF directly:' : 'ଦେଖିବାରେ ସମସ୍ୟା ହେଉଛି? ସିଧାସଳଖ PDF ଓପନ କରନ୍ତୁ:'}
                      </span>
                      <a
                        href={effectivePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs transition-all active:scale-95"
                      >
                        <Lucide.ExternalLink size={14} />
                        <span>{language === 'en' ? 'Open PDF' : 'PDF ଓପନ୍'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM STUDENT NOTEPAD WORKSPACE */}
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 mt-6 pt-4 flex flex-col overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lucide.PenTool size={16} className="text-emerald-400 animate-pulse" />
                        <span className="text-xs font-black text-slate-300">
                          {language === 'en' ? 'Personal Study Notes' : 'ମୋର ଅଧ୍ୟୟନ ଟିପ୍ପଣୀ (ସ୍ୱତନ୍ତ୍ର)'}
                        </span>
                      </div>

                      {/* Saving Indicator */}
                      <span className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className={`h-2 w-2 rounded-full ${isNotepadSaved ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping'}`} />
                        <span className={isNotepadSaved ? 'text-slate-500' : 'text-amber-400'}>
                          {isNotepadSaved ? (language === 'en' ? 'Saved' : 'ସଂରକ୍ଷିତ') : (language === 'en' ? 'Drafting...' : 'ସଂରକ୍ଷଣ ହେଉଛି...')}
                        </span>
                      </span>
                    </div>

                    <textarea
                      value={personalNotes}
                      onChange={(e) => setPersonalNotes(e.target.value)}
                      placeholder={language === 'en' ? 'Write down important formulas, shortcuts, questions or hints here...' : 'ଅଧ୍ୟାୟର ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ପ୍ରଶ୍ନ କିମ୍ବା ହିଣ୍ଟ୍ ଏଠାରେ ଲେଖନ୍ତୁ...'}
                      className="w-full h-32 bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30 resize-none scrollbar-none"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT PANEL - GUNDULU FLOATING STUDY ASSISTANT CHATBOX */}
            <div className="w-full lg:w-96 flex flex-col bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-lg h-[65vh] lg:h-auto">
              
              {/* Gundulu Chat Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="/gundulu.png"
                      alt="Gundulu Avatar"
                      className="h-10 w-10 rounded-full border border-emerald-400/30 object-cover bg-emerald-950/20 shadow-md shadow-emerald-500/10"
                      onError={(e) => {
                        e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png'; // Fallback vector
                      }}
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#011e1a] shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1">
                      <span>{language === 'en' ? 'Gundulu AI Tutor' : 'ଗୁଣ୍ଡୁଲୁ ଏଆଈ ସାଥୀ'}</span>
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider">
                      {language === 'en' ? 'Online Helper' : 'ସର୍ବଦା ପ୍ରସ୍ତୁତ'}
                    </p>
                  </div>
                </div>

                {isPremium && (
                  <button
                    type="button"
                    onClick={() => setIsChatFullScreen(true)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/20 transition-all active:scale-95"
                    title={language === 'en' ? 'Maximize Chat' : 'ଚାଟ୍ ବଡ଼ କରନ୍ତୁ'}
                  >
                    <Lucide.Maximize2 size={16} />
                  </button>
                )}
              </div>

              {!isPremium ? (
                /* GUNDULU SUBSCRIPTION LOCK OVERLAY */
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 backdrop-blur-md space-y-6">
                  <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5 animate-pulse">
                    <Lucide.Lock size={28} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-extrabold text-white">
                      {language === 'en' ? 'Unlock Gundulu AI Tutor' : 'ଗୁଣ୍ଡୁଲୁ AI ଟ୍ୟୁଟର ଅନଲକ୍ କରନ୍ତୁ'}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                      {language === 'en' 
                        ? 'Chat with Gundulu to solve doubts, explain formulas, and get custom practice tests!' 
                        : 'ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହୋଇ ସବୁ ଗଣିତ ପ୍ରଶ୍ନର ସମାଧାନ, ସୂତ୍ର ଏବଂ ସ୍ପେସାଲ୍ ଟେଷ୍ଟ ପାଆନ୍ତୁ!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpgrade) {
                        onUpgrade();
                      } else {
                        alert(language === 'en' ? 'Please upgrade your plan from the profile dashboard!' : 'ଦୟାକରି ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ଡ୍ୟାସବୋର୍ଡରୁ ପ୍ଲାନ୍ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!');
                      }
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black tracking-wider uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Lucide.Sparkles size={14} />
                    <span>{language === 'en' ? 'Unlock Premium Now' : 'ପ୍ରିମିୟମ୍ ଅନଲକ୍ କରନ୍ତୁ'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* GUNDULU CONVERSATION WATERFALL */}
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/10">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'gundulu' && (
                          <img
                            src="/gundulu.png"
                            alt="Gundulu"
                            className="h-6.5 w-6.5 rounded-full border border-emerald-500/10 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                            }}
                          />
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl p-3.5 leading-relaxed shadow-sm border ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white rounded-br-none text-xs font-semibold'
                              : 'gundulu-chat-bubble bg-slate-900/90 border-emerald-500/20 text-slate-100 rounded-bl-none text-[13px] font-semibold tracking-wide [&_strong]:text-emerald-400 [&_strong]:font-bold [&_code]:bg-slate-950 [&_code]:text-emerald-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1'
                          }`}
                        >
                          <ReactMarkdown>{cleanMathNotation(msg.text)}</ReactMarkdown>
                        </div>
                      </div>
                    ))}

                    {isAiLoading && (
                      <div className="flex items-end gap-2.5 justify-start">
                        <img
                          src="/gundulu.png"
                          alt="Gundulu"
                          className="h-6.5 w-6.5 rounded-full animate-bounce"
                          onError={(e) => {
                            e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                          }}
                        />
                        <div className="bg-slate-950 border border-white/5 rounded-2xl rounded-bl-none p-3.5 shadow-sm">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* QUICK CHIPS SUGGESTIONS */}
                  <div className="p-3 bg-slate-950/60 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Summarize this chapter for me." : "ଏହି ଅଧ୍ୟାୟର ଏକ ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଦିଅ।")}
                      className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] font-bold text-slate-300 active:scale-95 transition-all"
                    >
                      📝 {language === 'en' ? 'Summarize Guide' : 'ସାରାଂଶ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Give me an MCQ test based on this chapter notes." : "ଏହି ଅଧ୍ୟାୟରୁ ମୋତେ ଗୋଟିଏ MCQ ଟେଷ୍ଟ ପ୍ରଶ୍ନ ପଚାର।")}
                      className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] font-bold text-slate-300 active:scale-95 transition-all"
                    >
                      ⚡ {language === 'en' ? 'Ask me MCQ' : 'MCQ ପ୍ରଶ୍ନ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Explain the most important formulas of this chapter." : "ଏହି ଅଧ୍ୟାୟର ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ରଗୁଡ଼ିକ ବୁଝାଅ।")}
                      className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-[10px] font-bold text-slate-300 active:scale-95 transition-all"
                    >
                      📐 {language === 'en' ? 'Explain Formulas' : 'ମୁଖ୍ୟ ସୂତ୍ର'}
                    </button>
                  </div>

                  {/* Gundulu Chat Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendToGundulu(inputValue);
                    }}
                    className="p-3 bg-slate-950 border-t border-white/5 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={language === 'en' ? 'Ask Gundulu about this chapter...' : 'ଏହି ଅଧ୍ୟାୟ ବିଷୟରେ ଗຸଣ୍ଡୁଲୁକୁ ପଚାରନ୍ତୁ...'}
                      className="gundulu-chat-input flex-1 bg-slate-900 border border-white/5 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isAiLoading}
                      className="p-2.5 rounded-2xl bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center"
                    >
                      <Lucide.Send size={16} />
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ULTRA-PREMIUM IMMERSIVE FULL-SCREEN READER OVERLAY */}
        <AnimatePresence>
          {isPdfFullScreen && selectedChapter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col p-4 md:p-6 font-sans overflow-hidden"
              style={{
                filter: eyeCareMode === 'dim' ? 'brightness(0.7)' : undefined,
              }}
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Lucide.BookOpen size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest leading-none block">
                      {selectedChapter.subject} • {language === 'en' ? 'Chapter' : 'ଅଧ୍ୟାୟ'} {selectedChapter.chapterIndex || 1}
                    </span>
                    <h2 className="text-sm md:text-lg font-black text-white mt-1 leading-tight">
                      {selectedChapter.title}
                    </h2>
                  </div>
                </div>

                {/* Real-time Inline Eye Care controls in Full Screen! */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Eye care toggles */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setEyeCareMode('off')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all ${
                        eyeCareMode === 'off' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {language === 'en' ? 'Off' : 'ନର୍ମାଲ୍'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('sepia')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${
                        eyeCareMode === 'sepia' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/15' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {language === 'en' ? 'Shield' : 'ସୁରକ୍ଷା'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('dim')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${
                        eyeCareMode === 'dim' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/15' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Lucide.Moon size={8} />
                      {language === 'en' ? 'Night' : 'ରାତି'}
                    </button>
                  </div>

                  {/* Font scale toggles */}
                  {readerMode === 'notes' && (
                    <div className="flex items-center bg-slate-900 rounded-lg border border-white/5 p-0.5">
                      <button
                        onClick={() => {
                          if (fontSize === 'xlarge') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('normal');
                        }}
                        disabled={fontSize === 'normal'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom Out' : 'ଛୋଟ କରନ୍ତୁ'}
                      >
                        -
                      </button>
                      <span className="px-1 text-[8px] font-bold text-slate-500 uppercase select-none tracking-widest font-mono">
                        {fontSize === 'normal' ? '1x' : fontSize === 'large' ? '1.5x' : '2x'}
                      </span>
                      <button
                        onClick={() => {
                          if (fontSize === 'normal') setFontSize('large');
                          else if (fontSize === 'large') setFontSize('xlarge');
                        }}
                        disabled={fontSize === 'xlarge'}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title={language === 'en' ? 'Zoom In' : 'ବଡ଼ କରନ୍ତୁ'}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Exit fullscreen button */}
                  <button
                    onClick={() => setIsPdfFullScreen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-black text-xs transition-all active:scale-95 border border-red-500/10 shadow-lg"
                  >
                    <Lucide.Minimize2 size={14} />
                    <span>{language === 'en' ? 'Exit' : 'ବନ୍ଦ କରନ୍ତୁ'}</span>
                  </button>
                </div>
              </div>

              {/* Fullscreen Reading Canvas */}
              <div className="flex-1 overflow-y-auto mt-6 pr-2 scrollbar-thin scrollbar-thumb-emerald-500/10">
                {readerMode === 'notes' ? (
                  <div 
                    className={`prose max-w-none p-6 md:p-10 rounded-2xl border transition-all duration-300 ${
                      eyeCareMode === 'sepia'
                        ? 'prose-stone border-amber-900/10 shadow-lg shadow-amber-950/5'
                        : 'prose-invert border-white/5 bg-slate-900/20 text-slate-200'
                    } ${
                      fontSize === 'normal' ? 'text-base leading-relaxed' :
                      fontSize === 'large' ? 'text-lg md:text-xl leading-loose font-medium' :
                      'text-xl md:text-2xl leading-loose font-semibold'
                    }`}
                    style={{
                      backgroundColor: eyeCareMode === 'sepia' ? '#fbf0d9' : undefined,
                      color: eyeCareMode === 'sepia' ? '#433422' : undefined,
                    }}
                  >
                    <ReactMarkdown>{cleanMathNotation(selectedChapter.notes || '*No study materials added yet.*')}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-white/5 flex flex-col justify-between">
                    <iframe
                      src={`${effectivePdfUrl}#toolbar=0&navpanes=0`}
                      className="w-full flex-1"
                      title={selectedChapter.title}
                    />
                    <div className="p-4 bg-slate-950 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {language === 'en' ? 'Original PDF Textbook Reader' : 'ମୂଳ ପାଠ୍ୟପୁସ୍ତକ ପାଠକ'}
                      </span>
                      <a
                        href={effectivePdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all active:scale-95"
                      >
                        <Lucide.ExternalLink size={14} />
                        <span>{language === 'en' ? 'Download Original' : 'ମୂଳ PDF ଡାଉନଲୋଡ୍'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ULTRA-PREMIUM IMMERSIVE FULL-SCREEN GUNDULU CHAT OVERLAY */}
        <AnimatePresence>
          {isChatFullScreen && selectedChapter && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col p-4 md:p-6 font-sans overflow-hidden"
              style={{
                filter: eyeCareMode === 'dim' ? 'brightness(0.7)' : undefined,
              }}
            >
              {/* Header Panel */}
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="/gundulu.png"
                      alt="Gundulu Avatar"
                      className="h-10 w-10 rounded-full border border-emerald-400/30 object-cover bg-emerald-950/20 shadow-md shadow-emerald-500/10"
                      onError={(e) => {
                        e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                      }}
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-[#011e1a] shadow-[0_0_8px_#34d399]" />
                  </div>
                  <div>
                    <h2 className="text-sm md:text-lg font-black text-white leading-tight flex items-center gap-2">
                      <span>{language === 'en' ? 'Gundulu AI Chat Room' : 'ଗୁଣ୍ଡୁଲୁ ଏଆଈ ଚାଟ୍ ରୁମ୍'}</span>
                      <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-widest font-black">
                        {language === 'en' ? 'Active' : 'ସକ୍ରିୟ'}
                      </span>
                    </h2>
                    <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1">
                      {language === 'en' ? 'Topic:' : 'ଅଧ୍ୟାୟ:'} {selectedChapter.title}
                    </p>
                  </div>
                </div>

                {/* Controls in Full Screen Chat */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Eye care toggles */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
                    <button
                      onClick={() => setEyeCareMode('off')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all ${
                        eyeCareMode === 'off' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {language === 'en' ? 'Off' : 'ନର୍ମାଲ୍'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('sepia')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${
                        eyeCareMode === 'sepia' ? 'bg-amber-600/20 text-amber-300 border border-amber-500/15' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      {language === 'en' ? 'Shield' : 'ସୁରକ୍ଷା'}
                    </button>
                    <button
                      onClick={() => setEyeCareMode('dim')}
                      className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all flex items-center gap-0.5 ${
                        eyeCareMode === 'dim' ? 'bg-purple-600/20 text-purple-300 border border-purple-500/15' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Lucide.Moon size={8} />
                      {language === 'en' ? 'Night' : 'ରାତି'}
                    </button>
                  </div>

                  {/* Exit fullscreen chat button */}
                  <button
                    onClick={() => setIsChatFullScreen(false)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-black text-xs transition-all active:scale-95 border border-red-500/10 shadow-lg"
                  >
                    <Lucide.Minimize2 size={14} />
                    <span>{language === 'en' ? 'Exit Chat' : 'ଚାଟ୍ ବନ୍ଦ କରନ୍ତୁ'}</span>
                  </button>
                </div>
              </div>

              {/* Main Split workspace */}
              <div className="flex-1 flex gap-6 mt-6 overflow-hidden min-h-0">
                {/* Left study guide panel */}
                <div 
                  className={`hidden lg:flex flex-col w-[35%] rounded-3xl border p-6 overflow-y-auto transition-all duration-300 ${
                    eyeCareMode === 'sepia'
                      ? 'prose-stone border-amber-900/10 shadow-lg'
                      : 'border-white/5 bg-slate-900/20'
                  }`}
                  style={{
                    backgroundColor: eyeCareMode === 'sepia' ? '#fbf0d9' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
                    <Lucide.Sparkles size={16} className="text-emerald-400" />
                    <span className={`text-xs font-black ${eyeCareMode === 'sepia' ? 'text-amber-900' : 'text-slate-300'}`}>
                      {language === 'en' ? 'Chapter Study Notes Reference' : 'ଅଧ୍ୟାୟ ଅଧ୍ୟୟନ ନୋଟ୍'}
                    </span>
                  </div>
                  <div 
                    className={`prose max-w-none ${
                      eyeCareMode === 'sepia' ? 'prose-stone text-amber-950' : 'prose-invert text-slate-300'
                    } text-xs leading-relaxed`}
                  >
                    <ReactMarkdown>{cleanMathNotation(selectedChapter.notes || '*No study materials added yet.*')}</ReactMarkdown>
                  </div>
                </div>

                {/* Right Chat panel */}
                <div className="flex-1 flex flex-col bg-slate-900/20 border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative h-full">
                  {/* Chat messages waterfall */}
                  <div 
                    className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/10"
                    style={{
                      backgroundColor: eyeCareMode === 'sepia' ? '#f5e9ce' : undefined,
                    }}
                  >
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.sender === 'gundulu' && (
                          <img
                            src="/gundulu.png"
                            alt="Gundulu"
                            className="h-8 w-8 rounded-full border border-emerald-500/10 shadow-sm"
                            onError={(e) => {
                              e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                            }}
                          />
                        )}
                        <div
                          className={`max-w-[75%] rounded-2xl p-4 leading-relaxed shadow-sm border ${
                            msg.sender === 'user'
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent text-white rounded-br-none text-xs font-semibold'
                              : `gundulu-chat-bubble border-emerald-500/20 rounded-bl-none text-sm font-semibold tracking-wide [&_strong]:text-emerald-400 [&_strong]:font-bold [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 ${
                                  eyeCareMode === 'sepia' 
                                    ? 'bg-amber-100 text-amber-950 border-amber-900/15 [&_code]:bg-amber-200 [&_code]:text-emerald-800' 
                                    : 'bg-slate-900/90 text-slate-100 [&_code]:bg-slate-950 [&_code]:text-emerald-300'
                                }`
                          }`}
                        >
                          <ReactMarkdown>{cleanMathNotation(msg.text)}</ReactMarkdown>
                        </div>
                      </div>
                    ))}

                    {isAiLoading && (
                      <div className="flex items-end gap-2.5 justify-start">
                        <img
                          src="/gundulu.png"
                          alt="Gundulu"
                          className="h-8 w-8 rounded-full animate-bounce"
                          onError={(e) => {
                            e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                          }}
                        />
                        <div className={`border rounded-2xl rounded-bl-none p-4 shadow-sm ${
                          eyeCareMode === 'sepia' ? 'bg-amber-100 border-amber-900/10' : 'bg-slate-950 border-white/5'
                        }`}>
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QUICK CHIPS SUGGESTIONS */}
                  <div className="p-4 bg-slate-950 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Summarize this chapter for me." : "ଏହି ଅଧ୍ୟାୟର ଏକ ସଂକ୍ଷିପ୍ତ ସାରାଂଶ ଦିଅ।")}
                      className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold text-slate-300 active:scale-95 transition-all"
                    >
                      📝 {language === 'en' ? 'Summarize Guide' : 'ସାରାଂଶ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Give me an MCQ test based on this chapter notes." : "ଏହି ଅଧ୍ୟାୟରୁ ମୋତେ ଗୋଟିଏ MCQ ଟେଷ୍ଟ ପ୍ରଶ୍ନ ପଚାର।")}
                      className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold text-slate-300 active:scale-95 transition-all"
                    >
                      ⚡ {language === 'en' ? 'Ask me MCQ' : 'MCQ ପ୍ରଶ୍ନ'}
                    </button>
                    <button
                      onClick={() => handleSendToGundulu(language === 'en' ? "Explain the most important formulas of this chapter." : "ଏହି ଅଧ୍ୟାୟର ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ରଗୁଡ଼ିକ ବୁଝାଅ।")}
                      className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/5 text-xs font-bold text-slate-300 active:scale-95 transition-all"
                    >
                      📐 {language === 'en' ? 'Explain Formulas' : 'ମୁଖ୍ୟ ସୂତ୍ର'}
                    </button>
                  </div>

                  {/* Chat Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendToGundulu(inputValue);
                    }}
                    className="p-4 bg-slate-950 border-t border-white/5 flex items-center gap-3"
                  >
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={language === 'en' ? 'Ask Gundulu about this chapter...' : 'ଏହି ଅଧ୍ୟାୟ ବିଷୟରେ ଗୁଣ୍ଡୁଲୁକୁ ପଚାରନ୍ତୁ...'}
                      className="flex-1 bg-slate-900 border border-white/5 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isAiLoading}
                      className="p-3.5 rounded-2xl bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                    >
                      <Lucide.Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
