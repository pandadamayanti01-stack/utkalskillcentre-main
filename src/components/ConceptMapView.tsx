import React, { useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { motion } from 'framer-motion';
import { getPremiumConceptMapUrl } from '../data/conceptMapsRegistry';

interface Chapter {
  id: string;
  title: string;
  title_en?: string;
  title_or?: string;
  notes?: string;
  subject?: string;
}

interface ConceptMapViewProps {
  chapter: Chapter;
  language: 'en' | 'or';
  isPremium: boolean;
  onUpgrade?: () => void;
  onAskGundulu: (query: string) => void;
}

interface OverlayNode {
  labelEn: string;
  labelOr: string;
  top: string;
  left: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}

const PREMIUM_OVERLAYS: Record<string, OverlayNode[]> = {
  'Vx3FQK8ZAl67KwvDi1Iy': [
    { labelEn: "Photosynthesis Overview", labelOr: "ଆଲୋକଶ୍ଳେଷଣ ସାରାଂଶ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Carbon Dioxide (CO2)", labelOr: "ଅଙ୍ଗାରକାମ୍ଳ (CO2)", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Water (H2O)", labelOr: "ଜଳ (H2O)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Chloroplast (Chlorophyll)", labelOr: "ହରିତ୍‌କଣା (ହରିତକାଣ)", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Light Reaction (Grana)", labelOr: "ଆଲୋକ ପ୍ରକ୍ରିୟା (ଗ୍ରାନା)", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Dark Reaction (Stroma)", labelOr: "ଅନ୍ଧକାର ପ୍ରକ୍ରିୟା (ଷ୍ଟ୍ରୋମା)", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Glucose & Oxygen (O2)", labelOr: "ଗ୍ଲୁକୋଜ୍ ଏବଂ ଅମ୍ଳଜାନ (O2)", top: '85%', left: '50%', color: 'emerald' }
  ],
  'CUQwtkjyKesVfAtJYiky': [
    { labelEn: "Chemical Equations", labelOr: "ରାସାୟନିକ ସମୀକରଣ", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Reactants", labelOr: "ପ୍ରତିକାରକ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Combination Reaction", labelOr: "ସଂଶ୍ଳେଷଣ ପ୍ରତିକ୍ରିୟା", top: '65%', left: '20%', color: 'emerald' },
    { labelEn: "Reaction Conditions", labelOr: "ପ୍ରତିକ୍ରିୟା ସର୍ତ୍ତାବଳୀ", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Products", labelOr: "ଉତ୍ପାଦ", top: '30%', left: '80%', color: 'blue' },
    { labelEn: "Decomposition Reaction", labelOr: "ବିଘଟନ ପ୍ରତିକ୍ରିୟା", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Displacement & Redox", labelOr: "ବିସ୍ଥାପନ ଓ ଜାରଣ-ବିଜାରଣ", top: '85%', left: '50%', color: 'amber' }
  ],
  'BkI12z7DPpAaIozm4bKH': [
    { labelEn: "Electric Circuit", labelOr: "ବିଦ୍ୟୁତ୍ ପରିପଥ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Electric Current (I)", labelOr: "ବିଦ୍ୟୁତ୍ ସ୍ରୋତ (I)", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "Voltage / Potential (V)", labelOr: "ବିଭବାନ୍ତର (V)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Ohm's Law (V = IR)", labelOr: "ଓମ୍‌ଙ୍କ ନିୟମ (V = IR)", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Resistance (R)", labelOr: "ପ୍ରତିରୋଧ (R)", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Series / Parallel Resistors", labelOr: "ଶ୍ରେଣୀ ଓ ସମାନ୍ତରାଳ ସଂଯୋଗ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Heating Effect", labelOr: "ତାପୀୟ ପ୍ରଭାବ", top: '85%', left: '50%', color: 'amber' }
  ],
  '5n7Dg8pphGZT8XG2xKHW': [
    { labelEn: "Acids, Bases & Salts", labelOr: "ଅମ୍ଳ, କ୍ଷାରକ ଓ ଲବଣ", top: '10%', left: '50%', color: 'emerald' },
    { labelEn: "Acids (pH < 7)", labelOr: "ଅମ୍ଳ (pH < ୭)", top: '30%', left: '20%', color: 'amber' },
    { labelEn: "pH Indicators", labelOr: "pH ସୂଚକ", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Neutralization", labelOr: "ପ୍ରଶମନ ପ୍ରତିକ୍ରିୟା", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Bases (pH > 7)", labelOr: "କ୍ଷାରକ (pH > ୭)", top: '30%', left: '80%', color: 'emerald' },
    { labelEn: "Salts & Properties", labelOr: "ଲବଣ ଓ ଗୁଣଧର୍ମ", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Chlor-Alkali Process", labelOr: "କ୍ଲୋର-ଆଲକାଲି ପ୍ରଣାଳୀ", top: '85%', left: '50%', color: 'amber' }
  ],
  'hN2uO4iyaCERFcPLmran': [
    { labelEn: "Metals & Non-Metals", labelOr: "ଧାତୁ ଓ ଅଧାତୁ", top: '10%', left: '50%', color: 'blue' },
    { labelEn: "Physical Properties", labelOr: "ଭୌତିକ ଧର୍ମ", top: '30%', left: '20%', color: 'blue' },
    { labelEn: "Reactivity Series", labelOr: "ପ୍ରତିକ୍ରିୟାଶୀଳତା ଶ୍ରେଣୀ", top: '65%', left: '20%', color: 'amber' },
    { labelEn: "Ionic Bonding", labelOr: "ଆୟୋନିକ୍ ବନ୍ଧନ", top: '48%', left: '50%', color: 'emerald' },
    { labelEn: "Chemical Properties", labelOr: "ରାସାୟନିକ ଧର୍ମ", top: '30%', left: '80%', color: 'purple' },
    { labelEn: "Extraction of Metals", labelOr: "ଧାତୁ ନିଷ୍କାସନ", top: '65%', left: '80%', color: 'purple' },
    { labelEn: "Corrosion Prevention", labelOr: "କ୍ଷୟୀଭବନ ପ୍ରତିରୋଧ", top: '85%', left: '50%', color: 'emerald' }
  ],
  'vfXYwB9Po1rB4Aty4q3Y': [
    { labelEn: "Carbon Compounds", labelOr: "କାର୍ବନ ଯୌଗିକ", top: '10%', left: '50%', color: 'amber' },
    { labelEn: "Covalent Bonding", labelOr: "ସହସଂଯୋଜକ ବନ୍ଧନ", top: '30%', left: '20%', color: 'emerald' },
    { labelEn: "Saturated (Alkanes)", labelOr: "ସନ୍ତୃପ୍ତ (ଆଲକେନ୍)", top: '65%', left: '20%', color: 'blue' },
    { labelEn: "Allotropes (Diamond/Graphite)", labelOr: "ଅପରୂପ (ହୀରା/ଗ୍ରାଫାଇଟ୍)", top: '48%', left: '50%', color: 'purple' },
    { labelEn: "Functional Groups", labelOr: "କ୍ରିୟାତ୍ମକ ଗ୍ରୁପ୍", top: '30%', left: '80%', color: 'amber' },
    { labelEn: "Unsaturated (Alkenes/Alkynes)", labelOr: "ଅସନ୍ତୃପ୍ତ (ଆଲକିନ୍/ଆଲକାଇନ୍)", top: '65%', left: '80%', color: 'blue' },
    { labelEn: "Soap & Detergents", labelOr: "ସାବୁନ୍ ଏବଂ ଡିଟରଜେଣ୍ଟ୍", top: '85%', left: '50%', color: 'emerald' }
  ]
};

export const ConceptMapView: React.FC<ConceptMapViewProps> = ({
  chapter,
  language,
  isPremium,
  onUpgrade,
  onAskGundulu,
}) => {
  const premiumUrl = useMemo(() => {
    return getPremiumConceptMapUrl(chapter.id, language);
  }, [chapter.id, language]);

  const overlays = useMemo(() => {
    return PREMIUM_OVERLAYS[chapter.id] || [];
  }, [chapter.id]);

  // Clean chapter title for display
  const displayTitle = useMemo(() => {
    if (typeof chapter.title === 'string') {
      return (language === 'en' ? chapter.title_en : chapter.title_or) || chapter.title;
    }
    return (chapter.title as any)?.[language] || (chapter.title as any)?.or || (chapter.title as any)?.en || "Concept Map";
  }, [chapter.title, chapter.title_en, chapter.title_or, language]);

  // Extract headings from notes
  const subtopics = useMemo(() => {
    const notesText = chapter.notes || '';
    if (!notesText.trim()) {
      return getDefaultConcepts(displayTitle, language);
    }

    // Regex to capture markdown headings (e.g. ## Heading, ### Heading)
    const headingRegex = /^#{2,3}\s+(.+)$/gm;
    const extracted: string[] = [];
    let match;

    while ((match = headingRegex.exec(notesText)) !== null) {
      let text = match[1].trim();
      // Remove any markdown styling (bold, italics, code)
      text = text.replace(/[*_`]/g, '');
      // Remove LaTeX expressions from the title
      text = text.replace(/\$.*?\$/g, '');
      text = text.replace(/\\.*?\s/g, '');
      if (text && text.length > 3 && text.length < 50 && !extracted.includes(text)) {
        extracted.push(text);
      }
    }

    if (extracted.length >= 3) {
      return extracted.slice(0, 6); // Limit to 6 subtopics to prevent layout clutter
    }

    // Fallback: parse bullet points if no headings are present
    const bulletRegex = /^\s*[-*+]\s+([^#\n]+)$/gm;
    const bulletMatches: string[] = [];
    while ((match = bulletRegex.exec(notesText)) !== null) {
      let text = match[1].trim();
      text = text.replace(/[*_`]/g, '');
      if (text && text.length > 5 && text.length < 40 && !bulletMatches.includes(text)) {
        bulletMatches.push(text);
      }
    }

    if (bulletMatches.length >= 3) {
      return bulletMatches.slice(0, 6);
    }

    return getDefaultConcepts(displayTitle, language);
  }, [chapter.notes, displayTitle, language]);

  // Central point coordinate in coordinates space of 800 x 600 (exact 4:3 aspect ratio)
  const CX = 400;
  const CY = 300;
  const R = 185; // Radius of outer circle arrangement

  const nodes = useMemo(() => {
    const n = subtopics.length;
    return subtopics.map((topic, i) => {
      // Offset by -pi/2 so first node starts at the top
      const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
      return {
        id: `node_${i}`,
        label: topic,
        x: CX + R * Math.cos(angle),
        y: CY + R * Math.sin(angle),
      };
    });
  }, [subtopics]);

  const handleNodeClick = (topic: string) => {
    const query = language === 'en'
      ? `Explain this topic from the chapter: "${topic}".`
      : `ଏହି ଅଧ୍ୟାୟରୁ ଏହି ବିଷୟଟି ବୁଝାଅ: "${topic}"।`;
    onAskGundulu(query);

    // Scroll to Gundulu chatbot sidebar on mobile viewports
    setTimeout(() => {
      const chatSidebar = document.getElementById('gundulu-chat-sidebar');
      if (chatSidebar) {
        chatSidebar.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  if (premiumUrl) {
    return (
      <div className="w-full flex flex-col items-center gap-6 relative">
        {/* Banner header */}
        <div className="text-center space-y-1">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            {language === 'en' ? 'Premium Infographic Map' : 'ପ୍ରିମିୟମ ଚିତ୍ରାତ୍ମକ ସାରାଂଶ'}
          </span>
          <h3 className="text-base md:text-lg font-black text-white">{displayTitle}</h3>
        </div>

        {/* Display the chapter's custom premium concept map */}
        <div className="relative max-w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950 p-2 shadow-2xl group flex items-center justify-center">
          <div className="relative inline-block">
            <img
              src={premiumUrl}
              alt={`${displayTitle} Concept Map`}
              className={`max-h-[70vh] w-auto object-contain rounded-xl shadow-lg border border-white/5 transition-transform duration-500 ${
                isPremium ? 'group-hover:scale-[1.01]' : 'blur-md opacity-40 pointer-events-none select-none'
              }`}
            />
            {/* HTML Overlay Layer */}
            {isPremium && overlays.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {overlays.map((node, i) => {
                  const label = language === 'en' ? node.labelEn : node.labelOr;
                  const borderClass = {
                    emerald: 'border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
                    blue: 'border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
                    amber: 'border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
                    purple: 'border-purple-500/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)] hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  }[node.color];

                  return (
                    <button
                      key={i}
                      onClick={() => handleNodeClick(label)}
                      className={`absolute px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border text-[10px] sm:text-xs font-black tracking-wide whitespace-nowrap cursor-pointer pointer-events-auto hover:scale-105 active:scale-95 transition-all duration-300 hover:text-white ${borderClass}`}
                      style={{
                        top: node.top,
                        left: node.left,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent pointer-events-none" />

          {/* Premium Lock Overlay for Free Users */}
          {!isPremium && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/40 backdrop-blur-[2px] z-10">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 border border-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-4 animate-bounce">
                <Lucide.Crown size={28} className="fill-current" />
              </div>
              <h4 className="text-lg font-black text-white leading-tight mb-2 tracking-wide">
                {language === 'en' ? 'Unlock Premium Infographic Summary' : 'ପ୍ରିମିୟମ ଭିଜୁଆଲ୍ ସାରାଂଶ ଅନଲକ୍ କରନ୍ତୁ'}
              </h4>
              <p className="text-xs text-slate-300 font-bold max-w-sm leading-relaxed mb-6">
                {language === 'en'
                  ? 'Access high-resolution visual concept maps, cheat-sheets, and advanced animations for all chapters!'
                  : 'ସମସ୍ତ ଅଧ୍ୟାୟ ପାଇଁ ଆଇ କ୍ୟାଚିଂ ଚିତ୍ରାତ୍ମକ ସାରାଂଶ, ମୁଖ୍ୟ ସୂତ୍ର ଚିଟ୍-ସିଟ୍ ଏବଂ ଗୁନ୍ଦୁଲୁ ଆନିମେସନ୍ ର ମଜା ନିଅନ୍ତୁ!'}
              </p>
              {onUpgrade && (
                <button
                  onClick={onUpgrade}
                  className="px-6 py-3 rounded-2xl crystal-button-gold text-slate-950 font-black text-xs tracking-wider uppercase active:scale-95 transition-all shadow-lg flex items-center gap-2"
                >
                  <Lucide.Sparkles size={14} className="fill-current" />
                  <span>{language === 'en' ? 'Upgrade to Premium' : 'ପ୍ରିମିୟମକୁ ଅପଗ୍ରେଡ୍ କରନ୍ତୁ'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Interactive Focus Areas: Allows clicking topics to trigger Gundulu chat on premium maps */}
        <div className="w-full max-w-2xl bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <Lucide.Sparkles size={12} className="text-emerald-400" />
            <span>{language === 'en' ? 'Tutor Mode: Ask Gundulu Apa about a key concept' : 'ଟ୍ୟୁଟର ମୋଡ୍: ଗୁନ୍ଦୁଲୁ ଆପାଙ୍କୁ ଏହି ବିଷୟ ପଚାରନ୍ତୁ'}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {subtopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => {
                  if (isPremium) {
                    handleNodeClick(topic);
                  } else {
                    if (onUpgrade) onUpgrade();
                  }
                }}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl border transition-all active:scale-95 shadow-sm flex items-center gap-1.5 ${
                  isPremium
                    ? 'border-white/5 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/30 hover:text-white text-slate-300'
                    : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 hover:border-amber-500/30'
                }`}
              >
                {!isPremium && <Lucide.Lock size={10} className="text-amber-400" />}
                <span>{topic}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback interactive SVG mindmap layout
  return (
    <div className="w-full flex flex-col items-center gap-6 relative">
      <div className="text-center space-y-1">
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]">
          {language === 'en' ? 'Interactive Concept Map' : 'ପ୍ରଶ୍ନୋତ୍ତର ମାଇଣ୍ଡ୍-ମ୍ୟାପ୍'}
        </span>
        <h3 className="text-base md:text-lg font-black text-white">{displayTitle}</h3>
        <p className="text-[10px] sm:text-xs text-slate-400 font-bold max-w-md mx-auto">
          {language === 'en'
            ? "Click on any node to ask Gundulu Apa to explain the concept!"
            : "ଯେକୌଣସି ବବଲ୍ ଉପରେ କ୍ଲିକ୍ କରି ଗୁନ୍ଦୁଲୁ ଆପାଙ୍କୁ ସେହି ବିଷୟ ବୁଝାଇବା ପାଇଁ କୁହନ୍ତୁ!"}
        </p>
      </div>

      {/* SVG Mind Map Container */}
      <div className="w-full max-w-4xl aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950/80 border border-white/5 shadow-2xl relative force-dark-theme">
        <svg
          viewBox="0 0 800 600"
          width="100%"
          height="100%"
          className="select-none pointer-events-auto"
        >
          <defs>
            <filter id="svg-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <linearGradient id="center-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="connector-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Connection Lines & Flow Particles */}
          <g>
            {nodes.map((node) => (
              <g key={`connector_${node.id}`}>
                {/* Connector Line */}
                <line
                  x1={CX}
                  y1={CY}
                  x2={node.x}
                  y2={node.y}
                  stroke="url(#connector-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  className="opacity-70"
                />

                {/* Micro-animated flowing pulse particle */}
                <circle r="4" fill="#34d399" filter="url(#svg-glow)">
                  <animateMotion
                    dur={`${2.5 + Math.random() * 1.5}s`}
                    repeatCount="indefinite"
                    path={`M ${CX} ${CY} L ${node.x} ${node.y}`}
                  />
                </circle>
              </g>
            ))}
          </g>

          {/* Center Chapter Node */}
          <foreignObject
            x={CX - 85}
            y={CY - 60}
            width="170"
            height="120"
            className="overflow-visible"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full h-full p-4 rounded-3xl border-2 border-emerald-500 bg-slate-900/90 text-white shadow-[0_0_35px_rgba(16,185,129,0.35)] flex flex-col items-center justify-center text-center cursor-pointer select-none ring-1 ring-white/10"
              style={{ color: '#ffffff' }}
              onClick={() => handleNodeClick(displayTitle)}
            >
              <Lucide.BookOpen size={20} className="text-emerald-400 mb-1.5 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">
                {language === 'en' ? 'Core Topic' : 'ମୂଳ ବିଷୟ'}
              </span>
              <span className="text-xs md:text-sm font-black line-clamp-3 leading-snug text-white">
                {displayTitle}
              </span>
            </motion.div>
          </foreignObject>

          {/* Outer Subtopic Nodes */}
          {nodes.map((node) => (
            <foreignObject
              key={node.id}
              x={node.x - 70}
              y={node.y - 50}
              width="140"
              height="100"
              className="overflow-visible"
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="w-full h-full p-3 rounded-2xl border border-white/10 bg-slate-950/90 text-slate-200 shadow-lg hover:text-white hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all duration-300 ring-1 ring-white/5"
                style={{ color: '#e2e8f0' }}
                onClick={() => handleNodeClick(node.label)}
              >
                <span className="text-[10px] font-bold line-clamp-3 leading-tight text-slate-200">
                  {node.label}
                </span>
                <Lucide.ArrowUpRight size={10} className="text-slate-500 mt-1 opacity-0 hover:opacity-100 transition-opacity" />
              </motion.div>
            </foreignObject>
          ))}
        </svg>
      </div>
    </div>
  );
};

const getDefaultConcepts = (title: string, language: 'en' | 'or'): string[] => {
  if (language === 'en') {
    return [
      "Key Chapter Overview",
      "Definitions & Core Meanings",
      "Important Laws & Formulas",
      "Real-world Applications",
      "Solved Problems & Examples",
      "Chapter Summary Notes"
    ];
  } else {
    return [
      "ଅଧ୍ୟାୟର ମୁଖ୍ୟ ସାରାଂଶ",
      "ସଂଜ୍ଞା ଓ ମୌଳିକ ଅର୍ଥ",
      "ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ନିୟମ ଓ ସୂତ୍ର",
      "ବାସ୍ତବିକ ବ୍ୟବହାର ଓ ପ୍ରୟୋଗ",
      "ଉଦାହରଣ ଏବଂ ସମାଧାନ",
      "ଅଭ୍ୟାସ ପ୍ରଶ୍ନ ଓ ଉତ୍ତର"
    ];
  }
};
