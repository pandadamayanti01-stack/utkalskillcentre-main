import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Download,
  Edit,
  Eye,
  RefreshCw,
  BookOpen,
  Image as ImageIcon,
  Bot,
  CheckCircle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { CLASS_SUBJECTS } from './DigitalLibraryView';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

function getSubjectCategory(subjectKey: string): 'math' | 'science' | 'social' | 'language' | 'skills' {
  const key = subjectKey.toLowerCase();
  
  if (key.includes('ganita') || key === 'algebra' || key === 'geometry' || key.includes('math')) {
    return 'math';
  }
  if (key.includes('science') || key.includes('jigyasa') || key.includes('paribesa') || key.includes('life') || key.includes('physical') || key.includes('surrounding')) {
    return 'science';
  }
  if (key.includes('social') || key.includes('geography') || key.includes('history') || key === 'samajika_bignana' || key === 'geography') {
    return 'social';
  }
  if (key.includes('kausala') || key.includes('vocational') || key.includes('art') || key.includes('sikhya') || key.includes('khela') || key.includes('sharirika') || key.includes('yoga') || key.includes('palette') || key.includes('wellness')) {
    return 'skills';
  }
  return 'language';
}

function getSubjectIconTypes(subjectKey: string): string[] {
  const cat = getSubjectCategory(subjectKey);
  if (cat === 'math') {
    return ['axes', 'triangle', 'circle', 'matrix', 'integral', 'axes', 'triangle', 'matrix', 'circle', 'axes'];
  }
  if (cat === 'science') {
    return ['beaker', 'atom', 'dna', 'bulb', 'magnet', 'lens', 'prism', 'concave_mirror', 'beaker', 'atom'];
  }
  if (cat === 'language') {
    return ['book', 'quill', 'school', 'book', 'quill', 'school', 'book', 'quill', 'book', 'school'];
  }
  if (cat === 'skills') {
    return ['axes', 'bulb', 'school', 'matrix', 'axes', 'bulb', 'school', 'matrix', 'axes', 'bulb'];
  }
  return ['globe', 'mountain', 'river', 'temple', 'globe', 'mountain', 'river', 'temple', 'globe', 'mountain'];
}

interface QuestionItem {
  id: number;
  question: string;
  answer: string;
  sideNote: string;
  sideNoteLabel: 'Important!' | 'Key Fact' | 'Remember!' | 'Note' | 'Did You Know!' | 'Formula!';
  iconType: string;
}

interface SubjectTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  lightBg: string;
  darkTextColor: string;
  ruledColor: string;
  glowClass: string;
  badgeBg: string;
}

const SUBJECT_THEMES: Record<'math' | 'science' | 'social' | 'language' | 'skills', SubjectTheme> = {
  language: {
    primaryColor: '#1E3A8A',
    secondaryColor: '#B45309',
    accentColor: '#EF4444',
    lightBg: '#FFFBEB',
    darkTextColor: '#0F172A',
    ruledColor: '#60A5FA',
    glowClass: 'shadow-[0_0_40px_rgba(245,158,11,0.15)] border-amber-500/20',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  },
  math: {
    primaryColor: '#334155',
    secondaryColor: '#B91C1C',
    accentColor: '#0284C7',
    lightBg: '#F8FAFC',
    darkTextColor: '#1E293B',
    ruledColor: '#94A3B8',
    glowClass: 'shadow-[0_0_40px_rgba(14,165,233,0.15)] border-sky-500/20',
    badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
  },
  science: {
    primaryColor: '#064E3B',
    secondaryColor: '#059669',
    accentColor: '#D97706',
    lightBg: '#F0FDF4',
    darkTextColor: '#064E3B',
    ruledColor: '#86EFAC',
    glowClass: 'shadow-[0_0_40px_rgba(16,185,129,0.15)] border-emerald-500/20',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  social: {
    primaryColor: '#78350F',
    secondaryColor: '#D97706',
    accentColor: '#DC2626',
    lightBg: '#FFF7ED',
    darkTextColor: '#451A03',
    ruledColor: '#FDBA74',
    glowClass: 'shadow-[0_0_40px_rgba(249,115,22,0.15)] border-orange-500/20',
    badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30'
  },
  skills: {
    primaryColor: '#0F172A',
    secondaryColor: '#0D9488',
    accentColor: '#10B981',
    lightBg: '#F0FDFA',
    darkTextColor: '#0F172A',
    ruledColor: '#93C5FD',
    glowClass: 'shadow-[0_0_40px_rgba(20,184,166,0.15)] border-teal-500/20',
    badgeBg: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
  }
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    let testLine = currentLine + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(currentLine.trim());
      currentLine = words[n] + ' ';
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine.trim());
  return lines;
}

function getIconEmoji(type: string): string {
  const map: Record<string, string> = {
    temple: '🛕',
    flower: '🌼',
    mountain: '🏔️',
    dance: '💃',
    leader: '🧔',
    river: '🏞️',
    sand: '🏖️',
    school: '🏫',
    book: '📖',
    deer: '🦌',
    mirror: '🪞',
    lens: '🔍',
    prism: '🔺',
    magnet: '🧲',
    concave_mirror: '🪞',
    axes: '📊',
    triangle: '📐',
    circle: '⭕',
    matrix: '🔢',
    integral: '⨜',
    beaker: '🧪',
    atom: '⚛️',
    dna: '🧬',
    bulb: '💡',
    globe: '🌐',
    quill: '✒️'
  };
  return map[type] || '✨';
}



export function SocialPosterGenerator({ chapters, onBack }: { chapters?: any[]; onBack: () => void }) {
  const [dateStr, setDateStr] = useState<string>('17/06/2026'); // Today's date
  const [pageNo, setPageNo] = useState<string>('001');
  const [selectedSubject, setSelectedSubject] = useState<string>('algebra');
  const [titleText, setTitleText] = useState<string>('');
  const [subtitleText, setSubtitleText] = useState<string>('');
  const [footerText, setFooterText] = useState<string>('UTKAL SKILL CENTRE • ପଢ଼ିବ ଓଡ଼ିଶା, ବଢ଼ିବ ଓଡ଼ିଶା');
  const [badgeText, setBadgeText] = useState<string>('SET-01');
  const [logoImage, setLogoImage] = useState<string | null>('/utkal-512.png');

  // Dynamic Textbook Selection states
  const [selectedClass, setSelectedClass] = useState<string>('class10');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);

  const DEFAULT_BLANK_QUESTIONS: QuestionItem[] = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    question: '',
    answer: '',
    sideNote: '',
    sideNoteLabel: 'Key Fact',
    iconType: 'book'
  }));

  const [questions, setQuestions] = useState<QuestionItem[]>(DEFAULT_BLANK_QUESTIONS);
  const [generating, setGenerating] = useState<boolean>(false);
  const [loadedChapters, setLoadedChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(false);

  // Dynamic Google Font Injection
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Kalam:wght@400;700&family=Outfit:wght@400;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Fetch chapters from Firestore when selectedClass or selectedSubject changes
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedClass || !selectedSubject) return;
      setLoadingChapters(true);
      try {
        const q = query(
          collection(db, 'chapters'),
          where('class', '==', selectedClass),
          where('subject', '==', selectedSubject),
          where('status', '==', 'published')
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLoadedChapters(docs);
      } catch (err) {
        console.error("Error fetching chapters:", err);
      } finally {
        setLoadingChapters(false);
      }
    };
    fetchChapters();
  }, [selectedClass, selectedSubject]);

  const theme = SUBJECT_THEMES[getSubjectCategory(selectedSubject)] || SUBJECT_THEMES.math;
  const activeSubjects = CLASS_SUBJECTS[selectedClass] || [];

  // Filter available textbook chapters matching Class & Subject
  const availableChapters = loadedChapters;

  const handleLoadChapterQuestions = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    if (!chapterId) {
      setQuestions(DEFAULT_BLANK_QUESTIONS);
      setTitleText('');
      setSubtitleText('');
      return;
    }

    const chapter = availableChapters.find(c => c.id === chapterId);
    if (chapter) {
      const displayTitle = typeof chapter.title === 'string'
        ? chapter.title
        : (chapter.title?.or || chapter.title?.en || "Untitled Chapter");
      
      const questionsList = chapter.quiz_questions || chapter.mcqs;
      if (questionsList && Array.isArray(questionsList) && questionsList.length > 0) {
        const mappedQuestions = questionsList.slice(0, 10).map((q: any, index: number) => {
          let ansText = '';
          if (q.options && Array.isArray(q.options)) {
            const ansIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
            ansText = q.options[ansIndex] || q.correct_answer || '';
          } else {
            ansText = q.answer || q.correct_answer || '';
          }

          const defaultSideNotes = [
            { label: 'Remember!', text: 'Important for school exams.' },
            { label: 'Key Fact', text: 'Based on official syllabus.' },
            { label: 'Note', text: 'Practice steps on your notebook.' },
            { label: 'Did You Know!', text: 'Standard board question.' },
            { label: 'Important!', text: 'Commonly asked problem.' }
          ];
          const note = defaultSideNotes[index % defaultSideNotes.length];
          const subjectIcons = getSubjectIconTypes(selectedSubject);

          return {
            id: index + 1,
            question: q.question || '',
            answer: ansText || '',
            sideNote: q.sideNote || note.text,
            sideNoteLabel: (q.sideNoteLabel || note.label) as any,
            iconType: (q.iconType || subjectIcons[index % subjectIcons.length] || 'book') as any
          };
        });

        const fullList = [...mappedQuestions];
        const subjectIcons = getSubjectIconTypes(selectedSubject);
        while (fullList.length < 10) {
          fullList.push({
            id: fullList.length + 1,
            question: '',
            answer: '',
            sideNote: '',
            sideNoteLabel: 'Note',
            iconType: (subjectIcons[fullList.length % subjectIcons.length]) as any
          });
        }
        setQuestions(fullList);
      } else {
        setQuestions(DEFAULT_BLANK_QUESTIONS);
      }
      
      setTitleText(displayTitle.toUpperCase());
      setSubtitleText(`Class ${selectedClass.replace('class', '')} ${selectedSubject.toUpperCase()} Revision`);
    }
  };

  const handleAiGenerateQuestions = async () => {
    if (!selectedChapterId) {
      alert("Please select a chapter first!");
      return;
    }
    const chapter = availableChapters.find(c => c.id === selectedChapterId);
    if (!chapter) return;

    setGeneratingAi(true);
    try {
      const response = await fetch('/api/ai/generate-revision-poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: selectedClass,
          subjectName: selectedSubject,
          chapterName: chapter.title,
          language: selectedSubject === 'odia' ? 'or' : 'en'
        })
      });

      if (!response.ok) {
        throw new Error("AI Endpoint returned error");
      }

      const data = await response.json();
      if (data && data.questions && Array.isArray(data.questions)) {
        const subjectIcons = getSubjectIconTypes(selectedSubject);
        const mapped = data.questions.map((q: any, index: number) => ({
          id: index + 1,
          question: q.question || '',
          answer: q.answer || '',
          sideNote: q.sideNote || '',
          sideNoteLabel: q.sideNoteLabel || 'Note',
          iconType: q.iconType || subjectIcons[index % subjectIcons.length]
        }));

        const fullList = [...mapped];
        while (fullList.length < 10) {
          fullList.push({
            id: fullList.length + 1,
            question: '',
            answer: '',
            sideNote: '',
            sideNoteLabel: 'Note',
            iconType: (subjectIcons[fullList.length % subjectIcons.length]) as any
          });
        }
        setQuestions(fullList);

        setTitleText(chapter.title?.toUpperCase() || 'AI REVISION QUESTIONS');
        setSubtitleText(`Class ${selectedClass.replace('class', '')} ${selectedSubject.toUpperCase()} AI Revision`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to auto-generate questions using Gemini. Please try manual entry.");
    } finally {
      setGeneratingAi(false);
    }
  };

  const updateQuestion = (id: number, field: keyof QuestionItem, value: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const drawSketchIcon = (ctx: CanvasRenderingContext2D, type: string, x: number, y: number) => {
    ctx.save();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const wobble = (val: number, amp = 1.8) => val + (Math.random() - 0.5) * amp;

    if (type === 'temple') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.quadraticCurveTo(wobble(x + 22), wobble(y + 45), wobble(x + 22), wobble(y + 60));
      ctx.lineTo(wobble(x + 58), wobble(y + 60));
      ctx.quadraticCurveTo(wobble(x + 58), wobble(y + 45), wobble(x + 40), wobble(y + 12));
      ctx.stroke();

      for (let r = 26; r < 60; r += 12) {
        ctx.beginPath();
        ctx.moveTo(wobble(x + 26), wobble(y + r));
        ctx.lineTo(wobble(x + 54), wobble(y + r));
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.lineTo(wobble(x + 40), wobble(y + 2));
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 2));
      ctx.lineTo(wobble(x + 54), wobble(y + 6));
      ctx.lineTo(wobble(x + 40), wobble(y + 10));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'flower') {
      ctx.fillStyle = '#FBBF24';
      const cx = x + 40;
      const cy = y + 30;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        const px = cx + Math.cos(a) * 14;
        const py = cy + Math.sin(a) * 14;
        ctx.beginPath();
        ctx.arc(wobble(px), wobble(py), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 8));
      ctx.quadraticCurveTo(wobble(cx - 5), wobble(cy + 30), wobble(cx - 2), wobble(y + 62));
      ctx.stroke();
    } else if (type === 'mountain') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 15), wobble(y + 60));
      ctx.lineTo(wobble(x + 40), wobble(y + 15));
      ctx.lineTo(wobble(x + 65), wobble(y + 60));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 35), wobble(y + 60));
      ctx.lineTo(wobble(x + 55), wobble(y + 25));
      ctx.lineTo(wobble(x + 75), wobble(y + 60));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 32), wobble(y + 28));
      ctx.lineTo(wobble(x + 40), wobble(y + 32));
      ctx.lineTo(wobble(x + 46), wobble(y + 28));
      ctx.stroke();
    } else if (type === 'dance') {
      const cx = x + 40;
      const cy = y + 20;
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 6));
      ctx.lineTo(wobble(cx), wobble(cy + 24));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 10));
      ctx.lineTo(wobble(cx - 16), wobble(cy + 8));
      ctx.lineTo(wobble(cx - 16), wobble(y + 4));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 10));
      ctx.lineTo(wobble(cx + 16), wobble(cy + 8));
      ctx.lineTo(wobble(cx + 16), wobble(y + 4));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 24));
      ctx.lineTo(wobble(cx - 14), wobble(cy + 36));
      ctx.lineTo(wobble(cx - 12), wobble(y + 60));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 24));
      ctx.lineTo(wobble(cx + 14), wobble(cy + 36));
      ctx.lineTo(wobble(cx + 12), wobble(y + 60));
      ctx.stroke();
    } else if (type === 'leader') {
      const cx = x + 40;
      const cy = y + 30;
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy - 6), 13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(wobble(cx - 5), wobble(cy - 8), 3.5, 0, Math.PI * 2);
      ctx.arc(wobble(cx + 5), wobble(cy - 8), 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(cx - 1.5), wobble(cy - 8));
      ctx.lineTo(wobble(cx + 1.5), wobble(cy - 8));
      ctx.stroke();

      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(wobble(cx - 8), wobble(cy + 1));
      ctx.quadraticCurveTo(wobble(cx), wobble(cy + 4), wobble(cx + 8), wobble(cy + 1));
      ctx.stroke();
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(wobble(cx - 12), wobble(cy + 7));
      ctx.quadraticCurveTo(wobble(cx - 24), wobble(cy + 22), wobble(cx - 26), wobble(y + 60));
      ctx.lineTo(wobble(cx + 26), wobble(y + 60));
      ctx.quadraticCurveTo(wobble(cx + 24), wobble(cy + 22), wobble(cx + 12), wobble(cy + 7));
      ctx.stroke();
    } else if (type === 'river') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 10), wobble(y + 18));
      ctx.bezierCurveTo(wobble(x + 30), wobble(y + 8), wobble(x + 50), wobble(y + 54), wobble(x + 70), wobble(y + 44));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 10), wobble(y + 36));
      ctx.bezierCurveTo(wobble(x + 30), wobble(y + 26), wobble(x + 50), wobble(y + 72), wobble(x + 70), wobble(y + 62));
      ctx.stroke();
    } else if (type === 'sand') {
      const cx = x + 40;
      const cy = y + 32;
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 5, 0, Math.PI * 2);
      ctx.stroke();

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wobble(cx + Math.cos(a) * 5), wobble(cy + Math.sin(a) * 5));
        ctx.lineTo(wobble(cx + Math.cos(a) * 22), wobble(cy + Math.sin(a) * 22));
        ctx.stroke();
      }
    } else if (type === 'school') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 15), wobble(y + 60));
      ctx.lineTo(wobble(x + 15), wobble(y + 28));
      ctx.quadraticCurveTo(wobble(x + 40), wobble(y + 8), wobble(x + 65), wobble(y + 28));
      ctx.lineTo(wobble(x + 65), wobble(y + 60));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 28), wobble(y + 60));
      ctx.lineTo(wobble(x + 28), wobble(y + 38));
      ctx.quadraticCurveTo(wobble(x + 40), wobble(y + 26), wobble(x + 52), wobble(y + 38));
      ctx.lineTo(wobble(x + 52), wobble(y + 60));
      ctx.stroke();
    } else if (type === 'book') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 52));
      ctx.quadraticCurveTo(wobble(x + 25), wobble(y + 40), wobble(x + 12), wobble(y + 46));
      ctx.lineTo(wobble(x + 12), wobble(y + 16));
      ctx.quadraticCurveTo(wobble(x + 25), wobble(y + 10), wobble(x + 40), wobble(y + 22));
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 22));
      ctx.quadraticCurveTo(wobble(x + 55), wobble(y + 10), wobble(x + 68), wobble(y + 16));
      ctx.lineTo(wobble(x + 68), wobble(y + 46));
      ctx.quadraticCurveTo(wobble(x + 55), wobble(y + 40), wobble(x + 40), wobble(y + 52));
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'deer') {
      const cx = x + 40;
      const cy = y + 38;
      ctx.beginPath();
      ctx.moveTo(wobble(cx - 9), wobble(cy - 9));
      ctx.lineTo(wobble(cx + 9), wobble(cy - 9));
      ctx.lineTo(wobble(cx), wobble(cy + 16));
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx - 5), wobble(cy - 9));
      ctx.lineTo(wobble(cx - 12), wobble(cy - 26));
      ctx.lineTo(wobble(cx - 7), wobble(cy - 28));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(cx + 5), wobble(cy - 9));
      ctx.lineTo(wobble(cx + 12), wobble(cy - 26));
      ctx.lineTo(wobble(cx + 7), wobble(cy - 28));
      ctx.stroke();
    } else if (type === 'mirror') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 20), wobble(y + 45));
      ctx.lineTo(wobble(x + 60), wobble(y + 45));
      ctx.stroke();
      for (let h = x + 24; h <= x + 56; h += 8) {
        ctx.beginPath();
        ctx.moveTo(wobble(h), wobble(y + 45));
        ctx.lineTo(wobble(h - 4), wobble(y + 51));
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 40, y + 15);
      ctx.lineTo(x + 40, y + 45);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(wobble(x + 22), wobble(y + 27));
      ctx.lineTo(wobble(x + 40), wobble(y + 45));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 45));
      ctx.lineTo(wobble(x + 58), wobble(y + 27));
      ctx.stroke();
    } else if (type === 'lens') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.quadraticCurveTo(wobble(x + 50), wobble(y + 35), wobble(x + 40), wobble(y + 58));
      ctx.quadraticCurveTo(wobble(x + 30), wobble(y + 35), wobble(x + 40), wobble(y + 12));
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 35);
      ctx.lineTo(x + 68, y + 35);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(wobble(x + 12), wobble(y + 22));
      ctx.lineTo(wobble(x + 40), wobble(y + 35));
      ctx.lineTo(wobble(x + 63), wobble(y + 44));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 12), wobble(y + 48));
      ctx.lineTo(wobble(x + 40), wobble(y + 35));
      ctx.lineTo(wobble(x + 63), wobble(y + 26));
      ctx.stroke();
    } else if (type === 'prism') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 14));
      ctx.lineTo(wobble(x + 16), wobble(y + 56));
      ctx.lineTo(wobble(x + 64), wobble(y + 56));
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 2), wobble(y + 40));
      ctx.lineTo(wobble(x + 30), wobble(y + 35));
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 30), wobble(y + 35));
      ctx.lineTo(wobble(x + 48), wobble(y + 38));
      ctx.lineTo(wobble(x + 70), wobble(y + 34));
      ctx.stroke();
      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 30), wobble(y + 35));
      ctx.lineTo(wobble(x + 46), wobble(y + 42));
      ctx.lineTo(wobble(x + 68), wobble(y + 48));
      ctx.stroke();
    } else if (type === 'magnet') {
      const mx = x + 20, my = y + 26, mw = 40, mh = 16;
      ctx.beginPath();
      ctx.rect(wobble(mx), wobble(my), mw, mh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(mx + 20), wobble(my));
      ctx.lineTo(wobble(mx + 20), wobble(my + mh));
      ctx.stroke();
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.fillText('N', mx + 6, my + 12);
      ctx.fillText('S', mx + 26, my + 12);
    } else if (type === 'concave_mirror') {
      ctx.beginPath();
      ctx.arc(wobble(x + 60), wobble(y + 35), 24, Math.PI * 0.75, Math.PI * 1.25);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (let a = Math.PI * 0.75; a <= Math.PI * 1.25; a += 0.1) {
        const mx = x + 60 + Math.cos(a) * 24;
        const my = y + 35 + Math.sin(a) * 24;
        ctx.beginPath();
        ctx.moveTo(wobble(mx), wobble(my));
        ctx.lineTo(wobble(mx + Math.cos(a) * 3), wobble(my + Math.sin(a) * 3));
        ctx.stroke();
      }
      ctx.lineWidth = 2.5;
    } else if (type === 'axes') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 10));
      ctx.lineTo(wobble(x + 40), wobble(y + 60));
      ctx.moveTo(wobble(x + 15), wobble(y + 35));
      ctx.lineTo(wobble(x + 65), wobble(y + 35));
      ctx.stroke();

      ctx.strokeStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 20), wobble(y + 20));
      ctx.lineTo(wobble(x + 60), wobble(y + 50));
      ctx.stroke();

      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 20), wobble(y + 50));
      ctx.lineTo(wobble(x + 60), wobble(y + 20));
      ctx.stroke();
    } else if (type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.lineTo(wobble(x + 15), wobble(y + 58));
      ctx.lineTo(wobble(x + 65), wobble(y + 58));
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 15, y + 58, 12, -Math.PI / 3, 0);
      ctx.stroke();
    } else if (type === 'circle') {
      const cx = x + 40;
      const cy = y + 35;
      const r = 20;
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), wobble(r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(cx));
      ctx.lineTo(wobble(cx + r * Math.cos(-Math.PI / 4)), wobble(cy + r * Math.sin(-Math.PI / 4)));
      ctx.stroke();
    } else if (type === 'matrix') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 22), wobble(y + 12));
      ctx.lineTo(wobble(x + 15), wobble(y + 12));
      ctx.lineTo(wobble(x + 15), wobble(y + 58));
      ctx.lineTo(wobble(x + 22), wobble(y + 58));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 58), wobble(y + 12));
      ctx.lineTo(wobble(x + 65), wobble(y + 12));
      ctx.lineTo(wobble(x + 65), wobble(y + 58));
      ctx.lineTo(wobble(x + 58), wobble(y + 58));
      ctx.stroke();
      ctx.font = 'bold 10px Kalam';
      ctx.fillStyle = '#1E293B';
      ctx.fillText('a', x + 23, y + 30);
      ctx.fillText('b', x + 47, y + 30);
      ctx.fillText('c', x + 23, y + 50);
      ctx.fillText('d', x + 47, y + 50);
    } else if (type === 'integral') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 46), wobble(y + 10));
      ctx.bezierCurveTo(wobble(x + 26), wobble(y + 8), wobble(x + 26), wobble(y + 30), wobble(x + 40), wobble(y + 35));
      ctx.bezierCurveTo(wobble(x + 54), wobble(y + 40), wobble(x + 54), wobble(y + 62), wobble(x + 34), wobble(y + 60));
      ctx.stroke();
      ctx.font = 'italic 11px Kalam';
      ctx.fillStyle = '#EF4444';
      ctx.fillText('dx', x + 48, y + 42);
    } else if (type === 'beaker') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 30), wobble(y + 12));
      ctx.lineTo(wobble(x + 50), wobble(y + 12));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 34), wobble(y + 12));
      ctx.lineTo(wobble(x + 34), wobble(y + 24));
      ctx.moveTo(wobble(x + 46), wobble(y + 12));
      ctx.lineTo(wobble(x + 46), wobble(y + 24));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 34), wobble(y + 24));
      ctx.lineTo(wobble(x + 16), wobble(y + 58));
      ctx.lineTo(wobble(x + 64), wobble(y + 58));
      ctx.lineTo(wobble(x + 46), wobble(y + 24));
      ctx.stroke();
      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 21), wobble(y + 48));
      ctx.lineTo(wobble(x + 59), wobble(y + 48));
      ctx.stroke();
      ctx.fillStyle = '#60A5FA';
      ctx.beginPath();
      ctx.arc(wobble(x + 32), wobble(y + 38), 2, 0, Math.PI * 2);
      ctx.arc(wobble(x + 44), wobble(y + 43), 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'atom') {
      const cx = x + 40;
      const cy = y + 35;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (type === 'dna') {
      ctx.beginPath();
      for (let sy = y + 14; sy <= y + 54; sy += 8) {
        const pct = (sy - (y + 14)) / 40;
        const angle = pct * Math.PI * 2;
        const dx1 = Math.sin(angle) * 12;
        const dx2 = -Math.sin(angle) * 12;
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(wobble(x + 40 + dx1), wobble(sy), 2.5, 0, Math.PI * 2);
        ctx.arc(wobble(x + 40 + dx2), wobble(sy), 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(wobble(x + 40 + dx1), wobble(sy));
        ctx.lineTo(wobble(x + 40 + dx2), wobble(sy));
        ctx.stroke();
      }
    } else if (type === 'bulb') {
      const cx = x + 40;
      const cy = y + 26;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, Math.PI * 0.75, Math.PI * 0.25, true);
      ctx.lineTo(wobble(cx + 7), wobble(y + 46));
      ctx.lineTo(wobble(cx - 7), wobble(y + 46));
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(wobble(cx - 5), wobble(y + 46), 10, 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(cx - 3), wobble(cy + 4));
      ctx.lineTo(wobble(cx - 3), wobble(cy - 4));
      ctx.quadraticCurveTo(wobble(cx), wobble(cy - 9), wobble(cx + 3), wobble(cy - 4));
      ctx.lineTo(wobble(cx + 3), wobble(cy + 4));
      ctx.stroke();
    } else if (type === 'globe') {
      const cx = x + 40;
      const cy = y + 30;
      const r = 18;
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, Math.PI * 0.25, Math.PI * 1.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, y + 52);
      ctx.lineTo(cx, y + 60);
      ctx.moveTo(cx - 10, y + 60);
      ctx.lineTo(cx + 10, y + 60);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx, cy, 5, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'quill') {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 18), wobble(y + 55));
      ctx.quadraticCurveTo(wobble(x + 35), wobble(y + 35), wobble(x + 58), wobble(y + 12));
      ctx.quadraticCurveTo(wobble(x + 48), wobble(y + 28), wobble(x + 28), wobble(y + 44));
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wobble(x + 18), wobble(y + 55));
      ctx.lineTo(wobble(x + 55), wobble(y + 15));
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawJagannathTemple = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const wobble = (val: number, amp = 1.8) => val + (Math.random() - 0.5) * amp;

    ctx.beginPath();
    ctx.moveTo(wobble(x + 40), wobble(y + 190));
    ctx.lineTo(wobble(x + 40), wobble(y + 150));
    ctx.quadraticCurveTo(wobble(x + 50), wobble(y + 60), wobble(x + 85), wobble(y + 50));
    ctx.quadraticCurveTo(wobble(x + 120), wobble(y + 60), wobble(x + 130), wobble(y + 150));
    ctx.lineTo(wobble(x + 130), wobble(y + 190));
    ctx.stroke();

    for (let r = 70; r < 160; r += 15) {
      ctx.beginPath();
      const pct = (r - 70) / 90;
      const lx = 50 + pct * (40 - 50);
      const rx = 120 - pct * (130 - 120);
      ctx.moveTo(wobble(x + lx), wobble(y + r));
      ctx.lineTo(wobble(x + rx), wobble(y + r));
      ctx.stroke();
    }

    ctx.fillStyle = '#FCFBF9';
    ctx.beginPath();
    ctx.arc(wobble(x + 85), wobble(y + 38), 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(wobble(x + 85), wobble(y + 20), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wobble(x + 85), wobble(y + 15));
    ctx.lineTo(wobble(x + 85), wobble(y - 12));
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(wobble(x + 85), wobble(y - 12));
    ctx.lineTo(wobble(x + 120), wobble(y - 4));
    ctx.lineTo(wobble(x + 85), wobble(y + 4));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wobble(x + 130), wobble(y + 190));
    ctx.lineTo(wobble(x + 130), wobble(y + 120));
    ctx.quadraticCurveTo(wobble(x + 140), wobble(y + 80), wobble(x + 155), wobble(y + 75));
    ctx.quadraticCurveTo(wobble(x + 170), wobble(y + 80), wobble(x + 175), wobble(y + 120));
    ctx.lineTo(wobble(x + 175), wobble(y + 190));
    ctx.stroke();

    for (let r = 95; r < 170; r += 15) {
      ctx.beginPath();
      ctx.moveTo(wobble(x + 135), wobble(y + r));
      ctx.lineTo(wobble(x + 170), wobble(y + r));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(wobble(x + 155), wobble(y + 68), 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  const downloadPosterImage = async () => {
    setGenerating(true);
    try {
      await document.fonts.load('bold 24px Kalam');
      await document.fonts.load('bold 18px Kalam');
      await document.fonts.load('italic 15px Caveat');

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const theme = SUBJECT_THEMES[getSubjectCategory(selectedSubject)] || SUBJECT_THEMES.math;

      ctx.fillStyle = '#FCFBF9';
      ctx.fillRect(0, 0, 1080, 1920);

      const category = getSubjectCategory(selectedSubject);

      // 1. Draw dynamic category-specific background pattern watermarks
      ctx.strokeStyle = theme.ruledColor;
      ctx.lineWidth = 1.2;

      if (category === 'math') {
        // Draw grid paper (graph notebook style)
        ctx.globalAlpha = 0.12;
        // Horizontal lines
        for (let y = 260; y < 1880; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, wobble(y, 1.2));
          ctx.lineTo(1080, wobble(y, 1.2));
          ctx.stroke();
        }
        // Vertical lines
        for (let x = 160; x < 1040; x += 48) {
          ctx.beginPath();
          ctx.moveTo(wobble(x, 1.2), 260);
          ctx.lineTo(wobble(x, 1.2), 1880);
          ctx.stroke();
        }
      } else if (category === 'science') {
        // Draw faint organic chemistry hexagon lattice
        ctx.globalAlpha = 0.1;
        const hexRadius = 40;
        const hSpace = hexRadius * 1.5;
        const vSpace = hexRadius * Math.sqrt(3);
        for (let x = 160; x < 1080; x += hSpace * 2) {
          for (let y = 260; y < 1880; y += vSpace) {
            const drawHex = (cx: number, cy: number) => {
              ctx.beginPath();
              for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
                const px = cx + hexRadius * Math.cos(a);
                const py = cy + hexRadius * Math.sin(a);
                if (a === 0) ctx.moveTo(wobble(px, 1.0), wobble(py, 1.0));
                else ctx.lineTo(wobble(px, 1.0), wobble(py, 1.0));
              }
              ctx.closePath();
              ctx.stroke();
            };
            drawHex(x, y);
            drawHex(x + hSpace, y + vSpace / 2);
          }
        }
      } else if (category === 'social') {
        // Draw global latitude/longitude coordinate arcs
        ctx.globalAlpha = 0.08;
        const cx = 540, cy = -200;
        for (let r = 500; r < 2100; r += 160) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (let a = Math.PI * 0.2; a <= Math.PI * 0.8; a += 0.1) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * 2200, cy + Math.sin(a) * 2200);
          ctx.stroke();
        }
      } else if (category === 'skills') {
        // Draw faint circuit lines and connection nodes
        ctx.globalAlpha = 0.08;
        for (let y = 300; y < 1880; y += 180) {
          ctx.beginPath();
          ctx.moveTo(wobble(180), y);
          ctx.lineTo(wobble(400), y);
          ctx.lineTo(wobble(460), y + 60);
          ctx.lineTo(wobble(900), y + 60);
          ctx.stroke();
          // Draw connection dots
          ctx.fillStyle = theme.ruledColor;
          ctx.beginPath();
          ctx.arc(wobble(400), y, 4, 0, Math.PI * 2);
          ctx.arc(wobble(460), y + 60, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Default (languages): Rule lines with wobbly notebook look
        ctx.globalAlpha = 0.22;
        for (let y = 300; y < 1880; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(
            270, y + (Math.random() - 0.5) * 2.5,
            810, y + (Math.random() - 0.5) * 2.5,
            1080, y
          );
          ctx.stroke();
        }
      }

      // 2. Draw the large, elegant Konark Sun Temple Wheel watermark in the center background
      ctx.save();
      ctx.strokeStyle = theme.ruledColor;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = 0.04; // 4% opacity (extremely faint, very professional watermark)
      const kwCx = 540;
      const kwCy = 1050;
      const kwR = 240;
      // Outer rings
      ctx.beginPath();
      ctx.arc(wobble(kwCx), wobble(kwCy), wobble(kwR), 0, Math.PI * 2);
      ctx.arc(wobble(kwCx), wobble(kwCy), wobble(kwR - 15), 0, Math.PI * 2);
      ctx.stroke();
      // Inner hub rings
      ctx.beginPath();
      ctx.arc(wobble(kwCx), wobble(kwCy), wobble(48), 0, Math.PI * 2);
      ctx.arc(wobble(kwCx), wobble(kwCy), wobble(16), 0, Math.PI * 2);
      ctx.stroke();
      // Draw 24 spokes (12 major, 12 minor)
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        ctx.beginPath();
        ctx.moveTo(wobble(kwCx + Math.cos(a) * 48), wobble(kwCy + Math.sin(a) * 48));
        ctx.lineTo(wobble(kwCx + Math.cos(a) * (kwR - 15)), wobble(kwCy + Math.sin(a) * (kwR - 15)));
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1.0;

      // Draw Sambalpuri Margin Pattern on the left
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(130, 0);
      ctx.lineTo(130, 1920);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(138, 0);
      ctx.lineTo(138, 1920);
      ctx.stroke();

      // Sambalpuri Ikat border details between the two vertical lines
      ctx.lineWidth = 1.0;
      ctx.save();
      ctx.globalAlpha = 0.4;
      for (let y = 10; y < 1920; y += 30) {
        ctx.beginPath();
        ctx.moveTo(130, y);
        ctx.lineTo(138, y + 6);
        ctx.moveTo(130, y + 12);
        ctx.lineTo(138, y + 6);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const bx = 60, by = 60, bw = 220, bh = 95;
      ctx.moveTo(bx + (Math.random() - 0.5) * 1.5, by + (Math.random() - 0.5) * 1.5);
      ctx.lineTo(bx + bw + (Math.random() - 0.5) * 1.5, by + (Math.random() - 0.5) * 1.5);
      ctx.lineTo(bx + bw + (Math.random() - 0.5) * 1.5, by + bh + (Math.random() - 0.5) * 1.5);
      ctx.lineTo(bx + (Math.random() - 0.5) * 1.5, by + bh + (Math.random() - 0.5) * 1.5);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bx, by + 48);
      ctx.lineTo(bx + bw, by + 48);
      ctx.stroke();

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 18px Kalam';
      ctx.fillText(`Date: ${dateStr}`, bx + 15, by + 32);
      ctx.fillText(`Page No.: ${pageNo}`, bx + 15, by + 80);

      if (logoImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(940, 110, 50, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, 890, 60, 100, 100);
            ctx.restore();

            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.1) {
              const r = 50 + (Math.random() - 0.5) * 1.5;
              const px = 940 + Math.cos(a) * r;
              const py = 110 + Math.sin(a) * r;
              if (a === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            resolve();
          };
          img.src = logoImage;
        });
      } else {
        drawJagannathTemple(ctx, 840, 40);
      }

      // Draw Neelachakra Flag at top center
      ctx.save();
      ctx.strokeStyle = theme.secondaryColor;
      ctx.lineWidth = 2.0;
      const nfCx = 540;
      const nfCy = 55;
      // Neelachakra circle
      ctx.beginPath();
      ctx.arc(nfCx, nfCy, 12, 0, Math.PI * 2);
      ctx.stroke();
      // spokes inside wheel
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(nfCx, nfCy);
        ctx.lineTo(nfCx + Math.cos(a) * 12, nfCy + Math.sin(a) * 12);
        ctx.stroke();
      }
      // flagpole extending upwards
      ctx.beginPath();
      ctx.moveTo(nfCx, nfCy - 12);
      ctx.lineTo(nfCx, nfCy - 30);
      ctx.stroke();
      // Patitapabana triangular flag fluttering to the right
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(nfCx, nfCy - 30);
      ctx.lineTo(nfCx + 22, nfCy - 22);
      ctx.lineTo(nfCx, nfCy - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = theme.secondaryColor;
      ctx.font = 'bold 20px Kalam';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, 540, 115);

      ctx.fillStyle = theme.primaryColor;
      let titleFontSize = 40;
      ctx.font = `bold ${titleFontSize}px Kalam`;
      let textWidth = ctx.measureText(titleText).width;
      while (textWidth > 500 && titleFontSize > 20) {
        titleFontSize -= 2;
        ctx.font = `bold ${titleFontSize}px Kalam`;
        textWidth = ctx.measureText(titleText).width;
      }
      ctx.fillText(titleText, 540, 170);

      ctx.fillStyle = '#64748B';
      let subtitleFontSize = 24;
      ctx.font = `italic ${subtitleFontSize}px Caveat`;
      let subWidth = ctx.measureText(`— ${subtitleText} —`).width;
      while (subWidth > 500 && subtitleFontSize > 16) {
        subtitleFontSize -= 1;
        ctx.font = `italic ${subtitleFontSize}px Caveat`;
        subWidth = ctx.measureText(`— ${subtitleText} —`).width;
      }
      ctx.fillText(`— ${subtitleText} —`, 540, 220);

      let startY = 285;
      ctx.textAlign = 'left';

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        ctx.strokeStyle = theme.primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.1) {
          const r = 16 + (Math.random() - 0.5) * 1.5;
          const px = 80 + Math.cos(a) * r;
          const py = (startY + 15) + Math.sin(a) * r;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.font = 'bold 18px Kalam';
        ctx.fillStyle = theme.primaryColor;
        ctx.fillText(String(i + 1), 74, startY + 22);

        ctx.font = 'bold 20px Kalam';
        ctx.fillStyle = theme.darkTextColor;
        const qLines = wrapText(ctx, `Q. ${q.question}`, 420);
        qLines.forEach((line, idx) => {
          ctx.fillText(line, 160, startY + 14 + idx * 24);
        });

        ctx.font = 'bold 20px Kalam';
        ctx.fillStyle = theme.secondaryColor;
        const ansLines = wrapText(ctx, `• Ans. ${q.answer}`, 420);
        const ansStartY = startY + 14 + qLines.length * 24 + 10;
        ansLines.forEach((line, idx) => {
          ctx.fillText(line, 180, ansStartY + idx * 24);
        });

        if (q.sideNote) {
          const nx = 590, ny = startY - 8, nw = 290, nh = 74;

          // Fill side note background card
          ctx.fillStyle = theme.lightBg;
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(nx + nw, ny);
          ctx.lineTo(nx + nw, ny + nh);
          ctx.lineTo(nx, ny + nh);
          ctx.closePath();
          ctx.fill();

          // Draw left accent line (thicker)
          ctx.strokeStyle = theme.accentColor;
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(nx + 2, ny);
          ctx.lineTo(nx + 2, ny + nh);
          ctx.stroke();

          // Draw other wobbly borders
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(nx + 2, ny + (Math.random() - 0.5) * 1.5);
          ctx.lineTo(nx + nw + (Math.random() - 0.5) * 1.5, ny + (Math.random() - 0.5) * 1.5);
          ctx.lineTo(nx + nw + (Math.random() - 0.5) * 1.5, ny + nh + (Math.random() - 0.5) * 1.5);
          ctx.lineTo(nx + 2, ny + nh + (Math.random() - 0.5) * 1.5);
          ctx.stroke();

          // Draw label
          ctx.fillStyle = theme.secondaryColor;
          ctx.font = 'bold 15px Kalam';
          ctx.fillText(q.sideNoteLabel, nx + 14, ny + 22);

          // Draw side-note content
          ctx.fillStyle = theme.darkTextColor;
          ctx.font = 'bold 16px Kalam';
          const noteLines = wrapText(ctx, q.sideNote, 260);
          let noteY = ny + 40;
          noteLines.forEach((line) => {
            ctx.fillText(line, nx + 14, noteY);
            noteY += 20;
          });
        }

        drawSketchIcon(ctx, q.iconType, 900, startY - 12);
        startY += 145;
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = theme.primaryColor;
      ctx.font = 'bold 24px Kalam';
      ctx.fillText(`★ ${footerText} ★`, 540, 1850);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${selectedSubject}_Poster_Page_${pageNo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating branded poster:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 p-6 select-none text-slate-100 font-sans bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-[3rem] border border-slate-800 shadow-3xl relative overflow-hidden force-dark-theme">
      
      {/* Background Decorative Neon Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white/5 border border-white/10 rounded-[2rem] p-6 shadow-2xl backdrop-blur-2xl gap-6 z-10 relative"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 active:scale-95 transition-all shadow-inner hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 font-outfit">
              <Sparkles className="text-amber-400 animate-pulse drop-shadow-[0_0_10px_#f59e0b]" size={26} />
              GK Poster Generator <span className="text-emerald-400 text-xs font-black px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">Pro Edition</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Design school-branded revision sheets for Instagram Reels, YouTube Shorts, & WhatsApp Status.</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadPosterImage}
          disabled={generating}
          className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
        >
          {generating ? <RefreshCw className="animate-spin text-slate-950" size={18} /> : <Download className="text-slate-950" size={18} />}
          <span>ଡାଉନଲୋଡ୍ କରନ୍ତୁ (Download Branded Poster)</span>
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
        
        {/* EDIT PANEL (LEFT SIDE - 7 Cols) */}
        <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-2xl backdrop-blur-xl overflow-y-auto max-h-[78vh] custom-scrollbar">
          
          {/* LINK TO DATABASE SECTION */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-4 shadow-inner">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <BookOpen size={16} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]" />
              ପାଠ୍ୟପୁସ୍ତକ ପ୍ରଶ୍ନୋତ୍ତର (Select Textbook & Chapter)
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ଶ୍ରେଣୀ (Class)</label>
                <select
                  value={selectedClass}
                  onChange={e => {
                    const newClass = e.target.value;
                    setSelectedClass(newClass);
                    const firstSub = CLASS_SUBJECTS[newClass]?.[0]?.key || '';
                    setSelectedSubject(firstSub);
                    setSelectedChapterId('');
                    setQuestions(DEFAULT_BLANK_QUESTIONS);
                    setTitleText('');
                    setSubtitleText('');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-white focus:border-indigo-500 outline-none"
                >
                  {Object.keys(CLASS_SUBJECTS).map(classKey => (
                    <option key={classKey} value={classKey}>
                      {classKey === 'classsishuvatika(anganwadi)' ? 'Shishu Vatika' : `Class ${classKey.replace('class', '')}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ବିଷୟ (Subject)</label>
                <select
                  value={selectedSubject}
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setSelectedChapterId('');
                    setQuestions(DEFAULT_BLANK_QUESTIONS);
                    setTitleText('');
                    setSubtitleText('');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-white focus:border-indigo-500 outline-none"
                >
                  {activeSubjects.map(sub => (
                    <option key={sub.key} value={sub.key}>
                      {sub.labelOr} ({sub.labelEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ଅଧ୍ୟାୟ (Chapter)</label>
                <select
                  value={selectedChapterId}
                  onChange={e => handleLoadChapterQuestions(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 px-3 py-2.5 rounded-xl text-xs font-bold text-white focus:border-indigo-500 outline-none"
                >
                  <option value="">-- Choose Chapter --</option>
                  {availableChapters.map(chap => (
                    <option key={chap.id} value={chap.id}>{chap.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAiGenerateQuestions}
                disabled={generatingAi || !selectedChapterId}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-xs font-black rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-40 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                {generatingAi ? <RefreshCw className="animate-spin" size={14} /> : <Bot size={14} />}
                <span>AI ସହାୟତାରେ ପ୍ରଶ୍ନ ତିଆରି କରନ୍ତୁ (AI Generate Revision Set)</span>
              </motion.button>
            </div>
          </div>

          {/* BRANDING SETUP */}
          <div className="p-5 bg-white/5 border border-white/10 rounded-3xl space-y-4 shadow-inner">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <ImageIcon size={16} className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              ବ୍ୟାଜ୍ ଲେଖା (Header Badge Setup)
            </h3>

            <div>
              <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Header Badge Text</label>
              <input 
                type="text" 
                value={badgeText}
                onChange={e => setBadgeText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <h2 className="text-sm font-black uppercase text-slate-300 tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
            <Edit size={16} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
            ପୋଷ୍ଟର ସଂଶୋଧନ (Edit Poster Content)
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ତାରିଖ (Date)</label>
              <input 
                type="text" 
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ପୃଷ୍ଠା ସଂଖ୍ୟା (Page No.)</label>
              <input 
                type="text" 
                value={pageNo}
                onChange={e => setPageNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ମୁଖ୍ୟ ଶିରୋନାମା (Poster Title)</label>
            <input 
              type="text" 
              value={titleText}
              onChange={e => setTitleText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs text-white focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">ଉପ-ଶିରୋନାମା (Subtitle)</label>
            <input 
              type="text" 
              value={subtitleText}
              onChange={e => setSubtitleText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs text-white focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Q&A LIST EDITORS */}
          <div className="space-y-4 pt-3 border-t border-white/5">
            <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">ପ୍ରଶ୍ନ ଓ ଉତ୍ତର ସମ୍ପାଦନ (Customize 10 slots)</label>
            {questions.map((q, idx) => (
              <div key={q.id} className="p-5 bg-white/5 border border-white/5 hover:border-white/10 rounded-3xl space-y-3 transition-all">
                <div className="flex justify-between items-center">
                  <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                    {idx + 1}
                  </span>
                  
                  <select
                    value={q.iconType}
                    onChange={e => updateQuestion(q.id, 'iconType', e.target.value)}
                    className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-white outline-none"
                  >
                    <option value="book">📖 Book</option>
                    <option value="school">🏫 School</option>
                    <option value="mountain">🏔️ Mountain</option>
                    <option value="temple">🛕 Temple</option>
                    <option value="flower">🌼 Flower</option>
                    <option value="river">🏞️ River</option>
                    <option value="sand">🏖️ Sand Art</option>
                    <option value="leader">🧔 Leader</option>
                    <option value="deer">🦌 Deer</option>
                    <option value="mirror">🪞 Mirror (Reflection)</option>
                    <option value="lens">🔍 Lens (Convergence)</option>
                    <option value="prism">🔺 Prism (Spectrum)</option>
                    <option value="magnet">🧲 Magnet (Field Lines)</option>
                    <option value="concave_mirror">🛡️ Concave Mirror</option>
                    <option value="axes">📊 Graph / Axes</option>
                    <option value="triangle">📐 Geometry Triangle</option>
                    <option value="circle">⭕ Circle / Radius</option>
                    <option value="matrix">🔢 Matrix brackets</option>
                    <option value="integral">⨜ Calculus Integral</option>
                    <option value="beaker">🧪 Chemistry Beaker</option>
                    <option value="atom">⚛️ Atomic loops</option>
                    <option value="dna">🧬 DNA helix</option>
                    <option value="bulb">💡 Lightbulb</option>
                    <option value="globe">🌐 Earth Globe</option>
                    <option value="quill">✒️ Writing Quill</option>
                  </select>
                </div>

                <input 
                  type="text" 
                  value={q.question}
                  onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                  placeholder="Type question..."
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white focus:border-indigo-500 outline-none"
                />

                <input 
                  type="text" 
                  value={q.answer}
                  onChange={e => updateQuestion(q.id, 'answer', e.target.value)}
                  placeholder="Type answer..."
                  className="w-full bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-400 focus:border-emerald-500 outline-none"
                />

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={q.sideNoteLabel}
                    onChange={e => updateQuestion(q.id, 'sideNoteLabel', e.target.value)}
                    className="bg-slate-900 border border-slate-800 px-2.5 py-2.5 rounded-xl text-xs font-bold text-white outline-none"
                  >
                    <option value="Important!">Important!</option>
                    <option value="Key Fact">Key Fact</option>
                    <option value="Remember!">Remember!</option>
                    <option value="Note">Note</option>
                    <option value="Did You Know!">Did You Know!</option>
                    <option value="Formula!">Formula!</option>
                  </select>
                  <input 
                    type="text" 
                    value={q.sideNote}
                    onChange={e => updateQuestion(q.id, 'sideNote', e.target.value)}
                    placeholder="Side note text..."
                    className="col-span-2 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* REAL-TIME PREVIEW PANEL (RIGHT SIDE - 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-start relative">
          <h3 className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mb-4 flex items-center gap-1 z-10">
            <Eye size={14} className="text-emerald-400" />
            ପୂର୍ବାବଲୋକନ (Live 9:16 Sheet Preview)
          </h3>

          {/* Glowing Subject Theme Backdrop */}
          <div className={`absolute top-10 bottom-0 left-10 right-10 rounded-[2.5rem] blur-[80px] pointer-events-none transition-all duration-700 ${theme.glowClass}`} />
          
          <div className="w-full max-w-[390px] aspect-[9/16] bg-[#FCFBF9] border-8 border-slate-950 rounded-[3rem] shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden select-none p-4 flex flex-col justify-between text-[6px] z-10 transition-all hover:scale-[1.01] duration-500">
            
            {/* Organic notebook ruled lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pt-[72px] pb-6" style={{ opacity: 0.16 }}>
              {Array.from({ length: 33 }).map((_, i) => (
                <div key={i} className="w-full h-px bg-blue-500/80" />
              ))}
            </div>

            {/* Red double vertical margin */}
            <div className="absolute top-0 bottom-0 left-[35px] w-px bg-red-500/50" />
            <div className="absolute top-0 bottom-0 left-[37px] w-px bg-red-500/50" />

            {/* HEADER DETAILS */}
            <div className="relative flex justify-between items-start z-10 mt-2 font-sans">
              <div className="border border-slate-700/80 px-2 py-0.5 text-[5px] font-mono leading-none bg-white">
                <div className="border-b border-slate-600 pb-0.5">Date: {dateStr}</div>
                <div className="pt-0.5">Page No.: {pageNo}</div>
              </div>

              <div className="text-center flex-grow px-2" style={{ fontFamily: 'Kalam, cursive' }}>
                <div className="text-[6.5px] font-bold text-slate-500 uppercase leading-none tracking-wider">{badgeText}</div>
                <div className="text-[10px] font-black text-slate-900 leading-tight uppercase mt-0.5">{titleText}</div>
                <div className="text-[7px] font-black text-blue-600 italic mt-0.5">-- {subtitleText} --</div>
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                {logoImage ? (
                  <img src={logoImage} alt="logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[5px] font-black text-slate-500">P-2</span>
                )}
              </div>
            </div>

            {/* 10 QUESTIONS LIST */}
            <div className="flex-1 flex flex-col justify-between py-4 pl-[45px] pr-2 z-10 space-y-1" style={{ fontFamily: 'Kalam, cursive' }}>
              {questions.map((q, idx) => (
                <div key={q.id} className="flex justify-between items-start gap-1">
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="text-[7.5px] font-black text-slate-800 flex items-start gap-1">
                      <span className="w-3.5 h-3.5 shrink-0 rounded-full border border-slate-800 flex items-center justify-center text-[5px] font-mono">{idx + 1}</span>
                      <span className="leading-tight">{q.question}</span>
                    </div>
                    <div className="text-[7.5px] font-bold text-blue-600 pl-4 underline decoration-blue-400 decoration-1">
                      • Ans. {q.answer}
                    </div>
                  </div>

                  {q.sideNote && (
                    <div 
                      className="w-[85px] p-1 rounded-md shrink-0 leading-snug border-l-2 shadow-sm"
                      style={{ 
                        backgroundColor: theme.lightBg,
                        borderColor: theme.accentColor,
                        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRight: '1px solid rgba(148, 163, 184, 0.2)',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                      }}
                    >
                      <span className="text-[4.5px] font-black block mb-0.5 uppercase tracking-wider" style={{ color: theme.secondaryColor }}>
                        {q.sideNoteLabel}
                      </span>
                      <span className="text-[5.5px] font-bold block leading-tight" style={{ color: theme.darkTextColor }}>
                        {q.sideNote}
                      </span>
                    </div>
                  )}

                  <div className="w-7 h-7 bg-slate-100 border border-slate-200 rounded-xl shrink-0 flex items-center justify-center text-sm shadow-inner">
                    {getIconEmoji(q.iconType)}
                  </div>
                </div>
              ))}
            </div>

            {/* FOOTER */}
            <div className="text-center text-[8px] font-black z-10 border-t border-slate-200/40 pt-1.5 pb-1" style={{ fontFamily: 'Kalam, cursive' }}>
              ★ {footerText} ★
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
