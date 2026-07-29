"use client";

type CacheEntry<T> = {
  cachedAt: number;
  data: T;
};

const jsonCache = new Map<string, CacheEntry<unknown>>();

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
  const response = await fetch(url, { cache: "no-store", signal: options.signal });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return writeCachedJson(url, (await response.json()) as T);
}
