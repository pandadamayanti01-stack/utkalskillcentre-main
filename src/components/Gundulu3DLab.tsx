import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../translations';
import { storage } from '../firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

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
  category: 'junior' | 'middle' | 'senior';
  glbUrl: string;
  storagePath?: string;
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
    category: 'senior',
    glbUrl: 'https://raw.githubusercontent.com/Rajvardhan-Desai/Multi-Organ-XAI-AR/master/frontend/public/static/heart/heart.glb',
    storagePath: '3D_Models_glb/class_9_to_10/heart.glb',
    ar: true,
    minClass: 9,
    maxClass: 12,
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
    category: 'middle',
    glbUrl: '',
    storagePath: '3D_Models_glb/class_6_to_8/globe_interactive.glb',
    ar: false,
    minClass: 6,
    maxClass: 8,
    descriptionEn: 'Interactive rotating globe mapping continents, equator, and coordinates.',
    descriptionOr: 'ମହାଦେଶ, ବିଷୁବରେଖa ଏବଂ ଭୌଗୋଳିକ ଅକ୍ଷାଂଶ ଦର୍ଶାଉଥିବା ଏକ ଘୂର୍ଣ୍ଣନଶୀଳ ଗ୍ଲୋବ୍।',
    voiceTextEn: 'The Earth is divided by lines of latitude and longitude. The Equator sits at zero degrees latitude, dividing the earth into Northern and Southern hemispheres.',
    voiceTextOr: 'ପୃଥିବୀକୁ ଅକ୍ଷାଂଶ ଏବଂ ଦ୍ରାଘିମା ରେଖାରେ ବିଭକ୍ତ କରାଯାଇଛି। ବିଷୁବରେଖା ଶୂନ ଡିଗ୍ରୀ ଅକ୍ଷାଂଶରେ ଅବସ୍ଥିତ, ଯାହା ପୃଥିବୀକୁ ଉତ୍ତର ଏବଂ ଦକ୍ଷିଣ ଗୋଲାର୍ଦ୍ଧରେ ବିଭକ୍ତ କରେ।',
    hotspots: []
  },
  {
    id: 'math_shapes',
    nameEn: '3D Mensuration & Geometry',
    nameOr: '୩D ପରିମିତି ଓ ଜ୍ୟାମିତି',
    category: 'middle',
    glbUrl: '',
    storagePath: '3D_Models_glb/class_6_to_8/math_shapes.glb',
    ar: false,
    minClass: 8,
    maxClass: 10,
    descriptionEn: 'Interactive 3D geometry engine to inspect Cone, Cylinder, Sphere, and Cubes.',
    descriptionOr: 'କୋନ୍, ସିଲିଣ୍ଡର, ଗୋଲକ ଏବଂ ଘନକ ପରୀକ୍ଷା କରିବା ପାଇଁ ଇଣ୍ଟରାକ୍ଟିଭ୍ ଗଣିତ ଇଞ୍ଜିନ୍।',
    voiceTextEn: 'In 3D geometry, shapes have volume and surface area. Drag the sliders to change dimensions and see how volume changes.',
    voiceTextOr: '୩D ଜ୍ୟାମିତିରେ, ଆକୃତିଗୁଡ଼ିକର ଆୟତନ ଏବଂ ପୃଷ୍ଠକାଳୀ ରହିଥାଏ। ଡାଇମେନ୍ସନ୍ ବଦଳାଇବାକୁ ସ୍ଲାଇଡର୍ ବ୍ୟବହାର କରନ୍ତୁ।',
    hotspots: []
  },
  {
    id: 'language_mindmap',
    nameEn: 'Sentence Structure & Grammar',
    nameOr: 'ବାକ୍ୟ ଗଠନ ଓ ବ୍ୟାକରଣ',
    category: 'junior',
    glbUrl: '',
    storagePath: '3D_Models_glb/class_6_to_8/language_mindmap.glb',
    ar: false,
    minClass: 1,
    maxClass: 8,
    descriptionEn: '3D mind map detailing parts of speech: Subject, Object, Verbs, and Adjectives.',
    descriptionOr: 'ବାକ୍ୟର ଗଠନ ଶୈଳୀ: କର୍ତ୍ତା, କର୍ମ, କ୍ରିୟา ଏବଂ ବିଶେଷଣ ଦର୍ଶାଉଥିବା ୩D ଚିତ୍ର।',
    voiceTextEn: 'A sentence is composed of a subject, object, and verb. In Odia, the verb usually comes at the end, unlike English which has a subject verb object order.',
    voiceTextOr: 'ଏକ ବାକ୍ୟ କର୍ତ୍ତା, କର୍ମ ଏବଂ କ୍ରିୟା ଦ୍ୱାରା ଗଠିତ। ଇଂରାଜୀ ଭଳି ନୁହେଁ, ଓଡ଼ିଆରେ କ୍ରିୟା ସାଧାରଣତଃ ବାକ୍ୟର ଶେଷରେ ଆସିଥାଏ।',
    hotspots: []
  },
  {
    id: 'plant_cell',
    nameEn: 'Plant Cell Structure',
    nameOr: 'ଉଦ୍ଭିଦ କୋଷ ଗଠନ',
    category: 'middle',
    glbUrl: 'https://raw.githubusercontent.com/GordenSun/LearningCell/main/app/public/models/plant-cell.glb',
    storagePath: '3D_Models_glb/class_9_to_10/plant-cell.glb',
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

  // Helper to retrieve user's class level as a number
  const getUserClassNumber = (): number => {
    if (!user || !user.class) return 10; // Default fallback to class 10
    const str = String(user.class);
    const match = str.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 10;
  };

  const studentClass = getUserClassNumber();

  const [activeTab, setActiveTab] = useState<'all' | 'junior' | 'middle' | 'senior'>(() => {
    if (studentClass >= 9) return 'senior';
    if (studentClass >= 6) return 'middle';
    return 'junior';
  });

  const [models, setModels] = useState<ModelMetadata[]>(MODELS_REGISTRY);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [resolvedGlbUrl, setResolvedGlbUrl] = useState('');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized allowedModels based on the current state-based models list
  const allowedModels = React.useMemo(() => {
    const isStaff = user?.role === 'teacher' || user?.role === 'admin';
    if (isStaff) {
      return models;
    }
    const studentCohort = studentClass >= 9 ? 'senior' : (studentClass >= 6 ? 'middle' : 'junior');
    return models.filter(
      m => studentClass >= m.minClass && studentClass <= m.maxClass && m.category === studentCohort
    );
  }, [models, studentClass, user?.role]);

  const hasJuniorModels = React.useMemo(() => {
    const isStaff = user?.role === 'teacher' || user?.role === 'admin';
    return isStaff || allowedModels.some(m => m.category === 'junior');
  }, [allowedModels, user?.role]);

  const hasMiddleModels = React.useMemo(() => {
    const isStaff = user?.role === 'teacher' || user?.role === 'admin';
    return isStaff || allowedModels.some(m => m.category === 'middle');
  }, [allowedModels, user?.role]);

  const hasSeniorModels = React.useMemo(() => {
    const isStaff = user?.role === 'teacher' || user?.role === 'admin';
    return isStaff || allowedModels.some(m => m.category === 'senior');
  }, [allowedModels, user?.role]);

  const activeCategoriesCount = React.useMemo(() => {
    return [hasJuniorModels, hasMiddleModels, hasSeniorModels].filter(Boolean).length;
  }, [hasJuniorModels, hasMiddleModels, hasSeniorModels]);

  const [selectedModel, setSelectedModel] = useState<ModelMetadata>(MODELS_REGISTRY[0]);
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

  // Premium WOW redesign states
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Lazy-resolve download URL for Firebase Storage models
  useEffect(() => {
    if (!selectedModel) return;

    if (selectedModel.glbUrl) {
      setResolvedGlbUrl(selectedModel.glbUrl);
      setLoadingModel(false);
    } else if (selectedModel.storagePath) {
      setLoadingModel(true);
      const modelRef = ref(storage, selectedModel.storagePath);
      getDownloadURL(modelRef)
        .then((url) => {
          setResolvedGlbUrl(url);
          setLoadingModel(false);
        })
        .catch((err) => {
          console.warn(`Error loading GLB from storage (${selectedModel.storagePath}), falling back to direct URL:`, err);
          if (selectedModel.id === 'heart') {
            setResolvedGlbUrl('https://raw.githubusercontent.com/Rajvardhan-Desai/Multi-Organ-XAI-AR/master/frontend/public/static/heart/heart.glb');
          } else if (selectedModel.id === 'plant_cell') {
            setResolvedGlbUrl('https://raw.githubusercontent.com/GordenSun/LearningCell/main/app/public/models/plant-cell.glb');
          } else {
            setResolvedGlbUrl('');
          }
          setLoadingModel(false);
        });
    } else {
      // Procedural shape
      setResolvedGlbUrl('');
      setLoadingModel(false);
    }
  }, [selectedModel]);

  // Dynamically load GLB files from Firebase Storage bucket using segregated subfolders
  useEffect(() => {
    const fetchStorageModels = async () => {
      setIsLoadingList(true);
      try {
        const folderConfigs = [
          { path: '3D_Models_glb/class_1_to_5', category: 'junior', minClass: 1, maxClass: 5 },
          { path: '3D_Models_glb/class_6_to_8', category: 'middle', minClass: 6, maxClass: 8 },
          { path: '3D_Models_glb/class_9_to_10', category: 'senior', minClass: 9, maxClass: 12 }
        ];

        const results = await Promise.all(
          folderConfigs.map(async (cfg) => {
            try {
              const folderRef = ref(storage, cfg.path);
              const listResult = await listAll(folderRef);
              return { items: listResult.items, config: cfg };
            } catch (err) {
              console.warn(`Could not load GLB files list from folder "${cfg.path}":`, err);
              return { items: [], config: cfg };
            }
          })
        );

        const storageModels: ModelMetadata[] = [];
        let index = 0;

        for (const res of results) {
          const { items, config } = res;
          for (const item of items) {
            if (!item.name.toLowerCase().endsWith('.glb')) continue;

            const filename = item.name;
            // Strip extension
            const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
            // Clean title: replace underscores/dashes, capitalize words
            const cleanTitle = baseName
              .replace(/[_-]+/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase())
              .trim();

            storageModels.push({
              id: `storage_${index}_${baseName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              nameEn: cleanTitle,
              nameOr: cleanTitle, // Fallback
              category: config.category as 'junior' | 'middle' | 'senior',
              glbUrl: '', // Will load lazily via storagePath
              storagePath: item.fullPath,
              ar: true,
              minClass: config.minClass,
              maxClass: config.maxClass,
              descriptionEn: `3D model of ${cleanTitle} loaded from Firebase Storage.`,
              descriptionOr: `ଫାୟାରବେସ୍ ଷ୍ଟୋରେଜ୍ ରୁ ଲୋଡ୍ ହୋଇଥିବା ${cleanTitle} ର ୩D ମଡେଲ୍ |`,
              voiceTextEn: `This is a 3D model representing ${cleanTitle}. You can inspect it from all angles.`,
              voiceTextOr: `ଏହା ${cleanTitle} ର ଏକ ୩D ମଡେଲ୍ | ଆପଣ ଏହାକୁ ସବୁ ଦିଗରୁ ପରୀକ୍ଷା କରିପାରିବେ |`,
              hotspots: []
            });
            index++;
          }
        }

        if (storageModels.length > 0) {
          const merged = [...MODELS_REGISTRY];
          storageModels.forEach(sm => {
            // Avoid duplicates
            if (!merged.some(m => m.id === sm.id || m.nameEn.toLowerCase() === sm.nameEn.toLowerCase())) {
              merged.push(sm);
            }
          });
          setModels(merged);
        }
      } catch (err) {
        console.warn("Could not load 3D GLB files list from Firebase storage folders:", err);
      } finally {
        setIsLoadingList(false);
      }
    };

    fetchStorageModels();
  }, []);

  // Sync selectedModel with class permissions
  useEffect(() => {
    if (allowedModels.length > 0 && !allowedModels.some(m => m.id === selectedModel.id)) {
      setSelectedModel(allowedModels[0]);
    }
  }, [studentClass, allowedModels, selectedModel.id]);

  // Map requested model if set using smart keyword matching
  useEffect(() => {
    if (initialModelKey && allowedModels.length > 0) {
      const keyLower = initialModelKey.toLowerCase();
      
      // 1. Direct ID/Name check
      let match = allowedModels.find(m => m.id === keyLower || m.nameEn.toLowerCase() === keyLower);
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
        match = allowedModels.find(m => m.id === 'plant_cell' || m.id === 'heart');
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
  }, [initialModelKey, allowedModels]);

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

  // Greeting welcome message when model changes
  useEffect(() => {
    if (!selectedModel) return;
    const modelName = language === 'or' ? selectedModel.nameOr : selectedModel.nameEn;
    const greetingText = language === 'or'
      ? `ଶୁଭେଚ୍ଛା! ମୁଁ ହେଉଛି ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର। ଆଜି ଆମେ "${modelName}" ବିଷୟରେ ପଢିବା। ୩D ଚିତ୍ରର ଯେକୌଣସି ଅଂଶକୁ ସ୍ପର୍ଶ କରନ୍ତୁ କିମ୍ବା ମୋତେ କିଛି ବି ପଚାରନ୍ତୁ!`
      : `Hello! I am Gundulu AI, your tutor. Today, we are exploring the "${modelName}" model. Click on any hotspot or ask me any question to learn more!`;
    
    setChatMessages([
      { id: 'welcome', role: 'assistant', text: greetingText }
    ]);
  }, [selectedModel, language]);

  // Scroll to bottom of chat log
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isGenerating]);

  // Socratic AI Tutor API caller
  const askGundulu = async (
    promptText: string,
    activeHotspotCtx?: any,
    currentMessages: Array<{ id: string; role: 'user' | 'assistant'; text: string }> = chatMessages
  ) => {
    setIsGenerating(true);
    try {
      const modelName = language === 'or' ? selectedModel.nameOr : selectedModel.nameEn;
      const hotspotContext = activeHotspotCtx 
        ? `The student clicked on the hotspot named "${activeHotspotCtx.labelEn}" (Odia: "${activeHotspotCtx.labelOr}"). Explain this specific part of the model. `
        : '';
      
      const languageInstruction = language === 'or'
        ? 'Respond strictly in standard Odia (ଓଡ଼ିଆ).'
        : 'Respond bilingually in both English and Odia. Provide explanation in English first, followed by its corresponding translation or key concept summaries in Odia (ଓଡ଼ିଆ), so the student can learn in both languages.';

      const systemInstruction = 
        `You are Gundulu AI, a friendly, brilliant, and patient Socratic tutor for school students in Odisha. ` +
        `We are currently looking at a 3D model of "${modelName}" inside the Gundulu 3D Lab. ` +
        `${hotspotContext}` +
        `Explain the academic concept clearly, concisely, and step-by-step. ` +
        `${languageInstruction} Keep responses friendly and suitable for grade ${studentClass} students.`;

      const contents = [
        ...currentMessages.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'model' as const,
          parts: [{ text: msg.text }]
        })),
        {
          role: 'user' as const,
          parts: [{ text: promptText }]
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

      if (!response.ok) throw new Error("AI Generation failed");
      const data = await response.json();
      
      const reply = data.text || (language === 'or' ? 'ଦୁଃଖିତ, ମୁଁ ଉତ୍ତର ଜେନେରେଟ୍ କରିପାରିଲି ନାହିଁ।' : 'Sorry, I could not generate a response.');
      
      setChatMessages(prev => [
        ...prev,
        { id: `reply_${Date.now()}`, role: 'assistant', text: reply }
      ]);
    } catch (err) {
      console.error("Gundulu AI tutor error:", err);
      setChatMessages(prev => [
        ...prev,
        { 
          id: `reply_${Date.now()}`, 
          role: 'assistant', 
          text: language === 'or' 
            ? '❌ ସର୍ଭର ସହିତ ସଂଯୋଗ ହୋଇପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।' 
            : '❌ Server connection failed. Please try again.' 
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Hotspot interaction click handler
  const handleHotspotClick = (hotspot: any) => {
    setActiveHotspot(hotspot);
    
    const label = language === 'or' ? hotspot.labelOr : hotspot.labelEn;
    const userText = language === 'or' ? `ମୋତେ "${label}" ବିଷୟରେ ବୁଝାନ୍ତୁ।` : `Explain the "${label}" in detail.`;
    
    const newUserMsg = { id: `user_${Date.now()}`, role: 'user' as const, text: userText };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    
    askGundulu(userText, hotspot, updatedMessages);
  };

  // Custom User prompt sender
  const handleSendMessage = () => {
    if (!chatInput.trim() || isGenerating) return;
    const text = chatInput.trim();
    setChatInput('');
    
    const newUserMsg = { id: `user_${Date.now()}`, role: 'user' as const, text };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    
    askGundulu(text, null, updatedMessages);
  };

  // Gamified interactive Quiz generator
  const handleQuizStart = async () => {
    setIsGameActive(true);
    const userText = language === 'or' ? '🏆 ୩D କୁଇଜ୍ ଖେଳନ୍ତୁ' : '🏆 Play 3D Quiz';
    
    const newUserMsg = { id: `quiz_start_${Date.now()}`, role: 'user' as const, text: userText };
    const updatedMessages = [...chatMessages, newUserMsg];
    setChatMessages(updatedMessages);
    
    setIsGenerating(true);
    try {
      const modelName = language === 'or' ? selectedModel.nameOr : selectedModel.nameEn;
      const quizLanguageInstruction = language === 'or'
        ? 'Write the quiz strictly in standard Odia (ଓଡ଼ିଆ).'
        : 'Write the quiz bilingually. Provide each question and option in English first, followed by its translation in Odia (ଓଡ଼ିଆ).';

      const promptText = `Generate an interactive quiz with exactly 3 multiple-choice questions about the 3D model of "${modelName}". ` +
        `${quizLanguageInstruction} ` +
        `Format it as a friendly message listing the questions and options. Ask the user to reply to start.`;

      const systemInstruction = 
        `You are Gundulu AI, a friendly, patient teacher running a quiz. ` +
        `Introduce the quiz and ask the first question. Wait for the user's response.`;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          systemInstruction,
          modelType: 'flash'
        })
      });

      if (!response.ok) throw new Error("Quiz failed");
      const data = await response.json();
      
      setChatMessages(prev => [
        ...prev,
        { id: `quiz_${Date.now()}`, role: 'assistant', text: data.text }
      ]);
    } catch (err) {
      console.error("Quiz generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Filter models based on search query and category tabs
  const filteredModels = React.useMemo(() => {
    const isStaff = user?.role === 'teacher' || user?.role === 'admin';
    const baseModels = isStaff ? models : allowedModels;
    return baseModels.filter(m => {
      if (activeTab !== 'all' && m.category !== activeTab) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return m.nameEn.toLowerCase().includes(query) || m.nameOr.toLowerCase().includes(query);
      }
      return true;
    });
  }, [models, allowedModels, activeTab, searchQuery, user?.role]);

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

  const renderMessageContent = (text: string) => {
    const paragraphs = text.split('\n');
    return paragraphs.map((p, idx) => {
      const parts = p.split(/\*\*([^*]+)\*\*/g);
      return (
        <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
          {parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-orange-400 font-extrabold">{part}</strong> : part))}
        </p>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617] relative select-none force-dark-theme">
      {/* HEADER CONTROLS */}
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Lucide.ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-sm md:text-base font-black text-white flex items-center gap-2">
              <Lucide.Box className="text-[#ffd700]" size={16} />
              {t.threeDLab}
            </h2>
          </div>
        </div>

        {/* Searchable Dropdown-style Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="flex items-center justify-between gap-3 bg-slate-900 border border-white/10 hover:border-orange-500/50 rounded-xl px-3.5 py-2 text-xs font-black text-white focus:outline-none transition-all cursor-pointer shadow-lg max-w-[200px] sm:max-w-none hover:bg-slate-800"
          >
            <span className="truncate">
              {language === 'or' ? selectedModel.nameOr : selectedModel.nameEn}
            </span>
            <span className="flex items-center gap-1.5 shrink-0 pl-1 text-[9px] text-orange-400 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded-md">
              <Lucide.Sparkles size={8} />
              {allowedModels.length}
            </span>
            <Lucide.ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* DUAL WORKSPACE: 3D VIEWPORT & AI CHAT */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full overflow-hidden">
        
        {/* LEFT PANEL: 3D CANVAS & EXPLORER */}
        <div className="w-full lg:w-3/5 xl:w-2/3 h-[38vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-white/5 bg-slate-950 flex flex-col min-h-0 shrink-0 lg:shrink">
          {/* GLB model-viewer rendering */}
          {resolvedGlbUrl ? (
            <model-viewer
              src={resolvedGlbUrl}
              ar={selectedModel.ar ? true : undefined}
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              auto-rotate={isAutoRotate ? true : undefined}
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
                  onClick={() => handleHotspotClick(hotspot)}
                />
              ))}
            </model-viewer>
          ) : loadingModel ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#020617] text-slate-400 gap-3">
              <Lucide.Loader2 className="animate-spin text-[#ffd700]" size={36} />
              <span className="text-xs font-black uppercase tracking-widest text-slate-300 animate-pulse">
                {language === 'or' ? '୩D ଚିତ୍ର ଲୋଡ୍ ହେଉଛି...' : 'Loading 3D Model...'}
              </span>
            </div>
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

          {/* Floating controls panel on the 3D Canvas */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 p-1.5 rounded-xl shadow-lg z-20">
            <button
              onClick={() => setIsAutoRotate(!isAutoRotate)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all ${isAutoRotate ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'hover:bg-white/5'}`}
              title="Toggle Auto Rotate"
            >
              <Lucide.RotateCw size={14} />
            </button>
            <button
              onClick={() => setIsWireframe(!isWireframe)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all ${isWireframe ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'hover:bg-white/5'}`}
              title="Toggle Wireframe/Mesh"
            >
              <Lucide.Cpu size={14} />
            </button>
            <button
              onClick={handlePlayAudio}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all ${isPlayingAudio ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'hover:bg-white/5'}`}
              title="Play Description Speech"
            >
              <Lucide.Volume2 size={14} className={isPlayingAudio ? 'animate-bounce' : ''} />
            </button>
            <button
              onClick={() => handleQuizStart()}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20`}
              title="Start Gundulu MCQ Quiz"
            >
              <Lucide.Trophy size={14} />
              <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">Quiz</span>
            </button>
          </div>

          {/* Math Controls HUD (Top Left Overlay) */}
          {selectedModel.id === 'math_shapes' && (
            <div className="absolute top-16 left-3 glass-card p-2.5 rounded-xl border border-white/5 bg-slate-900/80 space-y-1.5 text-xs font-bold text-white max-w-[140px] z-20">
              <span className="text-[8px] uppercase tracking-widest text-[#ffd700]">{language === 'or' ? '୩D ଆକୃତି' : '3D Shapes'}</span>
              <div className="grid grid-cols-2 gap-1">
                {(['cone', 'cylinder', 'sphere', 'cube'] as const).map(shape => (
                  <button
                    key={shape}
                    onClick={() => setMathShape(shape)}
                    className={`px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-[9px] capitalize ${mathShape === shape ? 'border-[#b34d1f] text-orange-400' : ''}`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
              {mathShape !== 'sphere' && mathShape !== 'cube' && (
                <div className="space-y-1 pt-0.5">
                  <label className="text-[8px] text-slate-400 flex justify-between">
                    <span>Height</span>
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
                  <label className="text-[8px] text-slate-400 flex justify-between">
                    <span>Radius</span>
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

          {/* Math Solver overlay */}
          {selectedModel.id === 'math_shapes' && (
            <div className="absolute bottom-3 right-3 w-56 glass-card p-3 border border-cyan-500/20 bg-slate-900/85 backdrop-blur-md rounded-xl space-y-1 shadow-2xl z-20">
              <h3 className="text-[10px] font-black text-cyan-400 flex items-center gap-1">
                <Lucide.Calculator size={12} />
                {language === 'or' ? 'ପରିମିତି ଗଣନା' : '3D Formula Solver'}
              </h3>
              <div className="space-y-1 text-[10px] text-slate-300 font-mono">
                <div className="flex justify-between border-b border-white/5 pb-0.5">
                  <span>Shape:</span>
                  <span className="text-cyan-300 capitalize">{mathShape}</span>
                </div>
                {mathShape === 'cylinder' && (
                  <>
                    <div className="flex justify-between text-[9px]">
                      <span>Volume:</span>
                      <span>π × r² × h</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-0.5">
                      <span>Result:</span>
                      <span>{Math.round(Math.PI * Math.pow(mathRadius/10, 2) * (mathHeight/10))} cm³</span>
                    </div>
                  </>
                )}
                {mathShape === 'cone' && (
                  <>
                    <div className="flex justify-between text-[9px]">
                      <span>Volume:</span>
                      <span>1/3 × π × r² × h</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-0.5">
                      <span>Result:</span>
                      <span>{Math.round((1/3) * Math.PI * Math.pow(mathRadius/10, 2) * (mathHeight/10))} cm³</span>
                    </div>
                  </>
                )}
                {mathShape === 'sphere' && (
                  <>
                    <div className="flex justify-between text-[9px]">
                      <span>Volume:</span>
                      <span>4/3 × π × r³</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-0.5">
                      <span>Result:</span>
                      <span>{Math.round((4/3) * Math.PI * Math.pow(mathRadius/10, 3))} cm³</span>
                    </div>
                  </>
                )}
                {mathShape === 'cube' && (
                  <>
                    <div className="flex justify-between text-[9px]">
                      <span>Volume:</span>
                      <span>s³</span>
                    </div>
                    <div className="flex justify-between font-bold text-white border-t border-white/5 pt-0.5">
                      <span>Result:</span>
                      <span>{Math.round(Math.pow((mathRadius * 1.2)/10, 3))} cm³</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Canvas info overlay */}
          <div className="absolute bottom-3 left-3 glass-card px-2 py-1 rounded-lg border border-white/5 bg-black/40 text-[9px] text-slate-400 font-bold pointer-events-none flex items-center gap-1.5 z-20 shadow-lg">
            <Lucide.RotateCw size={8} className="animate-spin text-slate-400" />
            <span>{language === 'or' ? 'ଘୂର୍ଣ୍ଣନ କରିବାକୁ ଡ୍ରାଗ୍ କରନ୍ତୁ' : 'Drag to rotate'}</span>
          </div>
        </div>

        {/* RIGHT PANEL: GUNDULU INTEGRATED AI CHAT */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/80 backdrop-blur-md relative border-t lg:border-t-0 border-white/5">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" id="gundulu-3d-chat-log">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs md:text-sm font-bold leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-[#b34d1f] text-white rounded-tr-none'
                      : 'bg-slate-950/90 border border-white/5 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  {renderMessageContent(msg.text)}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                <div className="h-7 w-7 rounded-full bg-slate-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img src="/gundulu-v3.png" alt="Gundulu" className="w-full h-full object-cover animate-pulse" />
                </div>
                <div className="p-3 bg-slate-950/90 border border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Hotspot suggestion chips */}
          {selectedModel.hotspots.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5 bg-slate-900/10 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center">Parts:</span>
              {selectedModel.hotspots.map((hotspot) => (
                <button
                  key={hotspot.id}
                  onClick={() => handleHotspotClick(hotspot)}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 text-[10px] font-black text-slate-300 hover:text-white transition-all whitespace-nowrap"
                >
                  {language === 'or' ? hotspot.labelOr : hotspot.labelEn}
                </button>
              ))}
            </div>
          )}

          {/* Chat input controls form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-white/5 bg-slate-950/60 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={language === 'or' ? 'ଗୁନ୍ଦୁଲୁଙ୍କୁ ଏଠାରେ ପଚାରନ୍ତୁ...' : 'Ask Gundulu about this model...'}
              className="flex-1 bg-slate-900 border border-white/10 focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all font-bold"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isGenerating}
              className="p-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl transition-all disabled:opacity-50"
            >
              <Lucide.Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Searchable 3D Model Catalog Modal */}
      <AnimatePresence>
        {isSelectorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <Lucide.Box className="text-orange-500" size={20} />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      {language === 'or' ? '୩D ମଡେଲ୍ ସୂଚୀ' : '3D Models Catalog'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {language === 'or' ? `${allowedModels.length} ଟି ମଡେଲ୍ ଉପଲବ୍ଧ` : `${allowedModels.length} Interactive models available`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsSelectorOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Lucide.X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-white/5 bg-slate-900/50 flex gap-2">
                <div className="relative flex-1">
                  <Lucide.Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'or' ? 'ମଡେଲ୍ ସର୍ଚ୍ଚ କରନ୍ତୁ...' : 'Search models by name...'}
                    className="w-full bg-slate-950 border border-white/5 focus:border-orange-500 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none transition-all placeholder:text-slate-500 font-bold"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      <Lucide.X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Class/Age Filter Tabs */}
              {((user?.role === 'teacher' || user?.role === 'admin') || activeCategoriesCount > 1) && (
                <div className="px-4 py-2 border-b border-white/5 bg-slate-950/20 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                      activeTab === 'all'
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {language === 'or' ? 'ସମସ୍ତ' : 'All Classes'}
                  </button>
                  {hasJuniorModels && (
                    <button
                      onClick={() => setActiveTab('junior')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                        activeTab === 'junior'
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {language === 'or' ? 'ପ୍ରାଥମିକ (Class 1-5)' : 'Junior (Class 1-5)'}
                    </button>
                  )}
                  {hasMiddleModels && (
                    <button
                      onClick={() => setActiveTab('middle')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                        activeTab === 'middle'
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {language === 'or' ? 'ମଧ୍ୟମ (Class 6-8)' : 'Middle (Class 6-8)'}
                    </button>
                  )}
                  {hasSeniorModels && (
                    <button
                      onClick={() => setActiveTab('senior')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                        activeTab === 'senior'
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {language === 'or' ? 'ଉଚ୍ଚ (Class 9-12)' : 'Senior (Class 9-12)'}
                    </button>
                  )}
                </div>
              )}

              {/* Models List Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh] custom-scrollbar bg-slate-900/30">
                {isLoadingList ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                    <Lucide.Loader2 className="animate-spin text-orange-500" size={24} />
                    <span>{language === 'or' ? 'ସୂଚୀ ଲୋଡ୍ ହେଉଛି...' : 'Loading 3D catalog...'}</span>
                  </div>
                ) : filteredModels.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs font-bold">
                    {language === 'or' ? 'କୌଣସି ମଡେଲ୍ ମିଳିଲା ନାହିଁ' : 'No 3D models found matching the criteria.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredModels.map((model) => {
                      const isCurrent = model.id === selectedModel.id;
                      const modelName = language === 'or' ? model.nameOr : model.nameEn;
                      const isRecommended = studentClass >= model.minClass && studentClass <= model.maxClass;

                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model);
                            setActiveHotspot(null);
                            setIsGameActive(false);
                            setQuizCompleted(false);
                            setIsSelectorOpen(false);
                            setSearchQuery('');
                          }}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                            isCurrent
                              ? 'bg-orange-500/10 border-orange-500 text-white'
                              : 'bg-slate-950/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-950/70'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isCurrent ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'
                          }`}>
                            <Lucide.Box size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black truncate max-w-[150px]">
                                {modelName}
                              </span>
                              {isRecommended && (
                                <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                                  {language === 'or' ? 'ସୁପାରିଶ' : 'Recommended'}
                                </span>
                              )}
                            </div>
                            <span className="block text-[9px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">
                              {model.category === 'junior' && (language === 'or' ? 'ପ୍ରାଥମିକ (Class 1-5)' : 'Junior (Class 1-5)')}
                              {model.category === 'middle' && (language === 'or' ? 'ମଧ୍ୟମ (Class 6-8)' : 'Middle (Class 6-8)')}
                              {model.category === 'senior' && (language === 'or' ? 'ଉଚ୍ଚ (Class 9-12)' : 'Senior (Class 9-12)')}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
