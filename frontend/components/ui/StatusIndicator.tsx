"use client";

import React from "react";

export type StatusIndicatorType = "healthy" | "warning" | "danger" | "off" | "standby";

export interface StatusIndicatorProps {
  status: StatusIndicatorType;
  className?: string;
}

export function StatusIndicator({ status, className = "" }: StatusIndicatorProps) {
  const styles = {
    healthy: "bg-success shadow-[0_0_8px_#10B981]",
    warning: "bg-warning shadow-[0_0_8px_#F59E0B]",
    danger: "bg-danger shadow-[0_0_8px_#EF4444] animate-pulse",
    off: "bg-gray-600",
    standby: "bg-secondary shadow-[0_0_8px_var(--color-secondary)]",
  };

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${styles[status]} ${className}`}
      role="img"
      aria-label={`Status: ${status}`}
    />
  );
}

export default StatusIndicator;
