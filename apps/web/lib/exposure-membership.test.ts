import { describe, expect, it } from "vitest";

import { financialMembership, isCommittedExposure } from "./exposure-membership";

describe("financialMembership", () => {
  it.each([
    ["sportsbook", "Prospecting"],
    ["sportsbook", "Not Placed"],
    ["free-bet", "Prospecting"],
    ["free-bet", "Not Yet Awarded"],
    ["free-bet", "Available"],
    ["casino", "Prospecting"],
    ["extra-place", "Prospecting"],
  ] as const)("classifies %s %s as planned", (domain, status) => {
    expect(financialMembership(domain, { status, result: "Pending" })).toBe("PLANNED");
  });

  it.each([
    ["sportsbook", "Placed"],
    ["free-bet", "Placed"],
    ["casino", "Started"],
    ["casino", "In Progress"],
    ["extra-place", "Placed"],
  ] as const)("classifies %s %s as committed", (domain, status) => {
    expect(isCommittedExposure(domain, { status, result: "Pending" })).toBe(true);
  });

  it.each([
    ["sportsbook", "Settled"],
    ["sportsbook", "Free Bet Awarded"],
    ["free-bet", "Settled"],
    ["free-bet", "Converted"],
    ["casino", "Settled"],
    ["extra-place", "Settled"],
  ] as const)("classifies %s %s as realised", (domain, status) => {
    expect(financialMembership(domain, { status })).toBe("REALISED");
  });

  it.each([
    ["sportsbook", "Void"],
    ["sportsbook", "Cancelled"],
    ["sportsbook", "Error"],
    ["free-bet", "Expired"],
    ["free-bet", "Void"],
    ["free-bet", "Error"],
    ["extra-place", "Void"],
  ] as const)("fails closed for non-exposure %s %s", (domain, status) => {
    expect(financialMembership(domain, { status })).toBe("EXCLUDED");
  });
});
