import React, { useState, useRef, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithCustomToken } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Loader2, Globe, ArrowLeft, Shield, ChevronRight, Sparkles, Youtube, Instagram, Facebook, BookOpen, X, Trophy, Gamepad2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getDeferredPrompt, clearDeferredPrompt } from '../pwa';
import { AboutUsModal } from './AboutUsModal';
import { BaghChheliGame } from './BaghChheliGame';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { previewDatabase } from '../data/previewDatabase';

const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path fill="currentColor" d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.8 3.08 1.22 4.79 1.22 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02Zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.264 8.264 0 0 1-1.26-4.38c0-4.58 3.73-8.31 8.31-8.31 2.22 0 4.31.87 5.88 2.44 1.57 1.57 2.43 3.66 2.43 5.88 0 4.58-3.73 8.31-8.31 8.31Zm4.56-6.22c-.25-.12-1.48-.73-1.71-.82-.23-.08-.4-.12-.57.12-.17.25-.65.82-.8 1-.15.17-.3.2-.55.08-.25-.12-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.1-.51.11-.11.25-.29.38-.44.12-.15.17-.25.25-.41.08-.17.04-.33-.02-.45-.06-.12-.57-1.38-.78-1.89-.2-.5-.41-.43-.57-.44-.15-.01-.33-.01-.5-.01-.17 0-.45.06-.69.32-.25.25-.96.94-.96 2.3s.98 2.68 1.12 2.86c.14.18 1.95 2.98 4.72 4.18.66.28 1.17.45 1.57.58.66.21 1.26.18 1.74.11.54-.08 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.28Z"/>
  </svg>
);

const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';
const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/utkalskillcentre/';
const FACEBOOK_PROFILE_URL = 'https://www.facebook.com/share/1JAq6DY6Sq/';
const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@UtkalSkillCenter';

const SOCIAL_ORIGINS = [
  YOUTUBE_ORIGIN,
  new URL(INSTAGRAM_PROFILE_URL).origin,
  new URL(FACEBOOK_PROFILE_URL).origin,
];

// PRE-CONFIGURED HACKATHON TEST NUMBERS (Must match test numbers configured in Firebase Auth console)
const TEST_ACCOUNTS = [
  { phone: '+911234567890', label: 'Student (Class 10)', class: '10', board: 'BSE Odisha', role: 'student' as const, code: '123456' },
  { phone: '+919876543210', label: 'Teacher / Educator', class: '10', board: 'BSE Odisha', role: 'teacher' as const, code: '123456' }
];

export default function Login({ language, translations, setLanguage, setRegData }: { language: 'en' | 'or', translations: any, setLanguage: (lang: 'en' | 'or') => void, setRegData: (data: any) => void }): React.ReactElement {
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleLaunchGuidedTour = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('judge_tour_active', 'true');
      sessionStorage.setItem('judge_tour_step', '1');
      const todayStr = new Date().toLocaleDateString('en-CA');
      localStorage.setItem('rajaFestivalLastSeenDate', todayStr);
    }
    await handleFastPassLogin(TEST_ACCOUNTS[0]);
  };

  const handleFastPassLogin = async (acc: typeof TEST_ACCOUNTS[number]) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('judge_mode_active', 'true');
      localStorage.setItem('showcase_mode', 'true');
    }
    setUserRole(acc.role);
    if (acc.role === 'student') {
      setSelectedClass(acc.class);
      setSelectedBoard(acc.board);
    }
    
    // Set matching registration data
    setRegData({
      class: acc.role === 'student' ? acc.class : '10',
      board: acc.role === 'student' ? acc.board : 'BSE Odisha',
      role: acc.role
    });

    setPhoneNumber(acc.phone);
    if (phoneInputRef.current) {
      phoneInputRef.current.value = acc.phone.replace('+91', '');
    }

    setIsSending(true);

    try {
      // 1. Solve Captcha via silent invisible element
      if (!recaptchaVerifier.current && recaptchaDomRef.current) {
        recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaDomRef.current, {
          'size': 'invisible',
          'callback': (_response: any) => {}
        });
      }

      // 2. Dispatch Firebase Phone Sign-in (returns instantly for test numbers)
      const confirmation = await signInWithPhoneNumber(auth, acc.phone, recaptchaVerifier.current);
      setVerificationId(confirmation);
      
      // 3. Programmatically confirm standard OTP immediately (Zero-friction Login!)
      await confirmation.confirm(acc.code);
      console.log("Fast-Pass automated login successful");
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'OTP' });
      }
      
    } catch (error: any) {
      console.error("Fast-pass login error:", error);
      
      // Zero-friction offline/poor-network fallback for judging resilience
      const isJudgeMode = typeof window !== 'undefined' && (
        window.location.search.includes('judge') ||
        window.location.hash.includes('judge') ||
        window.location.search.includes('showcase') ||
        localStorage.getItem('showcase_mode') === 'true' ||
        sessionStorage.getItem('judge_mode_active') === 'true'
      );
      
      if (isJudgeMode) {
        console.warn("Network offline or Firebase timeout during judge login. Initializing local offline session...");
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('judge_offline_auth_active', 'true');
          sessionStorage.setItem('judge_offline_role', acc.role);
          window.location.reload();
        }
        return;
      }

      alert("Fast-pass authentication failed: " + error.message);
      if (recaptchaVerifier.current) recaptchaVerifier.current.clear();
      recaptchaVerifier.current = null;
    } finally {
      setIsSending(false);
    }
  };
  const [verificationId, setVerificationId] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isSending, setIsSending] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [showAdminPill, setShowAdminPill] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // PIN Switcher State variables
  const [loginView, setLoginView] = useState<'phone' | 'switcher' | 'pin'>('phone');
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Guest Profile States
  const [showGuestBubble, setShowGuestBubble] = useState(true);
  const [showGuestDashboard, setShowGuestDashboard] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'home' | 'quiz' | 'game' | 'notes'>('home');
  const [selectedNotesGrade, setSelectedNotesGrade] = useState<number>(10);

  // In-memory Quiz states for Public Guest Quiz
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const startPublicQuiz = async () => {
    setLoadingQuiz(true);
    setActiveSubView('quiz');
    setCurrentQuizIdx(0);
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
    setQuizCorrectCount(0);
    setQuizFinished(false);
    
    try {
      const response = await fetch('/api/public/daily-mcq');
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuizQuestions(data.questions);
          setLoadingQuiz(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch daily quiz, falling back to static offline quiz", err);
    }
    
    // Fallback: A premium set of 5 general knowledge questions about Odisha to guarantee offline reliability!
    const fallbackQuestions = [
      {
        question: "Which temple is famously known as the 'Black Pagoda' of Odisha? / ଓଡ଼ିଶାର କେଉଁ ମନ୍ଦିର 'ବ୍ଲାକ୍ ପାଗୋଡା' ଭାବରେ ଜଣାଶୁଣା?",
        options: [
          "Jagannath Temple, Puri / ଜଗନ୍ନାଥ ମନ୍ଦିର, ପୁରୀ",
          "Konark Sun Temple / କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର",
          "Lingaraj Temple, Bhubaneswar / ଲିଙ୍ଗରାଜ ମନ୍ଦିର",
          "Muktashwar Temple / ମୁକ୍ତେଶ୍ୱର ମନ୍ଦିର"
        ],
        correct_answer: "Konark Sun Temple / କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର",
        explanation: "ସାଙ୍ଗମାନେ! କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିରକୁ ୧୩ଶ ଶତାବ୍ଦୀରେ ଲାଙ୍ଗୁଳା ନରସିଂହଦେବ ନିର୍ମାଣ କରିଥିଲେ। ସମୁଦ୍ର ଯାତ୍ରା କରୁଥିବା ୟୁରୋପୀୟ ନାବିକମାନେ ଏହାର କଳା ରଙ୍ଗ ଓ ଚୁମ୍ବକୀୟ ଆକର୍ଷଣ ପାଇଁ ଏହାକୁ 'ବ୍ଲାକ୍ ପାଗୋଡା' ବୋଲି କହୁଥିଲେ।"
      },
      {
        question: "Which is the largest brackish water lagoon in Asia, located in Odisha? / ଓଡ଼ିଶାରେ ଅବସ୍ଥିତ ଏସିଆର ସର୍ବବୃହତ ଲବଣାକ୍ତ ହ୍ରଦ କେଉଁଟି?",
        options: [
          "Ansupa Lake / ଅଂଶୁପା ହ୍ରଦ",
          "Chilika Lake / ଚିଲିକା ହ୍ରଦ",
          "Kanjia Lake / କଞ୍ଜିଆ ହ୍ରଦ",
          "Hirakud Reservoir / ହୀରାକୁଦ ଜଳาଶୟ"
        ],
        correct_answer: "Chilika Lake / ଚିଲିକା ହ୍ରଦ",
        explanation: "ସାଙ୍ଗମାନେ! ଚିଲିକା ହ୍ରଦ ହେଉଛି ଭାରତର ସର୍ବବୃହତ ଏବଂ ଏସିଆର ସର୍ବବୃହତ ଲବଣାକ୍ତ ଜଳାଶୟ। ଏହା ଅସଂଖ୍ୟ ପ୍ରବାସୀ ପକ୍ଷୀ ଏବଂ ବିରଳ ଇରାୱତୀ ଡଲଫିନମାନଙ୍କର ପ୍ରାକୃତିକ ବାସସ୍ଥାନ ଅଟେ।"
      },
      {
        question: "Who is the legendary 12-year-old architect who sacrificed his life for the Konark Temple? / କୋଣାର୍କ ମନ୍ଦିର ପାଇଁ ନିଜ ଜୀବନ ବଳିଦାନ ଦେଇଥିବା ୧୨ ବର୍ଷର କିମ୍ବଦନ୍ତୀ ସ୍ଥପତି କିଏ?",
        options: [
          "Bishu Maharana / ବିଷୁ ମହାରଣା",
          "Dharmapada / ଧର୍ମପଦ",
          "Baji Rout / ବାଜି ରାଉତ",
          "Jayadeva / ଜୟଦେବ"
        ],
        correct_answer: "Dharmapada / ଧର୍ମପଦ",
        explanation: "ଭାଇ ଭଉଣୀମାନେ! ଧର୍ମପଦ ଥିଲେ ବିଷୁ ମହାରଣାଙ୍କ ପୁଅ। ମାତ୍ର ୧୨ ବର୍ଷ ବୟସରେ ସେ କୋଣାର୍କ ମନ୍ଦିରର ଦଧିନଉତି (କଳସ) ମାରି ମନ୍ଦିର ନିର୍ମାଣ ସମ୍ପୂର୍ଣ୍ଣ କରିଥିଲେ ଏବଂ ଅନ୍ୟ କାରିଗରମାନଙ୍କ ଜୀବନ ରକ୍ଷା ପାଇଁ ଚନ୍ଦ୍ରଭାଗାକୁ ଡେଇଁ ପ୍ରାଣବଳି ଦେଇଥିଲେ।"
      },
      {
        question: "Which is the official State Anthem of Odisha? / ଓଡ଼ିଶାର ରାଜ୍ୟ ସଙ୍ଗୀତ କେଉଁଟି?",
        options: [
          "Odia Bhasa Ananya / ଓଡ଼ିଆ ଭାଷା ଅନନ୍ୟ",
          "Bande Utkala Janani / ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ",
          "Janani Janmabhumischa / ଜନନୀ ଜନ୍ମଭୂମିଶ୍ଚ",
          "Jai Odisha / ଜୟ ଓଡ଼ିଶา"
        ],
        correct_answer: "Bande Utkala Janani / ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ",
        explanation: "ସାଙ୍ଗମାନେ! ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ ହେଉଛି ଆମର ପବିତ୍ର ରାଜ୍ୟ ସଙ୍ଗୀତ, ଯାହାକୁ କାନ୍ତକବି ଲକ୍ଷ୍ମୀକାନ୍ତ ମହାପାତ୍ର ରଚନା କରିଥିଲେ। ୨୦୨୦ ମସିହାରେ ଓଡ଼ିଶା ସରକାର ଏହାକୁ ଆନୁଷ୍ଠାନିକ ଭାବେ ରାଜ୍ୟ ସଙ୍ଗୀତର ମାନ୍ୟତା ଦେଇଛନ୍ତି।"
      },
      {
        question: "Solve this Gundulu AI math puzzle: If a farmer has 15 sheep and all but 9 die, how many sheep are left? / ଯଦି ଜଣେ ଚାଷୀଙ୍କର ୧୫ଟି ମେଣ୍ଢା ଥାଆନ୍ତି ଏବଂ ୯ଟିକୁ ଛାଡ଼ି ସମସ୍ତେ ମରିଯାଆନ୍ତି, ତେବେ କେତେଟି ମେଣ୍ଢା ବଞ୍ଚି ରହିବେ?",
        options: [
          "6",
          "9",
          "15",
          "0"
        ],
        correct_answer: "9",
        explanation: "ଭାଇ ଭଉଣୀମାନେ! ଏହା ଏକ ମଜาଦାର ଧନ୍ଦା। '୯ଟିକୁ ଛାଡ଼ି ସମସ୍ତେ ମରିଗଲେ' ଅର୍ଥାତ୍ କେବଳ ସେହି ୯ଟି ମେଣ୍ଢା ହିଁ ଜୀବିତ ବଞ୍ଚି ରହିଛନ୍ତି। ତେଣୁ ଚାଷୀଙ୍କ ପାଖରେ ୯ଟି ମେଣ୍ଢା ହିଁ ରହିବେ।"
      }
    ];
    setQuizQuestions(fallbackQuestions);
    setLoadingQuiz(false);
  };

  const getQuizUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
      }
    }
    return 'https://quiz.utkalskillcentre.com';
  };

  useEffect(() => {
    const isJudgeMode = typeof window !== 'undefined' && (
      window.location.search.includes('judge=true') || 
      window.location.search.includes('judgestatus=true') || 
      window.location.search.includes('showcase=true') || 
      window.location.hash.includes('judge') ||
      window.location.hash === '#judge' ||
      window.location.hash === '#pitch_deck' ||
      localStorage.getItem('showcase_mode') === 'true'
    );
    if (isJudgeMode && typeof window !== 'undefined') {
      sessionStorage.setItem('judge_mode_active', 'true');
      localStorage.setItem('showcase_mode', 'true');
    }

    try {
      const raw = localStorage.getItem('saved_accounts');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAccounts(parsed);
          if (!isJudgeMode) {
            setLoginView('switcher');
          }
        }
      }
    } catch (e) {
      console.error("Failed to load saved accounts", e);
    }
  }, []);

  const handleVerifyWithOtp = () => {
    if (!selectedAccount) return;
    
    // Extract last 10 digits of the phone number
    const rawPhone = selectedAccount.phoneNumber || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const phone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    // Set view to phone login form
    setLoginView('phone');
    
    // Set matching role if stored in the account data
    if (selectedAccount.role) {
      setUserRole(selectedAccount.role);
    } else if (selectedAccount.class || selectedAccount.board) {
      setUserRole('student');
    }
    
    if (selectedAccount.class) {
      setSelectedClass(selectedAccount.class);
    }
    if (selectedAccount.board) {
      setSelectedBoard(selectedAccount.board);
    }

    // Prefill phone state and input element
    setPhoneNumber(phone10);
    if (phoneInputRef.current) {
      phoneInputRef.current.value = phone10;
    }
    
    setPin('');
    setPinError('');
  };

  const handlePinSubmit = async (enteredPin: string) => {
    if (!selectedAccount) return;
    setVerifyingPin(true);
    setPinError('');
    try {
      const response = await fetch('/api/auth/login-with-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedAccount.uid, pin: enteredPin })
      });
      
      const text = await response.text();
      let data: any = {};
      try {
        if (text) {
          data = JSON.parse(text);
        }
      } catch (parseErr) {
        console.warn('Failed to parse response JSON:', text);
      }

      if (!response.ok) {
        throw new Error(data.error || text || 'Failed to authenticate');
      }

      if (!data.customToken) {
        throw new Error('Authentication failed: No custom token received.');
      }

      // PIN matches, authenticate with custom token!
      await signInWithCustomToken(auth, data.customToken);
      console.log("PIN Switcher Login successful");
    } catch (err: any) {
      console.error(err);
      setPinError(err.message || 'Incorrect PIN. Please try again.');
      setPin('');
    } finally {
      setVerifyingPin(false);
    }
  };
  const showShowcaseButton = typeof window !== 'undefined' && (
    window.location.search.includes('showcase=true') || 
    window.location.search.includes('judge=true') || 
    window.location.search.includes('judgestatus=true') || 
    window.location.hash.includes('judge') ||
    window.location.hash === '#pitch_deck' ||
    localStorage.getItem('showcase_mode') === 'true'
  );
  const showJudgePass = typeof window !== 'undefined' && (
    window.location.search.includes('judge=true') || 
    window.location.search.includes('judgestatus=true') || 
    window.location.search.includes('showcase=true') || 
    window.location.hash.includes('judge') ||
    window.location.hash === '#judge' ||
    localStorage.getItem('showcase_mode') === 'true'
  );
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const recaptchaVerifier = useRef<any>(null);
  const recaptchaDomRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];
  const isStandaloneMode = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);
  const isMobileDevice = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(window.navigator.userAgent);
  const socialLinkTarget = isStandaloneMode || isMobileDevice ? '_self' : '_blank';
  const socialLinkRel = socialLinkTarget === '_blank' ? 'noopener noreferrer' : undefined;
  const shouldShowInstallButton = !isStandaloneMode;
  const canInstallApp = Boolean(deferredPrompt || getDeferredPrompt());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const existingPrompt = getDeferredPrompt();
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const injectedLinks = SOCIAL_ORIGINS.flatMap((origin) => {
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = origin;
      preconnect.crossOrigin = 'anonymous';

      const dnsPrefetch = document.createElement('link');
      dnsPrefetch.rel = 'dns-prefetch';
      dnsPrefetch.href = origin;

      document.head.appendChild(preconnect);
      document.head.appendChild(dnsPrefetch);

      return [preconnect, dnsPrefetch];
    });

    return () => {
      injectedLinks.forEach((link) => link.remove());
    };
  }, []);

  const syncSelectedAcademicInfo = () => {
    setRegData({ 
      class: userRole === 'student' ? selectedClass : '10', 
      board: userRole === 'student' ? selectedBoard : 'BSE Odisha',
      role: userRole 
    });
  };

  const handleInstallClick = async () => {
    const prompt = deferredPrompt || getDeferredPrompt();
    if (!prompt) {
      const installMessage = isMobileDevice
        ? 'Install is not ready yet. Open the browser menu and choose Add to Home screen or Install app.'
        : 'Install is not ready yet. In Chrome or Edge, use the address bar install icon or the browser menu and choose Install app.';
      alert(installMessage);
      return;
    }

    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      clearDeferredPrompt();
      setDeferredPrompt(null);
    }
  };

  const getEnteredPhoneNumber = () => phoneInputRef.current?.value?.trim() || phoneNumber;

  const handleGoogleLogin = async () => {
    if (userRole === 'student' && (!selectedClass || !selectedBoard)) {
      alert(translations[language].requiredFieldsError);
      return;
    }

    syncSelectedAcademicInfo();

    try {
      await signInWithGoogle();
      console.log("Google login successful");
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'Google' });
      }
    } catch (error) {
      console.error("Google login error:", error);
      alert("Google login failed.");
    }
  };

  const normalizePhoneNumber = (input: string) => {
    const withPlus = input.trim().replace(/[^\d+]/g, '');
    if (withPlus.startsWith('+')) return withPlus;

    const digitsOnly = withPlus.replace(/\D/g, '');
    if (digitsOnly.length === 10) return `+91${digitsOnly}`;
    if (digitsOnly.length > 10) return `+${digitsOnly}`;
    return `+91${digitsOnly}`;
  };

  const getOtpErrorMessage = (error: any) => {
    switch (error?.code) {
      case 'auth/invalid-phone-number':
        return 'Invalid phone format. Use full number with country code (example: +91XXXXXXXXXX).';
      case 'auth/too-many-requests':
        return 'Too many OTP attempts. Please wait a few minutes and try again.';
      case 'auth/operation-not-allowed':
        return 'Phone sign-in is disabled. Enable Phone provider in Firebase Authentication.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Authentication. Add your Cloud Run domain in Authorized Domains.';
      case 'auth/invalid-app-credential':
        return 'Firebase app verification failed. Add your domain to Authorized Domains in Firebase Console Authentication settings.';
      case 'auth/billing-not-enabled':
        return 'Real SMS requires Firebase Blaze plan. For testing, add a phone test number in Firebase Auth and use its test OTP.';
      case 'auth/captcha-check-failed':
        return 'reCAPTCHA failed. Refresh the page and try again.';
      case 'auth/network-request-failed':
        return 'Network error while sending OTP. Check your internet and retry.';
      default:
        return error?.message || 'Failed to send OTP. Please verify Firebase Auth configuration.';
    }
  };

  const onSmsSend = async () => {
    const enteredPhoneNumber = getEnteredPhoneNumber();

    if (!enteredPhoneNumber || enteredPhoneNumber.length < 10) return alert("Please enter valid phone");
    if (userRole === 'student' && (!selectedClass || !selectedBoard)) return alert(translations[language].requiredFieldsError);

    syncSelectedAcademicInfo();

    setPhoneNumber(enteredPhoneNumber);

    setIsSending(true);
    if (!recaptchaVerifier.current && recaptchaDomRef.current) {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, recaptchaDomRef.current, { 
        'size': 'normal',
        'callback': (_response: any) => { /* reCAPTCHA solved */ }
      });
    }

    try {
      const formattedNumber = normalizePhoneNumber(enteredPhoneNumber);

      try {
        const lockDoc = await getDoc(doc(db, 'user_locks', formattedNumber));
        if (lockDoc.exists()) {
          const lockData = lockDoc.data();
          if (lockData.role && lockData.role !== userRole) {
            alert(language === 'en'
              ? `This phone number is already registered as a ${lockData.role.toUpperCase()}. Please switch your role on the login screen.`
              : `ଏହି ଫୋନ୍ ନମ୍ବର ପୂର୍ବରୁ ${lockData.role.toUpperCase()} ଭାବରେ ପଞ୍ଜିକୃତ ହୋଇଛି |`);
            return;
          }
          if (userRole === 'student') {
            const dbClass = lockData.class;
            const dbBoard = lockData.board;
            if (selectedClass && selectedBoard && (dbClass !== selectedClass || dbBoard !== selectedBoard)) {
              const classLabel = translations[language].classes[dbClass] || dbClass;
              const boardLabel = translations[language].boards[dbBoard] || dbBoard;
              alert(language === 'en'
                ? `Your account is locked to ${classLabel} (${boardLabel}). Please select the correct class/board to login.`
                : `ଆପଣଙ୍କ ଆକାଉଣ୍ଟ ${classLabel} (${boardLabel}) ପାଇଁ ଲକ୍ ହୋଇଛି | ଦୟାକରି ସଠିକ୍ ଶ୍ରେଣୀ/ବୋର୍ଡ ଚୟନ କରନ୍ତୁ |`);
              return;
            }
          }
        }
      } catch (lockError: any) {
        if (lockError?.code !== 'permission-denied' && lockError?.code !== 'failed-precondition') {
          console.warn('Lock check skipped due to read error:', lockError);
        }
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier.current);
      setVerificationId(confirmation);
      setAuthStep('otp');
    } catch (error: any) {
      console.error(error);
      alert(getOtpErrorMessage(error));
      if (recaptchaVerifier.current) recaptchaVerifier.current.clear();
      recaptchaVerifier.current = null;
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    setIsSending(true);
    try {
      await verificationId.confirm(otp);
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'login', { method: 'OTP' });
      }
    } catch (error) {
      alert("Invalid OTP");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-between p-3 sm:p-4 overflow-y-auto overflow-x-hidden bg-[#020617]">
      
      {/* 1. STUNNING AMBIENT MESH GLOW BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Emerald Glow Orb */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[70vw] sm:w-[500px] h-[70vw] sm:h-[500px] rounded-full bg-emerald-500/20 blur-[120px]"
        />
        {/* Amber Glow Orb */}
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[-10%] left-[-10%] w-[70vw] sm:w-[500px] h-[70vw] sm:h-[500px] rounded-full bg-amber-500/20 blur-[120px]"
        />
        {/* Odia Temple Pattern Watermark Overlay */}
        <div className="absolute inset-0 opacity-5 flex items-center justify-center">
          <img src="/temple-pattern.png" className="w-[120%] sm:w-[80%] h-auto object-contain filter grayscale" alt="" />
        </div>
      </div>

      {/* 2. TOP: Sleek Premium Utility Bar */}
      <header className="w-full max-w-md flex justify-between items-center z-20 pt-1">
        {/* UTKAL LOGO WITH TRIPLE CLICK ADMIN TRIGGER & HIDE TOGGLE */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => {
            if (showAdminPill) {
              setShowAdminPill(false);
              if (userRole === 'admin') setUserRole('student');
              (window as any)._logoClickCount = 0;
              return;
            }
            const now = Date.now();
            const timeDiff = now - ((window as any)._lastLogoClick || 0);
            if (timeDiff < 500) {
              (window as any)._logoClickCount = ((window as any)._logoClickCount || 0) + 1;
              if ((window as any)._logoClickCount >= 3) {
                setShowAdminPill(true);
                setUserRole('admin');
                (window as any)._logoClickCount = 0;
              }
            } else {
              (window as any)._logoClickCount = 1;
            }
            (window as any)._lastLogoClick = now;
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-emerald-500 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity" />
            <img 
              src="/utkal-512.png" 
              className="h-9 w-auto relative z-10 drop-shadow-lg" 
              alt="Utkal" 
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-base font-black tracking-tighter uppercase leading-none font-['Outfit']">
              {language === 'or' ? 'ଉତ୍କଳ' : 'UTKAL'}
            </h1>
            <p className="text-amber-400 text-[7px] font-black tracking-[0.3em] uppercase opacity-90 mt-0.5 font-['Outfit']">
              {language === 'or' ? 'ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Skill Centre'}
            </p>
          </div>
        </motion.div>

        {/* CONTROLS: LANGUAGE & PWA WHATSAPP INSTALL */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
          {showShowcaseButton && (
            <button 
              onClick={() => {
                if (typeof (window as any)._onLaunchShowcase === 'function') {
                  (window as any)._onLaunchShowcase();
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-[9px] font-black text-amber-300 flex items-center gap-1 shadow-lg backdrop-blur-md transition-all active:scale-95 animate-pulse cursor-pointer"
            >
              <Sparkles size={12} className="text-amber-400" />
              {language === 'en' ? 'SHOWCASE' : 'ପ୍ରୋଜେକ୍ଟ ସ୍ଲାଇଡ୍'}
            </button>
          )}

          <button 
            onClick={() => setLanguage(language === 'en' ? 'or' : 'en')} 
            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black text-amber-400 flex items-center gap-1 shadow-lg backdrop-blur-md transition-all active:scale-95"
          >
            <Globe size={12} className="text-amber-400 animate-spin-slow" />
            {language === 'en' ? 'ଓଡ଼ିଆ' : 'ENGLISH'}
          </button>

          {shouldShowInstallButton && (
            <button
              onClick={handleInstallClick}
              title={canInstallApp ? 'Install app' : 'Install prompt will appear when supported by the browser'}
              className={`flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${canInstallApp ? '' : 'opacity-85'}`}
            >
              <span className="text-emerald-400 flex items-center justify-center">
                <WhatsAppIcon size={12} />
              </span>
              {language === 'en' ? 'Install' : 'ଇନଷ୍ଟଲ୍'}
            </button>
          )}
        </motion.div>
      </header>

      {/* 3. CENTER: Ultra-Premium Glassmorphic Altar Form */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md z-10 my-auto py-2">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] space-y-4 sm:space-y-5 relative overflow-hidden"
        >
          {/* Subtle top edge specular highlight */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* WELCOME BANNER (Slightly Up) */}
          <div className="w-full text-left space-y-1 pb-1">
            <AnimatePresence mode="wait">
              {loginView === 'switcher' ? (
                <motion.div key="switcher-header" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                  <h2 className="text-white text-2xl sm:text-3xl font-black tracking-tight font-['Outfit']">
                    {language === 'en' ? 'Who is studying today?' : 'ଆଜି କିଏ ପଢୁଛି?'}
                  </h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">
                     {language === 'en' ? 'Select profile & enter PIN to switch' : 'ପ୍ରୋଫାଇଲ୍ ବାଛନ୍ତୁ ଏବଂ ପିନ୍ ଦିଅନ୍ତୁ'}
                  </p>
                </motion.div>
              ) : loginView === 'pin' ? (
                <motion.div key="pin-header" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="relative flex items-center justify-start pl-10">
                  <button 
                    onClick={() => { setLoginView('switcher'); setPin(''); setPinError(''); }}
                    className="absolute left-0 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div>
                    <h2 className="text-white text-xl sm:text-2xl font-black tracking-tight font-['Outfit']">
                      {language === 'en' ? 'Enter Login PIN' : 'ଲଗଇନ୍ ପିନ୍ ଦିଅନ୍ତୁ'}
                    </h2>
                    <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                      {selectedAccount?.name}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="phone-header" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
                  <h2 className="text-white text-3xl sm:text-4xl font-black tracking-tight font-['Outfit']">
                    {language === 'en' ? (
                      <>
                        Odisha's #1
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
                            AI Learning App
                          </span>
                          <div className="relative">
                            {/* Mascot Image (Pointing Up) - Decorative */}
                            <motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 relative select-none z-10"
                            >
                              <img 
                                src="/gundulu-pointing-up.png" 
                                className="w-full h-full object-contain" 
                                alt="Gundulu Mascot" 
                              />
                            </motion.div>

                            {/* Speech Bubble (Interactive - Click to navigate) */}
                            {showGuestBubble && (
                              <div 
                                onClick={() => {
                                  setShowGuestDashboard(true);
                                  setActiveSubView('home');
                                }}
                                className="absolute bottom-[122%] left-1/2 -translate-x-1/2 p-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400 text-left shadow-2xl w-[160px] sm:w-[180px] select-none pointer-events-auto z-30 flex flex-col gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                                    <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-wider font-['Outfit']">
                                      🧭 Guest Profile
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowGuestBubble(false);
                                    }}
                                    className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-0.5"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                                <p className="text-[10px] sm:text-[11px] leading-tight text-slate-200 font-bold whitespace-nowrap">
                                  Free quiz & games! 🎒
                                </p>
                                {/* Arrow pointing down to the mascot's finger */}
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-emerald-500/30 rotate-45" />
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        ଓଡ଼ିଶାର #୧
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
                            AI ପାଠପଢ଼ା ଆପ୍
                          </span>
                          <div className="relative">
                            {/* Mascot Image (Pointing Up) - Decorative */}
                            <motion.div
                              animate={{ y: [0, -3, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 relative select-none z-10"
                            >
                              <img 
                                src="/gundulu-pointing-up.png" 
                                className="w-full h-full object-contain" 
                                alt="Gundulu Mascot" 
                              />
                            </motion.div>

                            {/* Speech Bubble (Interactive - Click to navigate) */}
                            {showGuestBubble && (
                              <div 
                                onClick={() => {
                                  setShowGuestDashboard(true);
                                  setActiveSubView('home');
                                }}
                                className="absolute bottom-[122%] left-1/2 -translate-x-1/2 p-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400 text-left shadow-2xl w-[160px] sm:w-[180px] select-none pointer-events-auto z-30 flex flex-col gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                                    <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-wider font-['Outfit']">
                                      🧭 ଗେଷ୍ଟ ପ୍ରୋଫାଇଲ୍
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowGuestBubble(false);
                                    }}
                                    className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-0.5"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                                <p className="text-[10px] sm:text-[11px] leading-tight text-slate-200 font-bold whitespace-nowrap">
                                  ମାଗଣା କୁଇଜ୍ ଓ ଗେମ୍ସ! 🎒
                                </p>
                                {/* Arrow pointing down to the mascot's finger */}
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-emerald-500/30 rotate-45" />
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </h2>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.15em] mt-1.5 flex items-center justify-start gap-2">
                    <span className="h-px w-3 bg-slate-700" />
                    {language === 'en' ? 'Class 1-10 Books & AI Doubt Solver' : 'ଶ୍ରେଣୀ ୧-୧୦ ବହି ଏବଂ AI ସମାଧାନ'}
                    <span className="h-px w-3 bg-slate-700" />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {loginView === 'switcher' ? (
              <motion.div 
                key="switcher-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full space-y-4"
              >
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
                  {savedAccounts.map((acc, index) => {
                    const initial = acc.name ? acc.name.charAt(0).toUpperCase() : '?';
                    return (
                      <div 
                        key={acc.uid || index} 
                        className="relative group p-4 rounded-3xl bg-slate-950/65 border-2 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/60 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                        onClick={() => {
                          setSelectedAccount(acc);
                          if (acc.hasPin === false) {
                            // Automatically start OTP verification flow by prefilling & switching to phone view
                            setLoginView('phone');
                            setUserRole(acc.role || 'student');
                            if (acc.class) setSelectedClass(acc.class);
                            if (acc.board) setSelectedBoard(acc.board);
                            const rawPhone = acc.phoneNumber || '';
                            const cleanDigits = rawPhone.replace(/\D/g, '');
                            const phone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
                            setPhoneNumber(phone10);
                            setTimeout(() => {
                              if (phoneInputRef.current) {
                                phoneInputRef.current.value = phone10;
                              }
                            }, 50);
                          } else {
                            setPin('');
                            setPinError('');
                            setLoginView('pin');
                          }
                        }}
                      >
                        {/* No PIN Badge */}
                        {acc.hasPin === false && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[7px] font-black text-amber-400 uppercase tracking-wide z-20">
                            {language === 'en' ? 'No PIN' : 'ପିନ୍ ନାହିଁ'}
                          </div>
                        )}

                        {/* Remove account card action button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(language === 'en' ? `Remove ${acc.name} from this device?` : `ଏହି ଡିଭାଇସରୁ ${acc.name} କୁ ବାଦ୍ ଦେବେ?` )) {
                              const updated = savedAccounts.filter((a: any) => a.uid !== acc.uid);
                              setSavedAccounts(updated);
                              localStorage.setItem('saved_accounts', JSON.stringify(updated));
                              if (updated.length === 0) {
                                setLoginView('phone');
                              }
                            }
                          }}
                          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors z-20"
                          title="Remove Account"
                        >
                          ✕
                        </button>

                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-xl font-black text-amber-400 mb-2 shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:scale-105 transition-transform duration-300">
                          {acc.avatar ? (
                            <img src={acc.avatar} className="w-full h-full object-cover rounded-2xl" alt="" />
                          ) : (
                            <span>{initial}</span>
                          )}
                        </div>

                        <div className="text-white text-xs font-black tracking-tight truncate max-w-full mb-0.5">
                          {acc.name}
                        </div>

                        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                          {acc.class ? `Class ${acc.class}` : 'Student'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setLoginView('phone')}
                  className="w-full py-3.5 rounded-2xl border border-slate-700 hover:border-amber-500 bg-transparent text-slate-300 hover:text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>➕ {language === 'en' ? 'Log in with another number' : 'ଅନ୍ୟ ନମ୍ବରରେ ଲଗଇନ୍ କରନ୍ତୁ'}</span>
                </button>
              </motion.div>
            ) : loginView === 'pin' ? (
              <motion.div 
                key="pin-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full space-y-4"
              >
                {/* Dots indicator */}
                <div className="flex justify-center gap-3 py-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className={`w-10 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                        pin.length > i 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                          : 'border-slate-800 bg-slate-950/50 text-slate-600'
                      }`}
                    >
                      {pin.length > i ? '•' : ''}
                    </div>
                  ))}
                </div>

                {pinError && (
                  <div className="text-red-400 text-[10px] font-bold text-center py-0.5">
                    ✕ {pinError}
                  </div>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '✕', 0, '✓'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      disabled={verifyingPin}
                      onClick={() => {
                        if (btn === '✕') {
                          setPin(prev => prev.slice(0, -1));
                          setPinError('');
                        } else if (btn === '✓') {
                          if (pin.length !== 4) {
                            setPinError(language === 'en' ? 'Please enter a 4-digit PIN' : 'ଦୟାକରି ୪-ଅଙ୍କ ବିଶିଷ୍ଟ ପିନ୍ ଦିଅନ୍ତୁ');
                            return;
                          }
                          handlePinSubmit(pin);
                        } else {
                          if (pin.length < 4) {
                            const nextPin = pin + btn;
                            setPin(nextPin);
                            setPinError('');
                            if (nextPin.length === 4) {
                              handlePinSubmit(nextPin);
                            }
                          }
                        }
                      }}
                      className={`py-3 rounded-xl text-base font-black transition-all active:scale-95 flex items-center justify-center ${
                        btn === '✓'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                          : btn === '✕'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-slate-950/60 hover:bg-slate-900 text-white border border-white/5 shadow-inner'
                      }`}
                    >
                      {verifyingPin && btn === '✓' ? <Loader2 className="animate-spin" size={16} /> : btn}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyWithOtp}
                  className="w-full py-3 rounded-2xl border border-white/10 hover:border-amber-500 bg-slate-950/40 text-slate-300 hover:text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  💬 {language === 'en' ? 'Verify with SMS OTP' : 'SMS OTP ଦ୍ୱାରା ଯାଞ୍ଚ କରନ୍ତୁ'}
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="phone-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full space-y-4"
              >
                <div className={`w-full grid ${showAdminPill ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5`}>
                  <button
                    type="button"
                    onClick={() => setUserRole('student')}
                    className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      userRole === 'student' 
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/40 scale-[1.02]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    👨‍🎓 {language === 'en' ? 'Student' : 'ଛାତ୍ର'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRole('teacher')}
                    className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      userRole === 'teacher' 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40 scale-[1.02]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    👩‍🏫 {language === 'en' ? 'Teacher' : 'ଶିକ୍ଷକ'}
                  </button>
                  {showAdminPill && (
                    <button
                      type="button"
                      onClick={() => setUserRole('admin')}
                      className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative ${
                        userRole === 'admin' 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 scale-[1.02]' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      🛡️ {language === 'en' ? 'Admin' : 'ପ୍ରଶାସକ'}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAdminPill(false);
                          if (userRole === 'admin') setUserRole('student');
                        }}
                        title="Hide Admin Mode"
                        className="absolute right-1 top-1 w-4 h-4 rounded-full bg-black/40 hover:bg-red-500/80 flex items-center justify-center text-[8px] text-slate-300 hover:text-white transition-colors"
                      >
                        ✕
                      </div>
                    </button>
                  )}
                </div>

                {/* RECAPTCHA & INPUT FLOW */}
                <div className="w-full space-y-3.5">
                  <div id="recaptcha-container" ref={recaptchaDomRef} className="my-1 flex justify-center w-full overflow-hidden"></div>
                  
                  <AnimatePresence mode="wait">
                    {authStep === 'login' ? (
                      <motion.div 
                        key="login" 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full space-y-3.5"
                      >
                        {userRole === 'student' && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-3 flex items-center gap-1.5">
                                <BookOpen size={12} /> {language === 'en' ? 'Select Class' : 'ଶ୍ରେଣୀ ବାଛନ୍ତୁ'}
                              </label>
                              <div className="relative group">
                                <select 
                                  value={selectedClass} 
                                  onChange={(e) => setSelectedClass(e.target.value)}
                                  className="w-full py-3.5 pl-4 pr-10 bg-slate-950/80 border-2 border-slate-500 hover:border-amber-500 focus:border-amber-400 rounded-2xl text-white text-xs font-bold outline-none focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] appearance-none transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                                >
                                  <option className="bg-[#0b0f19]">{t.selectClass} *</option>
                                  {Object.entries(t.classes).map(([k,v]) => <option key={k} value={k} className="bg-[#0b0f19]">{v as string}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-amber-400 group-focus-within:text-amber-400 transition-colors">
                                  <ChevronRight size={16} className="transform rotate-90" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-3 flex items-center gap-1.5">
                                <Globe size={12} /> {language === 'en' ? 'Select Board' : 'ବୋର୍ଡ ବାଛନ୍ତୁ'}
                              </label>
                              <div className="relative group">
                                <select 
                                  value={selectedBoard} 
                                  onChange={(e) => setSelectedBoard(e.target.value)}
                                  className="w-full py-3.5 pl-4 pr-10 bg-slate-950/80 border-2 border-slate-500 hover:border-amber-500 focus:border-amber-400 rounded-2xl text-white text-xs font-bold outline-none focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] appearance-none transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                                >
                                  <option className="bg-[#0b0f19]">{t.selectBoard} *</option>
                                  {t.boards && Object.entries(t.boards).map(([k,v]) => <option key={k} value={k} className="bg-[#0b0f19]">{v as string}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-amber-400 group-focus-within:text-amber-400 transition-colors">
                                  <ChevronRight size={16} className="transform rotate-90" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-3 flex items-center gap-1.5">
                            <Phone size={12} /> {language === 'en' ? 'Mobile Number' : 'ମୋବାଇଲ୍ ନମ୍ବର'}
                          </label>
                          <div className="flex gap-2.5">
                            <div className="px-4 py-3.5 bg-slate-950/80 border-2 border-slate-500 rounded-2xl text-amber-400 text-xs font-black flex items-center justify-center shadow-inner">
                              <span>+91</span>
                            </div>
                            <input 
                              type="tel" 
                              ref={phoneInputRef}
                              defaultValue={phoneNumber}
                              placeholder={t.enterPhone}
                              inputMode="numeric"
                              autoComplete="tel"
                              className="flex-1 py-3.5 px-5 bg-slate-950/80 border-2 border-slate-500 hover:border-amber-500 focus:border-amber-400 rounded-2xl text-white text-xs font-black outline-none focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] placeholder:text-slate-600 transition-all shadow-inner" 
                            />
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={onSmsSend} 
                          disabled={isSending} 
                          className={`w-full group py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                            userRole === 'admin' 
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40' 
                              : userRole === 'teacher' 
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40' 
                              : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.4)] border border-amber-300/30'
                          }`}
                        >
                          {isSending ? <Loader2 className="animate-spin" size={18} /> : <>{t.sendOtp || 'Continue'} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></>}
                        </button>

                        {showJudgePass && (
                          <>
                            <div className="relative py-1 flex items-center justify-center">
                              <div className="h-px bg-white/10 w-full" />
                              <span className="absolute bg-[#0f172a] px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-full border border-white/10 py-1">
                                {language === 'en' ? 'OR' : 'କିମ୍ବା'}
                              </span>
                            </div>

                            {/* HACKATHON DEMO FAST-PASS PANEL */}
                            <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 space-y-2 text-left relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                              <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-amber-400 animate-pulse" />
                                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                                  {language === 'en' ? 'Judge Fast-Pass Access' : 'ଜଜ୍ ଫାଷ୍ଟ-ପାସ୍ ପ୍ରବେଶ'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-normal font-bold">
                                {language === 'en' ? 'Select a test account below for instant, one-click automated login (bypasses reCAPTCHA & SMS waiting).' : 'ବିନା SMS ଅପେକ୍ଷା ଓ reCAPTCHA ରେ ତୁରନ୍ତ ଲଗଇନ୍ କରିବା ପାଇଁ ଚୟନ କରନ୍ତୁ |'}
                              </p>
                              <div className="flex flex-col pt-1">
                                <button
                                  type="button"
                                  onClick={handleLaunchGuidedTour}
                                  disabled={isSending}
                                  className="w-full mb-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 border border-amber-400/30 hover:border-amber-300 text-xs font-black text-white hover:text-white transition-all flex items-center justify-between group active:scale-95 cursor-pointer shadow-lg shadow-amber-900/20"
                                >
                                  <span className="flex items-center gap-2">
                                    <Sparkles size={14} className="animate-spin" />
                                    {language === 'en' ? '🌟 Launch Guided Judge Tour' : '🌟 ଜଜ୍ ଗାଇଡେଡ୍ ଟୁର୍ ଆରମ୍ଭ କରନ୍ତୁ'}
                                  </span>
                                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-all text-white" />
                                </button>
                                {TEST_ACCOUNTS.map((acc, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleFastPassLogin(acc)}
                                    disabled={isSending}
                                    className="w-full py-3 px-4 rounded-xl bg-black/40 hover:bg-[#b34d1f]/10 border border-white/5 hover:border-amber-500/30 text-xs font-black text-slate-200 hover:text-amber-300 transition-all flex items-center justify-between group active:scale-95 cursor-pointer shadow-inner"
                                  >
                                    <span>
                                      {language === 'en' 
                                        ? `Log in as ${acc.role === 'teacher' ? 'Teacher' : `Student (Class ${acc.class})`}`
                                        : `${acc.role === 'teacher' ? 'ଶିକ୍ଷକ' : `ଛାତ୍ର (ଶ୍ରେଣୀ ${acc.class})`} ଭାବରେ ତୁରନ୍ତ ଲଗଇନ୍ କରନ୍ତୁ`}
                                    </span>
                                    <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-400 animate-pulse" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 crystal-button-sapphire text-white shadow-xl hover:shadow-blue-500/30 active:scale-95 cursor-pointer group"
                        >
                          <div className="bg-white p-1 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          </div>
                          <span className="tracking-[0.15em]">{language === 'en' ? 'Continue with Google' : 'ଗୁଗଲ୍ ସହିତ ଆଗକୁ ବଢନ୍ତୁ'}</span>
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key="otp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-6 text-center">
                        <Sparkles className="text-amber-400 mx-auto animate-pulse" size={48} />
                        <h2 className="text-white text-2xl font-black tracking-tight font-['Outfit']">
                          {language === 'en' ? 'Verify Security Code' : 'ସୁରକ୍ଷା କୋଡ୍ ଯାଞ୍ଚ କରନ୍ତୁ'}
                        </h2>
                        <p className="text-xs text-slate-400">
                          {language === 'en' ? 'Code dispatched to ' : 'କୋଡ୍ ପଠାଯାଇଛି: '}
                          <span className="text-amber-400 font-bold">{phoneNumber}</span>
                        </p>
                        <input 
                          type="text" 
                          maxLength={6} 
                          value={otp} 
                          onChange={(e) => setOtp(e.target.value)} 
                          placeholder="••••••" 
                          className="w-full py-4 px-6 bg-black/40 border border-amber-500/40 rounded-2xl text-center text-2xl font-black text-amber-400 tracking-widest outline-none focus:border-amber-400 focus:shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                        />
                        <button 
                          type="button"
                          onClick={verifyOtp} 
                          disabled={isSending}
                          className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          {isSending ? <Loader2 className="animate-spin" size={18} /> : (language === 'en' ? 'Verify Code' : 'କୋଡ୍ ଯାଞ୍ଚ କରନ୍ତୁ')}
                        </button>
                        <button type="button" onClick={() => setAuthStep('login')} className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mx-auto hover:text-slate-300 transition-colors">
                          <ArrowLeft size={12} /> {language === 'en' ? 'Change Phone Number' : 'ମୋବାଇଲ୍ ନମ୍ବର ବଦଳାନ୍ତୁ'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* 4. FOOTER: Social Media & Glowing System Online Status */}
      <footer className="w-full max-w-md flex flex-col items-center gap-3 z-20 pb-1">
        {/* Social Media Links */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <a href={YOUTUBE_CHANNEL_URL} target={socialLinkTarget} rel={socialLinkRel} className="w-8 h-8 rounded-xl bg-red-600 text-white border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] active:scale-95 flex items-center justify-center">
            <Youtube size={16} />
          </a>
          <a href={INSTAGRAM_PROFILE_URL} target={socialLinkTarget} rel={socialLinkRel} className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white border border-pink-500/30 shadow-[0_0_10px_rgba(236,72,153,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(236,72,153,0.5)] active:scale-95 flex items-center justify-center">
            <Instagram size={16} />
          </a>
          <a href={FACEBOOK_PROFILE_URL} target={socialLinkTarget} rel={socialLinkRel} className="w-8 h-8 rounded-xl bg-blue-600 text-white border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] active:scale-95 flex items-center justify-center">
            <Facebook size={16} />
          </a>
        </motion.div>

        {/* Policy & Compliance Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] text-slate-500 font-bold pt-1">
          <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
            {language === 'en' ? 'Privacy Policy' : 'ଗୋପନୀୟତା ନୀତି'}
          </a>
          <span>•</span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
            {language === 'en' ? 'Terms & Conditions' : 'ନିୟମ ଓ ସର୍ତ୍ତାବଳୀ'}
          </a>
          <span>•</span>
          <button type="button" onClick={() => setShowAboutModal(true)} className="hover:text-emerald-400 transition-colors cursor-pointer">
            {language === 'en' ? 'About Us' : 'ଆମ ବିଷୟରେ'}
          </button>
        </div>

        {/* Emerald Live Indicator */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[9px] font-black tracking-[0.25em] text-emerald-400 uppercase font-['Outfit']">
            {language === 'en' ? 'Utkal System Online' : 'ଉତ୍କଳ ସିଷ୍ଟମ୍ ସକ୍ରିୟ'}
          </span>
        </div>
      </footer>

      <AnimatePresence>
        {showAboutModal && (
          <AboutUsModal language={language} onClose={() => setShowAboutModal(false)} />
        )}
      </AnimatePresence>

      {/* GUEST DASHBOARD OVERLAY */}
      <AnimatePresence>
        {showGuestDashboard && (() => {
          const language = 'or' as any; // Force Odia language inside the Guest Profile Zone
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/98 z-50 overflow-y-auto flex flex-col items-center justify-start p-4 sm:p-8 backdrop-blur-xl"
            >
            {/* Header controls */}
            <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                {activeSubView !== 'home' && (
                  <button
                    type="button"
                    onClick={() => setActiveSubView('home')}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <ArrowLeft size={14} /> {language === 'en' ? 'Back' : 'ଫେରନ୍ତୁ'}
                  </button>
                )}
                <div>
                  <h1 className="text-white text-lg sm:text-2xl font-black tracking-tight font-['Outfit'] flex items-center gap-2">
                    🧭 {language === 'en' ? 'Guest Profile Zone' : 'ଗେଷ୍ଟ ପ୍ରୋଫାଇଲ୍ ଜୋନ୍'}
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {language === 'en' ? '100% Free Sandbox Previews' : '୧୦୦% ମାଗଣା ପ୍ରିଭ୍ୟୁ'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuestDashboard(false)}
                className="px-4 py-2 rounded-xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
              >
                {language === 'en' ? 'Exit Guest' : 'ଏକଜିଟ୍ ଗେଷ୍ଟ'} ➔
              </button>
            </div>

            {/* Subviews */}
            <div className="w-full max-w-4xl flex-1 flex flex-col justify-start">
              {activeSubView === 'home' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Mascot Speech greeting */}
                  <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-400">
                      <Sparkles size={160} />
                    </div>
                    <motion.div 
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0"
                    >
                      <img src="/gundulu-pointing-up.png" className="w-full h-full object-contain" alt="Gundulu" />
                    </motion.div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                        <h3 className="text-amber-400 font-black font-['Outfit'] text-sm sm:text-base tracking-wide uppercase">
                          {language === 'en' ? 'Namaskar from Gundulu!' : 'ଗୁଣ୍ଡୁଲୁର ନମସ୍କାର!'}
                        </h3>
                      </div>
                      <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
                        {language === 'en' 
                          ? "Welcome, friend! 🎒 I am Gundulu, your learning sister. Explore our three premium guest features without registering! Tap any card below to play a game, take a daily quiz challenge, or read chapter summaries!" 
                          : "ନମସ୍କାର ସାଙ୍ଗମାନେ! 🎒 ମୁଁ ଗୁଣ୍ଡୁଲୁ, ଆପଣଙ୍କର ପଢ଼ା ସାଥୀ। ଲଗଇନ୍ କିମ୍ବା ରଜିଷ୍ଟ୍ରେସନ୍ ନକରି ବିନା କୌଣସି ଅସୁବିଧାରେ ଆମ ତିନୋଟି ପ୍ରିମିୟମ୍ ବିଶେଷତା ଚେଷ୍ଟା କରନ୍ତୁ! ଖେଳିବା କିମ୍ବା ନୋଟ୍ସ ପଢ଼ିବା ପାଇଁ ତଳେ ଥିବା ଯେକୌଣସି କାର୍ଡ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ।"}
                      </p>
                    </div>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Daily MCQ */}
                    <div 
                      onClick={startPublicQuiz}
                      className="group p-6 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 flex flex-col items-start gap-4 cursor-pointer shadow-lg hover:shadow-emerald-950/20"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                        <Trophy size={22} />
                      </div>
                      <div>
                        <h4 className="text-white text-lg font-black font-['Outfit'] mb-1">
                          {language === 'en' ? 'Daily MCQ Challenge' : 'ଦୈନିକ MCQ ଚ୍ୟାଲେଞ୍ଜ୍'}
                        </h4>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">
                          {language === 'en' 
                            ? 'Test your knowledge with 5 fresh daily GK and Odisha culture questions generated by Gundulu AI.' 
                            : 'ଗୁଣ୍ଡୁଲୁ ଦ୍ଵାରା ପ୍ରସ୍ତୁତ ଦୈନିକ GK ଓ ଓଡ଼ିଶା କଲ୍ଚର୍ କୁଇଜ୍ ଖେଳନ୍ତୁ ଏବଂ ନିଜ ଜ୍ଞានକୁ ପରୀକ୍ଷା କରନ୍ତୁ।'}
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-auto">
                        {language === 'en' ? 'Play Challenge' : 'କୁଇଜ୍ ଖେଳନ୍ତୁ'} ➔
                      </span>
                    </div>

                    {/* Card 2: Bagha Cheli */}
                    <div 
                      onClick={() => setActiveSubView('game')}
                      className="group p-6 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/80 transition-all duration-300 flex flex-col items-start gap-4 cursor-pointer shadow-lg hover:shadow-amber-950/20"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                        <Gamepad2 size={22} />
                      </div>
                      <div>
                        <h4 className="text-white text-lg font-black font-['Outfit'] mb-1">
                          {language === 'en' ? 'Play Bagha Cheli' : 'ବାଘ ଛେଳି ଖେଳ'}
                        </h4>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">
                          {language === 'en' 
                            ? 'Play Odisha\'s famous traditional tiger-and-goat board game against Gundulu AI.' 
                            : 'ଓଡ଼ିଶାର ପ୍ରସିଦ୍ଧ ପାରମ୍ପରିକ ବୋର୍ଡ ଗେମ୍ "ବାଘ ଛେଳି" ଗୁଣ୍ଡୁଲୁ AI (କମ୍ପ୍ୟୁଟର) ସହିତ ଖେଳନ୍ତୁ।'}
                        </p>
                      </div>
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-auto">
                        {language === 'en' ? 'Start Game' : 'ଖେଳ ଆରମ୍ଭ କରନ୍ତୁ'} ➔
                      </span>
                    </div>

                    {/* Card 3: Class 1-10 Notes */}
                    <div 
                      onClick={() => {
                        setActiveSubView('notes');
                        setSelectedNotesGrade(10);
                      }}
                      className="group p-6 rounded-3xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all duration-300 flex flex-col items-start gap-4 cursor-pointer shadow-lg hover:shadow-cyan-950/20"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300">
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <h4 className="text-white text-lg font-black font-['Outfit'] mb-1">
                          {language === 'en' ? 'Odia Chapter Previews' : 'ଓଡ଼ିଆ ଅଧ୍ୟାୟ ନୋଟ୍ସ'}
                        </h4>
                        <p className="text-slate-400 text-xs leading-relaxed font-medium">
                          {language === 'en' 
                            ? 'Access the first chapter summaries of Odia medium subjects for Class 1 to Class 10 instantly.' 
                            : 'ଶ୍ରେଣୀ ୧ ରୁ ୧୦ ପର୍ଯ୍ୟନ୍ତ ଓଡ଼ିଆ ମାଧ୍ୟମ ସାହିତ୍ୟ ବହିର ପ୍ରଥମ ଅଧ୍ୟାୟ ନୋଟ୍ସ ଓ ସାରାଂଶ ପଢ଼ନ୍ତୁ।'}
                        </p>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform flex items-center gap-1 mt-auto">
                        {language === 'en' ? 'Read Notes' : 'ନୋଟ୍ସ ପଢ଼ନ୍ତୁ'} ➔
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* VIEW: Daily MCQ Quiz Runner */}
              {activeSubView === 'quiz' && (
                <div className="flex-1 flex flex-col items-center justify-start py-4">
                  {loadingQuiz ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="animate-spin text-emerald-400" size={48} />
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-wider animate-pulse">
                        {language === 'en' ? 'Gundulu AI is generating questions...' : 'ଗୁଣ୍ଡୁଲୁ AI ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ କରୁଛି...'}
                      </p>
                    </div>
                  ) : quizFinished ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full max-w-xl p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-cyan-500" />
                      <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto shadow-lg">
                        🏆
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-white text-2xl font-black font-['Outfit']">
                          {language === 'en' ? 'Quiz Completed!' : 'କୁଇଜ୍ ସମ୍ପୂର୍ଣ୍ଣ ହେଲା!'}
                        </h3>
                        <p className="text-slate-400 font-medium text-sm">
                          {language === 'en' ? 'You completed today\'s GK Challenge!' : 'ଆପଣ ଆଜିର ଦୈନିକ କୁଇଜ୍ ସମ୍ପୂର୍ଣ୍ଣ କରିଛନ୍ତି!'}
                        </p>
                      </div>
                      <div className="py-4 px-6 rounded-2xl bg-slate-950/80 border border-slate-800 w-fit mx-auto">
                        <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">
                          {language === 'en' ? 'Your Score' : 'ଆପଣଙ୍କ ସ୍କୋର'}
                        </span>
                        <span className="text-white text-3xl font-black">
                          {quizCorrectCount} / {quizQuestions.length}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                        {quizCorrectCount === quizQuestions.length
                          ? (language === 'en' ? 'Outstanding! Perfect score!' : 'ଚମତ୍କାର! ସମସ୍ତ ଉତ୍ତର ସଠିକ୍ ହୋଇଛି।')
                          : (language === 'en' ? 'Great effort! Keep practicing every day.' : 'ଉତ୍ତମ ଚେଷ୍ଟା! ପ୍ରତିଦିନ ଅଭ୍ୟାସ ଜାରି ରଖନ୍ତୁ।')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveSubView('home')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-emerald-950/50 cursor-pointer"
                      >
                        {language === 'en' ? 'Back to Guest Hub' : 'ଗେଷ୍ଟ ହବ୍‌କୁ ଫେରନ୍ତୁ'}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-2xl space-y-6"
                    >
                      {/* Quiz Progress Header */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                        <span>{language === 'en' ? 'General Knowledge Challenge' : 'ସାଧାରଣ ଜ୍ଞାନ ଚ୍ୟାଲେଞ୍ଜ୍'}</span>
                        <span>
                          {language === 'en' ? 'Question' : 'ପ୍ରଶ୍ନ'} {currentQuizIdx + 1} / {quizQuestions.length}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${((currentQuizIdx) / quizQuestions.length) * 100}%` }}
                        />
                      </div>

                      {/* Question Card */}
                      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
                        <h3 className="text-white text-lg sm:text-xl font-bold leading-relaxed">
                          {quizQuestions[currentQuizIdx]?.question}
                        </h3>

                        {/* Options */}
                        <div className="grid grid-cols-1 gap-3">
                          {quizQuestions[currentQuizIdx]?.options?.map((opt: string) => {
                            const isSelected = selectedQuizOption === opt;
                            const isCorrectAnswer = opt === (quizQuestions[currentQuizIdx]?.correct_answer || quizQuestions[currentQuizIdx]?.correctAnswer);
                            
                            let btnStyle = "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-950 hover:border-slate-700";
                            if (quizSubmitted) {
                              if (isCorrectAnswer) {
                                btnStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
                              } else if (isSelected) {
                                btnStyle = "bg-red-500/10 border-red-500/40 text-red-400";
                              } else {
                                btnStyle = "bg-slate-950/20 border-slate-900 text-slate-600 opacity-60";
                              }
                            } else if (isSelected) {
                              btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]";
                            }

                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={quizSubmitted}
                                onClick={() => setSelectedQuizOption(opt)}
                                className={`w-full p-4 rounded-2xl text-left border text-sm font-semibold transition-all cursor-pointer ${btnStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {/* Feedback & Explanation */}
                        {quizSubmitted && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
                          >
                            <div className="flex items-center gap-2">
                              {selectedQuizOption === (quizQuestions[currentQuizIdx]?.correct_answer || quizQuestions[currentQuizIdx]?.correctAnswer) ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span className="text-emerald-400 font-black text-xs uppercase tracking-wider">
                                    {language === 'en' ? 'Correct!' : 'ସଠିକ୍ ଉତ୍ତର!'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-red-400" />
                                  <span className="text-red-400 font-black text-xs uppercase tracking-wider">
                                    {language === 'en' ? 'Incorrect' : 'ଭୁଲ୍ ଉତ୍ତର'}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
                              {quizQuestions[currentQuizIdx]?.explanation}
                            </p>
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="pt-2">
                          {!quizSubmitted ? (
                            <button
                              type="button"
                              disabled={!selectedQuizOption}
                              onClick={() => {
                                const isCorrect = selectedQuizOption === (quizQuestions[currentQuizIdx]?.correct_answer || quizQuestions[currentQuizIdx]?.correctAnswer);
                                if (isCorrect) setQuizCorrectCount(prev => prev + 1);
                                setQuizSubmitted(true);
                              }}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-colors cursor-pointer"
                            >
                              {language === 'en' ? 'Submit Answer' : 'ଉତ୍ତର ଦିଅନ୍ତୁ'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (currentQuizIdx < quizQuestions.length - 1) {
                                  setCurrentQuizIdx(prev => prev + 1);
                                  setSelectedQuizOption(null);
                                  setQuizSubmitted(false);
                                } else {
                                  setQuizFinished(true);
                                  // Trigger confetti for completion
                                  confetti({
                                    particleCount: 80,
                                    spread: 60,
                                    origin: { y: 0.6 }
                                  });
                                }
                              }}
                              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-colors cursor-pointer"
                            >
                              {currentQuizIdx < quizQuestions.length - 1 
                                ? (language === 'en' ? 'Next Question' : 'ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ') 
                                : (language === 'en' ? 'Finish Quiz' : 'କୁଇଜ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ')}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* VIEW: Bagha Cheli Game */}
              {activeSubView === 'game' && (
                <div className="flex-1 flex flex-col justify-start">
                  <BaghChheliGame 
                    language={language} 
                    user={{ name: language === 'en' ? 'Guest Student' : 'ଅତିଥି ଛାତ୍ର', points: 0, uid: 'guest' }}
                    onBack={() => setActiveSubView('home')} 
                  />
                </div>
              )}

              {/* VIEW: Class 1-10 Notes Reader */}
              {activeSubView === 'notes' && (
                <div className="flex-1 flex flex-col justify-start space-y-6">
                  {/* Class tabs selector */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(grade => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => setSelectedNotesGrade(grade)}
                        className={`px-4 py-2 rounded-xl border font-bold text-xs uppercase tracking-wider flex-shrink-0 transition-all cursor-pointer ${
                          selectedNotesGrade === grade
                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        Class {grade}
                      </button>
                    ))}
                  </div>

                  {/* Notes Reader content */}
                  {(() => {
                    const noteKey = `class${selectedNotesGrade}odia`;
                    const noteData = previewDatabase[noteKey];

                    return (
                      <motion.div
                        key={selectedNotesGrade}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 max-h-[550px] overflow-y-auto"
                      >
                        <div className="border-b border-slate-800 pb-4">
                          <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black text-cyan-400 uppercase tracking-wider">
                            📖 {language === 'en' ? `Class ${selectedNotesGrade} Odia Notes` : `ଶ୍ରେଣୀ ${selectedNotesGrade} ଓଡ଼ିଆ ସାହିତ୍ୟ`}
                          </span>
                          <h2 className="text-white text-lg sm:text-2xl font-black font-['Outfit'] mt-3 leading-tight">
                            {noteData?.title}
                          </h2>
                          <p className="text-slate-400 text-xs mt-1.5 font-medium">
                            {noteData?.description}
                          </p>
                        </div>

                        {/* Markdown Reader Body */}
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-medium space-y-4">
                          <ReactMarkdown>{noteData?.content}</ReactMarkdown>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
