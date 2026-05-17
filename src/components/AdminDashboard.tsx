import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Brain,
  CreditCard,
  Bell,
  Settings,
  Users,
  Library,
  Plus,
  Trash2,
  XCircle,
  LogOut,
  LayoutDashboard,
  Youtube,
  ListChecks,
  Menu,
  X,
  FileText,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Trophy,
  Search,
  HelpCircle,
  Edit2,
  Sparkles,
  ArrowLeft,
  Rocket,
  Book,
  Edit,
  Upload,
  Image,
  File,
  Download,
  Bot,
  Lock,
  Link2,
  Eye,
  Zap,
  Info,
  Globe,
  Shield,
  Activity,
  PieChart,
  ExternalLink,
  RefreshCw,
  Flag,
  Monitor,
} from 'lucide-react';
// import { translateToBilingual } from '../services/translationService';
import { motion, AnimatePresence } from 'motion/react';
// import { CustomSelect } from './CustomSelect';
import { db as firestore, auth, storage, handleFirestoreError, OperationType, onAuthStateChanged } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  limit,
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

import { translations } from '../translations';
import { Chapter, DailyMcq, VideoOption } from '../types';
import { DailyMcqTab } from './admin/DailyMcqTab';
import { LiveSupportTab } from './admin/LiveSupportTab';
import {
  translateContent,
  generateChapterContent,
  generateTestContent,
  importPlaylistContent,
  generateCurriculum,
  generateTestQuestions,
  gradeSubjectiveAnswer
} from '../services/aiService';
import { joinSupportSession, sendRemoteCommand, updatePointer, endSupportSession } from '../services/supportService';

type AdminTab = 'dashboard' | 'content' | 'monthly_tests' | 'daily_mcqs' | 'textbooks' | 'ai_usage' | 'payments' | 'notifications' | 'settings' | 'production_setup' | 'students' | 'subscriptions' | 'support' | 'user_locks' | 'digital_library_upload';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const DEFAULT_GUNDULU_PROMPT = `Persona: Gundulu, the Wise Little Brother
Identity:
- You are Gundulu, a shining marble-like little companion.
- You are learning Odia with the student, not acting like a strict teacher.
- Keep mistakes soft and cute when needed, but always guide the student correctly.

Core Voice:
- High-pitched, energetic, curious, and warm.
- Use conversational openers like: "Acha...", "Hela...", "Bujhilu...".
- Avoid heavy Sarkari Odia words (example: use "dia" or "dianatu", avoid "pradanakarantu").

Age Adaptation:
1) Class 1 to 5: Gapa Sathi (Story Buddy)
- Use very short sentences.
- Use natural Odia-English mix where helpful (example: "Science bishaya ti khub interesting!").
- Use playful examples and simple daily-life references.

2) Class 6 to 10: Tech-Guru Study Partner
- Sound smarter and logic-first, like a study partner.
- Use standard Odia with simple sentence structure.
- For difficult concepts, go step-by-step and reassure often.

Misunderstanding Recovery (Pachari-Bujhiba Loop):
- Never say generic "Error" to the student.
- If intent is unclear, respond like:
  "Tikie raho! Mu bodhe bhul bujhilu. Tame ki [Topic] bishayare kahucha? Out-te thare alga bhabare kahibaki?"
- If user message is in Odia, detect embedded English keywords (like "Photosynthesis", "Equation") to infer topic.

Smooth Rules:
- Never use dollar-sign math formatting ($...$) in chat.
- Present math in plain text and clean numbers so students can copy easily.
- Keep Gundulu name/dialogue with soft da sound preference.
- Prefer simple local words lightly (example: "Bhala" over "Uttama", "Khusi" over "Anandita").

Conversation Style:
- Start with a friendly greeting.
- Keep responses concise and voice-friendly.
- Ask confirmation after explanation: "Bujhila ta?" or "Au thare bujhei debi ki?"
- Be encouraging, never shaming.

Sample tone for Class 1-5:
"Acha, tame janichha? Gachha mane bi nishwasu nienti! Chal, ame boi-ru dekhiba kemiti."

Sample tone for Class 6-10:
"Ei concept-ta tikie tricky, kintu chinta karani. Mu achhi paraka! Chal, step-by-step solve kariba."`;

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [supportSubTab, setSupportSubTab] = useState<'tickets' | 'remote'>('tickets');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    aiQuestionsToday: 0
  });

  const [content, setContent] = useState<any[]>([]);
  const [monthlyTests, setMonthlyTests] = useState<any[]>([]);
  const [dailyMcqs, setDailyMcqs] = useState<DailyMcq[]>([]);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [allSubscriptions, setAllSubscriptions] = useState<Record<string, any>>({});
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [userLocks, setUserLocks] = useState<any[]>([]);
  const [lockSearchQuery, setLockSearchQuery] = useState('');
  const [aiLogFilter, setAiLogFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [editingLock, setEditingLock] = useState<any>(null);
  const [newLockClass, setNewLockClass] = useState('');
  const [newLockBoard, setNewLockBoard] = useState('');
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [gunduluPromptDraft, setGunduluPromptDraft] = useState(DEFAULT_GUNDULU_PROMPT);
  const [privateSettings, setPrivateSettings] = useState<any>({});
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const isPromptDirtyRef = useRef(false);

  // Library Manager Upload States
  const [libClassFilter, setLibClassFilter] = useState('class10');
  const [libSubjectFilter, setLibSubjectFilter] = useState('math');
  const [isLibModalOpen, setIsLibModalOpen] = useState(false);
  const [libEditingChapter, setLibEditingChapter] = useState<any | null>(null);
  const [libFormTitle, setLibFormTitle] = useState('');
  const [libFormClass, setLibFormClass] = useState('class10');
  const [libFormSubject, setLibFormSubject] = useState('math');
  const [libFormNotes, setLibFormNotes] = useState('');
  const [libFormPdfUrl, setLibFormPdfUrl] = useState('');
  const [pdfUploadProgress, setPdfUploadProgress] = useState<number | null>(null);
  const [libFormCoverUrl, setLibFormCoverUrl] = useState('');
  const [libFormVideoUrl, setLibFormVideoUrl] = useState('');
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(null);
  const [isLibSaving, setIsLibSaving] = useState(false);

  // Remote Support States
  const [remoteCode, setRemoteCode] = useState('');
  const [isRemoteActive, setIsRemoteActive] = useState(false);
  const [remoteSession, setRemoteSession] = useState<any>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const availableDailyMcqSubjects = Object.entries(translations.en.subjects || {});
  const normalizedDailyMcqRotation = Array.isArray(systemSettings.dailyMcqSubjectRotation)
    ? systemSettings.dailyMcqSubjectRotation.map((item: string) => String(item || '').trim().toLowerCase()).filter(Boolean)
    : String(systemSettings.dailyMcqSubjectRotation || '')
      .split(',')
      .map((item: string) => item.trim().toLowerCase())
      .filter(Boolean);

  const updateDailyMcqRotation = (subjects: string[]) => {
    setSystemSettings({
      ...systemSettings,
      dailyMcqSubjectRotation: subjects,
    });
  };

  const toggleDailyMcqRotationSubject = (subjectKey: string) => {
    if (normalizedDailyMcqRotation.includes(subjectKey)) {
      updateDailyMcqRotation(normalizedDailyMcqRotation.filter((item: string) => item !== subjectKey));
      return;
    }

    updateDailyMcqRotation([...normalizedDailyMcqRotation, subjectKey]);
  };


  const [isAddingTest, setIsAddingTest] = useState(false);
  const [newTest, setNewTest] = useState<any>({
    title: '',
    chapterIds: [],
    questions: [],
    status: 'draft',
    class: 'class5',
    subject: 'math',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    scheduledDate: new Date().toISOString().split('T')[0],
    language: 'or',
    totalMarks: 0
  });

  const [bulkTestQuestions, setBulkTestQuestions] = useState('');
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [selectedTestIdForSubmissions, setSelectedTestIdForSubmissions] = useState<string | null>(null);
  const [testSubmissions, setTestSubmissions] = useState<any[]>([]);
  const [filterPending, setFilterPending] = useState(false);
  const [isAddingTextbook, setIsAddingTextbook] = useState(false);
  const [editingTextbookId, setEditingTextbookId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTextbook, setNewTextbook] = useState<any>({
    class: 'class5',
    board: '',
    subject: '',
    title: '',
    download_url: '',
    driveFileId: '',
    driveUrl: '',
    thumbnail_url: ''
  });

  const extractDriveFileId = (value: string) => {
    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    const directMatch = rawValue.match(/^[a-zA-Z0-9_-]{20,}$/);
    if (directMatch) return directMatch[0];
    const patterns = [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /folders\/([a-zA-Z0-9_-]+)/];
    for (const pattern of patterns) {
      const match = rawValue.match(pattern);
      if (match?.[1]) return match[1];
    }
    return rawValue;
  };

  const parseLogTimestamp = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value?.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date?.getTime?.()) ? null : date;
    }
    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
      const millis = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const isTodayDate = (date: Date | null): boolean => {
    if (!date) return false;
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const uploadViaServer = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-textbook');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const payload = JSON.parse(xhr.responseText || '{}');
            const url = payload?.url;
            if (!url) {
              reject(new Error('Upload response missing URL'));
              return;
            }

            setNewTextbook((prev: any) => ({ ...prev, download_url: url }));
            resolve(url);
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Invalid upload response'));
          }
          return;
        }

        reject(new Error(`Server upload failed (${xhr.status})`));
      };

      xhr.onerror = () => reject(new Error('Server upload request failed'));

      const formData = new FormData();
      formData.append('file', file, file.name);
      xhr.send(formData);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);

    const extension = file.name.split('.').pop() || 'bin';

    const sanitizedName = `${Date.now()}_pdf.${extension}`;
    const storageRef = ref(storage, `textbooks/${sanitizedName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        async (error) => {
          console.error("Upload error:", error);

          const msg = String(error?.message || '').toLowerCase();
          const code = String(error?.code || '').toLowerCase();
          const isBrowserBlocked =
            msg.includes('net::err_failed') ||
            msg.includes('cors') ||
            msg.includes('status 0') ||
            code.includes('storage/unknown') ||
            code.includes('unknown');

          if (isBrowserBlocked) {
            try {
              showNotification('Direct upload blocked, retrying via server...');
              const url = await uploadViaServer(file);
              setUploadingFile(false);
              showNotification('PDF uploaded successfully');
              resolve(url);
              return;
            } catch (serverErr: any) {
              console.error('Server upload fallback failed:', serverErr);
              showNotification(`Upload failed: ${serverErr?.message || error?.message || 'Unknown error'}`, 'error');
              setUploadingFile(false);
              reject(serverErr);
              return;
            }
          }

          showNotification(`Upload failed: ${error.message}`, "error");
          setUploadingFile(false);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setNewTextbook((prev: any) => ({ ...prev, download_url: downloadURL }));
          setUploadingFile(false);
          showNotification('PDF uploaded successfully');
          resolve(downloadURL);
        }
      );
    });
  };

  const [user, setUser] = useState(auth.currentUser);
  console.log("Debug: AdminDashboard rendering, user:", user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsub;
  }, []);

  useEffect(() => {
    console.log("Debug: useEffect running, user:", user);

    console.log("Debug: Setting up listeners");
    // Real-time stats and data
    const unsubChapters = onSnapshot(collection(firestore, 'chapters'), (snapshot) => {
      console.log("Debug: chapters snapshot received, count:", snapshot.size);
      setContent(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore Chapters onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for chapters.", "error");
      }
    });

    const unsubTx = onSnapshot(collection(firestore, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
    }, (err) => {
      console.error("Firestore Transactions onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for transactions.", "error");
      }
    });

    const unsubPayments = onSnapshot(collection(firestore, 'payments'), (snapshot) => {
      const pms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(pms);
    }, (err) => {
      console.error("Firestore Payments onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for payments.", "error");
      }
    });

    const unsubAi = onSnapshot(collection(firestore, 'tutor_queries'), (snapshot) => {
      const logs = snapshot.docs.map(doc => {
        const raw = doc.data() as any;
        const parsedTimestamp = parseLogTimestamp(raw.timestamp || raw.createdAt || raw.updatedAt);
        return {
          id: doc.id,
          ...raw,
          parsedTimestamp
        };
      });

      const sortedLogs = logs.sort((a: any, b: any) => {
        const aTime = a.parsedTimestamp ? a.parsedTimestamp.getTime() : 0;
        const bTime = b.parsedTimestamp ? b.parsedTimestamp.getTime() : 0;
        return bTime - aTime;
      });

      setAiLogs(sortedLogs);
      setStats(prev => ({
        ...prev,
        aiQuestionsToday: sortedLogs.filter((l: any) => isTodayDate(l.parsedTimestamp)).length
      }));
    }, (err) => {
      console.error("Firestore AI Usage onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for AI usage logs.", "error");
        handleFirestoreError(err, OperationType.GET, 'tutor_queries');
      }
    });
    const unsubNotifs = onSnapshot(collection(firestore, 'notifications'), (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore Notifications onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for notifications.", "error");
      }
    });

    const unsubSettings = onSnapshot(doc(firestore, 'system_settings', 'config'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSystemSettings(data);
        if (!isPromptDirtyRef.current) {
          setGunduluPromptDraft(data?.gunduluPrompt || DEFAULT_GUNDULU_PROMPT);
        }
      }
    }, (err) => {
      console.error("Firestore Settings onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for system settings.", "error");
      }
    });
    const unsubTests = onSnapshot(collection(firestore, 'monthly_tests'), (snapshot) => {
      setMonthlyTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore Monthly Tests onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for monthly tests.", "error");
      }
    });

    const unsubDailyMcqs = onSnapshot(collection(firestore, 'daily_mcqs'), (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((left: any, right: any) => {
          const leftDate = new Date(left.activeDate || 0).getTime();
          const rightDate = new Date(right.activeDate || 0).getTime();
          return rightDate - leftDate;
        }) as DailyMcq[];
      setDailyMcqs(data);
    }, (err) => {
      console.error("Firestore Daily MCQs onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for daily MCQs.", "error");
      }
    });

    const unsubPrivateSettings = onSnapshot(doc(firestore, 'settings', 'private'), (doc) => {
      if (doc.exists()) setPrivateSettings(doc.data());
    }, (err) => {
      console.error("Firestore Private Settings onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for private settings.", "error");
      }
    });
    const unsubTextbooks = onSnapshot(collection(firestore, 'textbooks'), (snapshot) => {
      setTextbooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore Textbooks onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for textbooks.", "error");
      }
    });
    const unsubStudents = onSnapshot(collection(firestore, 'users'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore Students onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for students.", "error");
      }
    });

    const unsubUserLocks = onSnapshot(collection(firestore, 'user_locks'), (snapshot) => {
      setUserLocks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore User Locks onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for user locks.", "error");
      }
    });

    const unsubAllSubscriptions = onSnapshot(collection(firestore, 'subscriptions'), (snapshot) => {
      const subs: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        subs[doc.id] = doc.data();
      });
      setAllSubscriptions(subs);
    }, (err) => {
      console.error("Firestore Subscriptions onSnapshot Error:", err);
    });

    const unsubSupport = onSnapshot(query(collection(firestore, 'support_tickets'), orderBy('createdAt', 'desc')), (snapshot) => {
      setSupportTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore Support Tickets onSnapshot Error:", err);
    });

    return () => {
      console.log("Debug: Cleaning up listeners");
      unsubChapters();
      unsubTx();
      unsubPayments();
      unsubAi();
      unsubNotifs();
      unsubSettings();
      unsubTests();
      unsubDailyMcqs();
      unsubPrivateSettings();
      unsubTextbooks();
      unsubStudents();
      unsubAllSubscriptions();
      unsubUserLocks();
      unsubSupport();
    };
  }, [user]);

  // Combined stats calculation
  useEffect(() => {
    const txRevenue = transactions.reduce((acc, curr: any) => acc + (curr.amount || 0), 0);
    const successPayments = payments.filter(p => p.status === 'success');
    const paymentRevenue = successPayments.reduce((acc, curr: any) => acc + (curr.amount || 0), 0);

    setStats(prev => ({
      ...prev,
      totalRevenue: txRevenue + paymentRevenue
    }));
  }, [transactions, payments]);

  const [bulkIdentifiers, setBulkIdentifiers] = useState('');
  const [bulkPlan, setBulkPlan] = useState<'monthly' | 'annual' | 'lifetime'>('annual');

  const handleBulkGrant = async () => {
    if (!bulkIdentifiers.trim()) {
      showNotification("Please enter emails or phone numbers", "error");
      return;
    }

    const ids = bulkIdentifiers.split('\n').map(id => id.trim()).filter(id => id);
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        let userQuery;
        if (id.includes('@')) {
          userQuery = query(collection(firestore, 'users'), where('email', '==', id.toLowerCase()));
        } else {
          // Clean phone number
          const cleanPhone = id.replace(/\D/g, '');
          const phoneVariants = [cleanPhone];
          if (!cleanPhone.startsWith('91')) {
            phoneVariants.push(`91${cleanPhone}`);
          }
          if (!cleanPhone.startsWith('+')) {
            phoneVariants.push(`+${cleanPhone}`);
            if (!cleanPhone.startsWith('91')) {
              phoneVariants.push(`+91${cleanPhone}`);
            }
          }
          userQuery = query(collection(firestore, 'users'), where('phoneNumber', 'in', phoneVariants));
        }

        const userSnap = await getDocs(userQuery);
        if (userSnap.empty) {
          console.warn(`User not found for: ${id}`);
          failCount++;
          continue;
        }

        const userId = userSnap.docs[0].id;
        const subDocRef = doc(firestore, 'subscriptions', userId);
        const expiresAt = bulkPlan === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : bulkPlan === 'annual'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

        await setDoc(subDocRef, {
          active: true,
          plan: bulkPlan,
          expires_at: Timestamp.fromDate(expiresAt),
          updatedAt: serverTimestamp(),
          identifier: id // Store identifier for easy display
        }, { merge: true });
        successCount++;
      } catch (err) {
        console.error(`Failed to grant for ${id}:`, err);
        failCount++;
      }
    }
    setLoading(false);
    showNotification(`Bulk grant complete: ${successCount} success, ${failCount} failed.`);
    setBulkIdentifiers('');
    fetchRecentSubscriptions();
  };

  const [recentSubscriptions, setRecentSubscriptions] = useState<any[]>([]);

  const fetchRecentSubscriptions = async () => {
    try {
      const q = query(
        collection(firestore, 'subscriptions'),
        orderBy('updatedAt', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      setRecentSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching recent subscriptions:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchRecentSubscriptions();
    }
  }, [activeTab]);

  const renderSubscriptions = () => (
    <div className="space-y-6">
      <div className="glass-card p-8 rounded-[2.5rem]">
        <h2 className="text-2xl font-bold text-white mb-6">Bulk Subscription Grant</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Enter Emails or Phone Numbers (one per line)
            </label>
            <textarea
              value={bulkIdentifiers}
              onChange={(e) => setBulkIdentifiers(e.target.value)}
              placeholder="example@gmail.com&#10;8926118509"
              className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-400 mb-2">Plan Type</label>
              <select
                value={bulkPlan}
                onChange={(e) => setBulkPlan(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="monthly">Monthly (30 Days)</option>
                <option value="annual">Annual (1 Year)</option>
                <option value="lifetime">Lifetime (100 Years)</option>
              </select>
            </div>
            <button
              onClick={handleBulkGrant}
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Grant Subscriptions'}
            </button>
          </div>

          <div className="pt-6 border-t border-white/10">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setBulkIdentifiers(`gyanaloka.panda@gmail.com\ngyanapd.ram@gmail.com\n8926118509\n8457811227\n6370487877`);
                  setBulkPlan('lifetime');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-all"
              >
                Load Requested Accounts (Lifetime)
              </button>
              <button
                onClick={() => {
                  setBulkIdentifiers(`gyanaloka.panda@gmail.com\ngyanapd.ram@gmail.com\n8926118509\n8457811227\n6370487877`);
                  setBulkPlan('monthly');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-all"
              >
                Load Requested Accounts (Monthly)
              </button>
              <button
                onClick={() => {
                  setBulkIdentifiers(`gyanaloka.panda@gmail.com\ngyanapd.ram@gmail.com\n8926118509\n8457811227\n6370487877`);
                  setBulkPlan('annual');
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-all"
              >
                Load Requested Accounts (Annual)
              </button>

            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem]">
        <h2 className="text-2xl font-bold text-white mb-6">Recent Subscriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4">User ID</th>
                <th className="pb-4">Plan</th>
                <th className="pb-4">Expires At</th>
                <th className="pb-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSubscriptions.length === 0 ? (
                <tr className="border-b border-white/5">
                  <td colSpan={4} className="py-8 text-center text-slate-500 italic">
                    No recent subscriptions found.
                  </td>
                </tr>
              ) : (
                recentSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{sub.identifier || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{sub.id}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${sub.plan === 'lifetime' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {sub.plan}
                      </span>
                    </td>
                    <td className="py-4 text-sm">
                      <p className="text-xs text-white font-black tracking-tight">{sub.planId}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Expires: {parseLogTimestamp(sub.expires_at)?.toLocaleDateString() || 'N/A'}
                      </p>
                    </td>
                    <td className="py-4">
                      <span className={`flex items-center gap-1 text-xs ${sub.active ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${sub.active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        {sub.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const SidebarNavigation = () => (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[65] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-950/95 lg:bg-slate-950/40 backdrop-blur-3xl border-r border-white/5 z-[70] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0 lg:w-24'}`}
        onMouseEnter={() => { if (window.innerWidth >= 1024) setIsSidebarOpen(true); }}
        onMouseLeave={() => { if (window.innerWidth >= 1024) setIsSidebarOpen(false); }}
      >
        <div className="flex flex-col h-full py-8">
          {/* Brand */}
          <div className="px-6 mb-12 flex items-center gap-4 overflow-hidden">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <motion.div
              animate={{ opacity: isSidebarOpen ? 1 : 0, x: isSidebarOpen ? 0 : -20 }}
              className="whitespace-nowrap"
            >
              <h1 className="text-xl font-black text-white tracking-tighter">UTKAL <span className="text-emerald-500">ADMIN</span></h1>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Core v2.0</p>
            </motion.div>
          </div>

          {/* Navigation Groups */}
          <nav className="flex-1 px-4 space-y-8 custom-scrollbar overflow-y-auto">
            {[
              {
                title: 'Command',
                items: [
                  { id: 'dashboard', label: 'Overview', icon: Activity },
                  { id: 'ai_usage', label: 'AI Usage Logs', icon: Brain },
                  { id: 'daily_mcqs', label: 'Daily MCQs', icon: Zap },
                ]
              },
              {
                title: 'Vault',
                items: [
                  { id: 'content', label: 'Chapters', icon: BookOpen },
                  { id: 'digital_library_upload', label: 'Library Manager', icon: Library },
                  { id: 'textbooks', label: 'Textbooks', icon: Book },
                  { id: 'monthly_tests', label: 'Monthly Tests', icon: ClipboardList },
                ]
              },
              {
                title: 'Registry',
                items: [
                  { id: 'students', label: 'Students', icon: Users },
                  { id: 'subscriptions', label: 'Subscriptions', icon: Shield },
                  { id: 'payments', label: 'Payments', icon: CreditCard },
                  { id: 'user_locks', label: 'User Locks', icon: Lock },
                ]
              },
              {
                title: 'System',
                items: [
                  { id: 'notifications', label: 'Broadcasts', icon: Bell },
                  { id: 'settings', label: 'Settings', icon: Settings },
                  { id: 'support', label: 'Support Tickets', icon: HelpCircle },
                ]
              }
            ].map((group, idx) => (
              <div key={idx} className="space-y-2">
                {isSidebarOpen && (
                  <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">{group.title}</p>
                )}
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id as AdminTab);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeGlow"
                          className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_15px_#10b981]"
                        />
                      )}
                      <item.icon size={20} className={`shrink-0 ${isActive ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'group-hover:scale-110 transition-transform'}`} />
                      <motion.span
                        animate={{ opacity: isSidebarOpen ? 1 : 0, x: isSidebarOpen ? 0 : -10 }}
                        className="text-xs font-bold whitespace-nowrap tracking-tight"
                      >
                        {item.label}
                      </motion.span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-4 pt-8 mt-auto border-t border-white/5">
            <button
              onClick={() => onExit()}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all group"
            >
              <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              <motion.span
                animate={{ opacity: isSidebarOpen ? 1 : 0 }}
                className="text-xs font-black uppercase tracking-widest"
              >
                Terminate
              </motion.span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-amber-400', glow: 'rgba(251, 191, 36, 0.15)' },
          { label: 'AI Queries', value: stats.aiQuestionsToday, icon: Brain, color: 'text-emerald-400', glow: 'rgba(16, 185, 129, 0.15)' },
          { label: 'Conversion', value: '12.4%', icon: Users, color: 'text-indigo-400', glow: 'rgba(99, 102, 241, 0.15)' },
          { label: 'AI Voice', value: '124m', icon: Bot, color: 'text-blue-400', glow: 'rgba(59, 130, 246, 0.15)' },
          { label: 'Sentiment', value: '88%', icon: Sparkles, color: 'text-purple-400', glow: 'rgba(168, 85, 247, 0.15)' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="glass-card glass-card-hover p-6 rounded-[2rem] relative overflow-hidden group"
            style={{ '--glow-color': stat.glow } as any}
          >
            <div className="stat-card-glow" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                <stat.icon className={stat.color} size={22} />
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity duration-500">Live Data</div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight relative z-10 mb-1 group-hover:translate-x-1 transition-transform duration-500">
              {stat.value}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest relative z-10 group-hover:text-slate-300 transition-colors">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card neon-border p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Sparkles size={28} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Quick AI Test Generator</h3>
        </div>
        <p className="text-slate-400 text-sm mb-8 relative z-10 font-medium">Generate a complete monthly test with AI in seconds. Just select the class and subject.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
          <select
            value={newTest.class}
            onChange={(e) => setNewTest({ ...newTest, class: e.target.value })}
            className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
          >
            {Object.entries(translations['en'].classes).map(([key, label]) => (
              <option key={key} value={key}>{label as string}</option>
            ))}
          </select>
          <select
            value={newTest.subject}
            onChange={(e) => setNewTest({ ...newTest, subject: e.target.value })}
            className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
          >
            {Object.entries(translations['en'].subjects).map(([key, label]) => (
              <option key={key} value={key}>{label as string}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setActiveTab('monthly_tests');
              setIsAddingTest(true);
              handleGenerateTestWithAI();
            }}
            disabled={isGeneratingTestAI}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white rounded-2xl px-6 py-3 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg border border-emerald-500/50"
          >
            {isGeneratingTestAI ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Rocket size={20} />}
            Generate Now
          </button>
        </div>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="flex items-center gap-4 mb-4 relative z-10">
          <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Rocket size={28} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Restore Deleted Chapters</h3>
        </div>
        <p className="text-slate-400 text-sm mb-8 relative z-10 font-medium">If you accidentally deleted chapters, you can use AI to re-generate the standard curriculum for all classes (Play to Class 10).</p>
        <button
          onClick={() => setActiveTab('production_setup')}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-2xl px-8 py-4 font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg border border-indigo-500/50 relative z-10"
        >
          <Sparkles size={20} />
          Go to Production Setup
        </button>
      </div>
    </div>
  );

  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationAudience, setNotificationAudience] = useState('all');

  const handleBroadcast = async () => {
    if (!notificationMessage.trim()) {
      showNotification("Please enter a message.", 'error');
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(firestore, 'notifications'), {
        message: notificationMessage,
        audience: notificationAudience,
        createdAt: serverTimestamp()
      });

      // Dispatch real-time native Web Push to active student devices
      try {
        await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: notificationMessage,
            audience: notificationAudience
          })
        });
      } catch (pushErr) {
        console.warn("Database notice sent, but push dispatch failed:", pushErr);
      }

      showNotification("Notification broadcasted successfully!");
      setNotificationMessage('');
    } catch (err: any) {
      console.error("Broadcast Error:", err);
      showNotification("Failed to broadcast: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [isEditingChapter, setIsEditingChapter] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingTestAI, setIsGeneratingTestAI] = useState(false);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [importLog, setImportLog] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [adminSubjectFilter, setAdminSubjectFilter] = useState('all');
  const [adminClassFilter, setAdminClassFilter] = useState('all');
  const [isOtherSubject, setIsOtherSubject] = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [isOtherTestSubject, setIsOtherTestSubject] = useState(false);
  const [customTestSubject, setCustomTestSubject] = useState('');
  const [newChapter, setNewChapter] = useState({
    title: '',
    order: 0,
    videoUrl: '',
    teacherOrChannel: '',
    videos: [] as VideoOption[],
    notes: '',
    notesUrl: '',
    quizId: '',
    status: 'draft' as 'draft' | 'published',
    class: '',
    board: '',
    subject: '',
    language: 'or',
    quiz_questions: [],
    bulkQa: ''
  });

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Translate title and board (Replaced with direct assignment)
      const translatedTitle = newChapter.title;
      const translatedBoard = newChapter.board;

      const chapterData = {
        ...newChapter,
        videos: newChapter.videos.filter(v => v.url.trim() !== ''),
        title: typeof newChapter.title === 'object' ? (newChapter.title as any).en : newChapter.title,
        board: typeof newChapter.board === 'object' ? (newChapter.board as any).en : newChapter.board,
        createdAt: serverTimestamp()
      };

      if (isEditingChapter && editingChapterId) {
        try {
          await updateDoc(doc(firestore, 'chapters', editingChapterId), {
            ...chapterData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'chapters');
        }
        showNotification("Chapter updated successfully!");
        setIsEditingChapter(false);
        setEditingChapterId(null);
      } else {
        try {
          console.log("Debug: Reached addDoc block");
          console.log("Debug: Adding chapter to Firestore", chapterData);
          await addDoc(collection(firestore, 'chapters'), chapterData);
          console.log("Debug: Chapter added successfully");
        } catch (err) {
          console.error("Debug: Error adding chapter", err);
          handleFirestoreError(err, OperationType.CREATE, 'chapters');
        }
        showNotification("Chapter added successfully!");
      }

      setIsAddingChapter(false);
      setNewChapter({
        title: '',
        order: 0,
        videoUrl: '',
        teacherOrChannel: '',
        videos: [] as VideoOption[],
        notes: '',
        notesUrl: '',
        quizId: '',
        status: 'draft',
        class: '',
        board: '',
        subject: '',
        language: 'or',
        quiz_questions: [],
        bulkQa: ''
      });
    } catch (err: any) {
      console.error("Add/Edit Chapter Error:", err);
      showNotification("Failed to save chapter: " + err.message, 'error');
    }
  };

  const handleGenerateWithAI = async () => {
    if (!newChapter.title) {
      showNotification("Please enter a title first.", 'error');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const result = await generateChapterContent(
        newChapter.title,
        newChapter.subject,
        newChapter.language as 'en' | 'or'
      );

      setNewChapter(prev => ({
        ...prev,
        notes: result.notes
      }));

      showNotification("AI has generated the content for you! Please review it before saving.");
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      showNotification("Failed to generate content with AI: " + err.message, 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateTestWithAI = async () => {
    setIsGeneratingTestAI(true);
    try {
      let result;
      if (newTest.subject && newTest.class && newTest.month) {
        result = await generateTestQuestions(
          newTest.subject,
          newTest.class,
          `${newTest.month} ${newTest.year}`,
          newTest.language as 'en' | 'or'
        );
      } else {
        result = await generateTestContent(
          newTest.title,
          newTest.language as 'en' | 'or'
        );
      }

      setNewTest((prev: any) => {
        const totalMarks = result.questions.reduce((acc: number, q: any) => acc + (q.marks || 1), 0);
        return {
          ...prev,
          questions: result.questions,
          totalMarks
        };
      });

      showNotification("AI has generated the test questions for you! Please review them before saving.");
    } catch (err: any) {
      console.error("AI Test Generation Error:", err);
      showNotification("Failed to generate test with AI: " + err.message, 'error');
    } finally {
      setIsGeneratingTestAI(false);
    }
  };

  const handleBulkParseQuestions = () => {
    setIsParsingBulk(true);
    try {
      const lines = bulkTestQuestions.split('\n');
      const questions: any[] = [];
      let currentQ: any = null;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Pattern matching for [Marks] Q: Question
        const qMatch = trimmed.match(/^\[(\d+)\]\s*Q:\s*(.*)/i) || trimmed.match(/^Q:\s*(.*)/i);
        if (qMatch) {
          if (currentQ) questions.push(currentQ);
          const marks = qMatch.length === 3 ? parseInt(qMatch[1]) : 1;
          const question = qMatch.length === 3 ? qMatch[2] : qMatch[1];
          currentQ = {
            question,
            marks,
            type: marks === 1 ? 'mcq' : 'subjective',
            options: marks === 1 ? ['', '', '', ''] : [],
            correct_answer: '',
            hint: ''
          };
          return;
        }

        if (currentQ) {
          // Options pattern: A: text | B: text ...
          if (currentQ.type === 'mcq') {
            const optMatch = trimmed.match(/^([A-D]):\s*(.*)/i);
            if (optMatch) {
              const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
              currentQ.options[idx] = optMatch[2];
              return;
            }
          }

          // Answer pattern: Ans: text or Correct: text
          const ansMatch = trimmed.match(/^(Ans|Correct):\s*(.*)/i);
          if (ansMatch) {
            currentQ.correct_answer = ansMatch[2];
            return;
          }

          // Hint pattern: Hint: text
          const hintMatch = trimmed.match(/^Hint:\s*(.*)/i);
          if (hintMatch) {
            currentQ.hint = hintMatch[1];
            return;
          }
        }
      });

      if (currentQ) questions.push(currentQ);

      const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 0), 0);
      setNewTest((prev: any) => ({
        ...prev,
        questions: [...prev.questions, ...questions],
        totalMarks: (prev.totalMarks || 0) + totalMarks
      }));
      setBulkTestQuestions('');
      showNotification(`Successfully parsed ${questions.length} questions!`);
    } catch (err) {
      console.error("Bulk Parse Error:", err);
      showNotification("Failed to parse questions. Please check format.", "error");
    } finally {
      setIsParsingBulk(false);
    }
  };

  const handleImportPlaylist = async () => {
    if (!playlistUrl) {
      showNotification("Please enter a YouTube playlist URL.", 'error');
      return;
    }
    setIsImportingPlaylist(true);
    setImportLog(["Starting import..."]);

    try {
      const result = await importPlaylistContent(playlistUrl);
      const chapters = result.chapters;

      setImportLog(prev => [...prev, `Found ${chapters.length} chapters. Importing...`]);

      for (const chapter of chapters) {
        setImportLog(prev => [...prev, `Importing: ${chapter.title}...`]);

        // Save the chapter
        await addDoc(collection(firestore, 'chapters'), {
          title: { en: chapter.title, or: chapter.title },
          order: 0,
          videoUrl: `https://www.youtube.com/watch?v=${chapter.videoId}`,
          notes: '',
          quizId: '',
          status: 'draft',
          createdAt: serverTimestamp(),
          class: newChapter.class,
          board: newChapter.board,
          subject: newChapter.subject
        });
      }

      setImportLog(prev => [...prev, "Import completed successfully!"]);
      showNotification(`Successfully imported ${chapters.length} chapters!`);
    } catch (err: any) {
      console.error("Playlist Import Error:", err);
      setImportLog(prev => [...prev, `Error: ${err.message}`]);
      showNotification("Failed to import playlist: " + err.message, 'error');
    } finally {
      setIsImportingPlaylist(false);
    }
  };

  const getBoardKey = (board: string) => {
    if (!board) return 'odisha';
    const b = board.toLowerCase();
    if (b.includes('odisha')) return 'odisha';
    if (b.includes('saraswati')) return 'saraswati';
    if (b.includes('aurobindo') || b.includes('sacie')) return 'aurobindo';
    if (b.includes('oav') || b.includes('adarsha')) return 'oav';
    return 'odisha';
  };

  const handleDeleteAllTests = async () => {
    if (confirmAction !== 'delete_all_tests') {
      setConfirmAction('delete_all_tests');
      return;
    }

    try {
      setLoading(true);
      for (const t of monthlyTests) {
        await deleteDoc(doc(firestore, 'monthly_tests', t.id));
      }
      setNotification({ message: "Monthly tests cleared successfully!", type: 'success' });
      setConfirmAction(null);
    } catch (err) {
      console.error("Delete All Tests Error:", err);
      setNotification({ message: "Failed to clear tests. Some items may not have been deleted.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (confirmAction !== 'delete_all_notifications') {
      setConfirmAction('delete_all_notifications');
      return;
    }

    try {
      setLoading(true);
      for (const n of notifications) {
        await deleteDoc(doc(firestore, 'notifications', n.id));
      }
      setNotification({ message: "Notifications cleared successfully!", type: 'success' });
      setConfirmAction(null);
    } catch (err) {
      console.error("Delete All Notifications Error:", err);
      setNotification({ message: "Failed to clear notifications.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    console.log("Debug: content length", content.length);
    console.log("Debug: adminSubjectFilter", adminSubjectFilter);
    console.log("Debug: adminClassFilter", adminClassFilter);
    console.log("Debug: searchTerm", searchTerm);

    const filteredContent = content.filter(c => {
      // Exclude library chapters from Course content manager
      const isLib = c.isLibraryChapter || !!c.pdfUrl;
      if (isLib) return false;

      console.log("Debug: Filtering chapter", c.id, c.class, c.subject, c.status);
      const matchesClass = adminClassFilter === 'all' || c.class === adminClassFilter;
      const matchesSubject = adminSubjectFilter === 'all' || c.subject === adminSubjectFilter;
      const matchesSearch = !searchTerm || c.title?.en?.toLowerCase().includes(searchTerm.toLowerCase());

      console.log("Debug: Chapter", c.id, "matches:", { matchesClass, matchesSubject, matchesSearch });
      return matchesClass && matchesSubject && matchesSearch;
    });
    console.log("Debug: filteredContent length", filteredContent.length);

    // Requirement: Only show one entry per logical chapter (addressing the "two chapters" issue)
    const uniqueChapters = Array.from(
      filteredContent.reduce((acc, current) => {
        let titleStr = '';
        if (typeof current.title === 'string') {
          titleStr = current.title;
        } else if (current.title && typeof current.title === 'object') {
          titleStr = current.title.en || current.title.or || '';
        }
        const cleanTitle = titleStr.toLowerCase().trim();
        const groupId = current.translationGroupId || cleanTitle || current.id;
        const existing = acc.get(groupId);
        // Keep the first one found for each groupId
        if (!existing) {
          acc.set(groupId, current);
        }
        return acc;
      }, new Map<string, any>()).values()
    );

    const handleDeleteFiltered = async () => {
      const filterDesc = [];
      if (adminClassFilter !== 'all') filterDesc.push(translations['en'].classes[adminClassFilter as keyof typeof translations.en.classes] || adminClassFilter);
      if (adminSubjectFilter !== 'all') filterDesc.push(translations['en'].subjects[adminSubjectFilter as keyof typeof translations.en.subjects] || adminSubjectFilter);

      const confirmMsg = filterDesc.length > 0
        ? `delete_filtered_chapters_${adminClassFilter}_${adminSubjectFilter}`
        : 'delete_all_chapters';

      if (confirmAction !== confirmMsg) {
        setConfirmAction(confirmMsg);
        return;
      }

      try {
        setLoading(true);
        let deletedCount = 0;
        // We delete from filteredContent which respects class, subject and search term
        for (const c of filteredContent) {
          try {
            await deleteDoc(doc(firestore, 'chapters', c.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, 'chapters');
          }
          deletedCount++;
        }
        setNotification({
          message: `${deletedCount} chapters cleared successfully!`,
          type: 'success'
        });
        setConfirmAction(null);
      } catch (err) {
        console.error("Delete Filtered Error:", err);
        setNotification({ message: "Failed to clear chapters. Some items may not have been deleted.", type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white">Content Library ({content.length} chapters loaded)</h2>
          <div className="flex flex-wrap gap-4">
            <select
              value={adminClassFilter}
              onChange={(e) => setAdminClassFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
            >
              <option value="all">All Classes</option>
              {Object.keys(translations['en'].classes).map(c => <option key={c} value={c}>{translations['en'].classes[c as keyof typeof translations.en.classes]}</option>)}
            </select>
            <div className="flex bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
              <input
                type="text"
                placeholder="YouTube Playlist URL"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                className="bg-transparent px-4 py-2 text-sm text-white focus:outline-none w-48 md:w-64"
              />
              <button
                onClick={handleImportPlaylist}
                disabled={isImportingPlaylist || !playlistUrl}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-bold disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isImportingPlaylist ? <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <Rocket size={14} />}
                Import
              </button>
            </div>

            <div className="flex gap-2">
              {filteredContent.length > 0 ? (
                <button
                  onClick={handleDeleteFiltered}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${confirmAction?.startsWith('delete_filtered_chapters') || confirmAction === 'delete_all_chapters'
                      ? 'bg-red-600 text-white font-bold'
                      : 'bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/20'
                    }`}
                >
                  <Trash2 size={18} />
                  {confirmAction?.startsWith('delete_filtered_chapters') || confirmAction === 'delete_all_chapters'
                    ? 'Confirm Delete Filtered?'
                    : (adminClassFilter === 'all' && adminSubjectFilter === 'all' ? 'Clear All Chapters' : 'Clear Filtered Chapters')}
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('production_setup')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all"
                >
                  <Sparkles size={18} />
                  Restore Default Curriculum (AI)
                </button>
              )}
              <button
                onClick={() => {
                  setIsEditingChapter(false);
                  setEditingChapterId(null);
                  setNewChapter({
                    title: '',
                    order: 0,
                    videoUrl: '',
                    teacherOrChannel: '',
                    videos: [],
                    notes: '',
                    notesUrl: '',
                    quizId: '',
                    status: 'draft',
                    class: '',
                    board: '',
                    subject: '',
                    language: 'or',
                    quiz_questions: [],
                    bulkQa: ''
                  });
                  setIsAddingChapter(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
              >
                <Plus size={18} />
                Add New Chapter
              </button>
            </div>
          </div>
        </div>

        {isAddingChapter && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden border-emerald-500/20">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BookOpen size={120} />
            </div>
            <form onSubmit={handleAddChapter} className="space-y-8 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-2xl font-black text-white tracking-tighter">
                  {isEditingChapter ? 'Modify Topic' : 'New Content Creation'}
                </h4>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] bg-emerald-500/10 px-4 py-1 rounded-full">Editor Active</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Target Class</label>
                  <select
                    value={newChapter.class}
                    onChange={(e) => setNewChapter({ ...newChapter, class: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                  >
                    <option value="">Select Class</option>
                    {Object.entries(translations['en'].classes).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Academic Board</label>
                  <select
                    value={newChapter.board}
                    onChange={(e) => setNewChapter({ ...newChapter, board: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                  >
                    <option value="">Select Board</option>
                    {Object.entries(translations['en'].boards).map(([key, label]) => (
                      <option key={key} value={label as string}>{label as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Academic Subject</label>
                  <select
                    value={newChapter.subject}
                    onChange={(e) => setNewChapter({ ...newChapter, subject: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                  >
                    <option value="">Select Subject</option>
                    {Object.entries(translations['en'].subjects).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Display Language</label>
                  <select
                    value={newChapter.language}
                    onChange={(e) => setNewChapter({ ...newChapter, language: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                  >
                    <option value="or">Odia (Default)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Topic Title</label>
                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI || !newChapter.title}
                    className="flex items-center gap-2 text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-all bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20"
                  >
                    {isGeneratingAI ? <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Sparkles size={14} />}
                    {isGeneratingAI ? 'Processing AI Magic...' : 'AI Magic: Generate Content'}
                  </button>
                </div>
                <input
                  type="text"
                  value={newChapter.title}
                  onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-bold text-lg tracking-tight"
                  placeholder="e.g. Introduction to Organic Chemistry"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Lecture Resources (YouTube)</label>
                  <div className="space-y-3">
                    {newChapter.videos.map((video, index) => (
                      <div key={index} className="flex gap-3 items-center group/item animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 border border-white/10">{index + 1}</div>
                        <input
                          type="text"
                          value={video.url}
                          onChange={(e) => {
                            const newVideos = [...newChapter.videos];
                            newVideos[index].url = e.target.value;
                            setNewChapter({ ...newChapter, videos: newVideos });
                          }}
                          className="flex-[2] bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none text-sm font-medium"
                          placeholder="Video URL"
                        />
                        <input
                          type="text"
                          value={video.teacherOrChannel}
                          onChange={(e) => {
                            const newVideos = [...newChapter.videos];
                            newVideos[index].teacherOrChannel = e.target.value;
                            setNewChapter({ ...newChapter, videos: newVideos });
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none text-sm font-medium"
                          placeholder="Instructor"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newVideos = newChapter.videos.filter((_, i) => i !== index);
                            setNewChapter({ ...newChapter, videos: newVideos });
                          }}
                          className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewChapter({ ...newChapter, videos: [...newChapter.videos, { url: '', teacherOrChannel: '' }] });
                    }}
                    className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 px-4 py-2 rounded-xl border border-emerald-500/10 hover:bg-emerald-500/10 transition-all"
                  >
                    <Plus size={14} /> Append Resource
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Document Resources (PDF/Notes)</label>
                  <div className="space-y-4">
                    <div className="relative">
                      <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input
                        type="text"
                        value={newChapter.notesUrl}
                        onChange={(e) => setNewChapter({ ...newChapter, notesUrl: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 text-sm font-medium"
                        placeholder="External Resource Link (G-Drive/Cloud)"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await handleFileUpload(file);
                            if (url) setNewChapter({ ...newChapter, notesUrl: url });
                          }
                        }}
                        className="hidden"
                        id="notes-upload"
                      />
                      <label
                        htmlFor="notes-upload"
                        className="flex-1 cursor-pointer flex items-center justify-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-black text-[10px] uppercase tracking-widest"
                      >
                        <Upload size={18} className="text-emerald-500" />
                        {newChapter.notesUrl ? 'Replace Repository File' : 'Upload Local Repository File'}
                      </label>
                      {newChapter.notesUrl && (
                        <a href={newChapter.notesUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                          <Eye size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card bg-black/20 border-white/5 rounded-[2rem] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h5 className="font-black text-white tracking-tight">Full-Chapter Mastery (Bulk Q&A)</h5>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Neural Engine Ingestion Mode</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1 rounded-full uppercase tracking-widest">Active</span>
                </div>
                <textarea
                  value={newChapter.bulkQa}
                  onChange={(e) => setNewChapter({ ...newChapter, bulkQa: e.target.value })}
                  placeholder={`Format: Q1: Question? A1: Answer...`}
                  className="w-full h-[400px] bg-black/40 border border-white/5 rounded-3xl px-8 py-8 text-emerald-50 font-mono text-sm focus:outline-none focus:border-emerald-500/20 transition-all leading-relaxed custom-scrollbar"
                />
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} className="text-emerald-500" />
                    Supports Markdown for rich student interface presentation.
                  </p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{newChapter.bulkQa?.length || 0} characters ingested</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 pt-4">
                <div className="flex-1 space-y-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Visibility Matrix</label>
                  <div className="flex gap-3">
                    {['draft', 'published'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewChapter({ ...newChapter, status: s as 'draft' | 'published' })}
                        className={`flex-1 py-4 rounded-2xl border font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${(newChapter.status || 'draft') === s
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                            : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-400 hover:bg-white/10'
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Curriculum Sequence</label>
                  <input
                    type="number"
                    value={newChapter.order}
                    onChange={(e) => setNewChapter({ ...newChapter, order: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-black text-center"
                    placeholder="Order ID"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setIsAddingChapter(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-white/5"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] text-white rounded-[2rem] py-5 font-black text-[12px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-emerald-600/40 active:scale-95"
                >
                  {isEditingChapter ? 'Update Topic Matrix' : 'Commence Topic Deployment'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {uniqueChapters.length === 0 ? (
          <div className="glass-card p-20 text-center rounded-[3rem] border-white/5">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Search size={40} className="text-slate-700" />
            </div>
            <h4 className="text-xl font-black text-white tracking-tight mb-2">No Content Found</h4>
            <p className="text-slate-500 font-medium">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {uniqueChapters.map((c: any, i: number) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 rounded-[2.5rem] border-white/5 group hover:border-emerald-500/30 transition-all duration-500 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${c.status === 'published'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                    {c.status || 'draft'}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button
                      onClick={() => {
                        setNewChapter({
                          ...c,
                          videos: c.videos || [{ url: '', teacherOrChannel: '' }]
                        });
                        setEditingChapterId(c.id);
                        setIsEditingChapter(true);
                        setIsAddingChapter(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-xl transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirmAction === `delete_topic_${c.id}`) {
                          try {
                            setLoading(true);
                            const groupId = c.translationGroupId || c.id;
                            const related = content.filter((item: any) => item.translationGroupId === groupId || item.id === groupId);
                            for (const item of related) {
                              await deleteDoc(doc(firestore, 'chapters', item.id));
                            }
                            setConfirmAction(null);
                            showNotification("Topic purged successfully!");
                          } catch (err) {
                            console.error("Purge Error:", err);
                            showNotification("Purge failed.", 'error');
                          } finally {
                            setLoading(false);
                          }
                        } else {
                          setConfirmAction(`delete_topic_${c.id}`);
                          setTimeout(() => setConfirmAction(null), 5000);
                        }
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${confirmAction === `delete_topic_${c.id}`
                          ? 'bg-red-500 text-white w-20 text-[10px] font-black uppercase'
                          : 'bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                        }`}
                    >
                      {confirmAction === `delete_topic_${c.id}` ? "PURGE?" : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">{translations['en'].classes[c.class as keyof typeof translations.en.classes] || c.class}</div>
                  <h4 className="text-lg font-black text-white tracking-tight leading-tight line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {typeof c.title === 'string' ? c.title : c.title.en}
                  </h4>
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex-grow">
                  {translations['en'].subjects[c.subject] || c.subject} • {c.board}
                </div>
                <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest pt-6 border-t border-white/5">
                  <div className="flex items-center gap-1.5"><Youtube size={14} className="text-red-500" /> {c.videos?.length || 0} Lectures</div>
                  {c.notesUrl && <div className="flex items-center gap-1.5"><FileText size={14} className="text-blue-500" /> Repository</div>}
                  {(c.quiz_questions?.length > 0 || c.bulkQa) && <div className="flex items-center gap-1.5"><Zap size={14} className="text-amber-500" /> Mastery</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handlePullQuestionsFromChapters = async () => {
    if (!newTest.chapterIds || newTest.chapterIds.length === 0) {
      showNotification("Please enter at least one Chapter ID.", "error");
      return;
    }

    setLoading(true);
    try {
      let pulledQuestions: any[] = [];
      for (const id of newTest.chapterIds) {
        const chapterDoc = await getDocs(query(collection(firestore, 'chapters'), where('id', '==', id)));
        if (!chapterDoc.empty) {
          const data = chapterDoc.docs[0].data();
          if (data.quiz_questions && Array.isArray(data.quiz_questions)) {
            pulledQuestions = [...pulledQuestions, ...data.quiz_questions.map((q: any) => ({
              ...q,
              marks: q.marks || 1,
              type: q.type || 'mcq'
            }))];
          }
        }
      }

      if (pulledQuestions.length > 0) {
        setNewTest((prev: any) => ({
          ...prev,
          questions: [...prev.questions, ...pulledQuestions]
        }));
        showNotification(`Pulled ${pulledQuestions.length} questions from chapters!`);
      } else {
        showNotification("No questions found in those chapters.", "error");
      }
    } catch (err) {
      console.error("Pull Questions Error:", err);
      showNotification("Failed to pull questions.", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderMonthlyTests = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Monthly Tests Management</h3>
        <div className="flex gap-2">
          {monthlyTests.length > 0 && (
            <button
              onClick={handleDeleteAllTests}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${confirmAction === 'delete_all_tests'
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/20'
                }`}
            >
              <Trash2 size={18} /> {confirmAction === 'delete_all_tests' ? 'Confirm Delete All Tests?' : 'Clear All Tests'}
            </button>
          )}
          <button
            onClick={() => {
              setNewTest({
                title: '',
                subject: 'math',
                class: 'class5',
                month: new Date().toLocaleString('default', { month: 'long' }),
                year: new Date().getFullYear(),
                language: 'or',
                questions: [],
                status: 'draft',
                chapterIds: [],
                totalMarks: 0
              });
              setIsAddingTest(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus size={18} /> Create New Test
          </button>
        </div>
      </div>

      {isAddingTest && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Test Title</label>
              <input
                type="text"
                value={newTest.title}
                onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                placeholder="e.g. Chapter 1 & 2 Quiz"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class</label>
              <select
                value={newTest.class}
                onChange={(e) => setNewTest({ ...newTest, class: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer"
              >
                {Object.entries(translations['en'].classes).map(([key, label]) => (
                  <option key={key} value={key}>{label as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
              <select
                value={newTest.subject}
                onChange={(e) => setNewTest({ ...newTest, subject: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer"
              >
                {Object.entries(translations['en'].subjects).map(([key, label]) => (
                  <option key={key} value={key}>{label as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Test Language</label>
              <select
                value={newTest.language}
                onChange={(e) => setNewTest({ ...newTest, language: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer"
              >
                <option value="or">Odia</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Month</label>
              <select
                value={newTest.month}
                onChange={(e) => setNewTest({ ...newTest, month: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Year</label>
              <input
                type="number"
                value={newTest.year}
                onChange={(e) => setNewTest({ ...newTest, year: parseInt(e.target.value) })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Scheduled Date (Goes live on this day)</label>
              <input
                type="date"
                value={newTest.scheduledDate}
                onChange={(e) => setNewTest({ ...newTest, scheduledDate: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter IDs (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={(newTest.chapterIds || []).join(', ')}
                  onChange={(e) => setNewTest({ ...newTest, chapterIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean) })}
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  placeholder="ID1, ID2"
                />
                <button
                  onClick={handlePullQuestionsFromChapters}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Pull
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-emerald-500 uppercase">Magic Bulk Question Paste</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Format: [Marks] Q: ... A: ... B: ... Ans: ...</span>
                <button
                  onClick={handleBulkParseQuestions}
                  disabled={!bulkTestQuestions || isParsingBulk}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isParsingBulk ? 'Parsing...' : 'Process Paste'}
                </button>
              </div>
            </div>
            <textarea
              value={bulkTestQuestions}
              onChange={(e) => setBulkTestQuestions(e.target.value)}
              className="w-full h-32 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none font-mono"
              placeholder="[1] Q: What is 5+5?&#10;A: 10 | B: 20 | C: 5 | D: 0&#10;Ans: 10&#10;&#10;[5] Q: Explain gravity?&#10;Ans: Gravity is a force..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Question List ({newTest.questions.length} Questions | Total: {newTest.totalMarks} Marks)</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateTestWithAI}
                  disabled={isGeneratingTestAI}
                  className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-all"
                >
                  {isGeneratingTestAI ? <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Sparkles size={14} />}
                  AI Magic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const qs = [...newTest.questions, { question: '', options: ['', '', '', ''], correct_answer: '', marks: 1, type: 'mcq' }];
                    setNewTest({ ...newTest, questions: qs, totalMarks: qs.reduce((acc, q) => acc + (q.marks || 0), 0) });
                  }}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  + Add Manual
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {newTest.questions.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3 relative group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                      {qIdx + 1}
                    </div>
                    <input
                      type="text"
                      placeholder={`Question text...`}
                      value={q.question}
                      onChange={(e) => {
                        const qs = [...newTest.questions];
                        qs[qIdx].question = e.target.value;
                        setNewTest({ ...newTest, questions: qs });
                      }}
                      className="flex-1 bg-transparent border-b border-white/10 text-white text-sm py-1 focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={q.marks}
                      onChange={(e) => {
                        const marks = parseInt(e.target.value);
                        const qs = [...newTest.questions];
                        qs[qIdx].marks = marks;
                        // Auto-set type based on marks as a default
                        if (marks > 1) qs[qIdx].type = 'subjective';
                        else qs[qIdx].type = 'mcq';
                        setNewTest({ ...newTest, questions: qs, totalMarks: qs.reduce((acc, cur) => acc + (cur.marks || 0), 0) });
                      }}
                      className="bg-white/5 text-xs text-emerald-400 border border-emerald-500/30 rounded px-2 py-1 outline-none"
                    >
                      {[1, 2, 3, 5].map(m => <option key={m} value={m}>{m} Mark</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const qs = [...newTest.questions];
                        qs[qIdx].isGrace = !qs[qIdx].isGrace;
                        setNewTest({ ...newTest, questions: qs });
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-all flex items-center gap-1 ${q.isGrace ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-500 hover:text-amber-500'}`}
                    >
                      <Sparkles size={10} />
                      {q.isGrace ? 'Grace Active' : 'Grace?'}
                    </button>
                    <select
                      value={q.type}
                      onChange={(e) => {
                        const qs = [...newTest.questions];
                        qs[qIdx].type = e.target.value;
                        if (e.target.value === 'subjective') qs[qIdx].options = [];
                        else if (qs[qIdx].options.length === 0) qs[qIdx].options = ['', '', '', ''];
                        setNewTest({ ...newTest, questions: qs });
                      }}
                      className="bg-white/5 text-[10px] text-slate-400 border border-white/10 rounded px-2 py-1 outline-none"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="subjective">Subjective</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const qs = newTest.questions.filter((_: any, i: number) => i !== qIdx);
                        setNewTest({ ...newTest, questions: qs, totalMarks: qs.reduce((acc, cur) => acc + (cur.marks || 0), 0) });
                      }}
                      className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {q.type === 'mcq' && (
                    <div className="grid grid-cols-2 gap-2 pl-12">
                      {q.options.map((opt: string, oIdx: number) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          value={opt}
                          onChange={(e) => {
                            const qs = [...newTest.questions];
                            qs[qIdx].options[oIdx] = e.target.value;
                            setNewTest({ ...newTest, questions: qs });
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                        />
                      ))}
                    </div>
                  )}

                  <div className="pl-12">
                    <textarea
                      placeholder={q.type === 'mcq' ? "Correct Answer (e.g. Option text or A/B/C/D)" : "Model Answer for Subjective Question"}
                      value={q.correct_answer}
                      onChange={(e) => {
                        const qs = [...newTest.questions];
                        qs[qIdx].correct_answer = e.target.value;
                        setNewTest({ ...newTest, questions: qs });
                      }}
                      className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs text-emerald-400 focus:outline-none min-h-[40px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={async () => {
                try {
                  await addDoc(collection(firestore, 'monthly_tests'), {
                    ...newTest,
                    createdAt: serverTimestamp()
                  });
                  showNotification("Test added successfully!");
                  setIsAddingTest(false);
                  setNewTest({
                    title: '',
                    chapterIds: [],
                    questions: [],
                    status: 'draft',
                    class: 'class5',
                    subject: 'math',
                    month: new Date().toLocaleString('default', { month: 'long' }),
                    year: new Date().getFullYear(),
                    scheduledDate: new Date().toISOString().split('T')[0],
                    language: 'or',
                    totalMarks: 0
                  });
                } catch (err) {
                  console.error("Save Test Error:", err);
                  showNotification("Failed to save test", 'error');
                }
              }}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all"
            >
              Save Monthly Test
            </button>
            <button
              onClick={() => setIsAddingTest(false)}
              className="px-8 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monthlyTests.map((test) => (
          <div key={test.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white font-bold text-lg">{translations['en'].subjects[test.subject] || test.subject}</h4>
                <p className="text-slate-400 text-sm">{test.class} • {test.month} {test.year}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${test.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                {test.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1"><FileText size={14} /> {test.questions?.length || 0} Questions</div>
              <div className="flex items-center gap-1"><CheckCircle2 size={14} /> {test.results_published ? 'Results Out' : 'Results Pending'}</div>
            </div>

            <div className="flex gap-2 pt-2">
              {test.status === 'draft' && (
                <button
                  onClick={async () => {
                    try {
                      await updateDoc(doc(firestore, 'monthly_tests', test.id), { status: 'published' });
                    } catch (err) {
                      showNotification("Failed to publish test", 'error');
                    }
                  }}
                  className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 text-xs font-bold py-2 rounded-lg transition-all"
                >
                  Publish Test
                </button>
              )}
              {!test.results_published && test.status === 'published' && (
                <button
                  onClick={async () => {
                    if (confirmAction === `publish_results_${test.id}`) {
                      try {
                        // Fetch all submissions for this test and its translations
                        const groupTestIds = monthlyTests
                          .filter((t: any) => t.id === test.id || (t.translationGroupId && t.translationGroupId === test.translationGroupId))
                          .map((t: any) => t.id);

                        const q = query(collection(firestore, 'monthly_test_submissions'), where('testId', 'in', groupTestIds));
                        const snap = await getDocs(q);
                        const submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                        // Sort by score desc, then time asc
                        submissions.sort((a: any, b: any) => {
                          if (b.score !== a.score) return b.score - a.score;
                          return (a.submittedAt?.seconds || 0) - (b.submittedAt?.seconds || 0);
                        });

                        // Assign ranks and update
                        for (let i = 0; i < submissions.length; i++) {
                          await updateDoc(doc(firestore, 'monthly_test_submissions', submissions[i].id), {
                            rank: i + 1
                          });
                        }

                        // Update all tests in the group
                        for (const tid of groupTestIds) {
                          await updateDoc(doc(firestore, 'monthly_tests', tid), { results_published: true });
                        }
                        showNotification("Results published and ranks assigned successfully!", 'success');
                        setConfirmAction(null);
                      } catch (err) {
                        console.error("Publish Results Error:", err);
                        showNotification("Failed to publish results", 'error');
                      }
                    } else {
                      setConfirmAction(`publish_results_${test.id}`);
                      setTimeout(() => setConfirmAction(null), 3000);
                    }
                  }}
                  className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-500 text-xs font-bold py-2 rounded-lg transition-all"
                >
                  {confirmAction === `publish_results_${test.id}` ? "Confirm Publish?" : "Publish Results"}
                </button>
              )}
              {test.results_published && (
                <div className="flex-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg text-center">
                  Results Published
                </div>
              )}
              <button
                onClick={async () => {
                  setSelectedTestIdForSubmissions(test.id);
                  const q = query(collection(firestore, 'monthly_test_submissions'), where('testId', '==', test.id));
                  const snap = await getDocs(q);
                  const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                  // Fetch unique user IDs from submissions
                  const userIds = Array.from(new Set(subs.map((s: any) => s.userId)));
                  const userProfiles: Record<string, any> = {};

                  // Fetch user profiles in batches (max 10 for 'in' query)
                  for (let i = 0; i < userIds.length; i += 10) {
                    const batch = userIds.slice(i, i + 10);
                    const userQ = query(collection(firestore, 'users'), where('__name__', 'in', batch));
                    const userSnap = await getDocs(userQ);
                    userSnap.forEach(doc => {
                      userProfiles[doc.id] = doc.data();
                    });
                  }

                  setTestSubmissions(subs.map((s: any) => ({
                    ...s,
                    currentProfileName: userProfiles[s.userId]?.name || userProfiles[s.userId]?.displayName || 'N/A'
                  })));
                }}
                className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-500 text-xs font-bold py-2 rounded-lg transition-all"
              >
                View Submissions
              </button>
              <button
                onClick={async () => {
                  if (confirmAction === `delete_test_${test.id}`) {
                    try {
                      setLoading(true);
                      await deleteDoc(doc(firestore, 'monthly_tests', test.id));
                      setConfirmAction(null);
                      showNotification("Monthly test deleted successfully!");
                    } catch (err) {
                      console.error("Delete Test Error:", err);
                      showNotification("Failed to delete test.", 'error');
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    setConfirmAction(`delete_test_${test.id}`);
                    setTimeout(() => setConfirmAction(null), 5000);
                  }
                }}
                className={confirmAction === `delete_test_${test.id}` ? "p-2 bg-red-500/20 text-red-500 font-bold text-xs rounded-lg" : "p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"}
              >
                {confirmAction === `delete_test_${test.id}` ? "Confirm?" : <Trash2 size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedTestIdForSubmissions && (
        <div className={`fixed inset-0 z-[60] bg-slate-950 flex flex-col pt-6 pb-6 pr-6 pl-6 md:pl-8 lg:pr-10 ${isSidebarOpen ? 'lg:pl-[300px]' : 'lg:pl-32'} overflow-y-auto`}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white">Test Submissions</h3>
              <p className="text-slate-400 text-sm">Reviewing results and anti-cheating logs</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFilterPending(!filterPending)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all border ${filterPending
                    ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-lg shadow-amber-500/20'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
              >
                {filterPending ? 'Showing: Pending Review' : 'Filter: Needs Review'}
              </button>
              <button
                onClick={() => setSelectedTestIdForSubmissions(null)}
                className="flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/10 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Back</span>
              </button>
            </div>
          </div>

          {/* Report Statistics Summary */}
          {Object.keys(testSubmissions.reduce((acc, sub) => ({ ...acc, ...(sub.reports || {}) }), {})).length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Flag className="text-amber-500" size={20} />
                <h4 className="text-white font-bold">Out of Chapter Reports</h4>
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(testSubmissions.reduce((acc: Record<number, number>, sub: any) => {
                  if (sub.reports) {
                    Object.entries(sub.reports).forEach(([qIdx, isReported]) => {
                      if (isReported) {
                        const idx = parseInt(qIdx);
                        acc[idx] = (acc[idx] || 0) + 1;
                      }
                    });
                  }
                  return acc;
                }, {})).map(([qIdx, count]: any) => (
                  <div key={qIdx} className="bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Question {parseInt(qIdx) + 1}</p>
                    <p className="text-lg font-black text-amber-500">{count} Reports</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {testSubmissions.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                <Users className="mx-auto text-slate-700 mb-4" size={48} />
                <p className="text-slate-500">No submissions yet for this test.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testSubmissions
                  .filter(sub => {
                    if (!filterPending) return true;
                    // Find if any subjective question (marks > 1) is not graded
                    const test = monthlyTests.find(t => t.id === sub.testId);
                    return test?.questions?.some((q: any, i: number) =>
                      (q.type === 'subjective' || q.marks > 1) && sub.subjectiveScores?.[i] === undefined
                    );
                  })
                  .map((sub) => {
                    const test = monthlyTests.find(t => t.id === sub.testId);
                    return (
                      <div key={sub.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-white">
                              {sub.userName?.[0] || 'S'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-bold">{sub.userName}</h4>
                                {sub.currentProfileName && sub.currentProfileName !== 'N/A' && sub.currentProfileName !== sub.userName && (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase tracking-widest border border-amber-500/20">
                                      Mismatch
                                    </span>
                                    <button
                                      onClick={async () => {
                                        if (confirm(`Change name on certificate from "${sub.userName}" to "${sub.currentProfileName}"?`)) {
                                          try {
                                            await updateDoc(doc(firestore, 'monthly_test_submissions', sub.id), {
                                              userName: sub.currentProfileName
                                            });
                                            setTestSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, userName: sub.currentProfileName } : s));
                                            showNotification("Name updated on certificate", 'success');
                                          } catch (err) {
                                            showNotification("Failed to update name", 'error');
                                          }
                                        }
                                      }}
                                      className="p-1 hover:bg-emerald-500/10 text-emerald-500 rounded transition-all group"
                                      title={`Sync to profile name: ${sub.currentProfileName}`}
                                    >
                                      <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{sub.userEmail || sub.userId} • Class {sub.class}</p>
                              {sub.currentProfileName && sub.currentProfileName !== 'N/A' && sub.currentProfileName !== sub.userName && (
                                <p className="text-[9px] text-slate-500 italic mt-0.5">Profile Name: {sub.currentProfileName}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Auto Score</p>
                              <p className="text-2xl font-black text-emerald-400">{sub.score}/{sub.totalMaxMarks || sub.totalQuestions}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Final Score</p>
                              <p className="text-2xl font-black text-blue-400">{sub.finalScore || sub.score}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Violations</p>
                              <p className={`text-2xl font-black ${sub.violations > 0 ? 'text-red-500' : 'text-slate-500'}`}>{sub.violations || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Time Analysis (Seconds)</h5>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(sub.timeSpent || {}).map(([qIdx, sec]: any) => (
                                <div key={qIdx} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${sec < 5 ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-slate-400'}`}>
                                  Q{parseInt(qIdx) + 1}: {sec}s
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Anti-Cheating Status</h5>
                            <div className="flex items-center gap-4">
                              <div className={`flex items-center gap-2 text-xs font-bold ${sub.violations > 2 ? 'text-red-500' : sub.violations > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {sub.violations > 0 ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                                {sub.violations > 2 ? 'HIGH RISK' : sub.violations > 0 ? 'MODERATE RISK' : 'CLEAN'}
                              </div>
                              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Submitted: {parseLogTimestamp(sub.submittedAt)?.toLocaleString() || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* All Questions & Manual Marking Section */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Question-wise Review & Grading</h5>
                          {test?.questions?.map((q: any, i: number) => {
                            const studentAns = sub.answers[i];
                            const isObjectAns = typeof studentAns === 'object' && studentAns !== null;
                            const answerText = isObjectAns ? studentAns.text : (q.type === 'mcq' ? q.options[studentAns] : studentAns);
                            const imageUrl = isObjectAns ? studentAns.imageUrl : null;

                            return (
                              <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <p className="text-sm text-white font-medium">Q{i + 1}: {q.question}</p>
                                    <div className="flex gap-2">
                                      <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded uppercase">Type: {q.type || 'MCQ'}</span>
                                      {q.type === 'mcq' && <span className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/5 px-2 py-0.5 rounded uppercase">Correct: {q.correct_answer}</span>}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded shrink-0">{q.marks || 1} Marks</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-black/30 p-4 rounded-xl text-slate-300 text-sm italic min-h-[60px] flex items-center">
                                    {answerText || <span className="text-slate-600">No text answer provided.</span>}
                                  </div>
                                  {imageUrl && (
                                    <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="relative group aspect-video rounded-xl overflow-hidden border border-white/5 bg-black/20 block">
                                      <img src={imageUrl} alt="Student Work" className="w-full h-full object-contain" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <span className="text-white text-xs font-bold flex items-center gap-2">
                                          <ExternalLink size={14} /> View Full Image
                                        </span>
                                      </div>
                                    </a>
                                  )}
                                </div>

                                <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Award Marks:</label>
                                      <div className="flex flex-wrap gap-2">
                                        {[...Array((q.marks || 1) + 1)].map((_, mark) => (
                                          <button
                                            key={mark}
                                            onClick={async () => {
                                              const newScores = { ...(sub.subjectiveScores || {}), [i]: mark };
                                              const totalManual = Object.values(newScores).reduce((a: any, b: any) => (a as number) + (b as number), 0);
                                              await updateDoc(doc(firestore, 'monthly_test_submissions', sub.id), {
                                                subjectiveScores: newScores,
                                                finalScore: (sub.score || 0) + (totalManual as number)
                                              });
                                              setTestSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, subjectiveScores: newScores, finalScore: (sub.score || 0) + (totalManual as number) } : s));
                                            }}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${(sub.subjectiveScores?.[i] === mark)
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110'
                                                : 'bg-white/5 text-slate-500 hover:bg-white/10'
                                              }`}
                                          >
                                            {mark}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    <button
                                      onClick={async () => {
                                        try {
                                          // Set loading state (we could use a local state but for now just console)
                                          console.log("AI Grading starting...");
                                          const result = await gradeSubjectiveAnswer(
                                            q.question,
                                            q.correct_answer || '',
                                            answerText,
                                            imageUrl,
                                            q.marks || 1,
                                            'or'
                                          );

                                          if (result.suggestedMark !== undefined) {
                                            if (confirm(`AI suggests ${result.suggestedMark} marks.\nJustification: ${result.justification}\n\nApply this mark?`)) {
                                              const newScores = { ...(sub.subjectiveScores || {}), [i]: result.suggestedMark };
                                              const totalManual = Object.values(newScores).reduce((a: any, b: any) => (a as number) + (b as number), 0);
                                              await updateDoc(doc(firestore, 'monthly_test_submissions', sub.id), {
                                                subjectiveScores: newScores,
                                                aiJustifications: { ...(sub.aiJustifications || {}), [i]: result.justification },
                                                finalScore: (sub.score || 0) + (totalManual as number)
                                              });
                                              setTestSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, subjectiveScores: newScores, finalScore: (sub.score || 0) + (totalManual as number) } : s));
                                            }
                                          }
                                        } catch (err) {
                                          console.error("AI Grading Error:", err);
                                          alert("AI Assistant failed to grade. Please try again.");
                                        }
                                      }}
                                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-2 transition-all"
                                    >
                                      <Sparkles size={14} /> AI Suggest Mark
                                    </button>
                                  </div>
                                  {sub.aiJustifications?.[i] && (
                                    <p className="text-[10px] text-slate-500 italic bg-white/5 p-2 rounded-lg border border-white/5">
                                      AI Note: {sub.aiJustifications[i]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderAiUsage = () => {
    const class10Usage = aiLogs.filter(log => log.userClass === 'class10').length;
    const class3Usage = aiLogs.filter(log => log.userClass === 'class3').length;
    const gunduluRevenue = stats.totalRevenue;
    const todaysLogs = aiLogs.filter((log: any) => isTodayDate(log.parsedTimestamp || parseLogTimestamp(log.timestamp)));

    const now = new Date();
    const filteredLogs = aiLogs.filter((log: any) => {
      const ts = log.parsedTimestamp || parseLogTimestamp(log.timestamp);
      if (!ts) return aiLogFilter === 'all';
      if (aiLogFilter === 'today') return isTodayDate(ts);
      if (aiLogFilter === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return ts >= weekAgo;
      }
      if (aiLogFilter === 'month') {
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);
        return ts >= monthAgo;
      }
      return true; // 'all'
    });

    const normalizePhone = (value: string | undefined | null): string => {
      if (!value) return '';
      const digits = String(value).replace(/\D/g, '');
      if (!digits) return '';
      return digits.startsWith('91') && digits.length > 10 ? digits.slice(-10) : digits.slice(-10);
    };

    const usersById = new Map<string, any>();
    const usersByEmail = new Map<string, any>();
    const usersByPhone = new Map<string, any>();

    students.forEach((student: any) => {
      const sid = String(student?.id || student?.uid || '');
      const suid = String(student?.uid || '');
      const email = String(student?.email || '').toLowerCase();
      const phone = normalizePhone(student?.phoneNumber);

      if (sid) usersById.set(sid, student);
      if (suid) usersById.set(suid, student);
      if (email) usersByEmail.set(email, student);
      if (phone) usersByPhone.set(phone, student);
    });

    const activeTodayMap = new Map<string, { key: string; name: string; className: string; questions: number; lastAskedAt: Date | null }>();

    todaysLogs.forEach((log: any) => {
      const logUserId = String(log.userId || log.uid || '');
      const logEmail = String(log.userEmail || '').toLowerCase();
      const logPhone = normalizePhone(log.userPhone || log.phoneNumber);

      let student = logUserId ? usersById.get(logUserId) : null;
      if (!student && logEmail) student = usersByEmail.get(logEmail);
      if (!student && logPhone) student = usersByPhone.get(logPhone);

      const key = String(student?.id || student?.uid || logUserId || logPhone || logEmail || log.userName || log.id);
      const displayName = log.userName || student?.name || student?.displayName || student?.phoneNumber || 'Student';
      const displayClass = log.userClass || student?.class || 'Unknown Class';
      const askedAt = log.parsedTimestamp || parseLogTimestamp(log.timestamp);

      const existing = activeTodayMap.get(key);
      if (existing) {
        const hasNewerTime = askedAt && (!existing.lastAskedAt || askedAt.getTime() > existing.lastAskedAt.getTime());
        activeTodayMap.set(key, {
          ...existing,
          questions: existing.questions + 1,
          lastAskedAt: hasNewerTime ? askedAt : existing.lastAskedAt
        });
        return;
      }

      activeTodayMap.set(key, {
        key,
        name: displayName,
        className: displayClass,
        questions: 1,
        lastAskedAt: askedAt
      });
    });

    const activeTodayStudents = Array.from(activeTodayMap.values()).sort((a, b) => {
      const aTime = a.lastAskedAt ? a.lastAskedAt.getTime() : 0;
      const bTime = b.lastAskedAt ? b.lastAskedAt.getTime() : 0;
      return bTime - aTime;
    });

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="stat-card-glow" style={{ '--glow-color': 'rgba(16, 185, 129, 0.1)' } as any} />
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Total Questions Today</div>
            <div className="text-4xl font-black text-white relative z-10">{stats.aiQuestionsToday}</div>
            <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Brain size={64} />
            </div>
          </div>
          <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="stat-card-glow" style={{ '--glow-color': 'rgba(59, 130, 246, 0.1)' } as any} />
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Usage by Class</div>
            <div className="text-sm text-white mt-4 space-y-2 relative z-10">
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="font-bold text-slate-400">Class 10:</span>
                <span className="font-black text-emerald-400">{class10Usage} queries</span>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="font-bold text-slate-400">Class 3:</span>
                <span className="font-black text-blue-400">{class3Usage} queries</span>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group">
            <div className="stat-card-glow" style={{ '--glow-color': 'rgba(251, 191, 36, 0.1)' } as any} />
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Gundulu Revenue</div>
            <div className="text-4xl font-black text-emerald-400 relative z-10">₹{gunduluRevenue.toLocaleString('en-IN')}</div>
            <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CreditCard size={64} />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5">
          <div className="p-8 border-b border-white/5 font-black text-white flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
              <span className="text-xl tracking-tighter">Students Active Today</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">{activeTodayStudents.length} students online</span>
          </div>
          <div className="divide-y divide-white/5 max-h-[350px] overflow-y-auto custom-scrollbar">
            {activeTodayStudents.map((student) => (
              <div key={student.key} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white group-hover:scale-110 transition-transform">
                    {student.name[0]}
                  </div>
                  <div>
                    <div className="text-lg font-black text-white tracking-tight">{student.name}</div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{student.className}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-400">{student.questions} <span className="text-[10px] uppercase text-slate-500">questions</span></div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">
                    Last active: {student.lastAskedAt ? student.lastAskedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                  </div>
                </div>
              </div>
            ))}
            {activeTodayStudents.length === 0 && (
              <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest italic opacity-50">No AI usage by students today.</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col border-white/5">
            <div className="p-8 border-b border-white/5 font-black text-white flex items-center justify-between flex-wrap gap-4 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]"></div>
                <span className="text-xl tracking-tighter">AI Interaction History</span>
              </div>
              <div className="flex gap-2 p-1 bg-black/20 rounded-2xl border border-white/5 flex-wrap">
                {(['today', 'week', 'month', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setAiLogFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${aiLogFilter === f
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-500 hover:text-white'
                      }`}
                  >
                    {f === 'today' ? 'Today' : f === 'week' ? '7 Days' : f === 'month' ? '30 Days' : 'All'}
                  </button>
                ))}
                {aiLogs.length > 0 && (
                  <button
                    onClick={handleClearAllAiLogs}
                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10"
                  >
                    Clear History
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-white/5 overflow-y-auto max-h-[600px] custom-scrollbar">
              {filteredLogs.map((log: any, i: number) => (
                <div key={i} className="p-6 hover:bg-white/5 transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-md font-black text-indigo-400 tracking-tight group-hover:translate-x-1 transition-transform">{log.userName || 'Student'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 font-bold uppercase tracking-widest">{log.userClass || 'Unknown Class'}</span>
                      <button
                        onClick={() => handleDeleteAiLog(log.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete this log"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-white text-md leading-relaxed mb-4 font-medium italic">"{log.question}"</div>
                  <div className="text-sm text-slate-400 line-clamp-3 bg-black/40 p-4 rounded-2xl border border-white/5 leading-relaxed font-['Inter']">
                    {log.answer}
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4 text-right">
                    {(log.parsedTimestamp || parseLogTimestamp(log.timestamp))?.toLocaleString() || 'Unknown time'}
                  </div>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest italic opacity-50">No questions for this period.</div>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col border-white/5">
            <div className="p-8 border-b border-white/5 font-black text-white flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
                <span className="text-xl tracking-tighter">Brain Editor</span>
              </div>
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                Sync Brain
              </button>
            </div>
            <div className="p-8 flex-1 flex flex-col">
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                Configure Gundulu's core consciousness. The text below is the master prompt injected into every interaction. Use it to define personality, expertise, and behavioral guardrails.
              </p>
              <div className="relative flex-1 min-h-[400px]">
                <textarea
                  className="absolute inset-0 w-full h-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500/30 transition-all resize-none custom-scrollbar leading-relaxed"
                  value={gunduluPromptDraft}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGunduluPromptDraft(value);
                    if (!isPromptDirtyRef.current) {
                      isPromptDirtyRef.current = true;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPayments = () => {
    const allFinancials = [
      ...transactions.map(t => ({ ...t, source: 'transaction' })),
      ...payments.map(p => ({ ...p, source: 'payment' }))
    ].sort((a, b) => {
      const aTime = parseLogTimestamp(a.timestamp || a.createdAt || a.created_at || a.date)?.getTime() || 0;
      const bTime = parseLogTimestamp(b.timestamp || b.createdAt || b.created_at || b.date)?.getTime() || 0;
      return bTime - aTime;
    });

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
          <h3 className="text-2xl font-black text-white tracking-tighter">Financial Ledger</h3>
        </div>
        <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Plan Selection</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allFinancials.map((tx: any, i: number) => {
                  const studentName = tx.userName || tx.userId || 'Student';
                  const planName = tx.plan || tx.planType || 'Premium';
                  const amount = tx.amount || 0;
                  const rawDate = tx.timestamp || tx.createdAt || tx.created_at || tx.date;
                  const displayDate = parseLogTimestamp(rawDate)?.toLocaleDateString() || 'Unknown';
                  const isSuccess = tx.status === 'success' || tx.source === 'transaction';
                  const isPending = tx.status === 'pending';

                  return (
                    <tr key={i} className="hover:bg-white/5 transition-all group">
                      <td className="p-6 text-white font-black tracking-tight">{studentName}</td>
                      <td className="p-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest">{planName}</td>
                      <td className="p-6 text-emerald-400 font-black text-lg">₹{amount}</td>
                      <td className="p-6 text-slate-500 text-xs font-medium">{displayDate}</td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                          {isSuccess ? 'Settled' : isPending ? 'Pending' : (tx.status || 'Failed')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {allFinancials.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest italic opacity-50">No financial transactions recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="w-2 h-8 bg-amber-500 rounded-full shadow-[0_0_10px_#f59e0b]"></div>
        <h3 className="text-2xl font-black text-white tracking-tighter">Communication Hub</h3>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden border-amber-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Bell size={120} />
        </div>
        <div className="relative z-10 space-y-6">
          <h4 className="text-xl font-black text-white tracking-tight">Deploy New Broadcast</h4>
          <div className="space-y-4">
            <textarea
              placeholder="Construct your message for the student body..."
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 text-white focus:outline-none focus:border-amber-500/30 transition-all min-h-[150px] leading-relaxed font-medium"
            />
            <div className="flex flex-col md:flex-row gap-4">
              <select
                value={notificationAudience}
                onChange={(e) => setNotificationAudience(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-amber-500/30 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer"
              >
                <option value="all">Everyone (Students & Teachers)</option>
                <option value="students">All Students Only</option>
                <option value="teachers">Educators / Teachers Only</option>
                <option value="premium">Premium Scholars Only</option>
                <option value="free">Standard Tier Only</option>
              </select>
              <button
                onClick={handleBroadcast}
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-900/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Initializing Broadcast...' : 'Commence Global Broadcast'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden border-white/5">
        <div className="p-8 border-b border-white/5 font-black text-white flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-slate-500 rounded-full"></div>
            <span className="text-lg tracking-tight">Broadcast Archives</span>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAllNotifications}
              className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${confirmAction === 'delete_all_notifications'
                  ? 'bg-red-500 text-white border-red-400'
                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                }`}
            >
              <Trash2 size={14} className="inline mr-2" /> {confirmAction === 'delete_all_notifications' ? 'Confirm Archives Purge?' : 'Purge All Records'}
            </button>
          )}
        </div>
        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
          {notifications.map((n, i) => (
            <div key={i} className="p-8 flex items-center justify-between hover:bg-white/5 transition-all group">
              <div className="flex-1">
                <div className="text-md text-white font-medium leading-relaxed mb-2 italic">"{n.message}"</div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                    n.audience === 'teachers' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    n.audience === 'students' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    n.audience === 'premium' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    n.audience === 'free' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    Target: {n.audience || 'all'}
                  </span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {parseLogTimestamp(n.createdAt)?.toLocaleString() || 'Recently'}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (confirmAction === `delete_notif_${n.id}`) {
                    try {
                      setLoading(true);
                      await deleteDoc(doc(firestore, 'notifications', n.id));
                      setConfirmAction(null);
                      showNotification("Archive Entry Purged");
                    } catch (err) {
                      console.error("Purge Error:", err);
                      showNotification("Purge Failed.", 'error');
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    setConfirmAction(`delete_notif_${n.id}`);
                    setTimeout(() => setConfirmAction(null), 5000);
                  }
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${confirmAction === `delete_notif_${n.id}` ? "bg-red-500 text-white w-24 text-[9px] font-black uppercase tracking-widest" : "bg-white/5 text-slate-500 hover:text-red-400 border border-white/5"}`}
              >
                {confirmAction === `delete_notif_${n.id}` ? "PURGE?" : <Trash2 size={18} />}
              </button>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest italic opacity-50">No broadcast history found.</div>
          )}
        </div>
      </div>
    </div>
  );

  const handleSaveSettings = async () => {
    try {
      const safeSystemSettings = {
        monthlyPrice: systemSettings.monthlyPrice || 99,
        yearlyPrice: systemSettings.yearlyPrice || 999,
        class3MonthlyPrice: systemSettings.class3MonthlyPrice || 99,
        class3YearlyPrice: systemSettings.class3YearlyPrice || 499,
        class10MonthlyPrice: systemSettings.class10MonthlyPrice || 99,
        class10YearlyPrice: systemSettings.class10YearlyPrice || 1499,
        leaderboardRules: systemSettings.leaderboardRules || '',
        enabledClasses: systemSettings.enabledClasses || ["class1", "class2", "class3", "class4", "class5", "class6", "class7", "class8", "class9", "class10"],
        dailyMcqAutomationEnabled: Boolean(systemSettings.dailyMcqAutomationEnabled),
        dailyMcqAutomationTime: String(systemSettings.dailyMcqAutomationTime || '07:00'),
        dailyMcqAutomationTimeZone: String(systemSettings.dailyMcqAutomationTimeZone || 'Asia/Kolkata'),
        dailyMcqAutomationPublishMode: systemSettings.dailyMcqAutomationPublishMode === 'published' ? 'published' : 'draft',
        dailyMcqSubjectRotation: Array.isArray(systemSettings.dailyMcqSubjectRotation)
          ? systemSettings.dailyMcqSubjectRotation.map((item: string) => String(item || '').trim().toLowerCase()).filter(Boolean)
          : String(systemSettings.dailyMcqSubjectRotation || '')
            .split(',')
            .map((item: string) => item.trim().toLowerCase())
            .filter(Boolean),
        gunduluPrompt: gunduluPromptDraft || ''
      };
      const safePrivateSettings = {
        aiApiKey: privateSettings.aiApiKey || ''
      };
      await setDoc(doc(firestore, 'system_settings', 'config'), safeSystemSettings, { merge: true });
      await setDoc(doc(firestore, 'settings', 'private'), safePrivateSettings, { merge: true });
      setSystemSettings((prev: any) => ({ ...prev, gunduluPrompt: gunduluPromptDraft }));
      isPromptDirtyRef.current = false;
      showNotification("Platform Configuration Synchronized!");
    } catch (err: any) {
      console.error("Save Settings Error:", err);
      showNotification("Sync Failed: " + err.message, 'error');
    }
  };

  const renderSettings = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
        <h3 className="text-2xl font-black text-white tracking-tighter">System Configuration</h3>
      </div>

      <div className="glass-card p-8 rounded-[2.5rem] space-y-8 border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Global Monthly Price (₹)</label>
            <input
              type="number"
              value={systemSettings.monthlyPrice || 99}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({ ...systemSettings, monthlyPrice: val === "" ? "" : parseInt(val) });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Global Yearly Price (₹)</label>
            <input
              type="number"
              value={systemSettings.yearlyPrice || 999}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({ ...systemSettings, yearlyPrice: val === "" ? "" : parseInt(val) });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class 10 Monthly Price (₹)</label>
            <input
              type="number"
              value={systemSettings.class10MonthlyPrice || 99}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({ ...systemSettings, class10MonthlyPrice: val === "" ? "" : parseInt(val) });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class 10 Yearly Price (₹)</label>
            <input
              type="number"
              value={systemSettings.class10YearlyPrice || 1499}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({ ...systemSettings, class10YearlyPrice: val === "" ? "" : parseInt(val) });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Leaderboard Rules</label>
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500/50 h-24"
            placeholder="Points calculation logic..."
            value={systemSettings.leaderboardRules || ''}
            onChange={(e) => setSystemSettings({ ...systemSettings, leaderboardRules: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Daily MCQ Automation</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white">
              <input
                type="checkbox"
                checked={Boolean(systemSettings.dailyMcqAutomationEnabled)}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  dailyMcqAutomationEnabled: e.target.checked,
                })}
              />
              <span className="text-sm">Enable 7 AM auto-generation</span>
            </label>
            <div>
              <input
                type="time"
                value={systemSettings.dailyMcqAutomationTime || '07:00'}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  dailyMcqAutomationTime: e.target.value,
                })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <input
                type="text"
                value={systemSettings.dailyMcqAutomationTimeZone || 'Asia/Kolkata'}
                onChange={(e) => setSystemSettings({
                  ...systemSettings,
                  dailyMcqAutomationTimeZone: e.target.value,
                })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                placeholder="Asia/Kolkata"
              />
            </div>
          </div>
          <div className="mt-3">
            <select
              value={systemSettings.dailyMcqAutomationPublishMode || 'draft'}
              onChange={(e) => setSystemSettings({
                ...systemSettings,
                dailyMcqAutomationPublishMode: e.target.value,
              })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="draft">Create as draft for admin review</option>
              <option value="published">Publish immediately at schedule time</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-2 italic">The server checks this every minute and generates daily MCQs from matching Google Drive textbook sources when the configured time is reached.</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Daily MCQ Subject Rotation</label>
          <input
            type="text"
            value={Array.isArray(systemSettings.dailyMcqSubjectRotation) ? systemSettings.dailyMcqSubjectRotation.join(', ') : (systemSettings.dailyMcqSubjectRotation || 'math, english, science, odia, social')}
            onChange={(e) => setSystemSettings({
              ...systemSettings,
              dailyMcqSubjectRotation: e.target.value
                .split(',')
                .map((item) => item.trim().toLowerCase())
                .filter(Boolean)
            })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            placeholder="math, english, science, odia, social"
          />
          <p className="text-[10px] text-slate-500 mt-2 italic">Used for daily set rotation order. You can include the same subject keys used in textbooks and content, such as evs, hindi, sanskrit, gk, social_science, vocational, art, and more.</p>
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Quick Add Subjects</p>
            <div className="flex flex-wrap gap-2">
              {availableDailyMcqSubjects.map(([subjectKey, subjectLabel]) => {
                const isSelected = normalizedDailyMcqRotation.includes(subjectKey);
                return (
                  <button
                    key={subjectKey}
                    type="button"
                    onClick={() => toggleDailyMcqRotationSubject(subjectKey)}
                    className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${isSelected ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                  >
                    {String(subjectLabel)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-4">Class Management (Enable/Disable)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(translations['en'].classes).map(([key, label]) => {
              const isEnabled = (systemSettings.enabledClasses || []).includes(key);
              return (
                <button
                  key={key}
                  onClick={() => {
                    const current = systemSettings.enabledClasses || [];
                    const next = isEnabled
                      ? current.filter((c: string) => c !== key)
                      : [...current, key];
                    setSystemSettings({ ...systemSettings, enabledClasses: next });
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                      : 'bg-slate-900 border-white/10 text-slate-500'
                    }`}
                >
                  <span className="text-sm font-medium">{label as string}</span>
                  {isEnabled ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 italic">* Disabled classes will be hidden from the student dashboard.</p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all"
        >
          Save System Configuration
        </button>
      </div>
    </div>
  );

  const renderTextbooks = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
          <h3 className="text-2xl font-black text-white tracking-tighter">Textbook Library</h3>
        </div>
        <button
          onClick={() => {
            setEditingTextbookId(null);
            setNewTextbook({
              class: 'class5',
              board: 'Odisha State Board',
              subject: 'math',
              title: '',
              download_url: '',
              driveFileId: '',
              driveUrl: '',
              thumbnail_url: '',
              status: 'published'
            });
            setIsAddingTextbook(!isAddingTextbook);
          }}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          {isAddingTextbook ? <X size={16} /> : <Plus size={16} />}
          {isAddingTextbook ? 'Close Editor' : 'Register New Textbook'}
        </button>
      </div>

      {isAddingTextbook && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden border-emerald-500/20">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Book size={120} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Textbook Display Title</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/30 font-bold text-lg tracking-tight"
                placeholder="e.g. Class 10 Mathematics - Part 1"
                value={newTextbook.title}
                onChange={(e) => setNewTextbook({ ...newTextbook, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Academic Class</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                value={newTextbook.class}
                onChange={(e) => setNewTextbook({ ...newTextbook, class: e.target.value })}
              >
                {Object.entries(translations['en'].classes).map(([key, label]) => (
                  <option key={key} value={key}>{label as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Subject Category</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                value={newTextbook.subject}
                onChange={(e) => setNewTextbook({ ...newTextbook, subject: e.target.value })}
              >
                {Object.entries(translations['en'].subjects).map(([key, label]) => (
                  <option key={key} value={key}>{label as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Academic Board</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-tighter"
                value={newTextbook.board}
                onChange={(e) => setNewTextbook({ ...newTextbook, board: e.target.value })}
              >
                <option value="">Select Board</option>
                {Object.entries(translations['en'].boards).map(([key, label]) => (
                  <option key={key} value={label as string}>{label as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Google Drive Reference ID</label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 text-sm font-medium"
                  placeholder="Paste Drive ID"
                  value={newTextbook.driveFileId || ''}
                  onChange={(e) => setNewTextbook({ ...newTextbook, driveFileId: extractDriveFileId(e.target.value) })}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Cloud Source URL (Drive or Folder)</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 text-sm font-medium"
                  placeholder="https://drive.google.com/..."
                  value={newTextbook.driveUrl || ''}
                  onChange={(e) => setNewTextbook({ ...newTextbook, driveUrl: e.target.value, driveFileId: newTextbook.driveFileId || extractDriveFileId(e.target.value) })}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Master Repository PDF Link</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 text-sm font-medium"
                    placeholder="Direct PDF URL"
                    value={newTextbook.download_url}
                    onChange={(e) => setNewTextbook({ ...newTextbook, download_url: e.target.value })}
                  />
                </div>
                <label className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-all border border-white/10 font-black text-[10px] uppercase tracking-widest shadow-xl">
                  <Upload size={18} className="text-emerald-500" />
                  <span>Upload Local</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          await handleFileUpload(file);
                        } catch (err) {
                          showNotification("Upload failed", "error");
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Deployment Status</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/30 cursor-pointer font-bold uppercase tracking-widest"
                value={newTextbook.status || 'draft'}
                onChange={(e) => setNewTextbook({ ...newTextbook, status: e.target.value })}
              >
                <option value="draft">Draft (Hidden)</option>
                <option value="published">Published (Live)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 justify-end mt-12 relative z-10">
            <button
              onClick={() => setIsAddingTextbook(false)}
              className="px-8 py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-white transition-all bg-white/5 rounded-2xl border border-white/5"
            >
              Discard Changes
            </button>
            <button
              onClick={async () => {
                try {
                  const normalizedDriveFileId = extractDriveFileId(newTextbook.driveFileId || newTextbook.driveUrl || '');
                  const normalizedDriveUrl = String(newTextbook.driveUrl || '').trim();
                  const normalizedDownloadUrl = String(newTextbook.download_url || '').trim() || normalizedDriveUrl;

                  if (!newTextbook.title || (!normalizedDownloadUrl && !normalizedDriveFileId)) {
                    showNotification("Title and Repository Source are required", "error");
                    return;
                  }

                  const textbookPayload = {
                    ...newTextbook,
                    download_url: normalizedDownloadUrl,
                    driveFileId: normalizedDriveFileId,
                    driveUrl: normalizedDriveUrl,
                    status: newTextbook.status || 'published',
                  };

                  if (editingTextbookId) {
                    await updateDoc(doc(firestore, 'textbooks', editingTextbookId), {
                      ...textbookPayload,
                      updated_at: serverTimestamp()
                    });
                    showNotification("Textbook Matrix Updated");
                  } else {
                    await addDoc(collection(firestore, 'textbooks'), {
                      ...textbookPayload,
                      created_at: serverTimestamp()
                    });
                    showNotification("Textbook Successfully Registered");
                  }
                  setIsAddingTextbook(false);
                } catch (err) {
                  console.error("Error saving textbook:", err);
                  showNotification("Platform Sync Failed", "error");
                }
              }}
              disabled={uploadingFile}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-emerald-600/40 active:scale-95 disabled:opacity-50"
            >
              {uploadingFile ? 'Deploying PDF...' : (editingTextbookId ? 'Apply Updates' : 'Commit to Library')}
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {textbooks.map((book) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-[2.5rem] overflow-hidden group hover:border-emerald-500/30 transition-all duration-500 flex flex-col"
          >
            <div className={`aspect-[3/4] relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${book.class === 'class1' ? 'from-rose-500/20 to-red-900/40' :
                book.class === 'class2' ? 'from-orange-400/20 to-orange-900/40' :
                  book.class === 'class3' ? 'from-amber-400/20 to-yellow-900/40' :
                    book.class === 'class4' ? 'from-lime-400/20 to-green-900/40' :
                      book.class === 'class5' ? 'from-emerald-400/20 to-teal-900/40' :
                        book.class === 'class6' ? 'from-cyan-400/20 to-sky-900/40' :
                          book.class === 'class7' ? 'from-blue-400/20 to-indigo-900/40' :
                            book.class === 'class8' ? 'from-violet-400/20 to-purple-900/40' :
                              book.class === 'class9' ? 'from-fuchsia-400/20 to-pink-900/40' :
                                book.class === 'class10' ? 'from-slate-300/20 to-slate-900/50' :
                                  'from-emerald-500/10 to-slate-900/60'
              }`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative flex flex-col items-center gap-4 text-center px-6 group-hover:scale-110 transition-transform duration-500">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                  <img src="/gundulu-rath-crest.png" alt="Class cover" className="h-12 w-12 object-contain drop-shadow-2xl" />
                </div>
                <div>
                  <div className="text-[12px] font-black tracking-[0.3em] text-white uppercase mb-1">
                    {translations['or']?.classes?.[book.class as keyof typeof translations.en.classes] || book.class}
                  </div>
                  <div className="text-[10px] font-bold text-white/60 tracking-wider line-clamp-2 uppercase">
                    {typeof book.subject === 'string' ? book.subject : (book.subject?.en || '')}
                  </div>
                </div>
              </div>
              <div className="absolute top-4 left-4">
                <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-full border shadow-lg ${book.status === 'published'
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : 'bg-amber-500 text-white border-amber-400'
                  }`}>
                  {book.status || 'draft'}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTextbookId(book.id);
                    setNewTextbook({
                      class: book.class || 'class5',
                      board: typeof book.board === 'string' ? book.board : (book.board?.en || ''),
                      subject: typeof book.subject === 'string' ? book.subject : (book.subject?.en || ''),
                      title: typeof book.title === 'string' ? book.title : (book.title?.en || ''),
                      download_url: book.download_url || '',
                      driveFileId: book.driveFileId || '',
                      driveUrl: book.driveUrl || '',
                      thumbnail_url: book.thumbnail_url || ''
                    });
                    setIsAddingTextbook(true);
                  }}
                  className="w-10 h-10 bg-slate-900/90 text-emerald-400 rounded-2xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/30"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirmAction === `delete-textbook-${book.id}`) {
                      try {
                        await deleteDoc(doc(firestore, 'textbooks', book.id));
                        showNotification("Repository Item Purged");
                        setConfirmAction(null);
                      } catch (err) {
                        console.error("Error deleting textbook:", err);
                        showNotification("Purge Failed", "error");
                        setConfirmAction(null);
                      }
                    } else {
                      setConfirmAction(`delete-textbook-${book.id}`);
                    }
                  }}
                  className={`h-10 px-4 rounded-2xl transition-all z-10 border flex items-center justify-center ${confirmAction === `delete-textbook-${book.id}` ? "bg-red-500 text-white border-red-400 text-[10px] font-black uppercase tracking-widest" : "bg-slate-900/90 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white"}`}
                >
                  {confirmAction === `delete-textbook-${book.id}` ? "PURGE?" : <Trash2 size={16} />}
                </button>
              </div>
            </div>
            <div className="p-6">
              <h4 className="text-white font-black text-lg tracking-tight mb-3 truncate group-hover:text-emerald-400 transition-colors">{typeof book.title === 'string' ? book.title : (book.title?.en || '')}</h4>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-[9px] uppercase tracking-widest font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full border border-white/10">
                  {book.class}
                </span>
                <span className="text-[9px] uppercase tracking-widest font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full border border-white/10">
                  {typeof book.board === 'string' ? book.board : (book.board?.en || '')}
                </span>
              </div>
              <a
                href={book.download_url || book.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-900/20 group-hover:scale-[1.02]"
              >
                <Download size={14} />
                Access Repository
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );



  function renderStudents() {
    const filteredStudents = students.filter(s =>
      (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.phoneNumber || '').toLowerCase().includes(studentSearch.toLowerCase())
    );

    return (
      <div className="glass-card p-8 rounded-[2.5rem]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Users & Teachers Management</h2>
            <p className="text-slate-400 text-sm mt-1">Total Users: {students.length} | Showing: {filteredStudents.length}</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4">Name</th>
                <th className="pb-4">Email / Phone</th>
                <th className="pb-4">Class</th>
                <th className="pb-4">Plan</th>
                <th className="pb-4">Expiry</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Role</th>
                <th className="pb-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const sub = allSubscriptions[student.id];
                const isLifetime = ['gyanaloka.panda@gmail.com', 'gyanapd.ram@gmail.com', 'pandadamayanti01@gmail.com', 'gyanalpanda@gmail.com'].includes(student.email?.toLowerCase()) || ['+918926118509', '8926118509', '+918457811227', '8457811227', '+916370487877', '6370487877'].includes(student.phoneNumber);
                const plan = isLifetime ? 'Pro (Lifetime)' : (sub?.active ? 'Pro' : 'Free');
                const expiry = isLifetime ? 'Never' : (sub?.expires_at ? (sub.expires_at.toDate ? sub.expires_at.toDate().toLocaleDateString() : new Date(sub.expires_at).toLocaleDateString()) : 'N/A');
                const status = isLifetime ? 'Paid' : (sub?.active ? 'Paid' : 'Pending');

                return (
                  <tr key={student.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-4 font-medium text-white">{student.name || 'N/A'}</td>
                    <td className="py-4 text-sm text-slate-400 font-mono">{student.email || student.phoneNumber || 'N/A'}</td>
                    <td className="py-4">{student.class || 'N/A'}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${plan.includes('Pro') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="py-4 text-sm">{expiry}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${status === 'Paid' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${student.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : (student.role === 'teacher' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400')}`}>
                        {student.role || 'student'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleGrantOneMonth(student.id, student.name || student.email || student.phoneNumber)}
                          className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
                        >
                          Grant 1 Month
                        </button>
                        <button
                          onClick={() => handleResetStudent(student)}
                          className="text-amber-400 hover:text-amber-300 font-medium text-sm transition-colors"
                        >
                          Reset Data
                        </button>
                        <button
                          onClick={() => handleWipeStudent(student)}
                          className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                        >
                          Wipe Account
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    {studentSearch ? "No students match your search." : "No students found in the database."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

  }

  async function handleGrantOneMonth(studentId: string, identifier: string) {
    if (!confirm(`Grant 1 month of Pro access to ${identifier}?`)) return;

    try {
      setLoading(true);
      const subDocRef = doc(firestore, 'subscriptions', studentId);
      const currentSub = allSubscriptions[studentId];

      let baseDate = new Date();
      if (currentSub?.active && currentSub?.expires_at) {
        const currentExpiry = parseLogTimestamp(currentSub.expires_at);
        if (currentExpiry && currentExpiry > new Date()) {
          baseDate = currentExpiry;
        }
      }

      const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      await setDoc(subDocRef, {
        active: true,
        plan: 'monthly',
        expires_at: Timestamp.fromDate(newExpiry),
        updatedAt: serverTimestamp(),
        identifier: identifier
      }, { merge: true });

      showNotification(`Successfully granted 1 month access to ${identifier}`);
    } catch (err: any) {
      console.error("Grant Error:", err);
      showNotification("Failed to grant access: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetStudent(student: any) {
    if (!confirm("Are you sure you want to reset this student's data and unlock their account? This cannot be undone.")) return;
    try {
      setLoading(true);
      // Reset student data and clear class/board bindings
      await updateDoc(doc(firestore, 'users', student.id), {
        points: 0,
        streak: 0,
        class: '',
        board: '',
        stats: {
          accuracy: 0,
          league: 'Bronze',
          badges: []
        }
      });

      if (student.phoneNumber) {
        await deleteDoc(doc(firestore, 'user_locks', student.phoneNumber)).catch(() => {});
      }
      if (student.email) {
        await deleteDoc(doc(firestore, 'user_locks', `email:${student.email.toLowerCase()}`)).catch(() => {});
      }

      showNotification("Student data reset and account fully unlocked!");
    } catch (err: any) {
      console.error("Reset Error:", err);
      showNotification("Failed to reset student: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleWipeStudent(student: any) {
    if (!confirm("CRITICAL: Are you sure you want to COMPLETELY WIPE this account from Firestore? They will start as a 100% brand new account.")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(firestore, 'users', student.id));

      if (student.phoneNumber) {
        await deleteDoc(doc(firestore, 'user_locks', student.phoneNumber)).catch(() => {});
      }
      if (student.email) {
        await deleteDoc(doc(firestore, 'user_locks', `email:${student.email.toLowerCase()}`)).catch(() => {});
      }

      showNotification("Account completely wiped and ready for fresh testing!");
    } catch (err: any) {
      console.error("Wipe Error:", err);
      showNotification("Failed to wipe account: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function renderUserLocks() {
    const filteredLocks = userLocks.filter(lock => {
      const query = lockSearchQuery.toLowerCase();
      return lock.id.toLowerCase().includes(query) ||
        lock.class?.toLowerCase().includes(query) ||
        lock.board?.toLowerCase().includes(query);
    });

    return (
      <div className="space-y-6">
        <div className="glass-card p-8 rounded-[2.5rem]">
          <h2 className="text-2xl font-bold text-white mb-6">User Locks Management</h2>

          {/* Search Bar */}
          <div className="mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by phone/email, class, or board..."
                value={lockSearchQuery}
                onChange={(e) => setLockSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Edit Mode */}
          {editingLock && (
            <div className="mb-6 bg-blue-500/10 border border-blue-500/30 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-white">Edit Lock</h3>
                <button
                  onClick={() => {
                    setEditingLock(null);
                    setNewLockClass('');
                    setNewLockBoard('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Phone/Email</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-400 text-sm">
                    {editingLock.id}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">Current Class</label>
                  <div className="px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-slate-400 text-sm">
                    {editingLock.class}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">New Class</label>
                  <select
                    value={newLockClass}
                    onChange={(e) => setNewLockClass(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select Class</option>
                    {Object.entries(translations['en'].classes).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">New Board</label>
                  <select
                    value={newLockBoard}
                    onChange={(e) => setNewLockBoard(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select Board</option>
                    {Object.entries(translations['en'].boards).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateLock(editingLock.id)}
                  disabled={!newLockClass || !newLockBoard}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl py-2 font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Save Changes
                </button>
                <button
                  onClick={() => handleDeleteLock(editingLock.id)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl py-2 font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete Lock
                </button>
              </div>
            </div>
          )}

          {/* Locks Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-slate-300">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-xs font-bold uppercase">Phone/Email</th>
                  <th className="pb-4 text-xs font-bold uppercase">Class</th>
                  <th className="pb-4 text-xs font-bold uppercase">Board</th>
                  <th className="pb-4 text-xs font-bold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No locks found
                    </td>
                  </tr>
                ) : (
                  filteredLocks.map(lock => (
                    <tr key={lock.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <Lock size={16} className="text-amber-500" />
                          <span className="font-mono text-sm">{lock.id}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-bold">
                          {lock.class || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold">
                          {lock.board || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingLock(lock);
                            setNewLockClass(lock.class || '');
                            setNewLockBoard(lock.board || '');
                          }}
                          className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Edit size={14} /> Change
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500 mt-4 italic">
            Total locks: {userLocks.length} | Filtered: {filteredLocks.length}
          </p>
        </div>
      </div>
    );
  }

  async function handleUpdateLock(lockId: string) {
    if (!newLockClass || !newLockBoard) {
      showNotification("Please select both class and board", 'error');
      return;
    }

    try {
      setLoading(true);

      // Update user lock
      await setDoc(doc(firestore, 'user_locks', lockId), {
        class: newLockClass,
        board: newLockBoard,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      }, { merge: true });

      // Create audit log
      await addDoc(collection(firestore, 'lock_audit_log'), {
        userId: lockId,
        oldClass: editingLock.class,
        oldBoard: editingLock.board,
        newClass: newLockClass,
        newBoard: newLockBoard,
        changedAt: new Date().toISOString(),
        changedBy: 'admin'
      });

      // Find and update user document if exists
      if (lockId.startsWith('email:')) {
        const email = lockId.substring(6);
        const userQuery = query(collection(firestore, 'users'), where('email', '==', email));
        const userDocs = await getDocs(userQuery);
        if (!userDocs.empty) {
          await updateDoc(doc(firestore, 'users', userDocs.docs[0].id), {
            class: newLockClass,
            board: newLockBoard
          });
        }
      } else {
        const phoneQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', lockId));
        const userDocs = await getDocs(phoneQuery);
        if (!userDocs.empty) {
          await updateDoc(doc(firestore, 'users', userDocs.docs[0].id), {
            class: newLockClass,
            board: newLockBoard
          });
        }
      }

      showNotification("Lock updated successfully!");
      setEditingLock(null);
      setNewLockClass('');
      setNewLockBoard('');
    } catch (err: any) {
      console.error("Update Error:", err);
      showNotification("Failed to update lock: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLock(lockId: string) {
    if (!confirm("Are you sure you want to delete this lock? The user will be able to register with this phone/email again.")) return;

    try {
      setLoading(true);

      // Delete lock
      await deleteDoc(doc(firestore, 'user_locks', lockId));

      // Create audit log
      await addDoc(collection(firestore, 'lock_audit_log'), {
        userId: lockId,
        action: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: 'admin'
      });

      showNotification("Lock deleted successfully!");
      setEditingLock(null);
      setNewLockClass('');
      setNewLockBoard('');
    } catch (err: any) {
      console.error("Delete Error:", err);
      showNotification("Failed to delete lock: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAiLog(logId: string) {
    if (!confirm("Are you sure you want to delete this interaction log?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(firestore, 'tutor_queries', logId));
      showNotification("Interaction log purged.");
    } catch (err: any) {
      console.error("Delete AI Log Error:", err);
      showNotification("Failed to delete log: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleClearAllAiLogs() {
    if (!confirm("CRITICAL ACTION: Are you sure you want to DELETE ALL AI logs? This cannot be undone.")) return;
    try {
      setLoading(true);
      let count = 0;
      // We process all current logs. For large collections, this might need batching, 
      // but for tutor queries it should be manageable initially.
      const promises = aiLogs.map(log => deleteDoc(doc(firestore, 'tutor_queries', log.id)));
      await Promise.all(promises);
      count = aiLogs.length;
      showNotification(`Successfully purged ${count} logs.`);
    } catch (err: any) {
      console.error("Clear All AI Logs Error:", err);
      showNotification("Failed to clear all logs. Some items may still remain.", 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinSupport() {
    if (!remoteCode || remoteCode.length !== 6) {
      showNotification("Please enter a valid 6-digit code", "error");
      return;
    }
    setLoading(true);
    try {
      await joinSupportSession(remoteCode, auth.currentUser?.uid || '');
      setIsRemoteActive(true);
      showNotification("Connected to student session!");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Effect to listen to active session
  useEffect(() => {
    if (!isRemoteActive || !remoteCode) return;
    const unsub = onSnapshot(doc(firestore, 'remote_support', remoteCode), (snap) => {
      if (snap.exists()) setRemoteSession(snap.data());
      else {
        setIsRemoteActive(false);
        setRemoteSession(null);
      }
    });
    return () => unsub();
  }, [isRemoteActive, remoteCode]);

  async function handleRemoteNavigate(target: string) {
    if (!isRemoteActive || !remoteCode) return;
    try {
      await sendRemoteCommand(remoteCode, { type: 'navigate', target, timestamp: Date.now() });
      showNotification(`Command Sent: Navigate to ${target}`);
    } catch (err) {
      console.error("Failed to send command", err);
    }
  }

  function handleMouseMoveOnPad(e: React.MouseEvent<HTMLDivElement>) {
    if (!isRemoteActive || !remoteCode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updatePointer(remoteCode, x, y);
  }

  function renderSupport() {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"></div>
            <h3 className="text-2xl font-black text-white tracking-tighter">Support Center</h3>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setSupportSubTab('tickets')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${supportSubTab === 'tickets' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Tickets
            </button>
            <button
              onClick={() => setSupportSubTab('remote')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${supportSubTab === 'remote' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Remote Assist
            </button>
          </div>
        </div>

        {supportSubTab === 'tickets' ? (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Active Tickets</h4>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase">
                {supportTickets.filter(t => t.status === 'open').length} Open
              </span>
            </div>
            {supportTickets.length === 0 ? (
              <div className="glass-card p-12 rounded-3xl text-center">
                <HelpCircle className="mx-auto text-slate-700 mb-4" size={48} />
                <p className="text-slate-500 font-bold">No support tickets found.</p>
              </div>
            ) : (
              supportTickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${ticket.status === 'open' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {ticket.status}
                        </span>
                        <h4 className="text-white font-black tracking-tight">{ticket.userName}</h4>
                        <span className="text-slate-500 text-[10px] font-bold uppercase">{ticket.userPhone || ticket.userEmail}</span>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed font-medium">{ticket.message}</p>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 font-bold uppercase tracking-widest">
                        <Calendar size={10} />
                        {parseLogTimestamp(ticket.createdAt)?.toLocaleString() || 'Recently'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ticket.status === 'open' ? (
                        <button
                          onClick={async () => {
                            await updateDoc(doc(firestore, 'support_tickets', ticket.id), { status: 'closed' });
                            showNotification("Ticket marked as closed");
                          }}
                          className="px-6 py-2.5 bg-emerald-600/10 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/20"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await updateDoc(doc(firestore, 'support_tickets', ticket.id), { status: 'open' });
                            showNotification("Ticket reopened");
                          }}
                          className="px-6 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all border border-white/5"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to delete this ticket?")) {
                            await deleteDoc(doc(firestore, 'support_tickets', ticket.id));
                            showNotification("Ticket deleted");
                          }
                        }}
                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          <LiveSupportTab user={user} />
        )}
      </div>
    );
  }

  function renderDigitalLibraryUpload() {
    const filteredContent = content.filter((c: any) => {
      const isLib = c.isLibraryChapter || !!c.pdfUrl;
      if (!isLib) return false;

      const cleanClass = (cls: string) => (cls || '').toLowerCase().replace(/\s+/g, '').replace('class', '').replace('th', '');
      const matchesClass = libClassFilter === 'all' || cleanClass(c.class) === cleanClass(libClassFilter);
      const matchesSubject = libSubjectFilter === 'all' || c.subject === libSubjectFilter;
      return matchesClass && matchesSubject;
    });

    const handleOpenAddModal = () => {
      setLibEditingChapter(null);
      setLibFormTitle('');
      setLibFormClass(libClassFilter === 'all' ? 'class10' : libClassFilter);
      setLibFormSubject(libSubjectFilter === 'all' ? 'math' : libSubjectFilter);
      setLibFormNotes('');
      setLibFormPdfUrl('');
      setLibFormCoverUrl('');
      setLibFormVideoUrl('');
      setPdfUploadProgress(null);
      setCoverUploadProgress(null);
      setIsLibModalOpen(true);
    };

    const handleOpenEditModal = (chapter: any) => {
      setLibEditingChapter(chapter);
      setLibFormTitle(chapter.title || '');
      setLibFormClass(chapter.class || 'class10');
      setLibFormSubject(chapter.subject || 'math');
      setLibFormNotes(chapter.notes || '');
      setLibFormPdfUrl(chapter.pdfUrl || '');
      setLibFormCoverUrl(chapter.coverUrl || '');
      setLibFormVideoUrl(chapter.videoUrl || '');
      setPdfUploadProgress(null);
      setCoverUploadProgress(null);
      setIsLibModalOpen(true);
    };

    const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        alert("Please upload a valid PDF file.");
        return;
      }

      setPdfUploadProgress(0);
      const uniqueFilename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `chapters_pdf/${uniqueFilename}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setPdfUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("PDF upload error:", error);
          alert("Failed to upload original textbook PDF. Try again.");
          setPdfUploadProgress(null);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setLibFormPdfUrl(downloadUrl);
          showNotification("PDF file uploaded successfully!");
          setPdfUploadProgress(null);
        }
      );
    };

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert("Please upload a valid image file (PNG, JPG, WEBP).");
        return;
      }

      setCoverUploadProgress(0);
      const uniqueFilename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const storageRef = ref(storage, `chapters_covers/${uniqueFilename}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setCoverUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Cover upload error:", error);
          alert("Failed to upload cover image. Try again.");
          setCoverUploadProgress(null);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setLibFormCoverUrl(downloadUrl);
          showNotification("Cover image uploaded successfully!");
          setCoverUploadProgress(null);
        }
      );
    };

    const handleSaveChapter = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!libFormTitle.trim()) {
        alert("Please enter a chapter title.");
        return;
      }

      setIsLibSaving(true);
      try {
        const chapterPayload = {
          title: libFormTitle,
          class: libFormClass,
          subject: libFormSubject,
          notes: libFormNotes,
          pdfUrl: libFormPdfUrl,
          coverUrl: libFormCoverUrl,
          videoUrl: libFormVideoUrl,
          isLibraryChapter: true,
          status: 'published',
          updatedAt: new Date()
        };

        if (libEditingChapter) {
          await updateDoc(doc(firestore, 'chapters', libEditingChapter.id), chapterPayload);
          showNotification("Chapter updated successfully!");
        } else {
          // Check if board needs standard odisha board tag (helpful for matching filtering in App.tsx)
          const addedPayload = {
            ...chapterPayload,
            board: "Odisha Board (Odia Medium)",
            createdAt: new Date()
          };
          await addDoc(collection(firestore, 'chapters'), addedPayload);
          showNotification("New chapter added successfully!");
        }

        setIsLibModalOpen(false);
      } catch (err) {
        console.error("Save chapter error:", err);
        alert("Failed to save chapter.");
      } finally {
        setIsLibSaving(false);
      }
    };

    const handleDeleteChapter = async (chapterId: string) => {
      if (window.confirm("Are you sure you want to delete this chapter? This cannot be undone.")) {
        try {
          await deleteDoc(doc(firestore, 'chapters', chapterId));
          showNotification("Chapter deleted successfully");
        } catch (err) {
          console.error("Delete chapter error:", err);
          alert("Failed to delete chapter.");
        }
      }
    };

    return (
      <div className="space-y-8">
        {/* Banner */}
        <div className="glass-card p-8 rounded-[2.5rem] bg-gradient-to-r from-emerald-950/20 to-slate-900 border border-white/5 relative overflow-hidden">
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-emerald-500/10 pointer-events-none">
            <Library size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Library Manager</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Upload and organize interactive textbooks, study notes, and PDF chapters. Students can view original PDFs side-by-side with your AI-powered study materials.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-900/30 self-start md:self-auto"
            >
              <Plus size={16} />
              <span>Add New Chapter</span>
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-900/20 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-auto flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Class Filter</label>
            <select
              value={libClassFilter}
              onChange={(e) => setLibClassFilter(e.target.value)}
              className="w-full bg-[#090d16] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="all">All Classes</option>
              <option value="class10">Class 10</option>
              <option value="class9">Class 9</option>
              <option value="class8">Class 8</option>
              <option value="class7">Class 7</option>
              <option value="class6">Class 6</option>
              <option value="class5">Class 5</option>
              <option value="class4">Class 4</option>
              <option value="class3">Class 3</option>
              <option value="class2">Class 2</option>
              <option value="class1">Class 1</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Subject Filter</label>
            <select
              value={libSubjectFilter}
              onChange={(e) => setLibSubjectFilter(e.target.value)}
              className="w-full bg-[#090d16] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500/30"
            >
              <option value="all">All Subjects</option>
              <option value="math">Mathematics</option>
              <option value="algebra">Algebra (Class 9/10)</option>
              <option value="geometry">Geometry (Class 9/10)</option>
              <option value="science">General Science</option>
              <option value="physical_science">Physical Science</option>
              <option value="life_science">Life Science</option>
              <option value="social_science">History</option>
              <option value="english">English</option>
              <option value="english_grammar">English Grammar</option>
              <option value="odia">Odia</option>
              <option value="odia_grammar">Odia Grammar</option>
              <option value="sanskrit">Sanskrit</option>
              <option value="sanskrit_grammar">Sanskrit Grammar</option>
              <option value="hindi">Hindi</option>
              <option value="hindi_grammar">Hindi Grammar</option>
              <option value="vocational">Vocational</option>
              <option value="epe">Art & Health</option>
            </select>
          </div>
        </div>

        {/* Chapters Table */}
        <div className="glass-card rounded-[2.5rem] border border-white/5 bg-slate-900/20 overflow-hidden">
          {filteredContent.length === 0 ? (
            <div className="p-16 text-center">
              <Library className="mx-auto text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-black text-white">No chapters found</h3>
              <p className="text-xs text-slate-500 mt-1">Try selecting a different filter or create a new chapter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/40">
                    <th className="p-5 text-[10px] uppercase tracking-wider font-black text-slate-500">Chapter Title</th>
                    <th className="p-5 text-[10px] uppercase tracking-wider font-black text-slate-500">Subject</th>
                    <th className="p-5 text-[10px] uppercase tracking-wider font-black text-slate-500">Class</th>
                    <th className="p-5 text-[10px] uppercase tracking-wider font-black text-slate-500">Status</th>
                    <th className="p-5 text-[10px] uppercase tracking-wider font-black text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredContent.map((chapter: any) => (
                    <tr key={chapter.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5">
                        <div className="font-extrabold text-white text-sm group-hover:text-emerald-400 transition-colors">
                          {chapter.title}
                        </div>
                      </td>
                      <td className="p-5">
                        <span className="text-xs font-bold uppercase text-slate-400">{chapter.subject}</span>
                      </td>
                      <td className="p-5">
                        <span className="text-xs font-black text-slate-400 uppercase">{chapter.class}</span>
                      </td>
                      <td className="p-5">
                        {chapter.pdfUrl ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            PDF Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-500">
                            Notes Only
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(chapter)}
                            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-all active:scale-95"
                            title="Edit Chapter"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                            title="Delete Chapter"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FORM MODAL OVERLAY */}
        <AnimatePresence>
          {isLibModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Blur background */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLibModalOpen(false)}
                className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
              />

              {/* Form Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[90vh] bg-[#070b13] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-white/5 bg-slate-950/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {libEditingChapter ? "Edit Textbook Chapter" : "Create Textbook Chapter"}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">Fill in the fields below to update the student library.</p>
                  </div>
                  <button
                    onClick={() => setIsLibModalOpen(false)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveChapter} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Title */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase font-black tracking-widest text-slate-400">Chapter Title</label>
                    <input
                      type="text"
                      required
                      value={libFormTitle}
                      onChange={(e) => setLibFormTitle(e.target.value)}
                      placeholder="e.g. ସରଳ ସହସମୀକରଣ (Linear Simultaneous Equations)"
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30"
                    />
                  </div>

                  {/* Grid Class & Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs uppercase font-black tracking-widest text-slate-400">Class Target</label>
                      <select
                        value={libFormClass}
                        onChange={(e) => setLibFormClass(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/30"
                      >
                        <option value="class10">Class 10</option>
                        <option value="class9">Class 9</option>
                        <option value="class8">Class 8</option>
                        <option value="class7">Class 7</option>
                        <option value="class6">Class 6</option>
                        <option value="class5">Class 5</option>
                        <option value="class4">Class 4</option>
                        <option value="class3">Class 3</option>
                        <option value="class2">Class 2</option>
                        <option value="class1">Class 1</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs uppercase font-black tracking-widest text-slate-400">Subject Cover</label>
                      <select
                        value={libFormSubject}
                        onChange={(e) => setLibFormSubject(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/30"
                      >
                        <option value="math">Mathematics</option>
                        <option value="algebra">Algebra (Class 9/10)</option>
                        <option value="geometry">Geometry (Class 9/10)</option>
                        <option value="science">General Science</option>
                        <option value="physical_science">Physical Science</option>
                        <option value="life_science">Life Science</option>
                        <option value="social_science">History</option>
                        <option value="english">English</option>
                        <option value="english_grammar">English Grammar</option>
                        <option value="odia">Odia</option>
                        <option value="odia_grammar">Odia Grammar</option>
                        <option value="sanskrit">Sanskrit</option>
                        <option value="sanskrit_grammar">Sanskrit Grammar</option>
                        <option value="hindi">Hindi</option>
                        <option value="hindi_grammar">Hindi Grammar</option>
                        <option value="vocational">Vocational</option>
                        <option value="epe">Art & Health</option>
                      </select>
                    </div>
                  </div>

                  {/* PDF Upload Field */}
                  <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-950/40 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white">Original Textbook PDF</h4>
                        <p className="text-slate-500 text-xs mt-0.5">Upload scanned textbook chapters directly from your local system.</p>
                      </div>

                      <div className="relative">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handlePdfFileChange}
                          id="pdf-upload-input"
                          className="hidden"
                          disabled={pdfUploadProgress !== null}
                        />
                        <label
                          htmlFor="pdf-upload-input"
                          className={`flex items-center gap-2 px-5 py-3 bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all ${pdfUploadProgress !== null ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                        >
                          <Upload size={14} />
                          <span>{pdfUploadProgress !== null ? "Uploading..." : "Select File"}</span>
                        </label>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {pdfUploadProgress !== null && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                          <span>Uploading chapter PDF to Firebase Storage...</span>
                          <span>{pdfUploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${pdfUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Current File Binding */}
                    {libFormPdfUrl && (
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-400 mt-2 bg-sky-400/5 px-4 py-2.5 rounded-xl border border-sky-400/10">
                        <FileText size={14} />
                        <span className="truncate flex-1">Attached: {libFormPdfUrl}</span>
                        <a href={libFormPdfUrl} target="_blank" rel="noreferrer" className="text-sky-300 hover:underline font-black">View File</a>
                      </div>
                    )}
                  </div>

                  {/* Chapter Cover Image Upload Field */}
                  <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-950/40 flex flex-col gap-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <h4 className="text-sm font-black text-white">Chapter Cover Image</h4>
                        <p className="text-slate-500 text-xs mt-0.5">Upload a custom thumbnail cover for this specific chapter textbook.</p>
                      </div>

                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverFileChange}
                          id="cover-upload-input"
                          className="hidden"
                          disabled={coverUploadProgress !== null}
                        />
                        <label
                          htmlFor="cover-upload-input"
                          className={`flex items-center gap-2 px-5 py-3 bg-slate-900 border border-white/5 hover:border-emerald-500/30 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all ${coverUploadProgress !== null ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                        >
                          <Image size={14} />
                          <span>{coverUploadProgress !== null ? "Uploading..." : "Select Cover"}</span>
                        </label>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {coverUploadProgress !== null && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                          <span>Uploading cover image...</span>
                          <span>{coverUploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${coverUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Current File Binding / Image Preview */}
                    {libFormCoverUrl && (
                      <div className="flex items-center gap-4 mt-2 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                        <img 
                          src={libFormCoverUrl} 
                          alt="Cover Thumbnail" 
                          className="w-16 h-16 rounded-xl object-cover border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white uppercase tracking-wider">Cover Selected</p>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">{libFormCoverUrl}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLibFormCoverUrl('')}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                          title="Remove Cover Image"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* YouTube Video URL Field */}
                  <div className="glass-card p-6 rounded-[2rem] border border-white/5 bg-slate-950/40 flex flex-col gap-4">
                    <div>
                      <h4 className="text-sm font-black text-white">YouTube Concept Video URL</h4>
                      <p className="text-slate-500 text-xs mt-0.5">Add a YouTube video link or playlist link for high-yield student visualization.</p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                        <Youtube size={16} />
                      </div>
                      <input
                        type="url"
                        value={libFormVideoUrl}
                        onChange={(e) => setLibFormVideoUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=..."
                        className="w-full bg-slate-950/80 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500/30"
                      />
                    </div>
                  </div>

                  {/* Study Notes Markdown Area */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase font-black tracking-widest text-slate-400">Interactive Notes / Study Guide (Markdown)</label>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Supports Markdown formatting</span>
                    </div>
                    <textarea
                      value={libFormNotes}
                      onChange={(e) => setLibFormNotes(e.target.value)}
                      placeholder="# Title of Study Guide&#10;&#10;## Important Formulas&#10;- Formula 1: a + b = c&#10;&#10;## Solved Practice Questions&#10;1. Question text..."
                      className="w-full h-72 bg-slate-950 border border-white/5 rounded-2xl p-5 text-sm font-medium text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 resize-none font-mono"
                    />
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="pt-6 border-t border-white/5 flex items-center justify-end gap-4 bg-[#070b13]">
                    <button
                      type="button"
                      onClick={() => setIsLibModalOpen(false)}
                      className="px-6 py-4 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLibSaving || pdfUploadProgress !== null}
                      className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20"
                    >
                      {isLibSaving ? "Saving..." : "Save Chapter"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-['Inter'] selection:bg-cyan-500/30 selection:text-white overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5 z-[50] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <LayoutDashboard className="text-white" size={16} />
          </div>
          <span className="font-black text-white text-lg tracking-tight">UTKAL <span className="text-emerald-500">ADMIN</span></span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <SidebarNavigation />

      {/* Main Content Area */}
      <main className={`transition-all duration-500 pt-24 lg:pt-24 pb-12 pl-4 pr-4 md:pl-6 md:pr-6 lg:pr-10 ${isSidebarOpen ? 'lg:pl-80' : 'lg:pl-28'}`}>
        <div className="max-w-7xl mx-auto space-y-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'content' && renderContent()}
              {activeTab === 'digital_library_upload' && renderDigitalLibraryUpload()}
              {activeTab === 'monthly_tests' && renderMonthlyTests()}
              {activeTab === 'daily_mcqs' && <DailyMcqTab mcqs={dailyMcqs} textbooks={textbooks} subjectRotation={systemSettings.dailyMcqSubjectRotation} showNotification={showNotification} />}
              {activeTab === 'textbooks' && renderTextbooks()}
              {activeTab === 'ai_usage' && renderAiUsage()}
              {activeTab === 'payments' && renderPayments()}
              {activeTab === 'notifications' && renderNotifications()}
              {activeTab === 'settings' && renderSettings()}
              {activeTab === 'students' && renderStudents()}
              {activeTab === 'user_locks' && renderUserLocks()}
              {activeTab === 'support' && renderSupport()}
              {activeTab === 'subscriptions' && renderSubscriptions()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-10 right-10 z-[100] flex items-center gap-4 px-8 py-5 rounded-[2rem] border shadow-2xl backdrop-blur-2xl ${notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
          >
            <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            </div>
            <div>
              <p className="font-black text-white tracking-tight uppercase text-[10px]">System Notification</p>
              <p className="font-bold text-xs uppercase tracking-widest">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
