import os

filepath = "src/components/DigitalLibraryView.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Use substring search without leading spaces to be indentation-agnostic
start_sub = "{/* BOTTOM STUDENT NOTEPAD WORKSPACE */}"
end_sub = "{/* ULTRA-PREMIUM IMMERSIVE FULL-SCREEN READER OVERLAY */}"

start_pos = content.find(start_sub)
end_pos = content.find(end_sub)

if start_pos == -1:
    print("Error: Start marker not found")
    exit(1)
if end_pos == -1:
    print("Error: End marker not found")
    exit(1)

# Backtrack to the start of the line for start_pos
while start_pos > 0 and content[start_pos-1] != '\n':
    start_pos -= 1

# Backtrack to the start of the line for end_pos
while end_pos > 0 and content[end_pos-1] != '\n':
    end_pos -= 1

replacement_code = """              {/* BOTTOM STUDENT NOTEPAD WORKSPACE */}
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-white/5 mt-6 pt-4 flex flex-col overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lucide.PenTool size={16} className="text-emerald-400 animate-pulse" />
                        <span className="text-xs font-black text-slate-300">
                          {language === 'en' ? 'Personal Study Notes' : 'ମୋର ଅଧ୍ୟୟନ ଟିପ୍ପଣୀ'}
                        </span>
                      </div>

                      {/* Saving Indicator */}
                      <span className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className={`h-2 w-2 rounded-full ${isNotepadSaved ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse' : 'bg-amber-400'}`} />
                        <span className={isNotepadSaved ? 'text-slate-500' : 'text-amber-400'}>
                          {isNotepadSaved ? (language === 'en' ? 'Saved' : 'ସଂରକ୍ଷିତ') : (language === 'en' ? 'Saving...' : 'ସଂରକ୍ଷଣ ହେଉଛି...')}
                        </span>
                      </span>
                    </div>

                    <textarea
                      value={personalNotes}
                      onChange={(e) => setPersonalNotes(e.target.value)}
                      placeholder={language === 'en' ? 'Write down important formulas, shortcuts, questions or references...' : 'ଏଠାରେ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ର, ପ୍ରଶ୍ନ କିମ୍ବା ଆପଣଙ୍କ ଟିପ୍ପଣୀ ଲେଖନ୍ତୁ...'}
                      className="w-full h-32 bg-slate-950 border border-white/5 rounded-2xl p-4 text-xs font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/30 resize-none transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT PANEL - GUNDULU FLOATING STUDY ASSISTANT CHATBOX */}
            {isAiOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-24 right-6 z-50 flex flex-col gap-4 font-sans"
              >
                {(() => {
                  const isLight = theme === 'daybreak';
                  const gStyles = {
                    containerBg: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.4)',
                    containerBorder: isLight ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    headerBg: isLight ? '#f0fdf4' : 'linear-gradient(to right, rgba(6, 78, 59, 0.6), rgba(15, 23, 42, 0.4))',
                    headerTitle: isLight ? '#065f46' : '#ffffff',
                    headerSubtitle: isLight ? '#059669' : '#34d399',
                    bubbleUserBg: 'linear-gradient(to bottom right, #10b981, #0d9488)',
                    bubbleUserText: '#ffffff',
                    bubbleGunduluBg: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.05)',
                    bubbleGunduluBorder: isLight ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                    bubbleGunduluText: isLight ? '#0f172a' : '#e2e8f0',
                    chipBg: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
                    chipBorder: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)',
                    chipText: isLight ? '#334155' : '#cbd5e1',
                    inputBg: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.6)',
                    inputBorder: isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)',
                    inputText: isLight ? '#0f172a' : '#e2e8f0',
                  };

                  return (
                    <div
                      style={{ backgroundColor: gStyles.containerBg, borderColor: gStyles.containerBorder }}
                      className="w-full lg:w-96 flex flex-col border rounded-3xl overflow-hidden shadow-lg h-[65vh] lg:h-auto"
                    >
                      {/* Gundulu Chat Header */}
                      <div
                        style={{ background: gStyles.headerBg, borderColor: gStyles.containerBorder }}
                        className="p-4 border-b flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src="/gundulu.png"
                              alt="Gundulu Avatar"
                              className="h-10 w-10 rounded-full border border-emerald-400/30 object-cover bg-emerald-950/20"
                              onError={(e) => {
                                e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                              }}
                            />
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-pulse" />
                          </div>
                          <div>
                            <h3 style={{ color: gStyles.headerTitle }} className="text-sm font-black flex items-center gap-1">
                              <span>{language === 'en' ? 'Gundulu AI Tutor' : 'ଗୁଣ୍ଡୁଲୁ ଏଆଈ ଶିକ୍ଷକ'}</span>
                            </h3>
                            <p style={{ color: gStyles.headerSubtitle }} className="text-[10px] font-extrabold uppercase tracking-wider">
                              {language === 'en' ? 'Online Helper' : 'ସର୍ବଦା ପ୍ରସ୍ତୁତ'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!isPremium ? (
                        /* GUNDULU SUBSCRIPTION LOCK OVERLAY */
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 backdrop-blur-sm">
                          <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                            <Lucide.Lock size={28} />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-sm font-extrabold text-white">
                              {language === 'en' ? 'Unlock Gundulu AI Tutor' : 'ଗୁଣ୍ଡୁଲୁ AI ଟ୍ୟୁଟର ଅନଲକ୍ କରନ୍ତୁ'}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                              {language === 'en'
                                ? 'Chat with Gundulu to solve doubts, explain formulas, and get custom practice tests!'
                                : 'ଗୁଣ୍ଡୁଲୁ ସହ କଥା ହୋଇ ସବୁ ଗଣିତ ପ୍ରଶ୍ନର ସମାଧାନ, ସୂତ୍ର ଏବଂ ସ୍ପେସାଲ୍ ଟେଷ୍ଟ ପାଆନ୍ତୁ!'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpgrade) {
                                onUpgrade();
                              } else {
                                alert(language === 'en' ? 'Please upgrade your plan from the profile dashboard!' : 'ଦୟାକରି ଆପଣଙ୍କ ପ୍ରୋଫାଇଲ୍ ଡ୍ୟାସବୋର୍ଡରୁ ପ୍ଲାନ୍ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ!');
                              }
                            }}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black tracking-wider uppercase transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Lucide.Sparkles size={14} />
                            <span>{language === 'en' ? 'Unlock Premium Now' : 'ପ୍ରିମିୟମ୍ ଅନଲକ୍ କରନ୍ତୁ'}</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* GUNDULU CONVERSATION WATERFALL */}
                          <div
                            ref={chatContainerRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-emerald-500/10"
                          >
                            {chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex items-end gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                {msg.sender === 'gundulu' && (
                                  <img
                                    src="/gundulu.png"
                                    alt="Gundulu"
                                    className="h-6.5 w-6.5 rounded-full border border-emerald-500/10 shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                                    }}
                                  />
                                )}
                                <div
                                  style={msg.sender === 'user'
                                    ? { background: gStyles.bubbleUserBg, color: gStyles.bubbleUserText }
                                    : { backgroundColor: gStyles.bubbleGunduluBg, borderColor: gStyles.bubbleGunduluBorder, color: gStyles.bubbleGunduluText }
                                  }
                                  className={`max-w-[80%] rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-sm border ${
                                    msg.sender === 'user' ? 'rounded-br-none' : 'rounded-bl-none'
                                  }`}
                                >
                                  <div style={{ color: msg.sender === 'user' ? '#ffffff' : gStyles.bubbleGunduluText }}>
                                    <ReactMarkdown>{cleanMathNotation(msg.text)}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {isAiLoading && (
                              <div className="flex items-end gap-2.5 justify-start">
                                <img
                                  src="/gundulu.png"
                                  alt="Gundulu"
                                  className="h-6.5 w-6.5 rounded-full animate-bounce"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/8649/8649595.png';
                                  }}
                                />
                                <div
                                  style={{ backgroundColor: gStyles.bubbleGunduluBg, borderColor: gStyles.bubbleGunduluBorder }}
                                  className="border rounded-2xl rounded-bl-none p-3.5 shadow-sm"
                                >
                                  <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                                  </div>
                                </div>
                              </div>
                            )}
                            <div ref={chatBottomRef} />
                          </div>

                          {/* QUICK CHIPS SUGGESTIONS */}
                          <div
                            style={{ backgroundColor: gStyles.inputBg, borderColor: gStyles.containerBorder }}
                            className="p-3 border-t flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0"
                          >
                            <button
                              onClick={() => handleSendToGundulu(language === 'en' ? "Summarize this chapter for me." : "ଏହି ଅଧ୍ୟାୟର ସାରାଂଶ ବୁଝାଅ।")}
                              style={{ backgroundColor: gStyles.chipBg, borderColor: gStyles.chipBorder, color: gStyles.chipText }}
                              className="px-3 py-1.5 rounded-full border text-[10px] font-bold active:scale-95 transition-all flex-shrink-0"
                            >
                              📝 {language === 'en' ? 'Summarize Guide' : 'ସାରାଂଶ'}
                            </button>
                            <button
                              onClick={() => handleSendToGundulu(language === 'en' ? "Give me an MCQ test based on this chapter." : "ଏହି ଅଧ୍ୟାୟରୁ ମୋତେ MCQ ପ୍ରଶ୍ନ ପଚାର।")}
                              style={{ backgroundColor: gStyles.chipBg, borderColor: gStyles.chipBorder, color: gStyles.chipText }}
                              className="px-3 py-1.5 rounded-full border text-[10px] font-bold active:scale-95 transition-all flex-shrink-0"
                            >
                              ⚡ {language === 'en' ? 'Ask me MCQ' : 'MCQ ପ୍ରଶ୍ନ'}
                            </button>
                            <button
                              onClick={() => handleSendToGundulu(language === 'en' ? "Explain the most important formulas of this chapter." : "ଏହି ଅଧ୍ୟାୟର ସବୁଠାରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ସୂତ୍ରଗୁଡ଼ିକ ବୁଝାଅ।")}
                              style={{ backgroundColor: gStyles.chipBg, borderColor: gStyles.chipBorder, color: gStyles.chipText }}
                              className="px-3 py-1.5 rounded-full border text-[10px] font-bold active:scale-95 transition-all flex-shrink-0"
                            >
                              📐 {language === 'en' ? 'Explain Formulas' : 'ମୁଖ୍ୟ ସୂତ୍ର'}
                            </button>
                          </div>

                          {/* Gundulu Chat Input Form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendToGundulu(inputValue);
                            }}
                            style={{ backgroundColor: gStyles.inputBg, borderColor: gStyles.containerBorder }}
                            className="p-3 border-t flex items-center gap-2"
                          >
                            <input
                              type="text"
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              placeholder={language === 'en' ? 'Ask Gundulu about this chapter...' : 'ଏହି ଅଧ୍ୟାୟ ବିଷୟରେ ଗୁଣ୍ଡୁଲୁକୁ ପଚାରନ୍ତୁ...'}
                              style={{ backgroundColor: gStyles.inputBg, borderColor: gStyles.inputBorder, color: gStyles.inputText }}
                              className="flex-1 border rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500/30"
                            />
                            <button
                              type="submit"
                              disabled={!inputValue.trim() || isAiLoading}
                              className="p-2.5 rounded-2xl bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center"
                            >
                              <Lucide.Send size={16} />
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}

"""

new_content = content[:start_pos] + replacement_code + content[end_pos:]

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Repair completed successfully!")
