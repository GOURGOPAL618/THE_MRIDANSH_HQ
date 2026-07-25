"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: "left" | "right";
  className?: string;
}

export function Sidebar({
  isOpen,
  onClose,
  children,
  position = "left",
  className = "",
}: SidebarProps) {
  const isLeft = position === "left";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
          />

          {/* Sidebar Drawer Container */}
          <motion.div
            initial={{ x: isLeft ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: isLeft ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`w-64 h-full bg-[#0E1525]/95 border-r border-primary/10 relative z-10 flex flex-col focus:outline-none ${
              !isLeft ? "ml-auto border-l border-r-0" : ""
            } ${className}`}
          >
            {/* Cybersecurity corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary/40" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary/40" />

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default Sidebar;
