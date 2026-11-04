import type { ReactNode } from "react";
import styles from "@/components/design-lab-connected.module.css";

/** The connected Lab management surface, shared by synthetic and real Profile adapters. */
export function DesignManagementSurface({ children, className = "", dataPdId, enabled = true, legacyClassName }: { children: ReactNode; className?: string; dataPdId?: string; enabled?: boolean; legacyClassName?: string }) {
  if (enabled) return <section className={`${styles.surface}${className ? ` ${className}` : ""}`} data-pd-id={dataPdId}>{children}</section>;
  return legacyClassName ? <section className={legacyClassName} data-pd-id={dataPdId}>{children}</section> : <>{children}</>;
}

export function DesignManagementDetail({ children, dataPdId, enabled, label }: { children: ReactNode; dataPdId: string; enabled: boolean; label: string }) {
  return enabled ? <details className="v2-position-detail" data-pd-id={dataPdId}><summary>{label}</summary>{children}</details> : <>{children}</>;
}
