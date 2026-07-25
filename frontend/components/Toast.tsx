"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { useNotificationContext, NotificationItem } from "../contexts/NotificationContext";
import UIToast from "./ui/Toast";

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

  return (
    <UIToast
      title={item.title}
      message={item.message}
      type={item.type as "success" | "warning" | "error" | "info"}
      onClose={() => removeNotification(item.id)}
    />
  );
}
