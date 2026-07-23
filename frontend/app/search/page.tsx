"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";
import { useAudio } from "../../hooks/useAudio";

interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
  timestamp: string;
  score: number;
  metadata: Record<string, unknown>;
}

interface RecentSearchItem {
  id: string;
  query: string;
  timestamp: string;
}

interface PinnedResultItem {
  id: string;
  item_id: string;
  item_type: string;
  title: string;
  url: string;
  created_at: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function SearchCenterContent() {
  const { playClick, playBeep } = useAudio();
  const searchParams = useSearchParams();


  // Search States
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // History & Pin States
  const [recents, setRecents] = useState<RecentSearchItem[]>([]);
  const [pins, setPins] = useState<PinnedResultItem[]>([]);

  // Filter States
  const [selectedType, setSelectedType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [limit] = useState(50);
  const [skip] = useState(0);

  // Loading & Diagnostics
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Timers
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize search results from backend API
  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const params: Record<string, string> = {
        q: trimmed,
        type: selectedType,
        limit: String(limit),
        skip: String(skip)
      };

      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();

      const queryString = new URLSearchParams(params).toString();
      const response = await api.get<ApiResponseEnvelope<{
        items: SearchResultItem[];
        total: number;
      }>>(`/api/v1/search?${queryString}`);

      if (response.data && response.data.success) {
        setResults(response.data.data.items);
        setTotalCount(response.data.data.total);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to query consolidated search index.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, dateFrom, dateTo, limit, skip]);

  // Save query to Recent Search history (deduplicated on backend)
  const saveRecentSearch = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    try {
      await api.post("/api/v1/search/recent", { query: trimmed });
      fetchRecentSearches();
    } catch {
      // Silently ignore recent save failure
    }
  };

  // Fetch Autocomplete Suggestions
  const fetchSuggestions = async (val: string) => {
    if (!val.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await api.get<ApiResponseEnvelope<string[]>>(
        `/api/v1/search/suggestions?q=${encodeURIComponent(val)}`
      );
      if (response.data && response.data.success) {
        setSuggestions(response.data.data);
      }
    } catch {
      setSuggestions([]);
    }
  };

  // Handle Search input change with debounce
  const handleInputChange = (val: string) => {
    setQuery(val);
    setShowSuggestions(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current);

    // Debounce actual search query by 300ms
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
      saveRecentSearch(val);
    }, 300);

    // Debounce autocomplete suggestions by 150ms
    suggestionsTimerRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 150);
  };

  // Run initial search on query parameter synchronize
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery) {
      setQuery(urlQuery);
      executeSearch(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch filter syncs
  useEffect(() => {
    if (query.trim()) {
      executeSearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, dateFrom, dateTo]);

  // History controls
  const fetchRecentSearches = async () => {
    try {
      const response = await api.get<ApiResponseEnvelope<RecentSearchItem[]>>("/api/v1/search/recent");
      if (response.data && response.data.success) {
        setRecents(response.data.data);
      }
    } catch {
      // Silently ignore history fetch failures
    }
  };

  const deleteRecentSearch = async (id: string) => {
    playClick();
    try {
      await api.delete(`/api/v1/search/recent/${id}`);
      fetchRecentSearches();
    } catch {
      setErrorMsg("Failed to delete recent search history entry.");
    }
  };

  const clearRecentSearches = async () => {
    playBeep();
    try {
      await api.delete("/api/v1/search/recent");
      setRecents([]);
    } catch {
      setErrorMsg("Failed to clear search history.");
    }
  };

  // Pin result controls
  const fetchPinnedResults = async () => {
    try {
      const response = await api.get<ApiResponseEnvelope<PinnedResultItem[]>>("/api/v1/search/pinned");
      if (response.data && response.data.success) {
        setPins(response.data.data);
      }
    } catch {
      // Silently ignore pins retrieval failures
    }
  };

  const togglePin = async (item: SearchResultItem) => {
    playClick();
    const existing = pins.find((p) => p.item_id === item.id && p.item_type === item.type);
    if (existing) {
      try {
        await api.delete(`/api/v1/search/pinned/${existing.id}`);
        fetchPinnedResults();
      } catch {
        setErrorMsg("Failed to unpin result.");
      }
    } else {
      try {
        await api.post("/api/v1/search/pinned", {
          item_id: item.id,
          item_type: item.type,
          title: item.title,
          url: item.url
        });
        fetchPinnedResults();
      } catch {
        setErrorMsg("Failed to pin result.");
      }
    }
  };

  const handleSuggestionClick = (val: string) => {
    playClick();
    setQuery(val);
    setShowSuggestions(false);
    executeSearch(val);
    saveRecentSearch(val);
  };

  // Mount listeners
  useEffect(() => {
    fetchRecentSearches();
    fetchPinnedResults();
  }, []);

  // Helper colors for result types
  const getTypeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case "research":
        return "text-[#00FFFF] border-[#00FFFF]/20 bg-[#00FFFF]/5 text-glow";
      case "dataset":
        return "text-[#10B981] border-[#10B981]/20 bg-[#10B981]/5 text-glow";
      case "experiment":
        return "text-[#EAB308] border-[#EAB308]/20 bg-[#EAB308]/5";
      case "log":
        return "text-[#D946EF] border-[#D946EF]/20 bg-[#D946EF]/5";
      case "bookmark":
        return "text-[#38BDF8] border-[#38BDF8]/20 bg-[#38BDF8]/5";
      case "setting":
        return "text-[#F97316] border-[#F97316]/20 bg-[#F97316]/5";
      case "document":
      case "file":
        return "text-gray-300 border-gray-800 bg-gray-900/40";
      default:
        return "text-gray-500 border-transparent bg-transparent";
    }
  };

  const searchTypes = ["ALL", "research", "dataset", "experiment", "log", "bookmark", "setting", "document", "file"];

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* INTERACTIVE SEARCH HEADER */}
        <div className="relative">
          <Panel title="UNIVERSAL SEARCH COMMAND CONSOLE">
            <div className="flex items-center space-x-3 bg-black/40 border border-primary/20 hover:border-primary/40 rounded px-4 py-3 transition relative">
              <span className="text-[#00FFFF] font-bold text-lg animate-pulse">&gt;</span>
              <input
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Query database, experiments logs, telemetry records, or settings shortcuts..."
                className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-gray-600 font-mono caret-[#00FFFF]"
              />
              {query && (
                <button
                  onClick={() => {
                    playClick();
                    setQuery("");
                    setResults([]);
                    setTotalCount(0);
                  }}
                  className="text-gray-500 hover:text-white transition uppercase text-[10px]"
                >
                  [clear]
                </button>
              )}
            </div>

            {/* Auto-complete Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-6 right-6 mt-1.5 z-30 bg-[#0E1525] border border-primary/30 rounded shadow-glow max-h-48 overflow-y-auto p-1 text-[11px] leading-relaxed">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSuggestionClick(sug)}
                    className="p-2 hover:bg-primary/10 text-gray-300 hover:text-[#00FFFF] cursor-pointer rounded transition-colors font-bold uppercase"
                  >
                    🔍 {sug}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: HISTORIES & PINS (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Pinned Results Shortcuts */}
            <Panel title="PINNED SEARCH CARDS">
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pins.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-gray-600 italic">
                    NO PINNED SHORTCUTS YET.
                  </div>
                ) : (
                  pins.map((pin) => (
                    <div
                      key={pin.id}
                      className="p-2 border border-primary/10 bg-black/40 rounded flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate flex-1 pr-2">
                        <span className="text-[8px] text-gray-500 uppercase block">{pin.item_type}</span>
                        <a
                          href={pin.url}
                          onClick={() => playClick()}
                          className="font-bold text-primary hover:underline uppercase block truncate"
                        >
                          {pin.title}
                        </a>
                      </div>
                      <button
                        onClick={async () => {
                          playClick();
                          await api.delete(`/api/v1/search/pinned/${pin.id}`);
                          fetchPinnedResults();
                        }}
                        className="text-red-400 hover:text-red-600 transition shrink-0"
                      >
                        [✕]
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            {/* Recent search queries history */}
            <Panel title="RECENT QUERY SEARCHES">
              <div className="space-y-2">
                {recents.length === 0 ? (
                  <div className="text-center py-6 text-[10px] text-gray-600 italic">
                    NO QUERY SEARCH HISTORY LOGS.
                  </div>
                ) : (
                  <>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {recents.map((hist) => (
                        <div
                          key={hist.id}
                          className="flex items-center justify-between p-1.5 border border-transparent hover:border-primary/10 rounded group text-[11px]"
                        >
                          <button
                            onClick={() => {
                              playClick();
                              setQuery(hist.query);
                              executeSearch(hist.query);
                            }}
                            className="text-left text-gray-400 hover:text-white transition truncate flex-1 uppercase"
                          >
                            🕒 {hist.query}
                          </button>
                          <button
                            onClick={() => deleteRecentSearch(hist.id)}
                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={clearRecentSearches}
                      className="w-full py-1 border border-primary/20 text-[10px] text-gray-500 uppercase rounded hover:border-red-400 hover:text-red-400 transition"
                    >
                      Clear History
                    </button>
                  </>
                )}
              </div>
            </Panel>
          </div>

          {/* CENTER COLUMN: RESULTS DISPLAY (6 cols) */}
          <div className="lg:col-span-6 flex flex-col">
            <Panel title={`SEARCH RESULTS LISTING (${totalCount} MATCHES)`}>
              
              {errorMsg && (
                <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/30 p-2 rounded uppercase mb-3">
                  ERROR: {errorMsg}
                </div>
              )}

              {/* scrollable results grid container */}
              <div className="space-y-3 h-[460px] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="text-center py-20 text-primary animate-pulse text-xs uppercase tracking-widest">
                    Consolidating search database indexes...
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-20 text-gray-600 italic">
                    {query.trim() ? "NO SEARCH RESULTS MATCHED ACTIVE CONFIGS." : "ENTER SEARCH PARAMETERS TO INITIALIZE."}
                  </div>
                ) : (
                  results.map((item) => {
                    const isPinned = pins.some((p) => p.item_id === item.id && p.item_type === item.type);
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="p-3 border border-primary/10 bg-black/70 hover:border-primary/30 rounded transition duration-200"
                      >
                        <div className="flex justify-between items-start">
                          <div className="truncate flex-1 pr-4">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[8px] uppercase border px-1 rounded font-bold ${getTypeStyle(item.type)}`}>
                                {item.type}
                              </span>
                              <span className="text-[9px] text-gray-600">Relevance: {(item.score * 100).toFixed(0)}%</span>
                            </div>
                            <h3 className="text-xs font-bold text-white uppercase mt-1 truncate">
                              {item.title}
                            </h3>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => togglePin(item)}
                              className={`text-xs hover:scale-105 transition px-1 ${
                                isPinned ? "text-[#EAB308]" : "text-gray-600 hover:text-gray-400"
                              }`}
                              title={isPinned ? "Unpin result" : "Pin result"}
                            >
                              ★
                            </button>
                            <a
                              href={item.url}
                              onClick={() => playClick()}
                              className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary hover:text-black font-bold uppercase transition"
                            >
                              Open
                            </a>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed break-all">
                          {item.description}
                        </p>

                        <div className="text-[9px] text-gray-600 mt-2.5 border-t border-primary/5 pt-1.5 flex justify-between items-center">
                          <span>[{new Date(item.timestamp).toLocaleString()}]</span>
                          {typeof item.metadata?.category === "string" && (
                            <span className="uppercase text-gray-500">Cat: {item.metadata.category as string}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>
          </div>

          {/* RIGHT COLUMN: SEARCH FILTERS (3 cols) */}
          <div className="lg:col-span-3">
            <Panel title="ADVANCED SEARCH FILTERS">
              <div className="space-y-4">
                
                {/* Result Type selector */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Category Filter</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-black border border-primary/20 focus:border-primary text-gray-300 px-2 py-1.5 rounded outline-none uppercase text-xs"
                  >
                    {searchTypes.map((t) => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Date range from picker */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Date Range From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-black border border-primary/20 text-gray-300 text-xs px-2 py-1.5 rounded outline-none"
                  />
                </div>

                {/* Date range to picker */}
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Date Range To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-black border border-primary/20 text-gray-300 text-xs px-2 py-1.5 rounded outline-none"
                  />
                </div>

                {/* Clear all filters button */}
                <button
                  onClick={() => {
                    playClick();
                    setSelectedType("ALL");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="w-full py-1.5 bg-black border border-primary/40 text-primary text-[10px] font-bold uppercase rounded hover:bg-primary hover:text-black transition"
                >
                  Reset Filters
                </button>

              </div>
            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}

export default function SearchCenterPage() {
  return (
    <Suspense fallback={
      <BaseLayout>
        <div className="flex-1 flex items-center justify-center p-6 bg-[#05070B] min-h-[500px]">
          <div className="text-center text-primary animate-pulse text-xs uppercase tracking-widest font-mono">
            LOADING SEARCH DECK PARAMETERS...
          </div>
        </div>
      </BaseLayout>
    }>
      <SearchCenterContent />
    </Suspense>
  );
}
