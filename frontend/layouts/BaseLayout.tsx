"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../hooks/useTheme";
import { useAudio } from "../hooks/useAudio";
import { useNotification } from "../hooks/useNotification";
import { useAuth } from "../contexts/AuthContext";
import { MODULES } from "../constants/modules";
import { CommandPalette } from "../components/CommandPalette";
import { LoadingScreen } from "../components/LoadingScreen";
import { api } from "../services/api";

interface BaseLayoutProps {
  children: ReactNode;
}

export function BaseLayout({ children }: BaseLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { playClick, playBeep } = useAudio();
  const { notifyInfo } = useNotification();
  const { commander, logout, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [systemTime, setSystemTime] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  
  const [backendStatus, setBackendStatus] = useState<"online" | "offline">("offline");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll for unread notifications count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const controller = new AbortController();

    const fetchUnread = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await api.get<{
          success: boolean;
          message: string;
          data: {
            count: number;
          };
        }>("/api/v1/notifications/unread-count");
        if (active && response.data && response.data.success) {
          setUnreadCount(response.data.data.count);
        }
      } catch {
        // Silently fail to prevent UI layout disruptions
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);

    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Sync System time (UTC) - client side only to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
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

  // Live Backend Status check from API health endpoint
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          const json = await response.json();
          if (json?.data?.status === "healthy") {
            setBackendStatus("online");
            return;
          }
        }
        setBackendStatus("offline");
      } catch (err) {
        setBackendStatus("offline");
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Trigger brief LoadingScreen when routing path changes to prevent blank page flashes
  useEffect(() => {
    setIsTransitioning(true);
    const t = setTimeout(() => setIsTransitioning(false), 500); // snappy 500ms sync logs
    return () => clearTimeout(t);
  }, [pathname]);

  // Route protection redirect checks
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSidebarToggle = () => {
    playBeep();
    setIsSidebarCollapsed((prev) => !prev);
  };

  const handleLogout = async () => {
    playClick();
    await logout();
    router.push("/");
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
      case "link":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        );
      case "search":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        );
      case "security":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
          </svg>
        );
      case "bell":
        return (
          <svg {...iconProps}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a9.04 9.04 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 4.5a8.969 8.969 0 00-2.168-4.5M19 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM4 9a8 8 0 0116 0c0 3-1.25 5.5-3 7.5a14.37 14.37 0 01-10 0C5.25 14.5 4 12 4 9z" />
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

  // Block loading state check to prevent layout flashes during authentication load
  if (isAuthLoading || !commander) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070B] text-primary-glow font-mono">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 tracking-widest uppercase animate-pulse">Checking credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#05070B] text-white select-none">
      
      {/* Top Navbar */}
      <header className="h-14 border-b border-primary/10 bg-[#0E1525]/80 backdrop-blur-md px-4 flex items-center justify-between z-30 font-mono text-xs">
        <div className="flex items-center space-x-3">
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

        {/* Navbar Actions and User Details */}
        <div className="flex items-center space-x-6">
          <div className="hidden lg:block text-gray-400 font-mono text-[10px] tracking-wider bg-black/30 border border-primary/5 px-3 py-1 rounded">
            SYSTEM TIME: <span className="text-[#00FFFF] font-bold">{isMounted ? systemTime : "LOADING..."}</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10B981]"></span>
              <span className="font-bold text-success text-[10px] uppercase tracking-widest">
                {commander.username}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[9px] text-danger border border-danger/30 hover:bg-danger/10 px-2.5 py-1 rounded transition-all duration-200 tracking-widest font-bold uppercase focus:outline-none"
            >
              LOGOUT
            </button>
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

          {/* Nav List - Generated directly from constants/modules.ts */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto px-2">
            {MODULES.map((mod) => {
              const isActive = pathname === mod.path;
              return (
                <Link
                  key={mod.id}
                  href={mod.path}
                  onClick={() => playClick()}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-mono border transition-all duration-200 relative ${
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
                  {mod.id === "notifications" && unreadCount > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#EF4444] text-white shrink-0 ${
                      isSidebarCollapsed ? "absolute top-1.5 right-1.5" : ""
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </Link>
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

        {/* Content Viewport with sync transitioning loader overlay */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#05070B] relative p-6">
          <AnimatePresence mode="wait">
            {isTransitioning ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#05070B] z-10 flex items-center justify-center p-6"
              >
                <LoadingScreen 
                  title={`Synchronizing ${getModuleTitle()}`} 
                  durationMs={400}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className={isTransitioning ? "opacity-0" : "opacity-100 transition-opacity duration-300 flex-1 flex flex-col"}>
            {children}
          </div>
        </div>
      </div>

      {/* Footer Status Bar with Live GET /health polling status checks */}
      <footer className="h-8 border-t border-primary/10 bg-[#0E1525] px-4 flex items-center justify-between z-30 font-mono text-[9px] text-gray-500 select-none">
        <div className="flex items-center space-x-6">
          <span className="tracking-widest uppercase">COCKPIT STATUS: ONLINE</span>
          
          <div className="flex items-center space-x-2">
            <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === "online" ? "bg-success" : "bg-danger"}`}></span>
            <span>API backend: {backendStatus === "online" ? "🟢 Online" : "🔴 Offline"}</span>
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
