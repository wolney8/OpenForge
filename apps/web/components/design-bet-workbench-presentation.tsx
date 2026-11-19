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

/** The Lab's numbered five-step navigation; real validation remains in form content and accessible descriptions. */
export function DesignBetWorkbenchStageRail({ stages, activeId, onSelect }: {
  stages: Array<{ id: string; label: string; state?: "complete" | "required" | "attention" | "not-required"; explanation?: string }>;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return <nav aria-label="Bet workbench sections" className={styles.stepper} data-pd-id="bet-workbench.stages">
    {stages.map((stage, index) => <button aria-current={activeId === stage.id ? "step" : undefined} aria-disabled={stage.state === "not-required"} aria-label={`${stage.label}${stage.state ? `, ${stage.state.replace("-", " ")}` : ""}${stage.explanation ? `: ${stage.explanation}` : ""}`} className={activeId === stage.id ? styles.stepActive : ""} data-pd-id={`bet-workbench.stage.${stage.id}`} key={stage.id} onClick={() => { if (stage.state !== "not-required") onSelect(stage.id); }} type="button"><span aria-hidden="true">{index + 1}</span><span>{stage.label}</span></button>)}
  </nav>;
}
