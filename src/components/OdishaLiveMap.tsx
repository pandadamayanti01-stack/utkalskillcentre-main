import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';

const OdishaLiveMap: React.FC<{ language: 'en' | 'or' }> = ({ language }) => {
  const [pulses, setPulses] = useState<{ id: number; x: number; y: number }[]>([]);

  // Simulation of live learning across Odisha
  useEffect(() => {
    const interval = setInterval(() => {
      const newPulse = {
        id: Date.now(),
        x: 25 + Math.random() * 50, // Keep pulses within Odisha-like shape
        y: 30 + Math.random() * 45,
      };
      setPulses(prev => [...prev.slice(-4), newPulse]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const cities = [
    { nameEn: 'Bhubaneswar', nameOr: 'ଭୁବନେଶ୍ୱର', x: 65, y: 55 },
    { nameEn: 'Cuttack', nameOr: 'କଟକ', x: 62, y: 50 },
    { nameEn: 'Rourkela', nameOr: 'ରାଉରକେଲା', x: 45, y: 25 },
    { nameEn: 'Berhampur', nameOr: 'ବ୍ରହ୍ମପୁର', x: 35, y: 75 },
    { nameEn: 'Sambalpur', nameOr: 'ସମ୍ବଲପୁର', x: 30, y: 40 }
  ];

  return (
    <div className="glass-card rounded-[2rem] p-4 sm:p-6 lg:p-8 border-emerald-500/20 dark:border-emerald-500/10 relative overflow-hidden h-[250px] sm:h-[300px] flex flex-col hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-500 shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <div className="absolute inset-0 bg-emerald-500/5 dark:bg-emerald-500/[0.02] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 sm:mb-6">
          <div className="truncate pr-2">
            <h4 className="text-[7px] sm:text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-0.5 sm:mb-1 truncate">
              {language === 'en' ? 'Live Neural Grid' : 'ଲାଇଭ୍ ଲର୍ଣ୍ଣିଂ ଗ୍ରିଡ୍'}
            </h4>
            <h3 className="text-xs sm:text-md font-black text-slate-800 dark:text-white uppercase tracking-tighter truncate">
              {language === 'en' ? 'Odisha Activity' : 'ଓଡ଼ିଶା ଗତିବିଧି'}
            </h3>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[7px] sm:text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hidden sm:block">Live</span>
          </div>
        </div>

        {/* Abstract Odisha Map Shape */}
        <div className="flex-1 relative mt-2 sm:mt-4">
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-40 dark:opacity-20">
            <path 
              d="M30,20 L70,25 L85,45 L75,80 L40,85 L15,60 Z" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="0.75"
              strokeDasharray="3,2"
            />
          </svg>

          <AnimatePresence>
            {pulses.map(pulse => (
              <motion.div
                key={pulse.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1.6], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3, ease: "easeOut" }}
                className="absolute w-6 h-6 -ml-3 -mt-3"
                style={{ left: `${pulse.x}%`, top: `${pulse.y}%` }}
              >
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-70" />
                <div className="absolute inset-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] flex items-center justify-center border border-white/20">
                  <MapPin size={8} className="text-emerald-950" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Fixed City Nodes */}
          {cities.map(city => (
            <div 
              key={city.nameEn}
              className="absolute w-1.5 h-1.5 bg-emerald-500/60 dark:bg-emerald-500/40 rounded-full border border-white/40 dark:border-slate-950"
              style={{ left: `${city.x}%`, top: `${city.y}%` }}
            >
              <div className="absolute top-2 left-0 text-[6.5px] font-black text-slate-800 dark:text-slate-300 uppercase whitespace-nowrap tracking-wider drop-shadow-sm">
                {language === 'or' ? city.nameOr : city.nameEn}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-2 pt-3 border-t border-slate-100 dark:border-white/5">
          <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
            {language === 'en' ? 'Connecting 1,200+ Scholars' : '୧,୨୦୦+ ଶିକ୍ଷାର୍ଥୀ ସଂଯୁକ୍ତ'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OdishaLiveMap;
