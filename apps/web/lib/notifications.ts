import { apiBaseUrl } from "./api";
import { redirectExpiredSession } from "./session-inactivity";

export const FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT =
  "plum-duff:fund-manager-notifications-refresh";
export const TODAY_ACTIONABLE_NAVIGATION_EVENT = "plum-duff:today-actionable-navigation";
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
    id: "calculator_conversion_complete",
    label: "Calculator Conversions",
    description:
      "Confirms calculator opportunities and completed sessions saved into Profile ledgers.",
    timing: "Once after each destination row is created.",
  },
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
    id: "profile_opportunity_reminder",
    label: "Profile Opportunity Reminders",
    description:
      "Surfaces pending signup, current weekly and near-expiry Profile opportunities without creating ledger rows.",
    timing: "Once per opportunity period while the opportunity is still awaiting action.",
  },
  { id: "free_bet_expiry", label: "Recorded Free Bet Expiry", description: "Review actual recorded Free Bets approaching their expiry.", timing: "Within the Profile's configurable calendar-day expiry window; unknown dates are not inferred." },
  { id: "settlement_review", label: "Settlement Reviews", description: "Open placed bets whose settlement has not been recorded.", timing: "While recorded Placed; no overdue threshold or outcome is assumed." },
  { id: "account_review", label: "Account Evidence Reviews", description: "Review active Accounts with missing balance or unchecked access evidence.", timing: "While the recorded evidence is missing; no balance freshness threshold is assumed." },
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
  calculator_conversion_complete: true,
  database_backup_reminder: true,
  partial_lay_reminder: true,
  free_bet_follow_up_reminder: true,
  profile_opportunity_reminder: true,
  catalogue_transfer_status: true,
  free_bet_expiry: true,
  settlement_review: true,
  account_review: true,
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

export async function loadPersistedNotificationState(): Promise<NotificationViewState | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/fund-manager/notifications/state`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) {
      await redirectExpiredSession(response);
      return null;
    }
    const payload = (await response.json()) as {
      dismissed_ids?: unknown;
      read_keys?: unknown;
    };
    return normalizeNotificationViewState({
      dismissedIds: payload.dismissed_ids,
      readKeys: payload.read_keys,
    });
  } catch {
    return null;
  }
}

export async function persistNotificationState(
  state: NotificationViewState
): Promise<NotificationViewState | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/fund-manager/notifications/state`, {
      body: JSON.stringify({
        dismissed_ids: state.dismissedIds,
        read_keys: state.readKeys,
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    if (!response.ok) {
      await redirectExpiredSession(response);
      return null;
    }
    const payload = (await response.json()) as {
      dismissed_ids?: unknown;
      read_keys?: unknown;
    };
    return normalizeNotificationViewState({
      dismissedIds: payload.dismissed_ids,
      readKeys: payload.read_keys,
    });
  } catch {
    return null;
  }
}

export async function loadPersistedNotificationPreferences(): Promise<FundManagerNotificationPreferences | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/fund-manager/notifications/preferences`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { preferences?: unknown };
    return normalizeFundManagerNotificationPreferences(payload.preferences);
  } catch {
    return null;
  }
}

export async function persistNotificationPreferences(
  preferences: FundManagerNotificationPreferences
): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/fund-manager/notifications/preferences`, {
      body: JSON.stringify({ preferences }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    return response.ok;
  } catch {
    return false;
  }
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

export type NotificationHistoryStatus = "all" | "new" | "done" | "cleared";

export type DailyTaskDueState = "today" | "upcoming" | "overdue" | "completed";
export type DailyTaskPriority = "high" | "medium" | "low";
export type DailyTaskSource = "deterministic" | "recurring" | "ai";
export type DailyTaskSort = "priority" | "due" | "profile" | "bookmaker";

export type DailyTaskView = {
  notification: FundManagerNotification;
  dueState: DailyTaskDueState;
  dueLabel: string;
  priority: DailyTaskPriority;
  source: DailyTaskSource;
  confidence: number | null;
  evidence: string;
  priorityReason: string;
  attentionRank: number;
  financialSignificance: number | null;
  dateContext?: TaskDateContext;
};

export type TaskDateGroup = "Past Recorded Date" | "Immediate Review" | "Date Today" | "Upcoming" | "No Recorded Date";
export type TaskDateContext = { label: string; exact: string; group: Exclude<TaskDateGroup, "Immediate Review">; kind: "event" | "expiry" | "check" | "unknown"; clarification: string };
export const taskDateGroupOrder: readonly TaskDateGroup[] = ["Past Recorded Date", "Immediate Review", "Date Today", "Upcoming", "No Recorded Date"];

/** The feed mixes source dates and reminder times. Never label a reminder as an event deadline. */
export function presentTaskDateContext(notification: FundManagerNotification, now: Date): TaskDateContext {
  const kind = notification.notification_type === "free_bet_expiry" ? "expiry"
    : notification.notification_type === "settlement_review" ? "event"
    : ["partial_lay_reminder", "free_bet_follow_up_reminder"].includes(notification.notification_type) ? "check"
    : notification.notification_type === "profile_opportunity_reminder" && notification.settles_at ? "expiry" : "unknown";
  const raw = notification.notification_type === "profile_opportunity_reminder" ? notification.settles_at : notification.due_at;
  const parsed = raw && kind !== "unknown" ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return { label: "No recorded date", exact: "No recorded source date", group: "No Recorded Date", kind: "unknown", clarification: "No source date is recorded for this task." };
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(parsed);
  const exact = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/London" }).format(parsed);
  const dateKey = londonDateKey(parsed), todayKey = londonDateKey(now);
  const group = dateKey < todayKey ? "Past Recorded Date" : dateKey === todayKey ? "Date Today" : "Upcoming";
  const label = kind === "event" ? `${dateKey < todayKey ? "Event passed" : "Event"} ${day}`
    : kind === "expiry" ? `${dateKey < todayKey ? "Expired" : "Expires"} ${day}` : `Expected check ${day}`;
  const clarification = kind === "event" ? "Recorded event date; no settlement deadline is inferred."
    : kind === "check" ? "Recorded reminder time; it does not establish an event or settlement deadline."
    : notification.notification_type === "profile_opportunity_reminder" ? "Recorded opportunity expiry; current promotion availability is unverified." : "Recorded reward expiry.";
  return { label, exact, group, kind, clarification };
}

export function taskDateGroup(task: DailyTaskView): TaskDateGroup {
  if (task.notification.notification_type === "partial_lay_reminder" && task.attentionRank <= 2) return "Immediate Review";
  return task.dateContext?.group ?? "No Recorded Date";
}

/** Priority determines which group leads; approved Lab order breaks equal-rank ties. */
export function orderedTaskGroups(tasks: DailyTaskView[]): TaskDateGroup[] {
  return taskDateGroupOrder.filter(group => tasks.some(task => taskDateGroup(task) === group)).sort((a, b) =>
    Math.min(...tasks.filter(task => taskDateGroup(task) === a).map(task => task.attentionRank)) -
    Math.min(...tasks.filter(task => taskDateGroup(task) === b).map(task => task.attentionRank)) ||
    taskDateGroupOrder.indexOf(a) - taskDateGroupOrder.indexOf(b));
}

/** Urgent verified exposure/reward work belongs in Needs Action before its due day. */
export function isActionableDailyTask(task: DailyTaskView): boolean {
  return task.dueState === "today" || task.dueState === "overdue" ||
    (task.dueState === "upcoming" && task.priority === "high");
}

/** Read-only fields from the existing Profile ledger APIs. Absence is unknown, never zero. */
export type DailyTaskSourceEvidence = {
  profile_id: string;
  sportsbook_bet_id?: string;
  free_bet_id?: string;
  status?: string;
  result?: string;
  lay_status?: string;
  match_strategy?: string;
  calculation_state?: string;
  calculated_liability_1?: string | null;
  free_bet_value?: string;
  expiry_datetime?: string;
  origin_qual_bet_source_namespace?: string;
  origin_qual_bet_native_id?: string;
  origin_qual_bet_resolution_state?: string;
};

export type DailyTaskSourceIndex = {
  sportsbook: Map<string, DailyTaskSourceEvidence>;
  freeBets: Map<string, DailyTaskSourceEvidence>;
};

export const emptyDailyTaskSourceIndex = (): DailyTaskSourceIndex => ({ sportsbook: new Map(), freeBets: new Map() });
const sourceKey = (profileId: string, recordId: string) => `${profileId}:${recordId}`;

export async function loadDailyTaskSourceIndex(notifications: FundManagerNotification[]): Promise<DailyTaskSourceIndex> {
  const index = emptyDailyTaskSourceIndex();
  const profiles = [...new Set(notifications.filter(item => item.kind === "task" && item.profile_id && item.record_id &&
    (item.ledger_label === "Sportsbook Bets" || item.ledger_label === "Free Bets")).map(item => item.profile_id))];
  await Promise.all(profiles.flatMap(profileId => (["sportsbook-bets", "free-bets"] as const).map(async ledger => {
    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${encodeURIComponent(profileId)}/${ledger}`, { cache: "no-store", credentials: "include" });
      if (!response.ok) return;
      const rows = await response.json() as DailyTaskSourceEvidence[];
      if (!Array.isArray(rows)) return;
      const target = ledger === "sportsbook-bets" ? index.sportsbook : index.freeBets;
      for (const row of rows) {
        if (row.profile_id !== profileId) continue;
        const id = ledger === "sportsbook-bets" ? row.sportsbook_bet_id : row.free_bet_id;
        if (id) target.set(sourceKey(profileId, id), row);
      }
    } catch { /* An unavailable read cannot manufacture a priority fact. */ }
  })));
  return index;
}

function knownNonnegativeMoney(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed <= Number.MAX_SAFE_INTEGER ? parsed : null;
}

function londonDateKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function deriveDailyTaskView(
  notification: FundManagerNotification,
  viewState: NotificationViewState,
  now: Date = new Date(),
  sources: DailyTaskSourceIndex = emptyDailyTaskSourceIndex(),
  mode: "v2" | "legacy" = "v2"
): DailyTaskView {
  const completed =
    notification.task_state === "done" || isNotificationCleared(notification, viewState);
  const parsedDue = new Date(notification.due_at);
  const hasDue = notification.due_at.trim().length > 0 && !Number.isNaN(parsedDue.getTime());
  const todayKey = londonDateKey(now);
  const dueKey = hasDue ? londonDateKey(parsedDue) : "";
  const dueState: DailyTaskDueState = completed
    ? "completed"
    : !hasDue
      ? "today"
      : dueKey < todayKey
        ? "overdue"
        : dueKey === todayKey
          ? "today"
          : "upcoming";
  const dateContext = presentTaskDateContext(notification, now);
  if (mode === "legacy") {
    const priority: DailyTaskPriority = completed ? "low" : dueState === "overdue" ||
      notification.notification_type === "free_bet_expiry" && dueState === "today" ? "high" :
      notification.notification_type === "account_review" ? "low" : "medium";
    return { notification, dueState, dueLabel: completed ? "Completed" : hasDue ? formatNotificationDue(notification.due_at) : "Ready now · no deadline",
      priority, source: "deterministic", confidence: null, evidence: notification.message,
      priorityReason: "", attentionRank: priority === "high" ? 0 : priority === "medium" ? 1 : 2, financialSignificance: null };
  }
  const source = notification.ledger_label === "Sportsbook Bets"
    ? sources.sportsbook.get(sourceKey(notification.profile_id, notification.record_id))
    : notification.ledger_label === "Free Bets"
      ? sources.freeBets.get(sourceKey(notification.profile_id, notification.record_id)) : undefined;
  const linkedReward = notification.ledger_label === "Sportsbook Bets" ? [...sources.freeBets.values()].find(reward =>
    reward.profile_id === notification.profile_id && reward.origin_qual_bet_source_namespace === "sportsbook" &&
    reward.origin_qual_bet_native_id === notification.record_id && reward.origin_qual_bet_resolution_state === "resolved" &&
    !["Settled", "Void", "Cancelled"].includes(reward.status ?? "")) : undefined;
  const dueHours = hasDue ? (parsedDue.getTime() - now.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
  const createdAt = Date.parse(notification.created_at);
  const oldUnresolved = hasDue ? dueHours < -24 * 14 : Number.isFinite(createdAt) && (now.getTime() - createdAt) > 14 * 24 * 3_600_000;
  const liability = knownNonnegativeMoney(source?.calculated_liability_1);
  let attentionRank = 8;
  let priorityReason = "Routine — Review source record";
  if (completed) { attentionRank = 10; priorityReason = "Completed in this work list"; }
  else if ((notification.notification_type === "partial_lay_reminder" && !source) || (source?.status === "Placed" && ["Not Laid", "Part Laid"].includes(source.lay_status ?? ""))) {
    attentionRank = 0;
    priorityReason = notification.notification_type === "partial_lay_reminder" ? "High — Partial lay needs review" : "High — Lay matching needs review";
  } else if (notification.notification_type === "free_bet_expiry" && dueHours <= 48) {
    attentionRank = 1; priorityReason = "High — Recorded Free Bet expiry approaching";
  } else if (linkedReward) {
    attentionRank = 2; priorityReason = "High — Qualifying bet · linked Free Bet awaiting review";
  } else if (notification.notification_type === "free_bet_expiry" || (notification.notification_type === "free_bet_follow_up_reminder" && dueHours <= 48)) {
    attentionRank = 3; priorityReason = "Medium — Recorded reward deadline";
  } else if (notification.notification_type === "free_bet_follow_up_reminder") {
    attentionRank = 4; priorityReason = "Medium — Free Bet follow-up";
  } else if (notification.notification_type === "settlement_review") {
    attentionRank = oldUnresolved ? 7 : 5;
    priorityReason = oldUnresolved ? "Routine — Historical settlement reconciliation" : "Medium — Settlement pending";
  } else if (notification.notification_type === "account_review") {
    attentionRank = 8; priorityReason = "Routine — Account evidence review";
  } else if (dueState === "overdue" && !oldUnresolved) {
    attentionRank = 6; priorityReason = "Medium — Recorded deadline overdue";
  } else if (oldUnresolved) {
    attentionRank = 9; priorityReason = "Routine — Historical reconciliation";
  }
  if (!completed && source && ((notification.notification_type === "settlement_review" && source.status !== "Placed") ||
      (notification.notification_type === "partial_lay_reminder" && (source.status !== "Placed" || !["Not Laid", "Part Laid"].includes(source.lay_status ?? ""))))) {
    attentionRank = 9; priorityReason = "Routine — Source changed; refresh task evidence";
  }
  if (!completed && attentionRank === 0 && liability !== null && source?.calculated_liability_1) {
    priorityReason += ` · £${source.calculated_liability_1} calculated lay liability`;
  }
  const rewardValue = linkedReward ? knownNonnegativeMoney(linkedReward.free_bet_value) : null;
  if (!completed && attentionRank === 2 && rewardValue !== null && linkedReward?.free_bet_value) {
    priorityReason += ` · £${linkedReward.free_bet_value} recorded Free Bet value`;
  }
  if (!completed && attentionRank > 2 && source?.calculation_state === "review_required" &&
      ["Underlay", "Overlay", "Multilay-Underlay"].includes(source.match_strategy ?? "")) {
    attentionRank = 4; priorityReason = `Medium — ${source.match_strategy} calculation needs review`;
  }
  if (!completed && source && notification.notification_type === "free_bet_expiry" &&
      !["Prospecting", "Available", "Not Yet Awarded"].includes(source.status ?? "")) {
    attentionRank = 9; priorityReason = "Routine — Reward source changed; refresh task evidence";
  }
  if (!completed && attentionRank === 0 && oldUnresolved) {
    attentionRank = 4; priorityReason = "Medium — Historical lay status needs source review";
  }
  const priority: DailyTaskPriority = attentionRank <= 2 ? "high" : attentionRank <= 6 ? "medium" : "low";
  const dueLabel = completed ? "Completed" : dateContext.label;
  return {
    notification,
    dueState,
    dueLabel,
    priority,
    source: "deterministic",
    confidence: null,
    evidence: notification.message,
    priorityReason,
    attentionRank,
    financialSignificance: attentionRank === 0 ? liability : attentionRank === 2 ? rewardValue : null,
    dateContext,
  };
}

export function filterAndSortDailyTasks(
  tasks: DailyTaskView[],
  options: {
    dueState?: DailyTaskDueState | "actionable";
    profileId: string;
    bookmaker: string;
    notificationType: string;
    source: DailyTaskSource | "all";
    query: string;
    sort: DailyTaskSort;
    legacySort?: boolean;
  }
): DailyTaskView[] {
  const normalizedQuery = options.query.trim().toLocaleLowerCase();
  const filtered = tasks.filter((task) => {
    const item = task.notification;
    if (options.dueState && (options.dueState === "actionable" ? !isActionableDailyTask(task) : task.dueState !== options.dueState)) return false;
    if (options.profileId !== "all" && item.profile_id !== options.profileId) return false;
    if (options.bookmaker !== "all" && item.bookmaker_label !== options.bookmaker) return false;
    if (options.notificationType !== "all" && item.notification_type !== options.notificationType) return false;
    if (options.source !== "all" && task.source !== options.source) return false;
    if (!normalizedQuery) return true;
    return [item.title, item.message, item.profile_name, item.ledger_label, item.bookmaker_label, item.record_id]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
  return [...filtered].sort((left, right) => {
    const a = left.notification;
    const b = right.notification;
    if (options.sort === "profile") {
      return a.profile_name.localeCompare(b.profile_name) || a.title.localeCompare(b.title);
    }
    if (options.sort === "bookmaker") {
      return a.bookmaker_label.localeCompare(b.bookmaker_label) || a.profile_name.localeCompare(b.profile_name);
    }
    const leftDue = Date.parse(a.due_at);
    const rightDue = Date.parse(b.due_at);
    const dueOrder = (Number.isNaN(leftDue) ? Number.MAX_SAFE_INTEGER : leftDue) -
      (Number.isNaN(rightDue) ? Number.MAX_SAFE_INTEGER : rightDue);
    if (options.legacySort) return options.sort === "due" ? dueOrder || a.title.localeCompare(b.title) :
      left.attentionRank - right.attentionRank || dueOrder || a.title.localeCompare(b.title);
    if (options.sort === "due") return dueOrder || a.notification_id.localeCompare(b.notification_id);
    return left.attentionRank - right.attentionRank ||
      (right.financialSignificance ?? -1) - (left.financialSignificance ?? -1) ||
      dueOrder || a.notification_id.localeCompare(b.notification_id);
  });
}

export function sortNotificationInbox(
  notifications: FundManagerNotification[],
  viewState: NotificationViewState,
  now: Date,
  sources: DailyTaskSourceIndex = emptyDailyTaskSourceIndex()
): FundManagerNotification[] {
  const ranks = new Map(notifications.filter(item => item.kind === "task").map(item => [item.notification_id, deriveDailyTaskView(item, viewState, now, sources)]));
  return [...notifications].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "task" ? -1 : 1;
    if (a.kind === "task") {
      const left = ranks.get(a.notification_id), right = ranks.get(b.notification_id);
      if (left && right) return left.attentionRank - right.attentionRank ||
        (right.financialSignificance ?? -1) - (left.financialSignificance ?? -1) ||
        (Date.parse(a.due_at) || Number.MAX_SAFE_INTEGER) - (Date.parse(b.due_at) || Number.MAX_SAFE_INTEGER) ||
        a.notification_id.localeCompare(b.notification_id);
    }
    return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || a.notification_id.localeCompare(b.notification_id);
  });
}

export function isNotificationCleared(
  notification: FundManagerNotification,
  viewState: NotificationViewState
): boolean {
  return new Set(viewState.dismissedIds).has(notification.notification_id);
}

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
  return notifications.filter((notification) => {
    const isCleared = isNotificationCleared(notification, viewState);
    if (options.status === "cleared" && !isCleared) return false;
    if (options.status === "new" && (isCleared || notification.task_state !== "new")) return false;
    if (options.status === "done" && (isCleared || notification.task_state !== "done")) return false;
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

export function restoreNotificationIds(
  viewState: NotificationViewState,
  notificationIds: string[]
): NotificationViewState {
  const restored = new Set(notificationIds);
  return {
    readKeys: [...viewState.readKeys],
    dismissedIds: viewState.dismissedIds.filter((id) => !restored.has(id)),
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

/** Current feed only. Immutable History must never resurrect an obsolete task. */
export function currentDailyTasks(notifications: FundManagerNotification[]): FundManagerNotification[] {
  const byAction = new Map<string, FundManagerNotification>();
  for (const item of notifications) {
    if (item.kind !== "task" || item.audience !== "fund_manager" || item.security_tag !== "fund_manager_only") continue;
    const key = item.record_id ? `${item.notification_type}:${item.profile_id}:${item.record_id}` : item.notification_id;
    const previous = byAction.get(key);
    if (!previous || item.created_at > previous.created_at || (item.created_at === previous.created_at && item.notification_id > previous.notification_id)) byAction.set(key, item);
  }
  return [...byAction.values()];
}

export function canCompleteNotification(notification: FundManagerNotification): boolean {
  const profile = encodeURIComponent(notification.profile_id), record = encodeURIComponent(notification.record_id);
  return notification.kind === "task" && (
    notification.completion_href === `/profiles/${profile}/sportsbook-bets/${record}/partial-lay-reminder` ||
    notification.completion_href === `/profiles/${profile}/free-bets/${record}/follow-up-reminder`
  );
}
