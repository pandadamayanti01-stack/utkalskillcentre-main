import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { vibrate, playClickSound } from '../pwa';

interface LibraryPortalGateProps {
  language: 'en' | 'or';
  onComplete: () => void;
}

export default function LibraryPortalGate({ language, onComplete }: LibraryPortalGateProps) {
  // Auto-enter fallback after 2.5 seconds to make sure it transitions smoothly if they don't tap
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleEnterClick = () => {
    vibrate(15); // Clear tactile feedback
    playClickSound(); // Clean click audio feedback
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-[#020617] flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Glow Ambient background spot (Highly optimized blur, single div, hardware accelerated) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Welcome Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/60 border border-emerald-500/20 backdrop-blur-xl rounded-[2.5rem] p-8 text-center relative shadow-2xl space-y-6 flex flex-col items-center"
      >
        {/* Holographic Glowing Book Icon Container */}
        <div className="relative">
          {/* Subtle outer breathing ring (Pure CSS transition to save CPU threads) */}
          <div className="absolute inset-x-0 inset-y-0 -m-3 rounded-full border border-emerald-500/10 animate-pulse" />
          
          <div className="w-20 h-20 rounded-3xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative z-10">
            <BookOpen size={40} className="animate-bounce-subtle" />
          </div>
        </div>

        {/* Text Area */}
        <div className="space-y-2.5">
          {/* Subheading Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
            <Sparkles size={12} className="text-emerald-400" />
            <span>{language === 'en' ? 'Digital Library Sanctuary' : 'ଡିଜିଟାଲ୍ ପାଠାଗାର'}</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
            {language === 'en' ? 'Utkal Digital Library' : 'ଉତ୍କଳ ଡିଜିଟାଲ୍ ପାଠାଗାର'}
          </h2>
          
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
            {language === 'en' 
              ? 'Step into a world of textbooks, interactive revision notes, and personalized study planners.' 
              : 'ସମସ୍ତ ପାଠ୍ୟପୁସ୍ତକ, ଗୁଣ୍ଡୁଲୁ ଏଆଇ ନୋଟ୍ସ ଓ ଟେଷ୍ଟ ସେଟ୍ ପଢ଼ିବା ପାଇଁ ପ୍ରବେଶ କରନ୍ତୁ।'}
          </p>
        </div>

        {/* Enter Sanctuary Button */}
        <button
          onClick={handleEnterClick}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group cursor-pointer active:scale-98"
        >
          <span>{language === 'en' ? 'Enter Library' : 'ଲାଇବ୍ରେରୀରେ ପ୍ରବେଶ କରନ୍ତୁ'}</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Bottom indicator */}
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-500/40 animate-pulse">
          {language === 'en' ? 'Secure Knowledge Gate' : 'ସୁରକ୍ଷିତ ଜ୍ଞାନ ଦ୍ୱାର'}
        </p>
      </motion.div>
    </div>
  );
}
