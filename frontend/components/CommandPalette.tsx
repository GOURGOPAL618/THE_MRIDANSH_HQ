"use client";

import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAudio } from "../hooks/useAudio";
import { logger } from "../utils/logger";

export interface CommandItem {
  id: string;
  name: string;
  category: string;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { playClick, playBeep } = useAudio();
  const inputRef = useRef<HTMLInputElement>(null);

  // Static baseline command registry (architecture only, actions print log prompts or run mock toggles)
  const registry: CommandItem[] = [
    {
      id: "navigate-search",
      name: "Navigate: Search Center Cockpit",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Search", "CMD-PALETTE");
        router.push("/search");
      },
    },
    {
      id: "navigate-dashboard",
      name: "Navigate: Dashboard Cockpit",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Dashboard", "CMD-PALETTE");
        router.push("/dashboard");
      },
    },
    {
      id: "navigate-earth",
      name: "Navigate: Earth Operations",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Earth Operations", "CMD-PALETTE");
        router.push("/earth");
      },
    },
    {
      id: "navigate-radar",
      name: "Navigate: Radar Control Room",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Radar Control", "CMD-PALETTE");
        router.push("/radar");
      },
    },
    {
      id: "navigate-engine",
      name: "Navigate: Engine Room Diagnostics",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Engine Room", "CMD-PALETTE");
        router.push("/engine");
      },
    },
    {
      id: "navigate-settings",
      name: "Navigate: Cockpit Settings Vault",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Settings", "CMD-PALETTE");
        router.push("/settings");
      },
    },
    {
      id: "navigate-logs",
      name: "Navigate: Mission Activity Logs",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Logs", "CMD-PALETTE");
        router.push("/logs");
      },
    },
    {
      id: "navigate-notifications",
      name: "Navigate: Central Notification Center",
      category: "Navigation",
      action: () => {
        logger.info("Macro navigation command: Notifications", "CMD-PALETTE");
        router.push("/notifications");
      },
    },
    {
      id: "system-lockdown",
      name: "System: Trigger Emergency Lockdown",
      category: "Security",
      action: () => {
        logger.warn("Macro command: EMERGENCY SYSTEM LOCKDOWN TRIGGERED", "SECURITY");
        router.push("/security");
      },
    },
  ];

  // Open on Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) playBeep();
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playBeep]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const dynamicCommands: CommandItem[] = search.trim() ? [
    {
      id: "search-query",
      name: `Search Cockpit for: "${search.trim()}"`,
      category: "Search",
      action: () => {
        router.push(`/search?q=${encodeURIComponent(search.trim())}`);
      }
    }
  ] : [];

  const filteredCommands = [
    ...dynamicCommands,
    ...registry.filter((cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase())
    )
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        playClick();
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 font-mono select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          ></motion.div>

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-lg bg-[#0E1525] border border-primary/30 rounded shadow-glow z-10 flex flex-col overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-primary/10">
              <span className="text-[#00FFFF] font-bold">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search command vault (Ctrl + K)..."
                className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder-gray-600 font-mono caret-[#00FFFF]"
              />
              <span className="text-[10px] text-gray-500 border border-gray-800 rounded px-1.5 py-0.5">
                ESC
              </span>
            </div>

            {/* List Results */}
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => {
                        playClick();
                        cmd.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded cursor-pointer transition-colors text-xs font-mono ${
                        isSelected
                          ? "bg-primary/20 text-[#00FFFF] border border-primary/20"
                          : "text-gray-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-gray-500 uppercase">
                          {cmd.category}
                        </span>
                        <span className="font-bold">{cmd.name}</span>
                      </div>
                      {cmd.shortcut && (
                        <span className="text-[9px] text-gray-500 border border-gray-800 rounded px-1">
                          {cmd.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-gray-500 py-6">
                  NO MATCHING COMMANDS FOUND IN COCKPIT CORE
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="bg-black/25 px-4 py-2 border-t border-primary/10 flex items-center justify-between text-[9px] text-gray-500">
              <div className="flex items-center space-x-4">
                <span>↑↓ navigate</span>
                <span>⏎ select</span>
              </div>
              <span>COMMAND CONTROLS VAULT</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
