import React from 'react';
import { motion } from 'motion/react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
  premium?: boolean;
  badge?: React.ReactNode;
}

export function SidebarItem({ icon, label, active, onClick, className, premium, badge }: SidebarItemProps) {
  const isTextColorOverridden = className?.includes('text-');

  return (
    <motion.button 
      whileHover={{ scale: 1.015, x: 3 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
        active 
          ? premium 
            ? 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 text-amber-400 border border-amber-500/30 shadow-md'
            : isTextColorOverridden
              ? ''
              : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20' 
          : premium
            ? 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/5'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
      } ${className || ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 scale-90 opacity-90">{icon}</div>
        <span className="text-[13px] font-bold tracking-wide text-left">{label}</span>
      </div>
      {badge && <div className="flex-shrink-0 scale-90">{badge}</div>}
    </motion.button>
  );
}
