"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      className="icon-button"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true">{isDark ? "Light" : "Dark"}</span>
      <strong>{isDark ? "Sun" : "Moon"}</strong>
    </button>
  );
}
