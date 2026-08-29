"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LedgerLoadingIndicator } from "@/components/ledger-loading-indicator";
import { apiBaseUrl } from "@/lib/api";
import {
  dismissNotificationIds,
  emptyNotificationViewState,
  filterFundManagerNotificationsForViewer,
  filterNotificationHistory,
  formatNotificationDue,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
  FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
  getUnreadNotificationCount,
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

export function NotificationHistoryPage() {
  const [notifications, setNotifications] = useState<FundManagerNotification[]>([]);
  const [viewState, setViewState] = useState<NotificationViewState>(loadViewState);
  const [query, setQuery] = useState("");
  const [notificationType, setNotificationType] = useState("all");
  const [status, setStatus] = useState<NotificationHistoryStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setNow(new Date());
      try {
        const [response, persistedState, persistedPreferences] = await Promise.all([
          fetch(`${apiBaseUrl}/fund-manager/notifications`, {
            cache: "no-store",
            credentials: "include",
          }),
          loadPersistedNotificationState(),
          loadPersistedNotificationPreferences(),
        ]);
        if (!response.ok) throw new Error("Unable to load notifications");
        const remote = (await response.json()) as FundManagerNotification[];
        if (!active) return;
        if (persistedState) setViewState(persistedState);
        setNotifications(
          filterFundManagerNotificationsForViewer(
            [...loadLocalFundManagerNotifications(), ...remote],
            persistedPreferences ?? loadFundManagerNotificationPreferences()
          )
        );
        setLoadFailed(false);
      } catch {
        if (!active) return;
        const local = filterFundManagerNotificationsForViewer(
          loadLocalFundManagerNotifications(),
          loadFundManagerNotificationPreferences()
        );
        setNotifications(local);
        setLoadFailed(local.length === 0);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void refresh();
    window.addEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, refresh);
    };
  }, []);

  const persistState = (next: NotificationViewState) => {
    setViewState(next);
    window.localStorage.setItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
    void persistNotificationState(next);
    window.dispatchEvent(new Event(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT));
  };
  const types = useMemo(
    () => [...new Set(notifications.map((notification) => notification.notification_type))].sort(),
    [notifications]
  );
  const filtered = filterNotificationHistory(notifications, viewState, {
    query,
    notificationType,
    status,
  });
  const unread = filtered.filter((notification) => isNotificationUnread(notification, viewState, now));
  const unreadTotal = getUnreadNotificationCount(notifications, viewState, now);

  const markRead = (items: FundManagerNotification[]) => {
    if (items.length) persistState(markNotificationsRead(viewState, items, now));
  };
  const clear = (items: FundManagerNotification[]) => {
    if (items.length) persistState(dismissNotificationIds(viewState, items.map((item) => item.notification_id)));
  };

  return (
    <main className="page-shell stack notification-history-page" data-pd-id="notifications.page">
      <section className="hero-panel split-hero">
        <div className="stack">
          <span className="eyebrow">Fund Manager</span>
          <h1>Notifications</h1>
          <p>Read notifications remain here until you clear them.</p>
        </div>
        <aside className="shell-note stack" aria-label="Notification summary">
          <span className="eyebrow">Unread</span>
          <strong aria-hidden={isLoading}>{isLoading ? "—" : unreadTotal}</strong>
        </aside>
      </section>

      <section aria-label="Notification history" className="content-panel stack" data-pd-id="notifications.history">
        <div className="notification-history-toolbar">
          <label className="field-control table-search-field">
            <span>Search notifications</span>
            <input
              aria-label="Search notifications by name or context"
              data-pd-id="notifications.history.search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, profile, ledger, bookmaker or record"
              type="search"
              value={query}
            />
          </label>
          <label className="field-control table-filter-field">
            <span>Type</span>
            <select
              aria-label="Filter notifications by type"
              data-pd-id="notifications.history.type"
              onChange={(event) => setNotificationType(event.target.value)}
              value={notificationType}
            >
              <option value="all">All types</option>
              {types.map((type) => <option key={type} value={type}>{notificationTypeLabel(type)}</option>)}
            </select>
          </label>
          <label className="field-control table-filter-field">
            <span>Status</span>
            <select
              aria-label="Filter notifications by status"
              data-pd-id="notifications.history.status"
              onChange={(event) => setStatus(event.target.value as NotificationHistoryStatus)}
              value={status}
            >
              <option value="all">All retained</option>
              <option value="new">New</option>
              <option value="done">Done</option>
            </select>
          </label>
          <div className="notification-history-actions">
            <button
              className="button-link"
              data-pd-id="notifications.history.mark-read"
              disabled={unread.length === 0}
              onClick={() => markRead(unread)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">done_all</span>
              Mark filtered as read
            </button>
            <button
              className="button-link destructive-action"
              data-pd-id="notifications.history.clear"
              disabled={filtered.length === 0}
              onClick={() => clear(filtered)}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">clear_all</span>
              Clear filtered
            </button>
          </div>
        </div>

        {isLoading ? (
          <section
            aria-busy="true"
            className="tracker-summary-shell sportsbook-page-shell"
            data-pd-id="notifications.history.loading-shell"
          >
            <LedgerLoadingIndicator
              dataPdId="notifications.history.loading"
              label="Loading Notifications"
            />
          </section>
        ) : loadFailed ? (
          <div className="notification-action-error" role="alert">Notifications are temporarily unavailable.</div>
        ) : (
          <>
            <p aria-live="polite" className="notification-history-count" role="status">
              {filtered.length} retained notification{filtered.length === 1 ? "" : "s"} · {unread.length} unread
            </p>
            {filtered.length === 0 ? (
              <div className="notification-empty-state" role="status">No retained notifications match these filters.</div>
            ) : (
              <div className="notification-history-list" data-pd-id="notifications.history.list">
                {filtered.map((notification) => {
                  const isUnread = isNotificationUnread(notification, viewState, now);
                  return (
                    <article
                      className={`notification-card notification-card-${notification.tone}${isUnread ? " is-unread" : ""}`}
                      data-pd-id={`notifications.history.item.${notification.record_id}`}
                      key={notification.notification_id}
                    >
                      <span aria-hidden="true" className="notification-state-dot" />
                      <Link className="notification-card-link" href={notification.href} onClick={() => markRead([notification])}>
                        <strong>{notification.title}</strong>
                        <span>{notification.ledger_label} · {notification.bookmaker_label} · {notification.message}</span>
                        <span className="notification-card-meta">{notification.profile_name} · {notificationTypeLabel(notification.notification_type)} · {formatNotificationDue(notification.due_at)}</span>
                      </Link>
                      <button
                        aria-label={`Clear ${notification.title}`}
                        className="icon-button notification-card-clear"
                        onClick={() => clear([notification])}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">close</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
