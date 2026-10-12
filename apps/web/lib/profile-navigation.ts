const profileScopedSections = new Set([
  "dashboard", "accounts", "sportsbook-bets", "free-bets", "casino-offers",
  "each-way-extra-places", "cash-adjustments", "reports", "settings",
]);

/** Preserve a list-level Profile location without carrying record-specific query state. */
export function resolveEquivalentProfileRoute(pathname: string, profileId: string): string {
  const section = pathname.match(/^\/profiles\/[^/]+\/tracker\/([^/?#]+)/)?.[1];
  return `/profiles/${profileId}/tracker/${section && profileScopedSections.has(section) ? section : "dashboard"}`;
}
