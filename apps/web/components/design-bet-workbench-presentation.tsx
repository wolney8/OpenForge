import type { ReactNode } from "react";

import { formatFinancialValue } from "@/lib/financial-display";

import styles from "@/components/design-lab-connected.module.css";

function compactStake(value: number) {
  return `£${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value)}`;
}

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

/** Approved Placement disclosure. Real and simulated adapters supply their own recorded evidence and commands. */
export function DesignBetWorkbenchPlacementDetails({ fields, legs, followUp, reversal }: {
  fields?: ReactNode;
  legs: ReactNode;
  followUp: ReactNode;
  reversal: ReactNode;
}) {
  return <details className={styles.placementDetails} data-pd-id="sportsbook.workbench.partial-fill">
    <summary>Actual stakes and partial-fill details</summary>
    {fields}
    <div className={styles.placementSecondaryCard} data-pd-id="sportsbook.workbench.placement-secondary-card">
      <section aria-label="Recorded legs" className={styles.placementCardSection} data-pd-id="sportsbook.workbench.recorded-legs">{legs}</section>
      <section aria-label="Follow-up reminder" className={styles.placementCardSection} data-pd-id="sportsbook.workbench.follow-up">{followUp}</section>
      <section aria-label="Lay reversal" className={styles.placementCardSection} data-pd-id="sportsbook.workbench.lay-reversal">{reversal}</section>
    </div>
  </details>;
}

/** Approved compact leg summary; simulated and governed adapters retain their own controls. */
export function DesignBetWorkbenchLeg({ index, exchange, odds, matchedStake, open, onToggle, children, dataPdId }: {
  index: number;
  exchange: string;
  odds: string;
  matchedStake: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  dataPdId?: string;
}) {
  return <div className={styles.placementLeg} data-pd-id={dataPdId} data-pd-leg-row="true">
    <div className={styles.placementLegRow}>
      <div className={styles.placementLegSummary}><strong>Leg {index + 1}</strong><span>{exchange || "Not recorded"}</span><span>Odds {odds || "Not recorded"}</span><span>{matchedStake && Number.isFinite(Number(matchedStake)) ? `£${Number(matchedStake).toFixed(2)} matched` : "Matched stake Not recorded"}</span></div>
      <button aria-expanded={open} aria-label={`Review leg ${index + 1}`} className={styles.secondaryButton} onClick={onToggle} type="button">Review leg</button>
    </div>
    {open ? <div className={styles.placementLegControls} data-pd-id={`sportsbook.workbench.leg-controls-${index + 1}`}>{children}</div> : null}
  </div>;
}

/** The approved order: recorded legs, request figures, next-lay guidance, then reminder. */
export function DesignBetWorkbenchRecordedLegs({ children, hasLegs, matchedTotal, target, remaining, recommendedNext, onCopyRecommended, guidance, emptyMessage = "No Lay fill is recorded." }: {
  children: ReactNode;
  hasLegs: boolean;
  matchedTotal: number;
  target: number | null;
  remaining: number | null;
  recommendedNext: number | null;
  onCopyRecommended?: () => void;
  guidance?: string | null;
  emptyMessage?: string;
}) {
  return <div className={styles.placementRecordedLegs}>
    <strong>Recorded legs</strong>
    {!hasLegs ? <p>{emptyMessage}</p> : null}
    {children}
    {hasLegs ? <p>Matched so far · {formatFinancialValue(matchedTotal)}</p> : null}
    <p className={styles.placementRemaining} data-pd-id="sportsbook.workbench.remaining-request">{target === null || remaining === null ? "Request Not recorded" : remaining < 0 ? `${compactStake(Math.abs(remaining))} above the ${compactStake(target)} request` : `${compactStake(remaining)} remaining of the ${compactStake(target)} request`}</p>
    <div className={styles.placementNextGuidance} data-pd-id="sportsbook.workbench.next-lay-guidance">
      <span>Recommended Next Lay Stake · plan</span>
      {recommendedNext !== null ? <button aria-label="Copy Recommended Next Lay Stake" className={styles.secondaryButton} disabled={recommendedNext <= 0 || !onCopyRecommended} onClick={onCopyRecommended} type="button">{formatFinancialValue(recommendedNext)}</button> : <strong>Not recorded</strong>}
      {guidance ? <p className={styles.placementExposure} role="status">{guidance}</p> : null}
    </div>
  </div>;
}

/** Approved protected-record copy and footer actions, with simulated or native commands supplied by the caller. */
export function DesignBetWorkbenchProtectedNotice() {
  return <p data-pd-id="bet-workbench.protected-notice">Recorded financial fields are read-only. Review a correction to change them.</p>;
}

export function DesignBetWorkbenchProtectedActions({
  correction,
  pending = false,
  saveDisabled = false,
  form,
  onCancel,
  onReviewCorrection,
  onCancelCorrection,
  onSaveCorrection,
}: {
  correction: boolean;
  pending?: boolean;
  saveDisabled?: boolean;
  form?: string;
  onCancel: () => void;
  onReviewCorrection: () => void;
  onCancelCorrection: () => void;
  onSaveCorrection?: () => void;
}) {
  return correction ? <>
    <button className={styles.secondaryButton} data-pd-id="bet-workbench.cancel-correction" disabled={pending} onClick={onCancelCorrection} type="button">Cancel Correction</button>
    <button className={styles.primaryButton} data-pd-id="bet-workbench.save-audited-correction" disabled={pending || saveDisabled} form={form} onClick={onSaveCorrection} type={form ? "submit" : "button"}>{pending ? "Saving" : "Save Audited Correction"}</button>
  </> : <>
    <button className={styles.secondaryButton} data-pd-id="bet-workbench.cancel-protected" disabled={pending} onClick={onCancel} type="button">Cancel</button>
    <button className={styles.primaryButton} data-pd-id="bet-workbench.review-correction" disabled={pending} onClick={onReviewCorrection} type="button">Review Correction</button>
  </>;
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
