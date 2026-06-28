import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShoppingBag, Star, CheckCircle2, Lock, Sparkles, Coins } from 'lucide-react';
import { gcpService } from '../services/gcpService';

interface AvatarStoreProps {
  user: any;
  language: 'en' | 'or';
  onBack: () => void;
}

const AVATARS = [
  // Default Companion
  { id: 'gundulu', name: 'Gundulu Mascot', price: 0, url: '/gundulu-v3.png', group: 'default', badge: 'Starter' },

  // Class 1 to 5 (Primary - Cartoon Series)
  { id: 'avatar-bheem', name: 'Bheem Buddy', price: 150, url: '/avatar_bheem.png', group: 'primary', badge: 'Popular' },
  { id: 'avatar-motu', name: 'Motu Master', price: 150, url: '/avatar_motu.png', group: 'primary', badge: 'Funny' },
  { id: 'avatar-patlu', name: 'Patlu Pandit', price: 150, url: '/avatar_patlu.png', group: 'primary', badge: 'Smart' },
  { id: 'avatar-krishna', name: 'Little Prince', price: 200, url: '/avatar_krishna.png', group: 'primary', badge: 'Divine' },
  { id: 'avatar-hanuman', name: 'Bal Hanuman', price: 200, url: '/avatar_hanuman.png', group: 'primary', badge: 'Heroic' },
  { id: 'avatar-raju', name: 'Mighty Raju', price: 150, url: '/avatar_raju.png', group: 'primary', badge: 'Sci-Fi' },
  { id: 'avatar-doraemon', name: 'Cyber Cat', price: 250, url: '/avatar_doraemon.png', group: 'primary', badge: 'Gadgets' },
  { id: 'avatar-shinchan', name: 'Shinchan Show', price: 250, url: '/avatar_shinchan.png', group: 'primary', badge: 'Playful' },

  // Class 6 to 10 (Secondary - Gaming & Anime Series)
  { id: 'avatar-naruto', name: 'Ninja Gundulu', price: 300, url: '/avatar_naruto.png', group: 'secondary', badge: 'Hokage' },
  { id: 'avatar-goku', name: 'Saiyan Warrior', price: 350, url: '/avatar_goku.png', group: 'secondary', badge: 'Saiyan' },
  { id: 'avatar-luffy', name: 'Pirate King', price: 350, url: '/avatar_luffy.png', group: 'secondary', badge: 'Gear 5' },
  { id: 'avatar-bgmi', name: 'Airdrop Legend', price: 500, url: '/avatar_bgmi.png', group: 'secondary', badge: 'Winner' },
  { id: 'avatar-freefire', name: 'Freefire Pro', price: 500, url: '/avatar_freefire.png', group: 'secondary', badge: 'Booyah' },
  { id: 'avatar-esports', name: 'Esports Icon', price: 600, url: '/avatar_esports.png', group: 'secondary', badge: 'Pro' },
  { id: 'avatar-tanjiro', name: 'Sun Slayer', price: 400, url: '/avatar_tanjiro.png', group: 'secondary', badge: 'Water' },
  { id: 'avatar-spiderman', name: 'Web Slinger', price: 400, url: '/avatar_spiderman.png', group: 'secondary', badge: 'Hero' },
];

export function AvatarStore({ user, language, onBack }: AvatarStoreProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Intelligently default active tab based on user's class
  const userClassNum = parseInt(user.class || '10', 10);
  const initialCategory = userClassNum <= 5 ? 'primary' : 'secondary';
  const [activeCategory, setActiveCategory] = useState<'primary' | 'secondary'>(initialCategory);

  const handlePurchase = async (avatar: typeof AVATARS[0]) => {
    const ownedAvatars = user.ownedAvatars || ['gundulu'];
    const isAlreadyOwned = avatar.price === 0 || ownedAvatars.includes(avatar.id);

    if (!isAlreadyOwned && (user.points || 0) < avatar.price) return;

    setPurchasing(avatar.id);
    try {
      const newPoints = isAlreadyOwned ? (user.points || 0) : (user.points || 0) - avatar.price;
      const newOwned = isAlreadyOwned ? ownedAvatars : [...ownedAvatars, avatar.id];

      const updateData = {
        avatar: avatar.url,
        points: newPoints,
        ownedAvatars: newOwned,
        updatedAt: new Date().toISOString()
      };

      await gcpService.updateDoc('users', user.id, updateData);
      await gcpService.updateDoc('public_profiles', user.id, {
        avatar: avatar.url,
        points: newPoints,
        updatedAt: new Date().toISOString()
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

  const defaultAvatar = AVATARS.find(a => a.group === 'default')!;
  const filteredAvatars = AVATARS.filter(a => a.group === activeCategory);
  
  const userOwnedList = user.ownedAvatars || ['gundulu'];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-10 pb-20 px-4 animate-fadeIn"
    >
      {/* Header and Coins balance */}
      <motion.div variants={itemVariants} className="w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="glass-card bg-gradient-to-br from-emerald-600/30 to-blue-700/20 border border-emerald-400/20 shadow-2xl rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 w-full animate-slideIn">
          {/* Back button */}
          <button 
            onClick={onBack}
            className="self-start md:self-auto p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white flex items-center gap-2 font-bold text-sm"
          >
            <ArrowLeft size={16} />
            {language === 'en' ? 'Back' : 'ପଛକୁ ଫେରନ୍ତୁ'}
          </button>
          
          {/* Glowing equipped avatar */}
          <div className="relative flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400/40 to-emerald-400/30 border-4 border-emerald-400 shadow-[0_0_30px_5px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden animate-pulse-slow">
              <img src={user.avatar || '/gundulu-v3.png'} alt="Avatar" className="w-20 h-20 rounded-full border border-white/10 shadow-xl object-cover" />
            </div>
            <span className="mt-2 text-xs font-black text-white bg-emerald-500/30 px-3 py-1 rounded-full border border-emerald-500/20 shadow uppercase tracking-wider">
              {language === 'en' ? 'Equipped' : 'ସଜ୍ଜିତ'}
            </span>
          </div>

          <div className="flex-1 text-center md:text-left space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {language === 'en' ? 'Avatar Pavilion' : 'ଅବତାର ମଣ୍ଡପ'}
            </h2>
            <p className="text-slate-300 text-xs">
              {language === 'en' ? 'Personalize your learning profile with premium local and anime characters!' : 'ପ୍ରିମିୟମ କାର୍ଟୁନ୍ ଏବଂ ଆନିମେ ଅବତାର ସହିତ ଆପଣଙ୍କର ପ୍ରୋଫାଇଲ୍ ସଜାନ୍ତୁ!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/80 border border-emerald-500/30 px-6 py-4 rounded-3xl shadow-lg shadow-emerald-950/40 backdrop-blur-xl shrink-0 self-center md:self-auto min-w-[200px]">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
            <Coins size={28} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
              {language === 'en' ? 'Utkal Coins' : 'ଉତ୍କଳ କଏନ'}
            </p>
            <p className="text-3xl font-black text-white tracking-tighter">{user.points || 0}</p>
          </div>
        </div>
      </motion.div>

      {/* Featured Companion Card (Gundulu Default) */}
      <motion.div 
        variants={itemVariants}
        className="glass-card bg-gradient-to-r from-amber-600/20 via-slate-900/40 to-amber-700/10 border-2 border-amber-500/30 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden"
      >
        {/* Glow backdrop */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Spotlight pedestal for Gundulu */}
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0 group">
          {/* Spotlight beams */}
          <div className="absolute -top-6 w-28 h-36 bg-gradient-to-b from-amber-500/10 to-transparent rounded-full blur-xl opacity-60 pointer-events-none" />
          
          {/* 3D Pedestal Base */}
          <div className="absolute bottom-2 w-32 h-6 bg-slate-950/90 rounded-[50%] border-t-2 border-amber-500 shadow-[0_6px_30px_rgba(245,158,11,0.4)] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/30 to-transparent opacity-80" />
          </div>
          
          <img 
            src={defaultAvatar.url} 
            alt={defaultAvatar.name} 
            className="w-28 h-28 object-contain z-10 transition-transform duration-500 group-hover:-translate-y-2 drop-shadow-[0_12px_20px_rgba(0,0,0,0.7)]"
          />
        </div>

        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/30">
              {defaultAvatar.badge}
            </span>
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">{defaultAvatar.name}</h3>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
            {language === 'en' 
              ? 'Meet Gundulu, your official AI learning companion! Always free and available to guide you through your educational journey.' 
              : 'ଗୁଣ୍ଡୁଲୁ ଆପଣଙ୍କର ଅଫିସିଆଲ୍ AI ଶିକ୍ଷା ସାଥୀ! ଆପଣଙ୍କ ଶିକ୍ଷା ଯାତ୍ରାରେ ମାର୍ଗଦର୍ଶନ କରିବାକୁ ସର୍ବଦା ମାଗଣା ଏବଂ ଉପଲବ୍ଧ।'}
          </p>
        </div>

        <div className="shrink-0">
          {user.avatar === defaultAvatar.url ? (
            <div className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={18} />
              {language === 'en' ? 'Companion Equipped' : 'ସାଥୀ ସଜ୍ଜିତ'}
            </div>
          ) : (
            <button
              disabled={purchasing === defaultAvatar.id}
              onClick={() => handlePurchase(defaultAvatar)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-amber-950/40 flex items-center gap-2"
            >
              {purchasing === defaultAvatar.id ? (
                <Sparkles className="animate-spin" size={18} />
              ) : (
                <>
                  <Sparkles size={18} />
                  {language === 'en' ? 'Equip Gundulu' : 'ଗୁଣ୍ଡୁଲୁ ସଜାନ୍ତୁ'}
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Category Tab Selector */}
      <motion.div variants={itemVariants} className="flex flex-col items-center space-y-4">
        <div className="bg-slate-950/80 border border-white/5 p-1.5 rounded-2xl flex w-full max-w-md shadow-2xl backdrop-blur-xl">
          <button
            onClick={() => setActiveCategory('primary')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
              activeCategory === 'primary'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'en' ? 'Class 1-5 (Cartoons)' : 'ଶ୍ରେଣୀ ୧-୫ (କାର୍ଟୁନ୍)'}
          </button>
          <button
            onClick={() => setActiveCategory('secondary')}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
              activeCategory === 'secondary'
                ? 'bg-gradient-to-r from-cyan-600 to-violet-600 text-white shadow-lg shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'en' ? 'Class 6-10 (Anime & Gaming)' : 'ଶ୍ରେଣୀ ୬-୧୦ (ଆନିମେ)'}
          </button>
        </div>
      </motion.div>

      {/* Main Avatar Showcase Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredAvatars.map((avatar) => {
          const isEquipped = user.avatar === avatar.url;
          const isOwned = userOwnedList.includes(avatar.id);
          const canAfford = (user.points || 0) >= avatar.price;
          
          const isSecondary = avatar.group === 'secondary';
          
          return (
            <motion.div
              key={avatar.id}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className={`group relative glass-card rounded-[2.5rem] p-6 flex flex-col items-center text-center transition-all duration-300 border-2 ${
                isEquipped 
                  ? isSecondary ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_25px_rgba(6,182,212,0.15)]' : 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                  : 'border-white/5 hover:border-white/20'
              }`}
            >
              {/* Badge */}
              <div className={`absolute top-4 left-4 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isSecondary 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {avatar.badge}
              </div>

              {isEquipped && (
                <div className={`absolute top-4 right-4 p-1 rounded-full ${
                  isSecondary ? 'text-cyan-400 bg-cyan-500/10' : 'text-emerald-400 bg-emerald-500/10'
                }`}>
                  <CheckCircle2 size={16} />
                </div>
              )}
              
              {/* 3D Spotlight Pedestal */}
              <div className="relative w-full h-36 flex items-center justify-center mb-4 mt-2">
                {/* 3D Pedestal Base */}
                <div className={`absolute bottom-2 w-24 h-5 bg-slate-950/80 rounded-[50%] border-t flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  isSecondary 
                    ? 'border-cyan-500/40 shadow-[0_4px_15px_rgba(6,182,212,0.25)] group-hover:shadow-[0_4px_25px_rgba(6,182,212,0.45)]' 
                    : 'border-emerald-500/40 shadow-[0_4px_15px_rgba(16,185,129,0.25)] group-hover:shadow-[0_4px_25px_rgba(16,185,129,0.45)]'
                }`}>
                  <div className={`absolute inset-0 bg-gradient-to-t opacity-60 ${
                    isSecondary ? 'from-cyan-500/20' : 'from-emerald-500/20'
                  }`} />
                </div>
                
                {/* Spotlight ray */}
                <div className={`absolute bottom-3 w-20 h-24 bg-gradient-to-t to-transparent rounded-b-full blur-md opacity-30 group-hover:opacity-75 transition-all duration-500 pointer-events-none ${
                  isSecondary ? 'from-cyan-500/15' : 'from-emerald-500/15'
                }`} />
                
                {/* Floating Avatar image */}
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-24 h-24 object-contain z-10 transition-transform duration-500 ease-out group-hover:-translate-y-3 group-hover:scale-105 drop-shadow-[0_8px_15px_rgba(0,0,0,0.5)]"
                />

                {/* Lock overlay for unpurchased & unaffordable */}
                {!isOwned && !canAfford && (
                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] rounded-full flex items-center justify-center text-slate-400 z-20">
                    <Lock size={24} className="text-slate-500" />
                  </div>
                )}
              </div>

              <h3 className="text-base font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                {avatar.name}
              </h3>
              
              <div className="flex items-center gap-1.5 mb-5">
                <Coins size={14} className="text-amber-400" />
                {isOwned ? (
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    {language === 'en' ? 'Unlocked' : 'ଅନଲକ୍ଡ'}
                  </span>
                ) : (
                  <span className={`text-sm font-black ${canAfford ? 'text-white' : 'text-red-400'}`}>
                    {avatar.price}
                  </span>
                )}
              </div>

              <button
                disabled={isEquipped || (!isOwned && !canAfford) || purchasing === avatar.id}
                onClick={() => handlePurchase(avatar)}
                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isEquipped 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default' 
                    : isOwned
                      ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-lg active:scale-95 border border-white/5'
                      : canAfford 
                        ? isSecondary 
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/30 active:scale-95' 
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/30 active:scale-95' 
                        : 'bg-slate-900/60 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                {purchasing === avatar.id ? (
                  <Sparkles className="animate-spin" size={16} />
                ) : isEquipped ? (
                  language === 'en' ? 'Equipped' : 'ସଜ୍ଜିତ'
                ) : isOwned ? (
                  language === 'en' ? 'Equip' : 'ସଜାନ୍ତୁ'
                ) : (
                  <>
                    <ShoppingBag size={14} />
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
                    className="absolute -bottom-10 left-0 right-0 text-emerald-400 text-[10px] font-bold"
                  >
                    Successfully Equipped! ✨
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Info/Earning Banner */}
      <motion.div variants={itemVariants} className="p-8 glass-card rounded-[2.5rem] bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-white/10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl">
          <Star size={32} className="animate-pulse" />
        </div>
        <div className="flex-1 text-center md:text-left space-y-1">
          <h4 className="text-lg font-black text-white">
            {language === 'en' ? 'Need more Utkal Coins?' : 'ଉତ୍କଳ କଏନ ଆବଶ୍ୟକ କି?'}
          </h4>
          <p className="text-slate-300 text-xs leading-relaxed">
            {language === 'en'
              ? 'Answer Daily MCQs, complete chapter tests, and keep up your daily streak to earn bonus coins!'
              : 'ଦୈନିକ MCQ ର ଉତ୍ତର ଦିଅନ୍ତୁ, ଅଧ୍ୟାୟ ପରୀକ୍ଷା ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ ଏବଂ ବୋନସ୍ କଏନ୍ ଅର୍ଜନ କରିବାକୁ ଆପଣଙ୍କର ଦୈନିକ ଅଧ୍ୟୟନ ସିରିଜ୍ ଜାରି ରଖନ୍ତୁ!'}
          </p>
        </div>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl transition-all shadow-xl active:scale-95"
        >
          {language === 'en' ? 'Start Learning' : 'ପଢିବା ଆରମ୍ଭ କରନ୍ତୁ'}
        </button>
      </motion.div>
    </motion.div>
  );
}
