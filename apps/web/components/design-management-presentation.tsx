import type { ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";

/** The connected Lab management surface, shared by synthetic and real Profile adapters. */
export function DesignManagementSurface({ children, dataPdId, enabled = true }: { children: ReactNode; dataPdId?: string; enabled?: boolean }) {
  return enabled ? <section className={styles.surface} data-pd-id={dataPdId}>{children}</section> : <>{children}</>;
}

export function DesignManagementDetail({ children, dataPdId, enabled, label }: { children: ReactNode; dataPdId: string; enabled: boolean; label: string }) {
  return enabled ? <details className="v2-position-detail" data-pd-id={dataPdId}><summary>{label}</summary>{children}</details> : <>{children}</>;
}
