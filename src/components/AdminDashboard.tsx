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
  Trophy
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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

type AdminTab = 'dashboard' | 'content' | 'monthly_tests' | 'ai_usage' | 'payments' | 'notifications' | 'settings';

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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({});
  const [privateSettings, setPrivateSettings] = useState<any>({});
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [newTest, setNewTest] = useState<any>({
    subject: '',
    month: '',
    year: new Date().getFullYear(),
    language: 'or',
    questions: [],
    status: 'draft'
  });

  const fetchContent = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, 'chapters'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContent(data);
    } catch (err) {
      console.error("Fetch Content Error:", err);
    }
  };

  const fetchMonthlyTests = async () => {
    try {
      const snapshot = await getDocs(collection(firestore, 'monthly_tests'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMonthlyTests(data);
    } catch (err) {
      console.error("Fetch Monthly Tests Error:", err);
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

    const unsubTests = onSnapshot(collection(firestore, 'monthly_tests'), (snapshot) => {
      setMonthlyTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Firestore Monthly Tests onSnapshot Error:", err));

    const unsubPrivateSettings = onSnapshot(doc(firestore, 'settings', 'private'), (doc) => {
      if (doc.exists()) setPrivateSettings(doc.data());
    }, (err) => console.error("Firestore Private Settings onSnapshot Error:", err));

    return () => {
      unsubTx();
      unsubAi();
      unsubNotifs();
      unsubSettings();
      unsubTests();
      unsubPrivateSettings();
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
    playlist_id: '',
    notes: '',
    practice_questions: [] as any[],
    quiz_questions: [] as any[]
  });

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Save the original chapter
      const originalDocRef = await addDoc(collection(firestore, 'chapters'), {
        ...newChapter,
        createdAt: serverTimestamp()
      });

      // Determine target language for auto-translation
      const targetLang = newChapter.language === 'en' ? 'or' : 'en';
      
      // Translate title and notes
      const translatedTitle = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newChapter.title, targetLanguage: targetLang, isJson: false })
      }).then(res => res.json()).then(data => data.text);

      const translatedNotes = newChapter.notes ? await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newChapter.notes, targetLanguage: targetLang, isJson: false })
      }).then(res => res.json()).then(data => data.text) : '';

      // Translate practice questions
      const translatedPractice = newChapter.practice_questions.length > 0 ? await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: JSON.stringify(newChapter.practice_questions), targetLanguage: targetLang, isJson: true })
      }).then(res => res.json()).then(data => {
        try { return JSON.parse(data.text); } catch(e) { return newChapter.practice_questions; }
      }) : [];

      // Translate quiz questions
      const translatedQuiz = newChapter.quiz_questions.length > 0 ? await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: JSON.stringify(newChapter.quiz_questions), targetLanguage: targetLang, isJson: true })
      }).then(res => res.json()).then(data => {
        try { return JSON.parse(data.text); } catch(e) { return newChapter.quiz_questions; }
      }) : [];

      // Save the translated chapter
      await addDoc(collection(firestore, 'chapters'), {
        ...newChapter,
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
      
      alert("Chapter and its auto-translation added successfully!");
      setIsAddingChapter(false);
      setNewChapter({
        board: 'Odisha Board',
        class: 5,
        language: 'or',
        subject: 'Mathematics',
        title: '',
        playlist_id: '',
        notes: '',
        practice_questions: [],
        quiz_questions: []
      });
      fetchContent();
    } catch (err: any) {
      console.error("Add Chapter Error:", err);
      alert("Failed to add chapter: " + err.message);
    }
  };

  const renderContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Content Library</h2>
        <div className="flex gap-2">
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
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chapter / Video Title</label>
                <input 
                  type="text" 
                  value={newChapter.title}
                  onChange={(e) => setNewChapter({...newChapter, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  placeholder="e.g. ବସ୍ତୁରୁ ଆକୃତି ଜାଣିବା"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">YouTube Video ID</label>
                <input 
                  type="text" 
                  value={newChapter.playlist_id}
                  onChange={(e) => setNewChapter({...newChapter, playlist_id: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                  placeholder="e.g. dQw4w9WgXcQ (The 11 characters after v= in the YouTube URL)"
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
                        { question: "୧. ଏକ ବର୍ଗାକାର କାଗଜର କେତୋଟି କୋଣ ଥାଏ?", answer: "ଏକ ବର୍ଗାକାର କାଗଜର ୪ଟି କୋଣ ଥାଏ।" },
                        { question: "୨. ତ୍ରିଭୁଜର କେତୋଟି ବାହୁ ଅଛି?", answer: "ତ୍ରିଭୁଜର ୩ଟି ବାହୁ ଅଛି।" },
                        { question: "୩. ଗୋଟିଏ ଆୟତକାର କାଗଜକୁ ମଝିରୁ କୋଣାକୋଣି ଭାଙ୍ଗିଲେ କେଉଁ ଆକୃତି ମିଳିବ?", answer: "ଗୋଟିଏ ଆୟତକାର କାଗଜକୁ ମଝିରୁ କୋଣାକୋଣି ଭାଙ୍ଗିଲେ ତ୍ରିଭୁଜ ଆକୃତି ମିଳିବ।" },
                        { question: "୪. ତୁମେ କାଗଜରେ ତିଆରି କରୁଥିବା ଦୁଇଟି ଖେଳନାର ନାମ ଲେଖ।", answer: "କାଗଜରେ ତିଆରି ଦୁଇଟି ଖେଳନା ହେଲା: କାଗଜ ଡଙ୍ଗା ଏବଂ କାଗଜ ବିମାନ।" }
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
                      practice_questions: [...newChapter.practice_questions, { question: '', answer: '' }]
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
                      className="w-full bg-transparent border-b border-white/10 text-white text-base py-2 focus:outline-none focus:border-emerald-500"
                    />
                    <textarea 
                      placeholder="Answer/Explanation"
                      value={pq.answer}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}
                      onChange={(e) => {
                        const pqs = [...newChapter.practice_questions];
                        pqs[idx].answer = e.target.value;
                        setNewChapter({...newChapter, practice_questions: pqs});
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:outline-none h-32"
                    />
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

            <div className="flex gap-4">
              <button 
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all"
              >
                Save Topic to Library
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
                    if (confirmAction === `delete_topic_${c.id}`) {
                      try {
                        await deleteDoc(doc(firestore, 'chapters', c.id));
                        setConfirmAction(null);
                        fetchContent();
                      } catch (err) {
                        console.error("Delete Topic Error:", err);
                      }
                    } else {
                      setConfirmAction(`delete_topic_${c.id}`);
                      setTimeout(() => setConfirmAction(null), 3000);
                    }
                  }}
                  className={confirmAction === `delete_topic_${c.id}` ? "text-red-500 font-bold text-xs" : "text-slate-500 hover:text-red-500"}
                >
                  {confirmAction === `delete_topic_${c.id}` ? "Confirm?" : <Trash2 size={14} />}
                </button>
              </div>
            </div>
            <h4 className="text-white font-semibold">{c.title}</h4>
            <div className="text-xs text-slate-500">{c.subject}</div>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1"><Youtube size={14} /> Video</div>
              {c.notes && <div className="flex items-center gap-1"><FileText size={14} /> Notes</div>}
              {c.quiz_questions?.length > 0 && <div className="flex items-center gap-1"><ListChecks size={14} /> Quiz</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMonthlyTests = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Monthly Tests Management</h3>
        <button 
          onClick={() => {
            setNewTest({
              subject: '',
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

      {isAddingTest && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Subject</label>
              <input 
                type="text" 
                value={newTest.subject}
                onChange={(e) => setNewTest({...newTest, subject: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
                placeholder="e.g. Mathematics"
              />
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
                onChange={(e) => setNewTest({...newTest, year: parseInt(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Test Questions</h4>
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
                  // Save original test
                  const originalTestRef = await addDoc(collection(firestore, 'monthly_tests'), {
                    ...newTest,
                    createdAt: serverTimestamp()
                  });

                  // Determine target language for auto-translation
                  const targetLang = newTest.language === 'en' ? 'or' : 'en';

                  // Translate questions
                  const translatedQuestions = newTest.questions.length > 0 ? await fetch('/api/ai/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: JSON.stringify(newTest.questions), targetLanguage: targetLang, isJson: true })
                  }).then(res => res.json()).then(data => {
                    try { return JSON.parse(data.text); } catch(e) { return newTest.questions; }
                  }) : [];

                  // Save translated test
                  await addDoc(collection(firestore, 'monthly_tests'), {
                    ...newTest,
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
                  fetchMonthlyTests();
                } catch (err) {
                  console.error("Save Test Error:", err);
                  alert("Failed to save test");
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
                <h4 className="text-white font-bold text-lg">{test.subject}</h4>
                <p className="text-slate-400 text-sm">{test.month} {test.year}</p>
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
                      fetchMonthlyTests();
                    } catch (err) {
                      alert("Failed to publish test");
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
                        // Fetch all submissions for this test
                        const q = query(collection(firestore, 'monthly_test_submissions'), where('testId', '==', test.id));
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

                        await updateDoc(doc(firestore, 'monthly_tests', test.id), { results_published: true });
                        setConfirmAction(null);
                        fetchMonthlyTests();
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
                      await deleteDoc(doc(firestore, 'monthly_tests', test.id));
                      setConfirmAction(null);
                      fetchMonthlyTests();
                    } catch (err) {
                      console.error("Delete Test Error:", err);
                    }
                  } else {
                    setConfirmAction(`delete_test_${test.id}`);
                    setTimeout(() => setConfirmAction(null), 3000);
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
      await setDoc(doc(firestore, 'settings', 'private'), privateSettings);
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
    { id: 'content', label: 'Content Library', icon: BookOpen },
    { id: 'monthly_tests', label: 'Monthly Tests', icon: Calendar },
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
            {activeTab === 'monthly_tests' && renderMonthlyTests()}
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
