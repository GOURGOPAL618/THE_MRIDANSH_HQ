// Universal TypeScript declarations for THE MRIDANSH HQ

export interface Commander {
  id: string;
  username: string;
  email: string;
  role: "commander";
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  commanderId: string;
  loginTime: string;
  logoutTime?: string;
  ipAddress: string;
  browser: string;
  device: string;
  status: "active" | "terminated" | "expired";
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  description: string;
  severity: "info" | "warning" | "error" | "security" | "mission";
}

export interface ResearchItem {
  id: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DatasetItem {
  id: string;
  datasetName: string;
  category: string;
  source: string;
  description: string;
  location: string;
  createdAt: string;
}

export interface ExperimentItem {
  id: string;
  title: string;
  objective: string;
  status: "draft" | "active" | "completed" | "failed";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngineTelemetry {
  timestamp: string;
  engineState: "shutdown" | "igniting" | "nominal" | "overheating" | "emergency_stop";
  thrustLevel: number; // 0 to 100%
  temperature: number; // core temperature in Kelvin
  diagnostics: {
    coolantPressure: number;
    fuelFlow: number;
    magneticLock: boolean;
  };
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  event: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  details: string;
}

export interface UserSettings {
  theme: "default" | "arctic" | "midnight" | "deepspace";
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  notificationsEnabled: boolean;
  performanceMode: "quality" | "performance";
}
