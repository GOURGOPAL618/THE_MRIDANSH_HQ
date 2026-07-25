"use client";

import React from "react";
import { motion } from "framer-motion";

export interface ToastProps {
  title?: string;
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onClose: () => void;
  className?: string;
}

export function Toast({
  title,
  message,
  type = "info",
  onClose,
  className = "",
}: ToastProps) {
  const configs = {
    success: {
      color: "border-[#10B981] bg-[#10B981]/10 text-[#10B981]",
      shadow: "shadow-[0_0_15px_rgba(16,185,129,0.25)]",
      stripe: "bg-[#10B981]",
      defaultTitle: "SUCCESS SIGNAL",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      color: "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]",
      shadow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]",
      stripe: "bg-[#F59E0B]",
      defaultTitle: "WARNING NOTICE",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    error: {
      color: "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]",
      shadow: "shadow-[0_0_15px_rgba(239,68,68,0.25)]",
      stripe: "bg-[#EF4444]",
      defaultTitle: "CRITICAL BREACH",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    info: {
      color: "border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF]",
      shadow: "shadow-[0_0_15px_rgba(0,255,255,0.25)]",
      stripe: "bg-[#00FFFF]",
      defaultTitle: "TELEMETRY UPDATE",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const current = configs[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      className={`relative overflow-hidden border p-3.5 rounded backdrop-blur-md font-mono text-[11px] flex items-start justify-between pointer-events-auto ${current.color} ${current.shadow} ${className}`}
    >
      {/* Visual background stripe */}
      <div className={`absolute top-0 bottom-0 left-0 w-0.5 ${current.stripe}`} />

      <div className="flex items-start space-x-2.5 ml-1 select-none">
        <div className="mt-0.5">{current.icon}</div>
        <div className="flex flex-col space-y-0.5">
          <span className="font-bold text-white uppercase tracking-wider">
            {title || current.defaultTitle}
          </span>
          <span className="text-gray-300 leading-relaxed text-justify">{message}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        aria-label="Close notification"
        className="text-gray-400 hover:text-white transition-colors focus:outline-none ml-3 shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

export default Toast;
