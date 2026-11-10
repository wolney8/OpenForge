import Link from "next/link";
import type { MouseEvent } from "react";
import { DesignLabTaskState } from "@/components/design-lab-task-state";
import styles from "@/components/design-lab-connected.module.css";
import type { TaskAnnotation } from "@/lib/task-annotations";
import type { TrackedTaskContext } from "@/lib/tracked-task-context";

export function TrackedTaskCard({ item, context, taskHref, onUntrack, pending = false, onNavigate }: {
  item: TaskAnnotation;
  context?: TrackedTaskContext;
  taskHref: string;
  onUntrack?: () => void;
  pending?: boolean;
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const active = item.source_status === "active";
  const sourceHref = active ? context?.href : "";
  const label = item.source_status === "resolved" ? "Source resolved" : item.source_status === "changed" ? "Source changed" : item.source_status === "unavailable" ? "Source unavailable" : context?.task.priorityReason;
  return <div className={`${styles.trackedRow}${active && context?.task.priority === "high" ? ` ${styles.trackedUrgent}` : ""}`} data-pd-id={`tracked-task.${item.profile_id}.${item.occurrence_key}`}>
    <div><Link href={taskHref} onClick={onNavigate ? event => onNavigate(event, taskHref) : undefined}><strong>{item.title}</strong></Link><small>{item.profile_name}{context?.task.notification.bookmaker_label ? ` · ${context.task.notification.bookmaker_label}` : ""}</small>
      <DesignLabTaskState state={item.work_state} />
      {label ? <small>{label}</small> : null}
      {active && context?.task.dueLabel ? <small>{context.task.dueLabel}</small> : null}
      {item.work_state === "Blocked" && item.blocked_reason ? <small>Blocked: {item.blocked_reason}</small> : null}
      {item.work_state === "Do Later" && item.review_date ? <small>Review {item.review_date}</small> : null}
    </div>
    <div className={styles.trackedActions}>
      <Link href={sourceHref || taskHref} onClick={onNavigate ? event => onNavigate(event, sourceHref || taskHref) : undefined}>{sourceHref ? "Open Source" : "View Task"}</Link>
      {onUntrack ? <button aria-label={`Untrack ${item.title} — ${item.profile_name}`} className={styles.untrackIcon} disabled={pending} onClick={onUntrack} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button> : null}
    </div>
  </div>;
}
