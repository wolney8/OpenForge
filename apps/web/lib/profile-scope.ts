export const combinedLedgerModules = ["accounts", "sportsbook-bets", "free-bets", "casino-offers", "each-way-extra-places", "cash-adjustments"] as const;
export type CombinedLedgerModule = typeof combinedLedgerModules[number];

export function isCombinedLedgerModule(value: string): value is CombinedLedgerModule {
  return combinedLedgerModules.some(module => module === value);
}

/** Route location is the source of viewing scope; local ledger filters remain page state. */
export function routeForProfileScope(pathname: string, profileId: string | null): string {
  const scopedModule = pathname.match(/^\/profiles\/[^/]+\/tracker\/([^/]+)/)?.[1];
  const combinedModule = pathname.match(/^\/tracker\/([^/]+)/)?.[1];
  const ledgerModule = scopedModule ?? combinedModule;
  if (ledgerModule && isCombinedLedgerModule(ledgerModule)) return profileId
    ? `/profiles/${encodeURIComponent(profileId)}/tracker/${ledgerModule}`
    : `/tracker/${ledgerModule}`;
  if (scopedModule === "reports" || pathname === "/reports") return profileId ? `/reports?scope=${encodeURIComponent(profileId)}` : "/reports";
  if (pathname === "/tasks") return profileId ? `/tasks?scope=${encodeURIComponent(profileId)}` : "/tasks";
  if (pathname === "/") return profileId ? `/?scope=${encodeURIComponent(profileId)}` : "/";
  if (scopedModule === "dashboard") return profileId ? `/profiles/${encodeURIComponent(profileId)}/tracker/dashboard` : "/";
  if (scopedModule === "settings") return profileId ? `/profiles/${encodeURIComponent(profileId)}/tracker/settings` : "/settings";
  return profileId ? `/?scope=${encodeURIComponent(profileId)}` : "/";
}

export function scopedGlobalHref(href: string, profileId: string | null): string {
  if (!profileId || !["/", "/tasks", "/reports"].includes(href)) return href;
  return `${href}?scope=${encodeURIComponent(profileId)}`;
}
