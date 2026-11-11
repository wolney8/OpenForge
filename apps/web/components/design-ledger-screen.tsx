import type { ReactNode } from "react";
import { Suspense } from "react";
import styles from "@/components/design-lab-connected.module.css";
import { DesignLabSelect } from "@/components/design-lab-select";
import { ledgerPageSizeOptions } from "@/components/ledger-pagination";
import { TrackedTasksBanner } from "@/components/tracked-tasks-banner";

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

/** Compact pagination extension for governed ledgers; Lab control geometry, native page authority. */
export function DesignLedgerPagination({ currentPage, dataPdId, label, onPageChange, onPageSizeChange, pageCount, pageSize, totalRows }: {
  currentPage: number;
  dataPdId: string;
  label: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageCount: number;
  pageSize: number;
  totalRows: number;
}) {
  const start = totalRows ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(totalRows, currentPage * pageSize);
  return <div aria-label={`${label} pagination`} className={`${styles.toolbar} ${styles.ledgerPagination}`} data-pd-id={dataPdId}>
    <span aria-live="polite" className={styles.tableNote}>Showing {start}–{end} of {totalRows} · Page {currentPage} of {pageCount}</span>
    <DesignLabSelect compact dataPdId={`${dataPdId}.page-size`} label={`${label} rows per page`} onChange={value => onPageSizeChange(Number(value))} options={ledgerPageSizeOptions.map(size => ({ value: String(size), label: `${size} rows` }))} value={String(pageSize)} />
    <div className={styles.ledgerPaginationActions}>
      <button className={styles.secondaryButton} disabled={currentPage <= 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} type="button">Previous</button>
      <button className={styles.secondaryButton} disabled={currentPage >= pageCount} onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} type="button">Next</button>
    </div>
  </div>;
}

export function DesignPageHead({ children, dataPdId, enabled = true }: { children: ReactNode; dataPdId?: string; enabled?: boolean }) {
  return enabled ? <><div className={styles.pageHead} data-pd-id={dataPdId}>{children}</div><Suspense fallback={null}><TrackedTasksBanner /></Suspense></> : <>{children}</>;
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
