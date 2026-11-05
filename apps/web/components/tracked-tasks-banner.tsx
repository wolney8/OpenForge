"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/components/design-lab-connected.module.css";
import { apiBaseUrl } from "@/lib/api";
import { loadTaskAnnotations, patchTaskAnnotations, TASK_ANNOTATIONS_REFRESH_EVENT, type TaskAnnotation } from "@/lib/task-annotations";

const visibilityKey = "plum-duff:v2-tracked-banner-visibility";
export const SHOW_TRACKED_TASKS_BANNER_EVENT = "pd:show-tracked-tasks-banner";
type Visibility = "expanded" | "compact" | "hidden";
type SourceLink = { profileId: string; occurrenceKey: string; href: string };

function initialVisibility(): Visibility {
  try {
    const value = window.localStorage.getItem(visibilityKey);
    return value === "compact" || value === "hidden" ? value : "expanded";
  } catch { return "expanded"; }
}

/** The approved Lab tray with the authenticated annotation store as its data adapter. */
export function TrackedTasksBanner() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const routeProfileId = pathname.match(/^\/profiles\/([^/]+)/)?.[1] ?? null;
  const requestedScope = routeProfileId ?? searchParams.get("scope");
  const [visibility, setVisibility] = useState<Visibility>("expanded");
  const [annotations, setAnnotations] = useState<TaskAnnotation[] | null>(null);
  const [sourceLinks, setSourceLinks] = useState<SourceLink[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const requestId = useRef(0);

  useEffect(() => { const frame = requestAnimationFrame(() => setVisibility(initialVisibility())); return () => cancelAnimationFrame(frame); }, []);
  const setBannerVisibility = (next: Visibility) => {
    setVisibility(next);
    try { window.localStorage.setItem(visibilityKey, next); } catch { /* Presentation remains usable without storage. */ }
  };
  const refresh = useCallback(async () => {
    if (pathname === "/design-lab" || pathname.startsWith("/design-lab/")) return;
    const current = ++requestId.current;
    const [rows, response] = await Promise.all([
      loadTaskAnnotations(),
      fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" }).catch(() => null),
    ]);
    if (current !== requestId.current) return;
    if (rows === null) { setError("Tracked Tasks could not be loaded. Retry when your session is available."); return; }
    setAnnotations(rows);
    setError("");
    if (response?.ok) {
      const notifications = await response.json() as Array<{ profile_id: string; notification_id: string; href: string }>;
      if (current !== requestId.current) return;
      setSourceLinks(notifications.filter(item => item.href?.startsWith("/") && !item.href.startsWith("//")).map(item => ({ profileId: item.profile_id, occurrenceKey: item.notification_id, href: item.href })));
    }
  }, [pathname]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    const onRefresh = () => void refresh();
    const onShow = () => setBannerVisibility("expanded");
    window.addEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener(SHOW_TRACKED_TASKS_BANNER_EVENT, onShow);
    return () => { window.clearTimeout(timer); requestId.current += 1; window.removeEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, onRefresh); window.removeEventListener(SHOW_TRACKED_TASKS_BANNER_EVENT, onShow); };
  }, [refresh]);

  if (pathname === "/design-lab" || pathname.startsWith("/design-lab/") || !annotations?.some(item => item.tracked)) return error ? <p className={styles.trackedNotice} role="alert">{error} <button onClick={() => void refresh()} type="button">Retry</button></p> : null;
  const scopeRows = annotations.filter(item => item.tracked && (!requestedScope || item.profile_id === requestedScope));
  const active = scopeRows.filter(item => item.source_status === "active");
  const history = scopeRows.filter(item => item.source_status !== "active");
  if (!scopeRows.length) return null;
  if (visibility === "hidden") return null;

  const untrack = async (item: TaskAnnotation) => {
    setPending(`${item.profile_id}:${item.occurrence_key}`);
    const result = await patchTaskAnnotations([{ profile_id: item.profile_id, occurrence_key: item.occurrence_key, tracked: false, work_state: item.work_state, blocked_reason: item.blocked_reason, review_date: item.review_date, expected_version: item.version }]);
    if (result.error) setError(result.error);
    else void refresh();
    setPending("");
  };
  const renderRow = (item: TaskAnnotation) => {
    const key = `${item.profile_id}:${item.occurrence_key}`;
    const source = item.source_status === "active" ? sourceLinks.find(link => link.profileId === item.profile_id && link.occurrenceKey === item.occurrence_key) : null;
    return <div className={styles.trackedRow} data-pd-id={`tracked-banner.row.${key}`} key={key}>
      <div><strong>{item.title}</strong><small>{item.profile_name} · {item.work_state}{item.source_status !== "active" ? ` · Source ${item.source_status}` : ""}{item.work_state === "Blocked" && item.blocked_reason ? ` · ${item.blocked_reason}` : ""}</small></div>
      <div className={styles.trackedActions}>
        {source ? <Link href={source.href}>Open Source</Link> : <Link href={`/tasks?${requestedScope ? `scope=${encodeURIComponent(requestedScope)}&` : ""}collection=tracked&task=${encodeURIComponent(item.occurrence_key)}`}>View Task</Link>}
        <button aria-label={`Untrack ${item.title} — ${item.profile_name}`} disabled={pending === key} onClick={() => void untrack(item)} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
      </div>
    </div>;
  };

  return <section aria-label="Tracked Tasks" className={styles.activeTaskTray} data-pd-id="v2.active-task">
    <div className={styles.trackedHeader}>
      <button aria-expanded={visibility === "expanded"} aria-label={visibility === "expanded" ? "Collapse Tracked Tasks" : "Expand Tracked Tasks"} className={styles.trackedHeaderToggle} data-pd-id="v2.active-task.toggle" onClick={() => setBannerVisibility(visibility === "expanded" ? "compact" : "expanded")} type="button"><span><strong>Tracked Tasks ({active.length} active{history.length ? ` · ${history.length} history` : ""})</strong>{visibility === "compact" && active[0] ? <small>Current · {active[0].title}</small> : null}</span><span aria-hidden="true" className="material-symbols-outlined">{visibility === "expanded" ? "expand_less" : "expand_more"}</span></button>
      <button aria-label="Hide Tracked Tasks Banner" className={`${styles.iconButton} ${styles.hideBanner}`} onClick={() => setBannerVisibility("hidden")} type="button"><span aria-hidden="true" className="material-symbols-outlined">visibility_off</span></button>
    </div>
    {visibility === "expanded" ? <div className={styles.trackedRows}>{active.map(renderRow)}{history.length ? <details className={styles.trackedHistory}><summary>Source history and unavailable tasks ({history.length})</summary>{history.map(renderRow)}</details> : null}{error ? <p role="alert">{error}</p> : null}</div> : null}
  </section>;
}
