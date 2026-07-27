export interface ModuleItem {
  id: string;
  name: string;
  path: string;
  iconName: string;
  description: string;
  clearanceLevel: "commander" | "unrestricted";
}

export const MODULES: ModuleItem[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    path: "/dashboard",
    iconName: "dashboard",
    description: "System overview, JCC controls, and quick action cockpit.",
    clearanceLevel: "commander",
  },
  {
    id: "earth",
    name: "Earth Operations",
    path: "/earth",
    iconName: "earth",
    description: "Interactive global orbital paths and terrain tracking overlay.",
    clearanceLevel: "commander",
  },
  {
    id: "radar",
    name: "Radar Control",
    path: "/radar",
    iconName: "radar",
    description: "Futuristic 360-degree target sweep and coordinate scans.",
    clearanceLevel: "commander",
  },
  {
    id: "engine",
    name: "Engine Room",
    path: "/engine",
    iconName: "engine",
    description: "Telemetry diagnostic monitors for the AETHER-MRID1607X core.",
    clearanceLevel: "commander",
  },
  {
    id: "research",
    name: "Research Vault",
    path: "/research",
    iconName: "research",
    description: "Document catalog and notes repository for mission assets.",
    clearanceLevel: "commander",
  },
  {
    id: "datasets",
    name: "Dataset Vault",
    path: "/datasets",
    iconName: "database-zap",
    description: "Data grid files manager and satellite telemetry logs.",
    clearanceLevel: "commander",
  },
  {
    id: "experiments",
    name: "Experiment Lab",
    path: "/experiments",
    iconName: "cog",
    description: "Run scripts and record telemetry test logs.",
    clearanceLevel: "commander",
  },
  {
    id: "logs",
    name: "Mission Logs",
    path: "/logs",
    iconName: "logs",
    description: "Complete chronological system activity timelines.",
    clearanceLevel: "commander",
  },
  {
    id: "security",
    name: "Security Center",
    path: "/security",
    iconName: "security",
    description: "Authorization auditing, logs, and lockdown override switches.",
    clearanceLevel: "commander",
  },
  {
    id: "settings",
    name: "Settings",
    path: "/settings",
    iconName: "cog",
    description: "Cockpit audio volumes, active sub-themes, and security overrides.",
    clearanceLevel: "commander",
  },
  {
    id: "notifications",
    name: "Notifications",
    path: "/notifications",
    iconName: "bell",
    description: "Centralized notification timeline and priority alert history.",
    clearanceLevel: "commander",
  },
  {
    id: "search",
    name: "Search Center",
    path: "/search",
    iconName: "search",
    description: "Universal search engine across notes, telemetry databases, and files.",
    clearanceLevel: "commander",
  },
  {
    id: "integrations",
    name: "Integrations Vault",
    path: "/integrations",
    iconName: "link",
    description: "External API connections control room and JCC integrations diagnostics.",
    clearanceLevel: "commander",
  },
  {
    id: "diagnostics",
    name: "System Observability",
    path: "/diagnostics",
    iconName: "diagnostics",
    description: "Detailed system readiness, database latencies, and storage monitoring.",
    clearanceLevel: "commander",
  },
  {
    id: "ai",
    name: "AI Command Center",
    path: "/ai",
    iconName: "ai",
    description: "Intelligent cockpit assistant to analyze logs, code, datasets, and research.",
    clearanceLevel: "commander",
  },
];
