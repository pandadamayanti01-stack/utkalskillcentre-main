import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Bot, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UtkalDivasPosterProps {
  onClose: () => void;
}

export const UtkalDivasPoster: React.FC<UtkalDivasPosterProps> = ({ onClose }) => {
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
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
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

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition-colors z-10 border border-white/30"
          >
            <X size={28} />
          </button>

          <div className="relative p-8 md:p-10 text-center flex flex-col items-center z-10">
            
            {/* Child Studying Image with AI Tools */}
            <div className="relative mb-8 mt-4 group">
              {/* Main Image */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-300 shadow-[0_0_30px_rgba(250,204,21,0.8)] overflow-hidden bg-orange-100 relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop" 
                  alt="Child studying" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border-4 border-yellow-400/50 scale-110 animate-[ping_3s_linear_infinite]"></div>
              <div className="absolute inset-0 rounded-full border-4 border-orange-400/30 scale-125 animate-[ping_3s_linear_infinite_0.5s]"></div>

              {/* ChatGPT Tool Badge */}
              <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -left-12 top-4 bg-white/90 backdrop-blur-md border-2 border-green-500/50 p-2 rounded-2xl shadow-xl flex items-center gap-2 z-20"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <MessageSquare size={16} className="fill-current" />
                </div>
                <div className="pr-2 hidden sm:block">
                  <div className="text-[10px] font-black text-slate-800 uppercase tracking-wider">ChatGPT</div>
                </div>
              </motion.div>

              {/* Gemini AI Tool Badge */}
              <motion.div 
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute -right-12 bottom-4 bg-white/90 backdrop-blur-md border-2 border-blue-500/50 p-2 rounded-2xl shadow-xl flex items-center gap-2 z-20"
              >
                <div className="pl-2 hidden sm:block text-right">
                  <div className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Gemini AI</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Sparkles size={16} className="fill-current" />
                </div>
              </motion.div>
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
              onClick={onClose}
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
