"use client";

import React from "react";

export interface CircularLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  speed?: "slow" | "normal" | "fast";
}

export function CircularLoader({
  className = "",
  size = "md",
  speed = "normal",
}: CircularLoaderProps) {
  const sizeClass = 
    size === "sm" ? "w-8 h-8" :
    size === "lg" ? "w-16 h-16" :
    "w-12 h-12";


  return (
    <div
      role="status"
      aria-label="Loading progress"
      className={`relative flex items-center justify-center ${className}`}
    >
      {/* Outer spinning ring */}
      <div 
        className={`rounded-full border border-primary/10 border-t-2 border-t-primary animate-spin motion-reduce:animate-none ${sizeClass}`}
        style={{ animationDuration: speed === "slow" ? "3s" : speed === "fast" ? "0.6s" : "1.2s" }}
      />
      {/* Inner stable telemetry core */}
      <div className="absolute w-2 h-2 rounded-full bg-[#00FFFF] shadow-[0_0_8px_#00FFFF] animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

export default CircularLoader;
