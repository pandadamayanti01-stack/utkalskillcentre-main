import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, where, Timestamp, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { ChatMessage } from '../../types';
import { Trash2, Shield, Search, AlertCircle, RefreshCw, Send, Paperclip, Loader2, Image, FileText, FileSpreadsheet, Presentation, Archive, File, Download } from 'lucide-react';

const getFileDetails = (fileName: string, fileType: string) => {
  const name = String(fileName || '').toLowerCase();
  const type = String(fileType || '').toLowerCase();
  if (type === 'image' || type.includes('image')) {
    return {
      icon: <Image size={18} className="text-emerald-400" />,
      label: 'Image File',
      color: 'text-emerald-400'
    };
  }
  if (type === 'pdf' || name.endsWith('.pdf')) {
    return {
      icon: <FileText size={18} className="text-rose-400" />,
      label: 'PDF Document',
      color: 'text-rose-400'
    };
  }
  if (type === 'word' || name.endsWith('.doc') || name.endsWith('.docx')) {
    return {
      icon: <FileText size={18} className="text-blue-400" />,
      label: 'Word Document',
      color: 'text-blue-400'
    };
  }
  if (type === 'excel' || name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return {
      icon: <FileSpreadsheet size={18} className="text-emerald-500" />,
      label: 'Spreadsheet',
      color: 'text-emerald-500'
    };
  }
  if (type === 'ppt' || name.endsWith('.ppt') || name.endsWith('.pptx')) {
    return {
      icon: <Presentation size={18} className="text-orange-400" />,
      label: 'Presentation',
      color: 'text-orange-400'
    };
  }
  if (type === 'zip' || name.endsWith('.zip') || name.endsWith('.rar')) {
    return {
      icon: <Archive size={18} className="text-amber-400" />,
      label: 'Archive (ZIP)',
      color: 'text-amber-400'
    };
  }
  return {
    icon: <File size={18} className="text-slate-400" />,
    label: 'Document',
    color: 'text-slate-400'
  };
};

export const CommunityModerationTab: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string>('class10');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 35 * 1024 * 1024) {
      alert("File size exceeds 35MB limit.");
      return;
    }

    const { ref: storageRef, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
    const { storage } = await import('../../firebase');

    setUploadingFile(true);
    setUploadProgress(0);

    try {
      const fileRef = storageRef(storage, `community_files/${selectedClass}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          alert("Upload failed. Please try again.");
          setUploadingFile(false);
        }, 
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const currentUser = auth.currentUser;
            
            let fType = 'document';
            const nameLower = file.name.toLowerCase();
            if (file.type.startsWith('image/')) {
              fType = 'image';
            } else if (file.type.includes('pdf') || nameLower.endsWith('.pdf')) {
              fType = 'pdf';
            } else if (nameLower.endsWith('.doc') || nameLower.endsWith('.docx')) {
              fType = 'word';
            } else if (nameLower.endsWith('.xls') || nameLower.endsWith('.xlsx')) {
              fType = 'excel';
            } else if (nameLower.endsWith('.ppt') || nameLower.endsWith('.pptx')) {
              fType = 'ppt';
            } else if (nameLower.endsWith('.zip') || nameLower.endsWith('.rar')) {
              fType = 'zip';
            }

            await addDoc(collection(db, 'community'), {
              text: `Sent a file: ${file.name}`,
              fileUrl: downloadUrl,
              fileName: file.name,
              fileType: fType,
              userId: currentUser?.uid || 'admin',
              userName: currentUser?.displayName || 'Administrator',
              userAvatar: currentUser?.photoURL || null,
              class: selectedClass,
              role: 'admin',
              timestamp: serverTimestamp()
            });
          } catch (err) {
            console.error("Error creating message for uploaded file:", err);
          } finally {
            setUploadingFile(false);
            setUploadProgress(0);
          }
        }
      );
    } catch (err) {
      console.error("Firebase Storage init error:", err);
      alert("Failed to initialize upload.");
      setUploadingFile(false);
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
                      <span className="font-bold text-white truncate">{msg.userName === 'Damayanti Panda' ? 'Tiki Apa' : msg.userName}</span>
                      <span className="text-xs text-slate-500">
                        {msg.timestamp?.toDate().toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap break-words">{msg.text}</p>
                    {msg.fileUrl && (() => {
                      const fileDetails = getFileDetails(msg.fileName || '', msg.fileType || '');
                      const isImage = msg.fileType === 'image' || (msg.fileName && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(msg.fileName));
                      return (
                        <div className="mt-2.5 space-y-2 relative z-10 max-w-md">
                          {isImage && (
                            <div className="rounded-xl overflow-hidden border border-white/10 max-h-48 max-w-full flex items-center justify-center bg-black/20">
                              <img 
                                src={msg.fileUrl} 
                                alt={msg.fileName || 'Uploaded image'} 
                                className="object-cover max-h-48 w-full hover:scale-105 transition-transform duration-300 cursor-pointer"
                                onClick={() => window.open(msg.fileUrl, '_blank')}
                              />
                            </div>
                          )}
                          
                          <div className="p-3 rounded-xl bg-slate-950/40 border border-white/10 flex items-center justify-between gap-4 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                {fileDetails.icon}
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-white max-w-[150px] truncate">{msg.fileName || 'file'}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{fileDetails.label}</span>
                              </div>
                            </div>
                            <a 
                              href={msg.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center shadow-md shadow-indigo-950/50"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })()}
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

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />

        {/* Uploading progress bar */}
        {uploadingFile && (
          <div className="mb-3 px-4 py-2 rounded-xl bg-slate-900 border border-indigo-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="text-indigo-400 animate-spin" />
              <span className="text-xs font-bold text-slate-300">
                Uploading material ({uploadProgress}%)...
              </span>
            </div>
            <div className="flex-grow bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        {/* Send Announcement / Message Form */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-3 border-t border-white/5 pt-4 shrink-0 mt-4">
          <button
            type="button"
            disabled={uploadingFile}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
            title="Upload Worksheet/Image"
          >
            <Paperclip size={18} />
          </button>
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
