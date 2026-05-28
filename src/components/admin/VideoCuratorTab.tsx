import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Search, Plus, Trash2, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { translations } from '../../translations';
import { CHAPTERS_MAP } from '../../data/chaptersMap';
import { getSubjectDisplayName } from '../SmartClassesView';

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
  // 1. If it already contains a hyphen (e.g. "Chapter 1 - ..."), it is already in standard format
  if (rawName.includes(' - ')) {
    return rawName.trim();
  }

  // 2. Extract chapter number
  let chapterNum = 1;
  const numMatch = rawName.match(/Chapter[_\-\s]?\s*(\d+)/i) || rawName.match(/Ch[_\-\s]?\s*(\d+)/i);
  if (numMatch) {
    chapterNum = parseInt(numMatch[1], 10);
  }

  // 3. Clean up the title part
  // Remove Class prefix (e.g. Class4_ or Class3_)
  let titlePart = rawName.replace(/^Class\d+_/i, '');
  
  // Remove Subject prefix (e.g. KalaSikhya_, KalaKruti_, PE_, Pallavi_, EVS_)
  titlePart = titlePart.replace(/^(KalaSikhya|KalaKruti|PE|Pallavi|EVS|Odia|Mathematics|Evs|Physical_education)_[A-Za-z0-9]+_/i, '');
  titlePart = titlePart.replace(/^(KalaSikhya|KalaKruti|PE|Pallavi|EVS|Odia|Mathematics|Evs|Physical_education)_/i, '');
  
  // Remove Chapter prefix (e.g. Ch01_ or Chapter01_)
  titlePart = titlePart.replace(/^Ch[_\-\s]?\d+_/i, '');
  titlePart = titlePart.replace(/^Chapter[_\-\s]?\d+_/i, '');
  
  // Remove Unit/Theme/Music/Dance/VisualArts keywords (e.g. VisualArts_Ch01_, Unit1_Ch1_, Music_Ch06_, Dance_Ch11_, Drama_Ch05_)
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_Ch\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_Ch0\d+_/i, '');
  titlePart = titlePart.replace(/^(Unit\d+|VisualArts|Music|Dance|Drama|Theatre|Theme\d+)_/i, '');
  
  // Just in case, clean up any remaining ChXX prefix
  titlePart = titlePart.replace(/^Ch\d+_/i, '');

  // Replace underscores with spaces
  titlePart = titlePart.replace(/_/g, ' ').trim();

  // Capitalize first letter of each word for beauty
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
}

export function VideoCuratorTab() {
  const [videos, setVideos] = useState<CuratedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    fetchVideos();
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
      const query = `Class ${selectedClass} ${subjectName} ${chapterName} Odia Medium BSE Odisha`;
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=AIzaSyCAI8kQ9j2oLwHbVF8eUtTAaQGzLqOcgeI&maxResults=15&order=relevance`);
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

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject || !chapterName || !youtubeUrl) return;
    
    setIsSaving(true);
    try {
      const newVideo = {
        classStr: selectedClass,
        subject: selectedSubject,
        chapter: chapterName,
        youtubeUrl: youtubeUrl,
        title: videoTitle,
        order: Number(videoOrder) || 1,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'curated_videos'), newVideo);
      
      // Reset form
      setYoutubeUrl('');
      setPreviewId('');
      setSearchResults([]);
      
      fetchVideos();
      alert("Video Curated Successfully!");
    } catch (err) {
      console.error("Error saving video:", err);
      alert("Failed to save video. Please try again.");
    } finally {
      setIsSaving(false);
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
              videos.map((vid) => (
                <div key={vid.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 group hover:border-red-500/30 transition-all">
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
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-sm truncate">{vid.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{vid.chapter}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Class {vid.classStr}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 capitalize">{getSubjectDisplayName(vid.classStr, vid.subject, 'en')}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(vid.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all self-center">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
