import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { subscribeUserToPush } from '../pwa';

interface DigitalLibraryLaunchPopupProps {
  onClose: () => void;
  userId: string;
  onEnterLibrary: () => void;
  language: 'en' | 'or';
}

export default function DigitalLibraryLaunchPopup({
  onClose,
  userId,
  onEnterLibrary,
  language
}: DigitalLibraryLaunchPopupProps) {
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

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
      <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden neon-border"
        >
          {/* Sparkly background glow elements */}
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-emerald-500/20 rounded-full filter blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-500/20 rounded-full filter blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-white/5 active:scale-95"
          >
            <Lucide.X size={16} />
          </button>

          {/* Main Visual Header */}
          <div className="text-center relative z-10 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 text-emerald-400 mb-4 border border-emerald-500/20 relative">
              <Lucide.BookOpen size={32} className="animate-pulse" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
            </div>

            <span className="block text-[10px] uppercase font-black tracking-[0.2em] text-emerald-500 mb-1">
              {language === 'en' ? 'New Launch Announcement' : 'ନୂତନ ଶୁଭାରମ୍ଭ ସୂଚନା'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {language === 'en' ? 'AI Digital Library is Live! 📚✨' : 'AI ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ଏବେ ଲାଇଭ୍! 📚✨'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 max-w-sm mx-auto font-medium">
              {language === 'en' 
                ? 'Your ultimate math learning companion is finally here! Unleash smart textbooks and AI doubts tutor.' 
                : 'ଆପଣଙ୍କର ସର୍ବୋତ୍ତମ ଗଣିତ ପଢ଼ା ସାଥୀ ଏବେ ପ୍ରସ୍ତୁତ! ଏବେ ପାଆନ୍ତୁ ସ୍ମାର୍ଟ୍ ବହି ଏବଂ AI ପ୍ରଶ୍ନ ସମାଧାନ।'}
            </p>
          </div>

          {/* Features highlight block */}
          <div className="space-y-3 mb-6 relative z-10 bg-slate-950/20 dark:bg-slate-950/40 p-4 rounded-2xl border border-emerald-500/10">
            {/* Feature 1 */}
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5">
                <Lucide.CheckCircle2 size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                  {language === 'en' ? 'Class 10 Math Textbooks & Notes' : 'ଦଶମ ଶ୍ରେଣୀ ଗଣିତ ପୁସ୍ତକ ଓ ନୋଟ୍ସ'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
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
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                  {language === 'en' ? 'Comfort Eye Care Shield' : 'ଆଖି ସୁରକ୍ଷା କବଚ (Comfort Eye Care)'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
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
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                  {language === 'en' ? 'Immersive Full Screen Canvas' : 'ସଂପୂର୍ଣ୍ଣ ସ୍କ୍ରିନ୍ ମୋଡ୍ (Full Screen)'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
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
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                  {language === 'en' ? 'Gundulu AI Doubt Solver' : 'ଗୁଣ୍ଡୁଲୁ AI ପ୍ରଶ୍ନ ସମାଧାନକାରୀ'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
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
                style={{ color: '#ffffff' }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 px-4 rounded-2xl font-extrabold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 border border-amber-400/20 disabled:opacity-75 disabled:cursor-wait"
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
              <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-3 px-4 rounded-2xl text-center font-extrabold text-xs flex items-center justify-center gap-1.5">
                <Lucide.BellRing size={14} className="animate-ping text-emerald-500" />
                <span className="text-emerald-500">
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
              style={{ color: '#ffffff' }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 px-4 rounded-2xl font-black text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-xl shadow-emerald-500/10 border border-emerald-400/20"
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
