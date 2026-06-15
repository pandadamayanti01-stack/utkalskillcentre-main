import React from 'react';
import { motion } from 'framer-motion';
import * as Lucide from 'lucide-react';

interface AboutUsModalProps {
  language: 'en' | 'or';
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ language, onClose }) => {
  const isOdia = language === 'or';
  const isLight = typeof window !== 'undefined' && localStorage.getItem('theme') === 'daybreak';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 force-dark-theme">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl relative bg-slate-900 border border-amber-500/20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/80 flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-y-visible force-dark-theme"
      >
        {/* Glow/Light effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Decorative Top Line */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 z-10" />

        {/* Mission (Mobile Only, at the top) */}
        <div className="block md:hidden p-6 pb-2 space-y-3 shrink-0 force-dark-theme relative z-20 mt-3">
          <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
            {isOdia ? 'ଆମର ଲକ୍ଷ୍ୟ' : 'OUR MISSION'}
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed font-medium">
            {isOdia ? (
              'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ହେଉଛି ଗୁନ୍ଦୁଲୁ ଏଆଇ (Gundulu AI) ଦ୍ୱାରା ଚାଲିତ ଏକ ସକ୍ରେଟିକ୍ ଶିକ୍ଷା ସାଥୀ | ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳରେ ସ୍ୱଳ୍ପ ନେଟୱର୍କରେ ଚାଲିବା ପାଇଁ ଏହା ସ୍ୱତନ୍ତ୍ର ଭାବେ ପ୍ରସ୍ତୁତ ଏବଂ ମାସକୁ ମାତ୍ର ୯୯ ଟଙ୍କାରେ ବିଶ୍ୱସ୍ତରୀୟ ଏଆଇ ଶିକ୍ଷା ପ୍ରଦାନ କରିଥାଏ |'
            ) : (
              'Utkal Skill Centre is a digital study companion powered by Gundulu AI, a textbook-grounded, bilingual Socratic tutor. Specially designed for low-bandwidth rural classrooms in Odisha, it makes world-class AI learning affordable at just ₹99/month.'
            )}
          </p>
        </div>

        {/* LEFT COLUMN: Logo & Traction Stats (45% Width on Desktop) */}
        <div className="w-full md:w-[42%] bg-slate-950/80 p-6 md:p-10 border-b md:border-b-0 md:border-r border-white/5 flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden shrink-0 force-dark-theme">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* Glowing Animated Logo */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-center p-3.5 shadow-xl">
              <img src="/utkal-192.png" alt="Utkal logo" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              {isOdia ? 'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Utkal Skill Centre'}
            </h2>
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest font-['Outfit']">
              {isOdia ? 'ବିଗସାନ ଗ୍ରୁପ୍ ଦ୍ୱାରା ପରିଚାଳିତ' : 'Empowered by Bigsan Group'}
            </p>
          </div>

          {/* Stats Title */}
          <div className="w-full pt-4 border-t border-white/5 space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {isOdia ? 'ପାଇଲଟ୍ ସଫଳତା' : 'PILOT TRACTION'}
            </h3>
            
            {/* Stats list */}
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:border-emerald-500/30 transition-all">
                <span className="text-xs font-bold text-slate-400">{isOdia ? 'ସକ୍ରିୟ ପାଇଲଟ୍ ଛାତ୍ର' : 'Active Pilot Users'}</span>
                <span className="text-lg font-black text-emerald-400">445</span>
              </div>
              
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:border-amber-500/30 transition-all">
                <span className="text-xs font-bold text-slate-400">{isOdia ? 'ପେଡ୍ ସଦସ୍ୟ' : 'Paying Subscribers'}</span>
                <span className="text-lg font-black text-amber-400">6</span>
              </div>
              
              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:border-indigo-500/30 transition-all">
                <span className="text-xs font-bold text-slate-400">{isOdia ? 'ଜିଲ୍ଲା ସଂଖ୍ୟା' : 'Districts Covered'}</span>
                <span className="text-lg font-black text-indigo-400">30</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Description, Team, Contact & Socials (58% Width on Desktop) */}
        <div className="w-full md:w-[58%] p-6 md:p-10 md:overflow-y-auto space-y-6 flex flex-col justify-between force-dark-theme">
          
          {/* Mission & Description (Desktop Only) */}
          <div className="hidden md:block space-y-3">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
              {isOdia ? 'ଆମର ଲକ୍ଷ୍ୟ' : 'OUR MISSION'}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              {isOdia ? (
                'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ହେଉଛି ଗୁନ୍ଦୁଲୁ ଏଆଇ (Gundulu AI) ଦ୍ୱାରା ଚାଲିତ ଏକ ସକ୍ରେଟିକ୍ ଶିକ୍ଷା ସାଥୀ | ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳରେ ସ୍ୱଳ୍ପ ନେଟୱର୍କରେ ଚାଲିବା ପାଇଁ ଏହା ସ୍ୱତନ୍ତ୍ର ଭାବେ ପ୍ରସ୍ତୁତ ଏବଂ ମାସକୁ ମାତ୍ର ୯୯ ଟଙ୍କାରେ ବିଶ୍ୱସ୍ତରୀୟ ଏଆଇ ଶିକ୍ଷା ପ୍ରଦାନ କରିଥାଏ |'
              ) : (
                'Utkal Skill Centre is a digital study companion powered by Gundulu AI, a textbook-grounded, bilingual Socratic tutor. Specially designed for low-bandwidth rural classrooms in Odisha, it makes world-class AI learning affordable at just ₹99/month.'
              )}
            </p>
          </div>

          {/* Team / Founders Card */}
          <div className="space-y-4 bg-black/40 border border-white/5 rounded-3xl p-5">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
              {isOdia ? 'ପ୍ରତିଷ୍ଠାତା ମଣ୍ଡଳୀ' : 'FOUNDERS & TEAM'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Lucide.Crown size={15} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                    {isOdia ? 'ପ୍ରତିଷ୍ଠାତା' : 'FOUNDER'}
                  </span>
                  <span className="text-xs font-bold text-white">Damayanti Panda</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Lucide.Code size={15} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">
                    {isOdia ? 'ସହ-ପ୍ରତିଷ୍ଠାତା ଏବଂ ବିକାଶକାରୀ' : 'CO-FOUNDER & DEVELOPER'}
                  </span>
                  <span className="text-xs font-bold text-white">Gyanalok Panda</span>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">EMAIL</span>
                <a href="mailto:contact@utkalskillcentre.com" className="text-xs font-mono font-bold text-amber-400 hover:underline">
                  contact@utkalskillcentre.com
                </a>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">PARENT ORGANIZATION</span>
                <span className="text-xs font-extrabold text-slate-300">{isOdia ? 'ବିଗସାନ ଗ୍ରୁପ୍' : 'Bigsan Group'}</span>
              </div>
            </div>
          </div>

          {/* Social Links (Bigsan Group Branding) */}
          <div className="pt-2 flex items-center justify-between border-t border-white/5">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {isOdia ? 'ସୋସିଆଲ ମିଡିଆ ମାଧ୍ୟମ:' : 'Follow Bigsan Group:'}
            </span>
            <div className="flex items-center gap-3">
              <a
                href="https://www.youtube.com/@UtkalSkillCenter"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-red-600/90 text-white border border-red-500 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center hover:bg-red-600"
              >
                <Lucide.Youtube size={16} />
              </a>
              <a
                href="https://www.instagram.com/utkalskillcentre/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white border border-pink-500/30 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center opacity-90 hover:opacity-100"
              >
                <Lucide.Instagram size={16} />
              </a>
              <a
                href="https://www.facebook.com/share/1JAq6DY6Sq/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl bg-blue-600/90 text-white border border-blue-500 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center hover:bg-blue-600"
              >
                <Lucide.Facebook size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* CLOSE BUTTON: Sits inside the card but offset from the rounded border to prevent clipping */}
        <button
          onClick={onClose}
          className="absolute top-10 right-10 md:top-8 md:right-8 z-[9999] h-10 w-10 rounded-full flex items-center justify-center transition-all border shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
            color: isLight ? '#0f172a' : '#ffffff',
            borderColor: isLight ? '#cbd5e1' : '#334155'
          }}
          aria-label="Close about us"
        >
          <Lucide.X size={18} />
        </button>
      </motion.div>
    </div>
  );
};
