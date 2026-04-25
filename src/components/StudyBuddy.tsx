import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Camera, 
  Loader2, 
  Bot, 
  User, 
  Sparkles 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { getAI } from '../services/aiService';

interface StudyBuddyProps {
  user: any;
  language: 'en' | 'or';
  isPremium: boolean;
}

export function StudyBuddy({ user, language, isPremium }: StudyBuddyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: `Hi ${user.name}! I'm your Study Buddy. How can I help you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isListening, transcript, startListening, stopListening } = useVoiceSearch(language);

  useEffect(() => {
    if (transcript) {
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(language === 'en' ? "Image size should be less than 5MB" : "ଫଟୋର ଆକାର ୫ MB ରୁ କମ୍ ହେବା ଉଚିତ୍ |");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage(base64String);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage || loading) return;

    const userMessage = input.trim();
    const imageData = selectedImage && imageMimeType ? { data: selectedImage, mimeType: imageMimeType } : undefined;
    
    setInput('');
    setSelectedImage(null);
    setImageMimeType(null);
    
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage || (language === 'en' ? "Sent an image" : "ଏକ ଫଟୋ ପଠାଗଲା"),
      image: imageData ? `data:${imageData.mimeType};base64,${imageData.data}` : undefined
    }]);
    setLoading(true);

    try {
      const ai = getAI();
      const parts: any[] = [];
      if (userMessage) parts.push({ text: userMessage });
      if (imageData) parts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: { parts },
        config: {
          systemInstruction: `You are a helpful Study Buddy for a student in Class ${user.class}. 
          Keep your explanations simple, encouraging, and educational. 
          Use examples where possible. Respond in ${language === 'en' ? 'English' : 'Odia'}.`
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I couldn't generate a response." }]);
    } catch (err) {
      console.error("Study Buddy Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-emerald-400/30"
      >
        <MessageCircle size={32} />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Bot className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold">Study Buddy</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-emerald-100 uppercase tracking-widest font-bold">Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                      {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-emerald-500" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
                      {msg.image && (
                        <img src={msg.image} alt="Sent" className="max-w-full rounded-lg mb-2 border border-white/10" />
                      )}
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Bot size={16} className="text-emerald-500" />
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none">
                      <Loader2 className="animate-spin text-emerald-500" size={16} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/50 border-t border-white/5 space-y-4">
              {selectedImage && (
                <div className="relative inline-block">
                  <img src={`data:${imageMimeType};base64,${selectedImage}`} alt="Preview" className="h-20 w-20 object-cover rounded-xl border-2 border-emerald-500" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg">
                    <X size={12} />
                  </button>
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-slate-900 rounded-2xl border border-white/10 p-2 focus-within:border-emerald-500/50 transition-colors">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask anything..."
                    className="w-full bg-transparent border-none focus:ring-0 text-white text-sm resize-none py-2 px-3 max-h-32"
                    rows={1}
                  />
                  <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button 
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Camera size={18} />
                      </button>
                      <button 
                        onClick={isListening ? stopListening : startListening}
                        className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-emerald-400'}`}
                      >
                        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={loading || (!input.trim() && !selectedImage)}
                      className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
            <input type="file" ref={cameraInputRef} onChange={handleImageSelect} accept="image/*" capture="environment" className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
