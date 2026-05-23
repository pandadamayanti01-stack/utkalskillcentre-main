const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Dashboard.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const startIdx = 283; // Line 284 is index 283
const endIdx = 719;   // Line 720 is index 719

const newRenderBlock = `  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [chatInput, setChatInput] = useState('');

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F4F8] relative pb-20">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* FREE Notes Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-[#2B7A78] rounded-3xl p-5 relative overflow-hidden shadow-md flex justify-between items-center"
        >
          <div className="relative z-10 space-y-2">
            <h2 className="text-white text-xl font-black">ମାଗଣା ନୋଟ୍</h2>
            <div className="inline-block bg-[#1B5250] text-white px-3 py-1 rounded-full text-xs font-bold mb-2">
              FREE Notes
            </div>
            <br />
            <button className="bg-[#FFB800] text-black px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-yellow-400 transition-colors">
              FREE କିମ୍ବା &gt;
            </button>
          </div>
          <div className="relative z-10 w-24 h-24 bg-white rounded-2xl p-2 shadow-lg flex items-center justify-center -rotate-6 border-4 border-emerald-100">
            {/* Document Illustration Mock */}
            <div className="w-full h-full border-2 border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1 bg-emerald-50">
              <Lucide.CheckCircle2 className="text-emerald-500" size={24} />
              <Lucide.Pencil className="text-emerald-500 absolute -right-2 -bottom-2" size={16} />
            </div>
          </div>
          {/* Carousel dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
          </div>
        </motion.div>

        {/* MCQ Practice Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex justify-between items-center"
        >
          <div className="space-y-2">
            <h2 className="text-slate-800 text-xl font-black">MCQ ପ୍ରାକ୍ଟିସ୍</h2>
            <div className="flex items-center gap-2">
              <span className="bg-[#FFB800] text-black px-2 py-0.5 rounded text-[10px] font-black uppercase">Free</span>
              <span className="text-slate-500 text-sm font-bold">practive କରେ?</span>
            </div>
          </div>
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center p-2 relative">
             <Lucide.Bot className="text-blue-500 w-full h-full" strokeWidth={1.5} />
             <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
        </motion.div>

      </div>

      {/* Embedded Expandable AI Chat */}
      <motion.div 
        layout
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={\`absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-slate-200 flex flex-col overflow-hidden transition-all duration-300 z-30 \${isChatMaximized ? 'h-[85vh]' : 'h-[50vh]'}\`}
      >
        {/* Chat Header */}
        <div className="bg-[#2D68E2] px-6 py-4 flex items-center justify-between rounded-t-[2.5rem] shrink-0 cursor-pointer" onClick={() => setIsChatMaximized(!isChatMaximized)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Lucide.MessageCircle size={16} className="text-white fill-white" />
            </div>
            <h3 className="text-white font-black text-lg">AI ଚ୍ୟାଟ୍</h3>
          </div>
          <div className="flex items-center gap-4 text-white">
            <Lucide.MessageSquare size={20} className="opacity-80" />
            <Lucide.Phone size={20} className="opacity-80" />
            <button className="opacity-80 hover:opacity-100 transition-opacity">
              {isChatMaximized ? <Lucide.Minimize2 size={20} /> : <Lucide.Maximize2 size={20} />}
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {/* AI Message */}
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 mt-1">
              <Lucide.Bot size={16} className="text-[#2D68E2]" />
            </div>
            <div className="bg-slate-200 text-slate-700 p-3 rounded-2xl rounded-tl-none text-sm font-medium shadow-sm">
              ହେଲୋ! ମୁଁ ଆପଣଙ୍କର AI Study Buddy। ଆଜି ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?
            </div>
          </div>

          {/* User Message */}
          <div className="flex gap-3 max-w-[85%] ml-auto flex-row-reverse">
             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300 mt-1 overflow-hidden">
               <Lucide.User size={16} className="text-slate-500" />
            </div>
            <div className="bg-[#2D68E2] text-white p-3 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm">
              Smart Learning ଦ୍ଵାରା ଚାକିରି ପାଇଁ ଭଲ ସୁବିଧା ଅଛି।
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white p-3 pb-6 border-t border-slate-200 shrink-0 flex gap-2 items-center">
          <button className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
            <Lucide.Paperclip size={20} />
          </button>
          <div className="flex-1 bg-slate-100 rounded-full flex items-center px-4 py-2 border border-slate-200">
            <input 
              type="text"
              placeholder="End message..."
              className="bg-transparent border-none focus:ring-0 flex-1 text-sm text-slate-700 placeholder:text-slate-400"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button className="text-slate-400 hover:text-blue-500 p-1">
              <Lucide.Smile size={18} />
            </button>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#2D68E2] flex items-center justify-center text-white shadow-md hover:bg-blue-700 transition-colors shrink-0">
            <Lucide.Send size={16} />
          </button>
        </div>
      </motion.div>

    </div>
  );`;

lines.splice(startIdx, endIdx - startIdx + 1, newRenderBlock);
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Successfully updated Dashboard.tsx!');
