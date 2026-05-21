import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface FloatingGunduluProps {
  onClick: () => void;
}

export function FloatingGundulu({ onClick }: FloatingGunduluProps) {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {/* Invisible constraints box covering the whole screen to keep Gundulu inside */}
      <div 
        ref={constraintsRef} 
        className="fixed inset-0 pointer-events-none z-[9999]" 
      />
      
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        whileDrag={{ scale: 1.1, cursor: "grabbing" }}
        initial={{ y: 200, x: 200, opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="fixed bottom-8 right-8 z-[10000] cursor-grab pointer-events-auto flex flex-col items-center group"
      >
        {/* Chat Bubble Hover Effect */}
        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none translate-y-2 group-hover:translate-y-0">
          <div className="bg-white text-black font-bold text-xs px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 whitespace-nowrap">
            <MessageCircle size={14} className="text-amber-500" />
            Ask Gundulu AI
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45" />
          </div>
        </div>

        {/* Mascot Avatar */}
        <button 
          onClick={onClick}
          className="relative w-20 h-20 rounded-full shadow-[0_10px_40px_rgba(245,158,11,0.4)] border-4 border-amber-500/50 bg-black overflow-hidden flex items-center justify-center hover:shadow-[0_10px_50px_rgba(245,158,11,0.6)] hover:border-amber-400 transition-colors"
        >
          {/* Animated Glow Ring */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent animate-pulse" />
          
          <img 
            src="/gundulu-rath-crest.png" 
            alt="Gundulu AI" 
            className="w-14 h-14 object-contain relative z-10"
            draggable="false"
          />
        </button>
      </motion.div>
    </>
  );
}
