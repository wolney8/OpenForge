export type LedgerIssueTone = "info" | "orange" | "warning" | "danger";

const issueTonePriority: Record<LedgerIssueTone, number> = {
  danger: 4,
  warning: 3,
  orange: 2,
  info: 1,
};

export function sortIssueBadgesByPriority<T extends { tone: LedgerIssueTone }>(badges: T[]): T[] {
  return badges
    .map((badge, index) => ({ badge, index }))
    .sort(
      (left, right) =>
        issueTonePriority[right.badge.tone] - issueTonePriority[left.badge.tone] ||
        left.index - right.index
    )
    .map(({ badge }) => badge);
}
