import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchJsonAndCache,
  invalidateCachedJson,
  readCachedJson,
  writeCachedJson,
} from "./client-json-cache";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client-json-cache", () => {
  it("returns recently cached JSON by URL", () => {
    const url = "/api/cache-test/profile-rows";
    writeCachedJson(url, [{ id: "ROW-1" }]);

    expect(readCachedJson<Array<{ id: string }>>(url)).toEqual([{ id: "ROW-1" }]);
  });

  it("expires old entries using the provided maximum age", () => {
    const url = "/api/cache-test/expired";
    writeCachedJson(url, { ok: true });

    expect(readCachedJson(url, -1)).toBeNull();
  });

  it("invalidates entries by exact URL or prefix", () => {
    writeCachedJson("/api/cache-test/profile-a/free-bets", [{ id: "A" }]);
    writeCachedJson("/api/cache-test/profile-a/sportsbook-bets", [{ id: "B" }]);
    writeCachedJson("/api/cache-test/profile-b/free-bets", [{ id: "C" }]);

    invalidateCachedJson("/api/cache-test/profile-a");

    expect(readCachedJson("/api/cache-test/profile-a/free-bets")).toBeNull();
    expect(readCachedJson("/api/cache-test/profile-a/sportsbook-bets")).toBeNull();
    expect(readCachedJson("/api/cache-test/profile-b/free-bets")).toEqual([{ id: "C" }]);
  });

  it("shares equivalent in-flight reads without an abort signal", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetchMock = vi.fn(async () => {
      await gate;
      return new Response(JSON.stringify([{ id: "ROW-1" }]), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchJsonAndCache<Array<{ id: string }>>("/api/cache-test/shared");
    const second = fetchJsonAndCache<Array<{ id: string }>>("/api/cache-test/shared");
    release?.();

    await expect(Promise.all([first, second])).resolves.toEqual([
      [{ id: "ROW-1" }],
      [{ id: "ROW-1" }],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancels one consumer without cancelling or duplicating the shared request", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetchMock = vi.fn(async () => {
      await gate;
      return new Response(JSON.stringify([{ id: "ROW-2" }]), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const cancelled = fetchJsonAndCache<Array<{ id: string }>>(
      "/api/cache-test/cancelled-consumer", { signal: controller.signal },
    );
    const current = fetchJsonAndCache<Array<{ id: string }>>(
      "/api/cache-test/cancelled-consumer",
    );
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    release?.();
    await expect(current).resolves.toEqual([{ id: "ROW-2" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts and discards an invalidated in-flight request before a fresh read", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
      if (fetchMock.mock.calls.length === 2) resolve(new Response(JSON.stringify({ range: "new" }), {
        headers: { "Content-Type": "application/json" }, status: 200,
      }));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const stale = fetchJsonAndCache<{ range: string }>("/api/cache-test/range");
    invalidateCachedJson("/api/cache-test/range");
    await expect(stale).rejects.toMatchObject({ name: "AbortError" });
    await expect(fetchJsonAndCache<{ range: string }>("/api/cache-test/range"))
      .resolves.toEqual({ range: "new" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readCachedJson("/api/cache-test/range")).toEqual({ range: "new" });
  });
});
