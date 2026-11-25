/** The Sportsbook API compares this opaque row revision inside its write transaction. */
export function sportsbookRevisionHeader(revision: unknown): { "X-Expected-Record-Revision": string } {
  if (typeof revision !== "string" || !revision.trim()) {
    throw new Error("The Sportsbook record revision is unavailable. Reload this bet before saving.");
  }
  return { "X-Expected-Record-Revision": revision };
}
