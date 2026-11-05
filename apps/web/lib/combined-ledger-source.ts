import type { CombinedLedgerModule } from "@/lib/profile-scope";
import { formatDisplayDate } from "@/lib/tracker-summary";
import { formatLedgerDateTime } from "@/lib/ledger-date-display";
import { formatFinancialValue } from "@/lib/financial-display";
import { getSportsbookBackBetStatusBadge } from "@/lib/sportsbook-table-workflow";
import { casinoValueLabel, currentFinalValueLabel, displayedCasinoValue, displayedCurrentFinalValue, formatSportsbookSettlesDate, formatUkLedgerDateTime, freeBetBackBetStatus, offerDetails, sourceMoneyNumber } from "@/lib/ledger-row-presentation";

export type LedgerSourceRecord = Record<string, unknown> & { profile_id: string };
export type PresentedLedgerCell = { text: string; money?: number | null; valueLabel?: string };

const moneyKeys: Partial<Record<CombinedLedgerModule, Set<string>>> = {
  accounts: new Set(["current_balance", "pending_withdrawal_amount"]),
  "cash-adjustments": new Set(["amount", "signed_amount"]),
  "each-way-extra-places": new Set(["stake", "winLayStake", "winLiability", "placeLayStake", "placeLiability", "qualLoss", "epProfit"]),
};

function text(row: LedgerSourceRecord, key: string): string {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "string" || typeof value === "number" ? String(value) : "Unavailable";
}

function sourceString(row: LedgerSourceRecord, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function date(row: LedgerSourceRecord, key: string): string {
  const value = row[key];
  return typeof value === "string" ? formatDisplayDate(value) : "Unscheduled";
}

function money(row: LedgerSourceRecord, key: string): PresentedLedgerCell {
  const value = sourceMoneyNumber(row[key]);
  return { text: value === null ? "£ -" : formatFinancialValue(value), money: value };
}

function extraPlaceSourceKey(key: string): string {
  return ({ date: "placed_at", stake: "each_way_stake", backOdds: "back_odds", terms: "place_term_denominator", placeOdds: "place_back_odds", winLayOdds: "win_lay_odds", winLayStake: "win_lay_stake", winLiability: "win_liability", placeLayOdds: "place_lay_odds", placeLayStake: "place_lay_stake", placeLiability: "place_liability", rating: "rating_percent", impliedOdds: "implied_odds", qualLoss: "qualifying_loss", epProfit: "extra_place_profit" } as Record<string, string>)[key] ?? key;
}

/** Uses the same stored read fields and display selectors as each native ledger. */
export function presentLedgerCell(module: CombinedLedgerModule, row: LedgerSourceRecord, key: string): PresentedLedgerCell {
  if (key === "actions") return { text: "" };
  if (module === "sportsbook-bets" || module === "free-bets") {
    if (key === "displayed_value") {
      const source = { reporting_value: sourceString(row, "reporting_value"), final_net_pnl: sourceString(row, "final_net_pnl"), projected_current_pnl: sourceString(row, "projected_current_pnl") };
      const value = displayedCurrentFinalValue(source);
      const numeric = sourceMoneyNumber(value);
      return { text: numeric === null ? "£ -" : formatFinancialValue(numeric), money: numeric, valueLabel: currentFinalValueLabel(source) };
    }
    if (key === "offer_details") return { text: offerDetails({ offer_type: sourceString(row, "offer_type") ?? "", fixture_type: sourceString(row, "fixture_type") ?? "", bet_type: sourceString(row, "bet_type") ?? "", retention_mode: sourceString(row, "retention_mode") ?? "" }, module === "free-bets") };
    if (key === "back_bet_status") return { text: module === "sportsbook-bets" ? getSportsbookBackBetStatusBadge({ status: text(row, "status"), result: text(row, "result") }).label : freeBetBackBetStatus({ status: text(row, "status") }).label };
    if (key === "date_settled" && module === "sportsbook-bets") return { text: formatSportsbookSettlesDate(sourceString(row, key) ?? "") };
    if (key === "date_settled" || key === "expiry_datetime") return { text: date(row, key) };
  }
  if (module === "casino-offers") {
    if (key === "displayed_value") {
      const source = { resolved_net_pnl: sourceString(row, "resolved_net_pnl"), final_net_pnl: sourceString(row, "final_net_pnl"), calc_net_pnl: sourceString(row, "calc_net_pnl") };
      const value = displayedCasinoValue(source);
      const numeric = sourceMoneyNumber(value);
      return { text: numeric === null ? "£ -" : formatFinancialValue(numeric), money: numeric, valueLabel: casinoValueLabel(source) };
    }
    if (key === "date_settling" || key === "expiry_datetime") return { text: date(row, key) };
  }
  if (module === "accounts" && key === "last_balance_update") return { text: date(row, key) };
  if (module === "each-way-extra-places") {
    const sourceKey = extraPlaceSourceKey(key);
    if (key === "date") return { text: formatLedgerDateTime(sourceString(row, sourceKey) ?? "") };
    if (key === "runner") return { text: `${sourceString(row, "runner") || "Runner needed"} · ${sourceString(row, "race") || "Race needed"}` };
    if (key === "terms") return { text: `1 / ${text(row, sourceKey)}` };
    if (key === "epProfit" && text(row, "mode") !== "Extra Place") return { text: "-" };
    if (moneyKeys[module]?.has(key)) return money(row, sourceKey);
    if (key === "rating") {
      const value = sourceMoneyNumber(row[sourceKey]);
      return { text: value === null ? "Rating —" : `Rating ${value.toFixed(2)}%` };
    }
    if (key === "impliedOdds") {
      const value = sourceMoneyNumber(row[sourceKey]);
      return { text: value === null ? "-" : value.toFixed(2) };
    }
    return { text: text(row, sourceKey) };
  }
  if (module === "cash-adjustments" && key === "adjustment_date") return { text: formatUkLedgerDateTime(sourceString(row, key) ?? "") };
  if (moneyKeys[module]?.has(key)) return money(row, key);
  return { text: text(row, key) };
}
