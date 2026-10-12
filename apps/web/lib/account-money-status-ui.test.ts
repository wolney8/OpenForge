import { describe, expect, it } from "vitest";
import { groupAccountMoneyIssues } from "../components/account-money-status";

describe("Account cash issue presentation", () => {
  it("combines repeated legacy rows by Profile and owner-facing Account identity", () => {
    const groups = groupAccountMoneyIssues([
      { accountId:"one",profileId:"P1",accountName:"Alpha · 10Bet",field:"current_balance",reason:"Unknown amount" },
      { accountId:"two",profileId:"P1",accountName:"Alpha · 10Bet",field:"pending_withdrawal_amount",reason:"Unknown amount" },
      { accountId:"three",profileId:"P2",accountName:"Bravo · 10Bet",field:"current_balance",reason:"Unknown amount" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.fields).toEqual(["current balance", "pending withdrawal"]);
  });
});
