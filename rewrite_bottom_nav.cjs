const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/BottomNavBar.tsx');

const newContent = `import React from 'react';
import * as Lucide from 'lucide-react';
import { vibrate, playClickSound } from '../pwa';
import { translations } from '../translations';

interface BottomNavBarProps {
  language: 'en' | 'or';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSidebarOpen: (val: boolean) => void;
  isSidebarOpen: boolean;
  unreadNotificationsCount?: number;
  userRole?: string;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  language,
  activeTab,
  setActiveTab,
  setSidebarOpen,
  isSidebarOpen,
  unreadNotificationsCount = 0,
  userRole
}) => {
  const t = translations[language];

  const handleTabClick = (tabId: string) => {
    vibrate(12);
    playClickSound();
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white px-6 pb-2 pt-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pointer-events-auto border-t border-slate-100 relative rounded-t-3xl">
        
        {/* Left Icons */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className="flex flex-col items-center gap-1 min-w-[3.5rem]"
        >
          <Lucide.Home size={22} className={activeTab === 'dashboard' ? 'text-blue-600 fill-blue-600' : 'text-slate-400'} />
          <span className={\`text-[10px] font-bold \${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}\`}>Home</span>
        </button>

        <button
          onClick={() => handleTabClick('digital_library')}
          className="flex flex-col items-center gap-1 min-w-[3.5rem]"
        >
          <Lucide.Compass size={22} className={activeTab === 'digital_library' ? 'text-blue-600' : 'text-slate-400'} />
          <span className={\`text-[10px] font-bold \${activeTab === 'digital_library' ? 'text-blue-600' : 'text-slate-400'}\`}>Boosts</span>
        </button>

        {/* Center Prominent FAB */}
        <div className="relative -top-8 shrink-0">
          <button 
            onClick={() => handleTabClick('study_buddy')}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 shadow-[0_8px_20px_rgba(37,99,235,0.4)] flex items-center justify-center transform hover:scale-105 transition-transform border-4 border-white"
          >
            <Lucide.Sparkles size={26} className="text-white" fill="white" />
          </button>
        </div>

        {/* Right Icons */}
        <button
          onClick={() => handleTabClick('notifications')}
          className="flex flex-col items-center gap-1 min-w-[3.5rem] relative"
        >
          <div className="relative">
            <Lucide.Bell size={22} className={activeTab === 'notifications' ? 'text-blue-600' : 'text-slate-400'} />
            <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">9+</span>
          </div>
          <span className={\`text-[10px] font-bold \${activeTab === 'notifications' ? 'text-blue-600' : 'text-slate-400'}\`}>Notifications</span>
        </button>

        <button
          onClick={() => handleTabClick('profile')}
          className="flex flex-col items-center gap-1 min-w-[3.5rem]"
        >
          <Lucide.User size={22} className={activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'} />
          <span className={\`text-[10px] font-bold \${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400'}\`}>Profile</span>
        </button>
      </div>
    </div>
  );
};
`;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully updated BottomNavBar.tsx!');
