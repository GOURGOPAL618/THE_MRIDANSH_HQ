"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  title?: string;
  loadingLogs?: string[];
  durationMs?: number;
  onComplete?: () => void;
}

export function LoadingScreen({
  title = "INITIALIZING CORE DATA SYSTEMS",
  loadingLogs = [
    "Establishing quantum secure handshakes...",
    "Caching cockpit dashboard configurations...",
    "Syncing telemetry channels...",
    "Ready for user input authorization.",
  ],
  durationMs = 2500,
  onComplete,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);

  useEffect(() => {
    // Progress increment timer
    const incrementInterval = durationMs / 100;
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 1;
      });
    }, incrementInterval);

    // Logs sequence timer
    const logPushInterval = durationMs / loadingLogs.length;
    let logIndex = 0;
    const logTimer = setInterval(() => {
      if (logIndex < loadingLogs.length) {
        setVisibleLogs((prev) => [...prev, loadingLogs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(logTimer);
      }
    }, logPushInterval);

    return () => {
      clearInterval(progressTimer);
      clearInterval(logTimer);
    };
  }, [loadingLogs, durationMs]);

  useEffect(() => {
    if (progress === 100) {
      const delay = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [progress, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#05070B] flex flex-col items-center justify-center p-6 select-none font-mono">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0E1525_1px,transparent_1px),linear-gradient(to_bottom,#0E1525_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>

      <div className="w-full max-w-xl p-6 bg-[#0E1525]/90 border border-primary/20 rounded shadow-glow flex flex-col relative">
        {/* Title */}
        <h3 className="text-center font-bold tracking-widest text-glow text-white text-sm mb-6 uppercase">
          {title}
        </h3>

        {/* Pulsing visual core */}
        <div className="flex justify-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-16 h-16 rounded-full border-2 border-dashed border-primary flex items-center justify-center relative shadow-cyan-glow"
          >
            <div className="w-8 h-8 rounded-full bg-primary animate-ping opacity-25"></div>
            <div className="w-4 h-4 rounded-full bg-secondary shadow-[0_0_8px_#00FFFF]"></div>
          </motion.div>
        </div>

        {/* Live log diagnostics */}
        <div className="h-32 bg-black/60 rounded p-4 border border-[#05070B] overflow-y-auto mb-6 text-[10px] text-gray-400 space-y-1">
          {visibleLogs.map((log, index) => (
            <div key={index} className="flex items-start">
              <span className="text-primary mr-2 font-bold">&gt;&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>

        {/* Telemetry Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold">
            <span>UPLINK TELEMETRY LOAD</span>
            <span className="text-[#00FFFF]">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-primary/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
