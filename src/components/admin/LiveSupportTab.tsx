import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import * as Lucide from 'lucide-react';
import { joinSupportSession, endSupportSession, sendRemoteCommand, SupportSession, requestScreenShare, stopScreenShare } from '../../services/supportService';

interface LiveSupportTabProps {
  user: any;
}

export const LiveSupportTab: React.FC<LiveSupportTabProps> = ({ user }) => {
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [activeSession, setActiveSession] = useState<SupportSession | null>(null);
  const [pointerActive, setPointerActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenShareState, setScreenShareState] = useState<'inactive' | 'requested' | 'streaming' | 'failed' | 'unsupported'>('inactive');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const unsubSessionRef = useRef<(() => void) | null>(null);
  const unsubStudentCandidatesRef = useRef<(() => void) | null>(null);

  const stopMirroring = async (isManualStop = false) => {
    if (unsubStudentCandidatesRef.current) unsubStudentCandidatesRef.current();
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setStream(null);
    if (activeSession && isManualStop) {
      try {
        await stopScreenShare(activeSession.id);
      } catch (err) {
        console.warn("Mirroring document already ended or cleaned up.", err);
      }
    }
  };

  const startWebRTCReceiver = async (offer: any) => {
    try {
      const servers = {
        iceServers: [
          { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
        ]
      };
      const peerConnection = new RTCPeerConnection(servers);
      pcRef.current = peerConnection;

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate && activeSession) {
          await addDoc(
            collection(db, 'remote_support', activeSession.id, 'admin_candidates'),
            event.candidate.toJSON()
          );
        }
      };

      peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setStream(event.streams[0]);
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0];
          }
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answerDescription = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answerDescription);

      const answer = {
        sdp: answerDescription.sdp,
        type: answerDescription.type
      };

      if (activeSession) {
        await updateDoc(doc(db, 'remote_support', activeSession.id), {
          webrtc_answer: answer
        });

        const unsubCandidates = onSnapshot(
          collection(db, 'remote_support', activeSession.id, 'student_candidates'),
          (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                peerConnection.addIceCandidate(candidate);
              }
            });
          }
        );
        unsubStudentCandidatesRef.current = unsubCandidates;
      }

    } catch (err) {
      console.error("WebRTC Receiver Setup Failed:", err);
    }
  };

  useEffect(() => {
    // Listen for all pending and active sessions
    const q = query(collection(db, 'remote_support'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => doc.data() as SupportSession);
      const active = data.find(s => s.status === 'active' && s.adminUid === user?.uid);
      
      setActiveSession(active || null);
      
      // Filter out only pending sessions for the queue
      setSessions(data.filter(s => s.status === 'pending'));
    });

    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!activeSession) {
      stopMirroring();
      return;
    }

    const unsubSession = onSnapshot(doc(db, 'remote_support', activeSession.id), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setScreenShareState(data.screenShareStatus || 'inactive');

      if (data.screenShareStatus === 'streaming' && data.webrtc_offer && !pcRef.current) {
        await startWebRTCReceiver(data.webrtc_offer);
      } else if (data.screenShareStatus === 'inactive' || !data.screenShareRequested) {
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        setStream(null);
      }
    });

    unsubSessionRef.current = unsubSession;

    return () => {
      if (unsubSession) unsubSession();
      stopMirroring();
    };
  }, [activeSession?.id]);

  // Pointer Sync Effect
  useEffect(() => {
    if (!activeSession || !pointerActive) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate relative position based on screen percentage
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      // Update pointer in firestore
      // We throttle this to prevent too many writes
      sendRemoteCommand(activeSession.id, {
        type: 'pointer',
        data: { x, y },
        timestamp: Date.now()
      });
    };

    let timeout: any;
    const throttledMouseMove = (e: MouseEvent) => {
      if (timeout) return;
      timeout = setTimeout(() => {
        handleMouseMove(e);
        timeout = null;
      }, 50); // 20fps update rate
    };

    window.addEventListener('mousemove', throttledMouseMove);
    return () => {
      window.removeEventListener('mousemove', throttledMouseMove);
      if (timeout) clearTimeout(timeout);
    };
  }, [activeSession, pointerActive]);

  const handleAcceptNext = async () => {
    if (sessions.length === 0 || !user?.uid) return;
    const oldestSession = sessions[0];
    try {
      await joinSupportSession(oldestSession.id, user.uid);
    } catch (err) {
      console.error("Error joining session", err);
      alert("Could not join session.");
    }
  };

  const handleForceNavigate = (target: string) => {
    if (!activeSession) return;
    sendRemoteCommand(activeSession.id, {
      type: 'navigate',
      target,
      timestamp: Date.now()
    });
  };

  if (activeSession) {
    return (
      <div className="space-y-6">
        {/* Connection Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-slate-900/60 border border-white/5 rounded-3xl gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
              <Lucide.ShieldCheck size={24} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-emerald-400">Live Support Active</h3>
              <p className="text-sm text-slate-300">Connected to: <span className="font-bold text-white">{activeSession.studentName}</span></p>
            </div>
          </div>
          <button 
            onClick={() => endSupportSession(activeSession.id)}
            className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Lucide.XOctagon size={20} />
            End Session
          </button>
        </div>

        {/* 3-Column layout when streaming, otherwise 2-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* SCREEN MIRROR PLAYER (Spans 2 columns if mirroring is streaming) */}
          <div className={`xl:col-span-2 p-6 bg-slate-950/60 rounded-3xl border border-white/5 flex flex-col min-h-[400px] ${screenShareState === 'streaming' ? '' : 'hidden xl:flex items-center justify-center text-center'}`}>
            {screenShareState === 'streaming' ? (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h4 className="text-md font-bold text-white uppercase tracking-wider text-xs">Live Screen Mirror</h4>
                  </div>
                  <button 
                    onClick={() => stopMirroring(true)}
                    className="text-xs text-red-400 hover:text-red-300 font-bold uppercase flex items-center gap-1.5"
                  >
                    <Lucide.XCircle size={14} /> Stop Stream
                  </button>
                </div>
                
                {/* Mirroring Stream Video Box */}
                <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex-1 flex items-center justify-center group">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Virtual Pointer Mousepad layer overlay inside the video box */}
                  <div className="absolute inset-0 z-10 cursor-crosshair" />
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col h-full space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Co-Browsing Telemetry HUD</h4>
                  </div>
                  <div className="text-[10px] bg-slate-850 text-slate-300 px-2 py-0.5 rounded-full font-black uppercase">
                    PWA State Sync Active
                  </div>
                </div>

                {/* Dashboard grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                  
                  {/* Current Page Telemetry */}
                  <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-black text-slate-500 uppercase tracking-wider">📍 Student Current View</div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-10 h-10 bg-[#ffd700]/10 rounded-xl flex items-center justify-center border border-[#ffd700]/20 text-[#ffd700]">
                          {activeSession.currentPage === 'study_buddy' ? (
                            <Lucide.Bot size={20} />
                          ) : activeSession.currentPage === 'daily_mcqs' ? (
                            <Lucide.HelpCircle size={20} />
                          ) : activeSession.currentPage === 'avatar_store' ? (
                            <Lucide.UserCircle2 size={20} />
                          ) : activeSession.currentPage === 'practice' ? (
                            <Lucide.ClipboardList size={20} />
                          ) : activeSession.currentPage === 'syllabus_tracker' ? (
                            <Lucide.TrendingUp size={20} />
                          ) : (
                            <Lucide.Home size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-black text-white capitalize">
                            {activeSession.currentPage ? activeSession.currentPage.replace('_', ' ') : 'Dashboard'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Active App Tab
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[11px] text-slate-400 leading-normal bg-white/5 p-3 rounded-xl border border-white/5">
                      💡 Use **Force Navigation** in the right-hand panel to teleport this student to any other feature!
                    </div>
                  </div>

                  {/* Scroll Depth Telemetry */}
                  <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs font-black text-slate-500 uppercase tracking-wider">📜 Live Scroll Position</div>
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scroll depth</span>
                          <span className="text-md font-black text-emerald-400">{activeSession.scrollPct ?? 0}%</span>
                        </div>
                        {/* Progress track */}
                        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            style={{ width: `${activeSession.scrollPct ?? 0}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          {activeSession.scrollPct === undefined || activeSession.scrollPct === 0 
                            ? "Reading top of the page" 
                            : activeSession.scrollPct > 80 
                            ? "Reached bottom of the page" 
                            : `Reading middle of the page`}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 leading-normal bg-white/5 p-3 rounded-xl border border-white/5">
                      💡 When they scroll up or down on their mobile phone, this bar moves in **real-time**!
                    </div>
                  </div>

                </div>

                {/* Mobile screen mirror advice alert */}
                <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400">
                    <Lucide.Smartphone size={16} />
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-300">
                    <span className="font-bold text-white block mb-0.5">Mobile-Friendly Optimization Active</span>
                    To conserve the student's mobile data and run smoothly on 4G networks in Odisha, we are syncing telemetry instead of capturing video. You can see their exact position, scroll depth, and direct pointer coordinates seamlessly.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SIDE PANEL CONTROLS */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* SCREEN SHARING BUTTON */}
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-white/5 space-y-4">
              <h4 className="text-md font-bold text-white">Screen Mirror Control</h4>
              
              {screenShareState === 'inactive' && (
                <button 
                  onClick={() => requestScreenShare(activeSession.id)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <Lucide.MonitorPlay size={20} />
                  Request Screen Mirror
                </button>
              )}

              {screenShareState === 'requested' && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 text-yellow-400">
                  <Lucide.Loader2 size={20} className="animate-spin shrink-0" />
                  <p className="text-xs font-bold leading-normal">Waiting for student authorization...</p>
                </div>
              )}

              {screenShareState === 'streaming' && (
                <button 
                  onClick={() => stopMirroring(true)}
                  className="w-full py-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-500/10"
                >
                  <Lucide.MonitorX size={20} />
                  Stop Mirror Stream
                </button>
              )}

              {screenShareState === 'failed' && (
                <div className="space-y-3">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                    <Lucide.AlertTriangle size={20} className="shrink-0" />
                    <p className="text-xs font-bold leading-normal">Request declined by user.</p>
                  </div>
                  <button 
                    onClick={() => requestScreenShare(activeSession.id)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Lucide.RefreshCw size={16} /> Retry Screen Share
                  </button>
                </div>
              )}

              {screenShareState === 'unsupported' && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-3 text-orange-400">
                  <Lucide.Smartphone size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold leading-normal mb-1">📱 Mobile Sandbox Restricted</p>
                    <p className="text-[10px] text-slate-300 leading-normal">Screen sharing is restricted by iOS and Android mobile web sandboxes. You can still guide them using the **Virtual Pointer** and **Force Navigation**!</p>
                  </div>
                </div>
              )}
            </div>

            {/* VIRTUAL POINTER */}
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all ${pointerActive ? 'bg-red-500 border-red-300 animate-pulse scale-110 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-slate-700 border-slate-600'}`}>
                <Lucide.MousePointer2 size={32} className="text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Virtual Pointer</h4>
                <p className="text-xs text-slate-400">Share your mouse movements with the student in real-time.</p>
              </div>
              <button 
                onClick={() => setPointerActive(!pointerActive)}
                className={`px-6 py-3.5 rounded-xl font-bold w-full transition-colors ${pointerActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {pointerActive ? 'Stop Pointer Sharing' : 'Start Pointer Sharing'}
              </button>
            </div>

            {/* FORCE NAVIGATION */}
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-white/5 space-y-4">
              <div>
                <h4 className="text-md font-bold text-white mb-1">Force Navigation Teleport</h4>
                <p className="text-xs text-slate-400">Instantly redirect the student's screen to any tab.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { target: 'dashboard', label: 'Dashboard', icon: Lucide.Home, color: 'text-blue-400 hover:bg-blue-500/10' },
                  { target: 'study_buddy', label: 'Study Buddy', icon: Lucide.Bot, color: 'text-purple-400 hover:bg-purple-500/10' },
                  { target: 'daily_mcqs', label: 'Daily MCQs', icon: Lucide.Zap, color: 'text-amber-400 hover:bg-amber-500/10' },
                  { target: 'practice', label: 'Practice Hub', icon: Lucide.ClipboardList, color: 'text-emerald-400 hover:bg-emerald-500/10' },
                  { target: 'textbooks', label: 'Textbooks', icon: Lucide.BookOpen, color: 'text-cyan-400 hover:bg-cyan-500/10' },
                  { target: 'monthly_tests', label: 'Monthly Tests', icon: Lucide.HelpCircle, color: 'text-pink-400 hover:bg-pink-500/10' },
                  { target: 'avatar_store', label: 'Avatar Store', icon: Lucide.UserCircle2, color: 'text-orange-400 hover:bg-orange-500/10' },
                  { target: 'syllabus_tracker', label: 'Syllabus', icon: Lucide.TrendingUp, color: 'text-teal-400 hover:bg-teal-500/10' },
                  { target: 'support', label: 'Live Support', icon: Lucide.Shield, color: 'text-rose-400 hover:bg-rose-500/10' },
                ].map((item) => (
                  <button 
                    key={item.target}
                    onClick={() => handleForceNavigate(item.target)} 
                    className={`p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white text-left flex items-center gap-2 transition-all border border-white/5 active:scale-95 hover:border-white/10 ${item.color}`}
                  >
                    <item.icon size={13} className="shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Session Queue</h2>
          <p className="text-slate-400">Students waiting for live support</p>
        </div>
        
        <button 
          onClick={handleAcceptNext}
          disabled={sessions.length === 0}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2"
        >
          <Lucide.PhoneCall size={20} />
          Accept Next ({sessions.length} Waiting)
        </button>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Lucide.Coffee size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-bold">Queue is empty</p>
            <p className="text-sm">No students are currently waiting for support.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {sessions.map((session, index) => (
              <div key={session.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{session.studentName}</h4>
                    <p className="text-xs text-slate-400">Waiting since: {session.createdAt?.toDate().toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full">
                    Code: {session.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
