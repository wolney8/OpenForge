export type RecentProfile = {
  profileId: string;
  displayName: string;
  accessedAt: number;
};

const storageKey = "plum-duff-recent-profiles";
const maximumStoredProfiles = 12;

export const PROFILE_DIRECTORY_UPDATED_EVENT = "plum-duff:profile-directory-updated";

export function readRecentProfiles(storage: Pick<Storage, "getItem">): RecentProfile[] {
  try {
    const parsed = JSON.parse(storage.getItem(storageKey) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is RecentProfile => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<RecentProfile>;
        return Boolean(
          candidate.profileId &&
          candidate.displayName &&
          typeof candidate.accessedAt === "number" &&
          Number.isFinite(candidate.accessedAt)
        );
      })
      .sort((left, right) => right.accessedAt - left.accessedAt)
      .slice(0, maximumStoredProfiles);
  } catch {
    return [];
  }
}

export function recordRecentProfile(
  storage: Pick<Storage, "getItem" | "setItem">,
  profile: Omit<RecentProfile, "accessedAt">,
  accessedAt = Date.now()
) {
  const next = [
    { ...profile, accessedAt },
    ...readRecentProfiles(storage).filter((entry) => entry.profileId !== profile.profileId),
  ].slice(0, maximumStoredProfiles);
  storage.setItem(storageKey, JSON.stringify(next));
  return next;
}

export function resolveRecentProfiles<T extends { profile_id: string; display_name: string }>(
  storage: Pick<Storage, "getItem">,
  availableProfiles: T[],
  limit = 3
) {
  const availableById = new Map(availableProfiles.map((profile) => [profile.profile_id, profile]));
  return readRecentProfiles(storage)
    .flatMap((recent) => {
      const profile = availableById.get(recent.profileId);
      return profile ? [{ ...profile, accessedAt: recent.accessedAt }] : [];
    })
    .slice(0, limit);
}
