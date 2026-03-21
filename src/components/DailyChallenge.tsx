import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, XCircle, Coins, Clock } from 'lucide-react';
import { doc, updateDoc, increment, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../firebase';

interface DailyChallengeProps {
  user: any;
  language: 'en' | 'or';
  challenge: any;
  onComplete: () => void;
}

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ user, language, challenge, onComplete }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  const translations = {
    en: {
      title: 'Daily Micro-Challenge',
      subtitle: 'Quick brain teaser for bonus points!',
      submit: 'Submit Answer',
      correct: 'Brilliant! You earned points.',
      wrong: 'Not quite. Try again tomorrow!',
      points: 'Points'
    },
    or: {
      title: 'ଦୈନିକ ମାଇକ୍ରୋ-ଚ୍ୟାଲେଞ୍ଜ',
      subtitle: 'ବୋନସ୍ ପଏଣ୍ଟ ପାଇଁ ଶୀଘ୍ର ମସ୍ତିଷ୍କ ଟିଜର!',
      submit: 'ଉତ୍ତର ଦିଅନ୍ତୁ',
      correct: 'ଚମତ୍କାର! ଆପଣ ପଏଣ୍ଟ ଅର୍ଜନ କରିଛନ୍ତି |',
      wrong: 'ଠିକ୍ ନୁହେଁ | ଆସନ୍ତାକାଲି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ!',
      points: 'ପଏଣ୍ଟ'
    }
  };

  const t = translations[language];

  const handleSubmit = async () => {
    if (!selectedOption) return;

    const correct = selectedOption === challenge.correct_answer;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      try {
        const userRef = doc(firestore, 'users', user.id);
        await updateDoc(userRef, {
          points: increment(challenge.points || 10),
          lastChallengeDate: new Date().toISOString().split('T')[0]
        });
        
        // Record progress
        await addDoc(collection(firestore, 'user_progress'), {
          userId: user.id,
          date: new Date().toISOString().split('T')[0],
          pointsEarned: challenge.points || 10,
          type: 'daily_challenge',
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Error updating points:", e);
      }
    }

    setTimeout(() => {
      onComplete();
    }, 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-[2.5rem] p-8 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <Sparkles size={120} />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t.title}</h3>
            <p className="text-emerald-400/80 text-sm font-medium">{t.subtitle}</p>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 space-y-6">
          <p className="text-lg font-medium text-white leading-relaxed">
            {challenge.question}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {challenge.options.map((option: string) => (
              <button
                key={option}
                disabled={showResult}
                onClick={() => setSelectedOption(option)}
                className={`w-full p-4 rounded-2xl text-left transition-all border ${
                  selectedOption === option 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                } ${showResult && option === challenge.correct_answer ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                ${showResult && selectedOption === option && option !== challenge.correct_answer ? 'bg-red-500 border-red-500 text-white' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleSubmit}
                disabled={!selectedOption}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
              >
                <Coins size={20} />
                {t.submit} (+{challenge.points || 10} {t.points})
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${
                  isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                {isCorrect ? t.correct : t.wrong}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
