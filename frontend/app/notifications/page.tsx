"use client";

import React, { useState, useEffect, useRef } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";
import { useAudio } from "../../hooks/useAudio";

interface NotificationItem {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
}

interface PaginationMetadata {
  total: number;
  limit: number;
  skip: number;
  has_more: boolean;
}

interface FilterStats {
  total_alerts: number;
  unread_count: number;
  warning_count: number;
  critical_count: number;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function NotificationCenterPage() {
  const { playClick, playBeep } = useAudio();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [pagination, setPagination] = useState<PaginationMetadata>({
    total: 0,
    limit: 100,
    skip: 0,
    has_more: false
  });
  const [stats, setStats] = useState<FilterStats>({
    total_alerts: 0,
    unread_count: 0,
    warning_count: 0,
    critical_count: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedReadFilter, setSelectedReadFilter] = useState("ALL"); // ALL, read, unread
  const [limit] = useState(100);
  const [skip] = useState(0);

  // Polling Settings
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch notifications list
  const fetchNotifications = async (isPoll = false) => {
    if (!isPoll) setIsLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        skip: String(skip)
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedType !== "ALL") params.type = selectedType;
      
      if (selectedReadFilter === "read") params.is_read = "true";
      if (selectedReadFilter === "unread") params.is_read = "false";

      const queryString = new URLSearchParams(params).toString();
      const url = `/api/v1/notifications${queryString ? `?${queryString}` : ""}`;

      const response = await api.get<ApiResponseEnvelope<{
        items: NotificationItem[];
        pagination: PaginationMetadata;
        stats: FilterStats;
      }>>(url);

      if (response.data && response.data.success) {
        const data = response.data.data;
        setNotifications(data.items);
        setPagination(data.pagination);
        setStats(data.stats);
        setErrorMsg(null);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize Centralized notifications from database.");
    } finally {
      if (!isPoll) setIsLoading(false);
    }
  };

  // Sync feed on filter updates
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedType, selectedReadFilter, skip]);

  // Setup AbortController polling loop
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    if (autoRefresh) {
      pollTimerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchNotifications(true);
        }
      }, 5000);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, searchQuery, selectedType, selectedReadFilter, skip]);

  // Mark single notification as read
  const handleMarkRead = async (id: string) => {
    playClick();
    setErrorMsg(null);
    try {
      const response = await api.put<ApiResponseEnvelope<NotificationItem>>(`/api/v1/notifications/${id}/read`);
      if (response.data && response.data.success) {
        // Optimistic UI update in selected notification details
        if (selectedNotif?.id === id) {
          setSelectedNotif((prev) => prev ? { ...prev, is_read: true } : null);
        }
        await fetchNotifications(true);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to mark notification as read.");
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    playBeep();
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const response = await api.put<ApiResponseEnvelope<void>>("/api/v1/notifications/read-all");
      if (response.data && response.data.success) {
        setInfoMsg("All active alerts marked as read.");
        if (selectedNotif) {
          setSelectedNotif((prev) => prev ? { ...prev, is_read: true } : null);
        }
        await fetchNotifications();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to mark all notifications as read.");
    }
  };

  // Delete single notification
  const handleDeleteNotif = async (id: string) => {
    playClick();
    setErrorMsg(null);
    try {
      const response = await api.delete<ApiResponseEnvelope<void>>(`/api/v1/notifications/${id}`);
      if (response.data && response.data.success) {
        if (selectedNotif?.id === id) {
          setSelectedNotif(null);
        }
        await fetchNotifications();
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to delete notification record.");
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    playBeep();
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      const response = await api.delete<ApiResponseEnvelope<void>>("/api/v1/notifications");
      if (response.data && response.data.success) {
        setInfoMsg("All database notification history cleared successfully.");
        setSelectedNotif(null);
        setNotifications([]);
        setPagination((prev) => ({ ...prev, total: 0, has_more: false }));
        setStats({ total_alerts: 0, unread_count: 0, warning_count: 0, critical_count: 0 });
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to clear notifications database.");
    }
  };

  // Export current list as JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(notifications, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `mridansh_hq_notifications_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export current list as CSV
  const handleExportCSV = () => {
    const csvRows = [
      ["Timestamp", "Type", "Title", "Message", "Read Status"],
      ...notifications.map((notif) => [
        notif.timestamp,
        notif.type,
        notif.title,
        notif.message.replace(/"/g, '""'),
        notif.is_read ? "READ" : "UNREAD"
      ])
    ];

    const csvContent = `data:text/csv;charset=utf-8,${csvRows
      .map((e) => e.map((val) => `"${val}"`).join(","))
      .join("\n")}`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `mridansh_hq_notifications_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper colors for alert types
  const getTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "critical":
      case "error":
        return "text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/5 text-glow-danger font-bold";
      case "warning":
        return "text-[#EAB308] border-[#EAB308]/20 bg-[#EAB308]/5 font-bold";
      case "success":
        return "text-success border-success/20 bg-success/5 text-glow";
      case "security":
        return "text-[#D946EF] border-[#D946EF]/20 bg-[#D946EF]/5";
      case "engine":
        return "text-[#F97316] border-[#F97316]/20 bg-[#F97316]/5";
      case "radar":
        return "text-[#38BDF8] border-[#38BDF8]/20 bg-[#38BDF8]/5";
      default:
        return "text-[#00FFFF] border-[#00FFFF]/20 bg-[#00FFFF]/5";
    }
  };

  const typesList = ["ALL", "info", "success", "warning", "critical", "security", "engine", "dataset", "radar"];

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* STATS OVERVIEW HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">total unread logs</span>
            <span className="text-2xl font-bold text-[#EF4444] text-glow-danger">{stats.unread_count} ACTIVE</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">warning warnings alerts</span>
            <span className="text-2xl font-bold text-[#EAB308] text-glow">{stats.warning_count} WARNINGS</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">critical locks logs</span>
            <span className="text-2xl font-bold text-[#EF4444] text-glow-danger">{stats.critical_count} CRITICAL</span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">notification center</span>
            <span className="text-lg font-bold text-success uppercase">healthy / monitoring</span>
          </div>
        </div>

        {/* MAIN PANEL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR: FILTERS & ACTIONS (3 cols) */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <Panel title="ALERT FILTER CONTROL">
              <div className="space-y-4">
                
                {/* Search query input */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Search Text</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notifications..."
                    className="w-full bg-black border border-primary/20 hover:border-primary/40 focus:border-primary text-gray-300 text-xs px-2 py-1.5 rounded outline-none focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] transition"
                  />
                </div>

                {/* Read Status Filter */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Read State</label>
                  <div className="grid grid-cols-3 gap-1">
                    {["ALL", "read", "unread"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setSelectedReadFilter(filter)}
                        className={`py-1.5 border rounded text-[10px] uppercase font-bold text-center transition ${
                          selectedReadFilter === filter
                            ? "border-primary text-black bg-primary shadow-[0_0_8px_#00FFFF]"
                            : "border-primary/10 text-gray-400 bg-black/20 hover:border-primary/25"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notification Type Filters */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Alert Category</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase"
                  >
                    {typesList.map((type) => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Polling auto-refresh checkbox */}
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

                {/* Exporter actions */}
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

                {/* Bulk Actions buttons */}
                <div className="border-t border-primary/10 pt-3 space-y-2">
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full py-2 bg-black border border-success text-success font-bold uppercase rounded hover:bg-success hover:text-black transition text-xs shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  >
                    Mark All Read
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="w-full py-2 bg-black border border-[#EF4444] text-[#EF4444] font-bold uppercase rounded hover:bg-[#EF4444] hover:text-black transition text-xs shadow-[0_0_10px_rgba(239,68,68,0.05)]"
                  >
                    Clear All Alerts
                  </button>
                </div>

              </div>
            </Panel>
          </div>

          {/* CENTER PANEL: NOTIFICATIONS TIMELINE (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <Panel title="LIVE NOTIFICATION STREAM">
              
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

              {/* Scrollable Timeline logs stream container */}
              <div className="bg-black/90 border border-primary/15 rounded p-3 h-[450px] overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                
                {isLoading && notifications.length === 0 ? (
                  <div className="text-center text-primary animate-pulse py-20 uppercase tracking-widest text-xs">
                    SYNCHRONIZING FEED HISTORY TIMELINE...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-20 text-gray-600 italic">
                    NO DATABASE NOTIFICATION LOGS MATCHING ACTIVE CONFIGS.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedNotif(notif)}
                      className={`p-2.5 rounded cursor-pointer transition border select-none relative ${
                        selectedNotif?.id === notif.id
                          ? "bg-primary/5 border-primary/30 text-white"
                          : "hover:bg-primary/5 border-transparent text-gray-400 hover:border-primary/10"
                      } ${!notif.is_read ? "border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-gray-500 font-bold uppercase mr-1.5 block truncate">
                          {notif.title}
                        </span>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className={`text-[8px] uppercase border px-1 rounded font-bold ${getTypeStyle(notif.type)}`}>
                            {notif.type}
                          </span>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" title="Unread" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-300 mt-1 line-clamp-2 break-all">{notif.message}</p>
                      
                      <div className="flex justify-between items-center text-[9px] text-gray-600 mt-2 border-t border-primary/5 pt-1.5">
                        <span>[{new Date(notif.timestamp).toLocaleString()}]</span>
                        <div className="flex space-x-2">
                          {!notif.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(notif.id);
                              }}
                              className="text-primary hover:underline uppercase"
                            >
                              [Mark Read]
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotif(notif.id);
                            }}
                            className="text-[#EF4444] hover:underline uppercase"
                          >
                            [Delete]
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Feed metrics details */}
              <div className="text-center text-[10px] text-gray-600 uppercase pt-3">
                Viewing {notifications.length} alerts of {pagination.total} total logs
              </div>

            </Panel>
          </div>

          {/* RIGHT PANEL: METADATA INSPECTOR (4 cols) */}
          <div className="lg:col-span-4">
            <Panel title="ALERT METADATA INSPECTOR">
              {selectedNotif ? (
                <div className="space-y-4 text-xs font-mono">
                  
                  <div className="border-b border-primary/10 pb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">NOTIFICATION DETAILS</span>
                  </div>

                  <div className="bg-black/30 border border-primary/5 p-3 rounded space-y-3 leading-relaxed">
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Dispatched Timestamp:</span>
                      <span className="text-gray-200 font-bold">{new Date(selectedNotif.timestamp).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 uppercase text-[9px] block">Notification ID UUID:</span>
                      <span className="text-gray-300 select-all font-mono break-all text-[11px]">{selectedNotif.id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-primary/5">
                      <div>
                        <span className="text-gray-500 uppercase text-[9px] block">Category Type:</span>
                        <span className="text-primary font-bold uppercase text-[11px]">{selectedNotif.type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 uppercase text-[9px] block">Read status:</span>
                        <span className={`font-bold uppercase ${selectedNotif.is_read ? "text-gray-500" : "text-[#EF4444]"}`}>
                          {selectedNotif.is_read ? "READ" : "UNREAD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notification Content Message */}
                  <div className="space-y-2">
                    <span className="text-gray-500 uppercase text-[9px] block">Message contents:</span>
                    <div className="text-xs text-gray-300 leading-relaxed font-mono whitespace-pre-wrap p-3 border-l border-primary/20 bg-black/10">
                      <span className="font-bold text-white block mb-1 text-xs uppercase">{selectedNotif.title}</span>
                      {selectedNotif.message}
                    </div>
                  </div>

                  {/* Actions buttons inside inspector */}
                  <div className="border-t border-primary/10 pt-3.5 space-y-2">
                    {!selectedNotif.is_read && (
                      <button
                        onClick={() => handleMarkRead(selectedNotif.id)}
                        className="w-full py-2 bg-success text-black font-bold uppercase rounded hover:bg-success/90 transition active:scale-95 text-xs text-glow shadow-[0_0_8px_#10B981]"
                      >
                        [✓] Mark Alert as Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotif(selectedNotif.id)}
                      className="w-full py-2 bg-black border border-[#EF4444] text-[#EF4444] font-bold uppercase rounded hover:bg-[#EF4444] hover:text-black transition active:scale-95 text-xs"
                    >
                      [x] Delete Alert Record
                    </button>
                  </div>

                </div>
              ) : (
                <div className="text-center py-16 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                  Select a notification row from the timeline feed stream to inspect detailed message coordinates and logs timestamps.
                </div>
              )}
            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
