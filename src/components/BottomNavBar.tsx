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
  const currentDay = new Date().getDate();
  const isTestWindowActive = currentDay >= 1 && currentDay <= 10 && userRole !== 'teacher';

  const navItems = [
    isTestWindowActive
      ? { id: 'monthly_tests', icon: Lucide.Home, label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା' }
      : { id: 'dashboard', icon: Lucide.Home, label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା' },
    {
      id: 'study_buddy',
      icon: Lucide.Users,
      label: language === 'en' ? 'Study Buddy' : 'AI ବନ୍ଧୁ'
    },
    {
      id: 'digital_library',
      icon: Lucide.Grid,
      label: language === 'en' ? 'Library' : 'ଲାଇବ୍ରେରୀ',
      isCenter: true
    },
    {
      id: 'smart_classes',
      icon: Lucide.MonitorPlay,
      label: language === 'en' ? 'Smart Class' : 'ସ୍ମାର୍ଟ କ୍ଲାସ୍'
    },
    {
      id: 'menu',
      icon: Lucide.User,
      label: language === 'en' ? 'Profile' : 'ପ୍ରୋଫାଇଲ୍'
    }
  ];

  const handleTabClick = (tabId: string) => {
    vibrate(12);
    playClickSound();
    
    if (tabId === 'menu') {
      setSidebarOpen(!isSidebarOpen);
    } else {
      setActiveTab(tabId);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
      
      {/* Edge-to-Edge Navigation Bar Background */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pointer-events-auto flex items-center justify-between px-2">
        
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = 
            (activeTab === item.id) || 
            (item.id === 'menu' && isSidebarOpen) ||
            (item.id === 'monthly_tests' && activeTab === 'dashboard' && isTestWindowActive) ||
            (item.id === 'dashboard' && activeTab === 'monthly_tests' && !isTestWindowActive);
          
          if (item.isCenter) {
            return (
              <div key={item.id} className="relative flex-1 flex justify-center pointer-events-auto h-full">
                <button
                  onClick={() => handleTabClick(item.id)}
                  className="absolute -top-6 flex flex-col items-center justify-center transition-transform active:scale-95 hover:scale-105 group"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-[#1A8055] flex items-center justify-center shadow-lg shadow-emerald-500/30 border-4 border-white group-hover:shadow-emerald-500/50 transition-all duration-300">
                    <Icon size={24} color="white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-black text-[#1A8055] mt-1 tracking-wide">
                    {item.label}
                  </span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className="relative flex-1 flex flex-col items-center justify-center h-full pointer-events-auto active:scale-95 transition-all duration-200"
            >
              <div className={`flex flex-col items-center justify-center transition-all duration-300 ${isActive ? '-translate-y-0.5' : ''}`}>
                
                {/* Premium Active Pill Background */}
                <div className={`relative flex items-center justify-center transition-all duration-300 ${
                  isActive ? 'bg-[#1A8055]/10 px-4 py-1 rounded-2xl' : 'px-4 py-1'
                }`}>
                  <Icon 
                    size={20} 
                    className={`transition-colors duration-300 ${isActive ? 'text-[#1A8055]' : 'text-slate-400 group-hover:text-slate-500'}`} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                  
                  {/* Notification Badge */}
                  {item.id === 'smart_classes' && unreadNotificationsCount > 0 && (
                    <span className="absolute top-0 right-1 flex items-center justify-center px-1 py-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-[8px] font-black text-white shadow-[0_2px_4px_rgba(239,68,68,0.4)]">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </div>

                <span className={`text-[9px] font-bold tracking-wide transition-colors duration-300 mt-0.5 ${
                  isActive ? 'text-[#1A8055]' : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
