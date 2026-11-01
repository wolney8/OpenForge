import { describe, expect, it } from "vitest";
import { buildLabTodayTasks, copyLabReload, labManagedFeeSummary, labOfferTargets } from "./design-lab-operations";
import { initialLabAccounts } from "./design-lab-fixture";
import { labRecords } from "./design-lab-connected-data";

describe("CP-115 synthetic operations", () => {
  it("derives work from recorded source conditions and keeps routine/advice separate", () => {
    const tasks = buildLabTodayTasks(labRecords, initialLabAccounts, "all");
    expect(tasks.find(task => task.sourceId === "LAB-SB-OVERDUE")?.title).toBe("Review overdue unsettled bet");
    expect(tasks.find(task => task.sourceId === "LAB-FB-EXPIRING")?.due).toBe("2026-11-02");
    expect(tasks.find(task => task.sourceId === "LAB-SB-PARTIAL")?.title).toBe("Review partial Lay");
    expect(tasks.find(task => task.sourceId === "LAB-SB-002")?.title).toBe("Review placed bet for settlement");
    expect(tasks.find(task => task.sourceId === "LAB-FB-001")).toBeUndefined();
    expect(tasks.find(task => task.id === "reload")?.authority).toBe("Configured reminder");
    expect(tasks.find(task => task.id === "advisory")?.authority).toBe("Advisory suggestion");
    expect(buildLabTodayTasks(labRecords, initialLabAccounts, "LAB-PROFILE-B").some(task => task.sourceId === "LAB-SB-OVERDUE")).toBe(false);
    expect(buildLabTodayTasks(labRecords, initialLabAccounts, "LAB-PROFILE-B").some(task => task.id === "casino-daily-a")).toBe(false);
  });

  it("uses existing Account/provider eligibility and keeps blocked target visible", () => {
    expect(labOfferTargets.map(target => target.eligibility)).toEqual(["eligible", "review", "blocked"]);
    expect(initialLabAccounts.find(row => row.profileId === "LAB-PROFILE-B" && row.name === "Bookmaker A")?.status).toBe("Limited");
    expect(initialLabAccounts.find(row => row.profileId === "LAB-PROFILE-B" && row.name === "Exchange B")?.commission).toBe("0%");
    expect(labOfferTargets[2].reason).toMatch(/gubbed/);
  });

  it("copies only shared description into separate Prospecting rows; retry is idempotent", () => {
    const selected = ["LAB-PROFILE-A", "LAB-PROFILE-B"] as const;
    const first = copyLabReload({ selected: [...selected], reviewedWarnings: true, existing: labRecords, failProfile: "LAB-PROFILE-B" });
    expect(first.results.map(result => result.state)).toEqual(["Created", "Failed", "Blocked"]);
    expect(first.created).toHaveLength(1);
    const retry = copyLabReload({ selected: [...selected], reviewedWarnings: true, existing: [...labRecords, ...first.created] });
    expect(retry.results.map(result => result.state)).toEqual(["Skipped", "Created", "Blocked"]);
    expect(retry.created).toHaveLength(1);
    expect(retry.created[0].profileId).toBe("LAB-PROFILE-B");
    expect(retry.created[0].status).toBe("Prospecting");
    expect(retry.created[0].cells[6]).toBe("Not confirmed");
    expect(retry.created[0].cells[8]).toBe("Planning · unavailable");
    const duplicate = copyLabReload({ selected: [...selected], reviewedWarnings: true, existing: [...labRecords, ...first.created, ...retry.created] });
    expect(duplicate.created).toHaveLength(0);
    expect(duplicate.results.map(result => result.state)).toEqual(["Skipped", "Skipped", "Blocked"]);
    expect(copyLabReload({ selected: [...selected], reviewedWarnings: false, existing: labRecords }).results[1].state).toBe("Blocked");
  });

  it("keeps estimated, crystallised earned and available to withdraw separate", () => {
    expect(labManagedFeeSummary).toMatchObject({ estimatedFees: 6, feesEarned: 9, feesWithdrawn: 5, availableToWithdraw: 4, readyPeriodCount: 1, crystallisedPeriodCount: 1 });
  });
});
