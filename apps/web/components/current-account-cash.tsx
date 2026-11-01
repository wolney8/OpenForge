"use client";

import { FinancialValue } from "@/components/financial-value";
import type { AccountMoneyIssue } from "@/lib/account-money";
import type { TrackerSummaryResult } from "@/lib/tracker-summary";

type AccountCash = TrackerSummaryResult["accountQuickView"];

function knownMoney(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueBalanceIssues(issues: AccountMoneyIssue[]): AccountMoneyIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (issue.field !== "current_balance") return false;
    const key = `${issue.profileId ?? "profile"}:${issue.accountId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function CashCategoryRow({
  label,
  missingCount,
  known,
  value,
}: {
  label: string;
  missingCount: number;
  known?: string;
  value: number;
}) {
  const subtotal = Number.isFinite(value) ? value : knownMoney(known);
  return <tr>
    <th scope="row">{label}</th>
    <td>{subtotal === null ? "Unavailable" : <FinancialValue value={subtotal} />}</td>
    <td>{missingCount > 0 ? missingCount : "—"}</td>
  </tr>;
}

export function CurrentAccountCash({ cash }: { cash: AccountCash }) {
  const balanceIssues = uniqueBalanceIssues(cash.moneyIssues ?? []);
  const incomplete = !Number.isFinite(cash.cashSnapshot) && balanceIssues.length > 0;
  const known = knownMoney(cash.knownCashSubtotal);
  const invalidCount = balanceIssues.filter((issue) => issue.reason !== "Unknown amount").length;
  const missingByType = (type: string) => balanceIssues.filter((issue) => issue.accountType === type).length;

  return <div className="current-account-cash">
    <div className="current-account-cash-total">
      <span>{incomplete ? "Known cash" : "Current cash"}</span>
      <strong aria-label={incomplete ? "Known Account cash" : "Current Account cash"}>
        {incomplete ? (known === null ? "Unavailable" : <FinancialValue value={known} />)
          : <FinancialValue value={cash.cashSnapshot} />}
      </strong>
    </div>
    <div className="current-account-cash-table-wrap">
      <table className="current-account-cash-table">
        <thead><tr><th scope="col">Type</th><th scope="col">Known balance</th><th scope="col">Missing</th></tr></thead>
        <tbody>
          <CashCategoryRow label="Bookmakers" missingCount={missingByType("Bookie")} value={cash.bookieBalance} known={cash.bookieKnownBalance} />
          <CashCategoryRow label="Exchanges" missingCount={missingByType("Exchange")} value={cash.exchangeBalance} known={cash.exchangeKnownBalance} />
          <CashCategoryRow label="Bank" missingCount={missingByType("Bank")} value={cash.bankBalance} known={cash.bankKnownBalance} />
          {Number.isFinite(cash.pendingWithdrawals) && cash.pendingWithdrawals !== 0 ? <tr><th scope="row">Pending withdrawals</th><td><FinancialValue value={cash.pendingWithdrawals} /></td><td>—</td></tr> : null}
        </tbody>
      </table>
    </div>
    {incomplete ? <span className="warning-text">{balanceIssues.length} cash-counting Account {balanceIssues.length === 1 ? "balance" : "balances"} unavailable{invalidCount ? ` · ${invalidCount} invalid` : ""}</span> : null}
  </div>;
}

export function currentAccountCashIssueCount(cash: AccountCash): number {
  return uniqueBalanceIssues(cash.moneyIssues ?? []).length;
}
