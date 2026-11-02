import { describe, expect, it } from "vitest";
import { labRecords } from "./design-lab-connected-data";
import { initialLabAccounts } from "./design-lab-fixture";
import { activeLabNotificationEvents, buildLabNotificationEvents } from "./design-lab-notification-policy";
import { buildLabTodayTasks } from "./design-lab-operations";

describe("CP-119E lab notification prioritisation", () => {
  const tasks = buildLabTodayTasks(labRecords, initialLabAccounts, "all");
  const events = buildLabNotificationEvents(tasks);

  it("prioritises source-backed expiry and partial execution without treating an event date as a deadline", () => {
    expect(events.filter(event => event.priority === "Action Required").map(event => event.task.sourceId).sort()).toEqual(["LAB-FB-EXPIRING", "LAB-SB-PARTIAL"]);
    expect(events.find(event => event.task.sourceId === "LAB-SB-OVERDUE")?.priority).toBe("Other Source Events");
    expect(events.find(event => event.task.sourceId === "LAB-ACCOUNT-C")?.priority).toBe("Other Source Events");
  });

  it("retains approved settlement and Account source events but excludes routine and advisory tasks", () => {
    expect(events.some(event => event.kind === "settlement_review")).toBe(true);
    expect(events.some(event => event.kind === "account_review")).toBe(true);
    expect(events.some(event => event.task.id === "casino-daily-a" || event.task.id === "advisory")).toBe(false);
    expect(new Set(events.map(event => event.id)).size).toBe(events.length);
  });

  it("keeps Profile ownership and removes a resolved source only from the current view", () => {
    const profileB = activeLabNotificationEvents(events, tasks, "LAB-PROFILE-B");
    expect(profileB.every(event => event.task.profileId === "LAB-PROFILE-B")).toBe(true);
    const withoutUnknownAccount = buildLabTodayTasks(labRecords, initialLabAccounts.map(account => account.id === "LAB-ACCOUNT-C" ? { ...account, currentBalance: "0.00" } : account), "all");
    expect(activeLabNotificationEvents(events, withoutUnknownAccount, "all").some(event => event.task.sourceId === "LAB-ACCOUNT-C")).toBe(false);
    expect(events.some(event => event.task.sourceId === "LAB-ACCOUNT-C")).toBe(true);
  });
});
