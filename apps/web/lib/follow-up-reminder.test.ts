import { describe, expect, it } from "vitest";
import { getFollowUpReminderDefaultDueAt } from "./follow-up-reminder";

describe("follow-up reminder defaults", () => {
  it("defaults to two hours before a future lifecycle cutoff", () => {
    expect(
      getFollowUpReminderDefaultDueAt(
        "2026-07-24T20:00",
        new Date("2026-07-24T12:00")
      )
    ).toBe("2026-07-24T18:00");
  });

  it("falls back to one hour before the cutoff after the two-hour point", () => {
    expect(
      getFollowUpReminderDefaultDueAt(
        "2026-07-24T20:00",
        new Date("2026-07-24T18:30")
      )
    ).toBe("2026-07-24T19:00");
  });

  it("returns no default when the cutoff has passed or is absent", () => {
    expect(
      getFollowUpReminderDefaultDueAt(
        "2026-07-24T20:00",
        new Date("2026-07-24T20:01")
      )
    ).toBe("");
    expect(getFollowUpReminderDefaultDueAt("", new Date("2026-07-24T12:00"))).toBe("");
  });
});
