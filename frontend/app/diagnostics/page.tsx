"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/services/api";
import { useNotification } from "@/hooks/useNotification";
import { Panel } from "@/components/Panel";
import { StatusBadge } from "@/components/StatusBadge";
import { formatBytes } from "@/utils/formatters";
import { StatusType } from "@/components/StatusBadge";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface RuntimeMetrics {
  pid: number;
  platform: string;
  python_version: string;
  active_threads: number;
  cpu_utilization_percent: number | string;
  memory_usage_mb: number | string;
}

interface DatabaseMetrics {
  status: string;
  type: string;
  query_latency_ms: number;
  file_size_mb: number | string;
}

interface StorageMetrics {
  status: string;
  total_bytes: number;
  available_bytes: number;
  used_percent: number;
}

interface ProviderStatus {
  status: string;
  configured: boolean;
  latency_ms: string | number;
  rate_limit: {
    remaining: number;
    limit: number;
  };
}

interface ApiConnectivity {
  nasa: ProviderStatus;
  weather: ProviderStatus;
  ai: ProviderStatus;
  github: ProviderStatus;
}

interface ApplicationMetrics {
  active_api_requests: number;
  error_logs_count: number;
  last_health_check_timestamp: number;
}

interface SecurityMetrics {
  session_status: string;
  critical_security_events: number;
  failed_authentications_count: number;
}

interface ReadinessData {
  liveness: string;
  uptime: number;
  runtime: RuntimeMetrics;
  database: DatabaseMetrics;
  storage: StorageMetrics;
  api_connectivity: ApiConnectivity;
  application: ApplicationMetrics;
  security: SecurityMetrics;
}

export default function DiagnosticsPage() {
  const { notifyError } = useNotification();
  const [data, setData] = useState<ReadinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  const pollingTimer = useRef<NodeJS.Timeout | null>(null);
  const activeController = useRef<AbortController | null>(null);

  const fetchDiagnostics = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    // Abort active fetches to prevent overlapping request loops
    if (activeController.current) {
      activeController.current.abort();
    }
    
    const controller = new AbortController();
    activeController.current = controller;

    try {
      setIsLive(true);
      const response = await api.get<{ data: ReadinessData }>(
        "/api/v1/system/health/readiness",
        undefined,
        { signal: controller.signal }
      );
      
      if (response.error) {
        if (controller.signal.aborted) return;
        notifyError(response.error);
      } else if (response.data && response.data.data) {
        setData(response.data.data);
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString());
      }
    } catch {
      if (controller.signal.aborted) return;
      notifyError("Connection failed to fetch system observability metrics.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsLive(false);
      }
    }
  }, [notifyError]);

  // Handle Visibility Aware polling cycles
  useEffect(() => {
    fetchDiagnostics();

    const startPolling = () => {
      pollingTimer.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchDiagnostics(true);
        }
      }, 5000);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchDiagnostics(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollingTimer.current) clearInterval(pollingTimer.current);
      if (activeController.current) activeController.current.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchDiagnostics]);

  const getStatusColor = (status: string): StatusType => {
    const s = status.toLowerCase();
    if (s === "operational" || s === "connected" || s === "live" || s === "authenticated") return "healthy";
    if (s === "degraded" || s === "standby" || s === "warning") return "warning";
    if (s === "critical" || s === "offline" || s === "error") return "critical";
    return "offline";
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-xs tracking-widest text-primary/75 uppercase animate-pulse">Syncing Telemetry Fields...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Observability Header Panel */}
      <Panel className="border border-primary/20 bg-background/50 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-wider text-white uppercase">Mission Systems Observability Center</h1>
            <p className="text-xs text-primary-glow mt-1">Real-time diagnostics and physical containment parameters telemetry</p>
          </div>
          <div className="flex items-center gap-3">
            {isLive ? (
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-mono">LIVE TELEMETRY</span>
              </div>
            ) : (
              <span className="text-[10px] uppercase tracking-widest text-primary-glow font-mono">STANDBY</span>
            )}
            <div className="text-xs font-mono bg-background/70 border border-primary/10 rounded px-2.5 py-1 text-primary-glow">
              Uptime: {data ? formatUptime(data.uptime) : "00:00:00"}
            </div>
            <div className="text-xs font-mono bg-background/70 border border-primary/10 rounded px-2.5 py-1 text-primary-glow">
              Updated: {lastUpdated}
            </div>
          </div>
        </div>
      </Panel>

      {/* Primary Observability Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Runtime & Process Diagnostics */}
        <Panel title="Process & Runtime Environment" className="border border-primary/25 bg-background/40">
          <div className="space-y-4 font-mono text-xs text-primary-glow">
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-white">Process Status:</span>
              <StatusBadge status={getStatusColor(data?.liveness || "offline")} label={(data?.liveness || "OFFLINE").toUpperCase()} />
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Process ID (PID):</span>
              <span className="text-white">{data?.runtime.pid || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Operating System:</span>
              <span className="text-white uppercase">{data?.runtime.platform || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Python Runtime:</span>
              <span className="text-white">{data?.runtime.python_version || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Active Threads Count:</span>
              <span className="text-white">{data?.runtime.active_threads || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>CPU Utilization:</span>
              <span className="text-white">
                {data?.runtime.cpu_utilization_percent !== "N/A" ? `${data?.runtime.cpu_utilization_percent}%` : "N/A"}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span>Memory Footprint:</span>
              <span className="text-white">
                {data?.runtime.memory_usage_mb !== "N/A" ? `${data?.runtime.memory_usage_mb} MB` : "N/A"}
              </span>
            </div>
          </div>
        </Panel>

        {/* Database & Queries Telemetry */}
        <Panel title="Database Engine Telemetry" className="border border-primary/25 bg-background/40">
          <div className="space-y-4 font-mono text-xs text-primary-glow">
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-white">Connection Status:</span>
              <StatusBadge status={getStatusColor(data?.database.status || "offline")} label={(data?.database.status || "OFFLINE").toUpperCase()} />
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Engine Dialect:</span>
              <span className="text-white uppercase">{data?.database.type || "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Query Latency:</span>
              <span className="text-white">{data?.database.query_latency_ms !== undefined ? `${data.database.query_latency_ms} ms` : "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Database File Size:</span>
              <span className="text-white">
                {data?.database.file_size_mb !== "N/A" ? `${data?.database.file_size_mb} MB` : "N/A"}
              </span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-[10px] mb-1">
                <span>Database Latency Threshold:</span>
                <span>{data?.database.query_latency_ms || 0} / 100 ms</span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-primary/10">
                <div 
                  className={`h-full transition-all duration-500 ${data?.database.query_latency_ms && data.database.query_latency_ms > 50 ? 'bg-red-500' : 'bg-primary'}`} 
                  style={{ width: `${Math.min(100, ((data?.database.query_latency_ms || 0) / 100) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Panel>

        {/* Filesystem Storage Telemetry */}
        <Panel title="Storage & Partition Capacity" className="border border-primary/25 bg-background/40">
          <div className="space-y-4 font-mono text-xs text-primary-glow">
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-white">Read/Write Health:</span>
              <StatusBadge status={getStatusColor(data?.storage.status || "offline")} label={(data?.storage.status || "OFFLINE").toUpperCase()} />
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Total Allocated Space:</span>
              <span className="text-white">{data?.storage.total_bytes ? formatBytes(data.storage.total_bytes) : "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Available Disk Space:</span>
              <span className="text-white">{data?.storage.available_bytes ? formatBytes(data.storage.available_bytes) : "N/A"}</span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Disk Usage Percent:</span>
              <span className="text-white">{data?.storage.used_percent !== undefined ? `${data.storage.used_percent}%` : "N/A"}</span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-[10px] mb-1">
                <span>Storage Space Utilized:</span>
                <span>{data?.storage.used_percent || 0}%</span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-primary/10">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${data?.storage.used_percent || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Panel>

      </div>

      {/* Secondary Integrations & Security Telemetries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Third Party Integrations Rate Limits */}
        <Panel title="Third-Party API Integrations status" className="border border-primary/25 bg-background/40">
          <div className="space-y-4 font-mono text-xs text-primary-glow">
            {data && Object.entries(data.api_connectivity).map(([provider, details]) => (
              <div key={provider} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 rounded bg-background/40 border border-primary/10 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-white uppercase font-bold">{provider}</span>
                  <span className="text-[10px] text-primary/75">({details.configured ? "Key Configured" : "No Key"})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-primary/50">
                    Limits: {details.rate_limit.remaining} / {details.rate_limit.limit}
                  </span>
                  <StatusBadge status={getStatusColor(details.status)} label={details.status.toUpperCase()} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Security & Operational Log Statistics */}
        <Panel title="Security Logs & System Error Audits" className="border border-primary/25 bg-background/40">
          <div className="space-y-4 font-mono text-xs text-primary-glow">
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span className="text-white">Command Session:</span>
              <StatusBadge status={getStatusColor(data?.security.session_status || "offline")} label={(data?.security.session_status || "UNAUTHORIZED").toUpperCase()} />
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Recent Critical Security Alerts:</span>
              <span className={`font-bold ${data?.security.critical_security_events && data.security.critical_security_events > 0 ? 'text-red-500' : 'text-white'}`}>
                {data?.security.critical_security_events || 0}
              </span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Recent Failed Logins:</span>
              <span className={`font-bold ${data?.security.failed_authentications_count && data.security.failed_authentications_count > 0 ? 'text-red-500' : 'text-white'}`}>
                {data?.security.failed_authentications_count || 0}
              </span>
            </div>
            <div className="flex justify-between border-b border-primary/10 pb-2">
              <span>Operational Logging Errors Count:</span>
              <span className={`font-bold ${data?.application.error_logs_count && data.application.error_logs_count > 0 ? 'text-red-500' : 'text-white'}`}>
                {data?.application.error_logs_count || 0}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span>Last Diagnostics Run:</span>
              <span className="text-white">
                {data?.application.last_health_check_timestamp ? new Date(data.application.last_health_check_timestamp * 1000).toLocaleTimeString() : "N/A"}
              </span>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
