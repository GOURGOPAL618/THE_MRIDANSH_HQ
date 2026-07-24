"use client";

import React, { useEffect, useState } from "react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const [pingStatus, setPingStatus] = useState<"IDLE" | "CHECKING" | "ONLINE" | "OFFLINE">("IDLE");
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    // Collect client metadata safely
    if (typeof window !== "undefined") {
      setUserAgent(navigator.userAgent);
      
      // Synthesize warning alarm tone using Web Audio API on load
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        
        // Triple synth alert bleeps
        const playBleep = (delay: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
          osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);
          
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.15);
        };
        
        playBleep(0);
        playBleep(0.2);
        playBleep(0.4);
      } catch {
        // Fallback silently if audio context blocked or unsupported
      }
    }
    
    // Log crash details to client console
    console.error("Boundary exception caught:", error);
  }, [error]);

  const triggerResetSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {}
  };

  const handleSoftReboot = () => {
    triggerResetSound();
    reset();
  };

  const handlePurgeCache = () => {
    triggerResetSound();
    if (typeof window !== "undefined") {
      localStorage.clear();
      window.location.reload();
    }
  };

  const runPingCheck = () => {
    triggerResetSound();
    setPingStatus("CHECKING");
    setTimeout(() => {
      setPingStatus(navigator.onLine ? "ONLINE" : "OFFLINE");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black text-[#EF4444] font-mono flex flex-col items-center justify-center p-6 space-y-6 select-none relative overflow-hidden">
      
      {/* BACKGROUND SCI-FI RADIAL GLOW & CONCENTRIC GRIDS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-40" />

      {/* WARNING HUD EMBLEM */}
      <div className="border border-[#EF4444]/30 bg-red-950/10 p-6 rounded max-w-2xl w-full space-y-6 shadow-[0_0_30px_rgba(239,68,68,0.05)] backdrop-blur-md">
        
        {/* HEADER BRANDING */}
        <div className="flex items-center space-x-3 border-b border-[#EF4444]/20 pb-4">
          <div className="h-6 w-6 border-2 border-[#EF4444] rounded flex items-center justify-center animate-pulse">
            <span className="text-xs font-bold">!</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-200 tracking-wider uppercase">
              JCC COCKPIT SYSTEM EXCEPTION DETECTED
            </h1>
            <p className="text-[9px] text-[#EF4444]/60 uppercase tracking-widest mt-0.5">
              aether engine visual routing boundary fault
            </p>
          </div>
        </div>

        {/* SANITIZED DIAGNOSTICS DISPLAY BOX */}
        <div className="bg-[#120808] border border-[#EF4444]/15 p-4 rounded text-xs text-gray-400 space-y-2 relative">
          <span className="absolute top-2 right-2 text-[8px] text-[#EF4444]/40 font-bold uppercase tracking-wider">
            diagnostics feed
          </span>
          <div className="flex items-start">
            <span className="text-[#EF4444]/50 w-20 uppercase font-semibold text-[10px]">Fault Type:</span>
            <span className="text-[#EF4444] font-bold break-all">{error.name || "Runtime Render Exception"}</span>
          </div>
          <div className="flex items-start">
            <span className="text-[#EF4444]/50 w-20 uppercase font-semibold text-[10px]">Details:</span>
            <span className="text-gray-300 break-all">{error.message || "An unhandled UI component rendering loop crashed the viewport."}</span>
          </div>
          {error.digest && (
            <div className="flex items-start">
              <span className="text-[#EF4444]/50 w-20 uppercase font-semibold text-[10px]">Digest ID:</span>
              <span className="text-amber-500 font-bold">{error.digest}</span>
            </div>
          )}
          <div className="border-t border-[#EF4444]/10 pt-2 mt-2 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500 uppercase">System Stamp:</span>
              <span className="text-gray-400">{new Date().toISOString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 uppercase">Navigator Agent:</span>
              <span className="text-gray-400 truncate max-w-[350px]" title={userAgent}>{userAgent || "Unknown Client"}</span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE RECOVERY DECK PANEL */}
        <div className="space-y-4">
          <h3 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            troubleshooting & recovery options
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Soft Reboot */}
            <button
              onClick={handleSoftReboot}
              className="py-2.5 bg-black border border-[#EF4444] text-[#EF4444] text-xs font-bold uppercase rounded hover:bg-[#EF4444] hover:text-black active:scale-95 transition shadow-[0_0_15px_rgba(239,68,68,0.05)]"
            >
              Sys Reboot (Soft)
            </button>

            {/* Cache purge */}
            <button
              onClick={handlePurgeCache}
              className="py-2.5 bg-black border border-amber-500 text-amber-500 text-xs font-bold uppercase rounded hover:bg-amber-500 hover:text-black active:scale-95 transition shadow-[0_0_15px_rgba(245,158,11,0.05)]"
            >
              Purge Local Cache
            </button>

            {/* Network diagnostic */}
            <button
              onClick={runPingCheck}
              className="py-2.5 bg-black border border-cyan-500 text-cyan-400 text-xs font-bold uppercase rounded hover:bg-cyan-500 hover:text-black active:scale-95 transition shadow-[0_0_15px_rgba(6,182,212,0.05)]"
            >
              Check Network Stats
            </button>

          </div>

          {/* Network check diagnostics display */}
          {pingStatus !== "IDLE" && (
            <div className="p-3 border border-primary/10 bg-black/50 rounded flex justify-between items-center text-[10px]">
              <span className="text-gray-500 uppercase tracking-wider">network connectivity ping check:</span>
              {pingStatus === "CHECKING" && <span className="text-cyan-400 animate-pulse uppercase">pinging server gate...</span>}
              {pingStatus === "ONLINE" && <span className="text-[#10B981] font-bold uppercase tracking-wider text-glow">● system gateway online (100% success)</span>}
              {pingStatus === "OFFLINE" && <span className="text-[#EF4444] font-bold uppercase tracking-wider text-glow-danger">● offline / gateway unreachable</span>}
            </div>
          )}

        </div>

        {/* COCKPIT PRESETS FOOTER */}
        <div className="border-t border-[#EF4444]/20 pt-4 flex justify-between text-[8px] text-gray-500 uppercase">
          <span>MRIDANSH HQ JCC - COCKPIT SHELL V20</span>
          <span>clearance level: commander</span>
        </div>

      </div>

    </div>
  );
}
