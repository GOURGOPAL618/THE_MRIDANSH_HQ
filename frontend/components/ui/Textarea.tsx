"use client";

import React, { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-1.5 w-full font-mono text-xs">
        {label && (
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`bg-black/40 border border-primary/20 hover:border-primary/45 focus:border-primary text-gray-200 px-3 py-2 rounded outline-none transition-all duration-150 focus:shadow-[0_0_8px_rgba(0,114,255,0.15)] placeholder:text-gray-700 min-h-[80px] resize-y ${
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

Textarea.displayName = "Textarea";
export default Textarea;
