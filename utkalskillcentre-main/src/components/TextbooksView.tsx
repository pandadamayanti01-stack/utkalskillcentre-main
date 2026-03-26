import React from 'react';
import { motion } from 'motion/react';
import { 
  Book, 
  Download, 
  Search, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  FileText
} from 'lucide-react';
import { translations } from '../translations';

interface Textbook {
  id: string;
  class: string;
  board: string;
  subject: string;
  title: string;
  download_url: string;
  thumbnail_url?: string;
  status?: 'draft' | 'published';
}

interface TextbooksViewProps {
  language: 'en' | 'or';
  onBack: () => void;
  textbooks: Textbook[];
  loading: boolean;
}

export function TextbooksView({ language, onBack, textbooks, loading }: TextbooksViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedSubject, setSelectedSubject] = React.useState('All');

  const subjects = ['All', ...new Set(textbooks.map(t => t.subject))];

  const filteredTextbooks = textbooks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'All' || t.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Book className="text-emerald-400" />
              {translations[language].textbooks}
            </h1>
            <p className="text-slate-400 text-sm">{translations[language].textbooksDesc}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={translations[language].searchTextbooks}
              className="w-full sm:w-64 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500/50 outline-none transition-all"
            />
          </div>
          <select 
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900/50 border border-white/5 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500/50 transition-all"
          >
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-emerald-400" size={40} />
          <p className="text-slate-400">{translations[language].loadingTextbooks}</p>
        </div>
      ) : filteredTextbooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTextbooks.map((book, idx) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 hover:bg-slate-900 transition-all flex flex-col"
            >
              <div className="aspect-[3/4] bg-black/40 rounded-3xl mb-6 overflow-hidden relative">
                {book.thumbnail_url ? (
                  <img src={book.thumbnail_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-600">
                    <FileText size={48} />
                    <span className="text-xs font-medium uppercase tracking-widest">{book.subject}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                  <a 
                    href={book.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all"
                  >
                    <Download size={18} />
                    {translations[language].download}
                  </a>
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {book.subject}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {book.class}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">{book.title}</h3>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-500">{book.board}</span>
                <a 
                  href={book.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 rounded-xl text-slate-400 hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <ChevronRight size={18} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-30">
          <Book size={60} />
          <p className="text-lg font-medium">{translations[language].noTextbooksFound}</p>
        </div>
      )}
    </div>
  );
}
