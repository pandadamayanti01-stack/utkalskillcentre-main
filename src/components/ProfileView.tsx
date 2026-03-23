import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  Globe, 
  Calendar, 
  Camera, 
  Edit2, 
  Save, 
  X,
  Shield,
  Award,
  Star,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '../firebase';
import { translations } from '../translations';

interface ProfileViewProps {
  user: any;
  language: 'en' | 'or';
  isPremium: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, language, isPremium }) => {
  const t = translations[language];
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        name: editedName
      });
      setMessage({ type: 'success', text: language === 'en' ? 'Profile updated successfully!' : 'ପ୍ରୋଫାଇଲ୍ ସଫଳତାର ସହିତ ଅପଡେଟ୍ ହୋଇଛି!' });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: language === 'en' ? 'Failed to update profile.' : 'ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍ କରିବାରେ ବିଫଳ ହେଲା |' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Profile Header */}
      <div className="relative h-48 rounded-[2.5rem] bg-gradient-to-r from-emerald-600 to-cyan-600 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute -bottom-12 left-12 flex items-end gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-[2rem] bg-slate-900 border-4 border-slate-950 flex items-center justify-center text-4xl font-black text-emerald-500 shadow-2xl overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user?.name?.charAt(0) || 'S'
              )}
            </div>
            <button className="absolute bottom-2 right-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
              <Camera size={16} />
            </button>
          </div>
          <div className="mb-14">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white tracking-tight">{user?.name || 'Student'}</h1>
              {isPremium && (
                <div className="px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                  Pro Member
                </div>
              )}
            </div>
            <p className="text-emerald-100/80 font-bold uppercase tracking-widest text-xs mt-1">
              {user?.class ? t.classes[user.class] : 'No Class'} • {user?.board ? t.boards[user.board] : 'Odisha Board'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
        {/* Left Column: Stats */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 border border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award size={16} className="text-emerald-500" />
              Learning Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-amber-500" />
                  <span className="text-sm font-bold text-slate-300">Points</span>
                </div>
                <span className="text-lg font-black text-white">{user?.points || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <Star size={18} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-300">Level</span>
                </div>
                <span className="text-lg font-black text-white">{user?.level || 1}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-blue-500" />
                  <span className="text-sm font-bold text-slate-300">Quizzes</span>
                </div>
                <span className="text-lg font-black text-white">{user?.quizzesCompleted || 0}</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield size={16} className="text-purple-500" />
              Account Status
            </h3>
            <div className={`p-4 rounded-2xl border ${isPremium ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 border-white/5 text-slate-400'}`}>
              <p className="text-xs font-black uppercase tracking-widest mb-1">{isPremium ? 'Premium Active' : 'Free Plan'}</p>
              <p className="text-[10px] opacity-80">{isPremium ? 'Full access to AI tools & tests' : 'Upgrade to unlock AI Tutor & Solver'}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-900/40 backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white tracking-tight">Personal Information</h3>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isEditing ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? <Save size={16} /> : <Edit2 size={16} />)}
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mb-6 p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="text-sm font-bold">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-white">
                    <User size={18} className="text-slate-500" />
                    <span className="text-sm font-bold">{user?.name || 'Not Set'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400">
                  <Phone size={18} className="text-slate-500" />
                  <span className="text-sm font-bold">{user?.phoneNumber || 'Not Linked'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400">
                  <Mail size={18} className="text-slate-500" />
                  <span className="text-sm font-bold truncate">{user?.email || 'Not Linked'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Member Since</label>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400">
                  <Calendar size={18} className="text-slate-500" />
                  <span className="text-sm font-bold">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-900/40 backdrop-blur-xl">
            <h3 className="text-xl font-black text-white tracking-tight mb-8">Academic Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Class</p>
                  <p className="text-lg font-black text-white">{user?.class ? t.classes[user.class] : 'N/A'}</p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                  <Globe size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Board</p>
                  <p className="text-lg font-black text-white">{user?.board ? t.boards[user.board] : 'N/A'}</p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">School</p>
                  <p className="text-sm font-bold text-white truncate px-2">{user?.school || 'Not Set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className: string }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    className={className}
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  </motion.div>
);
