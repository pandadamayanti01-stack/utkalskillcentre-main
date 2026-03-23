import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Loader2, Send, Camera, Image, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import { useVoiceSearch } from '../hooks/useVoiceSearch';

interface StudyBuddyProps {
  user: any;
  language: 'en' | 'or';
}

export function StudyBuddy({ user, language }: StudyBuddyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: `Hi ${user.name}! I'm your AI Study Buddy. How can I help you today?` }
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
  }, [messages, loading]);

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const parts: any[] = [];
      if (userMessage) parts.push({ text: userMessage });
      if (imageData) parts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: { parts },
        config: {
          systemInstruction: `You are a helpful, encouraging AI Study Buddy for a student named ${user.name}. 
          Your goal is to explain educational concepts clearly, help with homework (without just giving answers), and motivate the student. 
          Keep your responses concise, friendly, and appropriate for a school-age student. 
          Use simple language and analogies where helpful.`
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
    } catch (err) {
      console.error("Study Buddy Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! I'm having a little trouble thinking right now. Can we try again?" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-8 w-16 h-16 rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 flex items-center justify-center z-40 border-4 border-slate-950"
      >
        <Bot size={32} />
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-slate-950"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-28 right-8 w-96 h-[500px] bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-blue-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Study Buddy</h3>
                  <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">AI Tutor Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white rounded-tr-none' 
                      : 'bg-white/5 text-slate-300 border border-white/10 rounded-tl-none'
                  }`}>
                    {msg.image && (
                      <img src={msg.image} alt="User upload" className="w-full h-32 object-cover rounded-lg mb-2" referrerPolicy="no-referrer" />
                    )}
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-slate-950/50">
              {selectedImage && (
                <div className="mb-4 relative w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500">
                  <img src={`data:${imageMimeType};base64,${selectedImage}`} alt="Selected" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => { setSelectedImage(null); setImageMimeType(null); }}
                    className="absolute top-0 right-0 bg-black/60 text-white p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={cameraInputRef}
                    onChange={handleImageSelect}
                  />
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Camera size={18} />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <Image size={18} />
                  </button>
                </div>
                <div className="relative flex-1">
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button 
                    onClick={handleSend}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-400 transition-all"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
