"use client";

import React, { ReactNode } from "react";

export interface CardProps {
  title?: ReactNode;
  subtitle?: string;
  headerActions?: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  children: ReactNode;
}

export function Card({
  title,
  subtitle,
  headerActions,
  variant = "primary",
  className = "",
  children,
}: CardProps) {
  const panelStyle = variant === "primary" ? "panel-glass" : "panel-glass-secondary";

  return (
    <div className={`rounded relative overflow-hidden flex flex-col ${panelStyle} ${className}`}>
      {/* Visual cyber decoration corners */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-primary/40" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t-2 border-r-2 border-primary/40" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b-2 border-l-2 border-primary/40" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-primary/40" />

      {/* Header */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 bg-black/20 font-mono">
          <div className="flex flex-col space-y-0.5">
            {title && (
              <h3 className="text-sm font-bold tracking-wider text-glow text-white uppercase">
                {title}
              </h3>
            )}
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

export default Card;
