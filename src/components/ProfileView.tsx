import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Lock, 
  MessageCircle, 
  Mail, 
  Globe, 
  FileText, 
  ChevronRight, 
  Settings, 
  HelpCircle, 
  Loader2 
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  updateEmail, 
  sendEmailVerification, 
  GoogleAuthProvider, 
  linkWithPopup 
} from 'firebase/auth';
import { auth, db as firestore } from '../firebase';
import { translations } from '../translations';
import { OfflineNotesView } from './OfflineNotesView';

interface ProfileViewProps {
  user: any;
  language: 'en' | 'or';
  onBack: () => void;
  onParentAccess: () => void;
  setActiveTab: (tab: string) => void;
}

export function ProfileView({ user, language, onBack, onParentAccess, setActiveTab }: ProfileViewProps) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [parentShowLeaderboard, setParentShowLeaderboard] = useState(user?.parentShowLeaderboard ?? true);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleParentAccess = () => {
    if (!user?.parent_pin) {
      onParentAccess();
    } else {
      setShowPinModal(true);
    }
  };

  const verifyPin = () => {
    if (pin === user?.parent_pin) {
      onParentAccess();
      setShowPinModal(false);
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  const [showOfflineNotes, setShowOfflineNotes] = useState(false);

  if (showOfflineNotes) {
    return <OfflineNotesView language={language} onBack={() => setShowOfflineNotes(false)} />;
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(firestore, 'users', user?.id), {
        name,
        email,
        role: user?.role,
        class: user?.class || null,
        board: user?.board || null,
        parentShowLeaderboard
      });
      
      if (auth.currentUser && email && email !== auth.currentUser.email) {
        try {
          await updateEmail(auth.currentUser, email);
        } catch (authErr: any) {
          console.error("Auth Email Update Error:", authErr);
          alert("Profile saved, but please log out and log back in to fully update your email address for login.");
        }
      }
      
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Profile Update Error:", err);
      alert("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setVerifying(true);
    try {
      await sendEmailVerification(auth.currentUser);
      alert("Verification email sent! Please check your inbox.");
    } catch (err: any) {
      console.error("Verification Error:", err);
      alert("Failed to send verification email. " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const isEmailVerified = auth.currentUser?.emailVerified;

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      alert(language === 'en' ? "Google account linked successfully! You can now log in with either method." : "Google ଆକାଉଣ୍ଟ୍ ସଫଳତାର ସହ ଲିଙ୍କ୍ ହୋଇଛି! ଆପଣ ବର୍ତ୍ତମାନ ଯେକୌଣସି ପଦ୍ଧତି ସହିତ ଲଗଇନ୍ କରିପାରିବେ |");
    } catch (error: any) {
      console.error("Error linking Google account:", error);
      if (error.code === 'auth/credential-already-in-use') {
        alert(language === 'en' ? "This Google account is already linked to another user." : "ଏହି Google ଆକାଉଣ୍ଟ୍ ପୂର୍ବରୁ ଅନ୍ୟ ଏକ ଉପଭୋକ୍ତା ସହିତ ଲିଙ୍କ୍ ହୋଇଛି |");
      } else {
        alert(language === 'en' ? "Failed to link Google account. " + error.message : "Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରିବାରେ ବିଫଳ ହୋଇଛି | " + error.message);
      }
    }
  };

  const isGoogleLinked = auth.currentUser?.providerData.some(p => p.providerId === 'google.com');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-xl mx-auto"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div 
        variants={itemVariants}
        className="glass-card neon-border rounded-3xl p-8 space-y-6"
      >
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-[2rem] bg-slate-800/50 border-2 border-emerald-500/30 p-2 flex items-center justify-center shadow-2xl overflow-hidden">
            <img src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=default'} alt="Avatar" className="w-full h-full group-hover:scale-110 transition-transform" />
          </div>
          <button 
            onClick={() => setActiveTab('store')}
            className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 rounded-xl text-white shadow-lg hover:bg-emerald-500 transition-all border border-emerald-400/30"
          >
            <ShoppingBag size={16} />
          </button>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{translations[language].profile.editTitle}</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            {language === 'en' ? 'Points:' : 'ପଏଣ୍ଟ:'} <span className="text-emerald-400">{user.points}</span>
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].name}</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].email}</label>
          <div className="flex gap-2">
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {email && email === auth.currentUser?.email && !isEmailVerified && (
              <button 
                onClick={handleVerifyEmail}
                disabled={verifying}
                className="px-4 py-3 rounded-xl bg-blue-600/20 text-blue-400 font-medium hover:bg-blue-600/30 transition-all border border-blue-500/20 whitespace-nowrap"
              >
                {verifying ? 'Sending...' : 'Verify'}
              </button>
            )}
            {email && email === auth.currentUser?.email && isEmailVerified && (
              <div className="px-4 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 font-medium border border-emerald-500/20 flex items-center whitespace-nowrap">
                Verified
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.phone}</label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-between">
              <span className="text-sm">{user.phoneNumber || user.phone || 'N/A'}</span>
              <Lock size={14} className="opacity-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.class}</label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-between">
              <span className="text-sm">{translations[language].classes[user.class] || user.class || 'N/A'}</span>
              <Lock size={14} className="opacity-50" />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {translations[language].profile.requestChangeNote}
          </p>
          <div className="flex gap-2">
            <a 
              href={`https://wa.me/919337956168?text=${encodeURIComponent(`Namaskar Admin, I want to change my ${language === 'en' ? 'Class/Mobile Number' : 'ଶ୍ରେଣୀ/ମୋବାଇଲ୍ ନମ୍ବର'}. My Name: ${user?.name}, Current Class: ${user?.class}. Reason: `)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 border border-emerald-500/20"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
            <a 
              href={`mailto:pandadamayanti01@gmail.com?subject=Profile Change Request&body=${encodeURIComponent(`Namaskar Admin,\n\nI want to change my Class or Mobile Number.\n\nName: ${user?.name}\nPhone: ${user?.phoneNumber || user?.phone}\nCurrent Class: ${user?.class}\n\nReason for change:\n`)}`}
              className="flex-1 py-2 rounded-xl bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 border border-blue-500/20"
            >
              <Mail size={14} />
              Email
            </a>
          </div>
        </div>

        {/* Account Linking Section */}
        {!isGoogleLinked && (
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="text-blue-400" size={18} />
              <h3 className="text-sm font-bold text-white">{language === 'en' ? 'Link Google Account' : 'Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରନ୍ତୁ'}</h3>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {language === 'en' 
                ? 'Link your Google account to prevent data loss and log in easily with either your phone number or Google.' 
                : 'ଡାଟା ହରାଇବା ରୋକିବା ପାଇଁ ଆପଣଙ୍କର Google ଆକାଉଣ୍ଟ୍ ଲିଙ୍କ୍ କରନ୍ତୁ ଏବଂ ଆପଣଙ୍କର ଫୋନ୍ ନମ୍ବର କିମ୍ବା Google ସହିତ ସହଜରେ ଲଗଇନ୍ କରନ୍ତୁ |'}
            </p>
            <button 
              onClick={handleLinkGoogle}
              className="w-full py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {language === 'en' ? 'Link Google Account' : 'Google ସହିତ ଲିଙ୍କ୍ କରନ୍ତୁ'}
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">{translations[language].profile.parentPin}</label>
          <input 
            type="password"
            maxLength={4}
            placeholder="Set a 4-digit PIN for parent access"
            value={user.parent_pin || ''}
            onChange={async (e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 4) {
                await updateDoc(doc(firestore, 'users', user.id), {
                  parent_pin: val
                });
              }
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
          <p className="text-[10px] text-slate-500 mt-1">{translations[language].profile.parentPinNote}</p>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative inline-flex items-center">
              <input 
                type="checkbox" 
                checked={parentShowLeaderboard}
                onChange={(e) => setParentShowLeaderboard(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{translations[language].profile.parentLeaderboard}</span>
              <span className="text-[10px] text-slate-500">{translations[language].profile.parentLeaderboardNote}</span>
            </div>
          </label>
        </div>
        <div className="pt-6 border-t border-white/5">
          <button 
            onClick={() => setShowOfflineNotes(true)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 hover:bg-blue-500/20 transition-all group mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500 text-white">
                <FileText size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">{language === 'en' ? 'Offline Notes' : 'ଅଫଲାଇନ୍ ନୋଟ୍'}</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">{language === 'en' ? 'Access saved study material' : 'ସେଭ୍ ହୋଇଥିବା ପାଠ୍ୟପଢା ସାମଗ୍ରୀ'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={handleParentAccess}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500 text-white">
                <Settings size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">{translations[language].profile.parentDashboard}</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">{translations[language].profile.parentDashboardTagline}</p>
              </div>
            </div>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setActiveTab('support')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 hover:bg-purple-500/20 transition-all group mt-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500 text-white">
                <HelpCircle size={20} />
              </div>
              <div className="text-left">
                <p className="font-bold">{translations[language].support.title}</p>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">{translations[language].support.ticketDescription}</p>
              </div>
            </div>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : translations[language].profile.saveProfile}
        </button>
      </div>
      </motion.div>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <Settings size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Parent Access</h3>
              <p className="text-slate-400 mb-6 text-sm">Enter your 4-digit parent PIN to continue</p>
              
              <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-12 h-16 rounded-xl border flex items-center justify-center text-2xl font-bold ${pin.length > i ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                    {pin.length > i ? '•' : ''}
                  </div>
                ))}
              </div>

              {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

              <div className="grid grid-cols-3 gap-2 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => {
                      if (btn === 'C') setPin('');
                      else if (btn === 'OK') verifyPin();
                      else if (typeof btn === 'number' && pin.length < 4) setPin(prev => prev + btn);
                    }}
                    className="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                  >
                    {btn}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowPinModal(false)}
                className="text-slate-500 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
