import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { DesignFinancialEditorCard } from "@/components/design-financial-editor-card";
import styles from "@/components/design-lab-financial-workflows.module.css";

/** The Lab's 1180px workbench width, adapted to the governed native dialog. */
export const financialWorkbenchModalClass = styles.modalFrame;
export const financialWorkbenchHeaderClass = styles.modalHeader;
export const financialWorkbenchHeadingClass = styles.cardHeading;
export const financialWorkbenchPrimaryActionClass = styles.primaryAction;
export const financialWorkbenchSecondaryActionClass = styles.secondaryAction;

/** The governed form keeps its own Save command while the shared action row stays visible. */
export function DesignFinancialWorkbenchFooter({ enabled, className = "", children, ...props }: ComponentPropsWithoutRef<"div"> & { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const footer = ref.current;
    const modal = footer.closest<HTMLElement>(".workflow-editor-modal");
    if (!modal) return;
    const measure = () => modal.style.setProperty("--financial-workbench-footer-height", `${footer.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    return () => { observer.disconnect(); modal.style.removeProperty("--financial-workbench-footer-height"); };
  }, [enabled]);
  return <div {...props} className={`${className}${enabled ? ` ${styles.modalFooter}` : ""}`} ref={ref}>{children}</div>;
}

export function DesignFinancialWorkbenchHeader({ eyebrow, title, context, closeLabel, onClose, disabled = false }: {
  eyebrow: string;
  title: string;
  context: string;
  closeLabel: string;
  onClose: () => void;
  disabled?: boolean;
}) {
  return <header className={styles.header} data-pd-financial-header="true">
    <DesignFinancialWorkbenchTitle eyebrow={eyebrow} title={title} context={context} />
    <DesignFinancialWorkbenchClose label={closeLabel} onClick={onClose} disabled={disabled} />
  </header>;
}

/** The approved Lab workbench composition, with real ledger content supplied by its native owner. */
export function DesignFinancialWorkbenchColumns({ children, dataPdId, enabled = true }: { children: ReactNode; dataPdId: string; enabled?: boolean }) {
  return enabled ? <div className={styles.columns} data-pd-id={dataPdId}>{children}</div> : <>{children}</>;
}

export function DesignFinancialWorkbenchAside({
  dataPdId, title, facts, children,
}: {
  dataPdId: string;
  title: string;
  facts: Array<{ label: string; value: ReactNode }>;
  children?: ReactNode;
}) {
  return <aside className={styles.card} data-pd-id={dataPdId}>
    <h3>{title}</h3>
    <dl className={styles.facts}>{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    {children}
  </aside>;
}

export function DesignFinancialWorkbenchTitle({ eyebrow, title, context }: { eyebrow: string; title: string; context: string }) {
  return <div className={`${styles.workbenchTitle} workflow-editor-title-stack`}>
    <span className={styles.labTag}>{eyebrow}</span>
    <h2>{title}</h2>
    <p>{context}</p>
  </div>;
}

export function DesignFinancialWorkbenchClose({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return <button aria-label={label} className={styles.close} disabled={disabled} onClick={onClick} type="button"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>;
}

/** Keep governed outcome content unchanged while using the Lab's financial card surface. */
export function DesignFinancialOutcomeSurface({ enabled, className = "", ...props }: ComponentPropsWithoutRef<"section"> & { enabled: boolean }) {
  return enabled
    ? <DesignFinancialEditorCard {...props} className={`${className} ${styles.reviewSurface}`} />
    : <section {...props} className={className} />;
}
