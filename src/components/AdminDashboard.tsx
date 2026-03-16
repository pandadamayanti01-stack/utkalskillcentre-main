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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db as firestore, auth } from '../firebase';
import { signOut } from 'firebase/auth';
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
  Timestamp
} from 'firebase/firestore';

type AdminTab = 'dashboard' | 'content' | 'ai_usage' | 'payments' | 'notifications' | 'settings';

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
  const [isSeeding, setIsSeeding] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});

  const fetchContent = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, 'chapters'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContent(data);
    } catch (err) {
      console.error("Fetch Content Error:", err);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    
    fetchContent();
    // Real-time stats and data
    const unsubTx = onSnapshot(collection(firestore, 'transactions'), (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
      setStats(prev => ({
        ...prev,
        totalRevenue: txs.reduce((acc, curr: any) => acc + (curr.amount || 0), 0)
      }));
    }, (err) => console.error("Firestore Transactions onSnapshot Error:", err));

    const unsubAi = onSnapshot(collection(firestore, 'ai_usage'), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAiLogs(logs);
      const today = new Date().toISOString().split('T')[0];
      setStats(prev => ({
        ...prev,
        aiQuestionsToday: logs.filter((l: any) => l.date?.startsWith(today)).length
      }));
    }, (err) => console.error("Firestore AI Usage onSnapshot Error:", err));

    const unsubNotifs = onSnapshot(collection(firestore, 'notifications'), (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Firestore Notifications onSnapshot Error:", err));

    const unsubSettings = onSnapshot(doc(firestore, 'settings', 'system'), (doc) => {
      if (doc.exists()) setSystemSettings(doc.data());
    }, (err) => console.error("Firestore Settings onSnapshot Error:", err));

    return () => {
      unsubTx();
      unsubAi();
      unsubNotifs();
      unsubSettings();
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

    </div>
  );

  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapter, setNewChapter] = useState({
    board: 'Odisha Board',
    class: 5,
    language: 'or',
    subject: 'Mathematics',
    title: '',
    topic_title: '',
    playlist_id: '',
    questions: [] as any[]
  });

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(firestore, 'chapters'), newChapter);
      
      alert("Chapter added successfully!");
      setIsAddingChapter(false);
      setNewChapter({
        board: 'Odisha Board',
        class: 5,
        language: 'or',
        subject: 'Mathematics',
        title: '',
        topic_title: '',
        playlist_id: '',
        questions: []
      });
      fetchContent();
    } catch (err: any) {
      console.error("Add Chapter Error:", err);
      alert("Failed to add chapter: " + err.message);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const chapters = [
        { class: 3, board: 'Odisha Board', language: 'or', subject: 'Mathematics', title: 'ସଂଖ୍ୟା ଗଣନା', concept_id: 'concept_counting', playlist_id: 'PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX' },
        { class: 3, board: 'Odisha Board', language: 'or', subject: 'Mathematics', title: 'ମିଶାଣ', concept_id: 'concept_addition', playlist_id: 'PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX' },
        { class: 3, board: 'Saraswati Sishu Mandir', language: 'or', subject: 'Mathematics', title: 'ଗଣନା କାର୍ଯ୍ୟ', concept_id: 'concept_counting', playlist_id: 'PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX' },
        { class: 3, board: 'Saraswati Sishu Mandir', language: 'or', subject: 'Mathematics', title: 'ମିଶାଣ ପ୍ରକ୍ରିୟା', concept_id: 'concept_addition', playlist_id: 'PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX' },
        { class: 3, board: 'CBSE', language: 'en', subject: 'Mathematics', title: 'Counting Numbers', concept_id: 'concept_counting', playlist_id: 'PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX' },
        { class: 3, board: 'CBSE', language: 'en', subject: 'Mathematics', title: 'Addition', concept_id: 'concept_addition', playlist_id: 'PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX' }
      ];

      for (const chapter of chapters) {
        await addDoc(collection(firestore, 'chapters'), chapter);
      }
      alert("Initial data seeded successfully!");
      fetchContent();
    } catch (err: any) {
      console.error("Seed Data Error:", err);
      alert("Failed to seed data: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const renderContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Content Library</h2>
        <div className="flex gap-2">
          {content.length === 0 && (
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-50"
            >
              {isSeeding ? "Seeding..." : "Seed Initial Data"}
            </button>
          )}
          <button 
            onClick={() => setIsAddingChapter(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all"
          >
            <Plus size={18} />
            Add New Chapter
          </button>
        </div>
      </div>

      {isAddingChapter && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-semibold text-white">Add New Chapter</h3>
          <form onSubmit={handleAddChapter} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Board</label>
                <select 
                  value={newChapter.board}
                  onChange={(e) => setNewChapter({...newChapter, board: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                >
                  <option value="Odisha Board">Odisha Board</option>
                  <option value="Saraswati Sishu Mandir">Saraswati Sishu Mandir</option>
                  <option value="CBSE">CBSE</option>
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
                  onChange={(e) => setNewChapter({...newChapter, class: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                >
                  {[3,4,5,6,7,8,9,10].map(c => <option key={c} value={c}>Class {c}</option>)}
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
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter Title</label>
                <input 
                  type="text" 
                  value={newChapter.title}
                  onChange={(e) => setNewChapter({...newChapter, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  placeholder="e.g. Fractions"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Topic Title</label>
                <input 
                  type="text" 
                  value={newChapter.topic_title}
                  onChange={(e) => setNewChapter({...newChapter, topic_title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  placeholder="e.g. Introduction to Fractions"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">YouTube Playlist ID</label>
                <input 
                  type="text" 
                  value={newChapter.playlist_id}
                  onChange={(e) => setNewChapter({...newChapter, playlist_id: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  placeholder="PL0o_zxa4K1BWYThyV4T2Allw6zY0jE_vX"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Questions & Answers (Quiz)</h4>
                <button 
                  type="button"
                  onClick={() => setNewChapter({
                    ...newChapter, 
                    questions: [...newChapter.questions, { question: '', options: ['', '', '', ''], correct_answer: '' }]
                  })}
                  className="text-xs text-emerald-500 hover:underline"
                >
                  + Add Question
                </button>
              </div>
              
              <div className="space-y-4">
                {newChapter.questions.map((q, qIdx) => (
                  <div key={qIdx} className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-start">
                      <input 
                        type="text"
                        placeholder={`Question ${qIdx + 1}`}
                        value={q.question}
                        onChange={(e) => {
                          const qs = [...newChapter.questions];
                          qs[qIdx].question = e.target.value;
                          setNewChapter({...newChapter, questions: qs});
                        }}
                        className="flex-1 bg-transparent border-b border-white/10 text-white text-sm py-1 focus:outline-none focus:border-emerald-500"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const qs = newChapter.questions.filter((_, i) => i !== qIdx);
                          setNewChapter({...newChapter, questions: qs});
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
                            const qs = [...newChapter.questions];
                            qs[qIdx].options[oIdx] = e.target.value;
                            setNewChapter({...newChapter, questions: qs});
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
                          const qs = [...newChapter.questions];
                          qs[qIdx].correct_answer = e.target.value;
                          setNewChapter({...newChapter, questions: qs});
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
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all"
              >
                Save Chapter & Quiz
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {content.map((c, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                {c.board} • Class {c.class} • {c.language === 'or' ? 'Odia' : 'English'}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    if(window.confirm("Delete this chapter?")) {
                      try {
                        await deleteDoc(doc(firestore, 'chapters', c.id));
                        fetchContent();
                      } catch (err) {
                        console.error("Delete Chapter Error:", err);
                        alert("Failed to delete chapter");
                      }
                    }
                  }}
                  className="text-slate-500 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h4 className="text-white font-semibold">{c.title}</h4>
            <div className="text-xs text-slate-300 italic">{c.topic_title}</div>
            <div className="text-xs text-slate-500">{c.subject}</div>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1"><Youtube size={14} /> Playlist</div>
              <div className="flex items-center gap-1"><ListChecks size={14} /> Quiz</div>
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
        <div className="p-4 border-b border-white/10 font-semibold text-white">Sent History</div>
        <div className="divide-y divide-white/5">
          {notifications.map((n, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{n.message}</div>
                <div className="text-xs text-slate-500">{n.createdAt}</div>
              </div>
              <button className="text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(firestore, 'settings', 'system'), systemSettings);
      alert("System settings saved successfully!");
    } catch (err: any) {
      console.error("Save Settings Error:", err);
      alert("Failed to save settings: " + err.message);
    }
  };

  const renderSettings = () => (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI API Key</label>
          <input 
            type="password" 
            value={systemSettings.aiApiKey || ''}
            onChange={(e) => setSystemSettings({...systemSettings, aiApiKey: e.target.value})}
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
              onChange={(e) => setSystemSettings({...systemSettings, monthlyPrice: parseInt(e.target.value)})}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Yearly Price (₹)</label>
            <input 
              type="number" 
              value={systemSettings.yearlyPrice || 999}
              onChange={(e) => setSystemSettings({...systemSettings, yearlyPrice: parseInt(e.target.value)})}
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
        <button 
          onClick={handleSaveSettings}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all"
        >
          Save System Configuration
        </button>
      </div>
    </div>
  );

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'content', label: 'Content', icon: BookOpen },
    { id: 'ai_usage', label: 'AI Usage', icon: Brain },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
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
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 p-6 flex flex-col transform transition-transform duration-300 ease-in-out
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
            {activeTab === 'ai_usage' && renderAiUsage()}
            {activeTab === 'payments' && renderPayments()}
            {activeTab === 'notifications' && renderNotifications()}
            {activeTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
