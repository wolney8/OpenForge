import type { AccountMoneyIssue } from "@/lib/account-money";

/** Existing inline status/error surface; never replaces unrelated ledger P&L. */
export function AccountMoneyStatus({issues}:{issues?:AccountMoneyIssue[]}) {
  if(!issues?.length)return null;
  return <p className="error-text" data-pd-id="account-money.incomplete" role="status">
    Account cash information incomplete. {issues.map(issue=>`${issue.accountName} (${issue.accountId}): ${issue.field.replaceAll("_"," ")} — ${issue.reason}.`).join(" ")}
  </p>;
}
