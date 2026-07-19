import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./layouts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#05070B",
        panel: "#0E1525",
        primary: {
          DEFAULT: "#0072FF",
          glow: "#00d2ff",
        },
        secondary: {
          DEFAULT: "#00FFFF",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(0, 114, 255, 0.5)",
        "cyan-glow": "0 0 15px rgba(0, 255, 255, 0.5)",
        "red-glow": "0 0 15px rgba(239, 68, 68, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
