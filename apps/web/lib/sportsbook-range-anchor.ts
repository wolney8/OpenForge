/** Existing Sportsbook ledger range meaning, shared by Profile and combined browsing. */
export function sportsbookRangeAnchor<T extends object>(row: T): Date | null {
  const parse = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const dates = row as { date_settled?: unknown; created_at?: unknown };
  return parse(dates.date_settled) ?? parse(dates.created_at);
}

export function isWithinSportsbookRange(value: Date | null, range: { start: Date; end: Date }): boolean {
  return value !== null && value >= range.start && value <= range.end;
}
