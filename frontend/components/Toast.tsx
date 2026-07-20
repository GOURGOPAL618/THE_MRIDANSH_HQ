"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationContext, NotificationItem } from "../contexts/NotificationContext";

export function ToastContainer() {
  const { notifications } = useNotificationContext();

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col space-y-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((item) => (
          <ToastItem key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ item }: { item: NotificationItem }) {
  const { removeNotification } = useNotificationContext();

  const config = {
    success: {
      color: "border-[#10B981] bg-[#10B981]/10 text-[#10B981]",
      shadow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      defaultTitle: "SUCCESS",
    },
    warning: {
      color: "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]",
      shadow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      defaultTitle: "WARNING",
    },
    error: {
      color: "border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]",
      shadow: "shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      defaultTitle: "SYSTEM ERROR",
    },
    info: {
      color: "border-[#00FFFF] bg-[#00FFFF]/10 text-[#00FFFF]",
      shadow: "shadow-[0_0_15px_rgba(0,255,255,0.3)]",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      defaultTitle: "SYSTEM LOG",
    },
  };

  const current = config[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`pointer-events-auto border flex p-4 rounded backdrop-blur-md font-mono text-xs items-start justify-between relative overflow-hidden ${current.color} ${current.shadow}`}
    >
      {/* Visual background indicator stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.type === "success" ? "bg-[#10B981]" : item.type === "warning" ? "bg-[#F59E0B]" : item.type === "error" ? "bg-[#EF4444]" : "bg-[#00FFFF]"}`}></div>

      <div className="flex items-start space-x-3 ml-1">
        <div className="mt-0.5">{current.icon}</div>
        <div className="flex flex-col space-y-1">
          <span className="font-bold tracking-wider text-white">
            {item.title || current.defaultTitle}
          </span>
          <span className="text-gray-300 leading-normal">{item.message}</span>
        </div>
      </div>

      <button
        onClick={() => removeNotification(item.id)}
        className="text-gray-400 hover:text-white transition-colors ml-4 focus:outline-none"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}
