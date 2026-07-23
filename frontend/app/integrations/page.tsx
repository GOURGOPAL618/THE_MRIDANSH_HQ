"use client";

import React, { useState, useEffect } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";
import { useAudio } from "../../hooks/useAudio";

interface ProviderStatus {
  status: string;
  key_state: unknown;
  rate_limit?: {
    remaining: number;
    limit: number;
  };
  active_provider?: string;
  repo_target?: string;
  message?: string;
}

interface IntegrationsStatusData {
  global_mock_mode: boolean;
  providers: Record<string, ProviderStatus>;
}

interface WeatherResponse {
  source: string;
  is_mock: boolean;
  data: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    pressure: number;
    weather_main: string;
    description: string;
  };
}

interface NasaResponse {
  source: string;
  is_mock: boolean;
  data: {
    title: string;
    url: string;
    explanation: string;
    date: string;
  };
}

interface CommitItem {
  sha: string;
  message: string;
  author: string;
  date: string;
}

interface GithubResponse {
  source: string;
  is_mock: boolean;
  data: {
    commits: CommitItem[];
  };
}

interface AIChatResponse {
  source: string;
  is_mock: boolean;
  data: {
    response: string;
  };
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function IntegrationsPage() {
  const { playClick } = useAudio();

  // Diagnostics States
  const [statusData, setStatusData] = useState<IntegrationsStatusData | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Weather Console States
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // NASA APOD States
  const [nasaApod, setNasaApod] = useState<NasaResponse | null>(null);
  const [isLoadingNasa, setIsLoadingNasa] = useState(false);

  // GitHub States
  const [github, setGithub] = useState<GithubResponse | null>(null);
  const [isLoadingGit, setIsLoadingGit] = useState(false);

  // AI Prompt States
  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<AIChatResponse | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Error States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch API Diagnostics Statuses
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await api.get<ApiResponseEnvelope<IntegrationsStatusData>>("/api/v1/integrations/status");
      if (response.data && response.data.success) {
        setStatusData(response.data.data);
      }
    } catch {
      setErrorMsg("Failed to synchronize connections diagnostic status.");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Weather Test Sync
  const syncWeather = async () => {
    playClick();
    setIsLoadingWeather(true);
    setErrorMsg(null);
    try {
      const response = await api.get<ApiResponseEnvelope<WeatherResponse>>("/api/v1/integrations/weather");
      if (response.data && response.data.success) {
        setWeather(response.data.data);
      }
    } catch {
      setErrorMsg("Failed to fetch weather telemetry.");
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // NASA APOD Test Sync
  const syncNasaApod = async () => {
    playClick();
    setIsLoadingNasa(true);
    setErrorMsg(null);
    try {
      const response = await api.get<ApiResponseEnvelope<NasaResponse>>("/api/v1/integrations/nasa");
      if (response.data && response.data.success) {
        setNasaApod(response.data.data);
      }
    } catch {
      setErrorMsg("Failed to fetch NASA picture telemetry.");
    } finally {
      setIsLoadingNasa(false);
    }
  };

  // GitHub Test Sync
  const syncGitHub = async () => {
    playClick();
    setIsLoadingGit(true);
    setErrorMsg(null);
    try {
      const response = await api.get<ApiResponseEnvelope<GithubResponse>>("/api/v1/integrations/github");
      if (response.data && response.data.success) {
        setGithub(response.data.data);
      }
    } catch {
      setErrorMsg("Failed to fetch GitHub commits metrics.");
    } finally {
      setIsLoadingGit(false);
    }
  };

  // Query AI Chat Core
  const handleAIChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    playClick();
    setIsLoadingAI(true);
    setErrorMsg(null);
    try {
      const response = await api.post<ApiResponseEnvelope<AIChatResponse>>("/api/v1/integrations/ai/chat", {
        prompt: trimmed
      });
      if (response.data && response.data.success) {
        setAiResponse(response.data.data);
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to complete AI chat query.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Initial Sync
  useEffect(() => {
    fetchStatus();
  }, []);

  // Helper colors for status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "connected":
        return "text-success border-success/30 bg-success/5 text-glow";
      case "mock":
        return "text-[#EAB308] border-[#EAB308]/30 bg-[#EAB308]/5 text-glow";
      case "standby":
        return "text-[#38BDF8] border-[#38BDF8]/30 bg-[#38BDF8]/5";
      default:
        return "text-red-400 border-red-500/30 bg-red-950/20";
    }
  };

  const renderKeyState = (keyState: unknown): string => {
    if (!keyState) return "MISSING";
    if (typeof keyState === "object") {
      const obj = keyState as Record<string, string>;
      return `OpenAI: ${obj.openai || "missing"} / Gemini: ${obj.gemini || "missing"}`;
    }
    return String(keyState);
  };

  const getProviderName = (key: string) => {
    switch (key.toLowerCase()) {
      case "nasa": return "NASA Space APIs";
      case "weather": return "OpenWeather Telemetry";
      case "ai": return "AETHER AI Chat Engine";
      case "github": return "GitHub Telemetry Client";
      case "pixxel": return "Pixxel Hyperspectral (Future)";
      case "esa": return "ESA Copernicus (Future)";
      case "isro": return "ISRO Cartosat (Future)";
      default: return key.toUpperCase();
    }
  };

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm">
        
        {/* HEADER OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">outbound mock mode</span>
            <span className={`text-xl font-bold uppercase ${statusData?.global_mock_mode ? "text-[#EAB308] text-glow" : "text-success text-glow"}`}>
              {statusData?.global_mock_mode ? "MOCK ACTIVE" : "LIVE MODE"}
            </span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">active AI client</span>
            <span className="text-xl font-bold text-[#00FFFF] text-glow uppercase">
              {statusData?.providers?.ai?.active_provider || "STANDBY"}
            </span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">GitHub Target Repo</span>
            <span className="text-xs font-bold text-gray-300 truncate uppercase mt-2">
              {statusData?.providers?.github?.repo_target || "NOT CONFIGURED"}
            </span>
          </div>
          <div className="p-3 border border-primary/10 bg-black/40 rounded flex flex-col justify-between h-20">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">diagnostics status</span>
            <span className="text-lg font-bold text-success uppercase">healthy / monitoring</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded uppercase font-bold text-center">
            ERROR SIGNAL: {errorMsg}
          </div>
        )}

        {/* CONNECTION STATUSES GRID */}
        <Panel title="EXTERNAL API CONNECTIONS DIAGNOSTIC VAULT">
          {isLoadingStatus && !statusData ? (
            <div className="text-center py-6 text-primary animate-pulse text-xs uppercase tracking-widest">
              Syncing connections status...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statusData && Object.entries(statusData.providers).map(([key, provider]) => (
                <div
                  key={key}
                  className="p-3 border border-primary/10 bg-black/20 rounded space-y-2 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white uppercase text-[11px]">
                        {getProviderName(key)}
                      </span>
                      <span className={`text-[8px] uppercase border px-1 rounded font-bold ${getStatusColor(provider.status)}`}>
                        {provider.status}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-gray-400 text-[10px]">
                      <div>
                        <span className="text-gray-600 block">KEY CONFIG STATE:</span>
                        <span className={`font-bold ${provider.key_state && typeof provider.key_state === "object" ? "text-gray-300" : (provider.key_state === "configured" ? "text-success" : "text-gray-500")}`}>
                          {renderKeyState(provider.key_state)}
                        </span>
                      </div>
                      
                      {provider.rate_limit && (
                        <div>
                          <span className="text-gray-600 block">RATE LIMIT LIMIT:</span>
                          <span className="font-mono text-gray-300">
                            {provider.rate_limit.remaining} / {provider.rate_limit.limit} REMAINING
                          </span>
                        </div>
                      )}

                      {provider.message && (
                        <div className="text-[9px] italic text-gray-500 mt-1 border-t border-primary/5 pt-1.5">
                          {provider.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* INTERACTIVE TESTING DECK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT WIDGETS COLUMN */}
          <div className="space-y-6">
            
            {/* OpenWeather HUD Panel */}
            <Panel title="OPENWEATHER HUB CONNECTION TEST">
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span>JCC HQ Coordinate weather telemetry (21.03, 80.24)</span>
                  <button
                    onClick={syncWeather}
                    className="py-1 px-3 bg-black border border-primary/40 text-primary text-[10px] uppercase font-bold rounded hover:bg-primary hover:text-black transition"
                    disabled={isLoadingWeather}
                  >
                    {isLoadingWeather ? "SYNCING..." : "SYNC WEATHER"}
                  </button>
                </div>

                {weather ? (
                  <div className="p-3 bg-black/60 border border-primary/15 rounded space-y-3">
                    <div className="grid grid-cols-2 gap-2 leading-relaxed">
                      <div>
                        <span className="text-gray-500 text-[9px] block">TEMPERATURE:</span>
                        <span className="text-base font-bold text-white">{weather.data.temperature} °C</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[9px] block">HUMIDITY:</span>
                        <span className="text-base font-bold text-white">{weather.data.humidity} %</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[9px] block">WIND SPEED:</span>
                        <span className="text-base font-bold text-white">{weather.data.wind_speed} m/s</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[9px] block">BAROMETRIC PRESSURE:</span>
                        <span className="text-base font-bold text-white">{weather.data.pressure} hPa</span>
                      </div>
                    </div>

                    <div className="border-t border-primary/5 pt-2 flex justify-between items-center text-[10px]">
                      <div>
                        <span className="text-gray-500 block">DATA STREAM SOURCE:</span>
                        <span className={`font-bold ${weather.is_mock ? "text-[#EAB308]" : "text-success"}`}>
                          {weather.source.toUpperCase()} {weather.is_mock ? "(MOCK)" : "(LIVE)"}
                        </span>
                      </div>
                      <span className="text-gray-500 uppercase italic">{weather.data.description}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    Click &quot;SYNC WEATHER&quot; to query weather telemetry data.
                  </div>
                )}
              </div>
            </Panel>

            {/* NASA APOD Viewer */}
            <Panel title="NASA ASTRONOMY APOD CONNECTION TEST">
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span>NASA APOD Telescope images catalog telemetry</span>
                  <button
                    onClick={syncNasaApod}
                    className="py-1 px-3 bg-black border border-primary/40 text-primary text-[10px] uppercase font-bold rounded hover:bg-primary hover:text-black transition"
                    disabled={isLoadingNasa}
                  >
                    {isLoadingNasa ? "SYNCING..." : "SYNC NASA APOD"}
                  </button>
                </div>

                {nasaApod ? (
                  <div className="p-3 bg-black/60 border border-primary/15 rounded space-y-3">
                    <div className="border-b border-primary/5 pb-2">
                      <span className="text-gray-500 text-[9px] block">ASTRONOMY PICTURE TITLE:</span>
                      <span className="text-xs font-bold text-white uppercase">{nasaApod.data.title}</span>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 text-[9px] block mb-1">NASA DESCRIPTION:</span>
                      <p className="text-[11px] text-gray-400 leading-relaxed text-justify line-clamp-4">
                        {nasaApod.data.explanation}
                      </p>
                    </div>

                    <div className="border-t border-primary/5 pt-2 flex justify-between items-center text-[10px]">
                      <div>
                        <span className="text-gray-500 block">TELEMETRY STREAM SOURCE:</span>
                        <span className={`font-bold ${nasaApod.is_mock ? "text-[#EAB308]" : "text-success"}`}>
                          {nasaApod.source.toUpperCase()} {nasaApod.is_mock ? "(MOCK)" : "(LIVE)"}
                        </span>
                      </div>
                      <span className="text-gray-500">DATE: {nasaApod.data.date}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    Click &quot;SYNC NASA APOD&quot; to query space images telemetry data.
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* RIGHT WIDGETS COLUMN */}
          <div className="space-y-6">
            
            {/* AI Prompt Console */}
            <Panel title="AETHER AI CHAT TERMINAL CONSOLE">
              <div className="space-y-4 text-xs font-mono">
                
                {/* AI response panel */}
                {aiResponse ? (
                  <div className="p-3 bg-black border-l-2 border-l-primary rounded space-y-2">
                    <div className="flex justify-between items-center text-[9px] text-gray-500 border-b border-primary/5 pb-1">
                      <span>AI RESPONSE SOURCE: <span className="font-bold text-[#00FFFF]">{aiResponse.source.toUpperCase()}</span></span>
                      <span>is_mock: {String(aiResponse.is_mock).toUpperCase()}</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {aiResponse.data.response}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    AI core online. Type prompt below to initiate query.
                  </div>
                )}

                {/* Query Form */}
                <form onSubmit={handleAIChat} className="flex space-x-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter cockpit diagnostics prompt (e.g. check plume status)..."
                    className="flex-1 bg-black border border-primary/20 focus:border-primary text-gray-300 text-xs px-2.5 py-2 rounded outline-none"
                    disabled={isLoadingAI}
                  />
                  <button
                    type="submit"
                    className="py-1 px-4 bg-primary text-black text-xs font-bold uppercase rounded hover:bg-primary/95 transition active:scale-95 shrink-0"
                    disabled={isLoadingAI}
                  >
                    {isLoadingAI ? "QUERYING..." : "SUBMIT"}
                  </button>
                </form>
              </div>
            </Panel>

            {/* GitHub commits console */}
            <Panel title="GITHUB CODEBASE METRICS FEED">
              <div className="space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span>Git commits telemetry for owner GOURGOPAL618</span>
                  <button
                    onClick={syncGitHub}
                    className="py-1 px-3 bg-black border border-primary/40 text-primary text-[10px] uppercase font-bold rounded hover:bg-primary hover:text-black transition"
                    disabled={isLoadingGit}
                  >
                    {isLoadingGit ? "SYNCING..." : "SYNC COMMIT LOGS"}
                  </button>
                </div>

                {github ? (
                  <div className="bg-black/90 border border-primary/15 rounded p-3 max-h-56 overflow-y-auto space-y-2">
                    {github.data.commits.map((commit, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 border-b border-primary/5 last:border-b-0 text-[10px] flex justify-between items-start"
                      >
                        <div className="pr-4">
                          <span className="text-gray-500 font-bold mr-1.5">[{commit.sha}]</span>
                          <span className="text-gray-300 uppercase">{commit.message}</span>
                        </div>
                        <span className="text-gray-600 shrink-0 uppercase italic">{commit.author}</span>
                      </div>
                    ))}
                    
                    <div className="text-[9px] text-gray-600 pt-2 border-t border-primary/5 flex justify-between items-center">
                      <span>Source: {github.source} (is_mock: {String(github.is_mock)})</span>
                      <span>Target: {statusData?.providers?.github?.repo_target}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-600 italic border border-dashed border-gray-800 rounded">
                    Click &quot;SYNC COMMIT LOGS&quot; to pull latest repository commits logs.
                  </div>
                )}
              </div>
            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
