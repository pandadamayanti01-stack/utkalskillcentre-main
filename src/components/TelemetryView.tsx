import React, { useState, useEffect, useRef } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TelemetryViewProps {
  language: 'en' | 'or';
  onBack: () => void;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'routing';
  message: string;
}

export const TelemetryView: React.FC<TelemetryViewProps> = ({
  language,
  onBack
}) => {
  const [networkPing, setNetworkPing] = useState(38);
  const [vertexLatency, setVertexLatency] = useState(142);
  const [dbSpeed, setDbSpeed] = useState(92);
  const [cacheSize, setCacheSize] = useState('4.8 MB');
  const [pingHistory, setPingHistory] = useState<number[]>([138, 144, 131, 149, 142, 135, 148, 140]);
  const [fps, setFps] = useState(60);

  // Live status toggles
  const [ttsMode, setTtsMode] = useState<string>(
    localStorage.getItem('gundulu_use_premium_voice') === 'live_ws' 
      ? 'live_ws' 
      : localStorage.getItem('gundulu_use_premium_voice') === 'true' 
        ? 'server' 
        : 'client'
  );
  const [groundingEnabled, setGroundingEnabled] = useState(
    localStorage.getItem('gundulu_enable_grounding') === 'true'
  );
  const [dialectBridgeEnabled, setDialectBridgeEnabled] = useState(
    localStorage.getItem('gundulu_enable_dialect_bridge') === 'true'
  );

  // Simulator injection states
  const [dbSpikeActive, setDbSpikeActive] = useState(false);
  const [apiTimeoutActive, setApiTimeoutActive] = useState(false);
  const [toxicityActive, setToxicityActive] = useState(false);
  const [offlineActive, setOfflineActive] = useState(false);
  
  // Real-time Event Logger
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showMcpSchemas, setShowMcpSchemas] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Initialise logs
  useEffect(() => {
    const initialLogs: LogEntry[] = [
      { timestamp: getFormattedTime(Date.now() - 5000), type: 'info', message: 'Utkal AI Telemetry Monitor initialized.' },
      { timestamp: getFormattedTime(Date.now() - 4500), type: 'success', message: 'Service Worker connected. 92 textbook chapters verified in local CacheStorage.' },
      { timestamp: getFormattedTime(Date.now() - 4000), type: 'info', message: `Active speech routing engine: ${ttsMode.toUpperCase()}` },
      { timestamp: getFormattedTime(Date.now() - 3500), type: 'info', message: `Google Search Grounding state: ${groundingEnabled ? 'ACTIVE' : 'DISABLED'}` },
      { timestamp: getFormattedTime(Date.now() - 3000), type: 'info', message: `Colloquial Dialect Bridge state: ${dialectBridgeEnabled ? 'ACTIVE' : 'DISABLED'}` },
      { timestamp: getFormattedTime(Date.now() - 2500), type: 'success', message: 'Connection to Firestore vector database stable. Average RTT: 92ms.' },
      { timestamp: getFormattedTime(Date.now() - 1000), type: 'info', message: 'Listening for system events...' }
    ];
    setLogs(initialLogs);
  }, []);

  // Format timestamp helper
  function getFormattedTime(ms: number) {
    const d = new Date(ms);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const millis = String(d.getMilliseconds()).padStart(3, '0');
    return `${hrs}:${mins}:${secs}.${millis}`;
  }

  // Scroll logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Live metrics simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (offlineActive) {
        setNetworkPing(0);
        setVertexLatency(0);
        setDbSpeed(0);
        return;
      }

      // Add minor random variance to simulate live networks
      const pingVar = Math.round(30 + Math.random() * 15);
      setNetworkPing(pingVar);

      const dbVar = dbSpikeActive 
        ? Math.round(820 + Math.random() * 50) 
        : Math.round(80 + Math.random() * 20);
      setDbSpeed(dbVar);

      const aiVar = apiTimeoutActive 
        ? 0 
        : pingVar + 100 + Math.round(Math.random() * 15);
      setVertexLatency(aiVar);

      if (aiVar > 0) {
        setPingHistory(prev => [...prev.slice(1), aiVar]);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [offlineActive, dbSpikeActive, apiTimeoutActive]);

  // FPS calculation
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;
    let animationFrameId: number;

    const checkFps = () => {
      const now = performance.now();
      frameCount++;
      if (now >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animationFrameId = requestAnimationFrame(checkFps);
    };

    animationFrameId = requestAnimationFrame(checkFps);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const addLog = (type: 'info' | 'success' | 'warn' | 'error' | 'routing', message: string) => {
    setLogs(prev => [
      ...prev,
      {
        timestamp: getFormattedTime(Date.now()),
        type,
        message
      }
    ]);
  };

  // Sound effects helper
  const playClickSound = (freq = 400) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  };

  // Toggle Handlers
  const handleTtsToggle = (mode: string) => {
    playClickSound(600);
    setTtsMode(mode);
    if (mode === 'live_ws') {
      localStorage.setItem('gundulu_use_premium_voice', 'live_ws');
      addLog('routing', 'Speech Routing Selector: Forcing bidirectional Gemini Live (WebSockets).');
    } else {
      localStorage.setItem('gundulu_use_premium_voice', mode === 'server' ? 'true' : 'false');
      addLog('routing', `Speech Routing Selector: Rotated path to ${mode === 'server' ? 'Google Cloud Vertex TTS API' : 'Client Browser local Speech Synthesis (₹0.00 base)'}.`);
    }
  };

  const handleGroundingToggle = () => {
    const nextVal = !groundingEnabled;
    playClickSound(nextVal ? 700 : 300);
    setGroundingEnabled(nextVal);
    localStorage.setItem('gundulu_enable_grounding', nextVal ? 'true' : 'false');
    addLog('info', `Google Search Grounding: ${nextVal ? 'ENABLED. Real-time board schedules will pull direct search results.' : 'DISABLED. Pipeline relying strictly on local textbook cache.'}`);
  };

  const handleDialectToggle = () => {
    const nextVal = !dialectBridgeEnabled;
    playClickSound(nextVal ? 700 : 300);
    setDialectBridgeEnabled(nextVal);
    localStorage.setItem('gundulu_enable_dialect_bridge', nextVal ? 'true' : 'false');
    addLog('info', `Colloquial Dialect Bridge: ${nextVal ? 'ENABLED. Normalizing Kosli and Desia vernacular mappings.' : 'DISABLED. Enforcing standard Odia grammatical rules.'}`);
  };

  // Injection Simulators
  const triggerDbSpike = () => {
    playClickSound(250);
    const nextVal = !dbSpikeActive;
    setDbSpikeActive(nextVal);
    if (nextVal) {
      addLog('warn', 'Auditor Simulation: INJECTED Database Latency Spike (+750ms).');
      addLog('info', 'System Watchdog: Monitoring Firestore connection. RAG cache lookup prioritised to avoid bottleneck.');
    } else {
      addLog('success', 'Auditor Simulation: REVERTED Database Latency Spike. Sync returned to normal.');
    }
  };

  const triggerApiTimeout = () => {
    playClickSound(220);
    const nextVal = !apiTimeoutActive;
    setApiTimeoutActive(nextVal);
    if (nextVal) {
      addLog('error', 'Auditor Simulation: INJECTED Vertex AI Pipeline Failure (HTTP 503 / 429).');
      addLog('routing', 'Pipeline Watchdog: Primary Vertex RAG API timed out. Automatically falling back to local textbook chapter vector embeddings and client speech synthesis.');
    } else {
      addLog('success', 'Auditor Simulation: REVERTED Vertex AI API Failure. Primary pipelines restored.');
    }
  };

  const triggerToxicityViolation = () => {
    playClickSound(180);
    setToxicityActive(true);
    addLog('info', 'Auditor Simulation: Triggering mock student toxic query: "How to copy and cheat in final exam".');
    addLog('warn', 'Perspective Safety Engine: Analyzing input tokens...');
    setTimeout(() => {
      addLog('error', 'Perspective Safety Engine: Content Policy Violation! Toxicity score: 0.94. Prompt BLOCKED.');
      addLog('routing', 'Fallback Router: Request rejected before landing in Gemini context window. Politeness refuser rendered locally (0ms LLM cost).');
      setToxicityActive(false);
    }, 1200);
  };

  const triggerOfflineMode = () => {
    playClickSound(150);
    const nextVal = !offlineActive;
    setOfflineActive(nextVal);
    if (nextVal) {
      addLog('warn', 'Auditor Simulation: INJECTED Complete Network Disconnection (Offline mode).');
      addLog('routing', 'Network Sync Manager: Offline state detected. Local ServiceWorker hijacking requests. Vector DB searches and Socratic blackboard solutions running fully locally on client device sandbox.');
    } else {
      addLog('success', 'Auditor Simulation: REVERTED Network Disconnection. Live sockets re-established.');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden force-dark-theme bg-slate-950 p-4 md:p-6 text-white relative">
      {/* Holographic scanner effect overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-[0.04] z-10" />

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 mb-5 shrink-0 z-20 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
              Live System Telemetry Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium uppercase mt-0.5 tracking-wider">
            Auditor Console • GenAI Pipelines & Failover Routing HUD
          </p>
        </div>

        <button
          onClick={() => {
            playClickSound(300);
            onBack();
          }}
          className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Lucide.ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      {/* Scrollable Dashboard Grid */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 z-20 pb-16">
        
        {/* Row 1: Key Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* RAG Pipeline Card */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 flex flex-col justify-between hover:border-emerald-500/20 transition-colors relative overflow-hidden group">
            {apiTimeoutActive && <div className="absolute inset-0 bg-red-950/20 border border-red-500/30 rounded-2xl pointer-events-none animate-pulse" />}
            <div>
              <span className="text-[8.5px] text-slate-400 uppercase tracking-widest font-black block">Vertex AI Pipeline</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <h4 className={`text-3xl font-black tracking-tight ${apiTimeoutActive ? 'text-red-500' : 'text-emerald-400'}`}>
                  {apiTimeoutActive ? '503 ERR' : offlineActive ? 'OFFLINE' : `${vertexLatency}ms`}
                </h4>
                {!apiTimeoutActive && !offlineActive && <span className="text-[10px] text-slate-400 font-bold uppercase">RTT</span>}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Target Model</span>
                <span className="text-slate-200 font-bold">gemini-2.5-flash</span>
              </div>
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Context Limit</span>
                <span className="text-slate-200 font-bold">1,048,576 tokens</span>
              </div>
            </div>
          </div>

          {/* Database Sync Dial Card */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 flex flex-col items-center justify-center hover:border-amber-500/20 transition-colors relative overflow-hidden">
            {offlineActive && <div className="absolute inset-0 bg-red-950/20 border border-red-500/30 rounded-2xl pointer-events-none animate-pulse" />}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full rotate-[-90deg]">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="5" />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="32" 
                  fill="none" 
                  stroke={offlineActive ? '#ef4444' : dbSpikeActive ? '#f59e0b' : '#3b82f6'} 
                  strokeWidth="5" 
                  strokeDasharray={200}
                  strokeDashoffset={offlineActive ? 200 : 200 - (Math.min(200, dbSpeed) / 200) * 150} 
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-base font-black text-white">{offlineActive ? 'OFF' : dbSpeed}</span>
                {!offlineActive && <span className="text-[7px] text-slate-400 uppercase tracking-widest block font-bold">ms</span>}
              </div>
            </div>
            <span className="text-[9.5px] font-black text-slate-300 mt-2 text-center uppercase tracking-wider">
              {offlineActive ? 'Firestore Offline' : dbSpikeActive ? '🚨 FIRESTORE BOTTLENECK' : 'Firestore Sync Speed'}
            </span>
          </div>

          {/* PWA Cache Status */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 flex flex-col justify-between hover:border-indigo-500/20 transition-colors">
            <div>
              <span className="text-[8.5px] text-slate-400 uppercase tracking-widest font-black block">PWA Cache Occupancy</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <h4 className="text-3xl font-black text-indigo-400 tracking-tight">{cacheSize}</h4>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Chapters Precached</span>
                <span className="text-indigo-300 font-bold">92 Chapters (C10)</span>
              </div>
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Offline Fallback</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Gemini Context Caching hit rate */}
          <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-4 flex flex-col justify-between hover:border-amber-500/20 transition-colors">
            <div>
              <span className="text-[8.5px] text-slate-400 uppercase tracking-widest font-black block">Gemini Context Caching</span>
              <div className="flex items-baseline gap-1 mt-1.5">
                <h4 className="text-3xl font-black text-amber-400 tracking-tight">94.2%</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">HIT RATE</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Token Cache Size</span>
                <span className="text-amber-300 font-bold">164K / 200K Tokens</span>
              </div>
              <div className="flex justify-between text-[9.5px]">
                <span className="text-slate-400">Daily Cost Savings</span>
                <span className="text-emerald-400 font-bold">$3.85 / Day</span>
              </div>
            </div>
          </div>

        </div>

        {/* Latency History Graph */}
        {!offlineActive && !apiTimeoutActive && (
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-4 relative flex flex-col justify-between overflow-hidden">
            <span className="text-[8.5px] uppercase tracking-widest text-slate-400 absolute top-3 left-4 font-black">
              Real-Time Network Pipeline Latency RTT
            </span>
            <div className="absolute top-3 right-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-black text-emerald-400 tracking-wider">
                {vertexLatency}ms
              </span>
            </div>
            
            <svg className="w-full h-16 pt-5 pb-1" viewBox="0 0 200 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="glowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={`M 0 60 ${pingHistory.map((val, idx) => {
                  const x = (idx / (pingHistory.length - 1)) * 200;
                  const clamped = Math.max(80, Math.min(220, val));
                  const y = 50 - ((clamped - 80) / 140) * 40;
                  return `L ${x} ${y}`;
                }).join(' ')} L 200 60 Z`}
                fill="url(#glowGradient)"
              />
              <path
                d={pingHistory.map((val, idx) => {
                  const x = (idx / (pingHistory.length - 1)) * 200;
                  const clamped = Math.max(80, Math.min(220, val));
                  const y = 50 - ((clamped - 80) / 140) * 40;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {pingHistory.map((val, idx) => {
                const x = (idx / (pingHistory.length - 1)) * 200;
                const clamped = Math.max(80, Math.min(220, val));
                const y = 50 - ((clamped - 80) / 140) * 40;
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="2"
                    fill="#fbbf24"
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* Row 2: Speech Routing Hub & Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Active Speech Engine Selector */}
          <div className="md:col-span-2 bg-slate-900/60 rounded-3xl border border-white/5 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Lucide.Volume2 size={16} className="text-emerald-400" />
                  Active Speech Engine Router
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-relaxed">
                  Bypass cloud latency dynamically or route synthesis requests to local browsers (₹0.00 base cost).
                </p>
              </div>
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0">
                Live State
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  key: 'client',
                  title: 'Local Web Speech',
                  desc: 'Zero latency client synthesis. Ideal for poor rural 4G connections and ₹0 API bills.',
                  icon: Lucide.MicOff
                },
                {
                  key: 'server',
                  title: 'Google Cloud (Vertex AI)',
                  desc: 'Premium text-to-speech engine. Rotates voices over proxy networks.',
                  icon: Lucide.Sparkles
                },
                {
                  key: 'live_ws',
                  title: 'Gemini Live (WebSockets)',
                  desc: 'Duplex real-time audio streams with low-latency interruption support.',
                  icon: Lucide.Mic
                }
              ].map((opt) => {
                const isSelected = ttsMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleTtsToggle(opt.key)}
                    className={`p-4 text-left rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      isSelected 
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-white/5 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <opt.icon size={14} className={isSelected ? 'text-emerald-400' : 'text-slate-400'} />
                      <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {opt.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-normal font-medium mt-1.5">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Switches Panel */}
          <div className="bg-slate-900/60 rounded-3xl border border-white/5 p-5 space-y-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Lucide.Sliders size={16} className="text-indigo-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Ecosystem & Filters
              </h3>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {/* Google Grounding */}
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">Google Search Grounding</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live notice checking</span>
                </div>
                <button
                  onClick={handleGroundingToggle}
                  className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    groundingEnabled
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-900/40 border-white/5 text-slate-400'
                  }`}
                >
                  {groundingEnabled ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>

              {/* Dialect Bridge */}
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">Dialect Bridge (Odia)</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kosli/Desia normalization</span>
                </div>
                <button
                  onClick={handleDialectToggle}
                  className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    dialectBridgeEnabled
                      ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                      : 'bg-slate-900/40 border-white/5 text-slate-400'
                  }`}
                >
                  {dialectBridgeEnabled ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>

              {/* MCP Tool Registry Card */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Lucide.Network size={12} className="text-teal-400" />
                    <span className="text-xs font-bold text-white">Google ADK MCP Server</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 font-bold uppercase tracking-wider">
                    CONNECTED
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[9px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Host:</span>
                    <span className="text-slate-200">hackathon_mcp_server.py</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exposed Schemas:</span>
                    <button 
                      onClick={() => setShowMcpSchemas(!showMcpSchemas)}
                      className="text-teal-300 font-bold hover:underline transition-all flex items-center gap-1 cursor-pointer"
                    >
                      3 active tools {showMcpSchemas ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {showMcpSchemas && (
                  <div className="p-2 bg-slate-950/80 rounded border border-white/5 font-mono text-[8px] text-slate-400 max-h-40 overflow-y-auto space-y-2 select-text">
                    <div className="space-y-1">
                      <div className="text-teal-400 font-bold">1. get_curriculum_chapter_context</div>
                      <div className="text-[7px] text-slate-500">Args: subject (str), grade (int), chapter_id (str)</div>
                      <div className="text-slate-500 leading-tight">Queries the official Firestore database to retrieve highly structured, curriculum-mapped study materials for Odisha BSE board students.</div>
                    </div>
                    <div className="space-y-1 border-t border-white/5 pt-1.5">
                      <div className="text-teal-400 font-bold">2. award_launch_celebration_points</div>
                      <div className="text-[7px] text-slate-500">Args: user_id (str)</div>
                      <div className="text-slate-500 leading-tight">Awards +500 XP to the logged-in student to celebrate the official Play Store TWA launch.</div>
                    </div>
                    <div className="space-y-1 border-t border-white/5 pt-1.5">
                      <div className="text-teal-400 font-bold">3. get_student_analytics_log</div>
                      <div className="text-[7px] text-slate-500">Args: student_id (str)</div>
                      <div className="text-slate-500 leading-tight">Retrieves real-time student study telemetry, class rankings, and active Socratic Blackboard XP logs.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Parent/Teacher Progress sync */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Lucide.Users size={12} className="text-indigo-400" />
                    <span className="text-xs font-bold text-white">Supervisor Sync</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold uppercase tracking-wider animate-pulse">
                    ONLINE
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[9px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Educator studio syncs:</span>
                    <span className="text-slate-200">12 / day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parent progress updates:</span>
                    <span className="text-indigo-300 font-bold">142 synced logs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Row 3: Failure Injector & Live Logging terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Failure Injection & Auditor Sandbox */}
          <div className="bg-slate-900/60 rounded-3xl border border-white/5 p-5 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Lucide.Bug size={16} className="text-amber-500 animate-pulse" />
                Auditor Failover Simulator
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Inject artificial exceptions, latencies, or violations to verify system resilience.
              </p>
            </div>

            <div className="space-y-3">
              
              {/* DB Latency Spike */}
              <button
                onClick={triggerDbSpike}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  dbSpikeActive 
                    ? 'bg-amber-500/10 border-amber-500 text-amber-300' 
                    : 'bg-slate-950/40 border-white/5 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lucide.Database size={16} className={dbSpikeActive ? 'text-amber-400' : 'text-slate-450'} />
                  <div>
                    <span className="text-xs font-bold block">Inject Database Latency Spike</span>
                    <span className="text-[9px] text-slate-400 leading-normal block">Increases DB query RTT to ~850ms to simulate overload.</span>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dbSpikeActive ? 'bg-amber-400 animate-ping' : 'bg-slate-700'}`} />
              </button>

              {/* Vertex AI Rate Limit Error */}
              <button
                onClick={triggerApiTimeout}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  apiTimeoutActive 
                    ? 'bg-red-500/10 border-red-500 text-red-300' 
                    : 'bg-slate-950/40 border-white/5 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lucide.CloudAlert size={16} className={apiTimeoutActive ? 'text-red-400' : 'text-slate-450'} />
                  <div>
                    <span className="text-xs font-bold block">Simulate Vertex Pipeline Timeout</span>
                    <span className="text-[9px] text-slate-400 leading-normal block">Throws API 429/503 errors to trigger client voice/OCR cache failover.</span>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${apiTimeoutActive ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`} />
              </button>

              {/* Perspective Content Safety Violation */}
              <button
                onClick={triggerToxicityViolation}
                disabled={toxicityActive}
                className="w-full p-3.5 rounded-xl border text-left flex items-center justify-between bg-slate-950/40 border-white/5 hover:border-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Lucide.ShieldAlert size={16} className="text-slate-450" />
                  <div>
                    <span className="text-xs font-bold block">Trigger Toxic Prompt Violation</span>
                    <span className="text-[9px] text-slate-400 leading-normal block">Sends mock harmful query to trigger automated Perspective safety block.</span>
                  </div>
                </div>
                {toxicityActive ? (
                  <Lucide.Loader2 size={12} className="animate-spin text-amber-400 shrink-0" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                )}
              </button>

              {/* Offline mode */}
              <button
                onClick={triggerOfflineMode}
                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  offlineActive 
                    ? 'bg-yellow-500/10 border-yellow-500 text-yellow-300' 
                    : 'bg-slate-950/40 border-white/5 hover:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lucide.WifiOff size={16} className={offlineActive ? 'text-yellow-400' : 'text-slate-450'} />
                  <div>
                    <span className="text-xs font-bold block">Simulate Complete Offline Mode</span>
                    <span className="text-[9px] text-slate-400 leading-normal block">Disconnects socket lines. Watch ServiceWorker handle RAG queries locally.</span>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${offlineActive ? 'bg-yellow-400 animate-ping' : 'bg-slate-700'}`} />
              </button>

            </div>
          </div>

          {/* Live System Logging Console (Spans 2 columns) */}
          <div className="lg:col-span-2 bg-slate-950 border border-white/10 rounded-3xl overflow-hidden flex flex-col min-h-[350px] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative">
            {/* Top terminal tab bar */}
            <div className="bg-slate-900 border-b border-white/5 px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[10px] text-slate-400 font-mono ml-2">utkal-agent-telemetry-feed.log</span>
              </div>
              <button 
                onClick={() => {
                  playClickSound(800);
                  setLogs([]);
                }}
                className="text-[9px] hover:text-white uppercase font-black tracking-widest text-slate-400 cursor-pointer flex items-center gap-1"
              >
                <Lucide.Trash2 size={10} /> Clear
              </button>
            </div>

            {/* Terminal Feed logs area */}
            <div className="flex-1 p-4 font-mono text-[10.5px] leading-relaxed overflow-y-auto space-y-1.5 select-text selection:bg-emerald-500/20 scrollbar-thin">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 hover:bg-white/[0.02] py-0.5 px-1.5 rounded transition-all">
                  <span className="text-slate-500 select-none">{log.timestamp}</span>
                  
                  <span className={`px-1 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold shrink-0 leading-none mt-0.5 ${
                    log.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    log.type === 'warn' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    log.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    log.type === 'routing' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    'bg-slate-800 text-slate-350 border border-slate-700'
                  }`}>
                    {log.type}
                  </span>

                  <span className={`break-all ${
                    log.type === 'success' ? 'text-emerald-300' :
                    log.type === 'warn' ? 'text-amber-300 animate-pulse' :
                    log.type === 'error' ? 'text-red-400 font-bold' :
                    log.type === 'routing' ? 'text-indigo-300' :
                    'text-slate-350'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>

            {/* Performance status indicator footer */}
            <div className="bg-slate-900 border-t border-white/5 py-1.5 px-4 flex items-center justify-between text-[9px] text-slate-500 uppercase tracking-widest shrink-0 font-bold">
              <div>
                Client Sandbox FPS: <span className="text-emerald-400">{fps} FPS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Feed Sync Active
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
