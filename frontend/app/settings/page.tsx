"use client";

import React, { useState, useEffect } from "react";
import BaseLayout from "../../layouts/BaseLayout";
import Panel from "../../components/Panel";
import { api } from "../../services/api";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAudio } from "../../hooks/useAudio";
import { themes } from "../../config/theme";

interface SettingsData {
  theme: string;
  volume: number;
  is_muted: boolean;
  notifications_enabled: boolean;
  performance_mode: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function SettingsPage() {
  const { setTheme } = useThemeContext();
  const { setVolume, isMuted, toggleMuted, playClick } = useAudio();

  const [dbSettings, setDbSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Settings State Hooks
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [volumeLevel, setVolumeLevel] = useState(50);
  const [muteState, setMuteState] = useState(false);
  const [notifState, setNotifState] = useState(true);
  const [perfMode, setPerfMode] = useState("quality");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch preferences on mount
  const fetchSettings = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.get<ApiResponseEnvelope<SettingsData>>("/api/v1/settings");
      if (response.data && response.data.success) {
        const data = response.data.data;
        setDbSettings(data);
        
        // Sync database state to UI controls
        setSelectedTheme(data.theme);
        setVolumeLevel(Math.round(data.volume * 100));
        setMuteState(data.is_muted);
        setNotifState(data.notifications_enabled);
        setPerfMode(data.performance_mode);

        // Apply preferences to global ThemeContext and AudioService contexts
        setTheme(data.theme);
        setVolume(data.volume);
        
        // Ensure mute matches database
        if (isMuted !== data.is_muted) {
          toggleMuted();
        }
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to synchronize preferences from Security Center database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist preference updates back to database
  const savePreferences = async (updatedFields: Partial<SettingsData>) => {
    setIsSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);
    
    // Construct clean payload matching Pydantic validation expectations
    const payload: Partial<SettingsData> = {};
    if (updatedFields.theme !== undefined) payload.theme = updatedFields.theme;
    if (updatedFields.volume !== undefined) payload.volume = updatedFields.volume;
    if (updatedFields.is_muted !== undefined) payload.is_muted = updatedFields.is_muted;
    if (updatedFields.notifications_enabled !== undefined) payload.notifications_enabled = updatedFields.notifications_enabled;
    if (updatedFields.performance_mode !== undefined) payload.performance_mode = updatedFields.performance_mode;

    try {
      const response = await api.put<ApiResponseEnvelope<SettingsData>>("/api/v1/settings", payload);
      if (response.data && response.data.success) {
        const data = response.data.data;
        setDbSettings(data);
        setInfoMsg("Cockpit settings successfully synchronized to database.");
      } else if (response.error) {
        setErrorMsg(response.error);
      }
    } catch {
      setErrorMsg("Failed to update database preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  // Immediate theme selection updates
  const handleThemeChange = (themeId: string) => {
    playClick();
    setSelectedTheme(themeId);
    setTheme(themeId);
    savePreferences({ theme: themeId });
  };

  // Immediate volume updates
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolumeLevel(val);
    const floatVal = val / 100;
    setVolume(floatVal);
  };

  // Persist volume on slider release (optimistic UI + debounced/released save)
  const handleVolumeRelease = () => {
    savePreferences({ volume: volumeLevel / 100 });
  };

  // Immediate mute toggles
  const handleMuteToggle = () => {
    playClick();
    const nextMute = !muteState;
    setMuteState(nextMute);
    toggleMuted();
    savePreferences({ is_muted: nextMute });
  };

  // Immediate notifications toggles
  const handleNotifToggle = () => {
    playClick();
    const nextNotif = !notifState;
    setNotifState(nextNotif);
    savePreferences({ notifications_enabled: nextNotif });
  };

  // Immediate performance changes
  const handlePerfChange = (mode: string) => {
    playClick();
    setPerfMode(mode);
    savePreferences({ performance_mode: mode });
  };

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm max-w-4xl mx-auto">
        
        {/* HUD TITLE HEADER */}
        <div className="flex justify-between items-center border-b border-primary/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-200 tracking-wider">COCKPIT CONFIGURATION VAULT</h1>
            <p className="text-xs text-gray-500 uppercase mt-1">Manage Commander preferences, sensory audio, and visuals twin twin setups</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-500 uppercase">SYNC STATUS:</span>
            {isLoading ? (
              <span className="px-2 py-0.5 border border-primary/20 text-primary text-[10px] animate-pulse rounded bg-primary/5 uppercase">CONNECTING...</span>
            ) : isSaving ? (
              <span className="px-2 py-0.5 border border-warning/20 text-warning text-[10px] animate-pulse rounded bg-warning/5 uppercase">SAVING PREFERENCES...</span>
            ) : dbSettings ? (
              <span className="px-2 py-0.5 border border-success/20 text-success text-[10px] rounded bg-success/5 uppercase">SYNCHRONIZED</span>
            ) : (
              <span className="px-2 py-0.5 border border-[#EF4444]/20 text-[#EF4444] text-[10px] rounded bg-[#EF4444]/5 uppercase">OFFLINE (CACHE ACTIVE)</span>
            )}
          </div>
        </div>

        {/* FEEDBACK alerts */}
        {errorMsg && (
          <div className="text-[11px] text-[#EF4444] bg-[#EF4444]/5 border border-[#EF4444]/20 p-2.5 rounded uppercase">
            ERROR: {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="text-[11px] text-success bg-success/5 border border-success/20 p-2.5 rounded uppercase">
            INFO: {infoMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* PANEL 1: SYSTEM THEME SELECTION */}
          <Panel title="COCKPIT VISUAL THEME">
            <div className="space-y-4">
              <p className="text-[10px] text-gray-500 uppercase">Select active HUD visual overlay theme:</p>
              
              <div className="grid grid-cols-1 gap-2.5">
                {Object.values(themes).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    className={`p-3.5 border rounded flex flex-col justify-between items-start transition select-none text-left ${
                      selectedTheme === theme.id
                        ? "border-primary bg-primary/5 text-white shadow-[0_0_12px_rgba(0,114,255,0.1)]"
                        : "border-primary/10 bg-black/30 hover:border-primary/30 text-gray-400"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-xs uppercase">{theme.name}</span>
                      {selectedTheme === theme.id && (
                        <span className="text-[9px] border border-primary px-1.5 py-0.2 rounded text-primary uppercase font-bold text-glow">ACTIVE</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: theme.primary }} title="Primary Color" />
                      <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: theme.secondary }} title="Secondary Color" />
                      <span className="text-[9px] text-gray-600 font-mono">PANEL: {theme.panel} | BG: {theme.background}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* PANEL 2: SENSORY AUDIO CONTROLS */}
          <div className="space-y-6">
            <Panel title="SENSORY AUDIO ENGINE">
              <div className="space-y-6">
                
                {/* Master Volume slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">MASTER SYSTEM VOLUME</span>
                    <span className="text-xs text-primary font-bold text-glow">{volumeLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volumeLevel}
                    onChange={handleVolumeChange}
                    onMouseUp={handleVolumeRelease}
                    onTouchEnd={handleVolumeRelease}
                    disabled={muteState}
                    className="w-full h-1 bg-black border border-primary/20 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <div className="flex justify-between text-[8px] text-gray-600 mt-1 uppercase">
                    <span>min</span>
                    <span>nominal</span>
                    <span>max</span>
                  </div>
                </div>

                {/* Master Mute checkbox */}
                <div className="flex items-center justify-between border-t border-primary/10 pt-4">
                  <div>
                    <span className="text-xs text-gray-300 font-bold uppercase block">MUTE SYSTEM AUDIO</span>
                    <span className="text-[9px] text-gray-600 uppercase block mt-0.5">Silences button clicks and alarm buzzers</span>
                  </div>
                  <button
                    onClick={handleMuteToggle}
                    className={`px-4 py-1.5 border font-bold uppercase rounded text-xs transition active:scale-95 ${
                      muteState
                        ? "border-[#EF4444] text-[#EF4444] bg-[#EF4444]/5 text-glow-danger"
                        : "border-primary/30 text-gray-400 hover:border-primary"
                    }`}
                  >
                    {muteState ? "MUTED" : "UNMUTED"}
                  </button>
                </div>

              </div>
            </Panel>

            {/* PANEL 3: TELEMETRY NOTIFICATIONS & PERFORMANCE GRAPHICS */}
            <Panel title="INTERFACE CONFIG">
              <div className="space-y-6">
                
                {/* Notification Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-300 font-bold uppercase block">CRITICAL NOTIFICATIONS</span>
                    <span className="text-[9px] text-gray-600 uppercase block mt-0.5">Dispatches banner popups during target locking</span>
                  </div>
                  <button
                    onClick={handleNotifToggle}
                    className={`px-4 py-1.5 border font-bold uppercase rounded text-xs transition active:scale-95 ${
                      notifState
                        ? "border-success text-success bg-success/5 text-glow"
                        : "border-primary/30 text-gray-400 hover:border-primary"
                    }`}
                  >
                    {notifState ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                {/* Graphics Mode selection */}
                <div className="border-t border-primary/10 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-gray-300 font-bold uppercase block">PERFORMANCE GRAPHICS</span>
                      <span className="text-[9px] text-gray-600 uppercase block mt-0.5">Optimizes Cesium WebGL framerates for target tracking</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePerfChange("quality")}
                      className={`py-2 border font-bold uppercase rounded text-[10px] transition active:scale-95 ${
                        perfMode === "quality"
                          ? "border-primary text-black bg-primary font-bold shadow-[0_0_8px_#0072FF]"
                          : "border-primary/10 text-gray-400 hover:border-primary/25 bg-black/10"
                      }`}
                    >
                      QUALITY RENDER
                    </button>
                    <button
                      onClick={() => handlePerfChange("performance")}
                      className={`py-2 border font-bold uppercase rounded text-[10px] transition active:scale-95 ${
                        perfMode === "performance"
                          ? "border-primary text-black bg-primary font-bold shadow-[0_0_8px_#0072FF]"
                          : "border-primary/10 text-gray-400 hover:border-primary/25 bg-black/10"
                      }`}
                    >
                      MAX FRAMERATE
                    </button>
                  </div>
                </div>

              </div>
            </Panel>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
}
