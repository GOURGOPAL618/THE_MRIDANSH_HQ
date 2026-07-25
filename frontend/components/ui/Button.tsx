"use client";

import React, { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "warning" | "glow" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  onClickAudio?: () => void;
  children?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      onClickAudio,
      onClick,
      disabled,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const handlePress = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClickAudio) {
        onClickAudio();
      }
      if (onClick) {
        onClick(e);
      }
    };

    const baseStyles =
      "font-mono font-bold tracking-widest uppercase rounded focus:outline-none transition-all duration-150 border flex items-center justify-center space-x-2 active:scale-95 motion-reduce:active:scale-100 selection:bg-transparent";

    const sizeStyles = {
      sm: "px-3 py-1.5 text-[10px]",
      md: "px-5 py-2.5 text-xs",
      lg: "px-8 py-3.5 text-sm",
    };

    const variantStyles = {
      primary:
        "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_10px_rgba(var(--color-primary),0.2)]",
      secondary:
        "border-secondary/40 bg-secondary/5 text-secondary hover:bg-secondary/15 hover:border-secondary",
      danger:
        "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 hover:border-danger hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]",
      warning:
        "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 hover:border-warning",
      glow:
        "border-primary bg-primary/20 text-secondary hover:bg-primary/30 shadow-glow",
      ghost:
        "border-transparent bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
    };

    const disabledStyles =
      disabled || loading ? "opacity-40 cursor-not-allowed pointer-events-none" : "";

    return (
      <button
        ref={ref}
        type={type}
        onClick={handlePress}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
