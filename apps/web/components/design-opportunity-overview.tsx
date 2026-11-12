"use client";

import styles from "@/components/design-lab-connected.module.css";

/** Approved Lab opportunity composition; callers own the actual commands. */
export function DesignOpportunityOverview({ intro, onCapture, onReview, title = "Opportunities · advisory preview" }: {
  intro: string;
  onCapture: () => void;
  onReview: () => void;
  title?: string;
}) {
  return <section className={styles.surface} data-pd-id="opportunities.overview">
    <h2>{title}</h2><p>{intro}</p>
    <div className={styles.task}><div><strong>Capture an offer you found</strong><p>Discord, bookmaker or another source · keep the original wording.</p></div><button className={styles.primaryButton} onClick={onCapture} type="button">Quick Capture</button></div>
    <div className={styles.task}><div><strong>Review current Prospecting</strong><p>Planning is separate from committed exposure.</p></div><button className={styles.secondaryButton} onClick={onReview} type="button">Open Tracker</button></div>
  </section>;
}
