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
    window.dispatchEvent(new Event(TASK_ANNOTATIONS_REFRESH_EVENT));
    return { rows };
  } catch { return { error: "Unable to save task tracking. Please retry." }; }
}
