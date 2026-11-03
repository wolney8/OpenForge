import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";

type Metric = { key: string; label: ReactNode; value: ReactNode; description: ReactNode };

export function DesignPositionMetrics({ items, label, dataPdId }: { items: Metric[]; label: string; dataPdId: string }) {
  return <section aria-label={label} className={styles.metrics} data-pd-id={dataPdId}>
    {items.map((item) => <div data-pd-id={`${dataPdId}.${item.key}`} key={item.key}><span>{item.label}</span><strong>{item.value}</strong><small>{item.description}</small></div>)}
  </section>;
}

export function DesignPositionWorkGrid({ children }: { children: ReactNode }) {
  return <div className={styles.dashboardGrid}>{children}</div>;
}

export function DesignPositionSurface({ children, labelledBy, dataPdId }: { children: ReactNode; labelledBy?: string; dataPdId?: string }) {
  return <section aria-labelledby={labelledBy} className={styles.surface} data-pd-id={dataPdId}>{children}</section>;
}

export function DesignPositionSectionHead({ title, id, action }: { title: string; id?: string; action?: ReactNode }) {
  return <div className={styles.sectionHead}><h2 id={id}>{title}</h2>{action}</div>;
}

export function DesignPositionTask({ title, description, action }: { title: string; description: ReactNode; action: ReactNode }) {
  return <div className={styles.task}><div><strong>{title}</strong><p>{description}</p></div>{action}</div>;
}

export function DesignPositionShortcut({ label, icon, href, onClick }: { label: string; icon: string; href?: string; onClick?: () => void }) {
  const content = <><span aria-hidden="true" className="material-symbols-outlined">{icon}</span><span>{label}</span><span aria-hidden="true" className="material-symbols-outlined">arrow_forward</span></>;
  if (href) return <Link className={styles.quickLink} href={href}>{content}</Link>;
  return <button className={styles.quickLink} onClick={onClick} type="button">{content}</button>;
}

export const designPositionActionClasses = {
  primary: styles.primaryButton,
  secondary: styles.secondaryButton,
  link: styles.linkButton,
};
