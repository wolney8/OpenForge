import type { CombinedLedgerModule } from "@/lib/profile-scope";
import type { LedgerSourceRecord } from "@/lib/combined-ledger-source";
import { presentLedgerCell } from "@/lib/combined-ledger-source";
import { getSportsbookIssueBadges } from "@/lib/sportsbook-table-workflow";
import { getCasinoOperationalIssueBadges } from "@/lib/operational-actions";
import { accountAttentionReasons, extraPlaceHasIssue, getCashAdjustmentIssueBadges, getFreeBetIssueBadges } from "@/lib/ledger-operational-issues";

export type CombinedLedgerFilter = { key: string; label: string };

/** Exact source-field filters already offered by the corresponding native ledger. */
export const combinedLedgerFilters: Record<CombinedLedgerModule, CombinedLedgerFilter[]> = {
  accounts: [
    { key: "type", label: "Account type" }, { key: "status", label: "Account status" },
    { key: "counts_in_cash_total", label: "Counts in cash" }, { key: "issue_type", label: "Issue" },
  ],
  "sportsbook-bets": [
    { key: "bookmaker", label: "Bookmaker" }, { key: "offer_type", label: "Offer type" },
    { key: "fixture_type", label: "Fixture type" }, { key: "bet_type", label: "Bet type" },
    { key: "match_strategy", label: "Strategy" }, { key: "lay_status", label: "Lay status" },
    { key: "back_bet_status", label: "Back bet status" }, { key: "status", label: "Status" }, { key: "issue_type", label: "Issue" },
  ],
  "free-bets": [
    { key: "bookmaker", label: "Bookmaker" }, { key: "offer_type", label: "Offer type" },
    { key: "fixture_type", label: "Fixture type" }, { key: "bet_type", label: "Bet type" },
    { key: "retention_mode", label: "Retention mode" }, { key: "match_strategy", label: "Strategy" },
    { key: "lay_status", label: "Lay status" }, { key: "back_bet_status", label: "Back bet status" },
    { key: "status", label: "Status" }, { key: "issue_type", label: "Issue" },
  ],
  "casino-offers": [
    { key: "bookmaker", label: "Bookmaker" }, { key: "offer_type", label: "Offer type" },
    { key: "status", label: "Status" }, { key: "result", label: "Result" }, { key: "issue_type", label: "Issue" },
  ],
  "each-way-extra-places": [
    { key: "mode", label: "Mode" }, { key: "bookmaker", label: "Bookmaker" },
    { key: "place_term_denominator", label: "Place terms" }, { key: "win_exchange", label: "Win exchange" },
    { key: "place_exchange", label: "Place exchange" }, { key: "status", label: "Status" },
    { key: "result", label: "Result" }, { key: "issue_type", label: "Issue" },
  ],
  "cash-adjustments": [
    { key: "direction", label: "Direction" }, { key: "adjustment_type", label: "Type" },
    { key: "affects_investment", label: "Affects investment" },
    { key: "affects_cash_snapshot", label: "Affects cash snapshot" },
    { key: "calculation_state", label: "Calculation state" }, { key: "issue_type", label: "Issue" },
  ],
};

function hasStringFields(row: LedgerSourceRecord, fields: string[]): boolean {
  return fields.every(field => typeof row[field] === "string");
}

/** Null means the read contract lacks fields needed to classify this source record. */
export function combinedIssueLabels(module: CombinedLedgerModule, row: LedgerSourceRecord, now = Date.now()): string[] | null {
  if (module === "accounts") {
    if (!hasStringFields(row, ["current_balance", "pending_withdrawal_amount", "lifecycle_status", "status"]) || typeof row.counts_in_cash_total !== "boolean" || !Array.isArray(row.restrictions)) return null;
    return accountAttentionReasons(row as unknown as Parameters<typeof accountAttentionReasons>[0]);
  }
  if (module === "sportsbook-bets") {
    if (!hasStringFields(row, ["status", "result", "date_settled", "partial_lay_reminder_state"]) || typeof row.is_overdue !== "boolean") return null;
    return getSportsbookIssueBadges(row as unknown as Parameters<typeof getSportsbookIssueBadges>[0], now).map(issue => issue.label);
  }
  if (module === "free-bets") {
    if (!hasStringFields(row, ["status", "result", "date_settled", "expiry_datetime"]) || typeof row.is_overdue !== "boolean" || typeof row.counts_as_open !== "boolean") return null;
    return getFreeBetIssueBadges(row as unknown as Parameters<typeof getFreeBetIssueBadges>[0], now).map(issue => issue.label);
  }
  if (module === "casino-offers") {
    if (!hasStringFields(row, ["status", "result", "date_settling"]) || typeof row.is_overdue !== "boolean" || !(row.resolved_net_pnl === null || typeof row.resolved_net_pnl === "string")) return null;
    return getCasinoOperationalIssueBadges(row as unknown as Parameters<typeof getCasinoOperationalIssueBadges>[0]).map(issue => issue.label);
  }
  if (module === "cash-adjustments") {
    if (!hasStringFields(row, ["linked_account"]) || typeof row.affects_investment !== "boolean" || typeof row.affects_cash_snapshot !== "boolean") return null;
    return getCashAdjustmentIssueBadges(row as unknown as Parameters<typeof getCashAdjustmentIssueBadges>[0]).map(issue => issue.label);
  }
  if (!hasStringFields(row, ["calculation_state", "status", "result", "calculation_provenance"])) return null;
  return extraPlaceHasIssue(row as unknown as Parameters<typeof extraPlaceHasIssue>[0]) ? ["All issues"] : [];
}

/** Reuse the native Sportsbook source review severity; never infer it from row text. */
export function combinedIssueTone(module: CombinedLedgerModule, row: LedgerSourceRecord, now = Date.now()): "danger" | "warning" | null {
  if (module === "sportsbook-bets") {
    if (!hasStringFields(row, ["status", "result", "date_settled", "partial_lay_reminder_state"]) || typeof row.is_overdue !== "boolean") return null;
    const issues = getSportsbookIssueBadges(row as unknown as Parameters<typeof getSportsbookIssueBadges>[0], now);
    return issues.some(issue => issue.tone === "danger") ? "danger" : issues.length ? "warning" : null;
  }
  const labels = combinedIssueLabels(module, row, now);
  return labels?.length ? "warning" : null;
}

export function combinedFilterValue(module: CombinedLedgerModule, row: LedgerSourceRecord, key: string): string {
  if (key === "back_bet_status") return presentLedgerCell(module, row, key).text;
  const value = row[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

export function combinedFilterOptions(module: CombinedLedgerModule, rows: LedgerSourceRecord[], key: string): string[] {
  if (!combinedLedgerFilters[module].some(filter => filter.key === key)) return [];
  if (key === "issue_type") {
    const labels = [...new Set(rows.flatMap(row => combinedIssueLabels(module, row) ?? []))].filter(label => label !== "All issues").sort((a, b) => a.localeCompare(b, "en-GB"));
    return ["All issues", ...labels];
  }
  return [...new Set(rows.map(row => combinedFilterValue(module, row, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en-GB", { numeric: true }));
}

export function matchesCombinedLedgerFilters(module: CombinedLedgerModule, row: LedgerSourceRecord, selected: Record<string, string>): boolean {
  return combinedLedgerFilters[module].every(filter => {
    const value = selected[filter.key];
    if (!value) return true;
    if (filter.key === "issue_type") {
      const labels = combinedIssueLabels(module, row);
      return labels !== null && (value === "All issues" ? labels.length > 0 : labels.includes(value));
    }
    return combinedFilterValue(module, row, filter.key) === value;
  });
}
