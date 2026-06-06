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
    { id: 'textbooks', icon: Lucide.Book, label: language === 'en' ? 'Textbooks' : 'ପାଠ୍ୟପୁସ୍ତକ' },
    { id: 'smart_classes', icon: Lucide.Youtube, label: language === 'en' ? 'Smart Classes' : 'ସ୍ମାର୍ଟ କ୍ଲାସ' },
    { id: 'monthly_tests', icon: Lucide.Calendar, label: t.monthlyTests },
    { id: 'syllabus_tracker', icon: Lucide.ListChecks, label: language === 'en' ? 'Syllabus Tracker' : 'ପାଠ୍ୟକ୍ରମ ଟ୍ରାକର୍' },
    { id: 'daily_mcqs', icon: Lucide.ListChecks, label: language === 'en' ? 'Gundulu Daily Challenge' : 'ଗୁନ୍ଦୁଲୁ ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ' },
    { id: 'matching_quiz', icon: Lucide.Shuffle, label: language === 'en' ? 'Gundulu Matching Game' : 'ଗୁନ୍ଦୁଲୁ ମିଳନ ଖେଳ' },
    { id: 'leaderboard', icon: Lucide.Trophy, label: t.leaderboard },
    { id: 'store', icon: Lucide.ShoppingBag, label: language === 'en' ? 'Avatar Store' : 'ଅବତାର ଷ୍ଟୋର' },
    { id: 'plans', icon: Lucide.CreditCard, label: language === 'en' ? 'Subscription' : 'ସବସ୍କ୍ରିପସନ୍' },
    { id: 'parent_dashboard', icon: Lucide.Users, label: language === 'en' ? 'Parent Insights' : 'ପିତାମାତା ଇନସାଇଟ୍ସ', premium: true, badge: <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider">PRO</span> },
    { id: 'support', icon: Lucide.HelpCircle, label: t.support.title },
  ];

  const filteredMenuItems = showShowcaseTab 
    ? allMenuItems 
    : allMenuItems.filter(item => item.id !== 'pitch_deck' && item.id !== 'telemetry');

  const teacherExcludedIds = ['store', 'leaderboard', 'daily_mcqs', 'syllabus_tracker', 'monthly_tests', 'smart_classes', 'matching_quiz', 'parent_dashboard', 'gundulu'];
  const menuItems = user?.role === 'teacher'
    ? filteredMenuItems.filter(item => !teacherExcludedIds.includes(item.id))
    : filteredMenuItems;



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
        <div className="h-full flex flex-col p-6">
          {/* BRANDING SECTION */}
          <div className="p-2 flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-3">
              {/* Chariot/Rath Crest */}
              <div className="relative h-12 w-12 rounded-full overflow-hidden border border-emerald-500/30 bg-slate-950/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)] flex-shrink-0">
                <img 
                  src="/gundulu-rath-crest.png" 
                  alt="Gundulu" 
                  className="h-full w-full object-cover scale-[1.3] filter saturate-[1.2]" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[#ffd700] font-black text-xl leading-none">ଏଆଈ-AI</span>
                <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Gundulu Era</span>
              </div>
            </div>
            {/* Utkal Logo in Sidebar hidden per user request */}
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 scrollbar-hide pt-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <SidebarItem
                  key={item.id}
                  icon={<Icon size={20} />}
                  label={item.label}
                  active={isActive}
                  premium={item.premium}
                  badge={item.badge}
                  /* Applying the Terracotta theme for active items if not premium */
                  className={isActive && !item.premium ? 'bg-[#b34d1f] text-white shadow-lg' : ''}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                />
              );
            })}

            {user?.role === 'admin' && (
              <SidebarItem
                icon={<Lucide.Lock size={20} />}
                label={t.admin}
                active={isAdminView}
                onClick={() => {
                  setIsAdminView(true);
                  setSidebarOpen(false);
                }}
                className={`mt-6 pt-6 border-t border-white/5 ${isAdminView ? 'text-[#ffd700]' : 'text-amber-500/60'}`}
              />
            )}
          </nav>

          {/* USER INFO & LOGOUT */}
          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-[#b34d1f]/20 flex items-center justify-center text-[#ffd700] font-black border border-[#b34d1f]/30">
                {user?.role === 'teacher' ? 'E' : (user?.name?.charAt(0) || 'S')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.role === 'teacher' && user?.name === 'Student' ? 'Educator' : (user?.name || 'Student')}</p>
                <p className="text-[10px] text-[#ffd700] font-bold uppercase tracking-widest opacity-70">
                  {user?.role === 'teacher' ? 'Educator Mode' : (user?.class ? (t.classes[user.class] || user.class) : 'Odisha Board')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 text-white/60">
                <Lucide.Globe size={18} className="text-emerald-400" />
                <span className="text-xs font-bold">{language === 'en' ? 'Language' : 'ଭାଷା'}</span>
              </div>
              <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-[#b34d1f] text-white shadow-md' : 'text-white/40 hover:text-white/70'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('or')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'or' ? 'bg-[#b34d1f] text-white shadow-md' : 'text-white/40 hover:text-white/70'}`}
                >
                  ଓଡ଼ିଆ
                </button>
              </div>
            </div>

            {user?.role !== 'teacher' && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-2xl text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 transition-all font-bold text-sm group"
              >
                <Lucide.Users size={20} className="group-hover:scale-105 transition-transform" />
                {language === 'en' ? 'Switch Sibling' : 'ଆକାଉଣ୍ଟ୍ ବଦଳାନ୍ତୁ'}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-sm group"
            >
              <Lucide.LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              {t.logout}
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};