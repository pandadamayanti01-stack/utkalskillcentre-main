import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { subscribeUserToPush } from '../pwa';

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
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

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

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const success = await subscribeUserToPush(userId);
      if (success) {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Push subscription failed inside launch popup:', err);
    } finally {
      setSubscribing(false);
    }
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
          className="w-full max-w-lg border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden neon-border"
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
          <div className="text-center relative z-10 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4 border border-emerald-500/20 relative">
              <Lucide.BookOpen size={32} className="animate-pulse" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
            </div>

            <span style={{ color: styles.subtitle }} className="block text-[10px] uppercase font-black tracking-[0.2em] mb-1">
              {language === 'en' ? 'New Launch Announcement' : 'ନୂତନ ଶୁଭାରମ୍ଭ ସୂଚନା'}
            </span>
            <h2 style={{ color: styles.title }} className="text-xl sm:text-2xl font-black leading-tight">
              {language === 'en' ? 'AI Digital Library is Live! 📚✨' : 'AI ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ଏବେ ଲାଇଭ୍! 📚✨'}
            </h2>
            <p style={{ color: styles.description }} className="text-xs mt-1.5 max-w-sm mx-auto font-medium leading-relaxed">
              {language === 'en' 
                ? 'Your ultimate math learning companion is finally here! Unleash smart textbooks and AI doubts tutor.' 
                : 'ଆପଣଙ୍କର ସର୍ବୋତ୍ତମ ଗଣିତ ପଢ଼ା ସାଥୀ ଏବେ ପ୍ରସ୍ତୁତ! ଏବେ ପାଆନ୍ତୁ ସ୍ମାର୍ଟ୍ ବହି ଏବଂ AI ପ୍ରଶ୍ନ ସମାଧାନ।'}
            </p>
          </div>

          {/* Features highlight block */}
          <div style={{ backgroundColor: styles.featureBoxBg, borderColor: styles.featureBoxBorder }} className="space-y-3.5 mb-6 relative z-10 p-5 rounded-2xl border">
            {/* Feature 1 */}
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5">
                <Lucide.CheckCircle2 size={14} />
              </div>
              <div>
                <h4 style={{ color: styles.featureTitle }} className="text-xs font-black leading-none">
                  {language === 'en' ? 'Class 10 Math Textbooks & Notes' : 'ଦଶମ ଶ୍ରେଣୀ ଗଣିତ ପୁସ୍ତକ ଓ ନୋଟ୍ସ'}
                </h4>
                <p style={{ color: styles.featureDesc }} className="text-[10px] mt-1.5 leading-snug">
                  {language === 'en' 
                    ? 'Official state board chapters beautifully formatted with instant topic guides.' 
                    : 'ଅଫିସିଆଲ୍ ଓଡ଼ିଶା ବୋର୍ଡ ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ ସମସ୍ତ ଅଧ୍ୟାୟର ଗାଇଡ୍।'}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
                <Lucide.Eye size={14} />
              </div>
              <div>
                <h4 style={{ color: styles.featureTitle }} className="text-xs font-black leading-none">
                  {language === 'en' ? 'Comfort Eye Care Shield' : 'ଆଖି ସୁରକ୍ଷା କବଚ (Comfort Eye Care)'}
                </h4>
                <p style={{ color: styles.featureDesc }} className="text-[10px] mt-1.5 leading-snug">
                  {language === 'en' 
                    ? 'Protect your vision on mobile with Sepia Shields and late-night dim screen overlays.' 
                    : 'ମୋବାଇଲ୍ ସ୍କ୍ରିନରୁ ଆଖିର ସୁରକ୍ଷା ପାଇଁ ସ୍ୱତନ୍ତ୍ର ସେପିଆ ଏବଂ ଡିମ୍ ଫିଲ୍ଟର୍ସ।'}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-500 mt-0.5">
                <Lucide.Compass size={14} />
              </div>
              <div>
                <h4 style={{ color: styles.featureTitle }} className="text-xs font-black leading-none">
                  {language === 'en' ? 'Immersive Full Screen Canvas' : 'ସଂପୂର୍ଣ୍ଣ ସ୍କ୍ରିନ୍ ମୋଡ୍ (Full Screen)'}
                </h4>
                <p style={{ color: styles.featureDesc }} className="text-[10px] mt-1.5 leading-snug">
                  {language === 'en' 
                    ? 'Read uninterrupted! Hides sidebar and bottom tabs for perfect vertical focus.' 
                    : 'ଶାନ୍ତରେ ପଢ଼ିବା ପାଇଁ ସାଇଡ୍‌ବାର୍ ଏବଂ ତଳ ମେନୁ ବାର୍‌କୁ ସଂପୂର୍ଣ୍ଣ ଲୁଚାଇ ପଢ଼ନ୍ତୁ।'}
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500 mt-0.5">
                <Lucide.Sparkles size={14} />
              </div>
              <div>
                <h4 style={{ color: styles.featureTitle }} className="text-xs font-black leading-none">
                  {language === 'en' ? 'Gundulu AI Doubt Solver' : 'ଗୁଣ୍ଡୁଲୁ AI ପ୍ରଶ୍ନ ସମାଧାନକାରୀ'}
                </h4>
                <p style={{ color: styles.featureDesc }} className="text-[10px] mt-1.5 leading-snug">
                  {language === 'en' 
                    ? 'Ask Gundulu direct math questions and get step-by-step explanations in polite Odia!' 
                    : 'ପାଠ୍ୟକ୍ରମ ସମ୍ବନ୍ୟୀୟ ଯେକୌଣସି ପ୍ରଶ୍ନର ସରଳ ଓଡ଼ିଆରେ ଉତ୍ତର ପାଆନ୍ତୁ।'}
                </p>
              </div>
            </div>
          </div>

          {/* Call-to-actions */}
          <div className="space-y-3 relative z-10">
            {/* Push notification subscribe CTA */}
            {!isSubscribed ? (
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                style={{ color: '#ffffff', backgroundColor: '#f59e0b' }}
                className="w-full hover:bg-amber-600 text-white py-3.5 px-4 rounded-2xl font-black text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 border border-amber-400/20 disabled:opacity-75 disabled:cursor-wait cursor-pointer"
              >
                {subscribing ? (
                  <>
                    <Lucide.Loader2 size={16} className="animate-spin" />
                    <span>{language === 'en' ? 'Subscribing...' : 'ସଂଯୋଗ କରାଯାଉଛି...'}</span>
                  </>
                ) : (
                  <>
                    <Lucide.Bell size={16} className="animate-bounce" />
                    <span>
                      {language === 'en' 
                        ? 'Turn On Push Notifications for Live Alerts! 🔔' 
                        : 'ଲାଇଭ୍ ନୋଟିଫିକେସନ୍ ଚାଲୁ କରନ୍ତୁ! 🔔'}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 py-3.5 px-4 rounded-2xl text-center font-black text-xs flex items-center justify-center gap-1.5 shadow-sm">
                <Lucide.BellRing size={14} className="animate-ping" />
                <span>
                  {language === 'en' 
                    ? 'Notifications Activated! 🌟' 
                    : 'ନୋଟିଫିକେସନ୍ ଚାଲୁ ହୋଇଗଲା! 🌟'}
                </span>
              </div>
            )}

            {/* Enter digital library CTA */}
            <button
              onClick={() => {
                onEnterLibrary();
                onClose();
              }}
              style={{ color: '#ffffff', backgroundColor: '#059669' }}
              className="w-full hover:bg-emerald-500 text-white py-3.5 px-4 rounded-2xl font-black text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-xl shadow-emerald-500/10 border border-emerald-400/20 cursor-pointer"
            >
              <Lucide.ArrowRightCircle size={16} />
              <span>
                {language === 'en' ? 'Open Digital Library 📚' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ଖୋଲନ୍ତୁ 📚'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
