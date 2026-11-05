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

/** Accept only the combined ledger's own view state as a return destination. */
export function safeCombinedLedgerReturn(module: CombinedLedgerModule, requested: string | undefined): string | undefined {
  if (!requested || requested.length > 600) return undefined;
  const path = `/tracker/${module}`;
  if (requested === path) return path;
  if (!requested.startsWith(`${path}?`)) return undefined;
  const query = new URLSearchParams(requested.slice(path.length + 1));
  const allowed = new Set(["profile", "q", "sort", "desc", "page", "size"]);
  if ([...query.keys()].some(key => !allowed.has(key) || query.getAll(key).length !== 1)) return undefined;
  const profile = query.get("profile");
  if (profile && !/^[A-Za-z0-9_-]{1,120}$/.test(profile)) return undefined;
  const sort = query.get("sort");
  if (sort && !/^[A-Za-z][A-Za-z0-9_]{0,50}$/.test(sort)) return undefined;
  if (query.has("desc") && query.get("desc") !== "1") return undefined;
  for (const key of ["page", "size"]) if (query.has(key) && !/^[0-9]{1,4}$/.test(query.get(key) ?? "")) return undefined;
  return `${path}?${query.toString()}`;
}
