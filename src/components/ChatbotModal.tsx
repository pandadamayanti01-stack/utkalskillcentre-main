import React from 'react';
import { motion } from 'motion/react';
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
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-950 border border-white/10 rounded-[2.5rem] w-full max-w-4xl h-full md:h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
      >
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
