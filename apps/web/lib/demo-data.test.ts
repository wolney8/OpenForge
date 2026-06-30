import { describe, expect, it } from "vitest";
import { getProfile } from "./tracker-data";

describe("demo profile registry", () => {
  it("returns an approved demo profile by id", async () => {
    await expect(getProfile("profile-demo-001")).resolves.toMatchObject({
      profileCode: "ALPHA-001",
    });
  });

  it("returns undefined for an unknown profile", async () => {
    await expect(getProfile("missing-profile")).resolves.toBeUndefined();
  });
});
