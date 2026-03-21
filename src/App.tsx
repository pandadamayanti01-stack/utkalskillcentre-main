import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Brain, 
  MessageSquare, 
  Trophy, 
  Settings, 
  LogOut, 
  Play, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  Menu, 
  X, 
  User, 
  CreditCard, 
  BarChart3, 
  Globe,
  Mail,
  HelpCircle,
  Clock,
  Star,
  Hash,
  Shapes,
  Bot,
  Loader2,
  Send,
  PenTool,
  FileText,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Lightbulb,
  Sparkles,
  Search,
  AlertCircle,
  Lock,
  MessageCircle,
  Book,
  Download,
  ShoppingBag,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { auth, db as firestore } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateEmail,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer, collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, increment, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { translations } from './translations';
import { solveMathDoubt } from './services/aiService';
import { AdminDashboard } from './components/AdminDashboard';
import { PracticeQuestion } from './components/PracticeQuestion';
import { Dashboard } from './components/Dashboard';
import { AvatarStore } from './components/AvatarStore';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

const subjectTranslations: Record<string, string> = {
  'Mathematics': 'ଗଣିତ',
  'Math': 'ଗଣିତ',
  'Science': 'ବିଜ୍ଞାନ',
  'English': 'ଇଂରାଜୀ',
  'Odia': 'ଓଡ଼ିଆ',
  'History': 'ଇତିହାସ',
  'Geography': 'ଭୂଗୋଳ',
  'Social Studies': 'ସାମାଜିକ ବିଜ୍ଞାନ',
  'Social Science': 'ସାମାଜିକ ବିଜ୍ଞାନ',
  'EVS': 'ପରିବେଶ ବିଜ୍ଞାନ',
  'General Knowledge': 'ସାଧାରଣ ଜ୍ଞାନ',
  'GK': 'ସାଧାରଣ ଜ୍ଞାନ',
  'Hindi': 'ହିନ୍ଦୀ',
  'Sanskrit': 'ସଂସ୍କୃତ',
  'Physics': 'ପଦାର୍ଥ ବିଜ୍ଞାନ',
  'Chemistry': 'ରସାୟନ ବିଜ୍ଞାନ',
  'Biology': 'ଜୀବ ବିଜ୍ଞାନ',
  'Art & Health Education': 'କଳା ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ଶିକ୍ଷା',
  'Art Education': 'କଳା ଶିକ୍ଷା',
  'Physical Education & Well-being': 'ଶାରୀରିକ ଶିକ୍ଷା ଏବଂ ସୁସ୍ଥତା',
  'Vocational Education': 'ଧନ୍ଦାମୂଳକ ଶିକ୍ଷା',
  'Environmental & Population Education': 'ପରିବେଶ ଏବଂ ଜନସଂଖ୍ୟା ଶିକ୍ଷା',
  'Aspirational Components': 'ଆକାଂକ୍ଷାମୂଳକ ଉପାଦାନ',
  'Science (Jigyansa)': 'ବିଜ୍ଞାନ (ଜିଜ୍ଞାସା)'
};

const getLocalizedSubject = (subject: string, language: string) => {
  if (!subject) return '';
  
  // First check if it's a key in translations
  const localized = translations[language]?.subjects?.[subject];
  if (localized) return localized;

  // Then check legacy subjectTranslations
  if (language === 'or' && subjectTranslations[subject]) {
    return subjectTranslations[subject];
  }

  // If it's already a localized label (e.g., from old data), return it
  return subject;
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode, language: string }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                {this.props.language === 'en' ? "Something went wrong" : "କିଛି ଭୁଲ୍ ହୋଇଛି"}
              </h1>
              <p className="text-slate-400 text-sm">
                {this.props.language === 'en' 
                  ? "An unexpected error occurred. Please try refreshing the page." 
                  : "ଏକ ଅପ୍ରତ୍ୟାଶିତ ତ୍ରୁଟି ଘଟିଛି | ଦୟାକରି ପୃଷ୍ଠାକୁ ପୁନର୍ବାର ଲୋଡ୍ କରିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ |"}
              </p>
            </div>
            {process.env.NODE_ENV !== 'production' && (
              <div className="p-4 bg-black/40 rounded-2xl text-left overflow-auto max-h-40 scrollbar-thin">
                <code className="text-xs text-red-400 font-mono break-all">
                  {this.state.error?.toString()}
                </code>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20"
            >
              {this.props.language === 'en' ? "Refresh Page" : "ପୃଷ୍ଠାକୁ ରିଫ୍ରେଶ୍ କରନ୍ତୁ"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---
interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  board: string;
  subjects?: string[];
  preferred_language: string;
  points: number;
  role: string;
  avatar?: string;
  streak?: number;
  lastActiveDate?: string;
  shareCount?: number;
  statusShared?: boolean;
  parent_pin?: string;
  completed_chapters?: string[];
  parentShowLeaderboard?: boolean;
  stats?: {
    streak: number;
    level: number;
    experience: number;
    accuracy: number;
    league: League;
    badges: string[];
    weeklyPoints: number;
    lastActive?: string;
  };
}

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct_answer: string;
  hint?: string;
  chapter_id?: string;
}

interface Chapter {
  id: string;
  class: string;
  board: string;
  language: string;
  subject: string;
  title: string;
  playlist_id: string;
  notes?: string;
  status?: 'draft' | 'published';
  practice_questions?: { question: string; answer: string; ai_answer?: string }[];
  quiz_questions?: { question: string; options: string[]; correct_answer: string; hint?: string }[];
  translationGroupId?: string;
}

interface MonthlyTest {
  id: string;
  class: string;
  subject: string;
  month: string;
  year: number;
  language?: string;
  questions: { question: string; options: string[]; correct_answer: string }[];
  status: 'draft' | 'published';
  results_published: boolean;
  translationGroupId?: string;
}

interface MonthlyTestSubmission {
  id: string;
  testId: string;
  userId: string;
  userName: string;
  class: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  rank?: number;
  submittedAt: any;
}

interface Textbook {
  id: string;
  class: string;
  board: string;
  subject: string;
  title: string;
  download_url: string;
  thumbnail_url?: string;
  status?: 'draft' | 'published';
  created_at?: any;
}

interface SystemSettings {
  enabledClasses?: string[];
  maintenanceMode?: boolean;
}

// --- Components ---

const fetchJson = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type");
  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    if (contentType && contentType.includes("application/json")) {
      const errorData = await res.json();
      errorMsg = errorData.error || errorMsg;
    }
    throw new Error(errorMsg);
  }
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected JSON response but got ${contentType || 'unknown'}`);
  }
  return res.json();
};

const UtkalLogoSVG = ({ className = "h-10" }: { className?: string }) => (
  <svg viewBox="0 0 200 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10C15 7.23858 17.2386 5 20 5H40C42.7614 5 45 7.23858 45 10V40C45 42.7614 42.7614 45 40 45H20C17.2386 45 15 42.7614 15 40V10Z" fill="#10B981" fillOpacity="0.2"/>
    <path d="M22 15L30 23L38 15" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 25L30 33L38 25" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 35H38" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="55" y="32" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">UTKAL</text>
    <text x="55" y="48" fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="2">SKILL CENTRE</text>
  </svg>
);

const AhasLogoSVG = ({ className = "h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 25L15 5L25 25" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 18H20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="15" cy="15" r="12" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    <text x="35" y="21" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1.5">AHAS</text>
  </svg>
);

const Logo = ({ className = "h-12" }: { className?: string }) => (
  <div className={`flex items-center ${className}`}>
    <UtkalLogoSVG className="h-full w-auto" />
  </div>
);

const BigsanBranding = ({ className = "" }: { className?: string }) => {
  const [lang] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'en');
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        {translations[lang]?.associate || 'Associate Partner'}
      </p>
      <div className="opacity-80 grayscale hover:grayscale-0 transition-all">
        <AhasLogoSVG className="h-6 w-auto" />
      </div>
    </div>
  );
};

// --- YouTube Helpers ---
const getYouTubeId = (id: string) => {
  if (!id) return '';
  if (id.includes('youtube.com/watch?v=')) return id.split('v=')[1].split('&')[0];
  if (id.includes('youtu.be/')) return id.split('youtu.be/')[1].split('?')[0];
  if (id.includes('youtube.com/playlist?list=')) return id.split('list=')[1].split('&')[0];
  if (id.includes('list=')) return id.split('list=')[1].split('&')[0];
  return id;
};

const getYouTubeEmbedUrl = (id: string) => {
  if (!id) return '';
  
  // Handle youtu.be with list
  if (id.includes('youtu.be/') && id.includes('list=')) {
    const videoId = id.split('youtu.be/')[1].split('?')[0];
    const listId = id.split('list=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${videoId}?list=${listId}`;
  }

  const cleanId = getYouTubeId(id);
  
  if (id.includes('playlist') || id.startsWith('PL') || id.includes('list=')) {
    // If it's a playlist, or contains list=, we might want to show the video with the list
    if (id.includes('v=')) {
      const videoId = id.split('v=')[1].split('&')[0];
      const listId = id.split('list=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}?list=${listId}`;
    }
    return `https://www.youtube.com/embed/videoseries?list=${cleanId}`;
  }
  return `https://www.youtube.com/embed/${cleanId}`;
};

const getYouTubeThumbnail = (id: string) => {
  if (!id) return 'https://picsum.photos/seed/edu/400/225';
  if (id.startsWith('PL') || id.includes('playlist')) {
    // For playlists, we can't easily get a thumbnail without the first video ID
    // Fallback to a generic educational image or a placeholder
    return `https://picsum.photos/seed/${id}/400/225`;
  }
  const videoId = getYouTubeId(id);
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

export default function App() {
  const [user, setUser] = useState<Student | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, _setLanguage] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'en');
  const languageRef = useRef(language);
  const setLanguage = async (lang: 'en' | 'or') => {
    languageRef.current = lang;
    _setLanguage(lang);
    localStorage.setItem('lang', lang);
    if (user?.id) {
      try {
        await updateDoc(doc(firestore, 'users', user.id), { preferred_language: lang });
      } catch (e) {
        console.error("Failed to update preferred language", e);
      }
    }
  };
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showConfigError, setShowConfigError] = useState<{title: string, message: string} | null>(null);
  
  // Auth State
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [showResetPasswordButton, setShowResetPasswordButton] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [regData, _setRegData] = useState({ 
    name: '',
    email: '',
    class: '' as string, 
    board: '', 
    subjects: [] as string[],
    preferred_language: 'or' 
  });
  const regDataRef = useRef(regData);
  const setRegData = (data: any) => {
    regDataRef.current = data;
    _setRegData(data);
  };

  // Data State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [monthlyTests, setMonthlyTests] = useState<MonthlyTest[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<MonthlyTestSubmission[]>([]);
  const [activeTest, setActiveTest] = useState<MonthlyTest | null>(null);
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [systemSettings, setSystemSettings] = useState<any>({
    monthlyPrice: 199,
    yearlyPrice: 999
  });

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(firestore, 'test', 'connection'));
      } catch (error: any) {
        // Ignore permission errors as this is just a connection test
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        } else if (error.message?.includes('Missing or insufficient permissions')) {
          console.log("Connection test failed due to permissions, which is expected for the test collection.");
        }
      }
    };
    testConnection();
  }, []);

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    
    if (errInfo.error.includes('insufficient permissions')) {
      console.warn("Permission denied for path:", path, "Operation:", operationType);
    }
    
    if (errInfo.error.includes('client is offline')) {
      setDbError(
        language === 'en'
          ? "Unable to connect to the database. Please ensure your Firestore Database is created in the Firebase Console and ad-blockers are disabled."
          : "ଡାଟାବେସ୍ ସହିତ ସଂଯୋଗ କରିବାରେ ଅସମର୍ଥ | ଦୟାକରି ନିଶ୍ଚିତ କରନ୍ତୁ ଯେ ଆପଣଙ୍କର ଫାୟାରବେସ୍ କନସୋଲରେ ଫାୟାରଷ୍ଟୋର ଡାଟାବେସ୍ ସୃଷ୍ଟି ହୋଇଛି ଏବଂ ଆଡ୍-ବ୍ଲକର୍ ଗୁଡିକ ବନ୍ଦ ଅଛି |"
      );
    }
    
    setLoading(false);
    setIsSendingOtp(false);
    
    // Throw error as required by the instructions for diagnosis
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    let unsubUser: (() => void) | undefined;
    let unsubSub: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("onAuthStateChanged: firebaseUser =", firebaseUser);
      
      // Clean up previous listeners if auth state changes
      if (unsubUser) unsubUser();
      if (unsubSub) unsubSub();

      if (firebaseUser) {
        // Set up real-time listener for user data
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        unsubUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Student;
            const updatedUser = { ...data, id: docSnap.id };
            setUser(updatedUser);
            if (data.role === 'admin') {
              setIsAdminView(true);
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        try {
          // Initial sync/creation
          const userDocSnap = await getDoc(userDocRef);
          const userEmail = firebaseUser.email?.toLowerCase();
          const isAdmin = userEmail === 'pandadamayanti01@gmail.com' || 
                          firebaseUser.phoneNumber === '+919337956168' || 
                          firebaseUser.phoneNumber === '9337956168';
          
          const role = isAdmin ? 'admin' : (userDocSnap.exists() ? userDocSnap.data().role : 'student');
          
          const userData: any = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (userDocSnap.exists() ? userDocSnap.data().name : regDataRef.current.name) || 'Student',
            email: firebaseUser.email || (userDocSnap.exists() ? userDocSnap.data().email : regDataRef.current.email) || '',
            class: (userDocSnap.exists() && userDocSnap.data().class) ? userDocSnap.data().class : (regDataRef.current.class || ''),
            board: (userDocSnap.exists() && userDocSnap.data().board) ? userDocSnap.data().board : (regDataRef.current.board || ''),
            subjects: (userDocSnap.exists() && userDocSnap.data().subjects?.length > 0) ? userDocSnap.data().subjects : (regDataRef.current.subjects || []),
            preferred_language: (userDocSnap.exists() && userDocSnap.data().preferred_language) ? userDocSnap.data().preferred_language : (languageRef.current || 'or'),
            role: role,
            points: userDocSnap.exists() ? (userDocSnap.data().points ?? 0) : 0,
            avatar: userDocSnap.exists() ? (userDocSnap.data().avatar ?? 'https://api.dicebear.com/7.x/bottts/svg?seed=default') : 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
            streak: userDocSnap.exists() ? (userDocSnap.data().streak ?? 0) : 0,
            lastActiveDate: userDocSnap.exists() ? (userDocSnap.data().lastActiveDate ?? '') : '',
            shareCount: userDocSnap.exists() ? (userDocSnap.data().shareCount ?? 0) : 0,
            statusShared: userDocSnap.exists() ? (userDocSnap.data().statusShared ?? false) : false,
            updatedAt: serverTimestamp()
          };

          // Update Streak Logic
          const today = new Date().toISOString().split('T')[0];
          if (userData.lastActiveDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (userData.lastActiveDate === yesterdayStr) {
              userData.streak = (userData.streak || 0) + 1;
            } else if (userData.lastActiveDate !== '') {
              userData.streak = 1;
            } else {
              userData.streak = 1;
            }
            userData.lastActiveDate = today;
          }

          if (!userDocSnap.exists()) {
            userData.createdAt = serverTimestamp();
          }

          await setDoc(userDocRef, userData, { merge: true });
          await setDoc(doc(firestore, 'public_profiles', firebaseUser.uid), {
            name: userData.name,
            points: userData.points,
            class: userData.class,
            avatar: userData.avatar,
            streak: userData.streak
          }, { merge: true });
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }

        // Check subscription
        const subDocRef = doc(firestore, 'subscriptions', firebaseUser.uid);
        unsubSub = onSnapshot(subDocRef, (subDocSnap) => {
          if (subDocSnap.exists()) {
            const subData = subDocSnap.data();
            const now = new Date();
            const expiresAt = new Date(subData.expires_at);
            setIsPremium(subData.active && expiresAt > now);
          } else {
            setIsPremium(false);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `subscriptions/${firebaseUser.uid}`);
        });
        
        setLoading(false);
      } else {
        setUser(null);
        setIsPremium(false);
        setAuthStep('login');
        setIsAdminLogin(false);
        setIsAdminView(false);
        setPhoneNumber('');
        setOtp('');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
      if (unsubSub) unsubSub();
    };
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(firestore, 'system_settings', 'config'), (doc) => {
      if (doc.exists()) {
        setSystemSettings(doc.data() as SystemSettings);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'system_settings/config');
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!user) {
      setChapters([]);
      setLeaderboard([]);
      setMonthlyTests([]);
      setTestSubmissions([]);
      return;
    }

    // Fetch all chapters for all roles to ensure consistency across student profiles as requested
    const chaptersQuery = user.role === 'admin' 
      ? collection(firestore, 'chapters')
      : query(collection(firestore, 'chapters'), where('status', '==', 'published'));

    const unsubChapters = onSnapshot(chaptersQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Chapter[];
      setChapters(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'chapters'));

    const unsubLeaderboard = onSnapshot(
      query(collection(firestore, 'public_profiles'), orderBy('points', 'desc'), limit(10)),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setLeaderboard(data);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'public_profiles')
    );

    const unsubTests = onSnapshot(
      query(collection(firestore, 'monthly_tests'), where('status', '==', 'published')),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MonthlyTest[];
        setMonthlyTests(data);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'monthly_tests')
    );

    const unsubSubmissions = onSnapshot(
      query(collection(firestore, 'monthly_test_submissions'), where('userId', '==', user.id)),
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as MonthlyTestSubmission[];
        setTestSubmissions(data);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'monthly_test_submissions')
    );

    const textbooksQuery = user.role === 'admin'
      ? collection(firestore, 'textbooks')
      : query(collection(firestore, 'textbooks'), where('status', '==', 'published'));

    const unsubTextbooks = onSnapshot(
      textbooksQuery,
      (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Textbook[];
        setTextbooks(data);
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'textbooks')
    );

    return () => {
      unsubChapters();
      unsubLeaderboard();
      unsubTests();
      unsubSubmissions();
      unsubTextbooks();
    };
  }, [user?.id]);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleGoogleLogin = async () => {
    // For Google, we don't need email validation beforehand as we get it from Google
    if (!isAdminLogin && (!regData.name.trim() || (!regData.class || !regData.board))) {
      alert(translations[language].requiredFieldsError);
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Ignore user-cancelled popup errors
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log("Login popup closed or cancelled by user.");
        return;
      }

      console.error("Google Login Error:", error);
      let title = "Login Error";
      let message = error.message || "An unexpected error occurred during Google Login.";

      if (error.code === 'auth/unauthorized-domain') {
        title = "Domain Not Authorized";
        message = language === 'en'
          ? "This domain is not authorized for Google Login. \n\nTo fix this:\n1. Open Firebase Console\n2. Go to Build > Authentication > Settings\n3. Click 'Authorized domains'\n4. Add this domain: " + window.location.hostname
          : "ଏହି ଡୋମେନ୍ Google Login ପାଇଁ ଅନୁମତିପ୍ରାପ୍ତ ନୁହେଁ | \n\nସମାଧାନ:\n୧. Firebase Console ଖୋଲନ୍ତୁ\n୨. Build > Authentication > Settings କୁ ଯାଆନ୍ତୁ\n୩. 'Authorized domains' କୁ ଯାଆନ୍ତୁ\n୪. ଏହି ଡୋମେନ୍ ଯୋଡନ୍ତୁ: " + window.location.hostname;
      } else if (error.code === 'auth/network-request-failed') {
        title = "Network Error";
        message = language === 'en'
          ? "A network error occurred. Please check your internet connection and ensure no ad-blockers are blocking Firebase (google.com)."
          : "ନେଟୱାର୍କ ସମସ୍ୟା | ଦୟାକରି ଆପଣଙ୍କ ଇଣ୍ଟରନେଟ୍ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ Ad-blocker ବନ୍ଦ କରନ୍ତୁ |";
      }

      setShowConfigError({ title, message });
    }
  };

  const validateRegData = (data = regData) => {
    if (isAdminLogin) return true;
    if (!data.class || !data.board) {
      alert(translations[language].requiredFieldsError);
      return false;
    }
    return true;
  };

  const setupRecaptcha = () => {
    const container = document.getElementById('recaptcha-container');
    if (!container) {
      console.error("Recaptcha container NOT found in DOM");
      return;
    }
    
    // Clear existing verifier
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {
        console.warn("Recaptcha clear error:", e);
      }
      (window as any).recaptchaVerifier = null;
    }
    
    // Ensure the container is empty and has the widget div
    container.innerHTML = '<div id="recaptcha-widget"></div>';
    
    try {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-widget', {
        size: 'invisible',
        callback: (response: any) => {
          console.log("reCAPTCHA solved", response);
        },
        'expired-callback': () => {
          console.warn("reCAPTCHA expired");
        }
      });
      // Important: render the verifier
      (window as any).recaptchaVerifier.render();
    } catch (e) {
      console.error("Recaptcha Initialization Error:", e);
    }
  };

  const handleAdminEmailLogin = async () => {
    setAdminLoginError('');
    setShowResetPasswordButton(false);
    if (!adminEmail || !adminPassword) {
      setAdminLoginError(language === 'en' ? "Please enter email and password" : "ଦୟାକରି ଇମେଲ୍ ଏବଂ ପାସୱାର୍ଡ ଦିଅନ୍ତୁ");
      return;
    }
    setIsSendingOtp(true);
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (error: any) {
      console.error("Admin Login Error:", error);
      // Auto-create the admin account if it doesn't exist yet
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          // Only auto-create if it's the known admin email
          if (adminEmail.toLowerCase() === 'pandadamayanti01@gmail.com') {
            await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            return; // Success!
          } else {
            setAdminLoginError("Invalid admin credentials. If you are a student, please use the Student Login.");
          }
        } catch (createError: any) {
          console.error("Admin Registration Error:", createError);
          if (createError.code === 'auth/email-already-in-use') {
            setAdminLoginError("This email is already registered (likely via Google Sign-In). Please use the 'Google' button below to log in as admin.");
            setShowResetPasswordButton(true);
          } else {
            setAdminLoginError("Registration failed: " + createError.message);
          }
        }
      } else if (error.code === 'auth/wrong-password') {
        setAdminLoginError("Incorrect password for admin account. If you signed up via Google, please use the 'Google' button below.");
        setShowResetPasswordButton(true);
      } else {
        setAdminLoginError("Login failed: " + error.message);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendPasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, adminEmail);
      setAdminLoginError("Password reset email sent! Please check your inbox, set your password, and try logging in again.");
      setShowResetPasswordButton(false);
    } catch (resetError: any) {
      setAdminLoginError("Failed to send reset email: " + resetError.message);
    }
  };

  const handlePhoneLogin = async () => {
    console.log("Handle Phone Login clicked");
    if (!validateRegData()) {
      console.log("Validation failed");
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      alert(language === 'en' ? "Please enter a valid phone number" : "ଦୟାକରି ଏକ ସଠିକ୍ ଫୋନ୍ ନମ୍ବର ଦିଅନ୍ତୁ");
      return;
    }
    if (!isAdminLogin && (phoneNumber === '9337956168' || phoneNumber === '+919337956168')) {
      alert(language === 'en' ? "This number is registered as Admin. Please use Admin Login." : "ଏହି ନମ୍ବର ଆଡମିନ୍ ଭାବରେ ପଞ୍ଜିକୃତ | ଦୟାକରି ଆଡମିନ୍ ଲଗଇନ୍ ବ୍ୟବହାର କରନ୍ତୁ |");
      setIsAdminLogin(true);
      return;
    }
    startPhoneAuth();
  };

  const startPhoneAuth = async () => {
    if (!auth) {
      console.error("Firebase Auth not initialized");
      return;
    }
    setIsSendingOtp(true);
    setOtp(''); // Clear previous OTP when starting/resending
    console.log("Starting Phone Auth process...");
    try {
      setupRecaptcha();
      
      const verifier = (window as any).recaptchaVerifier;
      if (!verifier) {
        throw new Error("reCAPTCHA verifier not initialized");
      }

      let formattedNumber = phoneNumber.trim();
      formattedNumber = formattedNumber.replace(/[^\d+]/g, '');
      
      if (!formattedNumber.startsWith('+')) {
        if (formattedNumber.startsWith('0')) {
          formattedNumber = formattedNumber.substring(1);
        }
        formattedNumber = '+91' + formattedNumber;
      }
      
      console.log("Requesting OTP for:", formattedNumber);
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, verifier);
      console.log("OTP sent successfully");
      setConfirmationResult(confirmation);
      setAuthStep('otp');
      setResendTimer(60);
    } catch (error: any) {
      console.error("Detailed Phone Login Error:", error);
      let message = translations[language].error;
      let title = "Phone Login Failed";

      if (error.code === 'auth/billing-not-enabled') {
        title = "Firebase Billing Required";
        message = language === 'en' 
          ? "Real SMS requires the Firebase Blaze (Paid) plan. \n\nTO TEST FOR FREE:\n1. Go to Firebase Console > Auth > Users\n2. Click 'Add phone number for testing'\n3. Add your number and a code (e.g. 123456)\n4. Use that number in this app."
          : "ପ୍ରକୃତ SMS ପାଇଁ Firebase Blaze ପ୍ଲାନ୍ ଆବଶ୍ୟକ | \n\nମାଗଣାରେ ପରୀକ୍ଷା କରିବା ପାଇଁ:\n୧. Firebase Console > Auth > Users କୁ ଯାଆନ୍ତୁ\n୨. 'Add phone number for testing' କୁ ଯାଆନ୍ତୁ\n୩. ଆପଣଙ୍କ ନମ୍ବର ଏବଂ ଏକ କୋଡ୍ (ଯଥା: 123456) ଯୋଡନ୍ତୁ |";
      } else if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/app-not-authorized') {
        title = "Domain Not Authorized";
        message = language === 'en'
          ? "This domain is not authorized in Firebase. \n\nTo fix:\n1. Go to Firebase Console > Auth > Settings\n2. Add this domain to 'Authorized domains':\n" + window.location.hostname
          : "ଏହି ଡୋମେନ୍ Firebase ରେ ଅନୁମତିପ୍ରାପ୍ତ ନୁହେଁ | \n\nସମାଧାନ:\n୧. Firebase Console > Auth > Settings କୁ ଯାଆନ୍ତୁ\n୨. ଏହି ଡୋମେନ୍ ଯୋଡନ୍ତୁ:\n" + window.location.hostname;
      } else if (error.code === 'auth/too-many-requests') {
        title = "Too Many Requests";
        message = language === 'en'
          ? "Firebase has blocked this device due to too many attempts. Please try again later or use a Test Number."
          : "ଅତ୍ୟଧିକ ପ୍ରୟାସ ଯୋଗୁଁ Firebase ଏହି ଡିଭାଇସ୍ ବନ୍ଦ କରିଛି |";
      } else if (error.code === 'auth/network-request-failed') {
        title = "Network Error";
        message = language === 'en'
          ? "Unable to reach Firebase. This usually happens due to:\n1. Poor internet connection\n2. An Ad-blocker or Firewall blocking Firebase\n3. Browser privacy settings\n\nPlease disable ad-blockers and try again."
          : "Firebase ସହିତ ସଂଯୋଗ ହୋଇପାରୁ ନାହିଁ | \n\nସମ୍ଭାବ୍ୟ କାରଣ:\n୧. ଦୁର୍ବଳ ଇଣ୍ଟରନେଟ୍\n୨. Ad-blocker କିମ୍ବା Firewall\n୩. ବ୍ରାଉଜର୍ ସେଟିଂସ\n\nଦୟାକରି Ad-blocker ବନ୍ଦ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
      } else {
        message = `Error: ${error.message || error.code}`;
      }

      setShowConfigError({ title, message });
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        } catch (e) {
          console.warn("Recaptcha reset error:", e);
        }
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    try {
      await confirmationResult.confirm(otp.trim());
    } catch (error: any) {
      console.error("OTP Error:", error);
      if (error.code === 'auth/invalid-verification-code') {
        alert(language === 'en' ? "Invalid OTP. Please check the code sent to your phone and try again." : "ଅବୈଧ OTP | ଦୟାକରି ଆପଣଙ୍କ ଫୋନକୁ ଆସିଥିବା କୋଡ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |");
      } else if (error.code === 'auth/code-expired') {
        alert(language === 'en' ? "OTP has expired. Please request a new one." : "OTP ର ସମୟ ସମାପ୍ତ ହୋଇଯାଇଛି | ଦୟାକରି ନୂତନ OTP ପାଇଁ ଅନୁରୋଧ କରନ୍ତୁ |");
      } else {
        alert(error.message || "Invalid OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Force a reload to clear any stale state if needed, 
      // though onAuthStateChanged should handle it.
      window.location.href = '/';
    } catch (error) {
      console.error("Logout Error:", error);
      // Fallback: clear user state manually
      setUser(null);
      setIsPremium(false);
    }
    setAiExplanations({});
  };

  const askAI = async (question: string, questionId: string) => {
    if (!isPremium) {
      alert(translations[language].subscriptionRequired);
      return;
    }

    setAiLoading(prev => ({ ...prev, [questionId]: true }));
    try {
      const text = await solveMathDoubt(question, language as 'en' | 'or');
      setAiExplanations(prev => ({ ...prev, [questionId]: text }));
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = language === 'en' 
        ? "Error generating explanation. Please try again later." 
        : "ସ୍ପଷ୍ଟୀକରଣ ପ୍ରସ୍ତୁତ କରିବାରେ ତ୍ରୁଟି | ଦୟାକରି ପରେ ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ |";
      setAiExplanations(prev => ({ ...prev, [questionId]: errorMessage }));
    } finally {
      setAiLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (amount: number, planType: 'monthly' | 'yearly' = 'monthly') => {
    if (!user) return;

    if (planType === 'yearly') {
      const yearlyPrice = systemSettings?.yearlyPrice || 999;
      if ((user.shareCount || 0) < 5) {
        alert(language === 'en' ? "Please complete the share requirements to unlock this offer." : "ଏହି ଅଫର୍ ଅନଲକ୍ କରିବାକୁ ଦୟାକରି ସେୟାର୍ ସର୍ତ୍ତଗୁଡିକ ପୂରଣ କରନ୍ତୁ |");
        return;
      }
    }
    
    const res = await loadRazorpayScript();
    if (!res) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

      // 1. Create Order on Backend
      try {
        console.log("Creating payment order...");
        const orderData = await fetchJson('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, amount })
        });

        console.log("Order created:", orderData);

        if (!orderData || !orderData.id) {
          throw new Error("Invalid order ID received from server.");
        }

        const razorpayKey = orderData.key;
        if (!razorpayKey) {
          throw new Error("Razorpay Key ID not provided by server.");
        }

        // Store pending payment in Firestore
        await setDoc(doc(firestore, 'payments', orderData.id), {
          user_id: user.id,
          amount: amount,
          status: 'pending',
          razorpay_order_id: orderData.id,
          created_at: new Date().toISOString()
        });

        // 2. Open Razorpay Checkout
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Utkal Skill Centre",
        description: "AI Plan Subscription",
        order_id: orderData.id,
        handler: async function (response: any) {
          console.log("Payment response received:", response);
          // 3. Verify Payment on Backend
          try {
            const verifyData = await fetchJson('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id
              })
            });

            if (verifyData.success) {
              // Update payment status
              await updateDoc(doc(firestore, 'payments', response.razorpay_order_id), {
                status: 'success',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              // Update user subscription
              const expiryDate = new Date();
              if (planType === 'yearly') {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
              } else {
                expiryDate.setMonth(expiryDate.getMonth() + 1);
              }
              
              await setDoc(doc(firestore, 'subscriptions', user.id), {
                active: true,
                plan: 'premium',
                type: planType,
                expires_at: expiryDate.toISOString()
              });

              setIsPremium(true);
              alert("Payment Successful! Welcome to the AI Plan.");
            }
          } catch (err: any) {
            console.error("Payment Verification Error:", err);
            alert("Payment Verification Failed: " + err.message);
          }
        },
        modal: {
          ondismiss: function() {
            console.log("Checkout modal closed");
          }
        },
        prefill: {
          name: user.name || "Student",
          email: user.email || "student@example.com",
          ...(phoneNumber ? { contact: phoneNumber } : {})
        },
        theme: {
          color: "#10b981"
        }
      };

      console.log("Opening Razorpay checkout with options:", { ...options, key: "***" });
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Order Creation Error:", err);
      alert("Error creating order: " + err.message);
    }
  };

  const handleShare = async () => {
    if (!user) return;
    const text = `Join Utkal Skill Centre and unlock your potential with AI-based learning! 🚀 https://utkalskillcentre.com`;
    
    // Mark as shared immediately - set to 5 to unlock
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        shareCount: 5
      });
    } catch (err) {
      console.error("Error updating share count:", err);
    }

    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    window.location.href = url;
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 500);
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-slate-300 mb-6">{dbError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans">
        {/* AI Banner */}
        <div className="bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border-b border-emerald-500/30 px-6 py-2 flex items-center justify-center gap-2 shrink-0 z-50 relative overflow-hidden w-full">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] pointer-events-none"></div>
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <p className="text-sm font-medium text-emerald-100 hidden sm:block">
            {language === 'en' ? 'Experience the new AI-powered learning tools!' : 'ନୂତନ AI-ଚାଳିତ ଶିକ୍ଷଣ ଉପକରଣଗୁଡ଼ିକର ଅନୁଭବ କରନ୍ତୁ!'}
          </p>
          <p className="text-sm font-medium text-emerald-100 sm:hidden">
            {language === 'en' ? 'New AI tools!' : 'ନୂତନ AI ଉପକରଣଗୁଡ଼ିକ!'}
          </p>
        </div>

        <div className="flex-1 flex relative overflow-hidden">
          {/* Background Glows & Grid */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>

          {/* Left Content - Marketing / AI Focus */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24 relative z-10 border-r border-white/5 bg-slate-900/30 backdrop-blur-sm overflow-hidden">
          {/* Abstract AI Network Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl relative z-10"
          >
            <Logo className="h-12 mb-8 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles size={14} />
              AI-Powered Learning
            </div>
            
            <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.1] mb-6 tracking-tight">
              Master Your Future with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Intelligent AI</span>
            </h1>
            
            <p className="text-lg text-slate-400 mb-12 leading-relaxed">
              Experience the next generation of education. Our AI tutor adapts to your learning style, providing real-time feedback and personalized pathways to success.
            </p>

            {/* AI Interface Mockup / Floating Elements */}
            <div className="relative h-72 w-full mt-8">
              {/* Main AI Core */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute inset-0 border border-emerald-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-2 border border-cyan-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-full border border-white/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <Brain className="text-emerald-400 w-12 h-12" />
                </div>
              </div>

              {/* Connecting Lines & Nodes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                <motion.path 
                  d="M 50 50 Q 150 100 200 150" 
                  stroke="rgba(16,185,129,0.3)" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="5,5"
                  animate={{ strokeDashoffset: [0, -100] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />
                <motion.path 
                  d="M 350 50 Q 250 100 200 150" 
                  stroke="rgba(6,182,212,0.3)" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="5,5"
                  animate={{ strokeDashoffset: [0, 100] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />
                <motion.path 
                  d="M 50 250 Q 150 200 200 150" 
                  stroke="rgba(59,130,246,0.3)" 
                  strokeWidth="2" 
                  fill="none" 
                  strokeDasharray="5,5"
                  animate={{ strokeDashoffset: [0, -100] }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                />
              </svg>

              {/* Floating Nodes */}
              <motion.div 
                animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute top-4 left-8 bg-slate-800/80 backdrop-blur-md border border-emerald-500/30 p-3 rounded-2xl shadow-lg flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Bot className="text-emerald-400 w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">AI Analysis</div>
                  <div className="text-sm font-bold text-white">98% Accuracy</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 15, 0], x: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute top-8 right-4 bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 p-3 rounded-2xl shadow-lg flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Sparkles className="text-cyan-400 w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Learning Path</div>
                  <div className="text-sm font-bold text-white">Optimized</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-4 left-1/4 bg-slate-800/80 backdrop-blur-md border border-blue-500/30 p-3 rounded-2xl shadow-lg flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Globe className="text-blue-400 w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Global Knowledge</div>
                  <div className="text-sm font-bold text-white">Connected</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Right Content - Login Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass-card rounded-[2rem] p-8 shadow-2xl relative bg-slate-900/60 backdrop-blur-2xl border border-white/10 overflow-hidden">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 pointer-events-none"></div>
              
              <div className="absolute top-6 right-6 z-20">
                <button 
                  onClick={() => {
                    const newLang = language === 'en' ? 'or' : 'en';
                    setLanguage(newLang);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
                >
                  <Globe size={12} />
                  {language === 'en' ? 'ଓଡ଼ିଆ' : 'English'}
                </button>
              </div>

              <div className="text-center mb-8 mt-2 lg:hidden relative z-20">
                <Logo className="h-10 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>

              <div className="mb-8 mt-6 relative z-20">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                  {authStep === 'login' ? (isAdminLogin ? 'Admin Portal' : 'Welcome Back') : 'Verify Identity'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {authStep === 'login' 
                    ? (isAdminLogin ? 'Authenticate to access the control panel' : 'Enter your credentials to continue learning') 
                    : `We sent a secure code to ${phoneNumber}`}
                </p>
              </div>

              {authStep === 'login' ? (
                <div className="space-y-4">
                  {isAdminLogin ? (
                    <div className="space-y-4">
                      <input 
                        type="email" 
                        placeholder="Admin Email"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                      />
                      <input 
                        type="password" 
                        placeholder="Password"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                      <button 
                        onClick={handleAdminEmailLogin}
                        disabled={isSendingOtp}
                        className={`w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 ${isSendingOtp ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSendingOtp && (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                          />
                        )}
                        {isSendingOtp ? (language === 'en' ? 'Logging in...' : 'ଲଗଇନ୍ ହେଉଛି...') : (language === 'en' ? 'Login with Email' : 'ଇମେଲ୍ ସହିତ ଲଗଇନ୍')}
                      </button>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-slate-900 px-4 text-slate-500">Or Admin Phone Login</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex items-center justify-center px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium">+91</div>
                        <input 
                          type="tel" 
                          placeholder="Admin Phone"
                          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={handlePhoneLogin}
                        disabled={isSendingOtp}
                        className={`w-full py-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-sm font-bold hover:bg-slate-700 transition-all shadow-lg flex items-center justify-center gap-2 ${isSendingOtp ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {language === 'en' ? 'Login with Phone' : 'ଫୋନ୍ ସହିତ ଲଗଇନ୍'}
                      </button>
                      {adminLoginError && (
                        <div className="text-red-400 text-xs text-center mt-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                          {adminLoginError}
                        </div>
                      )}
                      {showResetPasswordButton && (
                        <button 
                          onClick={handleSendPasswordReset}
                          className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 mt-2"
                        >
                          Send Password Reset Email
                        </button>
                      )}
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-slate-900 px-4 text-slate-500">Or continue with</span>
                        </div>
                      </div>
                      <button 
                        onClick={handleGoogleLogin}
                        className="w-full py-3 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <select 
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                          value={regData.class}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegData({ ...regData, class: val });
                          }}
                        >
                          <option value="">{translations[language].selectClass} *</option>
                          {Object.entries(translations[language].classes)
                            .filter(([key]) => !systemSettings.enabledClasses || systemSettings.enabledClasses.length === 0 || systemSettings.enabledClasses.includes(key))
                            .map(([key, label]) => (
                            <option key={key} value={key}>{label as string}</option>
                          ))}
                        </select>
                        <select 
                          className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                          value={regData.board}
                          onChange={(e) => setRegData({ ...regData, board: e.target.value })}
                        >
                          <option value="">{translations[language].selectBoard} *</option>
                          <option value="odisha">{translations[language].boards.odisha}</option>
                          <option value="saraswati">{translations[language].boards.saraswati}</option>
                          <option value="cbse">{translations[language].boards.cbse}</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <div className="flex items-center justify-center px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium">+91</div>
                          <input 
                            type="tel" 
                            placeholder={translations[language].enterPhone}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                          />
                        </div>
                        <button 
                          onClick={handlePhoneLogin}
                          disabled={isSendingOtp}
                          className={`w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 ${isSendingOtp ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isSendingOtp && (
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                          )}
                          {isSendingOtp ? translations[language].sending : translations[language].sendOtp}
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 text-center mt-4">
                    {!isAdminLogin && (language === 'en' ? '* All fields are mandatory' : '* ସମସ୍ତ ତଥ୍ୟ ଦେବା ଅନିର୍ବାଯ୍ୟ')}
                  </p>
                  
                  <div className="text-center mt-4">
                    <button 
                      onClick={() => setIsAdminLogin(!isAdminLogin)} 
                      className="text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {isAdminLogin ? (language === 'en' ? "Student Login" : "ଛାତ୍ର ଲଗଇନ୍") : (language === 'en' ? "Admin Login" : "ଆଡମିନ୍ ଲଗଇନ୍")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-2">{translations[language].enterOtp} to {phoneNumber}</p>
                    <button onClick={() => setAuthStep('login')} className="text-emerald-500 text-xs font-medium hover:underline">Change Number</button>
                  </div>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="------"
                    className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-3xl tracking-[1em] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  <button 
                    onClick={verifyOtp}
                    disabled={loading || otp.length < 6}
                    className={`w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 ${ (loading || otp.length < 6) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading && (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    )}
                    {loading ? (language === 'en' ? 'Verifying...' : 'ଯାଞ୍ଚ କରାଯାଉଛି...') : translations[language].verifyOtp}
                  </button>

                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-slate-500 text-xs font-medium">
                        {language === 'en' ? `Resend OTP in ${resendTimer}s` : `${resendTimer} ସେକେଣ୍ଡ ପରେ ପୁଣି ପଠାନ୍ତୁ`}
                      </p>
                    ) : (
                      <button 
                        onClick={startPhoneAuth}
                        disabled={isSendingOtp}
                        className={`text-emerald-500 text-xs font-medium hover:underline ${isSendingOtp ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isSendingOtp ? (language === 'en' ? 'Sending...' : 'ପଠାଯାଉଛି...') : translations[language].resendOtp}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div id="recaptcha-container" className="flex justify-center my-4 min-h-[80px]"></div>
            <BigsanBranding className="mt-8" />
          </motion.div>
        </div>

        {/* Configuration Error Modal */}
        <AnimatePresence>
          {showConfigError && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 mx-auto">
                  <Settings className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-4">{showConfigError.title}</h2>
                <div className="text-slate-300 text-sm whitespace-pre-line mb-8 bg-white/5 p-4 rounded-xl border border-white/5">
                  {showConfigError.message}
                </div>
                <button 
                  onClick={() => setShowConfigError(null)}
                  className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all"
                >
                  Got it
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        </div>
      </div>
    );
  }

  if (isAdminView && user?.role === 'admin') {
    console.log("Rendering AdminDashboard for user:", user.email);
    return <AdminDashboard onExit={() => setIsAdminView(false)} />;
  }

  if (isAdminView) {
    console.warn("isAdminView is true but user role is not admin:", user?.role);
  }

  const isClassEnabled = true; // Restriction removed

  if (user && user.role !== 'admin' && !isClassEnabled) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={48} className="text-amber-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            {language === 'en' ? "Class Currently Disabled" : "ଶ୍ରେଣୀ ବର୍ତ୍ତମାନ ଅକ୍ଷମ ଅଛି"}
          </h2>
          <p className="text-slate-400">
            {language === 'en' 
              ? `Access to ${translations[language].classes[user.class] || user.class} is currently restricted by the administrator. Please contact support or check back later.`
              : `${translations[language].classes[user.class] || user.class} ପାଇଁ ପ୍ରବେଶ ବର୍ତ୍ତମାନ ପ୍ରଶାସକଙ୍କ ଦ୍ୱାରା ସୀମିତ ଅଛି | ଦୟାକରି ସହାୟତା ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ କିମ୍ବା ପରେ ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ |`}
          </p>
          <button 
            onClick={handleLogout}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold"
          >
            {translations[language].logout}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary language={language}>
      <div className="min-h-screen bg-transparent text-white flex relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="bg-orb-1"></div>
        <div className="bg-orb-2"></div>
        <div className="bg-orb-3"></div>

        {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 glass-panel border-r border-white/5 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static
      `}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <Logo className="h-10" />
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X /></button>
          </div>

          <nav className="flex-1 space-y-2">
            {user.role === 'admin' ? (
              <SidebarItem icon={<Settings size={20}/>} label={translations[language].admin} active={true} onClick={() => { setIsAdminView(true); setSidebarOpen(false); }} />
            ) : (
              <>
                <SidebarItem icon={<User size={20}/>} label="Profile" active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }} />
                <SidebarItem icon={<BarChart3 size={20}/>} label={translations[language].dashboard} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} />
                <SidebarItem icon={<BookOpen size={20}/>} label={translations[language].courses} active={activeTab === 'courses'} onClick={() => { setActiveTab('courses'); setSidebarOpen(false); }} />
                <SidebarItem icon={<Book size={20}/>} label={language === 'en' ? 'Textbooks' : 'ପାଠ୍ୟପୁସ୍ତକ'} active={activeTab === 'textbooks'} onClick={() => { setActiveTab('textbooks'); setSidebarOpen(false); }} />
                <SidebarItem icon={<Clock size={20}/>} label={translations[language].monthlyTests} active={activeTab === 'monthly_tests'} onClick={() => { setActiveTab('monthly_tests'); setSidebarOpen(false); }} />
                <SidebarItem icon={<MessageSquare size={20}/>} label={translations[language].aiSolver} active={activeTab === 'ai'} onClick={() => { setActiveTab('ai'); setSidebarOpen(false); }} />
                <SidebarItem icon={<Trophy size={20}/>} label={translations[language].leaderboard} active={activeTab === 'leaderboard'} onClick={() => { setActiveTab('leaderboard'); setSidebarOpen(false); }} />
                <SidebarItem icon={<ShoppingBag size={20}/>} label={language === 'en' ? 'Avatar Store' : 'ଅବତାର ଷ୍ଟୋର'} active={activeTab === 'store'} onClick={() => { setActiveTab('store'); setSidebarOpen(false); }} />
                <SidebarItem icon={<CreditCard size={20}/>} label="Plans" active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setSidebarOpen(false); }} />
              </>
            )}
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'or' : 'en')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 transition-all"
            >
              <Globe size={20} />
              <span>{language === 'en' ? 'ଓଡ଼ିଆ' : 'English'}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all"
            >
              <LogOut size={20} />
              <span>{translations[language].logout}</span>
            </button>
            <BigsanBranding className="pt-4 opacity-50" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* AI Banner */}
        {!isAdminView && (
          <div className="bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border-b border-emerald-500/30 px-6 py-2 flex items-center justify-center gap-2 shrink-0 z-40 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] pointer-events-none"></div>
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <p className="text-sm font-medium text-emerald-100 hidden sm:block">
              {language === 'en' ? 'Experience the new AI-powered learning tools!' : 'ନୂତନ AI-ଚାଳିତ ଶିକ୍ଷଣ ଉପକରଣଗୁଡ଼ିକର ଅନୁଭବ କରନ୍ତୁ!'}
            </p>
            <p className="text-sm font-medium text-emerald-100 sm:hidden">
              {language === 'en' ? 'New AI tools!' : 'ନୂତନ AI ଉପକରଣଗୁଡ଼ିକ!'}
            </p>
            <button 
              onClick={() => setActiveTab('ai')} 
              className="text-xs bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full transition-all ml-2 font-bold border border-emerald-500/30 hover:scale-105"
            >
              {language === 'en' ? 'Try Now' : 'ଚେଷ୍ଟା କରନ୍ତୁ'}
            </button>
          </div>
        )}

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 glass-panel border-b border-white/5 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400"><Menu /></button>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-white">
                {user.name}
              </h2>
              {user.role !== 'admin' && (
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {user.board} • Class {user.class}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user.role !== 'admin' && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Class {user.class}</span>
                <span className="text-sm font-medium text-emerald-400">{user.points} {translations[language].points}</span>
              </div>
            )}
            {user.role !== 'admin' && user.streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20 text-orange-400">
                <Flame size={16} fill="currentColor" className="animate-pulse" />
                <span className="text-sm font-black">{user.streak}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <div 
                onClick={() => setActiveTab('profile')}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{user.name[0]}</span>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-all"
                title={translations[language].logout}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {user.role !== 'admin' && user.board !== 'odisha' ? (
            <div className="flex flex-col items-center justify-center h-full text-white space-y-4">
              <h1 className="text-4xl font-bold">Coming Soon!!</h1>
              <p className="text-slate-400">We are currently focusing on Odia medium.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && <Dashboard user={user} leaderboard={leaderboard} language={language} isPremium={isPremium} onUpgrade={() => setActiveTab('plans')} chapters={chapters} />}
              {activeTab === 'courses' && <CoursesView user={user} chapters={chapters} language={language} isPremium={isPremium} onUpgrade={() => setActiveTab('plans')} onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'textbooks' && <TextbooksView user={user} textbooks={textbooks} language={language} onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'monthly_tests' && <MonthlyTestsView tests={monthlyTests} submissions={testSubmissions} language={language} user={user} onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'ai' && (
                isPremium ? <AiSolverView language={language} onBack={() => setActiveTab('dashboard')} /> : <SubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} systemSettings={systemSettings} onBack={() => setActiveTab('dashboard')} />
              )}
              {activeTab === 'profile' && <ProfileView user={user} language={language} onBack={() => setActiveTab('dashboard')} onParentAccess={() => setActiveTab('parent_dashboard')} setActiveTab={setActiveTab} />}
              {activeTab === 'parent_dashboard' && <ParentDashboard user={user} chapters={chapters} leaderboard={leaderboard} language={language} onBack={() => setActiveTab('profile')} />}
              {activeTab === 'store' && <AvatarStore user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'plans' && <SubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} systemSettings={systemSettings} onBack={() => setActiveTab('dashboard')} />}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* AI Study Buddy */}
      {user && <StudyBuddy user={user} language={language} />}

      {/* PWA Update Prompt */}
      <PwaUpdatePrompt />
    </div>
    </ErrorBoundary>
  );
}

function ParentDashboard({ user, chapters, leaderboard, language, onBack }: any) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    const q = query(
      collection(firestore, 'quiz_results'),
      where('userId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setResults(data);
      setLoading(false);
      if (data.length > 0) {
        generateInsights(data);
      }
    }, (error) => {
      console.error("Parent Dashboard Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id]);

  const generateInsights = async (quizData: any[]) => {
    if (aiInsights || generatingInsights) return;
    setGeneratingInsights(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze these quiz results for a student named ${user.name} and provide 3-4 concise, actionable insights for their parent. 
      Data: ${JSON.stringify(quizData.map(r => ({ chapter: r.chapterId, accuracy: r.accuracy, score: r.score, total: r.total })))}
      Format the response as a short list of bullet points. Focus on strengths and areas for improvement.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt,
      });
      setAiInsights(response.text || "No insights available yet.");
    } catch (err) {
      console.error("Failed to generate AI insights:", err);
      setAiInsights("Unable to generate AI insights at this time.");
    } finally {
      setGeneratingInsights(false);
    }
  };

  const stats = {
    totalQuizzes: results.length,
    avgScore: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.accuracy, 0) / results.length) : 0,
    chaptersCompleted: user.completed_chapters?.length || 0,
    totalChapters: chapters.length
  };

  const userRank = leaderboard.findIndex((s: any) => s.name === user.name) + 1 || '-';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto pb-12"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Profile</span>
        </button>
        <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest">
          Parent Mode
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-1">{stats.chaptersCompleted} / {stats.totalChapters}</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Chapters Completed</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-emerald-500 mb-1">{stats.avgScore}%</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Average Accuracy</p>
        </div>
        <div className="glass-card neon-border rounded-3xl p-6 text-center">
          <div className="text-3xl font-bold text-blue-500 mb-1">{stats.totalQuizzes}</div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Quizzes Taken</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-white">Recent Activity</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : results.length === 0 ? (
            <div className="glass-card neon-border rounded-3xl p-12 text-center">
              <p className="text-slate-500">No activity recorded yet. Encourage your child to take a quiz!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((r) => {
                const chapter = chapters.find((c: any) => c.id === r.chapterId);
                return (
                  <motion.div 
                    variants={itemVariants}
                    key={r.id} 
                    className="glass-card neon-border rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${r.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-500' : r.accuracy >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                        {r.accuracy}%
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">{chapter?.title || 'Unknown Chapter'}</h4>
                        <p className="text-xs text-slate-500">{r.timestamp?.toDate().toLocaleDateString()} • {r.score}/{r.total} Correct</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-600 tracking-widest">
                      {chapter?.subject}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          {user?.parentShowLeaderboard !== false && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Effort Ranking</h3>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                  Rank #{userRank}
                </div>
              </div>
              <div className="glass-card neon-border rounded-3xl p-6 overflow-hidden">
                <div className="space-y-4">
                  {leaderboard.slice(0, 5).map((student: any, i: number) => (
                    <div key={i} className={`flex items-center justify-between ${student.name === user.name ? 'bg-emerald-500/10 -mx-6 px-6 py-2 border-y border-emerald-500/20' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-6 text-xs font-bold ${i < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>{i + 1}</span>
                        <span className={`text-sm ${student.name === user.name ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{student.name}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">{student.points}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold">Weekly Effort Points</p>
              </div>
            </>
          )}

          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles size={20} className="text-emerald-400" />
              AI Insights
            </h3>
            {generatingInsights ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={16} className="animate-spin" />
                Analyzing performance...
              </div>
            ) : aiInsights ? (
              <div className="text-xs text-slate-300 mb-4 leading-relaxed prose prose-invert prose-xs">
                <Markdown>{aiInsights}</Markdown>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">Take more quizzes to unlock AI-powered skill gap analysis and personalized learning paths.</p>
            )}
            <button className="w-full py-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-all">
              View Detailed Report
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ProfileView({ user, language, onBack, onParentAccess, setActiveTab }: any) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [parentShowLeaderboard, setParentShowLeaderboard] = useState(user.parentShowLeaderboard ?? true);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleParentAccess = () => {
    if (!user.parent_pin) {
      // If no PIN set, go straight in or ask to set one
      onParentAccess();
    } else {
      setShowPinModal(true);
    }
  };

  const verifyPin = () => {
    if (pin === user.parent_pin) {
      onParentAccess();
      setShowPinModal(false);
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        name,
        email,
        role: user.role,
        class: user.class || null,
        board: user.board || null,
        parentShowLeaderboard
      });
      
      if (auth.currentUser && email && email !== auth.currentUser.email) {
        try {
          await updateEmail(auth.currentUser, email);
        } catch (authErr: any) {
          console.error("Auth Email Update Error:", authErr);
          alert("Profile saved, but please log out and log back in to fully update your email address for login.");
        }
      }
      
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Profile Update Error:", err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setVerifying(true);
    try {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Verification Error:", err);
      alert("Failed to send verification email. " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const isEmailVerified = auth.currentUser?.emailVerified;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-xl mx-auto"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div 
        variants={itemVariants}
        className="glass-card neon-border rounded-3xl p-8 space-y-6"
      >
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-800/50 border-2 border-emerald-500/30 p-2 flex items-center justify-center shadow-2xl overflow-hidden">
            <img src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'} alt="Avatar" className="w-full h-full group-hover:scale-110 transition-transform" />
          </div>
          <button 
            onClick={() => setActiveTab('store')}
            className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 rounded-xl text-white shadow-lg hover:bg-emerald-500 transition-all border border-emerald-400/30"
          >
            <ShoppingBag size={16} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{translations[language].profile.editTitle}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            {language === 'en' ? 'Points:' : 'ପଏଣ୍ଟ:'} <span className="text-emerald-400">{user.points}</span>
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].name}</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].email}</label>
          <div className="flex gap-2">
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {email && email === auth.currentUser?.email && !isEmailVerified && (
              <button 
                onClick={handleVerifyEmail}
                disabled={verifying}
                className="px-4 py-3 rounded-xl bg-blue-600/20 text-blue-400 font-medium hover:bg-blue-600/30 transition-all border border-blue-500/20 whitespace-nowrap"
              >
                {verifying ? 'Sending...' : 'Verify'}
              </button>
            )}
            {email && email === auth.currentUser?.email && isEmailVerified && (
              <div className="px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 font-medium border border-emerald-500/20 flex items-center whitespace-nowrap">
                Verified
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.phone}</label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-between">
              <span className="text-sm">{user.phoneNumber || user.phone || 'N/A'}</span>
              <Lock size={14} className="opacity-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.class}</label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-between">
              <span className="text-sm">{translations[language].classes[user.class] || user.class || 'N/A'}</span>
              <Lock size={14} className="opacity-50" />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {translations[language].profile.requestChangeNote}
          </p>
          <div className="flex gap-2">
            <a 
              href={`https://wa.me/919337956168?text=${encodeURIComponent(`Namaskar Admin, I want to change my ${language === 'en' ? 'Class/Mobile Number' : 'ଶ୍ରେଣୀ/ମୋବାଇଲ୍ ନମ୍ବର'}. My Name: ${user.name}, Current Class: ${user.class}. Reason: `)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 border border-emerald-500/20"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
            <a 
              href={`mailto:pandadamayanti01@gmail.com?subject=Profile Change Request&body=${encodeURIComponent(`Namaskar Admin,\n\nI want to change my Class or Mobile Number.\n\nName: ${user.name}\nPhone: ${user.phoneNumber || user.phone}\nCurrent Class: ${user.class}\n\nReason for change:\n`)}`}
              className="flex-1 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 border border-blue-500/20"
            >
              <Mail size={14} />
              Email
            </a>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.parentPin}</label>
          <input 
            type="password"
            maxLength={4}
            placeholder="Set a 4-digit PIN for parent access"
            value={user.parent_pin || ''}
            onChange={async (e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 4) {
                await updateDoc(doc(firestore, 'users', user.id), {
                  parent_pin: val
                });
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="text-[10px] text-slate-500 mt-1">{translations[language].profile.parentPinNote}</p>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative inline-flex items-center">
              <input 
                type="checkbox" 
                checked={parentShowLeaderboard}
                onChange={(e) => setParentShowLeaderboard(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{translations[language].profile.parentLeaderboard}</span>
              <span className="text-[10px] text-slate-500">{translations[language].profile.parentLeaderboardNote}</span>
            </div>
          </label>
        </div>
        <div className="pt-6 border-t border-white/5">
          <button 
            onClick={handleParentAccess}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500 text-white">
                <Settings size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">{translations[language].profile.parentDashboard}</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">{translations[language].profile.parentDashboardTagline}</p>
              </div>
            </div>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : translations[language].profile.saveProfile}
        </button>
      </div>
    </motion.div>

    {/* PIN Modal */}
    <AnimatePresence>
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
              <Settings size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Parent Access</h3>
            <p className="text-slate-400 mb-6 text-sm">Enter your 4-digit parent PIN to continue</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-12 h-16 rounded-xl border flex items-center justify-center text-2xl font-bold ${pin.length > i ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                  {pin.length > i ? '•' : ''}
                </div>
              ))}
            </div>

            {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

            <div className="grid grid-cols-3 gap-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === 'C') setPin('');
                    else if (btn === 'OK') verifyPin();
                    else if (typeof btn === 'number' && pin.length < 4) setPin(prev => prev + btn);
                  }}
                  className="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                >
                  {btn}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowPinModal(false)}
              className="text-slate-500 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </motion.div>
  );
}

// --- Sub-Views ---

function StudyBuddy({ user, language }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: `Hi ${user.name}! I'm your AI Study Buddy. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: `You are a helpful, encouraging AI Study Buddy for a student named ${user.name}. 
          Your goal is to explain educational concepts clearly, help with homework (without just giving answers), and motivate the student. 
          Keep your responses concise, friendly, and appropriate for a school-age student. 
          Use simple language and analogies where helpful.`
        }
      });

      const response = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch (err) {
      console.error("Study Buddy Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! I'm having a little trouble thinking right now. Can we try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 flex items-center justify-center z-40 border-4 border-slate-950"
      >
        <Bot size={32} />
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-slate-950"
        />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 w-96 h-[500px] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-blue-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Study Buddy</h3>
                  <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">AI Tutor Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-tr-none' 
                      : 'bg-white/5 text-slate-300 border border-white/10 rounded-tl-none'
                  }`}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-white/5 bg-slate-950/50">
              <div className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
        active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </motion.button>
  );
}



function SubscriptionGuard({ onSubscribe, language, isPremium, user, onShare, systemSettings, onBack }: any) {
  const p = translations[language].pricing;
  const monthlyPrice = systemSettings?.monthlyPrice || 199;
  const yearlyPrice = systemSettings?.yearlyPrice || 999;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">{p.title}</h2>
        <p className="text-slate-400">Empowering your education with AI-driven intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden">
          {!isPremium && (
            <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {translations[language].pricing.currentPlan}
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{p.free.name}</h3>
            <div className="text-4xl font-bold text-white">{p.free.price}</div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {p.free.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px]">✓</div>
                {f}
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-4 rounded-2xl bg-white/5 text-slate-500 font-bold cursor-not-allowed">
            {isPremium ? "Included" : p.currentPlan}
          </button>
        </div>

        {/* AI Plan */}
        <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-emerald-500/10">
          {isPremium && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              {translations[language].pricing.currentPlan}
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{p.ai.name}</h3>
            <div className="space-y-1">
              <div className="text-4xl font-bold text-white">₹{monthlyPrice} / {language === 'en' ? 'month' : 'ମାସ'}</div>
              <div className="text-emerald-400 font-bold">₹{yearlyPrice} / {language === 'en' ? 'year' : 'ବର୍ଷ'} (Save 70%)</div>
            </div>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {p.ai.features.map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white">✓</div>
                {f}
              </li>
            ))}
          </ul>
          {!isPremium ? (
            <div className="space-y-4">
              <button 
                onClick={() => onSubscribe(monthlyPrice, 'monthly')}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20"
              >
                {language === 'en' ? `Subscribe Monthly (₹${monthlyPrice})` : `ମାସିକ ସବସ୍କ୍ରିପସନ୍ (₹${monthlyPrice})`}
              </button>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>{language === 'en' ? `Unlock Yearly Offer (₹${yearlyPrice})` : `ବାର୍ଷିକ ଅଫର୍ ଅନଲକ୍ କରନ୍ତୁ (₹${yearlyPrice})`}</span>
                  {((user?.shareCount || 0) >= 5) ? (
                    <span className="text-emerald-500">Unlocked!</span>
                  ) : (
                    <span className="text-orange-500">Locked</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>{p.shareToUnlock}</span>
                    <span>{user?.shareCount || 0}/5</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all" 
                      style={{ width: `${Math.min(((user?.shareCount || 0) / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <button 
                    onClick={onShare}
                    className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> {p.shareOnWhatsApp}
                  </button>
                </div>

                <button 
                  onClick={() => onSubscribe(yearlyPrice, 'yearly')}
                  disabled={((user?.shareCount || 0) < 5)}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                    ((user?.shareCount || 0) >= 5)
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {((user?.shareCount || 0) >= 5) 
                    ? (language === 'en' ? `Offer Unlocked! Pay ₹${yearlyPrice} Now` : `ଅଫର୍ ଅନଲକ୍ ହୋଇଛି! ଏବେ ₹${yearlyPrice} ପେମେଣ୍ଟ କରନ୍ତୁ`)
                    : (language === 'en' ? `Subscribe Yearly (₹${yearlyPrice})` : `ବାର୍ଷିକ ସବସ୍କ୍ରିପସନ୍ (₹${yearlyPrice})`)}
                </button>
              </div>
            </div>
          ) : (
            <button disabled className="w-full py-4 rounded-2xl bg-emerald-500/20 text-emerald-500 font-bold cursor-not-allowed">
              Active
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CoursesView({ user, chapters, language, isPremium, onUpgrade, onBack }: any) {
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [recentlyViewed, setRecentlyViewed] = useState<Chapter[]>([]);

  // Load recently viewed from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`recently_viewed_${user?.id}`);
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        const recent = ids.map((id: string) => chapters.find((c: Chapter) => c.id === id)).filter(Boolean);
        setRecentlyViewed(recent);
      } catch (e) {
        console.error("Error parsing recently viewed", e);
      }
    }
  }, [chapters, user?.id]);

  const handleSelectChapter = (chapter: Chapter) => {
    setSelected(chapter);
    
    // Update recently viewed
    const updatedIds = [chapter.id, ...recentlyViewed.map(c => c.id).filter(id => id !== chapter.id)].slice(0, 3);
    localStorage.setItem(`recently_viewed_${user?.id}`, JSON.stringify(updatedIds));
    
    const recent = updatedIds.map(id => chapters.find(c => c.id === id)).filter(Boolean) as Chapter[];
    setRecentlyViewed(recent);
  };

  const boardKey = React.useMemo(() => {
    if (!user?.board) return 'odisha';
    const b = user.board.toLowerCase();
    if (b.includes('saraswati')) return 'saraswati';
    if (b.includes('cbse')) return 'cbse';
    return 'odisha';
  }, [user?.board]);

  const classFilteredChapters = React.useMemo(() => {
    return chapters.filter((c: Chapter) => {
      const matchesClass = !user?.class || c.class === user.class;
      const matchesBoard = !user?.board || c.board === boardKey;
      return matchesClass && matchesBoard;
    });
  }, [chapters, user?.class, user?.board, boardKey]);

  const availableSubjects = React.useMemo(() => {
    const predefined = translations[language]?.subjects ? Object.keys(translations[language].subjects) : [];
    const existingInChapters = new Set<string>(classFilteredChapters.map((c: Chapter) => c.subject));
    
    // Only show subjects that have at least one chapter
    const filteredPredefined = predefined.filter(s => existingInChapters.has(s));
    const othersInChapters = Array.from(existingInChapters).filter(s => !predefined.includes(s));
    
    return ['all', ...filteredPredefined, ...othersInChapters];
  }, [language, classFilteredChapters]);

  const filteredChapters = classFilteredChapters.filter((c: Chapter) => {
    if (subjectFilter === 'all') return true;
    return c.subject === subjectFilter;
  });

  // Requirement: Only show one entry per logical chapter
  const uniqueChapters = React.useMemo(() => {
    return Array.from(
      filteredChapters.reduce((acc: Map<string, Chapter>, current: Chapter) => {
        const groupId = current.translationGroupId || current.id;
        const existing = acc.get(groupId);
        if (!existing || current.language === 'en') {
          acc.set(groupId, current);
        }
        return acc;
      }, new Map<string, Chapter>()).values()
    ) as Chapter[];
  }, [filteredChapters]);

  // Grouped chapters for "All Subjects" view
  const groupedChapters = React.useMemo(() => {
    const groups: Record<string, Chapter[]> = {};
    uniqueChapters.forEach((chapter: Chapter) => {
      if (!groups[chapter.subject]) groups[chapter.subject] = [];
      groups[chapter.subject].push(chapter);
    });
    return groups;
  }, [uniqueChapters]);

  useEffect(() => {
    if (selected) {
      const updatedSelected = chapters.find((c: Chapter) => c.id === selected.id || (c.translationGroupId && c.translationGroupId === selected.translationGroupId));
      if (updatedSelected) {
        setSelected(updatedSelected);
      } else {
        setSelected(null);
      }
    }
  }, [chapters]);

  if (quizMode && selected) {
    return (
      <QuizEngine 
        questions={selected.quiz_questions || []} 
        onComplete={() => setQuizMode(false)} 
        language={language} 
        userId={user.id}
        chapterId={selected.id}
      />
    );
  }

  if (selected) {
    return (
      <TopicDetailView 
        topic={selected} 
        onBack={() => setSelected(null)} 
        onTakeQuiz={() => setQuizMode(true)} 
        language={language} 
        isPremium={isPremium}
        onUpgrade={onUpgrade}
      />
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-20"
    >
      {/* Header & Tabs */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {translations[language].courses}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} • {user?.board}
            </p>
          </div>
        </div>

        {/* Subject Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableSubjects.map((s: string) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                subjectFilter === s 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
              }`}
            >
              {s === 'all' ? translations[language].allSubjects : (translations[language].subjects[s as keyof typeof translations.en.subjects] || s)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Continue Learning Section */}
      {subjectFilter === 'all' && recentlyViewed.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500">
            <Clock size={18} />
            <h3 className="text-lg font-bold text-white">
              {language === 'en' ? "Continue Learning" : "ପଢା ଜାରି ରଖନ୍ତୁ"}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentlyViewed.map((chapter) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={chapter.id}
                onClick={() => handleSelectChapter(chapter)}
                className="flex items-center gap-4 p-4 bg-slate-900/40 border border-white/5 rounded-2xl hover:border-emerald-500/30 transition-all text-left group"
              >
                <div className="w-16 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                  <img 
                    src={getYouTubeThumbnail(chapter.playlist_id)} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                    alt={chapter.title}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase truncate">
                    {getLocalizedSubject(chapter.subject, language)}
                  </p>
                  <h4 className="text-sm font-semibold text-white truncate">{chapter.title}</h4>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Content Area */}
      {uniqueChapters.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-white/5 rounded-3xl">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <BookOpen size={48} className="text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{translations[language].noContent}</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {language === 'en' 
              ? "We're currently working on adding content for this subject. Please check back soon!" 
              : "ଆମେ ବର୍ତ୍ତମାନ ଏହି ବିଷୟ ପାଇଁ ବିଷୟବସ୍ତୁ ଯୋଡିବା ପାଇଁ କାର୍ଯ୍ୟ କରୁଛୁ। ଦୟାକରି ଶୀଭ୍ର ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ!"}
          </p>
        </motion.div>
      ) : subjectFilter === 'all' ? (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {availableSubjects.filter(s => s !== 'all').map((subject: string) => {
            const subjectChapters = chapters.filter((c: Chapter) => c.subject === subject);
            const count = Array.from(new Set(subjectChapters.map((c: Chapter) => c.translationGroupId || c.id))).length;
            
            return (
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                key={subject}
                onClick={() => setSubjectFilter(subject)}
                className="group relative flex flex-col items-center justify-center p-8 glass-card rounded-[2rem] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none"></div>
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all text-emerald-500 relative z-10 shadow-lg">
                  {subject.toLowerCase().includes('math') ? <Shapes size={32} /> :
                   subject.toLowerCase().includes('sci') ? <Brain size={32} /> :
                   subject.toLowerCase().includes('eng') ? <Globe size={32} /> :
                   subject.toLowerCase().includes('odi') ? <PenTool size={32} /> :
                   <BookOpen size={32} />}
                </div>
                <h3 className="text-xl font-black text-white mb-1 tracking-tight relative z-10">
                  {translations[language].subjects[subject as keyof typeof translations.en.subjects] || subject}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest relative z-10">
                  {count} {language === 'en' ? 'Chapters' : 'ଅଧ୍ୟାୟ'}
                </p>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {uniqueChapters.map((chapter: Chapter) => (
            <motion.button 
              whileHover={{ y: -5 }}
              key={chapter.id}
              onClick={() => handleSelectChapter(chapter)}
              className="group text-left glass-card rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none"></div>
              <div className="aspect-video rounded-2xl bg-slate-800 mb-4 overflow-hidden relative flex-shrink-0 z-10 shadow-lg">
                <img 
                  src={getYouTubeThumbnail(chapter.playlist_id)} 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform"
                  alt={chapter.title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform">
                    <Play fill="currentColor" size={20} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {getLocalizedSubject(chapter.subject, language)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1 line-clamp-2 min-h-[3.5rem] tracking-tight relative z-10">{chapter.title}</h3>
              
              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/5 text-[10px] text-slate-400 font-bold uppercase tracking-wider relative z-10">
                <div className="flex items-center gap-1"><Play size={12} className="text-emerald-500" /> Video</div>
                {chapter.notes && <div className="flex items-center gap-1"><FileText size={12} className="text-blue-500" /> Notes</div>}
                {chapter.practice_questions && chapter.practice_questions.length > 0 && <div className="flex items-center gap-1"><HelpCircle size={12} className="text-purple-500" /> Practice</div>}
                {chapter.quiz_questions && chapter.quiz_questions.length > 0 && <div className="flex items-center gap-1"><CheckCircle2 size={12} className="text-orange-500" /> Quiz</div>}
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function TestEngine({ chapter, onComplete, language }: any) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const q = query(collection(firestore, 'questions'), where('chapter_id', '==', String(chapter.id)));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Question[];
        setQuestions(data);
      } catch (err) {
        console.error("Fetch Questions Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [chapter.id]);

  const handleAnswer = (ans: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = ans;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    const score = answers.reduce((acc, ans, i) => acc + (ans === questions[i].correct_answer ? 1 : 0), 0);
    try {
      const user = auth.currentUser;
      if (user) {
        await addDoc(collection(firestore, 'test_results'), {
          user_id: user.uid,
          chapter_id: String(chapter.id),
          score: score,
          total: questions.length,
          completed_at: new Date().toISOString()
        });
        
        await updateDoc(doc(firestore, 'users', user.uid), {
          points: increment(score * 10)
        });
      }
      setFinished(true);
    } catch (err) {
      console.error("Submit Test Error:", err);
      alert("Failed to submit test. Please try again.");
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-500">Loading Questions...</div>;
  if (questions.length === 0) return <div className="text-center py-20 text-slate-500">No questions available for this chapter.</div>;

  if (finished) {
    const score = answers.reduce((acc, ans, i) => acc + (ans === questions[i].correct_answer ? 1 : 0), 0);
    return (
      <div className="max-w-xl mx-auto text-center space-y-8 py-10">
        <h2 className="text-3xl font-bold text-white">{translations[language].testResults}</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-white/5">
            <div className="text-sm text-slate-500 mb-1">{translations[language].score}</div>
            <div className="text-4xl font-bold text-emerald-400">{score}/{questions.length}</div>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl border border-white/5">
            <div className="text-sm text-slate-500 mb-1">{translations[language].accuracy}</div>
            <div className="text-4xl font-bold text-blue-400">{Math.round((score/questions.length)*100)}%</div>
          </div>
        </div>
        <button 
          onClick={onComplete}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all"
        >
          {translations[language].backToDashboard}
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex justify-between items-center text-sm text-slate-500">
        <span>Question {currentIdx + 1} of {questions.length}</span>
        <div className="h-2 w-48 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
        <h3 className="text-xl font-semibold text-white mb-8">{q.question}</h3>
        <div className="space-y-4">
          {q.options.map((opt, i) => (
            <button 
              key={i}
              onClick={() => handleAnswer(opt)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                answers[currentIdx] === opt ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/20'
              }`}
            >
              <span className="inline-block w-8 h-8 rounded-lg bg-white/5 text-center leading-8 mr-4 text-xs font-bold">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button 
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(currentIdx - 1)}
          className="px-6 py-3 rounded-xl bg-white/5 text-slate-400 disabled:opacity-30"
        >
          Previous
        </button>
        {currentIdx === questions.length - 1 ? (
          <button onClick={handleSubmit} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold">
            {translations[language].submitTest}
          </button>
        ) : (
          <button onClick={() => setCurrentIdx(currentIdx + 1)} className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold">
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function AiSolverView({ language, onBack }: any) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSolve = async () => {
    if (!prompt) return;
    setLoading(true);
    const result = await solveMathDoubt(prompt, language);
    setResponse(result);
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col max-w-4xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors w-fit"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2" ref={scrollRef}>
        {response ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 text-slate-300 leading-relaxed whitespace-pre-wrap"
          >
            {response}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <MessageSquare size={32} />
            </div>
            <p>Ask any math question and I'll explain it step-by-step!</p>
          </motion.div>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={translations[language].askAi}
          className="w-full bg-slate-900 border border-white/10 rounded-3xl p-6 pr-32 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none h-32"
        />
        <button 
          onClick={handleSolve}
          disabled={loading}
          className="absolute bottom-6 right-6 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Play size={16} />}
          {translations[language].solve}
        </button>
      </motion.div>
    </motion.div>
  );
}

function GamesView({ language, onBack }: any) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', ans: 0 });
  const [input, setInput] = useState('');

  const generateProblem = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let ans = 0;
    if (op === '+') ans = a + b;
    if (op === '-') ans = a - b;
    if (op === '*') ans = a * b;
    setProblem({ a, b, op, ans });
    setInput('');
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setGameState('playing');
    generateProblem();
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameState('over');
    }
  }, [gameState, timeLeft]);

  const checkAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(input) === problem.ans) {
      setScore(score + 10);
      generateProblem();
    } else {
      setInput('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto text-center"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].quickCalc}</h2>
        <p className="text-slate-500">{translations[language].gameInstructions}</p>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-[40px] p-12 shadow-2xl relative overflow-hidden">
        {gameState === 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Brain size={48} className="text-emerald-400" />
            </div>
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl hover:bg-emerald-500 transition-all">
              {translations[language].start}
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={problem.a + problem.b}
            className="space-y-10"
          >
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-500 uppercase tracking-widest">Score: <span className="text-emerald-400 font-bold">{score}</span></div>
              <div className="text-sm text-slate-500 uppercase tracking-widest">Time: <span className="text-blue-400 font-bold">{timeLeft}s</span></div>
            </div>
            <div className="text-6xl font-bold text-white py-10">
              {problem.a} {problem.op} {problem.b} = ?
            </div>
            <form onSubmit={checkAnswer}>
              <input 
                autoFocus
                type="number" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-4xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </form>
          </motion.div>
        )}

        {gameState === 'over' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <h3 className="text-4xl font-bold text-red-400">{translations[language].gameOver}</h3>
            <div className="text-xl text-slate-300">Final Score: <span className="text-emerald-400 font-bold">{score}</span></div>
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl hover:bg-emerald-500 transition-all">
              {translations[language].playAgain}
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function LeaderboardView({ leaderboard, language, onBack }: any) {
  const [activeLeague, setActiveLeague] = useState<League>('Bronze');
  const leagues: League[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

  // Filter leaderboard by league (simulated for now, usually done on backend)
  const filteredLeaderboard = leaderboard.filter((s: any) => {
    // In a real app, this would be based on student.stats.league
    // For demo, we'll just distribute them
    const idx = leaderboard.indexOf(s);
    if (idx < 10) return activeLeague === 'Platinum';
    if (idx < 25) return activeLeague === 'Gold';
    if (idx < 50) return activeLeague === 'Silver';
    return activeLeague === 'Bronze';
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div variants={itemVariants} className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].weeklyLeaderboard}</h2>
        <p className="text-slate-500">Celebrate effort and consistency! Resets every Sunday.</p>
      </motion.div>

      {/* League Tabs */}
      <motion.div variants={itemVariants} className="flex justify-center gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit mx-auto">
        {leagues.map((league) => (
          <button
            key={league}
            onClick={() => setActiveLeague(league)}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeLeague === league 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {translations[language][league.toLowerCase()]}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="bg-slate-900/50 border border-white/5 rounded-[40px] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Rank</th>
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Student</th>
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold">Consistency</th>
              <th className="px-8 py-6 text-xs uppercase tracking-widest text-slate-500 font-bold text-right">{translations[language].effortPoints}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaderboard.length > 0 ? (
              filteredLeaderboard.map((student: any, i: number) => (
                <motion.tr 
                  variants={itemVariants}
                  key={i} 
                  className="border-b border-white/5 hover:bg-white/5 transition-all"
                >
                  <td className="px-8 py-6">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      leaderboard.indexOf(student) === 0 ? 'bg-yellow-500 text-slate-900' : 
                      leaderboard.indexOf(student) === 1 ? 'bg-slate-300 text-slate-900' : 
                      leaderboard.indexOf(student) === 2 ? 'bg-orange-500 text-slate-900' : 'text-slate-500'
                    }`}>
                      {leaderboard.indexOf(student) + 1}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                        {student.avatar ? (
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold">{student.name[0]}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white flex items-center gap-2">
                          {student.name}
                          {student.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-400 text-[10px] font-black bg-orange-500/10 px-1.5 py-0.5 rounded-full border border-orange-500/20">
                              <Flame size={10} fill="currentColor" />
                              {student.streak}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{translations[language].classes[student.class] || student.class}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((day) => (
                        <div key={day} className={`w-2 h-2 rounded-full ${day <= (i % 5 + 1) ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right font-mono text-emerald-400 font-bold">{student.points}</td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-500">
                  No students in this league yet. Keep practicing to move up!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
      
      <motion.div variants={itemVariants} className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-center">
        <p className="text-emerald-400 text-sm font-medium">
          🌟 You are in the top 15% of effort makers this week! Keep it up!
        </p>
      </motion.div>
    </motion.div>
  );
}

function TextbooksView({ user, textbooks, language, onBack }: any) {
  const [subjectFilter, setSubjectFilter] = useState('all');

  const boardKey = React.useMemo(() => {
    if (!user?.board) return 'odisha';
    const b = user.board.toLowerCase();
    if (b.includes('saraswati')) return 'saraswati';
    if (b.includes('cbse')) return 'cbse';
    if (b.includes('icse')) return 'icse';
    if (b.includes('odia')) return 'odisha';
    return 'odisha';
  }, [user?.board]);

  const filteredTextbooks = React.useMemo(() => {
    return textbooks.filter((book: Textbook) => {
      const matchesClass = !user?.class || book.class.toLowerCase() === user.class.toLowerCase();
      const matchesBoard = !user?.board || book.board.toLowerCase() === boardKey.toLowerCase();
      const matchesSubject = subjectFilter === 'all' || book.subject === subjectFilter;
      return matchesClass && matchesBoard && matchesSubject;
    });
  }, [textbooks, user?.class, user?.board, boardKey, subjectFilter]);

  const availableSubjects = React.useMemo(() => {
    const subjects = new Set<string>(textbooks.filter(b => b.class === user?.class && b.board === boardKey).map(b => b.subject));
    return ['all', ...Array.from(subjects)];
  }, [textbooks, user?.class, boardKey]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-20"
    >
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800/50 border border-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {language === 'en' ? 'Textbooks' : 'ପାଠ୍ୟପୁସ୍ତକ'}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} • {user?.board}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableSubjects.map((s: string) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                subjectFilter === s 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
              }`}
            >
              {s === 'all' ? translations[language].allSubjects : (translations[language].subjects[s as keyof typeof translations.en.subjects] || s)}
            </button>
          ))}
        </div>
      </motion.div>

      {filteredTextbooks.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-white/5 rounded-3xl">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Book size={48} className="text-slate-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {language === 'en' ? 'No Textbooks Found' : 'କୌଣସି ପାଠ୍ୟପୁସ୍ତକ ମିଳିଲା ନାହିଁ'}
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {language === 'en' 
              ? "We're currently uploading textbooks for your class and board. Please check back soon!" 
              : "ଆମେ ବର୍ତ୍ତମାନ ଆପଣଙ୍କ ଶ୍ରେଣୀ ଏବଂ ବୋର୍ଡ ପାଇଁ ପାଠ୍ୟପୁସ୍ତକ ଅପଲୋଡ୍ କରୁଛୁ। ଦୟାକରି ଶୀଘ୍ର ପୁଣି ଯାଞ୍ଚ କରନ୍ତୁ!"}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTextbooks.map((book: Textbook) => (
            <motion.div whileHover={{ y: -5 }} key={book.id} className="group bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col">
              <div className="aspect-[3/4] bg-slate-800 relative overflow-hidden">
                {book.thumbnail_url ? (
                  <img 
                    src={book.thumbnail_url} 
                    alt={book.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Book size={64} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 backdrop-blur-md">
                    {translations[language].subjects[book.subject as keyof typeof translations.en.subjects] || book.subject}
                  </span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-white mb-4 line-clamp-2 flex-1">{book.title}</h3>
                <a 
                  href={book.download_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                >
                  <Download size={18} />
                  {language === 'en' ? 'Download PDF' : 'PDF ଡାଉନଲୋଡ୍'}
                </a>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(
                    language === 'en' 
                      ? `Check out this textbook: ${book.title}\nDownload here: ${book.download_url}` 
                      : `ଏହି ପାଠ୍ୟପୁସ୍ତକଟି ଦେଖନ୍ତୁ: ${book.title}\nଏଠାରୁ ଡାଉନଲୋଡ୍ କରନ୍ତୁ: ${book.download_url}`
                  )}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full py-3 mt-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-emerald-500/20"
                >
                  <MessageCircle size={18} />
                  {language === 'en' ? 'Share on WhatsApp' : 'WhatsApp ରେ ସେୟାର କରନ୍ତୁ'}
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function TopicDetailView({ 
  topic, 
  onBack, 
  onTakeQuiz, 
  language,
  isPremium,
  onUpgrade
}: { 
  topic: Chapter, 
  onBack: () => void, 
  onTakeQuiz: () => void, 
  language: 'or' | 'en',
  isPremium: boolean,
  onUpgrade: () => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'video' | 'notes' | 'practice'>('video');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Topics</span>
      </motion.button>

      <motion.div variants={itemVariants} className="glass-card neon-border rounded-[2.5rem] overflow-hidden mb-8 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
        <div className="p-6 md:p-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full tracking-widest border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  {getLocalizedSubject(topic.subject, language)}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{topic.title}</h1>
            </div>
            
            {topic.quiz_questions?.length > 0 && (
              <button 
                onClick={onTakeQuiz}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] whitespace-nowrap border border-emerald-500/50"
              >
                <Trophy size={20} />
                <span>Take Basic Quiz</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 bg-slate-900/50 p-2 rounded-2xl w-full md:w-fit mb-8 overflow-x-auto scrollbar-hide border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setActiveSubTab('video')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'video' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Play size={16} /> {translations[language].video}
            </button>
            {topic.notes && (
              <button 
                onClick={() => setActiveSubTab('notes')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'notes' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={16} /> {translations[language].notes}
              </button>
            )}
            {topic.practice_questions?.length > 0 && (
              <button 
                onClick={() => setActiveSubTab('practice')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'practice' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <HelpCircle size={16} /> {translations[language].practice}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeSubTab === 'video' && (
              <motion.div 
                key="video"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center"
              >
                {topic.playlist_id ? (
                  <iframe 
                    src={getYouTubeEmbedUrl(topic.playlist_id)}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
                      <Play size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Video content is currently being updated.</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeSubTab === 'notes' && (
              <motion.div 
                key="notes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-800/30 rounded-2xl p-8 prose prose-invert max-w-none border border-white/5"
              >
                <div className="markdown-body">
                  <Markdown>{topic.notes}</Markdown>
                </div>
              </motion.div>
            )}

            {activeSubTab === 'practice' && (
              <motion.div 
                key="practice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {topic.practice_questions?.map((q, idx) => (
                  <PracticeQuestion 
                    key={idx} 
                    question={q} 
                    isPremium={isPremium} 
                    language={language} 
                    onUpgrade={onUpgrade}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuizEngine({ questions, onComplete, language, userId, chapterId }: { questions: any[], onComplete: () => void, language: string, userId: string, chapterId: string }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    setCurrentIdx(prev => prev + 1);
    setShowHint(false);
  };

  const handlePrev = () => {
    setCurrentIdx(prev => prev - 1);
    setShowHint(false);
  };

  const score = answers.reduce((acc, ansIdx, i) => {
    const selectedOption = questions[i].options[ansIdx];
    return acc + (selectedOption === questions[i].correct_answer ? 1 : 0);
  }, 0);

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save quiz result to Firestore
      await addDoc(collection(firestore, 'quiz_results'), {
        userId,
        chapterId,
        score,
        total: questions.length,
        timestamp: serverTimestamp(),
        accuracy: Math.round((score / questions.length) * 100)
      });

      // Update user points and accuracy
      const userRef = doc(firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentAccuracy = userData.stats?.accuracy || 0;
        const newAccuracy = Math.round((currentAccuracy + (score / questions.length) * 100) / 2);
        
        await updateDoc(userRef, {
          points: increment(score * 10),
          'stats.accuracy': newAccuracy,
          'stats.experience': increment(score * 5),
          completed_chapters: Array.from(new Set([...(userData.completed_chapters || []), chapterId]))
        });
      }
      
      setFinished(true);
    } catch (err) {
      console.error("Quiz Save Error:", err);
      setFinished(true); // Still show finished screen even if save fails
    } finally {
      setSaving(false);
    }
  };

  if (finished) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-12"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20"
        >
          <Trophy size={48} className="text-white" />
        </motion.div>
        <h2 className="text-4xl font-bold text-white mb-4">Quiz Completed!</h2>
        <p className="text-xl text-slate-400 mb-8">You scored {score} out of {questions.length}</p>
        
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-500">{score}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">Correct</p>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-2xl font-bold text-red-500">{questions.length - score}</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">Wrong</p>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-500">{Math.round((score / questions.length) * 100)}%</p>
              <p className="text-[10px] font-bold uppercase text-slate-500">Accuracy</p>
            </div>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-4 rounded-2xl font-bold transition-all"
        >
          Back to Topic
        </motion.button>
      </motion.div>
    );
  }

  const q = questions[currentIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onComplete}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Quit Quiz</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
            {currentIdx + 1}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {currentIdx + 1} of {questions.length}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-6">
        <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">{q.question}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {q.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`flex items-center gap-4 p-6 rounded-2xl border transition-all text-left ${answers[currentIdx] === idx ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${answers[currentIdx] === idx ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="text-lg font-medium">{opt}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between gap-4">
          <button 
            onClick={handlePrev}
            disabled={currentIdx === 0}
            className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Previous
          </button>
          {currentIdx === questions.length - 1 ? (
            <button 
              onClick={handleFinish}
              disabled={answers[currentIdx] === undefined || saving}
              className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Finish Quiz'}
            </button>
          ) : (
            <button 
              onClick={handleNext}
              disabled={answers[currentIdx] === undefined}
              className="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
            >
              Next Question
            </button>
          )}
        </div>

        {q.hint && (
          <div className="mt-6 border-t border-white/5 pt-6">
            {!showHint ? (
              <button 
                onClick={() => setShowHint(true)}
                className="text-amber-500 hover:text-amber-400 text-sm font-bold flex items-center gap-2"
              >
                <Lightbulb size={16} /> Show Hint
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <Lightbulb className="text-amber-500 shrink-0" size={20} />
                <p className="text-amber-200/80 text-sm">{q.hint}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MonthlyTestsView({ tests, submissions, language, user, onBack }: any) {
  const [selectedTest, setSelectedTest] = useState<MonthlyTest | null>(null);
  const [takingTest, setTakingTest] = useState(false);

  useEffect(() => {
    if (selectedTest) {
      const updatedSelected = tests.find((t: MonthlyTest) => t.id === selectedTest.id || (t.translationGroupId && t.translationGroupId === selectedTest.translationGroupId));
      if (updatedSelected) {
        setSelectedTest(updatedSelected);
      } else {
        setSelectedTest(null);
        setTakingTest(false);
      }
    }
  }, [tests]);

  const getSubmission = (test: MonthlyTest) => {
    const groupTestIds = tests
      .filter((t: MonthlyTest) => t.id === test.id || (t.translationGroupId && t.translationGroupId === test.translationGroupId))
      .map((t: MonthlyTest) => t.id);
    return submissions.find((s: any) => groupTestIds.includes(s.testId));
  };

  if (takingTest && selectedTest) {
    return (
      <MonthlyTestEngine 
        test={selectedTest} 
        onComplete={() => {
          setTakingTest(false);
          setSelectedTest(null);
        }} 
        onBack={() => setTakingTest(false)}
        language={language} 
        user={user}
      />
    );
  }

  const filteredTests = tests; // Show all published tests to all students for consistency

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{translations[language].monthlyTests}</h1>
          <p className="text-slate-400">Participate in monthly assessments for {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} and track your progress.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTests.map((test: MonthlyTest) => {
          const submission = getSubmission(test);
          const resultsPublished = test.results_published;

          return (
            <motion.div whileHover={{ y: -5 }} key={test.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 hover:border-emerald-500/20 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Calendar size={32} />
                </div>
                {submission ? (
                  <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                    Completed
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-wider">
                    Available
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{getLocalizedSubject(test.subject, language)} - {test.month} {test.year}</h3>
              <p className="text-slate-400 mb-8">Total Questions: {test.questions.length}</p>

              <div className="flex flex-col gap-3">
                {submission ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div className="bg-slate-800/50 rounded-2xl p-4 text-center">
                        <p className="text-xl font-bold text-white">{submission.score}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Score</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-2xl p-4 text-center">
                        <p className="text-xl font-bold text-emerald-500">
                          {resultsPublished ? `#${submission.rank || 'N/A'}` : 'Pending'}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Rank</p>
                      </div>
                    </div>
                    {resultsPublished && (
                      <div className="w-full py-4 rounded-2xl bg-slate-800 text-white font-bold text-center flex items-center justify-center gap-2">
                        <Trophy size={18} /> Results Published
                      </div>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setSelectedTest(test);
                      setTakingTest(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Play size={18} /> {translations[language].takeMonthlyTest}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredTests.length === 0 && (
          <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
            <Clock size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Tests Scheduled</h3>
            <p className="text-slate-500">Check back later for upcoming monthly assessments for your class and subjects.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function MonthlyTestEngine({ test, onComplete, onBack, language, user }: any) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const score = answers.reduce((acc, ansIdx, i) => {
        const selectedOption = test.questions[i].options[ansIdx];
        return acc + (selectedOption === test.questions[i].correct_answer ? 1 : 0);
      }, 0);
      
      await addDoc(collection(firestore, 'monthly_test_submissions'), {
        testId: test.id,
        userId: user.uid,
        userName: user.displayName || 'Student',
        class: user.class,
        answers,
        score,
        totalQuestions: test.questions.length,
        submittedAt: serverTimestamp(),
        rank: null
      });

      onComplete();
    } catch (err) {
      console.error("Submit Test Error:", err);
      alert("Failed to submit test. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const q = test.questions[currentIdx];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="max-w-3xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Tests</span>
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xl">
            {currentIdx + 1}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {currentIdx + 1} of {test.questions.length}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 mb-6">
        <h2 className="text-2xl font-bold text-white mb-8 leading-relaxed">{q.question}</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {q.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`flex items-center gap-4 p-6 rounded-2xl border transition-all text-left ${answers[currentIdx] === idx ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${answers[currentIdx] === idx ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="text-lg font-medium">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button 
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(prev => prev - 1)}
          className="flex items-center gap-2 text-slate-500 hover:text-white disabled:opacity-0 transition-colors"
        >
          <ArrowLeft size={20} /> Previous
        </button>
        
        {currentIdx === test.questions.length - 1 ? (
          <button 
            disabled={answers[currentIdx] === undefined || submitting}
            onClick={handleSubmit}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <><Loader2 size={20} className="animate-spin" /> Submitting...</> : 'Submit Final Test'}
          </button>
        ) : (
          <button 
            disabled={answers[currentIdx] === undefined}
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
          >
            Next Question <ArrowRight size={20} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function SkillGameView({ chapter, onBack }: { chapter?: any, onBack: () => void }) {
  const title = chapter?.title || "Skill Game";
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans absolute inset-0 z-[100] overflow-y-auto"
    >
      {/* Header */}
      <header className="bg-[#1e5b99] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-md">
            <BookOpen className="text-[#1e5b99]" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">UtkalSkillCentre</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="font-medium hover:text-blue-200 transition-colors">Back to Chapter</button>
          <button className="p-2 border-2 border-white/30 rounded hover:bg-white/10 transition-colors"><Menu size={20} /></button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="px-6 py-3 border-b border-slate-200 text-sm text-[#1e5b99] font-medium bg-white">
        Odisha Board <span className="mx-2 text-slate-400">›</span> Mathematics <span className="mx-2 text-slate-400">›</span> {title}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-slate-800"
        >
          {title} - Mind Game
        </motion.h1>

        {/* Game Canvas Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative aspect-[16/9] bg-sky-200 rounded-xl overflow-hidden border border-slate-300 shadow-md flex flex-col items-center justify-center"
        >
          {/* Background elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-green-400 opacity-80"></div>
          
          {/* Top Bar */}
          <div className="absolute top-4 left-4 flex bg-slate-800/80 text-white rounded-full overflow-hidden backdrop-blur-sm shadow-lg">
            <div className="px-4 py-2 flex items-center gap-2 border-r border-white/20">
              <Clock size={16} /> Time Left
            </div>
            <div className="px-4 py-2 font-bold text-xl bg-slate-900/50">4s</div>
          </div>
          
          <div className="absolute top-4 right-4 bg-slate-800/80 text-white px-6 py-2 rounded-full font-bold text-xl backdrop-blur-sm shadow-lg">
            Score: <span className="text-orange-400 ml-2">40</span>
          </div>

          {/* Chalkboard */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="z-10 bg-emerald-800 border-8 border-amber-700 rounded-lg p-8 shadow-2xl mb-12 relative"
          >
            <span className="text-6xl font-bold text-white font-mono tracking-widest">8 + 3 = ?</span>
          </motion.div>

          {/* Options */}
          <div className="z-10 flex gap-4 absolute bottom-8">
            {[10, 12, 11, 9].map((num, i) => (
              <motion.button 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-20 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded-xl border-b-4 border-orange-700 text-white text-3xl font-bold shadow-lg transition-all"
              >
                {num}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm"
        >
          <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Key Points</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 font-medium">
            <li>Subtraction means taking away.</li>
            <li>Start from the ones column.</li>
            <li>Borrow if needed.</li>
          </ul>
        </motion.section>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
        >
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#1e5b99] text-white p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-md hover:bg-blue-800 transition-colors"
          >
            <Star className="text-yellow-400" fill="currentColor" /> Mental Math
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-200 text-slate-700 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-sm hover:bg-slate-300 transition-colors"
          >
            <Hash className="text-slate-500" /> Number Puzzle
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-200 text-slate-700 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-sm hover:bg-slate-300 transition-colors"
          >
            <Shapes className="text-slate-500" /> Math Patterns
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

