"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/components/design-lab-connected.module.css";
import { TrackedTaskCard } from "@/components/tracked-task-card";
import { loadTrackedTaskContext, trackedTaskKey, type TrackedTaskContext } from "@/lib/tracked-task-context";
import { acknowledgedTaskAnnotationRows, loadTaskAnnotations, mergeTaskAnnotationRows, TASK_ANNOTATIONS_REFRESH_EVENT, trackedTaskDetailsHref, untrackTaskAnnotation, type TaskAnnotation } from "@/lib/task-annotations";

const visibilityKey = "plum-duff:v2-tracked-banner-visibility";
export const SHOW_TRACKED_TASKS_BANNER_EVENT = "pd:show-tracked-tasks-banner";
export const TRACKED_BANNER_VISIBILITY_EVENT = "pd:tracked-banner-visibility";
type Visibility = "expanded" | "compact" | "hidden";

function initialVisibility(): Visibility {
  try {
    const value = window.localStorage.getItem(visibilityKey);
    return value === "hidden" ? "hidden" : "compact";
  } catch { return "compact"; }
}
export function trackedBannerIsHidden(): boolean { return initialVisibility() === "hidden"; }

/** The approved Lab tray with the authenticated annotation store as its data adapter. */
export function TrackedTasksBanner() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const routeProfileId = pathname.match(/^\/profiles\/([^/]+)/)?.[1] ?? null;
  const requestedScope = routeProfileId ?? searchParams.get("scope");
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [annotations, setAnnotations] = useState<TaskAnnotation[] | null>(null);
  const [taskContext, setTaskContext] = useState<Map<string, TrackedTaskContext>>(new Map());
  const taskContextRef = useRef(taskContext);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [failedItem, setFailedItem] = useState<TaskAnnotation | null>(null);
  const [feedback, setFeedback] = useState("");
  const requestId = useRef(0);
  useEffect(() => { taskContextRef.current = taskContext; }, [taskContext]);

  const setBannerVisibility = (next: Visibility) => {
    setVisibility(next);
    try { if (next === "hidden") window.localStorage.setItem(visibilityKey, "hidden"); else window.localStorage.removeItem(visibilityKey); } catch { /* Presentation remains usable without storage. */ }
    window.dispatchEvent(new Event(TRACKED_BANNER_VISIBILITY_EVENT));
  };
  const refresh = useCallback(async () => {
    if (pathname === "/design-lab" || pathname.startsWith("/design-lab/")) return;
    const current = ++requestId.current;
    const rows = await loadTaskAnnotations();
    if (current !== requestId.current) return;
    if (rows === null) { setError("Tracked Tasks could not be loaded. Retry when your session is available."); return; }
    setAnnotations(rows);
    setError("");
    try { const contexts = await loadTrackedTaskContext(rows); if (current === requestId.current) setTaskContext(contexts); }
    catch { if (current === requestId.current) setTaskContext(new Map()); }
  }, [pathname]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const onRefresh = (event: Event) => {
      const rows = acknowledgedTaskAnnotationRows(event);
      if (!rows) { void refresh(); return; }
      requestId.current += 1;
      setAnnotations(current => mergeTaskAnnotationRows(current, rows));
      if (rows.some(row => row.tracked && !taskContextRef.current.has(trackedTaskKey(row.profile_id, row.occurrence_key)))) {
        void loadTrackedTaskContext(rows).then(contexts => setTaskContext(current => new Map([...current, ...contexts]))).catch(() => undefined);
      }
    };
    const onShow = () => setBannerVisibility("compact");
    window.addEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener(SHOW_TRACKED_TASKS_BANNER_EVENT, onShow);
    return () => { window.clearTimeout(timer); requestId.current += 1; window.removeEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, onRefresh); window.removeEventListener(SHOW_TRACKED_TASKS_BANNER_EVENT, onShow); };
  }, [refresh]);

  if (pathname === "/design-lab" || pathname.startsWith("/design-lab/")) return null;
  if (!annotations) return visibility === "hidden" ? null : error ? <p className={styles.trackedNotice} role="alert">{error} <button onClick={() => void refresh()} type="button">Retry</button></p> : <section aria-busy="true" aria-label="Tracked Tasks loading" className={styles.activeTaskTray} data-pd-id="v2.active-task.loading"><div className={styles.trackedHeader}><span>Loading tracked tasks…</span></div></section>;
  if (!annotations.some(item => item.tracked)) return error || feedback ? <p className={styles.trackedNotice} role={error ? "alert" : "status"}>{error || feedback} {error ? <button onClick={() => void refresh()} type="button">Retry</button> : null}</p> : null;
  const scopeRows = annotations.filter(item => item.tracked && (!requestedScope || item.profile_id === requestedScope));
  const active = scopeRows.filter(item => item.source_status === "active" && !item.reviewed_at);
  const history = scopeRows.filter(item => item.source_status !== "active" || Boolean(item.reviewed_at));
  if (!scopeRows.length) return null;
  if (visibility === "hidden") return null;

  const untrack = async (item: TaskAnnotation) => {
    const key = `${item.profile_id}:${item.occurrence_key}`;
    if (pending) return;
    setPending(key);
    setError(""); setFeedback(""); setFailedItem(null);
    const result = await untrackTaskAnnotation(item.profile_id, item.occurrence_key);
    if (result.error) { setError(result.error); setFailedItem(item); }
    else setFeedback("Untracked");
    setPending("");
  };
  const renderRow = (item: TaskAnnotation) => {
    const key = `${item.profile_id}:${item.occurrence_key}`;
    return <TrackedTaskCard context={taskContext.get(trackedTaskKey(item.profile_id, item.occurrence_key))} item={item} key={key} onUntrack={() => void untrack(item)} pending={pending === key} taskHref={trackedTaskDetailsHref(item, requestedScope)} />;
  };

  return <section aria-label="Tracked Tasks" className={styles.activeTaskTray} data-pd-id="v2.active-task">
    <div className={styles.trackedHeader}>
      <button aria-expanded={visibility === "expanded"} aria-label={visibility === "expanded" ? "Collapse Tracked Tasks" : "Expand Tracked Tasks"} className={styles.trackedHeaderToggle} data-pd-id="v2.active-task.toggle" onClick={() => setBannerVisibility(visibility === "expanded" ? "compact" : "expanded")} type="button"><span><strong>Tracked Tasks ({active.length} active{history.length ? ` · ${history.length} history` : ""})</strong>{visibility === "compact" && active[0] ? <small>Current · {active[0].title}</small> : null}</span><span aria-hidden="true" className="material-symbols-outlined">{visibility === "expanded" ? "expand_less" : "expand_more"}</span></button>
      <button aria-label="Hide Tracked Tasks Banner" className={`${styles.iconButton} ${styles.hideBanner}`} onClick={() => setBannerVisibility("hidden")} type="button"><span aria-hidden="true" className="material-symbols-outlined">visibility_off</span></button>
    </div>
    {visibility === "expanded" ? <div className={styles.trackedRows}>{active.map(renderRow)}{history.length ? <details className={styles.trackedHistory}><summary>Source history and unavailable tasks ({history.length})</summary>{history.map(renderRow)}</details> : null}{pending ? <p aria-live="polite" role="status">Untracking…</p> : null}{error ? <p role="alert">{error} {failedItem ? <button onClick={() => void untrack(failedItem)} type="button">Retry Untrack</button> : null}</p> : null}{feedback ? <p aria-live="polite" role="status">{feedback}</p> : null}</div> : null}
  </section>;
}
