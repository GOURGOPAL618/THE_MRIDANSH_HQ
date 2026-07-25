"use client";

import React, { ReactNode } from "react";

export interface BadgeProps {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
  children: ReactNode;
}

export function Badge({
  variant = "primary",
  className = "",
  children,
}: BadgeProps) {
  const styles = {
    primary: "border-primary/30 bg-primary/5 text-primary shadow-[0_0_8px_rgba(0,114,255,0.15)]",
    secondary: "border-secondary/30 bg-secondary/5 text-secondary shadow-[0_0_8px_rgba(0,255,255,0.15)]",
    success: "border-success/30 bg-success/5 text-success shadow-[0_0_8px_rgba(16,185,129,0.15)]",
    warning: "border-warning/30 bg-warning/5 text-warning shadow-[0_0_8px_rgba(245,158,11,0.15)]",
    danger: "border-danger/30 bg-danger/5 text-danger shadow-[0_0_8px_rgba(239,68,68,0.15)]",
    neutral: "border-gray-700 bg-gray-900/50 text-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border rounded text-[10px] font-mono font-bold uppercase tracking-wider ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
