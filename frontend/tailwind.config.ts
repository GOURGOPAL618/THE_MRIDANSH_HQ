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
        background: "var(--color-background)",
        panel: "var(--color-panel)",
        primary: {
          DEFAULT: "var(--color-primary)",
          glow: "var(--color-primary-glow)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 calc(15px * var(--glow-intensity)) var(--color-primary-glow)",
        "cyan-glow": "0 0 calc(15px * var(--glow-intensity)) var(--color-primary-glow)",
        "red-glow": "0 0 calc(15px * var(--glow-intensity)) rgba(239, 68, 68, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
