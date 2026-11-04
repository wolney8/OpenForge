"use client";

import { useState } from "react";
import { labTaskDateLabel, type LabTodayTask } from "@/lib/design-lab-operations";
import { activeLabNotificationEvents, type LabNotificationEvent } from "@/lib/design-lab-notification-policy";
import { DesignNotificationActions, DesignNotificationRow, DesignNotificationSection, DesignNotificationSurface, DesignNotificationTabs, DesignNotificationTypeFilter, type DesignNotificationView } from "@/components/design-notification-presentation";
import styles from "./design-lab-notifications.module.css";

const notificationTypeLabels: Record<LabNotificationEvent["kind"], string> = {
  free_bet_expiry: "Free Bet Expiry",
  partial_lay_follow_up: "Partial Lay Follow-Up",
  settlement_review: "Settlement Review",
  account_review: "Account Review",
};

export function DesignLabNotifications({ events, liveTasks, scope, read, cleared, onRead, onClear, onOpen, onViewToday, onViewAll, fullPage = false }: {
  events: LabNotificationEvent[];
  liveTasks: LabTodayTask[];
  scope: string;
  read: string[];
  cleared: string[];
  onRead: (ids: string[]) => void;
  onClear: (id: string) => void;
  onOpen: (task: LabTodayTask) => void;
  onViewToday: () => void;
  onViewAll?: () => void;
  fullPage?: boolean;
}) {
  const [view, setView] = useState<DesignNotificationView>(fullPage ? "all" : "priority");
  const [typeFilter, setTypeFilter] = useState<LabNotificationEvent["kind"] | "all">("all");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<"normal" | "loading" | "error">("normal");
  const scoped = events.filter(event => scope === "all" || event.task.profileId === scope);
  const current = activeLabNotificationEvents(scoped, liveTasks, scope);
  const currentIds = new Set(current.map(event => event.id));
  const priority = current.filter(event => event.priority === "Action Required" && !cleared.includes(event.id));
  const unfiltered = view === "history"
    ? scoped.filter(event => cleared.includes(event.id) || !currentIds.has(event.id))
    : current.filter(event => !cleared.includes(event.id) && (view === "all" || view === "priority" && event.priority === "Action Required"));
  const visible = unfiltered.filter(event => typeFilter === "all" || event.kind === typeFilter);
  const unread = priority.filter(event => !read.includes(event.id)).length;
  const categories = view === "priority"
    ? [{ name: "Action Required", rows: visible }, { name: "System & Results", rows: [] as LabNotificationEvent[] }]
    : view === "all"
      ? [{ name: "Action Required", rows: visible.filter(event => event.priority === "Action Required") }, { name: "Other Source Events", rows: visible.filter(event => event.priority !== "Action Required") }, { name: "System & Results", rows: [] as LabNotificationEvent[] }]
      : view === "system" ? [{ name: "System & Results", rows: visible }] : [{ name: "History", rows: visible }];
  return <DesignNotificationSurface dataPdId="lab.notifications" fullPage={fullPage} heading="Notifications" headingAction={!fullPage ? onViewAll : undefined} summary={`${unread} priority unread`}>
    {fullPage ? <DesignNotificationTabs controlsId="lab-notification-list" dataPdIdPrefix="lab.notifications.tab" onChange={setView} view={view} /> : null}
    {fullPage ? <DesignNotificationTypeFilter dataPdId="lab.notifications.type-filter" onChange={setTypeFilter} options={[{ value: "all", label: "All Types" }, ...([...new Set(scoped.map(event => event.kind))] as LabNotificationEvent["kind"][]).map(kind => ({ value: kind, label: notificationTypeLabels[kind] }))]} value={typeFilter} /> : null}
    <DesignNotificationActions>
      {!fullPage ? <>
      <button aria-pressed={view === "priority"} onClick={() => setView("priority")} type="button">Priority</button>
      <button aria-pressed={view === "all"} onClick={() => onViewAll ? onViewAll() : setView("all")} type="button">View All Notifications</button>
      <button aria-pressed={view === "history"} onClick={() => setView("history")} type="button">History</button>
      </> : null}
      {visible.some(event => !read.includes(event.id)) ? <button onClick={() => onRead(visible.map(event => event.id))} type="button">Mark All Read</button> : null}
    </DesignNotificationActions>
    {fetchState === "loading" ? <p role="status">Loading simulated notifications…</p> : fetchState === "error" ? <div role="alert"><p>Notifications could not be loaded. Today remains available.</p><button onClick={() => setFetchState("normal")} type="button">Retry</button></div> : <div className={styles.list} id="lab-notification-list" role={fullPage ? "tabpanel" : undefined}>
      {categories.map(category => <DesignNotificationSection key={category.name} title={category.name}>
        {category.rows.map(event => {
          const { task } = event;
          const resolved = !currentIds.has(event.id);
          return <DesignNotificationRow actions={<><button onClick={() => { onRead([event.id]); onOpen(task); }} type="button">{resolved ? "View Source" : "Open Source"}</button>{!read.includes(event.id) ? <button onClick={() => onRead([event.id])} type="button">Mark Read</button> : null}{view !== "history" ? <button onClick={() => setConfirm(event.id)} type="button">Clear</button> : null}</>}
            confirmation={confirm === event.id ? <><span>Clear this notification? The source task remains open.</span><button onClick={() => setConfirm(null)} type="button">Keep</button><button onClick={() => { onClear(event.id); setConfirm(null); }} type="button">Clear Notification</button></> : null}
            context={<>{task.provider} · {task.profileId ? task.profileId.replace("LAB-PROFILE-", "Profile ") : "All Profiles"}</>}
            dataPdId={`lab.notification.${task.id}`} detail={<>{notificationTypeLabels[event.kind]} · {event.priority === "Action Required" ? "Action Required" : "Source Review"}{task.due ? ` · ${labTaskDateLabel(task)}` : ""}</>}
            key={event.id} severity={event.severity} status={resolved ? "Source Resolved" : read.includes(event.id) ? "Read" : "Unread"} title={task.title} />;
        })}
        {!category.rows.length && category.name === "System & Results" ? <p className={styles.categoryEmpty}>No recorded system events.</p> : null}
      </DesignNotificationSection>)}
      {!visible.length && view === "history" ? <p className={styles.empty}>No notification history.</p> : !visible.length && view === "priority" ? <p className={styles.empty}>No priority attention now. Routine work remains in Today.</p> : null}
    </div>}
    <div className={styles.footer}><button onClick={onViewToday} type="button">View Today</button><details><summary>Test States</summary><button onClick={() => { setFetchState("loading"); window.setTimeout(() => setFetchState("normal"), 400); }} type="button">Loading</button><button onClick={() => setFetchState("error")} type="button">Error</button></details></div>
  </DesignNotificationSurface>;
}
