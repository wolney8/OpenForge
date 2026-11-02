"use client";

import { useState } from "react";
import type { LabTodayTask } from "@/lib/design-lab-operations";
import styles from "./design-lab-notifications.module.css";

export function DesignLabNotifications({ tasks, read, cleared, onRead, onClear, onOpen, onViewToday }: {
  tasks: LabTodayTask[];
  read: string[];
  cleared: string[];
  onRead: (ids: string[]) => void;
  onClear: (id: string) => void;
  onOpen: (task: LabTodayTask) => void;
  onViewToday: () => void;
}) {
  const [history, setHistory] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<"normal" | "loading" | "error">("normal");
  const unique = [...new Map(tasks.filter(task => task.sourceId || task.id === "reload" || task.id === "advisory" || task.id === "casino-daily-a").map(task => [task.id, task])).values()];
  const visible = unique.filter(task => history ? cleared.includes(task.id) : !cleared.includes(task.id));
  const categories: { name: string; rows: LabTodayTask[] }[] = [
    { name: "Needs Action", rows: visible.filter(task => task.group === "Needs Action" && !task.id.includes("ACCOUNT")) },
    { name: "Offers", rows: visible.filter(task => task.id === "reload" || task.id === "advisory" || task.id === "casino-daily-a") },
    { name: "Account / System", rows: visible.filter(task => task.id.includes("ACCOUNT")) },
  ];
  return <div className={styles.panel} data-pd-id="lab.notifications">
    <div className={styles.head}><h2>Notifications</h2><span>{unique.filter(task => !read.includes(task.id) && !cleared.includes(task.id)).length} unread</span></div>
    <div className={styles.actions}><button aria-pressed={!history} onClick={() => setHistory(false)} type="button">Current</button><button aria-pressed={history} onClick={() => setHistory(true)} type="button">History</button><button onClick={() => onRead(unique.filter(task => !cleared.includes(task.id)).map(task => task.id))} type="button">Mark all read</button></div>
    {fetchState === "loading" ? <p role="status">Loading simulated notifications…</p> : fetchState === "error" ? <div role="alert"><p>Notifications could not be loaded. Today remains available.</p><button onClick={() => setFetchState("normal")} type="button">Retry</button></div> : <div className={styles.list}>
      {categories.map(category => category.rows.length ? <section aria-label={category.name} key={category.name}><h3>{category.name}</h3>{category.rows.map(task => <div className={styles.row} data-pd-id={`lab.notification.${task.id}`} key={task.id}>
        <div className={styles.rowHead}><strong>{task.title}</strong><span>{read.includes(task.id) ? "Read" : "Unread"}</span></div><small>{task.provider} · {task.profileId ? task.profileId.replace("LAB-PROFILE-", "Profile ") : "All Profiles"}</small><p>{task.authority === "Advisory suggestion" ? "Advisory · current offer unverified" : task.authority}</p>
        <div className={styles.rowActions}><button onClick={() => { onRead([task.id]); onOpen(task); }} type="button">{task.sourceId ? "Open source" : "Review"}</button>{!read.includes(task.id) ? <button onClick={() => onRead([task.id])} type="button">Mark read</button> : null}{!history ? <button onClick={() => setConfirm(task.id)} type="button">Clear</button> : null}</div>
        {confirm === task.id ? <div className={styles.confirm}><span>Clear this notification? The source task remains open.</span><button onClick={() => setConfirm(null)} type="button">Keep</button><button onClick={() => { onClear(task.id); setConfirm(null); }} type="button">Clear notification</button></div> : null}
      </div>)}</section> : null)}
      {!visible.length ? <p className={styles.empty}>{history ? "No cleared notifications." : "No current notifications."}</p> : null}
    </div>}
    <div className={styles.footer}><button onClick={onViewToday} type="button">View all in Today</button><details><summary>Test states</summary><button onClick={() => { setFetchState("loading"); window.setTimeout(() => setFetchState("normal"), 400); }} type="button">Loading</button><button onClick={() => setFetchState("error")} type="button">Error</button></details></div>
  </div>;
}
