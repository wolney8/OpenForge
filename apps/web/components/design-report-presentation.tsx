import type { ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";

export type DesignReportBreakdownRow = { key: string; label: ReactNode; value: ReactNode };

export function DesignReportSurface({ title, children, dataPdId }: { title: string; children: ReactNode; dataPdId?: string }) {
  return <section className={styles.surface} data-pd-id={dataPdId}><h2>{title}</h2>{children}</section>;
}

export function DesignReportBreakdown({ rows, dataPdId }: { rows: DesignReportBreakdownRow[]; dataPdId?: string }) {
  return <dl className={styles.domainBreakdown} data-pd-id={dataPdId}>
    {rows.map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
  </dl>;
}

export function DesignReportSourceRows({ children, dataPdId }: { children: ReactNode; dataPdId?: string }) {
  return <div className={styles.reportRows} data-pd-id={dataPdId}>{children}</div>;
}

export function DesignReportAdvanced({ children, dataPdId, enabled, id, summary = "Explore report data and filters" }: { children: ReactNode; dataPdId: string; enabled: boolean; id?: string; summary?: string }) {
  return enabled ? <details className={styles.reportAdvanced} data-pd-id={dataPdId} id={id}><summary>{summary}</summary><div className={styles.reportAdvancedBody}>{children}</div></details> : <>{children}</>;
}

export const designReportClasses = { grid: styles.reportGrid };
