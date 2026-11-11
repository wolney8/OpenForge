import type { ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";
import tabs from "@/components/design-management-tabs.module.css";

/** The connected Lab management surface, shared by synthetic and real Profile adapters. */
export function DesignManagementSurface({ children, className = "", dataPdId, enabled = true, legacyClassName }: { children: ReactNode; className?: string; dataPdId?: string; enabled?: boolean; legacyClassName?: string }) {
  if (enabled) return <section className={`${styles.surface}${className ? ` ${className}` : ""}`} data-pd-id={dataPdId}>{children}</section>;
  return legacyClassName ? <section className={legacyClassName} data-pd-id={dataPdId}>{children}</section> : <>{children}</>;
}

export function DesignManagementDetail({ children, className = "", dataPdId, enabled, label }: { children: ReactNode; className?: string; dataPdId: string; enabled: boolean; label: string }) {
  return enabled ? <details className={`v2-position-detail${className ? ` ${className}` : ""}`} data-pd-id={dataPdId}><summary>{label}</summary>{children}</details> : <>{children}</>;
}

export const designManagementClasses = { directoryHead: tabs.directoryHead, headDetail: tabs.headDetail, management: tabs.management, primaryAction: styles.primaryButton, secondaryAction: styles.secondaryButton };

/** Lab progress geometry adapted for production management tab semantics. */
export function DesignManagementTabs({ children, dataPdId, enabled, label }: { children: ReactNode; dataPdId: string; enabled: boolean; label: string }) {
  return <div aria-label={label} className={`analytics-tab-list profile-settings-tab-list${enabled ? ` ${tabs.tabs}` : ""}`} data-pd-id={dataPdId} data-pd-management-tabs={enabled ? "true" : undefined} role="tablist">{children}</div>;
}
