import { describe, expect, it } from "vitest";
import { resolveEquivalentProfileRoute } from "./profile-navigation";

describe("Profile switch route preservation", () => {
  it.each(["dashboard", "sportsbook-bets", "oddsmatcher", "free-bets", "reports", "accounts", "casino-offers", "each-way-extra-places", "cash-adjustments", "settings"])("preserves %s without record-specific query state", (section) => {
    expect(resolveEquivalentProfileRoute(`/profiles/X/tracker/${section}?record=PRIVATE`, "Y"))
      .toBe(`/profiles/Y/tracker/${section}`);
  });
  it("falls back to Profile Operations for unsupported detail routes", () => {
    expect(resolveEquivalentProfileRoute("/profiles/X/imports/one/review", "Y"))
      .toBe("/profiles/Y/tracker/dashboard");
  });
});
