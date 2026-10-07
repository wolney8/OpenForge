"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { LedgerPagination } from "@/components/ledger-pagination";
import { apiBaseUrl } from "@/lib/api";
import {
  currentDailyTasks,
  deriveDailyTaskView,
  dismissNotificationIds,
  emptyNotificationViewState,
  filterAndSortDailyTasks,
  filterFundManagerNotificationsForViewer,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
  FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
  loadPersistedNotificationPreferences,
  loadPersistedNotificationState,
  loadFundManagerNotificationFeed,
  markNotificationsRead,
  normalizeNotificationViewState,
  persistNotificationState,
  restoreNotificationIds,
  type DailyTaskDueState,
  type DailyTaskSort,
  type DailyTaskSource,
  type FundManagerNotification,
  type NotificationViewState,
} from "@/lib/notifications";
import { beginRouteTransition, endRouteTransition } from "@/lib/shell-loading";

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
  return priority[0].toUpperCase() + priority.slice(1);
}

export function DailyTasksPage() {
  const router = useRouter();
  const refreshVersionRef = useRef(0);
  const stateRequestVersionRef = useRef(0);
  const stateMutationPendingRef = useRef(false);
  const [initialViewState] = useState<NotificationViewState>(loadViewState);
  const viewStateRef = useRef<NotificationViewState>(initialViewState);
  const [notifications, setNotifications] = useState<FundManagerNotification[]>([]);
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
  const [pageSize, setPageSize] = useState(16);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isPersistingState, setIsPersistingState] = useState(false);
  const [openingId, setOpeningId] = useState("");
  const [actionError, setActionError] = useState("");

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
      const [feed, persistedState, preferences] = await Promise.all([
        loadFundManagerNotificationFeed(),
        loadPersistedNotificationState(),
        loadPersistedNotificationPreferences(),
      ]);
      if (!persistedState || !preferences) throw new Error("Task evidence unavailable");
      const remote = currentDailyTasks(feed);
      if (requestVersion !== refreshVersionRef.current) return;
      if (stateRequestVersion === stateRequestVersionRef.current) applyViewState(persistedState);
      setNotifications(filterFundManagerNotificationsForViewer(remote, preferences));
      setLoadFailed(false);
    } catch {
      if (requestVersion !== refreshVersionRef.current) return;
      setNotifications([]);
      setLoadFailed(true);
    } finally {
      if (requestVersion === refreshVersionRef.current) setIsLoading(false);
    }
  }, [applyViewState]);

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
    () => notifications.map((item) => deriveDailyTaskView(item, viewState, now)),
    [notifications, now, viewState]
  );
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
    (result, view) => ({ ...result, [view.id]: taskViews.filter((task) => task.dueState === view.id).length }),
    { today: 0, upcoming: 0, overdue: 0, completed: 0 }
  ), [taskViews]);
  const filtered = useMemo(() => filterAndSortDailyTasks(taskViews, {
    dueState, profileId, bookmaker, notificationType, source, query, sort,
  }), [bookmaker, dueState, notificationType, profileId, query, sort, source, taskViews]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  return (
    <main className="page-shell stack daily-tasks-page" data-pd-id="tasks.page">
      <section className="hero-panel split-hero" data-pd-id="tasks.page-header">
        <div className="stack">
          <span className="eyebrow">Fund Manager</span>
          <h1>Daily Tasks</h1>
          <p>Prioritised actions from recorded Plum Duff evidence. Completing a task changes this work list only; its source record and Notification History remain intact.</p>
          <Link className="text-link" href="/notifications">Notification History</Link>
        </div>
        <aside className="shell-note stack" aria-label="Daily Task summary">
          <span className="eyebrow">Actionable Now</span>
          <strong aria-hidden={isLoading}>{isLoading || loadFailed ? "—" : counts.today + counts.overdue}</strong>
        </aside>
      </section>

      <section aria-label="Daily Tasks" className="content-panel stack" data-pd-id="tasks.workspace">
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
              {view.label}<span>{isLoading ? "—" : counts[view.id]}</span>
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

        {actionError ? <div className="notification-action-error" role="alert">{actionError}</div> : null}
        {isLoading ? (
          <section aria-busy="true" className="tracker-summary-shell sportsbook-page-shell" data-pd-id="tasks.loading-shell"><LedgerLoadingIndicator dataPdId="tasks.loading" label="Loading Daily Tasks" /></section>
        ) : loadFailed ? (
          <div className="notification-action-error" role="alert">Daily Tasks are temporarily unavailable. Use Refresh Tasks to retry.</div>
        ) : (
          <section aria-labelledby={`daily-task-tab-${dueState}`} id="daily-task-panel" role="tabpanel">
            <p aria-live="polite" className="notification-history-count" role="status">{filtered.length} {dueViews.find((view) => view.id === dueState)?.label.toLocaleLowerCase()} task{filtered.length === 1 ? "" : "s"}</p>
            <LedgerPagination ariaLabel="Daily Tasks" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="top" totalRows={filtered.length} />
            <div className="table-scroll daily-task-table-scroll" data-pd-id="tasks.table-scroll">
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
            </div>
            <LedgerPagination ariaLabel="Daily Tasks" currentPage={currentPage} onPageChange={setPage} onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} pageCount={pageCount} pageSize={pageSize} position="bottom" totalRows={filtered.length} />
          </section>
        )}
      </section>
    </main>
  );
}
