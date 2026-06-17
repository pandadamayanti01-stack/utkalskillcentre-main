import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { BahiPrusthaGame } from './BahiPrusthaGame';

interface GameZoneProps {
  user: any;
  language?: 'en' | 'or';
  onBack: () => void;
}

interface GameItem {
  id: string;
  title: string;
  desc: string;
  imageUrl: string; // Custom generated illustration using official mascot
  icon: React.ReactNode;
  color: string; // Tailwind icon wrapper classes for details
  difficulty: 'ସହଜ' | 'ମାଧ୍ୟମ' | 'କଠିନ';
  points: number;
  playDay: string; // Day of the week in Odia
  status: 'playable' | 'coming-soon';
  lore: string; // Gundulu traditional history dialogue in Odia
}

// Programmatic Sambalpuri checkered pattern border trim
const SambalpuriTrim = ({ position }: { position: 'top' | 'bottom' }) => (
  <div className={`absolute ${position === 'top' ? 'top-0' : 'bottom-0'} inset-x-0 h-2 bg-slate-100 overflow-hidden flex z-10`}>
    {Array.from({ length: 48 }).map((_, i) => (
      <div key={i} className="flex-grow h-full flex">
        {/* Red, black, and gold weave design */}
        <div className={`w-1/3 h-full ${i % 2 === 0 ? 'bg-red-600' : 'bg-slate-950'}`} />
        <div className={`w-1/3 h-full ${i % 2 === 0 ? 'bg-slate-950' : 'bg-red-600'}`} />
        <div className="w-1/3 h-full bg-amber-400" />
      </div>
    ))}
  </div>
);

export function GameZone({ user, onBack }: GameZoneProps) {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [selectedLoreGame, setSelectedLoreGame] = useState<GameItem | null>(null);

  // Get current day of the week in Odia
  const daysOfWeekOdia = ['ରବିବାର', 'ସୋମବାର', 'ମଙ୍ଗଳବାର', 'ବୁଧବାର', 'ଗୁରୁବାର', 'ଶୁକ୍ରବାର', 'ଶନିବାର'];
  const todayDayIndex = new Date().getDay();
  const todayNameOdia = daysOfWeekOdia[todayDayIndex];

  const games: GameItem[] = [
    {
      id: 'bahi-prustha',
      title: 'ବହି ପୃଷ୍ଠା ଖେଳ',
      desc: 'ପୃଷ୍ଠା ସଂଖ୍ୟାର Digit ଯୋଗଫଳ କିମ୍ବା ଶବ୍ଦ ସନ୍ଧାନ କରି ଗଣିତ ଓ ଓଡ଼ିଆରେ ନିପୁଣ ହୁଅନ୍ତୁ ।',
      imageUrl: '/gundulu_bahi_prustha.png',
      icon: <Lucide.BookOpen size={16} />,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
      difficulty: 'ମାଧ୍ୟମ',
      points: 500,
      playDay: 'ବୁଧବାର',
      status: 'playable',
      lore: 'ବହି ପୃଷ୍ଠା ଖେଳ ହେଉଛି ଆମ ଓଡ଼ିଆ ପାଠ୍ୟପୁସ୍ତକକୁ ନେଇ ଏକ ଅତି ସୁନ୍ଦର ଶିକ୍ଷଣୀୟ ଖେଳ। ଏଥିରେ ଗଣିତ ପୃଷ୍ଠା ଯୋଗଫଳ ଏବଂ ଓଡ଼ିଆ ଶବ୍ଦ ଖୋଜିବା ଭଳି ରୋମାଞ୍କକର ରାଉଣ୍ଡ ରହିଛି, ଯାହା ଶିକ୍ଷା ସହିତ ମସ୍ତିଷ୍କର ଶୀଘ୍ର ଚିନ୍ତା କରିବାର ଶକ୍ତି ବଢ଼ାଇଥାଏ।'
    },
    {
      id: 'bagh-chheli',
      title: 'ବାଘ-ଛେଳି ଖେଳ',
      desc: 'ଐତିହାସିକ ବୋର୍ଡ଼ ଖେଳ ଯେଉଁଠି ବାଘ ଓ ଛେଳି ମଧ୍ୟରେ ଚତୁରତା ଓ ରଣନୀତିର ଯୁଦ୍ଧ ଚାଲେ ।',
      imageUrl: '/gundulu_bagh_chheli.png',
      icon: <Lucide.ShieldAlert size={16} />,
      color: 'bg-orange-50 text-orange-600 border-orange-200',
      difficulty: 'କଠିନ',
      points: 800,
      playDay: 'ସୋମବାର',
      status: 'coming-soon',
      lore: 'ବାଘ-ଛେଳି ହେଉଛି ଓଡ଼ିଶାର ଏକ ପାରମ୍ପରିକ ଦୁଇ ଜଣିଆ ବୋର୍ଡ଼ ଖେଳ। ଏଥିରେ ଜଣେ ଖେଳାଳି ୪ଟି ବାଘ ଏବଂ ଅନ୍ୟ ଜଣେ ୨୦ଟି ଛେଳି ନେଇ ଚାଲନ୍ତି। ବାଘ ଛେଳିଙ୍କୁ ଖାଇବାକୁ ଚେଷ୍ଟା କରୁଥିବା ବେଳେ ଛେଳିମାନେ ବାଘକୁ ବନ୍ଦୀ କରିବାକୁ ରଣନୀତି କରନ୍ତି। ଏହା ଆପଣଙ୍କ ମାନସିକ ଚତୁରତା ବୃଦ୍ଧି କରେ!'
    },
    {
      id: 'puchi',
      title: 'ପୁଚି ଖେଳ',
      desc: 'ତାଳ ଓ ସଙ୍ଗୀତ ଅନୁଯାୟୀ ସ୍କ୍ରିନ ଟ୍ୟାପ୍ କରି ପାରମ୍ପରିକ ପୁଚି ନୃତ୍ୟର ମଜା ନିଅନ୍ତୁ ।',
      imageUrl: '/gundulu_puchi.png',
      icon: <Lucide.Music size={16} />,
      color: 'bg-rose-50 text-rose-600 border-rose-200',
      difficulty: 'ସହଜ',
      points: 600,
      playDay: 'ମଙ୍ଗଳବାର',
      status: 'coming-soon',
      lore: 'ପୁଚି ହେଉଛି ଓଡ଼ିଶାର ଗ୍ରାମାଞ୍ଚଳରେ ଝିଅମାନଙ୍କ ଦ୍ୱାରା ଖେଳାଯାଉଥିବା ଏକ ଲୋକପ୍ରିୟ ପାରମ୍ପରିକ ଖେଳ, ବିଶେଷ କରି କୁମାର ପୂର୍ଣ୍ଣିମା ସମୟରେ। ଏହା ଏକ ଶାରୀରିକ କସରତ ଯେଉଁଥିରେ ଗୀତ ଗାଇ ଗୋଡ଼କୁ ଆଗପଛ କରି ବସିବା ଓ ଉଠିବାକୁ ହୁଏ। ଏହା ଶରୀରକୁ ସୁସ୍ଥ ଓ ନମନୀୟ ରଖେ!'
    },
    {
      id: 'rumal-chori',
      title: 'ରୁମାଲ ଚୋରି',
      desc: 'ଦ୍ରୁତ ପ୍ରତିକ୍ରିୟା ଏବଂ ସତର୍କତାର ଖେଳ, ଚୋରକୁ ଚିହ୍ନଟ କରି ରୁମାଲ୍ ବଞ୍ଚାନ୍ତୁ ।',
      imageUrl: '/gundulu_rumal_chori.png',
      icon: <Lucide.EyeOff size={16} />,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      difficulty: 'ସହଜ',
      points: 400,
      playDay: 'ଗୁରୁବାର',
      status: 'coming-soon',
      lore: 'ରୁମାଲ ଚୋରି ହେଉଛି ପିଲାମାନଙ୍କର ଏକ ବହୁତ ମଜାଦାର ଗୋଷ୍ଠୀ ଖେଳ। ସମସ୍ତେ ଗୋଲ ହୋଇ ବସିଥିବା ବେଳେ ଜଣେ ପଛରେ ରୁମାଲ୍ ପକାଇ ଦୌଡ଼େ। ଯାହା ପଛରେ ରୁମାଲ୍ ପଡ଼େ ସେ ତୁରନ୍ତ ଧରି ଚୋରକୁ ଧରିବାକୁ ଚେଷ୍ଟା କରେ। ଏହା ଏକାଗ୍ରତା ଓ ଦ୍ରୁତ ପ୍ରତିକ୍ରିୟାର ଖେଳ!'
    },
    {
      id: 'kaudi',
      title: 'କଉଡ଼ି ଖେଳ',
      desc: '୩D କଉଡ଼ି ଗୁଡ଼ିକୁ ପକାଇ ପ୍ରାକୃତିକ ଭାଗ୍ୟ ଓ ସଂଖ୍ୟାର ରୋମାଞ୍ଚକର ଗଣନା କରନ୍ତୁ ।',
      imageUrl: '/gundulu_kaudi.png',
      icon: <Lucide.Gamepad size={16} />,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
      difficulty: 'ମାଧ୍ୟମ',
      points: 700,
      playDay: 'ଶୁକ୍ରବାର',
      status: 'coming-soon',
      lore: 'କଉଡ଼ି ଖେଳ ହେଉଛି ଓଡ଼ିଶାର ସବୁଠାରୁ ପୁରୁଣା ଓ ଘରୋଇ ଖେଳ ମଧ୍ୟରୁ ଏକ। ଏଥିରେ କଉଡ଼ି ଗୁଡ଼ିକୁ ହାତରେ ହଲାଇ ତଳେ ଢଳାଯାଏ ଏବଂ କଉଡ଼ିର ଚିତ୍ କିମ୍ବା ପଟ୍ ଦେଖି ସ୍କୋର ଗଣନା କରାଯାଏ। ଏହା ଭାଗ୍ୟ ଓ ସଂଖ୍ୟାର ଏକ ସୁନ୍ଦର ଖେଳ!'
    },
    {
      id: 'luchakali',
      title: 'ଲୁଚକାଳି ଖେଳ',
      desc: 'ଯାଦୁକରୀ ଆଲୋକ ଦ୍ଵାରା ପାଠ୍ୟବହିର ବିଭିନ୍ନ ଚିତ୍ର ଏବଂ ଲୁକ୍କାୟିତ ଜ୍ଞାନକୁ ସନ୍ଧାନ କରନ୍ତୁ ।',
      imageUrl: '/gundulu_luchakali.png',
      icon: <Lucide.Sparkles size={16} />,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      difficulty: 'ମାଧ୍ୟମ',
      points: 500,
      playDay: 'ଶନିବାର',
      status: 'coming-soon',
      lore: 'ଲୁଚକାଳି ହେଉଛି ପିଲାଦିନର ସବୁଠାରୁ ପ୍ରିୟ ଖେଳ। ଜଣେ ଖେଳାଳି ଆଖି ବନ୍ଦ କରି ସଂଖ୍ୟା ଗଣୁଥିବା ବେଳେ ଅନ୍ୟମାନେ ଲୁଚିଯାନ୍ତି। ପରେ ସେମାନଙ୍କୁ ଖୋଜି ବାହାର କରିବାକୁ ହୁଏ। ଏଠାରେ ଆମେ ଯାଦୁକରୀ ଲାଇଟ୍ ସାହାଯ୍ୟରେ ପାଠ୍ୟବହିର ଗୁପ୍ତ ଜ୍ଞାନକୁ ଖୋଜିବା!'
    }
  ];

  if (activeGameId === 'bahi-prustha') {
    return (
      <BahiPrusthaGame 
        user={user} 
        onBack={() => setActiveGameId(null)} 
      />
    );
  }

  const handleGameClick = (game: GameItem) => {
    const isBahiPlayable = game.id === 'bahi-prustha';
    const isTodayPlayDay = game.playDay === todayNameOdia || todayNameOdia === 'ରବିବାର';

    if (isBahiPlayable && (isTodayPlayDay || true)) {
      setActiveGameId(game.id);
    } else {
      setSelectedLoreGame(game);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 select-none text-slate-800 p-2 animate-fadeIn">
      
      {/* HEADER BANNER CARD */}
      <div className="relative overflow-hidden bg-white border border-slate-200/80 rounded-[1.75rem] md:rounded-[2.5rem] p-4 sm:p-6 shadow-md shadow-slate-100/50">
        <SambalpuriTrim position="top" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 active:scale-95 transition-all shadow-sm"
            >
              <Lucide.ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2.5">
                <Lucide.Gamepad2 className="text-emerald-500 animate-pulse" size={28} />
                ଗୁନ୍ଦୁଲୁ ଗେମ୍ ଜୋନ୍
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="px-3 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  ଖେଳ ଆରେନା
                </span>
                <span className="px-3 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black tracking-widest shadow-sm">
                  🏆 ପାରମ୍ପରିକ ଓଡ଼ିଆ ଖେଳ
                </span>
              </div>
            </div>
          </div>

          {/* Gundulu Welcome Dialogue & Mascot */}
          <div className="flex items-center gap-4">
            <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl relative max-w-[15rem] md:max-w-[18rem] hidden sm:block">
              {/* Dialogue Bubble Tail */}
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-l-[8px] border-l-slate-50 border-b-[6px] border-b-transparent" />
              <p className="text-[10px] md:text-xs text-slate-600 font-bold leading-relaxed">
                ଆସ ପିଲାମାନେ! ଆଜି ଆମେ ଓଡ଼ିଶାର ଏହି ମଜାଦାର ଖେଳ ଗୁଡ଼ିକ ଖେଳିବା।
              </p>
            </div>
            
            {/* Real Gundulu V3 Image */}
            <div className="relative shrink-0 animate-bounce-slow">
              <img 
                src="/gundulu-v3.png" 
                alt="Gundulu Mascot" 
                className="w-20 h-20 object-contain drop-shadow-md"
              />
            </div>
          </div>

          {/* Student Stats HUD */}
          <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 border border-slate-200/60 rounded-2xl shadow-sm">
            <div className="shrink-0 text-center">
              <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">ଶ୍ରେଣୀ</div>
              <div className="text-sm font-black text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-sm">
                {user?.class || 'ଶ୍ରେଣୀ ୫'}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">ମୋଟ ସ୍କୋର</div>
              <div className="text-lg font-black text-amber-500 font-mono flex items-center gap-1">
                🪙 {user?.xp || user?.points || 150} XP
              </div>
            </div>
          </div>
        </div>

        <SambalpuriTrim position="bottom" />
      </div>

      {/* ROTATION SCHEDULE BAR */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-600 shadow-sm">
        <div className="flex items-center gap-2 text-cyan-600">
          <Lucide.Calendar size={15} />
          <span>ଆଜିର ବାର: <strong className="text-slate-900 underline decoration-cyan-500 decoration-2 font-black ml-1">{todayNameOdia}</strong></span>
        </div>
        <div className="text-[10px] text-slate-400 font-black flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          ପ୍ରତିଦିନ ସୂଚୀ ଅନୁଯାୟୀ ଏକ ନୂଆ ଖେଳ ଖୋଲିବ । ରବିବାର ସବୁ ଖେଳ ମୁକ୍ତ ପ୍ରବେଶ!
        </div>
      </div>

      {/* GAMES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
        {games.map((game, idx) => {
          const isTodayGame = game.playDay === todayNameOdia || todayNameOdia === 'ରବିବାର';
          const isPlayable = game.status === 'playable';
          
          return (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleGameClick(game)}
              className={`group flex flex-col justify-between overflow-hidden bg-white border rounded-[2rem] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
                isPlayable 
                  ? 'border-amber-300 hover:border-amber-400' 
                  : 'border-slate-200/60 opacity-90'
              }`}
            >
              {/* Game Cover Graphic (Themed mascot image banner) */}
              <div className="w-full h-36 bg-slate-100 border-b border-slate-100 relative overflow-hidden shrink-0">
                <img 
                  src={game.imageUrl} 
                  alt={game.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Image Overlay Elements */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                
                {/* playday pill on cover */}
                <div className="absolute top-3 right-3 z-10">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                    isTodayGame
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm animate-pulse'
                      : 'bg-white/95 text-slate-500 border-slate-200/40 shadow-sm'
                  }`}>
                    📅 {game.playDay}
                  </span>
                </div>

                {/* Difficulty / Game Icon Badge */}
                <div className="absolute top-3 left-3 z-10 flex gap-1.5">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center border shadow-sm ${game.color} bg-white`}>
                    {game.icon}
                  </div>
                  {!isPlayable && (
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-slate-900/80 text-white border border-white/10 shadow-sm backdrop-blur-sm">
                      <Lucide.Lock size={12} />
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body padding */}
              <div className="p-5 flex flex-col justify-between flex-grow space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed line-clamp-3">
                    {game.desc}
                  </p>
                </div>

                {/* Card Footer details */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between z-10">
                  {/* XP badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-full text-[9px] font-extrabold text-amber-700 font-mono shadow-sm">
                    <Lucide.Trophy size={10} className="text-amber-500" />
                    <span>{game.points} XP</span>
                  </div>

                  {isPlayable ? (
                    <div className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1">
                      <Lucide.Play size={9} fill="currentColor" />
                      <span>ଖେଳନ୍ତୁ</span>
                    </div>
                  ) : (
                    <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/60 text-slate-500 font-black text-[10px] rounded-xl flex items-center gap-1 hover:text-slate-700 transition-colors">
                      <Lucide.Info size={11} />
                      <span>ବିବରଣୀ</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* GUNDULU CULTURAL SPEAKING DIALOGUE MODAL */}
      <AnimatePresence>
        {selectedLoreGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-950/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl overflow-y-auto max-h-[92vh]"
            >
              {/* Modal Top Sambalpuri Border */}
              <SambalpuriTrim position="top" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedLoreGame(null)}
                className="absolute top-5 right-5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              >
                <Lucide.X size={16} />
              </button>

              <div className="space-y-6 mt-5">
                {/* Themed cover graphic inside modal */}
                <div className="w-full h-32 rounded-2xl overflow-hidden border border-slate-200 relative">
                  <img 
                    src={selectedLoreGame.imageUrl} 
                    alt={selectedLoreGame.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 text-white z-10">
                    <h2 className="text-xl font-black">{selectedLoreGame.title}</h2>
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                      ଖେଳ ଦିବସ: {selectedLoreGame.playDay}
                    </span>
                  </div>
                </div>

                {/* Gundulu Speech bubble with real mascot image */}
                <div className="flex gap-3 sm:gap-4 items-start bg-slate-50 border border-slate-100 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] relative shadow-inner">
                  {/* Decorative dialogue arrow pointer */}
                  <div className="absolute top-6 -left-1.5 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-slate-50 border-b-[6px] border-b-transparent" />
                  
                  <img 
                    src="/gundulu-v3.png" 
                    alt="Gundulu Speaking" 
                    className="w-11 h-11 sm:w-14 sm:h-14 rounded-full shrink-0 border border-slate-200 bg-white object-contain p-0.5"
                  />
                  <div className="space-y-1">
                    <div className="text-[9px] text-emerald-600 font-extrabold tracking-wider uppercase">ଗୁନ୍ଦୁଲୁ AI (Gundulu AI)</div>
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">
                      {selectedLoreGame.lore}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl text-center space-y-1.5">
                  <p className="text-xs text-slate-500 font-bold">
                    ଆଜି <span className="text-slate-900 font-extrabold underline">{todayNameOdia}</span>, ତେଣୁ ଏହି ଖେଳଟି ତାଲା ପଡ଼ିଛି ।
                  </p>
                  <p className="text-[11px] text-emerald-600 font-black">
                    ଆଜିର ମୁଖ୍ୟ ଖେଳ <span className="underline font-black text-slate-800">ବହି ପୃଷ୍ଠା ଖେଳ</span> ଖେଳିବା ପାଇਂ ତଳ ବଟନ୍ ଦବାନ୍ତୁ !
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setSelectedLoreGame(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-slate-800 font-black rounded-2xl text-xs transition-all border border-slate-200/40"
                  >
                    ବନ୍ଦ କରନ୍ତୁ (Close)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLoreGame(null);
                      setActiveGameId('bahi-prustha');
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md shadow-amber-500/10"
                  >
                    ବହି ପୃଷ୍ଠା ଖେଳନ୍ତୁ ➔
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
