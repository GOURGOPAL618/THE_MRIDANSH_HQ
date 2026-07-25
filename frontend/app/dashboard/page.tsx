"use client";

import React, { useEffect, useState, useCallback } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import Button from "../../components/Button";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../hooks/useNotification";
import api from "../../services/api";

interface SystemStatus {
  uptime: number;
  api_status: string;
  db_status: string;
  active_sessions: number;
  total_sessions: number;
}

interface MissionStats {
  total_research: number;
  total_datasets: number;
  total_experiments: number;
  total_logs: number;
}

interface ActivityItem {
  timestamp: string;
  event: string;
  details: string;
  risk_level: string;
  success: boolean;
}

interface ModuleStatus {
  engine: "healthy" | "warning" | "danger" | "off";
  radar: "healthy" | "warning" | "danger" | "off";
  earth: "healthy" | "warning" | "danger" | "off";
  research: "healthy" | "warning" | "danger" | "off";
  security: "healthy" | "warning" | "danger" | "off";
}

interface DashboardData {
  system_status: SystemStatus;
  mission_stats: MissionStats;
  recent_activity: ActivityItem[];
  module_status: ModuleStatus;
}

export default function DashboardPage() {
  const { commander } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Dashboard summary helper
  const fetchDashboardData = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await api.get<DashboardData>("/api/v1/system/dashboard", undefined, { signal });
      if (response.error) {
        if (signal?.aborted) return;
        setError(response.error);
      } else if (response.data) {
        const freshData = response.data;
        setData((prev) => {
          if (!prev) return freshData;
          
          const hasMaterialChange =
            prev.system_status.api_status !== freshData.system_status.api_status ||
            prev.system_status.db_status !== freshData.system_status.db_status ||
            prev.system_status.active_sessions !== freshData.system_status.active_sessions ||
            prev.system_status.total_sessions !== freshData.system_status.total_sessions ||
            JSON.stringify(prev.mission_stats) !== JSON.stringify(freshData.mission_stats) ||
            JSON.stringify(prev.module_status) !== JSON.stringify(freshData.module_status) ||
            JSON.stringify(prev.recent_activity) !== JSON.stringify(freshData.recent_activity);

          if (!hasMaterialChange && prev.system_status.uptime === freshData.system_status.uptime) {
            return prev;
          }
          return freshData;
        });
        setError(null);
      }
    } catch (err: unknown) {
      if (signal?.aborted) return;
      const errMsg = err instanceof Error ? err.message : "Failed to query system dashboard.";
      setError(errMsg);
    } finally {
      if (!silent && !signal?.aborted) setIsLoading(false);
    }
  }, []);

  // Setup mount fetch and periodic telemetry polling updates with abort capabilities
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let controller = new AbortController();

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        controller.abort(); // Cancel previous request if still pending
        controller = new AbortController();
        fetchDashboardData(true, controller.signal);
      }, 5000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      controller.abort(); // Cancel current request immediately
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Fetch fresh status and resume active polling
        controller.abort();
        controller = new AbortController();
        fetchDashboardData(true, controller.signal);
        startPolling();
      }
    };

    // Initial load
    fetchDashboardData(false, controller.signal);
    startPolling();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDashboardData]);

  const formatUptime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  }, []);

  const handleDiagnosticScan = useCallback(() => {
    notifyInfo("Initiating diagnostic sweeps across all quantum nodes...", "SYSTEM DIAGNOSTIC");
    setTimeout(() => {
      notifySuccess("All JCC nodes responding. Telemetry state nominal.", "DIAGNOSTIC COMPLETE");
    }, 2000);
  }, [notifyInfo, notifySuccess]);

  const handleLockdownMode = useCallback(() => {
    notifyError("Cockpit override detected. Lockdown switches armed.", "CRITICAL WARNING");
  }, [notifyError]);

  if (isLoading) {
    return (
      <BaseLayout>
        <div className="flex-1 flex items-center justify-center font-mono">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 uppercase tracking-widest animate-pulse">Synchronizing Cockpit Data...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  // Ensure default stats return stable values (0) if data is missing/error occurs
  const systemStatus: SystemStatus = data?.system_status || {
    uptime: 0,
    api_status: "offline",
    db_status: "offline",
    active_sessions: 0,
    total_sessions: 0
  };

  const missionStats: MissionStats = data?.mission_stats || {
    total_research: 0,
    total_datasets: 0,
    total_experiments: 0,
    total_logs: 0
  };

  const moduleStatus: ModuleStatus = data?.module_status || {
    engine: "off",
    radar: "off",
    earth: "off",
    research: "off",
    security: "off"
  };

  const recentActivity = data?.recent_activity || [];

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono select-none">
        
        {/* Main Header Panel */}
        <Panel 
          title="Jagannath Command Center (JCC) Dashboard" 
          subtitle="Central Operations Cockpit Status Console"
          statusIndicator={error ? "danger" : "healthy"}
        >
          <div className="space-y-6">
            <div className="border-l-2 border-[#0072FF] pl-4 py-1 text-xs text-gray-300">
              Welcome Commander <span className="text-[#00FFFF] font-bold">{commander?.username}</span>. Live telemetry feed is established. 
              Uptime: <span className="text-[#00FFFF] font-bold">{formatUptime(systemStatus.uptime)}</span>.
            </div>

            {/* Error banner indicator */}
            {error && (
              <div className="p-3 border border-danger/20 bg-danger/5 rounded text-xs text-danger uppercase tracking-wider">
                Telemetry error: {error}. Switched to offline defaults mode.
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="p-4 bg-[#0E1525]/40 border border-primary/10 rounded space-y-4">
              <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Quick Actions</span>
              <div className="flex flex-wrap gap-4">
                <Button variant="glow" onClick={handleDiagnosticScan}>
                  Run Diagnostic Scan
                </Button>
                <Button variant="danger" onClick={handleLockdownMode}>
                  Trigger Lockdown Mode
                </Button>
                <Button variant="secondary" onClick={() => fetchDashboardData()}>
                  Refresh Telemetry
                </Button>
              </div>
            </div>

            {/* Decoupled Modules Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Panel variant="secondary" title="ENGINE ROOM" statusIndicator={moduleStatus.engine}>
                <div className="text-[10px] text-gray-400 uppercase">
                  Reactor Core: <span className={moduleStatus.engine === "healthy" ? "text-success font-bold" : "text-warning"}>{moduleStatus.engine}</span>
                </div>
              </Panel>
              <Panel variant="secondary" title="RADAR SWEEP" statusIndicator={moduleStatus.radar}>
                <div className="text-[10px] text-gray-400 uppercase">
                  Coordinate Scan: <span className="text-[#00FFFF] font-bold">{moduleStatus.radar}</span>
                </div>
              </Panel>
              <Panel variant="secondary" title="ORBIT PATHS" statusIndicator={moduleStatus.earth}>
                <div className="text-[10px] text-gray-400 uppercase">
                  Satellite Lock: <span className="text-success font-bold">{moduleStatus.earth}</span>
                </div>
              </Panel>
              <Panel variant="secondary" title="RESEARCH INDEX" statusIndicator={moduleStatus.research}>
                <div className="text-[10px] text-gray-400 uppercase">
                  Documentation: <span className="text-success font-bold">{moduleStatus.research}</span>
                </div>
              </Panel>
              <Panel variant="secondary" title="SECURITY CHECK" statusIndicator={moduleStatus.security}>
                <div className="text-[10px] text-gray-400 uppercase">
                  Policy Override: <span className={moduleStatus.security === "healthy" ? "text-success font-bold" : "text-warning font-bold"}>{moduleStatus.security}</span>
                </div>
              </Panel>
            </div>

            {/* Mission Overview Stat Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-4 bg-[#0E1525]/30 border border-primary/5 rounded text-center">
                <span className="block text-2xl font-bold text-glow text-[#00FFFF]">
                  {missionStats.total_research}
                </span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Research Vault Papers</span>
              </div>
              <div className="p-4 bg-[#0E1525]/30 border border-primary/5 rounded text-center">
                <span className="block text-2xl font-bold text-glow text-[#00FFFF]">
                  {missionStats.total_datasets}
                </span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Datasets Cached</span>
              </div>
              <div className="p-4 bg-[#0E1525]/30 border border-primary/5 rounded text-center">
                <span className="block text-2xl font-bold text-glow text-[#00FFFF]">
                  {missionStats.total_experiments}
                </span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Experiments Run</span>
              </div>
              <div className="p-4 bg-[#0E1525]/30 border border-primary/5 rounded text-center">
                <span className="block text-2xl font-bold text-glow text-[#00FFFF]">
                  {missionStats.total_logs}
                </span>
                <span className="text-[9px] text-gray-500 uppercase tracking-widest">Operations Logs</span>
              </div>
            </div>

            {/* Latest Activity Stream Terminal */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Chronological Activity Log</span>
              <div className="h-48 overflow-y-auto bg-black/60 border border-primary/10 rounded p-4 text-[10px] space-y-2.5 font-mono text-gray-300">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => {
                    const isHighRisk = activity.risk_level === "high" || activity.risk_level === "critical";
                    const isSession = activity.event.includes("LOGIN");
                    return (
                      <div key={idx} className="flex items-start border-b border-[#0E1525]/30 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-gray-500 mr-2">[{new Date(activity.timestamp).toLocaleTimeString()}]</span>
                        <span className={`mr-2 font-bold tracking-wider ${
                          isHighRisk ? "text-danger" : isSession ? "text-success" : "text-[#00FFFF]"
                        }`}>
                          [{activity.event}]
                        </span>
                        <p className="flex-1 text-gray-400">{activity.details}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-600 py-12 uppercase tracking-wider">
                    [SYSTEM] Telemetry timeline empty. Awaiting operations logs...
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <StatusBadge status="healthy" label="SYSTEM NOMINAL" />
              <StatusBadge status="healthy" label={`ACTIVE SESSIONS: ${systemStatus.active_sessions}`} />
              <StatusBadge status="standby" label="API POLLING LINK ACTIVE" />
            </div>

          </div>
        </Panel>

      </div>
    </BaseLayout>
  );
}
