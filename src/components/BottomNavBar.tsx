import React from 'react';
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
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  language,
  activeTab,
  setActiveTab,
  setSidebarOpen,
  isSidebarOpen,
  unreadNotificationsCount = 0
}) => {
  const t = translations[language];

  const currentDay = new Date().getDate();
  const isTestWindowActive = currentDay >= 1 && currentDay <= 10;

  const navItems = [
    isTestWindowActive
      ? {
          id: 'monthly_tests',
          icon: Lucide.ClipboardCheck,
          label: language === 'en' ? 'Monthly Test' : 'ମାସିକ ଟେଷ୍ଟ'
        }
      : {
          id: 'dashboard',
          icon: Lucide.LayoutDashboard,
          label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା'
        },
    {
      id: 'study_buddy',
      icon: Lucide.Bot,
      label: language === 'en' ? 'Study Buddy' : 'AI ବନ୍ଧୁ'
    },
    {
      id: 'daily_mcqs',
      icon: Lucide.ListChecks,
      label: language === 'en' ? 'Daily MCQ' : 'ଦୈନିକ MCQ'
    },
    {
      id: 'notifications',
      icon: Lucide.Bell,
      label: language === 'en' ? 'Alerts' : 'ବିଜ୍ଞପ୍ତି',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    }
  ];

  const handleTabClick = (tabId: string) => {
    vibrate(12); // Tactile micro-vibration
    playClickSound(); // Clean click audio feedback
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  const handleMenuClick = () => {
    vibrate(15); // Distinct vibration pulse
    playClickSound(); // Distinct sound click
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden px-4 pb-4 pt-1 pointer-events-none">
      {/* Dynamic ambient color glow behind the floating bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent -z-10 pointer-events-none h-28 translate-y-4" />
      
      {/* Floating container with enhanced borders and ambient back-glow */}
      <div className="mx-auto max-w-md w-full bg-[#011e1a]/95 border border-emerald-500/30 backdrop-blur-2xl rounded-[2rem] p-2.5 flex items-center justify-between shadow-[0_-12px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.1)] pointer-events-auto transition-all duration-300">
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || 
            (item.id === 'monthly_tests' && activeTab === 'dashboard' && isTestWindowActive) ||
            (item.id === 'dashboard' && activeTab === 'monthly_tests' && !isTestWindowActive);
          
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className="relative flex-1 py-1 flex flex-col items-center justify-center transition-all duration-300"
            >
              {/* Premium top active indicator dot - Emerald Glowing Halo */}
              {isActive && (
                <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
              )}
              
              <div 
                className={`relative flex items-center justify-center p-2 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/20 scale-108 -translate-y-1' 
                    : 'text-slate-400/80 active:scale-95 hover:text-white/90'
                }`}
              >
                <Icon size={20} className={isActive ? 'animate-bounce-subtle' : ''} />
                
                {item.badge !== undefined && (
                  <span className={`absolute -top-1 -right-2 flex items-center justify-center font-black text-white border border-[#011e1a] ${
                    String(item.badge) === "NEW"
                      ? "px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-[7px] text-black shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse"
                      : "h-4.5 w-4.5 rounded-full bg-red-500 text-[8px] shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span 
                className={`text-[8.5px] uppercase tracking-widest mt-1.5 transition-all duration-300 ${
                  isActive ? 'text-emerald-400 font-black scale-102 opacity-100' : 'text-slate-400/60 font-bold opacity-80'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu Toggle Button - Sleek Accent Switch */}
        <button
          onClick={handleMenuClick}
          className="relative flex-1 py-1 flex flex-col items-center justify-center transition-all duration-300"
        >
          {isSidebarOpen && (
            <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
          )}
          
          <div 
            className={`flex items-center justify-center p-2 rounded-2xl transition-all duration-300 ${
              isSidebarOpen 
                ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400/20 scale-108 -translate-y-1' 
                : 'text-slate-400/80 active:scale-95 hover:text-white/90'
            }`}
          >
            <Lucide.Menu size={20} />
          </div>
          <span 
            className={`text-[8.5px] uppercase tracking-widest mt-1.5 transition-all duration-300 ${
              isSidebarOpen ? 'text-emerald-400 font-black scale-102 opacity-100' : 'text-slate-400/60 font-bold opacity-80'
            }`}
          >
            {language === 'en' ? 'More' : 'ଅଧିକ'}
          </span>
        </button>
      </div>
    </div>
  );
};
