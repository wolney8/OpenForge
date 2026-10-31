import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountMoneyStatus } from "@/components/account-money-status";
import { FinancialIssueStatus } from "@/components/financial-issue-status";

describe("bounded financial diagnostic presentation", () => {
  it("summarises a large collection and renders only one bounded page of detail", () => {
    const issues = Array.from({ length: 40 }, (_, index) => `Synthetic record ${index + 1}`);
    const markup = renderToStaticMarkup(createElement(FinancialIssueStatus, {
      headline: "40 Sportsbook records need financial details.",
      issues,
      pdId: "sportsbook-money.incomplete",
    }));

    expect(markup).toContain("40 Sportsbook records need financial details.");
    expect(markup).toContain("Synthetic record 16");
    expect(markup).not.toContain("Synthetic record 17");
    expect(markup).not.toContain(issues.join(" · "));
    expect(markup).toContain("Affected financial records bottom controls");
  });

  it("deduplicates repeated diagnostics before presenting owner detail", () => {
    const markup = renderToStaticMarkup(createElement(FinancialIssueStatus, {
      headline: "1 Sportsbook record needs financial details.",
      issues: ["SB-001 · missing value", "SB-001 · missing value"],
      pdId: "sportsbook-money.incomplete",
    }));
    expect(markup.match(/SB-001/g)).toHaveLength(1);
  });

  it("keeps the Account cash warning independent from Sportsbook readiness", () => {
    const cashIssues = Array.from({ length: 12 }, (_, index) => ({
      accountId: `ACCOUNT-${index + 1}`,
      accountName: `Bookmaker ${index + 1}`,
      field: "current_balance" as const,
      reason: "Unknown amount",
    }));
    const markup = renderToStaticMarkup(createElement(Fragment, null,
      createElement(AccountMoneyStatus, { issues: cashIssues }),
      createElement(FinancialIssueStatus, {
        headline: "8 open Sportsbook positions need calculation details.",
        issues: ["SB-OPEN-001 · missing commission"],
        pdId: "sportsbook-money.committed-incomplete",
      }),
    ));
    expect(markup).toContain("Account cash information is incomplete for 12 Accounts.");
    expect(markup).toContain("8 open Sportsbook positions need calculation details.");
  });
});
