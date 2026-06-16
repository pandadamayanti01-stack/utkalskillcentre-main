import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, where, Timestamp, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ChatMessage } from '../../types';
import { Trash2, Shield, Search, AlertCircle, RefreshCw, Send } from 'lucide-react';

export const CommunityModerationTab: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('class10');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const rooms = [
    { id: 'teachers', label: 'Educator Staff Room 👥' },
    { id: 'class10', label: 'Class 10' },
    { id: 'class9', label: 'Class 9' },
    { id: 'class8', label: 'Class 8' },
    { id: 'class7', label: 'Class 7' },
    { id: 'class6', label: 'Class 6' },
    { id: 'class5', label: 'Class 5' },
    { id: 'class4', label: 'Class 4' },
    { id: 'class3', label: 'Class 3' },
    { id: 'class2', label: 'Class 2' },
    { id: 'class1', label: 'Class 1' }
  ];

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'community'),
      where('class', '==', selectedClass),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching community chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClass]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'community', messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
      alert("Failed to delete message");
    }
  };

  const handlePurgeOldMessages = async () => {
    if (!window.confirm("Are you sure you want to delete all messages older than 10 days across all classes? This cannot be undone.")) return;
    
    setDeleting(true);
    setDeleteStatus("Scanning for old messages...");
    try {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const q = query(
        collection(db, 'community'),
        where('timestamp', '<', Timestamp.fromDate(tenDaysAgo))
      );
      
      const snapshot = await getDocs(q);
      const totalToDelete = snapshot.docs.length;
      
      if (totalToDelete === 0) {
        setDeleteStatus("No messages older than 10 days found.");
        setTimeout(() => setDeleteStatus(null), 3000);
        setDeleting(false);
        return;
      }

      setDeleteStatus(`Deleting ${totalToDelete} messages...`);
      
      let deletedCount = 0;
      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, 'community', document.id));
        deletedCount++;
        if (deletedCount % 10 === 0) {
          setDeleteStatus(`Deleted ${deletedCount} of ${totalToDelete} messages...`);
        }
      }
      
      setDeleteStatus(`Successfully deleted ${totalToDelete} old messages.`);
      setTimeout(() => setDeleteStatus(null), 4000);
    } catch (err) {
      console.error("Error purging messages:", err);
      setDeleteStatus("Error occurred while deleting old messages.");
      setTimeout(() => setDeleteStatus(null), 4000);
    }
    setDeleting(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const currentUser = auth.currentUser;
      await addDoc(collection(db, 'community'), {
        text: messageText,
        userId: currentUser?.uid || 'admin',
        userName: currentUser?.displayName || 'Administrator',
        userAvatar: currentUser?.photoURL || null,
        class: selectedClass,
        role: 'admin',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-indigo-400" />
            Community Moderation
          </h2>
          <p className="text-slate-400 text-sm mt-1">Monitor class discussions and remove inappropriate content</p>
        </div>
        <button
          onClick={handlePurgeOldMessages}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all font-medium disabled:opacity-50"
        >
          {deleting ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
          Purge &gt; 10 Days Old
        </button>
      </div>

      {deleteStatus && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${deleteStatus.includes('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
          <AlertCircle size={20} />
          <span className="font-medium">{deleteStatus}</span>
        </div>
      )}

      <div className="glass-card p-6 rounded-[2rem] flex flex-col h-[calc(100vh-250px)]">
        {/* Class Selector */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0 border-b border-white/5 mb-4">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedClass(room.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedClass === room.id
                  ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {room.label}
            </button>
          ))}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <RefreshCw className="animate-spin mr-2" /> Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Shield size={48} className="opacity-20" />
              <p>No messages in this community yet.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-white/5 border border-white/10 rounded-xl p-4 group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-white truncate">{msg.userName}</span>
                      <span className="text-xs text-slate-500">
                        {msg.timestamp?.toDate().toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Delete Message"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Send Announcement / Message Form */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 border-t border-white/5 pt-4 shrink-0 mt-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Send announcement to ${rooms.find(r => r.id === selectedClass)?.label || selectedClass}...`}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20"
            title="Send Message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
