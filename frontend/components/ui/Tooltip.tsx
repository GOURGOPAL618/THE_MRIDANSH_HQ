"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({
  content,
  position = "top",
  children,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={`relative inline-block ${className}`}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={`absolute z-50 pointer-events-none whitespace-nowrap bg-black/95 border border-primary/20 text-glow text-[10px] text-gray-200 px-2 py-1 rounded font-mono uppercase tracking-wider shadow-glow ${positionStyles[position]}`}
          >
            {/* Cyber decoration mini corner */}
            <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-primary/40" />
            <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-primary/40" />
            
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Tooltip;
