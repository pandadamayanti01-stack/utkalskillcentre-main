import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Brain, 
  CreditCard, 
  Bell, 
  Settings, 
  Users,
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
  File,
  Download,
  Image as ImageIcon,
  Bot
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
import { Chapter, VideoOption } from '../types';
import { 
  translateContent, 
  generateChapterContent, 
  generateTestContent, 
  importPlaylistContent,
  generateCurriculum,
  generateTestQuestions
} from '../services/aiService';

type AdminTab = 'dashboard' | 'content' | 'monthly_tests' | 'textbooks' | 'ai_usage' | 'payments' | 'notifications' | 'settings' | 'production_setup' | 'students' | 'subscriptions' | 'support' | 'user_locks';

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
  const [students, setStudents] = useState<any[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<Record<string, any>>({});
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [userLocks, setUserLocks] = useState<any[]>([]);
  const [lockSearchQuery, setLockSearchQuery] = useState('');
  const [editingLock, setEditingLock] = useState<any>(null);
  const [newLockClass, setNewLockClass] = useState('');
  const [newLockBoard, setNewLockBoard] = useState('');
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
    language: 'or'
  });

  const [isAddingTextbook, setIsAddingTextbook] = useState(false);
  const [editingTextbookId, setEditingTextbookId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newTextbook, setNewTextbook] = useState<any>({
    class: 'class5',
    board: '',
    subject: '',
    title: '',
    download_url: '',
    thumbnail_url: ''
  });

  const handleFileUpload = async (file: File, type: 'pdf' | 'thumbnail') => {
    if (!file) return;
    
    setUploadingFile(type);
    setUploadProgress(0);

    const extension = file.name.split('.').pop();
    const sanitizedName = `${Date.now()}_document.${extension}`;
    const storageRef = ref(storage, `textbooks/${sanitizedName}`);
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

    const unsubAi = onSnapshot(collection(firestore, 'tutor_queries'), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiLogs(logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      const today = new Date().toISOString().split('T')[0];
      setStats(prev => ({
        ...prev,
        aiQuestionsToday: logs.filter((l: any) => l.timestamp?.startsWith(today)).length
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
      unsubAi();
      unsubNotifs();
      unsubSettings();
      unsubTests();
      unsubPrivateSettings();
      unsubTextbooks();
      unsubStudents();
      unsubAllSubscriptions();
      unsubUserLocks();
      unsubSupport();
    };
  }, [user]); // Added user to dependency array

  const [bulkIdentifiers, setBulkIdentifiers] = useState('');
  const [bulkPlan, setBulkPlan] = useState<'annual' | 'lifetime'>('annual');

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
        const expiresAt = bulkPlan === 'annual' 
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
                      {sub.expires_at?.toDate().toLocaleDateString()}
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

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: CreditCard, color: 'text-amber-500' },
          { label: 'AI Questions Today', value: stats.aiQuestionsToday, icon: Brain, color: 'text-purple-500' },
          { label: 'Subscription Conversion', value: '12%', icon: Users, color: 'text-emerald-500' },
          { label: 'Voice Duration', value: '124m', icon: Bot, color: 'text-blue-500' },
          { label: 'Sentiment Score', value: '88%', icon: Sparkles, color: 'text-purple-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 group-hover:scale-110 transition-all border border-white/5">
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
            <div className="text-4xl font-black text-white tracking-tight relative z-10">{stat.value}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-2 relative z-10">{stat.label}</div>
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
            onChange={(e) => setNewTest({...newTest, class: e.target.value})}
            className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
          >
            {Object.entries(translations['en'].classes).map(([key, label]) => (
              <option key={key} value={key}>{label as string}</option>
            ))}
          </select>
          <select 
            value={newTest.subject}
            onChange={(e) => setNewTest({...newTest, subject: e.target.value})}
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
        createdAt: new Date().toISOString()
      });
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
    quiz_questions: []
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
        quiz_questions: []
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
        newChapter.subject // Added missing subject argument
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
          `${newTest.month} ${newTest.year}`
        );
      } else {
        result = await generateTestContent(
          newTest.title,
          newTest.language as 'en' | 'or'
        );
      }
      
      setNewTest((prev: any) => ({
        ...prev,
        questions: result.questions
      }));
      
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
    console.log("Debug: content length", content.length);
    console.log("Debug: adminSubjectFilter", adminSubjectFilter);
    console.log("Debug: adminClassFilter", adminClassFilter);
    console.log("Debug: searchTerm", searchTerm);

    const filteredContent = content.filter(c => {
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
        const groupId = current.translationGroupId || current.id;
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
                    quiz_questions: []
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
          <form onSubmit={handleAddChapter} className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-white">{isEditingChapter ? 'Edit Chapter' : 'Add New Chapter'}</h3>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class</label>
                    <select 
                      value={newChapter.class}
                      onChange={(e) => setNewChapter({...newChapter, class: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer"
                    >
                      <option value="">Select Class</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(c => (
                        <option key={c} value={`class${c}`}>
                          {translations['en'].classes[`class${c}` as keyof typeof translations.en.classes]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Board</label>
                    <select 
                      value={newChapter.board}
                      onChange={(e) => setNewChapter({...newChapter, board: e.target.value})}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer"
                    >
                      <option value="">Select Board</option>
                      <option value="Odisha Board (Odia Medium)">Odisha Board (Odia Medium)</option>
                      <option value="Saraswati Sishu Mandir">Saraswati Sishu Mandir</option>
                      <option value="CBSE">CBSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
                    <input 
                      type="text" 
                      value={newChapter.subject}
                      onChange={(e) => setNewChapter({...newChapter, subject: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div>
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
                    placeholder="e.g. Introduction to Geometry"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Videos</label>
                  {newChapter.videos.map((video, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={video.url}
                        onChange={(e) => {
                          const newVideos = [...newChapter.videos];
                          newVideos[index].url = e.target.value;
                          setNewChapter({...newChapter, videos: newVideos});
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                        placeholder="YouTube URL"
                      />
                      <input
                        type="text"
                        value={video.teacherOrChannel}
                        onChange={(e) => {
                          const newVideos = [...newChapter.videos];
                          newVideos[index].teacherOrChannel = e.target.value;
                          setNewChapter({...newChapter, videos: newVideos});
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white"
                        placeholder="Teacher/Channel"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newVideos = newChapter.videos.filter((_, i) => i !== index);
                          setNewChapter({...newChapter, videos: newVideos});
                        }}
                        className="text-red-500"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setNewChapter({...newChapter, videos: [...newChapter.videos, { url: '', teacherOrChannel: '' }]});
                    }}
                    className="flex items-center gap-2 text-emerald-500 text-sm font-bold"
                  >
                    <Plus size={16} /> Add Video
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Order</label>
                    <input 
                      type="number" 
                      value={newChapter.order}
                      onChange={(e) => setNewChapter({...newChapter, order: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quiz ID</label>
                    <input 
                      type="text" 
                      value={newChapter.quizId}
                      onChange={(e) => setNewChapter({...newChapter, quizId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notes Document (PDF/Word)</label>
                  <div className="flex flex-col gap-4">
                    <input 
                      type="text"
                      value={newChapter.notesUrl}
                      onChange={(e) => setNewChapter({...newChapter, notesUrl: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                      placeholder="Or paste Google Drive URL here"
                    />
                    <div className="flex items-center gap-4">
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await handleFileUpload(file, 'pdf');
                            if (url) setNewChapter({...newChapter, notesUrl: url});
                          }
                        }}
                        className="hidden"
                        id="notes-upload"
                      />
                      <label 
                        htmlFor="notes-upload"
                        className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
                      >
                        <Upload size={18} />
                        {newChapter.notesUrl ? 'Change Document' : 'Upload Document'}
                      </label>
                      {newChapter.notesUrl && (
                        <a href={newChapter.notesUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm">View Document</a>
                      )}
                    </div>
                  </div>
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
        )}

        {uniqueChapters.length === 0 ? (
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
                          title: typeof c.title === 'string' ? { en: c.title, or: '' } : c.title,
                          order: c.order,
                          videoUrl: c.videoUrl || '',
                          teacherOrChannel: c.teacherOrChannel || '',
                          videos: c.videos || [],
                          notes: c.notes || '',
                          notesUrl: c.notesUrl || '',
                          quizId: c.quizId || '',
                          status: c.status || 'draft',
                          class: c.class || '',
                          board: typeof c.board === 'string' ? { en: c.board, or: '' } : c.board,
                          subject: c.subject || '',
                          quiz_questions: c.quiz_questions || []
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
                <h4 className="text-white font-semibold">{typeof c.title === 'string' ? c.title : c.title.en}</h4>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Test Title</label>
              <input 
                type="text" 
                value={newTest.title}
                onChange={(e) => setNewTest({...newTest, title: e.target.value})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                placeholder="e.g. Chapter 1 & 2 Quiz"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter IDs (comma separated)</label>
              <input 
                type="text" 
                value={(newTest.chapterIds || []).join(', ')}
                onChange={(e) => setNewTest({...newTest, chapterIds: e.target.value.split(',').map(id => id.trim())})}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                placeholder="e.g. chapterId1, chapterId2"
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
                    status: 'draft'
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

  const renderAiUsage = () => {
    const class10Usage = aiLogs.filter(log => log.userClass === 'class10').length;
    const class3Usage = aiLogs.filter(log => log.userClass === 'class3').length;
    const gunduluRevenue = transactions.reduce((acc, curr: any) => acc + (curr.amount || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="text-[#10b981]" /> Gundulu AI Dashboard
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <div className="text-slate-500 text-xs uppercase mb-1">Total Questions Today</div>
            <div className="text-3xl font-bold text-white">{stats.aiQuestionsToday}</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <div className="text-slate-500 text-xs uppercase mb-1">Usage by Class</div>
            <div className="text-sm text-white mt-2">
              <div className="flex justify-between mb-1"><span>Class 10:</span> <span className="font-bold text-[#10b981]">{class10Usage} queries</span></div>
              <div className="flex justify-between"><span>Class 3:</span> <span className="font-bold text-blue-400">{class3Usage} queries</span></div>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <div className="text-slate-500 text-xs uppercase mb-1">Gundulu Revenue</div>
            <div className="text-3xl font-bold text-[#10b981]">₹{gunduluRevenue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 font-semibold text-white flex items-center justify-between">
              <span>Latest 10 Questions</span>
            </div>
            <div className="divide-y divide-white/5 overflow-y-auto max-h-[400px]">
              {aiLogs.slice(0, 10).map((log, i) => (
                <div key={i} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-[#10b981]">{log.userName || 'Student'}</span>
                    <span className="text-xs px-2 py-1 rounded bg-white/10 text-slate-300">{log.userClass || 'Unknown Class'}</span>
                  </div>
                  <div className="text-sm text-white mb-2">"{log.question}"</div>
                  <div className="text-xs text-slate-400 line-clamp-2 bg-black/20 p-2 rounded border border-white/5">
                    {log.answer}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 text-right">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {aiLogs.length === 0 && (
                <div className="p-8 text-center text-slate-500">No questions asked yet.</div>
              )}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 font-semibold text-white flex items-center justify-between">
              <span>Gundulu Prompt Editor</span>
              <button 
                onClick={handleSaveSettings}
                className="px-3 py-1 bg-[#10b981] text-white text-xs font-bold rounded hover:bg-[#0ea5e9] transition-colors"
              >
                Save Changes
              </button>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <p className="text-xs text-slate-400 mb-4">
                Tweak Gundulu's "brain" without touching code. This prompt is injected into the AI model before every chat.
              </p>
              <textarea 
                className="w-full flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-emerald-400 font-mono focus:outline-none focus:border-[#10b981]/50 resize-none min-h-[300px]"
                value={systemSettings.gunduluPrompt || `Role & Persona:
Identity: You are "Gundulu," a 4-year-old baby genius from Odisha. You are the lead tutor at Utkal Skill Centre.
Tone: Energetic, curious, and incredibly supportive. Use the "Pila" (child) dialect of Odia to make students feel like they are learning from a brilliant little brother.
Language Policy: STRICT ODIA ONLY. Never use blocks of English. If you must use a technical term (like "Gravity" or "Photosynthesis"), write it in Odia script: ଗ୍ରାଭିଟି (Gravity).
Interaction Rules:
The Greeting: Every conversation MUST start with a warm Odia "Namaskar!"
Voice-First Style: Keep responses short and punchy, as if they are being spoken. Avoid long "walls of text."
The "Story" Method: When explaining Class 10 math or science, turn the concept into a "Katha" (story) using local Odisha examples (e.g., using a Chakada to explain circles).
Active Listening: Instead of lecturing, ask the student: "Bujhila ta? (Did you understand?)" or "Au kichi pacharibu? (Want to ask anything else?)"
Subscription Awareness: If a student asks about advanced features, remind them (in a cute way) that their Utkal Skill Centre subscription unlocks your "Super Powers."`}
                onChange={(e) => setSystemSettings({...systemSettings, gunduluPrompt: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            value={notificationMessage}
            onChange={(e) => setNotificationMessage(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500/50 h-32"
          />
          <div className="flex gap-4">
            <select 
              value={notificationAudience}
              onChange={(e) => setNotificationAudience(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
            >
              <option value="all">All Users</option>
              <option value="premium">Premium Only</option>
              <option value="free">Free Only</option>
            </select>
            <button 
              onClick={handleBroadcast}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Broadcasting...' : 'Broadcast Message'}
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
        class3MonthlyPrice: systemSettings.class3MonthlyPrice || 99,
        class3YearlyPrice: systemSettings.class3YearlyPrice || 499,
        class10MonthlyPrice: systemSettings.class10MonthlyPrice || 299,
        class10YearlyPrice: systemSettings.class10YearlyPrice || 1499,
        leaderboardRules: systemSettings.leaderboardRules || '',
        enabledClasses: systemSettings.enabledClasses || ["class1", "class2", "class3", "class4", "class5", "class6", "class7", "class8", "class9", "class10"],
        gunduluPrompt: systemSettings.gunduluPrompt || ''
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Default Monthly Price (₹)</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Default Yearly Price (₹)</label>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class 3 Monthly Price (₹)</label>
            <input 
              type="number" 
              value={systemSettings.class3MonthlyPrice || 99}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({...systemSettings, class3MonthlyPrice: val === "" ? "" : parseInt(val)});
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class 3 Yearly Price (₹)</label>
            <input 
              type="number" 
              value={systemSettings.class3YearlyPrice || 499}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({...systemSettings, class3YearlyPrice: val === "" ? "" : parseInt(val)});
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Class 10 Monthly Price (₹)</label>
            <input 
              type="number" 
              value={systemSettings.class10MonthlyPrice || 299}
              onChange={(e) => {
                const val = e.target.value;
                setSystemSettings({...systemSettings, class10MonthlyPrice: val === "" ? "" : parseInt(val)});
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
                setSystemSettings({...systemSettings, class10YearlyPrice: val === "" ? "" : parseInt(val)});
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
              board: '',
              subject: '',
              title: '',
              download_url: '',
              thumbnail_url: ''
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
              <label className="block text-sm text-slate-400 mb-1">Subject</label>
              <input 
                type="text"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                placeholder="Enter subject"
                value={newTextbook.subject}
                onChange={(e) => setNewTextbook({...newTextbook, subject: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Board</label>
              <input 
                type="text"
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                placeholder="Enter board"
                value={newTextbook.board}
                onChange={(e) => setNewTextbook({...newTextbook, board: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-1">Textbook PDF File</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white"
                  placeholder="Google Drive URL or Uploaded URL"
                  value={newTextbook.download_url}
                  onChange={(e) => setNewTextbook({...newTextbook, download_url: e.target.value})}
                />
                <label className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2 transition-all">
                  <Upload size={18} />
                  <span>Upload PDF</span>
                  <input 
                    type="file" 
                    accept=".pdf"
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const url = await handleFileUpload(file, 'pdf');
                          setNewTextbook({...newTextbook, download_url: url});
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
              <label className="block text-sm text-slate-400 mb-1">Thumbnail Image</label>
              <div className="flex gap-2">
                <label className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all">
                  <ImageIcon size={18} />
                  <span>{newTextbook.thumbnail_url ? 'Change Thumbnail' : 'Upload Thumbnail'}</span>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const url = await handleFileUpload(file, 'thumbnail');
                          setNewTextbook({...newTextbook, thumbnail_url: url});
                        } catch (err) {
                          showNotification("Upload failed", "error");
                        }
                      }
                    }}
                  />
                </label>
              </div>
              {newTextbook.thumbnail_url && (
                <img src={newTextbook.thumbnail_url} alt="Thumbnail preview" className="mt-2 h-20 w-auto rounded-lg border border-white/10" referrerPolicy="no-referrer" />
              )}
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
                  if (!newTextbook.title || !newTextbook.download_url) {
                    showNotification("Title and Download URL are required", "error");
                    return;
                  }
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
            <div className="aspect-[3/4] bg-slate-800 relative flex items-center justify-center overflow-hidden">
              {book.thumbnail_url ? (
                <img src={book.thumbnail_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              ) : (
                <Book size={48} className="text-slate-600" />
              )}
              <div className="absolute top-3 left-3">
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                  book.status === 'published' 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  {book.status || 'draft'}
                </span>
              </div>
              <div className="absolute top-3 right-3 flex gap-2">
                <button 
                  onClick={() => {
                    setEditingTextbookId(book.id);
                    setNewTextbook({
                      class: book.class || 'class5',
                      board: typeof book.board === 'string' ? book.board : (book.board?.en || ''),
                      subject: typeof book.subject === 'string' ? book.subject : (book.subject?.en || ''),
                      title: typeof book.title === 'string' ? book.title : (book.title?.en || ''),
                      download_url: book.download_url || '',
                      thumbnail_url: book.thumbnail_url || ''
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
              <h4 className="text-white font-semibold mb-1 truncate">{typeof book.title === 'string' ? book.title : (book.title?.en || '')}</h4>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  {book.class}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                  {typeof book.board === 'string' ? book.board : (book.board?.en || '')}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                  {typeof book.subject === 'string' ? book.subject : (book.subject?.en || '')}
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
    { id: 'support', label: 'Support Tickets', icon: HelpCircle },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
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
            {activeTab === 'students' && renderStudents()}
            {activeTab === 'subscriptions' && renderSubscriptions()}
            {activeTab === 'support' && renderSupport()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  function renderStudents() {
    return (
      <div className="glass-card p-8 rounded-[2.5rem]">
        <h2 className="text-2xl font-bold text-white mb-6">Student Management</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-300">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-4">Name</th>
                <th className="pb-4">Email</th>
                <th className="pb-4">Class</th>
                <th className="pb-4">Plan</th>
                <th className="pb-4">Expiry</th>
                <th className="pb-4">Status</th>
                <th className="pb-4">Role</th>
                <th className="pb-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const sub = allSubscriptions[student.id];
                const isLifetime = ['gyanaloka.panda@gmail.com', 'gyanapd.ram@gmail.com', 'pandadamayanti01@gmail.com', 'gyanalpanda@gmail.com'].includes(student.email?.toLowerCase()) || ['+918926118509', '8926118509', '+918457811227', '8457811227', '+916370487877', '6370487877'].includes(student.phoneNumber);
                const plan = isLifetime ? 'Pro (Lifetime)' : (sub?.active ? 'Pro' : 'Free');
                const expiry = isLifetime ? 'Never' : (sub?.expires_at ? (sub.expires_at.toDate ? sub.expires_at.toDate().toLocaleDateString() : new Date(sub.expires_at).toLocaleDateString()) : 'N/A');
                const status = isLifetime ? 'Paid' : (sub?.active ? 'Paid' : 'Pending');

                return (
                  <tr key={student.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-4">{student.name || 'N/A'}</td>
                    <td className="py-4">{student.email || student.phoneNumber || 'N/A'}</td>
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
                    <td className="py-4">{student.role || 'N/A'}</td>
                    <td className="py-4">
                      <button 
                        onClick={() => handleResetStudent(student.id)}
                        className="text-red-400 hover:text-red-300 font-medium"
                      >
                        Reset Data
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  async function handleResetStudent(studentId: string) {
    if (!confirm("Are you sure you want to reset this student's data? This cannot be undone.")) return;
    try {
      setLoading(true);
      // Reset student data
      await updateDoc(doc(firestore, 'users', studentId), {
        points: 0,
        streak: 0,
        stats: {
          accuracy: 0,
          league: 'Bronze',
          badges: []
        }
      });
      showNotification("Student data reset successfully!");
    } catch (err: any) {
      console.error("Reset Error:", err);
      showNotification("Failed to reset student: " + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function renderSupport() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Support Tickets</h2>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold">
            {supportTickets.filter(t => t.status === 'open').length} Open
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {supportTickets.length === 0 ? (
            <div className="glass-card p-12 rounded-3xl text-center">
              <p className="text-slate-500">No support tickets found.</p>
            </div>
          ) : (
            supportTickets.map((ticket) => (
              <motion.div 
                key={ticket.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${ticket.status === 'open' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {ticket.status}
                      </span>
                      <h4 className="text-white font-bold">{ticket.userName}</h4>
                      <span className="text-slate-500 text-xs">{ticket.userPhone || ticket.userEmail}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{ticket.message}</p>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <Calendar size={10} />
                      {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleString() : new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.status === 'open' ? (
                      <button 
                        onClick={async () => {
                          await updateDoc(doc(firestore, 'support_tickets', ticket.id), { status: 'closed' });
                          showNotification("Ticket marked as closed");
                        }}
                        className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-600/30 transition-all border border-emerald-500/20"
                      >
                        Mark as Closed
                      </button>
                    ) : (
                      <button 
                        onClick={async () => {
                          await updateDoc(doc(firestore, 'support_tickets', ticket.id), { status: 'open' });
                          showNotification("Ticket reopened");
                        }}
                        className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all border border-white/5"
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
                      className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }
};
