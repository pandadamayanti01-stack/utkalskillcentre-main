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
  PenTool
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  class: number;
  board: string;
  preferred_language: string;
  points: number;
  role: string;
  shareCount?: number;
  statusShared?: boolean;
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

interface Chapter {
  id: number;
  class: number;
  board: string;
  language: string;
  subject: string;
  title: string;
  concept_id: string;
  playlist_id: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
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

const Logo = ({ className = "h-12" }: { className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <img 
      src="/logo_utkal.png" 
      alt="Utkal Skill Centre" 
      className="h-full w-auto object-contain" 
    />
  </div>
);

const BigsanBranding = ({ className = "" }: { className?: string }) => {
  const [lang] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'en');
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        {translations[lang]?.associate || 'Associate Partner'}
      </p>
      <img 
        src="/logo_bigsan.png" 
        alt="Bigsan Group" 
        className="h-6 w-auto opacity-80 grayscale hover:grayscale-0 transition-all" 
      />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<Student | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, _setLanguage] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'en');
  const languageRef = useRef(language);
  const setLanguage = (lang: 'en' | 'or') => {
    languageRef.current = lang;
    _setLanguage(lang);
    localStorage.setItem('lang', lang);
  };
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
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
    class: '' as any, 
    board: '', 
    preferred_language: 'or' 
  });
  const regDataRef = useRef(regData);
  const setRegData = (data: any) => {
    regDataRef.current = data;
    _setRegData(data);
  };

  // Data State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);

  const sharedAppUrl = window.location.origin;

  // --- Firestore Error Handling ---
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
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
        // Skip logging for other errors, as this is simply a connection test.
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
            // Fetch initial data if not already fetched or if class/board changed
            fetchInitialData(updatedUser);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        try {
          // Initial sync/creation
          const userDocSnap = await getDoc(userDocRef);
          const isAdmin = firebaseUser.email === 'pandadamayanti01@gmail.com' || firebaseUser.phoneNumber === '+919337956168' || firebaseUser.phoneNumber === '9337956168';
          
          const role = isAdmin ? 'admin' : (userDocSnap.exists() ? userDocSnap.data().role : 'student');
          
          const userData: any = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || regDataRef.current.name || (userDocSnap.exists() ? userDocSnap.data().name : 'Student'),
            email: firebaseUser.email || regDataRef.current.email || (userDocSnap.exists() ? userDocSnap.data().email : ''),
            class: regDataRef.current.class || (userDocSnap.exists() ? userDocSnap.data().class : null),
            board: regDataRef.current.board || (userDocSnap.exists() ? userDocSnap.data().board : ''),
            preferred_language: languageRef.current || (userDocSnap.exists() ? userDocSnap.data().preferred_language : 'or'),
            role: role,
            points: userDocSnap.exists() ? userDocSnap.data().points : 0,
            shareCount: userDocSnap.exists() ? (userDocSnap.data().shareCount || 0) : 0,
            statusShared: userDocSnap.exists() ? (userDocSnap.data().statusShared || false) : false,
            updatedAt: serverTimestamp()
          };

          if (!userDocSnap.exists()) {
            userData.createdAt = serverTimestamp();
          }

          await setDoc(userDocRef, userData, { merge: true });
          await setDoc(doc(firestore, 'public_profiles', firebaseUser.uid), {
            name: userData.name,
            points: userData.points,
            class: userData.class
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
    // Redundant onSnapshot listener removed
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

  const fetchInitialData = async (student: Student) => {
    try {
      let chaptersQuery: any = null;
      
      if (student.role === 'admin') {
        chaptersQuery = query(collection(firestore, 'chapters'));
      } else if (student.class) {
        if (student.board && student.preferred_language) {
          chaptersQuery = query(
            collection(firestore, 'chapters'), 
            where('class', '==', student.class),
            where('board', '==', student.board),
            where('language', '==', student.preferred_language)
          );
        } else {
          chaptersQuery = query(
            collection(firestore, 'chapters'), 
            where('class', '==', student.class)
          );
        }
      } else {
        console.warn("Skipping chapters fetch: student class is missing");
      }

      const leaderboardQuery = query(collection(firestore, 'public_profiles'), orderBy('points', 'desc'), limit(10));

      const promises: Promise<any>[] = [
        getDocs(leaderboardQuery)
      ];

      if (chaptersQuery) {
        promises.push(getDocs(chaptersQuery));
      }

      const results = await Promise.all(promises);
      
      const leaderboardData = results[0].docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setLeaderboard(leaderboardData);
      
      if (chaptersQuery && results[1]) {
        const chaptersData = results[1].docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setChapters(chaptersData);
      }
    } catch (err) {
      console.error("Initial Data Fetch Error:", err);
    }
  };

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
    console.log("Recaptcha container found, initializing...");

    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {
        console.warn("Recaptcha clear error:", e);
      }
      (window as any).recaptchaVerifier = null;
    }
    
    // Ensure the container is empty before creating a new verifier
    container.innerHTML = '';
    
    try {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log("reCAPTCHA solved");
        }
      });
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
          await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
          return; // Success!
        } catch (createError: any) {
          console.error("Admin Registration Error:", createError);
          if (createError.code === 'auth/email-already-in-use') {
            setAdminLoginError("This email is already registered (likely via Google Sign-In), but the password doesn't match.");
            setShowResetPasswordButton(true);
          } else {
            setAdminLoginError("Registration failed: " + createError.message);
          }
        }
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
    console.log("Starting Phone Auth process...");
    try {
      // Disable app verification for testing to bypass reCAPTCHA for test numbers
      auth.settings.appVerificationDisabledForTesting = true;
      
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
      await confirmationResult.confirm(otp);
    } catch (error) {
      console.error("OTP Error:", error);
      alert("Invalid OTP. Please try again.");
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

  const handleSubscribe = async (amount: number = 199) => {
    if (!user) return;

    if (amount === 999) {
      if ((user.shareCount || 0) < 5) {
        alert(language === 'en' ? "Please complete the share requirements to unlock this offer." : "ଏହି ଅଫର୍ ଅନଲକ୍ କରିବାକୁ ଦୟାକରି ସେୟାର୍ ସର୍ତ୍ତଗୁଡିକ ପୂରଣ କରନ୍ତୁ |");
        return;
      }
    }
    
    // FORCE the new key to prevent environment variable mismatch
    const razorpayKey = "rzp_live_SSN1ujW6x6SBco"; // Hardcoded for deployment
    if (!razorpayKey) {
      alert("Razorpay Key ID is missing. Please set VITE_RAZORPAY_KEY in your environment variables.");
      console.error("VITE_RAZORPAY_KEY is not defined");
      return;
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
              const oneYearFromNow = new Date();
              oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
              
              await setDoc(doc(firestore, 'subscriptions', user.id), {
                active: true,
                plan: 'premium',
                expires_at: oneYearFromNow.toISOString()
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md z-10"
        >
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="absolute top-6 right-6">
              <button 
                onClick={() => {
                  const newLang = language === 'en' ? 'or' : 'en';
                  setLanguage(newLang);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-white hover:bg-white/10 transition-all"
              >
                <Globe size={12} />
                {language === 'en' ? 'ଓଡ଼ିଆ' : 'English'}
              </button>
            </div>

            <div className="text-center mb-8 mt-2">
              <Logo className="h-12 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-1.5">{translations[language].welcome}</h1>
              <p className="text-slate-400 text-sm">{translations[language].tagline}</p>
            </div>

            {authStep === 'login' ? (
              <div className="space-y-3">
                {isAdminLogin ? (
                  <div className="space-y-3">
                    <input 
                      type="email" 
                      placeholder="Admin Email"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                    <input 
                      type="password" 
                      placeholder="Password"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <button 
                      onClick={handleAdminEmailLogin}
                      disabled={isSendingOtp}
                      className={`w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 ${isSendingOtp ? 'opacity-70 cursor-not-allowed' : ''}`}
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

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-slate-900 px-2 text-slate-500">Or Admin Phone Login</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex items-center justify-center px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium">+91</div>
                      <input 
                        type="tel" 
                        placeholder="Admin Phone"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handlePhoneLogin}
                      disabled={isSendingOtp}
                      className={`w-full py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all shadow-lg flex items-center justify-center gap-2 ${isSendingOtp ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {language === 'en' ? 'Login with Phone' : 'ଫୋନ୍ ସହିତ ଲଗଇନ୍'}
                    </button>
                    {adminLoginError && (
                      <div className="text-red-400 text-xs text-center mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        {adminLoginError}
                      </div>
                    )}
                    {showResetPasswordButton && (
                      <button 
                        onClick={handleSendPasswordReset}
                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 mt-2"
                      >
                        Send Password Reset Email
                      </button>
                    )}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-slate-900 px-2 text-slate-500">Or continue with</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3">
                      <select 
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        value={regData.class}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRegData({ ...regData, class: val === "" ? "" : parseInt(val) });
                        }}
                      >
                        <option value="">{translations[language].selectClass} *</option>
                        {[3,4,5,6,7,8,9,10].map(c => (
                          <option key={c} value={c}>Class {c}</option>
                        ))}
                      </select>
                      <select 
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                        value={regData.board}
                        onChange={(e) => setRegData({ ...regData, board: e.target.value })}
                      >
                        <option value="">{translations[language].selectBoard} *</option>
                        <option value="Odisha Board">{translations[language].boards.odisha}</option>
                        <option value="Saraswati Sishu Mandir">{translations[language].boards.saraswati}</option>
                        <option value="CBSE">{translations[language].boards.cbse}</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="flex items-center justify-center px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium">+91</div>
                        <input 
                          type="tel" 
                          placeholder={translations[language].enterPhone}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                      </div>
                      <button 
                        onClick={handlePhoneLogin}
                        disabled={isSendingOtp}
                        className={`w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 ${isSendingOtp ? 'opacity-70 cursor-not-allowed' : ''}`}
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

                <p className="text-[10px] text-slate-500 text-center mt-2">
                  {!isAdminLogin && (language === 'en' ? '* All fields are mandatory' : '* ସମସ୍ତ ତଥ୍ୟ ଦେବା ଅନିର୍ବାଯ୍ୟ')}
                </p>
                
                <div className="text-center mt-2">
                  <button 
                    onClick={() => setIsAdminLogin(!isAdminLogin)} 
                    className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {isAdminLogin ? (language === 'en' ? "Student Login" : "ଛାତ୍ର ଲଗଇନ୍") : (language === 'en' ? "Admin Login" : "ଆଡମିନ୍ ଲଗଇନ୍")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">{translations[language].enterOtp} to {phoneNumber}</p>
                  <button onClick={() => setAuthStep('login')} className="text-emerald-500 text-xs hover:underline">Change Number</button>
                </div>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="------"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl tracking-[1em] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button 
                  onClick={verifyOtp}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                >
                  {translations[language].verifyOtp}
                </button>

                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-slate-500 text-xs">
                      {language === 'en' ? `Resend OTP in ${resendTimer}s` : `${resendTimer} ସେକେଣ୍ଡ ପରେ ପୁଣି ପଠାନ୍ତୁ`}
                    </p>
                  ) : (
                    <button 
                      onClick={startPhoneAuth}
                      disabled={isSendingOtp}
                      className={`text-emerald-500 text-xs hover:underline font-medium ${isSendingOtp ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSendingOtp ? (language === 'en' ? 'Sending...' : 'ପଠାଯାଉଛି...') : translations[language].resendOtp}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div id="recaptcha-container" className="flex justify-center my-4 min-h-[80px]"></div>
          <BigsanBranding className="mt-12" />
        </motion.div>

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
    );
  }

  if (isAdminView && user?.role === 'admin') {
    return <AdminDashboard onExit={() => setIsAdminView(false)} />;
  }

  if (activeTab === 'lesson_preview') {
    return <LessonView onBack={() => setActiveTab('dashboard')} onPlayGame={() => setActiveTab('games')} onTakeTest={() => setActiveTab('dashboard')} language={language} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/50 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-300 ease-in-out
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
                <SidebarItem icon={<MessageSquare size={20}/>} label={translations[language].aiSolver} active={activeTab === 'ai'} onClick={() => { setActiveTab('ai'); setSidebarOpen(false); }} />
                <SidebarItem icon={<Trophy size={20}/>} label={translations[language].leaderboard} active={activeTab === 'leaderboard'} onClick={() => { setActiveTab('leaderboard'); setSidebarOpen(false); }} />
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
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400"><Menu /></button>
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold text-white">
                {language === 'en' ? `Namaskar, ${user.name}! 🙏` : `ନମସ୍କାର, ${user.name}! 🙏`}
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
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                {user.name[0]}
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
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView user={user} leaderboard={leaderboard} language={language} isPremium={isPremium} onUpgrade={() => setActiveTab('plans')} />}
            {activeTab === 'courses' && <CoursesView chapters={chapters} language={language} isPremium={isPremium} onUpgrade={() => setActiveTab('plans')} />}
            {activeTab === 'ai' && (
              isPremium ? <AiSolverView language={language} /> : <SubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} />
            )}
            {activeTab === 'leaderboard' && <LeaderboardView leaderboard={leaderboard} language={language} />}
            {activeTab === 'profile' && <ProfileView user={user} />}
            {activeTab === 'plans' && <SubscriptionGuard onSubscribe={handleSubscribe} language={language} isPremium={isPremium} user={user} onShare={handleShare} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function ProfileView({ user }: any) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        name,
        email
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-xl bg-slate-900/50 border border-white/5 rounded-3xl p-8 space-y-6"
    >
      <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Email Address</label>
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
        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-all"
        >
          {loading ? 'Saving...' : 'Profile'}
        </button>
      </div>
    </motion.div>
  );
}

// --- Sub-Views ---

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
        active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function DashboardView({ user, leaderboard, language, isPremium, onUpgrade }: any) {
  const userRank = leaderboard.findIndex((s: any) => s.name === user.name) + 1 || '-';
  const stats = user.stats || {
    streak: 5,
    level: 3,
    experience: 65,
    accuracy: 85,
    league: 'Bronze',
    badges: ['first_quiz', 'streak_3'],
    weeklyPoints: 120
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Top Section: Level & League */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-600/20 to-blue-600/20 border border-emerald-500/20 rounded-[2.5rem] p-8 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">{translations[language].level} {stats.level}</h3>
              <p className="text-emerald-400 text-sm font-medium">Next Level in {100 - stats.experience} XP</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest">
              {translations[language][stats.league.toLowerCase()]}
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-black/20 rounded-full overflow-hidden p-1 border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.experience}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full shadow-lg shadow-emerald-500/20"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
              <span>Level {stats.level}</span>
              <span>Level {stats.level + 1}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
            <Brain size={32} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.streak} {translations[language].streak}</div>
          <p className="text-slate-500 text-sm">You're on fire! Keep it up!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Trophy className="text-yellow-500" />} label={translations[language].rank} value={`#${userRank}`} subValue="Top 15%" />
        <StatCard icon={<BarChart3 className="text-emerald-500" />} label={translations[language].effortPoints} value={stats.weeklyPoints} subValue="This Week" />
        <StatCard icon={<CheckCircle2 className="text-blue-500" />} label={translations[language].accuracy} value={`${stats.accuracy}%`} subValue="Avg. Score" />
        <StatCard icon={<Globe className="text-purple-500" />} label={translations[language].badges} value={stats.badges.length} subValue="Earned" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{translations[language].myProgress}</h3>
          </div>
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8">
            <div className="space-y-6">
              <TopicProgress label="Algebraic Expressions" progress={45} color="bg-red-500" />
              <TopicProgress label="Linear Equations" progress={60} color="bg-yellow-500" />
              <TopicProgress label="Geometry Basics" progress={80} color="bg-emerald-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">{translations[language].badges}</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {['🌟', '🔥', '📚', '🎯', '🧠'].map((emoji, i) => (
                <div key={i} className="flex-shrink-0 w-20 h-20 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center text-3xl grayscale hover:grayscale-0 transition-all cursor-help">
                  {emoji}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">{translations[language].weeklyLeaderboard}</h3>
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 overflow-hidden">
            <div className="space-y-4">
              {leaderboard.slice(0, 5).map((student: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 text-xs font-bold ${i < 3 ? 'text-yellow-500' : 'text-slate-500'}`}>{i + 1}</span>
                    <span className="text-sm text-slate-300">{student.name}</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">{student.points}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => onUpgrade()} 
              className="w-full mt-6 py-3 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
            >
              View Full Leaderboard
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, subValue }: any) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-all">{icon}</div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-white">{value}</div>
        {subValue && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{subValue}</span>}
      </div>
    </div>
  );
}

function TopicProgress({ label, progress, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-500">{progress}%</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

function SubscriptionGuard({ onSubscribe, language, isPremium, user, onShare }: any) {
  const p = translations[language].pricing;
  return (
    <div className="max-w-6xl mx-auto py-8">
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
              <div className="text-4xl font-bold text-white">{p.ai.monthly}</div>
              <div className="text-emerald-400 font-bold">{p.ai.yearly} (Save 70%)</div>
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
                onClick={() => onSubscribe(199)}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20"
              >
                Subscribe Monthly (₹199)
              </button>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Unlock Yearly Offer (₹999)</span>
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
                  onClick={() => onSubscribe(999)}
                  disabled={((user?.shareCount || 0) < 5)}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                    ((user?.shareCount || 0) >= 5)
                    ? 'bg-white text-slate-900 hover:bg-slate-100'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {((user?.shareCount || 0) >= 5) ? p.unlocked : "Subscribe Yearly (₹999)"}
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

function CoursesView({ chapters, language, isPremium, onUpgrade }: any) {
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [gameMode, setGameMode] = useState(false);

  if (testMode && selected) {
    return <TestEngine chapter={selected} onComplete={() => setTestMode(false)} language={language} />;
  }

  if (gameMode && selected) {
    return <SkillGameView chapter={selected} onBack={() => setGameMode(false)} />;
  }

  if (selected) {
    return <LessonView chapter={selected} onBack={() => setSelected(null)} onPlayGame={() => setGameMode(true)} onTakeTest={() => setTestMode(true)} language={language} />;
  }

  if (!chapters || chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <BookOpen size={48} className="text-slate-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">No Courses Available</h3>
        <p className="text-slate-400 max-w-md">
          There are currently no chapters available for your selected class, board, and language. Please check back later or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {chapters.map((chapter: Chapter) => (
        <button 
          key={chapter.id}
          onClick={() => setSelected(chapter)}
          className="group text-left bg-slate-900/50 border border-white/5 rounded-3xl p-6 hover:border-emerald-500/50 transition-all"
        >
          <div className="aspect-video rounded-2xl bg-slate-800 mb-4 overflow-hidden relative">
            <img 
              src={`https://img.youtube.com/vi/${chapter.playlist_id}/0.jpg`} 
              className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform"
              alt={chapter.title}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xl">
                <Play fill="currentColor" size={20} />
              </div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{chapter.title}</h3>
          <p className="text-sm text-slate-500">{chapter.subject}</p>
        </button>
      ))}
    </div>
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

function AiSolverView({ language }: any) {
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
    <div className="h-full flex flex-col max-w-4xl mx-auto">
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
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <MessageSquare size={32} />
            </div>
            <p>Ask any math question and I'll explain it step-by-step!</p>
          </div>
        )}
      </div>

      <div className="relative">
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
      </div>
    </div>
  );
}

function GamesView({ language }: any) {
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
    <div className="max-w-xl mx-auto text-center">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].quickCalc}</h2>
        <p className="text-slate-500">{translations[language].gameInstructions}</p>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-[40px] p-12 shadow-2xl relative overflow-hidden">
        {gameState === 'idle' && (
          <div className="space-y-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Brain size={48} className="text-emerald-400" />
            </div>
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl hover:bg-emerald-500 transition-all">
              {translations[language].start}
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-10">
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
          </div>
        )}

        {gameState === 'over' && (
          <div className="space-y-8">
            <h3 className="text-4xl font-bold text-red-400">{translations[language].gameOver}</h3>
            <div className="text-xl text-slate-300">Final Score: <span className="text-emerald-400 font-bold">{score}</span></div>
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-xl hover:bg-emerald-500 transition-all">
              {translations[language].playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderboardView({ leaderboard, language }: any) {
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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">{translations[language].weeklyLeaderboard}</h2>
        <p className="text-slate-500">Celebrate effort and consistency! Resets every Sunday.</p>
      </div>

      {/* League Tabs */}
      <div className="flex justify-center gap-2 p-1 bg-slate-900/50 border border-white/5 rounded-2xl w-fit mx-auto">
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
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-[40px] overflow-hidden">
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
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                  <td className="px-8 py-6">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-yellow-500 text-slate-900' : 
                      i === 1 ? 'bg-slate-300 text-slate-900' : 
                      i === 2 ? 'bg-orange-500 text-slate-900' : 'text-slate-500'
                    }`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold">
                        {student.name[0]}
                      </div>
                      <span className="font-semibold text-white">{student.name}</span>
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
                </tr>
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
      </div>
      
      <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl text-center">
        <p className="text-emerald-400 text-sm font-medium">
          🌟 You are in the top 15% of effort makers this week! Keep it up!
        </p>
      </div>
    </div>
  );
}

function LessonView({ chapter, onBack, onPlayGame, onTakeTest, language }: { chapter?: any, onBack: () => void, onPlayGame: () => void, onTakeTest: () => void, language: 'or' | 'en' }) {
  const title = chapter?.title || "Subtraction Lesson";
  const topic = chapter?.topic_title || "Mathematics";
  const [activeTab, setActiveTab] = useState<'practice' | 'game' | 'ai'>('practice');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAskAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const res = await solveMathDoubt(`Context: Learning ${title}. Question: ${aiPrompt}`, language);
      setAiResponse(res);
    } catch (e) {
      setAiResponse("Sorry, I couldn't process that right now. Please try again.");
    }
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-900 font-sans absolute inset-0 z-[100] overflow-y-auto">
      {/* Header */}
      <header className="bg-[#1e5b99] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-md">
            <BookOpen className="text-[#1e5b99]" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">UtkalSkillCentre</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="font-medium hover:text-blue-200 transition-colors">Back to Chapters</button>
          <button className="p-2 border-2 border-white/30 rounded hover:bg-white/10 transition-colors"><Menu size={20} /></button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="px-6 py-3 border-b border-slate-200 text-sm text-[#1e5b99] font-medium bg-white">
        Odisha Board <span className="mx-2 text-slate-400">›</span> {topic} <span className="mx-2 text-slate-400">›</span> {title}
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20">
        <h1 className="text-3xl font-bold text-slate-800">{title}</h1>

        {/* Main Card: Video + Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Video Area */}
          <div className="aspect-video bg-slate-200 relative">
            {chapter?.playlist_id ? (
              <iframe 
                className="w-full h-full"
                src={`https://www.youtube.com/embed/videoseries?list=${chapter.playlist_id}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <img src="https://placehold.co/1200x675/4ade80/ffffff?text=Video+Thumbnail" alt="Video" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                    <Play size={40} fill="currentColor" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Key Points Area */}
          <div className="p-6 md:p-8 border-t border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Key Points</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700 font-medium text-lg">
              <li>Subtraction means taking away.</li>
              <li>Start from the ones column.</li>
              <li>Borrow if needed.</li>
            </ul>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveTab('practice')}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left ${
              activeTab === 'practice' 
                ? 'bg-[#1e5b99] text-white shadow-lg scale-[1.02]' 
                : 'bg-[#e2e8f0] text-slate-700 hover:bg-slate-300 shadow-sm'
            }`}
          >
            <div className={`text-3xl ${activeTab === 'practice' ? 'text-yellow-400' : 'text-[#1e5b99]'}`}>
              📝
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Practice</div>
              <div className={`text-sm ${activeTab === 'practice' ? 'text-blue-200' : 'text-slate-500'}`}>Solve Questions</div>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('game')}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left ${
              activeTab === 'game' 
                ? 'bg-[#1e5b99] text-white shadow-lg scale-[1.02]' 
                : 'bg-[#e2e8f0] text-slate-700 hover:bg-slate-300 shadow-sm'
            }`}
          >
            <div className={`text-3xl ${activeTab === 'game' ? 'text-yellow-400' : 'text-[#1e5b99]'}`}>
              🎮
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Mind Game</div>
              <div className={`text-sm ${activeTab === 'game' ? 'text-blue-200' : 'text-slate-500'}`}>Speed Challenge</div>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left ${
              activeTab === 'ai' 
                ? 'bg-[#1e5b99] text-white shadow-lg scale-[1.02]' 
                : 'bg-[#e2e8f0] text-slate-700 hover:bg-slate-300 shadow-sm'
            }`}
          >
            <div className={`text-3xl ${activeTab === 'ai' ? 'text-yellow-400' : 'text-[#1e5b99]'}`}>
              🤖
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">AI Doubt</div>
              <div className={`text-sm ${activeTab === 'ai' ? 'text-blue-200' : 'text-slate-500'}`}>Ask Questions</div>
            </div>
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 min-h-[300px]">
          {activeTab === 'practice' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <PenTool className="text-[#1e5b99]" /> Practice Questions
              </h3>
              <div className="space-y-4 text-lg font-bold text-slate-800 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <p className="flex items-center gap-4"><span className="w-8 h-8 rounded-full bg-blue-100 text-[#1e5b99] flex items-center justify-center text-sm">1</span> 54 - 21 = ?</p>
                <p className="flex items-center gap-4"><span className="w-8 h-8 rounded-full bg-blue-100 text-[#1e5b99] flex items-center justify-center text-sm">2</span> 73 - 26 = ?</p>
                <p className="flex items-center gap-4"><span className="w-8 h-8 rounded-full bg-blue-100 text-[#1e5b99] flex items-center justify-center text-sm">3</span> 65 - 48 = ?</p>
              </div>
              <button onClick={onTakeTest} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md">
                Submit Answers
              </button>
            </div>
          )}

          {activeTab === 'game' && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <Brain size={48} className="text-[#1e5b99]" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Speed Math Challenge</h3>
              <p className="text-slate-600 mb-8 max-w-md mx-auto text-lg">Improve your calculation speed and make learning fun with our interactive mind game!</p>
              <button onClick={onPlayGame} className="bg-[#1e5b99] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3">
                <Play fill="currentColor" /> Play Mind Game
              </button>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex flex-col h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Bot className="text-[#1e5b99]" /> Ask AI Doubt Solver
              </h3>
              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col mb-6 overflow-y-auto">
                {aiResponse ? (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 text-slate-700 whitespace-pre-wrap text-lg">
                    {aiResponse}
                  </div>
                ) : (
                  <div className="m-auto text-center text-slate-400">
                    <Bot size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Ask any question about this chapter!</p>
                    <p className="text-sm mt-2">Example: "Why do we borrow in subtraction?"</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Type your doubt here..." 
                  className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#1e5b99] text-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                />
                <button 
                  onClick={handleAskAi}
                  disabled={isAiLoading}
                  className="bg-[#1e5b99] text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isAiLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  Ask
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillGameView({ chapter, onBack }: { chapter?: any, onBack: () => void }) {
  const title = chapter?.title || "Skill Game";
  
  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans absolute inset-0 z-[100] overflow-y-auto">
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
        <h1 className="text-3xl font-bold text-slate-800">{title} - Mind Game</h1>

        {/* Game Canvas Area */}
        <div className="relative aspect-[16/9] bg-sky-200 rounded-xl overflow-hidden border border-slate-300 shadow-md flex flex-col items-center justify-center">
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
          <div className="z-10 bg-emerald-800 border-8 border-amber-700 rounded-lg p-8 shadow-2xl mb-12 relative">
            <span className="text-6xl font-bold text-white font-mono tracking-widest">8 + 3 = ?</span>
          </div>

          {/* Options */}
          <div className="z-10 flex gap-4 absolute bottom-8">
            {[10, 12, 11, 9].map((num, i) => (
              <button key={i} className="w-20 h-20 bg-gradient-to-b from-orange-400 to-orange-600 rounded-xl border-b-4 border-orange-700 text-white text-3xl font-bold shadow-lg hover:translate-y-1 hover:border-b-0 transition-all">
                {num}
              </button>
            ))}
          </div>
        </div>

        <section className="bg-slate-50 p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Key Points</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 font-medium">
            <li>Subtraction means taking away.</li>
            <li>Start from the ones column.</li>
            <li>Borrow if needed.</li>
          </ul>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <button className="bg-[#1e5b99] text-white p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-md hover:bg-blue-800 transition-colors">
            <Star className="text-yellow-400" fill="currentColor" /> Mental Math
          </button>
          <button className="bg-slate-200 text-slate-700 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-sm hover:bg-slate-300 transition-colors">
            <Hash className="text-slate-500" /> Number Puzzle
          </button>
          <button className="bg-slate-200 text-slate-700 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 shadow-sm hover:bg-slate-300 transition-colors">
            <Shapes className="text-slate-500" /> Math Patterns
          </button>
        </div>
      </div>
    </div>
  );
}

