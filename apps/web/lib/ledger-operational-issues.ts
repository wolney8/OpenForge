import { accountMoneyError } from "@/lib/account-money";

export type AccountAttentionSource = {
  counts_in_cash_total: boolean; current_balance: string; pending_withdrawal_amount: string;
  lifecycle_status: string; status: string; restrictions: string[];
};

export function accountAttentionReasons(row: AccountAttentionSource): string[] {
  const reasons: string[] = [];
  if (row.counts_in_cash_total && (!row.current_balance.trim() || accountMoneyError(row.current_balance))) reasons.push("Current Balance needs review");
  if (row.pending_withdrawal_amount.trim() && accountMoneyError(row.pending_withdrawal_amount)) reasons.push("Pending withdrawal needs review");
  if (row.lifecycle_status === "Not Signed Up" || row.status === "Not Signed Up") reasons.push("Not signed up");
  if (row.lifecycle_status === "Pending Sign Up") reasons.push("Sign-up pending");
  if (row.lifecycle_status === "Verification Pending") reasons.push("Verification pending");
  if (row.restrictions.length > 0) reasons.push("Account restrictions recorded");
  return [...new Set(reasons)];
}

export type FreeBetIssueSource = {
  status: string; result: string; date_settled: string; expiry_datetime: string;
  is_overdue: boolean; counts_as_open: boolean;
};

export function isFreeBetExpiryRelevantRow(row: Pick<FreeBetIssueSource, "status" | "result">): boolean {
  return row.status !== "Settled" && ["Prospecting", "Available", "Not Yet Awarded"].includes(row.status) && row.result === "Pending";
}

export function getFreeBetIssueBadges(row: FreeBetIssueSource, now = Date.now()): Array<{ label: string; tone: "info" | "orange" | "warning" | "danger" }> {
  const issues: Array<{ label: string; tone: "info" | "orange" | "warning" | "danger" }> = [];
  const expiryRelevant = isFreeBetExpiryRelevantRow(row);
  if (row.status === "Prospecting" || row.status === "Not Yet Awarded") issues.push({ label: "Back Unplaced", tone: "warning" });
  if (!row.date_settled.trim()) issues.push({ label: "No Settle Date", tone: "warning" });
  if (row.status === "Placed" && row.result === "Pending" && row.is_overdue && row.date_settled.trim()) issues.push({ label: "Outcome Needed", tone: "danger" });
  if (expiryRelevant) {
    if (!row.expiry_datetime.trim()) issues.push({ label: "No Expiry", tone: "info" });
    else {
      const expiryTimestamp = Date.parse(row.expiry_datetime);
      if (Number.isFinite(expiryTimestamp)) {
        const hoursUntilExpiry = (expiryTimestamp - now) / 3_600_000;
        if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 24) issues.push({ label: "Expiry < 24h", tone: "danger" });
        else if (hoursUntilExpiry > 24 && hoursUntilExpiry <= 72) issues.push({ label: "Expiry < 3d", tone: "warning" });
        else if (hoursUntilExpiry > 72 && hoursUntilExpiry <= 168) issues.push({ label: "Expiry This Week", tone: "orange" });
      }
    }
  }
  return issues;
}

export type CashAdjustmentIssueSource = { linked_account: string; affects_investment: boolean; affects_cash_snapshot: boolean };

export function getCashAdjustmentIssueBadges(row: CashAdjustmentIssueSource): Array<{ label: string; tone: "warning" | "danger" }> {
  const issues: Array<{ label: string; tone: "warning" | "danger" }> = [];
  if (!row.linked_account.trim()) issues.push({ label: "No Account", tone: "warning" });
  if (!row.affects_investment && !row.affects_cash_snapshot) issues.push({ label: "No Scope", tone: "warning" });
  return issues;
}

export type ExtraPlaceIssueSource = Record<string, string | null> & {
  calculation_state: string; status: string; result: string;
};

export function hasRequiredExtraPlaceRowGap(row: ExtraPlaceIssueSource): boolean {
  if (row.calculation_provenance === "imported_historical") return !row.imported_historical_pnl?.trim();
  return [row.runner, row.race, row.placed_at, row.bookmaker, row.each_way_stake, row.back_odds, row.win_exchange, row.win_lay_odds, row.place_exchange, row.place_lay_odds].some(value => !value?.trim());
}

export function extraPlaceHasIssue(row: ExtraPlaceIssueSource): boolean {
  return row.calculation_state !== "resolved" || row.status === "Prospecting" || hasRequiredExtraPlaceRowGap(row) || (row.status === "Settled" && row.result === "Pending");
}
