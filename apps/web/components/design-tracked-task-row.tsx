import type { MouseEvent, ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";

/** Shared Lab and application task-card presentation. Source and annotation commands stay with each adapter. */
export function DesignTrackedTaskRow({ action, context, dataPdId, details, extraAction, onUntrack, pending = false, state, title, untrackLabel, urgent = false, variant }: {
  action?: ReactNode;
  context: ReactNode;
  dataPdId: string;
  details?: ReactNode;
  extraAction?: ReactNode;
  onUntrack: (event: MouseEvent<HTMLButtonElement>) => void;
  pending?: boolean;
  state: ReactNode;
  title: ReactNode;
  untrackLabel: string;
  urgent?: boolean;
  variant: "banner" | "popup";
}) {
  return <div className={`${styles.trackedRow}${urgent ? ` ${styles.trackedUrgent}` : ""}`} data-pd-id={dataPdId} data-variant={variant}>
    <div className={styles.trackedMain}><strong>{title}</strong><small>{context}</small>{details}</div>
    <div className={styles.trackedStatus}>{state}</div>
    <div className={styles.trackedActions}>{action}{extraAction}<button aria-busy={pending} aria-label={untrackLabel} className={styles.untrackIcon} disabled={pending} onClick={onUntrack} title={untrackLabel} type="button"><span aria-hidden="true" className="material-symbols-outlined">{pending ? "progress_activity" : "close"}</span></button></div>
  </div>;
}
