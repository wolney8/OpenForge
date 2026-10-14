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

function CategoryCash({ label, known, value }: { label: string; known?: string; value: number }) {
  if (Number.isFinite(value)) return <span>{label} <FinancialValue value={value} /></span>;
  const subtotal = knownMoney(known);
  return <span>{label} {subtotal === null ? "unknown" : <>known <FinancialValue value={subtotal} /> · incomplete</>}</span>;
}

export function CurrentAccountCash({ cash }: { cash: AccountCash }) {
  const balanceIssues = uniqueBalanceIssues(cash.moneyIssues ?? []);
  const incomplete = !Number.isFinite(cash.cashSnapshot) && balanceIssues.length > 0;
  const known = knownMoney(cash.knownCashSubtotal);
  const unknownCount = balanceIssues.filter((issue) => issue.reason === "Unknown amount").length;
  const invalidCount = balanceIssues.length - unknownCount;
  const incompleteLabel = [
    unknownCount ? `${unknownCount} Account ${unknownCount === 1 ? "balance" : "balances"} missing` : "",
    invalidCount ? `${invalidCount} invalid` : "",
  ].filter(Boolean).join(" · ");

  return <>
    <strong aria-label="Current Account cash">
      {incomplete ? <>Known cash {known === null ? "unavailable" : <FinancialValue value={known} />}</>
        : <FinancialValue value={cash.cashSnapshot} />}
    </strong>
    {incomplete ? <span className="warning-text">Incomplete — {incompleteLabel}</span> : null}
    <span className="current-account-cash-categories">
      <CategoryCash label="Bookie" value={cash.bookieBalance} known={cash.bookieKnownBalance} />
      <CategoryCash label="Exchange" value={cash.exchangeBalance} known={cash.exchangeKnownBalance} />
      <CategoryCash label="Bank" value={cash.bankBalance} known={cash.bankKnownBalance} />
    </span>
  </>;
}

export function currentAccountCashIssueCount(cash: AccountCash): number {
  return uniqueBalanceIssues(cash.moneyIssues ?? []).length;
}
