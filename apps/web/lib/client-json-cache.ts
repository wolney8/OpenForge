"use client";

import { redirectExpiredSession } from "./session-inactivity";

type CacheEntry<T> = {
  cachedAt: number;
  data: T;
};

const jsonCache = new Map<string, CacheEntry<unknown>>();
const inFlightJsonRequests = new Map<string, Promise<unknown>>();

export const TRACKER_STALE_WHILE_REFRESH_MS = 300_000;

export function readCachedJson<T>(url: string, maxAgeMs = 60_000): T | null {
  const entry = jsonCache.get(url);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > maxAgeMs) {
    jsonCache.delete(url);
    return null;
  }
  return entry.data as T;
}

export function writeCachedJson<T>(url: string, data: T): T {
  jsonCache.set(url, { cachedAt: Date.now(), data });
  return data;
}

export function invalidateCachedJson(urlOrPrefix: string): void {
  for (const key of jsonCache.keys()) {
    if (key === urlOrPrefix || key.startsWith(urlOrPrefix)) {
      jsonCache.delete(key);
    }
  }
}

export async function fetchJsonAndCache<T>(
  url: string,
  options: { signal?: AbortSignal } = {}
): Promise<T> {
  const request = async () => {
    const response = await fetch(url, { cache: "no-store", signal: options.signal });
    if (!response.ok) {
      redirectExpiredSession(response);
      throw new Error(`Request failed with status ${response.status}`);
    }
    return writeCachedJson(url, (await response.json()) as T);
  };

  // Signal-owned requests must remain independently abortable. Stable shell/page
  // reads without a signal can safely share one in-flight request per URL.
  if (options.signal) return request();
  const current = inFlightJsonRequests.get(url) as Promise<T> | undefined;
  if (current) return current;
  const pending = request().finally(() => {
    if (inFlightJsonRequests.get(url) === pending) inFlightJsonRequests.delete(url);
  });
  inFlightJsonRequests.set(url, pending);
  return pending;
}
