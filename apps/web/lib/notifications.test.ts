import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultFundManagerNotificationPreferences,
  deriveDailyTaskView,
  currentDailyTasks,
  canCompleteNotification,
  canViewerReceiveNotification,
  dismissNotificationIds,
  emptyNotificationViewState,
  filterNotificationsByPreferences,
  filterAndSortDailyTasks,
  filterNotificationHistory,
  filterFundManagerNotificationsForViewer,
  formatUnreadNotificationCount,
  fundManagerNotificationTypes,
  getNotificationAttentionStage,
  getUnreadNotificationCount,
  getVisibleNotifications,
  isNotificationUnread,
  markNotificationsRead,
  normalizeFundManagerNotificationPreferences,
  normalizeNotificationViewState,
  persistNotificationState,
  restoreNotificationIds,
  type FundManagerNotification,
} from "./notifications";

const notifications: FundManagerNotification[] = [
  {
    audience: "fund_manager",
    security_tag: "fund_manager_only",
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
    security_tag: "fund_manager_only",
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not report durable notification state when persistence fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(
      persistNotificationState({ readKeys: [], dismissedIds: ["NOTICE-001"] })
    ).resolves.toBeNull();
  });

  it("returns the canonical merged state accepted by the server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          read_keys: ["NOTICE-002:created"],
          dismissed_ids: ["NOTICE-001", "NOTICE-001"],
        }),
      })
    );

    await expect(
      persistNotificationState({ readKeys: [], dismissedIds: ["NOTICE-001"] })
    ).resolves.toEqual({
      readKeys: ["NOTICE-002:created"],
      dismissedIds: ["NOTICE-001"],
    });
  });

  it("keeps Fund Manager-only notices out of subscriber views", () => {
    expect(
      canViewerReceiveNotification(notifications[0], {
        audience: "subscriber",
        profileId: "PROFILE-001",
      })
    ).toBe(false);

    const subscriberSafeNotification = {
      ...notifications[0],
      audience: "subscriber" as const,
      security_tag: "subscriber_allowed" as const,
    };
    expect(
      canViewerReceiveNotification(subscriberSafeNotification, {
        audience: "subscriber",
        profileId: "PROFILE-001",
      })
    ).toBe(true);
    expect(
      canViewerReceiveNotification(subscriberSafeNotification, {
        audience: "subscriber",
        profileId: "PROFILE-002",
      })
    ).toBe(false);
  });
  it("tracks unread visible notifications separately from dismissed notifications", () => {
    const now = new Date("2026-07-21T12:00:00Z");
    const readState = markNotificationsRead(emptyNotificationViewState, [notifications[0]], now);
    expect(getUnreadNotificationCount(notifications, readState, now)).toBe(1);

    const dismissedState = dismissNotificationIds(readState, ["NOTICE-002"]);
    expect(getVisibleNotifications(notifications, dismissedState)).toEqual([notifications[0]]);
    expect(getUnreadNotificationCount(notifications, dismissedState, now)).toBe(0);
  });

  it("keeps an unchanged cleared instance hidden while allowing a new source event", () => {
    const clearedState = dismissNotificationIds(emptyNotificationViewState, [
      notifications[0].notification_id,
    ]);
    const newSourceEvent = {
      ...notifications[0],
      notification_id: "NOTICE-001:2026-09-06T11:00:00Z",
      created_at: "2026-09-06T11:00:00Z",
    };

    expect(
      getVisibleNotifications([notifications[0], newSourceEvent], clearedState)
    ).toEqual([newSourceEvent]);
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

  it("classifies deterministic tasks into Today, Upcoming, Overdue and Completed without inventing confidence", () => {
    const now = new Date("2026-07-23T12:00:00Z");
    const today = deriveDailyTaskView(notifications[0], emptyNotificationViewState, now);
    const upcoming = deriveDailyTaskView({ ...notifications[0], notification_id: "UPCOMING", due_at: "2026-07-24T12:00:00Z" }, emptyNotificationViewState, now);
    const overdue = deriveDailyTaskView(notifications[1], emptyNotificationViewState, now);
    const completedState = dismissNotificationIds(emptyNotificationViewState, [notifications[0].notification_id]);
    const completed = deriveDailyTaskView(notifications[0], completedState, now);
    const undated = deriveDailyTaskView({ ...notifications[0], notification_id: "UNDATED", due_at: "", notification_type: "account_review" }, emptyNotificationViewState, now);

    expect(today).toMatchObject({ dueState: "today", priority: "medium", source: "deterministic", confidence: null });
    expect(upcoming.dueState).toBe("upcoming");
    expect(overdue).toMatchObject({ dueState: "overdue", priority: "high" });
    expect(completed.dueState).toBe("completed");
    expect(undated).toMatchObject({ dueState: "today", dueLabel: "Ready now · no deadline", priority: "low" });
  });

  it("filters Daily Tasks by Profile, bookmaker, type, source and search then sorts predictably", () => {
    const now = new Date("2026-07-23T12:00:00Z");
    const tasks = [
      deriveDailyTaskView(notifications[0], emptyNotificationViewState, now),
      deriveDailyTaskView({ ...notifications[0], notification_id: "NOTICE-003", profile_id: "PROFILE-003", profile_name: "User 003", bookmaker_label: "Bookmaker C", notification_type: "account_review", due_at: "" }, emptyNotificationViewState, now),
    ];
    const base = { dueState: "today" as const, profileId: "all", bookmaker: "all", notificationType: "all", source: "all" as const, query: "", sort: "priority" as const };
    expect(filterAndSortDailyTasks(tasks, base).map((task) => task.notification.notification_id)).toEqual(["NOTICE-001", "NOTICE-003"]);
    expect(filterAndSortDailyTasks(tasks, { ...base, profileId: "PROFILE-003" })).toHaveLength(1);
    expect(filterAndSortDailyTasks(tasks, { ...base, bookmaker: "Bookmaker A" })).toHaveLength(1);
    expect(filterAndSortDailyTasks(tasks, { ...base, notificationType: "account_review" })).toHaveLength(1);
    expect(filterAndSortDailyTasks(tasks, { ...base, source: "deterministic" })).toHaveLength(2);
    expect(filterAndSortDailyTasks(tasks, { ...base, query: "User 003" })).toHaveLength(1);
    expect(filterAndSortDailyTasks(tasks, { ...base, sort: "profile" }).map((task) => task.notification.profile_name)).toEqual(["User 001", "User 003"]);
  });

  it("restores only the selected completed task identity", () => {
    const state = dismissNotificationIds(emptyNotificationViewState, ["NOTICE-001", "NOTICE-002"]);
    expect(restoreNotificationIds(state, ["NOTICE-001"]).dismissedIds).toEqual(["NOTICE-002"]);
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

  it("normalizes notification preferences from partial or malformed storage", () => {
    expect(
      normalizeFundManagerNotificationPreferences({
        database_backup_reminder: false,
        partial_lay_reminder: "yes",
      })
    ).toEqual({
      ...defaultFundManagerNotificationPreferences,
      database_backup_reminder: false,
    });
  });

  it("filters disabled known notification types without hiding future unknown types", () => {
    const databaseBackupNotice: FundManagerNotification = {
      ...notifications[0],
      notification_id: "NOTICE-BACKUP",
      notification_type: "database_backup_reminder",
      kind: "information",
      title: "Create a verified backup",
    };
    const unknownNotice: FundManagerNotification = {
      ...notifications[0],
      notification_id: "NOTICE-FUTURE",
      notification_type: "future_safety_alert",
      kind: "information",
      title: "Future safety alert",
    };

    expect(
      filterNotificationsByPreferences(
        [databaseBackupNotice, notifications[0], unknownNotice],
        {
          ...defaultFundManagerNotificationPreferences,
          database_backup_reminder: false,
          partial_lay_reminder: false,
        }
      ).map((notification) => notification.notification_id)
    ).toEqual(["NOTICE-FUTURE"]);
  });

  it("keeps the Fund Manager view scoped even if an invalid subscriber item reaches the client", () => {
    const invalidSubscriberNotice = {
      ...notifications[0],
      audience: "subscriber" as const,
      security_tag: "subscriber_allowed" as const,
      notification_id: "NOTICE-SUBSCRIBER",
    } as unknown as FundManagerNotification;

    expect(
      filterFundManagerNotificationsForViewer(
        [notifications[0], invalidSubscriberNotice],
        defaultFundManagerNotificationPreferences
      )
    ).toEqual([notifications[0]]);
  });

  it("filters retained notification history by name, type and state without clearing read items", () => {
    const doneNotification = { ...notifications[1], task_state: "done" as const };
    const readState = markNotificationsRead(
      emptyNotificationViewState,
      [notifications[0]],
      new Date("2026-07-21T12:00:00Z")
    );
    expect(
      filterNotificationHistory([notifications[0], doneNotification], readState, {
        query: "bookmaker a",
        notificationType: "partial_lay_reminder",
        status: "new",
      })
    ).toEqual([notifications[0]]);
    expect(
      filterNotificationHistory([notifications[0], doneNotification], readState, {
        query: "",
        notificationType: "all",
        status: "done",
      })
    ).toEqual([doneNotification]);
  });

  it("keeps cleared source notifications available to retained history", () => {
    const cleared = dismissNotificationIds(emptyNotificationViewState, [
      notifications[0].notification_id,
    ]);
    expect(getVisibleNotifications(notifications, cleared)).toEqual([notifications[1]]);
    expect(
      filterNotificationHistory(notifications, cleared, {
        query: "",
        notificationType: "all",
        status: "all",
      })
    ).toEqual(notifications);
    expect(
      filterNotificationHistory(notifications, cleared, {
        query: "",
        notificationType: "all",
        status: "cleared",
      })
    ).toEqual([notifications[0]]);
  });

  it("documents timing and Fund Manager-only delivery for every approved source", () => {
    expect(fundManagerNotificationTypes).toHaveLength(9);
    for (const notificationType of fundManagerNotificationTypes) {
      expect(notificationType.timing.length).toBeGreaterThan(20);
    }
  });
});


describe("current daily task projection", () => {
  it("deduplicates current identities and excludes information and mismatched delivery scope", () => {
    expect(currentDailyTasks([notifications[0], notifications[0], { ...notifications[1], kind: "information" }, { ...notifications[1], security_tag: "subscriber_allowed" }])).toEqual([notifications[0]]);
    expect(currentDailyTasks([])).toEqual([]);
  });
  it("only allows exact source-owned manual reminder completion endpoints", () => {
    expect(canCompleteNotification(notifications[0])).toBe(true);
    expect(canCompleteNotification({ ...notifications[0], completion_href: "" })).toBe(false);
    expect(canCompleteNotification({ ...notifications[0], completion_href: "/profiles/OTHER/sportsbook-bets/SB-001/partial-lay-reminder" })).toBe(false);
    expect(canCompleteNotification({ ...notifications[0], completion_href: "https://example.invalid/" })).toBe(false);
  });
  it("retains existing cleared and source-done semantics without clearing another task for the same record", () => {
    const other = { ...notifications[0], notification_id: "different-rule", notification_type: "settlement_review", completion_href: "" };
    const state = dismissNotificationIds(emptyNotificationViewState, [notifications[0].notification_id]);
    expect(filterNotificationHistory(currentDailyTasks([notifications[0], other]), state, { query: "", notificationType: "all", status: "new" })).toEqual([other]);
    expect(filterNotificationHistory([{ ...other, task_state: "done" }], state, { query: "", notificationType: "all", status: "done" })).toHaveLength(1);
  });
});
