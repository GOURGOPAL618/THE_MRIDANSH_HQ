import { useThemeContext } from "../contexts/ThemeContext";

export function useTheme() {
  const { activeTheme, setTheme } = useThemeContext();

  return {
    theme: activeTheme,
    setTheme,
    isDark: true, // System is fundamentally dark-oriented
  };
}
