"use client";

import React from "react";

export type StatusType = "healthy" | "warning" | "critical" | "offline" | "standby";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const config = {
    healthy: {
      border: "border-success/30 bg-success/5 text-success",
      glow: "shadow-[0_0_8px_rgba(16,185,129,0.3)]",
      bullet: "bg-success shadow-[0_0_6px_#10B981]",
      defaultLabel: "HEALTHY",
    },
    warning: {
      border: "border-warning/30 bg-warning/5 text-warning",
      glow: "shadow-[0_0_8px_rgba(245,158,11,0.3)]",
      bullet: "bg-warning shadow-[0_0_6px_#F59E0B]",
      defaultLabel: "WARNING",
    },
    critical: {
      border: "border-danger/40 bg-danger/5 text-danger animate-pulse",
      glow: "shadow-[0_0_8px_rgba(239,68,68,0.3)]",
      bullet: "bg-danger shadow-[0_0_6px_#EF4444] animate-ping",
      defaultLabel: "CRITICAL",
    },
    offline: {
      border: "border-gray-700 bg-gray-900 text-gray-500",
      glow: "",
      bullet: "bg-gray-600",
      defaultLabel: "OFFLINE",
    },
    standby: {
      border: "border-[#00FFFF]/30 bg-[#00FFFF]/5 text-[#00FFFF]",
      glow: "shadow-[0_0_8px_rgba(0,255,255,0.3)]",
      bullet: "bg-[#00FFFF] shadow-[0_0_6px_#00FFFF]",
      defaultLabel: "STANDBY",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 border rounded text-[10px] font-mono font-bold uppercase tracking-wider ${current.border} ${current.glow} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.bullet}`} />
      <span>{label || current.defaultLabel}</span>
    </span>
  );
}

export default StatusBadge;
