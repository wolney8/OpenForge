export type SummaryLoadProfile = {
  profileId: string;
  displayName: string;
  profileCode: string;
  status: string;
};

export function resolveCrossProfileSummaryLoadIds({
  profiles,
  selectedProfileIds,
  includeDirectoryPage,
  directoryStatus,
  directoryQuery,
  directoryPage,
  directoryPageSize,
  pinnedProfileIds,
  explicitProfileIds = [],
}: {
  profiles: SummaryLoadProfile[];
  selectedProfileIds: string[];
  includeDirectoryPage: boolean;
  directoryStatus: string;
  directoryQuery: string;
  directoryPage: number;
  directoryPageSize: number;
  pinnedProfileIds: string[];
  explicitProfileIds?: Array<string | null | undefined>;
}): string[] {
  const requested = new Set(selectedProfileIds);
  if (includeDirectoryPage) {
    const normalizedQuery = directoryQuery.trim().toLowerCase();
    profiles
      .filter(
        (profile) =>
          (directoryStatus === "all" || profile.status === directoryStatus) &&
          (!normalizedQuery ||
            profile.displayName.toLowerCase().includes(normalizedQuery) ||
            profile.profileCode.toLowerCase().includes(normalizedQuery))
      )
      .sort((left, right) => {
        const pinDifference =
          Number(pinnedProfileIds.includes(right.profileId)) -
          Number(pinnedProfileIds.includes(left.profileId));
        return pinDifference || left.displayName.localeCompare(right.displayName);
      })
      .slice((directoryPage - 1) * directoryPageSize, directoryPage * directoryPageSize)
      .forEach((profile) => requested.add(profile.profileId));
  }
  explicitProfileIds.forEach((profileId) => {
    if (profileId) requested.add(profileId);
  });
  return [...requested].sort();
}
