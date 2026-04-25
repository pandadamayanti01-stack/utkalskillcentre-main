import React from 'react';
import { motion } from 'motion/react';
import { 
  Gamepad2, 
  ChevronRight, 
  Zap, 
  Trophy, 
  Star, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { translations } from '../translations';

interface GamesViewProps {
  language: 'en' | 'or';
  onBack: () => void;
  onSelectGame: (gameId: string) => void;
}

export function GamesView({ language, onBack, onSelectGame }: GamesViewProps) {
  const games = [
    {
      id: 'math-dash',
      title: language === 'en' ? "Math Dash" : "ଗଣିତ ଡ୍ୟାଶ୍",
      desc: language === 'en' ? "Solve quick math problems to win!" : "ଜିତିବା ପାଇଁ ଶୀଭ୍ର ଗଣିତ ସମସ୍ୟା ସମାଧାନ କରନ୍ତୁ!",
      icon: <Zap className="text-emerald-400" />,
      color: "emerald",
      difficulty: "Medium",
      points: 500
    },
    {
      id: 'word-master',
      title: language === 'en' ? "Word Master" : "ଶବ୍ଦ ମାଷ୍ଟର",
      desc: language === 'en' ? "Build your vocabulary with fun puzzles." : "ମଜାଦାର ପଜଲ୍ ସହିତ ଆପଣଙ୍କର ଶବ୍ଦକୋଷ ଗଢନ୍ତୁ |",
      icon: <Star className="text-blue-400" />,
      color: "blue",
      difficulty: "Easy",
      points: 300
    },
    {
      id: 'logic-quest',
      title: language === 'en' ? "Logic Quest" : "ଲଜିକ୍ କ୍ୱେଷ୍ଟ",
      desc: language === 'en' ? "Test your skills with logic challenges." : "ଲଜିକ୍ ଚ୍ୟାଲେଞ୍ଜ ସହିତ ଆପଣଙ୍କ ଦକ୍ଷତାକୁ ପରୀକ୍ଷା କରନ୍ତୁ |",
      icon: <Trophy className="text-purple-400" />,
      color: "purple",
      difficulty: "Hard",
      points: 800
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="text-blue-400" />
            {translations[language].games}
          </h1>
          <p className="text-slate-400 text-sm">{translations[language].gamesDesc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game, idx) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelectGame(game.id)}
            className="group relative bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 text-left hover:bg-slate-900 transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles size={80} />
            </div>

            <div className={`w-14 h-14 bg-${game.color}-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              {game.icon}
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{game.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2">{game.desc}</p>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-xs font-bold text-slate-300">{game.points} XP</span>
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <ChevronRight size={20} />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
