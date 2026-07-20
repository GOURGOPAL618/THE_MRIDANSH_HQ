import { useNotificationContext } from "../contexts/NotificationContext";

export function useNotification() {
  const { showNotification } = useNotificationContext();

  const success = (message: string, title?: string, duration?: number) => {
    showNotification("success", message, title, duration);
  };

  const warning = (message: string, title?: string, duration?: number) => {
    showNotification("warning", message, title, duration);
  };

  const error = (message: string, title?: string, duration?: number) => {
    showNotification("error", message, title, duration);
  };

  const info = (message: string, title?: string, duration?: number) => {
    showNotification("info", message, title, duration);
  };

  return {
    notifySuccess: success,
    notifyWarning: warning,
    notifyError: error,
    notifyInfo: info,
  };
}
