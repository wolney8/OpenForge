import type { CombinedLedgerModule } from "@/lib/profile-scope";
import { isWithinSportsbookRange, sportsbookRangeAnchor } from "@/lib/sportsbook-range-anchor";

type DatedLedger = Exclude<CombinedLedgerModule, "accounts">;

function recordedDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The date anchor already used by each Profile-owned ledger's range view. */
export function ledgerRangeAnchor(module: DatedLedger, row: object): Date | null {
  if (module === "sportsbook-bets") return sportsbookRangeAnchor(row);
  const source = row as { date_settled?: unknown; expiry_datetime?: unknown; created_at?: unknown; date_settling?: unknown; date_started?: unknown; placed_at?: unknown; adjustment_date?: unknown };
  if (module === "free-bets") return recordedDate(source.date_settled) ?? recordedDate(source.expiry_datetime) ?? recordedDate(source.created_at);
  if (module === "casino-offers") return recordedDate(source.date_settling) ?? recordedDate(source.date_started) ?? recordedDate(source.expiry_datetime);
  if (module === "each-way-extra-places") return recordedDate(source.placed_at);
  return recordedDate(source.adjustment_date);
}

export const isWithinLedgerRange = isWithinSportsbookRange;
