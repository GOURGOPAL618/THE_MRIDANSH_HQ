"use client";

import React from "react";

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  className?: string;
}

export function Progress({ value, label, className = "" }: ProgressProps) {
  const percent = Math.min(Math.max(value, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`space-y-1 font-mono text-[9px] w-full ${className}`}
    >
      {(label || percent !== undefined) && (
        <div className="flex justify-between text-gray-500 uppercase tracking-wider font-bold">
          {label && <span>{label}</span>}
          <span>{percent}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-black/40 rounded overflow-hidden border border-primary/15 relative">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default Progress;
