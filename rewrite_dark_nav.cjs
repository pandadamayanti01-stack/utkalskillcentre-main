const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/BottomNavBar.tsx');

const newContent = `import React from 'react';
import * as Lucide from 'lucide-react';
import { vibrate, playClickSound } from '../pwa';
import { translations } from '../translations';
import { motion } from 'motion/react';

interface BottomNavBarProps {
  language: 'en' | 'or';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (val: boolean) => void;
  isSidebarOpen: boolean;
  unreadNotificationsCount?: number;
  userRole?: string;
  user?: any;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  language,
  activeTab,
  setActiveTab,
  setSidebarOpen,
  isSidebarOpen,
  unreadNotificationsCount = 0,
  userRole,
  user
}) => {
  const t = translations[language];

  const currentDay = new Date().getDate();
  const isTestWindowActive = currentDay >= 1 && currentDay <= 10 && userRole !== 'teacher';

  const navItems = [
    isTestWindowActive
      ? { id: 'monthly_tests', icon: Lucide.ClipboardCheck, label: language === 'en' ? 'Tests' : 'ଟେଷ୍ଟ' }
      : { id: 'dashboard', icon: Lucide.Flame, label: language === 'en' ? 'Dashboard' : 'ଡ୍ୟାସବୋର୍ଡ' },
    { id: 'digital_library', icon: Lucide.BookOpen, label: language === 'en' ? 'Courses' : 'କୋର୍ସଗୁଡିକ' },
    { id: 'profile', icon: Lucide.User, label: language === 'en' ? 'Profile' : 'ପ୍ରୋଫାଇଲ୍', isCenter: true },
    { id: 'leaderboard', icon: Lucide.Trophy, label: language === 'en' ? 'Leaderboard' : 'ଲିଡରବୋର୍ଡ' },
    { id: 'store', icon: Lucide.ShoppingCart, label: language === 'en' ? 'Store' : 'ଷ୍ଟୋର୍' }
  ];

  const handleTabClick = (tabId: string) => {
    vibrate(12);
    playClickSound();
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)] bg-[#070b14]">
      {/* Top Border Line */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-indigo-900/40"></div>

      <div className="h-20 w-full flex items-center justify-between px-2 relative pointer-events-auto">
        
        {navItems.map((item, index) => {
          const isActive = activeTab === item.id || 
            (item.id === 'monthly_tests' && activeTab === 'dashboard' && isTestWindowActive) ||
            (item.id === 'dashboard' && activeTab === 'monthly_tests' && !isTestWindowActive);

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center -translate-y-6"
              >
                {/* Center Profile Avatar raised out of the bar */}
                <div className="relative w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center p-1 shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                   <div className="absolute inset-0 rounded-full border-[3px] border-cyan-400"></div>
                   <div className="w-full h-full rounded-full bg-gradient-to-b from-indigo-500 to-purple-600 overflow-hidden flex items-center justify-center border-2 border-[#070b14]">
                     {user?.photoURL ? (
                       <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                     ) : (
                       <Lucide.User size={24} className="text-white" />
                     )}
                   </div>
                </div>
                <span className={\`text-[10px] mt-1.5 font-bold transition-colors \${isActive ? 'text-indigo-300' : 'text-slate-400'}\`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className="relative flex-1 h-full flex flex-col items-center justify-center transition-all group"
            >
              {/* Active Top Glow Line */}
              {isActive && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute top-0 w-3/5 h-[3px] rounded-b-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 shadow-[0_2px_15px_rgba(99,102,241,0.8)]"
                />
              )}
              
              <div className="relative mb-1">
                <item.icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 1.5}
                  className={\`transition-all duration-300 \${
                    isActive 
                      ? 'text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]' 
                      : 'text-slate-400/80 group-hover:text-slate-300'
                  }\`}
                />
              </div>

              <span 
                className={\`text-[9px] uppercase tracking-wider transition-all duration-300 \${
                  isActive ? 'text-slate-200 font-bold' : 'text-slate-500 font-medium'
                }\`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully applied dark neon bottom nav layout!');
