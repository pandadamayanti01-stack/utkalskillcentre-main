import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import confetti from 'canvas-confetti';
import { multiplayerService } from '../services/multiplayerService';

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

export function BaghChheliGame({ user, onBack, language = 'or' }: BaghChheliGameProps) {
  const [mode, setMode] = useState<'select' | 'solo' | 'multiplayer'>('select');
  const [gameRole, setGameRole] = useState<'goats' | 'tigers' | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

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
  const [goatsRemainingToPlace, setGoatsRemainingToPlace] = useState<number>(15);
  const [capturedGoats, setCapturedGoats] = useState<number>(0);
  const [selectedGoatIndex, setSelectedGoatIndex] = useState<number | null>(null);
  const [selectedTigerIndex, setSelectedTigerIndex] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [gunduluSpeech, setGunduluSpeech] = useState<string>('ବାଘ ଠାରୁ ରକ୍ଷା କର ଏବଂ ତାକୁ ଚାରିପଟୁ ଘେରି ବାନ୍ଧ!');
  const [userXp, setUserXp] = useState<number>(user?.xp || user?.points || 150);

  // Sync board state locally or push to Firestore
  const syncBoardState = async (
    newTigers: Position[],
    newGoats: Position[],
    newRemaining: number,
    newCaptured: number,
    newTurn: 'goats' | 'tigers',
    newPhase: typeof phase
  ) => {
    if (mode === 'multiplayer' && sessionId) {
      await multiplayerService.updateGameState(sessionId, {
        tigers: newTigers,
        goats: newGoats,
        goatsRemainingToPlace: newRemaining,
        capturedGoats: newCaptured,
        turn: newTurn,
        phase: newPhase
      });
    } else {
      setTigers(newTigers);
      setGoats(newGoats);
      setGoatsRemainingToPlace(newRemaining);
      setCapturedGoats(newCaptured);
      setTurn(newTurn);
      setPhase(newPhase);
    }
  };

  // Firestore multiplayer session listener
  useEffect(() => {
    if (mode !== 'multiplayer' || !sessionId) return;

    const unsubscribe = multiplayerService.listenToSession(sessionId, (session) => {
      if (session.status === 'abandoned') {
        setGunduluSpeech(language === 'or' ? 'ସଂଯୋଗ ବିଚ୍ଛିନ୍ନ ହୋଇଗଲା! ଅନ୍ୟ ଖେଳାଳି ଖେଳ ଛାଡ଼ି ଚାଲିଗଲେ।' : 'Disconnected! The other player left the game.');
        setPhase(gameRole === 'goats' ? 'victory_goats' : 'victory_tigers');
        return;
      }

      const { boardState } = session;
      setTigers(boardState.tigers);
      setGoats(boardState.goats);
      setGoatsRemainingToPlace(boardState.goatsRemainingToPlace);
      setCapturedGoats(boardState.capturedGoats);
      setTurn(boardState.turn);
      setPhase(boardState.phase);

      if (gameRole === 'goats') {
        setOpponentName(session.playerTigers?.name || (language === 'or' ? 'ସନ୍ଧାନ କରାଯାଉଛି...' : 'Searching...'));
      } else {
        setOpponentName(session.playerGoats?.name || 'Player 1');
      }

      if (session.status === 'active') {
        setGunduluSpeech(language === 'or' ? 'ଖେଳ ଆରମ୍ଭ ହୋଇଛି! ସତର୍କତାର ସହ ଚାଲନ୍ତୁ।' : 'Game active! Play carefully.');
      }
    });

    return () => {
      unsubscribe();
      multiplayerService.leaveSession(sessionId);
    };
  }, [mode, sessionId, gameRole]);

  const restartGame = async () => {
    if (mode === 'multiplayer' && sessionId) {
      await syncBoardState(
        [{ r: 0, c: 0 }, { r: 0, c: 4 }],
        [],
        15,
        0,
        'goats',
        'placement'
      );
    } else {
      setTigers([
        { r: 0, c: 0 },
        { r: 0, c: 4 }
      ]);
      setGoats([]);
      setGoatsRemainingToPlace(15);
      setCapturedGoats(0);
      setSelectedGoatIndex(null);
      setSelectedTigerIndex(null);
      setTurn('goats');
      setPhase('placement');
      setGunduluSpeech(language === 'or' ? 'ବାଘ ଠାରୁ ରକ୍ଷା କର ଏବଂ ତାକୁ ଚାରିପଟୁ ଘେରି ବାନ୍ଧ!' : 'Save from the tiger and trap it from all sides!');
    }
  };

  const startMultiplayer = async () => {
    setIsSearching(true);
    try {
      const { sessionId: sId, role } = await multiplayerService.createOrJoinSession(
        user?.uid || user?.id || 'guest',
        user?.name || user?.displayName || (language === 'or' ? 'ଛାତ୍ର' : 'Student')
      );
      setSessionId(sId);
      setGameRole(role);
    } catch (e) {
      console.error('Matchmaking failed:', e);
      setIsSearching(false);
    }
  };

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
        const notes = [261.63, 329.63, 392.00, 523.25];
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

  const isOccupiedByGoat = (r: number, c: number) => goats.some(g => g.r === r && g.c === c);
  const isOccupiedByTiger = (r: number, c: number) => tigers.some(t => t.r === r && t.c === c);
  const isOccupied = (r: number, c: number) => isOccupiedByGoat(r, c) || isOccupiedByTiger(r, c);

  const getTigerCaptures = (tiger: Position): { goat: Position; dest: Position }[] => {
    const captures: { goat: Position; dest: Position }[] = [];
    for (let dr = -2; dr <= 2; dr += 2) {
      for (let dc = -2; dc <= 2; dc += 2) {
        if (dr === 0 && dc === 0) continue;
        const midR = tiger.r + dr / 2;
        const midC = tiger.c + dc / 2;
        const destR = tiger.r + dr;
        const destC = tiger.c + dc;
        if (destR >= 0 && destR < BOARD_SIZE && destC >= 0 && destC < BOARD_SIZE) {
          const midPos = { r: midR, c: midC };
          const destPos = { r: destR, c: destC };
          if (areConnected(tiger, midPos) && areConnected(midPos, destPos)) {
            if (isOccupiedByGoat(midR, midC) && !isOccupied(destR, destC)) {
              captures.push({ goat: midPos, dest: destPos });
            }
          }
        }
      }
    }
    return captures;
  };

  // AI Logic for Tigers' turn (Solo Mode only)
  useEffect(() => {
    if (mode === 'solo' && turn === 'tigers' && phase !== 'victory_goats' && phase !== 'victory_tigers') {
      const timer = setTimeout(() => {
        makeTigerMove();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, mode]);

  const makeTigerMove = () => {
    let possibleCaptures: { tigerIdx: number; goat: Position; dest: Position }[] = [];
    tigers.forEach((t, idx) => {
      const caps = getTigerCaptures(t);
      caps.forEach(c => {
        possibleCaptures.push({ tigerIdx: idx, ...c });
      });
    });

    if (possibleCaptures.length > 0) {
      const cap = possibleCaptures[Math.floor(Math.random() * possibleCaptures.length)];
      const updatedTigers = [...tigers];
      updatedTigers[cap.tigerIdx] = cap.dest;
      const newGoats = goats.filter(g => !(g.r === cap.goat.r && g.c === cap.goat.c));
      const newCaptured = capturedGoats + 1;
      const newPhase = newCaptured >= 4 ? 'victory_tigers' : 'movement';

      playSynthSound('capture');
      triggerHaptic(50);
      
      if (newPhase === 'victory_tigers') {
        setGunduluSpeech('ଓଃ! ବାଘ ଜିତିଗଲା! ପରବର୍ତ୍ତୀ ଥର ଭଲ ରଣନୀତି କରନ୍ତୁ।');
      }
      syncBoardState(updatedTigers, newGoats, goatsRemainingToPlace, newCaptured, 'goats', newPhase);
      return;
    }

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
      
      playSynthSound('move');
      syncBoardState(updatedTigers, goats, goatsRemainingToPlace, capturedGoats, 'goats', 'movement');
    } else {
      setPhase('victory_goats');
      playSynthSound('win');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      setGunduluSpeech('ଅଦ୍ଭୁତ! ଛେଳିମାନେ ବାଘକୁ ବନ୍ଦ କରି ବିଜୟ ହାସଲ କଲେ! 🎉');
      if (user) {
        user.xp = (user.xp || 150) + 150;
        setUserXp(user.xp);
      }
    }
  };

  const handleNodeClick = async (r: number, c: number) => {
    const activeRole = mode === 'multiplayer' ? gameRole : 'goats';
    if (turn !== activeRole || phase === 'victory_goats' || phase === 'victory_tigers') return;

    if (turn === 'goats') {
      if (phase === 'placement') {
        if (isOccupied(r, c)) return;
        
        const newGoats = [...goats, { r, c }];
        const newRemaining = goatsRemainingToPlace - 1;
        const newPhase = newRemaining === 0 ? 'movement' : 'placement';
        
        playSynthSound('move');
        triggerHaptic(15);
        await syncBoardState(tigers, newGoats, newRemaining, capturedGoats, 'tigers', newPhase);
      } 
      else if (phase === 'movement') {
        if (selectedGoatIndex !== null) {
          const goat = goats[selectedGoatIndex];
          if (!isOccupied(r, c) && areConnected(goat, { r, c })) {
            const newGoats = [...goats];
            newGoats[selectedGoatIndex] = { r, c };
            setSelectedGoatIndex(null);
            
            playSynthSound('move');
            triggerHaptic(15);
            await syncBoardState(tigers, newGoats, goatsRemainingToPlace, capturedGoats, 'tigers', 'movement');
          } else {
            const clickIdx = goats.findIndex(g => g.r === r && g.c === c);
            setSelectedGoatIndex(clickIdx !== -1 ? clickIdx : null);
          }
        } else {
          const clickIdx = goats.findIndex(g => g.r === r && g.c === c);
          if (clickIdx !== -1) {
            setSelectedGoatIndex(clickIdx);
          }
        }
      }
    } 
    else if (turn === 'tigers' && phase === 'movement') {
      if (selectedTigerIndex !== null) {
        const tiger = tigers[selectedTigerIndex];
        
        if (!isOccupied(r, c) && areConnected(tiger, { r, c })) {
          const newTigers = [...tigers];
          newTigers[selectedTigerIndex] = { r, c };
          setSelectedTigerIndex(null);
          
          playSynthSound('move');
          triggerHaptic(15);
          await syncBoardState(newTigers, goats, goatsRemainingToPlace, capturedGoats, 'goats', 'movement');
        } 
        else {
          const captures = getTigerCaptures(tiger);
          const matchedCap = captures.find(cap => cap.dest.r === r && cap.dest.c === c);
          
          if (matchedCap) {
            const newTigers = [...tigers];
            newTigers[selectedTigerIndex] = { r, c };
            setSelectedTigerIndex(null);
            
            const newGoats = goats.filter(g => !(g.r === matchedCap.goat.r && g.c === matchedCap.goat.c));
            const newCaptured = capturedGoats + 1;
            const newPhase = newCaptured >= 4 ? 'victory_tigers' : 'movement';
            
            playSynthSound('capture');
            triggerHaptic(50);
            await syncBoardState(newTigers, newGoats, goatsRemainingToPlace, newCaptured, 'goats', newPhase);
          } else {
            const clickIdx = tigers.findIndex(t => t.r === r && t.c === c);
            setSelectedTigerIndex(clickIdx !== -1 ? clickIdx : null);
          }
        }
      } else {
        const clickIdx = tigers.findIndex(t => t.r === r && t.c === c);
        if (clickIdx !== -1) {
          setSelectedTigerIndex(clickIdx);
        }
      }
    }
  };

  if (mode === 'select') {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl space-y-6 relative overflow-hidden select-none text-slate-800 text-center">
        {/* Sambalpuri trims */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />
        <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />
        
        <div className="flex justify-center mt-6">
          <div className="h-24 w-24 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center p-2 shadow-lg relative overflow-hidden">
            <img src="/gundulu-v3.png" alt="Gundulu" className="h-full w-full object-contain scale-[0.95]" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">ବାଘ-ଛେଳି ଖେଳ (Bagh Chheli)</h2>
          <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
            Odisha's traditional strategy board game. Outsmart the tigers or capture the goats!
          </p>
        </div>

        {isSearching ? (
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-3">
            <Lucide.Loader2 size={32} className="text-emerald-500 animate-spin" />
            <h4 className="text-sm font-black text-slate-700 animate-pulse">ସନ୍ଧାନ କରାଯାଉଛି... (Finding Opponent)</h4>
            <p className="text-[10px] text-slate-400 font-bold">Waiting for another student to join the tournament arena.</p>
            <button
              onClick={() => setIsSearching(false)}
              className="mt-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 text-[10px] font-black rounded-xl uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mt-6">
            <button
              onClick={() => { setMode('solo'); setGameRole('goats'); }}
              className="p-5 bg-gradient-to-br from-blue-500/5 to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 rounded-3xl text-left flex items-center justify-between group cursor-pointer hover:shadow-lg transition-all"
            >
              <div>
                <h4 className="text-sm font-black text-blue-600 group-hover:text-blue-500 transition-colors">🤖 Solo Mode (vs Gundulu AI)</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Play as the Goats and try to trap the computer tigers.</p>
              </div>
              <Lucide.ChevronRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={startMultiplayer}
              className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-600/10 border border-emerald-500/20 hover:border-emerald-500/40 rounded-3xl text-left flex items-center justify-between group cursor-pointer hover:shadow-lg transition-all"
            >
              <div>
                <h4 className="text-sm font-black text-emerald-600 group-hover:text-emerald-500 transition-colors">⚔️ Online Multiplayer Tournament</h4>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">Play live against other students across Odisha districts.</p>
              </div>
              <Lucide.ChevronRight size={18} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black rounded-2xl active:scale-95 transition-all shadow-sm cursor-pointer mt-4"
        >
          Cancel & Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-xl space-y-6 relative overflow-hidden select-none">
      {/* Sambalpuri trims */}
      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />
      <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-red-600 via-slate-900 to-amber-400" />

      {/* TOP NAV & STATS */}
      <div className="flex flex-col border-b border-slate-100 pb-4 mt-2 gap-2">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            <Lucide.ArrowLeft size={16} />
          </button>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-1.5">
            <Lucide.ShieldAlert className="text-orange-500" size={20} />
            ବାଘ-ଛେଳି ଖେଳ {mode === 'multiplayer' && '(Live)'}
          </h2>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setShowHelp(true)} 
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="ଖେଳ ନିୟମ"
            >
              <Lucide.HelpCircle size={16} />
            </button>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className={`p-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm cursor-pointer ${
                soundEnabled ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              {soundEnabled ? <Lucide.Volume2 size={16} /> : <Lucide.VolumeX size={16} />}
            </button>
          </div>
        </div>

        {mode === 'multiplayer' && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl text-[10px] sm:text-xs font-black text-emerald-850 uppercase tracking-wider shadow-sm">
            <span className="flex items-center gap-1">
              <Lucide.User size={12} />
              <span>Opponent: {opponentName || 'Searching...'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Lucide.Sparkles size={12} />
              <span>You: {gameRole === 'goats' ? '🐐 Goats' : '🐅 Tigers'}</span>
            </span>
          </div>
        )}
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

      {/* THE INTERACTIVE BOARD AREA */}
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
                const isGoatSelected = selectedGoatIndex !== null && goats[selectedGoatIndex].r === r && goats[selectedGoatIndex].c === c;
                const isTigerSelected = selectedTigerIndex !== null && tigers[selectedTigerIndex].r === r && tigers[selectedTigerIndex].c === c;
                const isGoat = isOccupiedByGoat(r, c);
                const isTiger = isOccupiedByTiger(r, c);
                
                return (
                  <g key={`node-${r}-${c}`} className="cursor-pointer" onClick={() => handleNodeClick(r, c)}>
                    <circle 
                      cx={x} cy={y} r={18} 
                      fill="transparent" 
                      className="hover:fill-amber-500/10 transition-colors" 
                    />
                    <circle cx={x} cy={y} r={4} fill="#78350f" opacity={0.5} />

                    {isGoat && (
                      <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <circle 
                          cx={x} cy={y} r={13} 
                          fill={isGoatSelected ? '#f59e0b' : '#3b82f6'} 
                          stroke={isGoatSelected ? '#d97706' : '#1d4ed8'} 
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
                          fill={isTigerSelected ? '#f59e0b' : '#ef4444'} 
                          stroke={isTigerSelected ? '#d97706' : '#b91c1c'} 
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
            className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-slate-600 text-xs font-black rounded-2xl shadow-sm cursor-pointer"
          >
            🔄 ପୁନର୍ବାର ଆରମ୍ଭ (Restart)
          </button>
          
          {(phase === 'victory_goats' || phase === 'victory_tigers') && (
            <button 
              onClick={onBack} 
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-2xl active:scale-95 transition-all shadow-md cursor-pointer"
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
                className="absolute top-5 right-5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
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
                      <li>ଆପଣ ୧୫ଟି ଛେଳି 🐐 କିମ୍ବା ୨ଟି ବାଘ 🐅 ସହ ଖେଳିପାରିବେ।</li>
                      <li>ଅନଲାଇନ୍ ମୋଡ୍‌ରେ ଜଣେ ଛେଳି ଏବଂ ଅନ୍ୟଜଣେ ବାଘ ହୋଇ ଖେଳିବେ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-blue-600 flex items-center gap-1.5">
                      🔄 ପ୍ରଥମ ପର୍ଯ୍ୟାୟ (ଗୋଟି ରଖିବା)
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ଖେଳ ବୋର୍ଡର ଯେକୌଣସି ଖାଲି ବିନ୍ଦୁ ଉପରେ କ୍ଲିକ୍ କରି ଛେଳିକୁ ଗୋଟି ଗୋଟି କରି ବୋର୍ଡରେ ରଖାଯାଏ।</li>
                      <li>ଛେଳି ରଖାଯିବା ପରେ ବାଘ ନିଜର ଚାଲ୍ ଚାଲେ।</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-2xl space-y-2">
                    <h3 className="text-sm font-black text-amber-600 flex items-center gap-1.5">
                      🎯 ଦ୍ୱିତୀୟ ପର୍ଯ୍ୟାୟ (ଗୋଟି ଘୁଞ୍ଚାଇବା)
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 font-bold leading-relaxed">
                      <li>ସମସ୍ତ ଛେଳି ବୋର୍ଡରେ ରଖିସାରିବା ପରେ, ଗୋଟିଗୁଡ଼ିକୁ ସଂଯୁକ୍ତ ଖାଲି ଛକକୁ ଘୁଞ୍ଚାଯାଏ।</li>
                      <li>ବାଘ ଓ ଛେଳି ଉଭୟ ନିଜ ସ୍ଥାନରୁ ପାଖ ଖାଲି ସ୍ଥାନକୁ ଚାଲିପାରିବେ।</li>
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
                      <li>ଯଦି ଛେଳି ଦୁଇଟିଯାକ ବାଘଙ୍କୁ ଚାରିପଟୁ ଘେରି ବନ୍ଦୀ କରିଦିଅନ୍ତି (ବାଘ ପାଇଁ ଚାଲିବାକୁ ସ୍ଥାନ ନଥାଏ), ତେବେ ଛେଳି ଜିତିବେ!</li>
                      <li>ଯଦି ବାଘ ୪ଟି ଛେଳି ଖାଇଦିଏ, ତେବେ ବାଘ ଜିତିଯିବ।</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer"
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
};
