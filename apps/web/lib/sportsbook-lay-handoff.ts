/** Single-use, same-tab unsaved input handoff. The source/API remains authoritative. */
const key = (profileId: string, recordId: string) => `pd.sportsbook.lay-draft.${encodeURIComponent(profileId)}.${encodeURIComponent(recordId)}`;

export function stageSportsbookLayDraft(profileId: string, recordId: string, value: string): void {
  sessionStorage.setItem(key(profileId, recordId), value);
}

export function takeSportsbookLayDraft(profileId: string, recordId: string): string | null {
  const saved = sessionStorage.getItem(key(profileId, recordId));
  sessionStorage.removeItem(key(profileId, recordId));
  return saved;
}
