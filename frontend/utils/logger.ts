// Central Logger Service for THE MRIDANSH HQ
// Prints styled console logs and maintains a local cache of logs for audit views.

export type LogLevel = "info" | "warning" | "error" | "security" | "mission";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  module: string;
  details?: any;
}

// Local cache for in-session logs
const logsCache: LogEntry[] = [];
const MAX_CACHE_SIZE = 500;

function createLogEntry(level: LogLevel, message: string, module?: string, details?: any): LogEntry {
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    module: module || "SYSTEM",
    details,
  };

  // Maintain cache size
  logsCache.push(entry);
  if (logsCache.length > MAX_CACHE_SIZE) {
    logsCache.shift();
  }

  return entry;
}

// Browser console styling parameters
const styles = {
  prefix: "font-family: monospace; font-weight: bold; padding: 2px 4px; border-radius: 2px;",
  info: "background-color: #0072FF; color: white;",
  warning: "background-color: #F59E0B; color: black;",
  error: "background-color: #EF4444; color: white; font-weight: bold;",
  security: "background-color: #7C3AED; color: white;",
  mission: "background-color: #00FFFF; color: black;",
  text: "color: inherit; font-family: monospace;",
};

function printConsoleLog(entry: LogEntry) {
  if (typeof window === "undefined") return;

  const timestampStr = new Date(entry.timestamp).toLocaleTimeString();
  const moduleStr = `[${entry.module.toUpperCase()}]`;
  let levelStyle = styles.info;

  if (entry.level === "warning") levelStyle = styles.warning;
  else if (entry.level === "error") levelStyle = styles.error;
  else if (entry.level === "security") levelStyle = styles.security;
  else if (entry.level === "mission") levelStyle = styles.mission;

  console.log(
    `%c${entry.level.toUpperCase()}%c %c${timestampStr}%c %c${moduleStr}%c ${entry.message}`,
    `${styles.prefix} ${levelStyle}`,
    "",
    "color: #888; font-size: 10px;",
    "",
    "color: #00FFFF; font-weight: bold;",
    "",
    entry.details ? "\nDetails:" : "",
    entry.details || ""
  );
}

export function logInfo(message: string, module?: string, details?: any): LogEntry {
  const entry = createLogEntry("info", message, module, details);
  printConsoleLog(entry);
  return entry;
}

export function logWarning(message: string, module?: string, details?: any): LogEntry {
  const entry = createLogEntry("warning", message, module, details);
  printConsoleLog(entry);
  return entry;
}

export function logError(message: string, module?: string, details?: any): LogEntry {
  const entry = createLogEntry("error", message, module, details);
  printConsoleLog(entry);
  return entry;
}

export function logSecurity(message: string, module?: string, details?: any): LogEntry {
  const entry = createLogEntry("security", message, module, details);
  printConsoleLog(entry);
  return entry;
}

export function logMission(message: string, module?: string, details?: any): LogEntry {
  const entry = createLogEntry("mission", message, module, details);
  printConsoleLog(entry);
  return entry;
}

export function getLocalLogs(): LogEntry[] {
  return [...logsCache];
}

export const logger = {
  info: logInfo,
  warn: logWarning,
  error: logError,
  security: logSecurity,
  mission: logMission,
  cache: getLocalLogs,
};

export default logger;
