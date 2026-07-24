"use client";

import React from "react";

export interface ButtonSpinnerProps {
  className?: string;
  size?: "sm" | "md";
}

export function ButtonSpinner({
  className = "",
  size = "sm",
}: ButtonSpinnerProps) {
  const sizeClass = size === "sm" ? "w-3.5 h-3.5 border-t" : "w-4 h-4 border-t-2";
  
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-r border-b border-l border-current/20 animate-spin motion-reduce:animate-none ${sizeClass} ${className}`}
    />
  );
}

export default ButtonSpinner;
