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
  return (
    <motion.button 
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        active 
          ? premium 
            ? 'bg-gradient-to-r from-amber-600/20 to-orange-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : premium
            ? 'text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/5 hover:border hover:border-amber-500/10'
            : 'text-slate-400 hover:bg-white/5'
      } ${className || ''}`}
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="font-medium tracking-wide">{label}</span>
      </div>
      {badge && <div>{badge}</div>}
    </motion.button>
  );
}
