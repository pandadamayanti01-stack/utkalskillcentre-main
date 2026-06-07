import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../translations';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface Gundulu3DLabProps {
  language: 'en' | 'or';
  user: any;
  initialModelKey?: string;
  isEmbedded?: boolean;
  onBack?: () => void;
}

interface ModelMetadata {
  id: string;
  nameEn: string;
  nameOr: string;
  category: 'science' | 'math' | 'geography' | 'language';
  glbUrl: string;
  ar: boolean;
  minClass: number;
  maxClass: number;
  descriptionEn: string;
  descriptionOr: string;
  voiceTextEn: string;
  voiceTextOr: string;
  hotspots: Array<{
    id: string;
    labelEn: string;
    labelOr: string;
    descriptionEn: string;
    descriptionOr: string;
    position: string;
    normal: string;
  }>;
}

const MODELS_REGISTRY: ModelMetadata[] = [
  {
    id: 'heart',
    nameEn: 'Human Heart Anatomy',
    nameOr: 'ମାନବ ହୃତପିଣ୍ଡ ଶରୀର ବିଜ୍ଞାନ',
    category: 'science',
    glbUrl: 'https://raw.githubusercontent.com/Rajvardhan-Desai/Multi-Organ-XAI-AR/master/frontend/public/static/heart/heart.glb',
    ar: true,
    minClass: 9,
    maxClass: 10,
    descriptionEn: 'Interactive 3D model of the human heart showing ventricles, aorta, and blood flow.',
    descriptionOr: 'ମାନବ ହୃତପିଣ୍ଡର ପାରସ୍ପରିକ ୩D ମଡେଲ୍ ଯାହା ନିଳୟ, ମହାଧମନୀ ଏବଂ ରକ୍ତ ପ୍ରବାହ ଦର୍ଶାଏ।',
    voiceTextEn: 'The human heart has four chambers: the right atrium, left atrium, right ventricle, and left ventricle. The aorta is the largest artery carrying oxygen-rich blood to the body.',
    voiceTextOr: 'ମାନବ ହୃତପିଣ୍ଡର ଚାରୋଟି ପ୍ରକୋଷ୍ଠ ରହିଛି: ଦକ୍ଷିଣ ଅଳିନ୍ଦ, ବାମ ଅଳିନ୍ଦ, ଦକ୍ଷିଣ ନିଳୟ ଏବଂ ବାମ ନିଳୟ। ମହାଧମନୀ ହେଉଛି ସର୍ବବୃହତ ଧମନୀ ଯାହା ଶରୀରକୁ ଅମ୍ଳଜାନଯୁକ୍ତ ରକ୍ତ ବହନ କରେ।',
    hotspots: [
      {
        id: 'aorta',
        labelEn: 'Aorta',
        labelOr: 'ମହାଧମନୀ',
        descriptionEn: 'The main artery that carries blood from the heart to the rest of the body.',
        descriptionOr: 'ମୁଖ୍ୟ ଧମନୀ ଯାହା ହୃତପିଣ୍ଡରୁ ଶରୀରର ଅନ୍ୟ ସମସ୍ତ ଅଂଶକୁ ରକ୍ତ ବହନ କରିଥାଏ।',
        position: '0.01 0.12 0.02',
        normal: '0 1 0'
      },
      {
        id: 'left_ventricle',
        labelEn: 'Left Ventricle',
        labelOr: 'ବାମ ନିଳୟ',
        descriptionEn: 'Pumps oxygenated blood to the body through the aorta.',
        descriptionOr: 'ମହାଧମନୀ ଦ୍ୱାରା ଅମ୍ଳଜାନଯୁକ୍ତ ରକ୍ତକୁ ଶରୀର ସାରା ପମ୍ପ କରିଥାଏ।',
        position: '-0.04 -0.04 0.03',
        normal: '-1 0 0'
      },
      {
        id: 'right_ventricle',
        labelEn: 'Right Ventricle',
        labelOr: 'ଡାହାଣ ନିଳୟ',
        descriptionEn: 'Pumps oxygen-poor blood to the lungs.',
        descriptionOr: 'ଅମ୍ଳଜାନ ବିହୀନ ରକ୍ତକୁ ଫୁସଫୁସକୁ ପମ୍ପ କରିଥାଏ।',
        position: '0.04 -0.04 0.03',
        normal: '1 0 0'
      }
    ]
  },
  {
    id: 'globe_interactive',
    nameEn: 'Interactive Earth Globe',
    nameOr: 'ପୃଥିବୀ ଗ୍ଲୋବ୍ ଓ ଅକ୍ଷାଂଶ',
    category: 'geography',
    glbUrl: '', // Using procedural custom fallback
    ar: false,
    minClass: 6,
    maxClass: 8,
    descriptionEn: 'Interactive rotating globe mapping continents, equator, and coordinates.',
    descriptionOr: 'ମହାଦେଶ, ବିଷୁବରେଖା ଏବଂ ଭୌଗୋଳିକ ଅକ୍ଷାଂଶ ଦର୍ଶାଉଥିବା ଏକ ଘୂର୍ଣ୍ଣନଶୀଳ ଗ୍ଲୋବ୍।',
    voiceTextEn: 'The Earth is divided by lines of latitude and longitude. The Equator sits at zero degrees latitude, dividing the earth into Northern and Southern hemispheres.',
    voiceTextOr: 'ପୃଥିବୀକୁ ଅକ୍ଷାଂଶ ଏବଂ ଦ୍ରାଘିମା ରେଖାରେ ବିଭକ୍ତ କରାଯାଇଛି। ବିଷୁବରେଖା ଶୂନ ଡିଗ୍ରୀ ଅକ୍ଷାଂଶରେ ଅବସ୍ଥିତ, ଯାହା ପୃଥିବୀକୁ ଉତ୍ତର ଏବଂ ଦକ୍ଷିଣ ଗୋଲାର୍ଦ୍ଧରେ ବିଭକ୍ତ କରେ।',
    hotspots: []
  },
  {
    id: 'math_shapes',
    nameEn: '3D Mensuration & Geometry',
    nameOr: '୩D ପରିମିତି ଓ ଜ୍ୟାମିତି',
    category: 'math',
    glbUrl: '', // Procedural fallback
    ar: false,
    minClass: 8,
    maxClass: 10,
    descriptionEn: 'Interactive 3D geometry engine to inspect Cone, Cylinder, Sphere, and Cubes.',
    descriptionOr: 'କୋନ୍, ସିଲିଣ୍ଡର, ଗୋଲକ ଏବଂ ଘନକ ପରୀକ୍ଷା କରିବା ପାଇଁ ଇଣ୍ଟରାକ୍ଟିଭ୍ ଗଣିତ ଇଞ୍ଜିନ୍।',
    voiceTextEn: 'In 3D geometry, shapes have volume and surface area. Drag the sliders to change dimensions and see how volume changes.',
    voiceTextOr: '୩D ଜ୍ୟାମିତିରେ, ଆକୃତିଗୁଡ଼ିକର ଆୟତନ ଏବଂ ପୃଷ୍ଠକାଳୀ ରହିଥାଏ। ଡାଇମେନ୍ସନ୍ ବଦଳାଇବାକୁ ସ୍ଲਾਈଡର୍ ବ୍ୟବହାର କରନ୍ତୁ।',
    hotspots: []
  },
  {
    id: 'language_mindmap',
    nameEn: 'Sentence Structure & Grammar',
    nameOr: 'ବାକ୍ୟ ଗଠନ ଓ ବ୍ୟାକରଣ',
    category: 'language',
    glbUrl: '', // Procedural fallback
    ar: false,
    minClass: 1,
    maxClass: 8,
    descriptionEn: '3D mind map detailing parts of speech: Subject, Object, Verbs, and Adjectives.',
    descriptionOr: 'ବାକ୍ୟର ଗଠନ ଶୈଳୀ: କର୍ତ୍ତା, କର୍ମ, କ୍ରିୟା ଏବଂ ବିଶେଷଣ ଦର୍ଶାଉଥିବା ୩D ଚିତ୍ର।',
    voiceTextEn: 'A sentence is composed of a subject, object, and verb. In Odia, the verb usually comes at the end, unlike English which has a subject verb object order.',
    voiceTextOr: 'ଏକ ବାକ୍ୟ କର୍ତ୍ତା, କର୍ମ ଏବଂ କ୍ରିୟା ଦ୍ୱାରା ଗଠିତ। ଇଂରାଜୀ ଭଳି ନୁହେଁ, ଓଡ଼ିଆରେ କ୍ରିୟା ସାଧାରଣତଃ ବାକ୍ୟର ଶେଷରେ ଆସିଥାଏ।',
    hotspots: []
  },
  {
    id: 'plant_cell',
    nameEn: 'Plant Cell Structure',
    nameOr: 'ଉଦ୍ଭିଦ କୋଷ ଗଠନ',
    category: 'science',
    glbUrl: 'https://raw.githubusercontent.com/GordenSun/LearningCell/main/app/public/models/plant-cell.glb',
    ar: true,
    minClass: 8,
    maxClass: 10,
    descriptionEn: 'Interactive 3D model of a plant cell detailing chloroplasts, cell wall, and nucleus.',
    descriptionOr: 'ଉଦ୍ଭିଦ କୋଷର ପାରସ୍ପରିକ ୩D ମଡେଲ୍ ଯେଉଁଥିରେ ହରିତଲବକ, କୋଷ ଭିତ୍ତି ଏବଂ ନ୍ୟଷ୍ଟି ଦର୍ଶାଯାଇଛି।',
    voiceTextEn: 'A plant cell has a rigid cell wall, a large central vacuole, and chloroplasts that perform photosynthesis to make food.',
    voiceTextOr: 'ଏକ ଉଦ୍ଭିଦ କୋଷରେ ଏକ ଶକ୍ତ କୋଷ ଭିତ୍ତି, ଏକ ବୃହତ ରସଧାନୀ ଏବଂ ଆଲୋକ ସଂଶ୍ଳେଷଣ କରୁଥିବା ହରିତଲବକ ରହିଥାଏ।',
    hotspots: []
  }
];

export const Gundulu3DLab: React.FC<Gundulu3DLabProps> = ({
  language,
  user,
  initialModelKey,
  isEmbedded = false,
  onBack
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'all' | 'science' | 'math' | 'geography' | 'language'>('all');

  // Helper to retrieve user's class level as a number
  const getUserClassNumber = (): number => {
    if (!user || !user.class) return 10; // Default fallback to class 10
    const str = String(user.class);
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 10;
  };

  const studentClass = getUserClassNumber();
  const allowedModels = MODELS_REGISTRY.filter(
    m => studentClass >= m.minClass && studentClass <= m.maxClass
  );

  const [selectedModel, setSelectedModel] = useState<ModelMetadata>(
    (allowedModels.length > 0) ? allowedModels[0] : MODELS_REGISTRY[0]
  );
  const [activeHotspot, setActiveHotspot] = useState<any>(null);
  
  // Game states
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentQuizHotspot, setCurrentQuizHotspot] = useState<any>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Math procedural 3D model controls
  const [mathShape, setMathShape] = useState<'cone' | 'cylinder' | 'sphere' | 'cube'>('cylinder');
  const [mathRadius, setMathRadius] = useState<number>(30);
  const [mathHeight, setMathHeight] = useState<number>(60);

  // Procedural canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const rotationRef = useRef({ x: 0.5, y: 0.5 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Sound/TTS states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const speechUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Map requested model if set using smart keyword matching
  useEffect(() => {
    if (initialModelKey) {
      const keyLower = initialModelKey.toLowerCase();
      
      // 1. Direct ID check
      let match = allowedModels.find(m => m.id === keyLower);
      if (match) {
        setSelectedModel(match);
        return;
      }
      
      // 2. Keyword check for heart/blood circulation
      if (keyLower.includes('heart') || keyLower.includes('ରକ୍ତ') || keyLower.includes('ହୃତ') || keyLower.includes('ସଞ୍ଚାଳନ')) {
        match = allowedModels.find(m => m.id === 'heart');
      } 
      // 3. Keyword check for cells/DNA/science general
      else if (keyLower.includes('dna') || keyLower.includes('କୋଷ') || keyLower.includes('cell') || keyLower.includes('ଗଠନ') || keyLower.includes('atom') || keyLower.includes('ପରମାଣୁ') || keyLower.includes('science') || keyLower.includes('ବିଜ୍ଞାନ') || keyLower.includes('jigyasa') || keyLower.includes('bignana')) {
        match = allowedModels.find(m => m.id === 'heart');
      }
      // 4. Keyword check for math/geometry
      else if (keyLower.includes('math') || keyLower.includes('ganita') || keyLower.includes('algebra') || keyLower.includes('geometry') || keyLower.includes('ଗଣିତ') || keyLower.includes('ବୀଜଗଣିତ') || keyLower.includes('ଜ୍ୟାମିତି') || keyLower.includes('ପରିମିତି')) {
        match = allowedModels.find(m => m.id === 'math_shapes');
      }
      // 5. Keyword check for geography/globe
      else if (keyLower.includes('geography') || keyLower.includes('globe') || keyLower.includes('earth') || keyLower.includes('ଭୂଗୋଳ') || keyLower.includes('ପୃଥିବୀ') || keyLower.includes('ମାନଚିତ୍ର')) {
        match = allowedModels.find(m => m.id === 'globe_interactive');
      }
      // 6. Keyword check for languages/grammar
      else if (keyLower.includes('english') || keyLower.includes('odia') || keyLower.includes('grammar') || keyLower.includes('ଭାଷା') || keyLower.includes('ବ୍ୟାକରଣ') || keyLower.includes('ସାହିତ୍ୟ') || keyLower.includes('sahitya')) {
        match = allowedModels.find(m => m.id === 'language_mindmap');
      }

      if (match) {
        setSelectedModel(match);
      }
    }
  }, [initialModelKey, studentClass]);

  // Sync selectedModel with class permissions
  useEffect(() => {
    if (allowedModels.length > 0 && !allowedModels.some(m => m.id === selectedModel.id)) {
      setSelectedModel(allowedModels[0]);
    }
  }, [studentClass]);

  // Audio speech synthesiser
  const handlePlayAudio = () => {
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const voiceText = language === 'or' ? selectedModel.voiceTextOr : selectedModel.voiceTextEn;
    const utterance = new SpeechSynthesisUtterance(voiceText);
    
    // Try to set bilingual voice
    utterance.lang = language === 'or' ? 'hi-IN' : 'en-US'; // hi-IN is used as fallback for Odia if no direct Odia voice is installed
    utterance.rate = 0.85;

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechUtterance.current = utterance;
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Filter models
  const filteredModels = activeTab === 'all' 
    ? allowedModels 
    : allowedModels.filter(m => m.category === activeTab);

  // Initialize Canvas 3D Projection Fallbacks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    // Node definitions for Language Mind-map
    const mindMapNodes = [
      { id: 'sentence', labelEn: 'Sentence', labelOr: 'ବାକ୍ୟ', x: 0, y: 0, z: 0, color: '#38bdf8' },
      { id: 'subject', labelEn: 'Subject (Noun)', labelOr: 'କର୍ତ୍ତା (ବିଶେଷ୍ୟ)', x: -80, y: -40, z: 40, color: '#10b981' },
      { id: 'object', labelEn: 'Object', labelOr: 'କର୍ମ', x: 80, y: -40, z: -40, color: '#f59e0b' },
      { id: 'verb', labelEn: 'Verb', labelOr: 'କ୍ରିୟା', x: 0, y: 80, z: 0, color: '#ec4899' },
      { id: 'adj', labelEn: 'Modifier', labelOr: 'ବିଶେଷଣ', x: -100, y: 30, z: 80, color: '#a855f7' }
    ];


    // Globe interactive vertices (representing continents / points of interest)
    const globePins = [
      { nameEn: 'Odisha, India', nameOr: 'ଓଡ଼ିଶା, ଭାରତ', lat: 20.27, lon: 85.84 },
      { nameEn: 'London, UK', nameOr: 'ଲଣ୍ଡନ, ୟୁକେ', lat: 51.5, lon: -0.12 },
      { nameEn: 'New York, USA', nameOr: 'ନ୍ୟୁୟର୍କ, ଆମେରିକା', lat: 40.71, lon: -74.0 },
      { nameEn: 'Tokyo, Japan', nameOr: 'ଟୋକିଓ, ଜପାନ', lat: 35.67, lon: 139.65 },
      { nameEn: 'Sydney, Australia', nameOr: 'ସିଡନୀ, ଅଷ୍ଟ୍ରେଲିଆ', lat: -33.86, lon: 151.2 }
    ];

    let localRotationY = 0;

    const render = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      // Apply standard dark space gradients
      const bgGrad = ctx.createRadialGradient(width/2, height/2, 5, width/2, height/2, width/1.2);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Add grid lines for Math Grapher
      if (selectedModel.id === 'math_shapes') {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 40) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
        }
        for (let j = 0; j < height; j += 40) {
          ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
        }
      }

      // 3D projections matrices & camera setups
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.7;

      // Rotations
      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y + localRotationY);
      const sinY = Math.sin(rotationRef.current.y + localRotationY);

      // Automatically spin the globe if not dragging
      if (!isDragging.current && selectedModel.id === 'globe_interactive') {
        localRotationY += 0.003;
      }

      // Projection formula helper
      // Dynamic scale factor to fit different device screens beautifully
      const dynamicScale = Math.min(Math.min(width, height) * 0.0055, 2.5);

      const project = (x: number, y: number, z: number) => {
        // Rotate Y
        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;
        // Rotate X
        let y2 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;
        
        // Depth scale
        const dist = 300;
        const depth = 1 / (1 + z2 / dist);
        return {
          x: cx + x1 * depth * dynamicScale,
          y: cy - y2 * depth * dynamicScale,
          depth: z2
        };
      };

      // RENDER GLOBE
      if (selectedModel.id === 'globe_interactive') {
        const radius = 95;
        // Draw outline of earth atmosphere
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * dynamicScale, 0, 2 * Math.PI);
        const atmGrad = ctx.createRadialGradient(
          cx, cy, radius * dynamicScale * 0.8,
          cx, cy, radius * dynamicScale
        );
        atmGrad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        atmGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.15)');
        atmGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = atmGrad;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Draw major latitude lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        [-60, -30, 0, 30, 60].forEach((lat) => {
          ctx.beginPath();
          const latRad = (lat * Math.PI) / 180;
          const latY = radius * Math.sin(latRad);
          const rSub = radius * Math.cos(latRad);

          for (let deg = 0; deg <= 360; deg += 10) {
            const lonRad = (deg * Math.PI) / 180;
            const pt = project(rSub * Math.cos(lonRad), latY, rSub * Math.sin(lonRad));
            if (deg === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
        });

        // Draw longitude lines
        for (let lon = 0; lon < 180; lon += 30) {
          ctx.beginPath();
          const lonRad = (lon * Math.PI) / 180;
          for (let lat = -90; lat <= 90; lat += 10) {
            const latRad = (lat * Math.PI) / 180;
            const pt = project(
              radius * Math.cos(latRad) * Math.cos(lonRad),
              radius * Math.sin(latRad),
              radius * Math.cos(latRad) * Math.sin(lonRad)
            );
            if (lat === -90) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }

        // Draw Equator Highlight
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let deg = 0; deg <= 360; deg += 5) {
          const lonRad = (deg * Math.PI) / 180;
          const pt = project(radius * Math.cos(lonRad), 0, radius * Math.sin(lonRad));
          if (deg === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw Equator Label in billboard projection
        const eqPt = project(radius, 0, 0);
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px sans-serif';
        ctx.fillText(language === 'or' ? 'ଭୂମଧ୍ୟରେଖା (Equator)' : 'Equator', eqPt.x + 5, eqPt.y - 5);

        // Draw Pins
        globePins.forEach((pin) => {
          const latRad = (pin.lat * Math.PI) / 180;
          const lonRad = (pin.lon * Math.PI) / 180;
          const x = radius * Math.cos(latRad) * Math.cos(lonRad);
          const y = radius * Math.sin(latRad);
          const z = radius * Math.cos(latRad) * Math.sin(lonRad);

          const pt = project(x, y, z);
          // Only render pins on front hemisphere (depth > 0)
          if (pt.depth < 0) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(language === 'or' ? pin.nameOr : pin.nameEn, pt.x + 10, pt.y + 4);
          }
        });
      }

      // RENDER MATH 3D GRAPHIC MODEL
      else if (selectedModel.id === 'math_shapes') {
        const r = mathRadius;
        const h = mathHeight;

        // Draw main axis coordinates
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;

        // X axis (Red)
        const xStart = project(-100, 0, 0);
        const xEnd = project(100, 0, 0);
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath(); ctx.moveTo(xStart.x, xStart.y); ctx.lineTo(xEnd.x, xEnd.y); ctx.stroke();

        // Y axis (Green)
        const yStart = project(0, -100, 0);
        const yEnd = project(0, 100, 0);
        ctx.strokeStyle = '#22c55e';
        ctx.beginPath(); ctx.moveTo(yStart.x, yStart.y); ctx.lineTo(yEnd.x, yEnd.y); ctx.stroke();

        // Z axis (Blue)
        const zStart = project(0, 0, -100);
        const zEnd = project(0, 0, 100);
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath(); ctx.moveTo(zStart.x, zStart.y); ctx.lineTo(zEnd.x, zEnd.y); ctx.stroke();

        // RENDER SHAPE
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';

        if (mathShape === 'cylinder') {
          // Bottom circle
          ctx.beginPath();
          for (let a = 0; a <= 360; a += 15) {
            const rad = (a * Math.PI) / 180;
            const pt = project(Math.cos(rad) * r, -h/2, Math.sin(rad) * r);
            if (a === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke(); ctx.fill();

          // Top circle
          ctx.beginPath();
          for (let a = 0; a <= 360; a += 15) {
            const rad = (a * Math.PI) / 180;
            const pt = project(Math.cos(rad) * r, h/2, Math.sin(rad) * r);
            if (a === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke(); ctx.fill();

          // Connection lines
          const pt1L = project(-r, -h/2, 0);
          const pt1U = project(-r, h/2, 0);
          const pt2L = project(r, -h/2, 0);
          const pt2U = project(r, h/2, 0);
          
          ctx.beginPath();
          ctx.moveTo(pt1L.x, pt1L.y); ctx.lineTo(pt1U.x, pt1U.y);
          ctx.moveTo(pt2L.x, pt2L.y); ctx.lineTo(pt2U.x, pt2U.y);
          ctx.stroke();
        } 
        
        else if (mathShape === 'cone') {
          // Bottom circle
          ctx.beginPath();
          for (let a = 0; a <= 360; a += 15) {
            const rad = (a * Math.PI) / 180;
            const pt = project(Math.cos(rad) * r, -h/2, Math.sin(rad) * r);
            if (a === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke(); ctx.fill();

          // Apex top
          const apex = project(0, h/2, 0);
          const sides = [0, 90, 180, 270];
          sides.forEach((deg) => {
            const rad = (deg * Math.PI) / 180;
            const basePt = project(Math.cos(rad) * r, -h/2, Math.sin(rad) * r);
            ctx.beginPath();
            ctx.moveTo(basePt.x, basePt.y);
            ctx.lineTo(apex.x, apex.y);
            ctx.stroke();
          });
        } 
        
        else if (mathShape === 'sphere') {
          // Horizontal rings
          for (let lat = -60; lat <= 60; lat += 30) {
            const latRad = (lat * Math.PI) / 180;
            const subRadius = r * Math.cos(latRad);
            const yOffset = r * Math.sin(latRad);

            ctx.beginPath();
            for (let lon = 0; lon <= 360; lon += 15) {
              const lonRad = (lon * Math.PI) / 180;
              const pt = project(subRadius * Math.cos(lonRad), yOffset, subRadius * Math.sin(lonRad));
              if (lon === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();
            ctx.stroke();
          }

          // Vertical rings
          for (let lon = 0; lon < 180; lon += 45) {
            const lonRad = (lon * Math.PI) / 180;
            ctx.beginPath();
            for (let lat = -90; lat <= 90; lat += 10) {
              const latRad = (lat * Math.PI) / 180;
              const pt = project(r * Math.cos(latRad) * Math.cos(lonRad), r * Math.sin(latRad), r * Math.cos(latRad) * Math.sin(lonRad));
              if (lat === -90) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
        } 
        
        else if (mathShape === 'cube') {
          // Cube vertices
          const size = r * 1.2;
          const v = [
            [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size],
            [-size, -size, size], [size, -size, size], [size, size, size], [-size, size, size]
          ];
          const projectedV = v.map(pt => project(pt[0], pt[1], pt[2]));

          // Edges list
          const edges = [
            [0,1], [1,2], [2,3], [3,0], // back face
            [4,5], [5,6], [6,7], [7,4], // front face
            [0,4], [1,5], [2,6], [3,7]  // connectors
          ];

          ctx.beginPath();
          edges.forEach(([i1, i2]) => {
            ctx.moveTo(projectedV[i1].x, projectedV[i1].y);
            ctx.lineTo(projectedV[i2].x, projectedV[i2].y);
          });
          ctx.stroke();
        }
      }

      // RENDER LANGUAGE CONCEPT MINDMAP
      else if (selectedModel.id === 'language_mindmap') {
        // Draw connection lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;

        const projectedNodes = mindMapNodes.map(node => ({
          ...node,
          proj: project(node.x, node.y, node.z)
        }));

        // Connect everything to the central sentence node
        const center = projectedNodes.find(n => n.id === 'sentence');
        if (center) {
          projectedNodes.forEach(node => {
            if (node.id !== 'sentence') {
              ctx.beginPath();
              ctx.moveTo(center.proj.x, center.proj.y);
              ctx.lineTo(node.proj.x, node.proj.y);
              ctx.stroke();
            }
          });
        }

        // Draw the nodes
        projectedNodes.forEach(node => {
          const size = node.id === 'sentence' ? 14 : 10;
          ctx.beginPath();
          ctx.arc(node.proj.x, node.proj.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = node.color;
          ctx.fill();
          
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Glow ring
          ctx.beginPath();
          ctx.arc(node.proj.x, node.proj.y, size + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = node.color + '33';
          ctx.stroke();

          // Labels
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          const txt = language === 'or' ? node.labelOr : node.labelEn;
          ctx.fillText(txt, node.proj.x - ctx.measureText(txt).width/2, node.proj.y - size - 6);
        });
      }



      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedModel, mathRadius, mathHeight, mathShape, language]);

  // Handle drag to rotate procedural canvases
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    rotationRef.current.y += dx * 0.01;
    rotationRef.current.x += dy * 0.01;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMousePos.current.x;
    const dy = e.touches[0].clientY - lastMousePos.current.y;
    rotationRef.current.y += dx * 0.015;
    rotationRef.current.x += dy * 0.015;
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] relative select-none">
      
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Lucide.ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Lucide.Box className="text-[#ffd700]" size={18} />
              {t.threeDLab}
            </h2>
          </div>
        </div>

        {/* Dropdown 3D Model Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="model-select" className="text-xs font-black text-slate-400 uppercase tracking-widest hidden md:inline-block">
            {language === 'or' ? '୩D ଚିତ୍ର ଚୟନ କରନ୍ତୁ:' : 'Select 3D Diagram:'}
          </label>
          <select
            id="model-select"
            value={selectedModel.id}
            onChange={(e) => {
              const model = allowedModels.find(m => m.id === e.target.value);
              if (model) {
                setSelectedModel(model);
                setActiveHotspot(null);
                setIsGameActive(false);
                setQuizCompleted(false);
              }
            }}
            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-[#b34d1f] transition-all cursor-pointer shadow-lg max-w-[240px] sm:max-w-none"
          >
            {allowedModels.map((model) => {
              const modelName = language === 'or' ? model.nameOr : model.nameEn;
              return (
                <option key={model.id} value={model.id} className="bg-slate-950 font-sans text-xs">
                  {modelName}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* FULL-SCREEN 3D VIEWPORT CONTAINER */}
      <div className="flex-1 w-full relative min-h-0 overflow-hidden bg-slate-950">
        
        {/* GLB model-viewer rendering */}
        {selectedModel.glbUrl ? (
          <model-viewer
            src={selectedModel.glbUrl}
            ar={selectedModel.ar ? true : undefined}
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            className="w-full h-full"
            alt={selectedModel.nameEn}
            style={{ width: '100%', height: '100%', outline: 'none' }}
          >
            {/* Hotspots */}
            {selectedModel.hotspots.map((hotspot) => (
              <button
                key={hotspot.id}
                className="hotspot-btn bg-emerald-500/90 border border-white text-white w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg animate-pulse"
                slot={`hotspot-${hotspot.id}`}
                data-position={hotspot.position}
                data-normal={hotspot.normal}
                onClick={() => setActiveHotspot(hotspot)}
              />
            ))}
          </model-viewer>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          />
        )}

        {/* Instruction tooltip overlay */}
        <div className="absolute bottom-20 sm:bottom-4 left-4 glass-card px-3 py-1.5 rounded-lg border border-white/5 bg-black/40 text-[10px] text-slate-400 font-bold pointer-events-none flex items-center gap-2 z-20 shadow-lg">
          <Lucide.RotateCw size={10} className="animate-spin" />
          {language === 'or' ? 'ଘୂର୍ଣ୍ଣନ କରିବାକୁ ଡ୍ରାଗ୍ କରନ୍ତୁ ଏବଂ ଜୁମ୍ କରିବାକୁ ପିଞ୍ଚ କରନ୍ତୁ' : 'Drag to rotate, pinch to zoom'}
        </div>

        {/* Floating Gundulu Fact Sheet (Top Right Overlay - Hidden on Math Shapes to prevent overlap) */}
        {selectedModel.id !== 'math_shapes' && (
          <div className="absolute top-4 right-4 w-72 glass-card p-4 rounded-2xl border border-white/10 bg-slate-900/85 backdrop-blur-md space-y-3 shadow-2xl z-20">
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              <Lucide.Sparkles className="text-[#ffd700]" size={14} />
              {language === 'or' ? 'ଗୁନ୍ଦୁଲୁର ତଥ୍ୟ' : "Gundulu's Fact Sheet"}
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed max-h-36 overflow-y-auto custom-scrollbar font-bold">
              {language === 'or' ? selectedModel.descriptionOr : selectedModel.descriptionEn}
            </p>
          </div>
        )}

        {/* Math Controls HUD (Top Left Overlay) */}
        {selectedModel.id === 'math_shapes' && (
          <div className="absolute top-4 left-4 glass-card p-3 rounded-xl border border-white/5 bg-slate-900/80 space-y-2 text-xs font-bold text-white max-w-[180px] z-20">
            <span className="text-[9px] uppercase tracking-widest text-[#ffd700]">{language === 'or' ? '୩D ଆକୃତି' : '3D Shapes'}</span>
            <div className="grid grid-cols-2 gap-1">
              {(['cone', 'cylinder', 'sphere', 'cube'] as const).map(shape => (
                <button
                  key={shape}
                  onClick={() => setMathShape(shape)}
                  className={`px-2 py-1 rounded bg-black/40 border border-white/5 text-[10px] capitalize ${mathShape === shape ? 'border-[#b34d1f] text-orange-400' : ''}`}
                >
                  {shape}
                </button>
              ))}
            </div>
            {mathShape !== 'sphere' && mathShape !== 'cube' && (
              <div className="space-y-1 pt-1">
                <label className="text-[10px] text-slate-400 flex justify-between">
                  <span>{language === 'or' ? 'ଉଚ୍ଚତା' : 'Height'}</span>
                  <span>{mathHeight}px</span>
                </label>
                <input 
                  type="range" min="30" max="90" value={mathHeight} 
                  onChange={e => setMathHeight(parseInt(e.target.value))}
                  className="w-full accent-orange-500 h-1 bg-black/40 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
            {mathShape !== 'cube' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 flex justify-between">
                  <span>{language === 'or' ? 'ବ୍ୟାସାର୍ଦ୍ଧ' : 'Radius'}</span>
                  <span>{mathRadius}px</span>
                </label>
                <input 
                  type="range" min="15" max="45" value={mathRadius} 
                  onChange={e => setMathRadius(parseInt(e.target.value))}
                  className="w-full accent-orange-500 h-1 bg-black/40 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* Math Calculator / Formula Solver HUD (Bottom Right Overlay - only for Math shapes, lifted to clear mobile navigation) */}
        {selectedModel.id === 'math_shapes' && (
          <div className="absolute bottom-20 sm:bottom-4 right-4 w-72 glass-card p-4 border border-cyan-500/20 bg-slate-900/85 backdrop-blur-md rounded-2xl space-y-2 shadow-2xl z-20">
            <h3 className="text-xs font-black text-cyan-400 flex items-center gap-2">
              <Lucide.Calculator size={14} />
              {language === 'or' ? 'ପରିମିତି ଗଣନା' : '3D Formula Solver'}
            </h3>
            
            <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>{language === 'or' ? 'ଆକୃତି' : 'Shape'}:</span>
                <span className="text-cyan-300 capitalize">{mathShape}</span>
              </div>
              {mathShape === 'cylinder' && (
                <>
                  <div className="flex justify-between">
                    <span>Volume (V):</span>
                    <span>π × r² × h</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1">
                    <span>{language === 'or' ? 'ମୂଲ୍ୟ' : 'Result'}:</span>
                    <span>{Math.round(Math.PI * Math.pow(mathRadius/10, 2) * (mathHeight/10))} cm³</span>
                  </div>
                </>
              )}
              {mathShape === 'cone' && (
                <>
                  <div className="flex justify-between">
                    <span>Volume (V):</span>
                    <span>1/3 × π × r² × h</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1">
                    <span>{language === 'or' ? 'ମୂଲ୍ୟ' : 'Result'}:</span>
                    <span>{Math.round((1/3) * Math.PI * Math.pow(mathRadius/10, 2) * (mathHeight/10))} cm³</span>
                  </div>
                </>
              )}
              {mathShape === 'sphere' && (
                <>
                  <div className="flex justify-between">
                    <span>Volume (V):</span>
                    <span>4/3 × π × r³</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1">
                    <span>{language === 'or' ? 'ମୂଲ୍ୟ' : 'Result'}:</span>
                    <span>{Math.round((4/3) * Math.PI * Math.pow(mathRadius/10, 3))} cm³</span>
                  </div>
                </>
              )}
              {mathShape === 'cube' && (
                <>
                  <div className="flex justify-between">
                    <span>Volume (V):</span>
                    <span>s³</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1">
                    <span>{language === 'or' ? 'ମୂଲ୍ୟ' : 'Result'}:</span>
                    <span>{Math.round(Math.pow((mathRadius * 1.2)/10, 3))} cm³</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mascot Helper Card (Bottom Left Overlay - Hidden on mobile to save screen space) */}
        <div className="absolute bottom-20 sm:bottom-4 left-4 max-w-[260px] glass-card p-2.5 bg-slate-900/80 backdrop-blur-sm border border-white/5 flex items-start gap-2 z-20 hidden sm:flex">
          <div className="h-6 w-6 rounded-full overflow-hidden border border-emerald-500/20 bg-slate-900 flex-shrink-0 flex items-center justify-center">
            <img 
              src="/gundulu-rath-crest.png" 
              alt="Gundulu" 
              className="w-full h-full object-cover scale-110" 
            />
          </div>
          <div className="text-[9px] text-slate-400 leading-relaxed font-bold">
            <span className="text-white block font-black mb-0.5">{language === 'or' ? 'ଗୁନ୍ଦୁଲୁ ସହାୟକ:' : 'Gundulu Helper:'}</span>
            {language === 'or'
              ? 'ମଡେଲ୍ ଦେଖାଯାଉନାହିଁ? ଚିନ୍ତା କରନ୍ତୁ ନାହିଁ, ଆମର Canvas ଚାଲିବ |'
              : 'Model not loading? Our canvas helper runs automatically.'}
          </div>
        </div>

        {/* Hotspot details overlay */}
        <AnimatePresence>
          {activeHotspot && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-4 right-4 md:left-4 md:right-auto md:max-w-md glass-card p-4 border border-emerald-500/30 bg-slate-900/95 rounded-xl z-30 shadow-2xl"
            >
              <div className="flex justify-between items-start">
                <h5 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <Lucide.Search size={14} />
                  {language === 'or' ? activeHotspot.labelOr : activeHotspot.labelEn}
                </h5>
                <button 
                  onClick={() => setActiveHotspot(null)}
                  className="p-1 rounded bg-white/5 text-slate-400 hover:text-white"
                >
                  <Lucide.X size={12} />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                {language === 'or' ? activeHotspot.descriptionOr : activeHotspot.descriptionEn}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
