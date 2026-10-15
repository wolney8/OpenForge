import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CurrentAccountCash } from "../components/current-account-cash";
import type { TrackerSummaryResult } from "./tracker-summary";

type AccountCash = TrackerSummaryResult["accountQuickView"];

function render(cash: AccountCash) {
  return renderToStaticMarkup(createElement(CurrentAccountCash, { cash }));
}

const complete: AccountCash = {
  bookieBalance: 84.16,
  exchangeBalance: 10,
  bankBalance: 5,
  pendingWithdrawals: 0,
  cashSnapshot: 99.16,
  knownCashSubtotal: "99.16",
  bookieKnownBalance: "84.16",
  exchangeKnownBalance: "10.00",
  bankKnownBalance: "5.00",
  moneyIssues: [],
};

describe("Current Account Cash readiness", () => {
  it("shows the complete total when every included balance is known", () => {
    const markup = render(complete);
    expect(markup).toContain("£ 99.16");
    expect(markup).not.toContain("Incomplete");
  });

  it("keeps known cash visible without presenting it as a complete total", () => {
    const markup = render({
      ...complete,
      bookieBalance: Number.NaN,
      cashSnapshot: Number.NaN,
      knownCashSubtotal: "84.16",
      bookieKnownBalance: "84.16",
      moneyIssues: [
        { accountId: "ACCOUNT-UNKNOWN-1", accountName: "Synthetic One", field: "current_balance", reason: "Unknown amount" },
        { accountId: "ACCOUNT-UNKNOWN-2", accountName: "Synthetic Two", field: "current_balance", reason: "Unknown amount" },
      ],
    });

    expect(markup).toContain("Known cash");
    expect(markup).toContain("£ 84.16");
    expect(markup).toContain("Incomplete — 2 Account balances missing");
    expect(markup).not.toContain("Known cash £ 99.16");
    expect(markup).toContain('<dl class="current-account-cash-categories">');
    expect(markup.match(/<dt>/g)).toHaveLength(3);
    expect(markup.match(/<dd/g)).toHaveLength(3);
  });

  it("renders each category as an aligned value row and keeps an unknown category incomplete", () => {
    const markup = render({
      ...complete,
      cashSnapshot: Number.NaN,
      knownCashSubtotal: "62.34",
      bookieBalance: 62.34,
      bookieKnownBalance: "62.34",
      exchangeBalance: Number.NaN,
      exchangeKnownBalance: "0.00",
      bankBalance: 0,
      bankKnownBalance: "0.00",
      moneyIssues: [
        { accountId: "ACCOUNT-UNKNOWN-1", accountName: "Exchange One", field: "current_balance", reason: "Unknown amount" },
        { accountId: "ACCOUNT-UNKNOWN-2", accountName: "Exchange Two", field: "current_balance", reason: "Unknown amount" },
      ],
    });

    expect(markup).toContain("Known cash");
    expect(markup).toContain("£ 62.34");
    expect(markup).toContain("<dt>Bookie</dt><dd>");
    expect(markup).toContain('<dt>Exchange</dt><dd class="current-account-cash-incomplete">Incomplete</dd>');
    expect(markup).toContain("<dt>Bank</dt><dd>");
    expect(markup).not.toContain("Exchange £ 0.00");
  });

  it("deduplicates repeated missing-field evidence by Account identity", () => {
    const issue = {
      accountId: "ACCOUNT-UNKNOWN-1",
      accountName: "Synthetic One",
      field: "current_balance" as const,
      reason: "Unknown amount" as const,
    };
    const markup = render({
      ...complete,
      cashSnapshot: Number.NaN,
      moneyIssues: [issue, issue],
    });
    expect(markup).toContain("Incomplete — 1 Account balance missing");
  });
});
