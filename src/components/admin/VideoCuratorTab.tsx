import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Youtube, Search, Plus, Trash2, CheckCircle2, PlayCircle, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { translations } from '../../translations';
import { CHAPTERS_MAP } from '../../data/chaptersMap';

function formatChapterName(rawName: string) {
  let name = rawName.replace(/^Class\d+_/i, '');
  name = name.replace(/_/g, ' ');
  name = name.replace(/^(Chapter\s*\d+)\s+([^-])/i, '$1 - $2');
  return name.trim();
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
  const [selectedSubject, setSelectedSubject] = useState(Object.keys(CHAPTERS_MAP['10'] || {}).filter(sub => sub.toLowerCase() !== 'algebra')[0] || 'math');
  const [chapterName, setChapterName] = useState('');
  const [videoTitle, setVideoTitle] = useState('Part 1');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const [previewId, setPreviewId] = useState('');
  
  // Auto Curate State
  const [isAutoCurating, setIsAutoCurating] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'curated_videos'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CuratedVideo));
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
      const query = `Class ${selectedClass} ${selectedSubject} ${chapterName} Odia Medium BSE Odisha`;
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
        order: videos.filter(v => v.chapter === chapterName).length + 1,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'curated_videos'), newVideo);
      
      // Reset form
      setYoutubeUrl('');
      setPreviewId('');
      setSearchResults([]);
      setVideoTitle(`Part ${videos.filter(v => v.chapter === chapterName).length + 2}`);
      
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
                    setSelectedClass(e.target.value);
                    const subjects = Object.keys(CHAPTERS_MAP[e.target.value] || {}).filter(sub => sub.toLowerCase() !== 'algebra');
                    if (subjects.length > 0) setSelectedSubject(subjects[0]);
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
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white font-bold focus:border-red-500 outline-none capitalize"
                >
                  {(Object.keys(CHAPTERS_MAP[selectedClass] || {})).filter(sub => sub.toLowerCase() !== 'algebra').map(sub => (
                    <option key={sub} value={sub}>{sub.replace('_', ' ')}</option>
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
                {((CHAPTERS_MAP[selectedClass] || {})[selectedSubject] || []).map((ch: string) => (
                  <option key={ch} value={ch}>{formatChapterName(ch)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
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
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 capitalize">{vid.subject}</span>
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
