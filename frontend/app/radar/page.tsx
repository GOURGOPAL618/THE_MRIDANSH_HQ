"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import RadarDisplay, { RadarTarget } from "../../components/RadarDisplay";
import { api } from "../../services/api";

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// 1. Orbital Elevation Profile Mini-Radar Component (Z-Axis mapping)
function OrbitalElevationScan({ targets, selectedTargetId }: { targets: RadarTarget[]; selectedTargetId: string | null }) {
  const width = 280;
  const height = 110;
  const padding = 15;
  
  const [scanY, setScanY] = useState(padding);
  const direction = useRef(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanY((prev) => {
        let next = prev + direction.current * 1.2;
        if (next >= height - padding) {
          direction.current = -1;
          next = height - padding;
        } else if (next <= padding) {
          direction.current = 1;
          next = padding;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/40 border border-primary/10 rounded p-2 text-center font-mono">
      <span className="text-[8px] text-gray-500 uppercase tracking-wider block mb-1.5 font-bold">ALTITUDE ELEVATION SCAN</span>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-black/60 border border-primary/5 rounded">
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(0, 255, 255, 0.04)" />
        <line x1={width / 2} y1={padding} x2={width / 2} y2={height - padding} stroke="rgba(0, 255, 255, 0.04)" />
        <line x1={padding} y1={scanY} x2={width - padding} y2={scanY} stroke="rgba(0, 255, 255, 0.15)" strokeWidth="1" />
        
        {targets.map((tgt) => {
          const x = padding + (tgt.distance / 200) * (width - 2 * padding);
          const y = height - padding - (tgt.elevation / 90) * (height - 2 * padding);
          const isSelected = selectedTargetId === tgt.id;

          return (
            <g key={tgt.id}>
              <circle
                cx={x}
                cy={y}
                r={isSelected ? "3.5" : "1.5"}
                fill={isSelected ? "#EF4444" : "#00FFFF"}
                className={isSelected ? "animate-pulse" : ""}
              />
              {isSelected && (
                <circle cx={x} cy={y} r="6" stroke="#EF4444" strokeWidth="0.5" fill="none" className="animate-ping" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 2. Sector Scan Mini-Radar Component (High-Velocity sweeping)
function SectorScan({ targets, selectedTargetId }: { targets: RadarTarget[]; selectedTargetId: string | null }) {
  const width = 280;
  const height = 110;
  const centerX = width / 2;
  const centerY = height - 8;
  const maxRadius = height - 15;

  const [sweepAngle, setSweepAngle] = useState(45);
  const direction = useRef(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSweepAngle((prev) => {
        let next = prev + direction.current * 1.8;
        if (next >= 135) {
          direction.current = -1;
          next = 135;
        } else if (next <= 45) {
          direction.current = 1;
          next = 45;
        }
        return next;
      });
    }, 25);
    return () => clearInterval(interval);
  }, []);

  const sweepRad = (sweepAngle - 180) * (Math.PI / 180);

  return (
    <div className="bg-black/40 border border-primary/10 rounded p-2 text-center font-mono">
      <span className="text-[8px] text-gray-500 uppercase tracking-wider block mb-1.5 font-bold">GIMBAL ARC SECTOR SCAN</span>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-black/60 border border-primary/5 rounded overflow-hidden">
        <path
          d={`M ${centerX + maxRadius * Math.cos(-Math.PI * 0.75)} ${centerY + maxRadius * Math.sin(-Math.PI * 0.75)} 
             A ${maxRadius} ${maxRadius} 0 0 1 ${centerX + maxRadius * Math.cos(-Math.PI * 0.25)} ${centerY + maxRadius * Math.sin(-Math.PI * 0.25)}`}
          fill="none"
          stroke="rgba(0, 255, 255, 0.08)"
          strokeWidth="1"
        />
        <line x1={centerX} y1={centerY} x2={centerX + maxRadius * Math.cos(-Math.PI * 0.75)} y2={centerY + maxRadius * Math.sin(-Math.PI * 0.75)} stroke="rgba(0, 255, 255, 0.03)" />
        <line x1={centerX} y1={centerY} x2={centerX + maxRadius * Math.cos(-Math.PI * 0.25)} y2={centerY + maxRadius * Math.sin(-Math.PI * 0.25)} stroke="rgba(0, 255, 255, 0.03)" />
        
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + maxRadius * Math.cos(sweepRad)}
          y2={centerY + maxRadius * Math.sin(sweepRad)}
          stroke="rgba(0, 255, 255, 0.3)"
          strokeWidth="1"
        />

        {targets.map((tgt) => {
          const normBearing = 45 + (tgt.bearing % 90); 
          const targetRad = (normBearing - 180) * (Math.PI / 180);
          const distPercent = tgt.distance / 200;
          const targetRadius = distPercent * maxRadius;

          const tx = centerX + targetRadius * Math.cos(targetRad);
          const ty = centerY + targetRadius * Math.sin(targetRad);
          const isSelected = selectedTargetId === tgt.id;

          return (
            <circle
              key={tgt.id}
              cx={tx}
              cy={ty}
              r={isSelected ? "3" : "1.5"}
              fill={isSelected ? "#EF4444" : "rgba(0, 255, 255, 0.5)"}
            />
          );
        })}
      </svg>
    </div>
  );
}

// 3. Spectral Wave Spectrogram Mini-Radar Component (Target lock-on wave)
function SignalSpectrumAnalyzer({ selectedTarget }: { selectedTarget: RadarTarget | null }) {
  const width = 280;
  const height = 110;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((prev) => (prev + 0.18) % (2 * Math.PI));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const points: string[] = [];
  const amplitude = selectedTarget ? 24 : 6;
  const frequency = selectedTarget ? 5 : 2;

  for (let x = 0; x <= width; x += 5) {
    const y = height / 2 + Math.sin((x / width) * Math.PI * frequency + phase) * amplitude 
                 + Math.cos((x / width) * Math.PI * 12 + phase * 1.5) * (amplitude * 0.15);
    points.push(`${x},${y.toFixed(1)}`);
  }

  return (
    <div className="bg-black/40 border border-primary/10 rounded p-2 text-center font-mono">
      <span className="text-[8px] text-gray-500 uppercase tracking-wider block mb-1.5 font-bold">FREQUENCY SPECTRUM SCAN</span>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-black/60 border border-primary/5 rounded">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(0, 255, 255, 0.04)" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={selectedTarget ? "#EF4444" : "#00FFFF"}
          strokeWidth="1.2"
        />
        {selectedTarget && (
          <text x="10" y="20" fill="#EF4444" className="text-[8px] uppercase animate-pulse font-bold">
            LOCK SIG: {selectedTarget.id} ({(selectedTarget.speed * 0.035).toFixed(2)} GHz)
          </text>
        )}
      </svg>
    </div>
  );
}

export default function RadarControlPage() {
  const [targets, setTargets] = useState<RadarTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Settings states
  const [maxRange, setMaxRange] = useState<number>(200);
  const [sweepSpeed, setSweepSpeed] = useState<number>(1.0);
  const [showNoise, setShowNoise] = useState(true);

  // Target lock state
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<RadarTarget | null>(null);

  // Sync selected target details when target list updates
  useEffect(() => {
    if (selectedTargetId) {
      const match = targets.find((t) => t.id === selectedTargetId);
      if (match) {
        setSelectedTarget(match);
      }
    } else {
      setSelectedTarget(null);
    }
  }, [targets, selectedTargetId]);

  // Fetch targets telemetry helper
  const fetchRadarTargets = async (silent = false, signal?: AbortSignal) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await api.get<ApiResponseEnvelope<RadarTarget[]>>(
        "/api/v1/radar/targets",
        undefined,
        { signal }
      );
      
      if (response.data && response.data.success) {
        if (signal?.aborted) return;
        setTargets(response.data!.data);
        setErrorMsg(null);
      } else if (response.error) {
        if (signal?.aborted) return;
        setErrorMsg(response.error);
      }
    } catch {
      if (signal?.aborted) return;
      setErrorMsg("Failed to establish uplink with radar sweep controller.");
    } finally {
      if (!silent && !signal?.aborted) setIsLoading(false);
    }
  };

  // Setup periodic telemetry polling with AbortController and Page Visibility API
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let controller = new AbortController();

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        controller.abort();
        controller = new AbortController();
        fetchRadarTargets(true, controller.signal);
      }, 5000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      controller.abort();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        controller.abort();
        controller = new AbortController();
        fetchRadarTargets(true, controller.signal);
        startPolling();
      }
    };

    fetchRadarTargets(false, controller.signal);
    startPolling();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleSelectTarget = (target: RadarTarget | null) => {
    if (target) {
      setSelectedTargetId(target.id);
      setSelectedTarget(target);
    } else {
      setSelectedTargetId(null);
      setSelectedTarget(null);
    }
  };

  return (
    <BaseLayout>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 font-mono text-sm">
        
        {/* Left Column: Configurations + Target details locks */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          
          {/* Configurations */}
          <Panel title="scan configurations">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Range Scale (KM)</label>
                <div className="grid grid-cols-3 gap-1 bg-black p-1 border border-primary/15 rounded">
                  {([100, 150, 200] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setMaxRange(r)}
                      className={`py-1 text-[10px] font-bold rounded transition ${
                        maxRange === r
                          ? "bg-primary text-black"
                          : "text-gray-400 hover:text-primary"
                      }`}
                    >
                      {r} KM
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Sweep Velocity</label>
                <div className="grid grid-cols-3 gap-1 bg-black p-1 border border-primary/15 rounded">
                  {([
                    { label: "SLOW", val: 0.5 },
                    { label: "NORM", val: 1.0 },
                    { label: "FAST", val: 2.0 }
                  ] as const).map((s) => (
                    <button
                      key={s.label}
                      onClick={() => setSweepSpeed(s.val)}
                      className={`py-1 text-[10px] font-bold rounded transition ${
                        sweepSpeed === s.val
                          ? "bg-primary text-black"
                          : "text-gray-400 hover:text-primary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-primary/10 pt-3">
                <span className="text-xs text-gray-400">SIGNAL STATIC NOISE</span>
                <button
                  onClick={() => setShowNoise(!showNoise)}
                  className={`px-2 py-0.5 text-[10px] border uppercase rounded transition font-bold ${
                    showNoise
                      ? "border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/5"
                      : "border-gray-700 text-gray-500"
                  }`}
                >
                  {showNoise ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </Panel>

          {/* Locked-on details */}
          <Panel 
            title="target locking matrix" 
            subtitle="Detailed active tracker bounds"
            statusIndicator={selectedTarget ? "warning" : "off"}
          >
            {selectedTarget ? (
              <div className="space-y-4">
                <div className="border-b border-[#EF4444]/20 pb-2">
                  <div className="text-[10px] text-gray-500">DESIGNATION</div>
                  <div className="text-sm font-bold text-[#EF4444] tracking-wider truncate">
                    {selectedTarget.designation}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-0.5">ID: {selectedTarget.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase">BEARING</span>
                    <span className="font-bold text-gray-200">{selectedTarget.bearing.toFixed(2)}°</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase">DISTANCE</span>
                    <span className="font-bold text-gray-200">{selectedTarget.distance.toFixed(1)} KM</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase">SPEED</span>
                    <span className="font-bold text-gray-200">
                      {selectedTarget.speed > 1000 ? `${(selectedTarget.speed / 1000).toFixed(1)}K` : selectedTarget.speed} KTS
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase">ELEVATION</span>
                    <span className="font-bold text-gray-200">{selectedTarget.elevation.toFixed(1)}°</span>
                  </div>
                </div>

                <div className="border-t border-primary/10 pt-3 text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase">CLASSIFICATION:</span>
                    <span className="font-bold text-[#00FFFF] uppercase">{selectedTarget.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase">TRACKER STATE:</span>
                    <span className="font-bold text-glow text-[#EF4444] uppercase">{selectedTarget.status}</span>
                  </div>
                </div>

                <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 text-[10px] text-glow text-[#EF4444] p-2 text-center animate-pulse rounded tracking-wider">
                  ACTIVE RETICLE TARGET LOCK CONFIRMED
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                No target locked. Click any target dot on the radar sweep grid to confirm lock-on bounds.
              </div>
            )}
          </Panel>

        </div>

        {/* Center Main Columns: Central Radar + 3 Mini Radars Row */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          
          {/* Main Central Radar HUD */}
          <Panel
            title="AETHER MULTI-SPECTRAL RADAR DECK"
            subtitle="GPU-optimized concentric target sweep tracker"
            statusIndicator="healthy"
            headerActions={
              <button
                onClick={() => handleSelectTarget(null)}
                disabled={!selectedTargetId}
                className="px-2 py-1 bg-black border border-primary/20 hover:border-primary text-primary transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 text-xs"
              >
                [¤] RESET LOCKS
              </button>
            }
          >
            {isLoading && targets.length === 0 ? (
              <div className="w-full h-[500px] flex flex-col items-center justify-center bg-black/20 border border-primary/10 rounded">
                <span className="text-primary text-xs uppercase tracking-widest animate-pulse mb-2">TUNING RADAR FREQUENCY BANDS...</span>
                <div className="w-32 h-0.5 bg-primary/10 overflow-hidden relative">
                  <div className="absolute top-0 left-0 h-full w-1/2 bg-primary animate-pulse" />
                </div>
              </div>
            ) : (
              <RadarDisplay
                targets={targets}
                selectedTargetId={selectedTargetId}
                onSelectTarget={handleSelectTarget}
                showNoise={showNoise}
                maxRange={maxRange}
                sweepSpeed={sweepSpeed}
              />
            )}
          </Panel>

          {/* Secondary Subsystem Mini-Radars Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OrbitalElevationScan targets={targets} selectedTargetId={selectedTargetId} />
            <SectorScan targets={targets} selectedTargetId={selectedTargetId} />
            <SignalSpectrumAnalyzer selectedTarget={selectedTarget} />
          </div>

        </div>

        {/* Right Column: Active Targets Feed list */}
        <div className="lg:col-span-1 flex flex-col">
          
          <Panel title={`active targets feed (${targets.length})`}>
            {errorMsg && (
              <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded uppercase mb-2">
                ERROR: {errorMsg}
              </div>
            )}
            <div className="space-y-2 max-h-[660px] overflow-y-auto pr-1">
              {targets.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-3 italic">
                  Scanning empty frequency bounds...
                </div>
              ) : (
                targets.map((tgt) => (
                  <button
                    key={tgt.id}
                    onClick={() => handleSelectTarget(tgt)}
                    className={`w-full flex items-center justify-between p-2.5 border rounded transition text-xs ${
                      selectedTargetId === tgt.id
                        ? "border-[#EF4444] bg-[#EF4444]/5 text-[#EF4444]"
                        : "border-primary/10 bg-black/20 text-gray-300 hover:border-primary/30"
                    }`}
                  >
                    <div className="text-left font-bold truncate pr-2">
                      <div>{tgt.id}</div>
                      <div className="text-[9px] font-normal text-gray-500 truncate">
                        {tgt.designation}
                      </div>
                    </div>
                    <div className="text-right text-[10px] font-mono shrink-0">
                      <div>{tgt.distance.toFixed(1)} KM</div>
                      <div className="text-gray-500">{tgt.bearing.toFixed(0)}°</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Panel>

        </div>

      </div>
    </BaseLayout>
  );
}
