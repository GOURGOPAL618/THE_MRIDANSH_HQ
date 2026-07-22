"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";

interface LogItem {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  description: string;
  severity: string;
}

interface PaginationMetadata {
  total: number;
  limit: number;
  skip: number;
  has_more: boolean;
}

interface FilterStats {
  total_records: number;
  warning_count: number;
  error_count: number;
  security_count: number;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function MissionLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    limit: 100,
    skip: 0,
    has_more: false
  });
  const [stats, setStats] = useState<FilterStats>({
    total_records: 0,
    warning_count: 0,
    error_count: 0,
    security_count: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [limit] = useState(100);
  const [skip, setSkip] = useState(0);

  // Custom log creation form
  const [isCreating, setIsCreating] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formModule, setFormModule] = useState("system");
  const [formSeverity, setFormSeverity] = useState("info");
  const [formAction, setFormAction] = useState("manual_override");
  const [isSaving, setIsSaving] = useState(false);

  // Polling settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all logs from API
  const fetchLogs = async (isPoll = false) => {
    if (!isPoll) setIsLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        skip: String(skip)
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedModule !== "ALL") params.module = selectedModule;
      if (selectedSeverity !== "ALL") params.severity = selectedSeverity;

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/v1/logs${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ApiResponseEnvelope<{
        items: LogItem[];
        pagination: PaginationMetadata;
        stats: FilterStats;
      }>>(url);
      if (response.data && response.data.success) {
        const data = response.data.data;
        setLogs(data.items);
        setPagination(data.pagination);
        setStats(data.stats);
        setErrorMsg(null);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize operational logs from database.");
    } finally {
      if (!isPoll) setIsLoading(false);
    }
  };

  // Sync log listings on filter changes
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedModule, selectedSeverity, limit, skip]);

  // Setup AbortController polling loop
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    if (autoRefresh) {
      pollTimerRef.current = setInterval(() => {
        // Page visibility checks: only poll if tab is active
        if (document.visibilityState === "visible") {
          fetchLogs(true);
        }
      }, 5000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, searchQuery, selectedModule, selectedSeverity, limit, skip]);

  // Save manual log note
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setErrorMsg("Log description cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const payload = {
      module: formModule.trim(),
      action: formAction.trim(),
      description: formDescription.trim(),
      severity: formSeverity.trim()
    };

    try {
      const response = await api.post<ApiResponseEnvelope<LogItem>>("/api/v1/logs", payload);
      if (response.data && response.data.success) {
        setInfoMsg("Manual audit log note successfully appended.");
        setFormDescription("");
        setIsCreating(false);
        await fetchLogs();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to post custom log note to audit feed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Exports currently filtered logs list as JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(logs, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `mridansh_hq_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Exports currently filtered logs list as CSV
  const handleExportCSV = () => {
    const csvRows = [
      ["Timestamp", "Module", "Action", "Severity", "Description"],
      ...logs.map((log) => [
        log.timestamp,
        log.module,
        log.action,
        log.severity,
        log.description.replace(/"/g, '""')
      ])
    ];

    const csvContent = `data:text/csv;charset=utf-8,${csvRows
      .map((e) => e.map((val) => `"${val}"`).join(","))
      .join("\n")}`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `mridansh_hq_logs_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Pagination navigation
  const handlePrevPage = () => {
    if (skip >= limit) {
      setSkip(skip - limit);
    }
  };

  const handleNextPage = () => {
    if (pagination.has_more) {
      setSkip(skip + limit);
    }
  };

  // Helper colors for severities
  const getSeverityStyle = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "warning":
        return "text-[#EAB308] border-[#EAB308]/20 bg-[#EAB308]/5";
      case "error":
        return "text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/5";
      case "security":
        return "text-[#D946EF] border-[#D946EF]/20 bg-[#D946EF]/5";
      case "mission":
        return "text-[#10B981] border-[#10B981]/20 bg-[#10B981]/5";
      default:
        return "text-[#00FFFF] border-[#00FFFF]/20 bg-[#00FFFF]/5";
    }
  };

  const modulesList = ["ALL", "auth", "engine", "radar", "earth", "research", "datasets", "experiments", "system", "logs"];
  const severitiesList = ["ALL", "info", "warning", "error", "security", "mission"];

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">filtered logs total</span>
            <span className="text-2xl font-bold text-gray-300">{stats.total_records} RECORDS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">warning logs count</span>
            <span className="text-2xl font-bold text-[#EAB308] text-glow">{stats.warning_count} WARNINGS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">critical error logs</span>
            <span className="text-2xl font-bold text-[#EF4444] text-glow-danger">{stats.error_count} ERRORS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">security alarms log</span>
            <span className="text-2xl font-bold text-[#D946EF] text-glow">{stats.security_count} SECURITY</span>
          </div>
        </div>

        {/* TERMINAL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: FILTERS AND SETTINGS (3 cols) */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <Panel title="VAULT AUDIT CONFIG">
              <div className="space-y-4">
                
                {/* Keyword Search */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Search Description</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs description..."
                    className="w-full bg-black border border-primary/20 hover:border-primary/40 focus:border-primary text-gray-300 text-xs px-2 py-1.5 rounded outline-none focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] transition"
                  />
                </div>

                {/* Module dropdown */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Select module</label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                  >
                    {modulesList.map((mod) => (
                      <option key={mod} value={mod}>{mod.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Severity dropdown */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Severity level</label>
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                  >
                    {severitiesList.map((sev) => (
                      <option key={sev} value={sev}>{sev.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Auto Refresh checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="accent-primary h-3.5 w-3.5 bg-black border-primary/20 rounded cursor-pointer"
                  />
                  <label htmlFor="autoRefresh" className="text-[10px] text-gray-400 uppercase cursor-pointer select-none">
                    AUTO REFRESH (5S)
                  </label>
                </div>

                {/* Data Export Button toolbar */}
                <div className="border-t border-primary/10 pt-4 flex space-x-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 py-1.5 bg-black border border-primary/40 text-primary text-[10px] font-bold uppercase rounded hover:bg-primary hover:text-black transition"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex-1 py-1.5 bg-black border border-primary/40 text-primary text-[10px] font-bold uppercase rounded hover:bg-primary hover:text-black transition"
                  >
                    Export JSON
                  </button>
                </div>

                {/* Register Custom Log Entry [+] */}
                <div className="border-t border-primary/10 pt-3">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full py-2 bg-black border border-primary text-primary font-bold uppercase rounded hover:bg-primary hover:text-black active:scale-95 transition text-xs shadow-[0_0_10px_rgba(0,255,255,0.05)]"
                  >
                    [+] POST MANUAL NOTE
                  </button>
                </div>

              </div>
            </Panel>
          </div>

          {/* CENTER PANEL: MONOSPACE TERMINAL CONSOLE LIST (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <Panel title="LIVE AUDIT STREAM CONSOLE">
              
              {/* Error/info messages */}
              {errorMsg && (
                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded uppercase mb-3">
                  ERROR: {errorMsg}
                </div>
              )}
              {infoMsg && (
                <div className="text-[10px] text-success bg-success/5 border border-success/30 p-2 rounded uppercase mb-3">
                  INFO: {infoMsg}
                </div>
              )}

              {/* Terminal window container */}
              <div className="bg-black/90 border border-primary/15 rounded p-3 h-[450px] overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 selection:bg-primary selection:text-black scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                
                {isLoading && logs.length === 0 ? (
                  <div className="text-center text-primary animate-pulse py-20 uppercase tracking-widest text-xs">
                    ESTABLISHING CONNECTION TO AUDIT FEED...
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-20 text-gray-600 italic">
                    NO LOG ENTRIES MATCHING ACTIVE FILTERS DETECTED.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-1.5 rounded cursor-pointer transition border border-transparent select-none ${
                        selectedLog?.id === log.id
                          ? "bg-primary/5 border-primary/30 text-white"
                          : "hover:bg-primary/5 hover:border-primary/10 text-gray-400"
                      }`}
                    >
                      <span className="text-gray-600 mr-1.5">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className="text-gray-500 uppercase font-bold mr-1.5">
                        [{log.module}]
                      </span>
                      <span className={`text-[9px] uppercase border px-1 rounded font-bold mr-2 inline-block shrink-0 ${getSeverityStyle(log.severity)}`}>
                        {log.severity}
                      </span>
                      <span className="break-all">{log.description}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination toolbar */}
              <div className="flex justify-between items-center border-t border-primary/10 pt-3 mt-3 text-[11px]">
                <button
                  onClick={handlePrevPage}
                  disabled={skip === 0}
                  className="px-3 py-1 bg-black border border-primary/20 hover:border-primary text-primary disabled:border-gray-800 disabled:text-gray-600 font-bold uppercase rounded transition text-[10px]"
                >
                  ◄ Previous Page
                </button>
                <span className="text-gray-500 uppercase text-[10px]">
                  PAGE: {Math.floor(skip / limit) + 1} ({skip + 1} - {Math.min(skip + limit, pagination.total)} of {pagination.total})
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.has_more}
                  className="px-3 py-1 bg-black border border-primary/20 hover:border-primary text-primary disabled:border-gray-800 disabled:text-gray-600 font-bold uppercase rounded transition text-[10px]"
                >
                  Next Page ►
                </button>
              </div>

            </Panel>
          </div>

          {/* RIGHT PANEL: INSPECTOR & LOG CREATOR (4 cols) */}
          <div className="lg:col-span-4">
            <Panel title="AUDIT DETAIL INSPECTOR">
              
              {isCreating ? (
                // Add manual note log form
                <form onSubmit={handleSaveLog} className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-primary/15 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      POST MANUAL SYSTEM AUDIT
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2 py-0.5 border border-gray-700 hover:border-gray-500 rounded text-gray-400 font-bold uppercase transition text-[9px]"
                    >
                      [x] Close
                    </button>
                  </div>

                  {/* Module select */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Module Category</label>
                    <select
                      value={formModule}
                      onChange={(e) => setFormModule(e.target.value)}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                    >
                      {modulesList.filter(m => m !== "ALL").map((mod) => (
                        <option key={mod} value={mod}>{mod.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Action / Event key</label>
                    <input
                      type="text"
                      value={formAction}
                      onChange={(e) => setFormAction(e.target.value)}
                      placeholder="e.g. manual_override"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                  </div>

                  {/* Severity select */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Severity Level</label>
                    <select
                      value={formSeverity}
                      onChange={(e) => setFormSeverity(e.target.value)}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                    >
                      {severitiesList.filter(s => s !== "ALL").map((sev) => (
                        <option key={sev} value={sev}>{sev.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Log details description</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Enter custom observation notes..."
                      rows={6}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 bg-success text-black font-bold uppercase rounded hover:bg-success/90 transition active:scale-95 text-xs text-glow shadow-[0_0_8px_#10B981]"
                  >
                    [✓] COMMIT AUDIT RECORD
                  </button>

                </form>
              ) : selectedLog ? (
                
                // Detailed metadata inspect view
                <div className="space-y-4 text-xs font-mono">
                  <div className="border-b border-primary/10 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">LOG RECORD INSPECTOR</span>
                  </div>

                  <div className="bg-black/30 border border-primary/5 p-3 rounded space-y-3 leading-relaxed">
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Execution Timestamp:</span>
                      <span className="text-gray-200 font-bold">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Log Record UUID:</span>
                      <span className="text-gray-300 select-all font-mono break-all text-[11px]">{selectedLog.id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/5">
                      <div>
                        <span className="text-gray-500 uppercase text-[9px] block">Module:</span>
                        <span className="text-primary font-bold uppercase">{selectedLog.module}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase text-[9px] block">Action:</span>
                        <span className="text-gray-300 font-bold">{selectedLog.action}</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Description */}
                  <div className="space-y-2">
                    <span className="text-gray-500 uppercase text-[9px] block">Details Description:</span>
                    <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap p-3 border-l border-primary/20 bg-black/10">
                      {selectedLog.description}
                    </div>
                  </div>

                  {/* Severity Badge Display */}
                  <div className="border-t border-primary/10 pt-3">
                    <span className="text-gray-500 uppercase text-[9px] block mb-1.5">Severity Class:</span>
                    <span className={`text-[10px] uppercase border px-2 py-0.5 rounded font-bold text-glow inline-block ${getSeverityStyle(selectedLog.severity)}`}>
                      {selectedLog.severity.toUpperCase()}
                    </span>
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                  Select a log row from the live console feed to inspect details and system coordinates, or click [+] to register a manual note.
                </div>
              )}

            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
