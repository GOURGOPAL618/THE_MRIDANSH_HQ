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
  // Theme Engine Variable Presets
  panelOpacity: number;
  glowIntensity: number;
  animationSpeed: number;
  borderRadius: string;
  fontSize: string;
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
    panelOpacity: 0.85,
    glowIntensity: 1.0,
    animationSpeed: 1.0,
    borderRadius: "4px",
    fontSize: "14px",
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
    panelOpacity: 0.75,
    glowIntensity: 1.5,
    animationSpeed: 1.2,
    borderRadius: "8px",
    fontSize: "14px",
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
    panelOpacity: 0.95,
    glowIntensity: 0.5,
    animationSpeed: 0.6,
    borderRadius: "4px",
    fontSize: "14px",
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
    panelOpacity: 0.90,
    glowIntensity: 1.2,
    animationSpeed: 0.8,
    borderRadius: "6px",
    fontSize: "14px",
  },
  solar: {
    id: "solar",
    name: "Solar Flare",
    background: "#0C0802",
    panel: "#1A1107",
    primary: "#F59E0B",
    primaryGlow: "rgba(245, 158, 11, 0.5)",
    secondary: "#10B981",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "0 0 15px rgba(245, 158, 11, 0.5)",
    panelOpacity: 0.80,
    glowIntensity: 1.4,
    animationSpeed: 1.5,
    borderRadius: "4px",
    fontSize: "14px",
  },
  engineering: {
    id: "engineering",
    name: "Heavy Industrial",
    background: "#0D0303",
    panel: "#1C0B0B",
    primary: "#EF4444",
    primaryGlow: "rgba(239, 68, 68, 0.5)",
    secondary: "#F97316",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "0 0 15px rgba(239, 68, 68, 0.5)",
    panelOpacity: 0.88,
    glowIntensity: 0.8,
    animationSpeed: 1.0,
    borderRadius: "2px",
    fontSize: "13px",
  },
  minimal: {
    id: "minimal",
    name: "Minimal Opaque",
    background: "#090D16",
    panel: "#131924",
    primary: "#94A3B8",
    primaryGlow: "rgba(148, 163, 184, 0.5)",
    secondary: "#64748B",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    fontSans: "Inter, sans-serif",
    fontMono: "JetBrains Mono, monospace",
    glowShadow: "none",
    panelOpacity: 1.0,
    glowIntensity: 0.0,
    animationSpeed: 0.0,
    borderRadius: "0px",
    fontSize: "14px",
  },
};

export const defaultTheme = themes.default;
