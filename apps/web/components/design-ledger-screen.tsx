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
