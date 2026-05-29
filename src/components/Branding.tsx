import React, { useState } from 'react';
import { translations } from '../translations';

export const UtkalLogoSVG = ({ className = "h-10" }: { className?: string }) => (
  <svg viewBox="0 0 200 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 10C15 7.23858 17.2386 5 20 5H40C42.7614 5 45 7.23858 45 10V40C45 42.7614 42.7614 45 40 45H20C17.2386 45 15 42.7614 15 40V10Z" fill="#10B981" fillOpacity="0.2"/>
    <path d="M22 15L30 23L38 15" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 25L30 33L38 25" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 35H38" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="55" y="32" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">UTKAL</text>
    <text x="55" y="48" fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="sans-serif" letterSpacing="2">SKILL CENTRE</text>
  </svg>
);

export const AhasLogoSVG = ({ className = "h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 25L15 5L25 25" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 18H20" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="15" cy="15" r="12" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3"/>
    <text x="35" y="21" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1.5">AHAS</text>
  </svg>
);

export const BigsanBranding = ({ className = "" }: { className?: string }) => {
  const [lang] = useState<'en' | 'or'>(localStorage.getItem('lang') as any || 'or');
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        {translations[lang]?.associate || 'Associate Partner'}
      </p>
    </div>
  );
};
