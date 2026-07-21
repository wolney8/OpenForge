"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "@/lib/api";
import {
  dismissNotificationIds,
  emptyNotificationViewState,
  formatUnreadNotificationCount,
  formatNotificationDue,
  FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT,
  FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
  getUnreadNotificationCount,
  getVisibleNotifications,
  isNotificationUnread,
  markNotificationsRead,
  normalizeNotificationViewState,
  type FundManagerNotification,
  type NotificationViewState,
} from "@/lib/notifications";

const refreshIntervalMs = 60_000;
const completionExitDurationMs = 280;
const hoverReadDelayMs = 750;
type NotificationView = "new" | "done";

function loadInitialViewState(): NotificationViewState {
  if (typeof window === "undefined") return emptyNotificationViewState;
  try {
    const stored = window.localStorage.getItem(FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY);
    return stored
      ? normalizeNotificationViewState(JSON.parse(stored) as unknown)
      : emptyNotificationViewState;
  } catch {
    return emptyNotificationViewState;
  }
}

export function NotificationCentre() {
  const [notifications, setNotifications] = useState<FundManagerNotification[]>([]);
  const [viewState, setViewState] = useState<NotificationViewState>(loadInitialViewState);
  const [isOpen, setIsOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [activeView, setActiveView] = useState<NotificationView>("new");
  const [confirmClearId, setConfirmClearId] = useState("");
  const [completingId, setCompletingId] = useState("");
  const [exitingId, setExitingId] = useState("");
  const [completionAnnouncement, setCompletionAnnouncement] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attentionNow, setAttentionNow] = useState(() => Date.now());
  const shellRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const viewStateRef = useRef(viewState);
  const hoverReadTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let isActive = true;

    const refreshNotifications = async () => {
      setAttentionNow(Date.now());
      setIsLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/fund-manager/notifications`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to load notifications");
        const payload = (await response.json()) as FundManagerNotification[];
        if (!isActive) return;
        setNotifications(payload);
        setLoadFailed(false);
      } catch {
        if (isActive) setLoadFailed(true);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    const handleRefresh = () => void refreshNotifications();
    const handleFocus = () => void refreshNotifications();
    const intervalId = window.setInterval(handleRefresh, refreshIntervalMs);

    void refreshNotifications();
    window.addEventListener("focus", handleFocus);
    window.addEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(FUND_MANAGER_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    };
  }, []);

  useEffect(
    () => () => {
      hoverReadTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      hoverReadTimersRef.current.clear();
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const hoverReadTimers = hoverReadTimersRef.current;

    const handlePointerDown = (event: MouseEvent) => {
      if (event.target instanceof Node && !shellRef.current?.contains(event.target)) {
        setIsOpen(false);
        setIsActionsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      setIsActionsOpen(false);
      triggerRef.current?.focus();
    };
    const handleScroll = () => {
      setIsOpen(false);
      setIsActionsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll);
      hoverReadTimers.forEach((timerId) => window.clearTimeout(timerId));
      hoverReadTimers.clear();
    };
  }, [isOpen]);

  const persistViewState = (nextState: NotificationViewState) => {
    viewStateRef.current = nextState;
    setViewState(nextState);
    try {
      window.localStorage.setItem(
        FUND_MANAGER_NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify(nextState)
      );
    } catch {
      // The in-memory state remains usable when browser storage is unavailable.
    }
  };

  const visibleNotifications = getVisibleNotifications(notifications, viewState);
  const newNotifications = visibleNotifications.filter(
    (notification) => notification.task_state === "new"
  );
  const completedTasks = visibleNotifications.filter(
    (notification) => notification.task_state === "done"
  );
  const currentAttentionDate = new Date(attentionNow);
  const unreadCount = getUnreadNotificationCount(
    notifications,
    viewState,
    currentAttentionDate
  );
  const visibleCount = visibleNotifications.length;

  const markRead = (notification: FundManagerNotification) => {
    const currentViewState = viewStateRef.current;
    if (!isNotificationUnread(notification, currentViewState, currentAttentionDate)) return;
    persistViewState(
      markNotificationsRead(currentViewState, [notification], currentAttentionDate)
    );
  };

  const cancelHoverRead = (notificationId: string) => {
    const timerId = hoverReadTimersRef.current.get(notificationId);
    if (timerId === undefined) return;
    window.clearTimeout(timerId);
    hoverReadTimersRef.current.delete(notificationId);
  };

  const scheduleHoverRead = (notification: FundManagerNotification) => {
    if (
      !isNotificationUnread(notification, viewState, currentAttentionDate) ||
      hoverReadTimersRef.current.has(notification.notification_id)
    ) {
      return;
    }
    const timerId = window.setTimeout(() => {
      hoverReadTimersRef.current.delete(notification.notification_id);
      markRead(notification);
    }, hoverReadDelayMs);
    hoverReadTimersRef.current.set(notification.notification_id, timerId);
  };

  const markAllRead = () => {
    persistViewState(
      markNotificationsRead(
        viewStateRef.current,
        newNotifications,
        currentAttentionDate
      )
    );
    setIsActionsOpen(false);
  };

  const clearNotifications = (notificationIds: string[]) => {
    persistViewState(dismissNotificationIds(viewStateRef.current, notificationIds));
    setConfirmClearId("");
    setIsActionsOpen(false);
  };

  const completeTask = async (notification: FundManagerNotification) => {
    if (notification.kind !== "task") return;
    setCompletingId(notification.notification_id);
    setActionError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/profiles/${notification.profile_id}/sportsbook-bets/${notification.record_id}/partial-lay-reminder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: "Resolved",
            resolution_note: "Completed from the Fund Manager notification centre.",
            actor_id: "fund-manager-local",
          }),
        }
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(detail?.detail ?? "Unable to complete this notification task.");
      }

      const feedResponse = await fetch(`${apiBaseUrl}/fund-manager/notifications`, {
        cache: "no-store",
      });
      if (!feedResponse.ok) {
        throw new Error("Task completed, but notifications could not refresh.");
      }
      const refreshedNotifications =
        (await feedResponse.json()) as FundManagerNotification[];
      setExitingId(notification.notification_id);
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (!prefersReducedMotion) {
        await new Promise((resolve) => window.setTimeout(resolve, completionExitDurationMs));
      }
      setNotifications(refreshedNotifications);
      setExitingId("");
      setCompletionAnnouncement(
        `${notification.message} was completed and moved to Done.`
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to complete this notification task."
      );
    } finally {
      setCompletingId("");
    }
  };

  const renderedNotifications = activeView === "new" ? newNotifications : completedTasks;

  return (
    <div className="notification-centre app-menu-shell" ref={shellRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Open notifications, ${unreadCount} unread`
            : visibleCount > 0
              ? `Open notifications, ${visibleCount} retained`
              : "Open notifications"
        }
        className={`icon-button notification-trigger${visibleCount > 0 ? " has-notifications" : ""}${unreadCount > 0 ? " has-unread" : ""}`}
        data-pd-id="notifications.trigger"
        onClick={() => {
          if (!isOpen) setActiveView("new");
          setIsOpen((current) => !current);
          setIsActionsOpen(false);
        }}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined">
          {visibleCount > 0 ? "notifications_active" : "notifications"}
        </span>
        {unreadCount > 0 ? (
          <span aria-hidden="true" className="notification-count-badge">
            {formatUnreadNotificationCount(unreadCount)}
          </span>
        ) : null}
      </button>

      <section
        aria-label="Fund Manager notifications"
        className={`notification-panel${isOpen ? " is-open" : ""}`}
        data-pd-id="notifications.panel"
        role="dialog"
      >
        <header className="notification-panel-header">
          <div>
            <p className="eyebrow">Fund Manager</p>
            <h2>Notifications</h2>
          </div>
          <div className="notification-panel-actions">
            <div className="notification-actions-shell">
              <button
                aria-expanded={isActionsOpen}
                aria-haspopup="menu"
                aria-label="Open notification actions"
                className="icon-button notification-panel-icon-button"
                data-pd-id="notifications.actions.open"
                onClick={() => setIsActionsOpen((current) => !current)}
                type="button"
              >
                <span aria-hidden="true" className="material-symbols-outlined">more_vert</span>
              </button>
              <div
                className={`notification-actions-menu${isActionsOpen ? " is-open" : ""}`}
                role="menu"
              >
                <button
                  disabled={unreadCount === 0}
                  onClick={markAllRead}
                  role="menuitem"
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">done_all</span>
                  Mark all as read
                </button>
                <button
                  disabled={visibleCount === 0}
                  onClick={() =>
                    clearNotifications(
                      visibleNotifications.map(
                        (notification) => notification.notification_id
                      )
                    )
                  }
                  role="menuitem"
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined">clear_all</span>
                  Clear notifications
                </button>
              </div>
            </div>
            <button
              aria-label="Close notifications"
              className="icon-button notification-panel-icon-button"
              data-pd-id="notifications.close"
              onClick={() => {
                setIsOpen(false);
                setIsActionsOpen(false);
                triggerRef.current?.focus();
              }}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        <div aria-label="Notification sections" className="notification-view-toggle">
          <button
            aria-pressed={activeView === "new"}
            className={activeView === "new" ? "is-active" : ""}
            data-pd-id="notifications.view.new"
            onClick={() => setActiveView("new")}
            type="button"
          >
            New <span>{newNotifications.length}</span>
          </button>
          <button
            aria-pressed={activeView === "done"}
            className={activeView === "done" ? "is-active" : ""}
            data-pd-id="notifications.view.done"
            onClick={() => setActiveView("done")}
            type="button"
          >
            Done <span>{completedTasks.length}</span>
          </button>
        </div>

        <div
          aria-busy={isLoading}
          className="notification-list"
          data-pd-id="notifications.list"
        >
          <p aria-live="polite" className="visually-hidden" role="status">
            {completionAnnouncement}
          </p>
          {actionError ? (
            <div className="notification-action-error" role="alert">
              {actionError}
            </div>
          ) : null}
          {activeView === "new" && isLoading && notifications.length === 0 ? (
            <div className="notification-empty-state" role="status">
              Loading notifications...
            </div>
          ) : loadFailed && notifications.length === 0 ? (
            <div className="notification-empty-state" role="status">
              Notifications are temporarily unavailable.
            </div>
          ) : renderedNotifications.length === 0 ? (
            <div className="notification-empty-state" role="status">
              {activeView === "new"
                ? "You have no active notifications."
                : "You have no completed notification tasks."}
            </div>
          ) : (
            renderedNotifications.map((notification) => {
              const isDone = activeView === "done";
              const isUnread = !isDone && isNotificationUnread(
                notification,
                viewState,
                currentAttentionDate
              );
              const isConfirmingClear = confirmClearId === notification.notification_id;
              const isExiting = exitingId === notification.notification_id;
              return (
                <article
                  aria-hidden={isExiting || undefined}
                  className={`notification-card notification-card-${notification.tone}${isUnread ? " is-unread" : ""}${isExiting ? " is-exiting" : ""}`}
                  data-pd-id={`notifications.item.${notification.record_id}`}
                  key={notification.notification_id}
                  onFocusCapture={() => {
                    if (!isDone) markRead(notification);
                  }}
                  onMouseEnter={() => {
                    if (!isDone) scheduleHoverRead(notification);
                  }}
                  onMouseLeave={() => cancelHoverRead(notification.notification_id)}
                >
                  <span
                    aria-hidden={!isUnread}
                    aria-label={isUnread ? "Unread notification" : undefined}
                    className="notification-state-dot"
                    role={isUnread ? "img" : undefined}
                  />
                  <Link
                    className="notification-card-link"
                    href={notification.href}
                    onClick={() => {
                      markRead(notification);
                      setIsOpen(false);
                    }}
                  >
                    <strong>{notification.title}</strong>
                    <span data-pd-id={`notifications.item.${notification.record_id}.context`}>
                      {notification.ledger_label} · {notification.bookmaker_label} ·{
                        " "
                      }
                      {notification.message}
                    </span>
                    <span className="notification-card-meta">
                      {notification.profile_name} · {formatNotificationDue(notification.due_at)}
                    </span>
                  </Link>
                  <div className="notification-card-actions">
                    {!isDone && notification.kind === "task" ? (
                      <button
                        aria-label={`Mark task done for ${notification.profile_name}`}
                        className="icon-button notification-card-complete"
                        disabled={completingId === notification.notification_id}
                        onClick={() => void completeTask(notification)}
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">
                          {completingId === notification.notification_id
                            ? "progress_activity"
                            : "check_circle"}
                        </span>
                      </button>
                    ) : null}
                    {isConfirmingClear ? (
                      <div
                        aria-label="Confirm clear notification"
                        className="notification-clear-confirm"
                        data-pd-id="notifications.clear-confirmation"
                        role="group"
                      >
                        <span>Are you sure?</span>
                        <button
                          className="notification-clear-confirm-action"
                          onClick={() => clearNotifications([notification.notification_id])}
                          type="button"
                        >
                          Clear
                        </button>
                        <button
                          aria-label="Cancel clearing notification"
                          className="icon-button notification-clear-cancel"
                          onClick={() => setConfirmClearId("")}
                          type="button"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        aria-label={`Clear notification for ${notification.profile_name}`}
                        className="icon-button notification-card-clear"
                        onClick={() =>
                          notification.kind === "task"
                            ? setConfirmClearId(notification.notification_id)
                            : clearNotifications([notification.notification_id])
                        }
                        type="button"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined">close</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
