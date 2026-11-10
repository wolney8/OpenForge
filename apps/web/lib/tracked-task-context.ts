import { apiBaseUrl } from "@/lib/api";
import { deriveDailyTaskView, emptyNotificationViewState, loadDailyTaskSourceIndex, type DailyTaskView, type FundManagerNotification } from "@/lib/notifications";
import type { TaskAnnotation } from "@/lib/task-annotations";

export type TrackedTaskContext = { href: string; task: DailyTaskView };
export const trackedTaskKey = (profileId: string, occurrenceKey: string) => `${profileId}:${occurrenceKey}`;

/** Reuse Today's source-verified ranking; a missing source read supplies no inferred urgency. */
export async function loadTrackedTaskContext(annotations: TaskAnnotation[]): Promise<Map<string, TrackedTaskContext>> {
  const response = await fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("Task source context could not be loaded.");
  const notifications = await response.json() as FundManagerNotification[];
  if (!Array.isArray(notifications)) throw new Error("Task source context is unavailable.");
  const tracked = new Set(annotations.filter(item => item.tracked).map(item => trackedTaskKey(item.profile_id, item.occurrence_key)));
  const matching = notifications.filter(item => tracked.has(trackedTaskKey(item.profile_id, item.notification_id)));
  const sources = await loadDailyTaskSourceIndex(matching);
  return new Map(matching.map(item => [trackedTaskKey(item.profile_id, item.notification_id), {
    href: item.href?.startsWith("/") && !item.href.startsWith("//") ? item.href : "",
    task: deriveDailyTaskView(item, emptyNotificationViewState, new Date(), sources),
  }]));
}
