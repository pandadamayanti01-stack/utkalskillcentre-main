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
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-lg relative bg-slate-900 border border-amber-500/20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/80 flex flex-col max-h-[90vh]"
      >
        {/* Glow/Light effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header decoration */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 w-full" />

        {/* Modal Scrollable Container */}
        <div className="p-8 overflow-y-auto space-y-6 select-text">
          {/* Logo & Brand */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-center p-2 shadow-lg">
              <img src="/utkal-192.png" alt="Utkal logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              {isOdia ? 'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର' : 'Utkal Skill Centre'}
            </h2>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest font-['Outfit']">
              {isOdia ? 'ବିଗସାନ ଗ୍ରୁପ୍ ଦ୍ୱାରା ପରିଚାଳିତ' : 'Empowered by Bigsan Group'}
            </p>
          </div>

          <hr className="border-white/5" />

          {/* Description */}
          <p className="text-slate-300 text-sm leading-relaxed text-center font-medium">
            {isOdia ? (
              'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ହେଉଛି ଗୁନ୍ଦୁଲୁ ଏଆଇ (Gundulu AI) ଦ୍ୱାରା ଚାଲିତ ଏକ ସକ୍ରେଟିକ୍ ଶିକ୍ଷା ସାଥୀ | ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳରେ ସ୍ୱଳ୍ପ ନେଟୱର୍କରେ ଚାଲିବା ପାଇଁ ଏହା ସ୍ୱତନ୍ତ୍ର ଭାବେ ପ୍ରସ୍ତୁତ ଏବଂ ମାସକୁ ମାତ୍ର ୯୯ ଟଙ୍କାରେ ବିଶ୍ୱସ୍ତରୀୟ ଏଆଇ ଶିକ୍ଷା ପ୍ରଦାନ କରିଥାଏ |'
            ) : (
              'Utkal Skill Centre is a digital study companion powered by Gundulu AI, a textbook-grounded, bilingual Socratic tutor. Specially designed for low-bandwidth rural classrooms in Odisha, it makes world-class AI learning affordable at just ₹99/month.'
            )}
          </p>

          {/* Team / Founders Card */}
          <div className="space-y-3 bg-black/40 border border-white/5 rounded-2xl p-5">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">
              {isOdia ? 'ଆମର ଟିମ୍' : 'OUR TEAM'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                  {isOdia ? 'ପ୍ରତିଷ୍ଠାତା' : 'FOUNDER'}
                </span>
                <span className="text-sm font-extrabold text-white">Damayanti Panda</span>
              </div>
              
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                  {isOdia ? 'ସହ-ପ୍ରତିଷ୍ଠାତା ଏବଂ ବିକାଶକାରୀ' : 'CO-FOUNDER & DEVELOPER'}
                </span>
                <span className="text-sm font-extrabold text-white">Gyanalok Panda</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">EMAIL</span>
                <a href="mailto:contact@utkalskillcentre.com" className="text-xs font-mono font-bold text-amber-400 hover:underline animate-none">
                  contact@utkalskillcentre.com
                </a>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">PARENT ORG</span>
                <span className="text-xs font-bold text-slate-300">{isOdia ? 'ବିଗସାନ ଗ୍ରୁପ୍' : 'Bigsan Group'}</span>
              </div>
            </div>
          </div>

          {/* Pilot Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl text-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">
                {isOdia ? 'ପାଇଲଟ୍ ଛାତ୍ର' : 'Pilot Users'}
              </span>
              <h4 className="text-lg font-black text-emerald-400 mt-1">445</h4>
            </div>
            <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl text-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">
                {isOdia ? 'ପେଡ୍ ସଦସ୍ୟ' : 'Paying Subs'}
              </span>
              <h4 className="text-lg font-black text-amber-400 mt-1">6</h4>
            </div>
            <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl text-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">
                {isOdia ? 'ଜିଲ୍ଲା ସଂଖ୍ୟା' : 'Districts'}
              </span>
              <h4 className="text-lg font-black text-indigo-400 mt-1">30</h4>
            </div>
          </div>

          {/* Social Links (Gyanalok Branding) */}
          <div className="pt-2 flex flex-col items-center space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {isOdia ? 'ସୋସିଆଲ ମିଡିଆ ମାଧ୍ୟମ' : 'Follow Bigsan Group'}
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://www.youtube.com/@UtkalSkillCenter"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-red-600 text-white border border-red-500 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
              >
                <Lucide.Youtube size={18} />
              </a>
              <a
                href="https://www.instagram.com/utkalskillcentre/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white border border-pink-500/30 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
              >
                <Lucide.Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/share/1JAq6DY6Sq/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-blue-600 text-white border border-blue-500 shadow-md transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
              >
                <Lucide.Facebook size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Close Button placed at the bottom of DOM structure with high contrast theme-adaptive inline style */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-[9999] h-10 w-10 rounded-full flex items-center justify-center transition-all border shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
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
