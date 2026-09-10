export type ThemeMode = "light" | "dark";
export type BackLayTheme = "smarkets" | "betfair";
export type EachWayColourScheme = "ep" | "back-lay";

export const THEME_STORAGE_KEY = "openforge-theme";
export const BACK_LAY_THEME_STORAGE_KEY = "openforge-back-lay-theme";
export const EACH_WAY_PRESENTATION_STORAGE_KEY = "plum-duff-each-way-presentation";

export function resolveTheme(
  storedTheme: string | null | undefined,
  prefersDark: boolean
): ThemeMode {
  void prefersDark;
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return "dark";
}

export function resolveBackLayTheme(
  storedTheme: string | null | undefined
): BackLayTheme {
  if (storedTheme === "smarkets" || storedTheme === "betfair") {
    return storedTheme;
  }

  return "smarkets";
}

export function resolveEachWayColourScheme(
  storedTheme: string | null | undefined
): EachWayColourScheme {
  return storedTheme === "back-lay" ? "back-lay" : "ep";
}
