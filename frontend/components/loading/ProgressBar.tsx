"use client";

import React from "react";

export interface ProgressBarProps {
  progress?: number; // ge=0, le=100. If omitted, renders as indeterminate bar.
  className?: string;
  label?: string;
}

export function ProgressBar({
  progress,
  className = "",
  label,
}: ProgressBarProps) {
  const isIndeterminate = progress === undefined;
  
  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`space-y-1.5 font-mono text-[10px] ${className}`}
    >
      {(label || !isIndeterminate) && (
        <div className="flex justify-between text-gray-400 font-bold uppercase tracking-wider">
          <span>{label || "Telemetry loading"}</span>
          {!isIndeterminate && <span className="text-primary">{progress}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-primary/10 relative">
        {isIndeterminate ? (
          <div className="h-full w-1/3 bg-gradient-to-r from-primary to-secondary rounded-full absolute top-0 left-0 motion-safe:animate-[shuttle_2s_infinite_ease-in-out] motion-reduce:animate-none" />
        ) : (
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        )}
      </div>
      
      {/* Shuttle animation declaration keyframe style (scoped dynamically) */}
      {isIndeterminate && (
        <style>{`
          @keyframes shuttle {
            0% { left: -33%; }
            50% { left: 100%; }
            100% { left: -33%; }
          }
        `}</style>
      )}
    </div>
  );
}

export default ProgressBar;
