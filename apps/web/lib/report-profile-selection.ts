export type ReportProfileSelection = { selectedIds: string[]; archivedIds: string[] };

export function restoreReportProfileSelection(
  stored: ReportProfileSelection | null,
  profiles: Array<{ profileId: string; status: string }>,
  fallback: string[],
): string[] {
  if (!Array.isArray(stored?.selectedIds) || !Array.isArray(stored?.archivedIds)) return fallback;
  const allowed = [...new Set(stored.selectedIds)].filter((id) => {
    const profile = profiles.find((item) => item.profileId === id);
    return profile && (profile.status.toLowerCase() !== "archived" || stored.archivedIds.includes(id));
  });
  return allowed.length ? allowed : fallback;
}
