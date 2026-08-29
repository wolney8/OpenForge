import { describe, expect, it } from "vitest";
import { readRecentProfiles, recordRecentProfile, resolveRecentProfiles } from "./recent-profiles";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("recent Profiles", () => {
  it("orders unique Profile access by most recent use", () => {
    const storage = createStorage();
    recordRecentProfile(storage, { profileId: "profile-a", displayName: "Profile A" }, 100);
    recordRecentProfile(storage, { profileId: "profile-b", displayName: "Profile B" }, 200);
    recordRecentProfile(storage, { profileId: "profile-a", displayName: "Profile A" }, 300);

    expect(readRecentProfiles(storage)).toEqual([
      { profileId: "profile-a", displayName: "Profile A", accessedAt: 300 },
      { profileId: "profile-b", displayName: "Profile B", accessedAt: 200 },
    ]);
  });

  it("returns at most three available non-stale Profile records", () => {
    const storage = createStorage();
    for (const [index, profileId] of ["a", "b", "c", "d", "removed"].entries()) {
      recordRecentProfile(storage, { profileId, displayName: profileId }, index + 1);
    }
    const available = ["a", "b", "c", "d"].map((profileId) => ({
      profile_id: profileId,
      display_name: `Profile ${profileId.toUpperCase()}`,
    }));

    expect(resolveRecentProfiles(storage, available).map((profile) => profile.profile_id)).toEqual([
      "d",
      "c",
      "b",
    ]);
  });

  it("fails closed for malformed browser storage", () => {
    expect(readRecentProfiles({ getItem: () => "not-json" })).toEqual([]);
  });
});
