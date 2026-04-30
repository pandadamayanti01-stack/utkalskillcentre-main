import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, School, MapPin, GraduationCap, Phone, CheckCircle2, Loader2, Sparkles, Trophy } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface TestSeriesRegistrationFormProps {
  user: any;
  language: 'en' | 'or';
  onClose: () => void;
}

export function TestSeriesRegistrationForm({ user, language, onClose }: TestSeriesRegistrationFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    school: '',
    class: user?.class || '',
    district: user?.district || '',
    phone: user?.phoneNumber || '',
    board: user?.board || 'BSE Odisha'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      await addDoc(collection(db, 'test_series_registrations'), {
        ...formData,
        userId: user?.uid || user?.id,
        registeredAt: serverTimestamp(),
        seriesName: "Monthly Test Series - May 2026"
      });
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl glass-card neon-border rounded-[2.5rem] overflow-hidden relative"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />

        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all z-20">
          <X size={20} />
        </button>

        <div className="p-8 md:p-10 relative z-10">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                    <Trophy size={12} />
                    {t.prizes}
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-none">{t.title}</h2>
                  <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.name}</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all"
                        placeholder="e.g. Rahul Kumar"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.phone}</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                      <input 
                        required
                        type="tel" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.class}</label>
                    <div className="relative group">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                      <select 
                        required
                        value={formData.class}
                        onChange={e => setFormData({...formData, class: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all appearance-none"
                      >
                        <option value="" disabled>Select Class</option>
                        {[5, 6, 7, 8, 9, 10].map(c => <option key={c} value={c} className="bg-slate-900">Class {c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.district}</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                      <select 
                        required
                        value={formData.district}
                        onChange={e => setFormData({...formData, district: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all appearance-none"
                      >
                        <option value="" disabled>Select District</option>
                        {districts.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t.school}</label>
                    <div className="relative group">
                      <School className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                      <input 
                        required
                        type="text" 
                        value={formData.school}
                        onChange={e => setFormData({...formData, school: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm font-bold focus:border-amber-500/50 outline-none transition-all"
                        placeholder="e.g. Govt. High School, Bhubaneswar"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="md:col-span-2 mt-4 group relative py-4 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(245,158,11,0.2)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 group-hover:scale-110 transition-transform duration-500" />
                    <span className="relative z-10 text-white font-black text-sm tracking-widest flex items-center justify-center gap-3 uppercase">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : <>{t.submit} <Sparkles size={18} /></>}
                    </span>
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white tracking-tight">{t.success}</h2>
                  <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">{t.successSub}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
