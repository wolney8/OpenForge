export const FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT =
  "plum-duff:fund-manager-notifications-refresh";
export const FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY =
  "plum-duff:fund-manager-notifications:v1";
export const FUND_MANAGER_LOCAL_NOTIFICATIONS_STORAGE_KEY =
  "plum-duff:fund-manager-local-notifications:v1";
export const FUND_MANAGER_NOTIFICATION_PREFERENCES_STORAGE_KEY =
  "plum-duff:fund-manager-notification-preferences:v1";

export type NotificationAttentionStage =
  | "created"
  | "due-day"
  | "due-4h"
  | "due-2h";

export type NotificationAudience = "fund_manager" | "subscriber";
export type NotificationSecurityTag = "fund_manager_only" | "subscriber_allowed";

export type NotificationViewer = {
  audience: NotificationAudience;
  profileId?: string;
};

type SecurityScopedNotification = {
  audience: NotificationAudience;
  security_tag: NotificationSecurityTag;
  profile_id: string;
};

export type FundManagerNotification = {
  audience: "fund_manager";
  // A server-enforced delivery classification. Client filtering is only defence in depth.
  security_tag: NotificationSecurityTag;
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
  completion_href: string;
  tone: "warning" | "danger" | "info" | "success";
};

export function canViewerReceiveNotification(
  notification: SecurityScopedNotification,
  viewer: NotificationViewer
): boolean {
  if (viewer.audience === "fund_manager") {
    return notification.audience === "fund_manager";
  }
  return (
    notification.audience === "subscriber" &&
    notification.security_tag === "subscriber_allowed" &&
    Boolean(viewer.profileId) &&
    notification.profile_id === viewer.profileId
  );
}

export const fundManagerNotificationTypes = [
  {
    id: "database_backup_reminder",
    label: "Database Backup Reminders",
    description:
      "Prompts the Fund Manager when local backups are stale or enough tracker rows have changed.",
    timing: "No verified backup, after 7 days, or after 25 changed tracker rows.",
  },
  {
    id: "partial_lay_reminder",
    label: "Partial Lay Reminders",
    description:
      "Tracks sportsbook partial-lay follow-up tasks and re-alerts on the due day, four hours before, and two hours before.",
    timing: "When active or reopened, then on the due day, 4 hours before, and 2 hours before.",
  },
  {
    id: "free_bet_follow_up_reminder",
    label: "Free Bet Follow-Up Reminders",
    description:
      "Tracks free-bet review tasks until the free bet is resolved or its relevant lifecycle date has passed.",
    timing: "When active or reopened, then on the due day, 4 hours before, and 2 hours before.",
  },
  {
    id: "catalogue_transfer_status",
    label: "Account Catalogue Transfers",
    description:
      "Records successful and failed Fund Manager Account Catalogue imports and exports.",
    timing: "Immediately after an import or export completes or fails.",
  },
] as const;

export type FundManagerNotificationTypeId =
  (typeof fundManagerNotificationTypes)[number]["id"];

export type FundManagerNotificationPreferences = Record<
  FundManagerNotificationTypeId,
  boolean
>;

export const defaultFundManagerNotificationPreferences: FundManagerNotificationPreferences = {
  database_backup_reminder: true,
  partial_lay_reminder: true,
  free_bet_follow_up_reminder: true,
  catalogue_transfer_status: true,
};

const knownFundManagerNotificationTypeIds = new Set<string>(
  fundManagerNotificationTypes.map((notificationType) => notificationType.id)
);

export type LocalFundManagerNotificationInput = Pick<
  FundManagerNotification,
  | "notification_id"
  | "notification_type"
  | "title"
  | "ledger_label"
  | "bookmaker_label"
  | "message"
  | "profile_id"
  | "profile_name"
  | "record_id"
  | "href"
> &
  Partial<
    Pick<
      FundManagerNotification,
      | "audience"
      | "kind"
      | "task_state"
      | "due_at"
      | "settles_at"
      | "created_at"
      | "completion_href"
      | "tone"
    >
  >;

export type NotificationViewState = {
  readKeys: string[];
  dismissedIds: string[];
};

export const emptyNotificationViewState: NotificationViewState = {
  readKeys: [],
  dismissedIds: [],
};

export function normalizeFundManagerNotificationPreferences(
  value: unknown
): FundManagerNotificationPreferences {
  if (!value || typeof value !== "object") {
    return { ...defaultFundManagerNotificationPreferences };
  }
  const candidate = value as Partial<Record<FundManagerNotificationTypeId, unknown>>;
  return fundManagerNotificationTypes.reduce<FundManagerNotificationPreferences>(
    (preferences, notificationType) => ({
      ...preferences,
      [notificationType.id]:
        typeof candidate[notificationType.id] === "boolean"
          ? candidate[notificationType.id]
          : defaultFundManagerNotificationPreferences[notificationType.id],
    }),
    { ...defaultFundManagerNotificationPreferences }
  );
}

export function loadFundManagerNotificationPreferences(): FundManagerNotificationPreferences {
  if (typeof window === "undefined") return { ...defaultFundManagerNotificationPreferences };
  try {
    const stored = window.localStorage.getItem(
      FUND_MANAGER_NOTIFICATION_PREFERENCES_STORAGE_KEY
    );
    return stored
      ? normalizeFundManagerNotificationPreferences(JSON.parse(stored) as unknown)
      : { ...defaultFundManagerNotificationPreferences };
  } catch {
    return { ...defaultFundManagerNotificationPreferences };
  }
}

export function saveFundManagerNotificationPreferences(
  preferences: FundManagerNotificationPreferences
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    FUND_MANAGER_NOTIFICATION_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizeFundManagerNotificationPreferences(preferences))
  );
  window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
}

export function filterNotificationsByPreferences(
  notifications: FundManagerNotification[],
  preferences: FundManagerNotificationPreferences
): FundManagerNotification[] {
  const knownTypes = new Set<string>(
    fundManagerNotificationTypes.map((notificationType) => notificationType.id)
  );
  return notifications.filter((notification) => {
    if (!knownTypes.has(notification.notification_type)) return true;
    return preferences[notification.notification_type as FundManagerNotificationTypeId];
  });
}

export function filterFundManagerNotificationsForViewer(
  notifications: FundManagerNotification[],
  preferences: FundManagerNotificationPreferences
): FundManagerNotification[] {
  return filterNotificationsByPreferences(
    notifications.filter((notification) =>
      canViewerReceiveNotification(notification, { audience: "fund_manager" })
    ),
    preferences
  );
}

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

export type NotificationHistoryStatus = "all" | "new" | "done";

export function filterNotificationHistory(
  notifications: FundManagerNotification[],
  viewState: NotificationViewState,
  options: {
    query: string;
    notificationType: string;
    status: NotificationHistoryStatus;
  }
): FundManagerNotification[] {
  const normalizedQuery = options.query.trim().toLocaleLowerCase();
  return getVisibleNotifications(notifications, viewState).filter((notification) => {
    if (options.status !== "all" && notification.task_state !== options.status) return false;
    if (
      options.notificationType !== "all" &&
      notification.notification_type !== options.notificationType
    ) {
      return false;
    }
    if (!normalizedQuery) return true;
    return [
      notification.title,
      notification.message,
      notification.profile_name,
      notification.ledger_label,
      notification.bookmaker_label,
      notification.record_id,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
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

function normalizeLocalNotification(
  notification: unknown
): FundManagerNotification | null {
  if (!notification || typeof notification !== "object") return null;
  const candidate = notification as Partial<FundManagerNotification>;
  if (
    typeof candidate.notification_id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.profile_id !== "string" ||
    typeof candidate.record_id !== "string" ||
    typeof candidate.href !== "string"
  ) {
    return null;
  }
  if (
    typeof candidate.notification_type !== "string" ||
    !knownFundManagerNotificationTypeIds.has(candidate.notification_type)
  ) {
    return null;
  }
  const nowIso = new Date().toISOString();
  return {
    audience: "fund_manager",
    security_tag: "fund_manager_only",
    kind: candidate.kind === "task" ? "task" : "information",
    task_state: candidate.task_state === "done" ? "done" : "new",
    notification_id: candidate.notification_id,
    notification_type: candidate.notification_type,
    title: candidate.title,
    ledger_label: candidate.ledger_label ?? "Plum Duff",
    bookmaker_label: candidate.bookmaker_label ?? "Local workflow",
    message: candidate.message ?? candidate.record_id,
    profile_id: candidate.profile_id,
    profile_name: candidate.profile_name ?? candidate.profile_id,
    record_id: candidate.record_id,
    due_at: candidate.due_at ?? candidate.created_at ?? nowIso,
    settles_at: candidate.settles_at ?? candidate.due_at ?? candidate.created_at ?? nowIso,
    created_at: candidate.created_at ?? nowIso,
    href: candidate.href,
    completion_href: candidate.completion_href ?? "",
    tone:
      candidate.tone === "danger" ||
      candidate.tone === "warning" ||
      candidate.tone === "success" ||
      candidate.tone === "info"
        ? candidate.tone
        : "info",
  };
}

export function loadLocalFundManagerNotifications(): FundManagerNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(FUND_MANAGER_LOCAL_NOTIFICATIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeLocalNotification)
      .filter((item): item is FundManagerNotification => Boolean(item));
  } catch {
    return [];
  }
}

export function addOrReplaceLocalFundManagerNotification(
  input: LocalFundManagerNotificationInput
): void {
  if (typeof window === "undefined") return;
  const createdAt = input.created_at ?? new Date().toISOString();
  const notification: FundManagerNotification = {
    audience: "fund_manager",
    security_tag: "fund_manager_only",
    kind: input.kind ?? "information",
    task_state: input.task_state ?? "new",
    notification_id: input.notification_id,
    notification_type: input.notification_type,
    title: input.title,
    ledger_label: input.ledger_label,
    bookmaker_label: input.bookmaker_label,
    message: input.message,
    profile_id: input.profile_id,
    profile_name: input.profile_name,
    record_id: input.record_id,
    due_at: input.due_at ?? createdAt,
    settles_at: input.settles_at ?? input.due_at ?? createdAt,
    created_at: createdAt,
    href: input.href,
    completion_href: input.completion_href ?? "",
    tone: input.tone ?? "info",
  };
  const existing = loadLocalFundManagerNotifications();
  const next = [
    notification,
    ...existing.filter((item) => item.notification_id !== notification.notification_id),
  ].slice(0, 50);
  try {
    window.localStorage.setItem(
      FUND_MANAGER_LOCAL_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(next)
    );
    window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
  } catch {
    // Notifications are supplemental feedback; saving the row remains the source of truth.
  }
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
