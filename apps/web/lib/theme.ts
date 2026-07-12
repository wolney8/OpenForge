export type ThemeMode = "light" | "dark";
export type BackLayTheme = "smarkets" | "betfair";

export const THEME_STORAGE_KEY = "openforge-theme";
export const BACK_LAY_THEME_STORAGE_KEY = "openforge-back-lay-theme";

export function resolveTheme(
  storedTheme: string | null | undefined,
  prefersDark: boolean
): ThemeMode {
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return prefersDark ? "dark" : "light";
}

export function resolveBackLayTheme(
  storedTheme: string | null | undefined
): BackLayTheme {
  if (storedTheme === "smarkets" || storedTheme === "betfair") {
    return storedTheme;
  }

  return "smarkets";
}
