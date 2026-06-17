import React from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../translations';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  language: 'en' | 'or';
  setLanguage: (lang: 'en' | 'or') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  user: any;
  isAdminView: boolean;
  setIsAdminView: (val: boolean) => void;
  handleLogout: () => void;
  isRegisteredForTestSeries: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  language,
  setLanguage,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setSidebarOpen,
  user,
  isAdminView,
  setIsAdminView,
  handleLogout,
  isRegisteredForTestSeries
}) => {
  const t = translations[language];

  const showShowcaseTab = typeof window !== 'undefined' && (() => {
    const isShowcaseActive = window.location.search.includes('showcase=true') || 
                             window.location.search.includes('judge=true') || 
                             window.location.search.includes('judgestatus=true') || 
                             window.location.hash.includes('judge') ||
                             window.location.hash === '#pitch_deck' ||
                             localStorage.getItem('showcase_mode') === 'true';
    if (isShowcaseActive) {
      localStorage.setItem('showcase_mode', 'true');
    }
    return isShowcaseActive;
  })();

  const allMenuItems = [
    { id: 'profile', icon: Lucide.User, label: 'Profile' },
    { id: 'dashboard', icon: Lucide.LayoutDashboard, label: user?.role === 'teacher' ? (language === 'en' ? 'Educator Studio' : 'ଶିକ୍ଷକ ଷ୍ଟୁଡିଓ') : t.dashboard },
    { id: 'pitch_deck', icon: Lucide.Presentation, label: language === 'en' ? '✨ Project Showcase' : '✨ ପ୍ରୋଜେକ୍ଟ ସ୍ଲାଇଡ୍' },
    { id: 'telemetry', icon: Lucide.Activity, label: language === 'en' ? '📊 System Telemetry' : '📊 ସିଷ୍ଟମ ଟେଲିମେଟ୍ରି' },
    { id: 'notifications', icon: Lucide.Bell, label: language === 'en' ? 'Notifications' : 'ବିଜ୍ଞପ୍ତି' },
    { id: 'study_buddy', icon: Lucide.MessageSquare, label: user?.role === 'teacher' ? (language === 'en' ? 'Gundulu Instructor' : 'ଗୁନ୍ଦୁଲୁ ଇନଷ୍ଟ୍ରକ୍ଟର') : t.studyBuddy },
    { id: 'gundulu', icon: Lucide.Mic, label: language === 'en' ? 'Gundulu AI Tutor' : 'ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର' },
    { id: 'digital_library', icon: Lucide.Library, label: language === 'en' ? 'Digital Library' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ' },
    { id: '3d_study', icon: Lucide.Box, label: language === 'en' ? 'Gundulu 3D Lab' : 'ଗୁନ୍ଦୁଲୁ ୩D ଲ୍ୟାବ୍' },
    { id: 'textbooks', icon: Lucide.Book, label: language === 'en' ? 'Textbooks' : 'ପାଠ୍ୟପୁସ୍ତକ' },
    { id: 'smart_classes', icon: Lucide.Youtube, label: language === 'en' ? 'Smart Classes' : 'ସ୍ମାର୍ଟ କ୍ଲାସ' },
    { id: 'community', icon: Lucide.MessagesSquare, label: language === 'en' ? 'Community' : 'କମ୍ୟୁନିଟି' },
    { id: 'monthly_tests', icon: Lucide.Calendar, label: t.monthlyTests },
    { id: 'syllabus_tracker', icon: Lucide.ListChecks, label: language === 'en' ? 'Syllabus Tracker' : 'ପାଠ୍ୟକ୍ରମ ଟ୍ରାକର୍' },
    { id: 'daily_mcqs', icon: Lucide.ListChecks, label: language === 'en' ? 'Gundulu Daily Challenge' : 'ଗୁନ୍ଦୁଲୁ ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ' },
    { id: 'game_zone', icon: Lucide.Gamepad2, label: language === 'en' ? 'Gundulu Game Zone' : 'ଗୁନ୍ଦୁଲୁ ଗେମ୍ ଜୋନ୍' },
    { id: 'leaderboard', icon: Lucide.Trophy, label: t.leaderboard },
    { id: 'store', icon: Lucide.ShoppingBag, label: language === 'en' ? 'Avatar Store' : 'ଅବତାର ଷ୍ଟୋର' },
    { id: 'plans', icon: Lucide.CreditCard, label: language === 'en' ? 'Subscription' : 'ସବସ୍କ୍ରିପସନ୍' },
    { id: 'parent_dashboard', icon: Lucide.Users, label: language === 'en' ? 'Parent Insights' : 'ପିତାମାତା ଇନସାଇଟ୍ସ', premium: true, badge: <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider">PRO</span> },
    { id: 'support', icon: Lucide.HelpCircle, label: t.support.title },
    { id: 'about_us', icon: Lucide.Info, label: language === 'en' ? 'About Us' : 'ଆମ ବିଷୟରେ' },
  ];

  const filteredMenuItems = showShowcaseTab 
    ? allMenuItems 
    : allMenuItems.filter(item => item.id !== 'pitch_deck' && item.id !== 'telemetry');

  const teacherExcludedIds = ['store', 'leaderboard', 'daily_mcqs', 'syllabus_tracker', 'monthly_tests', 'smart_classes', 'matching_quiz', 'parent_dashboard', 'gundulu'];
  let menuItems = filteredMenuItems;
  if (user?.role === 'teacher') {
    menuItems = filteredMenuItems.filter(item => !teacherExcludedIds.includes(item.id));
  } else if (user?.class === 'sishuvatika(Anganwadi)') {
    const sishuvatikaAllowedIds = ['profile', 'dashboard', 'gundulu', 'digital_library', 'plans', 'parent_dashboard', 'support'];
    menuItems = filteredMenuItems.filter(item => sishuvatikaAllowedIds.includes(item.id));
  }



  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 w-72 sidebar-gradient z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-5">
          {/* BRANDING SECTION */}
          <div className="p-1 flex flex-col gap-4 mb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {/* Chariot/Rath Crest */}
                <div className="relative h-10 w-10 rounded-full overflow-hidden border border-emerald-500/20 bg-slate-900/10 p-1 flex items-center justify-center shadow-sm flex-shrink-0">
                  <img 
                    src="/gundulu-rath-crest.png" 
                    alt="Gundulu" 
                    className="h-full w-full object-cover scale-[1.2] filter saturate-[1.1]" 
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#b34d1f] dark:text-[#ffd700] font-black text-base leading-none">ଏଆଇ-AI</span>
                  <span className="text-[8px] font-black text-slate-400 dark:text-white/40 tracking-wider uppercase mt-0.5">GUNDULU ERA</span>
                </div>
              </div>

              {/* High-Contrast Premium Language Switcher */}
              <div className="flex gap-0.5 bg-slate-100 dark:bg-black/40 p-0.5 rounded-lg border border-slate-200 dark:border-white/5 flex-shrink-0">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${language === 'en' ? 'bg-[#b34d1f] text-white shadow-sm' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('or')}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${language === 'or' ? 'bg-[#b34d1f] text-white shadow-sm' : 'text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70'}`}
                >
                  ଓଡ଼ିଆ
                </button>
              </div>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide pt-2">
            {(() => {
              const menuGroups = [
                {
                  titleEn: 'Academics',
                  titleOr: 'ଶିକ୍ଷା',
                  items: menuItems.filter(item => ['profile', 'dashboard', 'digital_library', 'textbooks', 'smart_classes', 'syllabus_tracker', 'community'].includes(item.id))
                },
                {
                  titleEn: 'Challenge Arena 🏆',
                  titleOr: 'ଚ୍ୟାଲେଞ୍ଜ ଆରେନା 🏆',
                  items: menuItems.filter(item => ['monthly_tests', 'daily_mcqs', 'game_zone', 'leaderboard', 'store'].includes(item.id))
                },
                {
                  titleEn: 'AI & Tools',
                  titleOr: 'AI ସହାୟକ',
                  items: menuItems.filter(item => ['3d_study', 'study_buddy', 'gundulu', 'pitch_deck', 'telemetry'].includes(item.id))
                },
                {
                  titleEn: 'Account & Help',
                  titleOr: 'ଖାତା ଓ ସାହାଯ୍ୟ',
                  items: menuItems.filter(item => ['notifications', 'plans', 'parent_dashboard', 'support', 'about_us'].includes(item.id))
                }
              ].filter(group => group.items.length > 0);

              return menuGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <div className="text-[9px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest px-3.5 mb-1.5 block">
                    {language === 'en' ? group.titleEn : group.titleOr}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <SidebarItem
                          key={item.id}
                          icon={<Icon size={18} />}
                          label={item.label}
                          active={isActive}
                          premium={item.premium}
                          badge={item.badge}
                          className={isActive && !item.premium ? 'bg-gradient-to-r from-[#b34d1f] to-[#d97706] text-white shadow-md border border-amber-500/25 font-black' : ''}
                          onClick={() => {
                            setActiveTab(item.id);
                            setSidebarOpen(false);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {user?.role === 'admin' && (
              <div className="pt-4 mt-4 border-t border-white/5">
                <SidebarItem
                  icon={<Lucide.Lock size={18} />}
                  label={t.admin}
                  active={isAdminView}
                  onClick={() => {
                    setIsAdminView(true);
                    setSidebarOpen(false);
                  }}
                  className={`${isAdminView ? 'text-[#ffd700]' : 'text-amber-500/60'}`}
                />
              </div>
            )}
          </nav>

          {/* USER INFO & LOGOUT: Combined into high-density card */}
          <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/5">
            <div 
              onClick={() => {
                setActiveTab('profile');
                setSidebarOpen(false);
              }}
              className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-[#b34d1f]/10 dark:from-amber-500/5 dark:to-[#b34d1f]/5 border border-amber-500/25 dark:border-amber-500/15 shadow-md space-y-3 cursor-pointer hover:from-amber-500/15 hover:to-[#b34d1f]/15 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#b34d1f]/10 flex items-center justify-center text-[#b34d1f] dark:text-[#ffd700] font-black border border-[#b34d1f]/25 shadow-sm text-xs group-hover:scale-105 transition-transform">
                  {user?.role === 'teacher' ? 'E' : (user?.name?.charAt(0) || 'S')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-white truncate group-hover:text-[#b34d1f] dark:group-hover:text-amber-400 transition-colors">
                    {user?.role === 'teacher' && user?.name === 'Student' ? 'Educator' : (user?.name || 'Student')}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    {user?.role === 'teacher' ? 'Educator Mode' : (user?.class ? (t.classes[user.class] || user.class) : 'Odisha Board')}
                  </p>
                  <div className="flex items-center gap-1 text-[8.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-1">
                    <span>{language === 'en' ? 'Edit Profile' : 'ପ୍ରୋଫାଇଲ୍ ସଂଶୋଧନ'}</span>
                    <Lucide.ArrowRight size={9} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              <div 
                className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-white/5" 
                onClick={(e) => e.stopPropagation()}
              >
                {user?.role !== 'teacher' && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-[11px] font-black text-[#b34d1f] hover:text-[#b34d1f]/85 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                  >
                    <Lucide.Users size={12} />
                    <span>{language === 'en' ? 'Switch Sibling' : 'ସିବ୍ଲିଙ୍ଗ୍ ବଦଳାନ୍ତୁ'}</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-[11px] font-black text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors ml-auto animate-pulse-slow"
                >
                  <Lucide.LogOut size={12} />
                  <span>{t.logout}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};