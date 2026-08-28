const configuredApiBaseUrl = process.env.NEXT_PUBLIC_OPENFORGE_API_BASE_URL?.trim();
export const apiBaseUrl =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl.replace(/\/+$/, "")
    : "/api";

export function getServerApiBaseUrl(): string {
  const configuredInternalUrl = process.env.OPENFORGE_INTERNAL_API_BASE_URL?.trim();
  if (configuredInternalUrl) return configuredInternalUrl.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}/api`;

  return "http://127.0.0.1:8010";
}

export function serverAuthenticationRequired(): boolean {
  return process.env.OPENFORGE_AUTH_REQUIRED === "true" || Boolean(process.env.VERCEL);
}
