import { describe, expect, it } from "vitest";

import { sortIssueBadgesByPriority } from "./issue-priority";

describe("sortIssueBadgesByPriority", () => {
  it("puts the highest-severity issue first while preserving same-tone order", () => {
    const badges = sortIssueBadgesByPriority([
      { label: "No Expiry", tone: "info" as const },
      { label: "Back Unplaced", tone: "warning" as const },
      { label: "Outcome Needed", tone: "danger" as const },
      { label: "No Settle Date", tone: "warning" as const },
    ]);

    expect(badges.map((badge) => badge.label)).toEqual([
      "Outcome Needed",
      "Back Unplaced",
      "No Settle Date",
      "No Expiry",
    ]);
  });
});
