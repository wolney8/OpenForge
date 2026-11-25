"use client";

import styles from "@/components/design-lab-connected.module.css";

/** Grouped presentation only; owning ledger adapters validate and save both fields. */
export function DesignRunnerRaceCellFields({ dataPdId, runner, race, onRunnerChange, onRaceChange }: {
  dataPdId: string;
  runner: string;
  race: string;
  onRunnerChange: (value: string) => void;
  onRaceChange: (value: string) => void;
}) {
  return <div className="ledger-floating-composite" data-pd-id={dataPdId}>
    <label><span>Runner</span><input aria-label="Runner" className={styles.floatingCellInput} data-pd-id={`${dataPdId}.runner`} onChange={event => onRunnerChange(event.target.value)} value={runner} /></label>
    <label><span>Race</span><input aria-label="Race" className={styles.floatingCellInput} data-pd-id={`${dataPdId}.race`} onChange={event => onRaceChange(event.target.value)} value={race} /></label>
    <button className={styles.secondaryButton} type="submit">Apply Runner / Race</button>
  </div>;
}
