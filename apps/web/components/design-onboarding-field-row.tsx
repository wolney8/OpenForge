import type { ComponentPropsWithoutRef, ReactNode } from "react";

import styles from "@/components/design-lab-onboarding.module.css";

/** The approved Lab onboarding field row, shared with real Profile setup. */
export function DesignOnboardingFieldRow({ children }: { children: ReactNode }) {
  return <div className={styles.fieldRow}>{children}</div>;
}

export function DesignOnboardingPanel({ className = "", enabled = true, ...props }: ComponentPropsWithoutRef<"section"> & { enabled?: boolean }) {
  return <section {...props} className={`${enabled ? `${styles.panel} ` : ""}${className}`.trim()} />;
}

export function DesignOnboardingFooter({ className = "", enabled = true, ...props }: ComponentPropsWithoutRef<"footer"> & { enabled?: boolean }) {
  return <footer {...props} className={`${enabled ? `${styles.footer} ` : ""}${className}`.trim()} />;
}
