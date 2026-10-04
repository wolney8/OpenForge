export type ReportProfileScopeMode = "active" | "inactive" | "all" | "custom";
export type ReportProfileSelection = {
  selectedIds: string[];
  archivedIds: string[];
  scope?: ReportProfileScopeMode;
};

type ProfileOption = { profileId: string; status: string };

export function isActiveReportProfile(status: string): boolean {
  return status.trim().toLowerCase() === "active";
}

export function profileIdsForReportScope(
  scope: Exclude<ReportProfileScopeMode, "custom">,
  profiles: ProfileOption[],
): string[] {
  if (scope === "all") return profiles.map((profile) => profile.profileId);
  return profiles
    .filter((profile) => isActiveReportProfile(profile.status) === (scope === "active"))
    .map((profile) => profile.profileId);
}

export function restoreReportProfileSelection(
  stored: ReportProfileSelection | null,
  profiles: ProfileOption[],
  fallback: string[],
): string[] {
  if (!Array.isArray(stored?.selectedIds) || !Array.isArray(stored?.archivedIds)) return fallback;
  const allowed = [...new Set(stored.selectedIds)].filter((id) => {
    const profile = profiles.find((item) => item.profileId === id);
    return profile && (profile.status.toLowerCase() !== "archived" || stored.archivedIds.includes(id));
  });
  return allowed.length ? allowed : fallback;
}

export function resolveReportProfileSelection(
  stored: ReportProfileSelection | null,
  profiles: ProfileOption[],
): { scope: ReportProfileScopeMode; selectedIds: string[] } {
  const activeIds = profileIdsForReportScope("active", profiles);
  if (!stored) return { scope: "active", selectedIds: activeIds };
  const scope = stored.scope;
  if (scope && scope !== "custom") {
    return { scope, selectedIds: profileIdsForReportScope(scope, profiles) };
  }
  const selectedIds = restoreReportProfileSelection(stored, profiles, activeIds);
  const selectedSet = new Set(selectedIds);
  const isLegacyActiveSelection = !scope && selectedIds.length === activeIds.length &&
    activeIds.every((id) => selectedSet.has(id));
  return { scope: isLegacyActiveSelection ? "active" : "custom", selectedIds };
}
