import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, MonitorPlay, Maximize2, SkipForward, Library, Youtube, Sparkles, Loader2 } from 'lucide-react';
import { getAI, withRetry } from '../../services/aiService';

interface CuratedVideo {
  id: string;
  title: string;
  chapter: string;
  youtubeUrl: string;
  order: number;
}

interface CinematicPlayerProps {
  chapterName: string;
  videos: CuratedVideo[];
  onClose: () => void;
}

export function CinematicPlayer({ chapterName, videos, onClose }: CinematicPlayerProps) {
  const sortedVideos = [...videos].sort((a, b) => a.order - b.order);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const generateSummary = async (videoTitle: string) => {
    setIsSummaryOpen(true);
    if (summaryText) return; // Don't regenerate if already generated for this video
    
    setIsSummarizing(true);
    try {
      const ai = getAI();
      const responseText = await withRetry(async (modelName, apiVersion) => {
        const model = ai.getGenerativeModel({ model: modelName }, { apiVersion });
        const prompt = `You are an expert Odisha Board teacher. The student is watching an educational video titled "${videoTitle}" for the chapter "${chapterName}". Give a very short, 3-bullet point summary explaining the core concepts they are about to learn. Output ONLY in Odia language. Keep it very simple and encouraging.`;
        const result = await model.generateContent(prompt);
        return await result.response.text();
      }, 'flash');
      
      setSummaryText(responseText || "Summary generation failed.");
    } catch (error) {
      console.error("Failed to generate summary:", error);
      setSummaryText("Summary generation failed. Please try again later.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Reset summary when video changes
  useEffect(() => {
    setSummaryText('');
    setIsSummaryOpen(false);
  }, [currentIdx]);

  useEffect(() => {
    // Disable body scroll when player is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const currentVideo = sortedVideos[currentIdx];

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleNext = () => {
    if (currentIdx < sortedVideos.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  if (!currentVideo) return null;
  const youtubeId = extractYoutubeId(currentVideo.youtubeUrl);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
      
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-8 lg:pl-[304px] z-10">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-600 rounded-xl text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <MonitorPlay size={20} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-red-500">Smart Classes</div>
            <h2 className="text-xl font-bold text-white leading-tight">{chapterName}</h2>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:rotate-90 hover:scale-110"
        >
          <X size={24} />
        </button>
      </div>

      <div className="w-full h-full max-w-[1600px] mx-auto flex flex-col lg:flex-row pt-24 pb-8 px-4 lg:pl-[304px] lg:pr-8 gap-8">
        
        {/* Main Video Area */}
        <div className="flex-1 rounded-[2rem] overflow-hidden bg-black border border-white/10 shadow-2xl relative group">
          <iframe
            key={youtubeId}
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title="Smart Class Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0"
          ></iframe>

          {/* AI Magic Button (Floating over video) */}
          <button 
            onClick={() => generateSummary(currentVideo.title)}
            className="absolute bottom-8 right-8 z-20 px-6 py-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-500/30 text-amber-400 font-bold flex items-center gap-2 hover:bg-slate-800/90 transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-105 group"
          >
            <Sparkles size={18} className="group-hover:animate-pulse" />
            AI Summary (Odia)
          </button>

          {/* AI Summary Side Panel */}
          <AnimatePresence>
            {isSummaryOpen && (
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-slate-950/90 backdrop-blur-2xl border-l border-white/10 p-6 z-30 flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-amber-400 font-black flex items-center gap-2 text-lg">
                    <Sparkles size={20} />
                    AI Summary
                  </h3>
                  <button onClick={() => setIsSummaryOpen(false)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-500 hover:text-red-400 transition-all shadow-lg">
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {isSummarizing ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <Loader2 size={32} className="animate-spin text-amber-500" />
                      <p className="text-sm font-bold animate-pulse">Gundulu AI is analyzing...</p>
                    </div>
                  ) : (
                    <div 
                      className="text-base leading-relaxed space-y-4 font-semibold whitespace-pre-wrap"
                      style={{ color: '#ffffff', textShadow: '0px 2px 10px rgba(0,0,0,0.8)' }}
                    >
                      {summaryText}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Playlist Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 min-h-0 h-full">
          <div className="glass-card rounded-[2rem] p-5 lg:p-6 bg-slate-900/50 border border-white/10 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Library size={18} className="text-red-500" />
                Playlist
              </h3>
              <span className="text-xs font-black bg-white/10 text-slate-300 px-3 py-1 rounded-full">
                {currentIdx + 1} / {sortedVideos.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-0">
              {sortedVideos.map((vid, idx) => {
                const isActive = idx === currentIdx;
                return (
                  <button
                    key={vid.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-full text-left p-3 rounded-2xl flex gap-4 transition-all duration-300 relative overflow-hidden group ${
                      isActive 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : 'bg-white/5 border border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeGlow"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_#ef4444]"
                      />
                    )}
                    
                    <div className="w-24 h-16 rounded-xl overflow-hidden shrink-0 relative bg-black/50 border border-white/10">
                      <img 
                        src={`https://img.youtube.com/vi/${extractYoutubeId(vid.youtubeUrl)}/mqdefault.jpg`} 
                        alt="thumbnail" 
                        className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                      />
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_15px_#ef4444]">
                            <Play size={10} className="text-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 py-1">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Part {idx + 1}
                      </div>
                      <div className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-red-400' : 'text-slate-200'}`}>
                        {vid.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            {currentIdx < sortedVideos.length - 1 && (
              <button 
                onClick={handleNext}
                className="mt-6 w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 group shrink-0"
              >
                Play Next Part
                <SkipForward size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
