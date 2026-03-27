import React from 'react';
import { motion } from 'motion/react';
import { X, Bot } from 'lucide-react';
import { StudyBuddyView } from './StudyBuddyView';

interface ChatbotModalProps {
  onClose: () => void;
  user: any;
  isPremium: boolean;
  language: 'en' | 'or';
}

export const ChatbotModal: React.FC<ChatbotModalProps> = ({ onClose, user, isPremium, language }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white font-bold">
            <Bot className="text-emerald-500" />
            <span>Gundulu AI</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {!user ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Please log in to use the chatbot.
            </div>
          ) : !isPremium ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              Oops, subscription needed.
            </div>
          ) : (
            <StudyBuddyView 
              language={language} 
              isPremium={isPremium} 
              onUpgrade={() => {}} 
              user={user} 
              onBack={onClose} 
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
