import type { ReactNode } from "react";

import styles from "@/components/design-lab-connected.module.css";

/** The approved Sportsbook page workbench structure, shared by Lab and real adapters. */
export function DesignBetWorkbenchContext({ title, context, controls }: {
  title: string;
  context: string;
  controls?: ReactNode;
}) {
  return <div className={styles.entryTop} data-pd-bet-workbench-context="true">
    <div><strong>{title}</strong><p>{context}</p></div>
    {controls}
  </div>;
}

export function DesignBetWorkbenchGrid({ children, dataPdId, enabled = true }: { children: ReactNode; dataPdId?: string; enabled?: boolean }) {
  return enabled ? <div className={styles.entryGrid} data-pd-id={dataPdId}>{children}</div> : <>{children}</>;
}

export function DesignBetWorkbenchSummary({ title, children, dataPdId }: { title: string; children: ReactNode; dataPdId?: string }) {
  return <aside className={styles.calcSummary} data-pd-id={dataPdId}><h3>{title}</h3>{children}</aside>;
}

export const designBetWorkbenchEntryClass = styles.entry;
export const designBetWorkbenchFooterClass = styles.entryFooter;
