"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { themes, ThemeTokens, defaultTheme } from "../config/theme";

interface ThemeContextType {
  activeTheme: ThemeTokens;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useLocalStorage<string>("mridansh_theme", "default");

  const activeTheme = themes[themeId] || defaultTheme;

  const setTheme = (id: string) => {
    if (themes[id]) {
      setThemeId(id);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      
      // Remove all previous theme classes
      Object.keys(themes).forEach((tId) => {
        root.classList.remove(`theme-${tId}`);
      });

      // Add the active theme class
      root.classList.add(`theme-${activeTheme.id}`);
      
      // Update global CSS styles dynamically for R3F Canvas and other styled blocks if necessary
      root.style.setProperty("--color-background", activeTheme.background);
      root.style.setProperty("--color-panel", activeTheme.panel);
      root.style.setProperty("--color-primary", activeTheme.primary);
      root.style.setProperty("--color-secondary", activeTheme.secondary);
      root.style.setProperty("--color-success", activeTheme.success);
      root.style.setProperty("--color-warning", activeTheme.warning);
      root.style.setProperty("--color-danger", activeTheme.danger);
    }
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme }}>
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
