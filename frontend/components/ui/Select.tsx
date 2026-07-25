"use client";

import React, { SelectHTMLAttributes, ReactNode } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full font-mono text-xs">
        {label && (
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            ref={ref}
            className={`w-full bg-black/40 border border-primary/20 hover:border-primary/45 focus:border-primary text-gray-200 px-3 py-2 rounded outline-none appearance-none transition-all duration-150 focus:shadow-[0_0_8px_rgba(0,114,255,0.15)] cursor-pointer pr-8 ${
              error ? "border-danger focus:border-danger focus:shadow-[0_0_8px_rgba(239,68,68,0.15)]" : ""
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          {/* Custom Select arrow decoration */}
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <span className="text-[10px] text-danger uppercase tracking-wide font-bold">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
