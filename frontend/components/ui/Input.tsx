"use client";

import React, { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", type = "text", ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full font-mono text-xs">
        {label && (
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`bg-black/40 border border-primary/20 hover:border-primary/45 focus:border-primary text-gray-200 px-3 py-2 rounded outline-none transition-all duration-150 focus:shadow-[0_0_8px_rgba(0,114,255,0.15)] placeholder:text-gray-700 ${
            error ? "border-danger focus:border-danger focus:shadow-[0_0_8px_rgba(239,68,68,0.15)]" : ""
          } ${className}`}
          {...props}
        />
        {error && (
          <span className="text-[10px] text-danger uppercase tracking-wide font-bold">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
