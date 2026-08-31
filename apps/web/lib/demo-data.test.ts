import { describe, expect, it } from "vitest";
import { getModuleRows, getProfile } from "./tracker-data";

describe("demo profile registry", () => {
  it("returns an approved demo profile by id", async () => {
    await expect(getProfile("profile-demo-001")).resolves.toMatchObject({
      profileCode: "ALPHA-001",
    });
  });

  it("returns undefined for an unknown profile", async () => {
    await expect(getProfile("missing-profile")).resolves.toBeUndefined();
  });

  it("does not initialize the local SQLite module fallback when hosted", async () => {
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      await expect(getModuleRows("profile-demo-001", "sportsbook-bets")).resolves.toEqual([]);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
    }
  });
});
