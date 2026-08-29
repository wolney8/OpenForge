export const FUND_MANAGER_DASHBOARD_PATH = "/profiles?view=performance";

export function normalizePostAuthDestination(value: string | null | undefined): string {
  if (!value || value === "/" || value === "/login") {
    return FUND_MANAGER_DASHBOARD_PATH;
  }
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : FUND_MANAGER_DASHBOARD_PATH;
}
