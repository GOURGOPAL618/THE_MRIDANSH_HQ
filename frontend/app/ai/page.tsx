"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { useNotification } from "@/hooks/useNotification";
import { Panel } from "@/components/Panel";
import { Button } from "@/components/Button";

interface ResearchPaper {
  id: number;
  title: string;
  abstract: string;
}

interface DatasetItem {
  id: number;
  name: string;
  description: string;
  row_count: number;
}

interface LogItem {
  id: number;
  severity: string;
  module: string;
  description: string;
}

interface ExperimentItem {
  id: number;
  name: string;
  script_content: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AICockpitPage() {
  const { notifyError } = useNotification();
  const [mode, setMode] = useState<"general" | "research" | "dataset" | "logs" | "experiment">("general");
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStreamingResponse, setActiveStreamingResponse] = useState("");
  
  // Context registries
  const [researchList, setResearchList] = useState<ResearchPaper[]>([]);
  const [datasetList, setDatasetList] = useState<DatasetItem[]>([]);
  const [logsList, setLogsList] = useState<LogItem[]>([]);
  const [experimentsList, setExperimentsList] = useState<ExperimentItem[]>([]);

  // Selected context ids
  const [selectedResearchId, setSelectedResearchId] = useState<string>("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [selectedLogId, setSelectedLogId] = useState<string>("");
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>("");

  const activeReader = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch all database categories context data on page load
  useEffect(() => {
    const loadContextData = async () => {
      try {
        const researchRes = await api.get<{ data: ResearchPaper[] }>("/api/v1/research/papers");
        if (researchRes.data?.data) setResearchList(researchRes.data.data);
        
        const datasetsRes = await api.get<{ data: DatasetItem[] }>("/api/v1/datasets");
        if (datasetsRes.data?.data) setDatasetList(datasetsRes.data.data);

        const logsRes = await api.get<{ data: LogItem[] }>("/api/v1/logs?limit=20");
        if (logsRes.data?.data) setLogsList(logsRes.data.data);

        const experimentsRes = await api.get<{ data: ExperimentItem[] }>("/api/v1/experiments");
        if (experimentsRes.data?.data) setExperimentsList(experimentsRes.data.data);
      } catch {
        notifyError("Failed to seed context indexes tables.");
      }
    };
    loadContextData();
  }, [notifyError]);

  // Scroll to bottom on history or stream update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, activeStreamingResponse]);

  const assembleContextPayload = (): string => {
    if (mode === "research" && selectedResearchId) {
      const paper = researchList.find(p => p.id.toString() === selectedResearchId);
      if (paper) return `RESEARCH PAPER TITLE: ${paper.title}\nABSTRACT:\n${paper.abstract}`;
    }
    if (mode === "dataset" && selectedDatasetId) {
      const ds = datasetList.find(d => d.id.toString() === selectedDatasetId);
      if (ds) return `DATASET NAME: ${ds.name}\nDESCRIPTION: ${ds.description}\nROW COUNT: ${ds.row_count}`;
    }
    if (mode === "logs" && selectedLogId) {
      const log = logsList.find(l => l.id.toString() === selectedLogId);
      if (log) return `SYSTEM LOG EVENT:\nSeverity: ${log.severity}\nModule: ${log.module}\nDescription: ${log.description}`;
    }
    if (mode === "experiment" && selectedExperimentId) {
      const exp = experimentsList.find(e => e.id.toString() === selectedExperimentId);
      if (exp) return `EXPERIMENT NAME: ${exp.name}\nSCRIPT CODE:\n${exp.script_content}`;
    }
    return "";
  };

  const handleAbort = () => {
    if (activeReader.current) {
      activeReader.current.cancel();
      setIsStreaming(false);
      // Append what was completed so far
      if (activeStreamingResponse) {
        setChatHistory(prev => [...prev, { role: "assistant", content: activeStreamingResponse + " [STREAM TERMINATED]" }]);
        setActiveStreamingResponse("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isStreaming) return;

    const userMessage = prompt;
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setPrompt("");
    setIsStreaming(true);
    setActiveStreamingResponse("");

    const contextPayload = assembleContextPayload();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const token = localStorage.getItem("jcc_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/v1/ai/stream`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          prompt: userMessage,
          mode: mode,
          context: contextPayload || undefined
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          try {
            const errData = await response.json();
            notifyError(errData?.message || "Too many requests. Operation throttled.", "Rate Limit Exceeded");
          } catch {
            notifyError("Too many requests. Operation throttled.", "Rate Limit Exceeded");
          }
          return;
        }
        throw new Error("API streaming error response received.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not init streaming reader.");
      activeReader.current = reader;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.substring(6).trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                notifyError(parsed.error);
                break;
              }
              if (parsed.chunk) {
                setActiveStreamingResponse(prev => prev + parsed.chunk);
              }
            } catch {
              // Ignore parse errors on raw chunk tokens
            }
          }
        }
      }
    } catch {
      notifyError("Failed to receive stream connection response.");
    } finally {
      setIsStreaming(false);
      activeReader.current = null;
      // Flush active response to history
      setActiveStreamingResponse(prev => {
        if (prev) {
          setChatHistory(h => [...h, { role: "assistant", content: prev }]);
        }
        return "";
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-1">
      {/* Parameters Panel */}
      <div className="lg:col-span-1 space-y-6">
        <Panel title="AI Context Settings" className="border border-primary/20 bg-background/50">
          <div className="space-y-4">
            
            {/* Mode selection */}
            <div>
              <label className="block text-[10px] uppercase font-mono tracking-widest text-primary-glow mb-1.5">Assistant Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "general" | "research" | "dataset" | "logs" | "experiment")}
                className="w-full bg-background/80 border border-primary/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
              >
                <option value="general">General Cockpit assistant</option>
                <option value="research">Research Vault Analyst</option>
                <option value="dataset">Dataset statistics Analyst</option>
                <option value="logs">Logs Troubleshooting guide</option>
                <option value="experiment">Experiment Lab validator</option>
              </select>
            </div>

            {/* Context selection */}
            {mode === "research" && (
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-primary-glow mb-1.5">Select Research paper</label>
                <select
                  value={selectedResearchId}
                  onChange={(e) => setSelectedResearchId(e.target.value)}
                  className="w-full bg-background/80 border border-primary/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                >
                  <option value="">-- No Context --</option>
                  {researchList.map(r => (
                    <option key={r.id} value={r.id.toString()}>{r.title}</option>
                  ))}
                </select>
              </div>
            )}

            {mode === "dataset" && (
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-primary-glow mb-1.5">Select dataset</label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full bg-background/80 border border-primary/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                >
                  <option value="">-- No Context --</option>
                  {datasetList.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.name} ({d.row_count} rows)</option>
                  ))}
                </select>
              </div>
            )}

            {mode === "logs" && (
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-primary-glow mb-1.5">Select Log entry</label>
                <select
                  value={selectedLogId}
                  onChange={(e) => setSelectedLogId(e.target.value)}
                  className="w-full bg-background/80 border border-primary/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                >
                  <option value="">-- No Context --</option>
                  {logsList.map(l => (
                    <option key={l.id} value={l.id.toString()}>
                      [{l.severity.toUpperCase()}] {l.module}: {l.description.substring(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === "experiment" && (
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-primary-glow mb-1.5">Select Experiment script</label>
                <select
                  value={selectedExperimentId}
                  onChange={(e) => setSelectedExperimentId(e.target.value)}
                  className="w-full bg-background/80 border border-primary/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-mono"
                >
                  <option value="">-- No Context --</option>
                  {experimentsList.map(e => (
                    <option key={e.id} value={e.id.toString()}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}

          </div>
        </Panel>
      </div>

      {/* Terminal Chat Console */}
      <div className="lg:col-span-3">
        <Panel className="border border-primary/20 bg-background/50 flex flex-col h-[600px]">
          {/* Chat history list */}
          <div className="flex-1 overflow-y-auto space-y-4 p-2 border border-primary/10 rounded bg-background/30 scrollbar-thin">
            {chatHistory.length === 0 && !activeStreamingResponse && (
              <div className="flex h-full items-center justify-center text-center">
                <div className="space-y-2">
                  <div className="w-12 h-12 border border-primary/20 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">🤖</div>
                  <p className="text-xs uppercase tracking-widest text-primary-glow">AI Cockpit offline. Directives active.</p>
                  <p className="text-[10px] text-primary/50">Select a mode and context to analyze parameters.</p>
                </div>
              </div>
            )}

            {chatHistory.map((m, idx) => (
              <div key={idx} className={`p-3 rounded border text-xs leading-relaxed max-w-[85%] ${
                m.role === "user" 
                  ? "bg-primary/10 border-primary/20 ml-auto text-white" 
                  : "bg-background/80 border-primary/15 mr-auto text-primary-glow"
              }`}>
                <div className="text-[9px] uppercase font-mono tracking-widest text-primary-glow/50 mb-1">
                  {m.role === "user" ? "Commander" : "AETHER AI"}
                </div>
                <div className="whitespace-pre-line font-mono">{m.content}</div>
              </div>
            ))}

            {/* Live Streaming Response */}
            {activeStreamingResponse && (
              <div className="p-3 rounded border bg-background/80 border-primary/15 mr-auto text-primary-glow max-w-[85%] animate-fade-in">
                <div className="text-[9px] uppercase font-mono tracking-widest text-primary-glow/50 mb-1">
                  AETHER AI [STREAMING]
                </div>
                <div className="font-mono whitespace-pre-line">
                  {activeStreamingResponse}
                  <span className="inline-block w-1.5 h-3 bg-primary ml-1 animate-pulse" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Form input console */}
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isStreaming}
              placeholder={isStreaming ? "AETHER is analyzing..." : "Enter cockpit command directive..."}
              className="flex-1 bg-background/80 border border-primary/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono placeholder:text-primary/30"
            />
            {isStreaming ? (
              <Button type="button" variant="danger" onClick={handleAbort} className="px-4 text-xs font-mono">
                ABORT
              </Button>
            ) : (
              <Button type="submit" variant="primary" className="px-5 text-xs font-mono">
                SEND
              </Button>
            )}
          </form>
        </Panel>
      </div>
    </div>
  );
}
