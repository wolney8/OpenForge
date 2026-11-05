"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { DesignTodayBoard, DesignTodayDetail, DesignTodayFilters, DesignTodayTaskRow, DesignTodayToolbar, DesignTodayViewToggle, designTodayBoardColumnClass, designTodayBoardControlsClass, designTodayBoardDrawerClass, designTodayBoardWithDetailClass, designTodayBulkTrackClass, designTodayCollectionHeadingClass, designTodayContentClass, designTodayDetailActionsClass, designTodayDetailPaneClass, designTodayDetailTextClass, designTodayMobileDetailClass, designTodayPaginationClass, designTodayPropertiesClass, designTodayQueueClass, designTodayRootClass, designTodayStateEditorClass, designTodayTaskCollectionClass, designTodayTaskListClass, designTodayToolButtonClass, designTodayWithDetailClass } from "@/components/design-today-task-row";
import { DesignLabTaskState } from "@/components/design-lab-task-state";
import { DesignLabSelect } from "@/components/design-lab-select";
import { DesignPageHead, designPageHeadClasses } from "@/components/design-ledger-screen";
import { ModalBoundary } from "@/components/modal-boundary";
import { apiBaseUrl } from "@/lib/api";
import {
  currentDailyTasks,
  deriveDailyTaskView,
  emptyDailyTaskSourceIndex,
  dismissNotificationIds,
  emptyNotificationViewState,
  filterAndSortDailyTasks,
  isActionableDailyTask,
  filterFundManagerNotificationsForViewer,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
  FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
  TODAY_ACTIONABLE_NAVIGATION_EVENT,
  loadPersistedNotificationPreferences,
  loadDailyTaskSourceIndex,
  loadPersistedNotificationState,
  markNotificationsRead,
  normalizeNotificationViewState,
  persistNotificationState,
  restoreNotificationIds,
  type DailyTaskDueState,
  type DailyTaskView,
  type DailyTaskSort,
  type DailyTaskSource,
  type DailyTaskSourceIndex,
  type FundManagerNotification,
  type NotificationViewState,
} from "@/lib/notifications";
import { beginRouteTransition, endRouteTransition } from "@/lib/shell-loading";
import { loadTaskAnnotations, patchTaskAnnotations, TASK_ANNOTATIONS_REFRESH_EVENT, type TaskAnnotation, type TaskAnnotationChange, type TaskWorkState } from "@/lib/task-annotations";

const dueViews: { id: DailyTaskDueState; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

function loadViewState(): NotificationViewState {
  if (typeof window === "undefined") return emptyNotificationViewState;
  try {
    const stored = window.localStorage.getItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY);
    return stored ? normalizeNotificationViewState(JSON.parse(stored) as unknown) : emptyNotificationViewState;
  } catch {
    return emptyNotificationViewState;
  }
}

function taskTypeLabel(type: string): string {
  return type.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function priorityLabel(priority: "high" | "medium" | "low"): string {
  if (priority === "low") return "Routine";
  return priority[0].toUpperCase() + priority.slice(1);
}

export function DailyTasksPage({ uxV2 = false }: { uxV2?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const globalProfileScope = searchParams.get("scope");
  const refreshVersionRef = useRef(0);
  const stateRequestVersionRef = useRef(0);
  const stateMutationPendingRef = useRef(false);
  const [initialViewState] = useState<NotificationViewState>(loadViewState);
  const viewStateRef = useRef<NotificationViewState>(initialViewState);
  const [notifications, setNotifications] = useState<FundManagerNotification[]>([]);
  const [sourceIndex, setSourceIndex] = useState<DailyTaskSourceIndex>(emptyDailyTaskSourceIndex);
  const [viewState, setViewState] = useState(initialViewState);
  const [now, setNow] = useState(() => new Date());
  const [dueState, setDueState] = useState<DailyTaskDueState>("today");
  const [query, setQuery] = useState("");
  const [profileId, setProfileId] = useState("all");
  const [bookmaker, setBookmaker] = useState("all");
  const [notificationType, setNotificationType] = useState("all");
  const [source, setSource] = useState<DailyTaskSource | "all">("all");
  const [sort, setSort] = useState<DailyTaskSort>("priority");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(uxV2 ? 8 : 16);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPersistingState, setIsPersistingState] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [actionError, setActionError] = useState("");
  const [inspectedTaskId, setInspectedTaskId] = useState("");
  const [layout, setLayout] = useState<"List" | "Board">("List");
  const [collection, setCollection] = useState<"all" | "tracked">("all");
  const [annotations, setAnnotations] = useState<TaskAnnotation[] | null>(null);
  const [trackingPending, setTrackingPending] = useState(false);
  const [sourceHistoryOpen, setSourceHistoryOpen] = useState<boolean | null>(null);
  const [draftState, setDraftState] = useState<TaskWorkState>("To Do");
  const [draftBlockedReason, setDraftBlockedReason] = useState("");
  const [draftReviewDate, setDraftReviewDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const taskRowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const update = () => setNarrow(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (inspectedTaskId) window.requestAnimationFrame(() => detailHeadingRef.current?.focus({ preventScroll: true })); }, [inspectedTaskId, narrow]);
  useEffect(() => {
    if (!uxV2) return;
    let active = true;
    const refreshAnnotations = () => void loadTaskAnnotations().then(rows => { if (active) setAnnotations(rows); });
    refreshAnnotations();
    window.addEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, refreshAnnotations);
    return () => { active = false; window.removeEventListener(TASK_ANNOTATIONS_REFRESH_EVENT, refreshAnnotations); };
  }, [uxV2]);
  useEffect(() => {
    if (!uxV2) return;
    const next = searchParams.get("collection") === "tracked" ? "tracked" : "all";
    const frame = requestAnimationFrame(() => { setCollection(next); setPage(1); setInspectedTaskId(""); });
    return () => cancelAnimationFrame(frame);
  }, [searchParams, uxV2]);
  useEffect(() => {
    if (!uxV2) return;
    const frame = requestAnimationFrame(() => { setProfileId(globalProfileScope ?? "all"); setPage(1); setInspectedTaskId(""); });
    return () => cancelAnimationFrame(frame);
  }, [globalProfileScope, uxV2]);
  useEffect(() => {
    const showActionable = () => {
      setDueState("today"); setQuery(""); setProfileId(globalProfileScope ?? "all"); setBookmaker("all");
      setNotificationType("all"); setSource("all"); setSort("priority");
      setPage(1); setInspectedTaskId(""); setLayout("List"); setCollection("all"); window.scrollTo({ top: 0 });
    };
    window.addEventListener(TODAY_ACTIONABLE_NAVIGATION_EVENT, showActionable);
    return () => window.removeEventListener(TODAY_ACTIONABLE_NAVIGATION_EVENT, showActionable);
  }, [globalProfileScope]);

  const applyViewState = useCallback((next: NotificationViewState) => {
    viewStateRef.current = next;
    setViewState(next);
    try {
      window.localStorage.setItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Server persistence remains authoritative when browser storage is unavailable.
    }
  }, []);

  const refresh = useCallback(async (showLoading = true) => {
    const requestVersion = ++refreshVersionRef.current;
    const stateRequestVersion = stateRequestVersionRef.current;
    if (showLoading) setIsLoading(true);
    setNow(new Date());
    try {
      const [response, persistedState, preferences, persistedAnnotations] = await Promise.all([
        fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" }),
        loadPersistedNotificationState(),
        loadPersistedNotificationPreferences(),
        uxV2 ? loadTaskAnnotations() : Promise.resolve(null),
      ]);
      if (!response.ok || !persistedState || !preferences) throw new Error("Task evidence unavailable");
      const remote = currentDailyTasks(await response.json() as FundManagerNotification[]);
      const verifiedSources = uxV2 ? await loadDailyTaskSourceIndex(remote) : emptyDailyTaskSourceIndex();
      if (requestVersion !== refreshVersionRef.current) return;
      if (stateRequestVersion === stateRequestVersionRef.current) applyViewState(persistedState);
      setNotifications(filterFundManagerNotificationsForViewer(remote, preferences));
      setSourceIndex(verifiedSources);
      if (uxV2) setAnnotations(persistedAnnotations);
      setLoadFailed(false);
    } catch {
      if (requestVersion !== refreshVersionRef.current) return;
      setNotifications([]);
      setSourceIndex(emptyDailyTaskSourceIndex());
      setLoadFailed(true);
    } finally {
      if (requestVersion === refreshVersionRef.current) setIsLoading(false);
    }
  }, [applyViewState, uxV2]);

  useEffect(() => {
    let active = true;
    const handleRefresh = (event: Event) => {
      if (!active) return;
      if (event instanceof CustomEvent && event.detail?.scope === "notification-state") {
        const persisted = normalizeNotificationViewState(event.detail.state);
        stateRequestVersionRef.current += 1;
        applyViewState(persisted);
      }
      void refresh(false);
    };
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    window.addEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    return () => {
      active = false;
      window.clearTimeout(initialRefresh);
      window.removeEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    };
  }, [applyViewState, refresh]);

  const persistState = async (next: NotificationViewState, failureMessage: string) => {
    if (stateMutationPendingRef.current) return false;
    stateMutationPendingRef.current = true;
    setIsPersistingState(true);
    setActionError("");
    const mutationVersion = stateRequestVersionRef.current + 1;
    stateRequestVersionRef.current = mutationVersion;
    try {
      const persisted = await persistNotificationState(next);
      if (!persisted) {
        setActionError(failureMessage);
        return false;
      }
      if (mutationVersion === stateRequestVersionRef.current) applyViewState(persisted);
      window.dispatchEvent(new CustomEvent(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, {
        detail: { scope: "notification-state", state: persisted },
      }));
      return true;
    } finally {
      stateMutationPendingRef.current = false;
      setIsPersistingState(false);
    }
  };

  const taskViews = useMemo(
    () => notifications.map((item) => deriveDailyTaskView(item, viewState, now, sourceIndex, uxV2 ? "v2" : "legacy")),
    [notifications, now, sourceIndex, uxV2, viewState]
  );
  const scopedTaskViews = useMemo(() => uxV2 && globalProfileScope ? taskViews.filter(task => task.notification.profile_id === globalProfileScope) : taskViews, [globalProfileScope, taskViews, uxV2]);
  const profiles = useMemo(
    () => [...new Map(notifications.map((item) => [item.profile_id, item.profile_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [notifications]
  );
  const bookmakers = useMemo(
    () => [...new Set(notifications.map((item) => item.bookmaker_label).filter(Boolean))].sort(),
    [notifications]
  );
  const types = useMemo(
    () => [...new Set(notifications.map((item) => item.notification_type))].sort(),
    [notifications]
  );
  const counts = useMemo(() => dueViews.reduce<Record<DailyTaskDueState, number>>(
    (result, view) => ({ ...result, [view.id]: scopedTaskViews.filter((task) => task.dueState === view.id).length }),
    { today: 0, upcoming: 0, overdue: 0, completed: 0 }
  ), [scopedTaskViews]);
  const actionableCount = useMemo(() => scopedTaskViews.filter(isActionableDailyTask).length, [scopedTaskViews]);
  const activeFilterCount = [query.trim(), !globalProfileScope && profileId !== "all", bookmaker !== "all", notificationType !== "all", source !== "all", dueState !== "today"].filter(Boolean).length;
  const filtered = useMemo(() => {
    const options = { profileId, bookmaker, notificationType, source, query, sort, legacySort: !uxV2 };
    const rows = filterAndSortDailyTasks(scopedTaskViews, { ...options, dueState: uxV2 && collection === "tracked" ? undefined : uxV2 && dueState === "today" ? "actionable" : dueState });
    return collection === "tracked" ? rows.filter(task => annotations?.some(item => item.tracked && item.source_status === "active" && item.occurrence_key === task.notification.notification_id)) : rows;
  }, [annotations, bookmaker, collection, dueState, notificationType, profileId, query, sort, source, scopedTaskViews, uxV2]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    const target = searchParams.get("task");
    if (!uxV2 || collection !== "tracked" || !target) return;
    const index = filtered.findIndex(task => task.notification.notification_id === target);
    if (index >= 0) {
      const frame = requestAnimationFrame(() => { setPage(Math.floor(index / pageSize) + 1); setInspectedTaskId(target); });
      return () => cancelAnimationFrame(frame);
    }
  }, [collection, filtered, pageSize, searchParams, uxV2]);
  const inspectedTask = uxV2 ? paginated.find((task) => task.notification.notification_id === inspectedTaskId) : undefined;
  const annotationFor = (task: DailyTaskView) => annotations?.find(item => item.occurrence_key === task.notification.notification_id && item.profile_id === task.notification.profile_id);
  const trackedCount = annotations?.filter(item => item.tracked && item.source_status === "active" && (!globalProfileScope || item.profile_id === globalProfileScope)).length ?? 0;
  const trackedHistory = annotations?.filter(item => item.tracked && item.source_status !== "active" && (!globalProfileScope || item.profile_id === globalProfileScope)) ?? [];
  const savedTrackedCount = trackedCount + trackedHistory.length;

  const saveAnnotations = async (rows: DailyTaskView[], tracked: boolean, override?: { work_state: TaskWorkState; blocked_reason: string | null; review_date: string | null }) => {
    if (!annotations || trackingPending || !rows.length) return;
    setTrackingPending(true); setActionError("");
    const changes: TaskAnnotationChange[] = rows.map(task => {
      const item = annotationFor(task);
      return { profile_id: task.notification.profile_id, occurrence_key: task.notification.notification_id,
        tracked, work_state: override?.work_state ?? item?.work_state ?? "To Do",
        blocked_reason: override ? override.blocked_reason : item?.blocked_reason ?? null,
        review_date: override ? override.review_date : item?.review_date ?? null,
        expected_version: item?.version ?? 0 };
    });
    const result = await patchTaskAnnotations(changes);
    if (result.error) setActionError(result.error);
    else if (result.rows) setAnnotations(previous => [...(previous ?? []).filter(item => !result.rows!.some(row => row.occurrence_key === item.occurrence_key && row.profile_id === item.profile_id)), ...result.rows!]);
    setTrackingPending(false);
  };
  const untrackHistory = async (item: TaskAnnotation) => {
    if (trackingPending) return;
    setTrackingPending(true); setActionError("");
    const result = await patchTaskAnnotations([{ profile_id: item.profile_id, occurrence_key: item.occurrence_key, tracked: false,
      work_state: item.work_state, blocked_reason: item.blocked_reason, review_date: item.review_date,
      expected_version: item.version }]);
    if (result.error) setActionError(result.error);
    else if (result.rows) setAnnotations(previous => [...(previous ?? []).filter(row => row.occurrence_key !== item.occurrence_key || row.profile_id !== item.profile_id), ...result.rows!]);
    setTrackingPending(false);
  };
  const inspectTask = (task: DailyTaskView) => {
    const item = annotationFor(task);
    setDraftState(item?.work_state ?? "To Do");
    setDraftBlockedReason(item?.blocked_reason ?? "");
    setDraftReviewDate(item?.review_date ?? "");
    returnFocusRef.current = taskRowRefs.current.get(task.notification.notification_id) ?? null;
    setInspectedTaskId(task.notification.notification_id);
  };

  const closeInspector = () => {
    const returnId = inspectedTaskId;
    setInspectedTaskId("");
    window.requestAnimationFrame(() => (returnFocusRef.current?.isConnected ? returnFocusRef.current : taskRowRefs.current.get(returnId))?.focus({ preventScroll: true }));
  };

  const changeControls = (change: () => void) => {
    change();
    setPage(1);
  };

  const openTask = async (item: FundManagerNotification) => {
    if (openingId || isLoading) return;
    const requestVersion = ++refreshVersionRef.current;
    setOpeningId(item.notification_id);
    setActionError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Unable to recheck task access. Refresh and retry.");
      const current = currentDailyTasks(await response.json() as FundManagerNotification[]);
      if (requestVersion !== refreshVersionRef.current) return;
      setNotifications(current);
      const fresh = current.find((candidate) => candidate.notification_id === item.notification_id);
      if (!fresh) {
        setActionError("This task changed or is no longer available to you. The list has refreshed.");
        return;
      }
      void persistState(markNotificationsRead(viewStateRef.current, [fresh], new Date()), "Unable to mark this task as read.");
      beginRouteTransition();
      router.push(fresh.href);
    } catch (error) {
      if (requestVersion === refreshVersionRef.current) {
        setNotifications([]);
        setLoadFailed(true);
        setActionError(error instanceof Error ? error.message : "Unable to open task.");
      }
    } finally {
      setOpeningId("");
    }
  };

  const taskRow = (task: DailyTaskView, board = false) => {
    const item = task.notification;
    const annotation = annotationFor(task);
    return <div data-pd-id={`tasks.item.${item.notification_id}`} key={item.notification_id} role="listitem">
      <DesignTodayTaskRow accessibleName={`Inspect ${item.title} · ${item.profile_name}`} active={inspectedTaskId === item.notification_id}
        board={board} context={<>{item.bookmaker_label || item.ledger_label} · {item.profile_name}</>}
        controls="tasks-v2-inspector" dataPdId={`tasks.v2.row.${item.notification_id}`}
        date={task.dueLabel} extraContext={<small>{task.priorityReason}</small>} icon={task.priority === "high" ? "priority_high" : "task_alt"}
        onClick={() => inspectTask(task)}
        ref={(node) => { if (node) taskRowRefs.current.set(item.notification_id, node); else taskRowRefs.current.delete(item.notification_id); }}
        selectionMode="expanded" state={annotation?.tracked ? <DesignLabTaskState state={annotation.work_state} /> : board ? priorityLabel(task.priority) : undefined}
        title={item.title} urgent={task.priority === "high"} />
      {annotations ? <button aria-label={`${annotation?.tracked ? "Untrack" : "Track"} ${item.title} · ${item.profile_name}`} aria-pressed={Boolean(annotation?.tracked)} className={designTodayBulkTrackClass} data-pd-id={`tasks.v2.track.${item.notification_id}`} disabled={trackingPending || annotation?.source_status === "resolved"} onClick={() => void saveAnnotations([task], !annotation?.tracked)} type="button">{annotation?.tracked ? "Untrack" : "Track"}</button> : null}
    </div>;
  };

  const taskDetails = inspectedTask ? <DesignTodayDetail
    dataPdId="tasks.v2.detail" eyebrow={<>Task Details · {taskTypeLabel(inspectedTask.notification.notification_type)}</>}
    headingRef={detailHeadingRef} onClose={closeInspector} title={inspectedTask.notification.title}
    urgent={inspectedTask.priority === "high"}>
    <dl className={designTodayPropertiesClass}>
      <div><dt>Profile</dt><dd>{inspectedTask.notification.profile_name}</dd></div>
      <div><dt>Bookmaker / Provider</dt><dd>{inspectedTask.notification.bookmaker_label || inspectedTask.notification.ledger_label}</dd></div>
      <div><dt>Date Context</dt><dd>{inspectedTask.dueLabel}</dd></div>
      <div><dt>Task Type</dt><dd>{taskTypeLabel(inspectedTask.notification.notification_type)}</dd></div>
      <div><dt>Priority</dt><dd>{inspectedTask.priorityReason}</dd></div>
      {annotations ? <div><dt>Work State</dt><dd><DesignLabTaskState state={annotationFor(inspectedTask)?.work_state ?? "To Do"} /></dd></div> : null}
      <div><dt>Source</dt><dd>{inspectedTask.notification.ledger_label} · {inspectedTask.notification.record_id}</dd></div>
    </dl>
    <p className={designTodayDetailTextClass}>{inspectedTask.evidence}</p>
    {actionError ? <p className="notification-action-error" role="alert">{actionError}</p> : null}
    {annotations ? <div className={designTodayStateEditorClass}>
      <DesignLabSelect dataPdId={`tasks.v2.work-state.${inspectedTask.notification.notification_id}`} label="Work State" onChange={setDraftState} options={(["To Do", "In Progress", "Blocked", "Do Later"] as TaskWorkState[]).map(value => ({ value, label: value }))} value={draftState} />
      {draftState === "Blocked" ? <label>Blocked Reason<input aria-label={`${inspectedTask.notification.title} blocked reason`} maxLength={500} onChange={event => setDraftBlockedReason(event.target.value)} value={draftBlockedReason} /></label> : null}
      {draftState === "Do Later" ? <label>Review / Resume Date<input aria-label={`${inspectedTask.notification.title} review date`} onChange={event => setDraftReviewDate(event.target.value)} type="date" value={draftReviewDate} /></label> : null}
      <button disabled={trackingPending} onClick={() => { if (draftState === "Do Later" && !draftReviewDate) { setActionError("Choose a review date before saving Do Later."); return; } void saveAnnotations([inspectedTask], annotationFor(inspectedTask)?.tracked ?? false, { work_state: draftState, blocked_reason: draftState === "Blocked" ? draftBlockedReason || null : null, review_date: draftState === "Do Later" ? draftReviewDate || null : null }); }} type="button">Save Work State</button>
    </div> : <p>Tracking is temporarily unavailable. Refresh or sign in again.</p>}
    <div className={designTodayDetailActionsClass}>
      <Link aria-busy={openingId === inspectedTask.notification.notification_id} className="button-link" href={inspectedTask.notification.href}
        onClick={(event) => { event.preventDefault(); endRouteTransition(); void openTask(inspectedTask.notification); }} prefetch={false}>
        {openingId === inspectedTask.notification.notification_id ? "Checking Access…" : "Open Source"}
      </Link>
      {annotations ? <button aria-pressed={Boolean(annotationFor(inspectedTask)?.tracked)} disabled={trackingPending} onClick={() => void saveAnnotations([inspectedTask], !annotationFor(inspectedTask)?.tracked)} type="button">{annotationFor(inspectedTask)?.tracked ? "Untrack" : "Track Task"}</button> : null}
      <button disabled={isPersistingState} onClick={() => void persistState(inspectedTask.dueState === "completed" ? restoreNotificationIds(viewStateRef.current, [inspectedTask.notification.notification_id]) : dismissNotificationIds(viewStateRef.current, [inspectedTask.notification.notification_id]), "Unable to update this task.")} type="button">
        {inspectedTask.dueState === "completed" ? "Restore To Tasks" : "Clear From Tasks"}
      </button>
    </div>
    <small>Clearing changes this work list only. The source record and notification history remain.</small>
  </DesignTodayDetail> : null;

  return (
    <main className={`page-shell stack daily-tasks-page${uxV2 ? " ux-v2-today" : ""}`} data-pd-id="tasks.page">
      {uxV2 ? <DesignPageHead dataPdId="tasks.page-header">
        <div><h1>Today</h1></div>
        <div className={designPageHeadClasses.actions}><Link className="text-link" href="/notifications">Notifications</Link></div>
      </DesignPageHead> : <section className="hero-panel split-hero" data-pd-id="tasks.page-header">
        <div className="stack">
          <span className="eyebrow">Fund Manager</span>
          <h1>Daily Tasks</h1>
          <p>Prioritised actions from recorded Plum Duff evidence. Completing a task changes this work list only; its source record and Notification History remain intact.</p>
          <Link className="text-link" href="/notifications">Notification History</Link>
        </div>
        <aside className="shell-note stack" aria-label="Daily Task summary">
          <span className="eyebrow">Actionable Now</span>
          <strong aria-hidden={isLoading}>{isLoading || loadFailed ? "—" : actionableCount}</strong>
        </aside>
      </section>}

      <section aria-label="Daily Tasks" className={uxV2 ? designTodayRootClass : "content-panel stack"} data-pd-id="tasks.workspace">
        {uxV2 ? <>
          <nav aria-label="Today collections" className={designTodayDetailActionsClass} data-pd-id="tasks.v2.collections">
            <button aria-current={collection === "all" ? "page" : undefined} onClick={() => { setCollection("all"); setDueState("today"); setPage(1); setInspectedTaskId(""); router.replace(globalProfileScope ? `/tasks?scope=${encodeURIComponent(globalProfileScope)}` : "/tasks"); }} type="button">All Tasks</button>
            <button aria-current={collection === "tracked" ? "page" : undefined} disabled={!annotations} onClick={() => { setCollection("tracked"); setDueState("today"); setPage(1); setInspectedTaskId(""); router.replace(globalProfileScope ? `/tasks?scope=${encodeURIComponent(globalProfileScope)}&collection=tracked` : "/tasks?collection=tracked"); }} type="button">Tracked Tasks{annotations ? ` (${savedTrackedCount})` : ""}</button>
            {!annotations ? <small>Tracking is temporarily unavailable. Refresh or sign in again.</small> : null}
          </nav>
          <DesignTodayToolbar dataPdId="tasks.v2.toolbar" summary={<><strong>{isLoading || loadFailed ? "—" : actionableCount} Needs Attention</strong><span>{counts.upcoming} Upcoming</span><span>{counts.completed} Completed</span></>} actions={<>
            <DesignTodayViewToggle dataPdId="tasks.v2.layout-toggle" layout={layout} onChange={(next) => { setLayout(next); setInspectedTaskId(""); }} />
            <button aria-expanded={filtersOpen} className={designTodayToolButtonClass} data-pd-id="tasks.v2.filter-toggle" onClick={() => setFiltersOpen(value => !value)} type="button"><span aria-hidden="true" className="material-symbols-outlined">filter_list</span>Filters{activeFilterCount ? ` ${activeFilterCount}` : ""}</button>
            <span title="Recommended priority, then due time, with stable source tie-breakers"><DesignLabSelect compact dataPdId="tasks.sort" label="Sort Daily Tasks by priority, then due time" onChange={value => changeControls(() => setSort(value))} options={[{ value: "priority", label: "Priority" }, { value: "due", label: "Due Time" }, { value: "profile", label: "Profile" }, { value: "bookmaker", label: "Bookmaker" }]} value={sort} /></span>
          </>} />
          {filtersOpen ? <DesignTodayFilters dataPdId="tasks.v2.filters">
            <DesignLabSelect dataPdId="tasks.v2.view" label="Task lifecycle view" onChange={value => changeControls(() => setDueState(value))} options={dueViews.map(view => ({ value: view.id, label: view.id === "today" ? "Needs Action" : view.label }))} value={dueState} />
            <label className="field-control table-search-field"><span>Search Tasks</span><input aria-label="Search Daily Tasks" data-pd-id="tasks.search" onChange={(event) => changeControls(() => setQuery(event.target.value))} placeholder="Task, Profile, bookmaker or record" type="search" value={query} /></label>
            {!globalProfileScope ? <label className="field-control table-filter-field"><span>Profile</span><select aria-label="Filter Tasks By Profile" onChange={(event) => changeControls(() => setProfileId(event.target.value))} value={profileId}><option value="all">All Authorised Active Profiles</option>{profiles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
            <label className="field-control table-filter-field"><span>Bookmaker</span><select aria-label="Filter Tasks By Bookmaker" onChange={(event) => changeControls(() => setBookmaker(event.target.value))} value={bookmaker}><option value="all">All Bookmakers</option>{bookmakers.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Task Type</span><select aria-label="Filter Tasks By Type" onChange={(event) => changeControls(() => setNotificationType(event.target.value))} value={notificationType}><option value="all">All Task Types</option>{types.map(value => <option key={value} value={value}>{taskTypeLabel(value)}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Source</span><select aria-label="Filter Tasks By Source" onChange={(event) => changeControls(() => setSource(event.target.value as DailyTaskSource | "all"))} value={source}><option value="all">All Sources</option><option value="deterministic">Deterministic</option><option value="recurring" disabled>Recurring — Not Active</option><option value="ai" disabled>AI — Not Active</option></select></label>
            <label className="field-control table-filter-field"><span>Tasks per page</span><select aria-label="Tasks per page" data-pd-id="tasks.v2.page-size" onChange={event => changeControls(() => setPageSize(Number(event.target.value)))} value={pageSize}><option value={8}>8</option><option value={16}>16</option><option value={32}>32</option></select></label>
            <button className={designTodayToolButtonClass} disabled={!activeFilterCount} onClick={() => changeControls(() => { setQuery(""); setProfileId(globalProfileScope ?? "all"); setBookmaker("all"); setNotificationType("all"); setSource("all"); setDueState("today"); })} type="button">Clear Filters</button>
            <button className={designTodayToolButtonClass} data-pd-id="tasks.refresh" disabled={isLoading || isPersistingState} onClick={() => void refresh()} type="button"><span aria-hidden="true" className="material-symbols-outlined">refresh</span>Refresh Tasks</button>
          </DesignTodayFilters> : null}
        </> : <>
        <div aria-label="Task lifecycle views" className="analytics-tab-list daily-task-tabs" data-pd-id="tasks.tabs" role="tablist">
          {dueViews.map((view) => (
            <button
              aria-controls="daily-task-panel"
              aria-selected={dueState === view.id}
              className={dueState === view.id ? "is-active" : ""}
              data-pd-id={`tasks.tabs.${view.id}`}
              id={`daily-task-tab-${view.id}`}
              key={view.id}
              onClick={() => changeControls(() => setDueState(view.id))}
              role="tab"
              type="button"
            >
              {uxV2 && view.id === "today" ? "Needs Action" : view.label}<span>{uxV2 && view.id === "today" ? counts.today + counts.overdue : counts[view.id]}</span>
            </button>
          ))}
        </div>

        <div className="table-toolbar settings-table-toolbar daily-task-toolbar" data-pd-id="tasks.table-toolbar">
          <label className="field-control table-search-field">
            <span>Search Tasks</span>
            <input aria-label="Search Daily Tasks" data-pd-id="tasks.search" onChange={(event) => changeControls(() => setQuery(event.target.value))} placeholder="Task, Profile, bookmaker or record" type="search" value={query} />
          </label>
          <div className="settings-table-filter-group daily-task-primary-controls">
            <label className="field-control table-filter-field"><span>Sort By</span><select aria-label="Sort Daily Tasks" data-pd-id="tasks.sort" onChange={(event) => changeControls(() => setSort(event.target.value as DailyTaskSort))} value={sort}><option value="priority">Priority And Due Time</option><option value="due">Due Time</option><option value="profile">Profile</option><option value="bookmaker">Bookmaker</option></select></label>
            <button className="button-link" data-pd-id="tasks.refresh" disabled={isLoading || isPersistingState} onClick={() => void refresh()} type="button"><span aria-hidden="true" className="material-symbols-outlined">refresh</span>Refresh Tasks</button>
          </div>
        </div>

        <details className="content-subpanel daily-task-filter-disclosure" data-pd-id="tasks.filters">
          <summary>More Filters</summary>
          <div className="daily-task-filter-grid">
            <label className="field-control table-filter-field"><span>Profile</span><select aria-label="Filter Tasks By Profile" onChange={(event) => changeControls(() => setProfileId(event.target.value))} value={profileId}><option value="all">All Authorised Active Profiles</option>{profiles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Bookmaker</span><select aria-label="Filter Tasks By Bookmaker" onChange={(event) => changeControls(() => setBookmaker(event.target.value))} value={bookmaker}><option value="all">All Bookmakers</option>{bookmakers.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Task Type</span><select aria-label="Filter Tasks By Type" onChange={(event) => changeControls(() => setNotificationType(event.target.value))} value={notificationType}><option value="all">All Task Types</option>{types.map((value) => <option key={value} value={value}>{taskTypeLabel(value)}</option>)}</select></label>
            <label className="field-control table-filter-field"><span>Source</span><select aria-label="Filter Tasks By Source" onChange={(event) => changeControls(() => setSource(event.target.value as DailyTaskSource | "all"))} value={source}><option value="all">All Sources</option><option value="deterministic">Deterministic</option><option value="recurring" disabled>Recurring — Not Active</option><option value="ai" disabled>AI — Not Active</option></select></label>
          </div>
        </details>
        </>}

        {actionError ? <div className="notification-action-error" role="alert">{actionError}</div> : null}
        {isLoading ? (
          <section aria-busy="true" className="tracker-summary-shell sportsbook-page-shell" data-pd-id="tasks.loading-shell"><LedgerLoadingIndicator dataPdId="tasks.loading" label="Loading Daily Tasks" /></section>
        ) : loadFailed ? (
          <div className="notification-action-error" role="alert">Daily Tasks are temporarily unavailable. Use Refresh Tasks to retry.</div>
        ) : (
          <section aria-label={uxV2 ? "Source Tasks" : undefined} aria-labelledby={uxV2 ? undefined : `daily-task-tab-${dueState}`} id="daily-task-panel" role={uxV2 ? undefined : "tabpanel"}>
            {!uxV2 ? <p aria-live="polite" className="notification-history-count" role="status">{filtered.length} {dueViews.find((view) => view.id === dueState)?.label.toLocaleLowerCase()} task{filtered.length === 1 ? "" : "s"}</p> : null}
            {!uxV2 ? <LedgerPagination ariaLabel="Daily Tasks" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="top" totalRows={filtered.length} /> : null}
            {uxV2 ? <>
              <div className={`${designTodayContentClass}${inspectedTask && !narrow ? ` ${layout === "Board" ? designTodayBoardWithDetailClass : designTodayWithDetailClass}` : ""}`} data-pd-id="tasks.v2.layout">
                <div className={designTodayQueueClass}>
                  {layout === "List" ? <section aria-label="Source Tasks" className={designTodayTaskCollectionClass} data-pd-id="tasks.v2.collection">
                    <div className={designTodayCollectionHeadingClass}><h2>{collection === "tracked" ? "Tracked Tasks" : dueState === "today" ? "Needs Action" : dueViews.find(view => view.id === dueState)?.label} <span>{paginated.length}</span></h2>{annotations && paginated.length ? <button aria-label={`${paginated.every(task => annotationFor(task)?.tracked) ? "Untrack" : "Track"} all ${paginated.length} tasks on this page only`} className={designTodayBulkTrackClass} data-pd-id="tasks.v2.bulk-track" disabled={trackingPending} onClick={() => void saveAnnotations(paginated, !paginated.every(task => annotationFor(task)?.tracked))} type="button">{paginated.every(task => annotationFor(task)?.tracked) ? "Untrack All" : "Track All"} · This page ({paginated.length})</button> : null}</div>
                    <div aria-label="Tasks" className={designTodayTaskListClass} role="list">{paginated.map(task => taskRow(task))}</div>
                    {collection === "tracked" && trackedHistory.length ? <details data-pd-id="tasks.v2.tracked-history" onToggle={event => setSourceHistoryOpen(event.currentTarget.open)} open={sourceHistoryOpen ?? filtered.length === 0}><summary>Source history and unavailable tasks ({trackedHistory.length})</summary>{trackedHistory.map(item => <p key={`${item.profile_id}:${item.occurrence_key}`}>{item.title} · {item.source_status === "resolved" ? "Source Resolved" : item.source_status === "changed" ? "Source Changed" : "Source Unavailable"} <button aria-label={`Untrack ${item.title} from history`} disabled={trackingPending} onClick={() => void untrackHistory(item)} type="button">Untrack</button></p>)}</details> : null}
                    {!paginated.length ? <p className="ux-v2-task-empty">No tasks match these controls.</p> : null}
                  </section> : <>
                    <div className={designTodayBoardControlsClass}><span>Board grouped by source priority</span><div>
                      <button aria-label="Scroll Task Board Left" onClick={() => boardRef.current?.scrollBy({ left: -290, behavior: "smooth" })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_left</span></button>
                      <button aria-label="Scroll Task Board Right" onClick={() => boardRef.current?.scrollBy({ left: 290, behavior: "smooth" })} type="button"><span aria-hidden="true" className="material-symbols-outlined">chevron_right</span></button>
                    </div></div>
                    <DesignTodayBoard dataPdId="tasks.v2.board" ref={boardRef}>
                      {(["high", "medium", "low"] as const).map(priority => {
                        const rows = paginated.filter(task => task.priority === priority);
                        return <section aria-label={`${priorityLabel(priority)} Priority`} className={designTodayBoardColumnClass} data-empty={rows.length === 0} key={priority}>
                          <div className={designTodayCollectionHeadingClass}><h2>{priorityLabel(priority)} Priority <span>{rows.length}</span></h2>{annotations && rows.length ? <button aria-label={`${rows.every(task => annotationFor(task)?.tracked) ? "Untrack" : "Track"} all ${rows.length} visible ${priorityLabel(priority)} Priority tasks on this page only`} className={designTodayBulkTrackClass} disabled={trackingPending} onClick={() => void saveAnnotations(rows, !rows.every(task => annotationFor(task)?.tracked))} type="button">{rows.every(task => annotationFor(task)?.tracked) ? "Untrack All" : "Track All"} · This group ({rows.length})</button> : null}</div>
                          <div role="list">{rows.map(task => taskRow(task, true))}</div>
                        </section>;
                      })}
                    </DesignTodayBoard>
                  </>}
                </div>
                {inspectedTask && !narrow ? <aside aria-label="Task Details" className={`${designTodayDetailPaneClass}${layout === "Board" ? ` ${designTodayBoardDrawerClass}` : ""}`} data-pd-id="tasks.v2.inspector" id="tasks-v2-inspector">{taskDetails}</aside> : null}
              </div>
              {inspectedTask && narrow ? <ModalBoundary onDismiss={closeInspector} returnFocusRef={returnFocusRef}><div aria-label="Task Details" className={designTodayMobileDetailClass} data-pd-id="tasks.v2.inspector" id="tasks-v2-inspector" role="dialog">{taskDetails}</div></ModalBoundary> : null}
            </> : <div className="table-scroll daily-task-table-scroll" data-pd-id="tasks.table-scroll">
              <table className="data-table daily-task-table">
                <thead><tr><th>Priority</th><th>Task</th><th>Profile</th><th>Bookmaker</th><th>Due</th><th>Type</th><th>Source</th><th>Action</th></tr></thead>
                <tbody>
                  {paginated.map((task) => {
                    const item = task.notification;
                    const completed = task.dueState === "completed";
                    return (
                      <tr data-pd-id={`tasks.item.${item.notification_id}`} key={item.notification_id}>
                        <td data-label="Priority"><span className={`table-chip daily-task-priority daily-task-priority-${task.priority}`}>{priorityLabel(task.priority)}</span></td>
                        <td data-label="Task"><div className="daily-task-name"><strong>{item.title}</strong><small>{item.ledger_label} · {item.record_id}</small><details><summary>Evidence</summary><p>{task.evidence}</p></details></div></td>
                        <td data-label="Profile">{item.profile_name}</td>
                        <td data-label="Bookmaker">{item.bookmaker_label || "Not Applicable"}</td>
                        <td data-label="Due"><span className={`table-chip daily-task-due daily-task-due-${task.dueState}`}>{task.dueLabel}</span></td>
                        <td data-label="Type">{taskTypeLabel(item.notification_type)}</td>
                        <td data-label="Source">Deterministic</td>
                        <td data-label="Action"><div className="daily-task-actions"><Link aria-busy={openingId === item.notification_id} className="button-link" href={item.href} onClick={(event) => { event.preventDefault(); endRouteTransition(); void openTask(item); }} prefetch={false}>{openingId === item.notification_id ? "Checking Access…" : "Open"}</Link><button aria-label={`${completed ? "Restore" : "Complete"} ${item.title}`} className="icon-button" disabled={isPersistingState} onClick={() => void persistState(completed ? restoreNotificationIds(viewStateRef.current, [item.notification_id]) : dismissNotificationIds(viewStateRef.current, [item.notification_id]), `Unable to ${completed ? "restore" : "complete"} this task.`)} type="button"><span aria-hidden="true" className="material-symbols-outlined">{completed ? "restore" : "check"}</span></button></div></td>
                      </tr>
                    );
                  })}
                  {!paginated.length ? <tr><td className="dialog-table-empty-cell" colSpan={8}>No {dueViews.find((view) => view.id === dueState)?.label.toLocaleLowerCase()} tasks match these controls.</td></tr> : null}
                </tbody>
              </table>
            </div>}
            {uxV2 ? <nav aria-label="Today pages" className={designTodayPaginationClass} data-pd-id="tasks.v2.pagination"><span aria-live="polite">Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}</span><button aria-label="Previous Today page" disabled={currentPage <= 1} onClick={() => { setPage(currentPage - 1); setInspectedTaskId(""); }} type="button">Previous</button><button aria-label="Next Today page" disabled={currentPage >= pageCount} onClick={() => { setPage(currentPage + 1); setInspectedTaskId(""); }} type="button">Next</button></nav> : <LedgerPagination ariaLabel="Daily Tasks" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filtered.length} />}
          </section>
        )}
      </section>
    </main>
  );
}
