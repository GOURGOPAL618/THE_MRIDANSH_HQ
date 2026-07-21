"use client";

import React, { useEffect, useRef, useState } from "react";

interface EngineCoreVisualizerProps {
  engineState: "shutdown" | "igniting" | "nominal" | "emergency_stop";
}

export default function EngineCoreVisualizer({ engineState }: EngineCoreVisualizerProps) {
  const feTurbulenceRef = useRef<SVGFETurbulenceElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [pulseScale, setPulseScale] = useState(1);

  // Animate SVG heat distortion filter (organic fractal noise shift)
  useEffect(() => {
    if (engineState !== "nominal") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let frame = 0;
    const animateHeat = () => {
      frame += 0.15;
      if (feTurbulenceRef.current) {
        // Shift baseFrequency slightly to simulate rising heat distortion wave cycles
        const freqX = 0.035 + Math.sin(frame * 0.2) * 0.005;
        const freqY = 0.06 + Math.cos(frame * 0.1) * 0.01;
        feTurbulenceRef.current.setAttribute("baseFrequency", `${freqX} ${freqY}`);
      }
      animationRef.current = requestAnimationFrame(animateHeat);
    };

    animationRef.current = requestAnimationFrame(animateHeat);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [engineState]);

  // Core glow pulsing speed calculation based on state
  useEffect(() => {
    let pulseFrame = 0;
    let pulseInterval: NodeJS.Timeout | null = null;

    const runPulse = () => {
      let speed = 0.02; // Default shutdown
      if (engineState === "igniting") speed = 0.06;
      else if (engineState === "nominal") speed = 0.12;
      else if (engineState === "emergency_stop") speed = 0.25;

      pulseInterval = setInterval(() => {
        pulseFrame += speed;
        // Pulse scale bouncing between 0.95 and 1.15
        const scaleVal = 1.05 + Math.sin(pulseFrame) * 0.1;
        setPulseScale(scaleVal);
      }, 16);
    };

    runPulse();

    return () => {
      if (pulseInterval) clearInterval(pulseInterval);
    };
  }, [engineState]);

  // Determine glow color mapping
  const getGlowStyles = () => {
    switch (engineState) {
      case "igniting":
        return {
          bg: "bg-[#00FFFF]/30 shadow-[0_0_40px_#00FFFF]",
          border: "border-[#00FFFF]/40",
          core: "bg-cyan-200 shadow-[0_0_20px_#FFFFFF]"
        };
      case "nominal":
        return {
          bg: "bg-[#00FFFF]/50 shadow-[0_0_70px_#00FFFF,0_0_120px_#00FFFF]",
          border: "border-[#00FFFF]/60",
          core: "bg-white shadow-[0_0_40px_#FFFFFF]"
        };
      case "emergency_stop":
        return {
          bg: "bg-red-600/40 shadow-[0_0_60px_#EF4444,0_0_100px_#EF4444]",
          border: "border-red-500/60",
          core: "bg-red-100 shadow-[0_0_35px_#EF4444]"
        };
      case "shutdown":
      default:
        return {
          bg: "bg-cyan-950/10 shadow-none",
          border: "border-gray-800",
          core: "bg-gray-800 shadow-none"
        };
    }
  };

  const glow = getGlowStyles();

  return (
    <div className="w-full relative h-[450px] overflow-hidden rounded border border-primary/20 bg-black flex items-center justify-center select-none">
      
      {/* Background Graphic representing premium Engine Room */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/engine_reactor_core.jpg"
        alt="AETHER Reactor Room"
        className="absolute inset-0 w-full h-full object-cover opacity-65"
      />

      {/* SVG Heat Distortion displacement filter declaration */}
      {engineState === "nominal" && (
        <svg className="absolute hidden" width="0" height="0">
          <defs>
            <filter id="reactor-heat-distortion">
              <feTurbulence
                ref={feTurbulenceRef}
                type="fractalNoise"
                baseFrequency="0.04 0.08"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="12"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* Ramping core rings with CSS filters */}
      <div 
        className="relative z-10 flex items-center justify-center"
        style={{
          filter: engineState === "nominal" ? "url(#reactor-heat-distortion)" : "none",
          transform: `scale(${pulseScale})`,
          transition: "transform 0.05s ease-out"
        }}
      >
        {/* Outer electromagnetic containment ring */}
        <div className={`w-40 h-40 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${glow.border}`}>
          
          {/* Middle energy accumulation field ring */}
          <div className={`w-32 h-32 rounded-full border border-dashed flex items-center justify-center transition-colors duration-500 ${glow.border} animate-spin`} style={{ animationDuration: "12s" }}>
            <div className="w-2.5 h-2.5 bg-primary rounded-full absolute -top-1"></div>
            <div className="w-2.5 h-2.5 bg-primary rounded-full absolute -bottom-1"></div>
          </div>

          {/* Reactor Inner Glow Energy core */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 absolute ${glow.bg}`}>
            
            {/* Super hot center nucleus */}
            <div className={`w-12 h-12 rounded-full transition-all duration-500 ${glow.core}`} />
          </div>

        </div>
      </div>

      {/* Sci-Fi overlays and visual telemetry coordinates grids */}
      <div className="absolute inset-x-4 top-4 flex justify-between font-mono text-[10px] text-gray-500">
        <div>CORE: AETHER-MRID1607X</div>
        <div>MAGNETIC LEVITATION FIELD: {engineState === "emergency_stop" ? "DISENGAGED" : "NOMINAL"}</div>
      </div>

      <div className="absolute inset-x-4 bottom-4 flex justify-between font-mono text-[9px] text-[#00FFFF]/60">
        <div>WARNING: EXTREME VOLTAGE / THERMAL EMISSIONS</div>
        <div>STATE: {engineState.toUpperCase()}</div>
      </div>

      {/* Cybernetic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_95%,rgba(0,255,255,0.03)_95%),linear-gradient(90deg,rgba(18,24,38,0)_95%,rgba(0,255,255,0.03)_95%)] bg-[size:24px_24px] pointer-events-none"></div>

      {/* Status Overlay HUD Text */}
      {engineState === "emergency_stop" && (
        <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[1px] flex items-center justify-center flex-col z-20">
          <div className="bg-red-600 text-black px-4 py-2 font-bold uppercase tracking-widest text-xs animate-pulse rounded border border-red-500">
            EMERGENCY SAFETY LOCK ACTIVE
          </div>
          <div className="text-[10px] text-red-400 mt-2 font-mono uppercase">
            System reset sequence required
          </div>
        </div>
      )}
    </div>
  );
}
