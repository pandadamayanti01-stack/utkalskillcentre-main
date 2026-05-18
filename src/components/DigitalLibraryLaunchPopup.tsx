import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';

interface DigitalLibraryLaunchPopupProps {
  onClose: () => void;
  userId: string;
  onEnterLibrary: () => void;
  language: 'en' | 'or';
  theme: string;
}

export default function DigitalLibraryLaunchPopup({
  onClose,
  userId,
  onEnterLibrary,
  language,
  theme
}: DigitalLibraryLaunchPopupProps) {
  const isLight = theme === 'daybreak';

  const styles = {
    cardBg: isLight ? '#ffffff' : '#0f172a',
    cardBorder: isLight ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.2)',
    title: isLight ? '#0f172a' : '#ffffff',
    subtitle: isLight ? '#059669' : '#10b981',
    description: isLight ? '#475569' : '#94a3b8',
    featureBoxBg: isLight ? '#f8fafc' : 'rgba(2, 6, 23, 0.4)',
    featureBoxBorder: isLight ? '#e2e8f0' : 'rgba(16, 185, 129, 0.15)',
    featureTitle: isLight ? '#0f172a' : '#ffffff',
    featureDesc: isLight ? '#5c697a' : '#94a3b8',
    closeBg: isLight ? '#f1f5f9' : '#1e293b',
    closeText: isLight ? '#64748b' : '#94a3b8',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ backgroundColor: styles.cardBg, borderColor: styles.cardBorder }}
          className="w-full max-w-sm border rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden neon-border"
        >
          {/* Sparkly background glow elements */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{ backgroundColor: styles.closeBg, color: styles.closeText }}
            className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-sm border border-slate-200/10"
          >
            <Lucide.X size={16} />
          </button>

          {/* Main Visual Header */}
          <div className="text-center relative z-10 mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20 relative">
              <Lucide.BookOpen size={26} className="animate-pulse" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
            </div>

            <span style={{ color: styles.subtitle }} className="block text-[9px] uppercase font-black tracking-[0.2em] mb-1">
              ନୂତନ ଶୁଭାରମ୍ଭ ସୂଚନା
            </span>
            <h2 style={{ color: styles.title }} className="text-lg sm:text-xl font-black leading-tight">
              AI ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ଲାଇଭ୍! 📚✨
            </h2>
            <p style={{ color: styles.description }} className="text-xs mt-1.5 max-w-xs mx-auto font-bold leading-relaxed text-emerald-500/90 dark:text-emerald-400">
              ୧ ରୁ ୧୦ ଶ୍ରେଣୀ ଗଣିତ ଏବେ ଲାଇଭ୍! AI ସହଯୋଗୀ ସହିତ ପାଠ୍ୟପୁସ୍ତକ ସହଜରେ ପଢ଼ନ୍ତୁ। 🌟
            </p>
          </div>

          {/* Features highlight block */}
          <div style={{ backgroundColor: styles.featureBoxBg, borderColor: styles.featureBoxBorder }} className="space-y-3 mb-5 relative z-10 p-4 rounded-2xl border">
            {/* Feature 1 */}
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Lucide.CheckCircle2 size={14} />
              </div>
              <h4 style={{ color: styles.featureTitle }} className="text-xs font-black">
                ୧-୧୦ ଶ୍ରେଣୀ ଗଣିତ ପୁସ୍ତକ ଓ ନୋଟ୍ସ
              </h4>
            </div>

            {/* Feature 2 */}
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                <Lucide.Eye size={14} />
              </div>
              <h4 style={{ color: styles.featureTitle }} className="text-xs font-black">
                ଆଖି ସୁରକ୍ଷା ପାଇଁ ସେପିଆ ମୋଡ୍
              </h4>
            </div>

            {/* Feature 3 */}
            <div className="flex items-center gap-3">
              <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500">
                <Lucide.Sparkles size={14} />
              </div>
              <h4 style={{ color: styles.featureTitle }} className="text-xs font-black">
                ଗୁଣ୍ଡୁଲୁ AI ପ୍ରଶ୍ନ ସମାଧାନକାରୀ
              </h4>
            </div>
          </div>

          {/* Call-to-actions */}
          <div className="space-y-2.5 relative z-10">
            {/* Play Store Launch Announcement */}
            <div className="w-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 py-3 px-4 rounded-xl flex items-center justify-between gap-3 shadow-sm group">
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400">
                  ଖୁବ୍ ଶୀଘ୍ର ଆସୁଛି
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ଅଫିସିଆଲ୍ ଆଣ୍ଡ୍ରଏଡ୍ ଆପ୍ <strong className="text-emerald-600 dark:text-emerald-400">୧ ଜୁନ୍</strong> ରୁ
                </span>
              </div>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                alt="Get it on Google Play" 
                className="h-8 object-contain group-hover:scale-105 transition-transform"
              />
            </div>

            {/* Enter digital library CTA */}
            <button
              onClick={() => {
                onEnterLibrary();
                onClose();
              }}
              style={{ color: '#ffffff', backgroundColor: '#059669' }}
              className="w-full hover:bg-emerald-500 text-white py-3 px-4 rounded-xl font-black text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 border border-emerald-400/20 cursor-pointer"
            >
              <Lucide.ArrowRightCircle size={14} />
              <span>
                ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ଖୋଲନ୍ତୁ 📚
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
