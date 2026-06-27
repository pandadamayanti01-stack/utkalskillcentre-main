import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';

interface WinnerItem {
  id: string;
  rankText: string;
  names: string;
  medalColor: 'gold' | 'silver' | 'bronze' | 'scholar';
}

const DEFAULT_WINNERS: WinnerItem[] = [
  { id: '1', rankText: '୧ମ ସ୍ଥାନ (1st Rank)', names: 'Dibyansh Panda & Sohan Lenka', medalColor: 'gold' },
  { id: '2', rankText: '୨ୟ ସ୍ଥାନ (2nd Rank)', names: 'Rohan Kumar Lenka', medalColor: 'silver' },
  { id: '3', rankText: '୩ୟ ସ୍ଥାନ (3rd Rank)', names: 'Sujata Singh', medalColor: 'bronze' },
  { id: '4', rankText: '୪ର୍ଥ ସ୍ଥାନ (4th Rank)', names: 'Anik Arav Jena', medalColor: 'scholar' },
  { id: '5', rankText: '୫ମ ସ୍ଥାନ (5th Rank)', names: 'Subhakanta Rout', medalColor: 'scholar' }
];

export function WinnersPosterGenerator({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Form State variables
  const [brandText, setBrandText] = useState('ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର');
  const [headingText, setHeadingText] = useState('ମାସିକ ଟେଷ୍ଟ ବିଜେତା');
  const [monthText, setMonthText] = useState('ମେ ୨୦୨୬');
  const [classText, setClassText] = useState('ଦଶମ ଶ୍ରେଣୀ (Class 10)');
  const [winners, setWinners] = useState<WinnerItem[]>(DEFAULT_WINNERS);
  const [websiteText, setWebsiteText] = useState('www.utkalskillcentre.com');
  const [contactText, setContactText] = useState('contact@utkalskillcentre.com');
  const [socialHandle, setSocialHandle] = useState('@utkalskillcentre');
  
  // Design settings
  const [themeStyle, setThemeStyle] = useState<'obsidian_gold' | 'royal_emerald' | 'cyber_blueprint'>('obsidian_gold');
  const [mascotStyle, setMascotStyle] = useState<'/gundulu-pointing-up.png' | '/gundulu-pointing-nobg.png' | 'none'>('/gundulu-pointing-up.png');
  const [logoPosition, setLogoPosition] = useState<'top_left' | 'top_center' | 'top_right'>('top_left');
  
  // Mascot positioning state
  const [mascotX, setMascotX] = useState(820);
  const [mascotY, setMascotY] = useState(840);
  const [mascotScale, setMascotScale] = useState(0.4);

  // Trigger redrawing whenever state changes
  useEffect(() => {
    drawPoster();
  }, [
    brandText,
    headingText,
    monthText,
    classText,
    winners,
    websiteText,
    contactText,
    socialHandle,
    themeStyle,
    mascotStyle,
    logoPosition,
    mascotX,
    mascotY,
    mascotScale
  ]);

  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas (1080x1080 resolution)
    ctx.clearRect(0, 0, 1080, 1080);

    // 1. Draw Theme Background Gradient
    let bgGrad = ctx.createRadialGradient(540, 540, 100, 540, 540, 700);
    if (themeStyle === 'obsidian_gold') {
      bgGrad.addColorStop(0, '#111827'); // dark slate
      bgGrad.addColorStop(1, '#030712'); // obsidian black
    } else if (themeStyle === 'royal_emerald') {
      bgGrad.addColorStop(0, '#064E3B'); // deep forest green
      bgGrad.addColorStop(1, '#022C22'); // dark emerald black
    } else {
      bgGrad.addColorStop(0, '#0B1E3F'); // royal blue
      bgGrad.addColorStop(1, '#030712'); // dark blue black
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1080);

    // 2. Draw Decorative Border / Overlay Lines
    ctx.strokeStyle = themeStyle === 'obsidian_gold' ? 'rgba(245, 158, 11, 0.15)' : 
                      themeStyle === 'royal_emerald' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(14, 165, 233, 0.15)';
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, 1040, 1040); // outer border

    ctx.strokeStyle = themeStyle === 'obsidian_gold' ? 'rgba(245, 158, 11, 0.5)' : 
                      themeStyle === 'royal_emerald' ? 'rgba(52, 211, 153, 0.5)' : 'rgba(14, 165, 233, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(38, 38, 1004, 1004); // thin inner accent border

    // Draw background particles/glow
    ctx.fillStyle = themeStyle === 'obsidian_gold' ? 'rgba(251, 191, 36, 0.05)' : 
                    themeStyle === 'royal_emerald' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(56, 189, 248, 0.05)';
    ctx.beginPath();
    ctx.arc(540, 540, 400, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Logo Image
    const logoImg = new Image();
    logoImg.src = '/utkal-512.png';
    logoImg.onload = () => {
      let logoX = 70;
      let logoY = 70;
      const logoWidth = 100;
      const logoHeight = 100;

      if (logoPosition === 'top_center') {
        logoX = 540 - logoWidth / 2;
      } else if (logoPosition === 'top_right') {
        logoX = 1010 - logoWidth - 50;
      }

      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    };

    // 4. Draw Header Titles
    ctx.textAlign = 'center';
    
    // Brand Title (e.g. ଉତ୍କଳ ସ୍କିଲ୍ ସେଣ୍ଟର)
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(brandText, 540, 135);

    // Heading (e.g. ମାସିକ ଟେଷ୍ଟ ବିଜେତା)
    ctx.font = "900 62px 'Inter', sans-serif";
    ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                    themeStyle === 'royal_emerald' ? '#A7F3D0' : '#38BDF8'; // primary accent
    ctx.fillText(headingText, 540, 210);

    // Subtitle Month (e.g. ମେ ୨୦୨୬)
    ctx.font = "bold 34px 'Inter', sans-serif";
    ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                    themeStyle === 'royal_emerald' ? '#34D399' : '#60A5FA';
    ctx.fillText(monthText, 540, 275);

    // Subtitle Class (e.g. ଦଶମ ଶ୍ରେଣୀ (Class 10))
    ctx.font = "bold 34px 'Inter', sans-serif";
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(classText, 540, 335);

    // 5. Draw Winners List
    const startY = 440;
    const spacingY = 96;
    ctx.textAlign = 'left';

    winners.forEach((w, index) => {
      const currentY = startY + index * spacingY;

      // Draw Rank Tag
      ctx.font = "900 36px 'Inter', sans-serif";
      let rankColor = '#94A3B8';
      let medalSymbol = '🏅';
      if (w.medalColor === 'gold') {
        rankColor = '#FBBF24'; // Gold
        medalSymbol = '🥇';
      } else if (w.medalColor === 'silver') {
        rankColor = '#CBD5E1'; // Silver
        medalSymbol = '🥈';
      } else if (w.medalColor === 'bronze') {
        rankColor = '#F97316'; // Bronze
        medalSymbol = '🥉';
      } else {
        rankColor = '#60A5FA'; // Scholar Blue
        medalSymbol = '🎖️';
      }

      // Draw Medal Symbol
      ctx.font = "38px 'Inter', sans-serif";
      ctx.fillText(medalSymbol, 120, currentY);

      // Draw Rank Label
      ctx.font = "900 32px 'Inter', sans-serif";
      ctx.fillStyle = rankColor;
      ctx.fillText(w.rankText + ':', 180, currentY);

      // Draw Winners Names
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.fillStyle = '#FFFFFF';
      
      // Calculate start of name text based on length of rank text
      const rankTextWidth = ctx.measureText(w.rankText + ':').width;
      ctx.fillText(w.names, 185 + rankTextWidth + 15, currentY);

      // Draw separator line below item
      if (index < winners.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(120, currentY + 40);
        ctx.lineTo(960, currentY + 40);
        ctx.stroke();
      }
    });

    // 6. Draw Footer Bar
    // Draw background shape for footer
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(40, 960, 1000, 80);
    ctx.strokeStyle = themeStyle === 'obsidian_gold' ? 'rgba(245, 158, 11, 0.2)' : 
                      themeStyle === 'royal_emerald' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(14, 165, 233, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 960);
    ctx.lineTo(1040, 960);
    ctx.stroke();

    // Draw Footer Text details
    ctx.textAlign = 'center';
    ctx.font = "bold 22px 'Inter', sans-serif";
    ctx.fillStyle = '#94A3B8';
    
    const footerContent = `🌐 ${websiteText}   |   ✉️ ${contactText}   |   📱 ${socialHandle}`;
    ctx.fillText(footerContent, 540, 1010);

    // 7. Draw Mascot Image (drawn last so it sits on top if aligned)
    if (mascotStyle !== 'none') {
      const mascotImg = new Image();
      mascotImg.src = mascotStyle;
      mascotImg.onload = () => {
        // Compute size based on image aspects and scale factor
        const origW = mascotImg.width || 800;
        const origH = mascotImg.height || 800;
        const destW = origW * mascotScale;
        const destH = origH * mascotScale;

        // Draw mascot on canvas
        ctx.drawImage(
          mascotImg, 
          mascotX - destW / 2, 
          mascotY - destH / 2, 
          destW, 
          destH
        );
      };
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Trigger image download
    const link = document.createElement('a');
    link.download = `utkal_test_winners_${monthText.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleAddWinner = () => {
    const newId = Date.now().toString();
    const newWinner: WinnerItem = {
      id: newId,
      rankText: `${winners.length + 1}ମ ସ୍ଥାନ`,
      names: 'New Student Name',
      medalColor: 'scholar'
    };
    setWinners([...winners, newWinner]);
  };

  const handleRemoveWinner = (id: string) => {
    setWinners(winners.filter(w => w.id !== id));
  };

  const handleUpdateWinner = (id: string, field: keyof WinnerItem, value: any) => {
    setWinners(winners.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <Lucide.ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Leaderboard Poster Creator</h1>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">ପୋଷ୍ଟର ସୃଷ୍ଟିକର୍ତ୍ତା ଡ୍ୟାସବୋର୍ଡ</p>
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer shadow-lg"
        >
          <Lucide.Download size={14} />
          <span>Download Poster</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Controls Form Panel */}
        <div className="space-y-6 bg-slate-900/60 border border-white/5 rounded-3xl p-6 md:p-8 overflow-y-auto max-h-[80vh] force-dark-theme">
          
          {/* Section: Text Customizer */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Lucide.Edit size={12} />
              <span>Poster Titles & Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Brand Header (Odia)</label>
                <input 
                  type="text" 
                  value={brandText} 
                  onChange={(e) => setBrandText(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Main Heading</label>
                <input 
                  type="text" 
                  value={headingText} 
                  onChange={(e) => setHeadingText(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sub Heading / Month</label>
                <input 
                  type="text" 
                  value={monthText} 
                  onChange={(e) => setMonthText(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Class Level</label>
                <input 
                  type="text" 
                  value={classText} 
                  onChange={(e) => setClassText(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section: Design Styles */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Lucide.Sliders size={12} />
              <span>Branding & Layout Theme</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Color Theme</label>
                <select 
                  value={themeStyle}
                  onChange={(e: any) => setThemeStyle(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="obsidian_gold">Obsidian Gold (ମେ)</option>
                  <option value="royal_emerald">Royal Emerald</option>
                  <option value="cyber_blueprint">Cyber Blueprint</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mascot Illustration</label>
                <select 
                  value={mascotStyle}
                  onChange={(e: any) => setMascotStyle(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="/gundulu-pointing-up.png">Gundulu pointing up</option>
                  <option value="/gundulu-pointing-nobg.png">Gundulu pointing left</option>
                  <option value="none">None (No Mascot)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Logo Position</label>
                <select 
                  value={logoPosition}
                  onChange={(e: any) => setLogoPosition(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  <option value="top_left">Top Left Corner</option>
                  <option value="top_center">Top Centered</option>
                  <option value="top_right">Top Right Corner</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Mascot Positioning Fine Tuning */}
          {mascotStyle !== 'none' && (
            <div className="space-y-4 pt-4 border-t border-white/5 bg-[#020617]/40 p-4 rounded-2xl border border-white/5">
              <h2 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <Lucide.Sparkles size={12} className="animate-pulse" />
                <span>Mascot Positioning (Avoid Overlap)</span>
              </h2>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                    <span>Horizontal position (X)</span>
                    <span>{mascotX}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="1000" 
                    value={mascotX} 
                    onChange={(e) => setMascotX(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                    <span>Vertical position (Y)</span>
                    <span>{mascotY}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="1000" 
                    value={mascotY} 
                    onChange={(e) => setMascotY(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                    <span>Mascot Scale / Size</span>
                    <span>{Math.round(mascotScale * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="80" 
                    value={mascotScale * 100} 
                    onChange={(e) => setMascotScale(parseInt(e.target.value, 10) / 100)}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Winners List Customizer */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                <Lucide.Trophy size={12} />
                <span>Ranked Winners List</span>
              </h2>
              <button 
                onClick={handleAddWinner}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <Lucide.Plus size={10} />
                <span>Add Winner</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {winners.map((w, index) => (
                <div key={w.id} className="p-4 bg-[#020617]/55 border border-white/5 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Winner Row {index + 1}</span>
                    <button 
                      onClick={() => handleRemoveWinner(w.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Lucide.Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Rank Title</label>
                      <input 
                        type="text" 
                        value={w.rankText}
                        onChange={(e) => handleUpdateWinner(w.id, 'rankText', e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Student Name(s)</label>
                      <input 
                        type="text" 
                        value={w.names}
                        onChange={(e) => handleUpdateWinner(w.id, 'names', e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Medal Tier</label>
                      <select 
                        value={w.medalColor}
                        onChange={(e: any) => handleUpdateWinner(w.id, 'medalColor', e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="gold">🥇 Gold (1st Place)</option>
                        <option value="silver">🥈 Silver (2nd Place)</option>
                        <option value="bronze">🥉 Bronze (3rd Place)</option>
                        <option value="scholar">🎖️ Scholar Blue (4th/5th Place)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Footer Metadata */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Lucide.HelpCircle size={12} />
              <span>Footer Branding Info</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Website</label>
                <input 
                  type="text" 
                  value={websiteText} 
                  onChange={(e) => setWebsiteText(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email Contact</label>
                <input 
                  type="text" 
                  value={contactText} 
                  onChange={(e) => setContactText(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Social Handles</label>
                <input 
                  type="text" 
                  value={socialHandle} 
                  onChange={(e) => setSocialHandle(e.target.value)}
                  className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Canvas Preview Panel */}
        <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Lucide.Eye size={12} />
            <span>Live Poster Preview (1080x1080)</span>
          </span>

          {/* Interactive HTML5 Canvas scaled using CSS */}
          <div className="w-full max-w-[480px] aspect-square rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden bg-slate-900">
            <canvas 
              ref={canvasRef} 
              width="1080" 
              height="1080" 
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex flex-col items-center gap-1 text-center max-w-sm">
            <p className="text-[11px] font-bold text-slate-400 leading-normal">
              Click the <strong className="text-emerald-500">Download Poster</strong> button at the top to export this canvas as a high-resolution print-ready PNG!
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
