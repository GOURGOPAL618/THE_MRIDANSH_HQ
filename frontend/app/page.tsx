"use client";

import React, { useEffect, useState } from "react";
import BaseLayout from "../layouts/BaseLayout";
import Panel from "../components/Panel";
import Button from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import { useNotification } from "../hooks/useNotification";
import { useAuth } from "../contexts/AuthContext";

const logsSequence = [
  "Establishing secure quantum uplink...",
  "Validating Commander Gourgopal Mohapatra authorization tokens...",
  "Initializing Jagannath Command Center (JCC) protocols...",
  "Starting AETHER-MRID1607X core telemetry feeds...",
  "Caching regional coordinates database...",
  "Pre-loading global satellite radar grids...",
  "Mounting Research and Dataset Vault nodes...",
  "System diagnostics: 100% stable.",
  "THE MRIDANSH COMMAND HQ ONLINE.",
];

export default function MissionInitializationPage() {
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, logout, isAuthenticated, commander, isLoading } = useAuth();
  const { notifySuccess, notifyError } = useNotification();

  useEffect(() => {
    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logsSequence.length) {
        setBootLogs((prev) => [...prev, logsSequence[currentLogIndex]]);
        setBootProgress((prev) => Math.min(prev + 12, 100));
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
        setBootProgress(100);
        setIsReady(true);
      }
    }, 300); // Speed up slightly for premium snappy feel

    return () => clearInterval(logInterval);
  }, []);

  const handleAccessCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsSubmitting(true);
    const success = await login(password);
    setIsSubmitting(false);
    if (!success) {
      setPassword("");
    }
  };

  // If AuthContext is checking credentials on load, show system loader
  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#05070B] font-mono">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 tracking-widest animate-pulse">SYNCHRONIZING SECURE TELEMETRY FEED...</p>
        </div>
      </main>
    );
  }

  // If Commander has authorized access, transition into the Base Cockpit Layout
  if (isAuthenticated && commander) {
    return (
      <BaseLayout>
        <div className="space-y-6">
          <Panel 
            title="Jagannath Command Center (JCC) Console" 
            subtitle="Central Cockpit Operations Center"
            statusIndicator="healthy"
          >
            <div className="space-y-6 font-mono">
              <div className="border-l-2 border-[#0072FF] pl-4 py-1 text-xs text-gray-300 flex justify-between items-center">
                <div>
                  Welcome back, <span className="text-[#00FFFF] font-bold">{commander.username}</span>. The cockpit environment is fully operational.
                  Select modules in the sidebar for telemetry control.
                </div>
                <Button variant="secondary" onClick={() => logout()}>
                  TERMINATE SESSION
                </Button>
              </div>

              {/* Grid of system diagnostics cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Panel variant="secondary" title="REACTOR STATUS" statusIndicator="healthy">
                  <div className="space-y-2 text-[10px] text-gray-400">
                    <div className="flex justify-between">
                      <span>CORE ENGINE</span>
                      <span className="text-success font-bold">NOMINAL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TEMPERATURE</span>
                      <span className="text-[#00FFFF]">298K (24.8°C)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>THRUST VECTOR</span>
                      <span className="text-success">0% (IDLE)</span>
                    </div>
                  </div>
                </Panel>

                <Panel variant="secondary" title="RADAR SCANNER" statusIndicator="warning">
                  <div className="space-y-2 text-[10px] text-gray-400">
                    <div className="flex justify-between">
                      <span>SWEEP MODE</span>
                      <span className="text-[#00FFFF] font-bold">STANDBY</span>
                    </div>
                    <div className="flex justify-between">
                      <span>RADAR GRID</span>
                      <span className="text-success">SYNCD (100%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TARGET COUNT</span>
                      <span>0 DETECTED</span>
                    </div>
                  </div>
                </Panel>

                <Panel variant="secondary" title="SECURE ACCESS" statusIndicator="healthy">
                  <div className="space-y-2 text-[10px] text-gray-400">
                    <div className="flex justify-between">
                      <span>CLEARANCE LEVEL</span>
                      <span className="text-success font-bold">{commander.role.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DECRYPTION ENGINE</span>
                      <span className="text-success">ACTIVE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LOCKDOWN MODE</span>
                      <span className="text-warning">ARMED</span>
                    </div>
                  </div>
                </Panel>
              </div>

              {/* Footer status summary alerts */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-primary/10 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status="healthy" label="SYSTEMS ONLINE" />
                  <StatusBadge status="standby" label="TELEMETRY FEED STANDBY" />
                  <StatusBadge status="offline" label="STAGING LINK INACTIVE" />
                </div>
                
                <Button 
                  variant="glow"
                  onClick={() => alert("Cockpit action initiated: Querying active aerospace coordinates.")}
                >
                  Query Coordinates
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </BaseLayout>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#05070B] p-4 relative overflow-hidden font-mono selection:bg-[#0072FF] selection:text-white">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0E1525_1px,transparent_1px),linear-gradient(to_bottom,#0E1525_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

      {/* Futuristic Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0072FF]/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Initialization Container */}
      <div className="w-full max-w-2xl bg-[#0E1525]/90 border border-primary/20 backdrop-blur-md rounded-lg p-6 shadow-glow relative z-10">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#0E1525]/50 pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-danger animate-pulse"></span>
            <span className="w-3 h-3 rounded-full bg-warning"></span>
            <span className="w-3 h-3 rounded-full bg-success"></span>
            <span className="text-xs text-gray-500 font-bold ml-2">JCC-BOOT-SYS: v1.0.0</span>
          </div>
          <span className="text-xs text-primary-glow font-bold animate-pulse">UPLINK ACTIVE</span>
        </div>

        {/* Commander Branding */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold tracking-widest text-glow text-white">
            THE MRIDANSH COMMAND HQ
          </h1>
          <p className="text-xs text-gray-400 mt-2 tracking-wider">
            Commander Profile: <span className="text-[#00FFFF]">Gourgopal Mohapatra</span>
          </p>
        </div>

        {/* Simulated Logs Stream */}
        <div className="h-48 overflow-y-auto bg-black/50 border border-[#05070B] rounded p-4 text-xs space-y-2 mb-6 font-mono text-gray-300">
          {bootLogs.map((log, index) => (
            <div key={index} className="flex items-start">
              <span className="text-primary mr-2 font-bold">&gt;</span>
              <p>{log}</p>
            </div>
          ))}
          {!isReady && (
            <div className="flex items-center text-primary-glow animate-pulse">
              <span className="mr-2 font-bold">&gt;</span>
              <span className="w-2 h-4 bg-primary-glow inline-block"></span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold text-gray-400">
            <span>CORE BOOTING PROGRESS</span>
            <span className="text-[#00FFFF]">{bootProgress}%</span>
          </div>
          <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-[#0E1525]">
            <div 
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
              style={{ width: `${bootProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="mt-8 border-t border-[#0E1525]/50 pt-6">
          {isReady ? (
            <form onSubmit={handleAccessCommand} className="space-y-4 max-w-sm mx-auto">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-400 text-center tracking-widest">
                  ENTER COCKPIT SECURITY KEY
                </label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="••••••••••••••"
                  className="w-full text-center px-4 py-2.5 bg-black/60 border border-primary/30 rounded font-mono text-[#00FFFF] placeholder-primary/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 disabled:opacity-50"
                  required
                />
              </div>
              <div className="flex justify-center pt-2">
                <button 
                  type="submit"
                  disabled={isSubmitting || !password}
                  className="px-8 py-3 bg-[#0072FF]/20 border border-primary text-[#00FFFF] hover:bg-[#0072FF]/40 font-bold rounded tracking-widest shadow-cyan-glow transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none"
                >
                  {isSubmitting ? "AUTHORIZING..." : "ACCESS COMMAND CENTER"}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center text-xs text-gray-500 animate-pulse tracking-widest">
              SYSTEM STANDBY - AUTHENTICATING COMMANDER UPLINK...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
