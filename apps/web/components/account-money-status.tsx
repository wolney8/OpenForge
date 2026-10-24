"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LedgerPagination } from "@/components/ledger-pagination";
import type { AccountMoneyIssue } from "@/lib/account-money";

type IssueGroup = { accountId: string; accountName: string; fields: string[]; profileId?: string };

export function groupAccountMoneyIssues(issues: AccountMoneyIssue[]): IssueGroup[] {
  const grouped = new Map<string, IssueGroup>();
  for (const issue of issues) {
    // Imported legacy data can contain repeated physical rows for the same
    // Profile/provider. Cash correction is a Profile + Account action, so the
    // warning presents that stable owner-facing identity once.
    const key = `${issue.profileId ?? "profile"}:${issue.accountName.trim().toLocaleLowerCase()}`;
    const group = grouped.get(key) ?? {
      accountId: issue.accountId,
      accountName: issue.accountName,
      fields: [],
      profileId: issue.profileId,
    };
    const field = issue.field === "current_balance" ? "current balance" : "pending withdrawal";
    if (!group.fields.includes(field)) group.fields.push(field);
    grouped.set(key, group);
  }
  return [...grouped.values()].sort((left, right) =>
    left.accountName.localeCompare(right.accountName)
  );
}

function MoneyIssueDisclosure({
  issues,
  severity,
}: {
  issues: AccountMoneyIssue[];
  severity: "warning" | "error";
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const groups = useMemo(() => groupAccountMoneyIssues(issues), [issues]);
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleGroups = useMemo(
    () => groups.slice((safePage - 1) * pageSize, safePage * pageSize),
    [groups, pageSize, safePage],
  );
  if (issues.length === 0) return null;
  const invalid = severity === "error";
  const label = invalid
    ? `Account cash information is invalid for ${groups.length} ${groups.length === 1 ? "Account" : "Accounts"}.`
    : `Account cash information is incomplete for ${groups.length} ${groups.length === 1 ? "Account" : "Accounts"}.`;

  return (
    <details
      className={`account-money-status account-money-status-${severity}`}
      data-pd-id={`account-money.${invalid ? "invalid" : "incomplete"}`}
      aria-atomic="true"
      aria-live={invalid ? "assertive" : "polite"}
    >
      <summary>
        <span aria-hidden="true" className="material-symbols-outlined">
          {invalid ? "error" : "warning"}
        </span>
        <span>{label}</span>
        <span className="account-money-status-action">View affected Accounts</span>
      </summary>
      <ul>
        {visibleGroups.map((group) => (
          <li key={group.accountId}>
            {group.profileId ? (
              <Link href={`/profiles/${group.profileId}/tracker/accounts?view=issues&issue=needs-attention&record=${encodeURIComponent(group.accountId)}&source=cash-readiness`}>
                <strong>{group.accountName}</strong>
              </Link>
            ) : <strong>{group.accountName}</strong>}
            <span>{invalid ? "Invalid" : "Not recorded"}: {group.fields.join(" and ")}</span>
          </li>
        ))}
      </ul>
      {groups.length > pageSize ? (
        <LedgerPagination ariaLabel="Affected Accounts" currentPage={safePage}
          onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} pageCount={pageCount} pageSize={pageSize}
          position="bottom" totalRows={groups.length} />
      ) : null}
    </details>
  );
}

/** Compact cash-data status; unknown observations remain distinct from malformed money. */
export function AccountMoneyStatus({ issues }: { issues?: AccountMoneyIssue[] }) {
  if (!issues?.length) return null;
  const invalid = issues.filter((issue) => issue.reason !== "Unknown amount");
  const unknown = issues.filter((issue) => issue.reason === "Unknown amount");
  return (
    <div className="account-money-status-list">
      <MoneyIssueDisclosure issues={invalid} severity="error" />
      <MoneyIssueDisclosure issues={unknown} severity="warning" />
    </div>
  );
}
