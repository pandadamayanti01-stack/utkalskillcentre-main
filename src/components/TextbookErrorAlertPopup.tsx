import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, BookOpen, CheckCircle2 } from 'lucide-react';

interface TextbookErrorAlertPopupProps {
  userClass: string;
  onClose: () => void;
}

export default function TextbookErrorAlertPopup({ userClass, onClose }: TextbookErrorAlertPopupProps) {
  // Map class identifiers to their error details in Odia
  const getErrorDetails = (cls: string) => {
    switch (cls) {
      case 'class1':
        return { count: 2, classLabel: '୧ମ ଶ୍ରେଣୀ' };
      case 'class4':
        return { count: 131, classLabel: '୪ର୍ଥ ଶ୍ରେଣୀ' };
      case 'class5':
        return { count: 75, classLabel: '୫ମ ଶ୍ରେଣୀ' };
      case 'class7':
        return { count: 387, classLabel: '୭ମ ଶ୍ରେଣୀ' };
      case 'class8':
        return { count: 705, classLabel: '୮ମ ଶ୍ରେଣୀ' };
      default:
        return { count: 0, classLabel: '' };
    }
  };

  const { count, classLabel } = getErrorDetails(userClass);

  if (count === 0) return null;

  const handleViewDetails = () => {
    window.open('/bse-odisha-textbook-errors-and-corrections-list.html', '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md antialiased"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 120 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 shadow-[0_0_50px_rgba(245,158,11,0.15)] force-dark-theme"
        >
          {/* Background Ambient Lights */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/10 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />

          {/* Close Icon Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer border border-white/10"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Glowing Warning Icon */}
          <div className="relative mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-bounce">
            <AlertTriangle size={32} />
          </div>

          {/* Header Tag */}
          <span className="px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4">
            ⚠️ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା
          </span>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-4">
            ପାଠ୍ୟପୁସ୍ତକ ମୁଦ୍ରଣ ତ୍ରୁଟି ସଂଶୋଧନ
          </h2>

          <div className="w-16 h-0.5 bg-gradient-to-r from-amber-400 to-emerald-400 mx-auto mb-5 rounded-full" />

          {/* Alert Message Box */}
          <div className="w-full p-4 rounded-2xl bg-slate-900/60 border border-white/5 mb-5 text-left flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 mt-0.5 font-bold">⚠️</span>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed m-0">
                ଆପଣଙ୍କ <span className="text-yellow-400 font-bold">{classLabel}</span> ବହିରେ ସରକାରୀ ସର୍ଭେ ଅନୁଯାୟୀ <span className="text-rose-400 font-bold">{count}ଟି ମୁଦ୍ରଣ ତ୍ରୁଟି</span> ଚିହ୍ନଟ ହୋଇଛି।
              </p>
            </div>
            
            <div className="flex items-start gap-2.5 border-t border-white/5 pt-3">
              <CheckCircle2 className="text-emerald-400 mt-0.5 flex-shrink-0" size={16} />
              <p className="text-[11px] sm:text-xs text-emerald-400 font-bold leading-relaxed m-0">
                ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର୍ (USC) ଆପଣଙ୍କ ପଢା ସାମଗ୍ରୀ ଏବଂ Daily MCQ ରେ ଏହି ସମସ୍ତ ତ୍ରୁଟିଗୁଡିକୁ ସଂଶୋଧନ କରିଦେଇଛି, ଯାହାଦ୍ୱାରା ଆପଣ କେବଳ ସଠିକ୍ ତଥ୍ୟ ପଢିପାରିବେ।
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto mb-6">
            ଆମର ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀରେ ସମସ୍ତ ସଂଶୋଧିତ ନୋଟ୍ସ ଉପଲବ୍ଧ ଅଛି। ତ୍ରୁଟିଗୁଡିକର ସମ୍ପୂର୍ଣ୍ଣ ତାଲିକା ଦେଖିବା ପାଇଁ ତଳେ କ୍ଲିକ୍ କରନ୍ତୁ।
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleViewDetails}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/10 active:scale-[0.98] cursor-pointer border border-amber-300/20 transition-all flex items-center justify-center gap-2"
            >
              <BookOpen size={14} />
              ସଂଶୋଧନ ତାଲିକା ଦେଖନ୍ତୁ
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider active:scale-[0.98] cursor-pointer border border-white/10 transition-all"
            >
              ଠିକ୍ ଅଛି, ବନ୍ଦ କରନ୍ତୁ
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
