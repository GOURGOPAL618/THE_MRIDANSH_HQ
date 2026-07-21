"use client";

import React, { useState, useEffect } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import RadarDisplay, { RadarTarget } from "../../components/RadarDisplay";
import { api } from "../../services/api";

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
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

  // Setup mount fetch and periodic telemetry polling with AbortController and Page Visibility API
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let controller = new AbortController();

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        controller.abort(); // Cancel previous if still pending
        controller = new AbortController();
        fetchRadarTargets(true, controller.signal);
      }, 5000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      controller.abort(); // Cancel current request immediately
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

    // Initial load
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-mono text-sm">
        
        {/* Main Radar sweep grid */}
        <div className="lg:col-span-3 flex flex-col space-y-4">
          <Panel
            title="AETHER GLOBAL SCANS"
            subtitle="Futuristic Concentric Target Tracking HUD"
            statusIndicator="healthy"
            headerActions={
              <div className="flex space-x-2 text-xs">
                <button
                  onClick={() => handleSelectTarget(null)}
                  disabled={!selectedTargetId}
                  className="px-2 py-1 bg-black border border-primary/20 hover:border-primary text-primary transition disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                >
                  [¤] RESET LOCKS
                </button>
              </div>
            }
          >
            {isLoading && targets.length === 0 ? (
              <div className="w-full h-[500px] flex flex-col items-center justify-center bg-black/20 border border-primary/10 rounded">
                <div className="text-primary text-xs uppercase tracking-widest animate-pulse mb-2">
                  TUNING RADAR FREQUENCY BANDS...
                </div>
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
        </div>

        {/* Sidebar Controls and Locks Dashboard */}
        <div className="lg:col-span-1 flex flex-col space-y-6">

          {/* Configuration Panel */}
          <Panel title="scan configurations">
            <div className="space-y-4">
              
              {/* Range Scale Selector */}
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

              {/* Sweep Speed Selector */}
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

              {/* Static Noise toggler */}
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

          {/* Locked-on target details telemetry */}
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

          {/* List of active targets */}
          <Panel title={`active targets feed (${targets.length})`}>
            {errorMsg && (
              <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded uppercase">
                ERROR: {errorMsg}
              </div>
            )}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {targets.length === 0 ? (
                <div className="text-center text-xs text-gray-600 py-3 italic">
                  Scanning empty frequency bounds...
                </div>
              ) : (
                targets.map((tgt) => (
                  <button
                    key={tgt.id}
                    onClick={() => handleSelectTarget(tgt)}
                    className={`w-full flex items-center justify-between p-2 border rounded transition text-xs ${
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
