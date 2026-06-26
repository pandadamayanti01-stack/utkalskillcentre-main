import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import * as Lucide from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { translations } from '../translations';
import { DailyChallenge } from './DailyChallenge';
import { LeaderboardView } from './LeaderboardView';
import { DistrictLeaderboardFilter } from './DistrictLeaderboardFilter';
import { ODISHA_DISTRICTS } from '../constants/districts';
import { TestSeriesRegistrationForm } from './TestSeriesRegistrationForm';
import { jsPDF } from 'jspdf';
import { CLASS_SUBJECTS } from './DigitalLibraryView';
import {
  ROADMAP_DATA_1,
  ROADMAP_DATA_2,
  ROADMAP_DATA_3,
  ROADMAP_DATA_4,
  ROADMAP_DATA_5,
  ROADMAP_DATA_6,
  ROADMAP_DATA_7,
  ROADMAP_DATA_8,
  ROADMAP_DATA_9,
  ROADMAP_DATA as ROADMAP_DATA_10
} from '../data/roadmapData';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, increment, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { GunduluTrailer } from './GunduluTrailer';
import NeuralBackground from './NeuralBackground';
import OdishaLiveMap from './OdishaLiveMap';
import ReactMarkdown from 'react-markdown';
import { generateHomeworkSheet, translateContent } from '../services/aiService';
import { GoldenTicket } from './GoldenTicket';
import { MathBlackboard } from './MathBlackboard';
import { GiftUnlockModal } from './GiftUnlockModal';
import { MtsChampionshipPoster } from './MtsChampionshipPoster';
import confetti from 'canvas-confetti';

interface DashboardProps {
  user: any;
  leaderboard: any[];
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade: () => void;
  chapters: any[];
  dailyChallenge: any;
  hasDailyPractice?: boolean;
  todayDailySubject?: string;
  tomorrowDailySubject?: string;
  onChallengeComplete?: () => void;
  onOpenTutor?: () => void;
  onOpenDailyPractice?: () => void;
  onShareDailyPractice?: () => void;
  isRegistered?: boolean;
  onRegistrationComplete?: () => void;
  onOpenCommunity?: () => void;
  following?: string[];
  onToggleFollow?: (targetUserId: string) => void;
  isTourStep3?: boolean;
  isTourStep4?: boolean;
  onOpenRajaPoster?: () => void;
  onOpenMonthlyTests?: () => void;
  onOpenGameZone?: () => void;
  onOpenLibrary?: () => void;
  theme?: string;
}
function PerformanceChart({ submissions, tests, language, theme }: any) {
  const isLight = theme === 'daybreak';
  const chartData = React.useMemo(() => {
    // Combine test data with submissions to get scores
    // This is a simplified version, ideally we'd pass processed data
    const data = submissions
      .filter((s: any) => s.score !== undefined || s.finalScore !== undefined)
      .sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
      .map((s: any) => {
        const score = s.finalScore !== undefined ? s.finalScore : s.score;
        const total = s.totalMaxMarks || s.totalQuestions || 25; // Default 25 for our new pattern
        const percentage = Math.round((score / total) * 100);
        
        return {
          name: s.month ? `${s.month.slice(0, 3)}` : 'Test',
          score: percentage,
        };
      });
    return data;
  }, [submissions]);

  if (chartData.length === 0) {
    return (
      <div className={`glass-card rounded-[2rem] p-4 sm:p-6 lg:p-8 text-center flex flex-col items-center justify-center h-full hover:-translate-y-1 transition-all duration-500 border ${
        isLight 
          ? 'border-slate-200 bg-slate-50/40 hover:border-slate-300 shadow-sm' 
          : 'border-slate-700/50 bg-slate-900/40 hover:border-slate-600'
      }`}>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-4 border ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-800/50 border-slate-700 text-slate-400'
        }`}>
          <Lucide.TrendingUp size={16} className="sm:w-5 sm:h-5" />
        </div>
        <p className="text-slate-700 dark:text-slate-300 font-black uppercase tracking-widest text-[8px] sm:text-[10px]">
          {language === 'en' ? 'No Progress Data Yet' : 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ପ୍ରଗତି ତଥ୍ୟ ନାହିଁ'}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-[8px] sm:text-xs mt-1 sm:mt-2 max-w-[200px]">
          {language === 'en' ? 'Take monthly tests to see your growth chart!' : 'ଆପଣଙ୍କର ବିକାଶ ଗ୍ରାଫ୍ ଦେଖିବା ପାଇଁ ମାସିକ ପରୀକ୍ଷା ଦିଅନ୍ତୁ!'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card neon-border rounded-3xl p-5 md:p-6 lg:p-8 bg-gradient-to-br from-emerald-500/5 to-transparent">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
            {language === 'en' ? 'Your Progress Graph' : 'ଆପଣଙ୍କର ପ୍ରଗତି ଗ୍ରାଫ୍'}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em]">
            {language === 'en' ? 'Monthly Performance Analytics' : 'ମାସିକ ପ୍ରଦର୍ଶନ ବିଶ୍ଳେଷଣ'}
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <Lucide.TrendingUp size={12} />
          {chartData.length > 1 && chartData[chartData.length-1].score >= chartData[chartData.length-2].score 
            ? (language === 'en' ? 'Improving' : 'ଉନ୍ନତି ହେଉଛି') 
            : (language === 'en' ? 'Consistency is Key' : 'ନିରନ୍ତରତା ଅତ୍ୟନ୍ତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ')}
        </div>
      </div>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.05)"} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: isLight ? '#475569' : '#64748b', fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isLight ? '#ffffff' : '#0f172a', 
                border: isLight ? '1px solid rgba(15,23,42,0.08)' : '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
              }}
              itemStyle={{ color: '#10b981', fontWeight: 800, fontSize: '12px' }}
              labelStyle={{ color: isLight ? '#475569' : '#94a3b8', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}
              formatter={(value) => [`${value}%`, language === 'en' ? 'SCORE' : 'ସ୍କୋର']}
            />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorScore)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const getWorksheetParts = (text: string) => {
  if (!text) return { questions: '', answers: '' };
  const parts = text.split(/---|\n##? ANSWER KEY|\n##? ANSWER|\n##? MODEL SOLUTIONS|\n##? ସମାଧାନ/i);
  const questions = parts[0] || '';
  const answers = parts.slice(1).join('\n') || '';
  return { questions, answers };
};

const CHAPTER_QUESTION_BANK: Record<string, {
  mcqs: Array<{ question: string; options: string[] }>;
  subjectives: Array<{ question: string; hint: string }>;
}> = {
  "linear simultaneous equations": {
    mcqs: [
      { question: "For a unique solution of the system a1x + b1y + c1 = 0 and a2x + b2y + c2 = 0, what is the condition?", options: ["a1/a2 != b1/b2", "a1/a2 = b1/b2 != c1/c2", "a1/a2 = b1/b2 = c1/c2", "a1.a2 + b1.b2 = 0"] },
      { question: "If D = 0, Dx = 5, and Dy = 10, how many solutions exist for the system?", options: ["No solution", "Unique solution", "Infinitely many solutions", "Two solutions"] },
      { question: "Solve for x and y: x + y = 5 and x - y = 1.", options: ["x = 3, y = 2", "x = 4, y = 1", "x = 2, y = 3", "x = 5, y = 0"] },
      { question: "What is the value of the determinant | 3  2 | / | 1  4 |?", options: ["10", "14", "2", "-10"] },
      { question: "Under what condition will the lines represented by 2x + ky = 5 and 3x + 6y = 8 be parallel?", options: ["k = 4", "k = 3", "k = 2", "k = 6"] }
    ],
    subjectives: [
      { question: "Solve the following system of linear equations using Cramer's Rule: 3x + 4y = 10 and 2x - 2y = 2.", hint: "Calculate D = |3 4; 2 -2| = -14. Calculate Dx = |10 4; 2 -2| = -28. Calculate Dy = |3 10; 2 2| = -14. Then x = Dx/D = 2, and y = Dy/D = 1." },
      { question: "For what value of 'k' will the system of equations kx + 3y = (k-3) and 12x + ky = k have infinitely many solutions?", hint: "Apply the condition a1/a2 = b1/b2 = c1/c2. k/12 = 3/k = (k-3)/k. Solving k^2 = 36 gives k = 6." }
    ]
  },
  "quadratic equations": {
    mcqs: [
      { question: "What is the discriminant of the quadratic equation ax^2 + bx + c = 0?", options: ["b^2 - 4ac", "b^2 + 4ac", "4ac - b^2", "sqrt(b^2 - 4ac)"] },
      { question: "If the roots of a quadratic equation are real and equal, what is the value of the discriminant?", options: ["D = 0", "D > 0", "D < 0", "D >= 0"] },
      { question: "Find the roots of the equation x^2 - 5x + 6 = 0.", options: ["2, 3", "1, 5", "-2, -3", "0, 6"] },
      { question: "If one root of the quadratic equation 2x^2 + kx - 6 = 0 is 2, what is the value of k?", options: ["-1", "1", "2", "-2"] },
      { question: "What is the sum of the roots of the quadratic equation 3x^2 - 9x + 5 = 0?", options: ["3", "-3", "5/3", "-5/3"] }
    ],
    subjectives: [
      { question: "Find the roots of the quadratic equation 2x^2 - 7x + 3 = 0 using the quadratic formula.", hint: "a=2, b=-7, c=3. D = b^2 - 4ac = 49 - 24 = 25. Roots are x = (-b +- sqrt(D)) / 2a = (7 +- 5) / 4, yielding x = 3 and x = 1/2." },
      { question: "If alpha and beta are the roots of the equation x^2 - px + q = 0, find the value of (alpha^2 + beta^2).", hint: "Use sum of roots alpha + beta = p and product alpha * beta = q. alpha^2 + beta^2 = (alpha + beta)^2 - 2*alpha*beta = p^2 - 2q." }
    ]
  },
  "similarity": {
    mcqs: [
      { question: "In two similar triangles, if the ratio of their corresponding sides is 3:4, what is the ratio of their areas?", options: ["9:16", "3:4", "27:64", "sqrt(3):2"] },
      { question: "According to Thales Theorem, if a line is drawn parallel to one side of a triangle, it divides the other two sides in:", options: ["Equal ratio", "Unequal ratio", "Product of sides", "Sum of sides"] },
      { question: "In triangle ABC, D and E are points on AB and AC such that DE || BC. If AD/DB = 3/5 and AC = 5.6 cm, find AE.", options: ["2.1 cm", "3.1 cm", "1.5 cm", "3.5 cm"] },
      { question: "Which of the following is NOT a criterion for similarity of two triangles?", options: ["RHS", "AAA", "SAS", "SSS"] },
      { question: "If triangle ABC ~ triangle PQR, AB = 6cm, PQ = 9cm, and perimeter of ABC is 24cm, find the perimeter of PQR.", options: ["36 cm", "32 cm", "40 cm", "28 cm"] }
    ],
    subjectives: [
      { question: "State and prove the Basic Proportionality Theorem (Thales Theorem).", hint: "Outline triangle ABC with DE || BC. Show that Area(ADE)/Area(BDE) = AD/DB and Area(ADE)/Area(CDE) = AE/EC. Since Area(BDE) = Area(CDE) on same base DE, conclude AD/DB = AE/EC." },
      { question: "If the areas of two similar triangles are equal, prove that the triangles are congruent.", hint: "Since area ratio is 1, the ratio of squares of corresponding sides is 1, which implies corresponding sides are equal. By SSS, they are congruent." }
    ]
  },
  "chemical reactions": {
    mcqs: [
      { question: "What type of reaction is: Fe + CuSO4 -> FeSO4 + Cu?", options: ["Displacement Reaction", "Combination Reaction", "Decomposition Reaction", "Double Displacement Reaction"] },
      { question: "Which gas is released when dilute hydrochloric acid reacts with zinc granules?", options: ["Hydrogen gas", "Oxygen gas", "Carbon dioxide gas", "Chlorine gas"] },
      { question: "What is the chemical formula of quicklime?", options: ["CaO", "Ca(OH)2", "CaCO3", "CaCl2"] },
      { question: "In the reaction CuO + H2 -> Cu + H2O, which substance is reduced?", options: ["CuO", "H2", "Cu", "H2O"] },
      { question: "Why is nitrogen gas flushed into potato chips packets?", options: ["To prevent oxidation/rancidity", "To keep them crispy", "To make them look bigger", "To kill bacteria"] }
    ],
    subjectives: [
      { question: "Balance the chemical equation: Fe + H2O -> Fe3O4 + H2 and write the physical states of reactants and products.", hint: "Balanced equation: 3Fe(s) + 4H2O(g) -> Fe3O4(s) + 4H2(g)." },
      { question: "Differentiate between exothermic and endothermic reactions with one chemical equation example for each.", hint: "Exothermic releases heat: C + O2 -> CO2 + heat. Endothermic absorbs heat: CaCO3 + heat -> CaO + CO2." }
    ]
  },
  "nutrition": {
    mcqs: [
      { question: "Which enzyme is present in human saliva?", options: ["Amylase (Ptyalin)", "Pepsin", "Trypsin", "Lipase"] },
      { question: "Which pigment in green leaves traps solar energy for photosynthesis?", options: ["Chlorophyll", "Carotenoids", "Xanthophyll", "Anthocyanin"] },
      { question: "Where in the human body is bile juice produced and stored?", options: ["Produced in Liver, stored in Gallbladder", "Produced in Gallbladder, stored in Liver", "Produced in Pancreas, stored in Liver", "Produced in Stomach, stored in Pancreas"] },
      { question: "What is the mode of nutrition in Cuscuta (Amarabel)?", options: ["Parasitic", "Autotrophic", "Saprophytic", "Holozoic"] },
      { question: "What is the primary site of absorption of digested food in the human body?", options: ["Small Intestine (Villi)", "Large Intestine", "Stomach", "Mouth"] }
    ],
    subjectives: [
      { question: "Write the balanced chemical equation for photosynthesis. List the three major events that occur during this process.", hint: "Equation: 6CO2 + 12H2O + light -> C6H12O6 + 6O2 + 6H2O. Events: Chlorophyll absorbs light; light splits water; CO2 reduces to carbohydrate." },
      { question: "Explain the process of digestion in the human stomach. Mention the roles of HCl, pepsin, and mucus.", hint: "Gastric juice: HCl activates pepsin and protects inner stomach lining." }
    ]
  },
  "gandhi": {
    mcqs: [
      { question: "In which year did Mahatma Gandhi return to India from South Africa?", options: ["1915", "1917", "1919", "1920"] },
      { question: "Where did Gandhiji organize his first successful Satyagraha in India?", options: ["Champaran", "Kheda", "Ahmedabad", "Bardoli"] },
      { question: "Who was the political mentor (Guru) of Mahatma Gandhi?", options: ["Gopal Krishna Gokhale", "Bal Gangadhar Tilak", "Dadabhai Naoroji", "Rabindranath Tagore"] },
      { question: "Why did Gandhiji launch the Champaran Satyagraha in 1917?", options: ["Against the oppressive Tinkathia system of indigo farming", "Against salt tax", "Against British land revenue", "To support mill workers"] },
      { question: "Who gave the title 'Mahatma' to Mohandas Karamchand Gandhi?", options: ["Rabindranath Tagore", "Subhas Chandra Bose", "Jawaharlal Nehru", "Gopal Krishna Gokhale"] }
    ],
    subjectives: [
      { question: "Explain the causes and significance of the Champaran Satyagraha of 1917.", hint: "Causes: European planters forced peasants to grow indigo on 3/20th of land (Tinkathia system). Significance: First successful experiment of Satyagraha by Gandhiji in India." },
      { question: "Discuss the Rowlatt Act of 1919 and how Gandhiji organized the countrywide protest against it.", hint: "Rowlatt Act allowed detention without trial. Gandhiji formed Satyagraha Sabha and called for Hartal on April 6, 1919." }
    ]
  },
  "non-cooperation": {
    mcqs: [
      { question: "In which Congress session was the resolution for the Non-Cooperation Movement formally adopted?", options: ["Nagpur Session (Dec 1920)", "Calcutta Special Session (Sep 1920)", "Lahore Session (1929)", "Madras Session (1927)"] },
      { question: "Which tragic incident in February 1922 led Gandhiji to suspend the Non-Cooperation Movement?", options: ["Chauri Chaura Incident", "Jallianwala Bagh Massacre", "Kakori Conspiracy", "Rowlatt Satyagraha"] },
      { question: "Who founded the Utkal Swarajya Shiksha Parishad in Odisha during the Non-Cooperation Movement?", options: ["Gopabandhu Das", "Harekrushna Mahatab", "Madhusudan Das", "Nabakrushna Choudhury"] },
      { question: "Gandhiji returned which British-bestowed title in protest during the Non-Cooperation Movement?", options: ["Kaisar-i-Hind Gold Medal", "Knighthood", "Rai Bahadur", "Sir"] },
      { question: "Who led the student boycott of schools and colleges in Cuttack during the Non-Cooperation Movement?", options: ["Harekrushna Mahatab", "Gopabandhu Das", "Ramadevi", "Sarala Devi"] }
    ],
    subjectives: [
      { question: "Describe the impact and main programs of the Non-Cooperation Movement in Odisha.", hint: "Boycott of British goods/schools; burning foreign cloth; establishment of national schools (Swaraj Ashram) and Panchayats." },
      { question: "Explain the circumstances that led to the withdrawal of the Non-Cooperation Movement in 1922.", hint: "Chauri Chaura incident (Feb 1922) where a violent mob burned down a police station and killed 22 policemen." }
    ]
  },
  "singhanada": {
    mcqs: [
      { question: "Who is the poet of the famous Odia epic poem 'Bhimanka Singhanada Radi'?", options: ["Sarala Das", "Jagannath Das", "Upendra Bhanja", "Balaram Das"] },
      { question: "From which parva of Sarala Mahabharata is the 'Bhimanka Singhanada Radi' poem extracted?", options: ["Gada Parva", "Sabha Parva", "Bhishma Parva", "Vana Parva"] },
      { question: "Which god gave the Singhanada (horn) to Bhima?", options: ["Lord Shiva", "Lord Krishna", "Lord Brahma", "Lord Vishnu"] },
      { question: "Where was Duryodhana hiding when Bhima blew the Singhanada?", options: ["Vyasasaras (Vyasa Lake)", "Gupta Gada", "Patalapura", "Kurukshetra forest"] },
      { question: "What happened to the earth when Bhima blew the Singhanada for the first time?", options: ["The earth trembled and mountains crumbled", "The sun stopped shining", "A heavy rain started", "The oceans dried up"] }
    ],
    subjectives: [
      { question: "Describe the first sound of Bhima's Singhanada and its impact on the universe as depicted in the poem.", hint: "The first blast shook the three worlds, caused earthquakes, collapsed mountain peaks, and generated massive waves in Vyasasaras." },
      { question: "Why did Sahadeva advise Yudhisthira to have Bhima blow the Singhanada? Explain the strategy behind it.", hint: "Duryodhana was hiding inside Vyasasaras using water-stilling spells. Hearing the horn would provoke Duryodhana's pride and draw him out to fight." }
    ]
  },
  "lanka jatranukula": {
    mcqs: [
      { question: "Who is the poet of 'Raghabanka Lanka Jatranukula'?", options: ["Kabi Samrat Upendra Bhanja", "Radhanath Ray", "Ganga Dhar Meher", "Fakir Mohan Senapati"] },
      { question: "From which famous Odia kavya is 'Raghabanka Lanka Jatranukula' taken?", options: ["Baidehisa Bilasa", "Labanyabati", "Kotibrahmanda Sundari", "Premasudhanidhi"] },
      { question: "Why was Lord Rama angry at the ocean god (Varuna)?", options: ["Varuna did not give passage to Lanka", "Varuna hid Sita", "Varuna destroyed the bridge", "Varuna supported Ravana"] },
      { question: "What did Vibhishana advise Ravana to do regarding Sita?", options: ["Return Sita to Rama with respect", "Fight Rama with full force", "Hide Sita in another place", "Kill Sita to take revenge"] },
      { question: "Which two ministers did Ravana send to spy on Rama's army?", options: ["Suka and Sarana", "Angada and Hanuman", "Sanhlad and Prahlad", "Malyabana and Kumbhakarna"] }
    ],
    subjectives: [
      { question: "Describe the anger of Lord Rama towards Varuna and his preparation to dry up the ocean as described in the kavya.", hint: "After waiting 3 days, Rama decided to launch Brahmastra to dry the ocean, threatening Varuna and causing panic among aquatic life." },
      { question: "Explain the message Ravana sent through his spies Suka and Sarana to Vibhishana. What was Vibhishana's reaction?", hint: "Ravana sent spies to warn Vibhishana against supporting Rama. Vibhishana rejected the appeal, declaring Rama's divine victory." }
    ]
  },
  "bright and beautiful": {
    mcqs: [
      { question: "Who is the poet of the poem 'All Things Bright and Beautiful'?", options: ["Cecil Frances Alexander", "William Wordsworth", "John Keats", "Robert Frost"] },
      { question: "According to the poet, what has God given to little birds?", options: ["Glowing colors and tiny wings", "Sweet voices and nests", "Warm feathers and seeds", "Bright eyes and long beaks"] },
      { question: "How does the poet describe the cold wind in the poem?", options: ["Cold wind in the winter", "Cold wind in the summer", "Cold wind in the autumn", "Cold wind in the spring"] },
      { question: "What runs by the mountain in the poem?", options: ["A river", "A road", "A train", "A valley"] },
      { question: "Why has God given us eyes and lips, according to C.F. Alexander?", options: ["To see His creations and tell of His greatness", "To read and sing", "To work and eat", "To look at nature and smile"] }
    ],
    subjectives: [
      { question: "How does the poet Cecil Frances Alexander describe God's creation in the poem 'All Things Bright and Beautiful'?", hint: "All creatures great and small are made by God. He gave glowing colors to flowers and tiny wings to birds, and created hills, rivers, and seasons." },
      { question: "What is the central message of the poem 'All Things Bright and Beautiful'?", hint: "It is a hymn of praise emphasizing that God is the Creator of all elements in nature and we should be grateful for His blessings." }
    ]
  },
  "set operations": {
    mcqs: [
      { question: "If set A has 3 elements, set B has 4 elements, and they are disjoint, what is the number of elements in A U B?", options: ["7", "12", "1", "0"] },
      { question: "What is the intersection of set A = {1, 2, 3} and set B = {2, 3, 4}?", options: ["{2, 3}", "{1, 2, 3, 4}", "{1, 4}", "{}"] },
      { question: "If A = {x | x is a letter in 'apple'}, what is the cardinality of A?", options: ["4", "5", "6", "3"] },
      { question: "Which of the following is equal to the set difference A - B?", options: ["A n B'", "A U B'", "A' n B", "A' U B"] },
      { question: "For any set A, what is A intersect A'?", options: ["Empty set (phi)", "Universal set (U)", "Set A", "Set A'"] }
    ],
    subjectives: [
      { question: "Draw a Venn diagram showing (A U B) n C.", hint: "Draw three intersecting circles representing sets A, B, and C. Shade the region that belongs to both the union of A and B, and set C." },
      { question: "Prove that A - (B U C) = (A - B) n (A - C) using laws of set operations.", hint: "A - (B U C) = A n (B U C)' = A n (B' n C') = (A n B') n (A n C') = (A - B) n (A - C)." }
    ]
  },
  "lines and angles": {
    mcqs: [
      { question: "If two supplementary angles are in the ratio 4:5, find the larger angle.", options: ["100 degrees", "80 degrees", "90 degrees", "120 degrees"] },
      { question: "If a ray stands on a line, what is the sum of the two adjacent angles formed?", options: ["180 degrees", "90 degrees", "360 degrees", "270 degrees"] },
      { question: "An angle is equal to one-third of its complement. Find the measure of the angle.", options: ["22.5 degrees", "45 degrees", "30 degrees", "60 degrees"] },
      { question: "If two lines intersect, what is the sum of the four angles formed?", options: ["360 degrees", "180 degrees", "90 degrees", "540 degrees"] },
      { question: "Find the measure of an angle which is equal to its supplement.", options: ["90 degrees", "45 degrees", "180 degrees", "60 degrees"] }
    ],
    subjectives: [
      { question: "Prove that if two lines intersect each other, then the vertically opposite angles are equal.", hint: "Let lines AB and CD intersect at O. Ray OA stands on CD. Sum of adjacent angles AOC and AOD is 180 (linear pair). Similarly, ray OD stands on AB. Sum of AOD and BOD is 180. Equate them: AOC + AOD = AOD + BOD, which proves AOC = BOD." },
      { question: "In a triangle, if the side BC is produced to D, prove that the exterior angle ACD is equal to the sum of the two interior opposite angles.", hint: "In triangle ABC, sum of angles A + B + C = 180. The exterior angle ACD and interior angle ACB form a linear pair, so ACD + ACB = 180. Conclude ACD = A + B." }
    ]
  },
  "matter in our surroundings": {
    mcqs: [
      { question: "What is the physical state of water at 100 degrees Celsius?", options: ["Liquid and Gas", "Solid", "Liquid", "Gas"] },
      { question: "Which of the following processes represents the direct transition of a solid into gas?", options: ["Sublimation", "Condensation", "Evaporation", "Fusion"] },
      { question: "What is the SI unit of temperature?", options: ["Kelvin", "Celsius", "Fahrenheit", "Joule"] },
      { question: "Which of the following has the highest kinetic energy in particles?", options: ["Steam at 100 degrees Celsius", "Water at 100 degrees Celsius", "Ice at 0 degrees Celsius", "Water at 0 degrees Celsius"] },
      { question: "What is the name of the process when a gas changes into a liquid?", options: ["Condensation", "Sublimation", "Vaporization", "Fusion"] }
    ],
    subjectives: [
      { question: "Explain why we feel cold when we apply nail polish remover (acetone) on our palm.", hint: "Acetone has a low boiling point. When applied on the palm, the particles gain energy from the palm and evaporate, causing cooling." },
      { question: "Define latent heat of fusion and latent heat of vaporization.", hint: "Latent heat of fusion is the heat required to convert 1kg of solid into liquid at atmospheric pressure and its melting point. Latent heat of vaporization is the heat required to convert 1kg of liquid into gas at its boiling point." }
    ]
  },
  "biodiversity": {
    mcqs: [
      { question: "Who proposed the five-kingdom classification of organisms?", options: ["Robert Whittaker", "Carl Woese", "Charles Darwin", "Ernst Haeckel"] },
      { question: "To which kingdom do unicellular eukaryotic organisms belong?", options: ["Protista", "Monera", "Fungi", "Plantae"] },
      { question: "Which kingdom includes organisms that are multicellular, eukaryotic, and heterotrophic without cell walls?", options: ["Animalia", "Plantae", "Fungi", "Protista"] },
      { question: "What is the cell wall of fungi made of?", options: ["Chitin", "Cellulose", "Peptidoglycan", "Lignin"] },
      { question: "Who is known as the Father of Taxonomy?", options: ["Carl Linnaeus", "Aristotle", "Charles Darwin", "Gregor Mendel"] }
    ],
    subjectives: [
      { question: "List the main characteristics of kingdom Monera. Give two examples.", hint: "Monera are unicellular, prokaryotic organisms lacking a defined nucleus and membrane-bound organelles. Cell walls may be present. Examples: Bacteria, Cyanobacteria (Blue-green algae)." },
      { question: "Differentiate between gymnosperms and angiosperms with respect to seed enclosure and flowers.", hint: "Gymnosperms bear naked seeds and do not produce flowers (e.g. Pinus). Angiosperms bear seeds enclosed inside fruits and produce flowers (e.g. Mango)." }
    ]
  },
  "priceless gift": {
    mcqs: [
      { question: "What was the name of the young girl whom the writer met at the restaurant?", options: ["Maggie", "Lucy", "Sita", "Mary"] },
      { question: "Where did Maggie's brother Frank serve as a soldier?", options: ["India", "South Africa", "England", "France"] },
      { question: "What did Maggie do in the typewriter shop?", options: ["Worked as a typist", "Sold typewriter parts", "Cleaned typewriters", "Did accounting work"] },
      { question: "What was the gift Maggie gave to the writer for her brother's grave?", options: ["A shilling", "A letter", "A ring", "Flowers"] },
      { question: "What did the writer tell Maggie's mother about her brother's health?", options: ["He was alive and well", "He was seriously ill", "He died in the battle", "He went missing"] }
    ],
    subjectives: [
      { question: "Why did Maggie want to know if the writer was an Indian? What was her concern?", hint: "Maggie's brother Frank was serving as a soldier in India. She and her mother believed that India was full of tigers, snakes, and fevers, and wanted to ask an Indian if it was safe." },
      { question: "Why did the writer tell a lie to Maggie's mother about her brother Frank?", hint: "Maggie's mother was seriously ill and worried about Frank. The writer told a lie (that Frank was alive and well) to give her hope and peace of mind, which helped her recover." }
    ]
  },
  "kaha mukha": {
    mcqs: [
      { question: "Who is the poet of the famous old Odia poem 'Kaha Mukha Anai Banchibi'?", options: ["Bhakta Kabi Banamali", "Bhima Bhoi", "Jagannath Das", "Dinakrushna Das"] },
      { question: "Whose motherly affection is depicted in the poem 'Kaha Mukha Anai Banchibi'?", options: ["Yashoda", "Devaki", "Kausalya", "Kaikeyi"] },
      { question: "Why was Mother Yashoda worried about Sri Krishna?", options: ["He went to herd cows in the forest", "He ran away to Mathura", "He was ill", "He got lost in the river"] },
      { question: "What does Yashoda say she will do if Krishna doesn't return?", options: ["She will end her life", "She will go search for him", "She will lock him up", "She will complain to Nanda"] },
      { question: "What is Yashoda's greatest fear in the forest for Krishna?", options: ["Heat, thorns, and wild animals", "Heavy rains", "Evil spirits", "Dacoits"] }
    ],
    subjectives: [
      { question: "Describe Mother Yashoda's feelings and anxiety when Sri Krishna goes to the forest to herd cows.", hint: "Yashoda is filled with intense maternal anxiety. She fears that Krishna's tender feet will hurt from walking on hot sand and thorns, that he will get hungry/thirsty, or that wild animals will attack him. She feels that without Krishna, her life is meaningless." }
    ]
  }
};

const generateFallbackQuestions = (subjectKey: string, chapters: any[], isBoard: boolean) => {
  const chapterTitles = chapters.map(ch => ch.title_en || ch.title || '').filter(Boolean);
  const formattedChapters = chapterTitles.slice(0, 3);
  if (formattedChapters.length === 0) {
    return [
      { question: "Which state of India is known as the 'Soul of Incredible India'?", options: ["Odisha", "Kerala", "Rajasthan", "Goa"] },
      { question: "What is the capital of Odisha?", options: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"] },
      { question: "Which festival of Odisha is associated with the chariots of Lord Jagannath?", options: ["Ratha Yatra", "Raja Parba", "Nuakhai", "Bali Yatra"] },
      { question: "Who is the current Chief Minister of Odisha?", options: ["Mohan Charan Majhi", "Naveen Patnaik", "Biju Patnaik", "Harekrushna Mahatab"] },
      { question: "What is the state bird of Odisha?", options: ["Indian Roller", "Peacock", "House Sparrow", "Hill Myna"] }
    ];
  }
  const questions: any[] = [];
  questions.push({
    question: `Which of the following topics is most central to the study of "${formattedChapters[0]}"?`,
    options: ["Fundamental Principles", "Practical Applications", "Historical Evolution", "Core Definitions"]
  });
  questions.push({
    question: `In standard school curriculum, what is the main objective of studying "${formattedChapters[0]}"?`,
    options: ["To understand theoretical formulas", "To build real-world problem solving skills", "To prepare for exam patterns", "All of the above"]
  });
  const ch2 = formattedChapters[1] || formattedChapters[0];
  questions.push({
    question: `Which concept is closely related to the understanding of "${ch2}"?`,
    options: ["Basic Concepts", "Advanced Proofs", "Experimental Verification", "General Knowledge"]
  });
  questions.push({
    question: `Identify the correct statement regarding the chapter "${formattedChapters[0]}":`,
    options: ["It is a core part of the state board syllabus.", "It is only studied in higher classes.", "It has no practical application in daily life.", "It was recently removed from school textbooks."]
  });
  questions.push({
    question: `Solve/Answer the mock assessment question based on "${ch2}":`,
    options: ["Option A is correct", "Option B is correct", "Option C is correct", "Option D is correct"]
  });
  return questions;
};

const generateFallbackSubjectives = (subjectKey: string, chapters: any[], isBoard: boolean) => {
  const chapterTitles = chapters.map(ch => ch.title_en || ch.title || '').filter(Boolean);
  const formattedChapters = chapterTitles.slice(0, 2);
  if (formattedChapters.length === 0) {
    return [
      { question: "Describe the major tourist places in Odisha and their contribution to economy.", hint: "Discuss Puri-Konark-Bhubaneswar, eco-tourism, Chilika lake." },
      { question: "Describe the significance of the Raja Festival of Odisha and how it is celebrated.", hint: "Explain earth worship, swing (Doli), Poda Pitha." }
    ];
  }
  const subjectives: any[] = [];
  subjectives.push({
    question: `Explain the core concept of "${formattedChapters[0]}" in detail. How is this concept applied in daily life or standard board assessments?`,
    hint: `Start with the definition of ${formattedChapters[0]}. Explain its components, key equations or theories, and give at least two practical examples or applications.`
  });
  const ch2 = formattedChapters[1] || formattedChapters[0];
  subjectives.push({
    question: `Describe the step-by-step methodology or theorem associated with the topic of "${ch2}". Draw a neat diagram description where necessary.`,
    hint: `Outline the core statement or experiment for ${ch2}. Explain the logical sequence of steps or proof, mention key factors, and summarize the final conclusion.`
  });
  return subjectives;
};

export function Dashboard({ user, leaderboard, language, isPremium, onUpgrade, chapters, dailyChallenge, hasDailyPractice, todayDailySubject, tomorrowDailySubject, onChallengeComplete, onOpenTutor, onOpenDailyPractice, onShareDailyPractice, isRegistered = false, onRegistrationComplete, onOpenCommunity, following = [], onToggleFollow, isTourStep3, isTourStep4, onOpenRajaPoster, onOpenMonthlyTests, onOpenGameZone, onOpenLibrary, theme }: DashboardProps) {
    // Map class to YouTube video URL (embed links)
    const classVideoMap: Record<string, string> = {
      '1': 'https://www.youtube.com/embed/DxouHyB-IA8',
      '2': 'https://www.youtube.com/embed/Bg4niJioJDM',
      '3': 'https://www.youtube.com/embed/V0QFi18XJD4',
      '4': 'https://www.youtube.com/embed/d1VEPvR_nN8',
      '5': 'https://www.youtube.com/embed/vafpnkmiIvg',
      '6': 'https://www.youtube.com/embed/GZ1U75OV8DM',
      '7': 'https://www.youtube.com/embed/k_hco44HUxI',
      '8': 'https://www.youtube.com/embed/le5ItqGPKCU',
      '9': 'https://www.youtube.com/embed/0rfIj1MXzz4',
      '10': 'https://www.youtube.com/embed/OtTttUFqbPQ',
    };
    
    // Video controls state
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    const toggleMute = () => {
      if (videoRef.current) {
        const newMutedState = !videoRef.current.muted;
        videoRef.current.muted = newMutedState;
        setIsMuted(newMutedState);
      }
    };

    // Normalize user.class to string number (handles 'Class 1', 1, '1', etc.)
    let userClass = '10';
    if (user?.class) {
      if (typeof user.class === 'number') {
        userClass = String(user.class);
      } else if (typeof user.class === 'string') {
        const match = user.class.match(/(\d+)/);
        if (match) userClass = match[1];
      }
    }
    // Special Promotion Period: Till July 11th, 2026 (inclusive). No rotation.
    const isSpecialPromoPeriod = new Date() < new Date('2026-07-12T00:00:00+05:30');
    const promoVideoUrl = 'https://www.youtube.com/embed/Ml-_dY7FXrs';
    const videoUrl = isSpecialPromoPeriod 
      ? promoVideoUrl 
       : (classVideoMap[userClass] || classVideoMap['10']);

    // Helper to get the month of the completed/published test series
    const getCompletedMtsMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed: 5 = June, 6 = July
      const day = date.getDate();

      // If we are in June (month === 5), the completed test is May
      if (month === 5) {
        return { monthName: 'May', year: year };
      }
      
      // If we are in July (month === 6):
      // July results are published on the 13th. Before that, it's May.
      if (month === 6) {
        if (day < 13) {
          return { monthName: 'May', year: year };
        } else {
          return { monthName: 'July', year: year };
        }
      }

      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'Asia/Kolkata' }).format(date);
      return { monthName, year };
    };

    const activeMtsDate = new Date();
    const { monthName: completedMtsMonth, year: completedMtsYear } = getCompletedMtsMonth(activeMtsDate);
    const completedMtsClaimTag = `[MTS_CLAIM:${completedMtsMonth.toLowerCase()}_${completedMtsYear}]`;



  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showGoldenTicket, setShowGoldenTicket] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showBlackboard, setShowBlackboard] = useState(false);
  const [showGiftUnlockModal, setShowGiftUnlockModal] = useState(false);
  const [userBestMtsRank, setUserBestMtsRank] = useState<number | null>(null);
  const [showMtsGradingModal, setShowMtsGradingModal] = useState(false);
  const [showImportantPapersModal, setShowImportantPapersModal] = useState(false);

  // Custom Worksheet Wizard States
  const [worksheetStep, setWorksheetStep] = useState<number>(1);
  const [selectedWorksheetSubject, setSelectedWorksheetSubject] = useState<string>('');
  const [selectedWorksheetChapters, setSelectedWorksheetChapters] = useState<string[]>([]);
  const [worksheetDifficulty, setWorksheetDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [worksheetPattern, setWorksheetPattern] = useState<'quick' | 'full'>('quick');
  const [isGeneratingWorksheet, setIsGeneratingWorksheet] = useState<boolean>(false);
  const [worksheetGeneratingProgress, setWorksheetGeneratingProgress] = useState<number>(0);
  const [worksheetGeneratingStatusText, setWorksheetGeneratingStatusText] = useState<string>('');
  const [worksheetChaptersList, setWorksheetChaptersList] = useState<any[]>([]);
  const [isLoadingWorksheetChapters, setIsLoadingWorksheetChapters] = useState<boolean>(false);
  const classKey = 'class' + userClass;
  const subjects = CLASS_SUBJECTS[classKey] || CLASS_SUBJECTS.class10;

  // Get roadmap data for a specific class
  const getRoadmapForClass = (cls: string) => {
    switch (cls) {
      case '1': return ROADMAP_DATA_1;
      case '2': return ROADMAP_DATA_2;
      case '3': return ROADMAP_DATA_3;
      case '4': return ROADMAP_DATA_4;
      case '5': return ROADMAP_DATA_5;
      case '6': return ROADMAP_DATA_6;
      case '7': return ROADMAP_DATA_7;
      case '8': return ROADMAP_DATA_8;
      case '9': return ROADMAP_DATA_9;
      case '10': return ROADMAP_DATA_10;
      default: return ROADMAP_DATA_10;
    }
  };

  // Helper to match roadmap chapter subject with digital library subject key
  const matchChapterSubject = (roadmapSub: string, targetSubKey: string): boolean => {
    if (!roadmapSub || !targetSubKey) return false;
    const rSub = roadmapSub.toLowerCase().trim();
    const tKey = targetSubKey.toLowerCase().trim();
    
    if (rSub === tKey) return true;
    
    if (tKey === 'algebra') {
      return rSub.includes('algebra') || (rSub.includes('math') && !rSub.includes('geometry')) || (rSub.includes('ganita') && !rSub.includes('geometry'));
    }
    if (tKey === 'geometry') {
      return rSub.includes('geometry');
    }
    if (tKey === 'physical_science') {
      return rSub.includes('physical') || rSub.includes('bhautika') || rSub.includes('scp') || rSub.includes('ଭୌତିକ');
    }
    if (tKey === 'life_science') {
      return rSub.includes('life') || rSub.includes('jiba') || rSub.includes('scl') || rSub.includes('ଜୀବ');
    }
    if (tKey === 'social_science') {
      return rSub.includes('history') || rSub.includes('social') || rSub.includes('itiha') || rSub.includes('ssh') || rSub.includes('ଇତିହାସ');
    }
    if (tKey === 'geography') {
      return rSub.includes('geography') || rSub.includes('bhugol') || rSub.includes('ssg') || rSub.includes('ଭୂଗୋଳ');
    }
    if (tKey === 'odia') {
      return rSub === 'odia' || rSub.includes('jhulana') || rSub.includes('bhasa') || rSub.includes('ସାହିତ୍ୟ');
    }
    if (tKey === 'odia_grammar') {
      return rSub.includes('odia_grammar') || rSub.includes('odia grammar') || rSub.includes('ବ୍ୟାକରଣ');
    }
    if (tKey === 'english') {
      return rSub === 'english' || rSub.includes('literature') || rSub.includes('pallavi');
    }
    if (tKey === 'english_grammar') {
      return rSub.includes('english_grammar') || rSub.includes('english grammar');
    }
    if (tKey === 'sanskrit') {
      return rSub === 'sanskrit';
    }
    if (tKey === 'sanskrit_grammar') {
      return rSub.includes('sanskrit_grammar') || rSub.includes('sanskrit grammar');
    }
    if (tKey === 'hindi') {
      return rSub === 'hindi';
    }
    if (tKey === 'hindi_grammar') {
      return rSub.includes('hindi_grammar') || rSub.includes('hindi grammar');
    }
    
    return rSub.includes(tKey) || tKey.includes(rSub);
  };

  // Helper to format current month as string
  const getCurrentMonthStr = () => {
    const date = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Retrieve cumulative chapters for a subject up to the current calendar month (or active milestone for board classes)
  const getCumulativeChaptersForSubject = (subjectKey: string) => {
    const roadmap = getRoadmapForClass(userClass);
    const isBoard = userClass === '9' || userClass === '10';
    let activeIndex = 0;

    if (isBoard) {
      // Find active milestone and get all months up to that milestone
      const now = new Date();
      const month = now.getMonth(); // 0 = Jan, 5 = Jun, etc.
      const date = now.getDate();
      
      let milestoneKey = 'annual';
      if (month === 5 || (month === 6 && date <= 15)) milestoneKey = 'ia1';
      else if ((month === 6 && date > 15) || month === 7) milestoneKey = 'ia2';
      else if (month === 8 && date <= 15) milestoneKey = 'half_yearly';
      else if ((month === 8 && date > 15) || month === 9 || (month === 10 && date <= 15)) milestoneKey = 'ia3';
      else if ((month === 10 && date > 15) || month === 11 || (month === 0 && date <= 15)) milestoneKey = 'ia4';

      const milestoneEndMonths: Record<string, string> = {
        ia1: 'July 2026',
        ia2: 'August 2026',
        half_yearly: 'September 2026',
        ia3: 'November 2026',
        ia4: 'January 2027',
        annual: 'February 2027'
      };

      const targetMonth = milestoneEndMonths[milestoneKey] || 'February 2027';
      const targetIndex = roadmap.findIndex(entry => 
        entry.month.toLowerCase() === targetMonth.toLowerCase()
      );
      activeIndex = targetIndex >= 0 ? targetIndex : roadmap.length - 1;
    } else {
      const monthStr = getCurrentMonthStr();
      const currentMonthIndex = roadmap.findIndex(entry => 
        entry.month.toLowerCase() === monthStr.toLowerCase()
      );
      activeIndex = currentMonthIndex >= 0 ? currentMonthIndex : 0;
    }

    const cumulativeChapters: any[] = [];
    for (let i = 0; i <= activeIndex; i++) {
      const entry = roadmap[i];
      if (!entry || !entry.chapters) continue;
      
      const subjectChs = entry.chapters.filter((ch: any) => 
        matchChapterSubject(ch.subject, subjectKey)
      );
      cumulativeChapters.push(...subjectChs);
    }
    return cumulativeChapters;
  };


  const getSubjectCategory = (subjectKey: string): 'math' | 'science' | 'social' | 'language' | 'skills' => {
    const key = subjectKey.toLowerCase();
    if (key.includes('ganita') || key.includes('algebra') || key.includes('geometry') || key.includes('math')) {
      return 'math';
    }
    if (key.includes('science') || key.includes('jigyasa') || key.includes('paribesa') || key.includes('life') || key.includes('physical') || key.includes('surrounding')) {
      return 'science';
    }
    if (key.includes('social') || key.includes('geography') || key.includes('history') || key.includes('samajika') || key.includes('nagari') || key.includes('rajaniti') || key.includes('bhugola')) {
      return 'social';
    }
    if (key.includes('kausala') || key.includes('vocational') || key.includes('art') || key.includes('sikhya') || key.includes('khela') || key.includes('sharirika') || key.includes('yoga') || key.includes('palette') || key.includes('wellness') || key.includes('skill')) {
      return 'skills';
    }
    return 'language';
  };

  const getSubjectIconTypes = (subjectKey: string): string[] => {
    const cat = getSubjectCategory(subjectKey);
    if (cat === 'math') {
      return ['axes', 'triangle', 'circle', 'matrix', 'integral', 'axes', 'triangle', 'matrix', 'circle', 'axes'];
    }
    if (cat === 'science') {
      return ['beaker', 'atom', 'dna', 'bulb', 'magnet', 'lens', 'prism', 'concave_mirror', 'beaker', 'atom'];
    }
    if (cat === 'language') {
      return ['book', 'quill', 'school', 'slate', 'scroll', 'book', 'quill', 'slate', 'scroll', 'school'];
    }
    if (cat === 'skills') {
      return ['palette', 'bulb', 'school', 'puzzle', 'sprout', 'slate', 'palette', 'bulb', 'puzzle', 'sprout'];
    }
    return ['globe', 'mountain', 'river', 'temple', 'globe', 'mountain', 'river', 'temple', 'globe', 'mountain'];
  };

  const fetchWorksheetChapters = async (subjectKey: string) => {
    setIsLoadingWorksheetChapters(true);
    try {
      const clsStr = (userClass || '10').trim();
      const q = query(
        collection(db, 'chapters'), 
        where('class', '==', `class${clsStr}`),
        where('subject', '==', subjectKey)
      );
      const snap = await getDocs(q);
      const docsData: any[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter chapters by roadmap up to current month
      const roadmapChapters = getCumulativeChaptersForSubject(subjectKey);
      
      const finalChapters = roadmapChapters.map((roadCh, idx) => {
        const titleRoad = (roadCh.title_en || roadCh.title || '').toLowerCase();
        
        // Find matching chapter in Firestore docsData
        const matchedDbCh = docsData.find((dbCh: any) => {
          const titleDb = (dbCh.title || '').toLowerCase();
          return titleDb.includes(titleRoad) || titleRoad.includes(titleDb);
        });
        
        if (matchedDbCh) {
          return {
            id: matchedDbCh.id,
            title: (language === 'en' ? roadCh.title_en : roadCh.title_or) || roadCh.title || matchedDbCh.title,
            quiz_questions: matchedDbCh.quiz_questions || matchedDbCh.mcqs || []
          };
        }
        
        // Fallback using roadmap local questions if not in Firestore yet
        const localKey = Object.keys(CHAPTER_QUESTION_BANK).find(k => titleRoad.includes(k)) || '';
        return {
          id: `roadmap_${idx}`,
          title: (language === 'en' ? roadCh.title_en : roadCh.title_or) || roadCh.title || 'Untitled Chapter',
          quiz_questions: CHAPTER_QUESTION_BANK[localKey]?.mcqs || []
        };
      });

      setWorksheetChaptersList(finalChapters);
      setSelectedWorksheetChapters(finalChapters.map((c: any) => c.id));
    } catch (err) {
      console.error("Failed to fetch worksheet chapters:", err);
      const roadmapChapters = getCumulativeChaptersForSubject(subjectKey);
      const mapped = roadmapChapters.map((ch, idx) => ({
        id: `roadmap_${idx}`,
        title: (language === 'en' ? ch.title_en : ch.title_or) || ch.title || 'Untitled Chapter',
        quiz_questions: []
      }));
      setWorksheetChaptersList(mapped);
      setSelectedWorksheetChapters(mapped.map((c: any) => c.id));
    } finally {
      setIsLoadingWorksheetChapters(false);
    }
  };

  const handleCloseWorksheetModal = () => {
    setShowImportantPapersModal(false);
    setWorksheetStep(1);
    setSelectedWorksheetSubject('');
    setSelectedWorksheetChapters([]);
    setWorksheetDifficulty('medium');
    setWorksheetPattern('quick');
    setIsGeneratingWorksheet(false);
    setWorksheetGeneratingProgress(0);
    setWorksheetGeneratingStatusText('');
  };

  const cleanLaTeX = (text: string): string => {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/\$/g, '');
    cleaned = cleaned.replace(/\\frac\s*{(.*?)}\s*{(.*?)}/g, '($1/$2)');
    cleaned = cleaned.replace(/\\sqrt\s*{(.*?)}/g, '√$1');
    cleaned = cleaned.replace(/\\pm/g, '±');
    cleaned = cleaned.replace(/\\theta/g, 'θ');
    cleaned = cleaned.replace(/\\alpha/g, 'α');
    cleaned = cleaned.replace(/\\beta/g, 'β');
    cleaned = cleaned.replace(/\\pi/g, 'π');
    cleaned = cleaned.replace(/\\times/g, '×');
    cleaned = cleaned.replace(/\\div/g, '÷');
    cleaned = cleaned.replace(/\\neq/g, '≠');
    cleaned = cleaned.replace(/\\leq/g, '≤');
    cleaned = cleaned.replace(/\\geq/g, '≥');
    cleaned = cleaned.replace(/\\degree/g, '°');
    cleaned = cleaned.replace(/\\Delta/g, 'Δ');
    cleaned = cleaned.replace(/\^2/g, '²');
    cleaned = cleaned.replace(/\^3/g, '³');
    cleaned = cleaned.replace(/_1/g, '₁');
    cleaned = cleaned.replace(/_2/g, '₂');
    cleaned = cleaned.replace(/_n/g, 'ₙ');
    cleaned = cleaned.replace(/\\text\s*{(.*?)}/g, '$1');
    cleaned = cleaned.replace(/\\mathrm\s*{(.*?)}/g, '$1');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  };

  const drawWobblyLine = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / 12);
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      const wobbleVal = (Math.sin(t * Math.PI * 6) * 0.9) + (Math.random() - 0.5) * 0.4;
      ctx.lineTo(x + wobbleVal, y + wobbleVal);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawWobblyRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, width: number) => {
    drawWobblyLine(ctx, x, y, x + w, y, color, width);
    drawWobblyLine(ctx, x + w, y, x + w, y + h, color, width);
    drawWobblyLine(ctx, x + w, y + h, x, y + h, color, width);
    drawWobblyLine(ctx, x, y + h, x, y, color, width);
  };

  const wobble = (val: number, amp = 1.8) => val + (Math.random() - 0.5) * amp;

  const drawSketchIcon = (ctx: CanvasRenderingContext2D, type: string, x: number, y: number, strokeColor = '#334155') => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'temple') {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 137, 71, 0.18)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.quadraticCurveTo(wobble(x + 22), wobble(y + 45), wobble(x + 22), wobble(y + 60));
      ctx.lineTo(wobble(x + 58), wobble(y + 60));
      ctx.quadraticCurveTo(wobble(x + 58), wobble(y + 45), wobble(x + 40), wobble(y + 12));
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.quadraticCurveTo(wobble(x + 22), wobble(y + 45), wobble(x + 22), wobble(y + 60));
      ctx.lineTo(wobble(x + 58), wobble(y + 60));
      ctx.quadraticCurveTo(wobble(x + 58), wobble(y + 45), wobble(x + 40), wobble(y + 12));
      ctx.stroke();

      for (let r = 26; r < 60; r += 12) {
        ctx.beginPath();
        ctx.moveTo(wobble(x + 26), wobble(y + r));
        ctx.lineTo(wobble(x + 54), wobble(y + r));
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 12));
      ctx.lineTo(wobble(x + 40), wobble(y + 2));
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 2));
      ctx.lineTo(wobble(x + 54), wobble(y + 6));
      ctx.lineTo(wobble(x + 40), wobble(y + 10));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'flower') {
      const cx = x + 40;
      const cy = y + 30;
      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(wobble(cx), wobble(cy + 8));
      ctx.quadraticCurveTo(wobble(cx - 5), wobble(cy + 30), wobble(cx - 2), wobble(y + 62));
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        const px = cx + Math.cos(a) * 14;
        const py = cy + Math.sin(a) * 14;
        ctx.beginPath();
        ctx.arc(wobble(px), wobble(py), 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        const px = cx + Math.cos(a) * 14;
        const py = cy + Math.sin(a) * 14;
        ctx.beginPath();
        ctx.arc(wobble(px), wobble(py), 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(wobble(cx), wobble(cy), 8, 0, Math.PI * 2);
      ctx.stroke();
    } else if (type === 'mountain') {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 15), wobble(y + 60));
      ctx.lineTo(wobble(x + 40), wobble(y + 15));
      ctx.lineTo(wobble(x + 65), wobble(y + 60));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(4, 120, 87, 0.12)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 35), wobble(y + 60));
      ctx.lineTo(wobble(x + 55), wobble(y + 25));
      ctx.lineTo(wobble(x + 75), wobble(y + 60));
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 15), wobble(y + 60));
      ctx.lineTo(wobble(x + 40), wobble(y + 15));
      ctx.lineTo(wobble(x + 65), wobble(y + 60));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 35), wobble(y + 60));
      ctx.lineTo(wobble(x + 55), wobble(y + 25));
      ctx.lineTo(wobble(x + 75), wobble(y + 60));
      ctx.stroke();
    } else if (type === 'river') {
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 10), wobble(y + 18));
      ctx.bezierCurveTo(wobble(x + 30), wobble(y + 8), wobble(x + 50), wobble(y + 54), wobble(x + 70), wobble(y + 44));
      ctx.lineTo(wobble(x + 70), wobble(y + 62));
      ctx.bezierCurveTo(wobble(x + 50), wobble(y + 72), wobble(x + 30), wobble(y + 26), wobble(x + 10), wobble(y + 36));
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 10), wobble(y + 18));
      ctx.bezierCurveTo(wobble(x + 30), wobble(y + 8), wobble(x + 50), wobble(y + 54), wobble(x + 70), wobble(y + 44));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 10), wobble(y + 36));
      ctx.bezierCurveTo(wobble(x + 30), wobble(y + 26), wobble(x + 50), wobble(y + 72), wobble(x + 70), wobble(y + 62));
      ctx.stroke();
    } else if (type === 'school') {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 15), wobble(y + 60));
      ctx.lineTo(wobble(x + 15), wobble(y + 28));
      ctx.quadraticCurveTo(wobble(x + 40), wobble(y + 8), wobble(x + 65), wobble(y + 28));
      ctx.lineTo(wobble(x + 65), wobble(y + 60));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(120, 113, 108, 0.25)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 28), wobble(y + 60));
      ctx.lineTo(wobble(x + 28), wobble(y + 38));
      ctx.quadraticCurveTo(wobble(x + 40), wobble(y + 26), wobble(x + 52), wobble(y + 38));
      ctx.lineTo(wobble(x + 52), wobble(y + 60));
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 15), wobble(y + 60));
      ctx.lineTo(wobble(x + 15), wobble(y + 28));
      ctx.quadraticCurveTo(wobble(x + 40), wobble(y + 8), wobble(x + 65), wobble(y + 28));
      ctx.lineTo(wobble(x + 65), wobble(y + 60));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 28), wobble(y + 60));
      ctx.lineTo(wobble(x + 28), wobble(y + 38));
      ctx.quadraticCurveTo(wobble(x + 40), wobble(y + 26), wobble(x + 52), wobble(y + 38));
      ctx.lineTo(wobble(x + 52), wobble(y + 60));
      ctx.stroke();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(253, 251, 236, 0.75)';
      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 22));
      ctx.quadraticCurveTo(wobble(x + 25), wobble(y + 10), wobble(x + 12), wobble(y + 16));
      ctx.lineTo(wobble(x + 12), wobble(y + 46));
      ctx.quadraticCurveTo(wobble(x + 25), wobble(y + 40), wobble(x + 40), wobble(y + 52));
      ctx.quadraticCurveTo(wobble(x + 55), wobble(y + 40), wobble(x + 68), wobble(y + 46));
      ctx.lineTo(wobble(x + 68), wobble(y + 16));
      ctx.quadraticCurveTo(wobble(x + 55), wobble(y + 10), wobble(x + 40), wobble(y + 22));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.28)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 40, y + 23);
      ctx.lineTo(x + 40, y + 51);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 52));
      ctx.quadraticCurveTo(wobble(x + 25), wobble(y + 40), wobble(x + 12), wobble(y + 46));
      ctx.lineTo(wobble(x + 12), wobble(y + 16));
      ctx.quadraticCurveTo(wobble(x + 25), wobble(y + 10), wobble(x + 40), wobble(y + 22));
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(wobble(x + 40), wobble(y + 22));
      ctx.quadraticCurveTo(wobble(x + 55), wobble(y + 10), wobble(x + 68), wobble(y + 16));
      ctx.lineTo(wobble(x + 68), wobble(y + 46));
      ctx.quadraticCurveTo(wobble(x + 55), wobble(y + 40), wobble(x + 40), wobble(y + 52));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  const curateWorksheetQuestions = (subjectKey: string, chapters: any[], difficulty: 'easy' | 'medium' | 'hard', pattern: 'quick' | 'full') => {
    const isBoard = userClass === '9' || userClass === '10';
    let totalMcqs = 10;
    let totalSubjectives = 3;
    
    if (pattern === 'quick') {
      totalMcqs = 10;
      totalSubjectives = 3;
    } else {
      if (isBoard) {
        const isHalfPaper = ['physical_science', 'life_science', 'social_science', 'geography', 'vocational'].includes(subjectKey);
        if (isHalfPaper) {
          totalMcqs = 25;
          totalSubjectives = 3;
        } else {
          totalMcqs = 50;
          totalSubjectives = 5;
        }
      } else {
        totalMcqs = 30;
        totalSubjectives = 5;
      }
    }
    
    let mcqPool: any[] = [];
    let subjectivePool: any[] = [];
    
    chapters.forEach(ch => {
      let qList: any[] = [];
      if (ch.quiz_questions && Array.isArray(ch.quiz_questions)) {
        qList = ch.quiz_questions;
      } else if (ch.mcqs && Array.isArray(ch.mcqs)) {
        qList = ch.mcqs;
      }
      
      qList.forEach(q => {
        const isSubj = q.type === 'subjective' || q.isSubjective || !q.options || !Array.isArray(q.options) || q.options.length === 0;
        if (isSubj) {
          subjectivePool.push({
            question: q.question,
            hint: q.answer || q.hint || q.correct_answer || 'Use standard textbook steps to explain.'
          });
        } else {
          mcqPool.push({
            question: q.question,
            options: q.options,
            answer: q.answer || (typeof q.correctAnswer === 'number' ? q.options[q.correctAnswer] : q.correctAnswer) || ''
          });
        }
      });
    });
    
    chapters.forEach(ch => {
      const title = (ch.title_en || ch.title || '').toLowerCase();
      Object.keys(CHAPTER_QUESTION_BANK).forEach(bankKey => {
        if (title.includes(bankKey)) {
          const bank = CHAPTER_QUESTION_BANK[bankKey];
          if (bank.mcqs) mcqPool.push(...bank.mcqs);
          if (bank.subjectives) subjectivePool.push(...bank.subjectives);
        }
      });
    });
    
    const uniqueMcqs: any[] = [];
    const seenMcqs = new Set<string>();
    mcqPool.forEach(q => {
      const qText = (q.question || '').trim().toLowerCase();
      if (qText && !seenMcqs.has(qText)) {
        seenMcqs.add(qText);
        uniqueMcqs.push(q);
      }
    });
    
    const uniqueSubjectives: any[] = [];
    const seenSubjectives = new Set<string>();
    subjectivePool.forEach(q => {
      const qText = (q.question || '').trim().toLowerCase();
      if (qText && !seenSubjectives.has(qText)) {
        seenSubjectives.add(qText);
        uniqueSubjectives.push(q);
      }
    });
    
    if (uniqueMcqs.length < totalMcqs) {
      const fb = generateFallbackQuestions(subjectKey, chapters, isBoard);
      fb.forEach(q => {
        const qText = (q.question || '').trim().toLowerCase();
        if (!seenMcqs.has(qText)) {
          seenMcqs.add(qText);
          uniqueMcqs.push(q);
        }
      });
    }
    
    if (uniqueSubjectives.length < totalSubjectives) {
      const fb = generateFallbackSubjectives(subjectKey, chapters, isBoard);
      fb.forEach(q => {
        const qText = (q.question || '').trim().toLowerCase();
        if (!seenSubjectives.has(qText)) {
          seenSubjectives.add(qText);
          uniqueSubjectives.push(q);
        }
      });
    }
    
    let selectedMcqs = [...uniqueMcqs];
    let selectedSubjectives = [...uniqueSubjectives];
    
    if (difficulty === 'easy') {
      selectedMcqs.sort((a, b) => (a.question.length - b.question.length));
      selectedSubjectives.sort((a, b) => (a.question.length - b.question.length));
    } else if (difficulty === 'hard') {
      selectedMcqs.sort((a, b) => (b.question.length - a.question.length));
      selectedSubjectives.sort((a, b) => (b.question.length - a.question.length));
    }
    
    return {
      mcqs: selectedMcqs.slice(0, totalMcqs),
      subjectives: selectedSubjectives.slice(0, totalSubjectives)
    };
  };

  const generateCustomWorksheetPDF = async () => {
    setIsGeneratingWorksheet(true);
    setWorksheetStep(3);
    setWorksheetGeneratingProgress(5);

    // Check if duplicate worksheet exists (bypassed on localhost for development/testing)
    const classNormalized = `class${userClass || '10'}`;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost) {
      try {
        setWorksheetGeneratingStatusText(
          language === 'en' 
            ? 'Checking if this worksheet is already generated...' 
            : 'ଏହି ପ୍ରଶ୍ନପତ୍ର ପୂର୍ବରୁ ପ୍ରସ୍ତୁତ ହୋଇଛି କି ନାହିଁ ଯାଞ୍ଚ କରାଯାଉଛି...'
        );
        
        const { getDocs, query, collection, where } = await import('firebase/firestore');
        const q = query(
          collection(db, 'community'),
          where('class', '==', classNormalized),
          where('fileType', '==', 'pdf'),
          where('subjectKey', '==', selectedWorksheetSubject)
        );
        
        const querySnapshot = await getDocs(q);
        let alreadyExists = false;
        
        for (const docSnap of querySnapshot.docs) {
          const docData = docSnap.data();
          const existingChapters = docData.chapters || [];
          const hasIntersection = selectedWorksheetChapters.some(ch => existingChapters.includes(ch));
          if (hasIntersection) {
            alreadyExists = true;
            break;
          }
        }
        
        if (alreadyExists) {
          alert(
            language === 'en'
              ? "This chapter's worksheet has already been generated! Please use the File Manager (folder icon at the top of the chat) to see all downloaded question files."
              : "ଏହି ଅଧ୍ୟାୟର ପ୍ରଶ୍ନପତ୍ର ପୂର୍ବରୁ ପ୍ରସ୍ତୁତ ସରିଛି! ସମସ୍ତ ଡାଉନଲୋଡ୍ ହୋଇଥିବା ପ୍ରଶ୍ନପତ୍ର ଦେଖିବା ପାଇଁ ଦୟାକରି ଚାଟ୍‌ର ଉପରେ ଥିବା ଫାଇଲ୍ ମ୍ୟାନେଜର୍ (ଫୋଲ୍ଡର୍ ଆଇକନ୍) ବ୍ୟବହାର କରନ୍ତୁ।"
          );
          if (onOpenCommunity) {
            onOpenCommunity();
          }
          setIsGeneratingWorksheet(false);
          setWorksheetStep(1);
          return;
        }
      } catch (checkErr) {
        console.warn("Failed to check duplicate worksheet:", checkErr);
      }
    }

    setWorksheetGeneratingProgress(10);

    const isBoard = userClass === '9' || userClass === '10';
    let totalMcqs = 15;
    let totalSubjectives = 15;

    if (isBoard) {
      const sKey = selectedWorksheetSubject.toLowerCase();
      if (['physical_science', 'life_science', 'social_science', 'geography', 'vocational', 'history'].includes(sKey)) {
        totalMcqs = 12;
        totalSubjectives = 18;
      } else {
        totalMcqs = 15;
        totalSubjectives = 15;
      }
    } else {
      const classDigit = parseInt(userClass) || 10;
      if (classDigit >= 6 && classDigit <= 8) {
        totalMcqs = 10;
        totalSubjectives = 12;
      } else {
        totalMcqs = 5;
        totalSubjectives = 7;
      }
    }

    setWorksheetGeneratingStatusText(
      language === 'en' 
        ? `Generating ${totalMcqs} MCQ & ${totalSubjectives} Subjective questions via AI...` 
        : `AI ସାହାଯ୍ୟରେ ${totalMcqs}ଟି MCQ ଓ ${totalSubjectives}ଟି ଦୀର୍ଘ ପ୍ରଶ୍ନ ପ୍ରସ୍ତୁତ କରାଯାଉଛି...`
    );
    
    try {
      const subjectLabel = language === 'en' 
        ? (subjects.find((s: any) => s.key === selectedWorksheetSubject)?.labelEn || selectedWorksheetSubject)
        : (subjects.find((s: any) => s.key === selectedWorksheetSubject)?.labelOr || selectedWorksheetSubject);
      
      const selectedChaptersData = worksheetChaptersList.filter((ch: any) => 
        selectedWorksheetChapters.includes(ch.id || ch.title)
      );

      const response = await fetch('/api/ai/generate-custom-worksheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          className: `Class ${userClass}`,
          subjectName: subjectLabel,
          subjectKey: selectedWorksheetSubject,
          chapters: selectedWorksheetChapters,
          language,
          difficulty: 'medium',
          pattern: 'full'
        })
      });

      if (!response.ok) {
        throw new Error(language === 'en' ? 'Failed to generate custom worksheet from server.' : 'ସର୍ଭରରୁ ପ୍ରଶ୍ନପତ୍ର ପ୍ରସ୍ତୁତ କରିବାରେ ବିଫଳ ହେଲା।');
      }

      const data = await response.json();
      const mcqs = data.mcqs || [];
      const subjectives = data.subjectives || [];
      
      setWorksheetGeneratingProgress(35);
      setWorksheetGeneratingStatusText(language === 'en' ? 'Loading assets...' : 'ସମ୍ପତ୍ତି ଲୋଡ୍ କରାଯାଉଛି...');
      
      const logoImg = new Image();
      logoImg.src = '/utkal-512.png';
      await new Promise(resolve => { logoImg.onload = resolve; logoImg.onerror = resolve; });
      
      const mascotImg = new Image();
      mascotImg.src = '/gundulu-pointing-nobg.png';
      await new Promise(resolve => { mascotImg.onload = resolve; mascotImg.onerror = resolve; });
      
      setWorksheetGeneratingProgress(50);
      setWorksheetGeneratingStatusText(language === 'en' ? 'Rendering wobbly notebook lines...' : 'ଖାତା ପୃଷ୍ଠା ପ୍ରସ୍ତୁତ କରାଯାଉଛି...');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const docWidth = 210;
      const docHeight = 297;
      
      let pageNumber = 1;
      let canvas = document.createElement('canvas');
      canvas.width = 1240;
      canvas.height = 1754;
      let ctx = canvas.getContext('2d')!;
      
      const drawPaperBackground = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#FCFBF7';
        ctx.fillRect(0, 0, 1240, 1754);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.8;
        
        drawWobblyLine(ctx, 140, 40, 140, 1714, 'rgba(239, 68, 68, 0.4)', 1.8);
        drawWobblyLine(ctx, 144, 40, 144, 1714, 'rgba(239, 68, 68, 0.4)', 1.8);
        drawWobblyLine(ctx, 40, 210, 1200, 210, 'rgba(239, 68, 68, 0.4)', 1.8);
        
        for (let yLine = 252; yLine <= 1620; yLine += 42) {
          drawWobblyLine(ctx, 144, yLine, 1200, yLine, 'rgba(14, 165, 233, 0.12)', 1.5);
        }
        
        drawWobblyLine(ctx, 40, 40, 1200, 40, '#10b981', 3.5);
        drawWobblyLine(ctx, 40, 1714, 1200, 1714, '#10b981', 3.5);
        drawWobblyLine(ctx, 40, 40, 40, 1714, '#10b981', 3.5);
        drawWobblyLine(ctx, 1200, 40, 1200, 1714, '#10b981', 3.5);
      };
      
      drawPaperBackground(ctx);
      
      const drawHeader = (ctx: CanvasRenderingContext2D) => {
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.drawImage(logoImg, 180, 60, 95, 95);
        }
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText("UTKAL SKILL CENTRE", 300, 95);
        
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px Arial, sans-serif';
        ctx.fillText("ODISHA'S PREMIER DIGITAL EDUCATION COOPERATIVE", 300, 118);
        
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 15px Arial, sans-serif';
        ctx.fillText(`MTS CUSTOM WORKSHEET • CLASS ${userClass || '10'}`, 300, 140);
        
        drawWobblyRect(ctx, 800, 60, 370, 110, '#94a3b8', 1.5);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText("NAME: ____________________", 815, 95);
        ctx.fillText("ROLL: ________  DATE: ____", 815, 135);
      };
      
      drawHeader(ctx);
      
      let y = 252;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px Arial, sans-serif';
      ctx.fillText(`SUBJECT: ${subjectLabel}`, 180, y);
      
      let totalMarks = 50;
      if (isBoard) {
        const sKey = selectedWorksheetSubject.toLowerCase();
        if (['physical_science', 'life_science', 'social_science', 'geography', 'vocational', 'history'].includes(sKey)) {
          totalMarks = 50;
        } else {
          totalMarks = 100;
        }
      } else {
        const classDigit = parseInt(userClass) || 10;
        if (classDigit >= 6 && classDigit <= 8) {
          totalMarks = 45;
        } else {
          totalMarks = 25;
        }
      }

      ctx.fillText(`MARKS: ${totalMarks}`, 600, y);
      ctx.fillText(`DIFFICULTY: MEDIUM`, 940, y);
      y += 42;
      
      ctx.fillStyle = '#475569';
      ctx.font = 'italic 14px Arial, sans-serif';
      const syllabusTitles = selectedChaptersData.map((c: any) => c.title || c.title_en || '').slice(0, 4).join(', ');
      ctx.fillText(`SYLLABUS: ${syllabusTitles}${selectedChaptersData.length > 4 ? '...' : ''}`, 180, y);
      y += 42;
      
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, y - 10);
      ctx.lineTo(1180, y - 10);
      ctx.stroke();
      
      const finalizePage = (pageCtx: CanvasRenderingContext2D, pageNum: number) => {
        if (mascotImg.complete && mascotImg.naturalWidth > 0) {
          pageCtx.drawImage(mascotImg, 980, 1420, 180, 180);
        }
        pageCtx.fillStyle = '#64748b';
        pageCtx.font = 'italic 13px Arial, sans-serif';
        pageCtx.textAlign = 'center';
        pageCtx.fillText(
          language === 'en'
            ? "Practice daily on Utkal Skill Centre • Share this worksheet with friends!"
            : "ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ପ୍ରତିଦିନ ଅଭ୍ୟାସ କରନ୍ତୁ • ଏହି ପ୍ରଶ୍ନପତ୍ରକୁ ସାଙ୍ଗମାନଙ୍କ ସହ ଶେୟାର କରନ୍ତୁ!",
          620,
          1665
        );
        pageCtx.font = 'bold 12px Arial, sans-serif';
        pageCtx.fillText(`Page ${pageNum}`, 620, 1690);
        pageCtx.textAlign = 'left';
      };
      
      const checkPageOverflow = (currentY: number, spaceNeeded: number) => {
        if (currentY + spaceNeeded > 1540) {
          finalizePage(ctx, pageNumber);
          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          if (pageNumber > 1) {
            doc.addPage();
          }
          doc.addImage(imgData, 'JPEG', 0, 0, docWidth, docHeight);
          pageNumber++;
          canvas = document.createElement('canvas');
          canvas.width = 1240;
          canvas.height = 1754;
          ctx = canvas.getContext('2d')!;
          drawPaperBackground(ctx);
          return 252;
        }
        return currentY;
      };
      
      setWorksheetGeneratingProgress(65);
      setWorksheetGeneratingStatusText(language === 'en' ? 'Writing Section A (MCQs)...' : 'ବିଭାଗ କ (MCQ) ଲେଖାଯାଉଛି...');
      
      if (mcqs.length > 0) {
        y = checkPageOverflow(y, 60);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText("SECTION A: MULTIPLE CHOICE QUESTIONS (MCQ)", 180, y);
        y += 42;
        
        mcqs.forEach((q, idx) => {
          const cleanQ = cleanLaTeX(q.question);
          ctx.font = 'bold 15px Arial, sans-serif';
          const qLines = wrapText(ctx, `Q${idx + 1}. ${cleanQ}`, 960);
          const qSpace = (qLines.length + q.options.length + 1) * 42;
          y = checkPageOverflow(y, qSpace);
          
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 15px Arial, sans-serif';
          qLines.forEach((line, lineIdx) => {
            ctx.fillText(line, 180, y);
            if (lineIdx === 0) {
              ctx.textAlign = 'right';
              ctx.fillText('[1]', 1150, y);
              ctx.textAlign = 'left';
            }
            y += 42;
          });
          
          ctx.font = '15px Arial, sans-serif';
          ctx.fillStyle = '#334155';
          q.options.forEach((opt: string, optIdx: number) => {
            const optLetter = String.fromCharCode(97 + optIdx);
            const cleanOpt = cleanLaTeX(opt);
            ctx.fillText(`(${optLetter})  ${cleanOpt}`, 220, y);
            y += 42;
          });
          y += 20;
          y = Math.ceil(y / 42) * 42;
        });
      }
      
      setWorksheetGeneratingProgress(85);
      setWorksheetGeneratingStatusText(language === 'en' ? 'Writing Section B (Subjectives)...' : 'ବିଭାଗ ଖ (ଦୀର୍ଘ ପ୍ରଶ୍ନ) ଲେଖାଯାଉଛି...');
      
      if (subjectives.length > 0) {
        y = checkPageOverflow(y, 80);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText("SECTION B: SUBJECTIVE QUESTIONS", 180, y);
        y += 42;
        
        const subjectIcons = getSubjectIconTypes(selectedWorksheetSubject);
        subjectives.forEach((q, idx) => {
          const cleanQ = cleanLaTeX(q.question);
          ctx.font = 'bold 15px Arial, sans-serif';
          const qLines = wrapText(ctx, `Q${idx + mcqs.length + 1}. ${cleanQ}`, 960);
          
          ctx.font = 'bold italic 11px Arial, sans-serif';
          const cleanHint = cleanLaTeX(q.hint);
          const hintPrefix = language === 'en' ? 'Hint: ' : 'ସୂଚନା: ';
          const hintLines = wrapText(ctx, `${hintPrefix}${cleanHint}`, 960);
          
          const optSpace = (qLines.length + 1 + 4 + hintLines.length) * 42;
          y = checkPageOverflow(y, optSpace);
          
          const iconType = subjectIcons[idx % subjectIcons.length] || 'book';
          drawSketchIcon(ctx, iconType, 50, y - 25, '#1e293b');
          
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 15px Arial, sans-serif';
          qLines.forEach((line, lineIdx) => {
            ctx.fillText(line, 180, y);
            if (lineIdx === 0) {
              const marks = q.marks || (idx % 3 === 0 ? 5 : (idx % 3 === 1 ? 2 : 3));
              ctx.textAlign = 'right';
              ctx.fillText(`[${marks}]`, 1150, y);
              ctx.textAlign = 'left';
            }
            y += 42;
          });
          
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'italic 12px Arial, sans-serif';
          ctx.fillText("Student Answer Area (Write answers below)", 180, y);
          y += 42;
          y += 42 * 4;
          
          ctx.fillStyle = '#334155';
          ctx.font = 'bold italic 11px Arial, sans-serif';
          hintLines.forEach(line => {
            ctx.fillText(line, 180, y);
            y += 42;
          });
          y += 20;
          y = Math.ceil(y / 42) * 42;
        });
      }
      
      finalizePage(ctx, pageNumber);
      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      if (pageNumber > 1) {
        doc.addPage();
      }
      doc.addImage(imgData, 'JPEG', 0, 0, docWidth, docHeight);
      
      setWorksheetGeneratingProgress(95);
      setWorksheetGeneratingStatusText(language === 'en' ? 'Finalizing PDF...' : 'PDF ଚୂଡ଼ାନ୍ତ ରୂପ ଦିଆଯାଉଛି...');
      
      let chapterSuffix = '';
      if (selectedChaptersData.length === 1) {
        const cleanTitle = selectedChaptersData[0].title
          .replace(/[^a-zA-Z0-9\u0b00-\u0b7f\s]+/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .substring(0, 20);
        chapterSuffix = `_${cleanTitle}`;
      } else if (selectedChaptersData.length > 1) {
        chapterSuffix = language === 'or'
          ? `_${selectedChaptersData.length}_ଅଧ୍ୟାୟ`
          : `_${selectedChaptersData.length}_chapters`;
      }

      const filename = language === 'or'
        ? `ଉତ୍କଳ_ପ୍ରଶ୍ନପତ୍ର_ଶ୍ରେଣୀ_${userClass}_${subjectLabel.replace(/\s+/g, '_')}${chapterSuffix}.pdf`
        : `USC_Worksheet_Class${userClass}_${selectedWorksheetSubject.toUpperCase()}_${worksheetDifficulty}${chapterSuffix}.pdf`;
      
      const isStudent = user?.role === 'student' || !user?.role;
      if (isStudent) {
        try {
          setWorksheetGeneratingProgress(90);
          setWorksheetGeneratingStatusText(language === 'en' ? 'Sharing to Class Community...' : 'ଶ୍ରେଣୀ କମ୍ୟୁନିଟିରେ ଶେୟାର୍ ହେଉଛି...');
          
          const pdfBlob = doc.output('blob');
          const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const { storage } = await import('../firebase');
          const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
          
          const classNormalized = `class${userClass || '10'}`;
          const fileRef = storageRef(storage, `community_files/${classNormalized}/${Date.now()}_${filename}`);
          const uploadResult = await uploadBytes(fileRef, pdfBlob);
          const pdfUrl = await getDownloadURL(uploadResult.ref);
          
          await addDoc(collection(db, 'community'), {
            text: language === 'en' 
              ? `I just generated a custom practice worksheet for Class ${userClass || '10'} ${subjectLabel} (${worksheetDifficulty} difficulty)!`
              : `ମୁଁ ଶ୍ରେଣୀ ${userClass || '10'} ${subjectLabel} (${worksheetDifficulty} ଅସୁବିଧା) ପାଇଁ ଏକ ଅଭ୍ୟାସ ପ୍ରଶ୍ନପତ୍ର ପ୍ରସ୍ତୁତ କରିଛି!`,
            userId: user.id || user.uid,
            userName: user.name || 'Student',
            userAvatar: user.avatar || null,
            class: classNormalized,
            role: 'student',
            timestamp: serverTimestamp()
          });
          
          await addDoc(collection(db, 'community'), {
            text: language === 'en'
              ? `Approved! Here is the download link for the Class ${userClass || '10'} ${subjectLabel} Worksheet:`
              : `ଅନୁମୋଦିତ! ଶ୍ରେଣୀ ${userClass || '10'} ${subjectLabel} ପ୍ରଶ୍ନପତ୍ର ଡାଉନଲୋଡ୍ କରିବା ପାଇଁ ଲିଙ୍କ୍:`,
            fileUrl: pdfUrl,
            fileName: filename,
            fileType: 'pdf',
            userId: 'admin_ai',
            userName: 'Utkal Admin AI',
            userAvatar: null,
            class: classNormalized,
            role: 'admin',
            timestamp: serverTimestamp(),
            subjectKey: selectedWorksheetSubject,
            chapters: selectedWorksheetChapters
          });
          
          if (onOpenCommunity) {
            onOpenCommunity();
          }
        } catch (shareErr) {
          console.error("Failed to share worksheet to community:", shareErr);
        }
      }
      
      doc.save(filename);
      
      setWorksheetGeneratingProgress(100);
      setWorksheetGeneratingStatusText(language === 'en' ? 'Downloaded successfully!' : 'ସଫଳତାର ସହ ଡାଉନଲୋଡ୍ ହୋଇଛି!');
      setWorksheetStep(3);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert(language === 'en' ? "Failed to generate worksheet. Please try again." : "ପ୍ରଶ୍ନପତ୍ର ପ୍ରସ୍ତୁତ କରିବାରେ ବିଫଳ ହେଲା। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।");
    } finally {
      setIsGeneratingWorksheet(false);
    }
  };

  const handleShareWorksheet = async () => {
    const text = language === 'en'
      ? `Hey! I just generated a custom wobbly-notebook revision worksheet for BSE Odisha class ${userClass} exams on Utkal Skill Centre. It looks amazing! Try it yourself here: https://utkalskillcentre.com`
      : `ନମସ୍କାର! ମୁଁ ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ମୋ ପରୀକ୍ଷା ପାଇଁ ଏକ କଷ୍ଟମ୍ ଖାତା ପରି ପ୍ରଶ୍ନପତ୍ର ତିଆରି କରି ଡାଉନଲୋଡ୍ କଲି । ଆପଣ ମଧ୍ୟ ଏଠାରେ ଚେଷ୍ଟା କରନ୍ତୁ: https://utkalskillcentre.com`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'en' ? 'BSE Odisha Exam Worksheet' : 'BSE ଓଡ଼ିଶା ପରୀକ୍ଷା ପ୍ରଶ୍ନପତ୍ର',
          text: text,
          url: 'https://utkalskillcentre.com'
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const curateMcqsForSubject = (subjectKey: string, chapters: any[], count: number, isBoard: boolean) => {
    let pool: Array<{ question: string; options: string[] }> = [];
    
    chapters.forEach(ch => {
      const title = (ch.title_en || ch.title || '').toLowerCase();
      Object.keys(CHAPTER_QUESTION_BANK).forEach(bankKey => {
        if (title.includes(bankKey)) {
          pool.push(...CHAPTER_QUESTION_BANK[bankKey].mcqs);
        }
      });
    });
    
    const uniquePool: typeof pool = [];
    const seen = new Set<string>();
    pool.forEach(q => {
      if (!seen.has(q.question)) {
        seen.add(q.question);
        uniquePool.push(q);
      }
    });
    
    let result = [...uniquePool];
    if (result.length < count) {
      const fallbacks = generateFallbackQuestions(subjectKey, chapters, isBoard);
      fallbacks.forEach(q => {
        if (result.length < count && !result.some(r => r.question === q.question)) {
          result.push(q);
        }
      });
    }
    
    if (result.length < count) {
      const general = getMockQuestions(subjectKey);
      general.forEach(q => {
        if (result.length < count && !result.some(r => r.question === q.question)) {
          result.push(q);
        }
      });
    }
    
    return result.slice(0, count);
  };

  const curateSubjectivesForSubject = (subjectKey: string, chapters: any[], type: 'quick' | 'full', isBoard: boolean) => {
    let pool: Array<{ question: string; hint: string }> = [];
    
    chapters.forEach(ch => {
      const title = (ch.title_en || ch.title || '').toLowerCase();
      Object.keys(CHAPTER_QUESTION_BANK).forEach(bankKey => {
        if (title.includes(bankKey)) {
          pool.push(...CHAPTER_QUESTION_BANK[bankKey].subjectives);
        }
      });
    });
    
    const uniquePool: typeof pool = [];
    const seen = new Set<string>();
    pool.forEach(q => {
      if (!seen.has(q.question)) {
        seen.add(q.question);
        uniquePool.push(q);
      }
    });
    
    let result = [...uniquePool];
    let needed = 3;
    if (type === 'full') {
      if (isBoard) {
        const isHalfPaper = ['physical_science', 'life_science', 'social_science', 'geography', 'vocational'].includes(subjectKey);
        needed = isHalfPaper ? 3 : 5;
      } else {
        needed = 5;
      }
    }
    
    if (result.length < needed) {
      const fallbacks = generateFallbackSubjectives(subjectKey, chapters, isBoard);
      fallbacks.forEach(q => {
        if (result.length < needed && !result.some(r => r.question === q.question)) {
          result.push(q);
        }
      });
    }
    
    if (result.length < needed) {
      const general = getMockSubjectiveQuestions(subjectKey);
      general.forEach(q => {
        if (result.length < needed && !result.some(r => r.question === q.question)) {
          result.push(q);
        }
      });
    }
    
    return result.slice(0, needed);
  };
  const [claimedTicket, setClaimedTicket] = useState<any>(null);
  const [dailyVideoId, setDailyVideoId] = useState<string | null>(isSpecialPromoPeriod ? 'Ml-_dY7FXrs' : null);

  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [homeworkClass, setHomeworkClass] = useState(userClass || '10');
  const [homeworkSubject, setHomeworkSubject] = useState('math');
  const [homeworkChapter, setHomeworkChapter] = useState('');
  const [homeworkDifficulty, setHomeworkDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [homeworkQCount, setHomeworkQCount] = useState(10);
  const [isGeneratingHomework, setIsGeneratingHomework] = useState(false);
  const [generatedHomework, setGeneratedHomework] = useState('');

  const [topStudyStudents, setTopStudyStudents] = useState<any[]>([]);
  const [displayedStudent, setDisplayedStudent] = useState<any | null>(null);
  const [activeRank, setActiveRank] = useState<number | null>(null);
  const [isSundayClosed, setIsSundayClosed] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'leaderboard'>('overview');

  const [leaderboardType, setLeaderboardType] = useState<'daily' | 'monthly'>('daily');
  const [selectedMonth, setSelectedMonth] = useState('may_2026');
  const [selectedClassFilter, setSelectedClassFilter] = useState(user?.class || '10');
  const [monthlyLeaderboardsData, setMonthlyLeaderboardsData] = useState<any>(null);
  const [loadingMonthlyData, setLoadingMonthlyData] = useState(false);

  useEffect(() => {
    if (activeSubTab !== 'leaderboard' || leaderboardType !== 'monthly') return;
    const fetchMonthlyData = async () => {
      setLoadingMonthlyData(true);
      try {
        const docRef = doc(db, 'system_settings', 'monthly_leaderboards');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMonthlyLeaderboardsData(docSnap.data());
        } else {
          console.log("No monthly leaderboards doc found in Firestore, using code fallback.");
        }
      } catch (error) {
        console.error("Error fetching monthly leaderboards:", error);
      } finally {
        setLoadingMonthlyData(false);
      }
    };
    fetchMonthlyData();
  }, [activeSubTab, leaderboardType]);

  useEffect(() => {
    if (!user || !user.name) return;

    // Exclude judge test accounts
    const userPhone = user.phoneNumber || user.phone || '';
    const isJudgeAccount = userPhone.includes('1234567890') || 
                           userPhone.includes('9876543210') ||
                           window.location.search.includes('judge') ||
                           window.location.hash.includes('judge') ||
                           window.location.search.includes('showcase');
    if (isJudgeAccount) return;

    const activeMonthName = completedMtsMonth;
    const activeYear = completedMtsYear;
    const claimTag = completedMtsClaimTag;


    const checkWinnerAndTicket = async () => {
      try {
        // Query user submissions for this month to check for winning ranks
        const subQuery = query(
          collection(db, 'monthly_test_submissions'),
          where('userId', '==', user.id),
          where('month', '==', activeMonthName),
          where('year', '==', activeYear)
        );
        const subSnap = await getDocs(subQuery);
        
        let dynamicRank: number | null = null;
        subSnap.docs.forEach(docSnap => {
          const sData = docSnap.data();
          if (sData.rank !== null && sData.rank !== undefined) {
            if (dynamicRank === null || sData.rank < dynamicRank) {
              dynamicRank = sData.rank;
            }
          }
        });

        const nameLower = user.name.trim().toLowerCase();
        const isHardcodedWinner = ['dibyansh', 'sohan', 'rohan', 'sujata', 'anik', 'subhakanta'].some(w => nameLower.includes(w));
        
        const isWinner = isHardcodedWinner || (dynamicRank !== null && dynamicRank <= 5);
        if (!isWinner) return;

        setUserBestMtsRank(dynamicRank);

        // Fetch support tickets to see if already claimed
        const q = query(
          collection(db, 'support_tickets'),
          where('userId', '==', user.id)
        );
        const snap = await getDocs(q);
        const tickets = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const claim = tickets.find((t: any) => t.message && (t.message.includes(claimTag) || t.message.includes('[MTS_CLAIM:may_2026]')));
        
        if (claim) {
          setClaimedTicket(claim);
        } else {
          setShowGiftUnlockModal(true);
        }
      } catch (err) {
        console.error("Error checking winner/claim ticket:", err);
      }
    };

    checkWinnerAndTicket();
  }, [user]);

  const monthsList = [
    { id: 'may_2026', label: language === 'en' ? 'May 2026' : 'ମଇ ୨୦୨୬' },
    { id: 'july_2026', label: language === 'en' ? 'July 2026' : 'ଜୁଲାଇ ୨୦୨୬' }
  ];

  const getMonthlyLeaderboardList = () => {
    if (monthlyLeaderboardsData && monthlyLeaderboardsData[selectedMonth]) {
      const monthData = monthlyLeaderboardsData[selectedMonth];
      if (monthData.type === 'combined') {
        return monthData.students || [];
      } else if (monthData.type === 'class-specific' && monthData.classes) {
        return monthData.classes[selectedClassFilter] || [];
      }
    }

    if (selectedMonth === 'may_2026') {
      return [
        { rank: 1, name: "Dibyansh Panda", class: "5", score: 15, school: language === 'en' ? "Bhubaneswar Govt Primary School" : "ସରକାରୀ ପ୍ରାଥମିକ ବିଦ୍ୟାଳୟ" },
        { rank: 1, name: "Sohan Lenka", class: "7", score: 15, school: language === 'en' ? "Cuttack Public School" : "କଟକ ପବ୍ଲିକ ସ୍କୁଲ" },
        { rank: 2, name: "Rohan Kumar Lenka", class: "8", score: 14.5, school: language === 'en' ? "Balasore High School" : "ବାଲେଶ୍ୱର ହାଇସ୍କୁଲ" },
        { rank: 3, name: "Sujata Singh", class: "10", score: 14, school: language === 'en' ? "Bhubaneswar Girls High School" : "ଭୁବନେଶ୍ୱର ବାଳିକା ହାଇସ୍କୁଲ" },
        { rank: 4, name: "Anik Arav Jena", class: "1", score: 13, school: language === 'en' ? "Saraswati Shishu Mandir" : "ସରସ୍ୱତୀ ଶିଶୁ ମନ୍ଦିର" },
        { rank: 5, name: "Student", class: "1", score: 12, school: language === 'en' ? "Regional Primary School" : "ଆଞ୍ଚଳିକ ପ୍ରାଥମିକ ବିଦ୍ୟାଳୟ" }
      ];
    }
    return [];
  };

  const getMtsStatus = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Check if there is a Sunday between the 5th and 10th of the current month
    let hasSundayInWindow = false;
    for (let d = 5; d <= 10; d++) {
      const dateToCheck = new Date(year, month, d);
      if (dateToCheck.getDay() === 0) {
        hasSundayInWindow = true;
        break;
      }
    }

    // Live starts on 5, but if 5 is a Sunday, starts on 6
    let examStartDay = 5;
    if (new Date(year, month, 5).getDay() === 0) {
      examStartDay = 6;
    }

    // Find examEndDay: we need exactly 6 active (non-Sunday) days starting from examStartDay
    let examEndDay = examStartDay;
    let activeDaysCount = 0;
    while (activeDaysCount < 6) {
      const dateToCheck = new Date(year, month, examEndDay);
      if (dateToCheck.getDay() !== 0) {
        activeDaysCount++;
      }
      if (activeDaysCount < 6) {
        examEndDay++;
      }
    }

    const gradingStartDay = examEndDay + 1;
    let publishStartDay = gradingStartDay + 1;
    if (new Date(year, month, publishStartDay).getDay() === 0) {
      publishStartDay += 1;
    }

    // For December half-yearly cycle, result publishing is on the 16th
    const actualPublishStartDay = month === 11 ? 16 : publishStartDay;

    // Check if we are in the December Half-Yearly Exam cycle (runs from Nov 21 to Dec 20)
    const isHalfYearlyPrep = (month === 10 && day >= 21) || (month === 11 && day <= 4);
    const isHalfYearlyLive = month === 11 && day >= 5 && day <= 10;
    const isHalfYearlyGrading = month === 11 && day >= 11 && day <= 15;
    const isHalfYearlyPublished = month === 11 && day >= 16 && day <= 20;

    if (isHalfYearlyPrep) {
      return {
        phase: 'half_yearly_prep' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'HALF-YEARLY PREP!',
        titleOr: 'ଅର୍ଦ୍ଧବାର୍ଷିକ ପ୍ରସ୍ତୁତି!',
        subtitleEn: 'Download 100-Mark Mock papers for practice',
        subtitleOr: '୧୦୦-ମାର୍କ ମକ୍ ପେପର ଡାଉନଲୋଡ୍ କରନ୍ତୁ',
        borderColor: 'border-rose-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(244,63,94,0.3)]',
        pingColor: 'bg-rose-500',
        textColor: '#f43f5e',
        icon: <Lucide.FileText size={11} className="text-rose-400" />
      };
    } else if (isHalfYearlyLive) {
      return {
        phase: 'half_yearly_live' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'HALF-YEARLY LIVE!',
        titleOr: 'ଅର୍ଦ୍ଧବାର୍ଷିକ ପରୀକ୍ଷା!',
        subtitleEn: 'Official 100-Mark Exam: Participate Now',
        subtitleOr: '୧୦୦-ମାର୍କ ଅଫିସିଆଲ୍ ପରୀକ୍ଷା ଚାଲିଛି!',
        borderColor: 'border-rose-500',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(244,63,94,0.5)]',
        pingColor: 'bg-rose-500',
        textColor: '#f43f5e',
        icon: <Lucide.Play size={11} className="text-rose-400 fill-rose-400 animate-pulse animate-duration-1000" />
      };
    } else if (isHalfYearlyGrading) {
      return {
        phase: 'half_yearly_grading' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'GRADING IN PROGRESS!',
        titleOr: 'ମୂଲ୍ୟାଙ୍କନ ଚାଲିଛି!',
        subtitleEn: 'Rough work copy review & grading',
        subtitleOr: 'ଖାତା ଦେଖା ଏବଂ ମୂଲ୍ୟାଙ୍କନ ପ୍ରକ୍ରିୟା ଚାଲିଛି',
        borderColor: 'border-indigo-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.3)]',
        pingColor: 'bg-indigo-500',
        textColor: '#818cf8',
        icon: <Lucide.Clock size={11} className="text-indigo-400" />
      };
    } else if (isHalfYearlyPublished) {
      return {
        phase: 'half_yearly_published' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'RESULTS OUT!',
        titleOr: 'ପରୀକ୍ଷା ଫଳ ପ୍ରକାଶିତ!',
        subtitleEn: 'Download Report Card & Certificate',
        subtitleOr: 'ରିପୋର୍ଟ କାର୍ଡ ଏବଂ ସାର୍ଟିଫିକେଟ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ',
        borderColor: 'border-amber-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.4)]',
        pingColor: 'bg-red-500',
        textColor: '#fbbf24',
        icon: <Lucide.Trophy size={11} className="text-yellow-400 animate-bounce" />
      };
    }

    if (day >= 1 && day < examStartDay) {
      return {
        phase: 'coming_soon' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'MTS REGISTERING',
        titleOr: 'ପରୀକ୍ଷା ପଞ୍ଜୀକରଣ',
        subtitleEn: 'MTS Coming Soon! Register Now',
        subtitleOr: 'ମାସିକ ଟେଷ୍ଟ ଶୀଘ୍ର ଆସୁଛି! ପଞ୍ଜୀକରଣ କରନ୍ତୁ',
        borderColor: 'border-amber-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.3)]',
        pingColor: 'bg-amber-500',
        textColor: '#fbbf24',
        icon: <Lucide.FileEdit size={11} className="text-yellow-400" />
      };
    } else if (day >= examStartDay && day <= examEndDay) {
      return {
        phase: 'going_on' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'MTS LIVE NOW!',
        titleOr: 'ପରୀକ୍ଷା ଚାଲିଛି!',
        subtitleEn: 'MTS Going On! Participate Now',
        subtitleOr: 'ଟେଷ୍ଟ ସିରିଜ୍ ଚାଲିଛି! ଭାଗ ନିଅନ୍ତୁ',
        borderColor: 'border-emerald-500',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.3)]',
        pingColor: 'bg-emerald-500',
        textColor: '#34d399',
        icon: <Lucide.Play size={11} className="text-emerald-400 fill-emerald-400 animate-pulse animate-duration-1000" />
      };
    } else if (day >= gradingStartDay && day < actualPublishStartDay) {
      return {
        phase: 'grading' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'RESULTS SOON!',
        titleOr: 'ଫଳାଫଳ ଶୀଘ୍ର!',
        subtitleEn: 'MTS Result Publishing Soon!',
        subtitleOr: 'ପରୀକ୍ଷା ଫଳାଫଳ ଶୀଘ୍ର ପ୍ରକାଶ ପାଇବ',
        borderColor: 'border-indigo-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.3)]',
        pingColor: 'bg-indigo-500',
        textColor: '#818cf8',
        icon: <Lucide.Clock size={11} className="text-indigo-400" />
      };
    } else if (day >= actualPublishStartDay && day <= 15) {
      return {
        phase: 'published' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'MTS RESULT OUT!',
        titleOr: 'ଫଳାଫଳ ପ୍ରକାଶିତ!',
        subtitleEn: 'MTS Result Out! Click to Check',
        subtitleOr: 'ପରୀକ୍ଷା ଫଳ ପ୍ରକାଶିତ! ଯାଞ୍ଚ କରନ୍ତୁ',
        borderColor: 'border-amber-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.4)]',
        pingColor: 'bg-red-500',
        textColor: '#fbbf24',
        icon: <Lucide.Trophy size={11} className="text-yellow-400 animate-bounce" />
      };
    } else {
      return {
        phase: 'important_qs' as const,
        publishStartDay: actualPublishStartDay,
        titleEn: 'EXAM PAPERS!',
        titleOr: 'ପ୍ରଶ୍ନପତ୍ର ଗୁଡ଼ିକ!',
        subtitleEn: 'Exam Important Questions',
        subtitleOr: 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପ୍ରଶ୍ନପତ୍ର',
        borderColor: 'border-purple-400',
        shadowColor: 'shadow-[0_15px_35px_-5px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.3)]',
        pingColor: 'bg-purple-500',
        textColor: '#c084fc',
        icon: <Lucide.FileText size={11} className="text-purple-400" />
      };
    }
  };

  const mtsStatus = getMtsStatus(new Date());
  const getMockQuestions = (subjectKey: string) => {
    const key = subjectKey.toLowerCase();
    if (key.includes('math') || key.includes('algebra') || key.includes('geometry')) {
      return [
        {
          question: "If a quadratic equation is ax^2 + bx + c = 0, what is the formula for the discriminant?",
          options: ["b^2 - 4ac", "b^2 + 4ac", "4ac - b^2", "sqrt(b^2 - 4ac)"]
        },
        {
          question: "In a right-angled triangle, if base = 3cm and height = 4cm, what is the hypotenuse?",
          options: ["5 cm", "7 cm", "6 cm", "12 cm"]
        },
        {
          question: "What is the value of sin(30 degrees) + cos(60 degrees)?",
          options: ["1", "0.5", "sqrt(3)", "0"]
        },
        {
          question: "An Arithmetic Progression has a first term a=3 and common difference d=2. What is the 10th term?",
          options: ["21", "23", "19", "25"]
        },
        {
          question: "What is the area of a circle with a radius of 7 cm? (Use pi = 22/7)",
          options: ["154 sq.cm", "44 sq.cm", "22 sq.cm", "88 sq.cm"]
        }
      ];
    } else if (key.includes('science') || key.includes('physical') || key.includes('life')) {
      return [
        {
          question: "What is the chemical formula of rust?",
          options: ["Fe2O3.xH2O", "Fe3O4", "FeO", "Fe(OH)2"]
        },
        {
          question: "Which gland in the human body is known as the master gland?",
          options: ["Pituitary Gland", "Thyroid Gland", "Adrenal Gland", "Pancreas"]
        },
        {
          question: "What is the SI unit of electric potential difference?",
          options: ["Volt", "Ampere", "Ohm", "Watt"]
        },
        {
          question: "Which of the following is responsible for acid rain?",
          options: ["SO2 and NO2", "CO2 and CO", "CH4 and CO2", "O2 and N2"]
        },
        {
          question: "What is the power house of the cell?",
          options: ["Mitochondria", "Nucleus", "Ribosome", "Lysosome"]
        }
      ];
    } else if (key.includes('social') || key.includes('history') || key.includes('geography')) {
      return [
        {
          question: "In which year did the Salt Satyagraha in Odisha begin at Inchudi?",
          options: ["1930", "1920", "1942", "1919"]
        },
        {
          question: "Which is the highest waterfall in Odisha?",
          options: ["Barehipani", "Joranda", "Khandadhar", "Duduma"]
        },
        {
          question: "Who was the first Prime Minister of Odisha?",
          options: ["Krushna Chandra Gajapati", "Nabakrushna Choudhury", "Harekrushna Mahatab", "Biju Patnaik"]
        },
        {
          question: "Which soil type cover is the largest in Odisha?",
          options: ["Red Soil", "Black Soil", "Laterite Soil", "Alluvial Soil"]
        },
        {
          question: "Where is the Sun Temple of Konark located?",
          options: ["Puri District", "Khurda District", "Cuttack District", "Ganjam District"]
        }
      ];
    } else if (key.includes('english')) {
      return [
        {
          question: "Identify the correct active voice: 'A letter was written by Sita.'",
          options: ["Sita wrote a letter.", "Sita writes a letter.", "Sita is writing a letter.", "Sita has written a letter."]
        },
        {
          question: "What is the antonym of the word 'Abundant'?",
          options: ["Scarce", "Plentiful", "Ample", "Generous"]
        },
        {
          question: "Fill in the blank: 'He has been studying ___ 3 hours.'",
          options: ["for", "since", "from", "during"]
        },
        {
          question: "Choose the correct spelling:",
          options: ["Committee", "Comitee", "Committe", "Commitee"]
        },
        {
          question: "What is the synonym of 'Diligent'?",
          options: ["Hardworking", "Lazy", "Intelligent", "Careless"]
        }
      ];
    } else if (key.includes('odia')) {
      return [
        {
          question: "Who is the writer of the famous Odia poem 'Bande Utkala Janani'?",
          options: ["Laxmikanta Mohapatra", "Radhanath Ray", "Madhusudan Rao", "Fakir Mohan Senapati"]
        },
        {
          question: "What is the synonym of the Odia word 'Akasha'?",
          options: ["Gagana", "Pruthibi", "Aloka", "Sagara"]
        },
        {
          question: "Identify the correct spelling in Odia:",
          options: ["Ashirbada", "Asirbada", "Ashirbaddha", "Asirbbada"]
        },
        {
          question: "What type of noun is 'Ganga'?",
          options: ["Nama-Vachaka (Proper)", "Jati-Vachaka (Common)", "Guna-Vachaka (Abstract)", "Kriya-Vachaka (Verbal)"]
        },
        {
          question: "What is the opposite of the Odia word 'Prathama'?",
          options: ["Shesha", "Dwitiya", "Arambha", "Anta"]
        }
      ];
    } else {
      return [
        {
          question: "Which state of India is known as the 'Soul of Incredible India'?",
          options: ["Odisha", "Kerala", "Rajasthan", "Goa"]
        },
        {
          question: "What is the capital of Odisha?",
          options: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"]
        },
        {
          question: "Which festival of Odisha is associated with the chariots of Lord Jagannath?",
          options: ["Ratha Yatra", "Raja Parba", "Nuakhai", "Bali Yatra"]
        },
        {
          question: "Who is the current Chief Minister of Odisha?",
          options: ["Mohan Charan Majhi", "Naveen Patnaik", "Biju Patnaik", "Harekrushna Mahatab"]
        },
        {
          question: "What is the state bird of Odisha?",
          options: ["Indian Roller", "Peacock", "House Sparrow", "Hill Myna"]
        }
      ];
    }
  };

  const getMockSubjectiveQuestions = (subjectKey: string) => {
    const key = subjectKey.toLowerCase();
    if (key.includes('math') || key.includes('algebra') || key.includes('geometry')) {
      return [
        {
          question: "Solve the linear equations using Cramer's rule: 2x + 3y = 8 and 3x - y = 1.",
          hint: "Find D, Dx, and Dy first. x = Dx/D and y = Dy/D. The correct answer should yield x=1, y=2."
        },
        {
          question: "Prove that the angle subtended by an arc at the center of a circle is double the angle subtended by it at any point on the remaining part of the circle.",
          hint: "Draw a circle with center O, arc AB and angle ACB at the circumference. Draw line CO extending to D and use exterior angle theorem."
        }
      ];
    } else if (key.includes('science') || key.includes('physical') || key.includes('life')) {
      return [
        {
          question: "State Mendel's Law of Segregation and explain it with a monohybrid cross experiment.",
          hint: "Define how alleles separate during gamete formation. Use F1 and F2 generation cross ratio (3:1 phenotype, 1:2:1 genotype)."
        },
        {
          question: "Describe the structure and working principle of an Electric Motor with a labeled diagram description.",
          hint: "Mention armature coil, split rings (commutator), carbon brushes, and magnetic poles. Explain using Fleming's Left Hand Rule."
        }
      ];
    } else if (key.includes('social') || key.includes('history') || key.includes('geography')) {
      return [
        {
          question: "Explain the role of Utkal Sammilani in the creation of a separate province of Odisha in 1936.",
          hint: "Highlight Madhusudan Das, Krushna Chandra Gajapati, the Kanika session, Boundary Commission, and April 1, 1936."
        },
        {
          question: "Describe the key factors influencing the climate of Odisha. How do monsoons affect local agriculture?",
          hint: "Discuss tropical monsoon climate, bay of bengal sea proximity, eastern ghats topography, and agricultural dependence on kharif crops."
        }
      ];
    } else if (key.includes('english')) {
      return [
        {
          question: "Write an essay in about 150 words on 'Your Aim in Life'. Outline your reasons and preparation.",
          hint: "Structure it into introduction, choice of career, why you chose it, how you plan to serve society, and conclusion."
        },
        {
          question: "Read the passage and draft a formal letter to your Headmaster requesting a leave of absence for 3 days to attend your sibling's wedding.",
          hint: "Use formal letter layout: date, recipient address, subject line, body text, and polite closing ('Yours obediently')."
        }
      ];
    } else if (key.includes('odia')) {
      return [
        {
          question: "Odia re 'Bruksha Ropana ra Abhiyana' (Afforestation Drive) upare 150 sabda re eka racana lekhantu.",
          hint: "Upakrama, bruksha ropana ra abasyakata, upakarita, sarakara nka padakhepa, o sesha katha re racana ti sanchit karantu."
        },
        {
          question: "Fakir Mohan Senapati nka 'Chhamana Athaguntha' upanyasa ra mukhyacharitra O katha-bastura eka sankhipta paricaya diantu.",
          hint: "Ramachandra Mangaraj, saria, bhagia, o zamindari sosana upare alokapata karantu."
        }
      ];
    } else {
      return [
        {
          question: "What are the major tourist places in Odisha and how do they contribute to the state's economy?",
          hint: "Discuss the golden triangle (Puri-Konark-Bhubaneswar), eco-tourism, chilika lake, and local handicraft generation."
        },
        {
          question: "Describe the significance of the Raja Festival of Odisha and how it is celebrated in rural districts.",
          hint: "Explain the agricultural break, earth worship, swings (Doli), traditional Odia pitha (Poda Pitha), and cultural games."
        }
      ];
    }
  };

  const generateMtsImportantPDF = (subjectLabel: string, subjectKey: string, type: 'quick' | 'full') => {
    const doc = new jsPDF();
    try {
      const isBoard = userClass === '9' || userClass === '10';
      const cumulativeChapters = getCumulativeChaptersForSubject(subjectKey);
      
      const isHalfYearlyMock = mtsStatus.phase === 'half_yearly_prep';
      
      let totalMcqs = type === 'quick' ? 10 : 50;
      let durationStr = type === 'quick' ? "45 Minutes" : "2 Hours 30 Minutes";
      let maxMarks = type === 'quick' ? 25 : 100;
      
      if (isHalfYearlyMock && type === 'full') {
        // Enforce 100-Mark layout for all classes during Half-Yearly mock downloads
        totalMcqs = 50;
        durationStr = "2 Hours 30 Minutes";
        maxMarks = 100;
      } else {
        if (isBoard) {
          const isHalfPaper = ['physical_science', 'life_science', 'social_science', 'geography', 'vocational'].includes(subjectKey);
          if (isHalfPaper) {
            totalMcqs = type === 'quick' ? 10 : (subjectKey === 'vocational' ? 10 : 25);
            durationStr = type === 'quick' ? "45 Minutes" : "1 Hour 30 Minutes";
            maxMarks = type === 'quick' ? 25 : 50;
          }
        } else {
          totalMcqs = type === 'quick' ? 10 : 30;
          durationStr = type === 'quick' ? "45 Minutes" : "1 Hour 30 Minutes";
          maxMarks = type === 'quick' ? 25 : 50;
        }
      }
      
      const examPattern = isHalfYearlyMock && type === 'full'
        ? `Half-Yearly 100-Mark Mock Series (${isBoard ? 'Odisha Board Pattern' : 'School System Pattern'})`
        : (isBoard 
            ? `BSE Odisha Board Exam Pattern (${type === 'quick' ? 'Selection Practice' : 'Full-Length Mock'})` 
            : `Regular School Exam Pattern (${type === 'quick' ? 'Practice Set' : 'Full Mock'})`);
      
      const drawBorder = () => {
        doc.setDrawColor(16, 185, 129); // emerald green border
        doc.setLineWidth(1);
        doc.rect(10, 10, 190, 277);
      };
      drawBorder();
      
      // Header Banner
      doc.setFillColor(15, 23, 42); // dark blue background header
      doc.rect(11, 11, 188, 30, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("UTKAL SKILL CENTRE", 105, 22, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(168, 85, 247); // purple text
      doc.text("ODISHA'S PREMIER DIGITAL EDUCATION COOPERATIVE", 105, 29, { align: "center" });
      doc.setTextColor(255, 255, 255);
      const headerTitle = isHalfYearlyMock && type === 'full'
        ? "Half-Yearly Mock Exam: 100-Mark Master Series (2026)" 
        : `Month-End Exam: Selection Practice Set (2026)`;
      doc.text(headerTitle, 105, 36, { align: "center" });
      
      // Document Metadata
      doc.setTextColor(15, 23, 42); // reset text color
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Class: ${userClass || '10'}`, 20, 52);
      doc.text(`Subject: ${subjectLabel}`, 80, 52);
      doc.text(`Total Marks: ${maxMarks}`, 160, 52);
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(`Pattern: ${examPattern}`, 20, 59);
      doc.text(`Time: ${durationStr}`, 160, 59);
      
      doc.setDrawColor(203, 213, 225); // slate line
      doc.setLineWidth(0.5);
      doc.line(20, 64, 190, 64);
      
      let y = 72;
      const checkPageOverflow = (currentY: number, spaceNeeded: number): number => {
        if (currentY + spaceNeeded > 270) {
          doc.addPage();
          drawBorder();
          return 25; // reset y on new page
        }
        return currentY;
      };

      // Covered Syllabus
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Syllabus Covered:", 20, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      
      const chapterList = cumulativeChapters.map(ch => ch.title_en || ch.title || '').filter(Boolean);
      const syllabusText = chapterList.length > 0 
        ? chapterList.join(', ') 
        : (language === 'en' ? "General syllabus revision set." : "ସାଧାରଣ ସିଲାବସ୍ ପୁନରାଲୋଚନା ସେଟ୍ ।");
      
      const splitSyllabus = doc.splitTextToSize(syllabusText, 165);
      splitSyllabus.forEach((line: string) => {
        y = checkPageOverflow(y, 6);
        doc.text(line, 20, y);
        y += 6;
      });
      
      y = checkPageOverflow(y, 10);
      doc.line(20, y, 190, y);
      y += 8;
      
      // Instructions
      y = checkPageOverflow(y, 35);
      doc.setFont("helvetica", "bold");
      doc.text("Instructions to Candidate:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      y += 6;
      doc.text("1. Read all questions carefully before answering.", 20, y);
      y += 6;
      doc.text(`2. Section A contains ${totalMcqs} Multiple Choice Questions (1 mark each).`, 20, y);
      y += 6;
      
      let subjCount = type === 'quick' ? 3 : 5;
      if (!isHalfYearlyMock) {
        if (isBoard && ['physical_science', 'life_science', 'social_science', 'geography', 'vocational'].includes(subjectKey) && type === 'full') {
          subjCount = subjectKey === 'vocational' ? 4 : 3;
        }
      }
      doc.text(`3. Section B contains ${subjCount} Subjective Questions.`, 20, y);
      y += 6;
      doc.text("4. Answers should be clear and written in your practice copy book.", 20, y);
      y += 6;
      doc.line(20, y, 190, y);
      y += 10;
      
      // Section A: MCQs
      y = checkPageOverflow(y, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SECTION A: MULTIPLE CHOICE QUESTIONS (MCQ)", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 10;
      
      const mcqs = curateMcqsForSubject(subjectKey, cumulativeChapters, totalMcqs, isBoard);
      mcqs.forEach((q, qIdx) => {
        y = checkPageOverflow(y, 35);
        
        doc.setFont("helvetica", "bold");
        doc.text(`Q${qIdx + 1}. ${q.question}`, 20, y);
        doc.setFont("helvetica", "normal");
        y += 7;
        
        q.options.forEach((opt, oIdx) => {
          doc.text(`   (${String.fromCharCode(97 + oIdx)}) ${opt}`, 20, y);
          y += 6;
        });
        y += 4;
      });
      
      y = checkPageOverflow(y, 10);
      doc.line(20, y, 190, y);
      y += 10;
      
      // Section B: Subjectives
      y = checkPageOverflow(y, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("SECTION B: SUBJECTIVE QUESTIONS", 20, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 10;
      
      const subjectives = curateSubjectivesForSubject(subjectKey, cumulativeChapters, type, isBoard);
      subjectives.forEach((q, sIdx) => {
        y = checkPageOverflow(y, 25);
        doc.setFont("helvetica", "bold");
        
        let marksStr = "(5 Marks)";
        if (type === 'full') {
          if (isHalfYearlyMock) {
            marksStr = "(10 Marks)";
          } else if (isBoard) {
            const isHalf = ['physical_science', 'life_science', 'social_science', 'geography', 'vocational'].includes(subjectKey);
            if (isHalf) {
              if (sIdx === 0) marksStr = "(8 Marks: 2 bits x 4 marks)";
              else if (sIdx === 1) marksStr = "(9 Marks: 3 bits x 3 marks)";
              else marksStr = "(8 Marks: 4 bits x 2 marks)";
            } else {
              marksStr = "(10 Marks)";
            }
          } else {
            marksStr = "(4 Marks)";
          }
        }
        
        doc.text(`Q${sIdx + totalMcqs + 1}. ${q.question} ${marksStr}`, 20, y);
        doc.setFont("helvetica", "normal");
        y += 7;
        
        const splitHint = doc.splitTextToSize(`Hint/Key: ${q.hint}`, 160);
        splitHint.forEach((line: string) => {
          y = checkPageOverflow(y, 6);
          doc.text(line, 20, y);
          y += 6;
        });
        y += 6;
      });
      
      // Footer
      y = checkPageOverflow(y, 15);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Generated by Utkal Skill Centre AI System. Copying or unauthorized printing is encouraged for learning.", 105, 280, { align: "center" });
      
      doc.save(`USC_Class_${userClass}_${subjectLabel.replace(/\s+/g, '_')}_${type === 'quick' ? 'Quick_Set' : 'Full_Mock'}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      doc.save(`USC_Class_${userClass}_${subjectLabel.replace(/\s+/g, '_')}_${type === 'quick' ? 'Quick_Set' : 'Full_Mock'}.pdf`);
    }
  };

  const showTestResultHanger = true;

  // Odisha high-performance mock student profiles for development realism
  const mockLeaderboardProfiles = React.useMemo(() => [
    { id: 'mock_1', name: 'Rajesh Mohanty', points: 980, streak: 15, district: 'Khordha', school: 'Bhubaneswar Govt High School', avatar: '', dailyCompleted: true },
    { id: 'mock_2', name: 'Priyabrata Sahu', points: 870, streak: 9, district: 'Cuttack', school: 'Ravenshaw Collegiate School', avatar: '', dailyCompleted: true },
    { id: 'mock_3', name: 'Subhashree Dash', points: 810, streak: 12, district: 'Balasore', school: 'Balasore Zilla School', avatar: '', dailyCompleted: false },
    { id: 'mock_4', name: 'Sameer Patnaik', points: 740, streak: 7, district: 'Koraput', school: 'Jeypore High School', avatar: '', dailyCompleted: true },
    { id: 'mock_5', name: 'Chinmayee Mishra', points: 690, streak: 5, district: 'Khordha', school: 'Capital High School', avatar: '', dailyCompleted: false },
    { id: 'mock_6', name: 'Sourav Jena', points: 610, streak: 4, district: 'Cuttack', school: 'SCB Medical Public School', avatar: '', dailyCompleted: true },
    { id: 'mock_7', name: 'Swagatika Rout', points: 580, streak: 6, district: 'Balasore', school: 'Fakir Mohan High School', avatar: '', dailyCompleted: true },
    { id: 'mock_8', name: 'Rakesh Nayak', points: 520, streak: 3, district: 'Koraput', school: 'Koraput Govt Zilla School', avatar: '', dailyCompleted: false },
  ], []);

  // Blend actual leaderboard with mock data to show an active, full board
  const combinedLeaderboard = React.useMemo(() => {
    const list = [...leaderboard];
    
    mockLeaderboardProfiles.forEach(mock => {
      if (!list.some(s => s.name?.toLowerCase() === mock.name.toLowerCase())) {
        list.push({
          ...mock,
          class: user?.class || '10'
        });
      }
    });

    if (user && !list.some(s => s.id === user.id)) {
      list.push({
        id: user.id,
        name: user.name || 'Student',
        class: user.class || '10',
        points: user.points || 0,
        streak: user.streak || 0,
        district: user.district || 'Khordha',
        school: user.school || 'My School',
        avatar: user.avatar || '',
        dailyCompleted: user.points_today > 0
      });
    }

    return list.sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [leaderboard, user, mockLeaderboardProfiles]);

  // Apply selected district filter to the combined dataset
  const filteredList = React.useMemo(() => {
    return selectedDistrict
      ? combinedLeaderboard.filter(u => u.district?.toLowerCase() === selectedDistrict.toLowerCase())
      : combinedLeaderboard;
  }, [combinedLeaderboard, selectedDistrict]);

  const getBadgeInfo = (points: number) => {
    const level = Math.floor((points || 0) / 100) + 1;
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

    return { level, title: language === 'en' ? `${badgeIcon} ${badgeTitle}` : `${badgeIcon} ${badgeTitleOdia}` };
  };

  useEffect(() => {
    const fetchTopStudyStudents = async () => {
      try {
        let docs: any[] = [];
        if (user?.class) {
          const q = query(
            collection(db, 'public_profiles'),
            where('class', '==', user.class)
          );
          const snapshot = await getDocs(q);
          docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        
        // If we didn't find any or class is not specified, fall back to global
        if (docs.length === 0) {
          const q = query(collection(db, 'public_profiles'));
          const snapshot = await getDocs(q);
          docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        const sorted = docs
          .filter((u: any) => u.role !== 'admin' && (u.totalStudyMinutes || 0) > 0)
          .sort((a: any, b: any) => (b.totalStudyMinutes || 0) - (a.totalStudyMinutes || 0))
          .slice(0, 6);

        setTopStudyStudents(sorted);
      } catch (err) {
        console.error("Error fetching top study students:", err);
      }
    };
    fetchTopStudyStudents();
  }, [user?.class]);

  useEffect(() => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (dayOfWeek === 0) {
      setIsSundayClosed(true);
      setDisplayedStudent(null);
      setActiveRank(null);
    } else {
      setIsSundayClosed(false);
      // Monday (1) = index 5 (Rank 6), Tuesday (2) = index 4 (Rank 5), ..., Saturday (6) = index 0 (Rank 1)
      const targetRank = 7 - dayOfWeek;
      const targetIndex = 6 - dayOfWeek;
      
      setActiveRank(targetRank);
      if (topStudyStudents.length >= targetRank) {
        setDisplayedStudent(topStudyStudents[targetIndex]);
      } else {
        setDisplayedStudent(null);
      }
    }
  }, [topStudyStudents]);

  useEffect(() => {
    // If in the special promotional period, lock the video ID and skip rotation
    if (new Date() < new Date('2026-07-12T00:00:00+05:30')) {
      setDailyVideoId('Ml-_dY7FXrs');
      return;
    }

    const fetchLatestVideos = async () => {
      try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.youtube.com/feeds/videos.xml?channel_id=UCVsuuu7DyRY4-qbn8PrVBhg`);
        const data = await response.json();
        if (data.status === 'ok' && data.items && data.items.length > 0) {
          // Filter videos by user class (e.g., "Class 10", "ଶ୍ରେଣୀ 10", or "ଦଶମ")
          const odiaClassNames: Record<string, string> = {
            '1': 'ପ୍ରଥମ', '2': 'ଦ୍ୱିତୀୟ', '3': 'ତୃତୀୟ', '4': 'ଚତୁର୍ଥ', '5': 'ପଞ୍ଚମ',
            '6': 'ଷଷ୍ଠ', '7': 'ସପ୍ତମ', '8': 'ଅଷ୍ଟମ', '9': 'ନବମ', '10': 'ଦଶମ'
          };
          
          const classSpecificVideos = data.items.filter((item: any) => {
            const title = item.title.toLowerCase();
            const odiaOrdinal = odiaClassNames[userClass];
            
            return title.includes(`class ${userClass}`) || 
                   title.includes(`ଶ୍ରେଣୀ ${userClass}`) ||
                   (odiaOrdinal && title.includes(odiaOrdinal));
          });

          if (classSpecificVideos.length > 0) {
            // Rotate based on day, looping back if list is small
            const dayIndex = new Date().getDate() % classSpecificVideos.length;
            const videoUrl = classSpecificVideos[dayIndex].link;
            const videoId = videoUrl.split('v=')[1]?.split('&')[0];
            
            if (videoId) {
              setDailyVideoId(videoId);
            }
          } else {
            setDailyVideoId(null); // Fallback to hardcoded classVideoMap
          }
        }
      } catch (error) {
        console.error('Error fetching YouTube videos:', error);
      }
    };
    fetchLatestVideos();
  }, [userClass]); // Re-fetch/re-filter if class changes

  const filteredLeaderboard = selectedDistrict
    ? leaderboard.filter(u => u.district === selectedDistrict)
    : leaderboard;
  const t = translations[language];
  const userRank = leaderboard.findIndex((s: any) => s.id === user.id) + 1;
  const rankDisplay = userRank > 0 ? userRank : '-';
  
  // Adaptive daily goal scaling from 50 XP to 200 XP based on student level (total points / 100)
  const currentLevel = Math.floor((user?.points || 0) / 100) + 1;
  const dailyGoal = Math.min(50 + (currentLevel - 1) * 25, 200);
  const dailyProgress = Math.min(((user?.points_today || 0) / dailyGoal) * 100, 100);
  const isLight = theme === 'daybreak';

  // Celebrate 100% completion of the daily target
  const triggerGoalCelebration = () => {
    const duration = 2.5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 40 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 } });
    }, 200);
  };

  // Trigger celebration once a day automatically when they hit/load with 100% progress
  useEffect(() => {
    if (dailyProgress >= 100) {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastCelebrated = localStorage.getItem('lastXpGoalCelebrationDate');
      
      if (lastCelebrated !== todayStr) {
        triggerGoalCelebration();
        localStorage.setItem('lastXpGoalCelebrationDate', todayStr);
      }
    }
  }, [dailyProgress]);

  // Trigger celebration when opening the target modal if they have 100% progress
  useEffect(() => {
    if (showTargetModal && dailyProgress >= 100) {
      triggerGoalCelebration();
    }
  }, [showTargetModal, dailyProgress]);

  const stats = [
    { label: t.pointsToday, value: user?.points_today || 0, icon: <Lucide.Zap size={20} />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: t.rank, value: rankDisplay, icon: <Lucide.Trophy size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: t.currentStreak, value: `${user?.streak || 0} ${t.activeStreak}`, icon: <Lucide.Flame size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: t.nextLeague, value: user?.league || 'Bronze', icon: <Lucide.Award size={20} />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];


  // Daily motivational quotes in English and Odia
  const dailyQuotes = [
    {
      en: "Success is the sum of small efforts, repeated day in and day out.",
      or: "ସଫଳତା ହେଉଛି ଛୋଟ ଛୋଟ ପ୍ରୟାସର ଯୋଗଫଳ, ଦିନକୁ ଦିନ ପୁନରାବୃତ୍ତି କର।"
    },
    {
      en: "Believe in yourself and all that you are.",
      or: "ନିଜ ଉପରେ ବିଶ୍ୱାସ ରଖନ୍ତୁ ଏବଂ ନିଜର ସାମର୍ଥ୍ୟ ଉପରେ ଆସ୍ଥା ରଖନ୍ତୁ।"
    },
    {
      en: "Every day is a new beginning. Take a deep breath and start again.",
      or: "ପ୍ରତିଦିନ ଏକ ନୂତନ ଆରମ୍ଭ। ଗଭୀର ଶ୍ୱାସ ନିଅନ୍ତୁ ଏବଂ ପୁଣି ଆରମ୍ଭ କରନ୍ତୁ।"
    },
    {
      en: "Hard work beats talent when talent doesn't work hard.",
      or: "କଠିନ ପରିଶ୍ରମ ପ୍ରତିଭାକୁ ପଛରେ ପକାଇଦିଏ, ଯେତେବେଳେ ପ୍ରତିଭା କଠିନ ପରିଶ୍ରମ କରେନାହିଁ।"
    },
    {
      en: "Dream big, work hard, stay focused, and surround yourself with good people.",
      or: "ବଡ଼ ସ୍ୱପ୍ନ ଦେଖନ୍ତୁ, କଠିନ ପ୍ରୟାସ କରନ୍ତୁ, ଏକାଗ୍ର ରୁହନ୍ତୁ ଏବଂ ଭଲ ଲୋକମାନେ ସହିତ ରୁହନ୍ତୁ।"
    },
    {
      en: "Use the Gundulu AI Tutor for complex math problems to see step-by-step solutions.",
      or: "ଜଟିଳ ଗଣିତ ସମସ୍ୟା ପାଇଁ ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର ବ୍ୟବହାର କରନ୍ତୁ ଏବଂ ପଦକ୍ଷେପ ଦରକ୍ଷେପ ସମାଧାନ ଦେଖନ୍ତୁ।"
    }
  ];

  // Pick quote based on day of year
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const todayQuote = dailyQuotes[dayOfYear % dailyQuotes.length][language];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    },
    exit: { opacity: 0, y: -20 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <NeuralBackground />
      <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="space-y-5 sm:space-y-6 md:space-y-8 pb-20 lg:pb-8"
    >
      {/* Welcome Section - Hyper Premium Header Card */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-none sm:rounded-[2.5rem] border-x-0 sm:border border-white/10 bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-950/45 via-slate-950/70 to-slate-950 p-5 sm:p-8 md:p-10 shadow-2xl -mx-4 mt-0 sm:mx-0 sm:mt-0 force-dark-theme"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-72 h-72 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-row items-start md:items-center justify-between gap-4 md:gap-6 relative z-20 w-full">
          
          {/* Left Side: Welcome Text + XP Badge */}
          <div className="flex flex-col gap-6 md:gap-4 relative z-10 flex-1 lg:flex-none lg:max-w-md min-w-0">
            
            {/* Welcome Text */}
            <div className="space-y-2">
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-1.5 h-8 md:w-2 md:h-12 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] shrink-0"></div>
                <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-tight break-words text-slate-800 dark:text-white">
                  {language === 'en' ? 'Welcome back,' : 'ସ୍ୱାଗତ,'}{" "}
                  <br className="sm:hidden" />
                  <span className="text-emerald-400 drop-shadow-sm leading-tight">
                    {user?.name || 'Student'}!
                  </span>
                </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-4 sm:pl-6 flex items-center gap-1.5 sm:gap-2 truncate">
                <Lucide.Calendar size={10} className="text-emerald-500 sm:w-3 sm:h-3 shrink-0" />
                {new Date().toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* XP Badge (Clickable to view target breakdown guide) */}
            <div className="flex items-center justify-start">
              <button 
                type="button"
                onClick={() => setShowTargetModal(true)}
                style={{ backgroundColor: '#090d16', borderColor: '#1e293b', textAlign: 'left' }}
                className={`backdrop-blur-2xl px-4 md:px-6 py-3 md:py-4 rounded-3xl md:rounded-[2rem] flex items-center gap-3 md:gap-5 border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_10px_40px_rgba(0,0,0,0.5)] hover:border-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group cursor-pointer max-w-max ${isTourStep3 ? 'ring-[4px] ring-amber-500 scale-[1.03] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)] z-30 animate-pulse bg-slate-950/90' : ''}`}
              >
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 md:gap-3 mb-0.5">
                    <div style={{ color: '#94a3b8' }} className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">{t.points}</div>
                    <div style={{ color: '#fb923c' }} className="flex items-center gap-1" title="Current Streak">
                      <Lucide.Flame size={10} className="md:w-3 md:h-3" fill="currentColor" />
                      <strong style={{ color: '#fb923c', fontWeight: '900' }} className="text-[9px] md:text-[10px]">{user?.streak || 0}</strong>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 justify-end">
                    <div style={{ color: '#ffffff' }} className="text-xl md:text-2xl font-black tracking-tighter">{user?.points_today || 0}</div>
                    <div style={{ color: '#10b981' }} className="text-[10px] md:text-xs font-bold">/ {dailyGoal} XP</div>
                  </div>
                </div>
                <div className="relative w-10 h-10 md:w-14 md:h-14 group">
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-md group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                  <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" stroke="#1e293b" strokeWidth="2.5" fill="transparent" />
                    <circle cx="18" cy="18" r="16" stroke="#34d399" strokeWidth="3" strokeLinecap="round" fill="transparent" strokeDasharray={100} strokeDashoffset={100 - (100 * dailyProgress) / 100} className="transition-all duration-1000 drop-shadow-[0_0_8px_#10b981]" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <Lucide.Zap size={14} style={{ color: '#6ee7b7' }} className="md:w-[18px] md:h-[18px] drop-shadow-md group-hover:scale-110 group-hover:text-white transition-transform duration-300" />
                  </div>
                </div>
              </button>
            </div>
            
            {/* Claim Golden Ticket Button - Desktop Only (mobile has it in the bottom parallel row) */}
            <div className="hidden lg:flex items-center justify-start pl-1">
              <button
                type="button"
                onClick={() => setShowGoldenTicket(true)}
                className="px-4.5 py-2.5 bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 hover:border-amber-400/50 rounded-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_5px_15px_rgba(245,158,11,0.05)] group text-amber-300 hover:text-white"
              >
                <Lucide.Trophy size={13} className="text-amber-400 animate-pulse group-hover:rotate-12 transition-transform shrink-0" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">
                  {language === 'or' ? 'ସ୍ୱର୍ଣ୍ଣ ପତ୍ର କ୍ଲେମ କରନ୍ତୁ' : 'Claim Golden Ticket'}
                </span>
              </button>
            </div>

          </div>

          {/* Middle Section: Desktop Only - Neural Sync Status */}
          <div className="hidden lg:flex flex-1 max-w-xl xl:max-w-2xl mx-4 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-cyan-500/5 to-emerald-500/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <button 
              type="button"
              onClick={() => setShowTargetModal(true)}
              className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-emerald-500/10 rounded-[2rem] p-5 flex items-center gap-6 w-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_30px_-10px_rgba(16,185,129,0.15)] transition-all duration-500 hover:border-emerald-500/30 text-left hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              
              <div className="relative shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 animate-ping" style={{ animationDuration: '3s' }}></div>
                <Lucide.Target size={24} />
              </div>

              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between items-end">
                  <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {language === 'en' ? 'Daily Target Sync' : 'ଦୈନିକ ଲକ୍ଷ୍ୟ'}
                  </h4>
                  <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-400">{Math.round(dailyProgress)}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-white/20 shadow-inner relative">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] rounded-full transition-all duration-1000" style={{ width: `${dailyProgress}%` }}>
                    <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 skew-x-12 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <p className={`text-[10px] font-bold italic truncate ${dailyProgress >= 100 ? 'text-emerald-400 dark:text-emerald-300 font-black animate-pulse' : 'text-slate-400 dark:text-slate-500'}`}>
                  {dailyProgress >= 100 
                    ? (language === 'en' ? 'Congratulations! You have completed today\'s target! 🎉' : 'ଅଭିନନ୍ଦନ! ଆପଣ ଆଜିର ଦୈନିକ ଲକ୍ଷ୍ୟ ପୂରଣ କରିଛନ୍ତି! 🎉')
                    : (language === 'en' ? 'Keep learning to maintain your streak and unlock rewards.' : 'ଆପଣଙ୍କର ଦୈନିକ ଲକ୍ଷ୍ୟ ପୂରଣ କରିବା ପାଇଁ ଅଧ୍ୟୟନ ଜାରି ରଖନ୍ତୁ।')}
                </p>
              </div>

            </button>
          </div>

          {/* Animated Gundulu Mascot Video (Right Side) with hanging rope banner */}
          <div className="flex flex-col items-center shrink-0 mt-0 md:-mt-6 self-center md:self-auto relative select-none">
            {showTestResultHanger && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ y: 3, scale: 1.05 }}
                onClick={() => {
                  if (mtsStatus.phase === 'coming_soon') {
                    setShowRegistrationForm(true);
                  } else if (mtsStatus.phase === 'going_on' || mtsStatus.phase === 'half_yearly_live') {
                    if (onOpenMonthlyTests) onOpenMonthlyTests();
                  } else if (mtsStatus.phase === 'grading' || mtsStatus.phase === 'half_yearly_grading') {
                    setShowMtsGradingModal(true);
                  } else if (mtsStatus.phase === 'published' || mtsStatus.phase === 'half_yearly_published') {
                    setShowImportantPapersModal(true);
                  } else if (mtsStatus.phase === 'important_qs' || mtsStatus.phase === 'half_yearly_prep') {
                    setShowImportantPapersModal(true);
                  }
                }}
                className="relative cursor-pointer group flex flex-col items-center z-30 mb-8 -mt-6 md:-mt-12"
              >
                {/* Hanging Ropes */}
                <div className="flex justify-between w-20 h-6 relative z-10 pointer-events-none -mb-1.5">
                  <div className="w-[2px] h-full bg-gradient-to-b from-slate-700 via-slate-400 to-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.8)]"></div>
                  <div className="w-[2px] h-full bg-gradient-to-b from-slate-700 via-slate-400 to-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.8)]"></div>
                </div>
                
                {/* Hanging Sign Board (Dynamic theme based on calendar phase) */}
                <div 
                  style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a, #020617)' }}
                  className={`border-2 ${mtsStatus.borderColor} rounded-2xl px-5 py-3 flex flex-col items-center ${mtsStatus.shadowColor} transition-all duration-300 force-dark-theme`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${mtsStatus.pingColor} animate-ping shrink-0`}></span>
                    <span 
                      style={{ color: mtsStatus.textColor }}
                      className="text-[12px] font-black uppercase tracking-[0.25em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                    >
                      {language === 'en' ? mtsStatus.titleEn : mtsStatus.titleOr}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {mtsStatus.icon}
                    <span className="text-[9px] font-black text-amber-100/90 uppercase tracking-widest text-center truncate max-w-[150px]">
                      {language === 'en' ? mtsStatus.subtitleEn : mtsStatus.subtitleOr}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* The Mascot Video Player */}
            <div className="relative w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48 pointer-events-auto group shrink-0">
              <div className="absolute inset-0 rounded-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)] ring-2 ring-emerald-500/20 bg-black">
                <video 
                  ref={videoRef}
                  src="/gundulu.mp4" 
                  poster="/gundu2.0.png"
                  autoPlay
                  muted
                  loop 
                  playsInline
                  className="w-full h-full object-cover scale-[1.05] object-[center_40%] md:scale-[1.1] md:object-center relative z-10" 
                />
              </div>
              
              <button 
                type="button"
                onClick={toggleMute}
                className="absolute bottom-2 right-0 md:bottom-4 z-20 w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 border border-emerald-300/30 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:from-emerald-500 hover:to-teal-700 hover:scale-110 shadow-[0_4px_15px_rgba(16,185,129,0.4)] cursor-pointer"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? (
                  <Lucide.VolumeX size={16} className="fill-white" />
                ) : (
                  <Lucide.Volume2 size={16} className="fill-white" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Parallel Action Row for Mobile/Tablet: Golden Ticket & Daily Target */}
        <div className="flex flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-white/5 w-full lg:hidden relative z-20 force-dark-theme">
          {/* Claim Golden Ticket Button */}
          <button
            type="button"
            onClick={() => setShowGoldenTicket(true)}
            className="flex-1 h-[82px] bg-gradient-to-br from-amber-500/20 via-slate-900/90 to-orange-500/20 backdrop-blur-xl border border-amber-500/40 hover:border-amber-400/60 rounded-2xl p-3 flex flex-row items-center justify-start gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer shadow-[0_8px_24px_rgba(245,158,11,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)] group/ticket"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/25 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 group-hover/ticket:rotate-12 group-hover/ticket:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <Lucide.Trophy size={16} className="text-amber-300 animate-pulse" />
            </div>
            <span className="text-[11px] sm:text-[12.5px] font-black uppercase tracking-wide text-left leading-tight flex flex-col text-amber-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
              {language === 'or' ? (
                <>
                  <span className="text-[11.5px] sm:text-[13px] leading-normal">ସ୍ୱର୍ଣ୍ଣ ପତ୍ର</span>
                  <span className="text-[9.5px] sm:text-[10.5px] text-amber-400/90 font-bold tracking-wide mt-0.5">କ୍ଲେମ କରନ୍ତୁ</span>
                </>
              ) : (
                <>
                  <span>Golden</span>
                  <span className="text-amber-400/90">Ticket</span>
                </>
              )}
            </span>
          </button>

          {/* Compact Daily Target Progress Card */}
          <button
            type="button"
            onClick={() => setShowTargetModal(true)}
            className="flex-1 h-[82px] bg-gradient-to-br from-emerald-500/20 via-slate-900/90 to-teal-500/20 backdrop-blur-xl border border-emerald-500/40 hover:border-emerald-400/60 rounded-2xl p-3 flex flex-col justify-between shadow-[0_8px_24px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98] group/target text-left"
          >
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 group-hover/target:rotate-45 group-hover/target:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Lucide.Target size={16} className="text-emerald-300 animate-pulse" />
                </div>
                <span className="text-[11px] sm:text-[12.5px] font-black uppercase tracking-wide text-left leading-tight flex flex-col text-emerald-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  {language === 'or' ? (
                    <>
                      <span className="text-[11.5px] sm:text-[13px] leading-normal">ଦୈନିକ ଲକ୍ଷ୍ୟ</span>
                      <span className="text-[9.5px] sm:text-[10.5px] text-emerald-400/90 font-bold tracking-wide mt-0.5">ପ୍ରଗତି ଟ୍ରାକର୍</span>
                    </>
                  ) : (
                    <>
                      <span>Daily</span>
                      <span className="text-emerald-400/90">Target</span>
                    </>
                  )}
                </span>
              </div>
              <span className="text-sm sm:text-base font-black text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.7)] leading-none pt-0.5">{Math.round(dailyProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950/90 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)] relative mt-1.5">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(52,211,153,0.8)]" style={{ width: `${dailyProgress}%` }}>
                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 animate-[shimmer_2s_infinite]"></div>
                {/* Glowing edge indicator */}
                {dailyProgress > 0 && (
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_#fff,0_0_15px_#34d399] rounded-full"></div>
                )}
              </div>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Premium Sub-Tab Switcher */}
      <div className="flex justify-start border-b border-white/5 pb-3 relative z-20 force-dark-theme">
        <div className="flex p-1 bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] relative">
          
          {/* Overview Tab */}
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`relative px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors duration-300 select-none group/tab ${
              activeSubTab === 'overview' ? 'text-white' : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {activeSubTab === 'overview' && (
              <motion.div
                layoutId="activeSubTab"
                className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.25)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Lucide.LayoutDashboard size={14} className={`relative z-10 transition-colors ${activeSubTab === 'overview' ? 'text-emerald-300' : 'text-slate-500 group-hover/tab:text-slate-300'}`} />
            <span className="relative z-10">{language === 'en' ? 'Overview' : 'ପ୍ରୋଫାଇଲ୍ ସାରାଂଶ'}</span>
          </button>

          {/* Statewide Leaderboard Tab */}
          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`relative px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors duration-300 select-none group/tab ${
              activeSubTab === 'leaderboard' ? 'text-white' : 'text-slate-500 hover:text-slate-200'
            }`}
          >
            {activeSubTab === 'leaderboard' && (
              <motion.div
                layoutId="activeSubTab"
                className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-[0_4px_20px_rgba(16,185,129,0.25)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Lucide.Trophy size={14} className={`relative z-10 transition-colors ${activeSubTab === 'leaderboard' ? 'text-emerald-300' : 'text-slate-500 group-hover/tab:text-slate-300'}`} />
            <span className="relative z-10">{language === 'en' ? 'Statewide Leaderboard' : 'ରାଜ୍ୟ ସ୍ତରୀୟ ଲିଡରବୋର୍ଡ'}</span>
          </button>
          
        </div>
      </div>

      {activeSubTab === 'overview' ? (
        /* Main Grid Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
          {/* Left Column - Core Interactions */}
          <div className="lg:col-span-8 space-y-8">
            {claimedTicket && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-slate-900 via-slate-950 to-amber-950/20 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6 border border-amber-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 force-dark-theme text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Lucide.Trophy size={22} className="animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      {language === 'en' ? 'May Test Series Cash Prize Claim' : 'ମଇ ପରୀକ୍ଷା ଉପହାର ଦାବି'}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">
                      {(() => {
                        const isClosed = claimedTicket.status === 'closed';
                        return isClosed
                          ? (language === 'en' ? 'Redemption Status: Paid ✅ (Money sent via UPI!)' : 'ଷ୍ଟାଟସ୍: ପ୍ରଦାନ କରାଯାଇଛି ✅ (UPI ମାଧ୍ୟମରେ ପଠାଯାଇଛି!)')
                          : (language === 'en' ? 'Redemption Status: Pending Review ⏳' : 'ଷ୍ଟାଟସ୍: ଯାଞ୍ଚ ଚାଲିଛି ⏳');
                      })()}
                    </p>
                  </div>
                </div>
                {!claimedTicket.status?.includes('closed') && (
                  <button
                    onClick={() => setShowGiftUnlockModal(true)}
                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md whitespace-nowrap self-end sm:self-auto"
                  >
                    {language === 'en' ? 'View/Edit Details' : 'ବିବରଣୀ ଦେଖନ୍ତୁ'}
                  </button>
                )}
              </motion.div>
            )}

            {/* AI Tutor & Daily MCQ Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 lg:gap-8">
            
            {/* AI Tutor Card - Hyper Premium Banner */}
            <motion.div 
              variants={itemVariants}
              onClick={() => {
                onOpenTutor?.();
              }}
              className={`bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-emerald-950/20 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6.5 relative overflow-hidden cursor-pointer group border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.8)] hover:border-emerald-500/40 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(16,185,129,0.25)] transition-all duration-500 flex flex-col justify-between h-full col-span-2 lg:col-span-1 force-dark-theme ${isTourStep4 ? 'ring-[4px] ring-amber-500 scale-[1.03] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)] z-30 animate-pulse bg-slate-950/90' : ''}`}
            >
              {/* Tech Mesh Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40"></div>
              {/* Edge-to-edge gradients */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-900/30 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[90px] -mr-[180px] -mt-[180px] pointer-events-none group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-1000"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              
              <div className="flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-4.5 sm:gap-5 relative z-10 w-full text-left sm:text-center h-full">
                <div className="relative shrink-0">
                  {/* Glowing Ring around Avatar */}
                  <div className="absolute inset-0 rounded-full bg-emerald-500 blur-xl opacity-30 group-hover:opacity-60 group-hover:scale-110 transition-all duration-500"></div>
                  <div className="w-13 h-13 sm:w-22 sm:h-22 rounded-full bg-slate-950 border-[2px] sm:border-[3px] border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-emerald-400 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                    <img src="/gundulu-pointing-nobg.png" alt="Gundulu" className="w-full h-full object-cover scale-[0.95] relative z-10 transition-transform duration-500 group-hover:scale-[1.1]" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6.5 h-6.5 sm:w-8.5 sm:h-8.5 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.7)] border-[2.5px] border-slate-900 group-hover:scale-115 transition-all">
                    <Lucide.Sparkles size={11} className="sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2.5 flex flex-col items-start sm:items-center flex-1 justify-center">
                  <div className="flex flex-wrap items-center justify-start sm:justify-center gap-1 sm:gap-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-[inset_0_0_10px_rgba(16,185,129,0.15)] whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse"></span>
                      <span className="hidden sm:inline">{language === 'en' ? 'Gundulu AI Tutor Active' : 'ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର ସକ୍ରିୟ'}</span>
                      <span className="sm:hidden">{language === 'en' ? 'AI Tutor Active' : 'AI ଟ୍ୟୁଟର ସକ୍ରିୟ'}</span>
                    </div>
                  </div>
                  <h3 className="text-sm leading-tight sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-tighter group-hover:text-white transition-colors">
                    {language === 'en' ? 'Gundulu AI Tutor' : 'ଗୁନ୍ଦୁଲୁ AI ଟ୍ୟୁଟର'}
                  </h3>
                  <p className="text-slate-400 text-[9px] sm:text-xs font-bold leading-relaxed max-w-[260px] mx-auto group-hover:text-slate-300 transition-colors hidden sm:block text-center">
                    {language === 'en' 
                      ? 'Talk with Gundulu in Odia! Ask questions, practice pronunciation, and learn through voice conversation.'
                      : 'ଗୁନ୍ଦୁଲୁଙ୍କ ସହ ଓଡ଼ିଆରେ କଥା ହୁଅନ୍ତୁ! ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ, ଉଚ୍ଚାରଣ ଅଭ୍ୟାସ କରନ୍ତୁ ଏବଂ କଥାବାର୍ତ୍ତା ମାଧ୍ୟମରେ ପଢନ୍ତୁ।'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Daily MCQ Card - Gamified */}
            <div className="bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-cyan-950/20 backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6.5 relative overflow-hidden group border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.8)] hover:border-cyan-500/40 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(6,182,212,0.25)] transition-all duration-500 flex flex-col justify-between h-full col-span-1 force-dark-theme">
              
              {/* Tech Mesh Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30"></div>
              {/* Edge-to-edge gradients */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-blue-900/30 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[80px] -mr-[120px] -mt-[120px] pointer-events-none group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-1000"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              
              {/* Hanging Bookmark Ribbon (Right Side) */}
              <div className="absolute top-0 right-3 sm:right-5 w-6 sm:w-9 h-14 sm:h-18 bg-gradient-to-b from-pink-500 to-rose-600 drop-shadow-[0_8px_16px_rgba(225,29,72,0.5)] border-x border-rose-500/30 z-20 flex justify-center pt-2 sm:pt-3 transition-all duration-500 group-hover:pt-3.5 group-hover:h-18 group-hover:sm:h-22"
                   style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }}>
                <div className="flex flex-col items-center text-white font-black text-[9px] sm:text-[11px] uppercase tracking-wider leading-[1.1] drop-shadow-md">
                  <span>M</span>
                  <span>C</span>
                  <span>Q</span>
                </div>
              </div>
              
              <div className="relative z-10 space-y-4 flex flex-col flex-1">
                <div className="flex flex-wrap items-center justify-start gap-1 sm:gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-[inset_0_0_10px_rgba(6,182,212,0.15)] whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee] animate-pulse"></span>
                    <span>{language === 'en' ? 'Knowledge Pulse' : 'ଜ୍ଞାନ ପରୀକ୍ଷା'}</span>
                  </div>
                </div>
                
                <div className="text-left flex flex-col flex-1 justify-center">
                  <h3 className="text-base leading-tight sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-300 tracking-tighter mb-1.5 sm:mb-2.5">
                    {language === 'en' ? "Gundulu Daily Challenge" : "ଗୁନ୍ଦୁଲୁ ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ"}
                  </h3>
                  <p className="text-slate-400 text-[9px] sm:text-xs font-bold leading-relaxed max-w-[260px] group-hover:text-slate-300 transition-colors hidden sm:block">
                    {hasDailyPractice
                      ? (language === 'en' ? 'New cognitive nodes are available for your current tier. Synchronize now.' : 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ପାଇଁ ନୂଆ ପ୍ରଶ୍ନ ଉପଲବ୍ଧ ଅଛି | ବର୍ତ୍ତମାନ ସମାଧାନ କରନ୍ତୁ |')
                      : (language === 'en' ? 'Daily challenge status: PENDING. Check the practice matrix for updates.' : 'ଆଜିର ପ୍ରଶ୍ନ ସେଟ୍ ପ୍ରକାଶିତ ହୋଇଛି କି ନାହିଁ ଦେଖିବାକୁ ଅଭ୍ୟାସ ଟ୍ୟାବ୍ ଖୋଲନ୍ତୁ |')}
                  </p>
                </div>
 
                {/* Hide daily subject details to avoid confusion as requested */}
                {false && (todayDailySubject || tomorrowDailySubject) && (
                  <div className="flex flex-col sm:flex-row flex-wrap justify-start gap-1.5 pt-1 z-10 relative">
                    {todayDailySubject && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/35 text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider text-cyan-300 text-center truncate inline-block max-w-[125px] backdrop-blur-sm">
                        <span className="hidden sm:inline">{language === 'en' ? 'Topic: ' : 'ବିଷୟ: '}</span>
                        {translations[language].subjects?.[todayDailySubject.toLowerCase()] || translations[language].subjects?.[todayDailySubject] || todayDailySubject}
                      </span>
                    )}
                    {tomorrowDailySubject && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider text-slate-400 text-center truncate hidden sm:inline-block max-w-[125px] backdrop-blur-sm">
                        {language === 'en' ? 'Next: ' : 'ଆସନ୍ତାକାଲି: '} 
                        {translations[language].subjects?.[tomorrowDailySubject.toLowerCase()] || translations[language].subjects?.[tomorrowDailySubject] || tomorrowDailySubject}
                      </span>
                    )}
                  </div>
                )}
              </div>
 
              <div className="relative z-10 flex flex-row gap-1.5 sm:gap-3 mt-4 sm:mt-7 shrink-0">
                <button
                  type="button"
                  onClick={onOpenDailyPractice}
                  className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all shadow-[0_10px_20px_-10px_rgba(6,182,212,0.8)] hover:shadow-[0_15px_30px_rgba(6,182,212,0.5)] hover:scale-[1.03] active:scale-95 border-t border-cyan-350 truncate whitespace-nowrap cursor-pointer"
                >
                  {language === 'en' ? "Commence Trial" : "ଆରମ୍ଭ କରନ୍ତୁ"}
                </button>
                <button
                  type="button"
                  onClick={onShareDailyPractice}
                  className="px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/35 text-[#25D366] hover:bg-[#25D366]/20 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 group cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 sm:w-[16px] sm:h-[16px] transition-transform group-hover:scale-110">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="hidden sm:inline">{language === 'en' ? 'Share' : 'ଶେୟାର'}</span>
                </button>
              </div>
            </div>


            {/* Gundulu's Blackboard Card */}
            <motion.div 
              variants={itemVariants}
              onClick={() => {
                setShowBlackboard(true);
              }}
              className="bg-gradient-to-br from-[#0c2b18] via-[#051c0f] to-[#011409] backdrop-blur-2xl rounded-[2.5rem] p-5 sm:p-6.5 relative overflow-hidden cursor-pointer group border border-amber-500/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_25px_50px_-12px_rgba(0,0,0,0.8)] hover:border-amber-500/60 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_rgba(245,158,11,0.25)] transition-all duration-500 flex flex-col justify-between h-full col-span-1 force-dark-theme"
            >
              {/* Tech Mesh Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30"></div>
              {/* Edge-to-edge gradients */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-amber-900/30 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none"></div>
              <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[80px] -mr-[120px] -mt-[120px] pointer-events-none group-hover:bg-amber-500/20 group-hover:scale-110 transition-all duration-1000"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
              
              <div className="flex flex-col items-center justify-center gap-4.5 sm:gap-5 relative z-10 w-full text-center h-full">
                <div className="relative shrink-0">
                  {/* Outer Glowing Ring */}
                  <div className="absolute inset-0 rounded-[1.5rem] bg-amber-500 blur-xl opacity-20 group-hover:opacity-50 group-hover:scale-110 transition-all duration-500"></div>
                  <div className="w-13 h-13 sm:w-22 sm:h-22 rounded-[1.8rem] bg-[#0c2616] border-[2px] sm:border-[3px] border-amber-500/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_0_40px_rgba(245,158,11,0.25)] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-amber-400 transition-all duration-500 overflow-hidden relative">
                    <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
                    <Lucide.PenTool className="text-amber-350 w-7 h-7 sm:w-11 sm:h-11 animate-pulse" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6.5 h-6.5 sm:w-8.5 sm:h-8.5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,158,11,0.7)] border-[2.5px] border-slate-900 group-hover:scale-115 transition-all">
                    <Lucide.Sparkles size={11} className="sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
                
                <div className="space-y-1.5 sm:space-y-2.5 flex flex-col items-center flex-1 justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] shadow-[inset_0_0_10px_rgba(245,158,11,0.15)] whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_#f59e0b] animate-pulse"></span>
                      <span>{language === 'en' ? 'Gundulu Smart Board' : 'ଗୁନ୍ଦୁଲୁ ସ୍ମାର୍ଟ ବୋର୍ଡ'}</span>
                    </div>
                  </div>
                  <h3 className="text-sm leading-tight sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-slate-300 tracking-tighter group-hover:text-white transition-colors">
                    {language === 'en' ? "Gundulu Smart Board" : 'ଗୁନ୍ଦୁଲୁ ସ୍ମାର୍ଟ ବୋର୍ଡ'}
                  </h3>
                  <p className="text-slate-400 text-[9px] sm:text-xs font-bold leading-relaxed max-w-[260px] mx-auto group-hover:text-slate-300 transition-colors hidden sm:block text-center">
                    {language === 'en' 
                      ? 'Draw shapes, write words, or solve equations. Gundulu AI scans and explains any subject!'
                      : 'ଖଡ଼ିରେ ଲେଖନ୍ତୁ ବା ଚିତ୍ର ଆଙ୍କନ୍ତୁ, ଗୁନ୍ଦୁଲୁ ଆପା ଯେକୌଣସି ବିଷୟର ସମାଧାନ ଓ ସମ୍ପୂର୍ଣ୍ଣ ବୁଝାମଣା ଓଡ଼ିଆରେ କରିବେ।'}
                  </p>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Animated Gundulu Motivation Banner */}
          <MtsChampionshipPoster 
            isRegistered={isRegistered}
            onRegisterClick={() => {
              if (isRegistered) {
                if (onOpenMonthlyTests) onOpenMonthlyTests();
              } else {
                setShowRegistrationForm(true);
              }
            }}
            language={language}
          />

          {/* Middle Row: Registration & Video Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8 w-full">
            {/* Test Series Registration - Premium Alert (Half Size Layout) */}
            {(() => {
              const currentDay = new Date().getDate();
              const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              const isRegistrationWindow = (currentDay >= 1 && currentDay <= 4) || isLocalhost;
              
              if (isRegistered || !isRegistrationWindow) return null;
              
              return (
                <motion.div 
                  variants={itemVariants}
                  className="bg-slate-950/40 backdrop-blur-2xl border border-amber-500/20 rounded-[2rem] p-5 sm:p-6 relative overflow-hidden group hover:border-amber-500/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col justify-between h-full"
                >
                  {/* Premium Animated Gold/Amber Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-950/20 opacity-40 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none"></div>
                  <div className="absolute -top-[100px] -right-[100px] w-[250px] h-[250px] bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-full blur-[60px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent opacity-50 group-hover:opacity-100 transition-all duration-700"></div>

                  <div className="flex flex-col justify-between h-full relative z-10 space-y-4">
                    {/* Top Row: Icon and Title */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="absolute inset-0 bg-amber-500 blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] group-hover:rotate-12 group-hover:scale-105 transition-all duration-500">
                          <Lucide.Trophy size={18} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                        </div>
                      </div>

                      <div className="flex-1 text-left">
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                          <Lucide.Sparkles size={8} className="animate-pulse" />
                          {language === 'en' ? 'Registration Open' : 'ପଞ୍ଜିକରଣ ଚାଲିଛି'}
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight uppercase drop-shadow-md mt-0.5">
                          {language === 'en' ? 'Monthly Test Series' : 'ମାସିକ ଟେଷ୍ଟ ସିରିଜ୍'}
                        </h3>
                      </div>
                    </div>

                    {/* Middle Section: Compact Value propositions */}
                    <div className="flex-1 flex flex-col justify-center space-y-3 py-1 text-left">
                      <div className="flex items-center gap-3">
                        <Lucide.Trophy size={14} className="text-amber-400 shrink-0" />
                        <span className="text-xs text-slate-300 font-semibold">
                          {language === 'en' ? 'Statewide Leaderboard & Ranks' : 'ରାଜ୍ୟ ସ୍ତରୀୟ ଲିଡରବୋର୍ଡ'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Lucide.FileText size={14} className="text-orange-400 shrink-0" />
                        <span className="text-xs text-slate-300 font-semibold">
                          {language === 'en' ? 'BSE Odisha 2026 Pattern' : 'BSE ଓଡ଼ିଶା ୨୦୨୬ ପ୍ୟାଟର୍ଣ୍ଣ'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Lucide.Award size={14} className="text-yellow-400 shrink-0" />
                        <span className="text-xs text-slate-300 font-semibold">
                          {language === 'en' ? 'Verified PWA Certificates' : 'ପ୍ରମାଣପତ୍ର ଓ ପୁରସ୍କାର'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <button 
                      onClick={() => setShowRegistrationForm(true)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white font-bold text-[10px] uppercase tracking-[0.2em] shadow-[0_5px_15px_rgba(245,158,11,0.2)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.35)] hover:scale-[1.01] active:scale-98 transition-all duration-300 relative overflow-hidden group/btn flex items-center justify-center gap-2 border-t border-white/10"
                    >
                      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500"></div>
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        {language === 'en' ? 'Register For Test Series' : 'ଟେଷ୍ଟ ସିରିଜ୍ ପାଇଁ ପଞ୍ଜିକରଣ କରନ୍ତୁ'}
                        <Lucide.ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })()}

            {/* Class-wise YouTube Matrix - Cinema Style */}
            <div className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-4 sm:p-6 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_40px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group hover:border-red-500/30 hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full ${isRegistered ? 'lg:col-span-2' : 'col-span-1'}`}>
              <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-red-500/5 rounded-full blur-[60px] -mr-16 sm:-mr-24 -mt-16 sm:-mt-24 pointer-events-none group-hover:bg-red-500/10 transition-all"></div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/0 via-red-500/50 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444] animate-pulse" />
                    {language === 'en' ? `Neural Feed • Tier ${userClass}` : `ଭିଡିଓ ଫିଡ୍ • ଶ୍ରେଣୀ ${userClass}`}
                  </div>
                  <div className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {language === 'en' ? 'Live Archive' : 'ଭିଡିଓ ସଂଗ୍ରହ'}
                  </div>
                </div>
                
                <div className="aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-white/10 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative group-hover:scale-[1.02] group-hover:shadow-[0_10px_40px_rgba(239,68,68,0.2)] transition-all duration-500">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10" />
                  <iframe
                    width="100%"
                    height="100%"
                    src={dailyVideoId ? `https://www.youtube.com/embed/${dailyVideoId}?autoplay=0&rel=0` : videoUrl}
                    title={`Daily Learning Feed`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="relative z-0"
                  ></iframe>
                </div>

                <a
                  href="https://www.youtube.com/@UtkalSkillCenter?sub_confirmation=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 text-white font-black text-[9px] sm:text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_10px_20px_-10px_rgba(239,68,68,0.8)] active:scale-95 border-t border-red-400"
                >
                  <Lucide.Youtube size={14} className="sm:w-4 sm:h-4" />
                  {language === 'en' ? 'Synchronize Subscription' : 'YouTube ସବସ୍କ୍ରାଇବ୍ କରନ୍ତୁ'}
                </a>
              </div>
            </div>
          </div>

          {/* Performance & Motivation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
            <div className="md:col-span-2">
              {/* Performance Analytics */}
              <PerformanceChart 
                submissions={user?.submissions || []} 
                tests={chapters}
                language={language} 
                theme={theme}
              />
            </div>

            {/* Study Champion Card */}
            <div className="md:col-span-1">
              <div className={`glass-card rounded-[2rem] p-5 border relative overflow-hidden flex flex-col justify-between h-full hover:-translate-y-1 transition-all duration-500 ${
                isSundayClosed
                  ? isLight 
                    ? 'border-slate-200 bg-slate-50/60 shadow-sm opacity-80'
                    : 'border-white/5 bg-slate-950/20 opacity-80'
                  : displayedStudent?.id === user?.id 
                    ? isLight
                      ? 'border-yellow-500/40 bg-gradient-to-br from-amber-50 to-yellow-100/60 shadow-[0_10px_25px_rgba(234,179,8,0.12)] hover:border-yellow-500/60'
                      : 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-slate-900/40 to-amber-950/20 shadow-[0_10px_30px_rgba(234,179,8,0.1)] hover:border-yellow-500/50' 
                    : displayedStudent
                      ? isLight
                        ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 hover:border-emerald-500/40 shadow-sm'
                        : 'border-white/10 bg-slate-900/40 hover:border-emerald-500/30'
                      : isLight
                        ? 'border-dashed border-slate-200 bg-slate-50/50'
                        : 'border-dashed border-white/10 bg-slate-950/10'
              }`}>
                {displayedStudent?.id === user?.id && !isSundayClosed && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-[40px] -mr-12 -mt-12 pointer-events-none animate-pulse"></div>
                )}
                
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-[8px] sm:text-[9.5px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest leading-none">
                        {isSundayClosed
                          ? (language === 'en' ? 'Calculations In Progress' : 'ହିସାବ ଚାଲିଛି')
                          : displayedStudent
                            ? (language === 'en' ? `Study Champion (Rank ${activeRank})` : `ପଠନ ଚାମ୍ପିଅନ୍ (Rank ${activeRank})`)
                            : (language === 'en' ? `Study Champion (Rank ${activeRank})` : `ପଠନ ଚାମ୍ପିଅନ୍ (Rank ${activeRank})`)}
                      </h4>
                      <p className="text-[7px] sm:text-[8.5px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">
                        {isSundayClosed 
                          ? (language === 'en' ? 'Sunday Reset' : 'ରବିବାର ରିସେଟ୍')
                          : (language === 'en' ? 'Top Study Time This Week' : 'ସପ୍ତାହର ସର୍ବାଧିକ ପଠନ')}
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-md shrink-0 ${
                      isSundayClosed
                        ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-500'
                        : displayedStudent?.id === user?.id
                          ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                          : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isSundayClosed ? (
                        <Lucide.Timer size={14} />
                      ) : (
                        <Lucide.Trophy size={14} className={displayedStudent?.id === user?.id ? 'animate-bounce' : ''} />
                      )}
                    </div>
                  </div>

                  {isSundayClosed ? (
                    <div className="my-6 text-center space-y-2">
                      <Lucide.Hourglass className="mx-auto text-yellow-500/60 animate-spin" size={24} />
                      <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-wider">
                        {language === 'en' 
                          ? 'Weekly Leaderboard is resetting. Check back tomorrow for the new lineup!' 
                          : 'ରବିବାର ପାଇଁ ମାନ୍ୟତା ତାଲିକା ରିସେଟ୍ ହେଉଛି। ଆସନ୍ତାକାଲି ନୂଆ ତାଲିକା ଦେଖନ୍ତୁ!'}
                      </p>
                    </div>
                  ) : displayedStudent ? (
                    <div className="flex items-center gap-3 my-3">
                      <div className="relative shrink-0">
                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-white/5 shadow-md ${
                          displayedStudent.id === user.id ? 'border-yellow-500/50 ring-4 ring-yellow-500/10' : 'border-slate-200 dark:border-white/10'
                        }`}>
                          {displayedStudent.avatar ? (
                            <img 
                              src={displayedStudent.avatar} 
                              alt={displayedStudent.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          ) : (
                            <span className="text-sm font-black text-slate-800 dark:text-white">
                              {(displayedStudent.name || 'S')[0]}
                            </span>
                          )}
                        </div>
                        {displayedStudent.id === user.id && (
                          <div className="absolute -top-1.5 -right-1 bg-yellow-500 text-slate-950 p-0.5 rounded-full shadow-[0_0_8px_#eab308]">
                            <Lucide.Crown size={8} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <h3 className="text-xs font-black text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                          {displayedStudent.id === user.id 
                            ? (language === 'en' ? 'You! (Study Champion)' : 'ଆପଣ! (ଚାମ୍ପିଅନ୍)')
                            : displayedStudent.name
                          }
                        </h3>
                        {displayedStudent.school && (
                          <p className="text-[9px] text-slate-600 dark:text-slate-400 truncate font-semibold flex items-center gap-1 mt-0.5">
                            <Lucide.School size={10} className="text-slate-500 shrink-0" />
                            {displayedStudent.school}
                          </p>
                        )}
                        {displayedStudent.district && (
                          <p className="text-[9px] text-slate-600 dark:text-slate-400 truncate font-semibold flex items-center gap-1 mt-0.5">
                            <Lucide.MapPin size={10} className="text-slate-500 shrink-0" />
                            {displayedStudent.district}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="my-6 text-center space-y-2 py-2.5 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-white/5">
                      <Lucide.UserPlus className="mx-auto text-slate-400 dark:text-slate-500 animate-pulse" size={20} />
                      <p className="text-[8px] sm:text-[9.5px] font-black text-slate-600 dark:text-slate-400 leading-normal uppercase tracking-wider">
                        {language === 'en' ? 'Spot Available!' : 'ସ୍ଥାନ ଖାଲି ଅଛି!'}
                      </p>
                      <p className="text-[7px] text-slate-500 dark:text-slate-500 max-w-[80%] mx-auto leading-tight">
                        {language === 'en' 
                          ? 'Study more to claim this rank this week!' 
                          : 'ଏହି ସ୍ଥାନ ହାସଲ କରିବା ପାଇଁ ଅଧିକ ପାଠ ପଢନ୍ତୁ!'}
                      </p>
                    </div>
                  )}

                  {!isSundayClosed && (
                    <>
                      <div className="mt-2 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          {language === 'en' ? 'Study Time' : 'ପଠନ ସମୟ'}
                        </span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {(() => {
                            const mins = displayedStudent?.totalStudyMinutes || 0;
                            const hrs = Math.floor(mins / 60);
                            const m = mins % 60;
                            return `${hrs}h ${m}m`;
                          })()}
                        </span>
                      </div>

                      <p className="text-[8px] sm:text-[9.5px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed mt-3">
                        {displayedStudent
                          ? displayedStudent.id === user?.id
                            ? (language === 'en' 
                                ? "Amazing! You are leading the charts. Keep it up! 🌟" 
                                : "ଚମତ୍କାର! ଆପଣ ସବୁଠୁ ଆଗରେ ଅଛନ୍ତି | ଏମିତି ପଢା ଜାରି ରଖନ୍ତୁ! 🌟")
                            : (language === 'en'
                                ? `Rank ${activeRank} Champion. Keep studying to beat them! 💪`
                                : `Rank ${activeRank} ଚାମ୍ପିଅନ୍। ସେମାନଙ୍କୁ ପଛରେ ପକାଇବା ପାଇଁ ପଢା ଜାରି ରଖନ୍ତୁ! 💪`)
                          : (language === 'en'
                              ? "Become the next Study Champion! Keep studying hard! 💪"
                              : "ପରବର୍ତ୍ତୀ ଚାମ୍ପିଅନ୍ ହେବା ପାଇଁ ପାଠପଢ଼ା ଜାରି ରଖନ୍ତୁ! 💪")
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>



            {/* Motivation Insight */}
            <div className="md:col-span-1">
              <div className={`glass-card rounded-[2rem] p-4 sm:p-6 border relative overflow-hidden flex flex-col justify-center h-full hover:-translate-y-1 transition-all duration-500 ${
                isLight 
                  ? 'border-blue-500/20 bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-blue-50/20 shadow-sm hover:border-blue-500/40' 
                  : 'border-blue-500/20 bg-slate-900/40 hover:border-blue-500/40'
              }`}>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/[0.03] rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex flex-col items-center text-center gap-2.5 sm:gap-3.5 relative z-10">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <Lucide.Sparkles size={16} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="space-y-1 sm:space-y-2 w-full">
                    <h4 className="text-[7px] sm:text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {language === 'en' ? "Today's Inspiration" : 'ଆଜିର ପ୍ରେରଣା'}
                    </h4>
                    <p className="text-slate-700 dark:text-slate-200 text-[9.5px] sm:text-xs font-serif italic leading-relaxed tracking-tight relative px-3 py-1.5 select-none text-center">
                      <span className="absolute left-0 top-[-2px] text-blue-400/30 dark:text-blue-400/20 text-2xl font-serif leading-none">“</span>
                      {todayQuote}
                      <span className="absolute right-0 bottom-[-6px] text-blue-400/30 dark:text-blue-400/20 text-2xl font-serif leading-none">”</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Stats & Global Rankings */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-6 lg:gap-8">
            <OdishaLiveMap language={language} />

            {/* Learning Progress Matrix */}
            <div className="glass-card rounded-[2rem] p-4 sm:p-6 border-white/5 space-y-3 sm:space-y-4 flex flex-col hover:border-white/10 hover:-translate-y-1 transition-all duration-500 h-[250px] sm:h-[300px] lg:h-auto overflow-hidden shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2.5 truncate">
                  <div className="p-1 sm:p-1.5 bg-emerald-500/10 rounded-lg sm:rounded-xl text-emerald-650 dark:text-emerald-500 border border-emerald-500/20 shrink-0">
                    <Lucide.BarChart3 size={14} className="sm:w-4 sm:h-4" />
                  </div>
                  <h3 className="text-[11px] sm:text-md font-black text-slate-800 dark:text-white tracking-tight truncate">
                    {language === 'en' ? 'Subject Mastery' : 'ବିଷୟରେ ଦକ୍ଷତା'}
                  </h3>
                </div>
                <Lucide.TrendingUp size={12} className="text-emerald-500 hidden sm:block shrink-0" />
              </div>

              <div className="space-y-2.5 sm:space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {user?.subject_progress && Object.entries(user.subject_progress).length > 0 ? (
                  Object.entries(user.subject_progress).map(([subject, progress]: [string, any], idx) => (
                    <div key={subject} className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] sm:text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest truncate max-w-[70%]">
                          {translations[language].subjects?.[subject] || subject}
                        </span>
                        <span className="text-[8px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1.5, delay: idx * 0.1, ease: "circOut" }}
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3 border border-slate-200 dark:border-white/5 shadow-inner">
                      <Lucide.BarChart3 size={18} />
                    </div>
                    <p className="text-slate-800 dark:text-slate-300 font-black text-[9.5px] uppercase tracking-widest leading-normal">
                      {language === 'en' ? 'No Mastery Data' : 'କୌଣସି ପ୍ରଗତି ତଥ୍ୟ ନାହିଁ'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-500 text-[8.5px] max-w-[190px] mt-1.5 leading-normal">
                      {language === 'en' 
                        ? 'Complete practice sets and monthly tests to generate your mastery profile!' 
                        : 'ନିଜର ପ୍ରଗତି ରିପୋର୍ଟ ପ୍ରସ୍ତୁତ କରିବା ପାଇଁ ଅଭ୍ୟାସ ଏବଂ ମାସିକ ପରୀକ୍ଷା ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ!'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Achievement Nodes */}
          <div className="glass-card rounded-3xl p-5 md:p-6 border-white/5 space-y-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-500/10 rounded-xl text-purple-650 dark:text-purple-500 border border-purple-500/20">
                  <Lucide.Award size={16} />
                </div>
                <h3 className="text-md font-black text-slate-800 dark:text-white tracking-tight">{t.badges}</h3>
              </div>
              <Lucide.Star size={14} className="text-purple-500" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {user?.stats?.badges && user.stats.badges.length > 0 ? (
                user.stats.badges.slice(0, 6).map((badge: string, i: number) => (
                  <div key={i} className="aspect-square rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center group cursor-help relative hover:border-purple-500/30 transition-all shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-650 dark:text-purple-400 group-hover:scale-110 transition-transform">
                      <Lucide.Star size={18} fill={i === 0 ? "currentColor" : "none"} />
                    </div>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-[9px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-2xl">
                      {badge}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-4 flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-4 justify-center">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-11 h-11 rounded-full border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-700 relative">
                        <Lucide.Lock size={12} className="text-slate-400 dark:text-slate-600" />
                        <div className="absolute -bottom-0.5 -right-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full p-0.5 shadow-sm">
                          <Lucide.Star size={6} className="text-slate-400 dark:text-slate-600" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-slate-800 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest text-center mt-1">
                    {language === 'en' ? 'No Achievements Unlocked' : 'କୌଣସି ପଦକ ଅନ୍‌ଲକ୍ ହୋଇନାହିଁ'}
                  </p>
                  <p className="text-slate-550 dark:text-slate-500 text-[8px] text-center max-w-[180px] -mt-1 leading-normal">
                    {language === 'en' ? 'Earn XP from daily challenges & games to unlock!' : 'ଅନଲକ୍ କରିବାକୁ ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ ଏବଂ ଗେମ୍ସରୁ XP ଅର୍ଜନ କରନ୍ତୁ!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Statewide Leaderboard Section */
        <div className="space-y-6 sm:space-y-8 force-dark-theme">
          {/* Header Summary Card */}
          <div className={`glass-card rounded-[2rem] p-6 border bg-gradient-to-br shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${
            leaderboardType === 'monthly'
              ? 'border-amber-500/20 from-amber-500/5 via-slate-900/40 to-orange-950/10 hover:border-amber-500/30'
              : 'border-emerald-500/20 from-emerald-500/5 via-slate-900/40 to-indigo-950/10 hover:border-emerald-500/30'
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
            <div className="space-y-2 text-center md:text-left flex-1">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest inline-block animate-pulse ${
                leaderboardType === 'monthly'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                🏆 {language === 'en' ? 'Gamification Arena' : 'ଗେମିଫିକେସନ୍ ଆରେନା'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {leaderboardType === 'monthly'
                  ? (language === 'en' ? 'Statewide Monthly Test Champions' : 'ରାଜ୍ୟ ସ୍ତରୀୟ ମାସିକ ଟେଷ୍ଟ ଚାମ୍ପିଅନ୍ସ')
                  : (language === 'en' ? 'Statewide Regional Leaderboard' : 'ରାଜ୍ୟ ସ୍ତରୀୟ ଆଞ୍ଚଳିକ ଲିଡରବୋର୍ଡ')}
              </h2>
              <p className="text-xs text-slate-400 font-bold max-w-xl">
                {leaderboardType === 'monthly'
                  ? (language === 'en'
                      ? 'Track the top scorers of the Monthly Test Series (MTS) across Odisha. Work hard to get featured here!'
                      : 'ଓଡ଼ିଶାର ମାସିକ ଟେଷ୍ଟ ସିରିଜ୍ (MTS) ର ଶୀର୍ଷ ସ୍କୋରର ମାନଙ୍କୁ ଟ୍ରାକ୍ କରନ୍ତୁ | ସଫଳତା ପାଇଁ ଅଧିକ ପରିଶ୍ରମ କରନ୍ତୁ!')
                  : (language === 'en'
                      ? 'Track your rank, sync daily challenges, and earn exclusive Odia scholar badges as you compete with students across Odisha!'
                      : 'ଆପଣଙ୍କର ମାନ୍ୟତା ଟ୍ରାକ୍ କରନ୍ତୁ, ଦୈନିକ ଚ୍ୟାଲେଞ୍ଜ ସମାଧାନ କରନ୍ତୁ ଏବଂ ଓଡ଼ିଶାର ଅନ୍ୟ ଛାତ୍ରମାନଙ୍କ ସହ ପ୍ରତିଦ୍ୱନ୍ଦ୍ୱିତା କରି ଓଡ଼ିଆ ସ୍କଲାର ବ୍ୟାଜ୍ ହାସଲ କରନ୍ତୁ!')}
              </p>
            </div>

            {/* Quick Stats Block */}
            {leaderboardType === 'monthly' ? (
              <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-3xl border border-white/5 shrink-0 w-full md:w-auto justify-around md:justify-start">
                <div className="text-center px-4 border-r border-white/5 hover:scale-[1.05] transition-all duration-300">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Test Rank' : 'ଟେଷ୍ଟ ର୍ୟାଙ୍କ'}
                  </p>
                  <p className="text-lg font-black text-amber-400 font-mono">
                    {(() => {
                      const list = getMonthlyLeaderboardList();
                      const idx = list.findIndex((s: any) => s.name?.toLowerCase() === user?.name?.toLowerCase());
                      return idx >= 0 ? `#${list[idx].rank}` : '-';
                    })()}
                  </p>
                </div>
                <div className="text-center px-4 border-r border-white/5 hover:scale-[1.05] transition-all duration-300">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    {selectedMonth === 'may_2026'
                      ? (language === 'en' ? 'Avg. Score' : 'ହାରାହାରି ସ୍କୋର')
                      : (language === 'en' ? 'Test Score' : 'ପରୀକ୍ଷା ସ୍କୋର')}
                  </p>
                  <p className="text-lg font-black text-amber-400 font-mono">
                    {(() => {
                      const list = getMonthlyLeaderboardList();
                      const idx = list.findIndex((s: any) => s.name?.toLowerCase() === user?.name?.toLowerCase());
                      return idx >= 0 ? `${list[idx].score}/25` : '-';
                    })()}
                  </p>
                </div>
                <div className="text-center px-4 hover:scale-[1.05] transition-all duration-300">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Month' : 'ମାସ'}
                  </p>
                  <p className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {selectedMonth === 'may_2026'
                      ? (language === 'en' ? 'May 2026' : 'ମଇ ୨୦୨୬')
                      : (language === 'en' ? 'July 2026' : 'ଜୁଲାଇ ୨୦୨୬')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-3xl border border-white/5 shrink-0 w-full md:w-auto justify-around md:justify-start">
                <div className="text-center px-4 border-r border-white/5 hover:scale-[1.05] transition-all duration-300">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'en' ? 'Your Rank' : 'ଆପଣଙ୍କ ରାଙ୍କ'}</p>
                  <p className="text-lg font-black text-emerald-400 font-mono">
                    #{combinedLeaderboard.findIndex(s => s.id === user?.id) + 1 || '-'}
                  </p>
                </div>
                <div className="text-center px-4 border-r border-white/5 hover:scale-[1.05] transition-all duration-300">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'en' ? 'Current Tier' : 'ଆପଣଙ୍କ ସ୍ତର'}</p>
                  <p className="text-lg font-black text-amber-400 font-mono">
                    Lvl {getBadgeInfo(user?.points || 0).level}
                  </p>
                </div>
                <div className="text-center px-4 hover:scale-[1.05] transition-all duration-300">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{language === 'en' ? 'Daily MCQ' : 'ଦୈନିକ MCQ'}</p>
                  <p className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    user?.points_today > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                  }`}>
                    {user?.points_today > 0
                      ? (language === 'en' ? 'Completed' : 'ସମାପ୍ତ')
                      : (language === 'en' ? 'Pending' : 'ବାକି ଅଛି')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Table Content with Sidebar-styled filters */}
          <div className="glass-card rounded-[2.5rem] p-4 sm:p-6 md:p-8 border-white/5 bg-slate-900/40 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-white/5 pb-6">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-2xl border ${
                    leaderboardType === 'monthly'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    <Lucide.Trophy size={18} />
                  </div>
                  <div>
                    <h3 className="text-md font-black text-white tracking-tight">
                      {leaderboardType === 'monthly'
                        ? (language === 'en' ? 'Monthly Test Champions' : 'ମାସିକ ଟେଷ୍ଟ ଚାମ୍ପିଅନ୍ସ')
                        : (language === 'en' ? 'Odisha District Rankings' : 'ଓଡ଼ିଶା ଜିଲ୍ଲା ମାନ୍ୟତା ତାଲିକା')}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      {leaderboardType === 'monthly'
                        ? (language === 'en' ? 'Overall top student test performances' : 'ଛାତ୍ରଛାତ୍ରୀଙ୍କ ସାମଗ୍ରିକ ପରୀକ୍ଷା ପ୍ରଦର୍ଶନ')
                        : (language === 'en' ? 'Ranked by overall study effort' : 'ସାମଗ୍ରିକ ପଠନ ପ୍ରୟାସ ଉପରେ ଆଧାରିତ')}
                    </p>
                  </div>
                </div>

                {/* Highlighted Toggle Switch */}
                <div className="flex bg-slate-950/60 p-1 rounded-2xl border border-white/5 gap-1 shrink-0 ml-0 md:ml-4">
                  <button
                    type="button"
                    onClick={() => setLeaderboardType('daily')}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                      leaderboardType === 'daily'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Lucide.Zap size={11} />
                    <span>{t.dailyStreak}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardType('monthly')}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                      leaderboardType === 'monthly'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Lucide.Trophy size={11} />
                    <span>{t.monthlyTest}</span>
                  </button>
                </div>
              </div>

              {/* Monthly Dropdowns (Only render if monthly) */}
              {leaderboardType === 'monthly' && (
                <div className="flex flex-wrap items-center gap-4">
                  {/* Month Selection Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{language === 'en' ? 'Month:' : 'ମାସ:'}</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer focus:border-amber-500/50"
                    >
                      {monthsList.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class Selection Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{language === 'en' ? 'Class:' : 'ଶ୍ରେଣୀ:'}</span>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer focus:border-amber-500/50"
                    >
                      {Array.from({ length: 10 }, (_, i) => String(i + 1)).map(c => (
                        <option key={c} value={c}>
                          {language === 'en' ? `Class ${c}` : `ଶ୍ରେଣୀ ${c}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Daily District Filter (Occupies FULL width below the header!) */}
            {leaderboardType === 'daily' && (
              <DistrictLeaderboardFilter 
                selectedDistrict={selectedDistrict}
                setSelectedDistrict={setSelectedDistrict}
                language={language}
              />
            )}

            {leaderboardType === 'monthly' && (
              <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-600/10 to-amber-500/10 p-5 text-center shadow-[0_0_25px_rgba(245,158,11,0.1)] group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-[shimmer_2s_infinite]"></div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/30">
                    <Lucide.Gift size={20} className="animate-bounce" />
                  </div>
                  <p className="text-xs font-black text-amber-200 tracking-wide uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {language === 'en'
                      ? 'Every month, the top 5 students from each class get free Gundulu monthly access! 🎁'
                      : 'ପ୍ରତି ମାସରେ ପ୍ରତ୍ୟେକ ଶ୍ରେଣୀର ଶୀର୍ଷ ୫ ଜଣ ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ମାଗଣାରେ ଗୁନ୍ଦୁଲୁ ମାସିକ ସବସ୍କ୍ରିପସନ ମିଳିବ! 🎁'}
                  </p>
                </div>
              </div>
            )}

            {/* Top Students Ranked List */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    {leaderboardType === 'daily' ? (
                      <>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Rank' : 'ମାନ୍ୟତା'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Student' : 'ଛାତ୍ର'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'District' : 'ଜିଲ୍ଲା'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Badge Title' : 'ପଦକ ଆଖ୍ୟା'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-center">{language === 'en' ? 'Daily MCQ' : 'ଦୈନିକ MCQ'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-right">{language === 'en' ? 'XP Points' : 'XP ପଏଣ୍ଟ'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-right">{language === 'en' ? 'Action' : 'କାର୍ଯ୍ୟ'}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Rank' : 'ମାନ୍ୟତା'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Student' : 'ଛାତ୍ର'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'Class' : 'ଶ୍ରେଣୀ'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black">{language === 'en' ? 'School' : 'ବିଦ୍ୟାଳୟ'}</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-500 font-black text-right">
                          {selectedMonth === 'may_2026'
                            ? (language === 'en' ? 'Average Score' : 'ହାରାହାରି ସ୍କୋର')
                            : (language === 'en' ? 'Score' : 'ସ୍କୋର')}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboardType === 'daily' ? (
                    filteredList.map((student, idx) => {
                      const isCurrentUser = student.id === user?.id;
                      const badgeInfo = getBadgeInfo(student.points || 0);
                      const globalRank = combinedLeaderboard.findIndex(s => s.id === student.id) + 1;
                      
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
                          key={student.id} 
                          className={`hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(16,185,129,0.1)] hover:scale-[1.005] transition-all duration-300 ${
                            isCurrentUser 
                              ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' 
                              : 'border-l-4 border-l-transparent'
                          }`}
                        >
                          {/* Rank Position */}
                          <td className="px-6 py-4">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                              globalRank === 1 ? 'bg-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                              globalRank === 2 ? 'bg-slate-300 text-slate-950 shadow-[0_0_15px_rgba(203,213,225,0.4)]' :
                              globalRank === 3 ? 'bg-amber-600 text-slate-950 shadow-[0_0_15px_rgba(217,119,6,0.4)]' :
                              'text-slate-200 bg-slate-950 border border-white/5 font-black'
                            }`}>
                              {globalRank}
                            </div>
                          </td>

                          {/* Name and School */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {student.avatar ? (
                                  <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-black text-white uppercase">{student.name?.[0] || 'S'}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-black flex items-center gap-1.5 text-sm">
                                  <span 
                                    className="font-black"
                                    style={{ color: isCurrentUser ? '#34d399' : '#2dd4bf' }}
                                  >
                                    {student.name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black uppercase tracking-wider">
                                      {language === 'en' ? 'You' : 'ଆପଣ'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-350 font-black block mt-0.5 max-w-[200px] truncate">
                                  {student.school || (language === 'en' ? 'Regional High School' : 'ଆଞ୍ଚଳିକ ଉଚ୍ଚ ବିଦ୍ୟାଳୟ')}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* District name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-100">
                              <Lucide.MapPin size={12} className="text-slate-400 shrink-0" />
                              <span className="font-black">
                                {(() => {
                                  const matched = ODISHA_DISTRICTS.find(d => d.en.toLowerCase() === student.district?.toLowerCase());
                                  return matched 
                                    ? (language === 'en' ? matched.en : matched.or)
                                    : student.district;
                                })()}
                              </span>
                            </div>
                          </td>

                          {/* Rank Badge */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-black text-slate-200 border border-white/5 font-mono">
                                Lvl {badgeInfo.level}
                              </span>
                              <span className="text-xs font-black text-amber-400 uppercase tracking-tight">
                                {badgeInfo.title}
                              </span>
                            </div>
                          </td>

                          {/* Daily MCQ Completion check */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              {student.dailyCompleted ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" title="Daily Challenge Completed!">
                                  <Lucide.Check size={12} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-950 border border-white/5 flex items-center justify-center text-slate-650" title="Daily Challenge Pending">
                                  <Lucide.Clock size={10} />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* XP Points */}
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1 text-emerald-400 font-mono font-black text-sm">
                              <Lucide.Zap size={14} className="text-amber-500 shrink-0 animate-pulse" />
                              <span className="font-black">{student.points || 0} XP</span>
                            </div>
                          </td>

                          {/* Action buttons (Follow/Friends) */}
                          <td className="px-6 py-4 text-right">
                            {student.id !== user?.id && (
                              <button
                                onClick={() => onToggleFollow?.(student.id)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  following?.includes(student.id)
                                    ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-red-950/40 hover:text-red-400'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                }`}
                              >
                                {following?.includes(student.id)
                                  ? (language === 'en' ? 'Following' : 'ଅନୁସରଣ କରୁଛନ୍ତି')
                                  : (language === 'en' ? '+ Follow' : '+ ଅନୁସରଣ')}
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })
                  ) : (
                    (() => {
                      const list = getMonthlyLeaderboardList();
                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold text-xs uppercase tracking-wider">
                              {t.noMonthlyData || 'No monthly test data available for the selected month/class.'}
                            </td>
                          </tr>
                        );
                      }
                      return list.map((student: any, idx: number) => {
                        const isCurrentUser = student.name?.toLowerCase() === user?.name?.toLowerCase();
                        
                        return (
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.4) }}
                            key={idx} 
                            className={`hover:bg-white/10 hover:shadow-[0_4px_12px_rgba(245,158,11,0.1)] hover:scale-[1.005] transition-all duration-300 ${
                              isCurrentUser 
                                ? 'bg-amber-500/10 border-l-4 border-l-amber-500' 
                                : 'border-l-4 border-l-transparent'
                            }`}
                          >
                            {/* Rank Position */}
                            <td className="px-6 py-4">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                                student.rank === 1 ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-yellow-300' :
                                student.rank === 2 ? 'bg-slate-300 text-slate-950 shadow-[0_0_15px_rgba(203,213,225,0.4)]' :
                                student.rank === 3 ? 'bg-amber-600 text-slate-950 shadow-[0_0_15px_rgba(217,119,6,0.4)]' :
                                'text-slate-200 bg-slate-950 border border-white/5 font-black'
                              }`}>
                                {student.rank}
                              </div>
                            </td>

                            {/* Student Name */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                  <span className="text-xs font-black text-white uppercase">{student.name?.[0] || 'S'}</span>
                                </div>
                                <div>
                                  <div className="font-black flex items-center gap-1.5 text-sm">
                                    <span 
                                      className="font-black"
                                      style={{ color: isCurrentUser ? '#fbbf24' : '#facc15' }}
                                    >
                                      {student.name}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-black uppercase tracking-wider">
                                        {language === 'en' ? 'You' : 'ଆପଣ'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Class */}
                            <td className="px-6 py-4">
                              <span className="text-xs font-black text-slate-200">
                                {language === 'en' ? `Class ${student.class}` : `ଶ୍ରେଣୀ ${student.class}`}
                              </span>
                            </td>

                            {/* School */}
                            <td className="px-6 py-4">
                              <span className="text-xs font-black text-slate-300 block max-w-[250px] truncate">
                                {student.school}
                              </span>
                            </td>

                            {/* Marks/Score */}
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-1.5 text-amber-400 font-mono font-black text-sm">
                                <Lucide.Crown size={14} className="text-yellow-400 shrink-0 animate-pulse" />
                                <span className="font-black">{student.score} / 25 {language === 'en' ? 'Marks' : 'ମାର୍କ'}</span>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Disclaimer */}
          <div className="max-w-7xl mx-auto px-6 mt-12 mb-8 space-y-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] text-center bg-white/5 py-3 rounded-2xl border border-white/5 backdrop-blur-md">
              <span className="text-amber-500/80 mr-2">◆</span>
              {language === 'en' 
                ? 'AI systems can make mistakes. Please double-check critical information with your textbooks.' 
                : 'AI ସିଷ୍ଟମ୍ ଭୁଲ୍ କରିପାରେ। ଦୟାକରି ଆପଣଙ୍କ ପାଠ୍ୟପୁସ୍ତକ ସହିତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂଚନା ଯାଞ୍ଚ କରନ୍ତୁ।'}
              <span className="text-amber-500/80 ml-2">◆</span>
            </p>

            {/* SOCIAL MEDIAS ROW */}
            <div className="flex items-center justify-center gap-4 bg-slate-900/40 py-4 px-6 rounded-3xl border border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">{language === 'en' ? 'Connect:' : 'ଯୋଗାଯୋଗ:'}</span>
              <a
                href="https://www.facebook.com/share/1JAq6DY6Sq/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre Facebook page"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white border border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] active:scale-95"
              >
                <Lucide.Facebook size={18} />
              </a>
              <a
                href="https://instagram.com/utkalskillcentre"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre Instagram profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] active:scale-95"
              >
                <Lucide.Instagram size={18} />
              </a>
              <a
                href="https://whatsapp.com/channel/utkalskillcentre"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre WhatsApp channel"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95"
              >
                <Lucide.MessageSquare size={18} />
              </a>
              <a
                href="https://www.youtube.com/@UtkalSkillCenter"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Utkal Skill Centre YouTube channel"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95"
              >
                <Lucide.Youtube size={18} />
              </a>
            </div>
          </div>
      </motion.div>

      <AnimatePresence>
        {showTargetModal && (
          <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-4 backdrop-blur-md bg-slate-950/55 force-dark-theme">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              style={{ backgroundColor: '#0b1329', borderColor: '#1e293b' }}
              className="relative w-full max-w-lg border rounded-[2rem] p-6 md:p-8 shadow-2xl mt-20 mb-8 md:my-16"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowTargetModal(false)}
                className="absolute top-5 right-5 p-2 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-400 hover:text-white active:scale-95 transition-all"
              >
                <Lucide.X size={16} />
              </button>

              <div className="space-y-6 mt-2">
                {/* Header with Gundulu */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0 w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                    <img src="/gundulu-v3.png" alt="Gundulu Mascot" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      {language === 'en' ? 'Daily Target Guide' : 'ଦୈନିକ ଲକ୍ଷ୍ୟ ମାର୍ଗଦର୍ଶିକା'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">
                      {language === 'en' 
                        ? `Level ${currentLevel} Student Target • ${dailyGoal} XP Daily` 
                        : `ଲେଭଲ୍ ${currentLevel} ଛାତ୍ର ଲକ୍ଷ୍ୟ • ଦୈନିକ ${dailyGoal} XP`}
                    </p>
                  </div>
                </div>

                {/* Circular / Progress Sync details */}
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4 text-center">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {language === 'en' ? 'Today\'s Progress' : 'ଆଜିର ପ୍ରଗତି'}
                    </span>
                    <span className="text-base font-black text-emerald-450">
                      {user?.points_today || 0} / {dailyGoal} XP ({Math.round(dailyProgress)}%)
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] rounded-full transition-all duration-1000" 
                      style={{ width: `${dailyProgress}%` }}
                    />
                  </div>

                  <p className="text-xs font-bold text-slate-300 leading-relaxed">
                    {dailyProgress >= 100 
                      ? (language === 'en' ? 'Fantastic work! Today\'s goal achieved. Keep it up tomorrow!' : 'ଅଦ୍ଭୁତ କାର୍ଯ୍ୟ! ଆଜିର ଲକ୍ଷ୍ୟ ହାସଲ ହୋଇଛି। ଆସନ୍ତାକାଲି ଏହାକୁ ବଜାୟ ରଖନ୍ତୁ!')
                      : (language === 'en' ? `You need ${dailyGoal - (user?.points_today || 0)} more XP to hit 100%!` : `୧୦୦% ଲକ୍ଷ୍ୟ ପାଇଁ ଆଉ ${dailyGoal - (user?.points_today || 0)} XP ଆବଶ୍ୟକ!`)}
                  </p>
                </div>

                {/* How to make 100% list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    {language === 'en' ? 'How to make 100%?' : '୧୦୦% ଲକ୍ଷ୍ୟ କିପରି ହାସଲ କରିବେ?'}
                  </h4>

                  {/* Gundulu Game Zone */}
                  <button 
                    type="button"
                    onClick={() => {
                      console.log("TargetModal: Game Zone clicked. Invoking onOpenGameZone callback.");
                      setShowTargetModal(false);
                      onOpenGameZone?.();
                    }}
                    className="w-full text-left p-3 bg-amber-950/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-400/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                        <Lucide.Gamepad2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{language === 'en' ? 'Gundulu Game Zone' : 'ଗୁନ୍ଦୁଲୁ ଗେମ୍ ଜୋନ୍'}</div>
                        <div className="text-[10px] text-slate-400 font-bold leading-relaxed">{language === 'en' ? 'Play traditional games' : 'ଯେକୌଣସି ପାରମ୍ପରିକ ଖେଳ ଖେଳନ୍ତୁ'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-400 font-mono">+100 to +150 XP</span>
                      <Lucide.ChevronRight size={14} className="text-amber-500/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* Daily MCQ Challenge */}
                  <button 
                    type="button"
                    onClick={() => {
                      console.log("TargetModal: Daily MCQ Challenge clicked. Invoking onOpenDailyPractice callback.");
                      setShowTargetModal(false);
                      onOpenDailyPractice?.();
                    }}
                    className="w-full text-left p-3 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-400/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                        <Lucide.BookOpen size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{language === 'en' ? 'Daily MCQ Challenge' : 'ଦୈନିକ MCQ ପ୍ରଶ୍ନୋତ୍ତର'}</div>
                        <div className="text-[10px] text-slate-400 font-bold leading-relaxed">{language === 'en' ? 'Complete today\'s challenge set' : 'ଆଜିର ପ୍ରଶ୍ନ ସେଟ୍ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-xs font-black text-emerald-400 font-mono">+25 XP</span>
                      <Lucide.ChevronRight size={14} className="text-emerald-500/40 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* Study Textbook Chapters */}
                  <button 
                    type="button"
                    onClick={() => {
                      console.log("TargetModal: Read Textbook Chapters clicked. Invoking onOpenLibrary callback.");
                      setShowTargetModal(false);
                      onOpenLibrary?.();
                    }}
                    className="w-full text-left p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-2xl flex items-center justify-between gap-3 hover:border-cyan-400/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shrink-0">
                        <Lucide.BookOpenCheck size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{language === 'en' ? 'Read Textbook Chapters' : 'ପାଠ୍ୟବହି ପଢ଼ନ୍ତୁ'}</div>
                        <div className="text-[10px] text-slate-400 font-bold leading-relaxed">{language === 'en' ? 'Read books in Digital Library' : 'ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀରେ ଅଧ୍ୟୟନ କରନ୍ତୁ'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-xs font-black text-cyan-400 font-mono">+10 XP / min</span>
                      <Lucide.ChevronRight size={14} className="text-cyan-500/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {/* AI Doubt Solver */}
                  <button 
                    type="button"
                    onClick={() => {
                      console.log("TargetModal: AI Doubt Solver clicked. Invoking onOpenTutor callback.");
                      setShowTargetModal(false);
                      onOpenTutor?.();
                    }}
                    className="w-full text-left p-3 bg-purple-950/10 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-3 hover:border-purple-400/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shrink-0">
                        <Lucide.Sparkles size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">{language === 'en' ? 'Solve Doubts with Gundulu AI' : 'AI ଟ୍ୟୁଟରଙ୍କ ସହ ସମାଧାନ କରନ୍ତୁ'}</div>
                        <div className="text-[10px] text-slate-400 font-bold leading-relaxed">{language === 'en' ? 'Ask questions in chat' : 'ଚାଟ୍‌ରେ ଆପଣଙ୍କ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ'}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-xs font-black text-purple-400 font-mono">+10 XP / doubt</span>
                      <Lucide.ChevronRight size={14} className="text-purple-500/40 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                </div>

                {/* Close action */}
                <button
                  onClick={() => setShowTargetModal(false)}
                  style={{ backgroundColor: '#10b981' }}
                  className="w-full py-3 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/10 text-center cursor-pointer"
                >
                  {language === 'en' ? 'Got it!' : 'ବୁଝିଗଲି!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showRegistrationForm && (
          <TestSeriesRegistrationForm 
            user={user} 
            language={language} 
            onClose={() => {
              setShowRegistrationForm(false);
              onRegistrationComplete?.();
            }} 
          />
        )}

        {showGoldenTicket && (
          <GoldenTicket
            user={user}
            language={language}
            onClose={() => setShowGoldenTicket(false)}
          />
        )}

        {showBlackboard && (
          <MathBlackboard
            language={language}
            onClose={() => setShowBlackboard(false)}
            isPremium={isPremium}
            onUpgrade={onUpgrade}
            user={user}
            initialMode="student"
          />
        )}

        {showGiftUnlockModal && (
          <GiftUnlockModal
            user={user}
            language={language}
            rank={userBestMtsRank}
            claimTag={completedMtsClaimTag}
            onClose={() => setShowGiftUnlockModal(false)}
            onClaimSuccess={(ticket) => {
              setClaimedTicket(ticket);
              setShowGiftUnlockModal(false);
            }}
            existingTicket={claimedTicket}
          />
        )}

        {showMtsGradingModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card bg-slate-900/90 border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.25)] rounded-[2.5rem] p-6 max-w-md w-full relative overflow-hidden force-dark-theme"
            >
              {/* Decorative glows */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col items-center text-center space-y-6">
                {/* Header Icon */}
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)] animate-pulse">
                  <Lucide.Clock size={28} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">
                    {language === 'en' ? 'MTS Grading in Progress' : 'ପ୍ରଶ୍ନପତ୍ର ମୂଲ୍ୟାଙ୍କନ'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {language === 'en' ? 'Monthly Test Series Status' : 'ମାସିକ ଟେଷ୍ଟ ସିରିଜ୍ ସ୍ଥିତି'}
                  </p>
                </div>

                {/* Progress Ticker */}
                <div className="w-full bg-slate-950/80 border border-white/5 rounded-3xl p-5 space-y-4">
                  <div className="flex justify-between text-xs font-black text-slate-400">
                    <span>{language === 'en' ? 'Evaluation Progress' : 'ମୂଲ୍ୟାଙ୍କନ ଅଗ୍ରଗତି'}</span>
                    <span className="text-indigo-400">78%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: '78%' }} />
                  </div>

                  {/* Checklist */}
                  <div className="text-left space-y-2.5 pt-2 text-xs font-bold">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Lucide.CheckCircle2 size={14} className="shrink-0" />
                      <span>{language === 'en' ? 'Paper Submission: Completed' : 'ଖାତା ଦାଖଲ: ସମ୍ପୂର୍ଣ୍ଣ'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-400">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                      <span>{language === 'en' ? 'AI & Teacher Assessment: Grading' : 'AI ଏବଂ ଶିକ୍ଷକ ମୂଲ୍ୟାଙ୍କନ ଚାଲିଛି'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Lucide.Circle size={14} className="shrink-0" />
                      <span>{language === 'en' ? 'Leaderboard Compilation: Pending' : 'ଫଳາଫଳ ଏବଂ ରାଙ୍କ ପ୍ରସ୍ତୁତି ବାକି ଅଛି'}</span>
                    </div>
                  </div>
                </div>

                {/* Mascot message */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-3 text-left">
                  <img src="/gundulu-pointing-nobg.png" alt="Gundulu" className="w-10 h-10 rounded-xl object-cover border border-indigo-500/30 shrink-0" />
                  <p className="text-xs text-indigo-200 leading-relaxed font-bold">
                    {language === 'en'
                      ? `Gundulu is reviewing answers with our board teachers! The statewide leaderboard and certificates will be out on the ${mtsStatus.publishStartDay}th of this month at 6:00 AM. Get ready!`
                      : `ଗୁନ୍ଦୁଲୁ ଆପଣଙ୍କ ବୋର୍ଡ ଶିକ୍ଷକଙ୍କ ସହ ଖାତା ଦେଖିବାରେ ବ୍ୟସ୍ତ ଅଛି! ଆସନ୍ତା ${mtsStatus.publishStartDay} ତାରିଖ ସକାଳ ୬:୦୦ ଟାରେ ମାର୍କସିଟ୍ ଏବଂ ଲିଡରବୋର୍ଡ ପ୍ରକାଶିତ ହେବ।`}
                  </p>
                </div>

                <button
                  onClick={() => setShowMtsGradingModal(false)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-950/35 hover:scale-[1.02] active:scale-[0.98] border border-indigo-500/30"
                >
                  {language === 'en' ? 'Got it, Gundulu!' : 'ଠିକ୍ ଅଛି ଗୁନ୍ଦୁଲୁ!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showImportantPapersModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card bg-slate-900/95 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] rounded-[2.5rem] p-7 max-w-2xl w-full relative overflow-hidden force-dark-theme max-h-[90vh] flex flex-col"
            >
              {/* Decorative glows */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleCloseWorksheetModal}
                disabled={isGeneratingWorksheet}
                className="absolute top-8 right-8 p-2.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 transition-all border border-slate-200 dark:border-white/10 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed z-50"
              >
                <Lucide.X size={20} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <Lucide.BookOpen size={26} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    {language === 'en' ? 'Gundulu Worksheet Maker' : 'ଗୁନ୍ଦୁଲୁ ପରୀକ୍ଷା ପ୍ରଶ୍ନପତ୍ର ମେକର'}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                    {language === 'en' ? 'Step-by-Step Lined Revision Sheets' : 'ସୋପାନ-ଅନୁସାରେ ଲାଇନ୍‌ଡ୍ ପେପର୍ ମେକର୍'}
                  </p>
                </div>
              </div>

              {/* Wizard Content */}
              <div className="flex-grow overflow-y-auto pr-1">
                
                {/* STEP 1: SUBJECT SELECTION */}
                {worksheetStep === 1 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      {language === 'en' ? 'Step 1: Select Subject' : 'ପ୍ରଥମ ସୋପାନ: ବିଷୟ ଚୟନ କରନ୍ତୁ'}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {subjects.map((sub: any) => {
                        const roadmapChs = getCumulativeChaptersForSubject(sub.key);
                        return (
                          <button
                            key={sub.key}
                            onClick={() => {
                              setSelectedWorksheetSubject(sub.key);
                              fetchWorksheetChapters(sub.key);
                              setWorksheetStep(2);
                            }}
                            className="bg-slate-950/60 border border-white/5 hover:border-emerald-500/40 rounded-3xl p-5 flex items-center gap-4 text-left transition-all duration-300 hover:scale-[1.02] shadow-inner group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
                              <Lucide.FileText size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-black text-white truncate">
                                {language === 'en' ? sub.labelEn : sub.labelOr}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                {roadmapChs.length} {language === 'en' ? 'roadmap chapters' : 'ରୋଡମ୍ୟାପ୍ ଅଧ୍ୟାୟ'}
                              </p>
                            </div>
                            <Lucide.ChevronRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: CHAPTER CHECKLIST */}
                {worksheetStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        {language === 'en' ? 'Step 2: Choose Chapters' : 'ଦ୍ୱିତୀୟ ସୋପାନ: ଅଧ୍ୟାୟ ଚୟନ କରନ୍ତୁ'}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedWorksheetChapters(worksheetChaptersList.map(c => c.id || c.title))}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-slate-300 transition-colors"
                        >
                          {language === 'en' ? 'Select All' : 'ସମସ୍ତ ଚୟନ'}
                        </button>
                        <button
                          onClick={() => setSelectedWorksheetChapters([])}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase text-slate-300 transition-colors"
                        >
                          {language === 'en' ? 'Clear' : 'ସଫା କରନ୍ତୁ'}
                        </button>
                      </div>
                    </div>

                    {isLoadingWorksheetChapters ? (
                      <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
                        <Lucide.Loader2 size={32} className="text-emerald-400 animate-spin" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {language === 'en' ? 'Loading roadmap chapters...' : 'ରୋଡମ୍ୟାପ୍ ଅଧ୍ୟାୟ ଲୋଡ୍ ହେଉଛି...'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto p-1 bg-slate-950/40 border border-white/5 rounded-2xl shadow-inner">
                        {worksheetChaptersList.map((ch: any) => {
                          const id = ch.id || ch.title;
                          const isChecked = selectedWorksheetChapters.includes(id);
                          const title = typeof ch.title === 'string' 
                            ? ch.title 
                            : (ch.title?.or || ch.title?.en || 'Untitled Chapter');
                          
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-3 p-3.5 rounded-xl border border-white/5 bg-slate-900/50 hover:bg-slate-900/90 transition-all cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedWorksheetChapters(selectedWorksheetChapters.filter(x => x !== id));
                                  } else {
                                    setSelectedWorksheetChapters([...selectedWorksheetChapters, id]);
                                  }
                                }}
                                className="w-4.5 h-4.5 rounded border-white/10 text-emerald-500 bg-slate-950 focus:ring-emerald-500/30"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{title}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-white/5">
                      <button
                        onClick={() => setWorksheetStep(1)}
                        className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-black uppercase text-white tracking-wider transition-colors cursor-pointer"
                      >
                        {language === 'en' ? 'Back' : 'ପଛକୁ'}
                      </button>
                      <button
                        disabled={selectedWorksheetChapters.length === 0}
                        onClick={generateCustomWorksheetPDF}
                        className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-black uppercase text-white tracking-wider transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/20"
                      >
                        {language === 'en' ? 'Create PDF' : 'ପ୍ରଶ୍ନପତ୍ର ତିଆରି କରନ୍ତୁ'}
                      </button>
                    </div>
                  </div>
                )}



                {/* STEP 3: GENERATING PROGRESS OR DONE */}
                {worksheetStep === 3 && (
                  <div className="text-center py-6 space-y-6 flex flex-col items-center justify-center">
                    {isGeneratingWorksheet ? (
                      <>
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          {/* Pulsing glow halo */}
                          <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping opacity-60" />
                          <div className="absolute inset-2 rounded-full border-[3px] border-emerald-500/30 border-t-emerald-400 animate-spin" />
                          
                          <img
                            src="/gundulu-pointing-nobg.png"
                            alt="Gundulu"
                            className="w-24 h-24 object-contain animate-bounce-subtle"
                          />
                        </div>
                        
                        <div className="space-y-2 max-w-sm">
                          <h5 className="text-base font-black text-white uppercase tracking-wider">
                            {worksheetGeneratingStatusText}
                          </h5>
                          <div className="w-full h-2 bg-slate-950 border border-white/5 rounded-full overflow-hidden p-0.5">
                            <motion.div
                              animate={{ width: `${worksheetGeneratingProgress}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block pt-1">
                            {worksheetGeneratingProgress}% {language === 'en' ? 'Completed' : 'ସମାପ୍ତ'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative w-28 h-28 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          <Lucide.CheckCircle2 size={48} className="animate-bounce" />
                        </div>
                        
                        <div className="space-y-2 max-w-md">
                          <h4 className="text-lg font-black text-white uppercase tracking-wider">
                            {language === 'en' ? 'Worksheet Generated!' : 'ପ୍ରଶ୍ନପତ୍ର ପ୍ରସ୍ତୁତ ହୋଇଗଲା!'}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {language === 'en' 
                              ? 'Your premium lined A4 notebook revision worksheet has been saved to your downloads folder. Print it and practice!' 
                              : 'ଆପଣଙ୍କର A4 ଖାତା ସ୍ତରୀୟ ଲାଇନ୍‌ଡ୍ ପରୀକ୍ଷା ପ୍ରଶ୍ନପତ୍ର ଡାଉନଲୋଡ୍ ଫୋଲ୍ଡରରେ ସେଭ୍ ହୋଇଛି । ଏହାକୁ ପ୍ରିଣ୍ଟ କରି ଅଭ୍ୟାସ କରନ୍ତୁ!'}
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 w-full justify-center max-w-md">
                          <button
                            onClick={handleShareWorksheet}
                            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-green-950/20 border-none"
                          >
                            <Lucide.Share2 size={14} />
                            <span>{language === 'en' ? 'Share with Friends' : 'ସାଙ୍ଗମାନଙ୍କୁ ସେୟାର୍'}</span>
                          </button>

                          <button
                            onClick={() => setWorksheetStep(1)}
                            className="flex-1 py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Lucide.RotateCcw size={14} />
                            <span>{language === 'en' ? 'Create New' : 'ନୂଆ ପ୍ରସ୍ତୁତ କରନ୍ତୁ'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  {language === 'en' 
                    ? '◆ Powered by Utkal Skill Centre Premium Worksheet Engine ◆' 
                    : '◆ ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ପ୍ରିମିୟମ୍ ପ୍ରଶ୍ନପତ୍ର ଇଞ୍ଜିନ୍ ଦ୍ୱାରା ଚାଳିତ ◆'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showTrailer && (
        <GunduluTrailer 
          language={language}
          onClose={() => setShowTrailer(false)}
          onSubscribe={() => {
            setShowTrailer(false);
            onUpgrade();
          }}
        />
      )}
    </div>
  );
}


function StatCard({ icon, label, value, subValue }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass-card rounded-3xl p-6 hover:border-white/20 transition-all group relative overflow-hidden"
    >
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none"></div>
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 group-hover:scale-110 transition-all border border-white/5">{icon}</div>
        <span className="text-sm text-slate-400 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2 relative z-10">
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        {subValue && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{subValue}</span>}
      </div>
    </motion.div>
  );
}

function TopicProgress({ label, progress, color }: any) {
  return (
    <div className="group space-y-3">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{label}</span>
        <span className="text-xs font-black text-emerald-400">{progress}%</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color} shadow-lg shadow-current/20 relative`}
        >
           <div className="absolute inset-0 bg-white/10"></div>
        </motion.div>
      </div>
    </div>
  );
}
