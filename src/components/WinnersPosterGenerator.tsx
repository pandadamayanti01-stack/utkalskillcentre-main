import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';

interface WinnerItem {
  id: string;
  rankText: string;
  names: string;
  medalColor: 'gold' | 'silver' | 'bronze' | 'scholar';
  photoUrl: string | null; // Base64 data URL
}

const DEFAULT_WINNERS: WinnerItem[] = [
  { id: '1', rankText: '୧ମ ସ୍ଥାନ (1st Rank)', names: 'Dibyansh Panda & Sohan Lenka', medalColor: 'gold', photoUrl: null },
  { id: '2', rankText: '୨ୟ ସ୍ଥାନ (2nd Rank)', names: 'Rohan Kumar Lenka', medalColor: 'silver', photoUrl: null },
  { id: '3', rankText: '୩ୟ ସ୍ଥାନ (3rd Rank)', names: 'Sujata Singh', medalColor: 'bronze', photoUrl: null },
  { id: '4', rankText: '୪ର୍ଥ ସ୍ଥାନ (4th Rank)', names: 'Anik Arav Jena', medalColor: 'scholar', photoUrl: null },
  { id: '5', rankText: '୫ମ ସ୍ଥାନ (5th Rank)', names: 'Subhakanta Rout', medalColor: 'scholar', photoUrl: null }
];

export function WinnersPosterGenerator({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Image cache to hold preloaded HTMLImageElements synchronously
  const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});
  const [photoLoadedToken, setPhotoLoadedToken] = useState(0);

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
  
  // Aspect Ratio selection
  const [aspectRatio, setAspectRatio] = useState<'1_1' | '9_16' | '16_9'>('1_1');

  // Mascot positioning state
  const [mascotX, setMascotX] = useState(820);
  const [mascotY, setMascotY] = useState(840);
  const [mascotScale, setMascotScale] = useState(0.4);

  // Auto-align mascot coordinates based on aspect ratio defaults
  useEffect(() => {
    if (aspectRatio === '1_1') {
      setMascotX(820);
      setMascotY(840);
      setMascotScale(0.4);
    } else if (aspectRatio === '9_16') {
      setMascotX(540);
      setMascotY(1520);
      setMascotScale(0.55);
    } else if (aspectRatio === '16_9') {
      setMascotX(450);
      setMascotY(800);
      setMascotScale(0.45);
    }
  }, [aspectRatio]);

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
    aspectRatio,
    mascotX,
    mascotY,
    mascotScale,
    photoLoadedToken
  ]);

  const drawPoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine Canvas Dimensions based on aspect ratio
    let canvasW = 1080;
    let canvasH = 1080;
    if (aspectRatio === '9_16') {
      canvasW = 1080;
      canvasH = 1920;
    } else if (aspectRatio === '16_9') {
      canvasW = 1920;
      canvasH = 1080;
    }

    // Set physical dimensions of canvas to avoid fuzzy text rendering
    canvas.width = canvasW;
    canvas.height = canvasH;

    // Clear Canvas
    ctx.clearRect(0, 0, canvasW, canvasH);

    // 1. Draw Theme Background Gradient
    let bgGrad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, 100, canvasW / 2, canvasH / 2, Math.max(canvasW, canvasH) * 0.75);
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
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 2. Draw Decorative Border / Overlay Lines
    ctx.strokeStyle = themeStyle === 'obsidian_gold' ? 'rgba(245, 158, 11, 0.15)' : 
                      themeStyle === 'royal_emerald' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(14, 165, 233, 0.15)';
    ctx.lineWidth = 40;
    ctx.strokeRect(20, 20, canvasW - 40, canvasH - 40); // outer border

    ctx.strokeStyle = themeStyle === 'obsidian_gold' ? 'rgba(245, 158, 11, 0.5)' : 
                      themeStyle === 'royal_emerald' ? 'rgba(52, 211, 153, 0.5)' : 'rgba(14, 165, 233, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(38, 38, canvasW - 76, canvasH - 76); // thin inner accent border

    // Draw background particles/glow
    ctx.fillStyle = themeStyle === 'obsidian_gold' ? 'rgba(251, 191, 36, 0.04)' : 
                    themeStyle === 'royal_emerald' ? 'rgba(16, 185, 129, 0.04)' : 'rgba(56, 189, 248, 0.04)';
    ctx.beginPath();
    ctx.arc(canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Logo Image
    const logoImg = new Image();
    logoImg.src = '/utkal-512.png';
    logoImg.onload = () => {
      let logoX = 70;
      let logoY = 70;
      let logoWidth = 100;
      let logoHeight = 100;

      if (aspectRatio === '16_9') {
        logoWidth = 140;
        logoHeight = 140;
        logoX = 450 - logoWidth / 2;
        logoY = 100;
      } else if (aspectRatio === '9_16') {
        logoWidth = 150;
        logoHeight = 150;
        logoX = 540 - logoWidth / 2;
        logoY = 120;
      } else {
        if (logoPosition === 'top_center') {
          logoX = 540 - logoWidth / 2;
        } else if (logoPosition === 'top_right') {
          logoX = 1010 - logoWidth - 50;
        }
      }

      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    };

    // 4. Render Layout specifics
    if (aspectRatio === '16_9') {
      // LANDSCAPE BANNER SPLIT-SCREEN LAYOUT
      ctx.textAlign = 'center';

      // Left Column Brand Title (Y: 310)
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(brandText, 450, 310);

      // Left Column Heading (Y: 400)
      ctx.font = "900 68px 'Inter', sans-serif";
      ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                      themeStyle === 'royal_emerald' ? '#A7F3D0' : '#38BDF8';
      ctx.fillText(headingText, 450, 400);

      // Left Column Month (Y: 480)
      ctx.font = "bold 38px 'Inter', sans-serif";
      ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                      themeStyle === 'royal_emerald' ? '#34D399' : '#60A5FA';
      ctx.fillText(monthText, 450, 485);

      // Left Column Class (Y: 550)
      ctx.font = "bold 38px 'Inter', sans-serif";
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(classText, 450, 555);

      // Vertical Split Accent Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(900, 100);
      ctx.lineTo(900, 900);
      ctx.stroke();

      // Right Column Winners list
      const startY = 220;
      const spacingY = 135;

      winners.forEach((w, index) => {
        const currentY = startY + index * spacingY;

        let rankColor = '#94A3B8';
        let medalSymbol = '🏅';
        if (w.medalColor === 'gold') {
          rankColor = '#FBBF24';
          medalSymbol = '🥇';
        } else if (w.medalColor === 'silver') {
          rankColor = '#CBD5E1';
          medalSymbol = '🥈';
        } else if (w.medalColor === 'bronze') {
          rankColor = '#F97316';
          medalSymbol = '🥉';
        } else {
          rankColor = '#60A5FA';
          medalSymbol = '🎖️';
        }

        // Draw Medal
        ctx.textAlign = 'left';
        ctx.font = "40px 'Inter', sans-serif";
        ctx.fillText(medalSymbol, 980, currentY);

        let listStartX = 1040;

        // Draw cropped avatar photo if preloaded in cache
        const cachedImg = imageCacheRef.current[w.id];
        if (w.photoUrl && cachedImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(1070, currentY - 10, 32, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, 1038, currentY - 42, 64, 64);
          ctx.restore();

          // Draw golden ring around avatar
          ctx.strokeStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(1070, currentY - 10, 32, 0, Math.PI * 2);
          ctx.stroke();

          // Shift text further to the right to accommodate avatar
          listStartX = 1130;
        }

        // Draw Rank Label
        ctx.font = "900 32px 'Inter', sans-serif";
        ctx.fillStyle = rankColor;
        ctx.fillText(w.rankText + ':', listStartX, currentY);

        // Draw Winners Names
        ctx.font = "bold 32px 'Inter', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        const labelW = ctx.measureText(w.rankText + ':').width;
        ctx.fillText(w.names, listStartX + labelW + 15, currentY);

        // Separator line
        if (index < winners.length - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(980, currentY + 55);
          ctx.lineTo(1820, currentY + 55);
          ctx.stroke();
        }
      });

    } else if (aspectRatio === '9_16') {
      // TALL VERTICAL STORY/REEL LAYOUT
      ctx.textAlign = 'center';

      // Brand Title (Y: 340)
      ctx.font = "bold 34px 'Inter', sans-serif";
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(brandText, 540, 340);

      // Heading (Y: 430)
      ctx.font = "900 72px 'Inter', sans-serif";
      ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                      themeStyle === 'royal_emerald' ? '#A7F3D0' : '#38BDF8';
      ctx.fillText(headingText, 540, 430);

      // Month (Y: 510)
      ctx.font = "bold 38px 'Inter', sans-serif";
      ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                      themeStyle === 'royal_emerald' ? '#34D399' : '#60A5FA';
      ctx.fillText(monthText, 540, 510);

      // Class (Y: 575)
      ctx.font = "bold 38px 'Inter', sans-serif";
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(classText, 540, 575);

      // Winners List vertically spaced further
      const startY = 700;
      const spacingY = 135;

      winners.forEach((w, index) => {
        const currentY = startY + index * spacingY;

        let rankColor = '#94A3B8';
        let medalSymbol = '🏅';
        if (w.medalColor === 'gold') {
          rankColor = '#FBBF24';
          medalSymbol = '🥇';
        } else if (w.medalColor === 'silver') {
          rankColor = '#CBD5E1';
          medalSymbol = '🥈';
        } else if (w.medalColor === 'bronze') {
          rankColor = '#F97316';
          medalSymbol = '🥉';
        } else {
          rankColor = '#60A5FA';
          medalSymbol = '🎖️';
        }

        ctx.textAlign = 'left';
        ctx.font = "40px 'Inter', sans-serif";
        ctx.fillText(medalSymbol, 120, currentY);

        let listStartX = 180;

        // Draw cropped avatar photo
        const cachedImg = imageCacheRef.current[w.id];
        if (w.photoUrl && cachedImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(210, currentY - 10, 32, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, 178, currentY - 42, 64, 64);
          ctx.restore();

          ctx.strokeStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(210, currentY - 10, 32, 0, Math.PI * 2);
          ctx.stroke();

          listStartX = 270;
        }

        ctx.font = "900 32px 'Inter', sans-serif";
        ctx.fillStyle = rankColor;
        ctx.fillText(w.rankText + ':', listStartX, currentY);

        ctx.font = "bold 32px 'Inter', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        const labelW = ctx.measureText(w.rankText + ':').width;
        ctx.fillText(w.names, listStartX + labelW + 15, currentY);

        if (index < winners.length - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(120, currentY + 55);
          ctx.lineTo(960, currentY + 55);
          ctx.stroke();
        }
      });

    } else {
      // SQUARE 1:1 LAYOUT
      ctx.textAlign = 'center';
      
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.fillStyle = '#CBD5E1';
      ctx.fillText(brandText, 540, 135);

      ctx.font = "900 62px 'Inter', sans-serif";
      ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                      themeStyle === 'royal_emerald' ? '#A7F3D0' : '#38BDF8';
      ctx.fillText(headingText, 540, 210);

      ctx.font = "bold 34px 'Inter', sans-serif";
      ctx.fillStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : 
                      themeStyle === 'royal_emerald' ? '#34D399' : '#60A5FA';
      ctx.fillText(monthText, 540, 275);

      ctx.font = "bold 34px 'Inter', sans-serif";
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(classText, 540, 335);

      const startY = 440;
      const spacingY = 96;

      winners.forEach((w, index) => {
        const currentY = startY + index * spacingY;

        let rankColor = '#94A3B8';
        let medalSymbol = '🏅';
        if (w.medalColor === 'gold') {
          rankColor = '#FBBF24';
          medalSymbol = '🥇';
        } else if (w.medalColor === 'silver') {
          rankColor = '#CBD5E1';
          medalSymbol = '🥈';
        } else if (w.medalColor === 'bronze') {
          rankColor = '#F97316';
          medalSymbol = '🥉';
        } else {
          rankColor = '#60A5FA';
          medalSymbol = '🎖️';
        }

        ctx.textAlign = 'left';
        ctx.font = "38px 'Inter', sans-serif";
        ctx.fillText(medalSymbol, 120, currentY);

        let listStartX = 180;

        // Draw cropped avatar photo
        const cachedImg = imageCacheRef.current[w.id];
        if (w.photoUrl && cachedImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(210, currentY - 10, 32, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(cachedImg, 178, currentY - 42, 64, 64);
          ctx.restore();

          ctx.strokeStyle = themeStyle === 'obsidian_gold' ? '#FBBF24' : '#FFFFFF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(210, currentY - 10, 32, 0, Math.PI * 2);
          ctx.stroke();

          listStartX = 270;
        }

        ctx.font = "900 32px 'Inter', sans-serif";
        ctx.fillStyle = rankColor;
        ctx.fillText(w.rankText + ':', listStartX, currentY);

        ctx.font = "bold 32px 'Inter', sans-serif";
        ctx.fillStyle = '#FFFFFF';
        const labelW = ctx.measureText(w.rankText + ':').width;
        ctx.fillText(w.names, listStartX + labelW + 15, currentY);

        if (index < winners.length - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(120, currentY + 40);
          ctx.lineTo(960, currentY + 40);
          ctx.stroke();
        }
      });
    }

    // 5. Draw Footer Bar at bottom of screen
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(40, canvasH - 120, canvasW - 80, 80);
    ctx.strokeStyle = themeStyle === 'obsidian_gold' ? 'rgba(245, 158, 11, 0.2)' : 
                      themeStyle === 'royal_emerald' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(14, 165, 233, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, canvasH - 120);
    ctx.lineTo(canvasW - 40, canvasH - 120);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = "bold 22px 'Inter', sans-serif";
    ctx.fillStyle = '#94A3B8';
    const footerContent = `🌐 ${websiteText}   |   ✉️ ${contactText}   |   📱 ${socialHandle}`;
    ctx.fillText(footerContent, canvasW / 2, canvasH - 70);

    // 6. Draw Mascot Image (drawn last so it sits on top if aligned)
    if (mascotStyle !== 'none') {
      const mascotImg = new Image();
      mascotImg.src = mascotStyle;
      mascotImg.onload = () => {
        const origW = mascotImg.width || 800;
        const origH = mascotImg.height || 800;
        const destW = origW * mascotScale;
        const destH = origH * mascotScale;

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

    const link = document.createElement('a');
    link.download = `utkal_test_winners_${monthText.replace(/\s+/g, '_')}_${aspectRatio}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleAddWinner = () => {
    const newId = Date.now().toString();
    const newWinner: WinnerItem = {
      id: newId,
      rankText: `${winners.length + 1}ମ ସ୍ଥାନ`,
      names: 'New Student Name',
      medalColor: 'scholar',
      photoUrl: null
    };
    setWinners([...winners, newWinner]);
  };

  const handleRemoveWinner = (id: string) => {
    setWinners(winners.filter(w => w.id !== id));
  };

  const handleUpdateWinner = (id: string, field: keyof WinnerItem, value: any) => {
    setWinners(winners.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  // FileReader photo upload handler
  const handlePhotoUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result as string;
        
        // Pre-cache image element to guarantee synchronous drawing
        const img = new Image();
        img.src = base64;
        img.onload = () => {
          imageCacheRef.current[id] = img;
          handleUpdateWinner(id, 'photoUrl', base64);
          setPhotoLoadedToken(prev => prev + 1); // trigger redraw
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (id: string) => {
    delete imageCacheRef.current[id];
    handleUpdateWinner(id, 'photoUrl', null);
    setPhotoLoadedToken(prev => prev + 1); // trigger redraw
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <Lucide.ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase font-sans">Leaderboard Poster Creator</h1>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest font-sans">ପୋଷ୍ଟର ସୃଷ୍ଟିକର୍ତ୍ତା ଡ୍ୟାସବୋର୍ଡ</p>
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer shadow-lg font-sans"
        >
          <Lucide.Download size={14} />
          <span>Download Poster</span>
        </button>
      </div>

      {/* Aspect Ratio Tabs Bar */}
      <div className="flex flex-wrap items-center gap-3 p-1.5 bg-slate-950 border border-white/5 rounded-2xl max-w-xl font-sans">
        <button
          onClick={() => setAspectRatio('1_1')}
          className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            aspectRatio === '1_1' 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lucide.Square size={12} />
          <span>1:1 Square (Feed)</span>
        </button>
        <button
          onClick={() => setAspectRatio('9_16')}
          className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            aspectRatio === '9_16' 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lucide.Smartphone size={12} />
          <span>9:16 Portrait (Story)</span>
        </button>
        <button
          onClick={() => setAspectRatio('16_9')}
          className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            aspectRatio === '16_9' 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Lucide.Monitor size={12} />
          <span>16:9 Landscape (Banner)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Controls Form Panel */}
        <div className="space-y-6 bg-slate-900/60 border border-white/5 rounded-3xl p-6 md:p-8 overflow-y-auto max-h-[80vh] force-dark-theme font-sans">
          
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
                  disabled={aspectRatio !== '1_1'}
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
                    min="50" 
                    max="1850" 
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
                    min="50" 
                    max="1850" 
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
                    max="120" 
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
                  
                  {/* Photo addition picker */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Lucide.Image size={10} />
                        <span>Student Photo (Optional)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        {w.photoUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={w.photoUrl} className="w-10 h-10 object-cover rounded-full border border-white/20" alt="Student Preview" />
                            <button 
                              type="button"
                              onClick={() => handleRemovePhoto(w.id)}
                              className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase rounded-lg hover:bg-red-500/20 transition-all cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(w.id, e)}
                            className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-white/5 file:text-slate-200 file:text-[10px] file:font-black file:uppercase hover:file:bg-white/10 cursor-pointer"
                          />
                        )}
                      </div>
                    </div>
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
            <span>Live Poster Preview</span>
          </span>

          {/* Interactive HTML5 Canvas scaled using CSS */}
          <div className={`w-full max-w-[480px] rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden bg-slate-900 ${
            aspectRatio === '9_16' ? 'aspect-[9/16] max-h-[70vh]' : 
            aspectRatio === '16_9' ? 'aspect-[16/9]' : 'aspect-square'
          }`}>
            <canvas 
              ref={canvasRef} 
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
