"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  BACK_LAY_THEME_STORAGE_KEY,
  BackLayTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
  resolveBackLayTheme,
  resolveTheme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeMode;
  backLayTheme: BackLayTheme;
  setTheme: (theme: ThemeMode) => void;
  setBackLayTheme: (theme: BackLayTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function applyBackLayTheme(theme: BackLayTheme) {
  document.documentElement.dataset.backlayTheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [backLayTheme, setBackLayThemeState] = useState<BackLayTheme>("smarkets");
  const [isReady, setIsReady] = useState(false);

  const setTheme = (nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const setBackLayTheme = (nextTheme: BackLayTheme) => {
    applyBackLayTheme(nextTheme);
    window.localStorage.setItem(BACK_LAY_THEME_STORAGE_KEY, nextTheme);
    setBackLayThemeState(nextTheme);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const nextTheme = resolveTheme(
        window.localStorage.getItem(THEME_STORAGE_KEY),
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
      const nextBackLayTheme = resolveBackLayTheme(
        window.localStorage.getItem(BACK_LAY_THEME_STORAGE_KEY)
      );

      applyTheme(nextTheme);
      applyBackLayTheme(nextBackLayTheme);
      setThemeState(nextTheme);
      setBackLayThemeState(nextBackLayTheme);
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <ThemeContext.Provider
      value={{ theme, backLayTheme, setTheme, setBackLayTheme, toggleTheme }}
    >
      <div className={isReady ? "theme-ready" : "theme-pending"}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
