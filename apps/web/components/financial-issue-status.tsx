"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LedgerPagination } from "@/components/ledger-pagination";

type FinancialIssueStatusProps = {
  actionHref?: string;
  headline: string;
  issues: string[];
  pdId: string;
};

/**
 * Bounded operational disclosure for record-level financial diagnostics.
 * Never flatten diagnostic collections into page-level prose.
 */
export function FinancialIssueStatus({
  actionHref,
  headline,
  issues,
  pdId,
}: FinancialIssueStatusProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const uniqueIssues = useMemo(() => [...new Set(issues)], [issues]);
  if (!uniqueIssues.length) return null;
  const pageCount = Math.max(1, Math.ceil(uniqueIssues.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleIssues = uniqueIssues.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <details
      className="account-money-status account-money-status-warning financial-issue-status"
      data-pd-id={pdId}
    >
      <summary>
        <span aria-hidden="true" className="material-symbols-outlined">warning</span>
        <span>{headline}</span>
        <span className="account-money-status-action">View details</span>
      </summary>
      <div className="financial-issue-status-detail">
        {actionHref ? (
          <Link className="dashboard-card-action" href={actionHref}>View affected bets</Link>
        ) : null}
        <ul>
          {visibleIssues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
        {uniqueIssues.length > pageSize ? (
          <LedgerPagination
            ariaLabel="Affected financial records"
            currentPage={safePage}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            pageCount={pageCount}
            pageSize={pageSize}
            position="bottom"
            totalRows={uniqueIssues.length}
          />
        ) : null}
      </div>
    </details>
  );
}
