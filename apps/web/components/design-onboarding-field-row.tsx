import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { BrandLogo } from "@/components/brand-logo";

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

export function DesignOnboardingPage({ children, dataPdId, enabled = true, exitDisabled = false, legacyClassName = "", onExit, subtitle }: { children: ReactNode; dataPdId: string; enabled?: boolean; exitDisabled?: boolean; legacyClassName?: string; onExit: () => void; subtitle: string }) {
  if (!enabled) return <section className={legacyClassName} data-pd-id={dataPdId}>{children}</section>;
  return <main className={styles.page} data-pd-id={dataPdId} id="main-content">
    <div className={styles.top}><div className={styles.brand}><span className="brand-mark"><BrandLogo variant="mark" /></span><span className={styles.brandText}>Plum Duff <small>{subtitle}</small></span></div><button className={styles.secondary} disabled={exitDisabled} onClick={onExit} type="button">Exit onboarding</button></div>
    <div className={styles.content}>{children}</div>
  </main>;
}

export function DesignOnboardingIntro({ description, eyebrow, headingRef, title }: { description: string; eyebrow: string; headingRef?: Ref<HTMLHeadingElement>; title: string }) {
  return <header className={styles.intro}><span className={styles.eyebrow}>{eyebrow}</span><h1 ref={headingRef} tabIndex={-1}>{title}</h1><p>{description}</p></header>;
}

export function DesignOnboardingProgress({ activeId, onSelect, steps }: { activeId: string; onSelect: (id: string) => void; steps: ReadonlyArray<{ id: string; label: string; disabled?: boolean }> }) {
  return <ol aria-label="Onboarding progress" className={styles.stepper}>{steps.map((item, index) => <li key={item.id}><button aria-current={activeId === item.id ? "step" : undefined} className={activeId === item.id ? styles.stepActive : ""} disabled={item.disabled} onClick={() => onSelect(item.id)} type="button"><span>{index + 1}</span>{item.label}</button></li>)}</ol>;
}

export function DesignOnboardingFrame({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  return enabled ? <DesignOnboardingPanel>{children}</DesignOnboardingPanel> : <>{children}</>;
}

export function DesignOnboardingButton({ className = "", variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant: "primary" | "secondary" }) {
  return <button {...props} className={`${styles[variant]} ${className}`.trim()} type={props.type ?? "button"} />;
}
