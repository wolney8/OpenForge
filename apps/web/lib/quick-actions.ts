export type ResolvedQuickAction = {
  preset_id: string;
  label: string;
  ledger_type: string;
  enabled: boolean;
  availability: "eligible" | "limited" | "blocked";
  availability_reason: string;
  sort_order?: number;
  is_favourite?: boolean;
  favourite_order?: number;
  enforced?: boolean;
};

/** Global required actions take the fixed four-slot carousel budget first. */
export function resolveVisibleQuickActions<T extends ResolvedQuickAction>(
  records: T[],
  ledgerType: string,
  limit = 4,
): T[] {
  const eligible = records.filter((record) => record.ledger_type === ledgerType && record.enabled && record.availability !== "blocked");
  const enforced = eligible.filter((record) => record.enforced).sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.label.localeCompare(right.label));
  const remaining = eligible.filter((record) => !record.enforced);
  const favourites = remaining.filter((record) => record.is_favourite).sort((left, right) => (left.favourite_order ?? 0) - (right.favourite_order ?? 0) || left.label.localeCompare(right.label));
  const optional = remaining.filter((record) => !record.is_favourite).sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.label.localeCompare(right.label));
  return [...enforced, ...favourites, ...optional].slice(0, limit);
}
