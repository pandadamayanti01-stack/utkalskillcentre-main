import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Search, Plus, Trash2, CheckCircle2, PlayCircle, Loader2, RefreshCw, Sliders, ShieldCheck } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { translations } from '../../translations';
import { CHAPTERS_MAP } from '../../data/chaptersMap';
import { getSubjectDisplayName } from '../SmartClassesView';

const normalizeSubjectKey = (subject: string): string => {
  if (!subject) return '';
  const spec = subject.toLowerCase().replace(/[^a-z0-9_]/g, '').replace(/_/g, '');
  
  const mapping: Record<string, string> = {
    ganitakhela: 'math',
    majamajareganita: 'math',
    ganitamela: 'math',
    ganitaprakas: 'math',
    jhulana1: 'odia',
    jhulana2: 'odia',
    bhasamahak1: 'odia',
    bhasamahak2: 'odia',
    bhasamahak3: 'odia',
    sahityasudha: 'odia',
    sahityasuman: 'odia',
    sahityasurabhi: 'odia',
    sahitydhara: 'odia',
    paribesapatha: 'science',
    jigyasa: 'science',
    amachaturbaswarapruthibi: 'science',
    pallavi: 'english',
    jasmine: 'english',
    sanskritakalika1: 'sanskrit',
    sanskritakalika2: 'sanskrit',
    sanskritakalika3: 'sanskrit',
    sanskritprabha: 'sanskrit',
    hindikalika: 'hindi',
    hindisaurabh: 'hindi',
    kausalabodha: 'vocational',
    kalasikhya: 'art',
    sharirikasikhya: 'physical_education',
    kridayoga: 'physical_education',
    sharirikayoga: 'physical_education',
    kalakunja: 'art',
    khelasikhya: 'physical_education',
    kalakruti: 'art',
    kruti: 'art',
    algebra: 'algebra',
    geometry: 'geometry',
    physicalscience: 'physical_science',
    lifescience: 'life_science',
    socialscience: 'social_science',
    geography: 'geography',
    englishgrammar: 'english_grammar',
    odiagrammar: 'odia_grammar',
    sanskritgrammar: 'sanskrit_grammar',
    hindigrammar: 'hindi_grammar'
  };

  return mapping[spec] || subject;
};

const getSubjectsForClass = (classStr: string) => {
  const rawSubjects = Object.keys(CHAPTERS_MAP[classStr] || {});
  if (classStr === '9' || classStr === '10') {
    return rawSubjects
      .map(sub => {
        if (sub === 'math') return 'algebra';
        if (sub === 'history') return 'social_science';
        return sub;
      })
      .filter((sub, idx, self) => self.indexOf(sub) === idx && sub !== 'math');
  }
  return rawSubjects.filter(sub => sub.toLowerCase() !== 'algebra');
};

function formatChapterName(rawName: string) {
  if (rawName.includes(' - ')) {
    return rawName.trim();
  }

  let chapterNum = 1;
  const numMatch = rawName.match(/Chapter[_\-\s]?\s*(\d+)/i) || rawName.match(/Ch[_\-\s]?\s*(\d+)/i);
  if (numMatch) {
    chapterNum = parseInt(numMatch[1], 10);
  }

  let titlePart = rawName.replace(/^Class\d+_/i, '');
  
  titlePart = titlePart.replace(/^(KalaSikhya|KalaKruti|PE|Pallavi|EVS|Odia|Mathematics|Evs|Physical_education)_[A-Za-z0-9]+_/i, '');
  titlePart = titlePart.replace(/^(KalaSikhya|KalaKruti|PE|Pallavi|EVS|Odia|Mathematics|Evs|Physical_education)_/i, '');
  
  titlePart = titlePart.replace(/^Ch[_\-\s]?\d+_/i, '');
  titlePart = titlePart.replace(/^Chapter[_\-\s]?\d+_/i, '');
  
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_Ch\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_Ch0\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_/i, '');
  
  titlePart = titlePart.replace(/^Ch\d+_/i, '');
  titlePart = titlePart.replace(/_/g, ' ').trim();

  titlePart = titlePart.split(' ').map(word => {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');

  return `Chapter ${chapterNum} - ${titlePart}`;
}

interface CuratedVideo {
  id: string;
  classStr: string;
  subject: string;
  chapter: string;
  youtubeUrl: string;
  title: string;
  order: number;
  createdAt: any;
  status?: 'published' | 'trial' | 'backup' | 'pending_review';
  trialStartedAt?: any;
  replacedVideoId?: string;
  originalOrder?: number;
  initialScore?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  engagementScore?: number;
  reviewReason?: string;
}

export function VideoCuratorTab() {
  const [videos, setVideos] = useState<CuratedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Suggestions state
  const [suggestedVideos, setSuggestedVideos] = useState<any[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [activeSuggestionBatchId, setActiveSuggestionBatchId] = useState<string | null>(null);

  // Form State
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState(() => {
    const subjects = getSubjectsForClass('10');
    return subjects.includes('algebra') ? 'algebra' : (subjects[0] || 'math');
  });
  const [chapterName, setChapterName] = useState('');
  const [videoTitle, setVideoTitle] = useState('Part 1');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoOrder, setVideoOrder] = useState<number>(1);

  const [previewId, setPreviewId] = useState('');
  
  // Auto Curate State
  const [isAutoCurating, setIsAutoCurating] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  // Sync / Evaluation States
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);
  const [logMessage, setLogMessage] = useState<string | null>(null);


  useEffect(() => {
    fetchVideos();

    // Listen to pending suggested videos from teachers
    const q = query(
      collection(db, 'suggested_videos'), 
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const suggestions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSuggestedVideos(suggestions);
    }, (error) => {
      console.error("Failed to listen to suggested videos:", error);
    });

    return () => unsubscribe();
  }, []);

  // Update order and title when chapter selection changes
  useEffect(() => {
    if (chapterName) {
      const existingVideos = videos.filter(v => v.classStr === selectedClass && v.subject === selectedSubject && v.chapter === chapterName);
      const nextOrder = existingVideos.length + 1;
      setVideoOrder(nextOrder);
      setVideoTitle(`Part ${nextOrder}`);
    } else {
      setVideoOrder(1);
      setVideoTitle('Part 1');
    }
  }, [chapterName, selectedClass, selectedSubject, videos.length]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'curated_videos'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CuratedVideo));
      
      // Sort by classStr, subject, chapter, and order
      data.sort((a, b) => {
        const classA = parseInt(a.classStr, 10) || 0;
        const classB = parseInt(b.classStr, 10) || 0;
        if (classA !== classB) return classA - classB;
        
        const subA = (a.subject || '').localeCompare(b.subject || '');
        if (subA !== 0) return subA;
        
        const chapA = (a.chapter || '').localeCompare(b.chapter || '');
        if (chapA !== 0) return chapA;
        
        return (a.order || 0) - (b.order || 0);
      });
      
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch curated videos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const extractYoutubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    const id = extractYoutubeId(url);
    if (id) setPreviewId(id);
    else setPreviewId('');
    // Clear search results if manually changed
    setSearchResults([]);
  };

  const handleAutoCurate = async () => {
    if (!selectedClass || !selectedSubject || !chapterName) {
      alert("Please select Class, Subject, and enter Chapter Name first!");
      return;
    }
    
    setIsAutoCurating(true);
    try {
      const subjectName = getSubjectDisplayName(selectedClass, selectedSubject, 'en');
      const cleanChapterName = formatChapterName(chapterName);
      const query = `Class ${selectedClass} ${subjectName} ${cleanChapterName} Odia Medium BSE Odisha`;
      const youtubeApiKey = import.meta.env.VITE_YOUTUBE_API_KEY || "";
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${youtubeApiKey}&maxResults=15&order=relevance`);
      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
        const urls = data.items.map((item: any) => `https://www.youtube.com/watch?v=${item.id.videoId}`);
        setSearchResults(urls);
        setSearchIndex(0);
        setYoutubeUrl(urls[0]);
        setPreviewId(data.items[0].id.videoId);
      } else {
        alert("No videos found! Try typing a different chapter name.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to auto-curate. Check your network or API quota.");
    } finally {
      setIsAutoCurating(false);
    }
  };

  const handleNextResult = () => {
    if (searchResults.length > 0) {
      const nextIdx = (searchIndex + 1) % searchResults.length;
      setSearchIndex(nextIdx);
      const url = searchResults[nextIdx];
      setYoutubeUrl(url);
      setPreviewId(extractYoutubeId(url));
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    try {
      setActiveSuggestionId(suggestion.id);
      setActiveSuggestionBatchId(suggestion.batchId || null);
      
      const targetUrl = suggestion.url || suggestion.suggestUrl || '';
      setYoutubeUrl(targetUrl);
      
      const id = extractYoutubeId(targetUrl);
      setPreviewId(id);
      
      setVideoTitle(suggestion.title || 'Suggested Video');
      
      const targetClass = suggestion.classStr || suggestion.class;
      if (targetClass) {
        setSelectedClass(String(targetClass));
        const subjects = getSubjectsForClass(String(targetClass));
         const targetSubject = normalizeSubjectKey(suggestion.subject || '');
        if (targetSubject && subjects.includes(targetSubject)) {
          setSelectedSubject(targetSubject);
        } else {
          setSelectedSubject(subjects.includes('algebra') ? 'algebra' : (subjects[0] || 'math'));
        }
      }
      setChapterName(''); // Admin selects chapter
    } catch (err) {
      console.error("Error selecting suggestion:", err);
      alert("Failed to load suggested video details: " + err);
    }
  };

  const handleRejectSuggestion = async (id: string) => {
    if (!window.confirm("Are you sure you want to reject this suggested video?")) return;
    try {
      await updateDoc(doc(db, 'suggested_videos', id), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });
      if (activeSuggestionId === id) {
        setActiveSuggestionId(null);
        setActiveSuggestionBatchId(null);
        setYoutubeUrl('');
        setPreviewId('');
      }
      alert("Video suggestion rejected.");
    } catch (err) {
      console.error("Error rejecting suggestion:", err);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !chapterName || !youtubeUrl) return;
    
    setIsSaving(true);
    try {
      // Direct curate: Call backend API to handle limit checks, scoring, and A/B switch
      const res = await fetch('/api/admin/videos/add-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classStr: selectedClass,
          subject: selectedSubject,
          chapter: chapterName,
          youtubeUrl: youtubeUrl,
          title: videoTitle,
          order: Number(videoOrder) || 1,
          bypassLimitCheck: false
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.details || 'Failed to curate video');
      }

      const addRes = await res.json();

      // Update pending review suggestions if approved from review card
      if (activeSuggestionId) {
        await updateDoc(doc(db, 'suggested_videos', activeSuggestionId), {
          status: 'approved',
          approvedAt: serverTimestamp()
        });
      }

      // Reset form
      setYoutubeUrl('');
      setPreviewId('');
      setSearchResults([]);
      setActiveSuggestionId(null);
      setActiveSuggestionBatchId(null);
      
      fetchVideos();

      if (addRes.action === 'switched') {
        alert(`Successfully added! Replaced low-performing video (retained as backup).`);
      } else if (addRes.action === 'flagged_pending') {
        alert(`Video engagement score was lower than current playlist. Video added to review queue.`);
      } else {
        alert("Video Curated Successfully!");
      }
    } catch (err) {
      console.error("Error saving video:", err);
      alert("Failed to save video: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSync = async () => {
    if (!window.confirm(`Are you sure you want to run YouTube Sync for Class ${selectedClass} - ${getSubjectDisplayName(selectedClass, selectedSubject, 'en')}? This will scan YouTube for all chapters.`)) return;
    setIsSyncing(true);
    setLogMessage("Syncing... this might take a few moments.");
    try {
      const res = await fetch('/api/admin/videos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classStr: selectedClass,
          subject: selectedSubject
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLogMessage(`Sync Completed!\nResults:\n${JSON.stringify(data.results, null, 2)}`);
        fetchVideos();
      } else {
        throw new Error((data.error || 'Sync failed') + (data.details ? `: ${data.details}` : ''));
      }
    } catch (err) {
      console.error("Sync error:", err);
      setLogMessage(`Sync Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunEval = async () => {
    if (!window.confirm("Evaluate matured trial videos now? (Force mode will evaluate all trial videos immediately, ignoring the 15-day waiting period.)")) return;
    const force = window.confirm("Do you want to FORCE evaluation immediately without waiting 15 days? (OK = Force immediately, Cancel = Only evaluate matured trials)");
    setIsEvaluating(true);
    setLogMessage("Evaluating trials...");
    try {
      const res = await fetch(`/api/admin/videos/trial-eval?force=${force}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setLogMessage(`Evaluation Completed!\nResults:\n${JSON.stringify(data.results, null, 2)}`);
        fetchVideos();
      } else {
        throw new Error((data.error || 'Evaluation failed') + (data.details ? `: ${data.details}` : ''));
      }
    } catch (err) {
      console.error("Eval error:", err);
      setLogMessage(`Evaluation Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRunReverify = async () => {
    if (!window.confirm("Verify all currently active videos with Gemini OCR? Videos that fail verification will be set to 'pending_review'.")) return;
    setIsReverifying(true);
    setLogMessage("Re-verifying all playlist videos using Gemini...");
    try {
      const res = await fetch('/api/admin/videos/reverify', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setLogMessage(`Re-verification Completed!\nVerified count: ${data.count}\nResults:\n${JSON.stringify(data.results, null, 2)}`);
        fetchVideos();
      } else {
        throw new Error((data.error || 'Re-verification failed') + (data.details ? `: ${data.details}` : ''));
      }
    } catch (err) {
      console.error("Reverify error:", err);
      setLogMessage(`Re-verification Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsReverifying(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await deleteDoc(doc(db, 'curated_videos', id));
      setVideos(videos.filter(v => v.id !== id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleApprovePending = async (vid: CuratedVideo) => {
    if (!window.confirm(`Are you sure you want to approve and publish "${vid.title}"?`)) return;
    try {
      setIsSaving(true);
      // 1. Call add-direct to publish/trial it (handles A/B testing switches automatically!)
      const res = await fetch('/api/admin/videos/add-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classStr: vid.classStr,
          subject: vid.subject,
          chapter: vid.chapter,
          youtubeUrl: vid.youtubeUrl,
          title: vid.title,
          order: vid.order,
          bypassLimitCheck: false
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.details || 'Failed to approve video');
      }

      const addRes = await res.json();

      // 2. Delete the old pending_review document
      await deleteDoc(doc(db, 'curated_videos', vid.id));

      fetchVideos();

      if (addRes.action === 'switched') {
        alert(`Video approved! Replaced low-performing video (retained as backup).`);
      } else {
        alert("Video approved and published successfully!");
      }
    } catch (err) {
      console.error("Error approving video:", err);
      alert("Failed to approve video: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Banner */}
      <div className="glass-card rounded-[2.5rem] p-8 bg-gradient-to-r from-red-900/40 via-rose-900/30 to-slate-900/80 border border-red-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-black uppercase tracking-widest">
              <Youtube size={14} className="animate-pulse" />
              Smart Classes Engine
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Curated Video Library
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Add YouTube videos directly into the Syllabus Tracker. Replace boring text chapters with premium video playlists.
            </p>
          </div>
        </div>
      </div>

      {/* Automation Control Panel */}
      <div className="glass-card rounded-3xl p-6 border border-white/5 bg-slate-900/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Automation Control Center</h3>
              <p className="text-xs text-slate-400">Trigger background YouTube bulk syncs, run Gemini OCR audits, and evaluate active A/B trials.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={handleRunSync}
            disabled={isSyncing || isEvaluating || isReverifying}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-red-500/30 text-left transition-all hover:bg-slate-900/60 disabled:opacity-50 flex flex-col justify-between space-y-4 group cursor-pointer"
          >
            <div className="flex justify-between items-start w-full">
              <span className="p-2.5 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-all">
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
              </span>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Sync API</span>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Run YouTube Sync</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Bulk search new YouTube lessons for Class {selectedClass} - {getSubjectDisplayName(selectedClass, selectedSubject, 'en')} chapters and auto-curate with Gemini OCR verify.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleRunEval}
            disabled={isSyncing || isEvaluating || isReverifying}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/30 text-left transition-all hover:bg-slate-900/60 disabled:opacity-50 flex flex-col justify-between space-y-4 group cursor-pointer"
          >
            <div className="flex justify-between items-start w-full">
              <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-all">
                <Sliders size={18} className={isEvaluating ? 'animate-pulse' : ''} />
              </span>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">A/B Engine</span>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Evaluate A/B Trials</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Trigger 15-day trials evaluation immediately. Promotes successful trial videos and rolls back low-performing ones.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleRunReverify}
            disabled={isSyncing || isEvaluating || isReverifying}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-emerald-500/30 text-left transition-all hover:bg-slate-900/60 disabled:opacity-50 flex flex-col justify-between space-y-4 group cursor-pointer"
          >
            <div className="flex justify-between items-start w-full">
              <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                <ShieldCheck size={18} />
              </span>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">OCR Audit</span>
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Gemini OCR Audit</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                Retroactively run Gemini OCR thumbnail analysis on all curated playlist videos. Flags spam/non-educational lessons to review.
              </p>
            </div>
          </button>
        </div>

        {logMessage && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto relative">
            <div className="flex justify-between border-b border-white/5 pb-2 mb-2 font-black uppercase tracking-wider text-slate-500">
              <span>Execution Logs</span>
              <button type="button" onClick={() => setLogMessage(null)} className="text-red-400 hover:text-red-300 font-bold">Clear</button>
            </div>
            {logMessage}
          </div>
        )}
      </div>

      {/* Teacher Suggested Videos Review Queue */}
      {suggestedVideos.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/80 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
              <Youtube size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Pending Teacher Suggestions</h3>
              <p className="text-xs text-slate-400">Review and select video lessons suggested by educators for global curation.</p>
            </div>
            <span className="ml-auto px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-500/30">
              {suggestedVideos.length} Suggested
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedVideos.map((sug) => (
              <div 
                key={sug.id} 
                className={`p-4 rounded-2xl bg-slate-950/60 border transition-all flex flex-col justify-between space-y-3 ${
                  activeSuggestionId === sug.id ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[9px] font-black uppercase tracking-wider">
                      Class {sug.classStr} • {sug.subject?.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold">
                      {sug.createdAt?.seconds ? new Date(sug.createdAt.seconds * 1000).toLocaleDateString() : 'Pending'}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs leading-snug truncate">{sug.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Suggested by: <span className="text-purple-400 font-bold">{sug.teacherName}</span> ({sug.batchName})
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={12} />
                    <span>Review & Curate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectSuggestion(sug.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer"
                    title="Reject suggestion"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Curate Form */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Plus size={20} />
            </div>
            <h3 className="text-lg font-black text-white">Add New Video</h3>
          </div>

          <form onSubmit={handleSaveVideo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => {
                    const cls = e.target.value;
                    setSelectedClass(cls);
                    const subjects = getSubjectsForClass(cls);
                    if (subjects.length > 0) {
                      setSelectedSubject(subjects.includes('algebra') ? 'algebra' : subjects[0]);
                    }
                    setChapterName('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none"
                >
                  {[1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c.toString()}>Class {c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</label>
                <select 
                  value={selectedSubject} 
                  onChange={(e) => {
                    setSelectedSubject(e.target.value);
                    setChapterName('');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none"
                >
                  {getSubjectsForClass(selectedClass).map(sub => (
                    <option key={sub} value={sub}>{getSubjectDisplayName(selectedClass, sub, 'en')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chapter Name</label>
              <select 
                required
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none"
              >
                <option value="" disabled>Select Chapter</option>
                {(() => {
                  const chaptersMapKey = (selectedSubject === 'algebra' && (selectedClass === '9' || selectedClass === '10'))
                    ? 'algebra'
                    : (selectedSubject === 'social_science' && (selectedClass === '9' || selectedClass === '10'))
                      ? 'history'
                      : selectedSubject;
                  return ((CHAPTERS_MAP[selectedClass] || {})[chaptersMapKey] || [])
                    .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((ch: string) => (
                    <option key={ch} value={ch}>{formatChapterName(ch)}</option>
                  ));
                })()}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Part 1: Basics"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial Order</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={videoOrder}
                  onChange={(e) => setVideoOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-white/5">
              <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center justify-between">
                <span>YouTube Link</span>
                <button 
                  type="button" 
                  onClick={handleAutoCurate}
                  disabled={isAutoCurating || !chapterName}
                  className="flex items-center gap-1 bg-rose-500/20 text-rose-400 px-2 py-1 rounded hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                >
                  {isAutoCurating ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  Auto-Curate API
                </button>
              </label>
              <div className="flex gap-2">
                <input 
                  type="url" 
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={handleUrlChange}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none"
                />
              </div>
              
              {searchResults.length > 1 && (
                <div className="flex justify-between items-center bg-white/5 px-4 py-2 rounded-lg text-xs">
                  <span className="text-slate-400">Result {searchIndex + 1} of {searchResults.length}</span>
                  <button type="button" onClick={handleNextResult} className="text-red-400 font-bold hover:text-red-300 underline">
                    Not Odia? Fetch Next Video
                  </button>
                </div>
              )}
            </div>

            {previewId && (
              <div className="rounded-2xl overflow-hidden aspect-video border border-red-500/30 relative group">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${previewId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

            <button 
              type="submit"
              disabled={isSaving || !youtubeUrl || !chapterName}
              className="w-full py-4 mt-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Save Video to Syllabus
            </button>
          </form>
        </div>

        {/* Saved Videos List */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6 flex flex-col max-h-[800px]">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 shrink-0">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <PlayCircle size={20} />
            </div>
            <h3 className="text-lg font-black text-white">Curated Playlist</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-red-500" /></div>
            ) : videos.length === 0 ? (
              <div className="text-center p-8 text-slate-500 font-bold text-sm">No videos curated yet.</div>
            ) : (
              videos.map((vid) => {
                const isTrial = vid.status === 'trial';
                const isBackup = vid.status === 'backup';
                const isPending = vid.status === 'pending_review';
                
                return (
                  <div key={vid.id} className={`p-4 rounded-2xl border flex gap-4 group transition-all ${
                    isTrial 
                      ? 'border-cyan-500/30 bg-cyan-950/10 hover:border-cyan-500/50' 
                      : isBackup 
                        ? 'border-orange-500/15 bg-orange-950/5 opacity-60 hover:opacity-100 hover:border-orange-500/35'
                        : isPending
                          ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/50'
                          : 'border-white/5 bg-white/5 hover:border-red-500/30'
                  }`}>
                    <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 relative bg-black/50">
                      <img 
                        src={`https://img.youtube.com/vi/${extractYoutubeId(vid.youtubeUrl)}/mqdefault.jpg`} 
                        alt="thumbnail" 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Youtube size={16} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-white font-bold text-sm truncate max-w-[180px]" title={vid.title}>{vid.title}</h4>
                        {isTrial && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[8px] font-black uppercase tracking-wider border border-cyan-500/30">
                            Trial Video
                          </span>
                        )}
                        {isBackup && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 text-[8px] font-black uppercase tracking-wider border border-orange-500/30">
                            Backup Video (Inactive)
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[8px] font-black uppercase tracking-wider border border-red-500/30" title={vid.reviewReason}>
                            Pending Review
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5" title={vid.chapter}>{vid.chapter}</p>
                      
                      {/* Stats Display */}
                      {(vid.engagementScore !== undefined || vid.viewCount !== undefined) ? (
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-slate-400">
                          <span>Views: <strong className="text-slate-200">{vid.viewCount?.toLocaleString() || 0}</strong></span>
                          <span>•</span>
                          <span>Likes: <strong className="text-slate-200">{vid.likeCount?.toLocaleString() || 0}</strong></span>
                          <span>•</span>
                          <span>Score: <strong className="text-red-400">{vid.engagementScore?.toLocaleString() || 0}</strong></span>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Class {vid.classStr}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 capitalize">{getSubjectDisplayName(vid.classStr, vid.subject, 'en')}</span>
                        </div>
                      )}
                      
                      {isPending && vid.reviewReason && (
                        <p className="text-[10px] text-red-400/90 font-medium italic mt-1 leading-normal">
                          {vid.reviewReason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 self-center shrink-0">
                      {isPending && (
                        <button 
                          onClick={() => handleApprovePending(vid)} 
                          className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all cursor-pointer"
                          title="Approve & Publish Video"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(vid.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
