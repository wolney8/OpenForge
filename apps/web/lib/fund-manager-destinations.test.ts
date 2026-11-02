import { describe, expect, it } from "vitest";
import { destinationForPath, shellDestinations } from "./fund-manager-destinations";

describe("server-flagged Fund Manager destinations", () => {
  it("requires an explicit Profile for owned ledgers without inventing a default", () => {
    const sportsbook = shellDestinations.find((item) => item.id === "sportsbook");
    expect(sportsbook?.href(null)).toBeNull();
    expect(sportsbook?.href("profile-a")).toBe("/profiles/profile-a/tracker/sportsbook-bets");
    expect(destinationForPath("/profiles/profile-a/tracker/sportsbook-bets")?.id).toBe("sportsbook");
  });

  it("keeps Reports outside Tracker and distinguishes the existing opportunity anchor", () => {
    expect(destinationForPath("/reports")?.id).toBe("reports");
    expect(destinationForPath("/reports")?.group).toBe("primary");
    expect(destinationForPath("/profiles/profile-a/tracker/accounts")?.id).toBe("accounts");
    expect(destinationForPath("/profiles/profile-a/tracker/accounts", "#profile-opportunities")?.id).toBe("opportunities");
  });
});
