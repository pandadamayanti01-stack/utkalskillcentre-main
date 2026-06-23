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
  userName?: string;
  userClass?: string;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  language,
  activeTab,
  setActiveTab,
  setSidebarOpen,
  isSidebarOpen,
  unreadNotificationsCount = 0,
  userRole,
  userName,
  userClass
}) => {
  const checkIfTestWindowActive = () => {
    if (userRole === 'teacher') return false;
    
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Check if there is a Sunday between the 5th and 10th of the current month
    let hasSunday = false;
    for (let d = 5; d <= 10; d++) {
      const dateToCheck = new Date(currentYear, currentMonth, d);
      if (dateToCheck.getDay() === 0) { // 0 = Sunday
        hasSunday = true;
        break;
      }
    }
    
    const endDay = hasSunday ? 11 : 10;
    return currentDay >= 5 && currentDay <= endDay;
  };

  const isTestWindowActive = checkIfTestWindowActive();

  const navItems = userRole === 'teacher'
    ? [
        { id: 'dashboard', icon: Lucide.Home, label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା' },
        { id: 'study_buddy', icon: Lucide.MessageSquare, label: language === 'en' ? 'Gundulu Inst' : 'ଗୁନ୍ଦୁଲୁ ଇନ୍‌ଷ୍ଟ୍ର' },
        { id: 'digital_library', icon: Lucide.Grid, label: language === 'en' ? 'Library' : 'ଲାଇବ୍ରେରୀ', isCenter: true },
        { id: 'community', icon: Lucide.MessagesSquare, label: language === 'en' ? 'Sikhyaka Sathi' : 'ଶିକ୍ଷକ ସାଥୀ' },
        { id: 'menu', icon: Lucide.User, label: language === 'en' ? 'Profile' : 'ପ୍ରୋଫାଇଲ୍' }
      ]
    : userClass === 'sishuvatika(Anganwadi)'
    ? [
        { id: 'dashboard', icon: Lucide.Home, label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା' },
        { id: 'gundulu', icon: Lucide.Mic, label: language === 'en' ? 'Gundulu AI' : 'ଗୁନ୍ଦୁଲୁ AI' },
        { id: 'digital_library', icon: Lucide.Grid, label: language === 'en' ? 'Library' : 'ଲାଇବ୍ରେରୀ', isCenter: true },
        { id: 'parent_dashboard', icon: Lucide.Users, label: language === 'en' ? 'Parent' : 'ପିତାମାତା' },
        { id: 'menu', icon: Lucide.User, label: language === 'en' ? 'Profile' : 'ପ୍ରୋଫାଇଲ୍' }
      ]
    : [
        isTestWindowActive
          ? { id: 'monthly_tests', icon: Lucide.Home, label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା' }
          : { id: 'dashboard', icon: Lucide.Home, label: language === 'en' ? 'Home' : 'ମୂଳ ପୃଷ୍ଠା' },
        { id: 'study_buddy', icon: Lucide.MessageSquare, label: language === 'en' ? 'Gundulu Helper' : 'ଗୁନ୍ଦୁଲୁ ହେଲ୍ପର' },
        { id: 'digital_library', icon: Lucide.Grid, label: language === 'en' ? 'Library' : 'ଲାଇବ୍ରେରୀ', isCenter: true },
        { id: 'community', icon: Lucide.MessagesSquare, label: language === 'en' ? 'Mo Sanga' : 'ମୋ ସାଙ୍ଗ' },
        { id: 'menu', icon: Lucide.User, label: language === 'en' ? 'Profile' : 'ପ୍ରୋଫାଇଲ୍' }
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
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-none pb-[calc(12px+env(safe-area-inset-bottom))] px-4">
      
      {/* Floating Island Navigation Bar Background */}
      <div className="relative w-full h-16 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl border border-emerald-500/25 dark:border-emerald-500/15 shadow-[0_10px_35px_rgba(0,0,0,0.15),0_0_20px_rgba(16,185,129,0.08)] pointer-events-auto flex items-center justify-between px-2 rounded-2xl">
        
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = 
            (activeTab === item.id) || 
            (item.id === 'menu' && isSidebarOpen) ||
            (item.id === 'monthly_tests' && activeTab === 'dashboard' && isTestWindowActive) ||
            (item.id === 'dashboard' && activeTab === 'monthly_tests' && !isTestWindowActive);
          
          const isProfile = item.id === 'menu';

          if (item.isCenter) {
            return (
              <div key={item.id} className="relative flex-1 flex justify-center pointer-events-auto h-full">
                <button
                  onClick={() => handleTabClick(item.id)}
                  className="absolute -top-5.5 flex flex-col items-center justify-center transition-transform active:scale-95 hover:scale-105 group"
                >
                  <div className="w-13 h-13 rounded-full bg-gradient-to-br from-emerald-400 to-[#1A8055] flex items-center justify-center shadow-lg shadow-emerald-500/40 dark:shadow-emerald-500/50 border-4 border-white dark:border-slate-950 group-hover:shadow-emerald-500/60 transition-all duration-300 relative">
                    {/* Pulsing glow ring inside center button */}
                    <span className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-75 pointer-events-none" />
                    <Icon size={22} color="white" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-black text-[#1A8055] dark:text-[#34d399] mt-1 tracking-wide">
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
                
                {/* Premium Active Pill Background with soft border & glow */}
                <div className={`relative flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? isProfile
                      ? 'bg-gradient-to-r from-amber-500/10 to-[#b34d1f]/10 px-3 py-1 rounded-2xl border border-amber-500/25 shadow-[0_2px_12px_rgba(217,119,6,0.15)]'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/15 px-3 py-1 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/25 shadow-[0_2px_10px_rgba(16,185,129,0.1)]' 
                    : 'px-3 py-1 border border-transparent'
                }`}>
                  {isProfile ? (
                    /* High-End Eye-Catching Avatar instead of generic user icon */
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                      isActive 
                        ? 'bg-gradient-to-br from-[#b34d1f] to-amber-500 text-white ring-2 ring-amber-500/50 ring-offset-1 dark:ring-offset-slate-950 animate-pulse shadow-md'
                        : 'bg-[#b34d1f]/10 text-[#b34d1f] dark:text-amber-400 border border-[#b34d1f]/25 shadow-sm'
                    }`}>
                      {userName?.charAt(0).toUpperCase() || (userRole === 'teacher' ? 'E' : 'S')}
                    </div>
                  ) : (
                    <Icon 
                      size={18} 
                      className={`transition-colors duration-300 ${isActive ? 'text-[#1A8055] dark:text-[#34d399]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`} 
                      strokeWidth={isActive ? 2.5 : 2} 
                    />
                  )}
                  
                  {/* Notification Badge */}
                  {item.id === 'menu' && unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center px-1 py-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-[8px] font-black text-white shadow-[0_2px_4px_rgba(239,68,68,0.4)]">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </div>

                <span className={`text-[9px] font-black tracking-wide transition-colors duration-300 mt-1 ${
                  isActive 
                    ? isProfile
                      ? 'text-[#b34d1f] dark:text-amber-400'
                      : 'text-[#1A8055] dark:text-[#34d399]' 
                    : 'text-slate-400 dark:text-slate-500'
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
