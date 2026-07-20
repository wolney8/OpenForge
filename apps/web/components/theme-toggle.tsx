"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      className={`icon-button theme-mode-toggle${isDark ? " is-dark" : " is-light"}`}
      data-pd-id="app-shell.theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true" className="theme-mode-icon-stage">
        <span className="material-symbols-outlined theme-mode-icon theme-mode-icon-sun">light_mode</span>
        <span className="material-symbols-outlined theme-mode-icon theme-mode-icon-moon">dark_mode</span>
      </span>
    </button>
  );
}
