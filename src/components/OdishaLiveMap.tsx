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
        x: 20 + Math.random() * 60, // Keep pulses within Odisha-like shape
        y: 20 + Math.random() * 60,
      };
      setPulses(prev => [...prev.slice(-5), newPulse]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card rounded-[2rem] p-4 sm:p-6 lg:p-8 border-emerald-500/20 relative overflow-hidden h-[250px] sm:h-[300px] flex flex-col hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-500">
      <div className="absolute inset-0 bg-emerald-500/5 opacity-50" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 sm:mb-6">
          <div className="truncate pr-2">
            <h4 className="text-[7px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-0.5 sm:mb-1 truncate">
              {language === 'en' ? 'Live Neural Grid' : 'ଲାଇଭ୍ ଲର୍ଣ୍ଣିଂ ଗ୍ରିଡ୍'}
            </h4>
            <h3 className="text-[11px] sm:text-lg font-black text-white uppercase tracking-tighter truncate">
              {language === 'en' ? 'Odisha Activity' : 'ଓଡ଼ିଶା ଗତିବିଧି'}
            </h3>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[7px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-widest hidden sm:block">Live</span>
          </div>
        </div>

        {/* Abstract Odisha Map Shape */}
        <div className="flex-1 relative mt-4">
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-20 filter blur-[1px]">
            <path 
              d="M30,20 L70,25 L85,45 L75,80 L40,85 L15,60 Z" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="0.5"
            />
          </svg>

          <AnimatePresence>
            {pulses.map(pulse => (
              <motion.div
                key={pulse.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 2], opacity: [0, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute w-4 h-4"
                style={{ left: `${pulse.x}%`, top: `${pulse.y}%` }}
              >
                <div className="absolute inset-0 bg-emerald-500 rounded-full blur-sm" />
                <MapPin size={8} className="text-white absolute inset-0 m-auto" />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Fixed City Nodes */}
          {[
            { n: 'Bhubaneswar', x: 65, y: 55 },
            { n: 'Cuttack', x: 62, y: 50 },
            { n: 'Rourkela', x: 45, y: 25 },
            { n: 'Berhampur', x: 35, y: 75 },
            { n: 'Sambalpur', x: 30, y: 40 }
          ].map(city => (
            <div 
              key={city.n}
              className="absolute w-1 h-1 bg-emerald-500/40 rounded-full"
              style={{ left: `${city.x}%`, top: `${city.y}%` }}
            >
              <div className="absolute top-2 left-0 text-[6px] font-bold text-slate-500 uppercase whitespace-nowrap opacity-40">{city.n}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest text-center">
            {language === 'en' ? 'Connecting 1,200+ Scholars' : '୧,୨୦୦+ ଶିକ୍ଷାର୍ଥୀ ସଂଯୁକ୍ତ'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OdishaLiveMap;
