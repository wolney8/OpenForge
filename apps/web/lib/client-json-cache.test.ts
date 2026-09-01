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
});
