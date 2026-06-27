import React, { useState } from 'react';
import * as Lucide from 'lucide-react';
import { SocialPosterGenerator } from './SocialPosterGenerator';
import { WinnersPosterGenerator } from './WinnersPosterGenerator';

interface PosterGeneratorHubProps {
  chapters: any[];
  onBack: () => void;
}

export function PosterGeneratorHub({ chapters, onBack }: PosterGeneratorHubProps) {
  const [subMode, setSubMode] = useState<'select' | 'worksheet' | 'winners'>('select');

  if (subMode === 'worksheet') {
    return <SocialPosterGenerator chapters={chapters} onBack={() => setSubMode('select')} />;
  }
  if (subMode === 'winners') {
    return <WinnersPosterGenerator onBack={() => setSubMode('select')} />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3 pb-6 border-b border-white/5">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <Lucide.ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Social Posters Hub</h1>
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">ସୋସିଆଲ ପୋଷ୍ଟର ହବ୍</p>
        </div>
      </div>

      {/* Grid options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-8">
        <div 
          onClick={() => setSubMode('worksheet')}
          className="p-8 bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-emerald-500/30 rounded-3xl cursor-pointer transition-all duration-300 group flex flex-col items-center text-center space-y-4 shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Lucide.BookOpen size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white uppercase">Worksheet Creator</h3>
            <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">ପ୍ରଶ୍ନୋତ୍ତର ପତ୍ରିକା ପୋଷ୍ଟର</p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Generate and design revision question sheets and curriculum outlines with custom chalkboard paper, blueprints, and AI illustration graphics.
          </p>
        </div>

        <div 
          onClick={() => setSubMode('winners')}
          className="p-8 bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-amber-500/30 rounded-3xl cursor-pointer transition-all duration-300 group flex flex-col items-center text-center space-y-4 shadow-xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Lucide.Trophy size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white uppercase">Test Winners Creator</h3>
            <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">ଟେଷ୍ଟ ବିଜେତା ସାରଣୀ ପୋଷ୍ଟର</p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Create premium leaderboard posters for your monthly test series with medal badges, transparent logo integrations, and mascot scaling.
          </p>
        </div>
      </div>
    </div>
  );
}
