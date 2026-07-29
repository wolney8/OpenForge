import { describe, expect, it } from "vitest";
import {
  invalidateCachedJson,
  readCachedJson,
  writeCachedJson,
} from "./client-json-cache";

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
});
