import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  BookOpen,
  X,
  Clock,
  Search,
  AlertCircle
} from 'lucide-react';
import Markdown from 'react-markdown';
import { OfflineService } from '../services/offlineService';
import { translations } from '../translations';

interface OfflineNotesViewProps {
  language: 'en' | 'or';
  onBack: () => void;
}

export function OfflineNotesView({ language, onBack }: OfflineNotesViewProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const allNotes = await OfflineService.getAllNotes();
      setNotes(allNotes);
    } catch (err) {
      console.error("Load Notes Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(language === 'en' ? "Are you sure you want to delete this note?" : "ଆପଣ ନିଶ୍ଚିତ କି ଆପଣ ଏହି ନୋଟ୍ କୁ ଡିଲିଟ୍ କରିବାକୁ ଚାହୁଁଛନ୍ତି?")) {
      try {
        await OfflineService.deleteNote(id);
        await loadNotes();
        if (selectedNote?.id === id) setSelectedNote(null);
      } catch (err) {
        console.error("Delete Note Error:", err);
      }
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-emerald-400" />
              {translations[language].offlineNotes}
            </h1>
            <p className="text-slate-400 text-sm">{translations[language].offlineNotesDesc}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={translations[language].searchNotes}
            className="w-full sm:w-64 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500/50 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          {loading ? (
            <div className="p-10 text-center text-slate-500">Loading...</div>
          ) : filteredNotes.length > 0 ? (
            filteredNotes.map((note, idx) => (
              <motion.button
                key={note.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedNote(note)}
                className={`w-full text-left p-6 rounded-3xl border transition-all group relative ${
                  selectedNote?.id === note.id ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900/50 border-white/5 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {note.subject}
                      </span>
                    </div>
                    <h3 className={`font-bold transition-colors ${selectedNote?.id === note.id ? 'text-emerald-400' : 'text-white group-hover:text-emerald-400'}`}>
                      {note.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Clock size={12} />
                      {new Date(note.savedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => handleDelete(e, note.id)}
                    className="p-2 bg-red-500/10 text-red-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 opacity-30 bg-slate-900/50 border border-white/5 rounded-3xl">
              <FileText size={48} />
              <p className="text-sm">{translations[language].noNotesFound}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedNote ? (
              <motion.div
                key={selectedNote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 lg:p-12 min-h-[600px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                  <BookOpen size={160} />
                </div>

                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-2">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">
                      {selectedNote.subject}
                    </span>
                    <h2 className="text-3xl font-bold text-white">{selectedNote.title}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedNote(null)}
                    className="p-3 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 lg:hidden"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="prose prose-invert max-w-none">
                  <div className="markdown-body">
                    <Markdown>{selectedNote.content}</Markdown>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center gap-6 bg-slate-900/20 border border-dashed border-white/10 rounded-[2.5rem] p-12">
                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center text-slate-600">
                  <BookOpen size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white opacity-50">{translations[language].selectNote}</h3>
                  <p className="text-slate-500 max-w-[300px]">{translations[language].selectNoteDesc}</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
