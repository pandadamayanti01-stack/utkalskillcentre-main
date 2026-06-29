import React from 'react';
import { motion } from 'framer-motion';
import * as Lucide from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SEO } from './SEO';
import { previewDatabase } from '../data/previewDatabase';
import { cleanMathNotation } from '../utils/cleaners';
const escapeXml = (str: string): string => {
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const getGenerativeTextbookCover = (classKey: string, subjectKey: string, title: string): string => {
  const odiaClasses: Record<string, string> = {
    class1: "ପ୍ରଥମ ଶ୍ରେଣୀ",
    class2: "ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ",
    class3: "ତୃତୀୟ ଶ୍ରେଣୀ",
    class4: "ଚତୁର୍ଥ ଶ୍ରେଣୀ",
    class5: "ପଞ୍ଚମ ଶ୍ରେଣୀ",
    class6: "ଷଷ୍ଠ ଶ୍ରେଣୀ",
    class7: "ସପ୍ତମ ଶ୍ରେଣୀ",
    class8: "ଅଷ୍ଟମ ଶ୍ରେଣୀ",
    class9: "ନବମ ଶ୍ରେଣୀ",
    class10: "ଦଶମ ଶ୍ରେଣୀ"
  };

  const odiaSubjects: Record<string, string> = {
    shishu_vatika: "ଶିଶୁ ବାଟିକା ପାଠ୍ୟ",
    ganita_khela: "ଗଣିତ ଖେଳ", jhulana_1: "ଝୁଲଣା ୧", maja_majare_ganita: "ମଜା ମଜାରେ ଗଣିତ",
    jhulana_2: "ଝୁଲଣา ୨", bhasa_mahak_1: "ଭାଷା ମହକ ୧", ganita_mela: "ଗଣିତ ମେଳା",
    paribesa_patha: "ପରିବେଶ ପାଠ", pallavi: "ପଲ୍ଲବୀ ଇଂରାଜୀ", kala_sikhya: "କଳା ଶିକ୍ଷା",
    sharirika_sikhya: "ଶାରୀରିକ ଶିକ୍ଷା", bhasa_mahak_2: "ଭାଷା ମହକ ୨", krida_yoga: "କ୍ରୀଡ଼ା ଓ ଯୋଗ",
    bhasa_mahak_3: "ଭାଷା ମହକ ୩", ama_chaturbaswara_pruthibi: "ଆମ ଚର୍ତୁର୍ପାଶ୍ଵର ପୃଥିବୀ",
    sharirika_yoga: "ଶାରୀରିକ ଯୋଗ", ganita_prakas: "ଗଣିତ ପ୍ରକାଶ", sahitya_sudha: "ସାହିତ୍ୟ ସୁଧା",
    jigyasa: "ଜିଜ୍ଞାସା ବିଜ୍ଞାନ", samajika_bignana: "ସାମାଜିକ ବିଜ୍ଞାନ", jasmine: "ଜାସମିନ ଇଂରାଜୀ",
    hindi_kalika: "ହିନ୍ଦୀ କଳିକା", sanskritakalika_1: "ସଂସ୍କୃତ କଳିକା ୧", kausala_bodha: "କୌଶଳ ବୋଧ",
    kalakunja: "କଳାକୁଞ୍ଜ", khela_sikhya: "ଖେଳ ଶିକ୍ଷା", sahitya_suman: "ସାହିତ୍ୟ ସୁମନ",
    sanskritakalika_2: "ସଂସ୍କୃତ କଳିକା ୨", kalakruti: "କଳାକୃତି", sahitya_surabhi: "ସାହିତ୍ୟ ସୁରଭି",
    sanskritakalika_3: "ସଂସ୍କୃତ କଳିକା ୩", kruti: "କୃତି", algebra: "ବୀଜଗଣିତ",
    geometry: "ଜ୍ୟାମିତି", physical_science: "ଭୌତିକ ବିଜ୍ଞାନ", life_science: "ଜୀବ ବିଜ୍ଞାନ",
    social_science: "ଇତିହାସ", geography: "ଭୂଗୋଳ", english: "ଇଂରାଜୀ",
    english_grammar: "ଇଂରାଜୀ ବ୍ୟାକରଣ", odia: "ଓଡ଼ିଆ", odia_grammar: "ଓଡ଼ିଆ ବ୍ୟାକରଣ",
    sanskrit: "ସଂସ୍କୃତ", sanskrit_grammar: "ସଂସ୍କୃତ ବ୍ୟାକରଣ", hindi: "ହିନ୍ଦୀ",
    hindi_grammar: "ହିନ୍ଦୀ ବ୍ୟାକରଣ", vocational: "ବ୍ୟାବସାୟିକ ଶିକ୍ଷା"
  };

  const cleanClass = classKey.toLowerCase().replace(/\s+/g, '').replace('th', '');
  const odiaClass = odiaClasses[cleanClass] || odiaClasses[classKey] || classKey;
  const odiaSubject = odiaSubjects[subjectKey] || subjectKey;

  const displayClass = escapeXml(odiaClass.toUpperCase());
  const displaySubject = escapeXml(odiaSubject);

  let gradient = "from-emerald-500 via-teal-600 to-slate-800";
  let decorativePattern = "";

  const subLower = subjectKey.toLowerCase();
  if (subLower.includes('math') || subLower.includes('ganita') || subLower.includes('algebra') || subLower.includes('geometry')) {
    gradient = "from-teal-500 via-emerald-600 to-amber-700";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <circle cx="200" cy="250" r="130" />
        <circle cx="200" cy="250" r="80" />
        <line x1="200" y1="100" x2="200" y2="400" />
        <line x1="50" y1="250" x2="350" y2="250" />
      </g>
    `;
  } else if (subLower.includes('history') || subLower.includes('social_science') || subLower.includes('hist')) {
    gradient = "from-amber-600 via-orange-600 to-amber-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <rect x="120" y="150" width="160" height="200" rx="10" />
        <line x1="160" y1="150" x2="160" y2="350" />
        <line x1="200" y1="150" x2="200" y2="350" />
        <line x1="240" y1="150" x2="240" y2="350" />
        <circle cx="200" cy="250" r="50" stroke-dasharray="4,4" />
      </g>
    `;
  } else if (subLower.includes('geography') || subLower.includes('geo')) {
    gradient = "from-teal-500 via-emerald-600 to-slate-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <circle cx="200" cy="250" r="110" />
        <ellipse cx="200" cy="250" rx="110" ry="40" />
        <ellipse cx="200" cy="250" rx="40" ry="110" />
        <line x1="200" y1="140" x2="200" y2="360" />
        <line x1="90" y1="250" x2="310" y2="250" />
      </g>
    `;
  } else if (subLower.includes('science') || subLower.includes('jigyasa') || subLower.includes('bignana') || subLower.includes('physical') || subLower.includes('life')) {
    gradient = "from-cyan-500 via-blue-600 to-indigo-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <ellipse cx="200" cy="250" rx="140" ry="50" transform="rotate(30 200 250)" />
        <ellipse cx="200" cy="250" rx="140" ry="50" transform="rotate(-30 200 250)" />
        <circle cx="200" cy="250" r="10" fill="white" fill-opacity="0.1" />
      </g>
    `;
  } else if (subLower.includes('social') || subLower.includes('samajika')) {
    gradient = "from-amber-500 via-orange-600 to-red-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <circle cx="200" cy="250" r="110" />
        <ellipse cx="200" cy="250" rx="110" ry="40" />
        <ellipse cx="200" cy="250" rx="40" ry="110" />
      </g>
    `;
  } else if (subLower.includes('english') || subLower.includes('jasmine') || subLower.includes('pallavi')) {
    gradient = "from-purple-500 via-pink-600 to-rose-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <path d="M100,150 C150,200 250,200 300,150 C300,150 250,300 200,350 C150,300 100,150 100,150 Z" />
        <circle cx="200" cy="230" r="50" />
      </g>
    `;
  } else if (subLower.includes('odia') || subLower.includes('sahitya') || subLower.includes('jhulana') || subLower.includes('bhasa')) {
    gradient = "from-orange-400 via-red-500 to-amber-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <path d="M100,250 Q200,150 300,250 T100,250" stroke-dasharray="5,5" />
        <circle cx="200" cy="250" r="100" />
      </g>
    `;
  } else if (subLower.includes('sanskrit') || subLower.includes('sanskruta')) {
    gradient = "from-amber-600 via-yellow-600 to-red-800";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="1.5" fill="none">
        <polygon points="200,130 290,200 290,300 200,370 110,300 110,200" />
        <circle cx="200" cy="250" r="60" />
      </g>
    `;
  } else if (subLower.includes('hindi')) {
    gradient = "from-rose-500 via-pink-600 to-red-900";
    decorativePattern = `
      <g stroke="white" stroke-opacity="0.08" stroke-width="2" fill="none">
        <rect x="110" y="160" width="180" height="180" rx="15" transform="rotate(45 200 250)" />
        <circle cx="200" cy="250" r="40" />
      </g>
    `;
  }

  const colors = gradient.replace('from-', '').replace('via-', '').replace('to-', '').split(' ');
  const colorMap: Record<string, string> = {
    'teal-500': '#0d9488', 'emerald-600': '#059669', 'amber-700': '#b45309',
    'cyan-500': '#0891b2', 'blue-600': '#2563eb', 'indigo-800': '#3730a3',
    'amber-500': '#d97706', 'orange-600': '#ea580c', 'red-800': '#991b1b',
    'purple-500': '#9333ea', 'pink-600': '#db2777', 'rose-800': '#9f1239',
    'orange-400': '#fb923c', 'red-500': '#ef4444', 'amber-800': '#92400e',
    'amber-600': '#d97706', 'yellow-600': '#ca8a04', 'rose-500': '#f43f5e',
    'red-900': '#7f1d1d', 'emerald-500': '#10b981', 'teal-600': '#0d9488',
    'slate-800': '#1e293b'
  };

  const startColor = colorMap[colors[0]] || '#0d9488';
  const midColor = colorMap[colors[1]] || '#059669';
  const endColor = colorMap[colors[2]] || '#1e293b';

  const displayTitle = escapeXml(title.length > 22 ? title.substring(0, 19) + "..." : title);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="100%" height="100%">
      <defs>
        <linearGradient id="textbook_grad_${classKey}_${subjectKey}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="50%" stop-color="${midColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>

      <!-- Card Background -->
      <rect width="400" height="533" rx="28" fill="url(#textbook_grad_${classKey}_${subjectKey})" />
      <rect width="25" height="533" fill="black" fill-opacity="0.15" />
      <line x1="25" y1="0" x2="25" y2="533" stroke="white" stroke-opacity="0.08" stroke-width="1" />

      <!-- Decorative Overlays -->
      ${decorativePattern}

      <!-- Top Header -->
      <g transform="translate(200, 80)" text-anchor="middle">
        <text y="0" fill="white" fill-opacity="0.6" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" letter-spacing="1.5">${displayClass}</text>
        <text y="35" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900">${displaySubject}</text>
      </g>

      <!-- Center Mascot Crest -->
      <g transform="translate(200, 240)" text-anchor="middle">
        <circle cx="0" cy="0" r="45" fill="white" fill-opacity="0.06" stroke="white" stroke-opacity="0.15" stroke-width="2" />
        <path d="M-18,-8 L0,-18 L18,-8 L18,12 L0,22 L-18,12 Z" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M0,-18 L0,22" fill="none" stroke="white" stroke-dasharray="2,2" stroke-width="2" />
      </g>

      <!-- Bottom Card Info -->
      <rect x="40" y="380" width="320" height="110" rx="18" fill="#020617" fill-opacity="0.75" stroke="white" stroke-opacity="0.05" stroke-width="1.5" />
      <text x="60" y="425" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800">${displayTitle}</text>
      <text x="60" y="458" fill="white" fill-opacity="0.4" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" letter-spacing="1.2">UTKAL TEXTBOOK • ଉତ୍କଳ ପାଠ୍ୟପୁସ୍ତକ</text>
    </svg>
  `;

  try {
    const utf8Bytes = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    const base64Svg = btoa(utf8Bytes);
    return `data:image/svg+xml;base64,${base64Svg}`;
  } catch (e) {
    console.error("Failed to base64 encode SVG textbook cover:", e);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
};

interface PublicSeoPreviewProps {
  previewKey: string;
  language: 'en' | 'or';
  onBack: () => void;
}

export const PublicSeoPreview: React.FC<PublicSeoPreviewProps> = ({ previewKey, language, onBack }) => {
  const cleanKey = previewKey.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

  const odiaClasses: Record<string, string> = {
    sishuvatika: "ଶିଶୁ ବାଟିକା",
    class1: "ପ୍ରଥମ ଶ୍ରେଣୀ",
    class2: "ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ",
    class3: "ତୃତୀୟ ଶ୍ରେଣୀ",
    class4: "ଚତୁର୍ଥ ଶ୍ରେଣୀ",
    class5: "ପଞ୍ଚମ ଶ୍ରେଣୀ",
    class6: "ଷଷ୍ଠ ଶ୍ରେଣୀ",
    class7: "ସପ୍ତମ ଶ୍ରେଣୀ",
    class8: "ଅଷ୍ଟମ ଶ୍ରେଣୀ",
    class9: "ନବମ ଶ୍ରେଣୀ",
    class10: "ଦଶମ ଶ୍ରେଣୀ"
  };

  const odiaSubjects: Record<string, string> = {
    shishu_vatika: "ଶିଶୁ ବାଟିକା ପାଠ୍ୟ",
    ganita_khela: "ଗଣିତ ଖେଳ",
    jhulana_1: "ଝୁଲଣା ୧",
    maja_majare_ganita: "ମଜା ମଜାରେ ଗଣିତ",
    jhulana_2: "ଝୁଲଣା ୨",
    bhasa_mahak_1: "ଭାଷା ମହକ ୧",
    ganita_mela: "ଗଣିତ ମେଳା",
    paribesa_patha: "ପରିବେଶ ପାଠ",
    pallavi: "ପଲ୍ଲବୀ ଇଂରାଜୀ",
    kala_sikhya: "କଳା ଶିକ୍ଷା",
    sharirika_sikhya: "ଶାରୀରିକ ଶିକ୍ଷା",
    bhasa_mahak_2: "ଭାଷା ମହକ ୨",
    krida_yoga: "କ୍ରୀଡ଼ା ଓ ଯୋଗ",
    bhasa_mahak_3: "ଭାଷା ମହକ ୩",
    ama_chaturbaswara_pruthibi: "ଆମ ଚର୍ତୁର୍ପାଶ୍ଵର ପୃଥିବୀ",
    sharirika_yoga: "ଶାରୀରିକ ଯୋଗ",
    ganita_prakas: "ଗଣିତ ପ୍ରକାଶ",
    sahitya_sudha: "ସାହିତ୍ୟ ସୁଧା",
    jigyasa: "ଜିଜ୍ଞାସା ବିଜ୍ଞାନ",
    samajika_bignana: "ସାମାଜିକ ବିଜ୍ଞାନ",
    jasmine: "ଜାସମିନ ଇଂରାଜୀ",
    hindi_kalika: "ହିନ୍ଦୀ କଳିକା",
    sanskritakalika_1: "ସଂସ୍କୃତ କଳିକା ୧",
    kausala_bodha: "କୌଶଳ ବୋଧ",
    kalakunja: "କଳାକୁଞ୍ଜ",
    khela_sikhya: "ଖେଳ ଶିକ୍ଷା",
    sahitya_suman: "ସାହିତ୍ୟ ସୁମନ",
    sanskritakalika_2: "ସଂସ୍କୃତ କଳିକା ୨",
    kalakruti: "କଳାକୃତି",
    sahitya_surabhi: "ସାହିତ୍ୟ ସୁରଭି",
    sanskritakalika_3: "ସଂସ୍କୃତ କଳିକା ୩",
    kruti: "କୃତି",
    algebra: "ବୀଜଗଣିତ",
    geometry: "ଜ୍ୟାମିତି",
    physical_science: "ଭୌତିକ ବିଜ୍ଞାନ",
    life_science: "ଜୀବ ବିଜ୍ଞାନ",
    social_science: "ଇତିହାସ",
    geography: "ଭୂଗୋଳ",
    english: "ଇଂରାଜୀ",
    english_grammar: "ଇଂରାଜୀ ବ୍ୟାକରଣ",
    odia: "ଓଡ଼ିଆ",
    odia_grammar: "ଓଡ଼ିଆ ବ୍ୟାକରଣ",
    sanskrit: "ସଂସ୍କୃତ",
    sanskrit_grammar: "ସଂସ୍କୃତ ବ୍ୟାକରଣ",
    hindi: "ହିନ୍ଦୀ",
    hindi_grammar: "ହିନ୍ଦୀ ବ୍ୟାକରଣ",
    vocational: "ବ୍ୟାବସାୟିକ ଶିକ୍ଷା"
  };

  const classSubjectsMap: Record<string, string[]> = {
    sishuvatika: ["shishu_vatika"],
    class1: ["ganita_khela", "jhulana_1"],
    class2: ["maja_majare_ganita", "jhulana_2"],
    class3: ["bhasa_mahak_1", "kala_sikhya", "ganita_mela", "paribesa_patha", "pallavi", "sharirika_sikhya"],
    class4: ["bhasa_mahak_2", "paribesa_patha", "ganita_mela", "kala_sikhya", "pallavi", "krida_yoga"],
    class5: ["bhasa_mahak_3", "ganita_mela", "kala_sikhya", "pallavi", "sharirika_yoga", "ama_chaturbaswara_pruthibi"],
    class6: ["samajika_bignana", "jigyasa", "kalakunja", "ganita_prakas", "sahitya_sudha", "khela_sikhya", "sanskritakalika_1", "kausala_bodha", "jasmine", "hindi_kalika"],
    class7: ["sahitya_suman", "kalakruti", "jigyasa", "samajika_bignana", "ganita_prakas", "hindi_kalika", "jasmine", "sanskritakalika_2", "kausala_bodha", "khela_sikhya"],
    class8: ["kruti", "samajika_bignana", "jigyasa", "jasmine", "ganita_prakas", "sahitya_surabhi", "sanskritakalika_3", "kausala_bodha", "hindi_kalika"],
    class9: ["life_science", "hindi", "english", "odia_grammar", "odia", "geometry", "algebra", "geography", "social_science", "physical_science", "english_grammar", "hindi_grammar", "sanskrit_grammar", "sanskrit"],
    class10: ["hindi_grammar", "algebra", "physical_science", "odia", "english_grammar", "social_science", "odia_grammar", "life_science", "hindi", "sanskrit_grammar", "sanskrit", "geography", "geometry", "english"]
  };

  // Resolve SEO parameters based on preview key
  let seoTitle = "";
  let seoDescription = "";
  let pageHeading = "";
  let renderContent: () => React.ReactNode = () => null;

  if (cleanKey.startsWith("directory_")) {
    const dir = cleanKey.replace("directory_", "");
    if (dir === "library") {
      seoTitle = "Odisha Board Public Digital Library (ଓଡ଼ିଆ ମାଧ୍ୟମ) | Utkal Skill Centre";
      seoDescription = "Access free textbook downloads, syllabus guides, revision notes, and exam practice papers for Classes 1 to 10 BSE Odisha in Odia Medium.";
      pageHeading = language === 'en' ? "Digital Library Directory" : "ଡିଜିଟାଲ୍ ଲାଇବ୍ରେରୀ ସୂଚୀ";
      renderContent = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Object.keys(classSubjectsMap).map((cls) => {
            const odiaName = odiaClasses[cls] || cls;
            const enName = cls === 'sishuvatika' ? 'Anganwadi' : `Class ${cls.replace('class', '')}`;
            return (
              <a
                key={cls}
                href={`?preview=class_${cls.replace('class', '')}`}
                className="glass-card p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-center flex flex-col justify-center items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                  <Lucide.BookOpen size={24} />
                </div>
                <h3 className="text-lg font-black text-white">{odiaName}</h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{enName}</span>
              </a>
            );
          })}
        </div>
      );
    } else if (dir === "games") {
      seoTitle = "Traditional Games of Odisha | Utkal Skill Centre";
      seoDescription = "Learn rules, history, and strategies of traditional board and school games in Odisha like Bagh Chheli, Puchi, Kaudi, and Rumal Chori.";
      pageHeading = language === 'en' ? "Traditional Games Directory" : "ପାରମ୍ପରିକ ଖେଳ ସୂଚୀ";
      const games = [
        { id: "baghchheli", nameEn: "Bagh Chheli", nameOr: "ବାଘ ଛେଳି" },
        { id: "puchi", nameEn: "Puchi", nameOr: "ପୁଚି" },
        { id: "kaudi", nameEn: "Kaudi", nameOr: "କାଉଡ଼ି" },
        { id: "luchakali", nameEn: "Luchakali", nameOr: "ଲୁଚକาଳି" },
        { id: "rumalchori", nameEn: "Rumal Chori", nameOr: "ରୁମାଲ୍ ଚୋରି" },
        { id: "bahiprustha", nameEn: "Bahi Prustha", nameOr: "ବହି ପୃଷ୍ଠା" }
      ];
      renderContent = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {games.map((g) => (
            <a
              key={g.id}
              href={`?preview=game_${g.id}`}
              className="glass-card p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-center flex flex-col justify-center items-center gap-3 cursor-pointer"
            >
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
                <Lucide.Gamepad2 size={24} />
              </div>
              <h3 className="text-lg font-black text-white">{g.nameOr}</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{g.nameEn}</span>
            </a>
          ))}
        </div>
      );
    } else if (dir === "tools") {
      seoTitle = "AI school & Educator Tools Showcase | Utkal Skill Centre";
      seoDescription = "Boost digital classroom learning with Gundulu AI Tutor, Math Blackboard equation solvers, and OSEPA lesson planner tool outlines.";
      pageHeading = language === 'en' ? "AI Learning Tools Directory" : "AI ଶିକ୍ଷଣ ଉପକରଣ ସୂଚୀ";
      const tools = [
        { id: "gundulututor", nameEn: "Gundulu AI Doubt Solver", nameOr: "ଗୁଣ୍ଡୁଚି AI ସନ୍ଦେହ ସମାଧାନ" },
        { id: "mathblackboard", nameEn: "Math Blackboard", nameOr: "ଗଣିତ ବ୍ଲାକବୋର୍ଡ" },
        { id: "osepaplanner", nameEn: "OSEPA Lesson Planner", nameOr: "ପାଠ୍ୟ ଯୋଜନା ପ୍ରସ୍ତୁତକାରୀ" },
        { id: "aiworksheet", nameEn: "AI Worksheet Generator", nameOr: "AI କାର୍ଯ୍ୟପତ୍ର ଜେନେରେଟର" },
        { id: "homeworkhelper", nameEn: "Homework doubt Helper", nameOr: "ଗୃହକାର୍ଯ୍ୟ ସନ୍ଦେହ ସହାୟକ" }
      ];
      renderContent = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {tools.map((t) => (
            <a
              key={t.id}
              href={`?preview=tool_${t.id}`}
              className="glass-card p-6 rounded-3xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-center flex flex-col justify-center items-center gap-3 cursor-pointer"
            >
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                <Lucide.Sparkles size={24} />
              </div>
              <h3 className="text-lg font-black text-white">{t.nameOr}</h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.nameEn}</span>
            </a>
          ))}
        </div>
      );
    } else if (dir === "districts") {
      seoTitle = "Odisha School Districts Learning Analytics | Utkal Skill Centre";
      seoDescription = "View progress report cards, district-wide leaderboard scores, and school rankings across all 30 educational districts of Odisha.";
      pageHeading = language === 'en' ? "Odisha Districts Directory" : "ଓଡ଼ିଶା ଜିଲ୍ଲା ସୂଚୀ";
      const districts = [
        'cuttack', 'khordha', 'ganjam', 'bhadrak', 'balasore', 'puri', 'jajpur', 'dhenkanal', 
        'sundargarh', 'mayurbhanj', 'sambalpur', 'angul', 'bargarh', 'bolangir', 'deogarh', 
        'gajapati', 'jagatsinghpur', 'jharsuguda', 'kalahandi', 'kandhamal', 'kendrapara', 
        'keonjhar', 'koraput', 'malkangiri', 'nabarangpur', 'nayagarh', 'nuapada', 'rayagada', 
        'subarnapur', 'boudh'
      ];
      renderContent = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {districts.map((d) => (
            <a
              key={d}
              href={`?preview=district_${d}`}
              className="glass-card p-4 rounded-2xl border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all text-center cursor-pointer font-bold text-xs capitalize text-slate-400 hover:text-white"
            >
              {d} ➔
            </a>
          ))}
        </div>
      );
    }
  } else if (cleanKey.startsWith("class_")) {
    const classId = cleanKey.replace("class_", "");
    const fullClassKey = classId === 'sishuvatika' ? 'sishuvatika' : `class${classId}`;
    const odiaName = odiaClasses[fullClassKey] || classId;
    const enName = classId === 'sishuvatika' ? 'Anganwadi (Shishu Vatika)' : `Class ${classId}`;
    
    seoTitle = `BSE Odisha ${enName} Books & Revision Notes (${odiaName}) | Utkal Skill Centre`;
    seoDescription = `Browse free revision notes, textbook download options, formulas sheets, and quiz banks for BSE Odisha ${enName} (${odiaName}) in Odia Medium.`;
    pageHeading = `${odiaName} - ${enName}`;

    const subjects = classSubjectsMap[fullClassKey] || [];
    renderContent = () => (
      <div className="space-y-8">
        <p className="text-slate-400 font-medium text-center">
          {language === 'en' 
            ? `Click any subject below to download textbooks and view bilingual study revision worksheets.`
            : `ପାଠ୍ୟପୁସ୍ତକ ଡାଉନଲୋଡ୍ କରିବା ଏବଂ ବିଷୟଭିତ୍ତିକ ନୋଟ୍ ଦେଖିବା ପାଇଁ ନିମ୍ନଲିଖିତ ଯେକୌଣସି ବିଷୟ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ |`}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {subjects.map((sub) => {
            const odiaSub = odiaSubjects[sub] || sub;
            const bookTitle = `${enName} ${odiaSub}`;
            return (
              <a
                key={sub}
                href={`?preview=book_${fullClassKey}_${sub}`}
                className="group relative bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/60 hover:shadow-[0_15px_35px_rgba(16,185,129,0.1)] transition-all duration-300 flex flex-col cursor-pointer"
              >
                <div className="aspect-[3/4] relative overflow-hidden bg-slate-950/80 m-4 mb-0 rounded-2xl border border-white/5 shadow-xl shadow-black/40">
                  <img 
                    src={getGenerativeTextbookCover(fullClassKey, sub, bookTitle)} 
                    alt={bookTitle}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-base font-extrabold text-white group-hover:text-emerald-400 transition-colors duration-300">
                    {odiaSub}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                    {sub.replace(/_/g, ' ')}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    );
  } else if (cleanKey.startsWith("book_")) {
    const parts = cleanKey.split('_');
    const bookClass = parts[1]; // class10
    const bookSubject = parts[2]; // algebra
    const odiaClassName = odiaClasses[bookClass] || bookClass;
    const odiaSubName = odiaSubjects[bookSubject] || bookSubject;
    const enClass = bookClass === 'sishuvatika' ? 'Anganwadi' : `Class ${bookClass.replace('class', '')}`;

    seoTitle = `BSE Odisha ${enClass} ${bookSubject} Book PDF & Chapter Notes | Utkal Skill Centre`;
    seoDescription = `Download direct PDF of BSE Odisha ${enClass} ${odiaSubName} (${odiaClassName}) textbook and explore chapter revision worksheets bilingually.`;
    pageHeading = `${odiaClassName} • ${odiaSubName}`;

    const chapters = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6'];
    const bookTitle = `${enClass} ${odiaSubName}`;
    renderContent = () => (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        <div className="md:col-span-2 flex flex-col items-center gap-6">
          <div className="aspect-[3/4] w-full max-w-[280px] bg-slate-950/80 rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl shadow-black/60 relative">
            <img 
              src={getGenerativeTextbookCover(bookClass, bookSubject, bookTitle)} 
              alt={bookTitle} 
              className="w-full h-full object-cover" 
            />
          </div>
          <button 
            onClick={onBack}
            className="w-full max-w-[280px] py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.25)]"
          >
            <Lucide.Download size={16} />
            <span>{language === 'en' ? 'Download Full PDF' : 'ସମ୍ପୂର୍ଣ୍ଣ PDF ଡାଉନଲୋଡ୍'}</span>
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <h3 className="text-lg font-black text-white border-b border-white/5 pb-2">
            {language === 'en' ? 'Chapter Revision Outlines' : 'ଅଧ୍ୟାୟ ପ୍ରସ୍ତୁତି ନୋଟ୍'}
          </h3>
          <div className="space-y-3">
            {chapters.map((ch, idx) => (
              <a
                key={ch}
                href={`?preview=chapter_${bookClass}_${bookSubject}_${ch}`}
                className="flex items-center justify-between p-4 bg-white/2 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 rounded-2xl transition-all cursor-pointer text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-400">
                    {idx + 1}
                  </span>
                  <span className="font-extrabold text-sm capitalize">
                    {language === 'en' ? `Chapter ${idx + 1} Guide` : `ଅଧ୍ୟାୟ ${idx + 1} ର ଗାଇଡ୍`}
                  </span>
                </div>
                <Lucide.ChevronRight size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  } else if (cleanKey.startsWith("chapter_")) {
    const parts = cleanKey.split('_');
    const chapClass = parts[1]; // class10
    const chapSubject = parts[2]; // algebra
    const chapSlug = parts.slice(3).join('_'); // quadraticequations

    const odiaClassName = odiaClasses[chapClass] || chapClass;
    const odiaSubName = odiaSubjects[chapSubject] || chapSubject;

    const selectedPreview = previewDatabase[chapSlug] || {
      title: `${odiaSubName} Chapter Revision Guide (${odiaClassName}) | Utkal Skill Centre`,
      description: `Exam revision sheets, formulas, key concepts, and selection questions for ${odiaSubName} chapter in Odia medium.`,
      content: `## ${odiaSubName} - ${chapSlug.toUpperCase()}
      
Welcome to the public revision notes portal for **${odiaClassName} ${odiaSubName}**. This chapter guide provides important exam-focused points, formulas, and textbook summaries.

---

### Key Takeaways (ମୁଖ୍ୟ ବିଷୟବସ୍ତୁ)
* Designed bilingually in English and standard Odia (ଓଡ଼ିଆ ମାଧ୍ୟମ) to facilitate easy reading.
* Full study notes, syllabus tracking, and chapter-wise mock examinations are unlocked inside the dashboard.
* Ask any academic doubt instantly with Gundulu AI tutor.`
    };

    seoTitle = selectedPreview.title;
    seoDescription = selectedPreview.description;
    pageHeading = selectedPreview.title.split(' | ')[0];

    renderContent = () => (
      <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed space-y-6">
        <ReactMarkdown>{cleanMathNotation(selectedPreview.content)}</ReactMarkdown>
      </div>
    );
  } else if (cleanKey.startsWith("game_")) {
    const gameId = cleanKey.replace("game_", "");
    const gameMap: Record<string, { nameEn: string, nameOr: string, rules: string }> = {
      baghchheli: {
        nameEn: "Bagh Chheli (Tigers & Goats)",
        nameOr: "ବାଘ ଛେଳି",
        rules: "A traditional strategy game played with 4 tigers and 20 goats on a grid. Tigers capture goats by jumping over them; goats win by trapping all tigers so they cannot move."
      },
      puchi: {
        nameEn: "Puchi (Odisha Squat Hop)",
        nameOr: "ପୁଚି",
        rules: "A traditional squatting game played mostly by girls. Players squat and kick their legs out sequentially in rhythm. The player who maintains balance the longest wins."
      },
      kaudi: {
        nameEn: "Kaudi (Shell Board Game)",
        nameOr: "କାଉଡ଼ି",
        rules: "A traditional shell board game. Players roll cowry shells to determine move counts and move their pieces along a path to the center home."
      },
      luchakali: {
        nameEn: "Luchakali (Hide and Seek)",
        nameOr: "ଲୁଚକାଳି",
        rules: "The classic hide and seek game. One player closes their eyes and counts while others hide. The seeker must find everyone to win."
      },
      rumalchori: {
        nameEn: "Rumal Chori (Handkerchief Theft)",
        nameOr: "ରୁମାଲ୍ ଚୋରି",
        rules: "Players sit in a circle facing inward. The thief walks around the circle and secretly drops a handkerchief behind a player, who must chase the thief before they sit in the empty spot."
      },
      bahiprustha: {
        nameEn: "Bahi Prustha (Book Page Cricket)",
        nameOr: "ବହି ପୃଷ୍ଠା",
        rules: "A classic classroom game where players flip random pages of a textbook. The last digit of the page number represents runs scored (e.g. page 128 = 8 runs, page 120 = wicket)."
      }
    };

    const game = gameMap[gameId] || { nameEn: "Odia Game", nameOr: "ଓଡ଼ିଆ ଖେଳ", rules: "Explore traditional board and outdoor games of Odisha." };

    seoTitle = `${game.nameEn} Rules & Play Guide | Utkal Skill Centre`;
    seoDescription = `Learn standard rules, history, and strategies of the traditional Odisha game ${game.nameEn} (${game.nameOr}). Play traditional games digitally on Utkal Skill Centre.`;
    pageHeading = `${game.nameOr} - ${game.nameEn}`;

    renderContent = () => (
      <div className="space-y-6 text-slate-300 font-medium leading-relaxed">
        <div className="p-6 bg-white/2 border border-white/5 rounded-2xl">
          <h3 className="text-white font-bold text-lg mb-3">
            {language === 'en' ? 'Standard Rules & Gameplay' : 'ଖେଳର ନିୟମାବଳୀ'}
          </h3>
          <p>{game.rules}</p>
        </div>
        <p className="text-center font-medium text-slate-400">
          {language === 'en' 
            ? "This game is digitized on the Utkal Skill Centre dashboard with real-time multiplayer support, sound effects, and digital boards. Log in to play against computer or friends!"
            : "ଏହି ପାରମ୍ପରିକ ଖେଳଟି ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର ଡ୍ୟାସବୋର୍ଡରେ ଡିଜିଟାଇଜ୍ କରାଯାଇଛି | କମ୍ପ୍ୟୁଟର କିମ୍ବା ସାଙ୍ଗମାନଙ୍କ ସହିତ ଖେଳିବା ପାଇଁ ଲଗ୍ ଇନ୍ କରନ୍ତୁ!"}
        </p>
      </div>
    );
  } else if (cleanKey.startsWith("tool_")) {
    const toolId = cleanKey.replace("tool_", "");
    const toolsMap: Record<string, { nameEn: string, nameOr: string, desc: string }> = {
      gundulututor: {
        nameEn: "Gundulu AI Tutor",
        nameOr: "ଗୁଣ୍ଡୁଚି AI ଟ୍ୟୁଟର",
        desc: "Meet Gundulu, your custom AI doubt solver that explains complex math equations and science concepts in friendly Odia and English, tailored specifically for the BSE Odisha board syllabus."
      },
      mathblackboard: {
        nameEn: "Math Blackboard Solver",
        nameOr: "ଗଣିତ ବ୍ଲାକବୋର୍ଡ ସଲଭର",
        desc: "Draw or paste your algebra and geometry problems directly onto our smart blackboard and get step-by-step verified explanations in standard Odia medium."
      },
      osepaplanner: {
        nameEn: "OSEPA Lesson Planner",
        nameOr: "OSEPA ପାଠ୍ୟ ଯୋଜନା ପ୍ରସ୍ତୁତକାରୀ",
        desc: "An AI-powered teaching assistant for Odisha educators to generate OSEPA compliant lesson plans, syllabus structures, and daily diaries instantly."
      },
      aiworksheet: {
        nameEn: "AI Worksheet Generator",
        nameOr: "AI କାର୍ଯ୍ୟପତ୍ର ଜେନେରେଟର",
        desc: "Allows teachers and parent tutors to generate custom topic-wise revision worksheets, MCQ quizzes, and answer sheets with one click."
      },
      homeworkhelper: {
        nameEn: "Homework doubt Helper",
        nameOr: "ଗୃହକାର୍ଯ୍ୟ ସନ୍ଦେହ ସହାୟକ",
        desc: "Snap a photo of your school homework questions and get immediate context-aware explanations, formulas, and similar practice questions in Odia."
      }
    };

    const tool = toolsMap[toolId] || { nameEn: "AI Learning Tool", nameOr: "AI ଶିକ୍ଷଣ ଉପକରଣ", desc: "AI tools built for Odisha medium schools." };

    seoTitle = `${tool.nameEn} | Utkal Skill Centre`;
    seoDescription = `${tool.desc} Try Gundulu school AI tools for free in Odisha.`;
    pageHeading = `${tool.nameOr} - ${tool.nameEn}`;

    renderContent = () => (
      <div className="space-y-6 text-slate-300 font-medium leading-relaxed">
        <div className="p-6 bg-white/2 border border-white/5 rounded-2xl">
          <h3 className="text-white font-bold text-lg mb-3">
            {language === 'en' ? 'About this AI Tool' : 'ଉପକରଣ ବିଷୟରେ'}
          </h3>
          <p>{tool.desc}</p>
        </div>
      </div>
    );
  } else if (cleanKey.startsWith("district_")) {
    const dist = cleanKey.replace("district_", "");
    seoTitle = `${dist.toUpperCase()} District School Leaderboards | Utkal Skill Centre`;
    seoDescription = `Track top student quiz leaders, school progress reports, and regional leaderboards for the ${dist} educational district in Odisha.`;
    pageHeading = `${dist.toUpperCase()} District`;

    renderContent = () => (
      <div className="space-y-6 text-slate-300 font-medium leading-relaxed">
        <div className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-white font-bold text-lg">
            {language === 'en' ? `School Progress Report: ${dist.toUpperCase()}` : `${dist.toUpperCase()} ଜିଲ୍ଲା ସ୍କୁଲ୍ ରିପୋର୍ଟ`}
          </h3>
          <p>
            {language === 'en' 
              ? `Currently, schools in ${dist.toUpperCase()} have completed over 85% of their syllabus revision guides. Real-time quiz challenges and leaderboards are updated daily.`
              : `${dist.toUpperCase()} ଜିଲ୍ଲାର ବିଦ୍ୟାଳୟଗୁଡ଼ିକ ମଧ୍ୟରେ କୁଇଜ୍ ପ୍ରତିଯୋଗିତା ଏବଂ ଦୈନିକ ରାଙ୍କିଙ୍ଗ୍ ଚାଲିଅଛି |`}
          </p>
        </div>
      </div>
    );
  } else {
    const dbPreview = previewDatabase[cleanKey];
    if (dbPreview) {
      seoTitle = dbPreview.title;
      seoDescription = dbPreview.description;
      pageHeading = dbPreview.title.split(' | ')[0];
      renderContent = () => (
        <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed space-y-6">
          <ReactMarkdown>{cleanMathNotation(dbPreview.content)}</ReactMarkdown>
        </div>
      );
    } else {
      const readableKey = previewKey.replace(/([A-Z])/g, ' $1').trim();
      seoTitle = `${readableKey} Revision Guide (BSE Odisha) | Utkal Skill Centre`;
      seoDescription = `Get free study guides and selection questions for ${readableKey} in Odia medium. Access free school learning books on Utkal Skill Centre.`;
      pageHeading = readableKey;
      renderContent = () => (
        <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed space-y-6">
          <p>
            Welcome to the public revision notes portal for **{readableKey}**. 
            This chapter guide provides exam-focused points, formulas, and textbook summaries.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Designed bilingually in English and standard Odia to facilitate easy reading.</li>
            <li>Full study notes and mock tests are unlocked inside the dashboard.</li>
            <li>Solve doubts instantly with Gundulu AI tutor.</li>
          </ul>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-200 relative overflow-x-hidden font-sans p-4 sm:p-8 flex flex-col items-center w-full">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        subject={previewKey}
      />
      
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-purple-500 to-indigo-500" />
      <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Premium Logo Header */}
      <div className="w-full max-w-4xl flex justify-between items-center py-6 border-b border-white/5 mb-8">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-black text-emerald-400 text-lg shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            U
          </div>
          <div>
            <h1 className="text-md font-black text-white leading-none tracking-tight">UTKAL</h1>
            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em]">Skill Centre</span>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          Sign Up For Free ➔
        </button>
      </div>

      {/* Content Body */}
      <main className="w-full max-w-4xl space-y-8 flex-1">
        <div className="glass-card rounded-[32px] p-6 sm:p-10 border border-white/5 relative overflow-hidden shadow-2xl bg-slate-900/40 backdrop-blur-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Free Public Lesson Preview (ଓଡ଼ିଆ ମାଧ୍ୟମ)
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-8">
            {pageHeading}
          </h2>

          <div className="mt-4">
            {renderContent()}
          </div>

          {/* Conversion CTA Box */}
          <div className="mt-12 p-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-indigo-500/10 text-center space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-pulse" style={{ animationDuration: '6s' }} />
            
            <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
              Join 1 Lakh+ Odisha Medium Students! 🏆
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed font-bold">
              Get instant access to complete textbooks, bilingual revision cards, daily selection MCQs, and resolve all your math & science doubts instantly with your personalized AI study buddy **Gundulu**!
            </p>
            <button
              onClick={onBack}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Unlock Full Chapter & AI Buddy Free! 🟢
            </button>
          </div>
        </div>

        {/* Related guides list */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Popular Odia Medium Resources</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'directory_library', name: 'Digital Library Directory / ପାଠ୍ୟପୁସ୍ତକ ସୂଚୀ' },
              { key: 'directory_games', name: 'Traditional Games / ଓଡ଼ିଶା ପାରମ୍ପରିକ ଖେଳ' },
              { key: 'directory_tools', name: 'AI Study Tools / AI ଶିକ୍ଷଣ ଉପକରଣ' },
              { key: 'class_10', name: 'Class 10 Syllabus / ଦଶମ ଶ୍ରେଣୀ ପାଠ୍ୟକ୍ରମ' },
              { key: 'game_baghchheli', name: 'Bagh Chheli Game / ବାଘ ଛେଳି ନିୟମ' }
            ]
            .filter(item => item.key.toLowerCase() !== cleanKey)
            .map((item) => (
              <a
                key={item.key}
                href={`?preview=${item.key}`}
                className="p-4 rounded-2xl border border-white/5 bg-white/2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all font-bold text-xs text-slate-400 hover:text-white"
              >
                {item.name} ➔
              </a>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-4xl py-12 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] border-t border-white/5 mt-16">
        {language === 'or' 
          ? '© ୨୦୨୬ ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର • ଓଡ଼ିଶା ରାଜ୍ୟ ବୋର୍ଡ ଶ୍ରେଣୀ ୧ ରୁ ୧୦ ପାଇଁ ନିର୍ମିତ' 
          : '© 2026 Utkal Skill Centre • Built for Odisha State Board Class 1 to 10'}
      </footer>
    </div>
  );
};
