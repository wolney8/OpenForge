import { apiBaseUrl } from "@/lib/api";
import { deriveDailyTaskView, emptyNotificationViewState, loadDailyTaskSourceIndex, type DailyTaskView, type FundManagerNotification } from "@/lib/notifications";
import { loadAuthorizedProfileOpportunities, opportunityAnnotationOccurrence } from "@/lib/profile-opportunities";
import type { TaskAnnotation } from "@/lib/task-annotations";

export type TrackedTaskContext = { href: string; task?: DailyTaskView; bookmakerLabel?: string };
export const trackedTaskKey = (profileId: string, occurrenceKey: string) => `${profileId}:${occurrenceKey}`;

const contextReads = new Map<string, Promise<Map<string, TrackedTaskContext>>>();

/** Share only concurrent reads; later refreshes still recheck source and permission state. */
export function loadTrackedTaskContext(annotations: TaskAnnotation[]): Promise<Map<string, TrackedTaskContext>> {
  const key = annotations.filter(item => item.tracked).map(item => trackedTaskKey(item.profile_id, item.occurrence_key)).sort().join("|");
  const pending = contextReads.get(key);
  if (pending) return pending;
  const read = readTrackedTaskContext(annotations);
  contextReads.set(key, read);
  void read.then(() => { if (contextReads.get(key) === read) contextReads.delete(key); }, () => { if (contextReads.get(key) === read) contextReads.delete(key); });
  return read;
}

/** Reuse Today's source-verified ranking; a missing source read supplies no inferred urgency. */
async function readTrackedTaskContext(annotations: TaskAnnotation[]): Promise<Map<string, TrackedTaskContext>> {
  const response = await fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" });
  if (!response.ok) throw new Error("Task source context could not be loaded.");
  const notifications = await response.json() as FundManagerNotification[];
  if (!Array.isArray(notifications)) throw new Error("Task source context is unavailable.");
  const tracked = new Set(annotations.filter(item => item.tracked).map(item => trackedTaskKey(item.profile_id, item.occurrence_key)));
  const matching = notifications.filter(item => tracked.has(trackedTaskKey(item.profile_id, item.notification_id)));
  const sources = await loadDailyTaskSourceIndex(matching);
  const context = new Map<string, TrackedTaskContext>(matching.map(item => [trackedTaskKey(item.profile_id, item.notification_id), {
    href: item.href?.startsWith("/") && !item.href.startsWith("//") ? item.href : "",
    task: deriveDailyTaskView(item, emptyNotificationViewState, new Date(), sources),
  }] satisfies [string, TrackedTaskContext]));
  if (annotations.some(item => item.tracked && item.occurrence_key.startsWith("profile-opportunity:") && !context.has(trackedTaskKey(item.profile_id, item.occurrence_key)))) {
    const opportunities = await loadAuthorizedProfileOpportunities(null);
    for (const item of opportunities.rows) {
      const occurrence = opportunityAnnotationOccurrence(item, true);
      if (occurrence && tracked.has(trackedTaskKey(item.profileId, occurrence))) context.set(trackedTaskKey(item.profileId, occurrence), {
        href: `/profiles/${encodeURIComponent(item.profileId)}/tracker/accounts#profile-opportunities`, bookmakerLabel: item.bookmaker,
      });
    }
  }
  return context;
}
