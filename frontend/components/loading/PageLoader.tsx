"use client";

import React from "react";

export interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({
  message = "SYNCHRONIZING COCKPIT FEED...",
  className = "",
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className={`flex flex-col items-center justify-center p-8 space-y-4 min-h-[300px] font-mono ${className}`}
    >
      {/* Outer concentric HUD spinner */}
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border border-primary/20" />
        <div className="absolute inset-0 rounded-full border-t-2 border-primary motion-safe:animate-spin motion-reduce:animate-none" />
      </div>
      {message && (
        <span className="text-[10px] text-primary/80 uppercase tracking-widest animate-pulse motion-reduce:animate-none">
          {message}
        </span>
      )}
    </div>
  );
}

export default PageLoader;
