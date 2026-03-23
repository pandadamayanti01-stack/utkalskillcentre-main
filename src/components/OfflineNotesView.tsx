import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  BookOpen, 
  ChevronRight, 
  LayoutGrid, 
  List,
  ArrowDownToLine,
  Eye,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Share2,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';
import { getLocalizedSubject } from '../utils/helpers';

interface OfflineItem {
  id: string;
  title: string;
  subject: string;
  type: 'note' | 'textbook';
  thumbnail_url?: string;
  file_size?: string;
  downloaded_at: Date;
  local_path: string;
}

interface OfflineNotesViewProps {
  items: OfflineItem[];
  language: 'en' | 'or';
  onView: (item: OfflineItem) => void;
  onDelete: (item: OfflineItem) => void;
}

export const OfflineNotesView: React.FC<OfflineNotesViewProps> = ({ 
  items, 
  language, 
  onView, 
  onDelete 
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'note' | 'textbook'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

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
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <WifiOff size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              Offline <span className="text-emerald-500">Library</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">
              {filteredItems.length} Items Saved Locally
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Search offline items..."
              className="w-full md:w-80 pl-12 pr-4 py-3 rounded-2xl bg-slate-900/50 border border-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex gap-4">
        <button 
          onClick={() => setSelectedType('all')}
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedType === 'all' ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          All Items
        </button>
        <button 
          onClick={() => setSelectedType('note')}
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedType === 'note' ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          Notes
        </button>
        <button 
          onClick={() => setSelectedType('textbook')}
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${selectedType === 'textbook' ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
        >
          Textbooks
        </button>
      </div>

      {/* Offline Items Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={viewMode + selectedType + searchQuery}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}
        >
          {filteredItems.map((item) => (
            <motion.div 
              key={item.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className={`group glass-card neon-border overflow-hidden transition-all ${viewMode === 'grid' ? 'rounded-[2.5rem] flex flex-col' : 'rounded-3xl flex items-center p-4 gap-6'}`}
            >
              <div className={`relative overflow-hidden bg-slate-800 ${viewMode === 'grid' ? 'aspect-[3/4] w-full' : 'w-24 h-32 rounded-2xl shrink-0'}`}>
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    {item.type === 'note' ? <FileText size={48} /> : <BookOpen size={48} />}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                  <button 
                    onClick={() => onView(item)}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg"
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <button 
                    onClick={() => onDelete(item)}
                    className="w-full py-2.5 rounded-xl bg-red-500/20 backdrop-blur-md border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  {getLocalizedSubject(item.subject, language)}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-slate-950/60 backdrop-blur-md border border-white/10 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {item.type}
                </div>
              </div>

              <div className={`p-6 flex-1 flex flex-col ${viewMode === 'list' ? 'p-0' : ''}`}>
                <h3 className="text-lg font-black text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {item.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {item.downloaded_at.toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <ArrowDownToLine size={12} />
                    {item.file_size || '---'}
                  </div>
                </div>
              </div>

              {viewMode === 'list' && (
                <div className="pr-4 flex gap-2">
                  <button 
                    onClick={() => onView(item)}
                    className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-white/5"
                  >
                    <Eye size={20} />
                  </button>
                  <button 
                    onClick={() => onDelete(item)}
                    className="p-3 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {filteredItems.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-700 border border-dashed border-white/10">
                <WifiOff size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">No Offline Items</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-sm">You haven't saved any items for offline use yet. Download notes or textbooks to see them here.</p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Storage Info */}
      <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <ArrowDownToLine size={24} />
          </div>
          <div>
            <h4 className="text-white font-bold">Local Storage</h4>
            <p className="text-sm text-slate-500">Using 124 MB of 2 GB available</p>
          </div>
        </div>
        <div className="w-full md:w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: '15%' }}></div>
        </div>
        <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
          Manage Storage
        </button>
      </div>
    </div>
  );
};
