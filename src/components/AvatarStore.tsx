import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShoppingBag, Star, CheckCircle2, Lock, Sparkles, Coins } from 'lucide-react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db as firestore } from '../firebase';

interface AvatarStoreProps {
  user: any;
  language: 'en' | 'or';
  onBack: () => void;
}

const AVATARS = [
  { id: 'bot-1', name: 'Robo Buddy', price: 0, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Buddy' },
  { id: 'bot-2', name: 'Cyber Cat', price: 100, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix' },
  { id: 'bot-3', name: 'Neon Knight', price: 250, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Knight' },
  { id: 'bot-4', name: 'Star Scout', price: 500, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Scout' },
  { id: 'bot-5', name: 'Astro Bear', price: 1000, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Bear' },
  { id: 'bot-6', name: 'Quantum Queen', price: 2500, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Queen' },
  { id: 'bot-7', name: 'Void Voyager', price: 5000, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Voyager' },
  { id: 'bot-8', name: 'Legendary USC', price: 10000, url: 'https://api.dicebear.com/7.x/bottts/svg?seed=USC' },
];

export function AvatarStore({ user, language, onBack }: AvatarStoreProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePurchase = async (avatar: typeof AVATARS[0]) => {
    if (user.points < avatar.price) return;
    
    setPurchasing(avatar.id);
    try {
      await updateDoc(doc(firestore, 'users', user.id), {
        avatar: avatar.url,
        points: increment(-avatar.price)
      });
      
      await updateDoc(doc(firestore, 'public_profiles', user.id), {
        avatar: avatar.url,
        points: increment(-avatar.price)
      });

      setSuccess(avatar.id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Purchase Error:", err);
    } finally {
      setPurchasing(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-10 pb-20"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-800/50 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {language === 'en' ? 'Avatar Store' : 'ଅବତାର ଷ୍ଟୋର'}
            </h2>
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs">
              {language === 'en' ? 'Customize your profile' : 'ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ କଷ୍ଟମାଇଜ୍ କରନ୍ତୁ'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/80 border border-emerald-500/30 px-6 py-3 rounded-2xl shadow-lg shadow-emerald-900/20 backdrop-blur-xl">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Your Utkal Coins</p>
            <p className="text-2xl font-black text-white tracking-tighter">{user.points}</p>
          </div>
        </div>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {AVATARS.map((avatar) => {
          const isOwned = user.avatar === avatar.url;
          const canAfford = user.points >= avatar.price;
          
          return (
            <motion.div
              key={avatar.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className={`group relative glass-card rounded-[2.5rem] p-6 flex flex-col items-center text-center transition-all border-2 ${
                isOwned ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/5 hover:border-white/20'
              }`}
            >
              {isOwned && (
                <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-full">
                  <CheckCircle2 size={16} />
                </div>
              )}
              
              <div className="relative mb-6">
                <div className={`w-32 h-32 rounded-[2rem] bg-slate-800/50 flex items-center justify-center overflow-hidden transition-all group-hover:scale-110 ${
                  isOwned ? 'ring-4 ring-emerald-500/30' : ''
                }`}>
                  <img src={avatar.url} alt={avatar.name} className="w-24 h-24" />
                </div>
                {!canAfford && !isOwned && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] rounded-[2rem] flex items-center justify-center text-slate-400">
                    <Lock size={32} />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{avatar.name}</h3>
              <div className="flex items-center gap-1.5 mb-6">
                <Coins size={14} className="text-emerald-400" />
                <span className={`text-sm font-bold ${canAfford || isOwned ? 'text-emerald-400' : 'text-red-400'}`}>
                  {avatar.price}
                </span>
              </div>

              <button
                disabled={isOwned || !canAfford || purchasing === avatar.id}
                onClick={() => handlePurchase(avatar)}
                className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isOwned 
                    ? 'bg-emerald-500/20 text-emerald-400 cursor-default' 
                    : canAfford 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {purchasing === avatar.id ? (
                  <Sparkles className="animate-spin" size={18} />
                ) : isOwned ? (
                  'Equipped'
                ) : (
                  <>
                    <ShoppingBag size={18} />
                    {language === 'en' ? 'Unlock' : 'ଅନଲକ୍'}
                  </>
                )}
              </button>

              <AnimatePresence>
                {success === avatar.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute -bottom-10 left-0 right-0 text-emerald-400 text-xs font-bold"
                  >
                    Successfully Equipped! ✨
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Info Section */}
      <motion.div variants={itemVariants} className="p-8 glass-card rounded-[2.5rem] bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-white/10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-900/20">
          <Star size={40} />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h4 className="text-xl font-bold text-white mb-2">Earn more Utkal Coins!</h4>
          <p className="text-slate-400 text-sm leading-relaxed">
            Complete daily quizzes, watch full chapters, and maintain your study streak to earn more coins. 
            New legendary avatars are added every month!
          </p>
        </div>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-200 transition-all shadow-xl"
        >
          Start Learning
        </button>
      </motion.div>
    </motion.div>
  );
}
