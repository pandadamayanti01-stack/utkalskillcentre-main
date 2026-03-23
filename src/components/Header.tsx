import React from 'react';
import { 
  Menu, 
  Globe,
  Flame,
  Trophy,
  Zap,
  Target,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { translations } from '../translations';

interface HeaderProps {
  language: 'en' | 'or';
  setLanguage: (lang: 'en' | 'or') => void;
  setSidebarOpen: (val: boolean) => void;
  user: any;
  isPremium: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  setSidebarOpen,
  user,
  isPremium
}) => {
  const t = translations[language];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
          <Globe size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{user?.board ? t.boards[user.board] : 'Odisha Board'}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
          <Flame size={18} className="fill-current" />
          <span className="text-sm font-black">{user?.streak || 0}</span>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
          <Trophy size={18} className="fill-current" />
          <span className="text-sm font-black">{user?.points || 0}</span>
        </div>

        <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>

        <button 
          onClick={() => setLanguage(language === 'en' ? 'or' : 'en')}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white transition-all text-sm font-bold"
        >
          <Globe size={16} className="text-blue-400" />
          {language === 'en' ? 'ଓଡ଼ିଆ' : 'English'}
        </button>

        {isPremium && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles size={16} className="fill-current" />
            <span className="text-xs font-black uppercase tracking-widest">AI Pro</span>
          </div>
        )}
      </div>
    </header>
  );
};
