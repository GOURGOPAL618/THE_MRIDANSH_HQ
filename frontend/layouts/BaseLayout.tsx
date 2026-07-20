"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import { useAudio } from "../hooks/useAudio";
import { useNotification } from "../hooks/useNotification";
import { MODULES, ModuleItem } from "../constants/modules";
import { CommandPalette } from "../components/CommandPalette";

interface BaseLayoutProps {
  children: ReactNode;
}

export function BaseLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { playClick, playBeep } = useAudio();
  const { notifyInfo } = useNotification();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [systemTime, setSystemTime] = useState("");

  // Sync System time (UTC)
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setSystemTime(
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSidebarToggle = () => {
    playBeep();
    setIsSidebarCollapsed((prev) => !prev);
  };

  const getModuleTitle = () => {
    const current = MODULES.find((m) => m.path === pathname);
    return current ? current.name : "JCC COCKPIT";
  };

  // Helper to map module icons
  const renderIcon = (name: string) => {
    const iconProps = { className: "w-5 h-5 transition-colors", stroke: "currentColor", strokeWidth: 1.5, fill: "none", viewBox: "0 0 24 24" };
    
    switch (name) {
      case "dashboard":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        );
      case "earth":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l.406.34c.125.104.244.223.34.346l.34.405a1.125 1.125 0 01.205.65v.007c0 .172-.039.343-.116.5l-.139.282a1.125 1.125 0 00-.116.5v.007c0 .285.109.56.303.767l.407.434c.113.12.19.268.223.429l.139.69a1.125 1.125 0 01-.223.868l-.408.489c-.113.135-.175.305-.175.48v.007c0 .285.109.56.303.767l.407.434c.113.12.19.268.223.429l.139.69a1.125 1.125 0 01-.223.868l-.408.489c-.113.135-.175.305-.175.48v.007c0 .417-.25.794-.632.96l-.693.301a1.125 1.125 0 01-.868-.067l-.767-.407a1.125 1.125 0 00-.767-.116l-.282.139a1.125 1.125 0 01-.5.116h-.007a1.125 1.125 0 01-.5-.116l-.282-.139a1.125 1.125 0 00-.767-.116l-.767.407a1.125 1.125 0 01-.868.067l-.693-.301a1.125 1.125 0 01-.632-.96v-.007c0-.175-.062-.345-.175-.48l-.408-.489a1.125 1.125 0 01-.223-.868l.139-.69a1.125 1.125 0 00.223-.43l.407-.433a1.125 1.125 0 00.303-.768v-.007c0-.175-.062-.345-.175-.48l-.408-.489a1.125 1.125 0 01-.223-.868l.139-.69a1.125 1.125 0 00.223-.43l.407-.433a1.125 1.125 0 00.303-.768v-.007c0-.417.25-.794.632-.96l.693-.301a1.125 1.125 0 01.868.067l.767.407c.237.126.505.165.767.116l.282-.139A1.125 1.125 0 0112 3.03v-.007c0-.621.504-1.125 1.125-1.125h.007c.621 0 1.125.504 1.125 1.125v.007z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
          </svg>
        );
      case "radar":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m-6 0a6 6 0 1012 0 6 6 0 10-12 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l4.5 -4.5" />
          </svg>
        );
      case "engine":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l3.75-2.528L16.5 21l-.813-5.096C17.75 14.545 19 12.43 19 10c0-3.866-3.134-7-7-7s-7 3.134-7 7c0 2.43 1.25 4.545 3.187 5.904z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        );
      case "research":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        );
      case "database-zap":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
        );
      case "security":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
          </svg>
        );
      case "cog":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0a7.5 7.5 0 00-7.5-7.5M12 4.5V3m0 16.5V21m0-4.5a7.5 7.5 0 007.5-7.5M19.5 12H21m-16.5 0H3m1.5 0a7.5 7.5 0 007.5 7.5" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#05070B] text-white select-none">
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-primary/10 bg-[#0E1525]/80 backdrop-blur-md px-4 flex items-center justify-between z-30 font-mono text-xs">
        <div className="flex items-center space-x-3">
          {/* Dashboard Icon */}
          <div className="w-8 h-8 rounded border border-primary/30 flex items-center justify-center bg-primary/5 text-primary shadow-glow">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-8.24-8.24 6 6 0 008.24 8.24z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
            </svg>
          </div>
          <div className="flex flex-col space-y-0.5">
            <span className="font-bold tracking-wider text-[#00FFFF]">MRIDANSH HQ</span>
            <span className="text-[9px] text-gray-500 tracking-widest uppercase">JAGANNATH COMMAND CENTER</span>
          </div>
        </div>

        {/* Current Module Title */}
        <div className="hidden md:block font-bold tracking-widest text-glow text-white text-sm uppercase">
          {getModuleTitle()}
        </div>

        {/* Time, Settings and Authorization Status */}
        <div className="flex items-center space-x-6">
          <div className="hidden lg:block text-gray-400 font-mono text-[10px] tracking-wider bg-black/30 border border-primary/5 px-3 py-1 rounded">
            SYSTEM TIME: <span className="text-[#00FFFF] font-bold">{systemTime}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10B981]"></span>
            <span className="font-bold text-success text-[10px] uppercase tracking-widest bg-success/5 border border-success/20 px-2.5 py-0.5 rounded">
              COMMANDER AUTHENTICATED
            </span>
          </div>
        </div>
      </header>

      {/* Main Structural Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Collapsible Sidebar */}
        <aside 
          className={`border-r border-primary/10 bg-[#0E1525]/60 backdrop-blur-sm flex flex-col z-20 transition-all duration-300 ${
            isSidebarCollapsed ? "w-14" : "w-64"
          }`}
        >
          {/* Collapse Toggle Button */}
          <div className="h-10 border-b border-primary/5 flex items-center justify-end px-3">
            <button
              onClick={handleSidebarToggle}
              className="text-gray-500 hover:text-[#00FFFF] transition-colors focus:outline-none"
            >
              <svg 
                className={`w-4 h-4 transform transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Nav List */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
            {MODULES.map((mod) => {
              const isActive = pathname === mod.path;
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    playClick();
                    notifyInfo(`Initiating module loading routine for: ${mod.name}`, "NAVIGATION");
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-mono border transition-all duration-200 ${
                    isActive
                      ? "bg-primary/20 text-[#00FFFF] border-primary/20 shadow-glow"
                      : "text-gray-400 border-transparent hover:text-white hover:bg-[#0E1525]"
                  }`}
                >
                  <div className={isActive ? "text-[#00FFFF]" : "text-gray-500"}>
                    {renderIcon(mod.iconName)}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="font-bold tracking-wider text-left flex-1 truncate uppercase">
                      {mod.name}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Shortcuts Palette Hint */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t border-primary/5 text-[9px] text-gray-500 font-mono text-center">
              PRESS <span className="text-[#00FFFF] font-bold">CTRL + K</span> FOR COMMANDS
            </div>
          )}
        </aside>

        {/* Content Viewport */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#05070B] relative p-6">
          {children}
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 border-t border-primary/10 bg-[#0E1525] px-4 flex items-center justify-between z-30 font-mono text-[9px] text-gray-500 select-none">
        <div className="flex items-center space-x-6">
          <span className="tracking-widest uppercase">COCKPIT STATUS: ONLINE</span>
          
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span>API: CONNECTED</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span>DATABASE: ONLINE</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] shadow-[0_0_4px_#00FFFF]"></span>
            <span>AI CORE: STANDBY</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <span>THE MRIDANSH HQ: v1.0.0</span>
        </div>
      </footer>

      {/* Global Elements */}
      <CommandPalette />
    </div>
  );
}

export default BaseLayout;
