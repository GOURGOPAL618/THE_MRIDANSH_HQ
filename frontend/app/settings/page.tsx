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
  accent_color?: string | null;
  panel_opacity?: number;
  glow_intensity?: number;
  animation_speed?: number;
  border_radius?: string;
  font_size?: string;
}

interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export default function SettingsPage() {
  const {
    setTheme,
    accentColor,
    setAccentColor,
    setPanelOpacity,
    setGlowIntensity,
    setAnimationSpeed,
    setBorderRadius,
    setFontSize,
    syncWithDatabase,
  } = useThemeContext();

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

  // Local overrides UI states
  const [colorInput, setColorInput] = useState("");
  const [opacityInput, setOpacityInput] = useState(0.85);
  const [glowInput, setGlowInput] = useState(1.0);
  const [speedInput, setSpeedInput] = useState(1.0);
  const [radiusInput, setRadiusInput] = useState("4px");
  const [sizeInput, setSizeInput] = useState("14px");

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

        // Sync local overrides UI states
        setColorInput(data.accent_color || "");
        setOpacityInput(data.panel_opacity ?? 0.85);
        setGlowInput(data.glow_intensity ?? 1.0);
        setSpeedInput(data.animation_speed ?? 1.0);
        setRadiusInput(data.border_radius ?? "4px");
        setSizeInput(data.font_size ?? "14px");

        // Apply preferences to global ThemeContext and AudioService contexts
        setVolume(data.volume);
        
        syncWithDatabase({
          theme: data.theme,
          accent_color: data.accent_color,
          panel_opacity: data.panel_opacity ?? 0.85,
          glow_intensity: data.glow_intensity ?? 1.0,
          animation_speed: data.animation_speed ?? 1.0,
          border_radius: data.border_radius ?? "4px",
          font_size: data.font_size ?? "14px",
        });

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
    
    // Theme Engine Overrides
    if (updatedFields.accent_color !== undefined) payload.accent_color = updatedFields.accent_color;
    if (updatedFields.panel_opacity !== undefined) payload.panel_opacity = updatedFields.panel_opacity;
    if (updatedFields.glow_intensity !== undefined) payload.glow_intensity = updatedFields.glow_intensity;
    if (updatedFields.animation_speed !== undefined) payload.animation_speed = updatedFields.animation_speed;
    if (updatedFields.border_radius !== undefined) payload.border_radius = updatedFields.border_radius;
    if (updatedFields.font_size !== undefined) payload.font_size = updatedFields.font_size;

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
    
    // Preset theme changes reset custom overrides to preset defaults
    const preset = themes[themeId];
    setColorInput("");
    setOpacityInput(preset.panelOpacity);
    setGlowInput(preset.glowIntensity);
    setSpeedInput(preset.animationSpeed);
    setRadiusInput(preset.borderRadius);
    setSizeInput(preset.fontSize);

    savePreferences({
      theme: themeId,
      accent_color: null,
      panel_opacity: preset.panelOpacity,
      glow_intensity: preset.glowIntensity,
      animation_speed: preset.animationSpeed,
      border_radius: preset.borderRadius,
      font_size: preset.fontSize,
    });
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

  // Overrides handles
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setColorInput(val);
    if (/^#[0-9a-fA-F]{3,6}$/.test(val) || val === "") {
      setAccentColor(val === "" ? null : val);
    }
  };

  const handleColorRelease = () => {
    if (colorInput === "" || /^#[0-9a-fA-F]{3,6}$/.test(colorInput)) {
      savePreferences({ accent_color: colorInput === "" ? null : colorInput });
    }
  };

  const handleResetColor = () => {
    playClick();
    setColorInput("");
    setAccentColor(null);
    savePreferences({ accent_color: null });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setOpacityInput(val);
    setPanelOpacity(val);
  };

  const handleOpacityRelease = () => {
    savePreferences({ panel_opacity: opacityInput });
  };

  const handleGlowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setGlowInput(val);
    setGlowIntensity(val);
  };

  const handleGlowRelease = () => {
    savePreferences({ glow_intensity: glowInput });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSpeedInput(val);
    setAnimationSpeed(val);
  };

  const handleSpeedRelease = () => {
    savePreferences({ animation_speed: speedInput });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    playClick();
    const val = e.target.value;
    setRadiusInput(val);
    setBorderRadius(val);
    savePreferences({ border_radius: val });
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    playClick();
    const val = e.target.value;
    setSizeInput(val);
    setFontSize(val);
    savePreferences({ font_size: val });
  };

  return (
    <BaseLayout>
      <div className="space-y-6 font-mono text-sm max-w-4xl mx-auto">
        
        {/* HUD TITLE HEADER */}
        <div className="flex justify-between items-center border-b border-primary/20 pb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-200 tracking-wider">COCKPIT CONFIGURATION VAULT</h1>
            <p className="text-xs text-gray-500 uppercase mt-1">Manage Commander preferences, sensory audio, and visuals settings</p>
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
          <div className="space-y-6">
            <Panel title="COCKPIT VISUAL THEME PRESET">
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 uppercase">Select active HUD visual overlay preset:</p>
                
                <div className="grid grid-cols-1 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {Object.values(themes).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`p-3 border rounded flex flex-col justify-between items-start transition select-none text-left ${
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
                        <div className="w-3.5 h-3.5 rounded border border-white/10" style={{ backgroundColor: theme.primary }} title="Primary Color" />
                        <div className="w-3.5 h-3.5 rounded border border-white/10" style={{ backgroundColor: theme.secondary }} title="Secondary Color" />
                        <span className="text-[9px] text-gray-600 font-mono">OPACITY: {theme.panelOpacity} | GLOW: {theme.glowIntensity}x | RAD: {theme.borderRadius}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
            
            <Panel title="SENSORY AUDIO ENGINE">
              <div className="space-y-6">
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
                    className="w-full h-1 bg-black border border-primary/20 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-40"
                  />
                </div>

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
          </div>

          {/* PANEL 2: CUSTOM THEME OVERRIDES */}
          <div className="space-y-6">
            <Panel title="THEME ENGINE OVERRIDES">
              <div className="space-y-5">
                
                {/* Accent Color picker override */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase">ACCENT COLOR OVERRIDE</span>
                    {accentColor && (
                      <button
                        onClick={handleResetColor}
                        className="text-[9px] text-primary hover:underline uppercase font-bold"
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={colorInput || themes[selectedTheme]?.primary || "#0072FF"}
                      onChange={handleColorChange}
                      onBlur={handleColorRelease}
                      className="w-10 h-8 bg-transparent border border-primary/20 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="HEX COLOR Code (e.g. #FF00FF)"
                      value={colorInput}
                      onChange={handleColorChange}
                      onBlur={handleColorRelease}
                      className="flex-1 bg-black border border-primary/20 text-gray-300 text-xs px-2.5 rounded outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Panel Opacity slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase">PANEL OPACITY</span>
                    <span className="text-xs text-primary font-bold">{Math.round(opacityInput * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={opacityInput}
                    onChange={handleOpacityChange}
                    onMouseUp={handleOpacityRelease}
                    onTouchEnd={handleOpacityRelease}
                    className="w-full h-1 bg-black border border-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Glow Intensity slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase">GLOW INTENSITY</span>
                    <span className="text-xs text-primary font-bold">{glowInput.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.1"
                    value={glowInput}
                    onChange={handleGlowChange}
                    onMouseUp={handleGlowRelease}
                    onTouchEnd={handleGlowRelease}
                    className="w-full h-1 bg-black border border-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Animation Speed slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-gray-500 uppercase">ANIMATION SPEED MULTIPLIER</span>
                    <span className="text-xs text-primary font-bold">
                      {speedInput === 0 ? "STATIC" : `${speedInput.toFixed(1)}x`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="3.0"
                    step="0.2"
                    value={speedInput}
                    onChange={handleSpeedChange}
                    onMouseUp={handleSpeedRelease}
                    onTouchEnd={handleSpeedRelease}
                    className="w-full h-1 bg-black border border-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                {/* Border Radius presets */}
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block mb-2">CORNER BORDER RADIUS</span>
                  <select
                    value={radiusInput}
                    onChange={handleRadiusChange}
                    className="w-full bg-black border border-primary/20 text-gray-300 text-xs p-2 rounded outline-none focus:border-primary"
                  >
                    <option value="0px">0px (Sharp Angles)</option>
                    <option value="2px">2px (Industrial)</option>
                    <option value="4px">4px (Nominal)</option>
                    <option value="8px">8px (Arctic Round)</option>
                    <option value="16px">16px (Circular)</option>
                  </select>
                </div>

                {/* Font Size presets */}
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block mb-2">COCKPIT FONT SIZE</span>
                  <select
                    value={sizeInput}
                    onChange={handleSizeChange}
                    className="w-full bg-black border border-primary/20 text-gray-300 text-xs p-2 rounded outline-none focus:border-primary"
                  >
                    <option value="12px">12px (Dense telemetry)</option>
                    <option value="13px">13px (Compact readout)</option>
                    <option value="14px">14px (Nominal)</option>
                    <option value="16px">16px (Enlarged readouts)</option>
                  </select>
                </div>

              </div>
            </Panel>

            <Panel title="INTERFACE CONFIG">
              <div className="space-y-6">
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
                        : "border-primary/30 text-gray-400"
                    }`}
                  >
                    {notifState ? "ENABLED" : "DISABLED"}
                  </button>
                </div>

                <div className="border-t border-primary/10 pt-4 space-y-3">
                  <div>
                    <span className="text-xs text-gray-300 font-bold uppercase block">PERFORMANCE GRAPHICS</span>
                    <span className="text-[9px] text-gray-600 uppercase block mt-0.5">Optimizes Cesium WebGL framerates for target tracking</span>
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
