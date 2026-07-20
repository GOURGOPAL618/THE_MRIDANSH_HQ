"use client";

import React from "react";
import { HTMLMotionProps, motion } from "framer-motion";
import { useAudio } from "../hooks/useAudio";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "danger" | "warning" | "glow";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  onClick,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const { playClick } = useAudio();

  const handlePress = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClick();
    if (onClick) {
      onClick(e);
    }
  };

  const baseStyles =
    "font-mono font-bold tracking-widest uppercase rounded focus:outline-none transition-all duration-200 border flex items-center justify-center space-x-2";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-5 py-2.5 text-xs",
    lg: "px-8 py-3.5 text-sm",
  };

  const variantStyles = {
    primary:
      "border-primary/40 bg-primary/10 text-primary-glow hover:bg-primary/20 hover:border-primary",
    secondary:
      "border-secondary/40 bg-secondary/5 text-secondary hover:bg-secondary/15 hover:border-secondary",
    danger:
      "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 hover:border-danger shadow-red-glow",
    warning:
      "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 hover:border-warning",
    glow: "border-primary bg-primary/20 text-[#00FFFF] shadow-cyan-glow hover:bg-primary/40",
  };

  const disabledStyles = (disabled || loading)
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={handlePress}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4.5 w-4.5 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{children}</span>
    </motion.button>
  );
}

export default Button;
