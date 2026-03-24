import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Calendar, 
  Play, 
  Trophy, 
  Clock 
} from 'lucide-react';
import { translations } from '../translations';
import { MonthlyTest } from '../types';
import { MonthlyTestEngine } from './MonthlyTestEngine';
import { getLocalizedSubject } from '../lib/utils';

interface MonthlyTestsViewProps {
  tests: MonthlyTest[];
  submissions: any[];
  language: 'en' | 'or';
  user: any;
  onBack: () => void;
}

export function MonthlyTestsView({ tests, submissions, language, user, onBack }: MonthlyTestsViewProps) {
  const [selectedTest, setSelectedTest] = useState<MonthlyTest | null>(null);
  const [takingTest, setTakingTest] = useState(false);

  useEffect(() => {
    if (selectedTest) {
      const updatedSelected = tests.find((t: MonthlyTest) => t.id === selectedTest.id || (t.translationGroupId && t.translationGroupId === selectedTest.translationGroupId));
      if (updatedSelected) {
        setSelectedTest(updatedSelected);
      } else {
        setSelectedTest(null);
        setTakingTest(false);
      }
    }
  }, [tests]);

  const getSubmission = (test: MonthlyTest) => {
    const groupTestIds = tests
      .filter((t: MonthlyTest) => t.id === test.id || (t.translationGroupId && t.translationGroupId === test.translationGroupId))
      .map((t: MonthlyTest) => t.id);
    return submissions.find((s: any) => groupTestIds.includes(s.testId));
  };

  if (takingTest && selectedTest) {
    return (
      <MonthlyTestEngine 
        test={selectedTest} 
        onComplete={() => {
          setTakingTest(false);
          setSelectedTest(null);
        }} 
        onBack={() => setTakingTest(false)}
        language={language} 
        user={user}
      />
    );
  }

  const filteredTests = tests; // Show all published tests to all students for consistency

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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
      className="space-y-8"
    >
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Dashboard</span>
      </motion.button>

      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{translations[language].monthlyTests}</h1>
          <p className="text-slate-400">Participate in monthly assessments for {translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} and track your progress.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTests.map((test: MonthlyTest) => {
          const submission = getSubmission(test);
          const resultsPublished = test.results_published;

          return (
            <motion.div whileHover={{ y: -5 }} key={test.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 hover:border-emerald-500/20 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Calendar size={32} />
                </div>
                {submission ? (
                  <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                    Completed
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-wider">
                    Available
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{getLocalizedSubject(test.subject, language)} - {test.month} {test.year}</h3>
              <p className="text-slate-400 mb-8">Total Questions: {test.questions.length}</p>

              <div className="flex flex-col gap-3">
                {submission ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div className="bg-slate-800/50 rounded-2xl p-4 text-center">
                        <p className="text-xl font-bold text-white">{submission.score}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Score</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-2xl p-4 text-center">
                        <p className="text-xl font-bold text-emerald-500">
                          {resultsPublished ? `#${submission.rank || 'N/A'}` : 'Pending'}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Rank</p>
                      </div>
                    </div>
                    {resultsPublished && (
                      <div className="w-full py-4 rounded-2xl bg-slate-800 text-white font-bold text-center flex items-center justify-center gap-2">
                        <Trophy size={18} /> Results Published
                      </div>
                    )}
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setSelectedTest(test);
                      setTakingTest(true);
                    }}
                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <Play size={18} /> {translations[language].takeMonthlyTest}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {filteredTests.length === 0 && (
          <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
            <Clock size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Tests Scheduled</h3>
            <p className="text-slate-500">Check back later for upcoming monthly assessments for your class and subjects.</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
