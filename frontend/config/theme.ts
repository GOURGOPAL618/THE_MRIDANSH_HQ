export interface ThemeTokens {
  id: string;
  name: string;
  background: string;
  panel: string;
  primary: string;
  primaryGlow: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  fontSans: string;
  fontMono: string;
  glowShadow: string;
}

export const themes: Record<string, ThemeTokens> = {
  default: {
    id: "default",
    name: "Dark Mission Control",
    background: "#05070B",
    panel: "#0E1525",
    primary: "#0072FF",
    primaryGlow: "rgba(0, 114, 255, 0.5)",
    secondary: "#00FFFF",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "0 0 15px rgba(0, 114, 255, 0.5)",
  },
  arctic: {
    id: "arctic",
    name: "Arctic Commander",
    background: "#0b0f19",
    panel: "#162235",
    primary: "#38bdf8",
    primaryGlow: "rgba(56, 189, 248, 0.5)",
    secondary: "#00ffff",
    success: "#34d399",
    warning: "#fbbf24",
    danger: "#f87171",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "0 0 15px rgba(56, 189, 248, 0.5)",
  },
  midnight: {
    id: "midnight",
    name: "Midnight Stealth",
    background: "#020205",
    panel: "#070714",
    primary: "#7c3aed",
    primaryGlow: "rgba(124, 58, 237, 0.5)",
    secondary: "#c084fc",
    success: "#059669",
    warning: "#d97706",
    danger: "#dc2626",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "0 0 15px rgba(124, 58, 237, 0.5)",
  },
  deepspace: {
    id: "deepspace",
    name: "Deep Space Red",
    background: "#070202",
    panel: "#180808",
    primary: "#f43f5e",
    primaryGlow: "rgba(244, 63, 94, 0.5)",
    secondary: "#fb7185",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "0 0 15px rgba(244, 63, 94, 0.5)",
  },
};

export const defaultTheme = themes.default;
