import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../translations';
import { ODISHA_DISTRICTS } from '../constants/districts';
import { SEO } from './SEO';
import { db as firestore, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { vibrate, requestScreenWakeLock, releaseScreenWakeLock, playSuccessChime, playClickSound } from '../pwa';
import { CLASS_SUBJECTS } from './DigitalLibraryView';
import { Test, MonthlyTestSubmission } from '../types';

export const DISTRICT_LANDMARKS_WATERMARKS: Record<string, { landmarkEn: string; landmarkOr: string; image: string }> = {
  Angul: {
    landmarkEn: 'Satkosia Gorge',
    landmarkOr: 'ସାତକୋଶିଆ ଗଣ୍ଡ',
    image: '/districts/angul.jpg'
  },
  Balangir: {
    landmarkEn: 'Harishankar Temple',
    landmarkOr: 'ହରିଶଙ୍କର ମନ୍ଦିର',
    image: '/districts/balangir.jpg'
  },
  Balasore: {
    landmarkEn: 'Chandipur Beach',
    landmarkOr: 'ଚାନ୍ଦିପୁର ବେଳାଭୂମି',
    image: '/districts/balasore.jpg'
  },
  Bargarh: {
    landmarkEn: 'Dhanu Jatra',
    landmarkOr: 'ଧନୁଯାତ୍ରା ମଞ୍ଚ',
    image: '/districts/bargarh.jpg'
  },
  Bhadrak: {
    landmarkEn: 'Akhandalamani Temple',
    landmarkOr: 'ଆଖଣ୍ଡଳମଣି ମନ୍ଦିର',
    image: '/districts/bhadrak.jpg'
  },
  Boudh: {
    landmarkEn: 'Buddha Statue',
    landmarkOr: 'ବୌଦ୍ଧ ବୁଦ୍ଧ ମୂର୍ତ୍ତି',
    image: '/districts/boudh.jpg'
  },
  Cuttack: {
    landmarkEn: 'Barabati Fort',
    landmarkOr: 'ବାରବାଟୀ ଦୁର୍ଗ',
    image: '/districts/cuttack.jpg'
  },
  Deogarh: {
    landmarkEn: 'Pradhanpat Falls',
    landmarkOr: 'ପ୍ରଧାନପାଟ ଜଳପ୍ରପାତ',
    image: '/districts/deogarh.jpg'
  },
  Dhenkanal: {
    landmarkEn: 'Kapilash Temple',
    landmarkOr: 'କପିଳାସ ମନ୍ଦିର',
    image: '/districts/dhenkanal.jpg'
  },
  Gajapati: {
    landmarkEn: 'Mahendragiri Hills',
    landmarkOr: 'ମହେନ୍ଦ୍ରଗିରି ପର୍ବତ',
    image: '/districts/gajapati.jpg'
  },
  Ganjam: {
    landmarkEn: 'Tara Tarini Temple',
    landmarkOr: 'ତାରାତାରିଣୀ ମନ୍ଦିର',
    image: '/districts/ganjam.jpg'
  },
  Jagatsinghpur: {
    landmarkEn: 'Paradip Port',
    landmarkOr: 'ପାରାଦୀପ ବନ୍ଦର',
    image: '/districts/jagatsinghpur.jpg'
  },
  Jajpur: {
    landmarkEn: 'Biraja Temple',
    landmarkOr: 'ବିରଜା ମନ୍ଦିର',
    image: '/districts/jajpur.jpg'
  },
  Jharsuguda: {
    landmarkEn: 'Koilighangar Falls',
    landmarkOr: 'କୋଇଲିଘୋଘର ଜଳପ୍ରପାତ',
    image: '/districts/jharsuguda.jpg'
  },
  Kalahandi: {
    landmarkEn: 'Phurlijharan Falls',
    landmarkOr: 'ଫୁର୍ଲିଝରଣ ଜଳପ୍ରପାତ',
    image: '/districts/kalahandi.jpg'
  },
  Kandhamal: {
    landmarkEn: 'Daringbadi Hill Station',
    landmarkOr: 'ଦାରିଙ୍ଗବାଡ଼ି',
    image: '/districts/kandhamal.jpg'
  },
  Kendrapara: {
    landmarkEn: 'Bhitarkanika Mangroves',
    landmarkOr: 'ଭିତରକନିକା ହେନ୍ତାଳବନ',
    image: '/districts/kendrapara.jpg'
  },
  Kendujhar: {
    landmarkEn: 'Sanaghagara Falls',
    landmarkOr: 'ସାନଘାଗରା ଜଳପ୍ରପାତ',
    image: '/districts/kendujhar.jpg'
  },
  Khordha: {
    landmarkEn: 'Dhauli Peace Pagoda',
    landmarkOr: 'ଧଉଳି ଶାନ୍ତି ସ୍ତୂପ',
    image: '/districts/khordha.jpg'
  },
  Koraput: {
    landmarkEn: 'Deomali Peak',
    landmarkOr: 'ଦେଓମାଳି ପର୍ବତ',
    image: '/districts/koraput.jpg'
  },
  Malkangiri: {
    landmarkEn: 'Balimela Reservoir',
    landmarkOr: 'ବାଲିମେଳା ଜଳଭଣ୍ଡାର',
    image: '/districts/malkangiri.jpg'
  },
  Mayurbhanj: {
    landmarkEn: 'Similipal Forests',
    landmarkOr: 'ଶିମିଳିପାଳ ଅରଣ୍ୟ',
    image: '/districts/mayurbhanj.jpg'
  },
  Nabarangpur: {
    landmarkEn: 'Sahid Minar',
    landmarkOr: 'ସହିଦ ମିନାର',
    image: '/districts/nabarangpur.jpg'
  },
  Nayagarh: {
    landmarkEn: 'Tarabalo Hot Springs',
    landmarkOr: 'ତରବାଲୋ ଉଷ୍ଣପ୍ରସ୍ରବଣ',
    image: '/districts/nayagarh.jpg'
  },
  Nuapada: {
    landmarkEn: 'Patora Dam',
    landmarkOr: 'ପାତୋରା ଜଳଭଣ୍ଡାର',
    image: '/districts/nuapada.jpg'
  },
  Puri: {
    landmarkEn: 'Konark Sun Temple',
    landmarkOr: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର',
    image: '/districts/puri.jpg'
  },
  Rayagada: {
    landmarkEn: 'Hanging Bridge',
    landmarkOr: 'ଝୁଲା ପୋଲ',
    image: '/districts/rayagada.jpg'
  },
  Sambalpur: {
    landmarkEn: 'Hirakud Dam',
    landmarkOr: 'ହୀରାକୁଦ ଜଳଭଣ୍ଡାର',
    image: '/districts/sambalpur.jpg'
  },
  Sonepur: {
    landmarkEn: 'Subarnameru Temple',
    landmarkOr: 'ସୁବର୍ଣ୍ଣମେରୁ ମନ୍ଦିର',
    image: '/districts/sonepur.jpg'
  },
  Sundargarh: {
    landmarkEn: 'Mandira Dam',
    landmarkOr: 'ମନ୍ଦିରା ଜଳଭଣ୍ଡାର',
    image: '/districts/sundargarh.jpg'
  }
};

/**
 * Robust subject name translator that scans the local translations
 * and falls back to checking textbook subjects in the Digital Library.
 */
export function getCorrectSubjectName(subject: string, lang: 'en' | 'or'): string {
  const cleanSubject = String(subject || '').trim();
  const lowerSubject = cleanSubject.toLowerCase();

  // 1. Try key translation map first
  if (translations[lang]?.subjects?.[lowerSubject as keyof typeof translations.en.subjects]) {
    return translations[lang].subjects[lowerSubject as keyof typeof translations.en.subjects];
  }
  if (translations[lang]?.subjects?.[cleanSubject as keyof typeof translations.en.subjects]) {
    return translations[lang].subjects[cleanSubject as keyof typeof translations.en.subjects];
  }

  // 2. Scan CLASS_SUBJECTS from the digital library
  for (const classKey of Object.keys(CLASS_SUBJECTS)) {
    const list = CLASS_SUBJECTS[classKey] || [];
    const found = list.find(s =>
      s.key.toLowerCase() === lowerSubject ||
      s.labelEn.toLowerCase() === lowerSubject ||
      s.labelOr === cleanSubject
    );
    if (found) {
      return lang === 'or' ? found.labelOr : found.labelEn;
    }
  }

  return cleanSubject;
}

export function ResultsReviewView({ submission, test, onBack, language }: any) {
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950 overflow-y-auto pt-24 pb-8 px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md py-4 z-10 border-b border-white/5 mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <Lucide.ArrowLeft size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">{language === 'en' ? 'Back' : 'ଫେରିଯାଅ'}</span>
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">{test.month} {test.year} {language === 'en' ? 'Results' : 'ପରୀକ୍ଷା ଫଳାଫଳ'}</h2>
            <p className="text-slate-400 text-xs">{language === 'en' ? 'Transparency Report & Model Answers' : 'ସ୍ୱଚ୍ଛତା ରିପୋର୍ଟ ଏବଂ ନମୁନା ଉତ୍ତର'}</p>
          </div>
          <div className="w-20"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'en' ? 'Final Score' : 'ଚୂଡ଼ାନ୍ତ ମାର୍କ'}</p>
            <p className="text-3xl font-black text-emerald-500">{submission.finalScore || submission.score}/{submission.totalMaxMarks || submission.totalQuestions}</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'en' ? 'Status' : 'ସ୍ଥିତି'}</p>
            <p className="text-xl font-bold text-blue-400">{language === 'en' ? 'Graded & Verified' : 'ଯାଞ୍ଚ ଏବଂ ମୂଲ୍ୟାଙ୍କନ ଶେଷ'}</p>
          </div>
          <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'en' ? 'Violations' : 'ନିୟମ ଉଲ୍ଲଂଘନ'}</p>
            <p className={`text-xl font-bold ${submission.violations > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{submission.violations || 0} {language === 'en' ? 'Flags' : 'ଫ୍ଲାଗ୍'}</p>
          </div>
        </div>

        <div className="space-y-6">
          {test.questions.map((q: any, i: number) => {
            const studentAns = submission?.answers?.[i];
            const isMcq = q.type === 'mcq' || !q.type;
            const studentAnsText = typeof studentAns === 'object' && studentAns !== null ? studentAns.text : studentAns;
            const studentAnsImg = typeof studentAns === 'object' && studentAns !== null ? studentAns.imageUrl : null;
            const isCorrect = q.isGrace || (isMcq 
              ? (q.options && studentAns !== undefined && (q.options[studentAns] === q.correct_answer || String(studentAns) === q.correct_answer))
              : true); 
            
            const awardedMarks = q.isGrace 
              ? (q.marks || 1)
              : (q.type === 'subjective' 
                ? (submission.subjectiveScores?.[i] || 0)
                : (isCorrect ? (q.marks || 1) : 0));

            return (
              <div key={i} className={`bg-slate-900/50 border rounded-3xl p-6 md:p-8 ${isCorrect ? (q.isGrace ? 'border-amber-500/20' : 'border-emerald-500/10') : 'border-red-500/10'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${q.type === 'subjective' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                        {q.type === 'subjective' ? (language === 'en' ? 'Subjective' : 'ସଂକ୍ଷିପ୍ତ ପ୍ରଶ୍ନ') : 'MCQ'} • {q.marks || 1} {language === 'en' ? 'Marks' : 'ମାର୍କ'}
                      </span>
                      {q.isGrace && (
                        <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1">
                          <Lucide.Sparkles size={8} /> {language === 'en' ? 'Grace Mark Awarded' : 'ଗ୍ରେସ୍ ମାର୍କ ପ୍ରଦାନ କରାଗଲା'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{language === 'en' ? 'Marks Obtained' : 'ପ୍ରାପ୍ତ ମାର୍କ'}</p>
                    <p className={`text-xl font-black ${awardedMarks > 0 ? (q.isGrace ? 'text-amber-500' : 'text-emerald-500') : 'text-red-500'}`}>{awardedMarks}/{q.marks || 1}</p>
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-white mb-6 leading-relaxed">{q.question}</h3>

                <div className="grid grid-cols-1 gap-4">
                  {isMcq ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt: string, optIdx: number) => {
                        const isStudentChoice = studentAns === optIdx;
                        const isCorrectOption = opt === q.correct_answer || String(optIdx) === q.correct_answer;
                        
                        let style = "bg-white/5 border-white/5 text-slate-500";
                        if (isCorrectOption) style = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
                        else if (isStudentChoice && !isCorrectOption) style = "bg-red-500/20 border-red-500/50 text-red-400";

                        return (
                          <div key={optIdx} className={`p-4 rounded-xl border flex items-center gap-3 ${style}`}>
                            <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${isCorrectOption ? 'bg-emerald-500 text-white' : isStudentChoice ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                              {String.fromCharCode(65 + optIdx)}
                            </div>
                            <span className="font-medium">{opt}</span>
                            {isCorrectOption && <Lucide.CheckCircle2 size={16} className="ml-auto" />}
                            {isStudentChoice && !isCorrectOption && <Lucide.X size={16} className="ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 min-h-[100px] flex flex-col justify-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{language === 'en' ? 'Your Answer:' : 'ଆପଣଙ୍କ ଉତ୍ତର:'}</p>
                          <p className="text-slate-300 italic text-sm leading-relaxed">{studentAnsText || (language === 'en' ? 'No text answer provided.' : 'କୌଣସି ଉତ୍ତର ଲେଖାଯାଇ ନାହିଁ।')}</p>
                        </div>
                        {studentAnsImg && (
                          <a href={studentAnsImg} target="_blank" rel="noopener noreferrer" className="relative group aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/20 block">
                            <img src={studentAnsImg} alt="Uploaded Answer Sheet" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <span className="text-white text-xs font-bold flex items-center gap-2">
                                <Lucide.ExternalLink size={14} /> {language === 'en' ? 'View Full Image' : 'ପୂର୍ଣ୍ଣ ଫଟୋ ଦେଖନ୍ତୁ'}
                              </span>
                            </div>
                          </a>
                        )}
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">{language === 'en' ? 'Model Answer / Evaluation Criteria:' : 'ଆଦର୍ଶ ଉତ୍ତର / ମୂଲ୍ୟାଙ୍କନ ମାନଦଣ୍ଡ:'}</p>
                        <p className="text-emerald-200 text-sm leading-relaxed whitespace-pre-wrap">{q.correct_answer || (language === 'en' ? 'Check textbook for detailed explanation.' : 'ବିସ୍ତୃତ ସୂଚନା ପାଇଁ ପାଠ୍ୟପୁସ୍ତକ ଦେଖନ୍ତୁ।')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pb-20">
          <button 
            onClick={onBack}
            className="px-12 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl text-white font-bold transition-all flex items-center gap-3 group"
          >
            <Lucide.ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            {language === 'en' ? 'Back to Monthly Tests' : 'ମାସିକ ପରୀକ୍ଷାକୁ ଫେରନ୍ତୁ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CertificateView({ submission, test, user, onBack, language }: any) {
  const certificateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleDownload = async () => {
    window.print();
  };

  const scorePercent = Math.round((submission.finalScore || submission.score) / (submission.totalMaxMarks || submission.totalQuestions) * 100);
  const userDistrict = user.district || 'Khordha';
  const districtObj = ODISHA_DISTRICTS.find(d => d.en.toLowerCase() === userDistrict.toLowerCase());
  const districtNameOr = districtObj ? districtObj.or : userDistrict;
  const watermarkDetail = DISTRICT_LANDMARKS_WATERMARKS[userDistrict] || {
    landmarkEn: 'State of Odisha',
    landmarkOr: 'ସମସ୍ତ ଓଡ଼ିଶା',
    image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&q=80'
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl overflow-y-auto scroll-smooth"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #FCFAF2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: 100% !important;
            overflow: hidden !important;
          }
        }
      `}} />
      <button 
        onClick={onBack}
        className="fixed top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-[110] print:hidden bg-slate-900/85 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-md shadow-lg"
      >
        <Lucide.ArrowLeft size={18} />
        <span className="font-black uppercase tracking-[0.2em] text-xs">{language === 'en' ? 'Back' : 'ଫେରିଯାଅ'}</span>
      </button>
      
      <div className="min-h-full w-full flex flex-col items-center justify-start pt-24 pb-12 px-4 md:px-8 print:p-0 print:pt-0 print:pb-0 print:justify-center">
        <div className="max-w-4xl w-full bg-[#FCFAF2] rounded-2xl shadow-2xl p-3 sm:p-5 relative overflow-hidden print:p-0 print:shadow-none print:m-0 mt-14 sm:mt-0 border border-amber-400/30 print:max-w-full" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} ref={certificateRef}>
        <div className="border-[6px] sm:border-[12px] border-emerald-700 border-double p-4 sm:p-12 print:p-4 sm:print:p-6 text-center relative">
          {/* Corner Ornaments */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-500/60"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-500/60"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-500/60"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-500/60"></div>

          <img 
            src={watermarkDetail.image} 
            alt="Watermark" 
            className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none grayscale select-none" 
          />

          <div className="relative z-10 space-y-4 sm:space-y-8 print:space-y-3">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-24 sm:h-24 print:w-16 print:h-16 mb-2 sm:mb-6 print:mb-2 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl"></div>
                <img src="/utkal-512.png" alt="Utkal Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <h1 className="text-xl sm:text-4xl print:text-2xl font-serif font-black text-slate-900 tracking-tight uppercase">
                ଉତ୍କର୍ଷତା ପ୍ରମାଣପତ୍ର
              </h1>
              <div className="w-24 sm:w-48 print:w-32 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-2 sm:mt-4 print:mt-2"></div>
              <p className="text-[7px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1 sm:mt-2 print:mt-1">
                ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ଶୈକ୍ଷଣିକ ସଫଳତା
              </p>
            </div>

            <div className="space-y-2 sm:space-y-4 print:space-y-2 pt-2 sm:pt-4 print:pt-2">
              <p className="text-slate-500 font-serif italic text-xs sm:text-lg print:text-sm">
                ଏତଦ୍ୱାରା ପ୍ରମାଣିତ କରାଯାଉଛି ଯେ,
              </p>
              <h2 className="text-xl sm:text-5xl print:text-3xl font-serif font-bold text-slate-900 border-b border-amber-200 pb-1 sm:pb-2 print:pb-1 px-4 sm:px-8 inline-block">{submission.userName}</h2>
              <p className="text-slate-500 text-[10px] sm:text-base print:text-xs font-medium">
                ମାସିକ ପରୀକ୍ଷାରେ ଉଲ୍ଲେଖନୀୟ ପ୍ରଦର୍ଶନ କରିଥିବାରୁ ଏହି ପ୍ରମାଣପତ୍ର ପ୍ରଦାନ କରାଗଲା।
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2 print:space-y-1 py-2 sm:py-4 print:py-2">
              <h3 className="text-sm sm:text-2xl print:text-lg font-bold text-emerald-800 uppercase tracking-[0.05em] sm:tracking-[0.1em]">
                {test.month} {test.year} ମାସିକ ମୂଲ୍ୟାଙ୍କନ
              </h3>
              <div className="flex items-center justify-center gap-1.5 sm:gap-3 text-slate-500 text-[10px] sm:text-sm print:text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>ବିଷୟ: <span className="font-bold text-slate-800">{getCorrectSubjectName(test.subject, 'or')}</span></span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>ଶ୍ରେଣୀ: <span className="font-bold text-slate-800">{translations['or'].classes?.[submission.class as keyof typeof translations.or.classes] || submission.class}</span></span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>ଜିଲ୍ଲା: <span className="font-bold text-slate-800">{districtNameOr}</span></span>
              </div>
            </div>

            <div className="flex justify-center items-center gap-4 sm:gap-12 py-3 sm:py-6 print:py-2 relative max-w-2xl mx-auto">
              <div className="bg-amber-50/30 border border-amber-200/50 rounded-2xl py-3 px-4 sm:px-6 print:py-1.5 print:px-3 text-center flex-1">
                <p className="text-xl sm:text-3xl print:text-xl font-black text-slate-900 leading-none">{scorePercent}%</p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-1.5">
                  ମୋଟ୍ ସ୍କୋର୍
                </p>
              </div>
              <div className="text-center bg-amber-50/30 border border-amber-200/50 rounded-2xl py-3 px-4 sm:px-6 print:py-1.5 print:px-3 flex-1">
                <p className="text-xl sm:text-3xl print:text-xl font-black text-slate-900 leading-none">#{submission.rank || 'N/A'}</p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-1.5">
                  ରାଜ୍ୟ ରାଙ୍କ
                </p>
              </div>
              <div className="text-center bg-amber-50/30 border border-amber-200/50 rounded-2xl py-3 px-4 sm:px-6 print:py-1.5 print:px-3 flex-1">
                <p className="text-xl sm:text-3xl print:text-xl font-black text-slate-900 leading-none">#{submission.districtRank || 'N/A'}</p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-amber-700 uppercase tracking-wider mt-1.5">
                  ଜିଲ୍ଲା ରାଙ୍କ
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end mt-6 sm:mt-12 print:mt-4 px-2 sm:px-12 print:px-6 pt-4 sm:pt-8 print:pt-2">
              <div className="text-center relative flex flex-col items-center">
                <img src="/gundulu-pointing-nobg.png" className="w-12 h-12 print:w-10 print:h-10 object-contain absolute -top-8 print:-top-6 opacity-75 print:opacity-100" alt="Gundulu Signature Pin" />
                <div className="w-16 sm:w-32 border-b border-slate-900 mb-1 sm:mb-2 mx-auto mt-4 print:mt-3" />
                <p className="font-serif font-bold text-slate-900 text-[10px] sm:text-sm print:text-xs">Gundulu</p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                  AI ଶିକ୍ଷା ପରାମର୍ଶଦାତା
                </p>
              </div>
              <div className="relative">
                <div className="w-14 h-14 sm:w-24 sm:h-24 print:w-14 print:h-14 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-amber-500/20">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 print:w-10 print:h-10 bg-transparent rounded-full flex items-center justify-center border border-white/30">
                    <Lucide.Award className="w-6 h-6 sm:w-10 sm:h-10 print:w-6 print:h-6 text-white" />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[4px] sm:text-[6px] font-black text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] rotate-12">Verified Utkal Cert</p>
                </div>
              </div>
              <div className="text-center">
                <p className="font-serif italic font-bold text-emerald-700 text-xs sm:text-lg print:text-xs mb-1 relative z-10 print:text-slate-900">Tiki Apa</p>
                <div className="w-16 sm:w-32 border-b border-slate-900 mb-1 sm:mb-2 mx-auto" />
                <p className="font-serif font-bold text-slate-900 text-[10px] sm:text-sm print:text-xs">
                  ଟିକି ଅପା (ପ୍ରଧାନ ଶିକ୍ଷୟିତ୍ରୀ)
                </p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                  ନିର୍ଦ୍ଦେଶକ, ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର
                </p>
              </div>
            </div>
            
            <p className="text-[8px] sm:text-[11px] text-emerald-800/70 font-serif italic mt-3 sm:mt-6 print:mt-3">
              ପୃଷ୍ଠଭୂମି ଐତିହ୍ୟ: {watermarkDetail.landmarkOr} ({districtNameOr})
            </p>
            <p className="text-[7px] sm:text-[9px] text-slate-300 font-mono mt-2 sm:mt-4 print:mt-2 italic">
              ଯାଞ୍ଚ ID: {submission.id?.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-12 flex gap-4 print:hidden flex-wrap sm:flex-nowrap justify-center">
        <button 
          onClick={handleDownload}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-emerald-500/20 text-sm"
        >
          <Lucide.Download size={18} /> {language === 'en' ? 'Print/Save as PDF' : 'ପ୍ରିଣ୍ଟ କରନ୍ତୁ / PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ'}
        </button>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm"
        >
          {language === 'en' ? 'Close' : 'ବନ୍ଦ କରନ୍ତୁ'}
        </button>
      </div>
      <p className="text-slate-500 text-[10px] sm:text-xs mt-4 print:hidden text-center pb-8">
        {language === 'en' 
          ? 'Tip: For best result, set Layout to "Landscape" and "Remove Margins" in print settings.' 
          : 'ଟିପ୍: ସର୍ବୋତ୍ତମ ଫଳାଫଳ ପାଇଁ, ପ୍ରିଣ୍ଟ୍ ସେଟିଂସରେ ଲେଆଉଟ୍ କୁ "Landscape" ଏବଂ "Margins" କୁ Remove କରନ୍ତୁ।'}
      </p>
      </div>
    </div>
  );
}

export function ConsolidatedCertificateView({ monthYear, submissions, tests, user, language, onBack }: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const overallScore = submissions.reduce((acc: number, s: any) => acc + (s.finalScore ?? s.score ?? 0), 0);
  const overallMax = submissions.reduce((acc: number, s: any) => acc + (s.totalMaxMarks ?? s.totalQuestions ?? 0), 0);
  const overallPercent = overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;
  
  const userDistrict = user.district || 'Khordha';
  const districtObj = ODISHA_DISTRICTS.find(d => d.en.toLowerCase() === userDistrict.toLowerCase());
  const districtNameOr = districtObj ? districtObj.or : userDistrict;
  const watermarkDetail = DISTRICT_LANDMARKS_WATERMARKS[userDistrict] || {
    landmarkEn: 'State of Odisha',
    landmarkOr: 'ସମସ୍ତ ଓଡ଼ିଶା',
    image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=800&q=80'
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl overflow-y-auto scroll-smooth"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #FCFAF2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            height: 100% !important;
            overflow: hidden !important;
          }
        }
      `}} />
      <button 
        onClick={onBack}
        className="fixed top-4 left-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-[110] print:hidden bg-slate-900/85 px-4 py-2.5 rounded-xl border border-white/5 backdrop-blur-md shadow-lg"
      >
        <Lucide.ArrowLeft size={18} />
        <span className="font-black uppercase tracking-[0.2em] text-xs">{language === 'en' ? 'Back' : 'ଫେରିଯାଅ'}</span>
      </button>

      <div className="min-h-full w-full flex flex-col items-center justify-start pt-24 pb-12 px-4 md:px-8 print:p-0 print:pt-0 print:pb-0 print:justify-center">

      <div className="max-w-4xl w-full bg-[#FCFAF2] rounded-2xl shadow-2xl p-3 sm:p-5 relative overflow-hidden print:p-0 print:shadow-none print:m-0 mt-14 sm:mt-0 border border-amber-400/30 print:max-w-full" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div className="border-[6px] sm:border-[12px] border-emerald-700 border-double p-4 sm:p-12 print:p-4 sm:print:p-6 text-center relative">
          {/* Corner Ornaments */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-500/60"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-500/60"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-500/60"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-500/60"></div>

          <img 
            src={watermarkDetail.image} 
            alt="Watermark" 
            className="absolute inset-0 w-full h-full object-cover opacity-[0.15] pointer-events-none grayscale select-none" 
          />

          <div className="relative z-10 space-y-6 sm:space-y-8 print:space-y-3">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 sm:w-24 sm:h-24 print:w-16 print:h-16 mb-2 sm:mb-4 print:mb-2 relative">
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl"></div>
                <img src="/utkal-512.png" alt="Utkal Logo" className="w-full h-full object-contain relative z-10" />
              </div>
              <h1 className="text-xl sm:text-4xl print:text-2xl font-serif font-black text-slate-900 tracking-tight uppercase">
                ମିଳିତ ଉତ୍କର୍ଷତା ପ୍ରମାଣପତ୍ର
              </h1>
              <div className="w-32 sm:w-64 print:w-40 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-2 sm:mt-3 print:mt-2"></div>
              <p className="text-[7px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1">
                ମାସିକ ପରୀକ୍ଷା ସିରିଜ୍ ପ୍ରଦର୍ଶନ ରିପୋର୍ଟ
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2 print:space-y-1">
              <p className="text-slate-500 font-serif italic text-xs sm:text-md print:text-sm">
                ଏହି ଶୈକ୍ଷଣିକ ପ୍ରମାଣପତ୍ର ପ୍ରଦାନ କରାଯାଉଛି
              </p>
              <h2 className="text-xl sm:text-4xl print:text-2xl font-serif font-bold text-slate-900 border-b border-amber-200 pb-1 px-4 sm:px-8 inline-block">{user.displayName || user.name || 'Student'}</h2>
              <p className="text-slate-500 text-[10px] sm:text-sm print:text-xs font-medium">
                ସମସ୍ତ ବିଷୟରେ ଅସାଧାରଣ ପ୍ରଦର୍ଶନ ଏବଂ ପାରଦର୍ଶିତା ପାଇଁ
              </p>
              <h3 className="text-sm sm:text-xl print:text-lg font-bold text-emerald-800 uppercase tracking-widest">
                {monthYear} ମାସିକ ପରୀକ୍ଷା ଶୃଙ୍ଖଳା
              </h3>
            </div>

            <div className="border border-amber-200/60 rounded-xl overflow-hidden max-w-2xl mx-auto bg-white/60 backdrop-blur-sm shadow-sm print:my-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-amber-50/50 text-amber-950 text-[9px] sm:text-xs print:text-[10px] font-bold uppercase border-b border-amber-200/60">
                    <th className="px-4 py-2 sm:py-3 print:py-1.5 print:px-3 text-emerald-900">ବିଷୟ</th>
                    <th className="px-4 py-2 sm:py-3 print:py-1.5 print:px-3 text-center text-emerald-900">ମାର୍କ</th>
                    <th className="px-4 py-2 sm:py-3 print:py-1.5 print:px-3 text-right text-emerald-900">ସଠିକତା</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 text-slate-800 text-[10px] sm:text-sm print:text-[11px] font-medium">
                  {submissions.map((sub: any, idx: number) => {
                    const testItem = tests.find((t: any) => t.id === sub.testId);
                    const subjectLabel = getCorrectSubjectName(testItem?.subject || 'Unknown', 'or');
                    const score = sub.finalScore ?? sub.score ?? 0;
                    const max = sub.totalMaxMarks ?? sub.totalQuestions ?? 0;
                    const percent = max > 0 ? Math.round((score / max) * 100) : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-100/50">
                        <td className="px-4 py-2 print:py-1 print:px-3">{subjectLabel}</td>
                        <td className="px-4 py-2 print:py-1 print:px-3 text-center font-mono font-bold">{score} / {max}</td>
                        <td className="px-4 py-2 print:py-1 print:px-3 text-right font-mono font-bold text-emerald-700">{percent}%</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-emerald-50/30 text-emerald-950 font-bold border-t border-amber-200/60">
                    <td className="px-4 py-3 print:py-1.5 print:px-3 text-emerald-900">ସାମଗ୍ରିକ ସଞ୍ଚୟୀ ଫଳାଫଳ</td>
                    <td className="px-4 py-3 print:py-1.5 print:px-3 text-center font-mono">{overallScore} / {overallMax}</td>
                    <td className="px-4 py-3 print:py-1.5 print:px-3 text-right font-mono text-emerald-600">{overallPercent}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-center items-center gap-4 sm:gap-12 py-1 print:py-0.5 max-w-md mx-auto">
              <div className="bg-amber-50/30 border border-amber-200/50 rounded-2xl px-4 py-2.5 print:py-1.5 print:px-3 text-center flex-1">
                <p className="text-lg sm:text-2xl print:text-lg font-black text-slate-800 font-mono">
                  #{submissions[0]?.rank || 'N/A'}
                </p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold uppercase text-amber-700 tracking-wider mt-1">
                  ରାଜ୍ୟ ରାଙ୍କ
                </p>
              </div>
              <div className="bg-amber-50/30 border border-amber-200/50 rounded-2xl px-4 py-2.5 print:py-1.5 print:px-3 text-center flex-1">
                <p className="text-lg sm:text-2xl print:text-lg font-black text-slate-800 font-mono">
                  #{submissions.find((s: any) => s.districtRank)?.districtRank || 'N/A'}
                </p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold uppercase text-amber-700 tracking-wider mt-1">
                  ଜିଲ୍ଲା ରାଙ୍କ
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4 sm:mt-8 print:mt-3 px-2 sm:px-12 print:px-6 pt-2 sm:pt-4 print:pt-1">
              <div className="text-center relative flex flex-col items-center">
                <img src="/gundulu-pointing-nobg.png" className="w-12 h-12 print:w-10 print:h-10 object-contain absolute -top-8 print:-top-6 opacity-75 print:opacity-100" alt="Gundulu" />
                <div className="w-16 sm:w-32 border-b border-slate-900 mb-1 sm:mb-2 mx-auto mt-4 print:mt-3" />
                <p className="font-serif font-bold text-slate-900 text-[10px] sm:text-sm print:text-xs">Gundulu</p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                  AI ଶିକ୍ଷା ପରାମର୍ଶଦାତା
                </p>
              </div>
              <div className="relative hidden sm:block print:block">
                <div className="w-16 h-16 print:w-12 print:h-12 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-amber-500/20">
                  <div className="w-12 h-12 print:w-8 print:h-8 bg-transparent rounded-full flex items-center justify-center border border-white/20">
                    <Lucide.Award className="w-6 h-6 print:w-4 print:h-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="font-serif italic font-bold text-emerald-700 text-xs sm:text-lg print:text-xs mb-1 relative z-10 print:text-slate-900">Tiki Apa</p>
                <div className="w-16 sm:w-32 border-b border-slate-900 mb-1 sm:mb-2 mx-auto" />
                <p className="font-serif font-bold text-slate-900 text-[10px] sm:text-sm print:text-xs">
                  ଟିକି ଅପา (ପ୍ରଧାନ ଶିକ୍ଷୟିତ୍ରୀ)
                </p>
                <p className="text-[7px] sm:text-[9px] print:text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                  ନิର୍ଦ୍ଦେଶକ, ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର
                </p>
              </div>
            </div>
            
            <p className="text-[8px] sm:text-[11px] text-emerald-800/70 font-serif italic mt-3 sm:mt-6 print:mt-3">
              ପୃଷ୍ଠଭୂମି ଐତିହ୍ୟ: {watermarkDetail.landmarkOr} ({districtNameOr})
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-12 flex gap-4 print:hidden justify-center">
        <button 
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-emerald-500/20 text-sm border-none cursor-pointer"
        >
          <Lucide.Download size={18} /> {language === 'en' ? 'Print/Save as PDF' : 'ପ୍ରିଣ୍ଟ କରନ୍ତୁ / PDF ଡାଉନଲୋଡ୍ କରନ୍ତୁ'}
        </button>
        <button 
          onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm border-none cursor-pointer"
        >
          {language === 'en' ? 'Close' : 'ବନ୍ଦ କରନ୍ତୁ'}
        </button>
      </div>
      </div>
    </div>
  );
}

export function SelectionPaperPrintView({ test, language, onBack }: any) {
  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => {
      window.print();
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const totalMaxMarks = test.questions?.reduce((acc: number, q: any) => acc + (q.marks || 1), 0) || 0;

  const durationText = (() => {
    const classNumStr = String(test.class || '').toLowerCase();
    if (classNumStr.includes('sishuvatika') || classNumStr.includes('anganwadi') || classNumStr.includes('primary')) {
      return language === 'or' ? '୩୦ ମିନିଟ୍' : '30 Minutes';
    }
    const classNum = parseInt(classNumStr.replace(/\D/g, '')) || 10;
    if (classNum <= 5) {
      return language === 'or' ? '୩୦ ମିନିଟ୍' : '30 Minutes';
    }
    if (classNum <= 8) {
      return language === 'or' ? '୪୫ ମିନିଟ୍' : '45 Minutes';
    }
    return language === 'or' ? '୬୦ ମିନିଟ୍' : '60 Minutes';
  })();

  const handleShare = async () => {
    const subjectName = getCorrectSubjectName(test.subject, language);
    const classLabel = translations[language].classes?.[test.class as keyof typeof translations.en.classes] || `Class ${test.class}`;
    
    const text = language === 'or'
      ? `ଆରେ ସାଙ୍ଗ! ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ${classLabel} ର ${subjectName} ମାସିକ ସିଲେକ୍ସନ ପ୍ରଶ୍ନପତ୍ର ଦେଖ। ତୁମେ ମଧ୍ୟ ପରୀକ୍ଷା ଦେଇ ପ୍ରମାଣପତ୍ର ପାଅ: https://utkalskillcentre.com/`
      : `Hey friend! Check out the ${classLabel} ${subjectName} monthly selection question paper on Utkal Skill Centre. Attempt the test to get your certificate: https://utkalskillcentre.com/`;
      
    if (navigator.share) {
      try {
        await navigator.share({
          title: language === 'or' ? `${subjectName} ସିଲେକ୍ସନ ପ୍ରଶ୍ନପତ୍ର` : `${subjectName} Selection Paper`,
          text: text,
          url: 'https://utkalskillcentre.com/'
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-white overflow-y-auto p-4 sm:p-12 print:p-0 text-slate-900">
      <button 
        onClick={onBack}
        className="fixed top-4 left-4 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-800 shadow-lg print:hidden z-50 cursor-pointer"
      >
        <Lucide.ArrowLeft size={16} />
        <span className="font-bold text-xs uppercase tracking-widest">
          {language === 'en' ? 'Back to Tests' : 'ପରୀକ୍ଷାକୁ ଫେରନ୍ତୁ'}
        </span>
      </button>

      <button 
        onClick={handleShare}
        className="fixed top-4 right-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl border border-emerald-500 shadow-lg print:hidden z-50 cursor-pointer"
      >
        <Lucide.Share2 size={16} />
        <span className="font-bold text-xs uppercase tracking-widest">
          {language === 'en' ? 'Share with Friend' : 'ସାଙ୍ଗମାନଙ୍କ ସହ ସେୟାର'}
        </span>
      </button>

      <div className="border-4 border-double border-slate-950 p-6 sm:p-10 min-h-screen relative flex flex-col justify-between print:border-2">
        <div>
          <div className="text-center space-y-2 pb-6 border-b border-slate-950">
            <div className="flex justify-center items-center gap-4">
              <img src="/gundulu-rath-crest.png" className="w-14 h-14 object-contain" alt="Crest" />
              <div>
                <h1 className="text-lg sm:text-2xl font-black tracking-tight font-serif uppercase">ଓଡ଼ିଶା ମାଧ୍ୟମିକ Śିକ୍ଷା ପରିଷଦ (BSE)</h1>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-600">Board of Secondary Education, Odisha</p>
              </div>
            </div>
            <div className="pt-2">
              <span className="px-4 py-1 border border-slate-950 font-black text-xs sm:text-sm uppercase tracking-widest">
                {language === 'en' ? 'Selection Question Paper - 2026' : 'ସିଲେକ୍ସନ ପ୍ରଶ୍ନପତ୍ର - ୨୦୨୬'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-xs font-bold border-b border-slate-950 mb-6 bg-slate-50/50 p-3 rounded-lg">
            <div>
              <p className="text-slate-500 uppercase text-[9px]">{language === 'en' ? 'Subject' : 'ବିଷୟ'} (ବିଷୟ)</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{getCorrectSubjectName(test.subject, language)}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase text-[9px]">{language === 'en' ? 'Class' : 'ଶ୍ରେଣୀ'} (ଶ୍ରେଣୀ)</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{translations[language].classes?.[test.class as keyof typeof translations.en.classes] || test.class}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase text-[9px]">{language === 'en' ? 'Full Marks' : 'ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା'} (ପୂର୍ଣ୍ଣ ସଂଖ୍ୟା)</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{totalMaxMarks} {language === 'en' ? 'Marks' : 'ମାର୍କ'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase text-[9px]">{language === 'en' ? 'Duration' : 'ସମୟ'} (ସମୟ)</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{durationText}</p>
            </div>
          </div>

          <div className="border border-slate-300 p-4 rounded-xl mb-8 text-xs space-y-1.5 leading-relaxed bg-slate-50/20">
            <p className="font-black uppercase text-slate-700 tracking-wider">Instructions (ନିର୍ଦ୍ଦେଶାବଳୀ):</p>
            <p className="font-medium text-slate-800">୧. ସମସ୍ତ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେବା ବାଧ୍ୟତାମୂଳକ ଅଟେ । (All questions are compulsory)</p>
            <p className="font-medium text-slate-800">୨. ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ମୂଲ୍ୟ ଡାହାଣ ପାର୍ଶ୍ୱରେ ଦର୍ଶାଯାଇଛି । (Value of each question is shown on the right)</p>
            <p className="font-medium text-slate-800">୩. MCQ ପ୍ରଶ୍ନଗୁଡ଼ିକ ପାଇଁ ସଠିକ ବିକଳ୍ପ ବାଛନ୍ତୁ । (Select correct options for MCQs)</p>
          </div>

          <div className="space-y-8 pb-12">
            {test.questions.map((qItem: any, idx: number) => {
              const isMcq = qItem.type === 'mcq' || !qItem.type;
              return (
                <div key={idx} className="space-y-3 avoid-page-break">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-sm sm:text-base font-bold text-slate-950 leading-relaxed flex gap-2">
                      <span className="font-mono">{idx + 1}.</span>
                      <span>{qItem.question}</span>
                    </h3>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 font-mono whitespace-nowrap shrink-0 border border-slate-300 px-2 py-0.5 rounded">
                      [{qItem.marks || 1} M]
                    </span>
                  </div>

                  {isMcq ? (
                    <div className="grid grid-cols-2 gap-4 pl-6 text-xs sm:text-sm font-medium text-slate-800">
                      {qItem.options.map((opt: string, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded border border-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-6 space-y-2">
                      <div className="h-20 border border-dashed border-slate-300 rounded-lg bg-slate-50/10 flex items-center justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {language === 'en' ? 'Rough work / calculation space' : 'ରଫ୍ କାର୍ଯ୍ୟ କିମ୍ବା ଗଣନା ପାଇଁ ସ୍ଥାନ'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-slate-900 pt-8 mt-12">
          <div className="text-center relative flex flex-col items-center">
            <img src="/gundulu-pointing-nobg.png" className="w-10 h-10 object-contain absolute -top-6 opacity-80" alt="Gundulu Pin" />
            <div className="w-24 border-b border-slate-900 mb-1 mx-auto mt-4" />
            <p className="font-serif font-black text-slate-950 text-xs">Gundulu</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">AI Learning Advisor</p>
          </div>
          <div className="text-center hidden sm:block">
            <div className="w-12 h-12 rounded-full border border-slate-950 flex items-center justify-center text-[8px] font-black uppercase rotate-12 text-slate-600">
              {language === 'en' ? 'BSE SEAL' : 'BSE ସିଲ୍'}
            </div>
          </div>
          <div className="text-center">
            <p className="font-serif italic font-bold text-slate-900 text-xs mb-1">Tiki Apa</p>
            <div className="w-24 border-b border-slate-900 mb-1 mx-auto" />
            <p className="font-serif font-black text-slate-950 text-xs">
              {language === 'en' ? 'Tiki Apa (Master Head)' : 'ଟିକି ଅପା (ପ୍ରଧାନ ଶିକ୍ଷୟିତ୍ରୀ)'}
            </p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
              {language === 'en' ? 'Director, Utkal Skill Centre' : 'ନିର୍ଦ୍ଦେଶକ, ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthlyTestsView({ tests, submissions, language, user, onBack, setActiveTab, loadTestSubmissions, chapters }: any) {
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [takingTest, setTakingTest] = useState(false);
  const [viewingCertificate, setViewingCertificate] = useState<any>(null);
  const [reviewingResults, setReviewingResults] = useState<any>(null);
  
  const [activeMonthFilter, setActiveMonthFilter] = useState<string>('');
  const [viewingConsolidatedCert, setViewingConsolidatedCert] = useState<any>(null);
  const [printingSelectionPaper, setPrintingSelectionPaper] = useState<any>(null);

  const getSubmission = (testItem: any) => {
    return submissions.find((s: any) => s.testId === testItem.id);
  };

  const getSubjectTheme = (subject: string) => {
    const s = String(subject || '').toLowerCase().trim();
    if (s.includes('math') || s.includes('algebra') || s.includes('geometry')) {
      return {
        gradient: 'from-cyan-500/10 via-blue-500/5 to-indigo-500/10',
        borderHover: 'hover:border-cyan-500/30',
        glow: 'bg-cyan-500/5',
        iconBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
        iconShadow: 'shadow-cyan-500/20',
        textColor: 'text-cyan-400',
        badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
        icon: Lucide.Calculator
      };
    }
    if (
      s.includes('science') || 
      s.includes('physics') || 
      s.includes('chemistry') || 
      s.includes('biology') ||
      s.includes('evs')
    ) {
      return {
        gradient: 'from-emerald-500/10 via-teal-500/5 to-emerald-950/10',
        borderHover: 'hover:border-emerald-500/30',
        glow: 'bg-emerald-500/5',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        iconShadow: 'shadow-emerald-500/20',
        textColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        icon: Lucide.Atom
      };
    }
    if (
      s.includes('social') || 
      s.includes('history') || 
      s.includes('geography') ||
      s.includes('civics')
    ) {
      return {
        gradient: 'from-amber-500/10 via-orange-500/5 to-amber-950/10',
        borderHover: 'hover:border-amber-500/30',
        glow: 'bg-amber-500/5',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
        iconShadow: 'shadow-amber-500/20',
        textColor: 'text-amber-400',
        badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        icon: Lucide.Globe
      };
    }
    return {
      gradient: 'from-purple-500/10 via-fuchsia-500/5 to-pink-500/10',
      borderHover: 'hover:border-purple-500/30',
      glow: 'bg-purple-500/5',
      iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
      iconShadow: 'shadow-purple-500/20',
      textColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      icon: Lucide.Languages
    };
  };

  useEffect(() => {
    if (selectedTest) {
      const updatedSelected = tests.find((t: Test) => t.id === selectedTest.id || (t.translationGroupId && t.translationGroupId === selectedTest.translationGroupId));
      if (updatedSelected) {
        setSelectedTest(updatedSelected);
      } else {
        setSelectedTest(null);
        setTakingTest(false);
      }
    }
  }, [tests]);

  if (takingTest && selectedTest) {
    return (
      <MonthlyTestEngine 
        test={selectedTest} 
        onComplete={() => {
          setTakingTest(false);
          setSelectedTest(null);
          loadTestSubmissions();
        }} 
        onBack={() => setTakingTest(false)}
        language={language} 
        user={user}
      />
    );
  }

  if (viewingCertificate) {
    return (
      <CertificateView 
        submission={viewingCertificate.submission}
        test={viewingCertificate.test}
        user={user}
        language={language}
        onBack={() => setViewingCertificate(null)}
      />
    );
  }

  if (viewingConsolidatedCert) {
    return (
      <ConsolidatedCertificateView
        monthYear={viewingConsolidatedCert.monthYear}
        submissions={viewingConsolidatedCert.submissions}
        tests={viewingConsolidatedCert.tests}
        user={user}
        language={language}
        onBack={() => setViewingConsolidatedCert(null)}
      />
    );
  }

  if (printingSelectionPaper) {
    return (
      <SelectionPaperPrintView
        test={printingSelectionPaper.test}
        language={language}
        onBack={() => setPrintingSelectionPaper(null)}
      />
    );
  }

  if (reviewingResults) {
    return (
      <ResultsReviewView 
        submission={reviewingResults.submission}
        test={reviewingResults.test}
        language={language}
        onBack={() => setReviewingResults(null)}
      />
    );
  }

  const filteredTests = tests.filter((t: any) => {
    if (user?.class) {
      const testClass = String(t.class || '').toLowerCase().trim();
      const userClass = String(user.class || '').toLowerCase().trim();
      if (!(testClass === userClass || testClass === userClass.replace('class', ''))) return false;
    }
    if (user?.role === 'admin') return true;
    if (t.scheduledDate) {
      const today = new Date().toISOString().split('T')[0];
      return t.scheduledDate <= today;
    }
    return true;
  });

  const availableMonths = (() => {
    const months = new Set<string>();
    filteredTests.forEach((t: any) => {
      if (t.month && t.year) {
        months.add(`${t.month} ${t.year}`);
      }
    });
    const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split(' ');
      const [mB, yB] = b.split(' ');
      const yDiff = parseInt(yB) - parseInt(yA);
      if (yDiff !== 0) return yDiff;
      return monthOrder.indexOf(mB) - monthOrder.indexOf(mA);
    });
  })();

  const currentMonthFilter = activeMonthFilter || (availableMonths.length > 0 ? availableMonths[0] : '');
  
  const publishDay = (() => {
    if (!currentMonthFilter) return 12;
    const [mStr, yStr] = currentMonthFilter.split(' ');
    const y = parseInt(yStr);
    const mIdx = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(mStr);
    if (y && mIdx !== -1) {
      // Check if there is a Sunday between the 5th and 10th of the month
      let hasSunday = false;
      for (let d = 5; d <= 10; d++) {
        const dateToCheck = new Date(y, mIdx, d);
        if (dateToCheck.getDay() === 0) {
          hasSunday = true;
          break;
        }
      }

      let examStart = 5;
      if (new Date(y, mIdx, 5).getDay() === 0) {
        examStart = 6;
      }

      let examEnd = examStart;
      let activeDays = 0;
      while (activeDays < 6) {
        const currDate = new Date(y, mIdx, examEnd);
        if (currDate.getDay() !== 0) {
          activeDays++;
        }
        if (activeDays < 6) {
          examEnd++;
        }
      }

      const gradStart = examEnd + 1;
      let pubStart = gradStart + 1;
      if (new Date(y, mIdx, pubStart).getDay() === 0) {
        pubStart += 1;
      }
      return pubStart;
    }
    return 12;
  })();

  const testsForSelectedMonth = filteredTests.filter((t: any) => `${t.month} ${t.year}` === currentMonthFilter);

  const selectedMonthReport = (() => {
    const data = { submissions: [] as any[], tests: [] as any[], totalScore: 0, totalMax: 0 };
    testsForSelectedMonth.forEach((test: any) => {
      const sub = getSubmission(test);
      if (sub) {
        data.submissions.push(sub);
        data.tests.push(test);
        data.totalScore += (sub.finalScore ?? sub.score ?? 0);
        data.totalMax += (sub.totalMaxMarks ?? sub.totalQuestions ?? 0);
      }
    });
    return data;
  })();

  const isMonthResultsPublished = testsForSelectedMonth.length > 0 && testsForSelectedMonth.every((test: any) => test.results_published);

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

  const testFaqs = [
    {
      question: "What is the pattern of the Monthly Test Series 2026?",
      answer: "The Utkal Skill Centre Monthly Test Series follows the latest Odisha Board (BSE/CHSE) pattern with a mix of MCQ and subjective questions to ensure complete board exam readiness."
    },
    {
      question: "How can I download the Class 10 Selection Question PDF?",
      answer: "Students can participate in the online test series and download their performance report and selection questions directly from the student dashboard."
    },
    {
      question: "Is this test series based on the latest Odisha Board syllabus?",
      answer: "Yes, all tests are strictly based on the reduced syllabus and latest question pattern issued by the Odisha Board for the 2026 academic year."
    }
  ];

  const userClassLabel = user?.class 
    ? (translations[language]?.classes?.[user.class as keyof typeof translations.en.classes] || `Class ${user.class}`) 
    : 'Class 10';

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-12 text-left"
    >
      <SEO 
        title={`${userClassLabel} Monthly Test Series 2026 | Latest Odisha Board Selection Questions`}
        description={`Participate in the latest Odisha Board pattern monthly test series for ${userClassLabel}. Get selection questions, MCQ practice, and instant certificates.`}
        schemaType="FAQPage"
        faqs={testFaqs}
      />
      <motion.button 
        variants={itemVariants}
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-2 md:mb-4 transition-colors cursor-pointer bg-transparent border-none"
      >
        <Lucide.ArrowLeft size={18} />
        <span className="text-xs md:text-sm">{translations[language].backToDashboard || 'Back to Dashboard'}</span>
      </motion.button>

      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-6 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-3 sm:p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] -mr-32 -mt-32 rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-center gap-3 text-left">
          <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg sm:rounded-3xl bg-white p-1.5 sm:p-3 shadow-xl shrink-0">
            <img src="/utkal-512.png" alt="Utkal Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-2xl md:text-4xl font-black text-white tracking-tight">
                {translations[language].monthlyTests}
              </h1>
              <span className="inline-flex sm:hidden items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[8px] font-black text-emerald-400 uppercase tracking-wider">
                <Lucide.Shield size={8} />
                {language === 'en' ? 'Board Pattern 2026' : 'ବୋର୍ଡ ପ୍ୟାଟର୍ନ ୨୦୨୬'}
              </span>
            </div>
            <p className="text-slate-400 max-w-md text-[10px] sm:text-xs md:text-sm mt-0.5 sm:mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {language === 'en' 
                ? `Participate in premium assessments for ${translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} designed by expert educators.`
                : `ଅଭିଜ୍ଞ ଶିକ୍ଷକଙ୍କ ଦ୍ୱାରା ପ୍ରସ୍ତୁତ ${translations[language].classes[user?.class as keyof typeof translations.en.classes] || user?.class} ର ପ୍ରିମିୟମ ମୂଲ୍ୟାଙ୍କନରେ ଭାଗ ନିଅନ୍ତୁ।`}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex relative z-10 items-center justify-between md:justify-start gap-4 bg-black/20 backdrop-blur-md px-4 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-3xl border border-white/5 w-full md:w-auto">
          <div className="text-left md:text-right">
            <p className="text-[9px] md:text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              {language === 'en' ? 'Active Status' : 'ସକ୍ରିୟ ସ୍ଥିତି'}
            </p>
            <p className="text-xs md:text-sm font-black text-white">
              {language === 'en' ? 'Board Pattern 2026' : 'ବୋର୍ଡ ପ୍ୟାଟର୍ନ ୨୦୨୬'}
            </p>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Lucide.Shield size={16} />
          </div>
        </div>
      </motion.div>

      {!user?.district ? (
        <motion.div 
          variants={itemVariants}
          className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border border-amber-500/25 p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <img src="/gundulu-pointing-nobg.png" alt="Gundulu Point" className="w-8 h-8 shrink-0" />
            <div className="text-left">
              <p className="text-xs font-black text-white">📍 {language === 'en' ? 'Missing District' : 'ଜିଲ୍ଲା ଚୟନ କରିନାହଁ'}</p>
              <p className="text-[10px] text-slate-400">
                {language === 'en' ? 'Update district to unlock Leaderboard!' : 'ଜିଲ୍ଲା ରାଙ୍କ ପାଇଁ ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍ କର!'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('profile')}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase transition-colors"
          >
            {language === 'en' ? 'Update Profile' : 'ପ୍ରୋଫାଇଲ୍ ଅପଡେଟ୍'}
          </button>
        </motion.div>
      ) : (
        <motion.div 
          variants={itemVariants}
          className="bg-slate-900/60 backdrop-blur border border-white/5 p-4 rounded-xl sm:rounded-2xl flex items-center gap-3"
        >
          <img src="/gundulu-pointing-nobg.png" alt="Gundulu Point" className="w-10 h-10 shrink-0" />
          <div className="text-left flex-1">
            <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Gundulu's Encouragement</h4>
            <p className="text-xs font-bold text-slate-200 italic leading-relaxed">
              {(() => {
                const completedCount = testsForSelectedMonth.filter(t => getSubmission(t)).length;
                const totalCount = testsForSelectedMonth.length;
                if (completedCount === 0) {
                  return language === 'or' 
                    ? "“ଆରେ ସାଙ୍ଗ! ତୁମର ମାସିକ ପରୀକ୍ଷା ଆସିଯାଇଛି। 📝”"
                    : "“Hey friend! Your monthly tests are ready. Let's start! 📝”";
                }
                if (completedCount === totalCount) {
                  return language === 'or'
                    ? "“ଅତି ସୁନ୍ଦର! ତୁମେ ତ ଗୁନ୍ଦୁଲୁ ମହାରଥୀ ବନିଗଲ। 🌟”"
                    : "“Amazing! You are a Gundulu Legend. Keep it up! 🌟”";
                }
                return language === 'or'
                  ? "“ବହୁତ ଭଲ ପ୍ରୟାସ! ଆଉ ଟିକେ ଚେଷ୍ଟା କଲେ ତୁମେ ନିଶ୍ଚୟ ଜିଲ୍ଲା ରାଙ୍କ ପାଇବ। 👍”"
                  : "“Great effort! Keep attempting to secure your district rank. 👍”";
              })()}
            </p>
          </div>
        </motion.div>
      )}

      {availableMonths.length > 0 && (
        <motion.div variants={itemVariants} className="flex gap-1.5 overflow-x-auto pb-2 border-b border-white/5 scrollbar-none">
          {availableMonths.map((m) => {
            const isActive = m === currentMonthFilter;
            return (
              <button
                key={m}
                onClick={() => setActiveMonthFilter(m)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {m}
              </button>
            );
          })}
        </motion.div>
      )}

      {selectedMonthReport.submissions.length > 0 && (
        <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-2xl md:rounded-[2rem] p-4 md:p-8 relative overflow-hidden mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32 rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 md:gap-4 relative z-10 text-left">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Lucide.Trophy className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
              <h3 className="text-base md:text-2xl font-black text-white">
                {language === 'en' ? `${currentMonthFilter} Series Report` : `${currentMonthFilter} ମାସିକ ରିପୋର୍ଟ`}
              </h3>
              <p className="text-slate-400 text-[10px] md:text-xs mt-0.5">
                {language === 'en' ? 'Overall Performance Across All Subjects' : 'ସମସ୍ତ ବିଷୟର ସାମଗ୍ରିକ ପ୍ରଦର୍ଶନ'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4 relative z-10">
            <div className="bg-indigo-500/20 border border-indigo-500/30 px-4 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-center min-w-[100px] md:min-w-[120px] flex-1 md:flex-initial">
              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-wider text-indigo-400 mb-0.5">
                {language === 'en' ? 'Total Score' : 'ମୋଟ ସ୍କୋର'}
              </p>
              <p className="text-lg md:text-2xl font-black text-white">{selectedMonthReport.totalScore} <span className="text-xs text-slate-400">/ {selectedMonthReport.totalMax}</span></p>
            </div>

            <button
              onClick={() => {
                if (!isMonthResultsPublished) {
                  alert(`ରାଙ୍କିଙ୍ଗ୍ ଚୂଡ଼ାନ୍ତ ହେବା ପରେ ଏହି ମାସର ${publishDay} ତାରିଖରେ ତୁମର ମିଳିତ ରିପୋର୍ଟ କାର୍ଡ ଏବଂ ପ୍ରମାଣପତ୍ର ଉପଲବ୍ଧ ହେବ।`);
                  return;
                }
                setViewingConsolidatedCert({
                  monthYear: currentMonthFilter,
                  submissions: selectedMonthReport.submissions,
                  tests: selectedMonthReport.tests
                });
              }}
              className={isMonthResultsPublished 
                ? "py-3 px-4 md:py-4 md:px-6 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-98 transition-all duration-300 border-t border-white/20 flex-1 md:flex-initial cursor-pointer"
                : "py-3 px-4 md:py-4 md:px-6 rounded-xl md:rounded-2xl bg-slate-900/40 border border-white/5 text-slate-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 flex-1 md:flex-initial cursor-pointer opacity-60 hover:text-slate-400 hover:bg-slate-900/60 transition-all"
              }
            >
              {isMonthResultsPublished ? (
                <><Lucide.Award size={16} /> {language === 'en' ? 'Consolidated Cert' : 'ମିଳିତ ପ୍ରମାଣପତ୍ର'}</>
              ) : (
                <><Lucide.Lock size={16} /> {language === 'en' ? `Locked (Unlocks on ${publishDay}th)` : `ଲକ୍ ଅଛି (${publishDay} ତାରିଖରେ ଖୋଲିବ)`}</>
              )}
            </button>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {testsForSelectedMonth.map((testItem: any) => {
          const submission = getSubmission(testItem);
          const resultsPublished = testItem.results_published;
          const totalMaxMarks = testItem.questions?.reduce((acc: number, q: any) => acc + (q.marks || 1), 0) || 0;
          const theme = getSubjectTheme(testItem.subject);
          const SubjectIcon = theme.icon;

          const score = submission ? (submission.finalScore ?? submission.score ?? 0) : 0;
          const max = submission ? (submission.totalMaxMarks ?? submission.totalQuestions ?? 1) : 1;
          const percentage = Math.round((score / max) * 100);
          
          let formattedDate = 'Scheduled';
          if (testItem.scheduledDate) {
            try {
              formattedDate = new Date(testItem.scheduledDate).toLocaleDateString(language === 'or' ? 'or-IN' : 'en-IN', {
                day: 'numeric',
                month: 'short'
              });
            } catch (e) {
              formattedDate = testItem.scheduledDate;
            }
          }

          return (
            <motion.div 
              whileHover={{ y: -8, scale: 1.01 }} 
              key={testItem.id} 
              className={`bg-slate-950/40 backdrop-blur-2xl border border-white/5 rounded-xl md:rounded-[2.25rem] p-3.5 sm:p-5 md:p-8 ${theme.borderHover} transition-all duration-500 group relative overflow-hidden flex flex-col justify-between h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.5)]`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-30 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none`}></div>
              <div className={`absolute top-0 right-0 w-36 h-36 ${theme.glow} blur-[50px] rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-1000 pointer-events-none`} />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-white/20 transition-all duration-700"></div>

              <div className="relative z-10 flex flex-col justify-between h-full space-y-3 sm:space-y-4 md:space-y-6">
                <div className="flex items-start justify-between">
                  {submission ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Completed
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Attempted</span>
                    </div>
                  ) : (
                    <span className="px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.15)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      Open Now
                    </span>
                  )}
                </div>

                <div className="text-left">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white mb-1.5 md:mb-2 tracking-tight leading-snug group-hover:text-slate-100 transition-colors">
                    {getCorrectSubjectName(testItem.subject, language)}
                  </h3>
                  
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl bg-white/[0.04] border border-white/[0.05] text-[9px] sm:text-[10px] font-bold text-slate-300">
                      <Lucide.HelpCircle size={10} className="text-slate-400" />
                      {testItem.questions.length} Questions
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl ${theme.badgeBg} text-[9px] sm:text-[10px] font-bold`}>
                      <Lucide.Sparkles size={10} />
                      {totalMaxMarks} Marks
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg sm:rounded-xl bg-white/[0.04] border border-white/[0.05] text-[9px] sm:text-[10px] font-bold text-slate-300">
                      <Lucide.Calendar size={10} className="text-slate-400" />
                      {formattedDate}
                    </span>
                  </div>

                  {testItem.chapterIds && testItem.chapterIds.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl sm:rounded-2xl">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-1.5 flex items-center gap-1">
                        <Lucide.BookOpen size={10} className="text-emerald-400" />
                        {language === 'en' ? 'Syllabus Covered:' : 'ପରୀକ୍ଷା ସିଲେବସ:'}
                      </p>
                      <ul className="space-y-1">
                        {testItem.chapterIds.map((cid: string) => {
                          const ch = chapters?.find((c: any) => c.id === cid);
                          if (!ch) return null;
                          const title = language === 'or' ? (ch.title_or || ch.title) : (ch.title_en || ch.title);
                          return (
                            <li key={cid} className="text-[10px] text-slate-300 font-bold flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="truncate max-w-[280px]">{title}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="w-full">
                  {submission ? (
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center gap-2.5 md:gap-4 bg-slate-950/60 border border-white/5 rounded-xl md:rounded-2xl p-2.5 md:p-4">
                        <div className="relative w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="16" cy="16" r="12" className="stroke-slate-800 md:hidden" strokeWidth="2.5" fill="transparent" />
                            <circle cx="28" cy="28" r="24" className="stroke-slate-800 hidden md:block" strokeWidth="4" fill="transparent" />
                            <circle cx="16" cy="16" r="12" className="stroke-emerald-400 md:hidden" strokeWidth="2.5" fill="transparent" strokeDasharray={2 * Math.PI * 12} strokeDashoffset={2 * Math.PI * 12 * (1 - percentage / 100)} strokeLinecap="round" />
                            <circle cx="28" cy="28" r="24" className="stroke-emerald-400 hidden md:block" strokeWidth="4" fill="transparent" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - percentage / 100)} strokeLinecap="round" />
                          </svg>
                          <span className="absolute text-[8px] md:text-[10px] font-black text-white">{percentage}%</span>
                        </div>

                        <div className="text-left flex-1 min-w-0">
                          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {language === 'en' ? 'Marks Obtained:' : 'ପ୍ରାପ୍ତ ମାର୍କ:'}
                          </p>
                          <p className="text-base md:text-lg font-black text-white mt-0.5">
                            {score} <span className="text-xs text-slate-500">/ {max}</span>
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-1 md:mt-1.5">
                            {resultsPublished ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase ${
                                (submission.rank || 0) === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                (submission.rank || 0) === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                                (submission.rank || 0) === 3 ? 'bg-amber-600/20 text-amber-500 border border-amber-500/30' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                <Lucide.Award size={8} />
                                {(() => {
                                  if ((submission.rank || 0) === 1) return language === 'or' ? 'ଓଡ଼ିଶା ମହାରଥୀ (Rank #1)' : 'Odisha Legend (Rank #1)';
                                  if ((submission.rank || 0) === 2) return language === 'or' ? 'ରାଜ୍ୟ ବୀର (Rank #2)' : 'State Hero (Rank #2)';
                                  if ((submission.rank || 0) === 3) return language === 'or' ? 'ରାଜ୍ୟ ଯୋଦ୍ଧା (Rank #3)' : 'State Warrior (Rank #3)';
                                  return `${language === 'en' ? 'State' : 'ରାଜ୍ୟ'} #${submission.rank || 'N/A'}`;
                                })()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] md:text-[9px] font-black uppercase">
                                <Lucide.Clock size={8} /> {language === 'en' ? 'Pending State Rank' : 'ରାଜ୍ୟ ର୍ୟାଙ୍କ ଅପେକ୍ଷା'}
                              </span>
                            )}

                            {resultsPublished ? (
                              user?.district ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase ${
                                  (submission.districtRank || 0) === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                  (submission.districtRank || 0) === 2 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                                  (submission.districtRank || 0) === 3 ? 'bg-amber-600/20 text-amber-500 border border-amber-500/30' :
                                  'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                }`}>
                                  <Lucide.MapPin size={8} />
                                  {(() => {
                                    if ((submission.districtRank || 0) === 1) return language === 'or' ? 'ଜିଲ୍ଲା ସେନାପତି (Rank #1)' : 'District General (Rank #1)';
                                    if ((submission.districtRank || 0) === 2) return language === 'or' ? 'ଜିଲ୍ଲା ବୀର (Rank #2)' : 'District Hero (Rank #2)';
                                    if ((submission.districtRank || 0) === 3) return language === 'or' ? 'ଜିଲ୍ଲା ବିଜେତା (Rank #3)' : 'District Winner (Rank #3)';
                                    return `${language === 'en' ? 'District' : 'ଜିଲ୍ଲା'} #${submission.districtRank || 'N/A'}`;
                                  })()}
                                </span>
                              ) : (
                                <button 
                                  onClick={() => setActiveTab('profile')}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] md:text-[9px] font-black uppercase hover:bg-red-500/20 transition-all cursor-pointer"
                                >
                                  {language === 'en' ? '📍 Set District' : '📍 ଜିଲ୍ଲା ଚୟନ କର'}
                                </button>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] md:text-[9px] font-black uppercase">
                                <Lucide.Clock size={8} /> {language === 'en' ? 'Pending Dist Rank' : 'ଜିଲ୍ଲା ର୍ୟାଙ୍କ ଅପେକ୍ଷା'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => setReviewingResults({ submission, test: testItem })}
                          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 border border-white/5 hover:border-white/10 active:scale-98 transition-all duration-300 cursor-pointer"
                        >
                          <Lucide.ClipboardList size={14} /> {language === 'en' ? 'Review Answers & AI Evaluation' : 'ଉତ୍ତର ସମୀକ୍ଷା ଏବଂ AI ମୂଲ୍ୟାଙ୍କନ'}
                        </button>
                        <button
                          onClick={() => setPrintingSelectionPaper({ test: testItem })}
                          className="w-full py-3 rounded-lg bg-slate-950 border border-white/10 hover:border-white/30 text-slate-300 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 hover:text-white transition-all cursor-pointer"
                        >
                          <Lucide.Download size={12} /> {language === 'en' ? 'Printable Board Selection Paper' : 'ବୋର୍ଡ ସିଲେକ୍ସନ ପେପର୍ ପ୍ରିଣ୍ଟ'}
                        </button>
                      </div>
                    </div>
                  ) : resultsPublished ? (
                    <div className="w-full py-3.5 rounded-xl bg-slate-950/60 border border-white/5 text-slate-500 font-bold text-center flex flex-col items-center justify-center gap-1">
                      <Lucide.Clock size={14} className="opacity-60" />
                      <span className="text-[10px] md:text-xs uppercase tracking-widest font-black text-slate-400">
                        {language === 'en' ? 'Test Ended' : 'ପରୀକ୍ଷା ଶେଷ'}
                      </span>
                      <p className="text-[8px] md:text-[9px] font-bold uppercase opacity-60 tracking-wider">
                        {language === 'en' ? 'Results published' : 'ଫଳାଫଳ ପ୍ରକାଶିତ'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400">
                            <Lucide.User size={14} />
                          </div>
                          <div className="text-left">
                            <p className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase tracking-widest">
                              {language === 'en' ? 'Certificate Name' : 'ସାର୍ଟିଫିକେଟ୍ ନାମ'}
                            </p>
                            <p className="text-xs font-bold text-white max-w-[120px] truncate">{user.displayName || user.name || 'Student'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActiveTab('profile')}
                          className="text-[8px] md:text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest hover:underline transition-colors cursor-pointer bg-transparent border-none"
                        >
                          {language === 'en' ? 'Change' : 'ବଦଳାଅ'}
                        </button>
                      </div>

                      <button 
                        onClick={() => {
                          setSelectedTest(testItem);
                          setTakingTest(true);
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/45 hover:scale-[1.01] active:scale-98 transition-all duration-300 flex items-center justify-center gap-2 group/btn border-t border-white/20 cursor-pointer"
                      >
                        <Lucide.Play size={14} className="group-hover/btn:scale-125 transition-transform" />
                        {translations[language].takeMonthlyTest}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {testsForSelectedMonth.length === 0 && (
          <motion.div variants={itemVariants} className="md:col-span-2 flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
            <Lucide.Clock size={48} className="text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              {language === 'en' ? 'No Tests Scheduled' : 'କୌଣସି ପରୀକ୍ଷା ନିର୍ଦ୍ଧାରିତ ହୋଇନାହିଁ'}
            </h3>
            <p className="text-slate-500">
              {language === 'en' 
                ? 'Check back later for upcoming monthly assessments for your class and subjects.' 
                : 'ଆପଣଙ୍କ ଶ୍ରେଣୀ ଏବଂ ବିଷୟଗୁଡ଼ିକର ଆଗାମୀ ମାସିକ ପରୀକ୍ଷା ପାଇଁ ପରେ ଚେକ୍ କରନ୍ତୁ।'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function MonthlyTestEngine({ test, onComplete, onBack, language, user }: any) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [timeSpent, setTimeSpent] = useState<Record<number, number>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const uploadingImageRef = useRef(false);
  
  useEffect(() => {
    uploadingImageRef.current = uploadingImage;
  }, [uploadingImage]);
  
  const [reports, setReports] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    requestScreenWakeLock();
    return () => {
      void releaseScreenWakeLock();
    };
  }, []);

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
          }, 'image/jpeg', 0.7);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    if (test.results_published) {
      alert(language === 'en' ? "This test session has ended as results have been published." : "ଆରେ ସାଙ୍ଗ! ଫଳାଫଳ ପ୍ରକାଶିତ ହୋଇଥିବାରୁ ଏହି ପରୀକ୍ଷା ଶେଷ ହୋଇଯାଇଛି।");
      onBack();
    }
  }, [test.results_published, language, onBack]);

  useEffect(() => {
    if (timeLeft <= 0) {
      alert(language === 'en' ? "Time is up! Your test is being submitted automatically." : "ଆରେ ସାଙ୍ଗ! ସମୟ ସରିଗଲା, ତୁମର ପରୀକ୍ଷା ଆପେ ଆପେ ସବ୍‌ମିଟ୍ ହେଉଛି।");
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if ((window as any).isUploadingRoughNote) {
        console.log("[Anti-Cheating] Visibility change ignored due to active camera/gallery rough note upload.");
        return;
      }
      if (document.visibilityState === 'hidden') {
        setViolations(prev => {
          const next = prev + 1;
          if (next >= 3) {
            alert(language === 'en' ? "Test auto-submitted due to multiple tab switches." : "ଆରେ ସାଙ୍ଗ! ବାରମ୍ବାର ଟ୍ୟାବ୍ ବଦଳାଇବା ଯୋଗୁଁ ତୁମର ପରୀକ୍ଷା ଆପେ ଆପେ ସବ୍‌ମିଟ୍ ହୋଇଗଲା।");
            handleSubmit();
          } else {
            setShowWarning(true);
          }
          return next;
        });
      }
    };

    const handleWindowFocus = () => {
      setTimeout(() => {
        if (!uploadingImageRef.current) {
          (window as any).isUploadingRoughNote = false;
        }
      }, 10000);
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v')) {
        e.preventDefault();
        alert(language === 'en' ? "Copy/Paste is disabled during the test." : "ପରୀକ୍ଷା ସମୟରେ କପି-ପେଷ୍ଟ ମନା!");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [violations]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(prev => ({
        ...prev,
        [currentIdx]: (prev[currentIdx] || 0) + 1
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx]);

  const handleAnswer = (val: any) => {
    vibrate(12);
    playClickSound();
    setAnswers(prev => ({ ...prev, [currentIdx]: val }));
  };

  const handleImageUpload = async (file: File) => {
    if (!file) {
      (window as any).isUploadingRoughNote = false;
      return;
    }
    setUploadingImage(true);
    (window as any).isUploadingRoughNote = true;
    try {
      const compressedBlob = await compressImage(file);
      
      const safeUserId = user?.uid || user?.id || 'anonymous';
      const storageRef = ref(storage, `monthly_test_evidence/${safeUserId}/${test.id}/${currentIdx}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      const currentVal = answers[currentIdx] || '';
      const newVal = typeof currentVal === 'object' 
        ? { ...currentVal, imageUrl: url }
        : { text: currentVal, imageUrl: url };
      
      handleAnswer(newVal);
    } catch (err: any) {
      console.error("Image upload error:", err);
      alert(`Failed to upload image: ${err.message || "Unknown error"}. Please check your connection and try again.`);
    } finally {
      setUploadingImage(false);
      setTimeout(() => {
        (window as any).isUploadingRoughNote = false;
      }, 1000);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const questions = test.questions;
      let mcqScore = 0;
      let totalMaxMarks = 0;

      questions.forEach((qItem: any, i: number) => {
        const studentAns = answers[i];
        totalMaxMarks += (qItem.marks || 1);
        
        if (qItem.isGrace) {
          mcqScore += (qItem.marks || 1);
        } else if (qItem.type === 'mcq' || !qItem.type) {
          const options = qItem.options || [];
          const selectedOption = options[studentAns];
          if (selectedOption === qItem.correct_answer || String(studentAns) === qItem.correct_answer) {
            mcqScore += (qItem.marks || 1);
          }
        }
      });
      
      await addDoc(collection(firestore, 'monthly_test_submissions'), {
        testId: test.id,
        userId: user.uid || user.id,
        userName: user.displayName || user.name || 'Student',
        userEmail: user.email || '',
        class: user.class,
        subject: test.subject,
        month: test.month,
        year: test.year,
        district: user.district || '',
        school: user.school || '',
        answers,
        score: mcqScore,
        totalMaxMarks,
        totalQuestions: questions.length,
        violations,
        reports,
        timeSpent,
        submittedAt: serverTimestamp(),
        rank: null,
        districtRank: null,
        status: 'pending_review'
      });

      try {
        localStorage.removeItem(`fs_cache_test_subs_${user.uid || user.id}`);
      } catch (cacheErr) {
        console.warn("Failed to clear test submissions cache:", cacheErr);
      }
      vibrate([60, 40, 120]);
      playSuccessChime(true);
      alert(language === 'en' ? "Test submitted successfully!" : "ଆରେ ସାଙ୍ଗ! ପରୀକ୍ଷା ସଫଳତାର ସହିତ ସବ୍‌ମିଟ୍ ହେଲା! 🎉");
      onComplete();
    } catch (err: any) {
      console.error("Submit Test Error:", err);
      alert(`Failed to submit test: ${err.message || "Unknown error"}. Please check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const qItem = test.questions[currentIdx];
  const marks = qItem.marks || 1;
  const isMcq = qItem.type === 'mcq' || !qItem.type;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      key={currentIdx}
      className="fixed inset-0 z-[9999] bg-slate-950 overflow-y-auto p-4 sm:p-8 flex flex-col justify-between text-left"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide global app header, sidebar, and bottom mobile navigation bar during active test */
        header, 
        .global-mobile-nav,
        aside {
          display: none !important;
        }
      `}} />
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between bg-slate-900/80 border border-white/5 px-6 py-4 rounded-3xl backdrop-blur-md mb-6">
        <button 
          onClick={() => {
            if (confirm(language === 'en' ? "Are you sure you want to quit? Your progress will be lost." : "ଆରେ ସାଙ୍ଗ! ତୁମେ ସତରେ ପରୀକ୍ଷା ବନ୍ଦ କରିବାକୁ ଚାହୁଁଛ କି?")) {
              onBack();
            }
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
        >
          <Lucide.ArrowLeft size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {language === 'en' ? 'Quit Test' : 'ପରୀକ୍ଷା ବନ୍ଦ କର'}
          </span>
        </button>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all ${timeLeft < 300 ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-white/5 border-white/10 text-emerald-500'}`}>
            <Lucide.Clock size={14} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {violations > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-pulse">
              <Lucide.AlertTriangle size={12} />
              <span>
                {language === 'en' ? `${violations} Flags` : `${violations} ଟି ଚେତାବନୀ`}
              </span>
            </div>
          )}

          <button 
            onClick={() => setReports(prev => ({...prev, [currentIdx]: !prev[currentIdx]}))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-all text-xs cursor-pointer ${reports[currentIdx] ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-500'}`}
          >
            <Lucide.Flag size={12} />
            <span className="hidden sm:inline">{language === 'en' ? 'Out of Syllabus?' : 'ସିଲେବସ ବାହାରେ?'}</span>
          </button>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {language === 'en' ? 'Question' : 'ପ୍ରଶ୍ନ'} {currentIdx + 1}/{test.questions.length}
          </p>
          <div className="w-24 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500" 
              style={{ width: `${((currentIdx + 1) / test.questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center">
        <AnimatePresence>
          {showWarning && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-200 text-xs font-bold flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Lucide.XCircle className="text-red-500" size={16} />
                <span>
                  {language === 'en' 
                    ? 'Warning: Do not leave the exam screen. Multiple tab switches will lead to automatic submission.' 
                    : 'ଚେତାବନୀ: ପରୀକ୍ଷା ସ୍କ୍ରିନ ଛାଡ଼ି ଯାଆନ୍ତୁ ନାହିଁ। ବାରମ୍ବାର ଟ୍ୟାବ୍ ବଦଳାଇଲେ ପରୀକ୍ଷା ସ୍ୱତଃ ସବ୍‌ମିଟ୍ ହୋଇଯିବ।'}
                </span>
              </div>
              <button onClick={() => setShowWarning(false)} className="text-white hover:underline uppercase tracking-widest text-[10px] bg-transparent border-none cursor-pointer">
                {language === 'en' ? 'Close' : 'ବନ୍ଦ କର'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl md:rounded-[2.5rem] p-5 md:p-12 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <span className="px-2.5 py-0.5 md:px-3.5 md:py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
              {language === 'en' ? `${marks} Mark${marks > 1 ? 's' : ''}` : `${marks} ମାର୍କ`}
            </span>
            <span className="px-2.5 py-0.5 md:px-3.5 md:py-1 rounded-full bg-blue-500/10 text-blue-400 text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
              {isMcq 
                ? (language === 'en' ? 'Multiple Choice' : 'ବହୁବିକଳ୍ପ ପ୍ରଶ୍ନ (MCQ)') 
                : (language === 'en' ? 'Subjective Answer' : 'ସଂକ୍ଷିପ୍ତ ଉତ୍ତରମୂଳକ ପ୍ରଶ୍ନ')}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white mb-8 leading-relaxed">
            {qItem.question}
          </h2>
          
          {isMcq ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qItem.options.map((opt: string, idx: number) => (
                <button 
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className={`flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group cursor-pointer ${answers[currentIdx] === idx ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:text-white'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-md shrink-0 transition-colors ${answers[currentIdx] === idx ? 'bg-white text-emerald-500' : 'bg-white/10 text-slate-500 group-hover:text-white'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-sm font-bold">{opt}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {language === 'en' ? 'Answer / Calculation Workspace' : 'ଉତ୍ତର / ଗଣନା ସ୍ଥାନ'}
                </label>
                <div className="flex gap-2">
                  <label 
                    onPointerDown={() => { (window as any).isUploadingRoughNote = true; }}
                    onMouseDown={() => { (window as any).isUploadingRoughNote = true; }}
                    onTouchStart={() => { (window as any).isUploadingRoughNote = true; }}
                    onClick={() => { (window as any).isUploadingRoughNote = true; }}
                    className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-bold text-white flex items-center gap-1.5 transition-all"
                  >
                    {uploadingImage ? <Lucide.Loader2 size={12} className="animate-spin" /> : <Lucide.Camera size={12} />}
                    {uploadingImage 
                      ? (language === 'en' ? 'Uploading...' : 'ଅପଲୋଡ୍ ହେଉଛି...') 
                      : (language === 'en' ? 'Camera' : 'କ୍ୟାମେରା')}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onClick={() => {
                        (window as any).isUploadingRoughNote = true;
                      }}
                      onChange={(e) => {
                        (window as any).isUploadingRoughNote = true;
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        else (window as any).isUploadingRoughNote = false;
                        e.target.value = '';
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                  <label 
                    onPointerDown={() => { (window as any).isUploadingRoughNote = true; }}
                    onMouseDown={() => { (window as any).isUploadingRoughNote = true; }}
                    onTouchStart={() => { (window as any).isUploadingRoughNote = true; }}
                    onClick={() => { (window as any).isUploadingRoughNote = true; }}
                    className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-bold text-white flex items-center gap-1.5 transition-all"
                  >
                    <Lucide.Image size={12} />
                    {language === 'en' ? 'Gallery' : 'ଗ୍ୟାଲେରୀ'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onClick={() => {
                        (window as any).isUploadingRoughNote = true;
                      }}
                      onChange={(e) => {
                        (window as any).isUploadingRoughNote = true;
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        else (window as any).isUploadingRoughNote = false;
                        e.target.value = '';
                      }}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              <textarea 
                value={typeof answers[currentIdx] === 'object' ? answers[currentIdx].text : (answers[currentIdx] || '')}
                onChange={(e) => {
                  const currentVal = answers[currentIdx];
                  const newVal = typeof currentVal === 'object' 
                    ? { ...currentVal, text: e.target.value }
                    : e.target.value;
                  handleAnswer(newVal);
                }}
                placeholder={language === 'en' ? 'Type your explanation or calculations here...' : 'ଏଠାରେ ଆପଣଙ୍କର ଉତ୍ତର କିମ୍ବା ଗଣନା ଲେଖନ୍ତୁ...'}
                className="w-full h-36 bg-black/20 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-emerald-500/50 transition-all resize-none leading-relaxed text-sm"
              />

              {answers[currentIdx]?.imageUrl && (
                <div className="relative w-full max-h-[140px] rounded-xl overflow-hidden border border-white/10 bg-black/20">
                  <img src={answers[currentIdx].imageUrl} alt="Working Evidence" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => {
                      const currentVal = answers[currentIdx];
                      if (typeof currentVal === 'object') {
                        const { imageUrl, ...rest } = currentVal;
                        handleAnswer(rest);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition-all cursor-pointer border-none"
                  >
                    <Lucide.Trash2 size={12} />
                  </button>
                </div>
              )}

              <p className="text-[9px] text-slate-500 uppercase font-black text-right">
                {language === 'en' ? 'Submission includes text and optional photo evidence' : 'ଉତ୍ତର ସହିତ ଫଟୋ ପ୍ରମାଣ ସଂଲଗ୍ନ କରାଯାଇପାରିବ'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto space-y-4">
        <div className="flex overflow-x-auto gap-2 py-2 px-3 bg-slate-900/60 border border-white/5 rounded-2xl scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent justify-start md:justify-center">
          {test.questions.map((_: any, idx: number) => {
            const isCurrent = idx === currentIdx;
            const ans = answers[idx];
            const isFlagged = reports[idx] === true;
            const isAnswered = ans !== undefined && ans !== '';

            let bubbleStyle = "border-white/20 text-slate-400 hover:border-white/50";
            if (isAnswered) bubbleStyle = "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10";
            else if (isFlagged) bubbleStyle = "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10";
            
            return (
              <button
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 transition-all cursor-pointer ${bubbleStyle} ${
                  isCurrent ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-950 scale-110' : ''
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center gap-6">
          <div className="flex gap-3">
            <button 
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => prev - 1)}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 disabled:opacity-0 transition-all border border-white/5 cursor-pointer"
            >
              <Lucide.ArrowLeft size={16} />
            </button>
            
            <button 
              onClick={() => {
                if (answers[currentIdx] === undefined) {
                  handleAnswer('');
                }
                if (currentIdx < test.questions.length - 1) {
                  setCurrentIdx(prev => prev + 1);
                }
              }}
              className="px-5 py-3.5 rounded-xl bg-white/5 text-amber-500 font-bold hover:bg-white/10 transition-all border border-amber-500/10 cursor-pointer"
            >
              {language === 'en' ? 'Skip' : 'ଛାଡ଼ିଦିଅ'}
            </button>
          </div>
          
          {currentIdx === test.questions.length - 1 ? (
            <button 
              disabled={answers[currentIdx] === undefined || submitting}
              onClick={handleSubmit}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              {submitting ? <><Lucide.Loader2 size={16} className="animate-spin" /> {language === 'en' ? 'Submitting...' : 'ସବ୍‌ମିଟ୍ ହେଉଛି...'}</> : <><Lucide.Trophy size={16} /> {language === 'en' ? 'Submit Final Test' : 'ପରୀକ୍ଷା ସବ୍‌ମିଟ୍ କର'}</>}
            </button>
          ) : (
            <button 
              disabled={answers[currentIdx] === undefined}
              onClick={() => setCurrentIdx(prev => prev + 1)}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 cursor-pointer border-none"
            >
              {language === 'en' ? 'Next Question' : 'ପରବର୍ତ୍ତୀ ପ୍ରଶ୍ନ'} <Lucide.ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
