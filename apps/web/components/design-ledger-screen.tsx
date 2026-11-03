import type { ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";

/** The approved Lab ledger's complete heading, controls and content surface. */
export function DesignLedgerScreen({ actions, children, dataPdId, description, enabled = true, title }: {
  actions?: ReactNode;
  children: ReactNode;
  dataPdId: string;
  description: ReactNode;
  title: string;
  enabled?: boolean;
}) {
  if (!enabled) return <>{children}</>;
  return <section className={styles.surface} data-pd-id={dataPdId}>
    <div className={styles.sectionHead}>
      <div><h2>{title}</h2><p>{description}</p></div>
      {actions}
    </div>
    {children}
  </section>;
}

export function DesignLedgerToolbar({ ariaLabel, children, className = "", dataPdId, enabled = true }: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  dataPdId?: string;
  enabled?: boolean;
}) {
  return <div aria-label={ariaLabel} className={`${enabled ? styles.toolbar : ""} ${className}`.trim()} data-pd-id={dataPdId} role={ariaLabel ? "toolbar" : undefined}>{children}</div>;
}

export function DesignPageHead({ children }: { children: ReactNode }) {
  return <div className={styles.pageHead}>{children}</div>;
}

export const designPageHeadClasses = { actions: styles.headActions };
export const designLedgerClasses = { actionRow: styles.actionRow };

export type DesignLedgerDetailRow = {
  id: string;
  title: string;
  status?: string;
  subtitle?: string;
  fields: Array<{ key: string; label: string; value: ReactNode }>;
  onOpen?: () => void;
  extraAction?: ReactNode;
};

export function DesignLedgerNarrowToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return <button aria-pressed={expanded} className={`${styles.secondaryButton} ${styles.gridNarrowToggle}`} onClick={onToggle} type="button">{expanded ? "Show Full Table" : "Show Labelled Details"}</button>;
}

export function DesignLedgerMobileRows({ expanded, rows, dataPdId, onRowOpen }: { expanded: boolean; rows: DesignLedgerDetailRow[]; dataPdId: string; onRowOpen?: (rowId: string) => void }) {
  return <div className={`${styles.mobileRows} ${expanded ? styles.mobileDetailVisible : ""}`} data-pd-id={dataPdId}>
    {rows.map(row => <article data-pd-id={`${dataPdId}.${row.id}`} key={row.id}>
      <div><strong>{row.title}</strong>{row.status ? <span className={styles.status}>{row.status}</span> : null}</div>
      {row.subtitle ? <p>{row.subtitle}</p> : null}
      <dl className={styles.detailGrid}>{row.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
      <button aria-label={`Open full record for ${row.title}`} className={styles.secondaryButton} disabled={!row.onOpen && !onRowOpen} onClick={() => { if (row.onOpen) row.onOpen(); else onRowOpen?.(row.id); }} type="button">Open Full Record</button>
      {row.extraAction}
    </article>)}
  </div>;
}

export function DesignLedgerToolbarAction({ ariaExpanded, children, dataPdId, onClick }: {
  ariaExpanded?: boolean;
  children: ReactNode;
  dataPdId?: string;
  onClick: () => void;
}) {
  return <button aria-expanded={ariaExpanded} className={styles.secondaryButton} data-pd-id={dataPdId} onClick={onClick} type="button">{children}</button>;
}

export function DesignLedgerPrimaryAction({ children, dataPdId, onClick }: {
  children: ReactNode;
  dataPdId?: string;
  onClick: () => void;
}) {
  return <button className={styles.primaryButton} data-pd-id={dataPdId} onClick={onClick} type="button">{children}</button>;
}
