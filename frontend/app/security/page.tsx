"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";

interface SecurityEventItem {
  id: string;
  timestamp: string;
  event: string;
  risk_level: string;
  details: string;
}

interface PaginationMetadata {
  total: number;
  limit: number;
  skip: number;
  has_more: boolean;
}

interface FilterStats {
  total_events: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function SecurityCenterPage() {
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEventItem | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    limit: 100,
    skip: 0,
    has_more: false
  });
  const [stats, setStats] = useState<FilterStats>({
    total_events: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [limit] = useState(100);
  const [skip] = useState(0);

  // Manual Dispatch Form
  const [isCreating, setIsCreating] = useState(false);
  const [formEvent, setFormEvent] = useState("");
  const [formRisk, setFormRisk] = useState("low");
  const [formDetails, setFormDetails] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Polling Settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch security threat events
  const fetchSecurityEvents = async (isPoll = false) => {
    if (!isPoll) setIsLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        skip: String(skip)
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedRisk !== "ALL") params.risk_level = selectedRisk.toLowerCase();

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/v1/security${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ApiResponseEnvelope<{
        items: SecurityEventItem[];
        pagination: PaginationMetadata;
        stats: FilterStats;
      }>>(url);

      if (response.data && response.data.success) {
        const data = response.data.data;
        setEvents(data.items);
        setPagination(data.pagination);
        setStats(data.stats);
        setErrorMsg(null);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize Security Center threat feed from database.");
    } finally {
      if (!isPoll) setIsLoading(false);
    }
  };

  // Trigger list reload on filter changes
  useEffect(() => {
    fetchSecurityEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedRisk, skip]);

  // Setup AbortController polling loop
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    if (autoRefresh) {
      pollTimerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchSecurityEvents(true);
        }
      }, 5000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, searchQuery, selectedRisk, skip]);

  // Save manual security event dispatch
  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEvent.trim() || !formDetails.trim()) {
      setErrorMsg("Security event tag and details cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const payload = {
      event: formEvent.trim(),
      risk_level: formRisk.trim(),
      details: formDetails.trim()
    };

    try {
      const response = await api.post<ApiResponseEnvelope<SecurityEventItem>>("/api/v1/security", payload);
      if (response.data && response.data.success) {
        setInfoMsg("Manual threat alert successfully dispatched.");
        setFormEvent("");
        setFormDetails("");
        setIsCreating(false);
        await fetchSecurityEvents();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to dispatch manual threat alert to feed.");
    } finally {
      setIsSaving(false);
    }
  };

  // Exports currently loaded result list to JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(events, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `mridansh_hq_security_events_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Exports currently loaded result list to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ["Timestamp", "Event Tag", "Risk Level", "Description Details"],
      ...events.map((evt) => [
        evt.timestamp,
        evt.event,
        evt.risk_level,
        evt.details.replace(/"/g, '""')
      ])
    ];

    const csvContent = `data:text/csv;charset=utf-8,${csvRows
      .map((e) => e.map((val) => `"${val}"`).join(","))
      .join("\n")}`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `mridansh_hq_security_events_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Get color styles based on risk level
  const getRiskStyle = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "critical":
        return "text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/5 text-glow-danger font-bold";
      case "high":
        return "text-[#F97316] border-[#F97316]/20 bg-[#F97316]/5 font-bold";
      case "medium":
        return "text-[#EAB308] border-[#EAB308]/20 bg-[#EAB308]/5";
      default:
        return "text-[#00FFFF] border-[#00FFFF]/20 bg-[#00FFFF]/5 text-glow";
    }
  };

  const risksList = ["ALL", "critical", "high", "medium", "low"];

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">total threats registered</span>
            <span className="text-2xl font-bold text-gray-300">{stats.total_events} EVENTS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">critical security locks</span>
            <span className="text-2xl font-bold text-[#EF4444] text-glow-danger">{stats.critical_count} CRITICAL</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">high-risk alerts</span>
            <span className="text-2xl font-bold text-[#F97316] text-glow">{stats.high_count} HIGH RISK</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">system clearance status</span>
            <span className="text-lg font-bold text-success uppercase">safe / normal</span>
          </div>
        </div>

        {/* SECURITY MATRIX GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: FILTERS AND EXPORTS (3 cols) */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <Panel title="THREAT VECTOR CONFIG">
              <div className="space-y-4">
                
                {/* Keyword Search */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Search Details</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search logs details..."
                    className="w-full bg-black border border-primary/20 hover:border-primary/40 focus:border-primary text-gray-300 text-xs px-2 py-1.5 rounded outline-none focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] transition"
                  />
                </div>

                {/* Risk Level filter */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Risk filter</label>
                  <div className="space-y-1">
                    {risksList.map((risk) => (
                      <button
                        key={risk}
                        onClick={() => setSelectedRisk(risk)}
                        className={`w-full text-left px-2 py-1.5 border rounded text-xs transition uppercase ${
                          selectedRisk === risk
                            ? "border-primary text-black bg-primary font-bold shadow-[0_0_8px_#00FFFF]"
                            : "border-primary/5 text-gray-400 hover:border-primary/25 bg-black/10"
                        }`}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
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

                {/* Dispatch manual override alert [+] */}
                <div className="border-t border-primary/10 pt-3">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full py-2 bg-black border border-[#EF4444] text-[#EF4444] font-bold uppercase rounded hover:bg-[#EF4444] hover:text-black active:scale-95 transition text-xs shadow-[0_0_10px_rgba(239,68,68,0.05)]"
                  >
                    [!] DISPATCH ALERT
                  </button>
                </div>

              </div>
            </Panel>
          </div>

          {/* CENTER PANEL: THREAT EVENT LOGS LIST (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <Panel title="SECURITY EVENT COMMAND FEED">
              
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

              {/* Terminal list container */}
              <div className="bg-black/90 border border-primary/15 rounded p-3 h-[450px] overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 selection:bg-[#EF4444] selection:text-black scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                
                {isLoading && events.length === 0 ? (
                  <div className="text-center text-primary animate-pulse py-20 uppercase tracking-widest text-xs">
                    CONNECTING TO SECURITY COMM-FEED...
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-20 text-gray-600 italic">
                    NO THREAT EVENTS DETECTED IN COORDINATES VAULT.
                  </div>
                ) : (
                  events.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className={`p-1.5 rounded cursor-pointer transition border border-transparent select-none ${
                        selectedEvent?.id === evt.id
                          ? "bg-[#EF4444]/5 border-[#EF4444]/30 text-white"
                          : "hover:bg-primary/5 hover:border-primary/10 text-gray-400"
                      }`}
                    >
                      <span className="text-gray-600 mr-1.5">
                        [{new Date(evt.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className="text-gray-500 uppercase font-bold mr-1.5">
                        [{evt.event}]
                      </span>
                      <span className={`text-[8px] uppercase border px-1 rounded font-bold mr-2 inline-block shrink-0 ${getRiskStyle(evt.risk_level)}`}>
                        {evt.risk_level}
                      </span>
                      <span className="break-all">{evt.details}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination indicators (standard list capping limit 100) */}
              <div className="text-center text-[10px] text-gray-600 uppercase pt-3">
                Feed limits: Showing latest {events.length} logs of {pagination.total} events
              </div>

            </Panel>
          </div>

          {/* RIGHT PANEL: INSPECTOR & DISPATCH FORM (4 cols) */}
          <div className="lg:col-span-4">
            <Panel title="ALERT METADATA INSPECTOR">
              
              {isCreating ? (
                // Dispatch alert form
                <form onSubmit={handleSaveAlert} className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-primary/15 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                      DISPATCH MANUAL THREAT ALERT
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-2 py-0.5 border border-gray-700 hover:border-gray-500 rounded text-gray-400 font-bold uppercase transition text-[9px]"
                    >
                      [x] Close
                    </button>
                  </div>

                  {/* Event tag input */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Event Tag</label>
                    <input
                      type="text"
                      value={formEvent}
                      onChange={(e) => setFormEvent(e.target.value)}
                      placeholder="e.g. manual_override_check"
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none"
                    />
                  </div>

                  {/* Risk level select */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Risk Level</label>
                    <select
                      value={formRisk}
                      onChange={(e) => setFormRisk(e.target.value)}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                    >
                      {risksList.filter(r => r !== "ALL").map((risk) => (
                        <option key={risk} value={risk}>{risk.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description details */}
                  <div>
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Threat description details</label>
                    <textarea
                      value={formDetails}
                      onChange={(e) => setFormDetails(e.target.value)}
                      placeholder="Specify observation details parameter metrics..."
                      rows={6}
                      className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 bg-[#EF4444] text-black font-bold uppercase rounded hover:bg-[#EF4444]/90 transition active:scale-95 text-xs text-glow shadow-[0_0_8px_#EF4444]"
                  >
                    [!] BROADCAST THREAT ALERT
                  </button>

                </form>
              ) : selectedEvent ? (
                
                // Detailed metadata inspect view
                <div className="space-y-4 text-xs font-mono">
                  <div className="border-b border-primary/10 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">THREAT AUDIT DETAIL</span>
                  </div>

                  <div className="bg-black/30 border border-primary/5 p-3 rounded space-y-3 leading-relaxed">
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Detected timestamp:</span>
                      <span className="text-gray-200 font-bold">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Event UUID:</span>
                      <span className="text-gray-300 select-all font-mono break-all text-[11px]">{selectedEvent.id}</span>
                    </div>
                    <div className="pt-1 border-t border-primary/5">
                      <span className="text-gray-500 uppercase text-[9px] block">Event Tag:</span>
                      <span className="text-primary font-bold uppercase text-[12px]">{selectedEvent.event}</span>
                    </div>
                  </div>

                  {/* Main Details Description */}
                  <div className="space-y-2">
                    <span className="text-gray-500 uppercase text-[9px] block">Description Details:</span>
                    <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap p-3 border-l border-primary/20 bg-black/10">
                      {selectedEvent.details}
                    </div>
                  </div>

                  {/* Risk Level display */}
                  <div className="border-t border-primary/10 pt-3">
                    <span className="text-gray-500 uppercase text-[9px] block mb-1.5">Risk Level Class:</span>
                    <span className={`text-[10px] uppercase border px-2 py-0.5 rounded font-bold text-glow inline-block ${getRiskStyle(selectedEvent.risk_level)}`}>
                      {selectedEvent.risk_level.toUpperCase()}
                    </span>
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                  Select a threat row from the comm feed list to inspect coordinates and telemetry details, or click [!] to dispatch a manual alert override.
                </div>
              )}

            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
