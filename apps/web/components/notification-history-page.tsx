"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { DesignNotificationActions, DesignNotificationRow, DesignNotificationSection, DesignNotificationSurface, DesignNotificationTabs, DesignNotificationTypeFilter, designNotificationClasses, type DesignNotificationView } from "@/components/design-notification-presentation";
import labPageStyles from "@/components/design-lab-connected.module.css";
import { apiBaseUrl } from "@/lib/api";
import { beginRouteTransition, endRouteTransition } from "@/lib/shell-loading";
import {
  dismissNotificationIds,
  currentDailyTasks,
  emptyNotificationViewState,
  filterFundManagerNotificationsForViewer,
  filterNotificationHistory,
  formatNotificationDue,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
  FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
  getUnreadNotificationCount,
  isNotificationCleared,
  isNotificationUnread,
  loadFundManagerNotificationPreferences,
  loadPersistedNotificationPreferences,
  loadPersistedNotificationState,
  loadLocalFundManagerNotifications,
  markNotificationsRead,
  normalizeNotificationViewState,
  persistNotificationState,
  type FundManagerNotification,
  type NotificationHistoryStatus,
  type NotificationViewState,
} from "@/lib/notifications";

function loadViewState(): NotificationViewState {
  if (typeof window === "undefined") return emptyNotificationViewState;
  try {
    const stored = window.localStorage.getItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY);
    return stored ? normalizeNotificationViewState(JSON.parse(stored) as unknown) : emptyNotificationViewState;
  } catch {
    return emptyNotificationViewState;
  }
}

function notificationTypeLabel(type: string): string {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function NotificationHistoryPage({ daily = false, visualV2 = false }: { daily?: boolean; visualV2?: boolean }) {
  const router = useRouter();
  const [profileFilter, setProfileFilter] = useState("all");
  const [confirmClearId, setConfirmClearId] = useState("");
  const [openingId, setOpeningId] = useState("");
  const refreshVersionRef = useRef(0);
  const openVersionRef = useRef(0);
  const [notifications, setNotifications] = useState<FundManagerNotification[]>([]);
  const [viewState, setViewState] = useState<NotificationViewState>(loadViewState);
  const [query, setQuery] = useState("");
  const [notificationType, setNotificationType] = useState("all");
  const [status, setStatus] = useState<NotificationHistoryStatus>(daily ? "new" : "all");
  const [presentationView, setPresentationView] = useState<DesignNotificationView>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [isPersistingState, setIsPersistingState] = useState(false);
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const viewStateRef = useRef(viewState);
  const stateRequestVersionRef = useRef(0);
  const stateMutationPendingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const requestVersion = ++refreshVersionRef.current;
      if (daily) setIsLoading(true);
      const stateRequestVersion = stateRequestVersionRef.current;
      setNow(new Date());
      try {
        const [currentResponse, persistedState, persistedPreferences] = await Promise.all([
          fetch(`${apiBaseUrl}/fund-manager/notifications`, {
            cache: "no-store",
            credentials: "include",
          }),
          loadPersistedNotificationState(),
          loadPersistedNotificationPreferences(),
        ]);
        if (!currentResponse.ok) throw new Error("Unable to load notifications");
        if (daily && (!persistedState || !persistedPreferences)) throw new Error("Task state unavailable");
        let remote: FundManagerNotification[];
        let missingHistory = false;
        if (daily) remote = await currentResponse.json() as FundManagerNotification[];
        else {
          try {
            const historyResponse = await fetch(`${apiBaseUrl}/fund-manager/notifications/history`, {
              cache: "no-store", credentials: "include",
            });
            if (!historyResponse.ok) throw new Error("Unable to load notification history");
            remote = await historyResponse.json() as FundManagerNotification[];
          } catch {
            remote = await currentResponse.json() as FundManagerNotification[];
            missingHistory = true;
          }
        }
        if (!active || requestVersion !== refreshVersionRef.current) return;
        if (
          persistedState &&
          stateRequestVersion === stateRequestVersionRef.current
        ) {
          viewStateRef.current = persistedState;
          setViewState(persistedState);
        }
        setNotifications(
          filterFundManagerNotificationsForViewer(
            daily ? currentDailyTasks(remote) : [...loadLocalFundManagerNotifications(), ...remote],
            persistedPreferences ?? loadFundManagerNotificationPreferences()
          )
        );
        setHistoryUnavailable(missingHistory);
        setLoadFailed(false);
      } catch {
        if (!active || requestVersion !== refreshVersionRef.current) return;
        const local = filterFundManagerNotificationsForViewer(
          loadLocalFundManagerNotifications(),
          loadFundManagerNotificationPreferences()
        );
        setNotifications(daily ? [] : local);
        setHistoryUnavailable(!daily);
        setLoadFailed(daily || local.length === 0);
      } finally {
        if (active && requestVersion === refreshVersionRef.current) setIsLoading(false);
      }
    };
    const handleRefresh = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        event.detail?.scope === "notification-state"
      ) {
        const persistedState = normalizeNotificationViewState(event.detail.state);
        stateRequestVersionRef.current += 1;
        viewStateRef.current = persistedState;
        setViewState(persistedState);
      }
      void refresh();
    };
    void refresh();
    window.addEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    return () => {
      active = false;
      window.removeEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    };
  }, [daily]);

  const applyViewState = (next: NotificationViewState) => {
    viewStateRef.current = next;
    setViewState(next);
    try {
      window.localStorage.setItem(
        FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      // The in-memory state remains usable when browser storage is unavailable.
    }
  };
  const persistState = async (
    next: NotificationViewState,
    failureMessage: string
  ): Promise<boolean> => {
    if (stateMutationPendingRef.current) return false;
    stateMutationPendingRef.current = true;
    setIsPersistingState(true);
    setActionError("");
    const mutationVersion = stateRequestVersionRef.current + 1;
    stateRequestVersionRef.current = mutationVersion;
    try {
      const persistedState = await persistNotificationState(next);
      if (!persistedState) {
        setActionError(failureMessage);
        return false;
      }
      if (mutationVersion === stateRequestVersionRef.current) {
        applyViewState(persistedState);
      }
      window.dispatchEvent(
        new CustomEvent(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, {
          detail: { scope: "notification-state", state: persistedState },
        })
      );
      return true;
    } finally {
      stateMutationPendingRef.current = false;
      setIsPersistingState(false);
    }
  };
  const types = useMemo(
    () => [...new Set(notifications.map((notification) => notification.notification_type))].sort(),
    [notifications]
  );
  const profiles = useMemo(() => [...new Map(notifications.map(item => [item.profile_id, item.profile_name])).entries()].sort((a,b) => a[1].localeCompare(b[1])), [notifications]);
  const filtered = filterNotificationHistory(notifications.filter(item => !daily || profileFilter === "all" || item.profile_id === profileFilter), viewState, {
    query,
    notificationType,
    status,
  });
  const visibleNotifications = visualV2 ? filtered.filter(notification => {
    const cleared = isNotificationCleared(notification, viewState);
    if (presentationView === "priority") return notification.kind === "task" && notification.task_state === "new" && !cleared;
    if (presentationView === "system") return notification.kind === "information";
    if (presentationView === "history") return cleared || notification.task_state === "done";
    return true;
  }) : filtered;
  const unread = visibleNotifications.filter(
    (notification) =>
      !isNotificationCleared(notification, viewState) &&
      isNotificationUnread(notification, viewState, now)
  );
  const clearable = visibleNotifications.filter(
    (notification) => !isNotificationCleared(notification, viewState)
  );
  const unreadTotal = getUnreadNotificationCount(notifications, viewState, now);

  const markRead = (items: FundManagerNotification[]) => {
    if (items.length) {
      void persistState(
        markNotificationsRead(viewStateRef.current, items, now),
        "Unable to mark notifications as read."
      );
    }
  };
  const clear = (items: FundManagerNotification[]) => {
    setConfirmClearId("");
    if (items.length) {
      void persistState(
        dismissNotificationIds(
          viewStateRef.current,
          items.map((item) => item.notification_id)
        ),
        "Unable to clear notifications. They have not been removed."
      );
    }
  };

  const openTask = async (item: FundManagerNotification) => {
    if (openingId || isLoading) return;
    const requestVersion = ++refreshVersionRef.current;
    openVersionRef.current = requestVersion;
    setOpeningId(item.notification_id);
    setActionError("");
    try {
      const response = await fetch(`${apiBaseUrl}/fund-manager/notifications`, { cache: "no-store", credentials: "include" });
      if (!response.ok) throw new Error("Unable to recheck task access. Refresh and retry.");
      const current = currentDailyTasks(await response.json() as FundManagerNotification[]);
      if (requestVersion !== refreshVersionRef.current) return;
      setNotifications(current);
      const fresh = current.find(candidate => candidate.notification_id === item.notification_id);
      if (!fresh) {
        setActionError("This task changed or is no longer available to you. The list has refreshed.");
        return;
      }
      markRead([fresh]);
      beginRouteTransition();
      router.push(fresh.href);
    } catch (error) {
      if (requestVersion === refreshVersionRef.current) {
        setNotifications([]);
        setLoadFailed(true);
        setActionError(error instanceof Error ? error.message : "Unable to open task.");
      }
    } finally { if (requestVersion === openVersionRef.current) setOpeningId(""); }
  };

  const renderV2Notification = (notification: FundManagerNotification) => {
    const cleared = isNotificationCleared(notification, viewState);
    const unread = !cleared && isNotificationUnread(notification, viewState, now);
    return <DesignNotificationRow
      actions={<>
        <Link href={notification.href} onClick={() => markRead([notification])}>Open Source</Link>
        {unread ? <button disabled={isPersistingState} onClick={() => markRead([notification])} type="button">Mark Read</button> : null}
        {!cleared ? <button disabled={isPersistingState} onClick={() => setConfirmClearId(notification.notification_id)} type="button">Clear</button> : null}
      </>}
      confirmation={confirmClearId === notification.notification_id ? <><span>Clear this notification? Its financial source remains unchanged.</span><button disabled={isPersistingState} onClick={() => setConfirmClearId("")} type="button">Keep</button><button disabled={isPersistingState} onClick={() => clear([notification])} type="button">Clear Notification</button></> : undefined}
      context={<>{notification.profile_name} · {notification.bookmaker_label || notification.ledger_label}</>}
      dataPdId={`notifications.history.item.${notification.record_id}`}
      detail={<>{notificationTypeLabel(notification.notification_type)} · {formatNotificationDue(notification.due_at)}{notification.message ? <details className={designNotificationClasses.evidence}><summary>View recorded detail</summary><span>{notification.message}</span></details> : null}</>}
      key={notification.notification_id}
      severity={notification.tone === "danger" || notification.tone === "warning" ? "urgent" : "review"}
      status={cleared ? "Cleared" : unread ? "Unread" : "Read"}
      title={notification.title}
    />;
  };

  const searchFilter = <label className="field-control table-search-field">
    <span>{daily ? "Search tasks" : "Search notifications"}</span>
    <input aria-label={daily ? "Search tasks by name or context" : "Search notifications by name or context"} data-pd-id="notifications.history.search" onChange={event => setQuery(event.target.value)} placeholder="Name, profile, ledger, bookmaker or record" type="search" value={query} />
  </label>;
  const statusFilter = <label className="field-control table-filter-field"><span>Status</span><select aria-label="Filter notifications by status" data-pd-id="notifications.history.status" onChange={event => setStatus(event.target.value as NotificationHistoryStatus)} value={status}><option value="all">{daily ? "All current" : "All retained"}</option><option value="new">New</option><option value="done">Done</option><option value="cleared">Cleared</option></select></label>;
  const typeFilter = <label className="field-control table-filter-field"><span>Type</span><select aria-label="Filter notifications by type" data-pd-id="notifications.history.type" onChange={event => setNotificationType(event.target.value)} value={notificationType}><option value="all">All types</option>{types.map(type => <option key={type} value={type}>{notificationTypeLabel(type)}</option>)}</select></label>;
  const bulkActionButtons = <>
    {daily ? <button type="button" className="button-link" disabled={isLoading || isPersistingState} data-pd-id="tasks.refresh" onClick={() => window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT))}><span aria-hidden="true" className="material-symbols-outlined">refresh</span>Refresh tasks</button> : null}
    <button className="button-link" data-pd-id="notifications.history.mark-read" disabled={unread.length === 0 || isPersistingState || isLoading || loadFailed} onClick={() => markRead(unread)} type="button"><span aria-hidden="true" className="material-symbols-outlined">done_all</span>Mark filtered as read</button>
    <button className="button-link destructive-action" data-pd-id="notifications.history.clear" disabled={clearable.length === 0 || isPersistingState || isLoading || loadFailed} onClick={() => daily ? setConfirmClearId("filtered") : clear(clearable)} type="button"><span aria-hidden="true" className="material-symbols-outlined">clear_all</span>Clear filtered</button>
  </>;

  return (
    <main className="page-shell stack notification-history-page" data-pd-id={daily ? "tasks.page" : "notifications.page"}>
      {visualV2 ? <div className={labPageStyles.pageHead} data-pd-id="notifications.page-header"><div><h1>Notifications</h1></div><div className={labPageStyles.headActions}><Link className={labPageStyles.linkButton} href="/tasks">Today</Link></div></div> : <section className="hero-panel split-hero">
        <div className="stack">
          <span className="eyebrow">Fund Manager</span>
          <h1>{daily ? "Daily tasks" : "Notifications"}</h1>
          <p>{daily ? "Current reminders and recorded evidence. Open a record to act; clearing a task leaves its source unchanged." : "Read, cleared and completed source notifications remain available here."}</p>
          <Link className="text-link" href={daily ? "/notifications" : "/tasks"}>{daily ? "Notification History" : "Daily tasks"}</Link>
        </div>
        <aside className="shell-note stack" aria-label="Notification summary">
          <span className="eyebrow">{daily ? "Needs attention" : "Unread"}</span>
          <strong aria-hidden={isLoading}>{isLoading || loadFailed ? "—" : daily ? filterNotificationHistory(notifications.filter(item => profileFilter === "all" || item.profile_id === profileFilter), viewState, { query, notificationType, status: "new" }).length : unreadTotal}</strong>
        </aside>
      </section>}

      <DesignNotificationSurface ariaLabel={daily ? "Current daily tasks" : "Notification history"} dataPdId="notifications.history" fullPage={visualV2} heading="Notifications" legacy={!visualV2} summary={`${unreadTotal} unread`}>
        {visualV2 ? <DesignNotificationTabs controlsId="notification-history-list" dataPdIdPrefix="notifications.history.tab" onChange={next => { setPresentationView(next); setStatus("all"); }} view={presentationView} /> : null}
        {visualV2 ? <>
          <DesignNotificationTypeFilter ariaLabel="Filter notifications by type" dataPdId="notifications.history.type" onChange={setNotificationType} options={[{ value: "all", label: "All types" }, ...types.map(type => ({ value: type, label: notificationTypeLabel(type) }))]} value={notificationType} />
          <DesignNotificationActions>{bulkActionButtons}</DesignNotificationActions>
          <details className={designNotificationClasses.advancedFilters} data-pd-id="notifications.history.advanced-filters">
            <summary>Search and status filters{query || status !== "all" ? " · Active" : ""}</summary>
            <div className="table-toolbar settings-table-toolbar notification-history-toolbar">{searchFilter}<div className="settings-table-filter-group notification-history-filter-group">{statusFilter}</div></div>
          </details>
        </> : <div className="table-toolbar settings-table-toolbar notification-history-toolbar">
          {searchFilter}
          <div className="settings-table-filter-group notification-history-filter-group">
            {daily ? <label className="field-control table-filter-field"><span>Profile</span><select aria-label="Filter tasks by Profile" value={profileFilter} onChange={event => setProfileFilter(event.target.value)}><option value="all">All authorised Active Profiles</option>{profileFilter !== "all" && !profiles.some(([id]) => id === profileFilter) ? <option value={profileFilter}>Selected Profile: no current tasks</option> : null}{profiles.map(([id,name]) => <option key={id} value={id}>{name}</option>)}</select></label> : null}
            {typeFilter}{statusFilter}
          </div>
          <div className="notification-history-actions">{bulkActionButtons}</div>
        </div>}

        {daily && confirmClearId === "filtered" ? <div className="notification-clear-confirm" role="group" aria-label="Confirm clear filtered tasks"><span>Clear filtered tasks without changing their records?</span><button className="button-link destructive-action" type="button" onClick={() => clear(clearable)}>Clear</button><button className="button-link" type="button" onClick={() => setConfirmClearId("")}>Cancel</button></div> : null}
        {actionError ? (
          <div className="notification-action-error" role="alert">{actionError}</div>
        ) : null}
        {visualV2 && historyUnavailable ? <p role="alert" data-pd-id="notifications.history.partial-read">Historical notifications are unavailable. Current notifications remain visible; history and cleared counts are incomplete.</p> : null}
        {visualV2 && presentationView === "history" && !historyUnavailable ? <p className="notification-history-count" data-pd-id="notifications.history.source-limit">History contains source notifications retained by the feed. Cleared notifications may no longer be returned; clearing does not resolve their financial sources.</p> : null}
        {isLoading ? (
          <section
            aria-busy="true"
            className="tracker-summary-shell sportsbook-page-shell"
            data-pd-id="notifications.history.loading-shell"
          >
            <LedgerLoadingIndicator
              dataPdId="notifications.history.loading"
              label={daily ? "Loading Daily tasks" : "Loading Notifications"}
            />
          </section>
        ) : loadFailed ? (
          <div className="notification-action-error" role="alert">{daily ? "Daily tasks are temporarily unavailable. Use Refresh tasks to retry." : "Notifications are temporarily unavailable."}</div>
        ) : (
          <>
            <p aria-live="polite" className="notification-history-count" role="status">
              {visibleNotifications.length} {daily ? "current task" : historyUnavailable ? "currently available notification" : "retained notification"}{visibleNotifications.length === 1 ? "" : "s"} · {unread.length} unread
            </p>
            {visibleNotifications.length === 0 ? (
              <div className="notification-empty-state" role="status">{daily ? "No current tasks match these filters." : historyUnavailable && (presentationView === "history" || status === "cleared") ? "History is unavailable; no complete result can be shown." : "No retained notifications match these filters."}</div>
            ) : (
              <div className={visualV2 ? designNotificationClasses.list : "notification-history-list"} data-pd-id="notifications.history.list" id="notification-history-list" role={visualV2 ? "tabpanel" : undefined}>
                {visualV2 ? <>
                  {presentationView === "history" ? <DesignNotificationSection title="History">{visibleNotifications.map(renderV2Notification)}</DesignNotificationSection> : <>
                    <DesignNotificationSection title="Action Required">{visibleNotifications.filter(notification => notification.kind === "task" && notification.task_state === "new").map(renderV2Notification)}</DesignNotificationSection>
                    <DesignNotificationSection title="Other Source Events">{visibleNotifications.filter(notification => notification.kind === "task" && notification.task_state !== "new").map(renderV2Notification)}</DesignNotificationSection>
                    <DesignNotificationSection title="System & Results">{visibleNotifications.filter(notification => notification.kind === "information").map(renderV2Notification)}{!visibleNotifications.some(notification => notification.kind === "information") ? <p className={designNotificationClasses.categoryEmpty}>No recorded system events.</p> : null}</DesignNotificationSection>
                  </>}
                </> : visibleNotifications.map((notification) => {
                  const isCleared = isNotificationCleared(notification, viewState);
                  const isUnread =
                    !isCleared && isNotificationUnread(notification, viewState, now);
                  return (
                    <article
                      className={`notification-card notification-card-${notification.tone}${isUnread ? " is-unread" : ""}`}
                      data-pd-id={`${daily ? "tasks" : "notifications.history"}.item.${notification.record_id}`}
                      key={notification.notification_id}
                    >
                      <span aria-hidden="true" className="notification-state-dot" />
                      <Link className="notification-card-link" href={notification.href} prefetch={daily ? false : undefined} aria-busy={daily && openingId === notification.notification_id} onClick={(event) => { if (daily) { event.preventDefault(); endRouteTransition(); void openTask(notification); } else markRead([notification]); }}>
                        <strong>{notification.title}</strong>
                        {daily ? <span>{openingId === notification.notification_id ? "Checking current access…" : "Open record"}</span> : null}
                        <span>{notification.ledger_label} · {notification.bookmaker_label} · {notification.message}</span>
                        <span className="notification-card-meta">{notification.profile_name} · {notificationTypeLabel(notification.notification_type)} · {formatNotificationDue(notification.due_at)}</span>
                      </Link>
                      {daily && confirmClearId === notification.notification_id ? <div className="notification-clear-confirm" role="group" aria-label="Confirm clear task"><span>Clear task only?</span><button className="button-link destructive-action" type="button" onClick={() => clear([notification])}>Clear</button><button className="button-link" type="button" onClick={() => setConfirmClearId("")}>Cancel</button></div> : isCleared ? (
                        <span className="table-chip table-chip-neutral">Cleared</span>
                      ) : (
                        <button
                          aria-label={`Clear ${notification.title}`}
                          aria-busy={isPersistingState}
                          className="icon-button notification-card-clear"
                          disabled={isPersistingState}
                          onClick={() => daily ? setConfirmClearId(notification.notification_id) : clear([notification])}
                          type="button"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined">close</span>
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
        {visualV2 ? <div className={designNotificationClasses.footer}><button data-pd-id="notifications.history.view-today" onClick={() => router.push("/tasks")} type="button">View Today</button></div> : null}
      </DesignNotificationSurface>
    </main>
  );
}
