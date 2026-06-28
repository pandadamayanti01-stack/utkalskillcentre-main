import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { jsPDF } from 'jspdf';

interface GoldenTicketProps {
  user: any;
  language: 'en' | 'or';
  onClose: () => void;
}

export const GoldenTicket: React.FC<GoldenTicketProps> = ({
  user,
  language,
  onClose
}) => {
  const [downloading, setDownloading] = useState(false);

  // Level & badge calculation rules (aligned with Dashboard.tsx)
  const isTestAccount = user?.phoneNumber === '+911234567890' || user?.phone === '+911234567890' || user?.phoneNumber === '1234567890' || user?.phone === '1234567890';
  const name = (user?.name && user.name !== 'Student' && user.name !== 'Student Achiever') ? user.name : (isTestAccount ? 'Anuradha Panda' : 'Student Achiever');
  const points = Math.max(user?.points || 0, user?.points_today || 0) || (isTestAccount ? 850 : 0);
  const level = Math.floor(points / 100) + 1;
  const streak = user?.streak || (isTestAccount ? 14 : 0);
  const district = user?.district || (isTestAccount ? 'Khordha' : 'Odisha');
  const school = user?.school || (isTestAccount ? 'Bhubaneswar Govt High School' : 'Utkal High School');

  let badgeTitle = 'Curious Learner';
  let badgeTitleOdia = 'ଜିଜ୍ଞାସୁ ଛାତ୍ର';
  let badgeIcon = '🔍';

  if (level >= 10) {
    badgeTitle = 'Gundulu Legend';
    badgeTitleOdia = 'ଗୁନ୍ଦୁଲୁ ମହାରଥୀ';
    badgeIcon = '👑';
  } else if (level >= 7) {
    badgeTitle = 'Odia Math Master';
    badgeTitleOdia = 'ଗଣିତ ସମ୍ରାଟ';
    badgeIcon = '📐';
  } else if (level >= 5) {
    badgeTitle = 'Syllabus Conqueror';
    badgeTitleOdia = 'ପାଠ୍ୟକ୍ରମ ବିଜେତା';
    badgeIcon = '⚔️';
  } else if (level >= 3) {
    badgeTitle = 'Gundulu Scholar';
    badgeTitleOdia = 'ଗୁନ୍ଦୁଲୁ ପଣ୍ଡିତ';
    badgeIcon = '🎓';
  }

  const activeBadge = language === 'en' ? `${badgeIcon} ${badgeTitle}` : `${badgeIcon} ${badgeTitleOdia}`;
  const currentDate = new Date().toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleDownload = () => {
    setDownloading(true);
    try {
      const svg = document.getElementById('golden-ticket-svg');
      if (!svg) throw new Error("SVG element not found");

      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const urlHelper = window.URL || (window as any).webkitURL;
      const blobURL = urlHelper.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600; // High resolution
        canvas.height = 1000;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#020617'; // Match background
          context.fillRect(0, 0, 1600, 1000);
          context.drawImage(image, 0, 0, 1600, 1000);
          
          const png = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [800, 500]
          });
          pdf.addImage(png, 'PNG', 0, 0, 800, 500);
          pdf.save(`${name}_Gundulu_Golden_Ticket.pdf`);
        }
        urlHelper.revokeObjectURL(blobURL);
        setDownloading(false);
      };
      image.src = blobURL;
    } catch (err) {
      console.error("Failed to generate PDF ticket", err);
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-slate-950/80 backdrop-blur-md flex md:items-start items-center justify-center md:pt-8 lg:pt-12 p-4 overflow-y-auto">
      {/* Background radial gold glow */}
      <div className="absolute w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="w-full max-w-[850px] bg-slate-900 border border-amber-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col items-center p-6 relative z-10"
      >
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer z-20"
        >
          <Lucide.X size={18} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5 mt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <Lucide.Trophy size={11} className="animate-bounce" />
            {language === 'or' ? 'ଶିକ୍ଷା ସମ୍ମାନ ଫଳକ' : 'Accredited Achievement'}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            {language === 'or' ? 'ଆପଣଙ୍କର ସ୍ୱର୍ଣ୍ଣ ପତ୍ର କ୍ଲେମ କରନ୍ତୁ' : 'Your Golden Ticket Achievement'}
          </h2>
          <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto leading-relaxed mt-1">
            {language === 'or' 
              ? 'ସଫଳତାର ସହିତ ଅଭ୍ୟାସ ସରିବା ପରେ ଗୁନ୍ଦୁଲୁ ଅପାଙ୍କ ଦ୍ୱାରା ଦିଆଯାଇଥିବା ସାର୍ଟିଫିକେଟ୍ ବର୍ତ୍ତମାନ ଡାଉନଲୋଡ୍ କରନ୍ତୁ।'
              : 'Certified by Gundulu Apa for completing syllabus milestones, streak goals, and daily practice challenges.'}
          </p>
        </div>

        {/* Responsive Container for SVG (scales dynamically on all screen sizes) */}
        <div className="w-full max-w-[700px] aspect-[16/10] border border-amber-500/40 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl relative bg-slate-950 select-none mx-auto">
          <svg
            id="golden-ticket-svg"
            width="800"
            height="500"
            viewBox="0 0 800 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
              {/* Radial gradient background */}
              <rect width="800" height="500" fill="#020617" />
              <circle cx="400" cy="250" r="300" fill="url(#radialGlow)" opacity="0.4" />
              
              <defs>
                <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>

                <linearGradient id="textGold" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>

                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(245, 158, 11, 0.03)" strokeWidth="1" />
                </pattern>
              </defs>

              {/* Grid Background Pattern */}
              <rect width="800" height="500" fill="url(#gridPattern)" />

              {/* Abstract Golden Geometric Curves */}
              <path d="M-100,600 C150,550 200,350 400,450 C600,550 650,450 900,600" stroke="url(#goldGradient)" strokeWidth="0.8" opacity="0.15" fill="none" />
              <path d="M-100,550 C100,480 300,380 400,420 C500,460 700,380 900,550" stroke="url(#goldGradient)" strokeWidth="0.5" opacity="0.1" fill="none" />
              <path d="M-100,-100 C150,150 300,50 400,100 C500,150 650,50 900,-100" stroke="url(#goldGradient)" strokeWidth="0.6" opacity="0.15" fill="none" />

              {/* Borders */}
              <rect x="25" y="25" width="750" height="450" rx="16" fill="none" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.3" />
              <rect x="35" y="35" width="730" height="430" rx="12" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" opacity="0.8" />
              
              {/* Corner Ornaments */}
              <path d="M30,55 L55,55 L55,30" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
              <path d="M770,55 L745,55 L745,30" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
              <path d="M30,445 L55,445 L55,470" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />
              <path d="M770,445 L745,445 L745,470" fill="none" stroke="url(#goldGradient)" strokeWidth="3" />

              {/* Title & Badge logo */}
              <text x="400" y="80" textAnchor="middle" fill="url(#textGold)" fontSize="11" fontWeight="900" letterSpacing="5" fontFamily="system-ui">
                {language === 'or' ? 'ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର • UTKAL SKILL CENTRE' : 'UTKAL SKILL CENTRE • ACHIEVER TICKET'}
              </text>
              <line x1="250" y1="95" x2="550" y2="95" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.3" />

              {/* Achievement Main Header */}
              <text x="400" y="145" textAnchor="middle" fill="#ffffff" fontSize="28" fontWeight="900" letterSpacing="2" fontFamily="system-ui">
                {language === 'or' ? 'ଶିକ୍ଷା ସ୍ୱର୍ଣ୍ଣ ପତ୍ର' : 'GOLDEN ACHIEVEMENT TICKET'}
              </text>

              {/* Sub-text */}
              <text x="400" y="185" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold" fontFamily="system-ui">
                {language === 'or' ? 'ଏହି ସ୍ୱର୍ଣ୍ଣ ପତ୍ର ସଗୌରବେ ପ୍ରମାଣିତ କରୁଅଛି ଯେ' : 'This document proudly certifies that'}
              </text>

              {/* Student Name */}
              <text x="400" y="235" textAnchor="middle" fill="#ffffff" fontSize="32" fontWeight="900" fontFamily="system-ui" fontStyle="normal">
                {name}
              </text>
              <line x1="200" y1="250" x2="600" y2="250" stroke="url(#goldGradient)" strokeWidth="2.5" />

              {/* Description */}
              <text x="400" y="280" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="bold" fontFamily="system-ui">
                {language === 'or'
                  ? 'ପାଠ୍ୟକ୍ରମର ଅଭ୍ୟାସ ସାରି, ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ ଜିତି ଗୁନ୍ଦୁଲୁ ଆପ୍ ପ୍ରଗତି ମାଟ୍ରିକ୍ସରେ ସଫଳତା ପାଇଛନ୍ତି।'
                  : 'has completed active subject challenges and maintained regular learning habits with the Gundulu AI Tutor.'}
              </text>

              {/* Details table / metrics block */}
              {/* Level box */}
              <rect x="180" y="315" width="130" height="50" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <text x="245" y="332" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="system-ui">
                {language === 'or' ? 'ଅଭ୍ୟାସ ସ୍ତର' : 'ACADEMIC LEVEL'}
              </text>
              <text x="245" y="352" textAnchor="middle" fill="#fbbf24" fontSize="15" fontWeight="900" fontFamily="system-ui">
                {language === 'or' ? `ସ୍ତର ${level}` : `Level ${level}`}
              </text>

              {/* Total points box */}
              <rect x="335" y="315" width="130" height="50" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <text x="400" y="332" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="system-ui">
                {language === 'or' ? 'ମୋଟ୍ ପଏଣ୍ଟ' : 'TOTAL SCORE'}
              </text>
              <text x="400" y="352" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="900" fontFamily="system-ui">
                {points} XP
              </text>

              {/* Streak box */}
              <rect x="490" y="315" width="130" height="50" rx="8" fill="rgba(255,255,255,0.03)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
              <text x="555" y="332" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" fontFamily="system-ui">
                {language === 'or' ? 'ସିରିଜ୍ ଦିନ' : 'STREAK DAYS'}
              </text>
              <text x="555" y="352" textAnchor="middle" fill="#f97316" fontSize="15" fontWeight="900" fontFamily="system-ui">
                {streak} {language === 'or' ? 'ଦିନ' : 'Days'}
              </text>

              {/* Badge/Rank line info */}
              <text x="400" y="390" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold" letterSpacing="1" fontFamily="system-ui">
                {language === 'or' ? `ବିଦ୍ୟାର୍ଥୀ ଉପାଧି: ${activeBadge}` : `Scholar Rank: ${activeBadge}`}
              </text>

              {/* Signatures & Footer details */}
              {/* Issued Date */}
              <text x="120" y="420" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="system-ui">DATE ISSUED</text>
              <text x="120" y="438" fill="#e2e8f0" fontSize="11" fontWeight="bold" fontFamily="system-ui">{currentDate}</text>

              {/* District */}
              <text x="320" y="420" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="system-ui">REGIONAL BASE</text>
              <text x="320" y="438" fill="#cbd5e1" fontSize="11" fontWeight="bold" fontFamily="system-ui">{district}</text>

              {/* Gundulu Signature Seal */}
              <g transform="translate(620, 395)">
                {/* Outer Seal ring */}
                <circle cx="40" cy="40" r="32" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" opacity="0.6" strokeDasharray="3 3" />
                <circle cx="40" cy="40" r="28" fill="rgba(245, 158, 11, 0.05)" stroke="url(#goldGradient)" strokeWidth="1" />
                
                {/* Signature text */}
                <path d="M15,48 C25,25 35,22 45,45 C50,55 55,20 62,35" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                
                <text x="40" y="52" textAnchor="middle" fill="#fbbf24" fontSize="6.5" fontWeight="black" letterSpacing="1" fontFamily="system-ui">ଗୁନ୍ଦୁଲୁ ଅପା</text>
                <text x="40" y="16" textAnchor="middle" fill="#94a3b8" fontSize="5" fontWeight="black" letterSpacing="0.5" fontFamily="system-ui">APPROVED STAMP</text>
              </g>

            </svg>
          </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-4 mt-4 w-full justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            {language === 'or' ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close'}
          </button>
          
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:scale-[1.02] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 border border-amber-400/20 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Lucide.RefreshCw size={14} className="animate-spin" />
                <span>{language === 'or' ? 'ପ୍ରସ୍ତୁତ ଚାଲିଛି...' : 'Exporting...'}</span>
              </>
            ) : (
              <>
                <Lucide.Download size={14} />
                <span>{language === 'or' ? 'ସ୍ୱର୍ଣ୍ଣ ପତ୍ର ଡାଉନଲୋଡ୍' : 'Download PDF Ticket'}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
