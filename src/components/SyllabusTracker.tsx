import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { SEO } from './SEO';

interface SyllabusTrackerProps {
  language: 'en' | 'or';
  onBack: () => void;
}

export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ language, onBack }) => {
  const year = new Date().getFullYear();
  
  const syllabusData = [
    { subject: "Physical Science", status: "Updated", topics: "Chemical Reactions, Acids Bases, Metals Non-metals" },
    { subject: "Life Science", status: "Updated", topics: "Nutrition, Respiration, Transportation, Excretion" },
    { subject: "Mathematics", status: "Updated", topics: "Quadratic Equations, Arithmetic Progression, Probability" },
    { subject: "History & Civics", status: "Updated", topics: "Indian National Movement, Odisha History, Constitution" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      <SEO 
        title={`Odisha Board Reduced Syllabus ${year} PDF Download | Class 10 | Utkal Skill Centre`}
        description={`Download the latest Odisha Board Class 10 reduced syllabus for ${year}. Track your progress across Physical Science, Math, and History. Updated for the May 5th test.`}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">
            {language === 'en' ? `Syllabus Tracker ${year}` : `${year} ପାଠ୍ୟକ୍ରମ ଟ୍ରାକର୍`}
          </h1>
          <p className="text-slate-400 max-w-2xl">
            {language === 'en' 
              ? "Track your progress according to the latest Odisha Board reduced syllabus. Download the official PDF below."
              : "ସର୍ବଶେଷ ଓଡିଶା ବୋର୍ଡ ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ ଆପଣଙ୍କର ଅଗ୍ରଗତି ଟ୍ରାକ୍ କରନ୍ତୁ | ନିମ୍ନରେ ଅଫିସିଆଲ୍ PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ |"}
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={16} />
          {language === 'en' ? 'Back' : 'ପଛକୁ'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Download size={80} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Official Syllabus PDF</h3>
            <p className="text-sm text-slate-400">Download the complete Odisha Board Class 10 Syllabus for the academic year {year}-{year+1}.</p>
            <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2">
              <Download size={18} />
              DOWNLOAD PDF
            </button>
          </div>
        </div>

        <div className="glass-card p-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 flex items-center gap-6">
           <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
             <AlertCircle size={32} />
           </div>
           <div>
             <h3 className="text-lg font-bold text-white">Important Update</h3>
             <p className="text-sm text-slate-400">The monthly test on May 5th will cover the first two chapters of every subject. Gundulu suggests focusing on MCQs first!</p>
           </div>
        </div>
      </div>

      <div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Subject</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Key Topics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {syllabusData.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="font-bold text-white">{item.subject}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {item.topics}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
