"use client";

import React from "react";
import Badge from "./ui/Badge";

export type StatusType = "healthy" | "warning" | "critical" | "offline" | "standby";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const config = {
    healthy: {
      variant: "success" as const,
      bullet: "bg-success shadow-[0_0_6px_#10B981]",
      defaultLabel: "HEALTHY",
    },
    warning: {
      variant: "warning" as const,
      bullet: "bg-warning shadow-[0_0_6px_#F59E0B]",
      defaultLabel: "WARNING",
    },
    critical: {
      variant: "danger" as const,
      bullet: "bg-danger shadow-[0_0_6px_#EF4444] animate-ping",
      defaultLabel: "CRITICAL",
    },
    offline: {
      variant: "neutral" as const,
      bullet: "bg-gray-600",
      defaultLabel: "OFFLINE",
    },
    standby: {
      variant: "secondary" as const,
      bullet: "bg-[#00FFFF] shadow-[0_0_6px_#00FFFF]",
      defaultLabel: "STANDBY",
    },
  };

  const current = config[status];

  return (
    <Badge
      variant={current.variant}
      className={`inline-flex items-center space-x-1.5 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.bullet}`} />
      <span>{label || current.defaultLabel}</span>
    </Badge>
  );
}

export default StatusBadge;
