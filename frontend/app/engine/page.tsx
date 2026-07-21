"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import EngineCoreVisualizer from "../../components/EngineCoreVisualizer";
import { api } from "../../services/api";
import { engineAudio } from "../../services/engineAudio";

// Extended TypeScript types to support the rich telemetry model
interface EngineTelemetry {
  engine_state: "shutdown" | "igniting" | "nominal" | "emergency_stop";
  thrust_level: number;
  temperature: number;
  coolant_pressure: number;
  fuel_flow: number;
  magnetic_lock: boolean;
  engine_efficiency: number;
  magnetic_status: "LOCKED" | "UNSTABLE" | "FAILED";
  coolant_status: "NOMINAL" | "WARNING" | "CRITICAL";
  thermal_status: "SAFE" | "WARMUP" | "NOMINAL" | "OVERHEAT";
  safety_envelope: "SAFE" | "WARNING" | "DANGER";
}

interface EngineAuditLog {
  id: string;
  timestamp: string;
  engine_state: string;
  thrust_level: number;
  temperature: number;
  coolant_pressure: number;
  fuel_flow: number;
  magnetic_lock: boolean;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// Sparkline Graph Component (with absolute coordinate translation)
function Sparkline({ data, min, max, color }: { data: number[]; min: number; max: number; color: string }) {
  if (data.length < 2) {
    return <div className="h-[50px] flex items-center justify-center text-[10px] text-gray-600">Awaiting Telemetry...</div>;
  }
  const width = 240;
  const height = 50;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const range = max - min || 1;
      const normVal = Math.max(min, Math.min(max, val));
      const y = height - ((normVal - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="2 4" />
      <polygon points={fillPoints} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" className="transition-all duration-300" />
    </svg>
  );
}

// Circular Gauge UI Component
function CircularGauge({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(max, value) / max) * circumference;

  return (
    <div className="flex flex-col items-center p-2 bg-black/40 border border-primary/5 rounded text-center">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-14 h-14 transform -rotate-90">
          <circle cx="28" cy="28" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" fill="transparent" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <span className="absolute text-[9px] font-bold text-gray-200">{value.toFixed(0)}{unit}</span>
      </div>
      <span className="text-[8px] text-gray-500 uppercase tracking-wider mt-1.5 truncate w-full">{label}</span>
    </div>
  );
}

export default function EngineRoomPage() {
  const [telemetry, setTelemetry] = useState<EngineTelemetry | null>(null);
  const [auditLogs, setAuditLogs] = useState<EngineAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommanding, setIsCommanding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mute audio state
  const [isMuted, setIsMuted] = useState(true);

  // Flight Computer Auto-Throttle simulation
  const [isAutoThrottle, setIsAutoThrottle] = useState(false);
  const autoThrottleAngle = useRef(0);

  // Manual Throttle slider state
  const [manualThrottle, setManualThrottle] = useState(100);
  const throttleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isUserDraggingThrottle = useRef(false);

  // TVC interactive control coordinates
  const [tvcYaw, setTvcYaw] = useState(0.0);
  const [tvcPitch, setTvcPitch] = useState(0.0);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const isDraggingJoystick = useRef(false);

  // Rolling history arrays for live graphs
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [thrustHistory, setThrustHistory] = useState<number[]>([]);
  const [pressureHistory, setPressureHistory] = useState<number[]>([]);
  const [flowHistory, setFlowHistory] = useState<number[]>([]);

  // Track previous state to trigger Web Audio sweeps
  const prevStatusRef = useRef<string | null>(null);

  // Fetch telemetry status helper
  const fetchEngineTelemetry = async (silent = false, signal?: AbortSignal) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await api.get<ApiResponseEnvelope<EngineTelemetry>>(
        "/api/v1/engine/status",
        undefined,
        { signal }
      );
      if (response.data && response.data.success) {
        if (signal?.aborted) return;
        let currentTelemetry = response.data!.data;

        // Auto-Throttle override simulation on client if enabled
        if (isAutoThrottle && currentTelemetry.engine_state === "nominal") {
          autoThrottleAngle.current += 0.15;
          const deltaThrust = Math.sin(autoThrottleAngle.current) * 8.0; // Throttle oscillates around NOMINAL
          currentTelemetry = {
            ...currentTelemetry,
            thrust_level: Math.max(75, Math.min(100, currentTelemetry.thrust_level + deltaThrust)),
            fuel_flow: Math.max(18, Math.min(25, currentTelemetry.fuel_flow + deltaThrust * 0.15)),
            temperature: Math.max(1150, Math.min(1250, currentTelemetry.temperature + deltaThrust * 2))
          };
        }

        setTelemetry(currentTelemetry);
        setErrorMsg(null);

        // Sync local manual throttle slider with actual telemetry if the user is not actively dragging it
        if (!isUserDraggingThrottle.current) {
          setManualThrottle(currentTelemetry.thrust_level);
        }

        // Update rolling history windows
        setTempHistory((prev) => [...prev.slice(-19), currentTelemetry.temperature]);
        setThrustHistory((prev) => [...prev.slice(-19), currentTelemetry.thrust_level]);
        setPressureHistory((prev) => [...prev.slice(-19), currentTelemetry.coolant_pressure]);
        setFlowHistory((prev) => [...prev.slice(-19), currentTelemetry.fuel_flow]);

      } else if (response.error) {
        if (signal?.aborted) return;
        setErrorMsg(response.error);
      }
    } catch {
      if (signal?.aborted) return;
      setErrorMsg("Failed to synchronize connection with AETHER engine core.");
    } finally {
      if (!silent && !signal?.aborted) setIsLoading(false);
    }
  };

  // Fetch historical audit logs helper
  const fetchAuditLogs = async () => {
    try {
      const response = await api.get<ApiResponseEnvelope<EngineAuditLog[]>>("/api/v1/engine/logs");
      if (response.data && response.data.success) {
        setAuditLogs(response.data!.data);
      }
    } catch {
      // Fail silently
    }
  };

  // Periodic polling with AbortController and Page Visibility API
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let controller = new AbortController();

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        controller.abort();
        controller = new AbortController();
        fetchEngineTelemetry(true, controller.signal);
      }, 3000);
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
        fetchEngineTelemetry(true, controller.signal);
        startPolling();
      }
    };

    // Initial mount fetches
    fetchEngineTelemetry(false, controller.signal);
    fetchAuditLogs();
    startPolling();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoThrottle]); // Re-initialize poll context when AutoThrottle toggle changes state

  // Sync Audio context and sweeps to state transitions
  useEffect(() => {
    if (!telemetry) return;
    const currentState = telemetry.engine_state;
    const prevState = prevStatusRef.current;

    if (prevState !== currentState) {
      // Trigger sweep sounds
      if (currentState === "igniting" && prevState === "shutdown") {
        engineAudio.playStartupSweep();
        engineAudio.startHum();
        engineAudio.stopAlarm();
      } else if (currentState === "shutdown" && (prevState === "igniting" || prevState === "nominal")) {
        engineAudio.playShutdownSweep();
        engineAudio.stopHum();
        engineAudio.stopAlarm();
      } else if (currentState === "emergency_stop") {
        engineAudio.playShutdownSweep();
        engineAudio.stopHum();
        engineAudio.startAlarm();
      } else if (currentState === "shutdown" && prevState === "emergency_stop") {
        engineAudio.stopAlarm();
      }

      prevStatusRef.current = currentState;
      fetchAuditLogs();
    }
  }, [telemetry]);

  // Cleanup audio singleton context on unmount
  useEffect(() => {
    return () => {
      engineAudio.destroy();
    };
  }, []);

  // Send action commands helper
  const handleCommand = async (command: "ignite" | "shutdown" | "emergency-stop" | "reset") => {
    setIsCommanding(true);
    setErrorMsg(null);
    try {
      const response = await api.post<ApiResponseEnvelope<{ engine_state: string }>>(
        `/api/v1/engine/${command}`
      );
      if (response.data && response.data.success) {
        fetchEngineTelemetry(true);
        fetchAuditLogs();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg(`Failed to broadcast command [${command.toUpperCase()}] to engine core.`);
    } finally {
      setIsCommanding(false);
    }
  };

  const handleThrottleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setManualThrottle(val);
    isUserDraggingThrottle.current = true;

    if (throttleDebounceRef.current) {
      clearTimeout(throttleDebounceRef.current);
    }

    throttleDebounceRef.current = setTimeout(async () => {
      try {
        await api.post("/api/v1/engine/throttle", { thrust_level: val });
        isUserDraggingThrottle.current = false;
        fetchEngineTelemetry(true);
      } catch {
        isUserDraggingThrottle.current = false;
      }
    }, 200);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    engineAudio.setMute(nextMute);

    // Sync hum or alarms if unmuting
    if (!nextMute && telemetry) {
      if (telemetry.engine_state === "igniting" || telemetry.engine_state === "nominal") {
        engineAudio.startHum();
      } else if (telemetry.engine_state === "emergency_stop") {
        engineAudio.startAlarm();
      }
    } else if (nextMute) {
      engineAudio.stopHum();
      engineAudio.stopAlarm();
    }
  };

  const getStatusColor = (state: string) => {
    if (state === "nominal") return "healthy";
    if (state === "igniting") return "warning";
    if (state === "emergency_stop") return "danger";
    return "off";
  };

  const stateColors = {
    nominal: "text-success border-success/30 bg-success/5",
    igniting: "text-warning border-warning/30 bg-warning/5",
    emergency_stop: "text-danger border-danger/30 bg-danger/5",
    shutdown: "text-gray-500 border-gray-800 bg-gray-950/20"
  };

  const engineState = telemetry?.engine_state || "shutdown";

  const getSubsystemState = (sys: string) => {
    if (engineState === "emergency_stop") return { label: "HALTED", color: "text-danger border-danger/30" };
    if (engineState === "shutdown") return { label: "OFFLINE", color: "text-gray-600 border-gray-800" };

    if (sys === "core") {
      return engineState === "igniting" 
        ? { label: "WARMUP", color: "text-warning border-warning/30 animate-pulse" }
        : { label: "ONLINE", color: "text-[#00FFFF] border-[#00FFFF]/30 text-glow" };
    }
    if (sys === "conversion") {
      return engineState === "igniting"
        ? { label: "COUPLING", color: "text-warning border-warning/30" }
        : { label: "NOMINAL", color: "text-[#00FFFF] border-[#00FFFF]/30" };
    }
    if (sys === "distribution") {
      return engineState === "igniting"
        ? { label: "CHARGING", color: "text-warning border-warning/30" }
        : { label: "ACTIVE", color: "text-[#00FFFF] border-[#00FFFF]/30" };
    }
    if (sys === "propulsion") {
      return engineState === "igniting"
        ? { label: "STANDBY", color: "text-warning border-warning/30" }
        : { label: "THRUST", color: "text-[#00FFFF] border-[#00FFFF]/30" };
    }
    return { label: "OFFLINE", color: "text-gray-600 border-gray-800" };
  };

  // Joystick drag handlers
  const handleJoystickStart = () => {
    if (engineState === "shutdown" || engineState === "emergency_stop") return;
    isDraggingJoystick.current = true;
  };

  const handleJoystickMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingJoystick.current || !joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Map pixel coordinate to angle scale -5.0 to +5.0 degrees
    const yaw = Math.max(-5.0, Math.min(5.0, ((x / rect.width) * 10 - 5)));
    const pitch = Math.max(-5.0, Math.min(5.0, ((y / rect.height) * 10 - 5)));
    setTvcYaw(yaw);
    setTvcPitch(pitch);
  };

  const handleJoystickEnd = () => {
    isDraggingJoystick.current = false;
  };

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* TOP HUD: Global status, state readout, and controls */}
        <div className="flex flex-col md:flex-row items-center justify-between p-4 border border-primary/15 bg-black/40 rounded gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">AETHER PROPULSION SUITE</span>
              <span className="text-sm font-bold text-glow text-white">COMMAND CONTROL ROOM</span>
            </div>
            <div className="h-6 w-[1px] bg-primary/10"></div>
            <div className={`px-3 py-1 text-xs font-bold uppercase rounded border transition-colors duration-500 ${stateColors[engineState]}`}>
              STATE: {engineState.replace("_", " ")}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Throttle toggle switch */}
            <button
              onClick={() => setIsAutoThrottle(!isAutoThrottle)}
              disabled={engineState !== "nominal"}
              className={`px-3 py-1.5 border transition text-xs font-bold active:scale-95 rounded disabled:opacity-30 disabled:pointer-events-none ${
                isAutoThrottle
                  ? "border-success text-success bg-success/5 text-glow"
                  : "border-gray-600 text-gray-500 hover:text-primary hover:border-primary/40"
              }`}
            >
              {isAutoThrottle ? "[o] AUTO-THROTTLE ON" : "[o] AUTO-THROTTLE OFF"}
            </button>

            <button
              onClick={toggleMute}
              className={`px-3 py-1.5 border transition text-xs font-bold active:scale-95 rounded ${
                isMuted
                  ? "border-gray-600 text-gray-500 hover:text-primary hover:border-primary/40"
                  : "border-[#00FFFF] text-[#00FFFF] bg-[#00FFFF]/5 text-glow"
              }`}
            >
              {isMuted ? "[¤] SOUND MUTED" : "[¤] SOUND ACTIVE"}
            </button>
            <div className="h-6 w-[1px] bg-primary/10 mx-1"></div>
            <button
              onClick={() => handleCommand("emergency-stop")}
              disabled={isCommanding || engineState === "shutdown"}
              className="px-3 py-1.5 bg-red-950/20 border border-danger text-danger hover:bg-danger hover:text-black font-bold uppercase rounded transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 text-xs text-glow-danger"
            >
              [!] EMERGENCY STOP
            </button>
          </div>
        </div>

        {/* MAIN BODY: Visualizations on the Left, Controls + Safety on the Right */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Left: Double visualizers (Reactor Core + Mridansh Engine Plume Core) */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Left Box: Reactor Core Containment visualizer */}
            <Panel
              title="REACTOR CORE CONTAINER"
              subtitle="Fusion-thermal thermal wave containment HUD"
              statusIndicator={getStatusColor(engineState)}
            >
              {isLoading && !telemetry ? (
                <div className="w-full h-[320px] flex items-center justify-center bg-black/20">
                  <span className="text-xs text-primary animate-pulse">ESTABLISHING DIAGNOSTIC LINK...</span>
                </div>
              ) : (
                <div className="h-[320px] w-full relative">
                  <EngineCoreVisualizer engineState={engineState} />
                </div>
              )}
            </Panel>

            {/* Right Box: Main Mridansh Engine Assembly Propulsion (AETHER-MRID1607X.png + engine-glow.png) */}
            <Panel 
              title="AETHER-MRID1607X PLUME CORE"
              subtitle="Active propellant expansion visualizer"
            >
              <div className="relative w-full h-[320px] flex items-center justify-center bg-black/40 border border-primary/10 rounded overflow-hidden p-4">
                
                {/* Engine Base Visual Graphic */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/engine/AETHER-MRID1607X.png"
                  alt="AETHER-MRID1607X Propulsion Assembly"
                  className={`absolute max-h-[90%] object-contain transition-all duration-500 ${
                    engineState === "shutdown" ? "opacity-35 filter grayscale" : "opacity-80"
                  }`}
                />

                {/* Energy Plume Glow Overlay visual reacting to state and throttle */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/engine/engine-glow.png"
                  alt="Thrust engine energy glow"
                  style={{
                    opacity: engineState === "nominal" ? 0.4 + (manualThrottle / 100) * 0.55 : engineState === "igniting" ? 0.35 : 0.02,
                    transform: `scale(${
                      engineState === "nominal" 
                        ? 0.95 + (manualThrottle / 100) * 0.12 + Math.sin(Date.now() / 120) * 0.02 
                        : 0.95
                    })`,
                    mixBlendMode: "screen"
                  }}
                  className="absolute max-h-[90%] object-contain transition-all duration-500 pointer-events-none"
                />

                {/* Emergency block filter */}
                {engineState === "emergency_stop" && (
                  <div className="absolute inset-0 bg-red-950/20 border border-danger/30 animate-pulse flex items-center justify-center">
                    <span className="bg-black/95 border border-danger/30 text-danger text-[9px] px-2 py-1 font-bold rounded shadow-[0_0_8px_#EF4444] uppercase tracking-wider">
                      PROPELLANT FLOW SHUTOFF ACTIVE
                    </span>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* Main Right: Controls, Manual Throttle Slider & Safety Envelope */}
          <div className="lg:col-span-1 flex flex-col space-y-6">
            
            {/* Control Panel */}
            <Panel title="REACTOR CONTROLS">
              {errorMsg && (
                <div className="text-[9px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded uppercase mb-4 max-h-16 overflow-y-auto">
                  ERROR: {errorMsg}
                </div>
              )}
              <div className="space-y-4 flex flex-col">
                
                {engineState === "emergency_stop" && (
                  <button
                    onClick={() => handleCommand("reset")}
                    disabled={isCommanding}
                    className="w-full py-2 bg-success text-black font-bold uppercase rounded transition border border-success hover:bg-success/90 active:scale-95 text-xs text-glow shadow-[0_0_10px_#10B981]"
                  >
                    DISENGAGE LOCKS (RESET)
                  </button>
                )}

                <div className="space-y-2 flex flex-col">
                  <button
                    onClick={() => handleCommand("ignite")}
                    disabled={
                      isCommanding || 
                      engineState === "igniting" || 
                      engineState === "nominal" || 
                      engineState === "emergency_stop"
                    }
                    className="w-full py-2 bg-black border border-primary/20 hover:border-primary text-primary font-bold uppercase rounded transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 text-xs"
                  >
                    START IGNITION SEQ
                  </button>

                  <button
                    onClick={() => handleCommand("shutdown")}
                    disabled={
                      isCommanding || 
                      engineState === "shutdown" || 
                      engineState === "emergency_stop"
                    }
                    className="w-full py-2 bg-black border border-primary/20 hover:border-primary text-primary font-bold uppercase rounded transition disabled:opacity-30 disabled:pointer-events-none active:scale-95 text-xs"
                  >
                    INITIATE COOLDOWN
                  </button>
                </div>

                {/* Interactive Manual Throttle Slider */}
                <div className="border-t border-primary/10 pt-3">
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-1.5">
                    <span>MANUAL THROTTLE</span>
                    <span className="text-[#00FFFF] font-bold">{manualThrottle.toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={manualThrottle}
                    disabled={isCommanding || engineState === "shutdown" || engineState === "emergency_stop" || isAutoThrottle}
                    onChange={handleThrottleChange}
                    className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00FFFF] disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                  {isAutoThrottle && (
                    <span className="text-[8px] text-success/60 block mt-1 uppercase">Controlled by Auto-Throttle Computer</span>
                  )}
                </div>

              </div>
            </Panel>

            {/* Safety and Containment Status Panel */}
            <Panel 
              title="safety & containment" 
              subtitle="Critical thresholds limits envelope"
              statusIndicator={telemetry?.safety_envelope === "SAFE" ? "healthy" : telemetry?.safety_envelope === "WARNING" ? "warning" : "danger"}
            >
              <div className="space-y-4">
                
                {/* Envelope tag */}
                <div className="border border-primary/10 bg-black/40 p-2 rounded text-center">
                  <span className="block text-[8px] text-gray-500 uppercase tracking-wider mb-1">SAFETY ENVELOPE</span>
                  <span className={`text-xs font-bold uppercase ${
                    telemetry?.safety_envelope === "SAFE" ? "text-success text-glow" : telemetry?.safety_envelope === "WARNING" ? "text-warning" : "text-danger animate-pulse"
                  }`}>
                    {telemetry ? telemetry.safety_envelope : "SAFE"}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-primary/5 pb-1.5">
                    <span className="text-gray-500 uppercase">MAGNETIC SHIELD:</span>
                    <span className={`font-bold uppercase ${
                      telemetry?.magnetic_status === "LOCKED" ? "text-success" : telemetry?.magnetic_status === "UNSTABLE" ? "text-warning" : "text-danger"
                    }`}>
                      {telemetry ? telemetry.magnetic_status : "LOCKED"}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-primary/5 pb-1.5">
                    <span className="text-gray-500 uppercase">COOLANT SYSTEM:</span>
                    <span className={`font-bold uppercase ${
                      telemetry?.coolant_status === "NOMINAL" ? "text-success" : telemetry?.coolant_status === "WARNING" ? "text-warning" : "text-danger"
                    }`}>
                      {telemetry ? telemetry.coolant_status : "NOMINAL"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase">THERMAL LEVEL:</span>
                    <span className={`font-bold uppercase ${
                      telemetry?.thermal_status === "SAFE" ? "text-success" : telemetry?.thermal_status === "WARMUP" || telemetry?.thermal_status === "NOMINAL" ? "text-warning" : "text-glow-danger text-danger"
                    }`}>
                      {telemetry ? telemetry.thermal_status : "SAFE"}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* MIDDLE SECTION: Engine Systems Architecture (Energy Flow) */}
        <Panel 
          title="engine systems architecture"
          subtitle="Flow direction layout representing energy coupling paths"
        >
          <div className="relative p-6 border border-primary/10 bg-black/20 rounded overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 font-mono text-[11px]">
            
            {/* Supporting Left Node: Magnetic Containment */}
            <div className="flex flex-col items-center space-y-2 shrink-0 w-32">
              <div className={`p-2 border rounded text-center w-full transition-colors duration-500 ${
                telemetry?.magnetic_status === "LOCKED" ? "border-success/30 text-success bg-success/5" : telemetry?.magnetic_status === "UNSTABLE" ? "border-warning/30 text-warning bg-warning/5" : "border-danger/30 text-danger bg-danger/5"
              }`}>
                <div className="text-[8px] text-gray-500 uppercase font-bold">MAGNETIC LOCKS</div>
                <div className="font-bold">{telemetry ? telemetry.magnetic_status : "LOCKED"}</div>
              </div>
              <div className="h-6 w-0.5 border-l border-dashed border-primary/20"></div>
            </div>

            {/* Core systems pipeline */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-between w-full gap-4 relative">
              
              {/* Node 1: Reactor Core */}
              <div className={`p-3 border rounded text-center w-full md:w-36 transition-colors duration-500 ${getSubsystemState("core").color}`}>
                <div className="text-[8px] text-gray-500 uppercase font-bold">REACTOR CORE</div>
                <div className="font-bold">{getSubsystemState("core").label}</div>
              </div>

              {/* Arrow Line 1 */}
              <div className="hidden md:block flex-1 h-0.5 border-t border-dashed border-primary/20 relative">
                {engineState === "nominal" && (
                  <div className="absolute top-[-3px] left-0 w-2 h-2 rounded-full bg-[#00FFFF] animate-ping" style={{ animationDuration: "1.5s" }} />
                )}
              </div>

              {/* Node 2: Energy Conversion */}
              <div className={`p-3 border rounded text-center w-full md:w-36 transition-colors duration-500 ${getSubsystemState("conversion").color}`}>
                <div className="text-[8px] text-gray-500 uppercase font-bold">ENERGY CONVERSION</div>
                <div className="font-bold">{getSubsystemState("conversion").label}</div>
              </div>

              {/* Arrow Line 2 */}
              <div className="hidden md:block flex-1 h-0.5 border-t border-dashed border-primary/20 relative">
                {engineState === "nominal" && (
                  <div className="absolute top-[-3px] left-0 w-2 h-2 rounded-full bg-[#00FFFF] animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.5s" }} />
                )}
              </div>

              {/* Node 3: Power Distribution */}
              <div className={`p-3 border rounded text-center w-full md:w-36 transition-colors duration-500 ${getSubsystemState("distribution").color}`}>
                <div className="text-[8px] text-gray-500 uppercase font-bold">POWER DISTRIBUTION</div>
                <div className="font-bold">{getSubsystemState("distribution").label}</div>
              </div>

              {/* Arrow Line 3 */}
              <div className="hidden md:block flex-1 h-0.5 border-t border-dashed border-primary/20 relative">
                {engineState === "nominal" && (
                  <div className="absolute top-[-3px] left-0 w-2 h-2 rounded-full bg-[#00FFFF] animate-ping" style={{ animationDuration: "1.5s", animationDelay: "1.0s" }} />
                )}
              </div>

              {/* Node 4: Propulsion / Thrust Output */}
              <div className={`p-3 border rounded text-center w-full md:w-36 transition-colors duration-500 ${getSubsystemState("propulsion").color}`}>
                <div className="text-[8px] text-gray-500 uppercase font-bold">PROPULSION</div>
                <div className="font-bold">{getSubsystemState("propulsion").label}</div>
              </div>

            </div>

            {/* Supporting Right Node: Cooling System */}
            <div className="flex flex-col items-center space-y-2 shrink-0 w-32">
              <div className="h-6 w-0.5 border-l border-dashed border-primary/20"></div>
              <div className={`p-2 border rounded text-center w-full transition-colors duration-500 ${
                telemetry?.coolant_status === "NOMINAL" ? "border-success/30 text-success bg-success/5" : telemetry?.coolant_status === "WARNING" ? "border-warning/30 text-warning bg-warning/5" : "border-danger/30 text-danger bg-danger/5"
              }`}>
                <div className="text-[8px] text-gray-500 uppercase font-bold">COOLING SYSTEM</div>
                <div className="font-bold">{telemetry ? telemetry.coolant_status : "NOMINAL"}</div>
              </div>
            </div>

          </div>
        </Panel>

        {/* LOWER SECTION: Propulsion Engine Assembly & Nozzle Exhaust Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Subsystem 1: Propulsion Engine Assembly (rocket-engine-reference.jpg) */}
          <Panel 
            title="PROPULSION ENGINE ASSEMBLY"
            subtitle="Diagnostic hardware cluster status"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative w-full h-[180px] bg-black/40 border border-primary/10 rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/engine/rocket-engine-reference.jpg"
                  alt="Propulsion Hardware Assembly"
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    engineState === "shutdown" ? "opacity-25 filter grayscale" : "opacity-75"
                  }`}
                />
                
                {/* Active scan overlay line */}
                {engineState !== "shutdown" && (
                  <div className="absolute inset-x-0 h-[2px] bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] top-0 animate-[scanline_2.5s_ease-in-out_infinite]"></div>
                )}
              </div>

              {/* Hardware stats */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-primary/5 pb-1">
                  <span className="text-gray-500 uppercase">ASSEMBLY STATE:</span>
                  <span className={`font-bold ${
                    engineState === "nominal" ? "text-success" : engineState === "igniting" ? "text-warning animate-pulse" : "text-gray-400"
                  }`}>
                    {engineState.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between border-b border-primary/5 pb-1">
                  <span className="text-gray-500 uppercase">CHAMBER CLUSTER:</span>
                  <span className="font-bold text-gray-300">4x GIMBALED NOZZLES</span>
                </div>

                <div className="flex justify-between border-b border-primary/5 pb-1">
                  <span className="text-gray-500 uppercase">PROPELLANT FLOW:</span>
                  <span className="font-bold text-gray-300">
                    {telemetry ? `${telemetry.fuel_flow.toFixed(1)} kg/s` : "0.0 kg/s"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-primary/5 pb-1">
                  <span className="text-gray-500 uppercase">THRUST VECTOR CONTROL:</span>
                  <span className={`font-bold ${engineState !== "shutdown" ? "text-success" : "text-gray-500"}`}>
                    {engineState !== "shutdown" ? "ONLINE / ACTIVE" : "OFFLINE"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 uppercase">HARDWARE HEALTH:</span>
                  <span className={`font-bold ${
                    engineState === "emergency_stop" ? "text-danger" : "text-success"
                  }`}>
                    {engineState === "emergency_stop" ? "32% / WARN" : "98% / NOMINAL"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-primary/10">
                  <CircularGauge
                    value={telemetry?.thrust_level || 0}
                    max={100}
                    label="THRUST"
                    unit="%"
                    color={engineState === "nominal" ? "#00FFFF" : engineState === "igniting" ? "#F59E0B" : "#ef4444"}
                  />
                  <CircularGauge
                    value={telemetry?.engine_efficiency || 0}
                    max={100}
                    label="EFFICIENCY"
                    unit="%"
                    color="#10B981"
                  />
                </div>
              </div>
            </div>
          </Panel>

          {/* Subsystem 2: Nozzle & Exhaust Thermal Analysis (rocket-nozzle-reference.jpg) */}
          <Panel 
            title="NOZZLE & EXHAUST THERMAL ANALYSIS"
            subtitle="Live thermal mapping of propellant exhaust"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Nozzle reference image layout */}
              <div className="relative w-full h-[180px] bg-black/40 border border-primary/10 rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/engine/rocket-nozzle-reference.jpg"
                  alt="Nozzle hardware reference"
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    engineState === "shutdown" ? "opacity-25 filter grayscale" : "opacity-75"
                  }`}
                />
                
                {/* Simulated thermal heat mapping color filters */}
                {engineState === "nominal" && (
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-yellow-500/10 to-transparent pointer-events-none animate-pulse"></div>
                )}
              </div>

              {/* Nozzle diagnostics and Interactive TVC Joystick */}
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase">NOZZLE HEAT:</span>
                    <span className={`font-bold ${
                      engineState === "nominal" ? "text-danger" : engineState === "igniting" ? "text-warning" : "text-gray-400"
                    }`}>
                      {telemetry ? `${(telemetry.temperature * 1.15).toFixed(0)} K` : "0 K"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-500 uppercase">EXHAUST SPEED:</span>
                    <span className="font-bold text-gray-200">
                      {telemetry && engineState === "nominal" ? "3,150 m/s" : engineState === "igniting" ? "920 m/s" : "0 m/s"}
                    </span>
                  </div>
                </div>

                {/* Interactive TVC joystick controls */}
                <div className="flex items-center space-x-3 bg-black/30 p-2 border border-primary/10 rounded">
                  <div 
                    ref={joystickRef}
                    onMouseDown={handleJoystickStart}
                    onMouseMove={handleJoystickMove}
                    onMouseUp={handleJoystickEnd}
                    onMouseLeave={handleJoystickEnd}
                    className="relative w-16 h-16 bg-black border border-primary/20 rounded cursor-crosshair select-none shrink-0"
                  >
                    <div className="absolute inset-x-0 h-[1px] bg-primary/10 top-8"></div>
                    <div className="absolute inset-y-0 w-[1px] bg-primary/10 left-8"></div>
                    <div 
                      className="absolute w-3 h-3 rounded-full bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] pointer-events-none"
                      style={{
                        left: `${((tvcYaw + 5) / 10) * 100 - 8}%`,
                        top: `${((tvcPitch + 5) / 10) * 100 - 8}%`,
                      }}
                    />
                  </div>

                  <div className="text-[10px] space-y-1">
                    <div className="text-gray-500 uppercase font-bold">TVC TV-JOYSTICK</div>
                    <div>YAW: <span className="text-[#00FFFF] font-bold">{tvcYaw.toFixed(2)}°</span></div>
                    <div>PITCH: <span className="text-[#00FFFF] font-bold">{tvcPitch.toFixed(2)}°</span></div>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 text-gray-400">
                  <div className="flex justify-between">
                    <span>THERMAL LOAD:</span>
                    <span>{engineState === "nominal" ? "94%" : engineState === "igniting" ? "35%" : "0%"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>NOZZLE SEGMENTS:</span>
                    <span className="text-success">NOMINAL</span>
                  </div>
                </div>
              </div>

            </div>
          </Panel>
        </div>

        {/* BOTTOM SECTION: Live Telemetry Graphs + Diagnostics Audit logs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Left: Real-time graphs feeds */}
          <div className="lg:col-span-3">
            <Panel title="REAL-TIME TELEMETRY TRACKER TRENDS">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Temperature over time graph */}
                <div className="bg-black/30 p-2 border border-primary/5 rounded">
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-2">
                    <span>Core Temperature trend (K)</span>
                    <span className="text-primary font-bold">{telemetry ? telemetry.temperature.toFixed(0) : "---"} K</span>
                  </div>
                  <Sparkline data={tempHistory} min={200} max={1400} color="#00FFFF" />
                </div>

                {/* Thrust over time graph */}
                <div className="bg-black/30 p-2 border border-primary/5 rounded">
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-2">
                    <span>Reactor Thrust trend (%)</span>
                    <span className="text-primary font-bold">{telemetry ? telemetry.thrust_level.toFixed(0) : "---"} %</span>
                  </div>
                  <Sparkline data={thrustHistory} min={0} max={100} color="#00FFFF" />
                </div>

                {/* Coolant pressure graph */}
                <div className="bg-black/30 p-2 border border-primary/5 rounded">
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-2">
                    <span>Coolant Pressure trend (BAR)</span>
                    <span className="text-green-400 font-bold">{telemetry ? telemetry.coolant_pressure.toFixed(1) : "---"} b</span>
                  </div>
                  <Sparkline data={pressureHistory} min={0} max={12} color="#10B981" />
                </div>

                {/* Fuel flow graph */}
                <div className="bg-black/30 p-2 border border-primary/5 rounded">
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase mb-2">
                    <span>Fuel Flow trend (kg/s)</span>
                    <span className="text-green-400 font-bold">{telemetry ? telemetry.fuel_flow.toFixed(1) : "---"} kg</span>
                  </div>
                  <Sparkline data={flowHistory} min={0} max={30} color="#10B981" />
                </div>

              </div>
            </Panel>
          </div>

          {/* Main Right: Historical Transition logs */}
          <div className="lg:col-span-1">
            <Panel title="REACTOR DIAGNOSTICS AUDIT LOGS">
              <div className="space-y-2 max-h-[155px] overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <div className="text-center text-xs text-gray-600 py-4 italic">
                    No logs recorded.
                  </div>
                ) : (
                  auditLogs.slice(0, 15).map((log) => (
                    <div
                      key={log.id}
                      className="p-2 border border-primary/10 bg-black/20 rounded text-[10px] font-mono leading-relaxed"
                    >
                      <div className="flex justify-between text-[8px] text-gray-500 mb-1">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="font-bold text-glow uppercase">{log.engine_state.replace("_", " ")}</span>
                      </div>
                      <div className="text-gray-400 flex justify-between">
                        <span>TEMP: {log.temperature.toFixed(0)}K</span>
                        <span>THRUST: {log.thrust_level.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
