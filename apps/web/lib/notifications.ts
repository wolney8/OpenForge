export const FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT =
  "plum-duff:fund-manager-notifications-refresh";
export const FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY =
  "plum-duff:fund-manager-notifications:v1";

export type NotificationAttentionStage =
  | "created"
  | "due-day"
  | "due-4h"
  | "due-2h";

export type FundManagerNotification = {
  audience: "fund_manager";
  kind: "task" | "information";
  task_state: "new" | "done";
  notification_id: string;
  notification_type: string;
  title: string;
  ledger_label: string;
  bookmaker_label: string;
  message: string;
  profile_id: string;
  profile_name: string;
  record_id: string;
  due_at: string;
  settles_at: string;
  created_at: string;
  href: string;
  tone: "warning" | "danger";
};

export type NotificationViewState = {
  readKeys: string[];
  dismissedIds: string[];
};

export const emptyNotificationViewState: NotificationViewState = {
  readKeys: [],
  dismissedIds: [],
};

export function normalizeNotificationViewState(value: unknown): NotificationViewState {
  if (!value || typeof value !== "object") return emptyNotificationViewState;
  const candidate = value as Partial<NotificationViewState> & { readIds?: unknown };
  const storedReadKeys = Array.isArray(candidate.readKeys)
    ? candidate.readKeys
    : Array.isArray(candidate.readIds)
      ? candidate.readIds
      : [];
  return {
    readKeys: [
      ...new Set(storedReadKeys.filter((item): item is string => typeof item === "string")),
    ],
    dismissedIds: Array.isArray(candidate.dismissedIds)
      ? [
          ...new Set(
            candidate.dismissedIds.filter((item): item is string => typeof item === "string")
          ),
        ]
      : [],
  };
}

export function getNotificationAttentionStage(
  notification: FundManagerNotification,
  now: Date = new Date()
): NotificationAttentionStage {
  const dueAt = new Date(notification.due_at);
  if (Number.isNaN(dueAt.getTime()) || Number.isNaN(now.getTime())) return "created";

  const millisecondsUntilDue = dueAt.getTime() - now.getTime();
  if (millisecondsUntilDue <= 2 * 60 * 60 * 1000) return "due-2h";
  if (millisecondsUntilDue <= 4 * 60 * 60 * 1000) return "due-4h";
  if (
    dueAt.getFullYear() === now.getFullYear() &&
    dueAt.getMonth() === now.getMonth() &&
    dueAt.getDate() === now.getDate()
  ) {
    return "due-day";
  }
  return "created";
}

export function getNotificationReadKey(
  notification: FundManagerNotification,
  now: Date = new Date()
): string {
  return `${notification.notification_id}:${getNotificationAttentionStage(notification, now)}`;
}

export function isNotificationUnread(
  notification: FundManagerNotification,
  viewState: NotificationViewState,
  now: Date = new Date()
): boolean {
  return (
    notification.task_state === "new" &&
    !new Set(viewState.readKeys).has(getNotificationReadKey(notification, now))
  );
}

export function getVisibleNotifications(
  notifications: FundManagerNotification[],
  viewState: NotificationViewState
): FundManagerNotification[] {
  const dismissed = new Set(viewState.dismissedIds);
  return notifications.filter((notification) => !dismissed.has(notification.notification_id));
}

export function getUnreadNotificationCount(
  notifications: FundManagerNotification[],
  viewState: NotificationViewState,
  now: Date = new Date()
): number {
  return getVisibleNotifications(notifications, viewState).filter(
    (notification) => isNotificationUnread(notification, viewState, now)
  ).length;
}

export function formatUnreadNotificationCount(count: number): string {
  return count > 9 ? "9+" : String(Math.max(0, count));
}

export function markNotificationsRead(
  viewState: NotificationViewState,
  notifications: FundManagerNotification[],
  now: Date = new Date()
): NotificationViewState {
  return {
    ...viewState,
    readKeys: [
      ...new Set([
        ...viewState.readKeys,
        ...notifications.map((notification) => getNotificationReadKey(notification, now)),
      ]),
    ],
  };
}

export function dismissNotificationIds(
  viewState: NotificationViewState,
  notificationIds: string[]
): NotificationViewState {
  return {
    readKeys: [...viewState.readKeys],
    dismissedIds: [...new Set([...viewState.dismissedIds, ...notificationIds])],
  };
}

export function formatNotificationDue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Due time unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}
