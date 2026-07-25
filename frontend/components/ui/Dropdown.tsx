"use client";

import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface DropdownItem {
  id: string;
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  align = "left",
  className = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => setIsOpen((prev) => !prev);

  // Click outside closes dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      containerRef.current?.querySelector("button")?.focus();
      return;
    }

    const menuElement = menuRef.current;
    if (!menuElement) return;

    const itemsElements = menuElement.querySelectorAll(
      'button:not([disabled]), [role="menuitem"]:not([disabled])'
    );
    const active = document.activeElement;
    const index = Array.from(itemsElements).indexOf(active as Element);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % itemsElements.length;
      (itemsElements[nextIndex] as HTMLElement)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (index - 1 + itemsElements.length) % itemsElements.length;
      (itemsElements[prevIndex] as HTMLElement)?.focus();
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block text-left font-mono text-xs ${className}`}
    >
      <div
        onClick={toggleOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        className="cursor-pointer focus:outline-none"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-40 mt-1.5 w-44 bg-[#0E1525]/95 border border-primary/20 rounded shadow-glow py-1 focus:outline-none ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {/* Cybersecurity style corners */}
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-primary/40" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-primary/40" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-primary/40" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-primary/40" />

            {items.map((item) => (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`w-full text-left px-3.5 py-2 hover:bg-primary/10 text-gray-300 hover:text-white transition-colors flex items-center space-x-2 focus:outline-none focus:bg-primary/10 focus:text-white ${
                  item.disabled ? "opacity-30 cursor-not-allowed pointer-events-none" : ""
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dropdown;
