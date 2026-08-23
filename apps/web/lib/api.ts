const configuredApiBaseUrl = process.env.NEXT_PUBLIC_OPENFORGE_API_BASE_URL?.trim();
const browserHostname = typeof window !== "undefined" ? window.location.hostname : null;
const localApiHost =
  browserHostname && ["localhost", "127.0.0.1"].includes(browserHostname)
    ? browserHostname
    : "127.0.0.1";
const localApiBaseUrl = `http://${localApiHost}:8010`;
const isLocalBrowser =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const apiBaseUrl =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl.replace(/\/+$/, "")
    : typeof window === "undefined" || isLocalBrowser
      ? localApiBaseUrl
      : "/api";
