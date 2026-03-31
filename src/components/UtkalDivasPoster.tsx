import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Scissors } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UtkalDivasPosterProps {
  onClose: () => void;
}

export const UtkalDivasPoster: React.FC<UtkalDivasPosterProps> = ({ onClose }) => {
  const [isCutting, setIsCutting] = useState(false);

  useEffect(() => {
    // Firecracker / Confetti celebration effect
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // Since particles fall down, start a bit higher than random
      confetti({
        ...defaults, particleCount,
        colors: ['#ff0000', '#ffa500', '#ffff00', '#ffffff'],
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        colors: ['#ff0000', '#ffa500', '#ffff00', '#ffffff'],
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const handleCutRibbon = () => {
    setIsCutting(true);
    setTimeout(onClose, 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md antialiased"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg mt-8 overflow-visible rounded-[2rem] shadow-2xl bg-gradient-to-br from-red-700 via-orange-600 to-yellow-500 border-4 border-yellow-400/50"
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none rounded-[2rem]">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-yellow-300 blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-red-900 blur-3xl"></div>
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          </div>

          {/* Ribbon */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-[2rem] overflow-hidden">
            <motion.div 
              className="h-8 w-1/2 bg-red-600 border-y-4 border-red-800 flex items-center justify-end"
              animate={isCutting ? { x: '-100%' } : { x: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}
            >
              <div className="w-4 h-8 bg-red-700"></div>
            </motion.div>
            
            {/* Bow */}
            <motion.div 
              className="absolute z-30 w-12 h-12 bg-yellow-400 rounded-full border-4 border-yellow-600 flex items-center justify-center shadow-lg"
              animate={isCutting ? { scale: 0, opacity: 0 } : { scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            </motion.div>

            <motion.div 
              className="h-8 w-1/2 bg-red-600 border-y-4 border-red-800 flex items-center justify-start"
              animate={isCutting ? { x: '100%' } : { x: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut", delay: 0.5 }}
            >
              <div className="w-4 h-8 bg-red-700"></div>
            </motion.div>
          </div>

          {/* Scissors */}
          <motion.div
            className="absolute z-40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            initial={{ opacity: 0, x: -100, rotate: -45 }}
            animate={isCutting ? { opacity: 1, x: 0, rotate: 0 } : { opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Scissors size={48} className="text-white drop-shadow-lg" />
          </motion.div>

          {/* Close Button */}
          <button
            onClick={handleCutRibbon}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors z-10 border border-white/30"
          >
            <X size={28} />
          </button>

          <div className="relative p-8 md:p-10 text-center flex flex-col items-center z-10">
            
            {/* Child Studying Image */}
            <div className="relative mb-8 mt-4 group">
              {/* Main Image */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.8)] overflow-hidden bg-orange-100 relative z-10">
                <img 
                  src="/utkal-512.png" 
                  alt="Utkal Skill Centre Logo" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border-4 border-yellow-400/50 scale-110 animate-[ping_3s_linear_infinite]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-orange-400/30 scale-125 animate-[ping_3s_linear_infinite_0.5s]"></div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg mb-4 leading-tight" style={{ textShadow: '0 4px 8px rgba(0,0,0,0.3)' }}>
              ପବିତ୍ର ଉତ୍କଳ ଦିବସର<br/>ହାର୍ଦ୍ଦିକ ଶୁଭେଚ୍ଛା
            </h1>
            
            <div className="w-24 h-1.5 bg-yellow-400 mx-auto mb-6 rounded-full shadow-lg"></div>
            
            <p className="text-lg md:text-xl text-yellow-50 font-bold mb-3 drop-shadow-md">
              ଆଜି ଏହି ଶୁଭ ଅବସରରେ
            </p>
            
            <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/15 border border-white/30 rounded-2xl backdrop-blur-md mb-4 shadow-xl">
              <Sparkles className="text-yellow-300 animate-pulse" size={24} />
              <p className="text-xl md:text-2xl font-black text-white tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର
              </p>
              <Sparkles className="text-yellow-300 animate-pulse" size={24} />
            </div>
            
            <p className="text-lg text-yellow-100 mb-8 font-bold tracking-wide">
              ର ଡିଜିଟାଲ୍ ଶୁଭାରମ୍ଭ!
            </p>

            <button
              onClick={handleCutRibbon}
              className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black rounded-xl text-lg transition-transform hover:scale-105 shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center gap-2"
            >
              ଆଗକୁ ବଢନ୍ତୁ (Enter App)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
