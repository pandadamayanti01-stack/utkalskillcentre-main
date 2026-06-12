import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cleanOdiaOrthography } from '../services/aiService';

interface MathBlackboardProps {
  language: 'en' | 'or';
  onClose: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
  user?: any;
  initialMode?: 'student' | 'anganwadi' | 'teacher';
}

export const MathBlackboard: React.FC<MathBlackboardProps> = ({
  language,
  onClose,
  isPremium = false,
  onUpgrade,
  user,
  initialMode = 'student'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const boardFrameRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [boardMode, setBoardMode] = useState<'student' | 'anganwadi' | 'teacher'>(initialMode);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#fef8ec'); // Cream chalk color
  const [brushWidth, setBrushWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [freeQueriesCount, setFreeQueriesCount] = useState<number>(0);

  useEffect(() => {
    const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
    setFreeQueriesCount(parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10));
  }, [user]);
  
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [displayedExplanation, setDisplayedExplanation] = useState<string>('');
  const [speaking, setSpeaking] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'or'>(language);

  // Premium Features: Themes, Undo/Redo
  const [boardTheme, setBoardTheme] = useState<'green' | 'black' | 'grid'>('green');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showResponsePopup, setShowResponsePopup] = useState(false);

  // Undo/Redo Refs to bypass React state lag
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Draggable and Resizable Image Overlay state
  interface ActiveImageState {
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    isDragging: boolean;
    isResizing: boolean;
    dragStartX: number;
    dragStartY: number;
    originalWidth: number;
    originalHeight: number;
  }

  const [activeImage, setActiveImage] = useState<ActiveImageState | null>(null);

  // Check if user is a judge or in judge mode for showcase templates visibility
  const isJudge = (() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('judge') === 'true' || window.location.hash.includes('judge=true')) {
          return true;
        }
        if (sessionStorage.getItem('judge_mode_active') === 'true' || sessionStorage.getItem('judge_offline_auth_active') === 'true') {
          return true;
        }
      }
      if (user) {
        const email = user.email || '';
        const phone = user.phoneNumber || '';
        if (email.includes('judge') || email.includes('admin') || phone.includes('99999')) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  })();

  // Fullscreen and Orientation lock on mount
  useEffect(() => {
    try {
      const doc = document.documentElement;
      if (doc.requestFullscreen) {
        doc.requestFullscreen().catch(() => {});
      } else if ((doc as any).webkitRequestFullscreen) {
        (doc as any).webkitRequestFullscreen();
      }
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
        (window.screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch (e) {}

    return () => {
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
      } catch (e) {}
    };
  }, []);

  const handleClose = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
        window.screen.orientation.unlock();
      }
    } catch (e) {}
    onClose();
  };

  // Draggable/Resizable image mouse and touch event tracking
  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!activeImage) return;
      if (!activeImage.isDragging && !activeImage.isResizing) return;

      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (activeImage.isDragging) {
        const dx = clientX - activeImage.dragStartX;
        const dy = clientY - activeImage.dragStartY;
        setActiveImage(prev => prev ? {
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
          dragStartX: clientX,
          dragStartY: clientY
        } : null);
      } else if (activeImage.isResizing) {
        const dx = clientX - activeImage.dragStartX;
        const newWidth = Math.max(50, activeImage.width + dx);
        const newHeight = newWidth * (activeImage.originalHeight / activeImage.originalWidth);
        setActiveImage(prev => prev ? {
          ...prev,
          width: newWidth,
          height: newHeight,
          dragStartX: clientX,
          dragStartY: clientY
        } : null);
      }
    };

    const handlePointerUp = () => {
      if (activeImage && (activeImage.isDragging || activeImage.isResizing)) {
        setActiveImage(prev => prev ? {
          ...prev,
          isDragging: false,
          isResizing: false
        } : null);
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxDim = 350;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = (maxDim / w) * h;
            w = maxDim;
          } else {
            w = (maxDim / h) * w;
            h = maxDim;
          }
        }
        
        const scrollTop = boardFrameRef.current?.scrollTop || 0;
        const parentHeight = boardFrameRef.current?.clientHeight || 500;
        const parentWidth = boardFrameRef.current?.clientWidth || 800;

        setActiveImage({
          url,
          x: (parentWidth - w) / 2,
          y: scrollTop + (parentHeight - h) / 2,
          width: w,
          height: h,
          isDragging: false,
          isResizing: false,
          dragStartX: 0,
          dragStartY: 0,
          originalWidth: img.width,
          originalHeight: img.height
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const bakeImageToCanvasPromise = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!activeImage) {
        resolve();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        resolve();
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, activeImage.x, activeImage.y, activeImage.width, activeImage.height);
        
        const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push(currentState);
        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);

        setActiveImage(null);
        resolve();
      };
      img.onerror = () => {
        console.error("Failed to load activeImage for baking");
        setActiveImage(null);
        resolve();
      };
      img.src = activeImage.url;
    });
  };

  // Auto-scroll explanation on mobile when loaded
  useEffect(() => {
    if (explanation && !loading && window.innerWidth < 768) {
      explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [explanation, loading]);

  // Initialize and resize canvas dynamically to fit viewport height/width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const canvasWidth = rect.width;
      const canvasHeight = 1600; // infinite scrolling chalkboard height

      if (canvasWidth <= 0) return;

      canvas.width = canvasWidth * 2;
      canvas.height = canvasHeight * 2;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        
        // Restore last drawn state if resizing
        if (historyIndexRef.current >= 0 && historyRef.current[historyIndexRef.current]) {
          ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
        } else {
          // Initialize blank history state on first render
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          historyRef.current = [initialData];
          historyIndexRef.current = 0;
          setCanUndo(false);
          setCanRedo(false);
        }
      }
    };

    // Wait a brief moment for DOM layouts to settle to get accurate parent height
    const timer = setTimeout(resizeCanvas, 150);

    window.addEventListener('resize', resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Keyboard listeners for Undo/Redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  // Typewriter streaming effect for Socratic replies
  useEffect(() => {
    if (!explanation) {
      setDisplayedExplanation('');
      return;
    }
    
    let currentIdx = 0;
    setDisplayedExplanation('');
    
    const timer = setInterval(() => {
      if (currentIdx < explanation.length) {
        currentIdx += 3; // Type 3 characters at a time for optimal fluid speed
        setDisplayedExplanation(explanation.slice(0, currentIdx));
      } else {
        clearInterval(timer);
      }
    }, 12);

    return () => clearInterval(timer);
  }, [explanation]);

  // Stop TTS if component unmounts
  useEffect(() => {
    return () => {
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, [audioInstance]);

  // Undo / Redo Actions
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
      ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  };

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    // Set drawing behavior vs eraser
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'; // Native erase drawing pixels transparently
      ctx.lineWidth = brushWidth * 3.5; // Thicker eraser
    } else {
      ctx.globalCompositeOperation = 'source-over'; // Standard draw
      ctx.lineWidth = brushWidth;
      ctx.strokeStyle = brushColor;
    }

    ctx.beginPath();

    // Calculate canvas coordinates
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Chalk line settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      // Prevent default page scroll on touch drawing
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (isEraser) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // Premium chalk brush texture logic: draw base chalk line with transparency
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = brushColor;
      ctx.lineTo(x, y);
      ctx.stroke();

      // Speckle noise particles around path to simulate chalk dust on slate texture
      ctx.globalAlpha = 0.18;
      const density = Math.min(22, brushWidth * 2);
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (brushWidth / 1.8);
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        
        ctx.fillStyle = brushColor;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save final stroke to undo/redo history stack
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(currentState);
    
    // Limit cache length to prevent high memory consumption
    if (newHistory.length > 25) {
      newHistory.shift();
    }
    
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  };

  const clearBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / 2;
    const height = canvas.height / 2;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);

    // Save cleared state to history
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(currentState);
    
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);

    setExplanation('');
    setDisplayedExplanation('');
    stopAudio();
  };

  const loadTemplate = (type: 'equation' | 'triangle' | 'odia' | 'ocr') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (boardFrameRef.current) {
      boardFrameRef.current.scrollTop = 0;
    }

    // Clear board first
    const width = canvas.width / 2;
    const height = canvas.height / 2;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    
    // Set drawing settings (chalk style)
    ctx.strokeStyle = '#fef8ec';
    ctx.fillStyle = '#fef8ec';
    ctx.shadowColor = 'rgba(254, 248, 236, 0.4)';
    ctx.shadowBlur = 3;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'ocr') {
      // Trigger visual green laser scanning animation
      setScanning(true);
      setTimeout(() => setScanning(false), 1800);

      // Draw simulated textbook page outline
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#38bdf8'; // Cyan border for textbook boundary
      ctx.strokeRect(width / 2 - 200, height / 2 - 110, 400, 210);

      // Draw Textbook Header tag
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.fillText("BSE ODISHA CLASS 10 PHYSICAL SCIENCE (Page 142)", width / 2 - 180, height / 2 - 90);

      // Question printed text
      ctx.fillStyle = '#fef8ec';
      ctx.font = 'bold 20px "Comic Sans MS", cursive, sans-serif';
      ctx.fillText("ପ୍ରଶ୍ନ: ଆଲୋକର ପ୍ରତିଫଳନ କହିଲେ କଣ ବୁଝ?", width / 2 - 180, height / 2 - 50);

      // Draw physics diagram
      const mirrorY = height / 2 + 50;
      const normalX = width / 2;

      // Draw mirror line
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fef8ec';
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, mirrorY);
      ctx.lineTo(width / 2 + 120, mirrorY);
      ctx.stroke();

      // Mirror hashes
      ctx.lineWidth = 1.5;
      for (let i = -110; i <= 110; i += 15) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + i, mirrorY);
        ctx.lineTo(width / 2 + i - 8, mirrorY + 8);
        ctx.stroke();
      }

      // Normal Line (dashed)
      ctx.strokeStyle = 'rgba(254, 248, 236, 0.5)';
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(normalX, mirrorY);
      ctx.lineTo(normalX, mirrorY - 80);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Incident ray
      ctx.strokeStyle = '#fef8ec';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(normalX - 70, mirrorY - 60);
      ctx.lineTo(normalX, mirrorY);
      ctx.stroke();

      // Reflected ray
      ctx.beginPath();
      ctx.moveTo(normalX, mirrorY);
      ctx.lineTo(normalX + 70, mirrorY - 60);
      ctx.stroke();

      // Arrow indicators
      ctx.font = '12px "Courier New", Courier, monospace';
      ctx.fillText("Incident Ray", normalX - 110, mirrorY - 70);
      ctx.fillText("Reflected Ray", normalX + 35, mirrorY - 70);
      ctx.fillText("Normal", normalX - 20, mirrorY - 90);
    } else if (type === 'equation') {
      // Draw math equation "x² - 5x + 6 = 0"
      ctx.font = 'bold 36px "Courier New", Courier, monospace';
      ctx.fillText("x² - 5x + 6 = 0", width / 2 - 140, height / 2 - 10);
    } else if (type === 'triangle') {
      // Draw right triangle
      const startX = width / 2 - 100;
      const startY = height / 2 - 80;
      const endX = width / 2 - 100;
      const endY = height / 2 + 60;
      const baseEndX = width / 2 + 100;
      const baseEndY = height / 2 + 60;

      ctx.beginPath();
      ctx.moveTo(startX, startY); // top vertex
      ctx.lineTo(endX, endY);     // bottom-left right-angle
      ctx.lineTo(baseEndX, baseEndY); // bottom-right
      ctx.closePath();
      ctx.stroke();

      // Right angle square indicator
      ctx.beginPath();
      ctx.moveTo(endX, endY - 20);
      ctx.lineTo(endX + 20, endY - 20);
      ctx.lineTo(endX + 20, endY);
      ctx.stroke();

      // Draw text tags
      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillText("A", startX - 25, startY + 5);
      ctx.fillText("B", endX - 25, endY + 20);
      ctx.fillText("C", baseEndX + 10, baseEndY + 10);
      ctx.fillText("c = 10 cm", (startX + baseEndX) / 2 + 10, (startY + baseEndY) / 2);
      ctx.fillText("a = 6 cm", endX - 95, (startY + endY) / 2);
      ctx.fillText("b = 8 cm", (endX + baseEndX) / 2, endY + 30);
    } else if (type === 'odia') {
      // Draw Odia text "ବାଘ" (Tiger)
      ctx.font = 'bold 50px "Comic Sans MS", cursive, sans-serif';
      ctx.fillText("ବାଘ", width / 2 - 60, height / 2 + 15);
    }

    // Reset shadow values so manual drawing doesn't have it by default
    ctx.shadowBlur = 0;

    // Save state to history
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(currentState);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);

    setExplanation('');
    setDisplayedExplanation('');
    stopAudio();
  };

  const stopAudio = () => {
    if (audioInstance) {
      audioInstance.pause();
      setAudioInstance(null);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const speakText = async () => {
    if (speaking) {
      stopAudio();
      return;
    }
    if (!explanation) return;

    // 1. Extract a concise audio summary to keep TTS generation nearly instantaneous (under 30 words)
    let speechText = explanation;
    
    // Clean up brackets, English translations, and markdown markers
    speechText = speechText
      .replace(/\([a-zA-Z\s\-]+\)/g, '')
      .replace(/[*#_`~]/g, '')
      .trim();

    // Select first two sentences based on English (.?!) and Odia (।) punctuation marks
    const sentences = speechText.match(/[^.!?।\n]+[.!?।\n]+/g) || [speechText];
    if (sentences.length > 2) {
      speechText = sentences.slice(0, 2).join(' ');
    } else {
      speechText = sentences.join(' ');
    }

    // Keep it under a safe length for fast speech synthesis
    if (speechText.length > 180) {
      speechText = speechText.substring(0, 177) + "...";
    }

    // Append standard inviting call-to-action
    if (selectedLang === 'or') {
      speechText += " ସମ୍ପୂର୍ଣ୍ଣ ସମାଧାନର ସୋପାନଗୁଡ଼ିକୁ ତଳେ ଥିବା ବାକ୍ସରେ ପଢ଼ି ବୁଝିବାକୁ ଚେଷ୍ଟା କର!";
    } else {
      speechText += " Please read the complete step-by-step solutions listed in the panel below!";
    }

    const cleanText = cleanOdiaOrthography(speechText);
    const usePremium = localStorage.getItem('gundulu_use_premium_voice') === 'true';

    setSpeaking(true);

    if (!usePremium && 'speechSynthesis' in window) {
      // Local zero-latency browser speech synthesis
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedLang === 'or' ? 'or-IN' : 'en-IN';
      
      const voices = window.speechSynthesis.getVoices();
      // Prioritize a sweet, cute female voice (Heera, Zira, Susan, Hazel, or generic Female/Girl)
      let matchVoice = voices.find(v => 
        v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en') && 
        (v.name.includes('Heera') || v.name.includes('Zira') || v.name.toLowerCase().includes('female') || v.name.includes('Susan') || v.name.includes('Hazel') || v.name.includes('Google US English') || v.name.includes('Google UK English Female'))
      );

      if (!matchVoice) {
        // Fallback to Google/Microsoft voices but exclude known male voices
        matchVoice = voices.find(v => 
          v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en') && 
          (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')) &&
          !v.name.includes('David') && !v.name.includes('Ravi') && !v.name.toLowerCase().includes('male')
        ) || voices.find(v => v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en'));
      }

      if (matchVoice) {
        utterance.voice = matchVoice;
      }
      
      if (boardMode === 'anganwadi') {
        utterance.pitch = 1.6;
        utterance.rate = 0.75;
      } else {
        utterance.pitch = 1.25; // cute high-pitched sister voice
        utterance.rate = 0.85;
      }

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      // Premium server-side Google Cloud / Gemini TTS
      try {
        const ttsUrl = boardMode === 'anganwadi' ? '/api/tts/anganwadi' : '/api/tts/gemini';
        const response = await fetch(ttsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            language: selectedLang === 'or' ? 'or-IN' : 'en-IN'
          })
        });

        if (!response.ok) throw new Error("TTS failed");
        const blob = await response.blob();
        const urlHelper = window.URL || (window as any).webkitURL;
        const audioUrl = urlHelper.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        setAudioInstance(audio);
        audio.onended = () => setSpeaking(false);
        await audio.play();
      } catch (err) {
        console.error("Speech playback error:", err);
        // Fallback to local browser TTS if server endpoint fails
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.lang = selectedLang === 'or' ? 'or-IN' : 'en-IN';

          const voices = window.speechSynthesis.getVoices();
          let matchVoice = voices.find(v => 
            v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en') && 
            (v.name.includes('Heera') || v.name.includes('Zira') || v.name.toLowerCase().includes('female') || v.name.includes('Susan') || v.name.includes('Hazel') || v.name.includes('Google US English') || v.name.includes('Google UK English Female'))
          );

          if (!matchVoice) {
            matchVoice = voices.find(v => 
              v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en') && 
              (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')) &&
              !v.name.includes('David') && !v.name.includes('Ravi') && !v.name.toLowerCase().includes('male')
            ) || voices.find(v => v.lang.startsWith(selectedLang === 'or' ? 'or' : 'en'));
          }

          if (matchVoice) {
            utterance.voice = matchVoice;
          }
          if (boardMode === 'anganwadi') {
            utterance.pitch = 1.6;
            utterance.rate = 0.75;
          } else {
            utterance.pitch = 1.25; // cute high-pitched sister voice
            utterance.rate = 0.85;
          }

          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } else {
          setSpeaking(false);
        }
      }
    }
  };

  const getThemeBgColor = () => {
    if (boardTheme === 'green') return '#0f2f1d';
    if (boardTheme === 'black') return '#121214';
    return '#0b0f17'; // grid theme background
  };

  // Compile transparent drawing onto a solid background for Gemini OCR vision processing
  const getCanvasDataUrlWithBackground = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return '';
    
    // Draw background color
    tempCtx.fillStyle = getThemeBgColor();
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Overlay faint grid lines for accuracy
    if (boardTheme === 'grid') {
      tempCtx.lineWidth = 1;
      tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      for (let x = 30; x < tempCanvas.width; x += 30) {
        tempCtx.beginPath();
        tempCtx.moveTo(x, 0);
        tempCtx.lineTo(x, tempCanvas.height);
        tempCtx.stroke();
      }
      for (let y = 30; y < tempCanvas.height; y += 30) {
        tempCtx.beginPath();
        tempCtx.moveTo(0, y);
        tempCtx.lineTo(tempCanvas.width, y);
        tempCtx.stroke();
      }
    } else {
      tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      tempCtx.lineWidth = 2;
      for (let y = 60; y < tempCanvas.height; y += 60) {
        tempCtx.beginPath();
        tempCtx.moveTo(0, y);
        tempCtx.lineTo(tempCanvas.width, y);
        tempCtx.stroke();
      }
    }

    // Draw canvas drawings on top
    tempCtx.drawImage(canvas, 0, 0);
    return tempCanvas.toDataURL('image/png');
  };

  const handleShare = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation)
      .then(() => {
        alert(selectedLang === 'or' ? 'ସମାଧାନଟି କ୍ଲିପବୋର୍ଡରେ କପି ହୋଇଗଲା!' : 'Solution copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Re-run solver when language is toggled in the popup
  useEffect(() => {
    if (showResponsePopup && !loading) {
      solveProblem();
    }
  }, [selectedLang]);

  const solveProblem = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activeImage) {
      await bakeImageToCanvasPromise();
    }

    const isFreePeriod = new Date() < new Date('2026-06-21T00:00:00+05:30');
    if (!isPremium && freeQueriesCount >= 5 && !isFreePeriod) {
      setShowUpgradeModal(true);
      return;
    }
    
    stopAudio();
    setLoading(true);
    setExplanation('');
    setDisplayedExplanation('');
    setShowResponsePopup(true); // Immediately open the popup overlay to show calculating status

    try {
      const dataUrl = getCanvasDataUrlWithBackground();
      const base64Data = dataUrl.split(',')[1];

      // Socratic / Pedagogical Role-based prompts
      let systemInstruction = "";
      if (boardMode === 'anganwadi') {
        systemInstruction =
          "You are Gundulu AI, a warm, friendly, and patient preschool teacher/tutor for Anganwadi (Sishu Vatika) children (aged 3-5 years) in Odisha. " +
          "Analyze the hand-drawn blackboard image containing children's letters, numbers, or drawings. " +
          "1. Identify the letter, number, or drawing drawn on the board. " +
          "2. Provide feedback in extremely simple, encouraging, and sweet Odia language. Speak like an affectionate Odia preschool teacher (use warm tones, gentle praise like 'BOHUT BADHIA' or 'SUNDAR HOICHI' but written in Odia characters as 'ବହୁତ ବଢ଼ିଆ', 'ସୁନ୍ଦର ହୋଇଛି'). " +
          "3. Suggest 1 fun, tiny game or sound the child can make related to that object. Keep it extremely short, sweet, and engaging (1-2 sentences).";
      } else if (boardMode === 'teacher') {
        systemInstruction =
          "You are Gundulu AI, a brilliant pedagogical assistant for school teachers in Odisha. " +
          "Analyze the chalkboard contents and help the teacher explain this topic to their class. " +
          "1. Identify the subject matter and topic written or sketched. " +
          "2. Suggest 2 interactive, low-cost activities or real-life examples the teacher can use in class to demonstrate this topic. " +
          "3. Formulate 2 thought-provoking questions the teacher can ask students to check for understanding. " +
          "4. Keep response structured in bullet points and written in: " + (selectedLang === 'or' ? 'Odia' : 'English') + ".";
      } else {
        systemInstruction = 
          "You are Gundulu AI, a friendly, brilliant, and patient Socratic tutor for school students in Odisha. " +
          "Analyze the hand-drawn blackboard image. " +
          "1. Identify what is drawn or written on the chalkboard. This could be a math problem, equation, sum, geometric shape, diagram, sketch, or words/sentences written in Odia or English script for any subject (Math, Science, Language, History, Geography, EVS, etc.). " +
          "2. Be extremely precise in handwriting recognition. Distinguish standard Odia characters. " +
          "3. If it is a math problem, sum, or equation: solve it step-by-step using a Socratic tutoring method, guiding the child to think rather than just printing a single result. " +
          "4. If it is a general drawing, shape, word, or academic query: identify it accurately, explain what it represents step-by-step, and engage the child in a friendly, interactive conversation. " +
          "5. Provide the explanation in the student's selected language: " + (selectedLang === 'or' ? 'Odia' : 'English') + ". " +
          "6. Keep the explanation concise, clear, and structured with clean markdown points. " +
          "7. CRITICAL: Do NOT use LaTeX math code, delimiters like $$ or $, backslashes (\\), or LaTeX symbols. Instead, format all math equations, formulas, and expressions using plain text or standard Unicode symbols (like x^2, /, *, +, -, =, √x, +/-). Ensure they are written in a simple, plain-spaced, easy-to-read layout for school kids.";
      }

      const promptText = 
        selectedLang === 'or'
          ? "ଏହି କଳାପଟାରେ ଲେଖାଯାଇଥିବା ପ୍ରଶ୍ନ, ଶବ୍ଦ କିମ୍ବା ଅଙ୍କାଯାଇଥିବା ଚିତ୍ରଟିକୁ ଚିହ୍ନଟ କରି ସରଳ ଭାଷାରେ ବୁଝାନ୍ତୁ ଏବଂ ସମାଧାନ କରନ୍ତୁ।"
          : "Please identify and explain the drawing, words, or mathematical problem written on this chalkboard.";

      const contents = [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ];

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction,
          modelType: 'flash'
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const rawText = data.text || "Could not generate solution.";
      setExplanation(cleanOdiaOrthography(rawText, false));

      // Increment free queries token counter for unsubscribed users if it is a valid academic query and not safety-blocked
      if (!isPremium) {
        const isSafetyBlocked = rawText.includes("Safety Warning") || rawText.includes("Perspective API") || rawText.includes("ସୁରକ୍ଷା ଚେତାବନୀ");
        if (!isSafetyBlocked) {
          const getFreeQueriesKey = () => `free_ai_queries_used_${user?.uid || user?.id || 'guest'}`;
          const currentFreeCount = parseInt(localStorage.getItem(getFreeQueriesKey()) || '0', 10);
          localStorage.setItem(getFreeQueriesKey(), (currentFreeCount + 1).toString());
          setFreeQueriesCount(currentFreeCount + 1);
        }
      }
    } catch (err) {
      console.error("AI Blackboard Solve Error:", err);
      setExplanation(
        selectedLang === 'or'
          ? "❌ ପ୍ରଶ୍ନଟି ପଢିବାରେ ଅସୁବିଧା ହେଲା | ଦୟାକରି ସ୍ପଷ୍ଟ ଭାବେ ପୁଣିଥରେ ଲେଖନ୍ତୁ।"
          : "❌ Failed to analyze chalkboard. Please write or draw clearly."
      );
    } finally {
      setLoading(false);
    }
  };

  const convertHandwritingToText = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeImage) {
      await bakeImageToCanvasPromise();
    }

    stopAudio();
    setScanning(true);
    setLoading(true);
    
    try {
      const dataUrl = getCanvasDataUrlWithBackground();
      const base64Data = dataUrl.split(',')[1];

      const systemInstruction = 
        "You are an expert OCR transcription tool for handwriting. " +
        "Your task is to transcribe exactly what is written on the chalkboard. " +
        "1. Identify the handwritten text in the chalkboard (could be in Odia or English script). " +
        "2. Do NOT add any explanations, summaries, or intro/outro text. Only return the exact transcribed text. " +
        "3. Preserve the line breaks and layout of the handwriting as closely as possible. " +
        "4. If there are math equations, transcribe them clearly using standard text symbols (e.g., x^2 + 5x + 6 = 0).";

      const promptText = "Transcribe the handwritten text from this chalkboard image exactly, line-by-line, without adding any comments or markdown wrappers.";

      const contents = [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ];

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction,
          modelType: 'flash'
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const rawText = data.text || "";
      const cleanText = rawText.trim();

      if (cleanText) {
        // Clear board first
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
        
        // Write text line-by-line
        ctx.fillStyle = '#fef8ec';
        ctx.font = 'bold 26px "Courier New", Courier, monospace';
        ctx.textBaseline = 'top';

        const lines = cleanText.split('\n');
        let startY = 80;
        const lineHeight = 42;

        lines.forEach(line => {
          ctx.fillText(line, 60, startY);
          startY += lineHeight;
        });

        // Save state to undo/redo history
        const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        newHistory.push(currentState);
        
        if (newHistory.length > 25) {
          newHistory.shift();
        }
        
        historyRef.current = newHistory;
        historyIndexRef.current = newHistory.length - 1;
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);
      }
    } catch (err) {
      console.error("Handwriting OCR conversion error:", err);
      alert(selectedLang === 'or' ? "❌ ହାତଲେଖା ପଢିବାରେ ଅସୁବିଧା ହେଲା।" : "❌ Failed to transcribe handwriting.");
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  // Custom Markdown renderer components to render steps as premium UI cards
  const markdownComponents = {
    h3: ({ children, ...props }: any) => (
      <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mt-4 mb-2 border-b border-emerald-500/10 pb-1" {...props}>
        <Lucide.Sparkles size={11} className="text-emerald-400 animate-pulse" />
        {children}
      </h3>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="space-y-3 my-3 list-none pl-0" {...props}>
        {children}
      </ol>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="space-y-3 my-3 list-none pl-0" {...props}>
        {children}
      </ul>
    ),
    li: ({ children, ...props }: any) => (
      <li className="flex gap-3 bg-slate-950/40 border border-white/5 p-3 rounded-2xl shadow-sm hover:border-emerald-500/10 hover:bg-slate-950/60 transition-all duration-300 group" {...props}>
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black group-hover:bg-emerald-500 group-hover:text-white transition-all">
          ✓
        </div>
        <div className="text-slate-200 text-xs md:text-sm leading-relaxed">{children}</div>
      </li>
    ),
    p: ({ children, ...props }: any) => {
      const text = typeof children === 'string' ? children : '';
      // Identify Socratic challenge / question lines
      const isQuestion = text.includes('?') || text.includes('?') || (text.includes('କର') && text.includes('।'));
      
      if (isQuestion) {
        return (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 rounded-2xl shadow-sm my-3 flex gap-3 animate-pulse hover:animate-none">
            <Lucide.HelpCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁଙ୍କ ପ୍ରଶ୍ନ (Challenge)' : "Gundulu's Challenge"}
              </span>
              <p className="text-slate-200 text-xs md:text-sm font-medium leading-relaxed m-0" {...props}>
                {children}
              </p>
            </div>
          </div>
        );
      }
      
      return (
        <p className="text-slate-300 text-xs md:text-sm leading-relaxed" {...props}>
          {children}
        </p>
      );
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md overflow-y-auto scroll-smooth overscroll-contain p-3 md:p-6 flex flex-col items-center justify-start md:justify-center force-dark-theme" style={{ WebkitOverflowScrolling: 'touch' }}>
      
      {/* CSS injected stylesheet for custom chalkboard themes and layout */}
      <style>{`
        .board-theme-green {
          background-color: #0f2f1d !important;
          background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px) !important;
          background-size: 100% 30px !important;
        }
        .board-theme-black {
          background-color: #121214 !important;
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px) !important;
          background-size: 100% 30px !important;
        }
        .board-theme-grid {
          background-color: #0b0f17 !important;
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.06) 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px) !important;
          background-size: 60px 60px, 60px 60px, 15px 15px, 15px 15px !important;
        }
        .socratic-response-container p {
          color: #cbd5e1 !important;
          margin-bottom: 0.75rem;
        }
        .socratic-response-container strong {
          color: #34d399 !important;
          font-weight: 800;
        }
        .socratic-response-container ul, .socratic-response-container ol {
          margin-left: 0rem;
          padding-left: 0rem;
          margin-bottom: 0.75rem;
        }
        .socratic-response-container li {
          margin-bottom: 0.4rem;
        }
        /* Custom overlays for light theme body protection */
        .gundulu-popup-overlay,
        body.theme-daybreak .gundulu-popup-overlay {
          background-color: #020617 !important;
          border: 1px solid rgba(16, 185, 129, 0.2) !important;
        }
        .gundulu-popup-overlay .bg-slate-950\/40,
        body.theme-daybreak .gundulu-popup-overlay .bg-slate-950\/40 {
          background-color: rgba(2, 6, 23, 0.4) !important;
          border-color: rgba(255, 255, 255, 0.05) !important;
        }
        .force-dark-theme button span,
        body.theme-daybreak .force-dark-theme button span {
          color: inherit !important;
        }
      `}</style>

      {/* Dynamic background math glow */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="w-[92vw] max-w-[1080px] h-[85vh] max-h-[740px] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 my-4 md:my-0 force-dark-theme flex flex-col"
      >
        <div className="w-full h-full p-6 flex flex-col gap-4 bg-slate-950/40 relative min-h-0">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5 gap-4 flex-wrap md:flex-nowrap">
            {/* Title & Description */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
                <Lucide.PenTool size={18} />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-black text-white tracking-tight">
                  {selectedLang === 'or' ? 'GunduluAI ସ୍ମାର୍ଟ ବୋର୍ଡ' : "GunduluAI Smart Board"}
                </h3>
                <span className="text-[9px] md:text-[11px] text-slate-400 font-bold block mt-0.5 leading-none">
                  {boardMode === 'teacher' 
                    ? (selectedLang === 'or' ? 'ଶିକ୍ଷକ ସ୍ମାର୍ଟବୋର୍ଡ: ପାଠ୍ୟ ଉଦାହରଣ ଏବଂ ଆଇଡିଆ ପାଇଁ କଳାପଟାରେ ଲେଖନ୍ତୁ।' : 'Teacher Smartboard: Draw templates or write topics to get lesson ideas.')
                    : boardMode === 'anganwadi'
                    ? (selectedLang === 'or' ? 'ଶିଶୁ ବାଟିକା କଳାପଟା: ଆସ ଅକ୍ଷର ଲେଖିବା ଓ ମଜା ଗପ ଶୁଣିବା!' : 'Sishu Vatika Board: Let\'s trace letters and hear sweet stories!')
                    : (selectedLang === 'or' ? 'ଛାତ୍ର ସ୍ମାର୍ଟବୋର୍ଡ: ଅଙ୍କ କିମ୍ବା ପ୍ରଶ୍ନର ସମାଧାନ ପାଇଁ ଲେଖନ୍ତୁ।' : 'Student Board: Write equations or draw diagrams to get Socratic help.')}
                </span>
              </div>
            </div>

            {/* Themes and Close Controls */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-full border border-white/5 shadow-inner">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider pl-1.5">Theme:</span>
                <button
                  onClick={() => setBoardTheme('green')}
                  className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-700 border transition-all cursor-pointer ${boardTheme === 'green' ? 'border-amber-400 scale-115 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'border-white/20 hover:scale-105 hover:border-white/40'}`}
                  title="Traditional Green Chalkboard"
                />
                <button
                  onClick={() => setBoardTheme('black')}
                  className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-slate-400 to-slate-600 border transition-all cursor-pointer ${boardTheme === 'black' ? 'border-amber-400 scale-115 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'border-white/20 hover:scale-105 hover:border-white/40'}`}
                  title="Sleek Obsidian Chalkboard"
                />
                <button
                  onClick={() => setBoardTheme('grid')}
                  className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 border transition-all cursor-pointer ${boardTheme === 'grid' ? 'border-emerald-400 scale-115 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'border-white/20 hover:scale-105 hover:border-white/40'} flex items-center justify-center`}
                  title="Engineering Grid Slate"
                >
                  <div className="w-full h-full rounded-full border border-dashed border-white/40 scale-[0.7]" />
                </button>
              </div>

              <button
                onClick={handleClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 hover:border-red-500/20 text-slate-400 transition-all cursor-pointer flex-shrink-0"
                title="Close Smart Board"
              >
                <Lucide.X size={14} />
              </button>
            </div>
          </div>

          {/* Blackboard Board Frame (using class themes) */}
          <div 
            ref={boardFrameRef}
            className={`flex-1 border-[12px] border-amber-900 rounded-3xl overflow-y-auto scrollbar-hide shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(0,0,0,0.8)] relative select-none board-theme-${boardTheme} transition-all duration-300 min-h-0`}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair block w-full touch-none bg-transparent"
            />
            {scanning && (
              <motion.div 
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 1.8, repeat: 0, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_15px_#34d399,0_0_5px_#34d399] z-20 pointer-events-none"
              />
            )}
            {/* Real Blackboard Dust Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.015] to-transparent pointer-events-none" />



            {/* Draggable/Resizable activeImage Overlay */}
            {activeImage && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${activeImage.x}px`,
                  top: `${activeImage.y}px`,
                  width: `${activeImage.width}px`,
                  height: `${activeImage.height}px`,
                  border: '2px dashed #f59e0b',
                  cursor: activeImage.isDragging ? 'grabbing' : 'grab',
                  zIndex: 35,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  let clientX = e.clientX;
                  let clientY = e.clientY;
                  setActiveImage(prev => prev ? {
                    ...prev,
                    isDragging: true,
                    dragStartX: clientX,
                    dragStartY: clientY
                  } : null);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  let clientX = e.touches[0].clientX;
                  let clientY = e.touches[0].clientY;
                  setActiveImage(prev => prev ? {
                    ...prev,
                    isDragging: true,
                    dragStartX: clientX,
                    dragStartY: clientY
                  } : null);
                }}
              >
                <img 
                  src={activeImage.url} 
                  alt="Overlay" 
                  className="w-full h-full object-contain pointer-events-none" 
                />
                <div 
                  style={{
                    position: 'absolute',
                    right: '-6px',
                    bottom: '-6px',
                    width: '14px',
                    height: '14px',
                    backgroundColor: '#f59e0b',
                    border: '2px solid #ffffff',
                    borderRadius: '50%',
                    cursor: 'se-resize',
                    zIndex: 40,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    let clientX = e.clientX;
                    let clientY = e.clientY;
                    setActiveImage(prev => prev ? {
                      ...prev,
                      isResizing: true,
                      dragStartX: clientX,
                      dragStartY: clientY
                    } : null);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    let clientX = e.touches[0].clientX;
                    let clientY = e.touches[0].clientY;
                    setActiveImage(prev => prev ? {
                      ...prev,
                      isResizing: true,
                      dragStartX: clientX,
                      dragStartY: clientY
                    } : null);
                  }}
                />
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-2 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      bakeImageToCanvasPromise();
                    }}
                    className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer transition-all active:scale-90"
                    title="Place Image"
                  >
                    <Lucide.Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage(null);
                    }}
                    className="p-1 rounded bg-red-500 hover:bg-red-600 text-white cursor-pointer transition-all active:scale-90"
                    title="Remove Image"
                  >
                    <Lucide.X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Gundulu Floating mascot button */}
            <div className="absolute bottom-4 right-4 z-30 flex flex-col items-end gap-1.5 pointer-events-auto">
              <AnimatePresence>
                {!loading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-950/90 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-widest py-1 px-2 rounded-lg shadow-lg pointer-events-none select-none"
                  >
                    {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁଙ୍କୁ ପଚାରନ୍ତୁ' : 'Ask Gundulu'}
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  solveProblem();
                }}
                disabled={loading}
                className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/50 bg-slate-950 shadow-[0_8px_25px_rgba(16,185,129,0.4)] hover:shadow-[0_8px_35px_rgba(16,185,129,0.7)] hover:border-emerald-400 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer relative flex items-center justify-center shrink-0"
              >
                {loading && (
                  <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center z-20">
                    <Lucide.BrainCircuit size={22} className="text-emerald-400 animate-spin" />
                  </div>
                )}
                <img 
                  src="/gundulu-v3.png" 
                  alt="Solve with Gundulu" 
                  className={`w-full h-full object-cover scale-[0.95] ${loading ? 'opacity-40' : 'hover:scale-105 transition-transform duration-300'}`} 
                />
                
                {/* Visual pulse rings behind the button to denote AI readiness */}
                {!loading && (
                  <span className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping opacity-75 pointer-events-none" style={{ animationDuration: '2.5s' }} />
                )}
              </button>
            </div>

            {/* Premium Upgrade Modal Overlay */}
            <AnimatePresence>
              {showUpgradeModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-5 rounded-[2rem] select-none force-dark-theme"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[60px] pointer-events-none" />
                  
                  <div className="relative max-w-sm w-full bg-slate-900/60 border border-amber-500/25 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl flex flex-col items-center gap-5 text-center">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-full bg-amber-500 blur-xl opacity-25 animate-pulse" />
                      <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center overflow-hidden">
                        <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover scale-[0.95]" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-base md:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-amber-400 uppercase tracking-wide">
                        {selectedLang === 'or' ? 'ମାଗଣା ସୀମା ଶେଷ ହୋଇଛି! ✍️' : 'Slate Trial Limit Reached! ✍️'}
                      </h3>
                      <p className="text-[11px] md:text-xs font-bold text-slate-350 leading-relaxed">
                        {selectedLang === 'or'
                          ? 'ଗୁନ୍ଦୁଲୁ କଳାପଟା ସ୍କାନର୍ ସାହାଯ୍ୟରେ ସମସ୍ତ ବିଷୟର ଜଟିଳ ଗଣିତ ଏବଂ ପ୍ରଶ୍ନର ସମାଧାନ ପାଇବା ପାଇଁ ପ୍ରିମିୟମ୍‌କୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!'
                          : 'Upgrade to Gundulu Premium to scan and solve unlimited chalkboard questions, complex equations, and get dynamic step-by-step guidance.'}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2.5 w-full mt-1.5">
                      <button
                        onClick={() => {
                          setShowUpgradeModal(false);
                          if (onUpgrade) onUpgrade();
                        }}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        <Lucide.Sparkles size={13} className="animate-pulse" />
                        <span>{selectedLang === 'or' ? 'ପ୍ରିମିୟମ ଅପଗ୍ରେଡ୍' : 'Upgrade to Premium'}</span>
                      </button>
                      
                      <button
                        onClick={() => setShowUpgradeModal(false)}
                        className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-95 transition-all font-black text-[10px] uppercase tracking-wider cursor-pointer"
                      >
                        {selectedLang === 'or' ? 'ଅତିକ୍ରମ କରନ୍ତୁ' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Drawing Templates (Hackathon Showcase Tool for Judges only) */}
          {isJudge && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/45 p-3 rounded-2xl border border-white/5 relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent pointer-events-none" />
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1.5 z-10 relative">
                <Lucide.Sparkles size={11} className="animate-pulse text-amber-400 fill-amber-400" />
                {selectedLang === 'or' ? 'ଶୀଘ୍ର ଡେମୋ ଚିତ୍ର (Demo Drawings):' : 'Demo Templates:'}
              </span>
              <div className="flex flex-wrap gap-1.5 z-10 relative">
                <button
                  type="button"
                  onClick={() => loadTemplate('equation')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-amber-500/50 hover:bg-slate-800/80 text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center gap-1"
                >
                  <span>📐 {selectedLang === 'or' ? 'ଦ୍ଵିଘାତ ସମୀକରଣ' : 'Math Equation'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate('triangle')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-amber-500/50 hover:bg-slate-800/80 text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center gap-1"
                >
                  <span>🔺 {selectedLang === 'or' ? 'ଜ୍ୟାମିତିକ ତ୍ରିଭୁଜ' : 'Right Triangle'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate('odia')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-amber-500/50 hover:bg-slate-800/80 text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center gap-1"
                >
                  <span>✍️ {selectedLang === 'or' ? 'ଓଡ଼ିଆ ଶବ୍ଦ (ବାଘ)' : 'Odia Word (ବାଘ)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate('ocr')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400 hover:bg-slate-800/80 text-emerald-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center gap-1 shadow-lg shadow-emerald-500/5"
                >
                  <span>📸 {selectedLang === 'or' ? 'ପାଠ୍ୟପୁସ୍ତକ ସ୍କାନ (OCR)' : 'Textbook OCR Scan'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Chalk Toolbar controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
            {/* Color/Eraser options */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsEraser(false); setBrushColor('#fef8ec'); }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${!isEraser && brushColor === '#fef8ec' ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="White Chalk"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#fef8ec] shadow-sm" />
              </button>
              <button
                onClick={() => { setIsEraser(false); setBrushColor('#fef08a'); }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${!isEraser && brushColor === '#fef08a' ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="Yellow Chalk"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#fef08a] shadow-sm" />
              </button>
              <button
                onClick={() => { setIsEraser(false); setBrushColor('#93c5fd'); }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${!isEraser && brushColor === '#93c5fd' ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="Blue Chalk"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#93c5fd] shadow-sm" />
              </button>
              <button
                onClick={() => setIsEraser(true)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all text-slate-300 hover:text-white cursor-pointer ${isEraser ? 'border-amber-400 bg-white/10 scale-105' : 'border-white/10 hover:bg-white/5'}`}
                title="Eraser"
              >
                <Lucide.Eraser size={14} />
              </button>
            </div>

            {/* Smartboard Image Upload & OCR Tools */}
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 hover:border-amber-500/50 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                title="Upload image overlay"
              >
                <Lucide.Image size={12} />
                <span>{selectedLang === 'or' ? 'ଛବି ଆଣନ୍ତୁ' : 'Upload Image'}</span>
              </button>

              {(boardMode === 'student' || boardMode === 'teacher') && (
                <button
                  onClick={convertHandwritingToText}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-400 hover:bg-slate-800 text-emerald-400 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
                  title="Transcribe drawings to text"
                >
                  <Lucide.Sparkles size={12} className="animate-pulse" />
                  <span>{selectedLang === 'or' ? 'ଲିଖନରୁ ପାଠ୍ୟ' : 'Ink to Text'}</span>
                </button>
              )}
            </div>

            {/* Undo / Redo controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  canUndo 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300' 
                    : 'bg-slate-950/40 border-white/5 text-slate-600 opacity-40 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Lucide.Undo2 size={13} />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  canRedo 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 hover:text-emerald-300' 
                    : 'bg-slate-950/40 border-white/5 text-slate-600 opacity-40 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Lucide.Redo2 size={13} />
              </button>
            </div>

            {/* Brush Width Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chalk Size:</span>
              <input
                type="range"
                min="2"
                max="12"
                value={brushWidth}
                onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                className="w-20 accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Blackboard Reset */}
            <button
              onClick={clearBoard}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-400 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1"
            >
              <Lucide.Trash2 size={11} />
              {selectedLang === 'or' ? 'କାଟି ଦିଅନ୍ତୁ' : 'Clear Board'}
            </button>
          </div>
        </div>

        {/* Overlay Response Dialog Popup */}
        <AnimatePresence>
          {showResponsePopup && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.3 }}
              className="gundulu-popup-overlay absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 p-5 md:p-6 flex flex-col justify-between rounded-[2.5rem]"
            >
              {/* Popup Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30 bg-emerald-950/20 shadow-md">
                    <img src="/gundulu-v3.png" alt="Gundulu Mascot" className="w-full h-full object-cover scale-[0.95]" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-widest leading-none mb-1">
                      {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁ ଆପା ସମାଧାନ' : 'Gundulu Socratic Answer'}
                    </h4>
                    <span className="text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      {loading 
                        ? (selectedLang === 'or' ? 'ଚିନ୍ତା କରୁଛି...' : 'Thinking...') 
                        : (selectedLang === 'or' ? 'ପ୍ରସ୍ତୁତ' : 'Ready')}
                    </span>
                  </div>
                </div>

                {/* Header Right Actions */}
                <div className="flex items-center gap-3">
                  {/* Language Switcher */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-white/10 scale-90">
                    <button
                      onClick={() => setSelectedLang('or')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${selectedLang === 'or' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      ଓଡ଼ିଆ
                    </button>
                    <button
                      onClick={() => setSelectedLang('en')}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all cursor-pointer ${selectedLang === 'en' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      EN
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowResponsePopup(false);
                      stopAudio();
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 transition-all cursor-pointer flex-shrink-0"
                    title="Close Solution"
                  >
                    <Lucide.X size={14} />
                  </button>
                </div>
              </div>

              {/* Popup Body (Scrollable Socratic Explanation) */}
              <div className="flex-1 overflow-y-auto my-4 pr-1 scrollbar-thin scrollbar-thumb-emerald-500/10 select-text">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full my-auto gap-4 py-8">
                    <Lucide.BrainCircuit size={40} className="text-emerald-400 animate-pulse" />
                    <div className="flex flex-col items-center text-center">
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-widest animate-bounce">
                        {selectedLang === 'or' ? 'ଗୁନ୍ଦୁଲୁ ହିସାବ କରୁଛି...' : 'Gundulu calculating...'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 max-w-[250px]">
                        {selectedLang === 'or' 
                          ? 'ଗୁନ୍ଦୁଲୁ ଆପା ଚକ୍ ଗାରଗୁଡିକୁ ପଢି ସମାଧାନ ପ୍ରସ୍ତୁତ କରୁଛନ୍ତି।' 
                          : 'Reading chalkboard strokes with Gemini Vision OCR.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="socratic-response-container text-xs md:text-sm text-slate-200 leading-relaxed space-y-2 pb-6">
                    {displayedExplanation ? (
                      <ReactMarkdown components={markdownComponents}>{displayedExplanation}</ReactMarkdown>
                    ) : (
                      <p className="text-slate-500 text-center py-6 text-xs font-bold">
                        {selectedLang === 'or' ? 'କୌଣସି ସମାଧାନ ମିଳିଲା ନାହିଁ।' : 'No solution generated.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Popup Footer Action Buttons */}
              {!loading && explanation && (
                <div className="flex items-center gap-3 border-t border-slate-800 pt-3 flex-shrink-0">
                  {/* Audio TTS button */}
                  <button
                    onClick={speakText}
                    className={`flex-1 py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer font-black text-[10px] uppercase tracking-wider ${speaking ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-800'}`}
                  >
                    {speaking ? <Lucide.VolumeX size={14} /> : <Lucide.Volume2 size={14} />}
                    <span>{speaking ? (selectedLang === 'or' ? 'ଅଟକାନ୍ତୁ' : 'Stop Audio') : (selectedLang === 'or' ? 'ସମାଧାନ ଶୁଣନ୍ତୁ' : 'Listen Solution')}</span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lucide.Share2 size={14} />
                    <span>{selectedLang === 'or' ? 'ସେୟାର୍ କରନ୍ତୁ' : 'Share Solution'}</span>
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => {
                      setShowResponsePopup(false);
                      stopAudio();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/10"
                  >
                    {selectedLang === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
};
