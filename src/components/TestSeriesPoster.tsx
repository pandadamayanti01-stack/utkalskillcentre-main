import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TestSeriesPosterProps {
  onClose: () => void;
}

export default function TestSeriesPoster({ onClose }: TestSeriesPosterProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/30 hover:bg-black/45 text-white flex items-center justify-center transition-colors"
            aria-label="Close poster"
          >
            <X size={18} />
          </button>

          <img
            src="/usc-mt1.png"
            alt="Test Series 1 Poster"
            className="w-full h-auto rounded-2xl shadow-2xl border border-white/20"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
