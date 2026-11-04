import type { FocusEventHandler, MouseEventHandler, ReactNode } from "react";
import styles from "@/components/design-lab-notifications.module.css";

export const designNotificationClasses = {
  advancedFilters: styles.advancedFilters,
  actions: styles.actions,
  confirm: styles.confirm,
  empty: styles.empty,
  footer: styles.footer,
  list: styles.list,
  tabs: styles.tabs,
  typeFilter: styles.typeFilter,
};

export type DesignNotificationView = "all" | "priority" | "system" | "history";
const notificationTabs: readonly [DesignNotificationView, string][] = [
  ["all", "All"], ["priority", "Action Required"], ["system", "System & Results"], ["history", "History"],
];

export function DesignNotificationTabs({ controlsId, dataPdIdPrefix, onChange, view }: {
  controlsId: string;
  dataPdIdPrefix: string;
  onChange: (view: DesignNotificationView) => void;
  view: DesignNotificationView;
}) {
  return <div aria-label="Notification Views" className={styles.tabs} onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const current = tabs.findIndex(tab => tab === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault(); tabs[next]?.focus(); onChange(notificationTabs[next][0]);
  }} role="tablist">
    {notificationTabs.map(([id, label]) => <button aria-controls={controlsId} aria-selected={view === id} data-pd-id={`${dataPdIdPrefix}.${id}`}
      key={id} onClick={() => onChange(id)} role="tab" tabIndex={view === id ? 0 : -1} type="button">{label}</button>)}
  </div>;
}

export function DesignNotificationTypeFilter<T extends string>({ ariaLabel, dataPdId, onChange, options, value }: {
  ariaLabel?: string;
  dataPdId: string;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  value: T;
}) {
  return <label className={styles.typeFilter}>Notification Type<select aria-label={ariaLabel} data-pd-id={dataPdId} onChange={event => onChange(event.target.value as T)} value={value}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function DesignNotificationActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export function DesignNotificationSurface({ ariaLabel, children, dataPdId, fullPage = false, heading, headingAction, legacy = false, summary }: {
  ariaLabel?: string;
  children: ReactNode;
  dataPdId: string;
  fullPage?: boolean;
  heading: string;
  headingAction?: () => void;
  legacy?: boolean;
  summary: ReactNode;
}) {
  return <section aria-label={ariaLabel} className={legacy ? "content-panel stack" : `${styles.panel}${fullPage ? ` ${styles.fullPage}` : ""}`} data-pd-id={dataPdId}>
    {!legacy ? <div className={styles.head}><h2>{headingAction ? <button aria-label={`Open Full ${heading}`} className={styles.headingLink} onClick={headingAction} type="button">{heading}</button> : heading}</h2><span>{summary}</span></div> : null}
    {children}
  </section>;
}

export function DesignNotificationSection({ children, title }: { children: ReactNode; title: string }) {
  return <section aria-label={title}><h3>{title}</h3>{children}</section>;
}

export function DesignNotificationRow({ actions, confirmation, context, dataPdId, detail, onFocusCapture, onMouseEnter, onMouseLeave, severity, status, title }: {
  actions: ReactNode;
  confirmation?: ReactNode;
  context: ReactNode;
  dataPdId: string;
  detail: ReactNode;
  onFocusCapture?: FocusEventHandler<HTMLDivElement>;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
  severity: "urgent" | "review";
  status: ReactNode;
  title: ReactNode;
}) {
  return <div className={styles.row} data-pd-id={dataPdId} data-severity={severity} onFocusCapture={onFocusCapture} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    <div className={styles.rowHead}><strong>{title}</strong><span>{status}</span></div>
    <small>{context}</small>
    <p>{detail}</p>
    <div className={styles.rowActions}>{actions}</div>
    {confirmation ? <div className={styles.confirm}>{confirmation}</div> : null}
  </div>;
}
