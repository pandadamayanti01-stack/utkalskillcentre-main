import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, School, MapPin, GraduationCap, Phone, CheckCircle2, Loader2, Sparkles, Trophy } from 'lucide-react';
import { db } from '../firebase';
import { collection, setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

interface TestSeriesRegistrationFormProps {
  user: any;
  language: 'en' | 'or';
  onClose: () => void;
}

export function TestSeriesRegistrationForm({ user, language, onClose }: TestSeriesRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    school: user?.school || '',
    class: user?.class || '',
    district: user?.district || '',
    phone: user?.phoneNumber || '',
    board: user?.board || 'BSE Odisha'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const checkRegistration = async () => {
      if (!user?.uid && !user?.id) return;
      try {
        const regRef = doc(db, 'test_series_registrations', `reg_${user.uid || user.id}`);
        const regSnap = await getDoc(regRef);
        if (regSnap.exists()) {
          setAlreadyRegistered(true);
        }
      } catch (error: any) {
        if (error.code === 'permission-denied' || error.message?.toLowerCase().includes('permissions')) {
          console.warn("Permission denied while checking test series registration. This usually means the user is not yet registered or rules need updating.");
        } else {
          console.error("Error checking registration status:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkRegistration();
  }, [user]);

  const districts = [
    "Angul", "Boudh", "Balangir", "Bargarh", "Balasore", "Bhadrak", "Cuttack", "Deogarh", "Dhenkanal", 
    "Ganjam", "Gajapati", "Jharsuguda", "Jajpur", "Jagatsinghpur", "Khordha", "Keonjhar", "Kalahandi", 
    "Kandhamal", "Koraput", "Kendrapara", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nuapada", 
    "Nayagarh", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const regId = `reg_${user?.uid || user?.id}`;
      
      // 1. Save Test Series Registration
      await setDoc(doc(db, 'test_series_registrations', regId), {
        ...formData,
        userId: user?.uid || user?.id,
        registeredAt: serverTimestamp(),
        seriesName: "Monthly Test Series - May 2026"
      });

      // 2. Auto-update main user profile document
      if (user?.uid || user?.id) {
        const userRef = doc(db, 'users', user.uid || user.id);
        await setDoc(userRef, {
          school: formData.school,
          district: formData.district,
          board: formData.board
        }, { merge: true });
      }

      setIsSuccess(true);
      setTimeout(onClose, 3000);
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    en: {
      title: "Test Series Registration",
      subtitle: "Fill in your details to participate in the upcoming monthly test series.",
      name: "Full Name",
      school: "School Name",
      class: "Class",
      district: "District",
      phone: "WhatsApp Number",
      submit: "Register Now",
      success: "Registration Successful!",
      successSub: "You are now eligible for the monthly test series. We will contact you soon.",
      prizes: "Prizes worth ₹10,000 up for grabs!"
    },
    or: {
      title: "ଟେଷ୍ଟ ସିରିଜ୍ ପଞ୍ଜିକରଣ",
      subtitle: "ଆସନ୍ତା ମାସିକ ଟେଷ୍ଟ ସିରିଜରେ ଭାଗ ନେବା ପାଇଁ ଆପଣଙ୍କର ବିବରଣୀ ପୂରଣ କରନ୍ତୁ |",
      name: "ପୁରା ନାମ",
      school: "ସ୍କୁଲ୍ ନାମ",
      class: "ଶ୍ରେଣୀ",
      district: "ଜିଲ୍ଲା",
      phone: "ହ୍ଵାଟ୍ସଆପ୍ ନମ୍ବର",
      submit: "ବର୍ତ୍ତମାନ ପଞ୍ଜିକରଣ କରନ୍ତୁ",
      success: "ପଞ୍ଜିକରଣ ସଫଳ ହେଲା!",
      successSub: "ଆପଣ ବର୍ତ୍ତମାନ ମାସିକ ଟେଷ୍ଟ ସିରିଜ୍ ପାଇଁ ଯୋଗ୍ୟ | ଆମେ ଶୀଘ୍ର ଆପଣଙ୍କ ସହ ଯୋଗାଯୋଗ କରିବୁ |",
      prizes: "₹୧୦,୦୦୦ ର ପୁରସ୍କାର ଜିତିବାର ସୁଯୋଗ!"
    }
  }[language];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-card neon-border rounded-3xl overflow-hidden relative my-4"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />

        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-20">
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8 relative z-10 max-h-[85vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div key="loading" className="py-12 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-amber-500" size={32} />
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Checking Status...</p>
              </motion.div>
            ) : alreadyRegistered || isSuccess ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {alreadyRegistered ? (language === 'en' ? 'Already Registered' : 'ପୂର୍ବରୁ ପଞ୍ଜିକୃତ') : t.success}
                  </h2>
                  <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto leading-relaxed">
                    {alreadyRegistered 
                      ? (language === 'en' ? 'You have already registered for this test series. Stay tuned for updates!' : 'ଆପଣ ଏହି ଟେଷ୍ଟ ସିରିଜ୍ ପାଇଁ ପୂର୍ବରୁ ପଞ୍ଜିକରଣ କରିଛନ୍ତି | ଅପଡେଟ୍ ପାଇଁ ଅପେକ୍ଷା କରନ୍ତୁ |') 
                      : t.successSub}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest">
                    <Trophy size={10} />
                    {t.prizes}
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{t.title}</h2>
                  <p className="text-slate-400 text-xs font-medium">{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.name}</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={16} />
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-bold focus:border-amber-500/50 outline-none transition-all"
                        placeholder="e.g. Rahul Kumar"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.phone}</label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={16} />
                      <input 
                        required
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-bold focus:border-amber-500/50 outline-none transition-all"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.class}</label>
                    <div className="relative group">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors" size={16} />
                      <input 
                        readOnly
                        type="text" 
                        value={language === 'en' ? `Class ${formData.class}` : `ଶ୍ରେଣୀ ${formData.class}`}
                        className="w-full bg-slate-900/30 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white/50 text-xs font-bold cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.district}</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={16} />
                      <select 
                        required
                        value={formData.district}
                        onChange={e => setFormData({...formData, district: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-bold focus:border-amber-500/50 outline-none transition-all appearance-none"
                      >
                        <option value="" disabled>{language === 'en' ? 'Select District' : 'ଜିଲ୍ଲା ଚୟନ କରନ୍ତୁ'}</option>
                        {districts.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.school}</label>
                    <div className="relative group">
                      <School className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={16} />
                      <input 
                        required
                        type="text" 
                        value={formData.school}
                        onChange={e => setFormData({...formData, school: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white text-xs font-bold focus:border-amber-500/50 outline-none transition-all"
                        placeholder="e.g. Govt. High School, Bhubaneswar"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="sm:col-span-2 mt-2 group relative py-3 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(245,158,11,0.2)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 group-hover:scale-110 transition-transform duration-500" />
                    <span className="relative z-10 text-white font-black text-xs tracking-widest flex items-center justify-center gap-2 uppercase">
                      {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <>{t.submit} <Sparkles size={16} /></>}
                    </span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
