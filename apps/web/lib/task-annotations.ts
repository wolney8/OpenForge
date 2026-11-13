import { apiBaseUrl } from "@/lib/api";

export const TASK_ANNOTATIONS_REFRESH_EVENT = "pd:task-annotations-refresh";
export type TaskWorkState = "To Do" | "In Progress" | "Blocked" | "Do Later";
export type TaskAnnotation = {
  profile_id: string;
  profile_name: string;
  occurrence_key: string;
  source_key: string;
  title: string;
  source_status: "active" | "resolved" | "changed" | "unavailable";
  tracked: boolean;
  work_state: TaskWorkState;
  blocked_reason: string | null;
  review_date: string | null;
  next_action?: string | null;
  notes?: string | null;
  reviewed_at?: string | null;
  version: number;
  updated_at: string;
};
export type TaskAnnotationChange = Pick<TaskAnnotation, "profile_id" | "occurrence_key" | "tracked" | "work_state" | "blocked_reason" | "review_date"> & { expected_version: number; next_action?: string | null; notes?: string | null; reviewed?: boolean };

export function mergeTaskAnnotationRows(current: TaskAnnotation[] | null, rows: TaskAnnotation[]): TaskAnnotation[] {
  const updates = new Map(rows.map(row => [`${row.profile_id}:${row.occurrence_key}`, row]));
  return [...(current ?? []).filter(row => !updates.has(`${row.profile_id}:${row.occurrence_key}`)), ...rows];
}

export function acknowledgedTaskAnnotationRows(event: Event): TaskAnnotation[] | null {
  return event instanceof CustomEvent && Array.isArray(event.detail?.rows) ? event.detail.rows as TaskAnnotation[] : null;
}

export function publishAcknowledgedTaskAnnotationRows(rows: TaskAnnotation[]): void {
  window.dispatchEvent(new CustomEvent(TASK_ANNOTATIONS_REFRESH_EVENT, { detail: { rows } }));
}

const pendingPersonalFlush = new Map<string, () => Promise<boolean>>();
const untrackPending = new Map<string, Promise<{ rows?: TaskAnnotation[]; error?: string }>>();

export function registerPendingTaskAnnotationFlush(profileId: string, occurrenceKey: string, flush: () => Promise<boolean>): () => void {
  const key = `${profileId}:${occurrenceKey}`;
  pendingPersonalFlush.set(key, flush);
  return () => { if (pendingPersonalFlush.get(key) === flush) pendingPersonalFlush.delete(key); };
}

/** Coordinate banner/header X with an open personal-review editor before using the latest server version. */
export function untrackTaskAnnotation(profileId: string, occurrenceKey: string): Promise<{ rows?: TaskAnnotation[]; error?: string }> {
  const key = `${profileId}:${occurrenceKey}`;
  const existing = untrackPending.get(key);
  if (existing) return existing;
  const operation = (async () => {
    try {
      const flush = pendingPersonalFlush.get(key);
      if (flush && !await flush()) return { error: "Save or retry your personal review before untracking." };
      const rows = await loadTaskAnnotations();
      if (!rows) return { error: "Current tracking state could not be loaded. Retry." };
      const current = rows.find(row => row.profile_id === profileId && row.occurrence_key === occurrenceKey);
      if (!current) return { error: "This tracked task is unavailable. Refresh and retry." };
      if (!current.tracked) { publishAcknowledgedTaskAnnotationRows([current]); return { rows: [current] }; }
      return patchTaskAnnotations([{ profile_id: profileId, occurrence_key: occurrenceKey, tracked: false,
        work_state: current.work_state, blocked_reason: current.blocked_reason, review_date: current.review_date,
        expected_version: current.version }]);
    } catch { return { error: "Untrack could not be confirmed. Retry after checking your personal review." }; }
  })();
  untrackPending.set(key, operation);
  void operation.then(() => { if (untrackPending.get(key) === operation) untrackPending.delete(key); });
  return operation;
}

export function trackedTaskDetailsHref(item: Pick<TaskAnnotation, "profile_id" | "occurrence_key">, scope?: string | null): string {
  const query = new URLSearchParams();
  if (scope) query.set("scope", scope);
  if (item.occurrence_key.startsWith("profile-opportunity:")) query.set("opportunity", item.occurrence_key);
  else { query.set("collection", "tracked"); query.set("task", item.occurrence_key); }
  return `/tasks?${query.toString()}`;
}

export async function loadTaskAnnotations(): Promise<TaskAnnotation[] | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/fund-manager/tasks/annotations`, { cache: "no-store", credentials: "include" });
    return response.ok ? await response.json() as TaskAnnotation[] : null;
  } catch { return null; }
}

export async function patchTaskAnnotations(changes: TaskAnnotationChange[]): Promise<{ rows?: TaskAnnotation[]; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/fund-manager/tasks/annotations`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    });
    if (response.status === 409) return { error: "Task tracking changed or its source is no longer current. Refresh and retry." };
    if (!response.ok) return { error: "Unable to save task tracking. Please retry." };
    const rows = await response.json() as TaskAnnotation[];
    publishAcknowledgedTaskAnnotationRows(rows);
    return { rows };
  } catch { return { error: "Unable to save task tracking. Please retry." }; }
}
