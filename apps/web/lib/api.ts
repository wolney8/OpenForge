const configuredApiBaseUrl = process.env.NEXT_PUBLIC_OPENFORGE_API_BASE_URL?.trim();

export const apiBaseUrl =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl.replace(/\/+$/, "")
    : typeof window === "undefined"
      ? "http://127.0.0.1:8010"
      : "/api";
