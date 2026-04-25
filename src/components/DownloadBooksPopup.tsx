import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Book } from 'lucide-react';

interface DownloadBooksPopupProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'or';
}

export const DownloadBooksPopup: React.FC<DownloadBooksPopupProps> = ({ isOpen, onClose, language }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
            
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
              <Book size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              {language === 'en' ? "Download Odia Medium Books" : "ଓଡ଼ିଆ ମାଧ୍ୟମ ବହି ଡାଉନଲୋଡ୍ କରନ୍ତୁ"}
            </h2>
            
            <p className="text-slate-400 text-center mb-8">
              {language === 'en' 
                ? "Get access to all your Odia medium textbooks for offline study." 
                : "ଅଫଲାଇନ୍ ପଢ଼ିବା ପାଇଁ ଆପଣଙ୍କର ସମସ୍ତ ଓଡ଼ିଆ ମାଧ୍ୟମ ପାଠ୍ୟପୁସ୍ତକଗୁଡ଼ିକୁ ଡାଉନଲୋଡ୍ କରନ୍ତୁ |"}
            </p>
            
            <button 
              onClick={() => {
                // Handle download logic here
                onClose();
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              <Download size={20} />
              {language === 'en' ? "Download Now" : "ଏବେ ଡାଉନଲୋଡ୍ କରନ୍ତୁ"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
