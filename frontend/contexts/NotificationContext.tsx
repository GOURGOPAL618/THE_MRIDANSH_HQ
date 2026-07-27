"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { ToastContainer } from "../components/Toast";

export type NotificationType = "success" | "warning" | "error" | "info";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  showNotification: (
    type: NotificationType,
    message: string,
    title?: string,
    duration?: number
  ) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, message: string, title?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const item: NotificationItem = { id, type, title, message, duration };
      
      setNotifications((prev) => [...prev, item]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  React.useEffect(() => {
    const handleGlobalNotification = (e: Event) => {
      const customEvent = e as CustomEvent<{
        type: NotificationType;
        message: string;
        title?: string;
        duration?: number;
      }>;
      if (customEvent.detail) {
        const { type, message, title, duration } = customEvent.detail;
        showNotification(type, message, title, duration);
      }
    };
    window.addEventListener("app-notification", handleGlobalNotification);
    return () => {
      window.removeEventListener("app-notification", handleGlobalNotification);
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, showNotification, removeNotification }}
    >
      {children}
      <ToastContainer />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
}
