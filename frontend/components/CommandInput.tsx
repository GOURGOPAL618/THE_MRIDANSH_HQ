"use client";

import React, { InputHTMLAttributes, useRef } from "react";

interface CommandInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  error?: string;
}

export function CommandInput({
  label = "JCC-CMD",
  value,
  onChange,
  onEnter,
  error,
  disabled,
  placeholder = "Enter coordinate or macro...",
  className = "",
  ...props
}: CommandInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onEnter) {
      onEnter();
    }
  };

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col space-y-1.5 font-mono text-xs w-full">
      <div
        onClick={handleContainerClick}
        className={`flex items-center space-x-2 border px-3 py-2 bg-black/40 rounded transition-all duration-300 cursor-text select-none ${
          error
            ? "border-danger/60 shadow-red-glow"
            : "border-primary/20 focus-within:border-primary/80 focus-within:shadow-glow"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        {/* Terminal prefix badge */}
        <span className="text-[#00FFFF] font-bold select-none">{label} &gt;</span>

        {/* Real Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-600 font-mono caret-[#00FFFF]"
          {...props}
        />
      </div>

      {/* Error message */}
      {error && <span className="text-[10px] text-danger font-bold ml-1 uppercase">{error}</span>}
    </div>
  );
}

export default CommandInput;
