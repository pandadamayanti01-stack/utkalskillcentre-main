import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Paperclip
} from 'lucide-react';
import { translations } from '../translations';
import { Test } from '../types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db as firestore, storage } from '../firebase';

interface MonthlyTestEngineProps {
  test: Test;
  onComplete: () => void;
  onBack: () => void;
  language: 'en' | 'or';
  user: any;
}

export function MonthlyTestEngine({ test, onComplete, onBack, language, user }: MonthlyTestEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [roughNotes, setRoughNotes] = useState<Record<number, string>>({});
  const [uploadingNote, setUploadingNote] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Image compression utility to speed up uploads
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimension 1200px
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.7); // 70% quality
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleNoteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingNote(currentIdx);
    console.log(`[Upload] Starting process for question ${currentIdx}...`);
    
    try {
      let dataToUpload: Blob | File = file;
      
      // Only compress if file is larger than 1MB
      if (file.size > 1024 * 1024) {
        console.log(`[Upload] File size ${Math.round(file.size / 1024)}KB. Compressing...`);
        dataToUpload = await compressImage(file);
        console.log(`[Upload] Compression complete. New size: ${Math.round(dataToUpload.size / 1024)}KB`);
      } else {
        console.log(`[Upload] File size ${Math.round(file.size / 1024)}KB. Skipping compression.`);
      }
      
      // 2. Upload with folder-based path
      const userId = user.id || user.uid || 'anonymous';
      const fileName = `rough_notes/${userId}/${test.id}/q${currentIdx}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      
      console.log(`[Upload] Path: ${fileName}`);
      
      // Use Resumable upload for better reliability
      const uploadTask = uploadBytesResumable(storageRef, dataToUpload);
      
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`[Upload] Progress: ${Math.round(progress)}%`);
          }, 
          (error) => {
            console.error("[Upload] Task Error:", error);
            reject(error);
          }, 
          async () => {
            console.log("[Upload] Success!");
            const url = await getDownloadURL(storageRef);
            setRoughNotes(prev => ({ ...prev, [currentIdx]: url }));
            resolve(url);
          }
        );
      });
    } catch (err: any) {
      console.error("[Upload] Catch Error:", err);
      alert(`Upload failed: ${err.message || "Unknown error"}. Check your internet connection.`);
    } finally {
      setUploadingNote(null);
    }
  };

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const score = answers.reduce((acc, ansIdx, i) => {
        const selectedOption = test.questions[i].options[ansIdx];
        return acc + (selectedOption === test.questions[i].correct_answer ? 1 : 0);
      }, 0);

      const submissionData = {
        testId: test.id,
        userId: user.id || user.uid,
        userName: user.name || user.displayName || 'Student',
        class: user.class,
        subject: test.subject,
        month: test.month,
        year: test.year,
        answers,
        roughNotes,
        score,
        totalQuestions: test.questions.length,
        submittedAt: serverTimestamp(),
      };

      console.log("Debug: Submitting Monthly Test:", submissionData);

      await addDoc(collection(firestore, 'monthly_test_submissions'), submissionData);

      onComplete();
    } catch (err: any) {
      console.error("Submit Test Error:", err);
      alert(`Failed to submit test: ${err.message || "Unknown error"}. Please check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const q = test.questions[currentIdx];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Test Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white p-2 shadow-lg">
              <img src="/utkal-512.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                {test.subject} - {test.month}
              </h2>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Monthly Test Series • 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Progress</p>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-white">{currentIdx + 1} / {test.questions.length}</span>
                <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest border border-white/5"
            >
              Quit
            </button>
          </div>
        </div>

        {/* Question Area */}
        <div className="p-8 md:p-12">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                Question {currentIdx + 1}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {q.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {Array.isArray(q.options) ? (
                q.options.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className={`group flex items-center gap-6 p-6 rounded-[1.5rem] border-2 transition-all text-left relative overflow-hidden ${answers[currentIdx] === idx ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-slate-800/30 border-white/5 hover:border-white/10 hover:bg-slate-800/50'}`}
                  >
                    {answers[currentIdx] === idx && (
                      <motion.div
                        layoutId="active-bg"
                        className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"
                      />
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all ${answers[currentIdx] === idx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'}`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className={`text-lg font-bold transition-colors ${answers[currentIdx] === idx ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {opt}
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-slate-500 text-sm italic p-8 text-center bg-white/5 rounded-3xl">Options unavailable.</div>
              )}
            </div>

            {/* Rough Note Upload Section */}
            <div className="pt-8 border-t border-white/5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Paperclip size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Upload Rough Note</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Optional • Step-by-step working</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {roughNotes[currentIdx] ? (
                    <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="text-emerald-500" size={16} />
                      <span className="text-xs font-bold text-emerald-500">Uploaded</span>
                      <button
                        onClick={() => window.open(roughNotes[currentIdx], '_blank')}
                        className="text-[10px] uppercase font-black text-white/40 hover:text-white underline ml-2"
                      >
                        View
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="cursor-pointer flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        <Camera size={14} />
                        Camera
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNoteUpload} />
                      </label>
                      <label className="cursor-pointer flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        <ImageIcon size={14} />
                        Gallery
                        <input type="file" accept="image/*" className="hidden" onChange={handleNoteUpload} />
                      </label>
                    </div>
                  )}

                  {uploadingNote === currentIdx && (
                    <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Uploading...</span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Navigation */}
        <div className="p-8 bg-black/20 border-t border-white/5 flex items-center justify-between gap-4">
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(prev => prev - 1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white disabled:opacity-0 transition-all font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft size={18} /> Previous
          </button>

          {currentIdx === test.questions.length - 1 ? (
            <button
              disabled={answers[currentIdx] === undefined || submitting}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 disabled:opacity-50 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
            >
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Complete Test'}
            </button>
          ) : (
            <button
              disabled={answers[currentIdx] === undefined}
              onClick={() => setCurrentIdx(prev => prev + 1)}
              className="flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-200 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
            >
              Next Question <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
