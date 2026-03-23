import React from 'react';
import { motion } from 'motion/react';

interface SidebarItemProps {
  id?: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed?: boolean;
  badge?: string | number;
  className?: string;
}

export function SidebarItem({ id, icon: Icon, label, active, onClick, collapsed = false, badge, className = '' }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group ${
        active 
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      } ${className}`}
    >
      <div className="relative">
        <Icon size={24} className={active ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
        {badge && (
          <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950 px-1">
            {badge}
          </div>
        )}
      </div>
      
      {!collapsed && (
        <span className="font-bold text-sm uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
      )}

      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute left-0 w-1 h-8 bg-white rounded-full"
        />
      )}

      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10 shadow-2xl">
          {label}
        </div>
      )}
    </button>
  );
}
