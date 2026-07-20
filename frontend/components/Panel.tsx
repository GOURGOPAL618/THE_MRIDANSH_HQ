"use client";

import React, { ReactNode } from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  statusIndicator?: "healthy" | "warning" | "danger" | "off";
  variant?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  subtitle,
  headerActions,
  statusIndicator,
  variant = "primary",
  className = "",
  children,
}: PanelProps) {
  const panelStyle = variant === "primary" ? "panel-glass" : "panel-glass-secondary";

  const statusColors = {
    healthy: "bg-success shadow-[0_0_8px_#10B981]",
    warning: "bg-warning shadow-[0_0_8px_#F59E0B]",
    danger: "bg-danger shadow-[0_0_8px_#EF4444] animate-pulse",
    off: "bg-gray-600",
  };

  return (
    <div className={`rounded relative overflow-hidden flex flex-col ${panelStyle} ${className}`}>
      {/* Visual cyber decoration corners */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-primary/40"></div>
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t-2 border-r-2 border-primary/40"></div>
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b-2 border-l-2 border-primary/40"></div>
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-primary/40"></div>

      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 bg-black/20 font-mono">
          <div className="flex flex-col space-y-0.5">
            <div className="flex items-center space-x-2">
              {statusIndicator && (
                <span className={`w-2 h-2 rounded-full ${statusColors[statusIndicator]}`} />
              )}
              {title && (
                <h3 className="text-sm font-bold tracking-wider text-glow text-white uppercase">
                  {title}
                </h3>
              )}
            </div>
            {subtitle && <span className="text-[10px] text-gray-400">{subtitle}</span>}
          </div>
          {headerActions && <div className="flex items-center space-x-2">{headerActions}</div>}
        </div>
      )}

      {/* Body Content */}
      <div className="flex-1 p-4 relative">{children}</div>
    </div>
  );
}

export default Panel;
