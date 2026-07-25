"use client";

import React, { ReactNode } from "react";

export interface NavbarProps {
  logo?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Navbar({
  logo,
  actions,
  children,
  className = "",
}: NavbarProps) {
  return (
    <header
      className={`w-full bg-[#0E1525]/80 backdrop-blur-md border-b border-primary/10 px-6 py-4 flex items-center justify-between font-mono text-xs z-30 relative ${className}`}
    >
      {/* Cyber decoration lines */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Left logo section */}
      {logo && <div className="flex items-center space-x-2 shrink-0">{logo}</div>}

      {/* Nav Link slots */}
      {children && (
        <nav className="hidden md:flex items-center space-x-6 flex-1 justify-center px-4">
          {children}
        </nav>
      )}

      {/* Right side actions controls */}
      {actions && <div className="flex items-center space-x-3 shrink-0">{actions}</div>}
    </header>
  );
}

export default Navbar;
