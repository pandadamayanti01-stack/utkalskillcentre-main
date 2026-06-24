import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Lucide from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import confetti from 'canvas-confetti';

interface GiftUnlockModalProps {
  user: any;
  language: 'en' | 'or';
  onClose: () => void;
  onClaimSuccess: (ticketDoc: any) => void;
  existingTicket?: any;
  rank?: number | null;
  claimTag?: string;
}

export const GiftUnlockModal: React.FC<GiftUnlockModalProps> = ({
  user,
  language,
  onClose,
  onClaimSuccess,
  existingTicket,
  rank,
  claimTag: propClaimTag
}) => {
  const [step, setStep] = useState<'closed' | 'opening' | 'opened' | 'form' | 'success'>('closed');
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    classVal: user?.class || '',
    upiVal: '',
    parentPhone: user?.phoneNumber || user?.phone || ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Resolve rank (either passed as prop, or determined from name for fallback)
  let resolvedRank = rank;
  if (resolvedRank === undefined || resolvedRank === null) {
    const userNameLower = (user?.name || '').trim().toLowerCase();
    if (userNameLower.includes('dibyansh') || userNameLower.includes('sohan') || userNameLower.includes('subhakanta')) {
      resolvedRank = 1;
    } else if (userNameLower.includes('rohan')) {
      resolvedRank = 2;
    } else if (userNameLower.includes('sujata')) {
      resolvedRank = 3;
    } else if (userNameLower.includes('anik')) {
      resolvedRank = 4;
    } else {
      resolvedRank = 5;
    }
  }

  let prizeAmount = 0;
  let rewardNameEn = '';
  let rewardNameOr = '';
  let rewardItemsEn: string[] = [];
  let rewardItemsOr: string[] = [];
  let boxColor = 'from-amber-500 to-yellow-300';
  let boxGlow = 'rgba(245,158,11,0.4)';

  const userNameLower = (user?.name || '').trim().toLowerCase();
  const isSubhakanta = userNameLower.includes('subhakanta');

  if (isSubhakanta) {
    prizeAmount = 100;
    rewardNameEn = 'USC Special Motivation Reward';
    rewardNameOr = 'USC ସ୍ପେଶାଲ ପ୍ରେରଣାଦାୟକ ପୁରସ୍କାର';
    rewardItemsEn = ['📓 Special USC Notebook', '✨ Sticker Pack'];
    rewardItemsOr = ['📓 ସ୍ପେଶାଲ USC ନୋଟବୁକ', '✨ ଷ୍ଟିକର ପ୍ୟାକ୍'];
    boxColor = 'from-purple-500 via-pink-400 to-indigo-600';
    boxGlow = 'rgba(168,85,247,0.5)';
  } else if (resolvedRank === 1) {
    prizeAmount = 500;
    rewardNameEn = 'USC Class Champion Reward';
    rewardNameOr = 'USC କ୍ଲାସ୍ ଚାମ୍ପିଅନ ପୁରସ୍କାର';
    rewardItemsEn = ['🏆 USC Gold Medal', '📚 Premium Reference Book Set', '⚡ Free Monthly AI Subscription (worth ₹99)', '🎖️ Achiever Pin Badge', '✨ Sticker Pack'];
    rewardItemsOr = ['🏆 USC ସୁବର୍ଣ୍ଣ ପଦକ', '📚 ପ୍ରିମିୟମ ପୁସ୍ତକ ସେଟ୍', '⚡ ମାସିକ ମାଗଣା AI ସବସ୍କ୍ରିପସନ (ମୂଲ୍ୟ ₹୯୯)', '🎖️ କୃତିତ୍ୱ ପିନ ବ୍ୟାଜ୍', '✨ ଷ୍ଟିକର ପ୍ୟାକ୍'];
    boxColor = 'from-amber-400 via-yellow-400 to-amber-600';
    boxGlow = 'rgba(251,191,36,0.6)';
  } else if (resolvedRank === 2) {
    prizeAmount = 300;
    rewardNameEn = 'USC Class Runner-Up Reward';
    rewardNameOr = 'USC କ୍ଲାସ୍ ରନର୍ସ-ଅପ୍ ପୁରସ୍କାର';
    rewardItemsEn = ['🥈 USC Silver Medal', '📚 Reference Book', '⚡ Free Monthly AI Subscription (worth ₹99)', '🎖️ Achiever Pin Badge', '✨ Sticker Pack'];
    rewardItemsOr = ['🥈 USC ରୌପ୍ୟ ପଦକ', '📚 ସନ୍ଦର୍ଭ ପୁସ୍ତକ', '⚡ ମାସିକ ମାଗଣା AI ସବସ୍କ୍ରିପସନ (ମୂଲ୍ୟ ₹୯୯)', '🎖️ କୃତିତ୍ୱ ପିନ ବ୍ୟାଜ୍', '✨ ଷ୍ଟିକର ପ୍ୟାକ୍'];
    boxColor = 'from-slate-300 via-slate-100 to-slate-500';
    boxGlow = 'rgba(226,232,240,0.5)';
  } else if (resolvedRank === 3) {
    prizeAmount = 200;
    rewardNameEn = 'USC Class Second Runner-Up Reward';
    rewardNameOr = 'USC କ୍ଲାସ୍ ଦ୍ୱିତୀୟ ରନର୍ସ-ଅପ୍ ପୁରସ୍କାର';
    rewardItemsEn = ['🥉 USC Bronze Medal', '📚 Reference Book', '⚡ Free Monthly AI Subscription (worth ₹99)', '✨ Sticker Pack'];
    rewardItemsOr = ['🥉 USC କାଂସ୍ୟ ପଦକ', '📚 ସନ୍ଦର୍ଭ ପୁସ୍ତକ', '⚡ ମାସିକ ମାଗଣା AI ସବସ୍କ୍ରିପସନ (ମୂଲ୍ୟ ₹୯୯)', '✨ ଷ୍ଟିକର ପ୍ୟାକ୍'];
    boxColor = 'from-amber-700 via-amber-600 to-yellow-800';
    boxGlow = 'rgba(180,83,9,0.5)';
  } else if (resolvedRank === 4) {
    prizeAmount = 0;
    rewardNameEn = 'USC AI Scholar Reward';
    rewardNameOr = 'USC AI ସ୍କଲାର୍ ପୁରସ୍କାର';
    rewardItemsEn = ['⚡ Free Monthly AI Subscription (worth ₹99)', '📓 Special USC Notebook', '✨ Sticker Pack'];
    rewardItemsOr = ['⚡ ମାସିକ ମାଗଣା AI ସବସ୍କ୍ରିପସନ (ମୂଲ୍ୟ ₹୯୯)', '📓 ସ୍ପେଶାଲ USC ନୋଟବୁକ', '✨ ଷ୍ଟିକର ପ୍ୟାକ୍'];
    boxColor = 'from-emerald-400 via-teal-300 to-emerald-600';
    boxGlow = 'rgba(16,185,129,0.5)';
  } else {
    // Rank 5
    prizeAmount = 0;
    rewardNameEn = 'USC AI Scholar Reward';
    rewardNameOr = 'USC AI ସ୍କଲାର୍ ପୁରସ୍କାର';
    rewardItemsEn = ['⚡ Free Monthly AI Subscription (worth ₹99)', '📓 Special USC Notebook', '✨ Sticker Pack'];
    rewardItemsOr = ['⚡ ମାସିକ ମାଗଣା AI ସବସ୍କ୍ରିପସନ (ମୂଲ୍ୟ ₹୯୯)', '📓 ସ୍ପେଶାଲ USC ନୋଟବୁକ', '✨ ଷ୍ଟିକର ପ୍ୟାକ୍'];
    boxColor = 'from-purple-500 via-pink-400 to-indigo-600';
    boxGlow = 'rgba(168,85,247,0.5)';
  }

  // Parse existing ticket message if user is editing details
  useEffect(() => {
    if (existingTicket && existingTicket.message) {
      const msg = existingTicket.message;
      const nameMatch = msg.match(/Name:\s*([^,]+)/);
      const classMatch = msg.match(/Class:\s*([^,]+)/);
      const upiMatch = msg.match(/UPI\/PhonePe\/GPay:\s*([^,]+)/);
      const phoneMatch = msg.match(/Parent Phone:\s*([^,]+)/);

      setFormData({
        fullName: nameMatch ? nameMatch[1].trim() : (user?.name || ''),
        classVal: classMatch ? classMatch[1].trim() : (user?.class || ''),
        upiVal: upiMatch ? upiMatch[1].trim() : '',
        parentPhone: phoneMatch ? phoneMatch[1].trim() : (user?.phoneNumber || user?.phone || '')
      });
      setStep('form');
    }
  }, [existingTicket, user]);

  const handleOpenBox = () => {
    setStep('opening');
    setTimeout(() => {
      setStep('opened');
      // Confetti burst!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }, 1200);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setErrorMsg(language === 'en' ? 'Full Name is required' : 'ପୂର୍ଣ୍ଣ ନାମ ଆବଶ୍ୟକ');
      return;
    }
    if (prizeAmount > 0 && !formData.upiVal.trim()) {
      setErrorMsg(language === 'en' ? 'UPI ID or GPay/PhonePe number is required' : 'UPI ID କିମ୍ବା GPay/PhonePe ନମ୍ବର ଆବଶ୍ୟକ');
      return;
    }
    if (!formData.parentPhone.trim()) {
      setErrorMsg(language === 'en' ? 'Parent phone number is required' : 'ପିତାମାତାଙ୍କ ଫୋନ୍ ନମ୍ବର ଆବଶ୍ୟକ');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const activeDate = new Date();
      const activeMonthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'Asia/Kolkata' }).format(activeDate);
      const activeYear = activeDate.getFullYear();
      const claimTag = propClaimTag || `[MTS_CLAIM:${activeMonthName.toLowerCase()}_${activeYear}]`;
      
      const upiPart = prizeAmount > 0 ? `, UPI/PhonePe/GPay: ${formData.upiVal}` : '';
      const ticketMessage = `${claimTag} Name: ${formData.fullName}, Class: ${formData.classVal}${upiPart}, Parent Phone: ${formData.parentPhone}, Prize: ₹${prizeAmount}, Reward Tier: ${rewardNameEn}`;
      
      // Auto-activate the free 1-month AI subscription in Firestore
      const expiresAtDate = new Date();
      expiresAtDate.setMonth(expiresAtDate.getMonth() + 1); // 1 month free subscription
      
      const subRef = doc(db, 'subscriptions', user.id || user.uid);
      try {
        await setDoc(subRef, {
          active: true,
          expires_at: expiresAtDate,
          plan: 'AI Premium (USC Reward)',
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Automatically activated USC Reward AI Subscription for:", user.id || user.uid);
      } catch (subErr) {
        console.warn("Failed to activate AI subscription in database:", subErr);
      }

      if (existingTicket && existingTicket.id) {
        // Update existing ticket
        await updateDoc(doc(db, 'support_tickets', existingTicket.id), {
          message: ticketMessage,
          updatedAt: serverTimestamp()
        });
        setStep('success');
        onClaimSuccess({ ...existingTicket, message: ticketMessage });
      } else {
        // Create new ticket
        const docRef = await addDoc(collection(db, 'support_tickets'), {
          userId: user.id || user.uid || '',
          userName: user.name || 'Winner Student',
          userPhone: user.phoneNumber || user.phone || '',
          userEmail: user.email || '',
          message: ticketMessage,
          status: 'open',
          createdAt: serverTimestamp()
        });
        setStep('success');
        onClaimSuccess({ id: docRef.id, message: ticketMessage, status: 'open' });
      }
    } catch (err: any) {
      console.error("Failed to submit claim ticket:", err);
      setErrorMsg(language === 'en' ? 'Submission failed. Please try again.' : 'ସବମିଟ୍ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Background radial gold glow */}
      <div 
        style={{ boxShadow: `0 0 160px 40px ${boxGlow}` }}
        className="absolute w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none z-0" 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden text-center force-dark-theme"
      >
        {/* Closed / Opening state close button */}
        {(step === 'closed' || step === 'opened' || step === 'success' || existingTicket) && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer z-20"
          >
            <Lucide.X size={16} />
          </button>
        )}

        {step === 'closed' && (
          <div className="space-y-6 py-6">
            <div className="flex flex-col items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <Lucide.Trophy size={11} className="animate-bounce" />
                {language === 'or' ? 'ପୁରସ୍କାର ବିଜେତା' : 'MONTHLY TEST WINNER'}
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                {language === 'or' ? 'ଅପେକ୍ଷା ଶେଷ ହେଲା!' : 'WAIT IS OVER!'}
              </h2>
              <p className="text-xs text-slate-400 font-medium max-w-sm leading-relaxed mt-2">
                {language === 'or'
                  ? 'ଆପଣଙ୍କର ଚମତ୍କାର ମଇ ମାସର ପରୀକ୍ଷା ଫଳାଫଳ ପାଇଁ ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କ ପାଇଁ ଏକ ସ୍ପେଶାଲ ଉପହାର ରଖିଛନ୍ତି।'
                  : 'You have a special mystery gift box waiting for your excellent performance in the May Month Test Series!'}
              </p>
            </div>

            {/* Glowing Interactive Mystery Box */}
            <div className="relative py-8 flex justify-center items-center">
              <motion.div
                animate={{
                  y: [-8, 8, -8],
                  rotate: [-1, 1, -1]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                onClick={handleOpenBox}
                style={{ cursor: 'pointer' }}
                className={`w-36 h-36 bg-gradient-to-tr ${boxColor} rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(245,158,11,0.2)] flex flex-col items-center justify-center border border-white/20 relative group overflow-hidden`}
              >
                {/* Gold Bow Ribbon Ribbon */}
                <div className="absolute inset-x-0 top-[44%] bottom-[44%] bg-slate-900 border-y border-amber-400/20 shadow-md"></div>
                <div className="absolute inset-y-0 left-[44%] right-[44%] bg-slate-900 border-x border-amber-400/20 shadow-md"></div>
                
                {/* Shiny reflex */}
                <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
                
                {/* Center Bow Knot */}
                <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center relative z-10 shadow-lg">
                  <Lucide.Gift size={20} className="text-amber-400 animate-pulse" />
                </div>
              </motion.div>

              {/* Sparkle background effects */}
              <div className="absolute inset-0 flex justify-around pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/30 animate-ping self-start mt-6"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-400/20 animate-ping self-end mb-6"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300/40 animate-ping self-center"></span>
              </div>
            </div>

            <button
              onClick={handleOpenBox}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-600 hover:scale-[1.03] active:scale-[0.97] text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-500/20 border border-amber-400/20"
            >
              {language === 'or' ? 'ବାକ୍ସ ଖୋଲନ୍ତୁ' : 'Tap to Open Box'}
            </button>
          </div>
        )}

        {step === 'opening' && (
          <div className="py-16 space-y-6">
            <motion.div
              animate={{
                x: [-10, 10, -10, 10, -5, 5, -5, 5, 0],
                y: [-5, 5, -5, 5, -2, 2, -2, 2, 0],
                scale: [1, 1.1, 1, 1.15, 1, 1.2, 1],
                rotate: [-5, 5, -5, 5, -3, 3, 0]
              }}
              transition={{
                duration: 1.2,
                ease: "easeInOut"
              }}
              className={`w-32 h-32 mx-auto bg-gradient-to-tr ${boxColor} rounded-[2rem] shadow-2xl flex items-center justify-center relative border border-white/20`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center z-10">
                <Lucide.Sparkles size={16} className="text-amber-400" />
              </div>
            </motion.div>
            <p className="text-xs font-black text-amber-400 uppercase tracking-widest animate-pulse">
              {language === 'or' ? 'ବାକ୍ସ ଖୋଲାଯାଉଛି...' : 'Unlocking prize hamper...'}
            </p>
          </div>
        )}

        {step === 'opened' && (
          <div className="space-y-6 py-4 animate-in zoom-in-95 duration-500">
            <div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                {language === 'or' ? 'ପୁରସ୍କାର ଉନ୍ମୋଚିତ!' : 'PRIZE UNLOCKED!'}
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase mt-3">
                {language === 'or' ? rewardNameOr : rewardNameEn}
              </h3>
            </div>

            {/* Reward Card */}
            {prizeAmount > 0 ? (
              <div className="bg-slate-950/60 border border-white/5 rounded-3xl p-5 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Lucide.Coins size={100} className="text-amber-400" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    {language === 'or' ? 'ଉପହାର ରାଶି' : 'CASH REWARD'}
                  </p>
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 font-mono">
                    ₹{prizeAmount}
                  </p>
                  <div className="h-[1px] w-1/2 bg-white/5 my-3"></div>
                  <div className="w-full text-left space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">
                      {language === 'or' ? 'ଉପହାର ସାମଗ୍ରୀ ସମୂହ' : 'HAMPER INCLUDES'}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 max-w-xs mx-auto">
                      {(language === 'or' ? rewardItemsOr : rewardItemsEn).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                          <span className="shrink-0">{item.split(' ')[0]}</span>
                          <span>{item.split(' ').slice(1).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-white/5 rounded-3xl p-5 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Lucide.Sparkles size={100} className="text-emerald-400 animate-pulse" />
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    {language === 'or' ? 'ପ୍ରିମିୟମ ସଭ୍ୟପଦ' : 'PREMIUM ACCESS'}
                  </p>
                  <p className="text-lg sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 uppercase tracking-wide">
                    {language === 'or' ? 'ମାଗଣା AI ସବସ୍କ୍ରିପସନ' : 'FREE AI SUBSCRIPTION'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {language === 'or' ? 'ମୂଲ୍ୟ ₹୯୯/ମାସ' : 'Worth ₹99/month'}
                  </p>
                  <div className="h-[1px] w-1/2 bg-white/5 my-3"></div>
                  <div className="w-full text-left space-y-2">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">
                      {language === 'or' ? 'ଉପହାର ସାମଗ୍ରୀ ସମୂହ' : 'HAMPER INCLUDES'}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 max-w-xs mx-auto">
                      {(language === 'or' ? rewardItemsOr : rewardItemsEn).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                          <span className="shrink-0">{item.split(' ')[0]}</span>
                          <span>{item.split(' ').slice(1).join(' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                {language === 'or' ? 'ପରେ ଦେଖିବା' : 'Maybe Later'}
              </button>
              
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/20 border border-emerald-400/20"
              >
                {language === 'or' ? 'କ୍ଲେମ ପୁରସ୍କାର' : 'Claim Prize'}
              </button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-6 text-left animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">
                {language === 'or' ? 'କ୍ଲେମ ବିବରଣୀ' : 'Claim Payout Details'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {language === 'or'
                  ? 'ପୁରସ୍କାର ରାଶି ₹' + prizeAmount + ' ଆପଣଙ୍କ UPI କିମ୍ବା ବ୍ୟାଙ୍କ ଖାତାକୁ ପଠାଇବା ପାଇଁ ନିମ୍ନ ବିବରଣୀ ପୂରଣ କରନ୍ତୁ।'
                  : `Submit your GPay, PhonePe, or UPI ID to redeem your ₹${prizeAmount} cash prize.`}
              </p>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {language === 'or' ? 'ପୂର୍ଣ୍ଣ ନାମ' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-amber-500/30 transition-all font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'or' ? 'ଶ୍ରେଣୀ' : 'Class'}
                  </label>
                  <input
                    type="text"
                    value={formData.classVal}
                    onChange={(e) => setFormData(prev => ({ ...prev, classVal: e.target.value }))}
                    placeholder="Class"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-amber-500/30 transition-all font-bold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'or' ? 'ମୋବାଇଲ ନମ୍ବର' : 'Parent Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                    placeholder="Parent Phone Number"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-amber-500/30 transition-all font-bold text-sm"
                  />
                </div>
              </div>

              {prizeAmount > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'or' ? 'UPI ID କିମ୍ବା GPay/PhonePe ନମ୍ବର' : 'UPI ID or GPay/PhonePe Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.upiVal}
                    onChange={(e) => setFormData(prev => ({ ...prev, upiVal: e.target.value }))}
                    placeholder="e.g. name@upi or 9876543210@ybl"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-amber-500/30 transition-all font-bold text-sm placeholder:text-slate-600"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-center">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (existingTicket) {
                      onClose();
                    } else {
                      setStep('opened');
                    }
                  }}
                  className="flex-1 px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  {existingTicket ? (language === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Cancel') : (language === 'or' ? 'ପଛକୁ ଯାଆନ୍ତୁ' : 'Back')}
                </button>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/20 border border-emerald-400/20 disabled:opacity-50 text-center"
                >
                  {submitting ? (
                    <Lucide.RefreshCw size={14} className="animate-spin mx-auto" />
                  ) : (
                    language === 'or' ? 'କ୍ଲେମ କରନ୍ତୁ' : 'Claim Now'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 py-6 animate-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Lucide.CheckCircle size={32} className="text-emerald-400 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                {language === 'or' ? 'ଅନୁରୋଧ ଗ୍ରହଣ ହେଲା!' : 'CLAIM REQUEST SENT!'}
              </h3>
              <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                {prizeAmount > 0 ? (
                  language === 'or'
                    ? 'ଆପଣଙ୍କର ପୁରସ୍କାର ଅନୁରୋଧ ଆଡମିନଙ୍କ ପାଖକୁ ପଠାଯାଇଛି। ଆଡମିନ ଯାଞ୍ଚ କରି ଆପଣଙ୍କ UPI ନମ୍ବର କିମ୍ବା ଖାତାକୁ ତୁରନ୍ତ ଟଙ୍କା ପଠାଇଦେବେ।'
                    : 'Your prize claim request has been sent to the Admin. The cash prize will be transferred to your account shortly.'
                ) : (
                  language === 'or'
                    ? 'ଆପଣଙ୍କର ପୁରସ୍କାର ଅନୁରୋଧ ଗ୍ରହଣ କରାଯାଇଛି! ଆପଣଙ୍କ ଆକାଉଣ୍ଟରେ ୧ ମାସର ମାଗଣା AI ସବସ୍କ୍ରିପସନ ତୁରନ୍ତ ସକ୍ରିୟ ହୋଇଯାଇଛି ଏବଂ ଆପଣଙ୍କ ନୋଟବୁକ୍ ପଠାଇବା ପାଇଁ ଆମେ ଯୋଗାଯୋଗ କରିବୁ।'
                    : 'Your reward request has been received! Your 1-Month Free AI Subscription has been activated instantly on your account, and we will contact you to ship your notebook.'
                )}
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              {language === 'or' ? 'ଡ୍ୟାସବୋର୍ଡକୁ ଫେରନ୍ତୁ' : 'Back to Dashboard'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
