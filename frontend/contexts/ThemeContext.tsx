"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { themes, ThemeTokens, defaultTheme } from "../config/theme";

interface ThemeContextType {
  activeTheme: ThemeTokens;
  setTheme: (themeId: string) => void;

  accentColor: string | null;
  setAccentColor: (color: string | null) => void;

  panelOpacity: number;
  setPanelOpacity: (opacity: number) => void;

  glowIntensity: number;
  setGlowIntensity: (intensity: number) => void;

  animationSpeed: number;
  setAnimationSpeed: (speed: number) => void;

  borderRadius: string;
  setBorderRadius: (radius: string) => void;

  fontSize: string;
  setFontSize: (size: string) => void;

  syncWithDatabase: (settings: {
    theme: string;
    accent_color?: string | null;
    panel_opacity: number;
    glow_intensity: number;
    animation_speed: number;
    border_radius: string;
    font_size: string;
  }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Sync state from LocalStorage on first render to prevent FOUC
  const [themeId, setThemeIdState] = useState<string>("default");
  const [accentColor, setAccentColorState] = useState<string | null>(null);
  const [panelOpacity, setPanelOpacityState] = useState<number>(0.85);
  const [glowIntensity, setGlowIntensityState] = useState<number>(1.0);
  const [animationSpeed, setAnimationSpeedState] = useState<number>(1.0);
  const [borderRadius, setBorderRadiusState] = useState<string>("4px");
  const [fontSize, setFontSizeState] = useState<string>("14px");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("mridansh_theme") || "default";
      const storedAccent = localStorage.getItem("mridansh_accent_color");
      const storedOpacity = localStorage.getItem("mridansh_panel_opacity");
      const storedGlow = localStorage.getItem("mridansh_glow_intensity");
      const storedSpeed = localStorage.getItem("mridansh_animation_speed");
      const storedRadius = localStorage.getItem("mridansh_border_radius");
      const storedSize = localStorage.getItem("mridansh_font_size");

      if (themes[storedTheme]) setThemeIdState(storedTheme);
      if (storedAccent !== null) setAccentColorState(storedAccent === "null" ? null : storedAccent);
      if (storedOpacity !== null) setPanelOpacityState(parseFloat(storedOpacity));
      if (storedGlow !== null) setGlowIntensityState(parseFloat(storedGlow));
      if (storedSpeed !== null) setAnimationSpeedState(parseFloat(storedSpeed));
      if (storedRadius !== null) setBorderRadiusState(storedRadius);
      if (storedSize !== null) setFontSizeState(storedSize);
    }
  }, []);

  const activeTheme = themes[themeId] || defaultTheme;

  const setTheme = (id: string) => {
    if (themes[id]) {
      setThemeIdState(id);
      localStorage.setItem("mridansh_theme", id);
      
      // When theme preset is updated, reset custom overrides to the preset's defaults
      const preset = themes[id];
      setAccentColorState(null);
      setPanelOpacityState(preset.panelOpacity);
      setGlowIntensityState(preset.glowIntensity);
      setAnimationSpeedState(preset.animationSpeed);
      setBorderRadiusState(preset.borderRadius);
      setFontSizeState(preset.fontSize);

      localStorage.removeItem("mridansh_accent_color");
      localStorage.setItem("mridansh_panel_opacity", String(preset.panelOpacity));
      localStorage.setItem("mridansh_glow_intensity", String(preset.glowIntensity));
      localStorage.setItem("mridansh_animation_speed", String(preset.animationSpeed));
      localStorage.setItem("mridansh_border_radius", preset.borderRadius);
      localStorage.setItem("mridansh_font_size", preset.fontSize);
    }
  };

  const setAccentColor = (color: string | null) => {
    setAccentColorState(color);
    if (color === null) {
      localStorage.removeItem("mridansh_accent_color");
    } else {
      localStorage.setItem("mridansh_accent_color", color);
    }
  };

  const setPanelOpacity = (val: number) => {
    setPanelOpacityState(val);
    localStorage.setItem("mridansh_panel_opacity", String(val));
  };

  const setGlowIntensity = (val: number) => {
    setGlowIntensityState(val);
    localStorage.setItem("mridansh_glow_intensity", String(val));
  };

  const setAnimationSpeed = (val: number) => {
    setAnimationSpeedState(val);
    localStorage.setItem("mridansh_animation_speed", String(val));
  };

  const setBorderRadius = (val: string) => {
    setBorderRadiusState(val);
    localStorage.setItem("mridansh_border_radius", val);
  };

  const setFontSize = (val: string) => {
    setFontSizeState(val);
    localStorage.setItem("mridansh_font_size", val);
  };

  const syncWithDatabase = (settings: {
    theme: string;
    accent_color?: string | null;
    panel_opacity: number;
    glow_intensity: number;
    animation_speed: number;
    border_radius: string;
    font_size: string;
  }) => {
    if (themes[settings.theme]) setThemeIdState(settings.theme);
    setAccentColorState(settings.accent_color || null);
    setPanelOpacityState(settings.panel_opacity);
    setGlowIntensityState(settings.glow_intensity);
    setAnimationSpeedState(settings.animation_speed);
    setBorderRadiusState(settings.border_radius);
    setFontSizeState(settings.font_size);

    localStorage.setItem("mridansh_theme", settings.theme);
    if (settings.accent_color) {
      localStorage.setItem("mridansh_accent_color", settings.accent_color);
    } else {
      localStorage.removeItem("mridansh_accent_color");
    }
    localStorage.setItem("mridansh_panel_opacity", String(settings.panel_opacity));
    localStorage.setItem("mridansh_glow_intensity", String(settings.glow_intensity));
    localStorage.setItem("mridansh_animation_speed", String(settings.animation_speed));
    localStorage.setItem("mridansh_border_radius", settings.border_radius);
    localStorage.setItem("mridansh_font_size", settings.font_size);
  };

  // Bind reactive state to root element CSS properties
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;

      // Remove previous class mappings
      Object.keys(themes).forEach((tId) => {
        root.classList.remove(`theme-${tId}`);
      });
      root.classList.add(`theme-${activeTheme.id}`);

      // Apply Base Color Tokens
      root.style.setProperty("--color-background", activeTheme.background);
      root.style.setProperty("--color-panel", activeTheme.panel);
      root.style.setProperty("--color-success", activeTheme.success);
      root.style.setProperty("--color-warning", activeTheme.warning);
      root.style.setProperty("--color-danger", activeTheme.danger);

      // Precedence: Custom accentColor override -> Preset primary accent
      const effectiveAccent = accentColor || activeTheme.primary;
      root.style.setProperty("--color-primary", effectiveAccent);
      root.style.setProperty("--color-primary-glow", accentColor ? `${accentColor}80` : activeTheme.primaryGlow);
      
      // Calculate dynamic secondary color from primary accent if overridden
      const effectiveSecondary = accentColor ? `${accentColor}cc` : activeTheme.secondary;
      root.style.setProperty("--color-secondary", effectiveSecondary);

      // Apply Layout and Effect Parameters
      root.style.setProperty("--panel-opacity", String(panelOpacity));
      root.style.setProperty("--glow-intensity", String(glowIntensity));
      root.style.setProperty("--border-radius", borderRadius);
      root.style.setProperty("--font-size", fontSize);

      // Animation speed accessibility scaling overrides
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const applySpeedScale = () => {
        if (mediaQuery.matches) {
          root.style.setProperty("--animation-speed-scale", "0");
        } else {
          root.style.setProperty("--animation-speed-scale", String(animationSpeed));
        }
      };

      applySpeedScale();
      mediaQuery.addEventListener("change", applySpeedScale);
      return () => {
        mediaQuery.removeEventListener("change", applySpeedScale);
      };
    }
  }, [themeId, activeTheme, accentColor, panelOpacity, glowIntensity, animationSpeed, borderRadius, fontSize]);

  return (
    <ThemeContext.Provider
      value={{
        activeTheme,
        setTheme,
        accentColor,
        setAccentColor,
        panelOpacity,
        setPanelOpacity,
        glowIntensity,
        setGlowIntensity,
        animationSpeed,
        setAnimationSpeed,
        borderRadius,
        setBorderRadius,
        fontSize,
        setFontSize,
        syncWithDatabase,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
