import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';

interface BaghChheliGameProps {
  user: any;
  onBack: () => void;
  language?: 'en' | 'or';
}

// 5x5 Board coordinate helpers (grid coordinates: row 0..4, col 0..4)
// Total 25 positions.
interface Position {
  r: number;
  c: number;
}

const BOARD_SIZE = 5;

// Check if two coordinates are connected
function areConnected(p1: Position, p2: Position): boolean {
  const dr = Math.abs(p1.r - p2.r);
  const dc = Math.abs(p1.c - p2.c);
  
  // Adjacent orthogonals are always connected
  if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
    return true;
  }
  
  // Diagonals are connected in a standard Alquerque board if (r + c) is even
  if (dr === 1 && dc === 1) {
    return (p1.r + p1.c) % 2 === 0;
  }
  
  return false;
}

// Get standard canvas coordinates on 400x400 viewBox
function getCoords(r: number, c: number) {
  const padding = 50;
  const spacing = 75; // (400 - 100) / 4
  return {
    x: padding + c * spacing,
    y: padding + r * spacing
  };
}

export function BaghChheliGame({ user, onBack }: BaghChheliGameProps) {
  // Game phases: 'placement' | 'movement' | 'victory_goats' | 'victory_tigers'
  const [phase, setPhase] = useState<'placement' | 'movement' | 'victory_goats' | 'victory_tigers'>('placement');
  const [turn, setTurn] = useState<'goats' | 'tigers'>('goats');
  
  // Tigers starting at corners: (0,0), (0,4), (4,0), (4,4)
  const [tigers, setTigers] = useState<Position[]>([
    { r: 0, c: 0 },
    { r: 0, c: 4 }
  ]);
  
  // Goats placed on board
  const [goats, setGoats] = useState<Position[]>([]);
  const [goatsRemainingToPlace, setGoatsRemainingToPlace] = useState<number>(15); // Standard is 15-20, let's use 15 for faster mobile gameplay
  const [capturedGoats, setCapturedGoats] = useState<number>(0);
  const [selectedGoatIndex, setSelectedGoatIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('ବାଘ ଠାରୁ ରକ୍ଷା କର ଏବଂ ତାକୁ ଚାରିପଟୁ ଘେରି ବାନ୍ଧ!');
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);

  // Web Audio Synth
  const playSynthSound = (type: 'move' | 'capture' | 'win' | 'lose') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'move') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'capture') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
      } else if (type === 'win') {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.08, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.1 + 0.25);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.3);
        });
      } else if (type === 'lose') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.4);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const triggerHaptic = (ms: number) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  // Helper: Find positions occupied
  const isOccupiedByGoat = (r: number, c: number) => goats.some(g => g.r === r && g.c === c);
  const isOccupiedByTiger = (r: number, c: number) => tigers.some(t => t.r === r && t.c === c);
  const isOccupied = (r: number, c: number) => isOccupiedByGoat(r, c) || isOccupiedByTiger(r, c);

  // Helper: check if tiger can jump/capture a goat
  // A jump is over an adjacent goat to a connected vacant space behind it in a straight line.
  const getTigerCaptures = (tiger: Position): { goat: Position; dest: Position }[] => {
    const captures: { goat: Position; dest: Position }[] = [];
    
    // Check all possible directions (-2 to +2 grid row/col offset)
    for (let dr = -2; dr <= 2; dr += 2) {
      for (let dc = -2; dc <= 2; dc += 2) {
        if (dr === 0 && dc === 0) continue;
        
        const midR = tiger.r + dr / 2;
        const midC = tiger.c + dc / 2;
        const destR = tiger.r + dr;
        const destC = tiger.c + dc;
        
        // Ensure destination and middle are on board
        if (
          destR >= 0 && destR < BOARD_SIZE &&
          destC >= 0 && destC < BOARD_SIZE
        ) {
          const midPos = { r: midR, c: midC };
          const destPos = { r: destR, c: destC };
          
          // Verify straight line connectivity
          if (areConnected(tiger, midPos) && areConnected(midPos, destPos)) {
            if (isOccupiedByGoat(midR, midC) && !isOccupied(destR, destC)) {
              captures.push({
                goat: midPos,
                dest: destPos
              });
            }
          }
        }
      }
    }
    return captures;
  };

  // AI Logic for Tigers' turn
  useEffect(() => {
    if (turn === 'tigers' && phase !== 'victory_goats' && phase !== 'victory_tigers') {
      const timer = setTimeout(() => {
        makeTigerMove();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [turn, phase]);

  const makeTigerMove = () => {
    // 1. Look for captures (greedy capture)
    let possibleCaptures: { tigerIdx: number; goat: Position; dest: Position }[] = [];
    tigers.forEach((t, idx) => {
      const caps = getTigerCaptures(t);
      caps.forEach(c => {
        possibleCaptures.push({ tigerIdx: idx, ...c });
      });
    });

    if (possibleCaptures.length > 0) {
      // Execute random capture
      const cap = possibleCaptures[Math.floor(Math.random() * possibleCaptures.length)];
      const updatedTigers = [...tigers];
      updatedTigers[cap.tigerIdx] = cap.dest;
      setTigers(updatedTigers);
      
      // Remove captured goat
      setGoats(prev => prev.filter(g => !(g.r === cap.goat.r && g.c === cap.goat.c)));
      setCapturedGoats(prev => {
        const next = prev + 1;
        if (next >= 4) {
          // Tigers win
          setPhase('victory_tigers');
          playSynthSound('lose');
          setGunduluSpeech('ଓଃ! ବାଘ ଜିତିଗଲା! ପରବର୍ତ୍ତୀ ଥର ଭଲ ରଣନୀତି କରନ୍ତୁ।');
        }
        return next;
      });

      playSynthSound('capture');
      triggerHaptic(50);
      setTurn('goats');
      return;
    }

    // 2. Otherwise, look for regular moves
    let possibleMoves: { tigerIdx: number; dest: Position }[] = [];
    tigers.forEach((t, idx) => {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!isOccupied(r, c) && areConnected(t, { r, c })) {
            possibleMoves.push({ tigerIdx: idx, dest: { r, c } });
          }
        }
      }
    });

    if (possibleMoves.length > 0) {
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      const updatedTigers = [...tigers];
      updatedTigers[move.tigerIdx] = move.dest;
      setTigers(updatedTigers);
      
      playSynthSound('move');
      setTurn('goats');
    } else {
      // Tigers are blocked and cannot move! Goats win!
      setPhase('victory_goats');
      playSynthSound('win');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      setGunduluSpeech('ଅଦ୍ଭୁତ! ଛେଳିମାନେ ବାଘକୁ ବନ୍ଦ କରି ବିଜୟ ହାସଲ କଲେ! 🎉');
      
      // Reward points
      if (user) {
        user.xp = (user.xp || 150) + 150;
        setUserXp(user.xp);
      }
    }
  };

  // Handle board node click (Player = Goats)
  const handleNodeClick = (r: number, c: number) => {
    if (turn !== 'goats' || phase === 'victory_goats' || phase === 'victory_tigers') return;

    if (phase === 'placement') {
      // Place goat
      if (isOccupied(r, c)) return;
      
      setGoats(prev => [...prev, { r, c }]);
      setGoatsRemainingToPlace(prev => {
        const next = prev - 1;
        if (next === 0) {
          setPhase('movement');
        }
        return next;
      });

      playSynthSound('move');
      triggerHaptic(15);
      setTurn('tigers');
    } 
    else if (phase === 'movement') {
      // If a goat is already selected
      if (selectedGoatIndex !== null) {
        const goat = goats[selectedGoatIndex];
        
        // Move selected goat
        if (!isOccupied(r, c) && areConnected(goat, { r, c })) {
          const updatedGoats = [...goats];
          updatedGoats[selectedGoatIndex] = { r, c };
          setGoats(updatedGoats);
          setSelectedGoatIndex(null);
          
          playSynthSound('move');
          triggerHaptic(15);
          setTurn('tigers');
        } else {
          // Deselect or switch selection
          const clickIdx = goats.findIndex(g => g.r === r && g.c === c);
          if (clickIdx !== -1) {
            setSelectedGoatIndex(clickIdx);
          } else {
            setSelectedGoatIndex(null);
          }
        }
      } else {
        // Select goat
        const clickIdx = goats.findIndex(g => g.r === r && g.c === c);
        if (clickIdx !== -1) {
          setSelectedGoatIndex(clickIdx);
        }
      }
    }
  };

  const restartGame = () => {
    setTigers([
      { r: 0, c: 0 },
      { r: 0, c: 4 }
    ]);
    setGoats([]);
    setGoatsRemainingToPlace(15);
    setCapturedGoats(0);
    setSelectedGoatIndex(null);
    setPhase('placement');
    setTurn('goats');
    setGunduluSpeech('ବାଘ ଠାରୁ ରକ୍ଷା କର ଏବଂ ତାକୁ ଚାରିପଟୁ ଘେରି ବାନ୍ଧ!');
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xl space-y-6 relative overflow-hidden select-none">
      {/* Sambalpuri trims */}
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />
      <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />

      {/* TOP NAV & STATS */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mt-2">
        <button 
          onClick={onBack} 
          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm"
        >
          <Lucide.ArrowLeft size={16} />
        </button>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
          <Lucide.ShieldAlert className="text-orange-500" size={20} />
          ବାଘ-ଛେଳି ଖେଳ (Goats & Tigers)
        </h2>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowHelp(true)} 
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm"
            title="ଖେଳ ନିୟମ"
          >
            <Lucide.HelpCircle size={16} />
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
              soundEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            {soundEnabled ? <Lucide.Volume2 size={16} /> : <Lucide.VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* GUNDULU BUBBLE DIALOGUE */}
      <div className="flex gap-3 items-center bg-slate-50 border border-slate-100 p-3.5 rounded-2xl relative shadow-inner">
        <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-r-[7px] border-r-slate-50 border-b-[5px] border-b-transparent" />
        <img 
          src="/gundulu-v3.png" 
          alt="Gundulu Coach" 
          className="w-10 h-10 object-contain shrink-0 border border-slate-200 bg-white rounded-full p-0.5" 
        />
        <p className="text-[11px] sm:text-xs text-slate-600 font-bold leading-relaxed">{gunduluSpeech}</p>
      </div>

      {/* SCOREBOARD STATUS HEADER */}
      <div className="grid grid-cols-3 gap-3 text-center bg-slate-50/50 p-3 border border-slate-200/50 rounded-2xl text-xs font-bold text-slate-600">
        <div>
          <div className="text-[10px] text-slate-400 uppercase">ଛେଳି ବଞ୍ଚିଛନ୍ତି</div>
          <div className="text-sm font-black text-slate-800">
            {phase === 'placement' ? `${15 - goatsRemainingToPlace} placed` : `${goats.length} on board`}
          </div>
        </div>
        <div className="border-x border-slate-200">
          <div className="text-[10px] text-slate-400 uppercase">ବାଘ ଖାଇଛନ୍ତି</div>
          <div className="text-sm font-black text-red-500">🐐 {capturedGoats} / 4</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase">ବାଘର ସ୍ଥିତି</div>
          <div className="text-sm font-black text-slate-800">🐅 2 Active</div>
        </div>
      </div>

      {/* THE INTERACTIVE BOARD BOARD AREA */}
      <div className="flex justify-center py-2">
        <div className="relative w-[320px] h-[320px] bg-amber-50/20 border-2 border-amber-800/10 rounded-3xl p-3 shadow-inner">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Draw standard Alquerque lines */}
            {/* Horizontal lines */}
            {Array.from({ length: BOARD_SIZE }).map((_, r) => {
              const start = getCoords(r, 0);
              const end = getCoords(r, BOARD_SIZE - 1);
              return (
                <line 
                  key={`h-${r}`}
                  x1={start.x} y1={start.y} 
                  x2={end.x} y2={end.y} 
                  stroke="#78350f" strokeWidth={2.5} strokeLinecap="round" opacity={0.65}
                />
              );
            })}
            {/* Vertical lines */}
            {Array.from({ length: BOARD_SIZE }).map((_, c) => {
              const start = getCoords(0, c);
              const end = getCoords(BOARD_SIZE - 1, c);
              return (
                <line 
                  key={`v-${c}`}
                  x1={start.x} y1={start.y} 
                  x2={end.x} y2={end.y} 
                  stroke="#78350f" strokeWidth={2.5} strokeLinecap="round" opacity={0.65}
                />
              );
            })}
            {/* Diagonal lines */}
            {/* Major diagonals: (0,0) to (4,4) & (0,4) to (4,0) */}
            <line x1={50} y1={50} x2={350} y2={350} stroke="#78350f" strokeWidth={2} opacity={0.5} />
            <line x1={350} y1={50} x2={50} y2={350} stroke="#78350f" strokeWidth={2} opacity={0.5} />
            
            {/* Inner diamond connections */}
            <polygon 
              points="200,50 350,200 200,350 50,200" 
              fill="none" stroke="#78350f" strokeWidth={2} opacity={0.5} 
            />

            {/* Render connections and node buttons */}
            {Array.from({ length: BOARD_SIZE }).map((_, r) =>
              Array.from({ length: BOARD_SIZE }).map((_, c) => {
                const { x, y } = getCoords(r, c);
                const isSelected = selectedGoatIndex !== null && goats[selectedGoatIndex].r === r && goats[selectedGoatIndex].c === c;
                const isGoat = isOccupiedByGoat(r, c);
                const isTiger = isOccupiedByTiger(r, c);
                
                return (
                  <g key={`node-${r}-${c}`} className="cursor-pointer" onClick={() => handleNodeClick(r, c)}>
                    {/* Background intersection glow */}
                    <circle 
                      cx={x} cy={y} r={18} 
                      fill="transparent" 
                      className="hover:fill-amber-500/10 transition-colors" 
                    />
                    
                    {/* Node point (small black dot behind piece) */}
                    <circle cx={x} cy={y} r={4} fill="#78350f" opacity={0.5} />

                    {/* Piece renders */}
                    {isGoat && (
                      <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <circle 
                          cx={x} cy={y} r={13} 
                          fill={isSelected ? '#f59e0b' : '#3b82f6'} 
                          stroke={isSelected ? '#d97706' : '#1d4ed8'} 
                          strokeWidth={2}
                          className="drop-shadow"
                        />
                        <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fill="white" fontWeight="black">
                          🐐
                        </text>
                      </motion.g>
                    )}

                    {isTiger && (
                      <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <circle 
                          cx={x} cy={y} r={14} 
                          fill="#ef4444" 
                          stroke="#b91c1c" 
                          strokeWidth={2.5}
                          className="drop-shadow-md"
                        />
                        <text x={x} y={y + 3.5} textAnchor="middle" fontSize={11} fill="white" fontWeight="black">
                          🐅
                        </text>
                      </motion.g>
                    )}
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </div>

      {/* GAME STATUS DIALOGUE / ACTIONS */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs font-black">
          {phase === 'placement' && (
            <span className="text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full shadow-sm animate-pulse">
              📍 ଛେଳି ରଖିବା ପର୍ଯ୍ୟାୟ: ଆଉ {goatsRemainingToPlace} ଛେଳି ରଖନ୍ତୁ ।
            </span>
          )}
          {phase === 'movement' && turn === 'goats' && (
            <span className="text-amber-600 bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-full shadow-sm">
              🎯 ଆପଣଙ୍କ ଚାଲି: ଛେଳି ଉପରେ କ୍ଲିକ୍ କରି ଆଗକୁ ସ୍ଲାଇଡ୍ କରନ୍ତୁ ।
            </span>
          )}
          {phase === 'movement' && turn === 'tigers' && (
            <span className="text-red-600 bg-red-50 border border-red-100 px-4 py-1.5 rounded-full shadow-sm animate-pulse">
              🐅 ବାଘ ଚାଲୁଛି... ସତର୍କ ରୁହନ୍ତୁ!
            </span>
          )}
          {phase === 'victory_goats' && (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-6 py-2 rounded-full shadow-md flex items-center gap-1">
              🏆 ଆପଣ ଜିତିଲେ! +150 XP ଅର୍ଜିତ!
            </span>
          )}
          {phase === 'victory_tigers' && (
            <span className="text-red-700 bg-red-50 border border-red-100 px-6 py-2 rounded-full shadow-md">
              💀 ବାଘ ଜିତିଗଲା! ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।
            </span>
          )}
        </div>

        <div className="flex gap-3 w-full">
          <button 
            onClick={restartGame} 
            className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600 text-xs font-black rounded-2xl shadow-sm"
          >
            🔄 ପୁନର୍ବାର ଆରମ୍ଭ (Restart)
          </button>
          
          {(phase === 'victory_goats' || phase === 'victory_tigers') && (
            <button 
              onClick={onBack} 
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-2xl active:scale-95 transition-all shadow-md"
            >
              🎉 ଶେଷ କରନ୍ତୁ (Finish)
            </button>
          )}
        </div>
      </div>
    {/* HOW TO PLAY MODAL */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm bg-slate-950/40 animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] p-7 md:p-8 shadow-2xl text-slate-800 overflow-hidden"
            >
              {/* Programmatic Sambalpuri trim on modal */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />

              {/* Close Button */}
              <button
                onClick={() => setShowHelp(false)}
                className="absolute top-5 right-5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 active:scale-95 transition-all"
              >
                <Lucide.X size={16} />
              </button>

              <div className="space-y-6 mt-5">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Lucide.HelpCircle className="text-orange-500" size={24} />
                  <h2 className="text-xl font-black text-slate-900">ବାଘ-ଛେଳି ଖେଳ - ନିୟମାବଳୀ</h2>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-orange-600 flex items-center gap-1.5">
                      📍 ଖେଳାଳି ଓ ଗୋଟି
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଆପଣ ୧୫ଟି ଛେଳି 🐐 ସହ ଖେଳିବେ ଏବଂ କମ୍ପ୍ୟୁଟର (AI) ୨ଟି ବାଘ 🐅 ସହ ଖେଳିବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-blue-600 flex items-center gap-1.5">
                      🔄 ପ୍ରଥମ ପର୍ଯ୍ୟାୟ (ଗୋଟି ରଖିବା)
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଖେଳ ବୋର୍ଡର ଯେକୌଣସି ଖାଲି ଛକ ବା ବିନ୍ଦୁ ଉପରେ କ୍ଲିକ୍ କରି ଗୋଟି ଗୋଟି କରି ଛେଳି ରଖନ୍ତୁ।</li>
                      <li>ଆପଣ ଗୋଟିଏ ଛେଳି ରଖିବା ପରେ ବାଘ ନିଜର ଗୋଟିଏ ଚାଲ୍ ଚାଲିବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-amber-600 flex items-center gap-1.5">
                      🎯 ଦ୍ୱିତୀୟ ପର୍ଯ୍ୟାୟ (ଗୋଟି ଘୁଞ୍ଚାଇବା)
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>୧୫ଟି ଯାକ ଛେଳି ବୋର୍ଡରେ ରଖିସାରିବା ପରେ, ଛେଳିକୁ ତା'ର ପାଖ ସଂଯୁକ୍ତ ଖାଲି ଛକକୁ ଘୁଞ୍ଚାଇ ପାରିବେ।</li>
                      <li>ବାଘ ନିଜ ସ୍ଥାନରୁ ତା' ପାଖ ଖାଲି ସ୍ଥାନକୁ ଚାଲିପାରିବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-red-600 flex items-center gap-1.5">
                      🐅 ବାଘର ଶିକାର (ଛେଳି ଖାଇବା)
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଯଦି କୌଣସି ବାଘ ପାଖରେ ଛେଳି ଥାଏ ଏବଂ ସେହି ରେଖାର ପରବର୍ତ୍ତୀ ଛକଟି ଖାଲି ଥାଏ, ବାଘ ଛେଳି ଉପର ଦେଇ ଡେଇଁ ତାକୁ ମାରିଦେବ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-emerald-600 flex items-center gap-1.5">
                      🏆 ବିଜୟ କିପରି ହେବ?
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଯଦି ଆପଣ ଦୁଇଟିଯାକ ବାଘଙ୍କু ଚାରିପଟୁ ଘେରି ବନ୍ଦୀ କରିଦିଅନ୍ତି (ବାଘ ପାଇଁ ଚାଲିବାକୁ ସ୍ଥାନ ନଥାଏ), ତେବେ ଛେଳି (ଆପଣ) ଜିତିବେ!</li>
                      <li>ଯଦି ବାଘ ୪ଟି ଛେଳି ଖାଇଦିଏ, ତେବେ ବାଘ ଜିତିଯିବ।</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md"
                >
                  ବୁଝିଗଲି, ଖେଳିବା!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
