import { describe, expect, it } from "vitest";
import { destinationForPath, shellDestinations } from "./fund-manager-destinations";

describe("server-flagged Fund Manager destinations", () => {
  it("browses authorised combined ledgers and keeps Profile-owned mutation routes explicit", () => {
    for (const [id, module] of [["accounts", "accounts"], ["sportsbook", "sportsbook-bets"], ["free-bets", "free-bets"], ["casino", "casino-offers"], ["extra-place", "each-way-extra-places"], ["cash", "cash-adjustments"]]) {
      const destination = shellDestinations.find((item) => item.id === id);
      expect(destination?.href(null)).toBe(`/tracker/${module}`);
      expect(destination?.href("profile-a")).toBe(`/profiles/profile-a/tracker/${module}`);
      expect(destinationForPath(`/tracker/${module}`)?.id).toBe(id);
      expect(destinationForPath(`/profiles/profile-a/tracker/${module}`)?.id).toBe(id);
    }
  });

  it("keeps Reports outside Tracker and distinguishes the existing opportunity anchor", () => {
    expect(destinationForPath("/reports")?.id).toBe("reports");
    expect(destinationForPath("/reports")?.group).toBe("primary");
    expect(destinationForPath("/profiles/profile-a/tracker/accounts")?.id).toBe("accounts");
    expect(destinationForPath("/profiles/profile-a/tracker/accounts", "#profile-opportunities")?.id).toBe("opportunities");
    expect(destinationForPath("/tracker/accounts", "#profile-opportunities")?.id).toBe("opportunities");
  });

  it("keeps Profile reports, profit tracking and settings in their logical section", () => {
    for (const [module, parent] of [["reports", "reports"], ["profit-tracker", "reports"], ["settings", "settings"]]) {
      const destination = destinationForPath(`/profiles/profile-a/tracker/${module}`);
      expect(destination?.group).toBe("context");
      expect(destination?.parent).toBe(parent);
      expect(destination?.href("profile-a")).toBe(`/profiles/profile-a/tracker/${module}`);
    }
  });
});
