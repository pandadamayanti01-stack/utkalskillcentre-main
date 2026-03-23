import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Brain, 
  Trophy, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  User, 
  CreditCard, 
  BarChart3, 
  Globe,
  Mail,
  HelpCircle,
  Clock,
  Star,
  Hash,
  Shapes,
  Bot,
  Loader2,
  Send,
  PenTool,
  FileText,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  Image,
  Lightbulb,
  Sparkles,
  Search,
  AlertCircle,
  Lock,
  MessageCircle,
  Book,
  Download,
  Save,
  ShoppingBag,
  Flame,
  Mic,
  MicOff,
  UserPlus,
  UserCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { Logo } from './Branding';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
  language: 'en' | 'or';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  user: any;
  isAdminView: boolean;
  setIsAdminView: (val: boolean) => void;
  handleLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  language,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setSidebarOpen,
  user,
  isAdminView,
  setIsAdminView,
  handleLogout
}) => {
  const t = translations[language];

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
    { id: 'courses', icon: BookOpen, label: t.courses },
    { id: 'ai_solver', icon: Brain, label: t.aiSolver },
    { id: 'study_buddy', icon: Bot, label: t.aiTutor || 'AI Tutor' },
    { id: 'monthly_tests', icon: Calendar, label: t.monthlyTests },
    { id: 'leaderboard', icon: Trophy, label: t.leaderboard },
    { id: 'games', icon: Shapes, label: t.games },
    { id: 'textbooks', icon: Book, label: 'Textbooks' },
    { id: 'offline_notes', icon: Download, label: 'Offline' },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'subscription', icon: CreditCard, label: 'Subscription' },
  ];

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-slate-900 border-r border-white/5 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <Logo className="h-10" />
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={activeTab === item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              />
            ))}

            {user?.role === 'admin' && (
              <SidebarItem
                icon={Lock}
                label={t.admin}
                active={isAdminView}
                onClick={() => {
                  setIsAdminView(true);
                  setSidebarOpen(false);
                }}
                className="mt-8 border-t border-white/5 pt-8 text-amber-400 hover:text-amber-300"
              />
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                {user?.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.name || 'Student'}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user?.class ? t.classes[user.class] : 'No Class'}</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold text-sm group"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              {t.logout}
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
