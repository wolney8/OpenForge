import { describe, expect, it } from "vitest";
import {
  dismissNotificationIds,
  emptyNotificationViewState,
  formatUnreadNotificationCount,
  getNotificationAttentionStage,
  getUnreadNotificationCount,
  getVisibleNotifications,
  isNotificationUnread,
  markNotificationsRead,
  normalizeNotificationViewState,
  type FundManagerNotification,
} from "./notifications";

const notifications: FundManagerNotification[] = [
  {
    audience: "fund_manager",
    kind: "task",
    task_state: "new",
    notification_id: "NOTICE-001",
    notification_type: "partial_lay_reminder",
    title: "Partial lay recheck",
    ledger_label: "Sportsbook Bets",
    bookmaker_label: "Bookmaker A",
    message: "Review the remaining synthetic exposure.",
    profile_id: "PROFILE-001",
    profile_name: "User 001",
    record_id: "SB-001",
    due_at: "2026-07-23T18:00:00Z",
    settles_at: "2026-07-23T20:00:00Z",
    created_at: "2026-07-21T12:00:00Z",
    href: "/profiles/PROFILE-001/tracker/sportsbook-bets?record=SB-001",
    completion_href: "/profiles/PROFILE-001/sportsbook-bets/SB-001/partial-lay-reminder",
    tone: "warning",
  },
  {
    audience: "fund_manager",
    kind: "task",
    task_state: "new",
    notification_id: "NOTICE-002",
    notification_type: "partial_lay_reminder",
    title: "Partial lay recheck overdue",
    ledger_label: "Sportsbook Bets",
    bookmaker_label: "Bookmaker B",
    message: "Review another synthetic exposure.",
    profile_id: "PROFILE-002",
    profile_name: "User 002",
    record_id: "SB-002",
    due_at: "2026-07-20T18:00:00Z",
    settles_at: "2026-07-20T20:00:00Z",
    created_at: "2026-07-20T12:00:00Z",
    href: "/profiles/PROFILE-002/tracker/sportsbook-bets?record=SB-002",
    completion_href: "/profiles/PROFILE-002/sportsbook-bets/SB-002/partial-lay-reminder",
    tone: "danger",
  },
];

describe("fund manager notification view state", () => {
  it("tracks unread visible notifications separately from dismissed notifications", () => {
    const now = new Date("2026-07-21T12:00:00Z");
    const readState = markNotificationsRead(emptyNotificationViewState, [notifications[0]], now);
    expect(getUnreadNotificationCount(notifications, readState)).toBe(1);

    const dismissedState = dismissNotificationIds(readState, ["NOTICE-002"]);
    expect(getVisibleNotifications(notifications, dismissedState)).toEqual([notifications[0]]);
    expect(getUnreadNotificationCount(notifications, dismissedState)).toBe(0);
  });

  it("normalizes duplicate and malformed stored values", () => {
    expect(
      normalizeNotificationViewState({
        readKeys: ["NOTICE-001:created", "NOTICE-001:created", 3],
        dismissedIds: ["NOTICE-002", null],
      })
    ).toEqual({
      readKeys: ["NOTICE-001:created"],
      dismissedIds: ["NOTICE-002"],
    });
  });

  it("normalizes legacy read IDs without failing stored state loading", () => {
    expect(normalizeNotificationViewState({ readIds: ["NOTICE-001"] })).toEqual({
      readKeys: ["NOTICE-001"],
      dismissedIds: [],
    });
  });

  it("caps the visible unread badge at nine plus", () => {
    expect(formatUnreadNotificationCount(1)).toBe("1");
    expect(formatUnreadNotificationCount(9)).toBe("9");
    expect(formatUnreadNotificationCount(10)).toBe("9+");
  });

  it("keeps server-provided done tasks visible without counting them as unread", () => {
    const doneNotification = { ...notifications[0], task_state: "done" as const };
    expect(getVisibleNotifications([doneNotification], emptyNotificationViewState)).toEqual([
      doneNotification,
    ]);
    expect(getUnreadNotificationCount([doneNotification], emptyNotificationViewState)).toBe(0);
  });

  it("advances one reminder through due-day, four-hour and two-hour attention stages", () => {
    const notification = {
      ...notifications[0],
      due_at: "2026-07-23T18:00:00Z",
    };
    expect(
      getNotificationAttentionStage(notification, new Date("2026-07-22T12:00:00Z"))
    ).toBe("created");
    expect(
      getNotificationAttentionStage(notification, new Date("2026-07-23T09:00:00Z"))
    ).toBe("due-day");
    expect(
      getNotificationAttentionStage(notification, new Date("2026-07-23T14:30:00Z"))
    ).toBe("due-4h");
    expect(
      getNotificationAttentionStage(notification, new Date("2026-07-23T16:30:00Z"))
    ).toBe("due-2h");
  });

  it("re-arms a read reminder at each later attention stage without adding a card", () => {
    const notification = notifications[0];
    const createdAt = new Date("2026-07-21T12:00:00Z");
    const readAtCreation = markNotificationsRead(
      emptyNotificationViewState,
      [notification],
      createdAt
    );
    expect(isNotificationUnread(notification, readAtCreation, createdAt)).toBe(false);

    const dueDay = new Date("2026-07-23T09:00:00Z");
    expect(isNotificationUnread(notification, readAtCreation, dueDay)).toBe(true);
    expect(getUnreadNotificationCount([notification], readAtCreation, dueDay)).toBe(1);

    const readOnDueDay = markNotificationsRead(readAtCreation, [notification], dueDay);
    const fourHoursBefore = new Date("2026-07-23T14:30:00Z");
    expect(isNotificationUnread(notification, readOnDueDay, fourHoursBefore)).toBe(true);
    expect(getUnreadNotificationCount([notification], readOnDueDay, fourHoursBefore)).toBe(1);

    const stillUnreadTwoHoursBefore = new Date("2026-07-23T16:30:00Z");
    expect(getUnreadNotificationCount([notification], readOnDueDay, stillUnreadTwoHoursBefore)).toBe(
      1
    );
    expect(getVisibleNotifications([notification], readOnDueDay)).toHaveLength(1);
  });
});
