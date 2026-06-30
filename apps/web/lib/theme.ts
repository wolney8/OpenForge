export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "openforge-theme";

export function resolveTheme(
  storedTheme: string | null | undefined,
  prefersDark: boolean
): ThemeMode {
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}
