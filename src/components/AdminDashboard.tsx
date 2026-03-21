import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Brain, 
  CreditCard, 
  Bell, 
  Settings, 
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
  Edit2,
  Sparkles,
  ArrowLeft,
  Rocket,
  Book,
  Edit,
  Upload,
  File,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db as firestore, auth, storage } from '../firebase';
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
import { 
  translateContent, 
  generateChapterContent, 
  generateTestContent, 
  importPlaylistContent,
  generateCurriculum,
  generateTestQuestions
} from '../services/aiService';

type AdminTab = 'dashboard' | 'content' | 'monthly_tests' | 'textbooks' | 'ai_usage' | 'payments' | 'notifications' | 'settings' | 'production_setup';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    aiQuestionsToday: 0
  });

  const [content, setContent] = useState<any[]>([]);
  const [monthlyTests, setMonthlyTests] = useState<any[]>([]);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [privateSettings, setPrivateSettings] = useState<any>({});
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  const [genClass, setGenClass] = useState('class5');
  const [genBoard, setGenBoard] = useState('odisha');
  
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [newTest, setNewTest] = useState<any>({
    subject: 'math',
    class: 'class5',
    month: 'January',
    year: new Date().getFullYear(),
    language: 'or',
    questions: [],
    status: 'draft'
  });

  const [isAddingTextbook, setIsAddingTextbook] = useState(false);
  const [editingTextbookId, setEditingTextbookId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTextbook, setNewTextbook] = useState<any>({
    class: 'class5',
    board: 'odisha',
    subject: 'math',
    title: '',
    download_url: '',
    thumbnail_url: '',
    status: 'draft'
  });

  const handleFileUpload = async (file: File, type: 'pdf' | 'thumbnail') => {
    if (!file) return;
    
    setUploadingFile(type);
    setUploadProgress(0);

    const storageRef = ref(storage, `textbooks/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          showNotification(`Upload failed: ${error.message}`, "error");
          setUploadingFile(null);
          reject(error);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          if (type === 'pdf') {
            setNewTextbook(prev => ({ ...prev, download_url: downloadURL }));
          } else {
            setNewTextbook(prev => ({ ...prev, thumbnail_url: downloadURL }));
          }
          setUploadingFile(null);
          showNotification(`${type === 'pdf' ? 'PDF' : 'Thumbnail'} uploaded successfully`);
          resolve(downloadURL);
        }
      );
    });
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Real-time stats and data
    const unsubChapters = onSnapshot(collection(firestore, 'chapters'), (snapshot) => {
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
      setStats(prev => ({
        ...prev,
        totalRevenue: txs.reduce((acc, curr: any) => acc + (curr.amount || 0), 0)
      }));
    }, (err) => {
      console.error("Firestore Transactions onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for transactions. Please ensure you are logged in as admin.", "error");
      }
    });

    const unsubAi = onSnapshot(collection(firestore, 'ai_usage'), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
      const today = new Date().toISOString().split('T')[0];
      setStats(prev => ({
        ...prev,
        aiQuestionsToday: logs.filter((l: any) => l.date?.startsWith(today)).length
      }));
    }, (err) => {
      console.error("Firestore AI Usage onSnapshot Error:", err);
      if (err.message.includes('insufficient permissions')) {
        showNotification("Permission denied for AI usage logs.", "error");
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
      if (doc.exists()) setSystemSettings(doc.data());
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

    return () => {
      unsubChapters();
      unsubTx();
      unsubAi();
      unsubNotifs();
      unsubSettings();
      unsubTests();
      unsubPrivateSettings();
      unsubTextbooks();
    };
  }, []);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: CreditCard, color: 'text-amber-500' },
          { label: 'AI Questions Today', value: stats.aiQuestionsToday, icon: Brain, color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/5 border border-white/10 p-4 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={stat.color} size={20} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="bg-emerald-600/10 border border-emerald-500/20 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="text-emerald-500" size={24} />
          <h3 className="text-lg font-bold text-white">Quick AI Test Generator</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">Generate a complete monthly test with AI in seconds. Just select the class and subject.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select 
            value={newTest.class}
            onChange={(e) => setNewTest({...newTest, class: e.target.value})}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
          >
            {Object.entries(translations['en'].classes).map(([key, label]) => (
              <option key={key} value={key}>{label as string}</option>
            ))}
          </select>
          <select 
            value={newTest.subject}
            onChange={(e) => setNewTest({...newTest, subject: e.target.value})}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-2 font-bold transition-all flex items-center justify-center gap-2"
          >
            {isGeneratingTestAI ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Rocket size={18} />}
            Generate Now
          </button>
        </div>
      </div>

      <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Rocket className="text-indigo-500" size={24} />
          <h3 className="text-lg font-bold text-white">Restore Deleted Chapters</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">If you accidentally deleted chapters, you can use AI to re-generate the standard curriculum for all classes (Play to Class 10).</p>
        <button 
          onClick={() => setActiveTab('production_setup')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-6 py-3 font-bold transition-all flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          Go to Production Setup
        </button>
      </div>
    </div>
  );

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
    board: 'odisha',
    class: 'class3',
    language: 'or',
    subject: 'math',
    title: '',
    playlist_id: '',
    notes: '',
    practice_questions: [] as { question: string; answer: string; ai_answer?: string }[],
    quiz_questions: [] as any[],
    status: 'draft' as 'draft' | 'published'
  });

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalSubject = isOtherSubject ? customSubject : newChapter.subject;
      
      // Map common subject names to keys
      const subjectMapping: Record<string, string> = {
        'Mathematics': 'math',
        'Math': 'math',
        'Science': 'science',
        'English': 'english',
        'Odia': 'odia',
        'History': 'history',
        'Geography': 'geography',
        'Social Studies': 'social',
        'Hindi': 'hindi',
        'Sanskrit': 'sanskrit',
        'EVS': 'evs',
        'General Knowledge': 'gk',
        'GK': 'gk',
        'Physics': 'physics',
        'Chemistry': 'chemistry',
        'Biology': 'biology'
      };

      if (subjectMapping[finalSubject]) {
        finalSubject = subjectMapping[finalSubject];
      }

      if (isEditingChapter && editingChapterId) {
        await updateDoc(doc(firestore, 'chapters', editingChapterId), {
          ...newChapter,
          subject: finalSubject,
          updatedAt: serverTimestamp()
        });
        showNotification("Chapter updated successfully!");
        setIsEditingChapter(false);
        setEditingChapterId(null);
      } else {
        // Save the original chapter
        const originalDocRef = await addDoc(collection(firestore, 'chapters'), {
          ...newChapter,
          subject: finalSubject,
          createdAt: serverTimestamp()
        });

        // Determine target language for auto-translation
        const targetLang = newChapter.language === 'en' ? 'or' : 'en';
        
        // Translate title and notes
        const translatedTitle = await translateContent(newChapter.title, targetLang);
        const translatedNotes = newChapter.notes ? await translateContent(newChapter.notes, targetLang) : '';

        // Translate practice questions
        const translatedPractice = newChapter.practice_questions.length > 0 ? await translateContent(newChapter.practice_questions, targetLang) : [];

        // Translate quiz questions
        const translatedQuiz = newChapter.quiz_questions.length > 0 ? await translateContent(newChapter.quiz_questions, targetLang) : [];

        // Save the translated chapter
        await addDoc(collection(firestore, 'chapters'), {
          ...newChapter,
          subject: finalSubject,
          language: targetLang,
          title: translatedTitle || newChapter.title,
          notes: translatedNotes || newChapter.notes,
          practice_questions: translatedPractice,
          quiz_questions: translatedQuiz,
          translationGroupId: originalDocRef.id,
          createdAt: serverTimestamp()
        });
        
        // Update original chapter with translationGroupId
        await updateDoc(doc(firestore, 'chapters', originalDocRef.id), {
          translationGroupId: originalDocRef.id
        });
        
        showNotification("Chapter and its auto-translation added successfully!");
      }
      
      setIsAddingChapter(false);
      setIsOtherSubject(false);
      setCustomSubject('');
      setNewChapter({
        board: 'odisha',
        class: 'class3',
        language: 'or',
        subject: 'math',
        title: '',
        playlist_id: '',
        notes: '',
        practice_questions: [],
        quiz_questions: [],
        status: 'draft'
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
        newChapter.class,
        newChapter.language as 'en' | 'or'
      );
      
      setNewChapter(prev => ({
        ...prev,
        notes: result.notes,
        practice_questions: result.practice_questions,
        quiz_questions: result.quiz_questions
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
      const subjectName = isOtherTestSubject ? customTestSubject : (translations['en'].subjects[newTest.subject as keyof typeof translations.en.subjects] || newTest.subject);
      
      const result = await generateTestContent(
        subjectName,
        newTest.class,
        newTest.month,
        newTest.year,
        newTest.language as 'en' | 'or'
      );
      
      setNewTest(prev => ({
        ...prev,
        questions: result.questions
      }));
      
      // Log AI usage
      await addDoc(collection(firestore, 'ai_usage'), {
        userId: auth.currentUser?.uid,
        question: `Monthly Test: ${subjectName} - ${newTest.month} ${newTest.year}`,
        date: new Date().toISOString(),
        cost: 0.05
      });
      
      showNotification("AI has generated the test questions for you! Please review them before saving.");
    } catch (err: any) {
      console.error("AI Test Generation Error:", err);
      showNotification("Failed to generate test with AI: " + err.message, 'error');
    } finally {
      setIsGeneratingTestAI(false);
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
        
        // Save the original chapter (Odia)
        const originalDocRef = await addDoc(collection(firestore, 'chapters'), {
          board: 'odisha',
          class: 'class3',
          language: 'or',
          subject: 'math',
          title: chapter.title,
          playlist_id: chapter.videoId,
          notes: '',
          practice_questions: [],
          quiz_questions: [],
          createdAt: serverTimestamp()
        });

        // Auto-translate to English
        const translatedTitle = await translateContent(chapter.title, 'en');

        await addDoc(collection(firestore, 'chapters'), {
          board: 'odisha',
          class: 'class3',
          language: 'en',
          subject: 'math',
          title: translatedTitle || chapter.title,
          playlist_id: chapter.videoId,
          notes: '',
          practice_questions: [],
          quiz_questions: [],
          translationGroupId: originalDocRef.id,
          createdAt: serverTimestamp()
        });
        
        await updateDoc(doc(firestore, 'chapters', originalDocRef.id), {
          translationGroupId: originalDocRef.id
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
    if (board === 'Odisha Board') return 'odisha';
    if (board === 'Saraswati Sishu Mandir') return 'saraswati';
    if (board === 'CBSE') return 'cbse';
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
    const filteredContent = content.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           c.class.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubject = adminSubjectFilter === 'all' || c.subject === adminSubjectFilter;
      const matchesClass = adminClassFilter === 'all' || c.class === adminClassFilter;
      
      return matchesSearch && matchesSubject && matchesClass;
    });

    // Requirement: Only show one entry per logical chapter (addressing the "two chapters" issue)
    const uniqueChapters = Array.from(
      filteredContent.reduce((acc, current) => {
        const groupId = current.translationGroupId || current.id;
        const existing = acc.get(groupId);
        // Prefer English version for the display if it exists, otherwise keep the first one found
        if (!existing || current.language === 'en') {
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
          await deleteDoc(doc(firestore, 'chapters', c.id));
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
          <h2 className="text-xl font-bold text-white">Content Library</h2>
          <div className="flex flex-wrap gap-4">
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

            <select
              value={adminClassFilter}
              onChange={(e) => setAdminClassFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
            >
              <option value="all">All Classes</option>
              {Object.entries(translations['en'].classes).map(([key, label]) => (
                <option key={key} value={key}>{label as string}</option>
              ))}
            </select>

            <select
              value={adminSubjectFilter}
              onChange={(e) => setAdminSubjectFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {Array.from(new Set([
                ...Object.keys(translations['en'].subjects),
                ...content.map((c: any) => c.subject)
              ])).map(s => (
                <option key={s} value={s}>
                  {translations['en'].subjects[s as keyof typeof translations.en.subjects] || s}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              {filteredContent.length > 0 ? (
                <button 
                  onClick={handleDeleteFiltered}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    confirmAction?.startsWith('delete_filtered_chapters') || confirmAction === 'delete_all_chapters'
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
                    board: 'odisha',
                    class: 'class3',
                    language: 'or',
                    subject: 'math',
                    title: '',
                    playlist_id: '',
                    notes: '',
                    practice_questions: [],
                    quiz_questions: [],
                    status: 'draft'
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
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-white">{isEditingChapter ? 'Edit Chapter' : 'Add New Chapter'}</h3>
            <form onSubmit={handleAddChapter} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Board</label>
                  <select 
                    value={newChapter.board}
                    onChange={(e) => setNewChapter({...newChapter, board: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  >
                    <option value="odisha">Odisha Board</option>
                    <option value="saraswati">Saraswati Sishu Mandir</option>
                    <option value="cbse">CBSE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Language</label>
                  <select 
                    value={newChapter.language}
                    onChange={(e) => setNewChapter({...newChapter, language: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  >
                    <option value="or">Odia</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class</label>
                  <select 
                    value={newChapter.class}
                    onChange={(e) => setNewChapter({...newChapter, class: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  >
                    <option value="play">Play School</option>
                    <option value="nursery">Nursery</option>
                    <option value="lkg">LKG</option>
                    <option value="ukg">UKG</option>
                    <option value="class1">Class 1</option>
                    <option value="class2">Class 2</option>
                    <option value="class3">Class 3</option>
                    <option value="class4">Class 4</option>
                    <option value="class5">Class 5</option>
                    <option value="class6">Class 6</option>
                    <option value="class7">Class 7</option>
                    <option value="class8">Class 8</option>
                    <option value="class9">Class 9</option>
                    <option value="class10">Class 10</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                  <select 
                    value={isOtherSubject ? 'other' : newChapter.subject}
                    onChange={(e) => {
                      if (e.target.value === 'other') {
                        setIsOtherSubject(true);
                      } else {
                        setIsOtherSubject(false);
                        setNewChapter({...newChapter, subject: e.target.value});
                      }
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  >
                    {(() => {
                      const board = newChapter.board || 'odisha';
                      const cls = newChapter.class || 'class5';
                      const subjectsByClass = translations['en'].subjectsByClass?.[board]?.[cls];
                      
                      if (subjectsByClass) {
                        return subjectsByClass.map((key: string) => (
                          <option key={key} value={key}>{translations['en'].subjects[key] || key}</option>
                        ));
                      }
                      
                      return Object.entries(translations['en'].subjects).map(([key, label]) => (
                        <option key={key} value={key}>{label as string}</option>
                      ));
                    })()}
                    <option value="other">Other</option>
                  </select>
                  {isOtherSubject && (
                    <input 
                      type="text" 
                      value={customSubject}
                      placeholder="Enter custom subject"
                      className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                      onChange={(e) => setCustomSubject(e.target.value)}
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Chapter / Video Title</label>
                    <button 
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={isGeneratingAI || !newChapter.title}
                      className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-all"
                    >
                      {isGeneratingAI ? <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Sparkles size={14} />}
                      {isGeneratingAI ? 'Generating...' : 'AI Magic: Generate Content'}
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newChapter.title}
                    onChange={(e) => setNewChapter({...newChapter, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                    placeholder="e.g. ବସ୍ତୁରୁ ଆକୃତି ଜାଣିବା"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">YouTube URL / Video ID</label>
                  <input 
                    type="text" 
                    value={newChapter.playlist_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Extract ID if it's a full URL
                      let id = val;
                      if (val.includes('youtube.com/watch?v=')) {
                        id = val.split('v=')[1].split('&')[0];
                      } else if (val.includes('youtu.be/')) {
                        id = val.split('youtu.be/')[1].split('?')[0];
                      } else if (val.includes('youtube.com/embed/')) {
                        id = val.split('embed/')[1].split('?')[0];
                      }
                      setNewChapter({...newChapter, playlist_id: id});
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                    placeholder="Paste YouTube URL or enter Video ID (e.g. dQw4w9WgXcQ)"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes (Markdown)</label>
                  <textarea 
                    value={newChapter.notes}
                    onChange={(e) => setNewChapter({...newChapter, notes: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none h-32"
                    placeholder="# Introduction\nThis topic covers..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Practice Questions</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const predefined = [
                          { question: "୧. ଏକ ବର୍ଗାକାର କାଗଜର କେତୋଟି କୋଣ ଥାଏ?", answer: "ଏକ ବର୍ଗାକାର କାଗଜର ୪ଟି କୋଣ ଥାଏ।", ai_answer: "ବର୍ଗାକାର କାଗଜର ଚାରୋଟି ବାହୁ ଓ ଚାରୋଟି କୋଣ ଥାଏ।" },
                          { question: "୨. ତ୍ରିଭୁଜର କେତୋଟି ବାହୁ ଅଛି?", answer: "ତ୍ରିଭୁଜର ୩ଟି ବାହୁ ଅଛି।", ai_answer: "ତ୍ରିଭୁଜର ତିନୋଟି ବାହୁ ଓ ତିନୋଟି କୋଣ ଥାଏ।" },
                          { question: "୩. ଗୋଟିଏ ଆୟତକାର କାଗଜକୁ ମଝିରୁ କୋଣାକୋଣି ଭାଙ୍ଗିଲେ କେଉଁ ଆକୃତି ମିଳିବ?", answer: "ଗୋଟିଏ ଆୟତକାର କାଗଜକୁ ମଝିରୁ କୋଣାକୋଣି ଭାଙ୍ଗିଲେ ତ୍ରିଭୁଜ ଆକୃତି ମିଳିବ।", ai_answer: "ଆୟତକାର କାଗଜକୁ କୋଣାକୋଣି ଭାଙ୍ଗିଲେ ଏହା ଦୁଇଟି ତ୍ରିଭୁଜରେ ପରିଣତ ହୁଏ।" },
                          { question: "୪. ତୁମେ କାଗଜରେ ତିଆରି କରୁଥିବା ଦୁଇଟି ଖେଳନାର ନାମ ଲେଖ।", answer: "କାଗଜରେ ତିଆରି ଦୁଇଟି ଖେଳନା ହେଲା: କାଗଜ ଡଙ୍ଗା ଏବଂ କାଗଜ ବିମାନ।", ai_answer: "କାଗଜ ଭାଙ୍ଗି ଆମେ ଡଙ୍ଗା, ବିମାନ, ଫୁଲ ଆଦି ତିଆରି କରିପାରିବା।" }
                        ];
                        setNewChapter({
                          ...newChapter,
                          practice_questions: [...newChapter.practice_questions, ...predefined]
                        });
                      }}
                      className="text-xs bg-emerald-900/50 text-emerald-400 px-3 py-1 rounded-lg hover:bg-emerald-900"
                    >
                      + Add Pre-defined
                    </button>
                    <button 
                      type="button"
                      onClick={() => setNewChapter({
                        ...newChapter, 
                        practice_questions: [...newChapter.practice_questions, { question: '', answer: '', ai_answer: '' }]
                      })}
                      className="text-xs text-emerald-500 hover:underline"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {newChapter.practice_questions.map((pq, idx) => (
                      <div key={idx} className="bg-black/20 p-6 rounded-xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <input 
                          type="text"
                          placeholder="Practice Question"
                          value={pq.question}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          onChange={(e) => {
                            const pqs = [...newChapter.practice_questions];
                            pqs[idx].question = e.target.value;
                            setNewChapter({...newChapter, practice_questions: pqs});
                          }}
                          className="flex-1 bg-transparent border-b border-white/10 text-white text-base py-2 focus:outline-none focus:border-emerald-500"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const pqs = newChapter.practice_questions.filter((_, i) => i !== idx);
                            setNewChapter({...newChapter, practice_questions: pqs});
                          }}
                          className="text-red-500 hover:text-red-400 ml-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <textarea 
                          placeholder="Manual Answer/Explanation"
                          value={pq.answer}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                          onChange={(e) => {
                            const pqs = [...newChapter.practice_questions];
                            pqs[idx].answer = e.target.value;
                            setNewChapter({...newChapter, practice_questions: pqs});
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none h-24"
                        />
                        <textarea 
                          placeholder="AI Answer (Optional)"
                          value={pq.ai_answer || ''}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                          onChange={(e) => {
                            const pqs = [...newChapter.practice_questions];
                            pqs[idx].ai_answer = e.target.value;
                            setNewChapter({...newChapter, practice_questions: pqs});
                          }}
                          className="w-full bg-purple-500/5 border border-purple-500/20 rounded-lg px-4 py-3 text-sm text-purple-300 focus:outline-none h-24"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Quiz Questions</h4>
                  <button 
                    type="button"
                    onClick={() => setNewChapter({
                      ...newChapter, 
                      quiz_questions: [...newChapter.quiz_questions, { question: '', options: ['', '', '', ''], correct_answer: '', hint: '' }]
                    })}
                    className="text-xs text-emerald-500 hover:underline"
                  >
                    + Add Quiz Question
                  </button>
                </div>
                
                <div className="space-y-4">
                  {newChapter.quiz_questions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <input 
                          type="text"
                          placeholder={`Question ${qIdx + 1}`}
                          value={q.question}
                          onChange={(e) => {
                            const qs = [...newChapter.quiz_questions];
                            qs[qIdx].question = e.target.value;
                            setNewChapter({...newChapter, quiz_questions: qs});
                          }}
                          className="flex-1 bg-transparent border-b border-white/10 text-white text-sm py-1 focus:outline-none focus:border-emerald-500"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const qs = newChapter.quiz_questions.filter((_, i) => i !== qIdx);
                            setNewChapter({...newChapter, quiz_questions: qs});
                          }}
                          className="text-red-500 hover:text-red-400 ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt: string, oIdx: number) => (
                          <input 
                            key={oIdx}
                            type="text"
                            placeholder={`Option ${oIdx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const qs = [...newChapter.quiz_questions];
                              qs[qIdx].options[oIdx] = e.target.value;
                              setNewChapter({...newChapter, quiz_questions: qs});
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        ))}
                      </div>
                      <div>
                        <input 
                          type="text"
                          placeholder="Correct Answer"
                          value={q.correct_answer}
                          onChange={(e) => {
                            const qs = [...newChapter.quiz_questions];
                            qs[qIdx].correct_answer = e.target.value;
                            setNewChapter({...newChapter, quiz_questions: qs});
                          }}
                          className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs text-emerald-400 focus:outline-none mb-2"
                        />
                        <input 
                          type="text"
                          placeholder="Hint (Optional)"
                          value={q.hint || ''}
                          onChange={(e) => {
                            const qs = [...newChapter.quiz_questions];
                            qs[qIdx].hint = e.target.value;
                            setNewChapter({...newChapter, quiz_questions: qs});
                          }}
                          className="w-full bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs text-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Visibility Status</label>
                <div className="flex gap-4">
                  {['draft', 'published'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewChapter({...newChapter, status: s as 'draft' | 'published'})}
                      className={`flex-1 py-2 rounded-xl border transition-all capitalize ${
                        (newChapter.status || 'draft') === s 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                        : 'bg-slate-900 border-white/10 text-slate-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all"
                >
                  {isEditingChapter ? 'Update Topic' : 'Save Topic to Library'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAddingChapter(false)}
                  className="px-8 bg-white/5 hover:bg-white/10 text-white rounded-xl py-3 font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {adminSubjectFilter === 'all' ? (
          <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Select a Subject</h3>
            <p className="text-slate-400">Please select a subject from the dropdown above to view its chapters.</p>
          </div>
        ) : uniqueChapters.length === 0 ? (
          <div className="bg-white/5 border border-white/10 p-12 rounded-2xl text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="text-slate-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Chapters Found</h3>
            <p className="text-slate-400">There are no chapters added for this subject yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueChapters.map((c: any) => (
              <div key={c.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col h-full space-y-3 group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                    {translations['en'].boards[getBoardKey(c.board)] || c.board} • {translations['en'].classes[c.class] || c.class} • {translations['en'].subjects[c.subject] || c.subject}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setNewChapter({
                          board: c.board,
                          class: c.class,
                          language: c.language,
                          subject: c.subject,
                          title: c.title,
                          playlist_id: c.playlist_id,
                          notes: c.notes || '',
                          practice_questions: c.practice_questions || [],
                          quiz_questions: c.quiz_questions || [],
                          status: c.status || 'draft'
                        });
                        setEditingChapterId(c.id);
                        setIsEditingChapter(true);
                        setIsAddingChapter(true);
                        // Scroll to form
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-slate-500 hover:text-emerald-500"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={async () => {
                        if (confirmAction === `delete_topic_${c.id}`) {
                          try {
                            setLoading(true);
                            // Delete both translations if they exist
                            const groupId = c.translationGroupId || c.id;
                            const related = content.filter((item: any) => item.translationGroupId === groupId || item.id === groupId);
                            for (const item of related) {
                              await deleteDoc(doc(firestore, 'chapters', item.id));
                            }
                            setConfirmAction(null);
                            showNotification("Chapter deleted successfully!");
                          } catch (err) {
                            console.error("Delete Topic Error:", err);
                            showNotification("Failed to delete chapter.", 'error');
                          } finally {
                            setLoading(false);
                          }
                        } else {
                          setConfirmAction(`delete_topic_${c.id}`);
                          setTimeout(() => setConfirmAction(null), 5000);
                        }
                      }}
                      className={confirmAction === `delete_topic_${c.id}` ? "text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded" : "text-slate-500 hover:text-red-500 p-1"}
                    >
                      {confirmAction === `delete_topic_${c.id}` ? "Confirm?" : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                <h4 className="text-white font-semibold">{c.title}</h4>
                <div className="text-xs text-slate-500 flex-grow">{translations['en'].subjects[c.subject] || c.subject}</div>
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1"><Youtube size={14} /> Video</div>
                  {c.notes && <div className="flex items-center gap-1"><FileText size={14} /> Notes</div>}
                  {c.quiz_questions?.length > 0 && <div className="flex items-center gap-1"><ListChecks size={14} /> Quiz</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMonthlyTests = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Monthly Tests Management</h3>
        <div className="flex gap-2">
          {monthlyTests.length > 0 && (
            <button 
              onClick={handleDeleteAllTests}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
                confirmAction === 'delete_all_tests'
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
                subject: '',
                class: 'class5',
                month: new Date().toLocaleString('default', { month: 'long' }),
                year: new Date().getFullYear(),
                language: 'or',
                questions: [{ question: '', options: ['', '', '', ''], correct_answer: '' }],
                status: 'draft'
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class</label>
              <select 
                value={newTest.class}
                onChange={(e) => setNewTest({...newTest, class: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              >
                <option value="play">Play School</option>
                <option value="nursery">Nursery</option>
                <option value="lkg">LKG</option>
                <option value="ukg">UKG</option>
                <option value="class1">Class 1</option>
                <option value="class2">Class 2</option>
                <option value="class3">Class 3</option>
                <option value="class4">Class 4</option>
                <option value="class5">Class 5</option>
                <option value="class6">Class 6</option>
                <option value="class7">Class 7</option>
                <option value="class8">Class 8</option>
                <option value="class9">Class 9</option>
                <option value="class10">Class 10</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
              <select 
                value={isOtherTestSubject ? 'other' : newTest.subject}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setIsOtherTestSubject(true);
                  } else {
                    setIsOtherTestSubject(false);
                    setNewTest({...newTest, subject: e.target.value});
                  }
                }}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              >
                {(() => {
                  const board = 'odisha'; // Monthly tests currently only for Odisha in this logic
                  const cls = newTest.class || 'class10';
                  const subjectsByClass = translations['en'].subjectsByClass?.[board]?.[cls];
                  
                  if (subjectsByClass) {
                    return subjectsByClass.map((key: string) => (
                      <option key={key} value={key}>{translations['en'].subjects[key] || key}</option>
                    ));
                  }
                  
                  return Object.entries(translations['en'].subjects).map(([key, label]) => (
                    <option key={key} value={key}>{label as string}</option>
                  ));
                })()}
                <option value="other">Other</option>
              </select>
              {isOtherTestSubject && (
                <input 
                  type="text" 
                  value={customTestSubject}
                  placeholder="Enter custom subject"
                  className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  onChange={(e) => setCustomTestSubject(e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Language</label>
              <select 
                value={newTest.language}
                onChange={(e) => setNewTest({...newTest, language: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              >
                <option value="or">Odia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Month</label>
              <select 
                value={newTest.month}
                onChange={(e) => setNewTest({...newTest, month: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
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
                onChange={(e) => {
                  const val = e.target.value;
                  setNewTest({...newTest, year: val === "" ? "" : parseInt(val)});
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Test Questions</h4>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleGenerateTestWithAI}
                  disabled={isGeneratingTestAI}
                  className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-all"
                >
                  {isGeneratingTestAI ? <div className="animate-spin h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Sparkles size={14} />}
                  {isGeneratingTestAI ? 'Generating...' : 'AI Magic: Generate Test'}
                </button>
                <button 
                  type="button"
                  onClick={() => setNewTest({
                    ...newTest, 
                    questions: [...newTest.questions, { question: '', options: ['', '', '', ''], correct_answer: '' }]
                  })}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  + Add Question
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {newTest.questions.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-start">
                    <input 
                      type="text"
                      placeholder={`Question ${qIdx + 1}`}
                      value={q.question}
                      onChange={(e) => {
                        const qs = [...newTest.questions];
                        qs[qIdx].question = e.target.value;
                        setNewTest({...newTest, questions: qs});
                      }}
                      className="flex-1 bg-transparent border-b border-white/10 text-white text-sm py-1 focus:outline-none focus:border-emerald-500"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const qs = newTest.questions.filter((_: any, i: number) => i !== qIdx);
                        setNewTest({...newTest, questions: qs});
                      }}
                      className="text-red-500 hover:text-red-400 ml-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt: string, oIdx: number) => (
                      <input 
                        key={oIdx}
                        type="text"
                        placeholder={`Option ${oIdx + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const qs = [...newTest.questions];
                          qs[qIdx].options[oIdx] = e.target.value;
                          setNewTest({...newTest, questions: qs});
                        }}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                      />
                    ))}
                  </div>
                  <div>
                    <input 
                      type="text"
                      placeholder="Correct Answer"
                      value={q.correct_answer}
                      onChange={(e) => {
                        const qs = [...newTest.questions];
                        qs[qIdx].correct_answer = e.target.value;
                        setNewTest({...newTest, questions: qs});
                      }}
                      className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-1.5 text-xs text-emerald-400 focus:outline-none"
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
                  let finalSubject = isOtherTestSubject ? customTestSubject : newTest.subject;
                  
                  // Map common subject names to keys
                  const subjectMapping: Record<string, string> = {
                    'Mathematics': 'math',
                    'Math': 'math',
                    'Science': 'science',
                    'English': 'english',
                    'Odia': 'odia',
                    'History': 'history',
                    'Geography': 'geography',
                    'Social Studies': 'social',
                    'Hindi': 'hindi',
                    'Sanskrit': 'sanskrit',
                    'EVS': 'evs',
                    'General Knowledge': 'gk',
                    'GK': 'gk',
                    'Physics': 'physics',
                    'Chemistry': 'chemistry',
                    'Biology': 'biology'
                  };

                  if (subjectMapping[finalSubject]) {
                    finalSubject = subjectMapping[finalSubject];
                  }

                  // Save original test
                  const originalTestRef = await addDoc(collection(firestore, 'monthly_tests'), {
                    ...newTest,
                    subject: finalSubject,
                    createdAt: serverTimestamp()
                  });

                  // Determine target language for auto-translation
                  const targetLang = newTest.language === 'en' ? 'or' : 'en';

                  // Translate questions
                  const translatedQuestions = newTest.questions.length > 0 ? await translateContent(newTest.questions, targetLang) : [];

                  // Save translated test
                  await addDoc(collection(firestore, 'monthly_tests'), {
                    ...newTest,
                    subject: finalSubject,
                    language: targetLang,
                    questions: translatedQuestions,
                    translationGroupId: originalTestRef.id,
                    createdAt: serverTimestamp()
                  });

                  // Update original test with translationGroupId
                  await updateDoc(doc(firestore, 'monthly_tests', originalTestRef.id), {
                    translationGroupId: originalTestRef.id
                  });

                  setIsAddingTest(false);
                  setIsOtherTestSubject(false);
                  setCustomTestSubject('');
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
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                test.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
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
                        setConfirmAction(null);
                      } catch (err) {
                        console.error("Publish Results Error:", err);
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
    </div>
  );

  const renderAiUsage = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase mb-1">Total Questions Today</div>
          <div className="text-3xl font-bold text-white">{stats.aiQuestionsToday}</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase mb-1">Estimated Cost Today</div>
          <div className="text-3xl font-bold text-white">₹{(stats.aiQuestionsToday * 0.03).toFixed(2)}</div>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <div className="text-slate-500 text-xs uppercase mb-1">Avg. Response Time</div>
          <div className="text-3xl font-bold text-white">1.2s</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 font-semibold text-white">Recent AI Queries</div>
        <div className="divide-y divide-white/5">
          {aiLogs.slice(0, 10).map((log, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex-1">
                <div className="text-sm text-white line-clamp-1">{log.question}</div>
                <div className="text-xs text-slate-500">User ID: {log.userId} • {log.date}</div>
              </div>
              <div className="text-xs font-mono text-purple-400">₹{log.cost || 0.03}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-bottom border-white/10 bg-white/5">
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">User</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Plan</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Amount</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Date</th>
              <th className="p-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-white font-medium">{tx.userName || tx.userId}</td>
                <td className="p-4 text-slate-300 capitalize">{tx.plan}</td>
                <td className="p-4 text-emerald-400 font-bold">₹{tx.amount}</td>
                <td className="p-4 text-slate-400 text-sm">{tx.date?.split('T')[0]}</td>
                <td className="p-4">
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-500">
                    Success
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Send New Notification</h3>
        <div className="space-y-4">
          <textarea 
            placeholder="Type your message here..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500/50 h-32"
          />
          <div className="flex gap-4">
            <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none">
              <option value="all">All Users</option>
              <option value="premium">Premium Only</option>
              <option value="free">Free Only</option>
            </select>
            <button className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 font-semibold transition-all">
              Broadcast Message
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 font-semibold text-white flex justify-between items-center">
          <span>Sent History</span>
          {notifications.length > 0 && (
            <button 
              onClick={handleDeleteAllNotifications}
              className={`text-xs font-bold flex items-center gap-1 ${
                confirmAction === 'delete_all_notifications'
                ? 'text-red-500 underline'
                : 'text-red-500 hover:text-red-400'
              }`}
            >
              <Trash2 size={14} /> {confirmAction === 'delete_all_notifications' ? 'Confirm?' : 'Clear All'}
            </button>
          )}
        </div>
        <div className="divide-y divide-white/5">
          {notifications.map((n, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{n.message}</div>
                <div className="text-xs text-slate-500">{n.createdAt}</div>
              </div>
              <button 
                onClick={async () => {
                  if (confirmAction === `delete_notif_${n.id}`) {
                    try {
                      setLoading(true);
                      await deleteDoc(doc(firestore, 'notifications', n.id));
                      setConfirmAction(null);
                      showNotification("Notification deleted successfully!");
                    } catch (err) {
                      console.error("Delete Notification Error:", err);
                      showNotification("Failed to delete notification.", 'error');
                    } finally {
                      setLoading(false);
                    }
                  } else {
                    setConfirmAction(`delete_notif_${n.id}`);
                    setTimeout(() => setConfirmAction(null), 5000);
                  }
                }}
                className={`transition-all ${confirmAction === `delete_notif_${n.id}` ? "text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded" : "text-slate-500 hover:text-red-500 p-1"}`}
              >
                {confirmAction === `delete_notif_${n.id}` ? "Confirm?" : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleSaveSettings = async () => {
    try {
      const safeSystemSettings = {
        monthlyPrice: systemSettings.monthlyPrice || 199,
        yearlyPrice: systemSettings.yearlyPrice || 999,
        leaderboardRules: systemSettings.leaderboardRules || '',
        enabledClasses: systemSettings.enabledClasses || ["class1", "class2", "class3", "class4", "class5", "class6", "class7", "class8", "class9", "class10"]
      };
      const safePrivateSettings = {
        aiApiKey: privateSettings.aiApiKey || ''
      };
      await setDoc(doc(firestore, 'system_settings', 'config'), safeSystemSettings, { merge: true });
      await setDoc(doc(firestore, 'settings', 'private'), safePrivateSettings, { merge: true });
      showNotification("System settings saved successfully!");
    } catch (err: any) {
      console.error("Save Settings Error:", err);
      showNotification("Failed to save settings: " + err.message, 'error');
    }
  };

  const handleGenerateCurriculum = async () => {
    setIsGenerating(true);
    setGenerationLog(prev => [...prev, `Starting AI generation for ${genBoard.toUpperCase()} - ${genClass}...`]);
    
    try {
      const generatedChapters = await generateCurriculum(genBoard, genClass);
      setGenerationLog(prev => [...prev, `AI generated ${generatedChapters.length} chapters. Saving to database...`]);
      
      let savedCount = 0;
      for (const ch of generatedChapters) {
        await addDoc(collection(firestore, 'chapters'), {
          board: genBoard,
          class: genClass,
          language: ch.language,
          subject: ch.subject,
          title: ch.title,
          playlist_id: '',
          notes: ch.notes,
          quiz_questions: ch.quiz_questions || []
        });
        savedCount++;
        setGenerationLog(prev => [...prev, `Saved: [${ch.subject}] ${ch.title}`]);
      }
      
      setGenerationLog(prev => [...prev, `✅ Successfully saved ${savedCount} chapters to the database!`]);
      
    } catch (err: any) {
      console.error(err);
      setGenerationLog(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllClasses = async () => {
    const allClasses = [
      "play", "nursery", "lkg", "ukg", "class1", "class2", "class3", "class4", 
      "class5", "class6", "class7", "class8", "class9", "class10"
    ];

    setIsGenerating(true);
    setGenerationLog(prev => [...prev, `Starting AI generation for ALL CLASSES in ${genBoard.toUpperCase()}...`]);

    try {
      for (const currentClass of allClasses) {
        setGenerationLog(prev => [...prev, `\n--- Generating for ${currentClass.toUpperCase()} ---`]);
        
        try {
          const generatedChapters = await generateCurriculum(genBoard, currentClass);
          setGenerationLog(prev => [...prev, `AI generated ${generatedChapters.length} chapters for ${currentClass}. Saving...`]);
          
          let savedCount = 0;
          for (const ch of generatedChapters) {
            await addDoc(collection(firestore, 'chapters'), {
              board: genBoard,
              class: currentClass,
              language: ch.language,
              subject: ch.subject,
              title: ch.title,
              playlist_id: '',
              notes: ch.notes,
              quiz_questions: ch.quiz_questions || []
            });
            savedCount++;
          }
          setGenerationLog(prev => [...prev, `✅ Saved ${savedCount} chapters for ${currentClass}.`]);
        } catch (classErr: any) {
          console.error(`Error generating for ${currentClass}:`, classErr);
          setGenerationLog(prev => [...prev, `❌ Error for ${currentClass}: ${classErr.message}`]);
        }
        
        // Add a small delay between requests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      setGenerationLog(prev => [...prev, `\n🎉 Finished generating curriculum for all classes!`]);
    } catch (err: any) {
      console.error(err);
      setGenerationLog(prev => [...prev, `❌ Fatal Error: ${err.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderProductionSetup = () => (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Rocket size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Production Auto-Setup</h2>
          <p className="text-slate-400">Use AI to instantly populate your database with curriculum data.</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 md:p-8">
        <h3 className="text-lg font-bold text-white mb-4">AI Curriculum Generator</h3>
        <p className="text-sm text-slate-400 mb-6">
          Select a class and board. The AI will generate standard chapters for Math, Science, English, and Odia, and save them directly to your database.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class</label>
            <select 
              value={genClass}
              onChange={(e) => setGenClass(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
            >
              <option value="play">Play School</option>
              <option value="nursery">Nursery</option>
              <option value="lkg">LKG</option>
              <option value="ukg">UKG</option>
              <option value="class1">Class 1</option>
              <option value="class2">Class 2</option>
              <option value="class3">Class 3</option>
              <option value="class4">Class 4</option>
              <option value="class5">Class 5</option>
              <option value="class6">Class 6</option>
              <option value="class7">Class 7</option>
              <option value="class8">Class 8</option>
              <option value="class9">Class 9</option>
              <option value="class10">Class 10</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Board</label>
            <select 
              value={genBoard}
              onChange={(e) => setGenBoard(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
            >
              <option value="odisha">Odisha State Board</option>
              <option value="cbse">CBSE</option>
              <option value="saraswati">Saraswati Shishu Mandir</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={handleGenerateCurriculum}
            disabled={isGenerating}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles size={20} />
                Generate Selected Class
              </div>
            )}
          </button>
          
          <button 
            onClick={handleGenerateAllClasses}
            disabled={isGenerating}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-4 font-bold transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Rocket size={20} />
                Generate ALL Classes
              </div>
            )}
          </button>
        </div>

        {generationLog.length > 0 && (
          <div className="mt-6 bg-black/50 border border-white/5 rounded-xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-2">
            {generationLog.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-2xl space-y-6">
      <button 
        onClick={() => setActiveTab('dashboard')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </button>
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI API Key (Private)</label>
          <input 
            type="password" 
            value={privateSettings.aiApiKey || ''}
            onChange={(e) => setPrivateSettings({...privateSettings, aiApiKey: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            placeholder="sk-..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monthly Price (₹)</label>
            <input 
              type="number" 
              value={systemSettings.monthlyPrice || 199}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({...systemSettings, monthlyPrice: val === "" ? "" : parseInt(val)});
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Yearly Price (₹)</label>
            <input 
              type="number" 
              value={systemSettings.yearlyPrice || 999}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({...systemSettings, yearlyPrice: val === "" ? "" : parseInt(val)});
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
            onChange={(e) => setSystemSettings({...systemSettings, leaderboardRules: e.target.value})}
          />
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
                    setSystemSettings({...systemSettings, enabledClasses: next});
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    isEnabled 
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Textbooks Management</h2>
        <button 
          onClick={() => {
            setIsAddingTextbook(true);
            setEditingTextbookId(null);
            setNewTextbook({
              class: 'class5',
              board: 'odisha',
              download_url: ''
            });
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> Add Textbook
        </button>
      </div>

      {isAddingTextbook && (
        <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-semibold text-white">{editingTextbookId ? 'Edit Textbook' : 'Add New Textbook'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Title</label>
              <input 
                type="text"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                placeholder="Enter textbook title"
                value={newTextbook.title}
                onChange={(e) => setNewTextbook({...newTextbook, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Class</label>
              <select 
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                value={newTextbook.class}
                onChange={(e) => setNewTextbook({...newTextbook, class: e.target.value})}
              >
                {Object.entries(translations['en'].classes).map(([key, label]) => (
                  <option key={key} value={key}>{label as string}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Board</label>
              <select 
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                value={newTextbook.board}
                onChange={(e) => setNewTextbook({...newTextbook, board: e.target.value})}
              >
                <option value="odisha">Odisha State Board</option>
                <option value="cbse">CBSE</option>
                <option value="icse">ICSE</option>
                <option value="saraswati">Saraswati</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Google Drive URL</label>
              <input 
                type="text"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                placeholder="Paste Google Drive download URL here"
                value={newTextbook.download_url}
                onChange={(e) => setNewTextbook({...newTextbook, download_url: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Visibility Status</label>
              <select 
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                value={newTextbook.status || 'draft'}
                onChange={(e) => setNewTextbook({...newTextbook, status: e.target.value})}
              >
                <option value="draft">Draft (Hidden)</option>
                <option value="published">Published (Visible)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button 
              onClick={() => setIsAddingTextbook(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                try {
                  if (editingTextbookId) {
                    await updateDoc(doc(firestore, 'textbooks', editingTextbookId), {
                      ...newTextbook,
                      updated_at: serverTimestamp()
                    });
                    showNotification("Textbook updated successfully");
                  } else {
                    await addDoc(collection(firestore, 'textbooks'), {
                      ...newTextbook,
                      created_at: serverTimestamp()
                    });
                    showNotification("Textbook added successfully");
                  }
                  setIsAddingTextbook(false);
                } catch (err) {
                  console.error("Error saving textbook:", err);
                  showNotification("Failed to save textbook", "error");
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-semibold transition-all"
            >
              {editingTextbookId ? 'Update Textbook' : 'Save Textbook'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {textbooks.map((book) => (
          <div key={book.id} className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="aspect-[3/4] bg-slate-800 relative flex items-center justify-center">
              <Book size={48} className="text-slate-600" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button 
                  onClick={() => {
                    setEditingTextbookId(book.id);
                    setNewTextbook({
                      class: book.class,
                      board: book.board,
                      subject: book.subject,
                      title: book.title,
                      download_url: book.download_url
                    });
                    setIsAddingTextbook(true);
                  }}
                  className="p-2 bg-slate-900/80 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={async () => {
                    if (confirmAction === `delete-textbook-${book.id}`) {
                      try {
                        await deleteDoc(doc(firestore, 'textbooks', book.id));
                        showNotification("Textbook deleted");
                        setConfirmAction(null);
                      } catch (err) {
                        console.error("Error deleting textbook:", err);
                        showNotification("Failed to delete", "error");
                        setConfirmAction(null);
                      }
                    } else {
                      setConfirmAction(`delete-textbook-${book.id}`);
                    }
                  }}
                  className={`p-2 rounded-lg transition-all z-10 ${confirmAction === `delete-textbook-${book.id}` ? "bg-red-500/20 text-red-500 font-bold text-xs" : "bg-slate-900/80 text-red-400 hover:bg-red-500 hover:text-white"}`}
                >
                  {confirmAction === `delete-textbook-${book.id}` ? "Confirm?" : <Trash2 size={16} className="pointer-events-none" />}
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  {book.class}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                  {book.board}
                </span>
              </div>
              <a 
                href={book.download_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all text-sm"
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'content', label: 'Content Library', icon: BookOpen },
    { id: 'monthly_tests', label: 'Monthly Tests', icon: Calendar },
    { id: 'textbooks', label: 'Textbooks', icon: Book },
    { id: 'ai_usage', label: 'AI Usage', icon: Brain },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'production_setup', label: 'Production Setup', icon: Rocket },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Settings className="text-white" size={18} />
          </div>
          <span className="font-bold text-white">Admin Panel</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400 hover:text-white">
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:bg-slate-900/50
      `}>
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <Settings className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-white">Admin Panel</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as AdminTab);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10 space-y-2">
          <button 
            onClick={() => {
              signOut(auth);
              onExit();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-24 lg:p-10 lg:pt-10 overflow-y-auto">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                notification.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              <span className="font-medium">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-70">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white capitalize">{activeTab.replace('_', ' ')}</h1>
          <p className="text-slate-500">Manage your platform and monitor performance.</p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'content' && renderContent()}
            {activeTab === 'monthly_tests' && renderMonthlyTests()}
            {activeTab === 'textbooks' && renderTextbooks()}
            {activeTab === 'ai_usage' && renderAiUsage()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'production_setup' && renderProductionSetup()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
