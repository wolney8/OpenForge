"use client";

import { redirectExpiredSession } from "./session-inactivity";

type CacheEntry<T> = {
  cachedAt: number;
  data: T;
};

const jsonCache = new Map<string, CacheEntry<unknown>>();
type InFlightJsonRequest = {
  controller: AbortController;
  promise: Promise<unknown>;
};
const inFlightJsonRequests = new Map<string, InFlightJsonRequest>();

export const TRACKER_STALE_WHILE_REFRESH_MS = 300_000;

export class JsonRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Request failed with status ${status}`);
    this.name = "JsonRequestError";
  }
}

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
  for (const [key, request] of inFlightJsonRequests.entries()) {
    if (key === urlOrPrefix || key.startsWith(urlOrPrefix)) {
      request.controller.abort();
      inFlightJsonRequests.delete(key);
    }
  }
}

export async function fetchJsonAndCache<T>(
  url: string,
  options: { signal?: AbortSignal } = {}
): Promise<T> {
  const request = async (signal: AbortSignal) => {
    const response = await fetch(url, { cache: "no-store", signal });
    if (!response.ok) {
      await redirectExpiredSession(response);
      throw new JsonRequestError(response.status);
    }
    return writeCachedJson(url, (await response.json()) as T);
  };

  const current = inFlightJsonRequests.get(url);
  let pending: Promise<T>;
  if (current) {
    pending = current.promise as Promise<T>;
  } else {
    const controller = new AbortController();
    const entry: InFlightJsonRequest = {
      controller,
      promise: Promise.resolve(undefined),
    };
    pending = request(controller.signal).finally(() => {
      if (inFlightJsonRequests.get(url) === entry) inFlightJsonRequests.delete(url);
    });
    entry.promise = pending;
    inFlightJsonRequests.set(url, entry);
  }
  if (!options.signal) return pending;
  if (options.signal.aborted) throw new DOMException("Request cancelled", "AbortError");
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("Request cancelled", "AbortError"));
    options.signal?.addEventListener("abort", abort, { once: true });
    void pending.then(resolve, reject).finally(() => {
      options.signal?.removeEventListener("abort", abort);
    });
  });
}
